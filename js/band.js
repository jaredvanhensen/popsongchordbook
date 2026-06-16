class BandDashboard {
    constructor() {
        this.firebaseManager = window.firebaseManager || new FirebaseManager();
        
        // UI Elements
        this.activeBandPanel = document.getElementById('activeBandPanel');
        this.noBandMessage = document.getElementById('noBandMessage');
        this.bandSelect = document.getElementById('bandSelect');
        this.bandCodeText = document.getElementById('bandCodeText');
        this.bandLobbyList = document.getElementById('bandLobbyList');
        
        this.copyCodeBtn = document.getElementById('copyCodeBtn');
        this.leaveBandBtn = document.getElementById('leaveBandBtn');
        
        this.joinCodeInput = document.getElementById('joinCodeInput');
        this.joinBandBtn = document.getElementById('joinBandBtn');
        this.joinErrorMsg = document.getElementById('joinErrorMsg');
        
        this.createNameInput = document.getElementById('createNameInput');
        this.createBandBtn = document.getElementById('createBandBtn');
        this.createErrorMsg = document.getElementById('createErrorMsg');
        
        this.toast = document.getElementById('toast');
        
        // State
        this.currentUser = null;
        this.bands = [];
        this.selectedBandId = null;
        
        // Firebase Listeners reference
        this.presenceRef = null;
        this.lobbyListenerRef = null;
        
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
        
        // Start listening to real-time lobby presence
        const lobbyRef = this.firebaseManager.database.ref(`bandSync/${bandId}/present`);
        this.lobbyListenerRef = lobbyRef.on('value', snapshot => {
            const onlinePresence = snapshot.val() || {};
            this.renderMembersPresence(registeredMembers, onlinePresence);
        });
    }

    renderMembersPresence(registeredMembers, onlinePresence) {
        this.bandLobbyList.innerHTML = '';
        
        registeredMembers.forEach(member => {
            const isOnline = !!onlinePresence[member.uid];
            const presenceDetails = onlinePresence[member.uid];
            
            const item = document.createElement('div');
            item.className = 'member-item';
            
            const initials = member.displayName ? member.displayName.substring(0, 2).toUpperCase() : '??';
            
            const songStatus = isOnline && presenceDetails 
                ? (presenceDetails.songId === 'Viewing Dashboard' ? 'Viewing Dashboard' : `Viewing: ${presenceDetails.songId}`)
                : 'Offline';
                
            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                    <div class="member-avatar">${initials}</div>
                    <div class="member-info">
                        <div class="member-name">${member.displayName} ${member.uid === this.currentUser.uid ? '(You)' : ''}</div>
                        <div class="member-role">${songStatus}</div>
                    </div>
                </div>
                <div class="presence-dot ${isOnline ? 'online' : ''}" title="${isOnline ? 'Online' : 'Offline'}"></div>
            `;
            
            this.bandLobbyList.appendChild(item);
        });
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
        this.selectedBandId = null;
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
}

// Instantiate
document.addEventListener('DOMContentLoaded', () => {
    window.bandDashboard = new BandDashboard();
});
