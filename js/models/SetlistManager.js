// SetlistManager - Setlist data management met Firebase en localStorage fallback
class SetlistManager {
    constructor(firebaseManager = null) {
        this.baseStorageKey = 'popsongSetlists';
        this.storageKey = this.baseStorageKey; // Default
        this.firebaseManager = firebaseManager;
        this.setlists = [];
        this.syncEnabled = false;
        this.onSetlistsChanged = null; // Callback for when setlists change externally
        
        // Initialize public Beginner setlist
        this.beginnerSetlist = {
            id: 'beginner_setlist_id',
            name: 'Beginner',
            songIds: [],
            isPublic: true,
            createdAt: new Date().toISOString()
        };
        try {
            const cachedBeginner = localStorage.getItem('popsongPublicSetlist_beginner');
            if (cachedBeginner) {
                this.beginnerSetlist = JSON.parse(cachedBeginner);
            }
        } catch (e) {
            console.error('Error parsing cached beginner setlist:', e);
        }
    }

    async loadSetlists(forceFromFirebase = false) {
        // Load public beginner setlist from Firebase
        if (this.firebaseManager) {
            this.firebaseManager.getGlobalSetting('beginnerSetlist')
                .then(data => {
                    if (data) {
                        this.beginnerSetlist = data;
                        this.beginnerSetlist.name = 'Beginner'; // Guarantee spelling is Beginner
                        localStorage.setItem('popsongPublicSetlist_beginner', JSON.stringify(this.beginnerSetlist));
                        if (this.onSetlistsChanged) this.onSetlistsChanged();
                    }
                })
                .catch(err => console.error('Error loading beginner setlist from Firebase:', err));
        }

        // First, try to load from cache (localStorage)
        if (!forceFromFirebase) {
            try {
                const stored = localStorage.getItem(this.storageKey);
                if (stored) {
                    const setlists = JSON.parse(stored);
                    this.setlists = this.normalizeSetlists(setlists);
                    // Return cached data immediately, then sync in background
                    if (this.firebaseManager && this.firebaseManager.isAuthenticated()) {
                        // Sync with Firebase in background (non-blocking)
                        this.syncFromFirebase().catch(err => {
                            console.error('Background sync error:', err);
                        });
                    }
                    return this.setlists;
                }
            } catch (e) {
                console.error('Error loading setlists from localStorage:', e);
            }
        }

        // If no cache or forceFromFirebase, load from Firebase
        if (this.firebaseManager && this.firebaseManager.isAuthenticated()) {
            try {
                const userId = this.firebaseManager.getCurrentUser().uid;
                const setlists = await this.firebaseManager.loadSetlists(userId);
                this.setlists = this.normalizeSetlists(setlists);
                // Cache the data
                this.cacheSetlists();
                return this.setlists;
            } catch (error) {
                console.error('Error loading setlists from Firebase:', error);
                // If Firebase fails and we have cache, use cache
                try {
                    const stored = localStorage.getItem(this.storageKey);
                    if (stored) {
                        this.setlists = this.normalizeSetlists(JSON.parse(stored));
                        return this.setlists;
                    }
                } catch (e) {
                    console.error('Error loading from cache after Firebase failure:', e);
                }
            }
        }

        // No data available
        this.setlists = [];
        return [];
    }

    // Sync from Firebase in background (for cache updates)
    async syncFromFirebase() {
        if (!this.firebaseManager || !this.firebaseManager.isAuthenticated()) {
            return;
        }

        try {
            const userId = this.firebaseManager.getCurrentUser().uid;
            const setlists = await this.firebaseManager.loadSetlists(userId);
            const normalizedSetlists = this.normalizeSetlists(setlists);

            // SAFETY CHECK: If server has 0 setlists but we have local setlists,
            // assume server save failed previously and PROTECT local data.
            if (normalizedSetlists.length === 0 && this.setlists.length > 0) {
                console.warn(`Sync: Server has 0 setlists, Local has ${this.setlists.length}. Protecting local data and re-uploading.`);
                await this.saveSetlists();
                return;
            }

            // Only update if data is different (avoid unnecessary updates)
            const currentSetlistsStr = JSON.stringify(this.setlists);
            const newSetlistsStr = JSON.stringify(normalizedSetlists);

            if (currentSetlistsStr !== newSetlistsStr) {
                this.setlists = normalizedSetlists;
                this.cacheSetlists();
                // Notify listeners if callback is set
                if (this.onSetlistsChanged) {
                    this.onSetlistsChanged();
                }
            }
        } catch (error) {
            console.error('Background sync error:', error);
        }
    }

