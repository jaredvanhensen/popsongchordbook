// SongManager - Data management met Firebase en localStorage fallback
class SongManager {
    constructor(firebaseManager = null) {
        this.storageKey = 'popsongChordBook';
        this.firebaseManager = firebaseManager;
        this.songs = [];
        this.nextId = 1;
        this.syncEnabled = false;
        this.onSongsChanged = null; // Callback for when songs change externally
    }

    async loadSongs(forceFromFirebase = false) {
        // First, try to load from cache (localStorage)
        if (!forceFromFirebase) {
            try {
                const stored = localStorage.getItem(this.storageKey);
                if (stored) {
                    const songs = JSON.parse(stored);
                    this.songs = this.normalizeSongs(songs);
                    this.updateNextId();
                    // Return cached data immediately, then sync in background
                    if (this.firebaseManager && this.firebaseManager.isAuthenticated()) {
                        // Sync with Firebase in background (non-blocking)
                        this.syncFromFirebase().catch(err => {
                            console.error('Background sync error:', err);
                        });
                    }
                    return this.songs;
                }
            } catch (error) {
                console.error('Error loading songs from localStorage:', error);
            }
        }

        // If no cache or forceFromFirebase, load from Firebase
        if (this.firebaseManager && this.firebaseManager.isAuthenticated()) {
            try {
                const userId = this.firebaseManager.getCurrentUser().uid;
                const songs = await this.firebaseManager.loadSongs(userId);
                this.songs = this.normalizeSongs(songs);
                this.updateNextId();
                // Cache the data
                this.cacheSongs();
                return this.songs;
            } catch (error) {
                console.error('Error loading songs from Firebase:', error);
                // If Firebase fails and we have cache, use cache
                try {
                    const stored = localStorage.getItem(this.storageKey);
                    if (stored) {
                        const songs = JSON.parse(stored);
                        this.songs = this.normalizeSongs(songs);
                        this.updateNextId();
                        return this.songs;
                    }
                } catch (e) {
                    console.error('Error loading from cache after Firebase failure:', e);
                }
            }
        }

        // No data available
        this.songs = [];
        this.nextId = 1;
        return [];
    }

    // Sync from Firebase in background (for cache updates)
    async syncFromFirebase() {
        if (!this.firebaseManager || !this.firebaseManager.isAuthenticated()) {
            return;
        }

        try {
            const userId = this.firebaseManager.getCurrentUser().uid;
            const songs = await this.firebaseManager.loadSongs(userId);
            const normalizedSongs = this.normalizeSongs(songs);

            // Only update if data is different (avoid unnecessary updates)
            const currentSongsStr = JSON.stringify(this.songs);
            const newSongsStr = JSON.stringify(normalizedSongs);

            if (currentSongsStr !== newSongsStr) {
                this.songs = normalizedSongs;
                this.updateNextId();
                this.cacheSongs();
                // Notify listeners if callback is set
                if (this.onSongsChanged) {
                    this.onSongsChanged();
                }
            }
        } catch (error) {
            console.error('Background sync error:', error);
        }
    }

