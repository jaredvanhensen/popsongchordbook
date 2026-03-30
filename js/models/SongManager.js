// SongManager - Data management met Firebase en localStorage fallback
class SongManager {
    constructor(firebaseManager = null) {
        this.storageKey = 'popsongChordBook';
        this.firebaseManager = firebaseManager;
        this.songs = [];
        this.nextId = 1;
        this.syncEnabled = false;
        this.onSongsChanged = null; // Callback for when songs change externally
        this.publicSongs = []; // Cache for public songs
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
            // Load both private and public songs in one sync pass
            const [privateSongsRaw, publicSongsRaw] = await Promise.all([
                this.firebaseManager.loadSongs(userId),
                this.firebaseManager.loadPublicSongs()
            ]);
            const normalizedPrivate = this.normalizeSongs(privateSongsRaw);
            const normalizedPublic = this.normalizeSongs(publicSongsRaw);

            // SAFETY CHECK: If server has 0 private songs but we have local private songs, 
            // assume server save failed previously and PROTECT local data.
            const localPrivate = this.songs.filter(s => !s.isPublic);
            if (normalizedPrivate.length === 0 && localPrivate.length > 0) {
                console.warn(`Sync: Server has 0 private songs, Local has ${localPrivate.length}. Protecting local data and re-uploading.`);
                await this.saveSongs();
                // Still merge in public songs after upload
            }

            // Merge: private first, public after (no duplicates)
            this.publicSongs = normalizedPublic;
            const publicIds = new Set(normalizedPublic.map(s => String(s.id)));
            const privateOnly = normalizedPrivate.filter(s => !publicIds.has(String(s.id)));
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
            practiceCount: (song.practiceCount !== undefined && song.practiceCount !== null) ? song.practiceCount.toString() : (song.practiceCountTeller || '0'),
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
            id: song.id || (Date.now().toString() + Math.random().toString(36).substr(2, 5)), // Better ID for public collision prevention
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
        const normalizedSongs = importedSongs.map(song => ({
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
            id: song.id || this.nextId++,
            dateAdded: song.dateAdded || new Date().toISOString(),
            // Fallback for legacy 'lyrics' field to 'fullLyrics'
            fullLyrics: song.fullLyrics || song.lyrics || ''
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
        console.log('SongManager: Updating song', id, 'with updates:', updates);
        const song = this.songs.find(s => s.id === id);
        if (song) {
            // Permission check for public songs
            if (song.isPublic && this.firebaseManager) {
                const userId = this.firebaseManager.getCurrentUser().uid;
                const isAdmin = this.firebaseManager.isAdmin(userId);
                const isSubmitter = song.submittedBy === userId;

                if (!isAdmin && !isSubmitter) {
                    console.error('SongManager: Permission denied for editing public song.');
                    return null;
                }
            }

            // Safety check: Prevent overwriting legacy lyrics with empty fullLyrics string
            // unless we explicitly want to clear both.
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

            console.log('SongManager: Song object after update:', song);
            
            // Save to correct location
            if (song.isPublic && this.firebaseManager) {
                await this.firebaseManager.savePublicSong(song);
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

            // If it's a public song, also remove from the shared Firebase node
            if (song.isPublic && this.firebaseManager) {
                // Only allow deletion by owner or admin
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

    // Enable real-time sync from Firebase
    enableSync(userId) {
        if (!this.firebaseManager || this.syncEnabled) {
            return;
        }

        this.syncEnabled = true;
        this.firebaseManager.onSongsChange(userId, (songs) => {
            // Merge incoming private songs with existing public songs
            const newPrivateSongs = this.normalizeSongs(songs);
            const existingPublic = this.songs.filter(s => s.isPublic);
            const publicIds = new Set(existingPublic.map(s => String(s.id)));
            const privateOnly = newPrivateSongs.filter(s => !publicIds.has(String(s.id)));
            const mergedSongs = [...privateOnly, ...existingPublic];

            const currentSongsStr = JSON.stringify(this.songs);
            const newSongsStr = JSON.stringify(mergedSongs);

            if (currentSongsStr !== newSongsStr) {
                // Update songs without triggering save (to avoid infinite loop)
                this.songs = mergedSongs;
                this.updateNextId();
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

    getSongById(id) {
        return this.songs.find(s => String(s.id) === String(id));
    }

    canEditPublicSong(song) {
        if (!song || !song.isPublic) return true;
        if (!this.firebaseManager || !this.firebaseManager.isAuthenticated()) return false;

        const userId = this.firebaseManager.getCurrentUser().uid;
        const isAdmin = this.firebaseManager.isAdmin(userId);
        const isSubmitter = song.submittedBy === userId;

        return isAdmin || isSubmitter;
    }
}

