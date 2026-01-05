// ShareSongsModal - Modal for sharing songs with other users via email
class ShareSongsModal {
    constructor(firebaseManager, songManager) {
        this.firebaseManager = firebaseManager;
        this.songManager = songManager;
        this.modal = document.getElementById('shareSongsModal');
        this.closeBtn = document.getElementById('shareSongsModalClose');
        this.cancelBtn = document.getElementById('cancelShareSongsBtn');
        this.shareBtn = document.getElementById('shareSelectedSongsBtn');
        this.emailInput = document.getElementById('shareSongsEmailInput');
        this.emailError = document.getElementById('shareSongsEmailError');
        this.songsContainer = document.getElementById('shareSongsListContainer');
        this.selectedCountSpan = document.getElementById('shareSongsSelectedCount');
        this.searchInput = document.getElementById('shareSongsSearchInput');
        this.clearSearchBtn = document.getElementById('clearShareSongsSearch');
        this.selectAllBtn = document.getElementById('selectAllShareSongs');
        this.deselectAllBtn = document.getElementById('deselectAllShareSongs');
        this.sortButtons = Array.from(document.querySelectorAll('#shareSongsModal .sort-option'));
        this.sortDirectionBtn = document.getElementById('toggleShareSongsSortDirection');

        // State
        this.searchTerm = '';
        this.sortField = 'title';
        this.sortDirection = 'asc';
        this.selectedSongIds = new Set();

        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => {
                this.hide();
            });
        }

        if (this.cancelBtn) {
            this.cancelBtn.addEventListener('click', () => {
                this.hide();
            });
        }

        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.hide();
                }
            });
        }

        if (this.selectAllBtn) {
            this.selectAllBtn.addEventListener('click', () => {
                const checkboxes = this.songsContainer.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(cb => {
                    if (!cb.disabled) {
                        cb.checked = true;
                        this.selectedSongIds.add(cb.value);
                    }
                });
                this.updateSelectedCount();
            });
        }

        if (this.deselectAllBtn) {
            this.deselectAllBtn.addEventListener('click', () => {
                const checkboxes = this.songsContainer.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(cb => {
                    cb.checked = false;
                    this.selectedSongIds.delete(cb.value);
                });
                this.updateSelectedCount();
            });
        }

        if (this.shareBtn) {
            this.shareBtn.addEventListener('click', () => {
                this.handleShare();
            });
        }

        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => {
                this.searchTerm = this.searchInput.value;
                this.populateSongsList();
                this.updateSearchClearButton();
            });

            this.searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.searchInput.value = '';
                    this.searchTerm = '';
                    this.populateSongsList();
                    this.searchInput.blur();
                    this.updateSearchClearButton();
                }
            });
        }

        if (this.clearSearchBtn) {
            this.clearSearchBtn.addEventListener('click', () => {
                if (this.searchInput) {
                    this.searchInput.value = '';
                    this.searchInput.focus();
                }
                this.searchTerm = '';
                this.populateSongsList();
                this.updateSearchClearButton();
            });
        }

        if (this.sortButtons.length > 0) {
            this.sortButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const field = btn.dataset.field;
                    if (field && field !== this.sortField) {
                        this.sortField = field;
                        this.populateSongsList();
                        this.updateSortControls();
                    }
                });
            });
        }

        if (this.sortDirectionBtn) {
            this.sortDirectionBtn.addEventListener('click', () => {
                this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                this.populateSongsList();
                this.updateSortControls();
            });
        }

        if (this.songsContainer) {
            this.songsContainer.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox') {
                    const songId = e.target.value;
                    if (e.target.checked) {
                        this.selectedSongIds.add(songId);
                    } else {
                        this.selectedSongIds.delete(songId);
                    }
                    this.updateSelectedCount();
                }
            });
        }
    }

    show() {
        if (!this.modal) return;

        // Reset state
        this.searchTerm = '';
        this.selectedSongIds.clear();
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        if (this.emailInput) {
            this.emailInput.value = '';
        }
        this.clearErrors();

        this.populateSongsList();
        this.updateSearchClearButton();
        this.updateSortControls();
        this.updateSelectedCount();

        this.modal.classList.remove('hidden');

        // Focus on email input
        setTimeout(() => {
            if (this.emailInput) {
                this.emailInput.focus();
            }
        }, 100);
    }

    hide() {
        if (this.modal) {
            this.modal.classList.add('hidden');
        }
        this.clearErrors();
    }

    populateSongsList() {
        if (!this.songsContainer) return;

        const allSongs = this.songManager.getAllSongs();

        // Filter by search term
        let filteredSongs = allSongs;
        if (this.searchTerm && this.searchTerm.trim() !== '') {
            const searchLower = this.searchTerm.toLowerCase();
            filteredSongs = allSongs.filter(song => {
                const artist = (song.artist || '').toLowerCase();
                const title = (song.title || '').toLowerCase();
                return artist.includes(searchLower) || title.includes(searchLower);
            });
        }

        // Sort songs
        filteredSongs.sort((a, b) => {
            let aValue = a[this.sortField] || '';
            let bValue = b[this.sortField] || '';

            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
            }
            if (typeof bValue === 'string') {
                bValue = bValue.toLowerCase();
            }

            let comparison = 0;
            if (aValue < bValue) {
                comparison = -1;
            } else if (aValue > bValue) {
                comparison = 1;
            }

            return this.sortDirection === 'asc' ? comparison : -comparison;
        });

        // Clear container
        this.songsContainer.innerHTML = '';

        // Create song items
        filteredSongs.forEach(song => {
            const songItem = document.createElement('div');
            songItem.className = 'song-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = song.id;
            checkbox.id = `share-song-${song.id}`;
            checkbox.checked = this.selectedSongIds.has(song.id.toString());

            const label = document.createElement('label');
            label.htmlFor = `share-song-${song.id}`;
            label.textContent = `${song.artist || 'Onbekend'} - ${song.title || 'Geen titel'}`;

            songItem.appendChild(checkbox);
            songItem.appendChild(label);
            this.songsContainer.appendChild(songItem);
        });
    }

    updateSelectedCount() {
        if (this.selectedCountSpan) {
            const count = this.selectedSongIds.size;
            this.selectedCountSpan.textContent = `${count} selected`;
        }
    }

    updateSearchClearButton() {
        if (!this.clearSearchBtn) return;
        if (this.searchTerm && this.searchTerm.trim() !== '') {
            this.clearSearchBtn.classList.remove('hidden');
        } else {
            this.clearSearchBtn.classList.add('hidden');
        }
    }

    updateSortControls() {
        this.sortButtons.forEach(btn => {
            if (!btn.dataset.field) return;
            if (btn.dataset.field === this.sortField) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        if (this.sortDirectionBtn) {
            const isAsc = this.sortDirection === 'asc';
            this.sortDirectionBtn.textContent = isAsc ? 'A → Z' : 'Z → A';
            this.sortDirectionBtn.title = isAsc ? 'Sorteer van A naar Z' : 'Sorteer van Z naar A';
        }
    }

    clearErrors() {
        if (this.emailError) {
            this.emailError.textContent = '';
            this.emailError.classList.add('hidden');
        }
    }

    showError(message) {
        if (this.emailError) {
            this.emailError.textContent = message;
            this.emailError.classList.remove('hidden');
        }
    }

    async handleShare() {
        const email = this.emailInput?.value.trim();
        const selectedIds = Array.from(this.selectedSongIds).map(id => parseInt(id));

        // Validation
        if (!email) {
            this.showError('Voer een e-mailadres in.');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showError('Voer een geldig e-mailadres in.');
            return;
        }

        if (selectedIds.length === 0) {
            this.showError('Selecteer minimaal één song om te delen.');
            return;
        }

        // Check if user exists
        this.clearErrors();
        if (this.shareBtn) {
            this.shareBtn.disabled = true;
            this.shareBtn.textContent = 'Delen...';
        }

        try {
            // Find recipient user
            const recipientUserId = await this.firebaseManager.getUserByEmail(email);

            if (!recipientUserId) {
                this.showError('Geen gebruiker gevonden met dit e-mailadres. De gebruiker moet eerst een keer inloggen om gevonden te kunnen worden.');
                if (this.shareBtn) {
                    this.shareBtn.disabled = false;
                    this.shareBtn.textContent = 'Share...';
                }
                return;
            }

            // Get current user
            const currentUser = this.firebaseManager.getCurrentUser();
            if (!currentUser || !currentUser.email) {
                this.showError('Je bent niet ingelogd.');
                if (this.shareBtn) {
                    this.shareBtn.disabled = false;
                    this.shareBtn.textContent = 'Share...';
                }
                return;
            }

            // Get selected songs
            const songsToShare = this.songManager.getAllSongs().filter(song =>
                selectedIds.includes(song.id)
            );

            if (songsToShare.length === 0) {
                this.showError('Geen songs gevonden om te delen.');
                if (this.shareBtn) {
                    this.shareBtn.disabled = false;
                    this.shareBtn.textContent = 'Share...';
                }
                return;
            }

            // Save pending songs
            await this.firebaseManager.savePendingSongs(
                recipientUserId,
                songsToShare,
                currentUser.email
            );

            // Success
            alert(`${songsToShare.length} song(s) succesvol gedeeld met ${email}!`);
            this.hide();

        } catch (error) {
            console.error('Share songs error:', error);
            let errorMessage = 'Er is een fout opgetreden bij het delen van songs.';
            if (error.message?.includes('security rules')) {
                errorMessage = error.message;
            } else if (error.code === 'PERMISSION_DENIED' || error.message?.includes('permission')) {
                errorMessage = 'Firebase security rules niet correct geconfigureerd. Zie FIREBASE_SECURITY_RULES.md voor instructies.';
            }
            this.showError(errorMessage);
        } finally {
            if (this.shareBtn) {
                this.shareBtn.disabled = false;
                this.shareBtn.textContent = 'Share...';
            }
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