    // Cache songs to localStorage
    cacheSongs() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.songs));
        } catch (error) {
            console.error('Error caching songs:', error);
        }
    }

    normalizeSongs(songs) {
        if (!Array.isArray(songs)) return [];
        return songs.map(song => ({
            ...song,
            favorite: song.favorite || false,
            youtubeUrl: song.youtubeUrl || '',
            externalUrl: song.externalUrl || '',
            key: song.key || ''
        }));
    }

    updateNextId() {
        if (this.songs.length > 0) {
            this.nextId = Math.max(...this.songs.map(s => s.id)) + 1;
        } else {
            this.nextId = 1;
        }
    }

    // Set songs (used for real-time sync from Firebase)
    setSongs(songs, skipSave = false) {
        this.songs = this.normalizeSongs(songs);
        this.updateNextId();
        if (!skipSave) {
            // Fire and forget - don't await to avoid blocking
            this.saveSongs().catch(err => console.error('Error saving songs:', err));
        }
    }

    async saveSongs() {
        // Always cache to localStorage first (fast, local)
        this.cacheSongs();

        // Then save to Firebase in background (only if authenticated)
        if (this.firebaseManager && this.firebaseManager.isAuthenticated()) {
            try {
                const userId = this.firebaseManager.getCurrentUser().uid;
                // Save to Firebase (this will trigger real-time sync on other devices)
                await this.firebaseManager.saveSongs(userId, this.songs);
            } catch (error) {
                console.error('Error saving songs to Firebase:', error);
                // Data is already cached, so app continues to work offline
            }
        }
    }

    async deleteAllSongs() {
        this.songs = [];
        this.nextId = 1;
        await this.saveSongs();
    }

    async addSong(song) {
        const newSong = {
            id: this.nextId++,
            artist: song.artist || '',
            title: song.title || '',
            verse: song.verse || '',
            chorus: song.chorus || '',
            preChorus: song.preChorus || '',
            bridge: song.bridge || '',
            favorite: song.favorite || false,
            youtubeUrl: song.youtubeUrl || '',
            externalUrl: song.externalUrl || '',
            key: song.key || '',
            verseCue: song.verseCue || '',
            preChorusCue: song.preChorusCue || '',
            chorusCue: song.chorusCue || '',
            bridgeCue: song.bridgeCue || ''
        };
        this.songs.push(newSong);
        await this.saveSongs();
        return newSong;
    }

    async toggleFavorite(id) {
        const song = this.songs.find(s => s.id === id);
        if (song) {
            song.favorite = !song.favorite;
            await this.saveSongs();
            return song;
        }
        return null;
    }

    getAllSongs() {
        return this.songs;
    }

    getFilteredSongs(filter) {
        if (filter === 'favorites') {
            return this.songs.filter(song => song.favorite === true);
        }
        return this.songs;
    }

    async importSongs(importedSongs, replace = true) {
        // Validate and normalize imported songs
        const normalizedSongs = importedSongs.map(song => ({
            id: song.id || this.nextId++,
            artist: song.artist || '',
            title: song.title || '',
            verse: song.verse || '',
            chorus: song.chorus || '',
            preChorus: song.preChorus || '',
            bridge: song.bridge || '',
            favorite: song.favorite || false,
            youtubeUrl: song.youtubeUrl || '',
            externalUrl: song.externalUrl || '',
            key: song.key || ''
        }));

        // Update nextId to avoid conflicts
        if (normalizedSongs.length > 0) {
            const maxId = Math.max(...normalizedSongs.map(s => s.id));
            this.nextId = Math.max(this.nextId, maxId + 1);
        }

        if (replace) {
            // Replace all songs
            this.songs = normalizedSongs;
        } else {
            // Add songs, checking for duplicates
            const existingSongs = this.songs;
            const newSongs = [];
            const duplicates = [];

            normalizedSongs.forEach(importedSong => {
                // Check if song already exists (case-insensitive comparison of artist + title)
                const normalizedArtist = (importedSong.artist || '').trim().toLowerCase();
                const normalizedTitle = (importedSong.title || '').trim().toLowerCase();

                const isDuplicate = existingSongs.some(existingSong => {
                    const existingArtist = (existingSong.artist || '').trim().toLowerCase();
                    const existingTitle = (existingSong.title || '').trim().toLowerCase();
                    return existingArtist === normalizedArtist && existingTitle === normalizedTitle;
                });

                if (isDuplicate) {
                    duplicates.push(`${importedSong.artist} - ${importedSong.title}`);
                } else {
                    newSongs.push(importedSong);
                }
            });

            // Add new songs
            this.songs = [...existingSongs, ...newSongs];

            // Return info about duplicates
            return {
                added: newSongs.length,
                duplicates: duplicates.length,
                duplicateSongs: duplicates
            };
        }

        await this.saveSongs();
        return {
            added: normalizedSongs.length,
            duplicates: 0,
            duplicateSongs: []
        };
    }

    async updateSong(id, updates) {
        const song = this.songs.find(s => s.id === id);
        if (song) {
            Object.assign(song, updates);
            await this.saveSongs();
            return song;
        }
        return null;
    }

    async deleteSong(id) {
        const index = this.songs.findIndex(s => s.id === id);
        if (index !== -1) {
            this.songs.splice(index, 1);
            await this.saveSongs();
            return true;
        }
        return false;
    }

    // Enable real-time sync from Firebase
    enableSync(userId) {
        if (!this.firebaseManager || this.syncEnabled) {
            return;
        }

        this.syncEnabled = true;
        this.firebaseManager.onSongsChange(userId, (songs) => {
            // Only update if data actually changed (avoid unnecessary UI updates)
            const newSongs = this.normalizeSongs(songs);
            const currentSongsStr = JSON.stringify(this.songs);
            const newSongsStr = JSON.stringify(newSongs);

            if (currentSongsStr !== newSongsStr) {
                // Update songs without triggering save (to avoid infinite loop)
                this.setSongs(songs, true);
                // Update cache
                this.cacheSongs();
                // Notify listeners
                if (this.onSongsChanged) {
                    this.onSongsChanged();
                }
            }
        });
    }

    // Disable real-time sync
    disableSync() {
        if (this.firebaseManager && this.syncEnabled) {
            const userId = this.firebaseManager.getCurrentUser()?.uid;
            if (userId) {
                this.firebaseManager.removeSongsListener(userId);
            }
            this.syncEnabled = false;
        }
    }

    getAllSongs() {
        return this.songs;
    }

    getSongById(id) {
        return this.songs.find(s => s.id === id);
    }
}

