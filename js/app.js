// Main Application (v2.492)
class App {
    constructor() {
        // Initialize Firebase Manager first
        this.firebaseManager = new FirebaseManager();
        this.authModal = null;
        this.isAuthenticated = false;
        this.migrationCompleted = false;

        // Initialize managers (will be connected to Firebase after auth)
        this.songManager = new SongManager(this.firebaseManager);
        this.setlistManager = new SetlistManager(this.firebaseManager);
        this.sorter = new Sorter();
        this.keyDetector = new KeyDetector();
        this.chordModal = new ChordModal();
        this.songDetailModal = new SongDetailModal(
            this.songManager,
            (songId, isRandomMode = false) => this.navigateToSong(songId, isRandomMode),
            () => this.loadAndRender(), // Refresh table when song is updated
            this.chordModal, // Pass chordModal for chord button
            (songId) => this.handleToggleFavorite(songId), // Pass favorite toggle handler
            (songId) => this.handlePlayYouTube(songId), // Pass YouTube play handler
            this.keyDetector,
            (songId) => this.openAddToSetlistSingleModal(songId), // Pass Add to Setlist handler
            (songId) => this.handleTogglePractice(songId), // Pass Practice toggle handler
            (songId) => this.setlistManager.isSongInPracticeSetlist(songId), // Pass Practice state checker
            () => this.openPracticeRandomSong(), // Pass Next Practice Random handler
            () => this.handlePracticeRandomPrev() // Pass Previous Practice Random handler
        );
        this.chordDetectorOverlay = new ChordDetectorOverlay();
        this.currentFilter = {
            favorites: false,
            key: '',
            withYouTube: false,
            withoutYouTube: false,
            withoutLyrics: false
        };
        this.currentSetlistId = null;
        this.searchTerm = '';
        this.addSongsSearchTerm = '';
        this.addSongsSortField = 'title';
        this.addSongsSortDirection = 'asc';
        this.lastAddSongsSetlistId = null;
        this.viewMode = 'full'; // 'simple' or 'full'
        this.practiceHistory = []; // Stack to keep track of practiced songs
        this.modalStack = []; // Stack to track open modals for history management

        this.confirmationModal = new ConfirmationModal(); // Initialize confirmation modal

        this.tableRenderer = new TableRenderer(
            this.songManager,
            (songId) => this.handleRowSelect(songId),
            (songId, field, value) => this.handleCellEdit(songId, field, value),
            (songId) => this.handleDelete(songId),
            this.chordModal,
            (songId) => this.handleToggleFavorite(songId),
            (songId) => this.handlePlayYouTube(songId),
            this.keyDetector,
            null, // onRemoveFromSetlist - will be set in setupSetlists or init
            this.confirmationModal // Pass confirmation modal
        );

        this.init();
    }

    async init() {
        // Apply saved theme immediately
        const savedTheme = localStorage.getItem('user-theme') || 'theme-classic';
        document.body.classList.add(savedTheme);

        // History management for modals
        window.addEventListener('popstate', (event) => {
            this.handlePopState(event);
        });

        // Initialize theme switcher
        this.setupThemeSwitcher();

        console.log("Pop Song Chord Book - App Initialized (v2.492)");
        // Setup message listener for UG Extractor ASAP
        this.setupExtractorListener();

        // Initialize Firebase
        try {
            await this.firebaseManager.initialize();
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            alert('Firebase initialisatie mislukt. Controleer je Firebase configuratie.');
            return;
        }
        // Setup auth modal
        this.authModal = new AuthModal(this.firebaseManager, (user) => this.handleAuthSuccess(user));

        // Setup profile modal (will be initialized after auth)
        this.profileModal = null;

        // Wait for auth state to be restored (handles page refresh)
        // This ensures we wait for Firebase to restore the session before checking auth state
        await new Promise((resolve) => {
            let resolved = false;
            // Setup auth state listener - wait for first state change
            this.firebaseManager.onAuthStateChanged((user) => {
                if (user) {
                    // User is authenticated (either logged in or session restored)
                    if (!this.isAuthenticated) {
                        this.handleAuthSuccess(user);
                    }
                } else {
                    // No user - show login modal
                    if (!this.isAuthenticated) {
                        this.handleAuthFailure();
                    }
                }
                // Resolve after first auth state check (only once)
                if (!resolved) {
                    resolved = true;
                    resolve();
                }
            });
        });

        // Setup Chord Trainer navigation
        this.setupChordTrainer();
    }

    pushModalState(modalId, closeFn) {
        this.modalStack.push({ id: modalId, close: closeFn });
        history.pushState({ modalId: modalId }, "");
    }

    popModalState(modalId) {
        if (history.state && history.state.modalId === modalId) {
            history.back();
            // Popping from stack will happen in handlePopState
        } else {
            const index = this.modalStack.findIndex(m => String(m.id) === String(modalId));
            if (index !== -1) {
                const modal = this.modalStack[index];
                this.modalStack.splice(index, 1);
                // FORCE CLOSE: Ensure the close function is called even if history wasn't popped
                if (modal && typeof modal.close === 'function') {
                    modal.close();
                }
            }
        }
    }

    handlePopState(event) {
        if (this.modalStack.length > 0) {
            const modal = this.modalStack.pop();
            if (modal && typeof modal.close === 'function') {
                modal.close();
            }
        }
    }

    async initializeApp() {
        this.isAuthenticated = true;

        // Setup sharing modals
        this.shareSongsModal = new ShareSongsModal(this.firebaseManager, this.songManager);
        this.acceptSongsModal = new AcceptSongsModal(this.firebaseManager, this.songManager);

        // Setup profile modal
        this.profileModal = new ProfileModal(
            this.firebaseManager,
            this.songManager,
            () => this.handleSignOut(),
            () => this.shareSongsModal.show(),
            () => this.acceptSongsModal.show()
        );
        this.profileModal.onAuthSuccess = (user) => {
            this.updateProfileLabel(user);
        };
        this.setupProfile();

        // Setup UI components
        this.setupSorting();
        this.setupAddSongButton();
        this.setupRandomSongButton();
        this.setupPracticeRandomButton();
        this.setupFilters();
        this.setupSearch();
        this.setupSetlists();
        this.setlistManager.onSetlistsChanged = () => this.handleSetlistChange();
        this.setupAddSongsToSetlistModal();
        this.setupAddToSetlistSingleModal();
        this.setupImportExport();
        this.setupPrintButton();
        this.setupDeselect();
        this.setupHeaderBarToggle();
        this.setupToggleView();

        this.setupResponsiveView();
        this.setupCreateSongModal();

        // Setup real-time sync
        this.setupRealtimeSync();

        // Load data from Firebase
        await this.loadDataFromFirebase();

        // Initialize pending songs count
        const userId = this.firebaseManager.getCurrentUser().uid;
        this.firebaseManager.getPendingSongsCount(userId).then(count => {
            this.updatePendingSongsCount(count);
        });

        // Load and render songs (no default songs for new users)
        // Initialize and sync Chord Trainer high scores
        const user = this.firebaseManager.getCurrentUser();
        if (user) {
            this.firebaseManager.getHighScores(user.uid).then(dbScores => {
                if (dbScores) {
                    const localScores = JSON.parse(localStorage.getItem('chordTrainerHighScores') || '{}');
                    const merged = { ...localScores, ...dbScores };
                    localStorage.setItem('chordTrainerHighScores', JSON.stringify(merged));
                    // Re-render profile if open
                    if (this.profileModal && !this.profileModal.modal.classList.contains('hidden')) {
                        this.profileModal.updateStatistics();
                    }
                }
            });
        }

        this.loadAndRender();
        
        // Handle direct song navigation via URL (back from Trainer)
        const urlParams = new URLSearchParams(window.location.search);
        const urlSongId = (urlParams.get('songId') || urlParams.get('id'))?.trim();
        if (urlSongId) {
            console.log('App: Auto-navigating to song ID:', urlSongId);
            let attempts = 0;
            const checkAndNavigate = () => {
                const song = this.songManager.getSongById(urlSongId);
                if (song) {
                    console.log('App: Song found, opening modal');
                    this.navigateToSong(urlSongId);
                    // Clear the parameter from URL to prevent reopening on manual refresh
                    window.history.replaceState({}, '', window.location.pathname);
                } else if (attempts < 20) {
                    attempts++;
                    setTimeout(checkAndNavigate, 200);
                } else {
                    console.warn('App: Could not find song with ID after several attempts:', urlSongId);
                }
            };
            checkAndNavigate();
        }

        // DEBUG: Diagnostics on Version Click
        const versionEl = document.getElementById('site-version');
        if (versionEl) {
            versionEl.style.cursor = 'pointer';
            versionEl.title = 'Click for Diagnostics';
            versionEl.addEventListener('click', () => this.runDiagnostics());
        }
    }

    async handleAuthSuccess(user) {
        // Enforce email verification
        if (user && !user.emailVerified) {
            console.log('User logged in but email not verified.');
            // If signup is in progress, ignore this intermediate state
            if (this.authModal && this.authModal.isBusy) {
                console.log('handleAuthSuccess: unverified user ignored - signup in progress');
                return;
            }
            this.handleAuthFailure();
            if (this.authModal) {
                this.authModal.showLoginError('Please verify your email address. Check your inbox.');
            }
            return;
        }

        if (!this.isAuthenticated) {
            // First time authentication - check for migration
            await this.checkAndMigrateData(user);
            await this.initializeApp();
            
            // Handle redirect if present in URL
            const urlParams = new URLSearchParams(window.location.search);
            const redirect = urlParams.get('redirect');
            if (redirect) {
                console.log('Auth success: redirecting to', redirect);
                window.location.href = redirect;
                return;
            }
        }

        // Ensure email index exists for this user (for existing users)
        if (user && user.email) {
            try {
                await this.firebaseManager.ensureEmailIndex(user.uid, user.email);
            } catch (error) {
                console.error('Error ensuring email index:', error);
            }
        }

        this.updateProfileLabel(user);
        
        // Sync preferences (Instrument choice, etc.)
        await this.syncUserPreferences(user);
    }

    handleAuthFailure() {
        this.isAuthenticated = false;
        // Disable sync
        this.songManager.disableSync();
        this.setlistManager.disableSync();
        this.updateProfileLabel(null);

        // Show login modal (unless we are showing the verification confirmation or signing up/busy)
        if (this.authModal && !this.authModal.isShowingVerification && !this.authModal.isBusy) {
            // Only call show() if the modal isn't already visible to avoid resetting its state (like error messages)
            const isModalVisible = this.authModal.modal &&
                (this.authModal.modal.style.display === 'flex' ||
                    !this.authModal.modal.classList.contains('hidden'));

            if (!isModalVisible) {
                console.log('handleAuthFailure: logic triggered - showing login modal');
                this.authModal.show(true);
            } else {
                console.log('handleAuthFailure: logic suppressed - modal already visible');
            }
        } else {
            console.log('handleAuthFailure: logic suppressed (verification modal or busy)');
        }
    }

