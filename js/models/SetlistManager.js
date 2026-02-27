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
        const normalized = setlists.map(setlist => ({
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
                // We DO need to notify UI, restoring this is actually correct,
                // but let's stick to the type fix first as requested.
                // Wait, if I don't notify, the UI won't update?
                // The user said "it is not the refreshing", effectively saying 
                // "persistence is broken". 
                // So fixing persistence (types) is key.
                if (this.onSetlistsChanged) this.onSetlistsChanged();
                return true;
            }
        }
        return false;
    }

    async removeSongFromSetlist(setlistId, songId) {
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

