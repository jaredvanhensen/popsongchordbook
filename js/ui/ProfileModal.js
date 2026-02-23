// ProfileModal - Profile modal for viewing profile and changing password
class ProfileModal {
    constructor(firebaseManager, songManager, onSignOut = null, onShareSongs = null, onAcceptSongs = null) {
        this.firebaseManager = firebaseManager;
        this.songManager = songManager;
        this.onSignOut = onSignOut;
        this.onShareSongs = onShareSongs;
        this.onAcceptSongs = onAcceptSongs;
        this.modal = document.getElementById('profileModal');

        // Profile elements
        this.usernameInput = document.getElementById('profileUsername');
        this.updateUsernameBtn = document.getElementById('profileUpdateUsernameBtn');
        this.avatarDisplay = document.getElementById('profileAvatarDisplay');
        this.avatarPlaceholder = document.getElementById('profileAvatarPlaceholder');
        this.avatarInput = document.getElementById('profileAvatarInput');
        this.changeAvatarBtn = document.getElementById('profileChangeAvatarBtn');
        this.themeSelect = document.getElementById('profileThemeSelect');

        // Avatar elements (Created dynamically if not present in HTML yet, or assumes HTML update)
        // Since I can't edit HTML easily without context, I will inject the HTML in show() if missing or use existing structure if I modify songlist.html
        // I will modify songlist.html first to add the structure.
        // Wait, I should modify songlist.html FIRST. 
        // Plan change: Modify songlist.html first.

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
        this.closeBtn = document.getElementById('profileModalClose');

        // Feature Toggles
        this.lyricsToggle = document.getElementById('profileLyricsToggle');
        this.timelineToggle = document.getElementById('profileTimelineToggle');

        // Statistics elements
        this.databaseSizeDisplay = document.getElementById('profileDatabaseSize');
        this.totalPracticeDisplay = document.getElementById('profileTotalPractice');
        this.achievementsList = document.getElementById('profileAchievementsList');
        this.topSongsBody = document.getElementById('profileTopSongsBody');

        // Progress elements
        this.progressFill = document.getElementById('achievementProgressFill');
        this.progressText = document.getElementById('achievementProgressText');
        this.nextLevelName = document.getElementById('nextLevelName');
        this.nextLevelLvl = document.getElementById('nextLevelLvl');
        this.levelBadge = document.getElementById('profileModalLevelBadge');

        this.awardTiers = [
            { count: 10, name: "Riff Starter", icon: "🎸", color: "#64748b" },
            { count: 20, name: "Melody Maker", icon: "🎵", color: "#6366f1" },
            { count: 50, name: "Mic Master", icon: "🎙️", color: "#10b981" },
            { count: 100, name: "Key Commander", icon: "🎹", color: "#3b82f6" },
            { count: 200, name: "Beat Boxer", icon: "🥁", color: "#ef4444" },
            { count: 400, name: "String Sorcerer", icon: "🎻", color: "#ec4899" },
            { count: 750, name: "Jazz Legend", icon: "🎷", color: "#8b5cf6" },
            { count: 1000, name: "Grand Maestro", icon: "🏆", color: "#f59e0b" }
        ];

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
        if (this.lyricsToggle) {
            this.lyricsToggle.addEventListener('change', (e) => {
                const user = this.firebaseManager.getCurrentUser();
                const uid = user ? user.uid : 'guest';
                localStorage.setItem(`feature-lyrics-enabled-${uid}`, e.target.checked);
            });
        }

        if (this.timelineToggle) {
            this.timelineToggle.addEventListener('change', (e) => {
                const user = this.firebaseManager.getCurrentUser();
                const uid = user ? user.uid : 'guest';
                localStorage.setItem(`feature-timeline-enabled-${uid}`, e.target.checked);
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

        // Initialize feature toggles from localStorage (per-user)
        const uid = user ? user.uid : 'guest';

        if (this.lyricsToggle) {
            this.lyricsToggle.checked = localStorage.getItem(`feature-lyrics-enabled-${uid}`) !== 'false';
        }
        if (this.timelineToggle) {
            this.timelineToggle.checked = localStorage.getItem(`feature-timeline-enabled-${uid}`) !== 'false';
        }

        // Update statistics
        this.updateDatabaseSize();
        this.updateStatistics();
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
                <td style="text-align: center; font-size: 1.2em;" title="${award ? award.name : 'No award yet'}">
                    ${award ? award.icon : '-'}
                </td>
            `;
            this.topSongsBody.appendChild(tr);
        });
    }

    renderAchievements(totalPractice) {
        if (!this.achievementsList) return;

        this.achievementsList.innerHTML = '';

        let nextTier = null;
        let currentTierIndex = -1;

        this.awardTiers.forEach((tier, index) => {
            const isUnlocked = totalPractice >= tier.count;
            if (isUnlocked) currentTierIndex = index;
            if (!isUnlocked && !nextTier) nextTier = tier;

            const card = document.createElement('div');
            card.className = `achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`;
            card.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 12px;
                background: ${isUnlocked ? tier.color + '10' : '#f1f5f9'};
                border: 2px solid ${isUnlocked ? tier.color : '#e2e8f0'};
                border-radius: 12px;
                opacity: ${isUnlocked ? '1' : '0.6'};
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
            `;

            if (isUnlocked) {
                card.style.boxShadow = `0 4px 12px ${tier.color}30`;
            }

            card.innerHTML = `
                <div style="font-size: 9px; font-weight: 800; color: ${isUnlocked ? tier.color : '#94a3b8'}; margin-bottom: 4px; text-transform: uppercase;">Level ${index + 1}</div>
                <div style="font-size: 24px; margin-bottom: 5px; position: relative; z-index: 1;">
                    ${tier.icon}
                    ${!isUnlocked ? `<span style="position: absolute; bottom: -2px; right: -4px; font-size: 10px; background: white; border-radius: 50%; padding: 1px;">🔒</span>` : ''}
                </div>
                <div style="font-size: 10px; font-weight: 700; text-align: center; color: ${isUnlocked ? tier.color : '#64748b'}; text-transform: uppercase; letter-spacing: 0.5px;">${tier.name}</div>
                <div style="font-size: 9px; color: #94a3b8;">${tier.count} Practices</div>
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
        if (confirm('Weet je zeker dat je wilt uitloggen?')) {
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
}