    handleSignOut() {
        // Remove pending songs listener
        const userId = this.firebaseManager.getCurrentUser()?.uid;
        if (userId) {
            this.firebaseManager.removePendingSongsListener(userId);
        }
        this.updatePendingSongsCount(0);
        this.isAuthenticated = false;
        // Disable sync
        this.songManager.disableSync();
        this.setlistManager.disableSync();
        this.updateProfileLabel(null);
        // Show login modal — but NOT if signup/verification is in progress
        if (this.authModal && !this.authModal.isBusy && !this.authModal.isShowingVerification) {
            const isModalVisible = this.authModal.modal &&
                (this.authModal.modal.style.display === 'flex' ||
                    !this.authModal.modal.classList.contains('hidden'));
            if (!isModalVisible) {
                this.authModal.show(true);
            }
        } else {
            console.log('handleSignOut: modal show suppressed (busy or showing verification)');
        }
    }

    setupChordTrainer() {
        const desktopBtn = document.getElementById('headerTrainerBtn');
        const mobileBtn = document.getElementById('mobileTrainerBtn');

        const navigateToTrainer = () => {
            window.location.href = 'ChordTrainer.html';
        };

        if (desktopBtn) {
            desktopBtn.addEventListener('click', navigateToTrainer);
        }
        if (mobileBtn) {
            // Already handled by inline onclick, but adding listener won't hurt
            // unless it double navigates. 
            // Actually, I'll remove the inline onclick later if needed.
            // But let's just make it robust.
            mobileBtn.addEventListener('click', navigateToTrainer);
        }
    }

