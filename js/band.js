class BandDashboard {
    constructor() {
        this.firebaseManager = window.firebaseManager || new FirebaseManager();
        
        // UI Elements
        this.activeBandPanel = document.getElementById('activeBandPanel');
        this.noBandMessage = document.getElementById('noBandMessage');
        this.bandSelect = document.getElementById('bandSelect');
        this.bandCodeText = document.getElementById('bandCodeText');
        this.bandLobbyList = document.getElementById('bandLobbyList');
        this.bandPracticeSessionBtn = document.getElementById('bandPracticeSessionBtn');
        
        this.copyCodeBtn = document.getElementById('copyCodeBtn');
        this.leaveBandBtn = document.getElementById('leaveBandBtn');
        
        this.joinCodeInput = document.getElementById('joinCodeInput');
        this.joinBandBtn = document.getElementById('joinBandBtn');
        this.joinErrorMsg = document.getElementById('joinErrorMsg');
        
        this.createNameInput = document.getElementById('createNameInput');
        this.createBandBtn = document.getElementById('createBandBtn');
        this.createErrorMsg = document.getElementById('createErrorMsg');
        
        this.toast = document.getElementById('toast');
        
        // Setlist Elements
        this.manageSetlistBtn = document.getElementById('manageSetlistBtn');
        this.setlistSelect = document.getElementById('setlistSelect');
        this.createSetlistBtn = document.getElementById('createSetlistBtn');
        this.renameSetlistBtn = document.getElementById('renameSetlistBtn');
        this.deleteSetlistBtn = document.getElementById('deleteSetlistBtn');
        this.setlistViewMode = document.getElementById('setlistViewMode');
        this.setlistEditMode = document.getElementById('setlistEditMode');
        this.setlistSongList = document.getElementById('setlistSongList');
        this.setlistSearchInput = document.getElementById('setlistSearchInput');
        this.setlistAutocomplete = document.getElementById('setlistAutocomplete');
        this.addSongToSetlistBtn = document.getElementById('addSongToSetlistBtn');
        
        this.setlistSongs = [];
        this.isSetlistEditMode = false;
        this.setlistsMetadataListenerRef = null;
        this.setlistSongsListenerRef = null;
        this.selectedSetlistId = null;

        // State
        this.currentUser = null;
        this.bands = [];
        this.selectedBandId = null;
        
        // Firebase Listeners reference
        this.presenceRef = null;
        this.lobbyListenerRef = null;
        
        // Set button colour immediately (before async Firebase init completes)
        this.updatePracticeSessionBtnUI();
        
        this.setupSetlistHandlers();
        this.init();
    }

    async init() {
        try {
            await this.firebaseManager.initialize();
            
            this.firebaseManager.auth.onAuthStateChanged(user => {
                if (user) {
                    this.currentUser = user;
                    this.loadDashboard();
                    this.setupEventListeners();
                } else {
                    if (window.parent && window.parent !== window) {
                        try {
                            if (window.top) {
                                window.top.location.href = 'index.html';
                                return;
                            }
                        } catch (err) {}
                    }
                    window.location.href = 'index.html';
                }
            });
        } catch (error) {
            console.error('Initialization error:', error);
            alert('Failed to initialize Band Connect.');
        }
    }

    setupEventListeners() {
        // Copy Code
        if (this.copyCodeBtn) {
            this.copyCodeBtn.onclick = () => this.copyInviteCode();
        }
        
        // Band selection change
        if (this.bandSelect) {
            this.bandSelect.onchange = (e) => {
                this.selectBand(e.target.value);
            };
        }
        
        // Join Band
        if (this.joinBandBtn) {
            this.joinBandBtn.onclick = () => this.joinBand();
        }
        
        // Create Band
        if (this.createBandBtn) {
            this.createBandBtn.onclick = () => this.createBand();
        }
        
        // Leave Band
        if (this.leaveBandBtn) {
            this.leaveBandBtn.onclick = () => this.leaveBand();
        }

        // Practice Session Toggle
        if (this.bandPracticeSessionBtn) {
            this.bandPracticeSessionBtn.onclick = () => this.togglePracticeSession();
        }
    }

    async loadDashboard() {
        const result = await this.firebaseManager.getBands();
        if (result.success) {
            this.bands = result.bands;
            this.populateBandSelect();
            
            if (this.bands.length > 0) {
                this.activeBandPanel.style.display = 'block';
                this.noBandMessage.style.display = 'none';
                
                // Select first band by default, or restore previously selected
                const savedId = localStorage.getItem('lastSelectedBandId');
                const stillExists = this.bands.some(b => b.id === savedId);
                if (savedId && stillExists) {
                    this.bandSelect.value = savedId;
                    this.selectBand(savedId);
                } else {
                    const firstId = this.bands[0].id;
                    this.bandSelect.value = firstId;
                    this.selectBand(firstId);
                }
            } else {
                this.activeBandPanel.style.display = 'none';
                this.noBandMessage.style.display = 'block';
                this.cleanupActiveListeners();
            }
        }
    }

    populateBandSelect() {
        if (!this.bandSelect) return;
        this.bandSelect.innerHTML = '';
        this.bands.forEach(band => {
            const opt = document.createElement('option');
            opt.value = band.id;
            opt.textContent = band.name;
            this.bandSelect.appendChild(opt);
        });
    }

    async selectBand(bandId) {
        this.cleanupActiveListeners();
        this.selectedBandId = bandId;
        localStorage.setItem('lastSelectedBandId', bandId);
        
        const activeBand = this.bands.find(b => b.id === bandId);
        if (!activeBand) return;
        
        this.bandCodeText.textContent = activeBand.code;
        
        // Get all members registered
        const membersResult = await this.firebaseManager.getBandMembers(bandId);
        if (!membersResult.success) {
            console.error('Failed to load members:', membersResult.error);
            return;
        }
        const registeredMembers = membersResult.members;
        
        this.updatePracticeSessionBtnUI();

        const sessionActive = localStorage.getItem('bandPracticeSessionActive') === 'true';
        if (sessionActive) {
            // Set presence details for current user in the lobby
            const displayName = this.currentUser.displayName || this.currentUser.email.split('@')[0];
            this.presenceRef = this.firebaseManager.database.ref(`bandSync/${bandId}/present/${this.currentUser.uid}`);
            
            await this.presenceRef.set({
                displayName: displayName,
                songId: 'Viewing Dashboard',
                connectedAt: Date.now()
            });
            
            // Set onDisconnect handler
            this.presenceRef.onDisconnect().remove();
        }
        
        // Always listen to real-time lobby presence so all devices see the member list,
        // regardless of whether this device has started a practice session.
        const lobbyRef = this.firebaseManager.database.ref(`bandSync/${bandId}/present`);
        this.lobbyListenerRef = lobbyRef.on('value', snapshot => {
            const onlinePresence = snapshot.val() || {};
            this.renderMembersPresence(registeredMembers, onlinePresence);
        });

        // Initialize default setlist if setlists path does not exist
        const setlistsRef = this.firebaseManager.database.ref(`bands/${bandId}/setlists`);
        const setlistsSnap = await setlistsRef.once('value');
        if (!setlistsSnap.exists()) {
            // Check legacy path bands/${bandId}/setlist
            const legacyRef = this.firebaseManager.database.ref(`bands/${bandId}/setlist`);
            const legacySnap = await legacyRef.once('value');
            let initialSongs = [];
            if (legacySnap.exists()) {
                const data = legacySnap.val();
                if (data) {
                    if (Array.isArray(data)) {
                        initialSongs = data.filter(Boolean);
                    } else if (typeof data === 'object') {
                        initialSongs = Object.keys(data).map(key => data[key]);
                    }
                }
                // Clean up legacy
                await legacyRef.remove();
            }
            
            // Create default setlist
            await setlistsRef.child('default').set({
                id: 'default',
                name: 'Default Setlist',
                songs: initialSongs,
                createdAt: Date.now()
            });
        }

        // Listen to all setlists metadata
        this.setlistsMetadataListenerRef = setlistsRef.on('value', snapshot => {
            const setlistsData = snapshot.val() || {};
            
            // Populate select dropdown
            this.populateSetlistsSelect(setlistsData);
            
            // Determine active setlist ID
            let activeSetlistId = localStorage.getItem(`band_${bandId}_selectedSetlistId`);
            if (!activeSetlistId || !setlistsData[activeSetlistId]) {
                const keys = Object.keys(setlistsData);
                activeSetlistId = keys.length > 0 ? keys[0] : 'default';
            }
            
            if (this.setlistSelect) {
                this.setlistSelect.value = activeSetlistId;
            }
            this.switchActiveSetlist(activeSetlistId);
        });
    }

    populateSetlistsSelect(setlistsData) {
        if (!this.setlistSelect) return;
        this.setlistSelect.innerHTML = '';
        
        const sortedKeys = Object.keys(setlistsData).sort((a, b) => {
            const timeA = setlistsData[a].createdAt || 0;
            const timeB = setlistsData[b].createdAt || 0;
            return timeA - timeB;
        });

        sortedKeys.forEach(key => {
            const setlist = setlistsData[key];
            const opt = document.createElement('option');
            opt.value = setlist.id;
            opt.textContent = setlist.name || 'Unnamed Setlist';
            this.setlistSelect.appendChild(opt);
        });
    }

    switchActiveSetlist(setlistId) {
        if (!this.selectedBandId) return;
        if (this.selectedSetlistId === setlistId && this.setlistSongsListenerRef) return;

        // Unsubscribe old listener
        if (this.setlistSongsListenerRef) {
            this.firebaseManager.database.ref(`bands/${this.selectedBandId}/setlists/${this.selectedSetlistId}/songs`).off('value', this.setlistSongsListenerRef);
            this.setlistSongsListenerRef = null;
        }

        this.selectedSetlistId = setlistId;
        localStorage.setItem(`band_${this.selectedBandId}_selectedSetlistId`, setlistId);

        // Subscribe to new listener
        const songsRef = this.firebaseManager.database.ref(`bands/${this.selectedBandId}/setlists/${setlistId}/songs`);
        this.setlistSongsListenerRef = songsRef.on('value', snapshot => {
            const data = snapshot.val();
            this.setlistSongs = [];
            if (data) {
                if (Array.isArray(data)) {
                    this.setlistSongs = data.filter(Boolean);
                } else if (typeof data === 'object') {
                    this.setlistSongs = Object.keys(data).map(key => data[key]);
                }
            }
            this.renderSetlist();
        });
    }

    renderMembersPresence(registeredMembers, onlinePresence) {
        this.bandLobbyList.innerHTML = '';
        
        registeredMembers.forEach(member => {
            // isOnline is based purely on what Firebase reports — not on whether THIS
            // device has started a session. The local sessionActive flag only controls
            // whether this user writes their own presence, not what they can see.
            const isOnline = !!onlinePresence[member.uid];
            const presenceDetails = onlinePresence[member.uid] || null;
            
            const item = document.createElement('div');
            item.className = 'member-item';
            
            const initials = member.displayName ? member.displayName.substring(0, 2).toUpperCase() : '??';
            
            let songStatusHTML = 'Offline';
            if (isOnline && presenceDetails) {
                const rawStatus = presenceDetails.songId;
                if (rawStatus === 'Viewing Dashboard' || rawStatus === 'Browsing Songlist' || rawStatus === 'Browsing Songs' || rawStatus === 'Practicing Chords' || rawStatus === 'Practicing Guitar Chords' || rawStatus === 'Viewing Band Practice' || rawStatus === 'Viewing Band Connect' || rawStatus === 'Active in App') {
                    songStatusHTML = rawStatus;
                } else {
                    let cleanSongTitle = rawStatus;
                    if (cleanSongTitle.startsWith('Viewing: ')) {
                        cleanSongTitle = cleanSongTitle.substring(9);
                    }
                    cleanSongTitle = cleanSongTitle.trim();
                    
                    let songId = null;
                    if (window.parent && window.parent.appInstance && window.parent.appInstance.songManager) {
                        // Try matching by ID first
                        let song = window.parent.appInstance.songManager.songs.find(s => s.id === cleanSongTitle);
                        if (!song) {
                            // Fallback to matching by Title
                            song = window.parent.appInstance.songManager.songs.find(s => s.title.trim().toLowerCase() === cleanSongTitle.toLowerCase());
                        }
                        if (song) {
                            songId = song.id;
                            cleanSongTitle = song.title;
                        }
                    }
                    
                    if (songId) {
                        songStatusHTML = `Viewing: <a href="#" style="color: #4f46e5; text-decoration: none; font-weight: 600; transition: color 0.2s;" onmouseover="this.style.color='#7c3aed'; this.style.textDecoration='underline';" onmouseout="this.style.color='#4f46e5'; this.style.textDecoration='none';" onclick="event.preventDefault(); window.bandDashboard.openSong('${songId}');">${cleanSongTitle}</a>`;
                    } else {
                        songStatusHTML = `Viewing: ${cleanSongTitle}`;
                    }
                }
            }
                
            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                    <div class="member-avatar">${initials}</div>
                    <div class="member-info">
                        <div class="member-name">${member.displayName} ${member.uid === this.currentUser.uid ? '(You)' : ''}</div>
                        <div class="member-role">${songStatusHTML}</div>
                    </div>
                </div>
                <div class="presence-dot ${isOnline ? 'online' : ''}" title="${isOnline ? 'Online' : 'Offline'}"></div>
            `;
            
            this.bandLobbyList.appendChild(item);
        });
    }

    openSong(songId) {
        if (window.parent && window.parent.appInstance && window.parent.appInstance.songDetailModal) {
            window.parent.appInstance.songDetailModal.openPureTimelineForSong(songId);
            if (typeof window.parent.closeDashboardPanel === 'function') {
                window.parent.closeDashboardPanel();
            }
        }
    }

    cleanupActiveListeners() {
        if (this.presenceRef) {
            this.presenceRef.remove();
            this.presenceRef = null;
        }
        if (this.lobbyListenerRef && this.selectedBandId) {
            this.firebaseManager.database.ref(`bandSync/${this.selectedBandId}/present`).off('value', this.lobbyListenerRef);
            this.lobbyListenerRef = null;
        }
        if (this.setlistsMetadataListenerRef && this.selectedBandId) {
            this.firebaseManager.database.ref(`bands/${this.selectedBandId}/setlists`).off('value', this.setlistsMetadataListenerRef);
            this.setlistsMetadataListenerRef = null;
        }
        if (this.setlistSongsListenerRef && this.selectedBandId && this.selectedSetlistId) {
            this.firebaseManager.database.ref(`bands/${this.selectedBandId}/setlists/${this.selectedSetlistId}/songs`).off('value', this.setlistSongsListenerRef);
            this.setlistSongsListenerRef = null;
        }
        this.selectedBandId = null;
        this.selectedSetlistId = null;

        // Hide edit mode on cleanup
        if (this.isSetlistEditMode) {
            this.isSetlistEditMode = false;
            if (this.manageSetlistBtn) {
                this.manageSetlistBtn.textContent = 'Manage';
                this.manageSetlistBtn.className = 'btn-secondary';
            }
            if (this.setlistEditMode) this.setlistEditMode.style.display = 'none';
        }
    }

    async togglePracticeSession() {
        if (!this.selectedBandId) return;

        const currentActive = localStorage.getItem('bandPracticeSessionActive') === 'true';
        const newActive = !currentActive;
        localStorage.setItem('bandPracticeSessionActive', newActive ? 'true' : 'false');
        
        // Update presence accordingly
        if (newActive) {
            // Write presence
            const displayName = this.currentUser.displayName || this.currentUser.email.split('@')[0];
            this.presenceRef = this.firebaseManager.database.ref(`bandSync/${this.selectedBandId}/present/${this.currentUser.uid}`);
            await this.presenceRef.set({
                displayName: displayName,
                songId: 'Viewing Dashboard',
                connectedAt: Date.now()
            });
            this.presenceRef.onDisconnect().remove();
            
            // Also setup presence in FirebaseManager
            await this.firebaseManager.setupGlobalPresence();
        } else {
            // Clean up presence
            if (this.presenceRef) {
                await this.presenceRef.remove();
                this.presenceRef = null;
            }
            // Clear in FirebaseManager
            await this.firebaseManager.clearPresenceForAllBands();
        }

        // Update button UI
        this.updatePracticeSessionBtnUI();
        
        // Trigger re-render of lobby presence list immediately
        const lobbyRef = this.firebaseManager.database.ref(`bandSync/${this.selectedBandId}/present`);
        const snapshot = await lobbyRef.once('value');
        const onlinePresence = snapshot.val() || {};
        
        // Get registered members again
        const membersResult = await this.firebaseManager.getBandMembers(this.selectedBandId);
        if (membersResult.success) {
            this.renderMembersPresence(membersResult.members, onlinePresence);
        }
    }

    updatePracticeSessionBtnUI() {
        if (!this.bandPracticeSessionBtn) return;
        const active = localStorage.getItem('bandPracticeSessionActive') === 'true';
        if (active) {
            this.bandPracticeSessionBtn.textContent = '🔴 Stop Band Practice Session';
            this.bandPracticeSessionBtn.style.backgroundColor = '#ef4444';
            this.bandPracticeSessionBtn.onmouseover = () => { this.bandPracticeSessionBtn.style.backgroundColor = '#dc2626'; };
            this.bandPracticeSessionBtn.onmouseout = () => { this.bandPracticeSessionBtn.style.backgroundColor = '#ef4444'; };
        } else {
            this.bandPracticeSessionBtn.textContent = '🟢 Start Band Practice Session';
            this.bandPracticeSessionBtn.style.backgroundColor = '#10b981';
            this.bandPracticeSessionBtn.onmouseover = () => { this.bandPracticeSessionBtn.style.backgroundColor = '#059669'; };
            this.bandPracticeSessionBtn.onmouseout = () => { this.bandPracticeSessionBtn.style.backgroundColor = '#10b981'; };
        }
    }

    async joinBand() {
        const code = this.joinCodeInput.value.trim();
        if (!code) {
            this.showError(this.joinErrorMsg, 'Please enter a band code.');
            return;
        }
        
        this.joinBandBtn.disabled = true;
        this.joinErrorMsg.style.display = 'none';
        
        const result = await this.firebaseManager.joinBand(code);
        this.joinBandBtn.disabled = false;
        
        if (result.success) {
            this.joinCodeInput.value = '';
            localStorage.setItem('lastSelectedBandId', result.bandId);
            this.loadDashboard();
            this.showToast(`Joined band: ${result.name}!`);
        } else {
            this.showError(this.joinErrorMsg, result.error);
        }
    }

    async createBand() {
        const name = this.createNameInput.value.trim();
        if (!name) {
            this.showError(this.createErrorMsg, 'Please enter a band name.');
            return;
        }
        
        this.createBandBtn.disabled = true;
        this.createErrorMsg.style.display = 'none';
        
        const result = await this.firebaseManager.createBand(name);
        this.createBandBtn.disabled = false;
        
        if (result.success) {
            this.createNameInput.value = '';
            localStorage.setItem('lastSelectedBandId', result.bandId);
            this.loadDashboard();
            this.showToast(`Created band: ${name}!`);
        } else {
            this.showError(this.createErrorMsg, result.error);
        }
    }

    async leaveBand() {
        if (!this.selectedBandId) return;
        
        const activeBand = this.bands.find(b => b.id === this.selectedBandId);
        const name = activeBand ? activeBand.name : 'this band';
        
        if (!confirm(`Are you sure you want to leave "${name}"?`)) {
            return;
        }
        
        const result = await this.firebaseManager.leaveBand(this.selectedBandId);
        if (result.success) {
            this.showToast(`Left band: ${name}`);
            localStorage.removeItem('lastSelectedBandId');
            this.loadDashboard();
        } else {
            alert('Failed to leave band: ' + result.error);
        }
    }

    copyInviteCode() {
        const code = this.bandCodeText.textContent;
        if (!code || code === '-') return;
        
        navigator.clipboard.writeText(code).then(() => {
            this.toast.classList.add('show');
            setTimeout(() => {
                this.toast.classList.remove('show');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy code:', err);
        });
    }

    showError(element, message) {
        element.textContent = message;
        element.style.display = 'block';
    }

    showToast(message) {
        this.toast.textContent = message;
        this.toast.classList.add('show');
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 2000);
    }

    // Setlist Helpers & UI Rendering
    getSongsLibrary() {
        if (window.parent && window.parent.appInstance && window.parent.appInstance.songManager) {
            return window.parent.appInstance.songManager.songs;
        }
        if (typeof DEFAULT_SONGS !== 'undefined') {
            return DEFAULT_SONGS;
        }
        return [];
    }

    setupSetlistHandlers() {
        if (this.setlistSelect) {
            this.setlistSelect.onchange = (e) => {
                this.switchActiveSetlist(e.target.value);
            };
        }

        if (this.createSetlistBtn) {
            this.createSetlistBtn.onclick = async () => {
                if (!this.selectedBandId) return;
                const name = prompt('Enter a name for the new setlist:');
                if (!name || !name.trim()) return;

                const newRef = this.firebaseManager.database.ref(`bands/${this.selectedBandId}/setlists`).push();
                const newId = newRef.key;

                await newRef.set({
                    id: newId,
                    name: name.trim(),
                    songs: [],
                    createdAt: Date.now()
                });

                localStorage.setItem(`band_${this.selectedBandId}_selectedSetlistId`, newId);
                this.showToast(`Setlist "${name}" created.`);
            };
        }

        if (this.renameSetlistBtn) {
            this.renameSetlistBtn.onclick = async () => {
                if (!this.selectedBandId || !this.selectedSetlistId) return;

                // Fetch current name
                const snap = await this.firebaseManager.database.ref(`bands/${this.selectedBandId}/setlists/${this.selectedSetlistId}/name`).once('value');
                const currentName = snap.val() || 'Setlist';

                const newName = prompt('Enter a new name for this setlist:', currentName);
                if (!newName || !newName.trim() || newName.trim() === currentName) return;

                await this.firebaseManager.database.ref(`bands/${this.selectedBandId}/setlists/${this.selectedSetlistId}/name`).set(newName.trim());
                this.showToast(`Setlist renamed to "${newName.trim()}".`);
            };
        }

        if (this.deleteSetlistBtn) {
            this.deleteSetlistBtn.onclick = async () => {
                if (!this.selectedBandId || !this.selectedSetlistId) return;

                // Count setlists
                const snap = await this.firebaseManager.database.ref(`bands/${this.selectedBandId}/setlists`).once('value');
                const setlists = snap.val() || {};
                const keys = Object.keys(setlists);

                if (keys.length <= 1) {
                    alert('You cannot delete the last remaining setlist.');
                    return;
                }

                const currentName = setlists[this.selectedSetlistId]?.name || 'Setlist';
                if (!confirm(`Are you sure you want to delete the setlist "${currentName}"? This action cannot be undone.`)) {
                    return;
                }

                // Clean up songs listener before delete to prevent temporary errors
                if (this.setlistSongsListenerRef) {
                    this.firebaseManager.database.ref(`bands/${this.selectedBandId}/setlists/${this.selectedSetlistId}/songs`).off('value', this.setlistSongsListenerRef);
                    this.setlistSongsListenerRef = null;
                }

                const oldId = this.selectedSetlistId;
                await this.firebaseManager.database.ref(`bands/${this.selectedBandId}/setlists/${oldId}`).remove();

                // Select another setlist
                const remainingKeys = keys.filter(k => k !== oldId);
                const nextId = remainingKeys[0];
                localStorage.setItem(`band_${this.selectedBandId}_selectedSetlistId`, nextId);
                this.selectedSetlistId = nextId;

                this.showToast(`Setlist "${currentName}" deleted.`);
            };
        }

        if (!this.manageSetlistBtn) return;

        this.manageSetlistBtn.onclick = () => {
            this.isSetlistEditMode = !this.isSetlistEditMode;
            this.manageSetlistBtn.textContent = this.isSetlistEditMode ? 'Done' : 'Manage';
            this.manageSetlistBtn.className = this.isSetlistEditMode ? 'btn-primary' : 'btn-secondary';
            this.setlistEditMode.style.display = this.isSetlistEditMode ? 'block' : 'none';
            this.renderSetlist();
            
            this.setlistSearchInput.value = '';
            this.setlistAutocomplete.style.display = 'none';
        };

        // Autocomplete
        this.setlistSearchInput.oninput = (e) => {
            const query = e.target.value.toLowerCase().trim();
            this.setlistAutocomplete.innerHTML = '';
            
            if (!query) {
                this.setlistAutocomplete.style.display = 'none';
                return;
            }

            const library = this.getSongsLibrary();
            const scored = [];

            library.forEach(song => {
                const title = (song.title || '').toLowerCase();
                const artist = (song.artist || '').toLowerCase();
                let score = 0;

                if (title === query) score = 10;
                else if (artist === query) score = 9;
                else if (title.startsWith(query)) score = 8;
                else if (artist.startsWith(query)) score = 7;
                else if (title.includes(query)) score = 6;
                else if (artist.includes(query)) score = 5;

                if (score > 0) {
                    scored.push({ song, score });
                }
            });

            // Sort by score descending, then alphabetically by title
            scored.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return a.song.title.localeCompare(b.song.title);
            });

            const matches = scored.map(item => item.song).slice(0, 20);

            if (matches.length === 0) {
                this.setlistAutocomplete.style.display = 'none';
                return;
            }

            matches.forEach(song => {
                const item = document.createElement('div');
                item.className = 'autocomplete-item';
                item.innerHTML = `
                    <div class="autocomplete-item-title">${song.title}</div>
                    <div class="autocomplete-item-artist">${song.artist}</div>
                `;
                item.onclick = () => {
                    this.setlistSearchInput.value = song.title;
                    this.setlistSearchInput.dataset.selectedSongId = song.id;
                    this.setlistSearchInput.dataset.selectedSongTitle = song.title;
                    this.setlistSearchInput.dataset.selectedSongArtist = song.artist;
                    this.setlistAutocomplete.style.display = 'none';
                };
                this.setlistAutocomplete.appendChild(item);
            });

            this.setlistAutocomplete.style.display = 'block';
        };

        // Hide autocomplete on click outside
        document.addEventListener('click', (e) => {
            if (this.setlistAutocomplete && !this.setlistAutocomplete.contains(e.target) && e.target !== this.setlistSearchInput) {
                this.setlistAutocomplete.style.display = 'none';
            }
        });

        // Add Song Button
        this.addSongToSetlistBtn.onclick = () => {
            const titleInput = this.setlistSearchInput.value.trim();
            if (!titleInput) return;

            const songId = this.setlistSearchInput.dataset.selectedSongId;
            const songTitle = this.setlistSearchInput.dataset.selectedSongTitle || titleInput;
            let songArtist = this.setlistSearchInput.dataset.selectedSongArtist || 'Unknown Artist';

            if (!songId) {
                const library = this.getSongsLibrary();
                const matched = library.find(s => (s.title || '').toLowerCase() === titleInput.toLowerCase());
                if (matched) {
                    this.addSong(matched.id, matched.title, matched.artist);
                    return;
                }
            }

            if (songId) {
                this.addSong(songId, songTitle, songArtist);
            } else {
                alert('Please select a song from the autocomplete dropdown list.');
            }
        };
    }

    async addSong(id, title, artist) {
        if (!this.selectedBandId || !this.selectedSetlistId) return;
        
        const alreadyExists = this.setlistSongs.some(s => s.id === id);
        if (alreadyExists) {
            if (!confirm(`"${title}" is already in the setlist. Add it again?`)) {
                return;
            }
        }

        const newSong = { id, title, artist };
        const updatedSetlist = [...this.setlistSongs, newSong];
        
        await this.firebaseManager.database.ref(`bands/${this.selectedBandId}/setlists/${this.selectedSetlistId}/songs`).set(updatedSetlist);
        this.showToast(`Added "${title}" to setlist.`);
        
        this.setlistSearchInput.value = '';
        delete this.setlistSearchInput.dataset.selectedSongId;
        delete this.setlistSearchInput.dataset.selectedSongTitle;
        delete this.setlistSearchInput.dataset.selectedSongArtist;
    }

    async deleteSong(index) {
        if (!this.selectedBandId || !this.selectedSetlistId) return;
        
        const song = this.setlistSongs[index];
        if (!song) return;

        const updatedSetlist = [...this.setlistSongs];
        updatedSetlist.splice(index, 1);
        
        await this.firebaseManager.database.ref(`bands/${this.selectedBandId}/setlists/${this.selectedSetlistId}/songs`).set(updatedSetlist);
        this.showToast(`Removed "${song.title}" from setlist.`);
    }

    async moveSong(index, direction) {
        if (!this.selectedBandId || !this.selectedSetlistId) return;
        
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= this.setlistSongs.length) return;

        const updatedSetlist = [...this.setlistSongs];
        const temp = updatedSetlist[index];
        updatedSetlist[index] = updatedSetlist[newIndex];
        updatedSetlist[newIndex] = temp;

        await this.firebaseManager.database.ref(`bands/${this.selectedBandId}/setlists/${this.selectedSetlistId}/songs`).set(updatedSetlist);
    }

    renderSetlist() {
        if (!this.setlistSongList) return;
        this.setlistSongList.innerHTML = '';

        if (this.setlistSongs.length === 0) {
            this.setlistSongList.innerHTML = `<div style="text-align: center; color: #64748b; font-size: 0.9rem; padding: 20px 0;">No songs in setlist yet. Click 'Manage' to add songs!</div>`;
            return;
        }

        this.setlistSongs.forEach((song, index) => {
            const item = document.createElement('div');
            item.className = 'setlist-song-item';
            
            if (!this.isSetlistEditMode) {
                item.classList.add('clickable');
                item.onclick = () => this.openSong(song.id);

                item.innerHTML = `
                    <div style="display: flex; align-items: center; flex: 1; min-width: 0;">
                        <div class="setlist-song-rank">${index + 1}</div>
                        <div style="min-width: 0;">
                            <div class="setlist-song-title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${song.title}</div>
                            <div class="setlist-song-artist" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${song.artist}</div>
                        </div>
                    </div>
                    <div style="color: #4f46e5; font-size: 1.1rem; font-weight: bold;">▶</div>
                `;
            } else {
                item.setAttribute('draggable', 'true');
                item.dataset.index = index;
                this.setupDragEvents(item);

                item.innerHTML = `
                    <div style="display: flex; align-items: center; flex: 1; min-width: 0;">
                        <div class="drag-handle" title="Drag to reorder">☰</div>
                        <div class="setlist-song-rank">${index + 1}</div>
                        <div style="min-width: 0;">
                            <div class="setlist-song-title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${song.title}</div>
                            <div class="setlist-song-artist" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${song.artist}</div>
                        </div>
                    </div>
                    <div class="setlist-song-controls">
                        <button class="reorder-btn" title="Move Up" ${index === 0 ? 'disabled' : ''} onclick="event.stopPropagation(); window.bandDashboard.moveSong(${index}, -1)">▲</button>
                        <button class="reorder-btn" title="Move Down" ${index === this.setlistSongs.length - 1 ? 'disabled' : ''} onclick="event.stopPropagation(); window.bandDashboard.moveSong(${index}, 1)">▼</button>
                        <button class="reorder-btn" title="Delete Song" style="color: #ef4444;" onclick="event.stopPropagation(); window.bandDashboard.deleteSong(${index})">🗑️</button>
                    </div>
                `;
            }

            this.setlistSongList.appendChild(item);
        });
    }

    setupDragEvents(item) {
        item.addEventListener('dragstart', (e) => {
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', item.dataset.index);
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            document.querySelectorAll('.setlist-song-item').forEach(el => el.classList.remove('drag-over'));
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const draggingEl = document.querySelector('.dragging');
            if (draggingEl && draggingEl !== item) {
                item.classList.add('drag-over');
            }
        });

        item.addEventListener('dragleave', () => {
            item.classList.remove('drag-over');
        });

        item.addEventListener('drop', async (e) => {
            e.preventDefault();
            item.classList.remove('drag-over');
            
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
            const toIndex = parseInt(item.dataset.index, 10);
            
            if (isNaN(fromIndex) || isNaN(toIndex) || fromIndex === toIndex) return;

            const updatedSetlist = [...this.setlistSongs];
            const [movedItem] = updatedSetlist.splice(fromIndex, 1);
            updatedSetlist.splice(toIndex, 0, movedItem);

            await this.firebaseManager.database.ref(`bands/${this.selectedBandId}/setlists/${this.selectedSetlistId}/songs`).set(updatedSetlist);
        });
    }
}

// Instantiate
document.addEventListener('DOMContentLoaded', () => {
    window.bandDashboard = new BandDashboard();
});
