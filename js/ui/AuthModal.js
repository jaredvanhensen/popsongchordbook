// AuthModal - Authentication modal for login and create account
class AuthModal {
    constructor(firebaseManager, onAuthSuccess = null) {
        this.firebaseManager = firebaseManager;
        this.onAuthSuccess = onAuthSuccess;
        this.modal = document.getElementById('authModal');
        this.isLoginMode = true; // true = login, false = create account
        this.isShowingVerification = false; // flag for email verification view
        this.allowHide = false; // Prevent closing modal - login is required
        this.isLoading = false;
        this.isBusy = false; // Flag for active signup/login process

        // Login elements
        this.loginEmailInput = document.getElementById('authLoginEmail');
        this.loginPasswordInput = document.getElementById('authLoginPassword');
        this.loginBtn = document.getElementById('authLoginBtn');
        this.loginErrorMsg = document.getElementById('authLoginError');
        this.loginSuccessMsg = document.getElementById('authLoginSuccess');
        this.forgotPasswordBtn = document.getElementById('authForgotPassword');

        // Create account elements
        this.createUsernameInput = document.getElementById('authCreateUsername');
        this.createEmailInput = document.getElementById('authCreateEmail');
        this.createPasswordInput = document.getElementById('authCreatePassword');
        this.createConfirmPasswordInput = document.getElementById('authCreateConfirmPassword');
        this.createBtn = document.getElementById('authCreateBtn');
        this.createErrorMsg = document.getElementById('authCreateError');

        // Toggle elements
        this.toggleToCreateBtn = document.getElementById('authToggleToCreate');
        this.toggleToLoginBtn = document.getElementById('authToggleToLogin');
        this.loginForm = document.getElementById('authLoginForm');
        this.createForm = document.getElementById('authCreateForm');

        // Verification elements
        this.verificationForm = document.getElementById('authVerificationForm');
        this.verificationMsg = document.getElementById('authVerificationMsg');
        this.continueToLoginBtn = document.getElementById('authContinueToLogin');

        // Close button
        this.closeBtn = document.getElementById('authModalClose');

        if (this.loginForm) {
            this.resendVerificationBtn = document.createElement('button');
            this.resendVerificationBtn.type = 'button';
            this.resendVerificationBtn.className = 'auth-toggle-link';
            this.resendVerificationBtn.style.display = 'none';
            this.resendVerificationBtn.style.margin = '10px auto';
            this.resendVerificationBtn.textContent = 'Need a new verification link?';
            
            const toggleDiv = this.loginForm.querySelector('.auth-toggle');
            if (toggleDiv) {
                this.loginForm.insertBefore(this.resendVerificationBtn, toggleDiv);
            }
            
            this.resendVerificationBtn.addEventListener('click', () => {
                this.handleResendVerification();
            });
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Login form
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Create account form
        if (this.createForm) {
            this.createForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateAccount();
            });
        }

        // Toggle between login and create
        if (this.toggleToCreateBtn) {
            this.toggleToCreateBtn.addEventListener('click', () => {
                this.switchToCreateMode();
            });
        }

        if (this.toggleToLoginBtn) {
            this.toggleToLoginBtn.addEventListener('click', () => {
                this.switchToLoginMode();
            });
        }

        // Close button - disabled for auth modal (login is required)
        if (this.closeBtn) {
            this.closeBtn.style.display = 'none';
            this.closeBtn.removeEventListener('click', this.hide);
        }