    // Cache setlists to localStorage
    cacheSetlists() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.setlists));
        } catch (error) {
            console.error('Error caching setlists:', error);
        }
    }

    normalizeSetlists(setlists) {
        // If we are the admin and there's a private BEGINNER/Beginner setlist, seed the public Beginner one from it if public one is currently empty
        const user = this.firebaseManager ? this.firebaseManager.getCurrentUser() : null;
        const isAdmin = this.firebaseManager && user && this.firebaseManager.isAdmin(user.uid);
        if (isAdmin && Array.isArray(setlists)) {
            const privateBeginner = setlists.find(sl => sl && sl.name && (sl.name.toUpperCase() === 'BEGINNER'));
            if (privateBeginner && privateBeginner.songIds && privateBeginner.songIds.length > 0) {
                if (!this.beginnerSetlist.songIds || this.beginnerSetlist.songIds.length === 0) {
                    this.beginnerSetlist.songIds = [...privateBeginner.songIds];
                    this.beginnerSetlist.createdAt = privateBeginner.createdAt || this.beginnerSetlist.createdAt;
                    this.beginnerSetlist.name = 'Beginner';
                    
                    // Save to Firebase settings and localStorage
                    this.firebaseManager.updateGlobalSetting('beginnerSetlist', this.beginnerSetlist)
                        .catch(err => console.error('Failed to auto-seed public beginner setlist:', err));
                    localStorage.setItem('popsongPublicSetlist_beginner', JSON.stringify(this.beginnerSetlist));
                }
            }
        }

        if (!Array.isArray(setlists)) return [];
        const normalized = setlists
            .filter(sl => sl && sl.name && sl.name.toUpperCase() !== 'DEMO' && sl.name.toUpperCase() !== 'BEGINNER')
            .map(setlist => ({
                id: setlist.id || Date.now().toString() + Math.random(),
                name: setlist.name || 'Unnamed Setlist',
                songIds: Array.isArray(setlist.songIds) ? setlist.songIds : [],
                createdAt: setlist.createdAt || new Date().toISOString()
            }));

        // Ensure "PRACTICE" setlist exists if not already present
        const hasPractice = normalized.some(sl => sl.name.toUpperCase() === 'PRACTICE');
        if (!hasPractice) {
            normalized.push({
                id: 'practice_setlist_id', // Stable ID for practice setlist
                name: 'PRACTICE',
                songIds: [],
                createdAt: new Date().toISOString()
            });
        }
        return normalized;
    }

    getPracticeSetlist() {
        return this.setlists.find(sl => sl.name.toUpperCase() === 'PRACTICE');
    }

    isSongInPracticeSetlist(songId) {
        const practiceSetlist = this.getPracticeSetlist();
        return practiceSetlist ? practiceSetlist.songIds.includes(songId) : false;
    }

    async togglePracticeSong(songId) {
        const practiceSetlist = this.getPracticeSetlist();
        if (!practiceSetlist) {
            // This shouldn't normally happen since normalizeSetlists ensures it
            await this.createSetlist('PRACTICE');
            return this.togglePracticeSong(songId);
        }

        const index = practiceSetlist.songIds.indexOf(songId);
        if (index === -1) {
            practiceSetlist.songIds.push(songId);
        } else {
            practiceSetlist.songIds.splice(index, 1);
        }

        await this.saveSetlists();

        // Notify listeners
        if (this.onSetlistsChanged) {
            this.onSetlistsChanged();
        }

        return index === -1; // returns true if added, false if removed
    }

    // Set setlists (used for real-time sync from Firebase)
    setSetlists(setlists, skipSave = false) {
        const normalizedSetlists = this.normalizeSetlists(setlists);

        // Merge with existing setlists to avoid duplicates
        // Use a Map to ensure unique IDs
        const setlistsMap = new Map();

        // First, add existing setlists to the map
        this.setlists.forEach(setlist => {
            setlistsMap.set(setlist.id, setlist);
        });

        // Then, update/add setlists from Firebase
        normalizedSetlists.forEach(setlist => {
            setlistsMap.set(setlist.id, setlist);
        });

        // Convert back to array
        this.setlists = Array.from(setlistsMap.values());

        if (!skipSave) {
            // Fire and forget - don't await to avoid blocking
            this.saveSetlists().catch(err => console.error('Error saving setlists:', err));
        } else {
            // Still cache even if we skip Firebase save
            this.cacheSetlists();
        }
    }

    async saveSetlists() {
        // Always cache to localStorage first (fast, local)
        this.cacheSetlists();

        // Then save to Firebase in background (only if authenticated)
        if (this.firebaseManager && this.firebaseManager.isAuthenticated()) {
            try {
                const userId = this.firebaseManager.getCurrentUser().uid;
                // Save to Firebase (this will trigger real-time sync on other devices)
                await this.firebaseManager.saveSetlists(userId, this.setlists);
            } catch (error) {
                console.error('Error saving setlists to Firebase:', error);
                // Data is already cached, so app continues to work offline
            }
        }
    }

    async createSetlist(name) {
        const setlist = {
            id: Date.now().toString(),
            name: name,
            songIds: [],
            createdAt: new Date().toISOString()
        };
        this.setlists.push(setlist);
        await this.saveSetlists();
        return setlist;
    }

    async deleteSetlist(id) {
        if (id === 'beginner_setlist_id') {
            const user = this.firebaseManager ? this.firebaseManager.getCurrentUser() : null;
            const isAdmin = this.firebaseManager && user && this.firebaseManager.isAdmin(user.uid);
            if (!isAdmin) {
                console.error('Permission denied: Only admin can delete the Beginner setlist.');
                return;
            }
            this.beginnerSetlist.songIds = [];
            await this.firebaseManager.updateGlobalSetting('beginnerSetlist', this.beginnerSetlist);
            localStorage.setItem('popsongPublicSetlist_beginner', JSON.stringify(this.beginnerSetlist));
            if (this.onSetlistsChanged) this.onSetlistsChanged();
            return;
        }
        this.setlists = this.setlists.filter(sl => sl.id !== id);
        await this.saveSetlists();
    }

    async updateSetlistName(id, newName) {
        if (id === 'beginner_setlist_id') {
            const user = this.firebaseManager ? this.firebaseManager.getCurrentUser() : null;
            const isAdmin = this.firebaseManager && user && this.firebaseManager.isAdmin(user.uid);
            if (!isAdmin) {
                console.error('Permission denied: Only admin can rename the Beginner setlist.');
                return null;
            }
            this.beginnerSetlist.name = newName.trim();
            await this.firebaseManager.updateGlobalSetting('beginnerSetlist', this.beginnerSetlist);
            localStorage.setItem('popsongPublicSetlist_beginner', JSON.stringify(this.beginnerSetlist));
            if (this.onSetlistsChanged) this.onSetlistsChanged();
            return this.beginnerSetlist;
        }
        const setlist = this.getSetlist(id);
        if (setlist && newName && newName.trim()) {
            // Update the setlist directly in the array
            const index = this.setlists.findIndex(sl => sl.id === id);
            if (index !== -1) {
                this.setlists[index].name = newName.trim();
                await this.saveSetlists();

                // Notify listeners immediately for local changes
                if (this.onSetlistsChanged) {
                    this.onSetlistsChanged();
                }
                return this.setlists[index];
            }
        }
        return null;
    }

    getSetlist(id) {
        if (id === 'beginner_setlist_id') {
            return this.beginnerSetlist;
        }
        return this.setlists.find(sl => sl.id === id);
    }

    getAllSetlists() {
        const list = [...this.setlists];
        if (this.beginnerSetlist) {
            // Ensure no duplicate if already added
            if (!list.some(sl => sl.id === 'beginner_setlist_id')) {
                list.push(this.beginnerSetlist);
            }
        }
        return list;
    }

    async addSongToSetlist(setlistId, songId) {
        return this.addSongsToSetlist(setlistId, [songId]);
    }

    async addSongsToSetlist(setlistId, songIds) {
        if (setlistId === 'beginner_setlist_id') {
            const user = this.firebaseManager ? this.firebaseManager.getCurrentUser() : null;
            const isAdmin = this.firebaseManager && user && this.firebaseManager.isAdmin(user.uid);
            if (!isAdmin) {
                console.error('Permission denied: Only admin can add songs to the Beginner setlist.');
                return false;
            }
            const setlist = this.beginnerSetlist;
            if (setlist && Array.isArray(songIds)) {
                let changed = false;
                songIds.forEach(songId => {
                    const idStr = String(songId);
                    if (!setlist.songIds.some(existingId => String(existingId) === idStr)) {
                        setlist.songIds.push(idStr);
                        changed = true;
                    }
                });
                if (changed) {
                    await this.firebaseManager.updateGlobalSetting('beginnerSetlist', this.beginnerSetlist);
                    localStorage.setItem('popsongPublicSetlist_beginner', JSON.stringify(this.beginnerSetlist));
                    if (this.onSetlistsChanged) this.onSetlistsChanged();
                    return true;
                }
            }
            return false;
        }
        const setlist = this.getSetlist(setlistId);
        if (setlist && Array.isArray(songIds)) {
            let changed = false;
            songIds.forEach(songId => {
                // Ensure ID is string to prevent mismatch
                const idStr = String(songId);
                // Check if ALREADY exists (comparing strings)
                if (!setlist.songIds.some(existingId => String(existingId) === idStr)) {
                    setlist.songIds.push(idStr);
                    changed = true;
                }
            });

            if (changed) {
                await this.saveSetlists();
                if (this.onSetlistsChanged) this.onSetlistsChanged();
                return true;
            }
        }
        return false;
    }

    async removeSongFromSetlist(setlistId, songId) {
        if (setlistId === 'beginner_setlist_id') {
            const user = this.firebaseManager ? this.firebaseManager.getCurrentUser() : null;
            const isAdmin = this.firebaseManager && user && this.firebaseManager.isAdmin(user.uid);
            if (!isAdmin) {
                console.error('Permission denied: Only admin can remove songs from the Beginner setlist.');
                return false;
            }
            const setlist = this.beginnerSetlist;
            if (setlist) {
                const idStr = String(songId);
                const originalLength = setlist.songIds.length;
                setlist.songIds = setlist.songIds.filter(id => String(id) !== idStr);

                if (setlist.songIds.length !== originalLength) {
                    await this.firebaseManager.updateGlobalSetting('beginnerSetlist', this.beginnerSetlist);
                    localStorage.setItem('popsongPublicSetlist_beginner', JSON.stringify(this.beginnerSetlist));
                    if (this.onSetlistsChanged) this.onSetlistsChanged();
                    return true;
                }
            }
            return false;
        }
        const setlist = this.getSetlist(setlistId);
        if (setlist) {
            const idStr = String(songId);
            const originalLength = setlist.songIds.length;
            setlist.songIds = setlist.songIds.filter(id => String(id) !== idStr);

            if (setlist.songIds.length !== originalLength) {
                await this.saveSetlists();
                if (this.onSetlistsChanged) this.onSetlistsChanged();
                return true;
            }
        }
        return false;
    }

    getSongsInSetlist(setlistId, allSongs) {
        const setlist = this.getSetlist(setlistId);
        if (!setlist) return [];
        // Robust filtering: Convert both to strings for comparison
        return allSongs.filter(song => setlist.songIds.some(id => String(id) === String(song.id)));
    }

    async importSetlists(importedSetlists) {
        // Validate and normalize imported setlists
        const normalizedSetlists = importedSetlists.map(setlist => ({
            id: setlist.id || Date.now().toString() + Math.random(),
            name: setlist.name || 'Unnamed Setlist',
            songIds: Array.isArray(setlist.songIds) ? setlist.songIds : [],
            createdAt: setlist.createdAt || new Date().toISOString()
        }));

        // Replace all setlists
        this.setlists = normalizedSetlists;
        await this.saveSetlists();
    }

    // Enable real-time sync from Firebase
    enableSync(userId) {
        if (!this.firebaseManager || this.syncEnabled) {
            return;
        }

        this.syncEnabled = true;
        this.updateStorageKey(userId);
        this.cleanupOldCaches(userId);

        this.firebaseManager.onSetlistsChange(userId, (setlists) => {
            // Only update if data actually changed (avoid unnecessary UI updates)
            const newSetlists = this.normalizeSetlists(setlists);
            const currentSetlistsStr = JSON.stringify(this.setlists);
            const newSetlistsStr = JSON.stringify(newSetlists);

            if (currentSetlistsStr !== newSetlistsStr) {
                // Update setlists without triggering save (to avoid infinite loop)
                this.setSetlists(setlists, true);
                // Update cache
                this.cacheSetlists();
                // Notify listeners
                if (this.onSetlistsChanged) {
                    this.onSetlistsChanged();
                }
            }
        });
    }

    // Disable real-time sync
    disableSync() {
        if (this.firebaseManager && this.syncEnabled) {
            const userId = this.firebaseManager.getCurrentUser()?.uid;
            if (userId) {
                this.firebaseManager.removeSetlistsListener(userId);
            }
            this.syncEnabled = false;
        }
    }

    /**
     * Updates the local storage key to be user-specific.
     */
    updateStorageKey(userId) {
        if (userId) {
            this.storageKey = `${this.baseStorageKey}_${userId}`;
        } else {
            this.storageKey = this.baseStorageKey;
        }
    }

    /**
     * Cleans up old user-specific caches from localStorage.
     */
    cleanupOldCaches(currentUserId) {
        try {
            const prefix = this.baseStorageKey + '_';
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix) && key !== `${prefix}${currentUserId}`) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
        } catch (e) {
            console.warn('SetlistManager: Cache cleanup failed:', e);
        }
    }
}

