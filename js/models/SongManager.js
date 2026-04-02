// SongManager - Data management met Firebase en localStorage fallback
class SongManager {
    constructor(firebaseManager = null) {
        this.baseStorageKey = 'popsongChordBook';
        this.storageKey = this.baseStorageKey; // Default
        this.firebaseManager = firebaseManager;
        this.songs = [];
        this.nextId = 1;
        this.syncEnabled = false;
        this.onSongsChanged = null; // Callback for when songs change externally
        this.publicSongs = []; // Cache for public songs
        this.userSongStats = {}; // User-specific stats (practiceCount, etc)
        this.currentUserId = null; 
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
                        // This also merges in public songs that may not be in cache
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
                const [userSongs, publicSongs] = await Promise.all([
                    this.firebaseManager.loadSongs(userId),
                    this.firebaseManager.loadPublicSongs()
                ]);

                // Store public songs separately for reference but merge for this.songs
                this.publicSongs = this.normalizeSongs(publicSongs);
                // Merge: private songs first, then public songs (no duplicates by id)
                const privateNormalized = this.normalizeSongs(userSongs);
                const publicIds = new Set(this.publicSongs.map(s => String(s.id)));
                const privateSongs = privateNormalized.filter(s => !publicIds.has(String(s.id)));
                this.songs = [...privateSongs, ...this.publicSongs];
                
                // CRITICAL: Deduplicate IDs to prevent same-id collision (e.g. ID 1 vs ID 1)
                this.deduplicateIds();
                
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
            const user = this.firebaseManager.getCurrentUser();
            if (!user) return;
            const userId = user.uid;
            
            // Load both private and public songs in one sync pass
            const [privateSongsRaw, publicSongsRaw] = await Promise.all([
                this.firebaseManager.loadSongs(userId),
                this.firebaseManager.loadPublicSongs()
            ]);
            const normalizedPrivate = this.normalizeSongs(privateSongsRaw);
            const normalizedPublic = this.normalizeSongs(publicSongsRaw);

            // Update user-specific storage key if needed
            this.updateStorageKey(userId);

            // Merge logic
            this.publicSongs = normalizedPublic;
            const publicIds = new Set(normalizedPublic.map(s => String(s.id)));
            const privateOnly = normalizedPrivate.filter(s => !publicIds.has(String(s.id)));
            
            // If server has 0 private songs, we should only trust local cache if it is specifically for THIS user.
            const localPrivate = this.songs.filter(s => !s.isPublic);
            if (normalizedPrivate.length === 0 && localPrivate.length > 0) {
                // If currentUserId matches, we can trust local data as 'not yet saved'.
                // If it doesn't match, this is cache from a PREVIOUS user and must be discarded.
                if (this.currentUserId === userId) {
                    console.log(`Sync: New account ${userId} with local data. Re-uploading.`);
                    await this.saveSongs();
                } else {
                    console.warn(`Sync: Cache belongs to different user. Discarding local data.`);
                    this.songs = [...this.publicSongs];
                }
            }

            const mergedSongs = [...privateOnly, ...normalizedPublic];

            // Only update if data is different (avoid unnecessary updates)
            const currentSongsStr = JSON.stringify(this.songs);
            const newSongsStr = JSON.stringify(mergedSongs);

            if (currentSongsStr !== newSongsStr) {
                this.songs = mergedSongs;
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
            // Default values
            artist: '',
            title: '',
            verse: '',
            chorus: '',
            preChorus: '',
            bridge: '',
            favorite: false,
            youtubeUrl: '',
            externalUrl: '',
            key: '',
            verseCue: '',
            preChorusCue: '',
            chorusCue: '',
            bridgeCue: '',
            fullLyrics: '',
            chordData: null,
            practiceCount: '0',
            patchDetails: '',
            lyricOffset: 0,
            performAbility: '',
            verseTitle: 'Block 1',
            preChorusTitle: 'Block 3',
            chorusTitle: 'Block 2',
            bridgeTitle: 'Block 4',
            songNotes: '',
            capo: 0,
            isPublic: false,
            submittedBy: '',
            // Preserve all incoming fields
            ...song,
            // Guaranteed types/migrations
            isPublic: !!song.isPublic,
            submittedBy: song.submittedBy || '',
            practiceCount: (() => {
                // User-specific stats ALWAYS win if available
                if (this.userSongStats && this.userSongStats[song.id] && this.userSongStats[song.id].practiceCount !== undefined) {
                    return String(this.userSongStats[song.id].practiceCount);
                }
                // Fallback to song's own practice count
                return (song.practiceCount !== undefined && song.practiceCount !== null) ? song.practiceCount.toString() : (song.practiceCountTeller || '0');
            })(),
            // BPM Migration: Ensure top-level 'tempo' exists if it's in chordData
            tempo: song.tempo || (song.chordData ? song.chordData.tempo : '') || '',
            // Map Migration: Ensure top-level 'customMapSections' exists if it's in chordData
            customMapSections: song.customMapSections || (song.chordData ? song.chordData.customMapSections : null) || null,
            // Proactive migration: Ensure fullLyrics is never empty if legacy lyrics exist
            fullLyrics: song.fullLyrics || song.lyrics || '',
            // Date Added Migration: Infer from ID if missing; fallback to baseline date (26-3-2026)
            dateAdded: song.dateAdded || (typeof song.id === 'string' && song.id.length >= 13 && !isNaN(song.id.substring(0, 13)) ? new Date(parseInt(song.id.substring(0, 13))).toISOString() : (typeof song.id === 'number' && song.id > 1000000000000 ? new Date(song.id).toISOString() : '2026-03-26T21:00:00.000Z'))
        }));
    }

    updateNextId() {
        if (this.songs.length > 0) {
            // Filter out string IDs that aren't numeric to avoid NaN
            const numericIds = this.songs
                .map(s => Number(s.id))
                .filter(id => !isNaN(id));
            
            if (numericIds.length > 0) {
                this.nextId = Math.max(...numericIds) + 1;
            } else {
                this.nextId = 1;
            }
        } else {
            this.nextId = 1;
        }
    }

    /**
     * Ensures all songs in the current library have unique IDs.
     * If duplicates are found, it re-assigns them.
     */
    deduplicateIds() {
        const seenIds = new Set();
        let changed = false;

        this.songs.forEach(song => {
            const sid = String(song.id);
            if (!song.id || seenIds.has(sid)) {
                // Collision detected! Generate a truly unique ID
                song.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                changed = true;
            }
            seenIds.add(String(song.id));
        });

        return changed;
    }

    /**
     * Generates a truly unique ID.
     */
    generateUniqueId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
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
                
                // Separate private and public songs for saving
                const privateSongs = this.songs.filter(s => !s.isPublic);
                const publicSongs = this.songs.filter(s => s.isPublic);

                // Save private songs to user's path
                await this.firebaseManager.saveSongs(userId, privateSongs);
                
                // For public songs, we only save the one currently being modified if it's public.
                // Normally saveSongs() saves the entire list, but for public songs we might want individual updates?
                // Actually, the current architecture saves the full list for the user.
                // We'll keep it simple for now and save all public songs back to public root if user is authorized.
                // But wait, only the submitter/admin can save a public song. 
                // This logic is better handled in updateSong/addSong specifically.
                // So saveSongs() here will only truly save PRIVATE songs to the user's path.
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
            // Default values
            artist: '',
            title: '',
            verse: '',
            chorus: '',
            preChorus: '',
            bridge: '',
            favorite: false,
            youtubeUrl: '',
            externalUrl: '',
            key: '',
            verseCue: '',
            preChorusCue: '',
            chorusCue: '',
            bridgeCue: '',
            fullLyrics: '',
            chordData: null,
            practiceCount: '0',
            patchDetails: '',
            lyricOffset: 0,
            performAbility: '',
            verseTitle: 'Block 1',
            preChorusTitle: 'Block 3',
            chorusTitle: 'Block 2',
            bridgeTitle: 'Block 4',
            songNotes: '',
            capo: 0,
            isPublic: false,
            // Preserve all incoming fields
            ...song,
            // Guaranteed fields/overrides
            id: song.id || this.generateUniqueId(), 
            dateAdded: new Date().toISOString(),
            // Support legacy field if present
            fullLyrics: song.fullLyrics || song.lyrics || '',
            submittedBy: this.firebaseManager && this.firebaseManager.isAuthenticated() ? this.firebaseManager.getCurrentUser().uid : 'anonymous'
        };
        
        this.songs.push(newSong);

        // Save to correct location
        if (newSong.isPublic && this.firebaseManager) {
            await this.firebaseManager.savePublicSong(newSong);
        }
        
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
        const normalizedSongs = importedSongs.map((song, index) => {
            // Check if this ID already exists in the manager OR in earlier songs of this import
            const existingSid = song.id ? String(song.id) : null;
            const isColliding = existingSid && (
                this.songs.some(s => String(s.id) === existingSid) || 
                importedSongs.slice(0, index).some(s => String(s.id) === existingSid)
            );

            return {
                // Default values
                artist: '',
                title: '',
                verse: '',
                chorus: '',
                preChorus: '',
                bridge: '',
                favorite: false,
                youtubeUrl: '',
                externalUrl: '',
                key: '',
                verseCue: '',
                preChorusCue: '',
                chorusCue: '',
                bridgeCue: '',
                fullLyrics: '',
                chordData: null,
                practiceCount: song.practiceCount || '0',
                patchDetails: song.patchDetails || '',
                lyricOffset: song.lyricOffset || 0,
                performAbility: song.performAbility || '',
                verseTitle: song.verseTitle || 'Block 1',
                preChorusTitle: song.preChorusTitle || 'Block 3',
                chorusTitle: song.chorusTitle || 'Block 2',
                bridgeTitle: song.bridgeTitle || 'Block 4',
                // Custom fields from importer (spread AFTER defaults to override)
                ...song,
                // Specific migrations/fixes
                // If collision or missing, generate a unique ID
                id: (song.id && !isColliding) ? song.id : this.generateUniqueId(),
                dateAdded: song.dateAdded || new Date().toISOString(),
                // Fallback for legacy 'lyrics' field to 'fullLyrics'
                fullLyrics: song.fullLyrics || song.lyrics || ''
            };
        });

        // Update nextId base
        this.updateNextId();

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

    /**
     * Resets the internal song library. Useful when switching users.
     */
    clearLibrary() {
        this.songs = [];
        this.publicSongs = [];
        this.userSongStats = {};
        this.currentUserId = null;
        this.storageKey = this.baseStorageKey;
    }

    /**
     * Updates the local storage key to be user-specific.
     * @param {string} userId - The current user's UID
     */
    updateStorageKey(userId) {
        if (userId) {
            this.storageKey = `${this.baseStorageKey}_${userId}`;
        } else {
            this.storageKey = this.baseStorageKey;
        }
    }

    /**
     * Enables real-time synchronization for songs and personal stats.
     * @param {string} userId - The current user's UID
     */
    enableSync(userId) {
        if (!this.firebaseManager || this.syncEnabled) return;
        this.syncEnabled = true;
        this.currentUserId = userId;
        this.updateStorageKey(userId);

        // Listener for private songs
        this.firebaseManager.onSongsChange(userId, (privateSongsRaw) => {
            const normalizedPrivate = this.normalizeSongs(privateSongsRaw);
            const publicIds = new Set(this.publicSongs.map(s => String(s.id)));
            const privateOnly = normalizedPrivate.filter(s => !publicIds.has(String(s.id)));
            
            this.songs = [...privateOnly, ...this.publicSongs];
            this.deduplicateIds(); 
            this.updateNextId();
            this.cacheSongs();
            if (this.onSongsChanged) this.onSongsChanged();
        });

        // Listener for public songs
        this.firebaseManager.onPublicSongsChange(userId, (publicSongsRaw) => {
            const normalizedPublic = this.normalizeSongs(publicSongsRaw);
            this.publicSongs = normalizedPublic;
            
            const publicIds = new Set(normalizedPublic.map(s => String(s.id)));
            const privateOnly = this.songs.filter(s => !s.isPublic && !publicIds.has(String(s.id)));

            this.songs = [...privateOnly, ...normalizedPublic];
            this.updateNextId();
            this.cacheSongs();
            if (this.onSongsChanged) this.onSongsChanged();
        });

        // Listener for personal song stats (practice counts)
        this.firebaseManager.onSongStatsChange(userId, (stats) => {
            this.userSongStats = stats || {};
            // Re-normalize to apply new stats to existing song objects
            this.songs = this.normalizeSongs(this.songs);
            if (this.onSongsChanged) this.onSongsChanged();
        });
    }

    /**
     * Disables real-time synchronization and cleans up listeners.
     */
    disableSync() {
        if (this.firebaseManager && this.syncEnabled) {
            if (this.currentUserId) {
                this.firebaseManager.removeSongsListener(this.currentUserId);
            }
            this.syncEnabled = false;
            this.currentUserId = null;
        }
    }

    async updateSong(id, updates) {
        console.log('SongManager: Updating song', id, 'with updates:', updates);
        const song = this.songs.find(s => String(s.id) === String(id));
        if (song) {
            // Permission check for public songs
            if (song.isPublic && this.firebaseManager) {
                const user = this.firebaseManager.getCurrentUser();
                const userId = user ? user.uid : null;
                const isAdmin = this.firebaseManager.isAdmin(userId);
                const isSubmitter = song.submittedBy === userId;

                if (!isAdmin && !isSubmitter) {
                    console.error('SongManager: Permission denied for editing public song.');
                    return null;
                }
            }

            // Safety check: Prevent overwriting legacy lyrics with empty fullLyrics string
            if (updates.fullLyrics === '' && (song.lyrics && song.lyrics.trim() !== '')) {
                console.warn('SongManager: Prevented overwriting legacy lyrics with empty fullLyrics. Using legacy fallback.');
                delete updates.fullLyrics;
            }

            Object.assign(song, updates);

            // Sync top-level fields from chordData if modified
            if (updates.chordData) {
                if (updates.chordData.tempo) song.tempo = updates.chordData.tempo;
                if (updates.chordData.customMapSections !== undefined) {
                    song.customMapSections = updates.chordData.customMapSections;
                }
            }
            
            // Save to correct location
            if (song.isPublic && this.firebaseManager) {
                await this.firebaseManager.savePublicSong(song);
                
                // Immediately update local publicSongs cache so that the private songs
                // listener (onSongsChange) doesn't momentarily lose this song during
                // the race between the two real-time listeners.
                const alreadyInPublic = this.publicSongs.some(s => String(s.id) === String(song.id));
                if (!alreadyInPublic) {
                    this.publicSongs.push(song);
                }
            }
            
            await this.saveSongs();
            return song;
        }
        console.warn('SongManager: Song not found for update', id);
        return null;
    }

    async deleteSong(id) {
        const index = this.songs.findIndex(s => String(s.id) === String(id));
        if (index !== -1) {
            const song = this.songs[index];
            this.songs.splice(index, 1);

            if (song.isPublic && this.firebaseManager) {
                if (this.canEditPublicSong(song)) {
                    await this.firebaseManager.deletePublicSong(song.id);
                } else {
                    console.warn('SongManager: Permission denied to delete public song');
                }
            }
            
            await this.saveSongs();
            return true;
        }
        return false;
    }

    getSongById(id) {
        return this.songs.find(s => String(s.id) === String(id));
    }

    canEditPublicSong(song) {
        if (!song || !song.isPublic) return true;
        if (!this.firebaseManager || !this.firebaseManager.isAuthenticated()) return false;

        const user = this.firebaseManager.getCurrentUser();
        if (!user) return false;
        
        const userId = user.uid;
        const isAdmin = this.firebaseManager.isAdmin(userId);
        const isSubmitter = song.submittedBy === userId;

        return isAdmin || isSubmitter;
    }

    async updateSongStats(songId, stats) {
        if (!this.firebaseManager || !this.firebaseManager.isAuthenticated()) return;
        const userId = this.firebaseManager.getCurrentUser().uid;
        
        // Update locally first for instant feedback (optimistic)
        if (!this.userSongStats[songId]) this.userSongStats[songId] = {};
        Object.assign(this.userSongStats[songId], stats);
        
        // Refresh local song data to reflect new stats
        this.songs = this.normalizeSongs(this.songs);
        if (this.onSongsChanged) this.onSongsChanged();
        
        // Save to Firebase
        await this.firebaseManager.saveSongStats(userId, songId, stats);
    }
}