        // Close on backdrop click
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    // Don't allow closing by clicking backdrop - login is required
                }
            });
        }

        // Verification continue button
        if (this.continueToLoginBtn) {
            this.continueToLoginBtn.addEventListener('click', () => {
                this.switchToLoginMode();
            });
        }
    }

    show(loginMode = true) {
        if (!this.modal) return;

        this.isLoginMode = loginMode;
        this.allowHide = false; // Prevent hiding
        this.modal.classList.remove('hidden');

        // Hide close button
        if (this.closeBtn) {
            this.closeBtn.style.display = 'none';
        }

        // Reset forms
        this.clearErrors();
        this.resetForms();

        // Show appropriate form
        if (loginMode) {
            this.switchToLoginMode();
        } else {
            this.switchToCreateMode();
        }

        // Ensure verification form is hidden on normal show
        this.isShowingVerification = false;
        if (this.verificationForm) {
            this.verificationForm.classList.add('hidden');
        }

        // Focus on first input
        setTimeout(() => {
            if (loginMode && this.loginEmailInput) {
                this.loginEmailInput.focus();
            } else if (!loginMode && this.createEmailInput) {
                this.createEmailInput.focus();
            }
        }, 100);
    }

    hide() {
        // Auth modal cannot be hidden - login is required
        // Only hide if explicitly allowed (e.g., after successful login)
        // This method is kept for internal use but won't work for user-initiated closes
        if (this.modal && this.allowHide) {
            this.modal.classList.add('hidden');
            this.allowHide = false;
        }
    }

    switchToLoginMode() {
        this.isLoginMode = true;
        this.isShowingVerification = false;
        if (this.loginForm) this.loginForm.classList.remove('hidden');
        if (this.createForm) this.createForm.classList.add('hidden');
        if (this.verificationForm) this.verificationForm.classList.add('hidden');
        if (this.resendVerificationBtn) this.resendVerificationBtn.style.display = 'none';
        this.clearErrors();
    }

    switchToCreateMode() {
        this.isLoginMode = false;
        this.isShowingVerification = false;
        if (this.loginForm) this.loginForm.classList.add('hidden');
        if (this.createForm) this.createForm.classList.remove('hidden');
        if (this.verificationForm) this.verificationForm.classList.add('hidden');
        this.clearErrors();
    }

    switchToVerificationMode(email) {
        this.isLoginMode = false;
        this.isShowingVerification = true;
        if (this.loginForm) this.loginForm.classList.add('hidden');
        if (this.createForm) this.createForm.classList.add('hidden');
        if (this.verificationForm) {
            this.verificationForm.classList.remove('hidden');
            if (this.verificationMsg) {
                this.verificationMsg.innerHTML = `An activation link has been sent to: <br><strong>${email}</strong>`;
            }
        }
        this.clearErrors();
    }

    async handleForgotPassword() {
        const email = this.loginEmailInput?.value.trim();

        if (!email) {
            this.showLoginError('Please enter your email address first.');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showLoginError('Please enter a valid email address.');
            return;
        }

        // Show loading state
        this.setForgotPasswordLoading(true);
        this.clearErrors();

        try {
            const result = await this.firebaseManager.sendPasswordResetEmail(email);

            if (result.success) {
                this.showLoginSuccess('Password reset email sent! Please check your inbox (and spam folder).');
            } else {
                this.showLoginError(result.error || 'Failed to send reset email.');
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            this.showLoginError('An error occurred. Please try again later.');
        } finally {
            this.setForgotPasswordLoading(false);
        }
    }

    async handleLogin() {
        if (this.isLoading) return;

        const email = this.loginEmailInput?.value.trim();
        const password = this.loginPasswordInput?.value;

        // Validation
        if (!email) {
            this.showLoginError('Please enter an email address.');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showLoginError('Please enter a valid email address.');
            return;
        }

        if (!password) {
            this.showLoginError('Please enter a password.');
            return;
        }

        if (password.length < 6) {
            this.showLoginError('Password must be at least 6 characters long.');
            return;
        }

        // Show loading state
        this.isLoading = true;
        this.setLoginLoading(true);
        this.clearErrors();

        try {
            const result = await this.firebaseManager.signIn(email, password);

            if (result.success) {
                // Email verification check
                if (!result.user.emailVerified) {
                    this.showLoginError('Email not verified. Please check your inbox for a verification link.');

                    if (this.resendVerificationBtn) {
                        this.resendVerificationBtn.style.display = 'block';
                    }

                    // Clear password field for security
                    if (this.loginPasswordInput) this.loginPasswordInput.value = '';

                    // Sign out because they shouldn't be "logged in" in an unverified state
                    await this.signOutAndKeepModal();
                    return;
                }

                this.clearErrors();
                this.allowHide = true; // Allow hiding after successful login
                this.hide();
                if (this.onAuthSuccess) {
                    this.onAuthSuccess(result.user);
                }
            } else {
                this.showLoginError(result.error || 'Login failed.');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showLoginError('An error occurred. Please try again.');
        } finally {
            this.isLoading = false;
            this.setLoginLoading(false);
        }
    }

    async handleResendVerification() {
        if (this.isLoading) return;
        const email = this.loginEmailInput?.value.trim();
        const password = this.loginPasswordInput?.value;

        if (!email || !password) {
            this.showLoginError('Please enter your email and password above, then click this button to resend.');
            return;
        }

        this.isLoading = true;
        this.setLoginLoading(true);
        this.clearErrors();

        try {
            const result = await this.firebaseManager.signIn(email, password);

            if (result.success) {
                if (!result.user.emailVerified) {
                    await result.user.sendEmailVerification();
                    this.showLoginSuccess('A new verification link has been sent to your email.');
                    if (this.resendVerificationBtn) {
                        this.resendVerificationBtn.style.display = 'none';
                    }
                } else {
                    this.showLoginSuccess('This email is already verified. You can log in.');
                    if (this.resendVerificationBtn) {
                        this.resendVerificationBtn.style.display = 'none';
                    }
                }
                
                await this.signOutAndKeepModal();
                if (this.loginPasswordInput) this.loginPasswordInput.value = '';
            } else {
                this.showLoginError(result.error || 'Failed to verify credentials.');
            }
        } catch (error) {
            console.error('Resend verification error:', error);
            this.showLoginError('An error occurred. Please try again.');
        } finally {
            this.isLoading = false;
            this.setLoginLoading(false);
        }
    }

    async handleCreateAccount() {
        if (this.isLoading || this.isBusy) return;
        
        console.log('Starting account creation flow...');
        this.isBusy = true;
        
        const username = this.createUsernameInput?.value.trim();
        const email = this.createEmailInput?.value.trim();
        const password = this.createPasswordInput?.value;
        const confirmPassword = this.createConfirmPasswordInput?.value;

        // Validation
        if (!username) {
            this.showCreateError('Please enter a username.');
            return;
        }

        if (!email) {
            this.showCreateError('Please enter an email address.');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showCreateError('Please enter a valid email address.');
            return;
        }

        if (!password) {
            this.showCreateError('Please enter a password.');
            return;
        }

        if (password.length < 6) {
            this.showCreateError('Password must be at least 6 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            this.showCreateError('Passwords do not match.');
            return;
        }

        // Show loading state
        this.isLoading = true;
        this.setCreateLoading(true);
        this.clearErrors();

        try {
            const result = await this.firebaseManager.signUp(email, password, username);

            if (result.success) {
                this.clearErrors();

                // Clear the password fields
                if (this.loginPasswordInput) this.loginPasswordInput.value = '';
                if (this.loginEmailInput) this.loginEmailInput.value = email;

                // Success message and transition to login
                this.showLoginSuccess('Account created successfully! Please log in to receive your activation link.');
                setTimeout(() => {
                    this.switchToLoginMode();
                }, 2000);
            } else {
                this.showCreateError(result.error || 'Account creation failed.');
            }
        } catch (error) {
            console.error('Create account error:', error);
            this.showCreateError('An error occurred. Please try again.');
        } finally {
            this.isLoading = false;
            // Wait slightly before clearing isBusy to allow auth state listeners to settle
            setTimeout(() => {
                this.isBusy = false;
            }, 2000);
            this.setCreateLoading(false);
        }
    }

    showLoginError(message) {
        if (this.loginErrorMsg) {
            this.loginErrorMsg.textContent = message;
            this.loginErrorMsg.classList.remove('hidden');
        }
        if (this.loginSuccessMsg) {
            this.loginSuccessMsg.classList.add('hidden');
        }
    }

    async signOutAndKeepModal() {
        this.isBusy = true;
        await this.firebaseManager.signOut();
        // Keep isBusy true for a while to prevent App.js from resetting the modal state
        setTimeout(() => {
            this.isBusy = false;
        }, 2000);
    }

    showCreateError(message) {
        if (this.createErrorMsg) {
            this.createErrorMsg.textContent = message;
            this.createErrorMsg.classList.remove('hidden');
        }
    }

    showLoginSuccess(message) {
        if (this.loginSuccessMsg) {
            this.loginSuccessMsg.textContent = message;
            this.loginSuccessMsg.classList.remove('hidden');
        }
    }

    clearErrors() {
        if (this.loginErrorMsg) {
            this.loginErrorMsg.textContent = '';
            this.loginErrorMsg.classList.add('hidden');
        }
        if (this.loginSuccessMsg) {
            this.loginSuccessMsg.textContent = '';
            this.loginSuccessMsg.classList.add('hidden');
        }
        if (this.createErrorMsg) {
            this.createErrorMsg.textContent = '';
            this.createErrorMsg.classList.add('hidden');
        }
    }

    setLoginLoading(loading) {
        if (this.loginBtn) {
            this.loginBtn.disabled = loading;
            if (loading) {
                this.loginBtn.textContent = 'Logging in...';
            } else {
                this.loginBtn.textContent = 'Login';
            }
        }
        if (this.loginEmailInput) {
            this.loginEmailInput.disabled = loading;
        }
        if (this.loginPasswordInput) {
            this.loginPasswordInput.disabled = loading;
        }
    }

    setCreateLoading(loading) {
        if (this.createBtn) {
            this.createBtn.disabled = loading;
            if (loading) {
                this.createBtn.textContent = 'Creating account...';
            } else {
                this.createBtn.textContent = 'Create account';
            }
        }
        if (this.createUsernameInput) {
            this.createUsernameInput.disabled = loading;
        }
        if (this.createEmailInput) {
            this.createEmailInput.disabled = loading;
        }
        if (this.createPasswordInput) {
            this.createPasswordInput.disabled = loading;
        }
        if (this.createConfirmPasswordInput) {
            this.createConfirmPasswordInput.disabled = loading;
        }
    }

    setForgotPasswordLoading(loading) {
        if (this.forgotPasswordBtn) {
            this.forgotPasswordBtn.disabled = loading;
            if (loading) {
                this.forgotPasswordBtn.textContent = 'Verzenden...';
            } else {
                this.forgotPasswordBtn.textContent = 'Forgot my password?';
            }
        }
        if (this.loginEmailInput) {
            this.loginEmailInput.disabled = loading;
        }
    }

    resetForms() {
        if (this.loginEmailInput) {
            this.loginEmailInput.value = '';
        }
        if (this.loginPasswordInput) {
            this.loginPasswordInput.value = '';
        }
        if (this.createUsernameInput) {
            this.createUsernameInput.value = '';
        }
        if (this.createEmailInput) {
            this.createEmailInput.value = '';
        }
        if (this.createPasswordInput) {
            this.createPasswordInput.value = '';
        }
        if (this.createConfirmPasswordInput) {
            this.createConfirmPasswordInput.value = '';
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

