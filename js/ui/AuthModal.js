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
        
        this.setupEventListeners();
    }

    setupEventListeners() {
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

    clearErrors() {
        if (this.loginErrorMsg) {
            this.loginErrorMsg.textContent = '';
            this.loginErrorMsg.classList.add('hidden');
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