    setupProfile() {
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn && this.profileModal) {
            profileBtn.addEventListener('click', () => {
                this.pushModalState('profile', () => this.profileModal.hide(true));
                this.profileModal.show();
            });
        }
        // Update profile label and song count
        this.updateProfileLabel(this.firebaseManager.getCurrentUser());
        this.updateProfileSongCount();
    }

    async updateProfileLabel(user) {
        const profileBtn = document.getElementById('profileBtn');
        if (!profileBtn) return;

        const labelElement = profileBtn.querySelector('.label');
        const iconElement = profileBtn.querySelector('.icon');

        // Logic to get avatar URL
        let avatarUrl = null;
        if (user) {
            try {
                avatarUrl = await this.firebaseManager.getUserAvatar(user.uid);
            } catch (e) {
                console.warn("Failed to load avatar from DB", e);
            }
            if (!avatarUrl) avatarUrl = user.photoURL;
        }

        // CLEANUP: Remove ANY existing profile images to prevent duplicates
        const existingImages = profileBtn.querySelectorAll('.header-profile-img');
        existingImages.forEach(img => img.remove());

        // Handle Image Element
        if (avatarUrl) {
            const imgElement = document.createElement('img');
            imgElement.className = 'header-profile-img';
            imgElement.style.cssText = "width: 24px; height: 24px; border-radius: 50%; vertical-align: middle; margin-right: 6px; border: 1px solid rgba(255,255,255,0.3); object-fit: cover;";

            // Insert before label or icon
            if (iconElement) {
                profileBtn.insertBefore(imgElement, iconElement);
            } else if (labelElement) {
                profileBtn.insertBefore(imgElement, labelElement);
            } else {
                profileBtn.appendChild(imgElement);
            }

            imgElement.src = avatarUrl;

            // Hide default icon
            if (iconElement) iconElement.classList.add('hidden');
        } else {
            // Show default icon
            if (iconElement) iconElement.classList.remove('hidden');
        }

        // Update Label Text (Username/Profile)
        if (labelElement) {
            const songCountHtml = `<span id="profileSongCount" class="song-count">(${this.songManager ? this.songManager.getAllSongs().length : 0})</span>`;
            let textContent = '';

            if (user && user.displayName) {
                textContent = `<span>${user.displayName}</span> <span style="font-size: 1.5em; vertical-align: middle; margin-left: 2px; opacity: 0.9;">⚙️</span> ${songCountHtml}`;
            } else {
                textContent = `<span>Profile</span> <span style="font-size: 1.5em; vertical-align: middle; margin-left: 2px; opacity: 0.9;">⚙️</span> ${songCountHtml}`;
            }
            labelElement.innerHTML = textContent;
        }
    }

    updateProfileSongCount() {
        this.updateProfileLabel(this.firebaseManager.getCurrentUser());
    }

    async checkAndMigrateData(user) {
        const userId = user.uid;
        const migrationKey = `migration_completed_${userId}`;

        // Check if migration already completed for this user
        if (localStorage.getItem(migrationKey) === 'true') {
            return; // Migration already done for this user
        }

        // Check if Firebase account already has data (not a new account)
        try {
            const existingSongs = await this.firebaseManager.loadSongs(userId);
            const existingSetlists = await this.firebaseManager.loadSetlists(userId);

            // If account already has data, mark migration as completed and skip
            if (existingSongs.length > 0 || existingSetlists.length > 0) {
                localStorage.setItem(migrationKey, 'true');
                return; // Account already has data, no migration needed
            }
        } catch (error) {
            console.error('Error checking existing data:', error);
            // Continue to check local data
        }

        // Check if there's local data to migrate (only for new accounts)
        const localSongs = localStorage.getItem('popsongChordBook');
        const localSetlists = localStorage.getItem('popsongSetlists');

        if (localSongs || localSetlists) {
            try {
                const songs = localSongs ? JSON.parse(localSongs) : [];
                const setlists = localSetlists ? JSON.parse(localSetlists) : [];

                if (songs.length > 0 || setlists.length > 0) {
                    // Automatically migrate for new accounts without asking
                    console.log("Auto-migrating local data to new Firebase account...");
                    const result = await this.firebaseManager.migrateLocalDataToFirebase(userId, songs, setlists);

                    if (result.merged) {
                        console.log(`Migration: ${result.songsAdded} songs and ${result.setlistsAdded} setlists merged.`);
                    } else {
                        console.log(`Migration: ${result.songsAdded} songs and ${result.setlistsAdded} setlists uploaded.`);
                    }
                }
                
                // Mark migration as completed
                localStorage.setItem(migrationKey, 'true');
            } catch (error) {
                console.error('Migration error:', error);
                alert('Er is een fout opgetreden bij het migreren van data.');
            }
        } else {
            // No local data, mark migration as completed
            localStorage.setItem(migrationKey, 'true');
        }
    }

    async syncUserPreferences(user) {
        if (!user) return;
        
        try {
            console.log('App: Syncing user preferences from Firebase...');
            // 1. Sync Instrument Choice
            let instrument = await this.firebaseManager.getPreference('instrument');
            
            if (instrument) {
                console.log('App: Found instrument in database:', instrument);
                localStorage.setItem(`instrument-mode-${user.uid}`, instrument);
                localStorage.setItem('instrumentMode', instrument); // Fallback for index.html/other parts
                
                // Update active instances if they already exist
                if (this.songDetailModal) {
                    this.songDetailModal.instrumentMode = instrument;
                    this.songDetailModal.updateInstrumentToggleUI();
                    this.songDetailModal.refreshNotation();
                }
                if (this.profileModal) {
                    this.profileModal.updateInstrumentUI(instrument);
                }
            } else {
                // Not in database? Check if we have it locally from index.html (guest session)
                const localInstrument = localStorage.getItem('instrumentMode') || localStorage.getItem(`instrument-mode-${user.uid}`);
                if (localInstrument && localInstrument !== 'piano') { // pianos is default anyway
                    console.log('App: Pushing local instrument to database:', localInstrument);
                    await this.firebaseManager.updatePreference('instrument', localInstrument);
                }
            }
        } catch (error) {
            console.error('App: Error syncing preferences:', error);
        }
    }

    showLoadingIndicator() {
        // Simple console log for now, or implement UI spinner if needed
        console.log("Loading...");
        document.body.style.cursor = 'wait';
    }

    hideLoadingIndicator() {
        console.log("Loading complete.");
        document.body.style.cursor = 'default';
    }

    async loadDataFromFirebase() {
        console.log('Loading data...');

        // Show loading indicator
        this.showLoadingIndicator();

        try {
            // Load songs and setlists in parallel
            const [songs, setlists] = await Promise.all([
                this.songManager.loadSongs(),
                this.setlistManager.loadSetlists()
            ]);

            console.log(`Loaded ${songs.length} songs and ${setlists.length} setlists`);

            // Check for default data (imports songs if empty, creates DEMO setlist if missing)
            await this.seedDefaultData();

            // Sync setlists with songs (clean up deleted songs from setlists)
            // this.setlistManager.cleanupSetlists(this.songManager.getAllSongs());

            // Render the table
            this.handleSetlistChange(this.currentSetlistId);

        } catch (error) {
            console.error('Error loading data:', error);
            alert('Fout bij laden van gegevens: ' + (error.message || error));
        } finally {
            // Hide loading indicator
            this.hideLoadingIndicator();
        }
    }

    async seedDefaultData() {
        console.log("Checking default data...");
        try {
            let allSongs = this.songManager.getAllSongs();

            // 1. Automatic Seeding for Guests AND New Accounts
            const user = this.firebaseManager.getCurrentUser();
            
            if (allSongs.length === 0 && DEFAULT_SONGS && DEFAULT_SONGS.length > 0) {
                if (!user) {
                    // Guest case: Just seed
                    console.log("Empty guest library. Seeding defaults...");
                    await this.songManager.importSongs(DEFAULT_SONGS);
                } else {
                    // Logged in user case: Check cloud flag to see if they've EVER been seeded
                    const seedingDone = await this.firebaseManager.getSeedingStatus(user.uid);
                    if (!seedingDone) {
                        console.log("New account detected. Seeding defaults automatically...");
                        await this.songManager.importSongs(DEFAULT_SONGS);
                        await this.firebaseManager.setSeedingStatus(user.uid, true);
                    } else {
                        console.log("Account already initialized. Skipping auto-seed.");
                    }
                }
                allSongs = this.songManager.getAllSongs(); // Refresh list
            }

            // 2. Check if 'DEMO' Setlist exists
            const allSetlists = this.setlistManager.getAllSetlists();
            const demoExists = allSetlists.some(sl => sl.name === "DEMO");

            if (!demoExists && allSongs.length > 0) {
                console.log("DEMO setlist missing. Creating it...");
                const demoSetlist = await this.setlistManager.createSetlist("DEMO");

                // 3. Add all song IDs to the setlist
                // We add ALL currently loaded songs (which should be the defaults or imported ones)
                const songIds = allSongs.map(s => s.id);
                await this.setlistManager.addSongsToSetlist(demoSetlist.id, songIds);
                console.log("Created DEMO setlist with", songIds.length, "songs.");

                // Reload to reflect changes
                this.loadAndRender();
            }
        } catch (e) {
            console.error("Error seeding default data:", e);
        }
    }

    setupRealtimeSync() {
        const userId = this.firebaseManager.getCurrentUser().uid;

        // Setup songs sync
        this.songManager.onSongsChanged = () => {
            this.loadAndRender();
            this.updateProfileSongCount();
        };
        this.songManager.enableSync(userId);

        // Setup setlists sync
        this.setlistManager.onSetlistsChanged = () => {
            this.updateSetlistSelect();
            this.loadAndRender();
        };
        this.setlistManager.enableSync(userId);

        // Setup pending songs sync
        this.firebaseManager.onPendingSongsChange(userId, (pendingSongs) => {
            this.updatePendingSongsCount(pendingSongs.length);
            // Update accept songs button if profile modal is open
            if (this.profileModal) {
                this.profileModal.updateAcceptSongsButton();
            }
        });
    }

    updatePendingSongsCount(count) {
        const badge = document.getElementById('profileNotificationBadge');
        if (!badge) return;

        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count.toString();
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    setupHeaderBarToggle() {
        const toggleBtn = document.getElementById('toggleHeaderBar');
        const toggleBtnCollapsed = document.getElementById('toggleHeaderBarCollapsed');
        const headerBar = document.getElementById('headerBar');
        const headerTop = document.querySelector('.header-top');

        if (!toggleBtn || !toggleBtnCollapsed || !headerBar) return;

        // Load saved state from localStorage
        const isCollapsed = localStorage.getItem('headerBarCollapsed') === 'true';
        if (isCollapsed) {
            headerBar.classList.add('collapsed');
            if (headerTop) headerTop.classList.add('header-bar-collapsed');
            toggleBtn.style.display = 'none';
            toggleBtnCollapsed.style.display = 'flex';
        } else {
            toggleBtn.style.display = 'flex';
            toggleBtnCollapsed.style.display = 'none';
        }

        const toggleCollapse = () => {
            const isCurrentlyCollapsed = headerBar.classList.contains('collapsed');

            if (isCurrentlyCollapsed) {
                headerBar.classList.remove('collapsed');
                if (headerTop) headerTop.classList.remove('header-bar-collapsed');
                toggleBtn.style.display = 'flex';
                toggleBtnCollapsed.style.display = 'none';
                localStorage.setItem('headerBarCollapsed', 'false');
            } else {
                headerBar.classList.add('collapsed');
                if (headerTop) headerTop.classList.add('header-bar-collapsed');
                toggleBtn.style.display = 'none';
                toggleBtnCollapsed.style.display = 'flex';
                localStorage.setItem('headerBarCollapsed', 'true');
            }
        };

        toggleBtn.addEventListener('click', toggleCollapse);
        toggleBtnCollapsed.addEventListener('click', toggleCollapse);
    }

    loadAndRender() {
        // Save current selected row ID before rendering
        const currentSelectedId = this.tableRenderer ? this.tableRenderer.getSelectedRowId() : null;

        // Close modal when filtering/searching (unless we're restoring the same selection)
        const wasModalOpen = this.songDetailModal && !this.songDetailModal.modal.classList.contains('hidden');
        if (wasModalOpen && !currentSelectedId) {
            this.songDetailModal.hide();
        }

        let allSongs = this.songManager.getAllSongs();

        // Apply filters
        if (this.currentFilter.favorites) {
            allSongs = allSongs.filter(song => song.favorite === true);
        }

        if (this.currentFilter.key && this.currentFilter.key.trim() !== '') {
            const filterKey = this.currentFilter.key.trim().toLowerCase();
            allSongs = allSongs.filter(song => {
                const explicitKey = (song.key || '').trim().toLowerCase();
                if (explicitKey === filterKey) return true;

                // If no explicit key, check detected key
                if (!explicitKey && this.keyDetector) {
                    const detectedKey = (this.keyDetector.detectFromSong(song) || '').trim().toLowerCase();
                    return detectedKey === filterKey;
                }

                return false;
            });
        }

        if (this.currentFilter.withYouTube) {
            allSongs = allSongs.filter(song => song.youtubeUrl && song.youtubeUrl.trim() !== '');
        }

        if (this.currentFilter.withoutYouTube) {
            allSongs = allSongs.filter(song => !song.youtubeUrl || song.youtubeUrl.trim() === '');
        }

        if (this.currentFilter.withoutLyrics) {
            allSongs = allSongs.filter(song => {
                const hasFullLyrics = song.fullLyrics && song.fullLyrics.trim() !== '';
                const hasLegacyLyrics = song.lyrics && song.lyrics.trim() !== '';
                return !hasFullLyrics && !hasLegacyLyrics;
            });
        }

        // Apply setlist filter if a setlist is selected
        if (this.currentSetlistId) {
            allSongs = this.setlistManager.getSongsInSetlist(this.currentSetlistId, allSongs);
        }

        // Apply search filter if search term exists
        if (this.searchTerm && this.searchTerm.trim() !== '') {
            const searchLower = this.searchTerm.toLowerCase().trim();
            allSongs = allSongs.filter(song => {
                const artistMatch = song.artist && song.artist.toLowerCase().includes(searchLower);
                const titleMatch = song.title && song.title.toLowerCase().includes(searchLower);
                return artistMatch || titleMatch;
            });
        }

        // Apply sorting
        if (this.sorter) {
            allSongs = this.sorter.applySort(allSongs);
        }

        // Store current songs list for navigation
        this.currentSongsList = allSongs;
        this.songDetailModal.setSongs(allSongs);

        // Set or unset removal handler depending on setlist mode
        if (this.currentSetlistId) {
            this.tableRenderer.onRemoveFromSetlist = (songId) => this.handleRemoveFromSetlist(songId);
        } else {
            this.tableRenderer.onRemoveFromSetlist = null;
        }

        this.tableRenderer.render(allSongs);

        // Apply view mode after rendering
        this.updateViewMode();

        // Update profile song count
        this.updateProfileSongCount();

        // Update filter button state
        this.updateFilterButtonState();

        // Restore selected row if it still exists (but don't open modal)
        if (currentSelectedId && this.tableRenderer) {
            // Check if the song still exists in the filtered list
            const songExists = allSongs.some(song => String(song.id) === String(currentSelectedId));
            if (songExists) {
                // Small delay to ensure render is complete
                setTimeout(() => {
                    this.tableRenderer.selectRow(currentSelectedId, true); // Skip callback to prevent modal opening
                }, 50);
            } else {
                // Song no longer exists in filtered list, close modal
                this.songDetailModal.hide();
            }
        } else if (!currentSelectedId && wasModalOpen) {
            // No selection to restore and modal was open, close it
            this.songDetailModal.hide();
        }
    }

    setupFilters() {
        const filterBtn = document.getElementById('filterBtn');
        const filterModal = document.getElementById('filterModal');
        const filterModalClose = document.getElementById('filterModalClose');
        const applyFiltersBtn = document.getElementById('applyFiltersBtn');
        const clearAllFiltersBtn = document.getElementById('clearAllFiltersBtn');
        const filterFavoritesCheckbox = document.getElementById('filterFavoritesCheckbox');
        const filterKeySelect = document.getElementById('filterKeySelect');
        const filterWithYouTubeCheckbox = document.getElementById('filterWithYouTubeCheckbox');
        const filterWithoutYouTubeCheckbox = document.getElementById('filterWithoutYouTubeCheckbox');
        const filterWithoutLyricsCheckbox = document.getElementById('filterWithoutLyricsCheckbox');

        // Open filter modal
        filterBtn.addEventListener('click', () => {
            this.populateKeySelect();
            this.updateFilterModalState();
            this.pushModalState('filter', () => filterModal.classList.add('hidden'));
            filterModal.classList.remove('hidden');
        });

        // Close filter modal
        filterModalClose.addEventListener('click', () => {
            this.popModalState('filter');
        });

        filterModal.addEventListener('click', (e) => {
            if (e.target === filterModal) {
                this.popModalState('filter');
            }
        });

        // Apply filters
        applyFiltersBtn.addEventListener('click', () => {
            this.currentFilter = {
                favorites: filterFavoritesCheckbox.checked,
                key: filterKeySelect.value || '',
                withYouTube: filterWithYouTubeCheckbox.checked,
                withoutYouTube: filterWithoutYouTubeCheckbox.checked,
                withoutLyrics: filterWithoutLyricsCheckbox.checked
            };
            this.loadAndRender();
            filterModal.classList.add('hidden');
            this.updateFilterButtonState();
        });

        // Clear all filters
        clearAllFiltersBtn.addEventListener('click', () => {
            filterFavoritesCheckbox.checked = false;
            filterKeySelect.value = '';
            filterWithYouTubeCheckbox.checked = false;
            filterWithoutYouTubeCheckbox.checked = false;
            if (filterWithoutLyricsCheckbox) filterWithoutLyricsCheckbox.checked = false;
            this.currentFilter = {
                favorites: false,
                key: '',
                withYouTube: false,
                withoutYouTube: false,
                withoutLyrics: false
            };
            this.loadAndRender();
            this.updateFilterButtonState();
        });

        // Prevent both YouTube checkboxes from being checked at the same time
        filterWithYouTubeCheckbox.addEventListener('change', () => {
            if (filterWithYouTubeCheckbox.checked) {
                filterWithoutYouTubeCheckbox.checked = false;
            }
        });

        filterWithoutYouTubeCheckbox.addEventListener('change', () => {
            if (filterWithoutYouTubeCheckbox.checked) {
                filterWithYouTubeCheckbox.checked = false;
            }
        });

        // Update filter button state on load
        this.updateFilterButtonState();
    }

    populateKeySelect() {
        const filterKeySelect = document.getElementById('filterKeySelect');
        if (!filterKeySelect) return;

        // Get all unique keys from songs (both explicit and detected)
        const allSongs = this.songManager.getAllSongs();
        const keys = new Set();

        allSongs.forEach(song => {
            if (song.key && song.key.trim() !== '') {
                keys.add(song.key.trim());
            } else if (this.keyDetector) {
                const detectedKey = this.keyDetector.detectFromSong(song);
                if (detectedKey) {
                    keys.add(detectedKey);
                }
            }
        });

        const sortedKeys = Array.from(keys).sort();

        // Save current selection
        const currentValue = filterKeySelect.value;

        // Clear and populate
        filterKeySelect.innerHTML = '<option value="">All Keys</option>';
        sortedKeys.forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = key;
            filterKeySelect.appendChild(option);
        });

        // Restore selection
        if (currentValue) {
            filterKeySelect.value = currentValue;
        }
    }

    updateFilterModalState() {
        const filterFavoritesCheckbox = document.getElementById('filterFavoritesCheckbox');
        const filterKeySelect = document.getElementById('filterKeySelect');
        const filterWithYouTubeCheckbox = document.getElementById('filterWithYouTubeCheckbox');
        const filterWithoutYouTubeCheckbox = document.getElementById('filterWithoutYouTubeCheckbox');
        const filterWithoutLyricsCheckbox = document.getElementById('filterWithoutLyricsCheckbox');

        if (filterFavoritesCheckbox) {
            filterFavoritesCheckbox.checked = this.currentFilter.favorites;
        }
        if (filterKeySelect) {
            filterKeySelect.value = this.currentFilter.key || '';
        }
        if (filterWithYouTubeCheckbox) {
            filterWithYouTubeCheckbox.checked = this.currentFilter.withYouTube;
        }
        if (filterWithoutYouTubeCheckbox) {
            filterWithoutYouTubeCheckbox.checked = this.currentFilter.withoutYouTube;
        }
        if (filterWithoutLyricsCheckbox) {
            filterWithoutLyricsCheckbox.checked = this.currentFilter.withoutLyrics;
        }
    }

    updateFilterButtonState() {
        const filterBtn = document.getElementById('filterBtn');
        if (!filterBtn) return;

        // Check if any filter is active
        const hasActiveFilters = this.currentFilter.favorites ||
            this.currentFilter.key !== '' ||
            this.currentFilter.withYouTube ||
            this.currentFilter.withoutYouTube ||
            this.currentFilter.withoutLyrics;

        if (hasActiveFilters) {
            filterBtn.classList.add('active');
        } else {
            filterBtn.classList.remove('active');
        }
    }

    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        const clearSearchBtn = document.getElementById('clearSearchBtn');
        if (!searchInput) return;

        // Function to adjust font size based on input width
        const adjustFontSize = () => {
            const inputWidth = searchInput.offsetWidth;
            // Calculate font size based on width
            // Min width: 120px -> font-size: 0.7em
            // Max width: 240px -> font-size: 0.95em
            const minWidth = 120;
            const maxWidth = 240;
            const minFontSize = 0.7;
            const maxFontSize = 0.95;

            // Clamp the width
            const clampedWidth = Math.max(minWidth, Math.min(maxWidth, inputWidth));

            // Calculate font size proportionally
            const ratio = (clampedWidth - minWidth) / (maxWidth - minWidth);
            const fontSize = minFontSize + (maxFontSize - minFontSize) * ratio;

            searchInput.style.fontSize = `${fontSize}em`;
        };

        // Adjust font size on resize
        const resizeObserver = new ResizeObserver(() => {
            adjustFontSize();
        });
        resizeObserver.observe(searchInput);

        // Also adjust on window resize
        window.addEventListener('resize', adjustFontSize);

        // Initial adjustment
        adjustFontSize();

        // Toggle clear button visibility
        const toggleClearButton = () => {
            if (clearSearchBtn) {
                if (searchInput.value.trim() !== '') {
                    clearSearchBtn.classList.remove('hidden');
                } else {
                    clearSearchBtn.classList.add('hidden');
                }
            }
        };

        // Search on input (real-time)
        searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value;
            this.loadAndRender();
            toggleClearButton();
        });

        // Clear search button click
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                searchInput.value = '';
                this.searchTerm = '';
                this.loadAndRender();
                searchInput.focus();
                toggleClearButton();
            });
        }

        // Clear search on Escape key
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                this.searchTerm = '';
                this.loadAndRender();
                searchInput.blur();
                toggleClearButton();
            }
        });

        // Initial state
        toggleClearButton();
    }

    async handleToggleFavorite(songId) {
        const song = await this.songManager.toggleFavorite(songId);
        this.loadAndRender();
        return song ? song.favorite : false;
    }

    handleTogglePractice(songId) {
        return this.setlistManager.togglePracticeSong(songId);
    }

    setupSetlists() {
        this.updateSetlistSelect();
        this.setupSetlistSelect();
        this.setupCreateSetlist();
        this.setupEditSetlist();
        this.setupDeleteSetlist();
    }

    handleSetlistChange() {
        console.log("Setlists changed, refreshing UI...");
        this.updateSetlistSelect();
        // Only re-render if we are currently viewing a setlist, 
        // to avoid jumping around if the user is browsing 'All Songs'
        if (this.currentSetlistId) {
            this.loadAndRender();
        }
    }

    updateSetlistSelect() {
        const select = document.getElementById('setlistSelect');
        const currentValue = select.value;
        select.innerHTML = '<option value="">All Songs</option>';

        this.setlistManager.getAllSetlists().forEach(setlist => {
            const option = document.createElement('option');
            option.value = setlist.id;
            option.textContent = setlist.name;
            select.appendChild(option);
        });

        if (currentValue) {
            select.value = currentValue;
        }
    }

    setupSetlistSelect() {
        const select = document.getElementById('setlistSelect');
        select.addEventListener('change', (e) => {
            this.currentSetlistId = e.target.value || null;
            this.updateButtonsForSetlistMode();
            this.loadAndRender();
        });

        // Initial check in case a setlist is already selected
        if (select.value) {
            this.currentSetlistId = select.value;
            this.updateButtonsForSetlistMode();
        }
    }

    updateButtonsForSetlistMode() {
        const deleteBtn = document.getElementById('deleteSetlistBtn');
        const editBtn = document.getElementById('editSetlistBtn');
        const addSongBtn = document.getElementById('addSongBtn');
        const importControls = document.querySelector('.import-export-controls');


        if (this.currentSetlistId) {
            // Show setlist edit and delete buttons
            if (editBtn) {
                editBtn.classList.remove('hidden');
            }
            if (deleteBtn) {
                deleteBtn.classList.remove('hidden');
            }
            // Change button to text when in setlist mode
            if (addSongBtn) {
                addSongBtn.innerHTML = '<span class="icon">+</span><span class="label">Add</span>';
                addSongBtn.title = 'Add songs to setlist';
            }
            // Hide export, import, and delete all buttons
            if (importControls) {
                importControls.classList.add('hidden');
            }

        } else {
            // Hide setlist edit and delete buttons
            if (editBtn) {
                editBtn.classList.add('hidden');
            }
            if (deleteBtn) {
                deleteBtn.classList.add('hidden');
            }
            // Change button back to icon
            if (addSongBtn) {
                addSongBtn.innerHTML = '<span class="icon">+</span><span class="label">Add</span>';
                addSongBtn.title = 'Add New Song';
            }
            // Show export, import, and delete all buttons
            if (importControls) {
                importControls.classList.remove('hidden');
            }

        }
    }

    setupCreateSetlist() {
        const createBtn = document.getElementById('createSetlistBtn');
        const modal = document.getElementById('setlistModal');
        const closeBtn = document.getElementById('setlistModalClose');
        const nameInput = document.getElementById('setlistNameInput');
        const submitBtn = document.getElementById('setlistCreateBtn');
        const modalTitle = document.getElementById('setlistModalTitle');
        let editingSetlistId = null;

        const resetModal = () => {
            editingSetlistId = null;
            nameInput.value = '';
            if (modalTitle) {
                modalTitle.textContent = 'Create Setlist';
            }
            if (submitBtn) {
                submitBtn.textContent = 'Create';
            }
        };

        createBtn.addEventListener('click', () => {
            resetModal();
            modal.classList.remove('hidden');
            nameInput.focus();
        });

        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            resetModal();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
                resetModal();
            }
        });

        const saveSetlist = async () => {
            const name = nameInput.value.trim();
            if (name) {
                let setlist;
                if (editingSetlistId) {
                    // Edit mode
                    setlist = await this.setlistManager.updateSetlistName(editingSetlistId, name);
                } else {
                    // Create mode
                    setlist = await this.setlistManager.createSetlist(name);
                }

                if (setlist) {
                    this.currentSetlistId = setlist.id;
                    this.updateSetlistSelect();
                    const select = document.getElementById('setlistSelect');
                    if (select) {
                        select.value = setlist.id;
                    }
                    this.updateButtonsForSetlistMode();
                    this.loadAndRender();
                }

                modal.classList.add('hidden');
                resetModal();
            }
        };

        submitBtn.addEventListener('click', saveSetlist);
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveSetlist();
            } else if (e.key === 'Escape') {
                modal.classList.add('hidden');
                resetModal();
            }
        });

        // Store function to open modal in edit mode
        this.openEditSetlistModal = (setlistId) => {
            const setlist = this.setlistManager.getSetlist(setlistId);
            if (setlist) {
                editingSetlistId = setlistId;
                if (modalTitle) {
                    modalTitle.textContent = 'Edit Setlist';
                }
                if (submitBtn) {
                    submitBtn.textContent = 'Save';
                }
                nameInput.value = setlist.name;
                modal.classList.remove('hidden');
                nameInput.focus();
                nameInput.select();
            }
        };
    }

    setupEditSetlist() {
        const editBtn = document.getElementById('editSetlistBtn');

        editBtn.addEventListener('click', () => {
            if (this.currentSetlistId && this.openEditSetlistModal) {
                this.openEditSetlistModal(this.currentSetlistId);
            }
        });
    }

    setupDeleteSetlist() {
        const deleteBtn = document.getElementById('deleteSetlistBtn');
        deleteBtn.addEventListener('click', async () => {
            if (this.currentSetlistId) {
                const setlist = this.setlistManager.getSetlist(this.currentSetlistId);
                if (setlist) {
                    if (confirm(`Are you sure you want to delete the setlist "${setlist.name}"?`)) {
                        await this.setlistManager.deleteSetlist(this.currentSetlistId);
                        this.currentSetlistId = null;
                        this.updateSetlistSelect();
                        const select = document.getElementById('setlistSelect');
                        select.value = '';
                        // Reset to "All Songs" view
                        this.updateButtonsForSetlistMode();
                        // Load all songs (reset to "All Songs" view)
                        this.loadAndRender();
                    }
                }
            }
        });
    }

    setupAddSongsToSetlistModal() {
        const modal = document.getElementById('addSongsToSetlistModal');
        const closeBtn = document.getElementById('addSongsModalClose');
        const cancelBtn = document.getElementById('cancelAddSongsBtn');
        const addBtn = document.getElementById('addSelectedSongsBtn');
        const searchInput = document.getElementById('addSongsSearchInput');
        const clearSearchBtn = document.getElementById('clearAddSongsSearch');
        const sortButtons = modal.querySelectorAll('.sort-option');
        const directionBtn = document.getElementById('toggleSortDirection');
        const selectAllBtn = document.getElementById('selectAllSongs');
        const deselectAllBtn = document.getElementById('deselectAllSongs');

        if (!modal) return;

        const closeModal = () => {
            modal.classList.add('hidden');
            this.activeAddSongsSetlistId = null;
        };

        closeBtn.addEventListener('click', () => this.popModalState('addSongsToSetlist'));
        cancelBtn.addEventListener('click', () => this.popModalState('addSongsToSetlist'));

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.popModalState('addSongsToSetlist');
            }
        });

        // Sorting
        sortButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active state
                sortButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                this.addSongsSortField = btn.dataset.field;
                this.renderAddSongsList();
            });
        });

        directionBtn.addEventListener('click', () => {
            this.addSongsSortDirection = this.addSongsSortDirection === 'asc' ? 'desc' : 'asc';
            directionBtn.textContent = this.addSongsSortDirection === 'asc' ? 'A → Z' : 'Z → A';
            this.renderAddSongsList();
        });

        // Searching
        searchInput.addEventListener('input', (e) => {
            this.addSongsSearchTerm = e.target.value;
            // Show/hide clear button
            if (this.addSongsSearchTerm.trim()) {
                clearSearchBtn.classList.remove('hidden');
            } else {
                clearSearchBtn.classList.add('hidden');
            }
            this.renderAddSongsList();
        });

        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            this.addSongsSearchTerm = '';
            clearSearchBtn.classList.add('hidden');
            this.renderAddSongsList();
            searchInput.focus();
        });

        // Select/Deselect All
        selectAllBtn.addEventListener('click', () => {
            const container = document.getElementById('songsListContainer');
            const checkboxes = container.querySelectorAll('.song-select-checkbox');
            checkboxes.forEach(cb => cb.checked = true);
            this.updateSelectedCount();
        });

        deselectAllBtn.addEventListener('click', () => {
            const container = document.getElementById('songsListContainer');
            const checkboxes = container.querySelectorAll('.song-select-checkbox');
            checkboxes.forEach(cb => cb.checked = false);
            this.updateSelectedCount();
        });

        // Add selected songs
        addBtn.addEventListener('click', async () => {
            const container = document.getElementById('songsListContainer');
            const checkedBoxes = container.querySelectorAll('input[type="checkbox"]:checked:not(:disabled)');
            const songIds = Array.from(checkedBoxes).map(cb => cb.value);

            if (songIds.length === 0) {
                alert('Please select at least one song.');
                return;
            }

            const targetSetlistId = this.activeAddSongsSetlistId || this.currentSetlistId;
            console.log(`[AddSongs] Targeting setlist: ${targetSetlistId} (active: ${this.activeAddSongsSetlistId}, current: ${this.currentSetlistId})`);

            if (targetSetlistId) {
                try {
                    console.log(`[AddSongs] Adding ${songIds.length} songs:`, songIds);
                    const success = await this.setlistManager.addSongsToSetlist(targetSetlistId, songIds);

                    if (success) {
                        console.log(`[AddSongs] Manager returned success. Refreshing UI...`);
                        this.showHUD('Song(s) added to the setlist');

                        // Explicitly refresh even if listener fails to fire
                        this.loadAndRender();
                    } else {
                        console.warn('[AddSongs] Manager returned false (songs might already be in setlist).');
                        this.showHUD('Song(s) are already in the setlist');
                        // Still refresh to show what's there
                        this.loadAndRender();
                    }

                    this.popModalState('addSongsToSetlist');
                } catch (error) {
                    console.error('[AddSongs] Error adding songs to setlist:', error);
                    alert('Error adding songs to setlist.');
                }
            } else {
                console.error('[AddSongs] No target setlist ID found!');
                alert('Fout: Geen setlist geselecteerd.');
            }
        });
    }
    setupAddToSetlistSingleModal() {
        const modal = document.getElementById('addToSetlistSingleModal');
        const closeBtn = document.getElementById('addToSetlistSingleModalClose');
        const cancelBtn = document.getElementById('addToSetlistSingleCancelBtn');
        const confirmBtn = document.getElementById('addToSetlistSingleConfirmBtn');
        const select = document.getElementById('addToSetlistSelect');

        if (!modal) return;

        this.activeAddToSetlistSongId = null;

        const closeModal = () => {
            modal.classList.add('hidden');
            this.activeAddToSetlistSongId = null;
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        confirmBtn.addEventListener('click', async () => {
            const setlistId = select.value;
            if (setlistId && this.activeAddToSetlistSongId) {
                try {
                    await this.setlistManager.addSongsToSetlist(setlistId, [this.activeAddToSetlistSongId]);
                    const song = this.songManager.getSongById(this.activeAddToSetlistSongId);
                    const title = song ? song.title : 'Song';

                    this.showHUD('Song(s) added to the setlist');
                    closeModal();
                } catch (error) {
                    console.error('Error adding song to setlist:', error);
                    this.confirmationModal.show('Error', 'Failed to add song to setlist.', () => { }, null, 'OK', 'danger', true);
                }
            } else {
                this.confirmationModal.show('Wait', 'Please select a setlist first.', () => { }, null, 'OK', 'primary', true);
            }
        });
    }

    openAddToSetlistSingleModal(songId) {
        const modal = document.getElementById('addToSetlistSingleModal');
        const select = document.getElementById('addToSetlistSelect');

        if (!modal || !select) return;

        this.activeAddToSetlistSongId = songId;

        // Populate select
        select.innerHTML = '<option value="" disabled selected>Selecteer een setlist...</option>';
        const setlists = this.setlistManager.getAllSetlists();

        if (setlists.length === 0) {
            const option = document.createElement('option');
            option.textContent = "Geen setlists gevonden";
            option.disabled = true;
            select.appendChild(option);
        } else {
            setlists.forEach(setlist => {
                const option = document.createElement('option');
                option.value = setlist.id;
                option.textContent = setlist.name;
                select.appendChild(option);
            });
        }

        modal.classList.remove('hidden');
    }

    openAddSongsToSetlistModal() {
        const modal = document.getElementById('addSongsToSetlistModal');
        const modalTitle = document.getElementById('addSongsModalTitle');
        const searchInput = document.getElementById('addSongsSearchInput');
        const clearSearchBtn = document.getElementById('clearAddSongsSearch');
        const setlist = this.setlistManager.getSetlist(this.currentSetlistId);

        if (!modal || !setlist) return;

        this.activeAddSongsSetlistId = this.currentSetlistId;
        this.addSongsSearchTerm = '';
        if (searchInput) searchInput.value = '';
        if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
        if (modalTitle) modalTitle.textContent = `Add songs to "${setlist.name}"`;

        this.renderAddSongsList();

        this.pushModalState('addSongsToSetlist', () => {
            modal.classList.add('hidden');
            this.activeAddSongsSetlistId = null;
        });
        modal.classList.remove('hidden');
        if (searchInput) {
            // Increase timeout slightly so it doesn't fight with the opening animation
            setTimeout(() => searchInput.focus(), 350);
        }
    }

    renderAddSongsList() {
        if (this.activeAddSongsSetlistId) {
            const setlist = this.setlistManager.getSetlist(this.activeAddSongsSetlistId);
            if (setlist) {
                this.populateSongsList(setlist);
            }
        }
    }



    populateSongsList(setlist) {
        const container = document.getElementById('songsListContainer');
        if (!container) return;

        // Set a min-height while rebuilding to prevent the modal from collapsing
        // and shifting its center point (the "flicker")
        container.style.minHeight = container.offsetHeight > 0 ? `${container.offsetHeight}px` : '200px';

        if (typeof this.updateAddSongsSortControls === 'function') {
            this.updateAddSongsSortControls();
        }

        // Always read the live search input value so filtering reacts instantly
        const searchInput = document.getElementById('addSongsSearchInput');
        const clearSearchBtn = document.getElementById('clearAddSongsSearch');
        const rawSearchTerm = searchInput ? searchInput.value : (this.addSongsSearchTerm || '');
        const searchTerm = rawSearchTerm.trim().toLowerCase();

        // Keep the stored search term and clear button state in sync with the UI
        this.addSongsSearchTerm = rawSearchTerm;
        if (clearSearchBtn) {
            if (searchTerm) {
                clearSearchBtn.classList.remove('hidden');
            } else {
                clearSearchBtn.classList.add('hidden');
            }
        }
        const sortField = this.addSongsSortField || 'title';
        const secondaryField = sortField === 'artist' ? 'title' : 'artist';
        const directionMultiplier = this.addSongsSortDirection === 'desc' ? -1 : 1;
        const normalize = (value) => (value || '').trim().toLowerCase();

        const allSongs = this.songManager.getAllSongs()
            .slice()
            .sort((a, b) => {
                const primaryCompare = normalize(a[sortField]).localeCompare(normalize(b[sortField]));
                if (primaryCompare !== 0) {
                    return primaryCompare * directionMultiplier;
                }

                const secondaryCompare = normalize(a[secondaryField]).localeCompare(normalize(b[secondaryField]));
                return secondaryCompare * directionMultiplier;
            })
            .filter(song => {
                if (!searchTerm) return true;
                const artist = (song.artist || '').toLowerCase();
                const title = (song.title || '').toLowerCase();
                return artist.includes(searchTerm) || title.includes(searchTerm);
            });
        const songsInSetlist = setlist.songIds || [];

        // Use DocumentFragment for atomic update
        const fragment = document.createDocumentFragment();

        if (allSongs.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'no-songs-message';
            emptyMessage.textContent = searchTerm ? 'No songs match your search.' : 'No songs available.';
            fragment.appendChild(emptyMessage);
        } else {
            allSongs.forEach(song => {
                const isInSetlist = songsInSetlist.includes(song.id);

                const songItem = document.createElement('div');
                songItem.className = 'song-item';
                if (isInSetlist) {
                    songItem.classList.add('in-setlist');
                }

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'song-select-checkbox';
                checkbox.value = song.id;
                checkbox.id = `song-${song.id}`;
                checkbox.disabled = isInSetlist;
                if (isInSetlist) {
                    checkbox.checked = true;
                }

                // Sync count on change
                checkbox.addEventListener('change', () => this.updateSelectedCount());

                const label = document.createElement('label');
                label.htmlFor = `song-${song.id}`;
                label.textContent = `${song.artist || 'Unknown'} - ${song.title || 'No title'}`;
                if (isInSetlist) {
                    label.innerHTML += ' <span class="in-setlist-badge">(already in setlist)</span>';
                }

                songItem.appendChild(checkbox);
                songItem.appendChild(label);
                fragment.appendChild(songItem);
            });
        }

        // Apply all at once
        container.innerHTML = '';
        container.appendChild(fragment);

        // Remove min-height after a brief delay to allow layout to settle
        requestAnimationFrame(() => {
            container.style.minHeight = '';
            this.updateSelectedCount();
        });
    }

    updateSelectedCount() {
        const container = document.getElementById('songsListContainer');
        const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked:not(:disabled)');
        const countSpan = document.getElementById('selectedCount');
        countSpan.textContent = `${checkboxes.length} geselecteerd`;
    }

    setupDeselect() {
        const deselectBtn = document.getElementById('deselectBtn');
        if (deselectBtn) {
            deselectBtn.addEventListener('click', () => {
                this.deselectRow();
            });
        }

        // Escape key to deselect
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.tableRenderer.getSelectedRowId()) {
                this.deselectRow();
            }
        });
    }

    deselectRow() {
        this.tableRenderer.selectRow(null);
    }

    async addExampleSongIfEmpty() {
        if (this.songManager.getAllSongs().length === 0) {
            try {
                // Load default songs from JSON file
                const response = await fetch('js/data/defaultSongs.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();

                // Check if data has the expected structure
                if (data && data.songs && Array.isArray(data.songs) && data.songs.length > 0) {
                    // Add all default songs
                    for (const song of data.songs) {
                        await this.songManager.addSong(song);
                    }

                    // Import setlists if present
                    if (data.setlists && Array.isArray(data.setlists) && data.setlists.length > 0) {
                        await this.setlistManager.importSetlists(data.setlists);
                    }
                } else {
                    // Fallback to single example if JSON structure is invalid
                    await this.songManager.addSong({
                        artist: 'Bryan Adams',
                        title: 'Summer of 69',
                        verse: 'D A (3x)',
                        chorus: 'Bm A D G (2x)',
                        preChorus: 'D A (2x)',
                        bridge: 'F B C B (2x)'
                    });
                }
            } catch (error) {
                console.error('Error loading default songs from JSON:', error);
                // Fallback to single example if JSON file cannot be loaded
                await this.songManager.addSong({
                    artist: 'Bryan Adams',
                    title: 'Summer of 69',
                    verse: 'D A (3x)',
                    chorus: 'Bm A D G (2x)',
                    preChorus: 'D A (2x)',
                    bridge: 'F B C B (2x)'
                });
            }
            // Don't call loadAndRender here - it will be called after this function
        }
    }

    setupSorting() {
        const sortableHeaders = document.querySelectorAll('th.sortable');

        // Initial state from sorter
        const currentSort = this.sorter.getCurrentSort();
        if (currentSort.column) {
            sortableHeaders.forEach(header => {
                if (header.dataset.column === currentSort.column) {
                    header.classList.add(currentSort.direction);
                }
            });
        }

        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.column;
                const currentSort = this.sorter.getCurrentSort();

                // Determine new direction
                // Default to 'asc' if changing column, otherwise toggle
                let newDirection = 'asc';
                if (currentSort.column === column) {
                    newDirection = currentSort.direction === 'asc' ? 'desc' : 'asc';
                }

                // Update sorter state
                this.sorter.currentSort = { column, direction: newDirection };

                // Update UI indicators
                sortableHeaders.forEach(h => {
                    h.classList.remove('asc', 'desc');
                });
                header.classList.add(newDirection);

                // Reload and render (this will apply the new sort via sorter.applySort)
                this.loadAndRender();
            });
        });
    }

    handleRowSelect(songId) {
        // Open song detail modal when a row is selected
        if (songId) {
            this.navigateToSong(songId, false);
        } else {
            this.songDetailModal.hide();
        }
    }

    navigateToSong(songId, isRandomMode = false, isPracticeRandomMode = false) {
        const song = this.songManager.getSongById(songId);
        if (song) {
            // Also select the row in the table to keep in sync
            if (this.tableRenderer) {
                this.tableRenderer.selectRow(songId, true);
            }
            const isInPractice = this.setlistManager.isSongInPracticeSetlist(songId);

            // Push history state before showing modal, but only if it's currently hidden
            // This prevents multiple history entries when navigating between songs in detail view
            if (this.songDetailModal.modal.classList.contains('hidden')) {
                this.pushModalState('songDetail', () => this.songDetailModal.hide(true));
            }

            this.songDetailModal.show(song, false, isRandomMode, isPracticeRandomMode);
            this.songDetailModal.setPracticeState(isInPractice);
        }
    }

    async handleCellEdit(songId, field, value) {
        await this.songManager.updateSong(songId, { [field]: value });
        // Selection remains visible in the row itself
    }

    setupAddSongButton() {
        const addBtn = document.getElementById('addSongBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                // If a setlist is selected, open the add songs modal
                if (this.currentSetlistId) {
                    this.openAddSongsToSetlistModal();
                } else {
                    // Otherwise, open the create song modal
                    this.openCreateSongModal();
                }
            });
        }
    }

    setupRandomSongButton() {
        const randomBtn = document.getElementById('randomSongBtn');
        if (randomBtn) {
            randomBtn.addEventListener('click', () => {
                this.openRandomSong();
            });
        }
    }

    openRandomSong() {
        const songsToChooseFrom = this.currentSongsList || this.songManager.getAllSongs();
        if (songsToChooseFrom.length === 0) {
            alert('No songs found to choose from.');
            return;
        }

        const randomIndex = Math.floor(Math.random() * songsToChooseFrom.length);
        const randomSong = songsToChooseFrom[randomIndex];
        this.navigateToSong(randomSong.id, true);
    }

    setupPracticeRandomButton() {
        const practiceBtn = document.getElementById('practiceRandomBtn');
        if (practiceBtn) {
            practiceBtn.addEventListener('click', () => {
                this.openPracticeRandomSong();
            });
        }
    }

    openPracticeRandomSong() {
        const practiceSetlist = this.setlistManager.getPracticeSetlist();
        if (!practiceSetlist || !practiceSetlist.songIds || practiceSetlist.songIds.length === 0) {
            alert('Je Practice lijst is leeg. Voeg eerst songs toe aan je Practice lijst via de Song Details.');
            return;
        }

        const practiceSongIds = practiceSetlist.songIds;
        // Verify songs still exist
        const availableSongs = [];
        practiceSongIds.forEach(id => {
            const song = this.songManager.getSongById(id);
            if (song) {
                availableSongs.push(song);
            }
        });

        if (availableSongs.length === 0) {
            alert('Geen geldige songs gevonden in je Practice lijst.');
            return;
        }

        // 1. Get current song ID and previous song ID to avoid immediate repetition
        const currentSongId = this.songDetailModal ? this.songDetailModal.currentSongId : null;
        const previousSongId = (this.practiceHistory.length > 0) ? this.practiceHistory[this.practiceHistory.length - 1] : null;

        // 2. Filter out current song to find candidates for "Next"
        let candidates = availableSongs.filter(s => s.id !== currentSongId);

        // If no candidates (only 1 song in list), we HAVE to pick the current one again (fallback)
        if (candidates.length === 0) {
            candidates = availableSongs;
        }

        // 3. Find the minimum practice count among the candidates
        const counts = candidates.map(s => parseInt(s.practiceCount) || 0);
        const minCount = Math.min(...counts);

        // 4. Get the group of "neediest" candidates
        let tiedSongs = candidates.filter(s => (parseInt(s.practiceCount) || 0) === minCount);

        // 5. If we have multiple tied songs, try to avoid the one we JUST came from (prevent toggling)
        let nextSong;
        if (tiedSongs.length > 1 && previousSongId) {
            const nonRepeatCandidates = tiedSongs.filter(s => s.id !== previousSongId);
            if (nonRepeatCandidates.length > 0) {
                const randomIndex = Math.floor(Math.random() * nonRepeatCandidates.length);
                nextSong = nonRepeatCandidates[randomIndex];
            } else {
                const randomIndex = Math.floor(Math.random() * tiedSongs.length);
                nextSong = tiedSongs[randomIndex];
            }
        } else {
            // Only one song with min count or no previous song history
            const randomIndex = Math.floor(Math.random() * tiedSongs.length);
            nextSong = tiedSongs[randomIndex];
        }

        // Visual feedback
        console.log(`Open next practice song: ${nextSong.title} (Practiced ${nextSong.practiceCount || 0} times)`);

        // Push current song to history before navigating
        if (this.songDetailModal && this.songDetailModal.currentSongId) {
            this.practiceHistory.push(this.songDetailModal.currentSongId);
            // Limit history size to 50
            if (this.practiceHistory.length > 50) {
                this.practiceHistory.shift();
            }
        }

        this.navigateToSong(nextSong.id, false, true);
    }

    handlePracticeRandomPrev() {
        if (this.practiceHistory.length === 0) return;

        const previousSongId = this.practiceHistory.pop();
        this.navigateToSong(previousSongId, false, true);
    }


    setupCreateSongModal() {
        const modal = document.getElementById('createSongModal');
        const closeBtn = document.getElementById('createSongModalClose');
        const submitBtn = document.getElementById('createSongSubmitBtn');
        const artistInput = document.getElementById('newSongArtistInput');
        const titleInput = document.getElementById('newSongTitleInput');
        const errorMsg = document.getElementById('createSongError');

        if (!modal || !submitBtn) return;

        const closeModal = () => {
            modal.classList.add('hidden');
            artistInput.value = '';
            titleInput.value = '';
            errorMsg.classList.add('hidden');
        };

        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        submitBtn.addEventListener('click', async () => {
            const artist = artistInput.value.trim();
            const title = titleInput.value.trim();

            if (!artist || !title) {
                errorMsg.classList.remove('hidden');
                return;
            }

            errorMsg.classList.add('hidden');
            await this.addNewSong(artist, title);
            closeModal();
        });

        // Enter key to submit
        [artistInput, titleInput].forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    submitBtn.click();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    closeModal();
                }
            });
        });
    }

    openCreateSongModal() {
        const modal = document.getElementById('createSongModal');
        const artistInput = document.getElementById('newSongArtistInput');
        if (modal) {
            modal.classList.remove('hidden');
            if (artistInput) {
                setTimeout(() => artistInput.focus(), 100);
            }
        }
    }

    async addNewSong(artist, title) {
        const newSong = await this.songManager.addSong({
            artist: artist,
            title: title,
            verse: '',
            chorus: '',
            preChorus: '',
            bridge: ''
        });

        // Re-render table to include the new song
        this.loadAndRender();

        // Open the detail modal with the new song via navigateToSong
        // This ensures the history stack is correctly managed so it can be closed
        setTimeout(() => {
            if (newSong && newSong.id) {
                this.navigateToSong(newSong.id);
            }
        }, 50);
    }

    handleRemoveFromSetlist(songId) {
        const song = this.songManager.getSongById(songId);
        const title = song ? song.title : 'this song';

        this.showConfirm({
            title: 'Remove from setlist?',
            message: `Remove "${title}" from the current setlist?\n(Song will stay in your library)`,
            confirmText: 'Remove',
            type: 'danger'
        }, async (confirmed) => {
            if (confirmed) {
                await this.setlistManager.removeSongFromSetlist(this.currentSetlistId, songId);
                this.showHUD('Song removed from setlist');
                this.loadAndRender();
            }
        });
    }

    handleDelete(songId) {
        const song = this.songManager.getSongById(songId);
        const title = song ? song.title : 'this song';

        this.showConfirm({
            title: 'Delete Song?',
            message: `Are you sure you want to permanently delete "${title}"?`,
            confirmText: 'Delete',
            type: 'danger'
        }, async (confirmed) => {
            if (confirmed) {
                if (await this.songManager.deleteSong(songId)) {
                    // Remove song from all setlists
                    const setlists = this.setlistManager.getAllSetlists();
                    for (const setlist of setlists) {
                        await this.setlistManager.removeSongFromSetlist(setlist.id, songId);
                    }
                    this.showHUD('Song deleted');
                    this.loadAndRender();
                }
            }
        });
    }

    handlePlayYouTube(songId) {
        const song = this.songManager.getSongById(songId);
        if (!song) return;

        const youtubeUrl = song.youtubeUrl || '';
        if (!youtubeUrl.trim()) {
            alert('Geen YouTube URL ingesteld voor dit liedje. Voeg een YouTube URL toe in de bewerkmodus.');
            return;
        }

        // Extract video ID from YouTube URL
        const videoId = this.extractYouTubeVideoId(youtubeUrl);
        if (!videoId) {
            alert('Invalid YouTube URL. Use a full YouTube URL (e.g. https://www.youtube.com/watch?v=VIDEO_ID)');
            return;
        }

        // Show and initialize mini player
        this.showYouTubeMiniPlayer(song, videoId);
    }

    extractYouTubeVideoId(url) {
        if (!url) return null;

        // Handle various YouTube URL formats
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /youtube\.com\/watch\?.*v=([^&\n?#]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        return null;
    }

    showYouTubeMiniPlayer(song, videoId) {
        const player = document.getElementById('youtubeMiniPlayer');
        const container = document.getElementById('youtubePlayerContainer');
        const title = document.getElementById('youtubePlayerTitle');

        if (!player || !container || !title) return;

        // Set title
        title.textContent = `${song.artist || 'Unknown'} - ${song.title || 'No title'}`;

        // Clear previous iframe
        container.innerHTML = '';

        // Create YouTube iframe
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.frameBorder = '0';
        iframe.className = 'youtube-iframe';

        container.appendChild(iframe);

        // Show player
        player.classList.remove('hidden');

        // Setup event listeners if not already done
        this.setupYouTubeMiniPlayer();


    }

    async runDiagnostics() {
        const user = this.firebaseManager.getCurrentUser();
        const songs = this.songManager.getAllSongs();
        const setlists = this.setlistManager.getAllSetlists();

        let msg = `Diagnostics (v2.492):\n`;
        msg += `User: ${user ? user.email : 'Not Logged In'}\n`;
        msg += `UID: ${user ? user.uid : 'N/A'}\n`;
        msg += `Songs (Local): ${songs.length}\n`;
        msg += `Data Source: ${this.songManager.syncEnabled ? 'Syncing' : 'Local Only'}\n`;

        // Connectivity Test
        try {
            msg += `Testing DB Connection...\n`;
            if (user) {
                const testRef = this.firebaseManager.database.ref(`users/${user.uid}/_connection_test`);
                await testRef.set({ timestamp: Date.now() });
                msg += `✅ Database Write Success!\n`;
            } else {
                msg += `⚠️ Cannot test DB (Not Logged In)\n`;
            }
        } catch (e) {
            msg += `❌ Database Error: ${e.code || e.message}\n`;
            console.error("Diagnostic DB Error:", e);
        }

        alert(msg);
        console.log(msg);
    }

    setupYouTubeMiniPlayer() {
        const player = document.getElementById('youtubeMiniPlayer');
        const closeBtn = document.getElementById('youtubePlayerClose');
        const minimizeBtn = document.getElementById('youtubePlayerMinimize');
        const header = player?.querySelector('.youtube-mini-player-header');

        if (!player) return;

        // Remove existing listeners by cloning
        const newCloseBtn = closeBtn?.cloneNode(true);
        const newMinimizeBtn = minimizeBtn?.cloneNode(true);

        if (closeBtn && newCloseBtn) {
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            newCloseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hideYouTubeMiniPlayer();
            });
        }

        if (minimizeBtn && newMinimizeBtn) {
            minimizeBtn.parentNode.replaceChild(newMinimizeBtn, minimizeBtn);
            newMinimizeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                player.classList.toggle('minimized');
                newMinimizeBtn.textContent = player.classList.contains('minimized') ? '🔺' : '🔻';
            });
        }

        // Setup drag functionality (works with mouse and touch)
        if (header && !player.dataset.dragSetup) {
            player.dataset.dragSetup = 'true';
            let isDragging = false;
            let currentX = 0;
            let currentY = 0;
            let initialX = 0;
            let initialY = 0;
            let xOffset = 0;
            let yOffset = 0;

            // Get current position from CSS
            const updateOffset = () => {
                const rect = player.getBoundingClientRect();
                xOffset = rect.left;
                yOffset = rect.top;
            };

            updateOffset();

            const dragStart = (e) => {
                // Don't drag if clicking on buttons
                if (e.target.closest('.youtube-player-close-btn') ||
                    e.target.closest('.youtube-player-minimize-btn')) {
                    return;
                }

                if (e.type === 'touchstart') {
                    initialX = e.touches[0].clientX - xOffset;
                    initialY = e.touches[0].clientY - yOffset;
                } else {
                    initialX = e.clientX - xOffset;
                    initialY = e.clientY - yOffset;
                }

                if (header.contains(e.target) || e.target === header) {
                    isDragging = true;
                    player.style.transition = 'none';
                }
            };

            const drag = (e) => {
                if (!isDragging) return;

                e.preventDefault();

                if (e.type === 'touchmove') {
                    currentX = e.touches[0].clientX - initialX;
                    currentY = e.touches[0].clientY - initialY;
                } else {
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;
                }

                xOffset = currentX;
                yOffset = currentY;

                // Keep player within viewport bounds
                const maxX = window.innerWidth - player.offsetWidth;
                const maxY = window.innerHeight - player.offsetHeight;

                xOffset = Math.max(0, Math.min(xOffset, maxX));
                yOffset = Math.max(0, Math.min(yOffset, maxY));

                setTranslate(xOffset, yOffset, player);
            };

            const dragEnd = () => {
                if (!isDragging) return;

                initialX = currentX;
                initialY = currentY;
                isDragging = false;
                player.style.transition = 'all 0.3s ease';
            };

            const setTranslate = (xPos, yPos, el) => {
                el.style.transform = `translate(${xPos}px, ${yPos}px)`;
                el.style.left = '0';
                el.style.top = '0';
                el.style.right = 'auto';
                el.style.bottom = 'auto';
            };

            // Mouse events
            header.addEventListener('mousedown', dragStart);
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', dragEnd);

            // Touch events (for iPad/mobile)
            header.addEventListener('touchstart', dragStart, { passive: false });
            document.addEventListener('touchmove', drag, { passive: false });
            document.addEventListener('touchend', dragEnd);

            // Make header cursor indicate draggable
            header.style.cursor = 'move';
            header.style.userSelect = 'none';
        }
    }

    hideYouTubeMiniPlayer() {
        const player = document.getElementById('youtubeMiniPlayer');
        const container = document.getElementById('youtubePlayerContainer');

        if (player) {
            player.classList.add('hidden');
            player.classList.remove('minimized');
        }

        // Clear iframe to stop video
        if (container) {
            container.innerHTML = '';
        }
    }

    setupImportExport() {
        // Export functionality
        const exportBtn = document.getElementById('exportBtn');
        exportBtn.addEventListener('click', () => {
            this.exportSongs();
        });

        // Import functionality
        const importFile = document.getElementById('importFile');
        importFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.importSongs(file);
            }
            // Reset input so same file can be selected again
            e.target.value = '';
        });

        // Delete all songs functionality
        const deleteAllBtn = document.getElementById('deleteAllSongsBtn');
        if (deleteAllBtn) {
            deleteAllBtn.addEventListener('click', () => {
                this.deleteAllSongs();
            });
        }

        // --- Single Song Import ---

        const importSongFile = document.getElementById('importSongFile');
        if (importSongFile) {
            importSongFile.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.importSingleSong(file);
                }
                e.target.value = '';
            });
        }

        // --- Import Song (Mobile & Desktop UG) ---
        const importUgBtn = document.getElementById('importUgBtn');
        const combinedImportBtn = document.getElementById('combinedImportBtn');

        const openImportPage = () => {
            window.open('popsongchordbook-super-extractor-gemini.html', '_blank');
        };

        if (importUgBtn) {
            importUgBtn.addEventListener('click', openImportPage);
        }
        if (combinedImportBtn) {
            combinedImportBtn.addEventListener('click', openImportPage);
        }
    }

    setupExtractorListener() {
        console.log('UG Extractor listener initialized (v2.492)');
        window.addEventListener('message', async (event) => {
            if (event.data && event.data.type === 'UG_EXTRACTOR_IMPORT') {
                console.log('Received UG Extractor import signal from:', event.origin);
                const songData = event.data.song;
                const isConfirmed = event.data.confirmed || false;
                if (songData) {
                    console.log('Song data parsed successfully, calling handleExtractorImport (confirmed:', isConfirmed, ')');
                    await this.handleExtractorImport(songData, isConfirmed);
                } else {
                    console.warn('Received import signal but song data is missing/invalid');
                }
            }
        });
    }

    async handleExtractorImport(songToImport, isConfirmed = false) {
        try {
            console.log('Processing extractor import for:', songToImport.title);

            // Map the 6 potential extractor keys into the 4 internal blocks
            // PreChorus is placed BEFORE Chorus to ensure logical song structure
            const extractorKeys = ["intro", "verse", "preChorus", "chorus", "bridge", "outro"];
            const internalKeys = ["verse", "preChorus", "chorus", "bridge"];

            // Temporary copy to avoid overwriting while iterating
            const incomingData = { ...songToImport };

            // Clear current internal fields in the object we're about to add
            internalKeys.forEach(k => {
                delete songToImport[k];
                delete songToImport[k + 'Title'];
            });

            let internalIdx = 0;
            extractorKeys.forEach(exKey => {
                const content = incomingData[exKey];
                if (content && content.trim() !== '' && internalIdx < internalKeys.length) {
                    const intKey = internalKeys[internalIdx];
                    songToImport[intKey] = content;
                    // Format title: e.g. "preChorus" -> "PreChorus"
                    songToImport[intKey + 'Title'] = exKey.charAt(0).toUpperCase() + exKey.slice(1);
                    internalIdx++;
                }
            });

            // Clean up original extractor-specific keys that aren't part of internal schema
            extractorKeys.forEach(k => {
                if (!internalKeys.includes(k)) {
                    delete songToImport[k];
                }
            });

            const songName = `${songToImport.artist || 'Unknown'} - ${songToImport.title || 'Untitled'}`;

            if (isConfirmed) {
                await this.songManager.addSong(songToImport);
                this.loadAndRender();
                console.log('Direct import successful for:', songName);
                return;
            }

            this.confirmationModal.show(
                'Direct Import from Extractor',
                `Do you want to import <strong>${songName}</strong> into your library?`,
                async () => {
                    await this.songManager.addSong(songToImport);
                    this.loadAndRender();

                    // Show success using the confirmation modal in info mode
                    setTimeout(() => {
                        this.confirmationModal.show(
                            'Import Successful',
                            `<strong>${songName}</strong> has been added to your library.`,
                            null,
                            null,
                            'Great!',
                            '',
                            'primary',
                            true // isInfo mode
                        );
                    }, 300);
                },
                null,
                'Import Now'
            );
        } catch (error) {
            console.error('Extractor Direct Import error:', error);
            alert('Direct import failed: ' + error.message);
        }
    }

    setupPrintButton() {
        const printBtn = document.getElementById('printTableBtn');
        if (!printBtn) return;

        printBtn.addEventListener('click', () => {
            this.printTable();
        });
    }

    showInfoModal(title, message) {
        const modal = document.getElementById('infoModal');
        const titleEl = document.getElementById('infoModalTitle');
        const messageEl = document.getElementById('infoModalMessage');
        const okBtn = document.getElementById('infoModalOkBtn');
        const closeBtn = document.getElementById('infoModalClose');

        if (!modal) return;

        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;

        const hideModal = () => modal.classList.add('hidden');

        if (okBtn) okBtn.onclick = hideModal;
        if (closeBtn) closeBtn.onclick = hideModal;

        modal.classList.remove('hidden');
    }

    showGeneralConfirm(title, message, okCallback, okText = "Confirm", cancelText = "Cancel") {
        const modal = document.getElementById('generalConfirmModal');
        const titleEl = document.getElementById('generalConfirmTitle');
        const messageEl = document.getElementById('generalConfirmMessage');
        const okBtn = document.getElementById('generalConfirmOkBtn');
        const cancelBtn = document.getElementById('generalConfirmCancelBtn');
        const closeBtn = document.getElementById('generalConfirmClose');

        if (!modal) return;

        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;

        if (okBtn) {
            okBtn.textContent = okText;
            // Clean up old listeners
            const newBtn = okBtn.cloneNode(true);
            okBtn.parentNode.replaceChild(newBtn, okBtn);
            newBtn.addEventListener('click', () => {
                okCallback();
                modal.classList.add('hidden');
            });
        }

        if (cancelBtn) {
            cancelBtn.textContent = cancelText;
            cancelBtn.onclick = () => modal.classList.add('hidden');
        }

        if (closeBtn) {
            closeBtn.onclick = () => modal.classList.add('hidden');
        }

        modal.classList.remove('hidden');
    }

    async deleteAllSongs() {
        const songCount = this.songManager.getAllSongs().length;

        if (songCount === 0) {
            this.showInfoModal('Notification', 'There are no songs to delete.');
            return;
        }

        const message = `WARNING: You are about to PERMANENTLY delete all ${songCount} song(s)! This action cannot be undone and ALL your data will be lost. Are you sure you want to continue?`;

        this.showGeneralConfirm(
            "Delete All Songs",
            message,
            async () => {
                try {
                    // Delete all songs
                    await this.songManager.deleteAllSongs();
                    // Re-render
                    this.loadAndRender();
                    this.updateSetlistSelect(); // Ensure setlist select is updated after deletion
                    this.showInfoModal("Success", "All songs have been permanently deleted.");
                } catch (err) {
                    console.error("Delete all error:", err);
                    this.showInfoModal("Error", "Delete failed: " + err.message);
                }
            },
            "Yes, DELETE EVERYTHING",
            "Keep My Songs"
        );
    }

    exportSongs() {
        const songs = this.songManager.getAllSongs();
        const setlists = this.setlistManager.getAllSetlists();

        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            songs: songs,
            setlists: setlists
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `popsong-chordbook-${new Date().toISOString().split('T')[0]}.json`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        
        // Robust cleanup with delay to ensure browser initiation
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 500);

        // Show feedback
        const exportBtn = document.getElementById('exportBtn');
        const iconElement = exportBtn ? exportBtn.querySelector('.icon') : null;
        if (iconElement) {
            const originalIcon = iconElement.textContent;
            iconElement.textContent = '✓';
            setTimeout(() => {
                iconElement.textContent = originalIcon;
            }, 2000);
        }
    }


    async importSingleSong(file) {
        try {
            const text = await file.text();
            const importData = JSON.parse(text);

            let songToImport = null;
            if (importData.song) {
                songToImport = importData.song;
            } else if (importData.songs && importData.songs.length > 0) {
                // If user accidentally tries to import a library as a single song, take the first one
                songToImport = importData.songs[0];
            } else {
                // Maybe it's just a raw song object
                songToImport = importData;
            }

            // Basic validation
            if (!songToImport || (!songToImport.title && !songToImport.artist)) {
                throw new Error('Invalid song data structure.');
            }

            // Clean data (remove redundant ID to let SongManager generate a new one if needed, 
            // though importSongs handles duplication by ID usually)
            // But for single import, let's treat it as a new distinct song or update existing?
            // Usually, users want to add it.

            const songName = `${songToImport.artist || 'Unknown'} - ${songToImport.title || 'Untitled'}`;

            this.confirmationModal.show(
                'Import Song',
                `Do you want to import <strong>${songName}</strong> into your library?`,
                async () => {
                    // Use importSongs with a single song array, append to existing (replace = false)
                    await this.songManager.importSongs([songToImport], false);

                    // Re-render
                    this.loadAndRender();

                    // Show feedback
                    const btn = document.getElementById('importSongFile'); // label's for
                    const labelBtn = document.querySelector(`label[for="importSongFile"]`);
                    const icon = labelBtn ? labelBtn.querySelector('.icon') : null;
                    if (icon) {
                        const original = icon.textContent;
                        icon.textContent = '✓';
                        setTimeout(() => icon.textContent = original, 2000);
                        this.showHUD('Song imported successfully');
                    }
                },
                null,
                'Import'
            );
        } catch (error) {
            console.error('Import Single Song error:', error);
            alert('Import failed: ' + error.message);
        }
    }

    printTable() {
        // Ensure the latest data is shown before printing
        this.loadAndRender();
        window.print();
    }

    setupResponsiveView() {
        const checkView = () => {
            const isPortrait = window.innerHeight > window.innerWidth;
            const isHighDensity = window.devicePixelRatio > 1.5;
            const isTypicalMobileWidth = window.innerWidth <= 1080;
            const isMobile = isTypicalMobileWidth || (isPortrait && isHighDensity);

            if (isPortrait && isMobile) {
                document.body.classList.add('is-mobile-view');
                if (this.viewMode !== 'simple') {
                    this.viewMode = 'simple';
                    this.updateViewMode();
                    this.loadAndRender();
                }
            } else {
                document.body.classList.remove('is-mobile-view');
            }
        };

        // Initial check
        checkView();

        window.addEventListener('resize', checkView);

        // Debug info if requested via URL (?debug=true) for troubleshooting resolution issues
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('debug') === 'true') {
            const debugDiv = document.createElement('div');
            debugDiv.id = 'resolution-debug-info';
            debugDiv.style.cssText = 'position:fixed;bottom:10px;left:10px;background:rgba(0,0,0,0.85);color:#0f0;z-index:99999;padding:8px;font-size:11px;pointer-events:none;border-radius:4px;font-family:monospace;border:1px solid #0f0;box-shadow:0 10px 20px rgba(0,0,0,0.5);line-height:1.4;';
            const updateDebug = () => {
                const isPortrait = window.innerHeight > window.innerWidth;
                const isMobileJS = window.innerWidth <= 1080;
                debugDiv.innerHTML = `
                    <b>DISPLAY DEBUG</b><br>
                    SCREEN: ${window.screen.width}x${window.screen.height}<br>
                    VALS: W=${window.innerWidth} H=${window.innerHeight}<br>
                    DPR: ${window.devicePixelRatio.toFixed(3)}<br>
                    MOBILE_JS: ${isMobileJS && isPortrait ? 'YES' : 'NO'}<br>
                    UA: ${navigator.userAgent.substring(0, 40)}...
                `;
            };
            document.body.appendChild(debugDiv);
            updateDebug();
            window.addEventListener('resize', updateDebug);
        }
    }

    setupToggleView() {
        const toggleBtn = document.getElementById('toggleViewBtn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.viewMode = this.viewMode === 'full' ? 'simple' : 'full';
                this.updateViewMode();
                this.loadAndRender();
            });
            this.updateViewMode();
        }
    }



    updateViewMode() {
        const toggleBtn = document.getElementById('toggleViewBtn');
        const table = document.getElementById('songsTable');
        if (toggleBtn && table) {
            const iconSpan = toggleBtn.querySelector('.icon');
            if (iconSpan) {
                if (this.viewMode === 'simple') {
                    iconSpan.textContent = '📊';
                    toggleBtn.title = 'Full view';
                } else {
                    iconSpan.textContent = '📋';
                    toggleBtn.title = 'Simple view';
                }
            } else {
                // Fallback for if structure is not yet set up
                if (this.viewMode === 'simple') {
                    toggleBtn.textContent = '📊';
                    toggleBtn.title = 'Full view';
                } else {
                    toggleBtn.textContent = '📋';
                    toggleBtn.title = 'Simple view';
                }
            }
            if (this.viewMode === 'simple') {
                table.classList.add('simple-view');
            } else {
                table.classList.remove('simple-view');
            }
        }
    }

    async importSongs(file) {
        try {
            const text = await file.text();
            const importData = JSON.parse(text);

            // Validate structure
            if (!importData.songs || !Array.isArray(importData.songs)) {
                throw new Error('Ongeldig bestandsformaat: songs array ontbreekt');
            }

            const songCount = importData.songs.length;
            const setlistCount = importData.setlists ? importData.setlists.length : 0;
            const currentSongCount = this.songManager.getAllSongs().length;

            // Ask user how to import
            let replace = true;
            if (currentSongCount > 0) {
                const importChoice = confirm(
                    `How do you want to import ${songCount} song(s)?\n\n` +
                    `Click "OK" to delete current songs and import new ones.\n` +
                    `Click "Cancel" to add new songs to existing songs.`
                );
                replace = importChoice;
            }

            // Import songs
            const result = await this.songManager.importSongs(importData.songs, replace);

            // Import setlists if present
            if (importData.setlists && Array.isArray(importData.setlists)) {
                await this.setlistManager.importSetlists(importData.setlists);
            }

            // Re-render
            this.loadAndRender();
            this.updateSetlistSelect();

            // Show success message with details
            let message = `Succesvol geïmporteerd: ${result.added} song(s)`;
            if (result.duplicates > 0) {
                message += `\n\n${result.duplicates} dubbel(ling)(en) overgeslagen:`;
                if (result.duplicateSongs.length <= 10) {
                    message += '\n' + result.duplicateSongs.join('\n');
                } else {
                    message += '\n' + result.duplicateSongs.slice(0, 10).join('\n');
                    message += `\n... en ${result.duplicateSongs.length - 10} meer`;
                }
            }
            if (setlistCount > 0) {
                message += `\n\n${setlistCount} setlist(s) geïmporteerd`;
            }
            alert(message);
        } catch (error) {
            console.error('Import error:', error);
            alert(`Fout bij importeren: ${error.message}`);
        }
    }

    setupThemeSwitcher() {
        const themeSwitcherBtn = document.getElementById('themeSwitcherBtn');
        if (!themeSwitcherBtn) return;

        const themes = ['theme-classic', 'theme-high-contrast', 'theme-sunset', 'theme-electric'];

        themeSwitcherBtn.addEventListener('click', () => {
            const currentTheme = localStorage.getItem('user-theme') || 'theme-classic';
            const currentIndex = themes.indexOf(currentTheme);
            const nextIndex = (currentIndex + 1) % themes.length;
            const nextTheme = themes[nextIndex];

            // Apply theme
            document.body.classList.remove(...themes);
            document.body.classList.add(nextTheme);
            localStorage.setItem('user-theme', nextTheme);

            // Sync with profile modal if it exists
            if (this.profileModal) {
                this.profileModal.setThemeDropdown(nextTheme);
            }

            this.updateThemeSwitcherUI();
            console.log(`Theme switched to: ${nextTheme}`);
        });

        // Initial UI update
        this.updateThemeSwitcherUI();
    }

    updateThemeSwitcherUI() {
        const themeSwitcherBtn = document.getElementById('themeSwitcherBtn');
        if (themeSwitcherBtn) {
            const currentTheme = localStorage.getItem('user-theme') || 'theme-classic';
        }
    }

    showHUD(message, type = 'success') {
        let hud = document.getElementById('hud-notification');
        if (!hud) {
            hud = document.createElement('div');
            hud.id = 'hud-notification';
            hud.className = 'hud-notification';
            document.body.appendChild(hud);
        }

        const icon = type === 'success' ? '✓' : 'ℹ';
        hud.innerHTML = `
            <div class="hud-icon-circle">${icon}</div>
            <div class="hud-message">${message}</div>
        `;

        // Force reflow
        hud.offsetHeight;

        hud.classList.add('show');

        if (this.hudTimeout) clearTimeout(this.hudTimeout);
        this.hudTimeout = setTimeout(() => {
            hud.classList.remove('show');
        }, 2200);
    }

    showConfirm(options, callback) {
        let overlay = document.getElementById('custom-confirm-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'custom-confirm-overlay';
            overlay.className = 'custom-confirm-overlay';
            document.body.appendChild(overlay);
        }

        const title = options.title || 'Are you sure?';
        const message = options.message || '';
        const confirmText = options.confirmText || 'Confirm';
        const cancelText = options.cancelText || 'Cancel';
        const type = options.type || 'primary'; // 'primary' or 'danger'

        const btnClass = type === 'danger' ? 'confirm-btn-danger' : 'confirm-btn-primary';

        overlay.innerHTML = `
            <div class="confirm-modal">
                <div class="confirm-title">${title}</div>
                <div class="confirm-message">${message}</div>
                <div class="confirm-buttons">
                    <button class="confirm-btn confirm-btn-cancel">${cancelText}</button>
                    <button class="confirm-btn ${btnClass}">${confirmText}</button>
                </div>
            </div>
        `;

        // Force reflow
        overlay.offsetHeight;
        overlay.classList.add('show');

        const close = (result) => {
            overlay.classList.remove('show');
            setTimeout(() => {
                if (callback) callback(result);
            }, 300);
        };

        overlay.querySelector('.confirm-btn-cancel').onclick = () => close(false);
        overlay.querySelector(`.confirm-btn.${btnClass}`).onclick = () => close(true);

        // Close on overlay click (cancel)
        overlay.onclick = (e) => {
            if (e.target === overlay) close(false);
        };
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.appInstance = new App();
});



















































