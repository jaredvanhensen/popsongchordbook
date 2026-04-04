// ProfileModal - Profile modal for viewing profile and changing password
class ProfileModal {
    constructor(firebaseManager, songManager, onSignOut = null, onShareSongs = null, onAcceptSongs = null) {
        this.firebaseManager = firebaseManager;
        this.songManager = songManager;
        this.onSignOut = onSignOut;
        this.onShareSongs = onShareSongs;
        this.onAcceptSongs = onAcceptSongs;
        this.modal = document.getElementById('profileModal');
        this.selectedLvl = 1; // Default to Level 1

        // Profile elements
        this.usernameInput = document.getElementById('profileUsername');
        this.updateUsernameBtn = document.getElementById('profileUpdateUsernameBtn');
        this.avatarDisplay = document.getElementById('profileAvatarDisplay');
        this.avatarPlaceholder = document.getElementById('profileAvatarPlaceholder');
        this.avatarInput = document.getElementById('profileAvatarInput');
        this.changeAvatarBtn = document.getElementById('profileChangeAvatarBtn');
        this.themeSelect = document.getElementById('profileThemeSelect');
        this.instrumentBtns = document.querySelectorAll('.profile-instrument-btn');

        // Avatar elements (Created dynamically if not present in HTML yet, or assumes HTML update)
        this.emailDisplay = document.getElementById('profileEmail');
        this.currentPasswordInput = document.getElementById('profileCurrentPassword');
        this.newPasswordInput = document.getElementById('profileNewPassword');
        this.confirmPasswordInput = document.getElementById('profileConfirmPassword');
        this.changePasswordBtn = document.getElementById('profileChangePasswordBtn');
        this.changePasswordError = document.getElementById('profileChangePasswordError');
        this.changePasswordSuccess = document.getElementById('profileChangePasswordSuccess');
        this.logoutBtn = document.getElementById('profileLogoutBtn');
        this.shareSongsBtn = document.getElementById('profileShareSongsBtn');
        this.acceptSongsBtn = document.getElementById('profileAcceptSongsBtn');
        this.reseedSongsBtn = document.getElementById('reseedSongsBtn');
        this.closeBtn = document.getElementById('profileModalClose');

        // Admin elements
        this.adminSection = document.getElementById('profileAdminSection');
        this.viewRequestsBtn = document.getElementById('profileViewRequestsBtn');
        this.requestsModal = document.getElementById('adminRequestsModal');
        this.requestsTableBody = document.getElementById('adminRequestsTableBody');
        this.requestsEmptyMsg = document.getElementById('adminRequestsEmpty');
        this.requestsCloseBtn = document.getElementById('adminRequestsModalClose');

        // Feature Toggles
        this.timelineToggle = document.getElementById('profileTimelineToggle');
        this.midiToggle = document.getElementById('profileMidiToggle');

        // Statistics elements
        this.databaseSizeDisplay = document.getElementById('profileDatabaseSize');
        this.totalPracticeDisplay = document.getElementById('profileTotalPractice');
        this.achievementsList = document.getElementById('profileAchievementsList');
        this.topSongsBody = document.getElementById('profileTopSongsBody');
        this.highScoresList = document.getElementById('chordTrainerHighScoresList');

        // Streak elements
        this.currentStreakDisplay = document.getElementById('profileCurrentStreak');
        this.longestStreakDisplay = document.getElementById('profileLongestStreak');
        this.totalDaysPracticedDisplay = document.getElementById('profileTotalDaysPracticed');
        this.streakMilestones = document.getElementById('streakMilestones');

        // Progress elements
        this.progressFill = document.getElementById('achievementProgressFill');
        this.progressText = document.getElementById('achievementProgressText');
        this.nextLevelName = document.getElementById('nextLevelName');
        this.nextLevelLvl = document.getElementById('nextLevelLvl');
        this.levelBadge = document.getElementById('profileModalLevelBadge');

        this.generalConfirmModal = document.getElementById('generalConfirmModal');

        this.awardTiers = [
            { count: 10, name: "Riff Starter", icon: "🎸", color: "#64748b" },
            { count: 20, name: "Melody Maker", icon: "🎵", color: "#6366f1" },
            { count: 50, name: "Mic Master", icon: "🎙️", color: "#10b981" },
            { count: 100, name: "Key Commander", icon: "🎹", color: "#2563eb" }, // Darker Blue
            { count: 200, name: "Rhythm Master", icon: "🥁", color: "#dc2626" }, // Bold Red
            { count: 400, name: "String Sorcerer", icon: "🎻", color: "#d946ef" }, // Vibrant Purple/Pink
            { count: 750, name: "Jazz Legend", icon: "🎷", color: "#8b5cf6" }, // Deep Violet
            { count: 1000, name: "Grand Maestro", icon: "🏆", color: "#f59e0b" } // Gold
        ];

        // Leaderboard elements
        this.leaderboardLists = {
            1: document.getElementById('leaderboardList1'),
            2: document.getElementById('leaderboardList2'),
            3: document.getElementById('leaderboardList3'),
            4: document.getElementById('leaderboardList4')
        };
        this.currentLeaderboardTime = 1; // Locked to 1 minute

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Avatar upload
        if (this.changeAvatarBtn && this.avatarInput) {
            this.changeAvatarBtn.addEventListener('click', () => {
                this.avatarInput.click();
            });

            this.avatarInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.handleAvatarUpload(e.target.files[0]);
                }
            });
        }

        // Update username
        if (this.updateUsernameBtn) {
            this.updateUsernameBtn.addEventListener('click', () => {
                this.handleUpdateUsername();
            });
        }

        // Change password form
        const changePasswordForm = document.getElementById('profileChangePasswordForm');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleChangePassword();
            });
        }

        if (this.changePasswordBtn) {
            this.changePasswordBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleChangePassword();
            });
        }

        // Logout button
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', async () => {
                await this.handleLogout();
            });
        }

        // Share Songs button
        if (this.shareSongsBtn) {
            this.shareSongsBtn.addEventListener('click', () => {
                if (this.onShareSongs) {
                    this.onShareSongs();
                }
            });
        }

        // Accept Songs button
        if (this.acceptSongsBtn) {
            this.acceptSongsBtn.addEventListener('click', () => {
                if (this.onAcceptSongs) {
                    this.onAcceptSongs();
                }
            });
        }

        // Reseed Songs button
        if (this.reseedSongsBtn) {
            this.reseedSongsBtn.addEventListener('click', () => {
                this.handleReseedToDefaults();
            });
        }

        // Close button
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => {
                if (window.appInstance) {
                    window.appInstance.popModalState('profile');
                } else {
                    this.hide();
                }
            });
        }

        // Leaderboard Level Switcher
        const levelBtns = this.modal.querySelectorAll('.mode-lvl-btn');
        if (levelBtns.length > 0) {
            levelBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const lvl = parseInt(btn.dataset.lvl);
                    this.selectedLvl = lvl;
                    
                    // Update UI state of buttons
                    levelBtns.forEach(b => {
                        const isActive = parseInt(b.dataset.lvl) === lvl;
                        b.classList.toggle('active', isActive);
                        b.style.borderColor = isActive ? '#6366f1' : '#e2e8f0';
                        b.style.background = isActive ? '#eff6ff' : '#fff';
                        b.style.color = isActive ? '#6366f1' : '#64748b';
                    });
                    
                    // Refresh data
                    this.renderHighScores();
                });
            });
        }

        // Leaderboard (Tabs removed, now 4 columns)

        // Instrument selection
        if (this.instrumentBtns && this.instrumentBtns.length > 0) {
            this.instrumentBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const instrument = btn.dataset.instrument;
                    this.updateInstrumentUI(instrument);
                    this.handleInstrumentChange(instrument);
                });
            });
        }

        // Theme selection
        if (this.themeSelect) {
            this.themeSelect.addEventListener('change', (e) => {
                this.handleThemeChange(e.target.value);
            });
        }

        // Close on backdrop click
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.hide();
                }
            });
        }

        // Enter key handling for password change
        // Feature Toggles


        if (this.timelineToggle) {
            this.timelineToggle.addEventListener('change', (e) => {
                const user = this.firebaseManager.getCurrentUser();
                const uid = user ? user.uid : 'guest';
                localStorage.setItem(`feature-timeline-enabled-${uid}`, e.target.checked);
            });
        }

        // (removed textNotationToggle)

        if (this.midiToggle) {
            this.midiToggle.addEventListener('change', (e) => {
                const isEnabled = e.target.checked;
                const user = this.firebaseManager.getCurrentUser();
                const uid = user ? user.uid : 'guest';
                localStorage.setItem(`feature-midi-enabled-${uid}`, isEnabled);
                localStorage.setItem(`feature-midi-enabled-global`, isEnabled);

                // Show a small hint that refresh might be needed
                if (window.appInstance && window.appInstance.showInfoModal) {
                    window.appInstance.showInfoModal("MIDI Support", `MIDI support is now ${isEnabled ? 'Enabled' : 'Disabled'}. Please refresh the page if you're in the Chord Timeline view for the change to take full effect.`);
                }
            });
        }

        // Admin Request handlers
        if (this.viewRequestsBtn) {
            this.viewRequestsBtn.addEventListener('click', () => {
                this.showRequestsModal();
            });
        }

        if (this.requestsCloseBtn) {
            this.requestsCloseBtn.addEventListener('click', () => {
                if (this.requestsModal) this.requestsModal.classList.add('hidden');
            });
        }

        if (this.requestsModal) {
            this.requestsModal.addEventListener('click', (e) => {
                if (e.target === this.requestsModal) {
                    this.requestsModal.classList.add('hidden');
                }
            });
        }
    }

    async handleAvatarUpload(file) {
        if (!file) return;

        // Basic validation
        if (!file.type.startsWith('image/')) {
            alert('Selecteer een afbeelding.');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            alert('Afbeelding is te groot. Max 5MB.');
            return;
        }

        try {
            // Show loading state
            if (this.changeAvatarBtn) {
                this.changeAvatarBtn.textContent = '...';
                this.changeAvatarBtn.disabled = true;
            }

            const resizedDataUrl = await this.resizeImage(file, 200, 200);

            // Save to Realtime Database via new method
            const result = await this.firebaseManager.uploadUserAvatar(resizedDataUrl);

            if (result.success) {
                // Update UI
                this.updateAvatarUI(resizedDataUrl);

                // Trigger profile label update via global event or reload
                // Since this is in DB now, app.js needs to know to re-fetch.
                // We'll rely on app.js having a listener or us calling a refresh if possible.
                // For now, page refresh is the fallback.
            } else {
                alert('Fout bij bijwerken profielfoto: ' + result.error);
            }

        } catch (error) {
            console.error('Avatar upload error:', error);
            alert('Fout bij verwerken afbeelding.');
        } finally {
            if (this.changeAvatarBtn) {
                this.changeAvatarBtn.textContent = '📷';
                this.changeAvatarBtn.disabled = false;
            }
            if (this.avatarInput) this.avatarInput.value = ''; // Reset input
        }
    }

    async show() {
        if (!this.modal) return;

        const user = this.firebaseManager.getCurrentUser();
        const uid = user ? user.uid : 'guest';
        
        if (user) {
            if (this.emailDisplay) this.emailDisplay.textContent = user.email || 'Geen e-mailadres';
            if (this.usernameInput) this.usernameInput.value = user.displayName || '';
            
            // Update Avatar UI - Try DB first, then Auth
            let avatarUrl = await this.firebaseManager.getUserAvatar(user.uid);
            if (!avatarUrl) avatarUrl = user.photoURL;
            this.updateAvatarUI(avatarUrl);
        }

        // Initialize theme select from current body class or localStorage
        if (this.themeSelect) {
            const savedTheme = localStorage.getItem('user-theme') || 'theme-classic';
            this.themeSelect.value = savedTheme;
        }

        // Update switcher UI if needed
        if (window.appInstance && window.appInstance.updateThemeSwitcherUI) {
            window.appInstance.updateThemeSwitcherUI();
        }

        // Update accept songs button visibility
        await this.updateAcceptSongsButton();

        // Reset form
        this.clearErrors();
        this.clearSuccess();
        this.resetForm();

        this.modal.classList.remove('hidden');

        // Reset scroll position - do it after showing to ensure browser respects it
        setTimeout(() => {
            const modalBody = this.modal.querySelector('.modal-body');
            if (modalBody) {
                modalBody.scrollTop = 0;
            }
        }, 50);

        // Initialize instrument selection
        const savedInstrument = localStorage.getItem(`instrument-mode-${uid}`) || 'piano';
        this.updateInstrumentUI(savedInstrument);

        // Initialize feature toggles from localStorage (per-user)
        if (this.timelineToggle) {
            this.timelineToggle.checked = localStorage.getItem(`feature-timeline-enabled-${uid}`) !== 'false';
        }
        if (this.midiToggle) {
            this.midiToggle.checked = localStorage.getItem(`feature-midi-enabled-${uid}`) === 'true';
        }

        // Update statistics
        this.updateDatabaseSize();
        this.updateStatistics();

        // Check for admin
        if (this.adminSection) {
            const isAdmin = user && user.email === 'jared@vanhensen.nl';
            this.adminSection.classList.toggle('hidden', !isAdmin);
        }
    }

    async showRequestsModal() {
        if (!this.requestsModal) return;

        this.requestsModal.classList.remove('hidden');
        this.renderRequests();
    }

    async renderRequests() {
        if (!this.requestsTableBody) return;

        this.requestsTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">Laden...</td></tr>';

        try {
            const requests = await this.firebaseManager.getSongRequests();
            this.requestsTableBody.innerHTML = '';

            if (requests.length === 0) {
                this.requestsEmptyMsg?.classList.remove('hidden');
                return;
            }

            this.requestsEmptyMsg?.classList.add('hidden');

            // Sort by timestamp descending
            const sorted = requests.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

            sorted.forEach(req => {
                const date = req.timestamp ? new Date(req.timestamp).toLocaleDateString() : 'Unknown';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${req.artist || '-'}</td>
                    <td>${req.title || '-'}</td>
                    <td>${req.userEmail || 'Anon'}</td>
                    <td>${date}</td>
                `;
                this.requestsTableBody.appendChild(tr);
            });
        } catch (error) {
            console.error('Error rendering requests:', error);
            this.requestsTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #ef4444; padding: 20px;">Fout bij laden van aanvragen.</td></tr>';
        }
    }

    async updateStatistics() {
        if (!this.songManager) return;

        const songs = this.songManager.getAllSongs();

        // 1. Total Practice Count
        const total = songs.reduce((sum, song) => sum + (parseInt(song.practiceCount) || 0), 0);
        if (this.totalPracticeDisplay) {
            this.totalPracticeDisplay.textContent = total;
            this.totalPracticeDisplay.style.fontWeight = '700';
            this.totalPracticeDisplay.style.fontSize = '1.2em';
            this.totalPracticeDisplay.style.color = 'var(--primary-color, #6366f1)';
        }

        // Calculate and Update Level Badge
        if (this.levelBadge) {
            let currentLevel = 0;
            for (let i = 0; i < this.awardTiers.length; i++) {
                if (total >= this.awardTiers[i].count) {
                    currentLevel = i + 1;
                } else {
                    break;
                }
            }

            if (currentLevel > 0) {
                this.levelBadge.textContent = `LVL ${currentLevel}`;
                this.levelBadge.classList.remove('hidden');
            } else {
                this.levelBadge.classList.add('hidden');
            }
        }

        // 2. Render Top 10 Table
        this.renderTopSongs(songs);

        // 3. Render Achievements/Awards
        this.renderAchievements(total);

        // 4. Render Chord Trainer High Scores
        this.renderHighScores();

        // 5. Update Practice Streak
        this.updateStreakDisplay();
    }

    async updateStreakDisplay() {
        const user = this.firebaseManager.getCurrentUser();
        if (!user) return;

        const stats = await this.firebaseManager.getPracticeStats(user.uid);
        if (!stats) return;

        if (this.currentStreakDisplay) this.currentStreakDisplay.textContent = stats.currentStreak || 0;
        if (this.longestStreakDisplay) this.longestStreakDisplay.textContent = stats.longestStreak || 0;
        if (this.totalDaysPracticedDisplay) this.totalDaysPracticedDisplay.textContent = stats.totalDaysPracticed || 0;

        // Unlock milestones
        if (this.streakMilestones) {
            const badges = this.streakMilestones.querySelectorAll('.milestone-badge');
            badges.forEach(badge => {
                const days = parseInt(badge.getAttribute('data-days'));
                if (stats.longestStreak >= days) {
                    badge.classList.add('unlocked');
                    badge.style.opacity = '1';
                    badge.style.filter = 'grayscale(0)';
                } else {
                    badge.classList.remove('unlocked');
                    badge.style.opacity = '0.5';
                    badge.style.filter = 'grayscale(1)';
                }
            });
        }
    }

    renderHighScores() {
        if (!this.highScoresList) return;

        const highScores = JSON.parse(localStorage.getItem('chordTrainerHighScores') || '{}');
        const diffSuffix = this.selectedLvl > 1 ? `_L${this.selectedLvl}` : "";
        const modeNames = {
            1: 'Shape / Chord',
            2: 'Play Chord',
            3: 'Notes / Chord',
            4: 'Chord / Notes'
        };
        const modeIcons = {
            1: '👁️',
            2: '🎹',
            3: '📝',
            4: '👂'
        };
        const timeColor = '#3b82f6'; // 2M - Blue

        this.highScoresList.innerHTML = '';
        
        // Render 4 tiles (4 modes, 1 MIN)
        for (let m = 1; m <= 4; m++) {
            const scoreKey = `mode${m}${diffSuffix}_1m`;
            const score = highScores[scoreKey] || 0;
            const card = document.createElement('div');
            card.className = 'achievement-card unlocked';
            card.style.setProperty('--tier-color', timeColor);
            card.innerHTML = `
                <div class="achievement-icon" style="font-size: 1.4rem; margin: 5px 0;">${modeIcons[m]}</div>
                <div class="achievement-name" style="font-size: 0.65rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 900;" title="${modeNames[m]}">${modeNames[m]}</div>
                <div class="achievement-count" style="font-size: 1.1rem; font-weight: 900; color: white;">${score} <span style="font-size: 0.6rem; opacity: 0.7;">pts</span></div>
            `;
            this.highScoresList.appendChild(card);
        }
        
        // Also render leadereboards
        this.renderLeaderboard();
    }

    async renderLeaderboard() {
        // Render ALL 4 categories into their respective columns
        for (let m = 1; m <= 4; m++) {
            const listEl = this.leaderboardLists[m];
            if (!listEl) continue;

            listEl.innerHTML = '<div class="leaderboard-empty" style="font-size: 0.6rem;">...</div>';
            
            const diffSuffix = this.selectedLvl > 1 ? `_L${this.selectedLvl}` : "";
            const modeKey = `mode${m}${diffSuffix}_1m`;
            const top10 = await this.firebaseManager.getLeaderboard(modeKey);
            
            listEl.innerHTML = '';
            
            if (top10.length === 0) {
                listEl.innerHTML = '<div class="leaderboard-empty" style="font-size: 0.6rem; color: #94a3b8; text-align: center; padding: 10px 0;">No scores yet</div>';
            } else {
                top10.forEach((entry, index) => {
                    const rank = index + 1;
                    const entryEl = document.createElement('div');
                    entryEl.className = `leaderboard-entry rank-${rank} compact`;
                    entryEl.style.fontSize = '0.7rem';
                    entryEl.style.padding = '4px 6px';
                    entryEl.style.marginBottom = '2px';
                    entryEl.innerHTML = `
                        <div class="rank-badge" style="width: 16px; height: 16px; font-size: 0.6rem; min-width: 16px;">${rank}</div>
                        <div class="leaderboard-name" style="font-size: 0.65rem; max-width: 60px; overflow: hidden; text-overflow: ellipsis;">${entry.username || 'Anon'}</div>
                        <div class="leaderboard-score" style="font-size: 0.6rem; font-weight: 700;">${entry.score}</div>
                    `;
                    listEl.appendChild(entryEl);
                });
            }
        }
    }

    renderTopSongs(songs) {
        if (!this.topSongsBody) return;

        // Sort by practice count descending
        const sorted = [...songs].sort((a, b) => (parseInt(b.practiceCount) || 0) - (parseInt(a.practiceCount) || 0));
        const top10 = sorted.slice(0, 10);

        this.topSongsBody.innerHTML = '';
        top10.forEach((song, index) => {
            const count = parseInt(song.practiceCount) || 0;
            const award = this.getAwardForCount(count);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td style="font-weight: 600;">${song.title}</td>
                <td style="font-size: 0.9em; color: #64748b;">${song.artist}</td>
                <td style="text-align: center; font-weight: 700;">${count}</td>
            `;
            this.topSongsBody.appendChild(tr);
        });
    }

    renderAchievements(totalPractice) {
        if (!this.achievementsList) return;

        // Reset container styling to use CSS Grid for perfect alignment
        this.achievementsList.innerHTML = '';
        this.achievementsList.classList.add('achievements-grid');
        this.achievementsList.style.display = 'grid'; // Ensure grid is active

        let nextTier = null;
        let currentTierIndex = -1;

        this.awardTiers.forEach((tier, index) => {
            const isUnlocked = totalPractice >= tier.count;
            if (isUnlocked) currentTierIndex = index;
            if (!isUnlocked && !nextTier) nextTier = tier;

            const card = document.createElement('div');
            card.className = `achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`;

            // Use CSS variables for the dynamic color
            card.style.setProperty('--tier-color', tier.color);

            // Using consistent structure with improved typography
            card.innerHTML = `
                <div class="achievement-level">Level ${index + 1}</div>
                <div class="achievement-icon ${isUnlocked ? '' : 'grayscale'}">
                    ${tier.icon}
                    ${!isUnlocked ? '<span class="lock-indicator">🔒</span>' : ''}
                </div>
                <div class="achievement-name">${tier.name}</div>
                <div class="achievement-count">${tier.count} Practices</div>
            `;
            this.achievementsList.appendChild(card);
        });

        // Update Progress Bar
        if (this.progressFill && this.progressText) {
            let percentage = 0;
            let currentGoal = 0;
            let prevGoal = currentTierIndex >= 0 ? this.awardTiers[currentTierIndex].count : 0;

            if (nextTier) {
                currentGoal = nextTier.count;
                // Calculate progress between tiers for a smoother feel
                const range = currentGoal - prevGoal;
                const progressInRange = totalPractice - prevGoal;
                percentage = Math.min(100, Math.max(0, (progressInRange / range) * 100));

                this.nextLevelName.textContent = nextTier.name;
                this.nextLevelLvl.textContent = `Level ${this.awardTiers.indexOf(nextTier) + 1}`;
                this.progressText.textContent = `${totalPractice} / ${currentGoal} Practices`;
            } else {
                // All tiers achieved
                percentage = 100;
                this.nextLevelName.textContent = "Grand Maestro Maxed!";
                this.nextLevelLvl.textContent = "MAX LEVEL";
                this.progressText.textContent = `${totalPractice} Practices Total`;
            }

            this.progressFill.style.width = `${percentage}%`;
        }
    }

    getAwardForCount(count) {
        // Find highest tier reached (iterate backwards since tiers are now 10..1000)
        for (let i = this.awardTiers.length - 1; i >= 0; i--) {
            if (count >= this.awardTiers[i].count) return this.awardTiers[i];
        }
        return null;
    }

    async updateDatabaseSize() {
        if (!this.databaseSizeDisplay || !this.songManager) return;

        try {
            const songs = this.songManager.getAllSongs();

            // Calculate size by serializing the songs data to JSON
            // We'll also include an estimate for setlists and other metadata
            const songsJson = JSON.stringify(songs);

            // Get local storage keys for this user as well (e.g. setlists stored locally or other keys)
            // But primarily we want the DB content.
            // approx adding 20% for overhead and other small objects like user profile/avatars etc.
            let byteSize = songsJson.length;

            // Try to add setlists size if available
            if (window.appInstance && window.appInstance.setlistManager) {
                const setlists = window.appInstance.setlistManager.getAllSetlists();
                byteSize += JSON.stringify(setlists).length;
            }

            const formattedSize = this.formatBytes(byteSize);
            this.databaseSizeDisplay.textContent = formattedSize;
        } catch (error) {
            console.error('Error calculating database size:', error);
            this.databaseSizeDisplay.textContent = 'Unknown';
        }
    }

    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    async updateAcceptSongsButton() {
        if (!this.acceptSongsBtn) return;

        const user = this.firebaseManager.getCurrentUser();
        if (!user || !user.uid) {
            this.acceptSongsBtn.classList.add('hidden');
            return;
        }

        try {
            const count = await this.firebaseManager.getPendingSongsCount(user.uid);
            if (count > 0) {
                this.acceptSongsBtn.classList.remove('hidden');
                this.acceptSongsBtn.textContent = `Accept New Songs (${count})`;
            } else {
                this.acceptSongsBtn.classList.add('hidden');
            }
        } catch (error) {
            console.error('Error updating accept songs button:', error);
            this.acceptSongsBtn.classList.add('hidden');
        }
    }

    hide(fromPopState = false) {
        if (!fromPopState && window.appInstance) {
            window.appInstance.popModalState('profile');
            return;
        }
        if (this.modal) {
            this.modal.classList.add('hidden');
        }
        this.clearErrors();
        this.clearSuccess();
        this.resetForm();
    }

    async handleUpdateUsername() {
        const newUsername = this.usernameInput?.value.trim();

        if (!newUsername) {
            alert('Voer een gebruikersnaam in.');
            return;
        }

        if (this.updateUsernameBtn) {
            this.updateUsernameBtn.disabled = true;
            this.updateUsernameBtn.textContent = '...';
        }

        try {
            const result = await this.firebaseManager.updateUsername(newUsername);
            if (result.success) {
                alert('Gebruikersnaam succesvol bijgewerkt!');
                // The app should automatically update the display through some listener or callback
                if (this.onAuthSuccess) {
                    this.onAuthSuccess(result.user);
                }
            } else {
                alert('Fout bij bijwerken gebruikersnaam: ' + (result.error || 'Onbekende fout'));
            }
        } catch (error) {
            console.error('Update username error:', error);
            alert('Er is een fout opgetreden.');
        } finally {
            if (this.updateUsernameBtn) {
                this.updateUsernameBtn.disabled = false;
                this.updateUsernameBtn.textContent = 'Opslaan';
            }
        }
    }

    async handleChangePassword() {
        const currentPassword = this.currentPasswordInput?.value;
        const newPassword = this.newPasswordInput?.value;
        const confirmPassword = this.confirmPasswordInput?.value;

        // Validation
        if (!currentPassword) {
            this.showError('Voer je huidige wachtwoord in.');
            return;
        }

        if (!newPassword) {
            this.showError('Voer een nieuw wachtwoord in.');
            return;
        }

        if (newPassword.length < 6) {
            this.showError('Nieuw wachtwoord moet minimaal 6 karakters lang zijn.');
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showError('Nieuwe wachtwoorden komen niet overeen.');
            return;
        }

        // Show loading state
        this.setLoading(true);
        this.clearErrors();
        this.clearSuccess();

        try {
            // First, re-authenticate the user with current password
            const user = this.firebaseManager.getCurrentUser();
            if (!user || !user.email) {
                this.showError('Geen gebruiker ingelogd.');
                this.setLoading(false);
                return;
            }

            // Re-authenticate to verify current password
            const credential = firebase.auth.EmailAuthProvider.credential(
                user.email,
                currentPassword
            );

            await user.reauthenticateWithCredential(credential);

            // Now change the password
            const result = await this.firebaseManager.changePassword(newPassword);

            if (result.success) {
                this.showSuccess('Wachtwoord succesvol gewijzigd!');
                this.resetForm();
                // Clear form after 2 seconds
                setTimeout(() => {
                    this.clearSuccess();
                }, 2000);
            } else {
                this.showError(result.error || 'Wachtwoord wijzigen mislukt.');
            }
        } catch (error) {
            console.error('Change password error:', error);
            const errorMessage = this.firebaseManager.getAuthErrorMessage(error.code) ||
                error.message ||
                'Er is een fout opgetreden. Probeer het opnieuw.';
            this.showError(errorMessage);
        } finally {
            this.setLoading(false);
        }
    }

    async handleLogout() {
        if (window.appInstance && window.appInstance.showGeneralConfirm) {
            window.appInstance.showGeneralConfirm(
                "Logout",
                "Are you sure you want to log out?",
                async () => {
                    const result = await this.firebaseManager.signOut();
                    if (result.success) {
                        this.hide();
                        if (this.onSignOut) {
                            this.onSignOut();
                        }
                    } else {
                        alert('Uitloggen mislukt: ' + (result.error || 'Onbekende fout'));
                    }
                },
                "Log Out",
                "Stay Logged In"
            );
        } else {
            // Fallback to standard confirm if appInstance is not available
            if (confirm('Are you sure you want to log out?')) {
                const result = await this.firebaseManager.signOut();
                if (result.success) {
                    this.hide();
                    if (this.onSignOut) {
                        this.onSignOut();
                    }
                } else {
                    alert('Uitloggen mislukt: ' + (result.error || 'Onbekende fout'));
                }
            }
        }
    }


    async handleReseedToDefaults() {
        const user = this.firebaseManager.getCurrentUser();
        if (!user) {
            alert('Must be logged in to reseed songs.');
            return;
        }

        const reseedAction = async () => {
            try {
                // Show loading indicator
                if (this.reseedSongsBtn) {
                    const originalText = this.reseedSongsBtn.innerHTML;
                    this.reseedSongsBtn.disabled = true;
                    this.reseedSongsBtn.innerHTML = '🔄 Reseeding...';

                    // Perform the reseed
                    if (typeof DEFAULT_SONGS !== 'undefined' && DEFAULT_SONGS.length > 0) {
                        try {
                            await this.songManager.importSongs(DEFAULT_SONGS, true);
                            await this.firebaseManager.setSeedingStatus(user.uid, true);

                            // Show professional success info
                            if (window.appInstance && window.appInstance.showInfoModal) {
                                window.appInstance.showInfoModal("Success", "Library successfully reset to default song set!");
                            } else {
                                alert('Library successfully reset to default song set!');
                            }
                            
                            this.hide();
                            if (window.appInstance && window.appInstance.renderSongTable) {
                                window.appInstance.renderSongTable();
                            }
                        } catch (e) {
                            console.error('Import error during reseed:', e);
                            alert('Reseed failed: ' + e.message);
                        } finally {
                            this.reseedSongsBtn.disabled = false;
                            this.reseedSongsBtn.innerHTML = originalText;
                        }
                    } else {
                        alert('Could not find default songs data.');
                        this.reseedSongsBtn.disabled = false;
                        this.reseedSongsBtn.innerHTML = originalText;
                    }
                }
            } catch (error) {
                console.error('Fatal reseed error:', error);
                alert('Fatal error during reset: ' + error.message);
                if (this.reseedSongsBtn) {
                    this.reseedSongsBtn.disabled = false;
                    this.reseedSongsBtn.innerHTML = originalText;
                }
            }
        };

        if (window.appInstance && window.appInstance.showGeneralConfirm) {
            window.appInstance.showGeneralConfirm(
                "Reset Library", 
                "Are you sure you want to reset your library? This will replace EVERYTHING with the default song set. ALL your current songs and edits will be LOST.",
                reseedAction,
                "Reset Library",
                "Keep My Data"
            );
        } else {
            // Fallback
            if (confirm('Are you sure you want to reset your library? This will replace EVERYTHING with the default song set. ALL your current songs and edits will be LOST.')) {
                reseedAction();
            }
        }
    }

    showError(message) {
        if (this.changePasswordError) {
            this.changePasswordError.textContent = message;
            this.changePasswordError.classList.remove('hidden');
        }
        if (this.changePasswordSuccess) {
            this.changePasswordSuccess.classList.add('hidden');
        }
    }

    showSuccess(message) {
        if (this.changePasswordSuccess) {
            this.changePasswordSuccess.textContent = message;
            this.changePasswordSuccess.classList.remove('hidden');
        }
        if (this.changePasswordError) {
            this.changePasswordError.classList.add('hidden');
        }
    }

    clearErrors() {
        if (this.changePasswordError) {
            this.changePasswordError.textContent = '';
            this.changePasswordError.classList.add('hidden');
        }
    }

    clearSuccess() {
        if (this.changePasswordSuccess) {
            this.changePasswordSuccess.textContent = '';
            this.changePasswordSuccess.classList.add('hidden');
        }
    }

    setLoading(loading) {
        if (this.changePasswordBtn) {
            this.changePasswordBtn.disabled = loading;
            if (loading) {
                this.changePasswordBtn.textContent = 'Wijzigen...';
            } else {
                this.changePasswordBtn.textContent = 'Wachtwoord wijzigen';
            }
        }
        if (this.currentPasswordInput) {
            this.currentPasswordInput.disabled = loading;
        }
        if (this.newPasswordInput) {
            this.newPasswordInput.disabled = loading;
        }
        if (this.confirmPasswordInput) {
            this.confirmPasswordInput.disabled = loading;
        }
    }

    resetForm() {
        if (this.currentPasswordInput) {
            this.currentPasswordInput.value = '';
        }
        if (this.newPasswordInput) {
            this.newPasswordInput.value = '';
        }
        if (this.confirmPasswordInput) {
            this.confirmPasswordInput.value = '';
        }
    }

    async handleAvatarUpload(file) {
        if (!file) return;

        // Basic validation
        if (!file.type.startsWith('image/')) {
            alert('Selecteer een afbeelding.');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            alert('Afbeelding is te groot. Max 5MB.');
            return;
        }

        try {
            // Show loading state
            if (this.changeAvatarBtn) {
                this.changeAvatarBtn.textContent = '...';
                this.changeAvatarBtn.disabled = true;
            }

            const resizedDataUrl = await this.resizeImage(file, 200, 200);

            // Save to Firebase Auth
            const result = await this.firebaseManager.updatePhotoURL(resizedDataUrl);

            if (result.success) {
                // Update UI
                this.updateAvatarUI(resizedDataUrl);

                // Trigger profile label update if possible
                if (this.onAuthSuccess) {
                    // This might be enough to trigger app updates if passed correctly
                    // accessing app instance is hard here, but page refresh will sort it out
                }
            } else {
                alert('Fout bij bijwerken profielfoto: ' + result.error);
            }

        } catch (error) {
            console.error('Avatar upload error:', error);
            alert('Fout bij verwerken afbeelding.');
        } finally {
            if (this.changeAvatarBtn) {
                this.changeAvatarBtn.textContent = '📷';
                this.changeAvatarBtn.disabled = false;
            }
            if (this.avatarInput) this.avatarInput.value = ''; // Reset input
        }
    }

    resizeImage(file, maxWidth, maxHeight) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(dataUrl);
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    }

    updateAvatarUI(photoURL) {
        if (!this.avatarDisplay || !this.avatarPlaceholder) return;

        if (photoURL) {
            this.avatarDisplay.src = photoURL;
            this.avatarDisplay.classList.remove('hidden');
            this.avatarPlaceholder.classList.add('hidden');
        } else {
            this.avatarDisplay.src = '';
            this.avatarDisplay.classList.add('hidden');
            this.avatarPlaceholder.classList.remove('hidden');
        }
    }

    handleThemeChange(themeClass) {
        // Remove all theme classes
        const themes = ['theme-classic', 'theme-high-contrast', 'theme-sunset', 'theme-electric'];
        document.body.classList.remove(...themes);

        // Add new theme class
        document.body.classList.add(themeClass);

        // Save preference
        localStorage.setItem('user-theme', themeClass);

        // Notify app to update header button UI if needed
        if (window.appInstance && window.appInstance.updateThemeSwitcherUI) {
            window.appInstance.updateThemeSwitcherUI();
        }
    }

    setThemeDropdown(themeClass) {
        if (this.themeSelect) {
            this.themeSelect.value = themeClass;
        }
    }
    async handleInstrumentChange(instrument) {
        const user = this.firebaseManager.getCurrentUser();
        const uid = user ? user.uid : 'guest';
        
        // Save to LocalStorage
        localStorage.setItem(`instrument-mode-${uid}`, instrument);
        // Fallback for legacy components or index.html
        localStorage.setItem('instrumentMode', instrument);

        // Save to Firebase if authenticated
        if (user) {
            try {
                await this.firebaseManager.updatePreference('instrument', instrument);
            } catch (e) {
                console.error('Error saving instrument to Firebase:', e);
            }
        }

        // Notify SongDetailModal if it exists
        if (window.appInstance && window.appInstance.songDetailModal) {
            window.appInstance.songDetailModal.instrumentMode = instrument;
            window.appInstance.songDetailModal.updateInstrumentToggleUI();
            window.appInstance.songDetailModal.refreshNotation();

            // Sync with timeline if open
            if (window.appInstance.songDetailModal.scrollingChordsFrame && window.appInstance.songDetailModal.scrollingChordsFrame.contentWindow) {
                window.appInstance.songDetailModal.scrollingChordsFrame.contentWindow.postMessage({
                    type: 'setInstrumentMode',
                    instrumentMode: instrument
                }, '*');
            }
        }
    }

    updateInstrumentUI(instrument) {
        if (!this.instrumentBtns) return;
        this.instrumentBtns.forEach(btn => {
            const isActive = btn.dataset.instrument === instrument;
            btn.classList.toggle('active', isActive);
            btn.style.borderColor = isActive ? '#6366f1' : '#e2e8f0';
            btn.style.background = isActive ? '#eff6ff' : '#f8fafc';
            const icon = btn.children[0];
            const label = btn.children[1];
            if (label) label.style.color = isActive ? '#6366f1' : '#1e293b';
            if (icon) icon.style.transform = isActive ? 'scale(1.15)' : 'scale(1)';
            if (icon && icon.tagName === 'IMG') {
                icon.style.filter = isActive ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : 'none';
            }
        });
    }
}

