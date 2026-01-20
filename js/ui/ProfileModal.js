// ProfileModal - Profile modal for viewing profile and changing password
class ProfileModal {
    constructor(firebaseManager, onSignOut = null, onShareSongs = null, onAcceptSongs = null) {
        this.firebaseManager = firebaseManager;
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
                this.hide();
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
        if (this.confirmPasswordInput) {
            this.confirmPasswordInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.handleChangePassword();
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
        if (user) {
            if (this.emailDisplay) this.emailDisplay.textContent = user.email || 'Geen e-mailadres';
            if (this.usernameInput) this.usernameInput.value = user.displayName || '';

            // Update Avatar UI - Try DB first, then Auth
            let avatarUrl = await this.firebaseManager.getUserAvatar(user.uid);
            if (!avatarUrl) avatarUrl = user.photoURL;

            this.updateAvatarUI(avatarUrl);
        }

        // Update accept songs button visibility
        await this.updateAcceptSongsButton();

        // Reset form
        this.clearErrors();
        this.clearSuccess();
        this.resetForm();

        this.modal.classList.remove('hidden');

        // Focus on current password input
        setTimeout(() => {
            if (this.currentPasswordInput) {
                this.currentPasswordInput.focus();
            }
        }, 100);
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

    hide() {
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
}

