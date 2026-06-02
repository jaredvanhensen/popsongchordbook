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
        this.publicSongsListeners = new Map();
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
            // DISABLED TEMPORARILY due to connection issues
            const isLocalhost = true; // FORCE SKIP APP CHECK

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
                if (user && user.uid) {
                    this.updateLastLogin(user.uid);
                }
            });

            // Set up connection state listener
            const connectedRef = this.database.ref('.info/connected');
            connectedRef.on('value', (snap) => {
                if (snap.val() === true) {
                    console.log('Firebase connected');
                    if (this.onConnectionChanged) this.onConnectionChanged(true);
                } else {
                    console.log('Firebase disconnected');
                    if (this.onConnectionChanged) this.onConnectionChanged(false);
                }
            });

            return true;
        } catch (error) {
            console.error('Firebase initialization error:', error);
            throw error;
        }
    }

    setConnectionListener(callback) {
        this.onConnectionChanged = callback;
    }

    // Authentication Methods

    async signUp(email, password, username = null, referral = null) {
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
            }

            // Write referral value to the database users/{uid}/referral immediately at signup
            if (referral && this.currentUser) {
                try {
                    await this.database.ref(`users/${this.currentUser.uid}/referral`).set(referral);
                    console.log('FirebaseManager: Referral source saved:', referral);
                } catch (dbErr) {
                    console.error('Error writing referral during sign up:', dbErr);
                }
            }

            // WE NO LONGER ADD TO DATABASE OR NOTIFY ADMIN HERE.
            // THIS WILL HAPPEN UPON FIRST SUCCESSFUL SIGN IN WITH VERIFIED EMAIL.


            // Send verification email — Firebase console template routes link to verify-email.html
            let emailSent = false;
            if (this.currentUser) {
                try {
                    await this.currentUser.sendEmailVerification();
                    console.log('Verification email sent to:', email);
                    emailSent = true;
                } catch (err) {
                    console.error('Error sending verification email:', err);
                }
            }

            // NOTE: We do NOT sign out here. The caller (AuthModal) will sign out
            // AFTER showing the verification screen, to avoid race conditions.
            return {
                success: true,
                user: { email: email },
                emailSent: emailSent
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
            // ONLY IF EMAIL IS VERIFIED
            if (this.currentUser && this.currentUser.uid && this.currentUser.emailVerified) {
                try {
                    const normalizedEmail = email.toLowerCase().trim();
                    const userRef = this.database.ref(`users/${this.currentUser.uid}`);
                    const userSnapshot = await userRef.once('value');
                    const userData = userSnapshot.val();
                    
                    const isNewDbUser = (!userData || !userData.email);

                    // PREVENT DUPLICATES: Check if this email already exists under a different UID
                    try {
                        const emailKey = normalizedEmail.replace(/\./g, '_');
                        const indexSnapshot = await this.database.ref(`emailToUserId/${emailKey}`).once('value');
                        const oldUid = indexSnapshot.val();
                        
                        if (oldUid && oldUid !== this.currentUser.uid) {
                            console.log('FirebaseManager: Found orphaned database entry during sign-in, cleaning up...', oldUid);
                            await this.database.ref(`users/${oldUid}`).remove();
                        }
                    } catch (cleanupErr) {
                        console.error('Error during duplicate cleanup:', cleanupErr);
                    }

                    // Get actual creation time from Auth metadata if available
                    let authCreationTime = null;
                    if (this.currentUser.metadata && this.currentUser.metadata.creationTime) {
                        authCreationTime = new Date(this.currentUser.metadata.creationTime).getTime();
                    }

                    // Only update if email is not already stored
                    if (isNewDbUser) {
                        await userRef.update({
                            email: normalizedEmail,
                            createdAt: userData?.createdAt || authCreationTime || firebase.database.ServerValue.TIMESTAMP,
                            preferences: {
                                isPremium: false
                            }
                        });
                        
                        // Notify Admin of new registration via Webhook (ONLY ON FIRST VERIFIED LOGIN)
                        const referral = userData?.referral || '';
                        this.notifyAdminOnSignUp(normalizedEmail, this.currentUser.displayName || null, referral);
                    } else if (userData.email !== normalizedEmail) {
                        // Update if email changed
                        await userRef.update({
                            email: normalizedEmail
                        });
                    }

                    // Ensure createdAt exists even if email was already there
                    if (userData && !userData.createdAt) {
                        await userRef.update({
                            createdAt: authCreationTime || firebase.database.ServerValue.TIMESTAMP
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

            this.publicSongsListeners.forEach((listener, listenerId) => {
                try {
                    if (typeof listener === 'function') {
                        listener();
                    } else if (listener && typeof listener.off === 'function') {
                        listener.off();
                    }
                } catch (error) {
                    console.error('Error removing public songs listener:', error);
                }
            });
            this.publicSongsListeners.clear();

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
            return { success: false, error: 'No user logged in' };
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

    async updatePhotoURL(photoURL) {
        if (!this.initialized) return { success: false, error: 'Firebase not initialized' };
        if (!this.currentUser) return { success: false, error: 'Not logged in' };

        try {
            // For external URLs (short), we can still use updateProfile
            if (photoURL && photoURL.length < 2000) {
                await this.currentUser.updateProfile({ photoURL: photoURL });
                await this.currentUser.reload();
                this.currentUser = this.auth.currentUser;
                return { success: true, user: this.currentUser };
            } else {
                // For long Data URIs, store in Realtime Database
                // We will ALSO set a flag or short marker in photoURL if possible, 
                // or just rely on the app checking the DB.
                // Let's store it in DB and set photoURL to "DB_AVATAR" so the app knows to look there?
                // improved: Just store in DB. App should check DB for custom avatar.
                const avatarRef = this.database.ref(`users/${this.currentUser.uid}/avatar`);
                await avatarRef.set(photoURL);

                // We also update the profile with a dummy or valid "marker" URL if needed,
                // but for now let's just use the DB.
                // But wait, the app.js uses user.photoURL. 
                // We should probably implement a 'getProfile' that merges auth and db data?
                // For now, let's just return success.
                return { success: true };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async uploadUserAvatar(dataUrl) {
        if (!this.initialized || !this.currentUser) return { success: false, error: 'Not authenticated' };
        try {
            const avatarRef = this.database.ref(`users/${this.currentUser.uid}/avatar`);
            await avatarRef.set(dataUrl);
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getUserAvatar(userId) {
        if (!this.initialized) return null;
        try {
            const snapshot = await this.database.ref(`users/${userId}/avatar`).once('value');
            return snapshot.val();
        } catch (e) {
            console.error("Error loading avatar:", e);
            return null;
        }
    }

    async updatePreference(key, value) {
        if (!this.initialized || !this.currentUser) return { success: false, error: 'Not authenticated' };
        try {
            const preferencesRef = this.database.ref(`users/${this.currentUser.uid}/preferences/${key}`);
            await preferencesRef.set(value);
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getPreference(key, defaultValue = null) {
        if (!this.initialized || !this.currentUser) return defaultValue;
        try {
            const snapshot = await this.database.ref(`users/${this.currentUser.uid}/preferences/${key}`).once('value');
            const val = snapshot.val();
            return val !== null ? val : defaultValue;
        } catch (e) {
            console.error(`Error loading preference ${key}:`, e);
            return defaultValue;
        }
    }

    async sendPasswordResetEmail(email) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            await this.auth.sendPasswordResetEmail(email);
            return { success: true };
        } catch (error) {
            console.error('Password reset error:', error);
            return {
                success: false,
                error: this.getAuthErrorMessage(error.code) || error.message
            };
        }
    }

    async changePassword(newPassword) {
        if (!this.initialized) {
            return { success: false, error: 'Firebase not initialized' };
        }

        if (!this.currentUser) {
            return { success: false, error: 'No user logged in' };
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
            // If not initialized, we can't get the unsubscribe function immediately sync.
            // But initialize() is usually called early. Let's return a dummy function or wait.
            this.initialize().then(() => {
                this.auth.onAuthStateChanged(callback);
            });
            return () => {}; // Dummy unsubscribe for now
        } else {
            return this.auth.onAuthStateChanged(callback);
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    async addSongRequest(userId, userEmail, artist, title) {
        if (!this.initialized) return { success: false, error: 'Firebase not initialized' };
        try {
            const requestRef = this.database.ref('songRequests').push();
            await requestRef.set({
                userId: userId,
                userEmail: userEmail,
                artist: artist,
                title: title,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            return { success: true };
        } catch (e) {
            console.error('Error adding song request:', e);
            return { success: false, error: e.message };
        }
    }

    async getSongRequests() {
        if (!this.initialized) return [];
        try {
            const snapshot = await this.database.ref('songRequests').once('value');
            const data = snapshot.val();
            if (!data) return [];
            
            // Map to include the key as 'requestId'
            return Object.entries(data).map(([key, val]) => ({
                ...val,
                requestId: key
            }));
        } catch (e) {
            console.error('Error getting song requests:', e);
            return [];
        }
    }

    async fulfillSongRequest(requestId, status = 'fulfilled') {
        if (!this.initialized || !requestId) return { success: false };
        try {
            await this.database.ref(`songRequests/${requestId}`).update({
                status: status,
                fulfillmentDate: new Date().toISOString()
            });
            return { success: true };
        } catch (e) {
            console.error('Error fulfilling song request:', e);
            return { success: false, error: e.message };
        }
    }

    async deleteSongRequest(requestId) {
        if (!this.initialized || !requestId) return { success: false };
        try {
            await this.database.ref(`songRequests/${requestId}`).remove();
            return { success: true };
        } catch (e) {
            console.error('Error deleting song request:', e);
            return { success: false, error: e.message };
        }
    }

    async addFixRequest(userId, userEmail, title, details) {
        if (!this.initialized) return { success: false, error: 'Firebase not initialized' };
        try {
            const requestRef = this.database.ref('fixRequests').push();
            await requestRef.set({
                userId: userId,
                userEmail: userEmail,
                title: title,
                details: details,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                status: 'pending'
            });
            return { success: true };
        } catch (e) {
            console.error('Error adding fix request:', e);
            return { success: false, error: e.message };
        }
    }

    async getFixRequests() {
        if (!this.initialized) return [];
        try {
            const snapshot = await this.database.ref('fixRequests').once('value');
            const data = snapshot.val();
            if (!data) return [];
            
            return Object.entries(data).map(([key, val]) => ({
                ...val,
                requestId: key
            }));
        } catch (e) {
            console.error('Error getting fix requests:', e);
            return [];
        }
    }

    async fulfillFixRequest(requestId, status = 'fulfilled') {
        if (!this.initialized || !requestId) return { success: false };
        try {
            await this.database.ref(`fixRequests/${requestId}`).update({
                status: status,
                fulfillmentDate: new Date().toISOString()
            });
            return { success: true };
        } catch (e) {
            console.error('Error fulfilling fix request:', e);
            return { success: false, error: e.message };
        }
    }

    async deleteFixRequest(requestId) {
        if (!this.initialized || !requestId) return { success: false };
        try {
            await this.database.ref(`fixRequests/${requestId}`).remove();
            return { success: true };
        } catch (e) {
            console.error('Error deleting fix request:', e);
            return { success: false, error: e.message };
        }
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

    // Public Songs Methods

    async loadPublicSongs() {
        if (!this.initialized) {
            throw new Error('Firebase not initialized');
        }

        try {
            const publicRef = this.database.ref('publicSongs');
            const snapshot = await publicRef.once('value');
            const publicData = snapshot.val();

            if (!publicData) {
                return [];
            }

            // Convert object to array
            return Object.values(publicData).map(song => ({
                ...song,
                isPublic: true // Ensure flag is set
            }));
        } catch (error) {
            console.error('Load public songs error:', error);
            return [];
        }
    }

    async savePublicSong(song) {
        if (!this.initialized) {
            throw new Error('Firebase not initialized');
        }

        try {
            const songToSave = {
                ...song,
                isPublic: true,
                lastModified: new Date().toISOString()
            };
            const publicRef = this.database.ref(`publicSongs/${song.id}`);
            await publicRef.set(songToSave);
            
            // Also ensure it's in the public setlist
            await this.ensurePublicSetlist(song.id);
            
            return { success: true };
        } catch (error) {
            console.error('Save public song error:', error);
            throw error;
        }
    }

    async ensurePublicSetlist(songId) {
        try {
            const setlistRef = this.database.ref('publicSetlist');
            const snapshot = await setlistRef.once('value');
            let publicSetlist = snapshot.val();
            
            if (!publicSetlist) {
                publicSetlist = {
                    id: 'public-setlist',
                    name: 'PUBLIC SONGS',
                    songIds: [songId],
                    isPublic: true,
                    dateCreated: new Date().toISOString()
                };
            } else {
                if (!publicSetlist.songIds) {
                    publicSetlist.songIds = [songId];
                } else if (!publicSetlist.songIds.includes(songId)) {
                    publicSetlist.songIds.push(songId);
                }
            }
            
            await setlistRef.set(publicSetlist);
        } catch (error) {
            console.error('Ensure public setlist error:', error);
        }
    }

    isAdmin(uid) {
        const user = this.auth.currentUser;
        if (!user || user.uid !== uid) return false;
        return user.email === 'jared@vanhensen.nl';
    }

    // Global App Settings
    async getGlobalSetting(key, defaultValue = null) {
        if (!this.initialized) return defaultValue;
        try {
            const snapshot = await this.database.ref(`settings/${key}`).once('value');
            const val = snapshot.val();
            return val !== null ? val : defaultValue;
        } catch (e) {
            console.error(`Error loading global setting ${key}:`, e);
            return defaultValue;
        }
    }

    async updateGlobalSetting(key, value) {
        if (!this.initialized || !this.currentUser) return { success: false, error: 'Not authenticated' };
        // Basic security check: only the admin can change global settings
        if (!this.isAdmin(this.currentUser.uid)) {
            console.error('Unauthorized global setting update attempt');
            return { success: false, error: 'Unauthorized: Admin access required' };
        }
        try {
            const settingRef = this.database.ref(`settings/${key}`);
            await settingRef.set(value);
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
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

    /**
     * Set up a real-time listener for the shared public songs.
     * @param {string} listenerId - A unique key for this listener (e.g. current user uid)
     * @param {function} callback - Callback function receiving current public songs array
     */
    onPublicSongsChange(listenerId, callback) {
        if (!this.initialized) return;

        // Remove existing listener if any
        if (this.publicSongsListeners.has(listenerId)) {
            const oldListener = this.publicSongsListeners.get(listenerId);
            if (typeof oldListener === 'function') oldListener();
        }

        const publicRef = this.database.ref('publicSongs');
        const listener = publicRef.on('value', (snapshot) => {
            if (!snapshot || !this.initialized || !this.database) return;
            try {
                const data = snapshot.val();
                const publicSongs = data ? Object.values(data) : [];
                callback(publicSongs);
            } catch (e) {
                console.error('Error in public songs listener:', e);
            }
        });

        this.publicSongsListeners.set(listenerId, listener);
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

    async updatePracticeStreak(userId) {
        if (!this.initialized || !userId) return null;

        try {
            const statsRef = this.database.ref(`users/${userId}/practiceStats`);
            const snapshot = await statsRef.once('value');
            const stats = snapshot.val() || {
                currentStreak: 0,
                longestStreak: 0,
                lastPracticeDate: null,
                totalDaysPracticed: 0
            };

            const now = new Date();
            // Get date only (midnight) for comparison
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

            let lastDate = null;
            if (stats.lastPracticeDate) {
                const d = new Date(stats.lastPracticeDate);
                lastDate = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
            }

            const oneDay = 24 * 60 * 60 * 1000;

            if (lastDate === today) {
                // Already practiced today, don't increment streak but return current stats
                return stats;
            }

            if (lastDate === today - oneDay) {
                // Practiced yesterday, increment streak
                stats.currentStreak++;
            } else {
                // Missed a day or first time
                stats.currentStreak = 1;
            }

            if (stats.currentStreak > stats.longestStreak) {
                stats.longestStreak = stats.currentStreak;
            }

            stats.lastPracticeDate = now.toISOString();
            stats.totalDaysPracticed = (stats.totalDaysPracticed || 0) + 1;

            await statsRef.set(stats);
            return stats;
        } catch (error) {
            console.error('Error updating practice streak:', error);
            return null;
        }
    }

    async getPracticeStats(userId) {
        if (!this.initialized || !userId) return null;
        try {
            const snapshot = await this.database.ref(`users/${userId}/practiceStats`).once('value');
            return snapshot.val();
        } catch (e) {
            console.error("Error getting practice stats:", e);
            return null;
        }
    }

    async saveHighScores(userId, highScores) {
        if (!this.initialized || !userId) return;
        try {
            await this.database.ref(`users/${userId}/highScores`).set(highScores);
        } catch (e) {
            console.error("Error saving high scores:", e);
        }
    }

    async getHighScores(userId) {
        if (!this.initialized || !userId) return null;
        try {
            const snapshot = await this.database.ref(`users/${userId}/highScores`).once('value');
            return snapshot.val();
        } catch (e) {
            console.error("Error getting high scores:", e);
            return null;
        }
    }

    async updateLeaderboard(modeKey, score, username) {
        if (!this.initialized || !score || !username) return;
        try {
            const leaderboardRef = this.database.ref(`leaderboards/${modeKey}`);
            
            // Check if user already has a score on THIS specific leaderboard
            // (Wait, simpler: Just add the score and then prune to top 100? No.)
            // Best way: Use the user's UID as the key so each user only has ONE entry per mode.
            const user = this.getCurrentUser();
            if (!user) return;
            
            const userEntryRef = leaderboardRef.child(user.uid);
            const snapshot = await userEntryRef.once('value');
            const currentEntry = snapshot.val();
            
            // Only update if new score is higher
            if (!currentEntry || score > currentEntry.score) {
                await userEntryRef.set({
                    username: username,
                    score: score,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (e) {
            console.error("Error updating leaderboard:", e);
        }
    }

    async getLeaderboard(modeKey) {
        if (!this.initialized) return [];
        try {
            const leaderboardRef = this.database.ref(`leaderboards/${modeKey}`);
            // Get all user entries, then sort by score descending
            const snapshot = await leaderboardRef.once('value');
            const data = snapshot.val();
            if (!data) return [];
            
            return Object.values(data)
                .sort((a, b) => b.score - a.score)
                .slice(0, 10); // Return Top 10
        } catch (e) {
            console.error("Error getting leaderboard:", e);
            return [];
        }
    }

    async getSeedingStatus(userId) {
        if (!this.initialized || !userId) return true; // Assume true for safety
        try {
            const snapshot = await this.database.ref(`users/${userId}/metadata/seedingCompleted`).once('value');
            return snapshot.val() === true;
        } catch (e) {
            console.error("Error checking seeding status:", e);
            return true;
        }
    }

    async setSeedingStatus(userId, completed = true) {
        if (!this.initialized || !userId) return;
        try {
            await this.database.ref(`users/${userId}/metadata/seedingCompleted`).set(completed);
        } catch (e) {
            console.error("Error setting seeding status:", e);
        }
    }

    // ── Public Song API ─────────────────────────────────────────────────

    /**
     * Returns true if the given uid belongs to the admin email.
     * @param {string} uid - Firebase user UID to check
     */
    isAdmin(uid) {
        if (!this.initialized || !uid) return false;
        const user = this.getCurrentUser();
        if (!user) return false;
        // Check by UID match OR by email (email is more reliable)
        const adminEmail = 'jared@vanhensen.nl';
        return user.email === adminEmail;
    }

    /**
     * Loads all public songs from the shared /publicSongs Firebase node.
     * @returns {Promise<Array>} Array of public song objects
     */
    async loadPublicSongs() {
        if (!this.initialized) return [];
        try {
            const snapshot = await this.database.ref('publicSongs').once('value');
            const data = snapshot.val();
            if (!data) return [];
            return Object.values(data);
        } catch (error) {
            console.error('Error loading public songs:', error);
            return [];
        }
    }

    /**
     * Saves (creates or updates) a single public song in /publicSongs.
     * @param {Object} song - song object with isPublic=true
     */
    async savePublicSong(song) {
        if (!this.initialized || !song || !song.id) return;
        try {
            await this.database.ref(`publicSongs/${song.id}`).set(song);
            console.log('FirebaseManager: Public song saved:', song.id);
        } catch (error) {
            console.error('Error saving public song:', error);
        }
    }

    /**
     * Deletes a public song from /publicSongs.
     * Only callable by the submitter or admin.
     * @param {string} songId
     */
    async deletePublicSong(songId) {
        if (!this.initialized || !songId) return;
        try {
            await this.database.ref(`publicSongs/${songId}`).remove();
            console.log('FirebaseManager: Public song deleted:', songId);
        } catch (error) {
            console.error('Error deleting public song:', error);
        }
    }

    // Helper Methods

    getAuthErrorMessage(errorCode) {
        const errorMessages = {
            'auth/email-already-in-use': 'This email address is already in use.',
            'auth/invalid-email': 'Invalid email address.',
            'auth/operation-not-allowed': 'This operation is not allowed.',
            'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
            'auth/user-disabled': 'This account has been disabled.',
            'auth/user-not-found': 'No account found with this email address.',
            'auth/wrong-password': 'Incorrect password.',
            'auth/invalid-credential': 'Incorrect username or password.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
            'auth/network-request-failed': 'Network error. Please check your internet connection.',
            'auth/requires-recent-login': 'This action requires a recent login. Please log out and log in again.'
        };

        return errorMessages[errorCode] || `Error: ${errorCode}`;
    }

    // ── Public Practice Counts ──────────────────────────────────────────

    /**
     * Increments the practice count for a public song for the current user.
     * These counts are stored in users/{userId}/publicPracticeCounts/{songId}
     * instead of on the public song itself (since users can't edit public songs).
     */
    async incrementPublicPracticeCount(userId, songId) {
        if (!this.initialized || !userId || !songId) return 0;
        try {
            const countRef = this.database.ref(`users/${userId}/publicPracticeCounts/${songId}`);
            const snapshot = await countRef.once('value');
            let currentCount = parseInt(snapshot.val()) || 0;
            currentCount++;
            await countRef.set(currentCount);
            return currentCount;
        } catch (error) {
            console.error('Error incrementing public practice count:', error);
            return 0;
        }
    }

    /**
     * Loads all public practice counts for the current user.
     */
    async loadPublicPracticeCounts(userId) {
        if (!this.initialized || !userId) return {};
        try {
            const snapshot = await this.database.ref(`users/${userId}/publicPracticeCounts`).once('value');
            return snapshot.val() || {};
        } catch (error) {
            console.error('Error loading public practice counts:', error);
            return {};
        }
    }

    async loadPublicFavorites(userId) {
        if (!this.initialized || !userId) return {};
        try {
            const snapshot = await this.database.ref(`users/${userId}/publicFavorites`).once('value');
            return snapshot.val() || {};
        } catch (error) {
            console.error('Error loading public favorites:', error);
            return {};
        }
    }

    async savePublicFavorite(userId, songId, isFavorite) {
        if (!this.initialized || !userId || !songId) return;
        try {
            await this.database.ref(`users/${userId}/publicFavorites/${songId}`).set(isFavorite);
        } catch (error) {
            console.error('Error saving public favorite:', error);
        }
    }

    onPublicFavoritesChange(userId, callback) {
        if (!this.initialized || !userId) return;
        const ref = this.database.ref(`users/${userId}/publicFavorites`);
        ref.on('value', (snapshot) => {
            callback(snapshot.val() || {});
        });
        return ref;
    }

    removePublicFavoritesListener(userId) {
        if (!this.initialized || !userId) return;
        this.database.ref(`users/${userId}/publicFavorites`).off();
    }

    async updateLastLogin(userId) {
        if (!this.initialized || !userId) return;
        try {
            await this.database.ref(`users/${userId}`).update({
                lastLogin: firebase.database.ServerValue.TIMESTAMP
            });
        } catch (error) {
            console.error('Error updating lastLogin:', error);
        }
    }

    async getAllUsers() {
        if (!this.initialized) return [];
        try {
            // First try to list from /users
            // This might fail if security rules are not updated yet
            const snapshot = await this.database.ref('users').once('value');
            const data = snapshot.val();
            if (!data) return [];
            
            return Object.entries(data).map(([uid, val]) => ({
                uid: uid,
                email: val.email || 'No email',
                createdAt: val.createdAt || 0,
                lastLogin: val.lastLogin || null,
                username: val.username || 'Anon',
                referral: val.referral || ''
            }));
        } catch (e) {
            console.error('Error getting all users from /users:', e);
            
            // Fallback: try to list from /emailToUserId
            try {
                const snapshot = await this.database.ref('emailToUserId').once('value');
                const data = snapshot.val();
                if (!data) return [];
                
                // data is { "email_with_underscores": "uid", ... }
                // We can at least show the emails
                return Object.entries(data).map(([email, uid]) => ({
                    uid: uid,
                    email: email.replace(/_/g, '.'),
                    createdAt: 0,
                    lastLogin: null,
                    username: 'Anon',
                    referral: ''
                }));
            } catch (e2) {
                console.error('Error getting users from fallback:', e2);
                return [];
            }
        }
    }

    async deleteUserByAdmin(uid, email) {
        if (!this.initialized || !this.currentUser) return { success: false, error: 'Not authenticated' };
        if (!this.isAdmin(this.currentUser.uid)) return { success: false, error: 'Unauthorized: Admin access required' };
        try {
            // Delete from users
            await this.database.ref(`users/${uid}`).remove();
            
            // Delete from email index
            if (email) {
                const emailKey = email.toLowerCase().trim().replace(/\./g, '_');
                await this.database.ref(`emailToUserId/${emailKey}`).remove();
            }
            return { success: true };
        } catch (error) {
            console.error('Error deleting user by admin:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Sends a notification to the admin via a Webhook (e.g., Zapier, IFTTT, or a custom server).
     * This is used to get instant alerts for new user registrations.
     * @param {string} email - The email of the new user
     * @param {string} username - The username (if provided)
     * @param {string} referral - The referral source (if provided)
     */
    async notifyAdminOnSignUp(email, username, referral = null) {
        // Webhook URL for admin notifications (Zapier)
        const WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/27461573/uvctgxo/"; 
        
        if (!WEBHOOK_URL || WEBHOOK_URL.includes("change_this")) {
            console.log("FirebaseManager: Admin notification skipped (Webhook URL not configured)");
            return;
        }

        try {
            const data = {
                event: "new_user_registration",
                email: email || "unknown",
                username: username || "Anonymous",
                referral: referral || "",
                timestamp: new Date().toISOString(),
                app: "Pop Song Chord Book"
            };

            // Using GET request with query parameters is the most robust way to send data to Zapier
            // from the browser. It avoids CORS preflight and body-parsing issues that can 
            // occur with POST requests in 'no-cors' mode.
            const params = new URLSearchParams(data);
            const finalUrl = `${WEBHOOK_URL}?${params.toString()}`;

            console.log("FirebaseManager: Sending admin notification to Zapier...", data);

            fetch(finalUrl, {
                method: 'GET',
                mode: 'no-cors'
            });
            
            console.log("FirebaseManager: Admin notification ping sent for:", email);
        } catch (error) {
            console.warn("FirebaseManager: Failed to send admin notification:", error);
        }
    }

    // --- Teacher-Student Methods ---

    async upgradeToTeacher() {
        if (!this.initialized || !this.currentUser) return { success: false, error: 'Not authenticated' };
        
        try {
            const uid = this.currentUser.uid;
            
            // Generate a random 6-character code
            const generateCode = () => {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                let result = '';
                for (let i = 0; i < 6; i++) {
                    result += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                return 'TEACHER-' + result;
            };

            const code = generateCode();

            // Store code mapped to uid
            await this.database.ref(`teacherCodes/${code}`).set(uid);

            // Update user role and code
            await this.database.ref(`users/${uid}`).update({
                role: 'teacher',
                teacherCode: code
            });

            return { success: true, teacherCode: code };
        } catch (e) {
            console.error('Error upgrading to teacher:', e);
            return { success: false, error: e.message };
        }
    }

    async connectToTeacher(teacherCode) {
        if (!this.initialized || !this.currentUser) return { success: false, error: 'Not authenticated' };
        
        try {
            const uid = this.currentUser.uid;
            const code = teacherCode.trim().toUpperCase();

            // Look up teacherUid from code
            const snapshot = await this.database.ref(`teacherCodes/${code}`).once('value');
            const teacherUid = snapshot.val();

            if (!teacherUid) {
                return { success: false, error: 'Invalid Teacher Code' };
            }

            if (teacherUid === uid) {
                return { success: false, error: 'You cannot connect to yourself' };
            }

            // Link student to teacher in the teacherStudents roster
            await this.database.ref(`teacherStudents/${teacherUid}/${uid}`).set(true);

            // Get teacher's name/email to confirm
            let teacherData = null;
            try {
                const teacherSnapshot = await this.database.ref(`users/${teacherUid}`).once('value');
                teacherData = teacherSnapshot.val();
            } catch (err) {
                console.warn('Could not read teacher profile (ignoring to allow connection):', err);
                teacherData = { email: 'Teacher' }; // Fallback to avoid breaking connection
            }
            
            if (!teacherData) {
                // If not found, revert connection
                await this.database.ref(`teacherStudents/${teacherUid}/${uid}`).remove();
                return { success: false, error: 'Teacher account not found' };
            }

            // Save teacher uid on student profile
            await this.database.ref(`users/${uid}`).update({
                connectedTeacher: teacherUid
            });

            return { 
                success: true, 
                teacherName: teacherData.email || 'Teacher' 
            };
        } catch (e) {
            console.error('Error connecting to teacher:', e);
            return { success: false, error: e.message };
        }
    }

    async getConnectedStudents() {
        if (!this.initialized || !this.currentUser) return { success: false, error: 'Not authenticated' };
        
        try {
            const uid = this.currentUser.uid;
            
            // Get roster
            const rosterSnapshot = await this.database.ref(`teacherStudents/${uid}`).once('value');
            const roster = rosterSnapshot.val();
            
            if (!roster) return { success: true, students: [] };
            
            const studentIds = Object.keys(roster);
            const students = [];

            // Fetch each student's profile
            for (const studentId of studentIds) {
                const studentSnapshot = await this.database.ref(`users/${studentId}`).once('value');
                const studentData = studentSnapshot.val();
                if (studentData) {
                    students.push({
                        uid: studentId,
                        email: studentData.email || 'Unknown',
                        role: studentData.role || 'student',
                        createdAt: studentData.createdAt || null,
                        avatar: studentData.avatar || null,
                        name: studentData.name || studentData.displayName || null
                    });
                }
            }

            return { success: true, students: students };
        } catch (e) {
            console.error('Error fetching connected students:', e);
            return { success: false, error: e.message };
        }
    }

    async getStudentProgress(studentUid) {
        if (!this.initialized || !this.currentUser) return { success: false, error: 'Not authenticated' };
        
        try {
            const teacherUid = this.currentUser.uid;
            const snapshot = await this.database.ref(`studentProgress/${teacherUid}/${studentUid}`).once('value');
            let progress = snapshot.val();
            
            const defaultGoals = [
                { id: 'goal_0', text: 'Tuning the guitar', completed: false },
                { id: 'goal_1', text: 'C Em G and D chord', completed: false },
                { id: 'goal_2', text: 'Am E Dm chords', completed: false },
                { id: 'goal_3', text: 'F and Bm small barre chord', completed: false },
                { id: 'goal_4', text: 'F and Bb chord', completed: false },
                { id: 'goal_5', text: 'Pentatonic Scale', completed: false },
                { id: 'goal_6', text: 'Play Harry Styles - Sign of the Times from start to finish', completed: false },
                { id: 'goal_7', text: "Play Bill Withers - Ain't No Sunshine from start to finish", completed: false },
                { id: 'goal_8', text: 'Play Taylor Swift - All Too Well from start to finish', completed: false },
                { id: 'goal_9', text: 'Play The Cranberries - Zombie from start to finish', completed: false },
                { id: 'goal_10', text: "Play Madcon - Don't Worry from start to finish", completed: false },
                { id: 'goal_11', text: 'C major scale', completed: false },
                { id: 'goal_12', text: 'A minor scale', completed: false },
                { id: 'goal_13', text: 'Sus2 and sus4 chords', completed: false },
                { id: 'goal_14', text: 'Seventh chords', completed: false },
                { id: 'goal_15', text: 'Naming all notes on the E and A bass strings', completed: false },
                { id: 'goal_16', text: 'Naming all notes on D and G string', completed: false },
                { id: 'goal_17', text: 'Fingerpicking 3 patterns', completed: false },
                { id: 'goal_18', text: 'Power Chords', completed: false },
                { id: 'goal_19', text: 'Blues improvisation in A', completed: false },
                { id: 'goal_20', text: 'Slide, Bends', completed: false },
                { id: 'goal_21', text: 'Tapping', completed: false },
                { id: 'goal_22', text: 'Naming all notes on all strings', completed: false },
                { id: 'goal_23', text: 'Play 6 chords in a key ( I ii iii IV V vi )', completed: false }
            ];

            if (!progress) {
                // Fetch customized default goals from database settings
                const settingsSnap = await this.database.ref(`studentProgress/${teacherUid}/settings`).once('value');
                const settings = settingsSnap.val() || {};
                const activeDefaultGoals = settings.defaultGoals || defaultGoals;

                // Initialize default progress
                progress = {
                    homework: { text: '', date: '' },
                    goals: [...activeDefaultGoals],
                    links: []
                };
                await this.database.ref(`studentProgress/${teacherUid}/${studentUid}`).set(progress);
            } else if (!progress.goals) {
                // Initialize goals if missing
                const settingsSnap = await this.database.ref(`studentProgress/${teacherUid}/settings`).once('value');
                const settings = settingsSnap.val() || {};
                const activeDefaultGoals = settings.defaultGoals || defaultGoals;

                progress.goals = [...activeDefaultGoals];
                await this.database.ref(`studentProgress/${teacherUid}/${studentUid}`).set(progress);
            }
            
            return { success: true, progress };
        } catch (e) {
            console.error('Error fetching student progress:', e);
            return { success: false, error: e.message };
        }
    }

    async updateStudentProgress(studentUid, data) {
        if (!this.initialized || !this.currentUser) return { success: false, error: 'Not authenticated' };
        
        try {
            const teacherUid = this.currentUser.uid;
            await this.database.ref(`studentProgress/${teacherUid}/${studentUid}`).set(data);
            return { success: true };
        } catch (e) {
            console.error('Error updating student progress:', e);
            return { success: false, error: e.message };
        }
    }

    async getStudentProgressAsStudent() {
        if (!this.initialized || !this.currentUser) return { success: false, error: 'Not authenticated' };
        
        try {
            const studentUid = this.currentUser.uid;
            const userSnap = await this.database.ref(`users/${studentUid}`).once('value');
            const userData = userSnap.val();
            
            if (!userData || !userData.connectedTeacher) {
                return { success: false, error: 'No connected teacher' };
            }
            
            const teacherUid = userData.connectedTeacher;
            const snapshot = await this.database.ref(`studentProgress/${teacherUid}/${studentUid}`).once('value');
            const progress = snapshot.val();
            
            return { success: true, progress, teacherUid };
        } catch (e) {
            console.error('Error fetching student progress as student:', e);
            return { success: false, error: e.message };
        }
    }
}
