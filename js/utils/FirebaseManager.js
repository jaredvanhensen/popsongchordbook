// FirebaseManager - Firebase Authentication and Realtime Database management
class FirebaseManager {
    constructor() {
        this.app = null;
        this.auth = null;
        this.database = null;
        this.currentUser = null;
        this.songsListeners = new Map();
        this.setlistsListeners = new Map();
        this.pendingSongsListeners = new Map();
        this.initialized = false;
    }

    // Initialize Firebase
    async initialize() {
        if (this.initialized) {
            return;
        }

        try {
            // Check if Firebase is loaded
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK is not loaded. Make sure Firebase scripts are included in index.html');
            }

            // Check if config exists
            if (typeof firebaseConfig === 'undefined') {
                throw new Error('Firebase config is not loaded. Make sure firebase-config.js is included in index.html');
            }

            // Initialize Firebase
            this.app = firebase.initializeApp(firebaseConfig);
            this.auth = firebase.auth();
            this.database = firebase.database();
            this.initialized = true;

            // Initialize App Check (if available and configured)
            // Skip App Check on localhost as reCAPTCHA domains need to be registered
            const isLocalhost = window.location.hostname === 'localhost' || 
                               window.location.hostname === '127.0.0.1' ||
                               window.location.hostname === '';
            
            if (!isLocalhost && typeof firebase.appCheck !== 'undefined' && typeof recaptchaSiteKey !== 'undefined' && recaptchaSiteKey !== 'JOUW_RECAPTCHA_SITE_KEY') {
                try {
                    const appCheck = firebase.appCheck();
                    // Activate App Check with reCAPTCHA v3
                    // Second parameter (true) enables automatic token refresh
                    appCheck.activate(recaptchaSiteKey, true);
                    console.log('App Check initialized with reCAPTCHA v3');
                } catch (error) {
                    console.warn('App Check initialization failed:', error);
                    // Don't fail Firebase initialization if App Check fails
                }
            } else {
                if (isLocalhost) {
                    console.log('App Check skipped on localhost (reCAPTCHA requires registered domains)');
                } else if (typeof firebase.appCheck === 'undefined') {
                    console.warn('Firebase App Check SDK not loaded. Make sure firebase-app-check-compat.js is included.');
                } else if (typeof recaptchaSiteKey === 'undefined' || recaptchaSiteKey === 'JOUW_RECAPTCHA_SITE_KEY') {
                    console.warn('reCAPTCHA site key not configured. App Check will not be active.');
                }
            }

            // Set auth persistence to LOCAL (default, but explicit for clarity)
            // This ensures the user stays logged in after page refresh
            this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
                .catch((error) => {
                    console.error('Error setting auth persistence:', error);
                });

            // Set up auth state listener
            this.auth.onAuthStateChanged((user) => {
                this.currentUser = user;
            });

            return true;
        } catch (error) {
            console.error('Firebase initialization error:', error);
            throw error;
        }
    }

    // Authentication Methods

    async signUp(email, password, username = null) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            this.currentUser = userCredential.user;
            
            // Set display name if provided
            if (username && this.currentUser) {
                await this.currentUser.updateProfile({
                    displayName: username
                });
                // Reload user to get updated profile
                await this.currentUser.reload();
                this.currentUser = this.auth.currentUser;
            }

            // Store email in database for email lookup
            if (this.currentUser && this.currentUser.uid) {
                try {
                    const normalizedEmail = email.toLowerCase().trim();
                    const userRef = this.database.ref(`users/${this.currentUser.uid}`);
                    await userRef.update({
                        email: normalizedEmail
                    });
                    
                    // Create email index for user lookup
                    await this.ensureEmailIndex(this.currentUser.uid, email);
                } catch (error) {
                    console.error('Error storing email in database:', error);
                    // Don't fail signup if this fails
                }
            }

            return {
                success: true,
                user: this.currentUser
            };
        } catch (error) {
            console.error('Sign up error:', error);
            return {
                success: false,
                error: this.getAuthErrorMessage(error.code)
            };
        }
    }

    async signIn(email, password) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            this.currentUser = userCredential.user;
            
            // Ensure email is stored in database for email lookup
            if (this.currentUser && this.currentUser.uid) {
                try {
                    const normalizedEmail = email.toLowerCase().trim();
                    const userRef = this.database.ref(`users/${this.currentUser.uid}`);
                    const userSnapshot = await userRef.once('value');
                    const userData = userSnapshot.val();
                    
                    // Only update if email is not already stored
                    if (!userData || !userData.email) {
                        await userRef.update({
                            email: normalizedEmail
                        });
                    } else if (userData.email !== normalizedEmail) {
                        // Update if email changed
                        await userRef.update({
                            email: normalizedEmail
                        });
                    }
                    
                    // Always ensure email index exists (for existing users too)
                    await this.ensureEmailIndex(this.currentUser.uid, email);
                } catch (error) {
                    console.error('Error storing email in database:', error);
                    // Don't fail signin if this fails
                }
            }
            
            return {
                success: true,
                user: userCredential.user
            };
        } catch (error) {
            console.error('Sign in error:', error);
            return {
                success: false,
                error: this.getAuthErrorMessage(error.code)
            };
        }
    }

    async signOut() {
        if (!this.initialized) {
            return { success: false, error: 'Firebase not initialized' };
        }

        try {
            // Remove all listeners FIRST, before signing out
            // In Firebase compat mode, .on() returns a function that you call to unsubscribe
            this.songsListeners.forEach((listener, userId) => {
                try {
                    if (typeof listener === 'function') {
                        listener(); // Call the unsubscribe function
                    } else if (listener && typeof listener.off === 'function') {
                        listener.off(); // Fallback for object with .off() method
                    }
                } catch (error) {
                    console.error('Error removing songs listener:', error);
                }
            });
            this.setlistsListeners.forEach((listener, userId) => {
                try {
                    if (typeof listener === 'function') {
                        listener(); // Call the unsubscribe function
                    } else if (listener && typeof listener.off === 'function') {
                        listener.off(); // Fallback for object with .off() method
                    }
                } catch (error) {
                    console.error('Error removing setlists listener:', error);
                }
            });
            this.songsListeners.clear();
            this.setlistsListeners.clear();
            this.pendingSongsListeners.forEach((listener, userId) => {
                try {
                    if (typeof listener === 'function') {
                        listener();
                    } else if (listener && typeof listener.off === 'function') {
                        listener.off();
                    }
                } catch (error) {
                    console.error('Error removing pending songs listener:', error);
                }
            });
            this.pendingSongsListeners.clear();

            // Small delay to ensure listeners are fully removed
            await new Promise(resolve => setTimeout(resolve, 100));

            await this.auth.signOut();
            this.currentUser = null;
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async updateUsername(newUsername) {
        if (!this.initialized) {
            return { success: false, error: 'Firebase not initialized' };
        }

        if (!this.currentUser) {
            return { success: false, error: 'Geen gebruiker ingelogd' };
        }

        try {
            await this.currentUser.updateProfile({
                displayName: newUsername
            });
            // Reload user to get updated profile
            await this.currentUser.reload();
            this.currentUser = this.auth.currentUser;
            return { success: true, user: this.currentUser };
        } catch (error) {
            console.error('Update username error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async changePassword(newPassword) {
        if (!this.initialized) {
            return { success: false, error: 'Firebase not initialized' };
        }

        if (!this.currentUser) {
            return { success: false, error: 'Geen gebruiker ingelogd' };
        }

        try {
            await this.currentUser.updatePassword(newPassword);
            return { success: true };
        } catch (error) {
            console.error('Change password error:', error);
            return {
                success: false,
                error: this.getAuthErrorMessage(error.code) || error.message
            };
        }
    }

    onAuthStateChanged(callback) {
        if (!this.initialized) {
            this.initialize().then(() => {
                this.auth.onAuthStateChanged(callback);
            });
        } else {
            this.auth.onAuthStateChanged(callback);
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Database Methods

    async saveSongs(userId, songs) {
        if (!this.initialized || !userId) {
            throw new Error('Firebase not initialized or user not authenticated');
        }

        try {
            const songsRef = this.database.ref(`users/${userId}/songs`);
            const songsObject = {};
            
            songs.forEach(song => {
                songsObject[song.id] = song;
            });

            await songsRef.set(songsObject);
            return { success: true };
        } catch (error) {
            console.error('Save songs error:', error);
            throw error;
        }
    }

    async loadSongs(userId) {
        if (!this.initialized || !userId) {
            throw new Error('Firebase not initialized or user not authenticated');
        }

        try {
            const songsRef = this.database.ref(`users/${userId}/songs`);
            const snapshot = await songsRef.once('value');
            const songsData = snapshot.val();
            
            if (!songsData) {
                return [];
            }

            // Convert object to array
            return Object.values(songsData);
        } catch (error) {
            console.error('Load songs error:', error);
            throw error;
        }
    }

    async saveSetlists(userId, setlists) {
        if (!this.initialized || !userId) {
            throw new Error('Firebase not initialized or user not authenticated');
        }

        try {
            const setlistsRef = this.database.ref(`users/${userId}/setlists`);
            const setlistsObject = {};
            
            setlists.forEach(setlist => {
                setlistsObject[setlist.id] = setlist;
            });

            await setlistsRef.set(setlistsObject);
            return { success: true };
        } catch (error) {
            console.error('Save setlists error:', error);
            throw error;
        }
    }

    async loadSetlists(userId) {
        if (!this.initialized || !userId) {
            throw new Error('Firebase not initialized or user not authenticated');
        }

        try {
            const setlistsRef = this.database.ref(`users/${userId}/setlists`);
            const snapshot = await setlistsRef.once('value');
            const setlistsData = snapshot.val();
            
            if (!setlistsData) {
                return [];
            }

            // Convert object to array
            return Object.values(setlistsData);
        } catch (error) {
            console.error('Load setlists error:', error);
            throw error;
        }
    }

    // Real-time Listeners

    onSongsChange(userId, callback) {
        if (!this.initialized || !userId) {
            throw new Error('Firebase not initialized or user not authenticated');
        }

        // Remove existing listener if any
        if (this.songsListeners.has(userId)) {
            const oldListener = this.songsListeners.get(userId);
            if (typeof oldListener === 'function') {
                oldListener(); // Call the unsubscribe function
            } else if (oldListener && typeof oldListener.off === 'function') {
                oldListener.off(); // Fallback for object with .off() method
            }
        }

        const songsRef = this.database.ref(`users/${userId}/songs`);
        const listener = songsRef.on('value', (snapshot) => {
            // Check if snapshot exists and database is still initialized
            if (!snapshot || !this.initialized || !this.database) {
                return;
            }
            try {
                const songsData = snapshot.val();
                const songs = songsData ? Object.values(songsData) : [];
                callback(songs);
            } catch (error) {
                console.error('Error in songs listener callback:', error);
            }
        });

        this.songsListeners.set(userId, listener);
    }

    onSetlistsChange(userId, callback) {
        if (!this.initialized || !userId) {
            throw new Error('Firebase not initialized or user not authenticated');
        }

        // Remove existing listener if any
        if (this.setlistsListeners.has(userId)) {
            const oldListener = this.setlistsListeners.get(userId);
            if (typeof oldListener === 'function') {
                oldListener(); // Call the unsubscribe function
            } else if (oldListener && typeof oldListener.off === 'function') {
                oldListener.off(); // Fallback for object with .off() method
            }
        }

        const setlistsRef = this.database.ref(`users/${userId}/setlists`);
        const listener = setlistsRef.on('value', (snapshot) => {
            // Check if snapshot exists and database is still initialized
            if (!snapshot || !this.initialized || !this.database) {
                return;
            }
            try {
                const setlistsData = snapshot.val();
                const setlists = setlistsData ? Object.values(setlistsData) : [];
                callback(setlists);
            } catch (error) {
                console.error('Error in setlists listener callback:', error);
            }
        });

        this.setlistsListeners.set(userId, listener);
    }

    removeSongsListener(userId) {
        if (this.songsListeners.has(userId)) {
            const listener = this.songsListeners.get(userId);
            if (typeof listener === 'function') {
                listener(); // Call the unsubscribe function
            } else if (listener && typeof listener.off === 'function') {
                listener.off(); // Fallback for object with .off() method
            }
            this.songsListeners.delete(userId);
        }
    }

    removeSetlistsListener(userId) {
        if (this.setlistsListeners.has(userId)) {
            const listener = this.setlistsListeners.get(userId);
            if (typeof listener === 'function') {
                listener(); // Call the unsubscribe function
            } else if (listener && typeof listener.off === 'function') {
                listener.off(); // Fallback for object with .off() method
            }
            this.setlistsListeners.delete(userId);
        }
    }

    // Pending Songs Methods

    async ensureEmailIndex(userId, email) {
        if (!this.initialized || !userId || !email) {
            return;
        }

        try {
            const normalizedEmail = email.toLowerCase().trim().replace(/\./g, '_');
            const emailIndexRef = this.database.ref(`emailToUserId/${normalizedEmail}`);
            const snapshot = await emailIndexRef.once('value');
            
            // Only create if it doesn't exist or points to different user
            const existingUserId = snapshot.val();
            if (!existingUserId || existingUserId !== userId) {
                await emailIndexRef.set(userId);
                console.log('Email index created/updated for user:', email);
            }
        } catch (error) {
            console.error('Error ensuring email index:', error);
            // Don't throw - this is not critical
        }
    }

    async getUserByEmail(email) {
        if (!this.initialized) {
            throw new Error('Firebase not initialized');
        }

        try {
            // Use email index for fast lookup
            // Replace dots with underscores in email for Firebase key compatibility
            const normalizedEmail = email.toLowerCase().trim().replace(/\./g, '_');
            const emailIndexRef = this.database.ref(`emailToUserId/${normalizedEmail}`);
            const snapshot = await emailIndexRef.once('value');
            
            const userId = snapshot.val();
            if (userId) {
                return userId;
            }
            
            // Fallback: try to find user by reading their own data if they're logged in
            // This only works if the user we're looking for is the current user
            const currentUser = this.getCurrentUser();
            if (currentUser && currentUser.email && currentUser.email.toLowerCase().trim() === email.toLowerCase().trim()) {
                return currentUser.uid;
            }
            
            return null;
        } catch (error) {
            console.error('Get user by email error:', error);
            // Provide helpful error message for permission issues
            if (error.code === 'PERMISSION_DENIED' || error.message?.includes('permission')) {
                throw new Error('Firebase security rules niet correct geconfigureerd. Zie FIREBASE_SECURITY_RULES.md voor instructies.');
            }
            throw error;
        }
    }

    async savePendingSongs(recipientUserId, songs, senderEmail) {
        if (!this.initialized || !recipientUserId) {
            throw new Error('Firebase not initialized or recipient not specified');
        }

        try {
            const pendingRef = this.database.ref(`users/${recipientUserId}/pendingSongs`);
            const pendingObject = {};
            
            songs.forEach(song => {
                const pendingId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                pendingObject[pendingId] = {
                    song: song,
                    senderEmail: senderEmail,
                    timestamp: new Date().toISOString()
                };
            });

            // Use update to merge with existing pending songs
            await pendingRef.update(pendingObject);
            return { success: true };
        } catch (error) {
            console.error('Save pending songs error:', error);
            throw error;
        }
    }

    async loadPendingSongs(userId) {
        if (!this.initialized || !userId) {
            throw new Error('Firebase not initialized or user not authenticated');
        }

        try {
            const pendingRef = this.database.ref(`users/${userId}/pendingSongs`);
            const snapshot = await pendingRef.once('value');
            const pendingData = snapshot.val();
            
            if (!pendingData) {
                return [];
            }

            // Convert object to array with pendingId
            return Object.entries(pendingData).map(([pendingId, data]) => ({
                pendingId: pendingId,
                song: data.song,
                senderEmail: data.senderEmail || '',
                timestamp: data.timestamp || new Date().toISOString()
            }));
        } catch (error) {
            console.error('Load pending songs error:', error);
            throw error;
        }
    }

    async acceptPendingSongs(userId, pendingIds) {
        if (!this.initialized || !userId) {
            throw new Error('Firebase not initialized or user not authenticated');
        }

        try {
            // Load pending songs
            const pendingSongs = await this.loadPendingSongs(userId);
            
            // Filter to only the ones we want to accept
            const songsToAccept = pendingSongs.filter(p => pendingIds.includes(p.pendingId));
            
            if (songsToAccept.length === 0) {
                return { success: false, error: 'No songs to accept' };
            }

            // Load existing songs
            const existingSongs = await this.loadSongs(userId);
            
            // Generate new IDs for accepted songs and add them
            const newSongs = songsToAccept.map(pending => {
                const song = { ...pending.song };
                // Generate new ID
                song.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                return song;
            });

            // Merge with existing songs
            const allSongs = [...existingSongs, ...newSongs];
            
            // Save updated songs
            await this.saveSongs(userId, allSongs);
            
            // Delete accepted pending songs
            await this.deletePendingSongs(userId, pendingIds);
            
            return { success: true, acceptedCount: newSongs.length };
        } catch (error) {
            console.error('Accept pending songs error:', error);
            throw error;
        }
    }

    async deletePendingSongs(userId, pendingIds) {
        if (!this.initialized || !userId) {
            throw new Error('Firebase not initialized or user not authenticated');
        }

        try {
            const pendingRef = this.database.ref(`users/${userId}/pendingSongs`);
            const updates = {};
            
            pendingIds.forEach(id => {
                updates[id] = null; // Set to null to delete
            });

            await pendingRef.update(updates);
            return { success: true };
        } catch (error) {
            console.error('Delete pending songs error:', error);
            throw error;
        }
    }

    async getPendingSongsCount(userId) {
        if (!this.initialized || !userId) {
            return 0;
        }

        try {
            const pendingSongs = await this.loadPendingSongs(userId);
            return pendingSongs.length;
        } catch (error) {
            console.error('Get pending songs count error:', error);
            return 0;
        }
    }

    onPendingSongsChange(userId, callback) {
        if (!this.initialized || !userId) {
            throw new Error('Firebase not initialized or user not authenticated');
        }

        // Remove existing listener if any
        if (this.pendingSongsListeners.has(userId)) {
            const oldListener = this.pendingSongsListeners.get(userId);
            if (typeof oldListener === 'function') {
                oldListener();
            } else if (oldListener && typeof oldListener.off === 'function') {
                oldListener.off();
            }
        }

        const pendingRef = this.database.ref(`users/${userId}/pendingSongs`);
        const listener = pendingRef.on('value', (snapshot) => {
            if (!snapshot || !this.initialized || !this.database) {
                return;
            }
            try {
                const pendingData = snapshot.val();
                const pendingSongs = pendingData ? Object.entries(pendingData).map(([pendingId, data]) => ({
                    pendingId: pendingId,
                    song: data.song,
                    senderEmail: data.senderEmail || '',
                    timestamp: data.timestamp || new Date().toISOString()
                })) : [];
                callback(pendingSongs);
            } catch (error) {
                console.error('Error in pending songs listener callback:', error);
            }
        });

        this.pendingSongsListeners.set(userId, listener);
    }

    removePendingSongsListener(userId) {
        if (this.pendingSongsListeners.has(userId)) {
            const listener = this.pendingSongsListeners.get(userId);
            if (typeof listener === 'function') {
                listener();
            } else if (listener && typeof listener.off === 'function') {
                listener.off();
            }
            this.pendingSongsListeners.delete(userId);
        }
    }

    // Migration

    async migrateLocalDataToFirebase(userId, songs, setlists) {
        if (!this.initialized || !userId) {
            throw new Error('Firebase not initialized or user not authenticated');
        }

        try {
            // Check if Firebase already has data
            const existingSongs = await this.loadSongs(userId);
            const existingSetlists = await this.loadSetlists(userId);

            if (existingSongs.length > 0 || existingSetlists.length > 0) {
                // Merge: combine local and remote data
                const mergedSongs = [...existingSongs];
                const mergedSetlists = [...existingSetlists];

                // Add local songs that don't exist remotely
                songs.forEach(localSong => {
                    const exists = existingSongs.some(remoteSong => 
                        remoteSong.id === localSong.id ||
                        (remoteSong.artist === localSong.artist && remoteSong.title === localSong.title)
                    );
                    if (!exists) {
                        mergedSongs.push(localSong);
                    }
                });

                // Add local setlists that don't exist remotely
                setlists.forEach(localSetlist => {
                    const exists = existingSetlists.some(remoteSetlist => 
                        remoteSetlist.id === localSetlist.id ||
                        remoteSetlist.name === localSetlist.name
                    );
                    if (!exists) {
                        mergedSetlists.push(localSetlist);
                    }
                });

                await this.saveSongs(userId, mergedSongs);
                await this.saveSetlists(userId, mergedSetlists);

                return {
                    success: true,
                    merged: true,
                    songsAdded: mergedSongs.length - existingSongs.length,
                    setlistsAdded: mergedSetlists.length - existingSetlists.length
                };
            } else {
                // No existing data, just save local data
                await this.saveSongs(userId, songs);
                await this.saveSetlists(userId, setlists);

                return {
                    success: true,
                    merged: false,
                    songsAdded: songs.length,
                    setlistsAdded: setlists.length
                };
            }
        } catch (error) {
            console.error('Migration error:', error);
            throw error;
        }
    }

    // Helper Methods

    getAuthErrorMessage(errorCode) {
        const errorMessages = {
            'auth/email-already-in-use': 'Dit e-mailadres is al in gebruik.',
            'auth/invalid-email': 'Ongeldig e-mailadres.',
            'auth/operation-not-allowed': 'Deze operatie is niet toegestaan.',
            'auth/weak-password': 'Wachtwoord is te zwak. Gebruik minimaal 6 karakters.',
            'auth/user-disabled': 'Dit account is uitgeschakeld.',
            'auth/user-not-found': 'Geen account gevonden met dit e-mailadres.',
            'auth/wrong-password': 'Onjuist wachtwoord.',
            'auth/too-many-requests': 'Te veel mislukte pogingen. Probeer later opnieuw.',
            'auth/network-request-failed': 'Netwerkfout. Controleer je internetverbinding.',
            'auth/requires-recent-login': 'Voor deze actie moet je recent zijn ingelogd. Log uit en log opnieuw in.'
        };

        return errorMessages[errorCode] || `Fout: ${errorCode}`;
    }
}

