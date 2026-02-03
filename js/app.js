// Main Application
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
            withoutYouTube: false
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

        this.tableRenderer = new TableRenderer(
            this.songManager,
            (songId) => this.handleRowSelect(songId),
            (songId, field, value) => this.handleCellEdit(songId, field, value),
            (songId) => this.handleDelete(songId),
            this.chordModal,
            (songId) => this.handleToggleFavorite(songId),
            (songId) => this.handlePlayYouTube(songId),
            this.keyDetector
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

        console.log("Pop Song Chord Book - App Initialized (v1.956)");
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
            const index = this.modalStack.findIndex(m => m.id === modalId);
            if (index !== -1) {
                this.modalStack.splice(index, 1);
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
        this.setupAddSongsToSetlistModal();
        this.setupAddToSetlistSingleModal();
        this.setupImportExport();
        this.setupPrintButton();
        this.setupDeselect();
        this.setupHeaderBarToggle();
        this.setupToggleView();
        this.setupResponsiveView();
        this.setupCreateSongModal();

        // Load data from Firebase
        await this.loadDataFromFirebase();

        // Setup real-time sync
        this.setupRealtimeSync();

        // Initialize pending songs count
        const userId = this.firebaseManager.getCurrentUser().uid;
        this.firebaseManager.getPendingSongsCount(userId).then(count => {
            this.updatePendingSongsCount(count);
        });

        // Load and render songs (no default songs for new users)
        this.loadAndRender();

        // DEBUG: Diagnostics on Version Click
        const versionEl = document.getElementById('site-version');
        if (versionEl) {
            versionEl.style.cursor = 'pointer';
            versionEl.title = 'Click for Diagnostics';
            versionEl.addEventListener('click', () => this.runDiagnostics());
        }
    }

    async handleAuthSuccess(user) {
        if (!this.isAuthenticated) {
            // First time authentication - check for migration
            await this.checkAndMigrateData(user);
            await this.initializeApp();
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
    }

    handleAuthFailure() {
        this.isAuthenticated = false;
        // Disable sync
        this.songManager.disableSync();
        this.setlistManager.disableSync();
        this.updateProfileLabel(null);
        // Show login modal
        if (this.authModal) {
            this.authModal.show(true);
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
        // Show login modal
        if (this.authModal) {
            this.authModal.show(true);
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
        // Must be done AFTER await to prevent race conditions
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
                textContent = `<span>${user.displayName}</span> ${songCountHtml}`;
            } else {
                textContent = `<span>Profiel</span> ${songCountHtml}`;
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
                    // Ask user if they want to migrate (only for new accounts with local data)
                    const shouldMigrate = confirm(
                        `Je hebt ${songs.length} song(s) en ${setlists.length} setlist(s) lokaal opgeslagen.\n\n` +
                        `Wil je deze data naar je nieuwe Firebase account migreren?\n\n` +
                        `Klik "OK" om te migreren, of "Annuleren" om te starten met een lege collectie.`
                    );

                    if (shouldMigrate) {
                        const result = await this.firebaseManager.migrateLocalDataToFirebase(userId, songs, setlists);

                        if (result.merged) {
                            alert(
                                `Migratie voltooid!\n\n` +
                                `${result.songsAdded} nieuwe song(s) toegevoegd.\n` +
                                `${result.setlistsAdded} nieuwe setlist(s) toegevoegd.`
                            );
                        } else {
                            alert(
                                `Migratie voltooid!\n\n` +
                                `${result.songsAdded} song(s) gemigreerd.\n` +
                                `${result.setlistsAdded} setlist(s) gemigreerd.`
                            );
                        }
                    }

                    // Mark migration as completed (even if user declined)
                    localStorage.setItem(migrationKey, 'true');
                }
            } catch (error) {
                console.error('Migration error:', error);
                alert('Er is een fout opgetreden bij het migreren van data.');
            }
        } else {
            // No local data, mark migration as completed
            localStorage.setItem(migrationKey, 'true');
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

            // 1. If library is empty, import default songs
            if (allSongs.length === 0 && DEFAULT_SONGS && DEFAULT_SONGS.length > 0) {
                console.log("Library empty. Importing default songs...");
                await this.songManager.importSongs(DEFAULT_SONGS);
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

        // Apply setlist filter if a setlist is selected
        if (this.currentSetlistId) {
            const setlist = this.setlistManager.getSetlist(this.currentSetlistId);
            if (setlist) {
                allSongs = allSongs.filter(song => setlist.songIds.includes(song.id));
            }
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
            const songExists = allSongs.some(song => song.id === currentSelectedId);
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
                withoutYouTube: filterWithoutYouTubeCheckbox.checked
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
            this.currentFilter = {
                favorites: false,
                key: '',
                withYouTube: false,
                withoutYouTube: false
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
    }

    updateFilterButtonState() {
        const filterBtn = document.getElementById('filterBtn');
        if (!filterBtn) return;

        // Check if any filter is active
        const hasActiveFilters = this.currentFilter.favorites ||
            this.currentFilter.key !== '' ||
            this.currentFilter.withYouTube ||
            this.currentFilter.withoutYouTube;

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
        await this.songManager.toggleFavorite(songId);
        this.loadAndRender();
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
        const deleteAllBtn = document.getElementById('deleteAllSongsBtn');

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
            // Explicitly hide delete all button (double check)
            if (deleteAllBtn) {
                deleteAllBtn.classList.add('hidden');
                deleteAllBtn.style.display = 'none';
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
            // Explicitly show delete all button
            if (deleteAllBtn) {
                deleteAllBtn.classList.remove('hidden');
                deleteAllBtn.style.display = '';
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

            if (this.currentSetlistId) {
                try {
                    await this.setlistManager.addSongsToSetlist(this.currentSetlistId, songIds);
                    this.popModalState('addSongsToSetlist');
                    this.loadAndRender();
                } catch (error) {
                    console.error('Error adding songs to setlist:', error);
                    alert('Error adding songs to setlist.');
                }
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
                    alert('Song toegevoegd aan setlist!');
                    closeModal();
                } catch (error) {
                    console.error('Error adding song to setlist:', error);
                    alert('Fout bij toevoegen van song.');
                }
            } else {
                alert('Selecteer eerst een setlist.');
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
            setTimeout(() => searchInput.focus(), 100);
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
        container.innerHTML = '';

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

        if (allSongs.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'no-songs-message';
            emptyMessage.textContent = searchTerm ? 'No songs match your search.' : 'No songs available.';
            container.appendChild(emptyMessage);
            this.updateSelectedCount();
            return;
        }

        allSongs.forEach(song => {
            const isInSetlist = songsInSetlist.includes(song.id);

            const songItem = document.createElement('div');
            songItem.className = 'song-item';
            if (isInSetlist) {
                songItem.classList.add('in-setlist');
            }

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = song.id;
            checkbox.id = `song-${song.id}`;
            checkbox.disabled = isInSetlist;
            if (isInSetlist) {
                checkbox.checked = true;
            }

            const label = document.createElement('label');
            label.htmlFor = `song-${song.id}`;
            label.textContent = `${song.artist || 'Unknown'} - ${song.title || 'No title'}`;
            if (isInSetlist) {
                label.innerHTML += ' <span class="in-setlist-badge">(already in setlist)</span>';
            }

            songItem.appendChild(checkbox);
            songItem.appendChild(label);
            container.appendChild(songItem);
        });

        this.updateSelectedCount();
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

            // Push history state before showing modal
            this.pushModalState('songDetail', () => this.songDetailModal.hide(true));

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

        // 1. Find the minimum practice count
        const counts = availableSongs.map(s => parseInt(s.practiceCount) || 0);
        const minCount = Math.min(...counts);

        // 2. Filter all songs that have this minCount
        let tiedSongs = availableSongs.filter(s => (parseInt(s.practiceCount) || 0) === minCount);

        // 3. Get current song ID to avoid repetition if possible
        const currentSongId = this.songDetailModal ? this.songDetailModal.currentSongId : null;

        let nextSong;
        if (tiedSongs.length > 1 && currentSongId) {
            // Filter out current song if it's in the tied group to ensure we switch
            const candidates = tiedSongs.filter(s => s.id !== currentSongId);
            if (candidates.length > 0) {
                const randomIndex = Math.floor(Math.random() * candidates.length);
                nextSong = candidates[randomIndex];
            } else {
                // If only the current song is in the tied list (which means others are > minCount)
                // we still want to pick it if there are no other tied candidates, 
                // but the above case logic handles tiedSongs.length > 1
                nextSong = tiedSongs[Math.floor(Math.random() * tiedSongs.length)];
            }
        } else if (tiedSongs.length > 0) {
            // Only one song with min count or no current song
            const randomIndex = Math.floor(Math.random() * tiedSongs.length);
            nextSong = tiedSongs[randomIndex];
        } else {
            // Fallback (should not happen)
            nextSong = availableSongs[0];
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

        // Re-render table
        this.loadAndRender();

        // Open the detail modal with the new song
        setTimeout(() => {
            const song = this.songManager.getSongById(newSong.id);
            if (song) {
                if (this.tableRenderer) {
                    this.tableRenderer.selectRow(song.id, true);
                }
                this.songDetailModal.show(song, false); // false = don't auto-edit artist (already filled)
            }
        }, 50);
    }

    async handleRemoveFromSetlist(songId) {
        if (this.currentSetlistId) {
            await this.setlistManager.removeSongFromSetlist(this.currentSetlistId, songId);
            this.loadAndRender();
        }
    }

    async handleDelete(songId) {
        if (await this.songManager.deleteSong(songId)) {
            // Remove song from all setlists
            const setlists = this.setlistManager.getAllSetlists();
            for (const setlist of setlists) {
                await this.setlistManager.removeSongFromSetlist(setlist.id, songId);
            }
            // Re-render table
            this.loadAndRender();
        }
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

        let msg = `Diagnostics (v1.943):\n`;
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
    }

    setupPrintButton() {
        const printBtn = document.getElementById('printTableBtn');
        if (!printBtn) return;

        printBtn.addEventListener('click', () => {
            this.printTable();
        });
    }

    async deleteAllSongs() {
        const songCount = this.songManager.getAllSongs().length;

        if (songCount === 0) {
            alert('There are no songs to delete.');
            return;
        }

        // Show warning with song count
        const message = `WARNING: You are about to permanently delete all ${songCount} song(s)!\n\n` +
            `This action cannot be undone.\n\n` +
            `Are you sure you want to continue?`;

        if (!confirm(message)) {
            return;
        }

        // Double confirmation
        const doubleConfirm = confirm(
            `Final confirmation: All ${songCount} song(s) will now be deleted.\n\n` +
            `Click "OK" to confirm or "Cancel" to abort.`
        );

        if (!doubleConfirm) {
            return;
        }

        // Delete all songs
        await this.songManager.deleteAllSongs();

        // Re-render
        this.loadAndRender();
        this.updateSetlistSelect();

        // Show success message
        alert(`All ${songCount} song(s) have been successfully deleted.`);
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
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Show feedback
        const exportBtn = document.getElementById('exportBtn');
        const iconElement = exportBtn.querySelector('.icon');
        if (iconElement) {
            const originalIcon = iconElement.textContent;
            iconElement.textContent = '✓';
            setTimeout(() => {
                iconElement.textContent = originalIcon;
            }, 2000);
        } else {
            // Fallback for old structure
            const originalText = exportBtn.textContent;
            exportBtn.textContent = '✓ Geëxporteerd!';
            setTimeout(() => {
                exportBtn.textContent = originalText;
            }, 2000);
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
            const isMobile = window.innerWidth <= 768;

            if (isPortrait && isMobile) {
                if (this.viewMode !== 'simple') {
                    this.viewMode = 'simple';
                    this.updateViewMode();
                    this.loadAndRender();
                }
            }
        };

        // Initial check
        checkView();

        // Listen for resize which also catches orientation changes
        window.addEventListener('resize', checkView);
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
        if (!themeSwitcherBtn) return;

        const currentTheme = localStorage.getItem('user-theme') || 'theme-classic';

        // This is mostly handled by CSS body classes now, but we can add 
        // specific logic here if we want to change icons etc.
        // For now, the CSS borders are enough.
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.appInstance = new App();
});

















