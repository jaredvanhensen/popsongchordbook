// SetlistManager - Setlist data management met Firebase en localStorage fallback
class SetlistManager {
    constructor(firebaseManager = null) {
        this.storageKey = 'popsongSetlists';
        this.firebaseManager = firebaseManager;
        this.setlists = [];
        this.syncEnabled = false;
        this.onSetlistsChanged = null; // Callback for when setlists change externally
    }

    async loadSetlists(forceFromFirebase = false) {
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

            // SAFETY CHECK: If server has 0 setlists but we have local setlists (more than just DEMO?),
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
        if (!Array.isArray(setlists)) return [];
        return setlists.map(setlist => ({
            id: setlist.id || Date.now().toString() + Math.random(),
            name: setlist.name || 'Unnamed Setlist',
            songIds: Array.isArray(setlist.songIds) ? setlist.songIds : [],
            createdAt: setlist.createdAt || new Date().toISOString()
        }));
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
        this.setlists = this.setlists.filter(sl => sl.id !== id);
        await this.saveSetlists();
    }

    async updateSetlistName(id, newName) {
        const setlist = this.getSetlist(id);
        if (setlist && newName && newName.trim()) {
            // Update the setlist directly in the array
            const index = this.setlists.findIndex(sl => sl.id === id);
            if (index !== -1) {
                this.setlists[index].name = newName.trim();
                await this.saveSetlists();
                return true;
            }
        }
        return false;
    }

    getSetlist(id) {
        return this.setlists.find(sl => sl.id === id);
    }

    getAllSetlists() {
        return this.setlists;
    }

    async addSongToSetlist(setlistId, songId) {
        return this.addSongsToSetlist(setlistId, [songId]);
    }

    async addSongsToSetlist(setlistId, songIds) {
        const setlist = this.getSetlist(setlistId);
        if (setlist && Array.isArray(songIds)) {
            let changed = false;
            songIds.forEach(songId => {
                if (!setlist.songIds.includes(songId)) {
                    setlist.songIds.push(songId);
                    changed = true;
                }
            });

            if (changed) {
                await this.saveSetlists();
                return true;
            }
        }
        return false;
    }

    async removeSongFromSetlist(setlistId, songId) {
        const setlist = this.getSetlist(setlistId);
        if (setlist) {
            setlist.songIds = setlist.songIds.filter(id => id !== songId);
            await this.saveSetlists();
            return true;
        }
        return false;
    }

    getSongsInSetlist(setlistId, allSongs) {
        const setlist = this.getSetlist(setlistId);
        if (!setlist) return [];
        return allSongs.filter(song => setlist.songIds.includes(song.id));
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
}

