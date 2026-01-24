// AuthModal - Authentication modal for login and create account
class AuthModal {
    constructor(firebaseManager, onAuthSuccess = null) {
        this.firebaseManager = firebaseManager;
        this.onAuthSuccess = onAuthSuccess;
        this.modal = document.getElementById('authModal');
        this.isLoginMode = true; // true = login, false = create account
        this.allowHide = false; // Prevent closing modal - login is required

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

        // Close button
        this.closeBtn = document.getElementById('authModalClose');

        // Guest element
        this.guestBtn = document.getElementById('authGuestLoginBtn');
        this.localBtn = document.getElementById('authLocalOnlyBtn');

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Guest login
        if (this.guestBtn) {
            this.guestBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleGuestLogin();
            });
        }

        // Local Only
        if (this.localBtn) {
            this.localBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLocalOnly();
            });
        }

        // Login form
        if (this.loginBtn) {
            this.loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Create account form
        if (this.createBtn) {
            this.createBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleCreateAccount();
            });
        }

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
        // Do not allow closing the modal - user must login or create account
        if (this.closeBtn) {
            // Hide the close button
            this.closeBtn.style.display = 'none';
            // Remove any existing click handlers
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

        // Enter key handling
        if (this.loginPasswordInput) {
            this.loginPasswordInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.handleLogin();
                }
            });
        }

        if (this.createConfirmPasswordInput) {
            this.createConfirmPasswordInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.handleCreateAccount();
                }
            });
        }

        // Forgot password
        if (this.forgotPasswordBtn) {
            this.forgotPasswordBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleForgotPassword();
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
        if (this.loginForm) {
            this.loginForm.classList.remove('hidden');
        }
        if (this.createForm) {
            this.createForm.classList.add('hidden');
        }
        this.clearErrors();
    }

    switchToCreateMode() {
        this.isLoginMode = false;
        if (this.loginForm) {
            this.loginForm.classList.add('hidden');
        }
        if (this.createForm) {
            this.createForm.classList.remove('hidden');
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

    async handleLocalOnly() {
        console.log('User chose Local-Only mode.');
        this.clearErrors();

        try {
            this.firebaseManager.setLocalOnly(true);
            this.allowHide = true;
            this.hide();

            // Re-trigger auth success but with "Local" context
            if (this.onAuthSuccess) {
                this.onAuthSuccess({ uid: 'local-user', isLocal: true });
            }
        } catch (error) {
            console.error('Local-only transition error:', error);
            this.showLoginError('Failed to enter local mode.');
        }
    }

    async handleGuestLogin() {
        // Show loading state
        this.setGuestLoading(true);
        this.clearErrors();

        try {
            const result = await this.firebaseManager.signInAnonymously();

            if (result.success) {
                this.clearErrors();
                this.allowHide = true;
                this.hide();
                if (this.onAuthSuccess) {
                    this.onAuthSuccess(result.user);
                }
            } else {
                this.showLoginError(result.error || 'Guest login failed.');
            }
        } catch (error) {
            console.error('Guest login error:', error);
            this.showLoginError('An error occurred. Please try again.');
        } finally {
            this.setGuestLoading(false);
        }
    }

    async handleLogin() {
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
        this.setLoginLoading(true);
        this.clearErrors();

        try {
            const result = await this.firebaseManager.signIn(email, password);

            if (result.success) {
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
            this.setLoginLoading(false);
        }
    }

    async handleCreateAccount() {
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
        this.setCreateLoading(true);
        this.clearErrors();

        try {
            const result = await this.firebaseManager.signUp(email, password, username);

            if (result.success) {
                this.clearErrors();
                this.allowHide = true; // Allow hiding after successful account creation
                this.hide();
                if (this.onAuthSuccess) {
                    this.onAuthSuccess(result.user);
                }
            } else {
                this.showCreateError(result.error || 'Account creation failed.');
            }
        } catch (error) {
            console.error('Create account error:', error);
            this.showCreateError('An error occurred. Please try again.');
        } finally {
            this.setCreateLoading(false);
        }
    }

    showLoginError(message) {
        if (this.loginErrorMsg) {
            this.loginErrorMsg.textContent = message;
            this.loginErrorMsg.classList.remove('hidden');
        }
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

    setGuestLoading(loading) {
        if (this.guestBtn) {
            this.guestBtn.disabled = loading;
            if (loading) {
                this.guestBtn.textContent = 'Entering...';
            } else {
                this.guestBtn.textContent = 'Continue as Guest (Read-only)';
            }
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

