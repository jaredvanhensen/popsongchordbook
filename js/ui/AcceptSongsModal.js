// AcceptSongsModal - Modal for accepting pending songs shared by other users
class AcceptSongsModal {
    constructor(firebaseManager, songManager) {
        this.firebaseManager = firebaseManager;
        this.songManager = songManager;
        this.modal = document.getElementById('acceptSongsModal');
        this.closeBtn = document.getElementById('acceptSongsModalClose');
        this.cancelBtn = document.getElementById('cancelAcceptSongsBtn');
        this.acceptBtn = document.getElementById('acceptSelectedSongsBtn');
        this.rejectBtn = document.getElementById('rejectSelectedSongsBtn');
        this.songsContainer = document.getElementById('acceptSongsListContainer');
        this.selectedCountSpan = document.getElementById('acceptSongsSelectedCount');
        this.selectAllBtn = document.getElementById('selectAllAcceptSongs');
        this.deselectAllBtn = document.getElementById('deselectAllAcceptSongs');

        // State
        this.selectedPendingIds = new Set();
        this.pendingSongs = [];

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
                        this.selectedPendingIds.add(cb.value);
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
                    this.selectedPendingIds.delete(cb.value);
                });
                this.updateSelectedCount();
            });
        }

        if (this.acceptBtn) {
            this.acceptBtn.addEventListener('click', () => {
                this.handleAccept();
            });
        }

        if (this.rejectBtn) {
            this.rejectBtn.addEventListener('click', () => {
                this.handleReject();
            });
        }

        if (this.songsContainer) {
            this.songsContainer.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox') {
                    const pendingId = e.target.value;
                    if (e.target.checked) {
                        this.selectedPendingIds.add(pendingId);
                    } else {
                        this.selectedPendingIds.delete(pendingId);
                    }
                    this.updateSelectedCount();
                }
            });
        }
    }

    async show() {
        if (!this.modal) return;

        // Reset state
        this.selectedPendingIds.clear();

        // Load pending songs
        await this.loadPendingSongs();

        this.populateSongsList();
        this.updateSelectedCount();

        this.modal.classList.remove('hidden');
    }

    hide() {
        if (this.modal) {
            this.modal.classList.add('hidden');
        }
    }

    async loadPendingSongs() {
        const currentUser = this.firebaseManager.getCurrentUser();
        if (!currentUser || !currentUser.uid) {
            this.pendingSongs = [];
            return;
        }

        try {
            this.pendingSongs = await this.firebaseManager.loadPendingSongs(currentUser.uid);
        } catch (error) {
            console.error('Error loading pending songs:', error);
            this.pendingSongs = [];
        }
    }

    populateSongsList() {
        if (!this.songsContainer) return;

        // Clear container
        this.songsContainer.innerHTML = '';

        if (this.pendingSongs.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'no-songs-message';
            emptyMessage.textContent = 'Geen pending songs.';
            this.songsContainer.appendChild(emptyMessage);
            return;
        }

        // Create song items
        this.pendingSongs.forEach(pending => {
            const song = pending.song;
            const songItem = document.createElement('div');
            songItem.className = 'song-item pending-song-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = pending.pendingId;
            checkbox.id = `accept-song-${pending.pendingId}`;
            checkbox.checked = this.selectedPendingIds.has(pending.pendingId);

            const label = document.createElement('label');
            label.htmlFor = `accept-song-${pending.pendingId}`;
            
            const songInfo = document.createElement('div');
            songInfo.className = 'pending-song-info';
            
            const songTitle = document.createElement('div');
            songTitle.className = 'pending-song-title';
            songTitle.textContent = `${song.artist || 'Onbekend'} - ${song.title || 'Geen titel'}`;
            
            const senderInfo = document.createElement('div');
            senderInfo.className = 'pending-song-sender';
            senderInfo.textContent = `Van: ${pending.senderEmail || 'Onbekend'}`;
            
            songInfo.appendChild(songTitle);
            songInfo.appendChild(senderInfo);
            
            label.appendChild(songInfo);
            songItem.appendChild(checkbox);
            songItem.appendChild(label);
            this.songsContainer.appendChild(songItem);
        });
    }

    updateSelectedCount() {
        if (this.selectedCountSpan) {
            const count = this.selectedPendingIds.size;
            this.selectedCountSpan.textContent = `${count} selected`;
        }
    }

    async handleAccept() {
        const selectedIds = Array.from(this.selectedPendingIds);

        if (selectedIds.length === 0) {
            alert('Selecteer minimaal één song om te accepteren.');
            return;
        }

        const currentUser = this.firebaseManager.getCurrentUser();
        if (!currentUser || !currentUser.uid) {
            alert('Je bent niet ingelogd.');
            return;
        }

        if (this.acceptBtn) {
            this.acceptBtn.disabled = true;
            this.acceptBtn.textContent = 'Accepteren...';
        }

        try {
            const result = await this.firebaseManager.acceptPendingSongs(
                currentUser.uid,
                selectedIds
            );

            if (result.success) {
                alert(`${result.acceptedCount} song(s) succesvol geaccepteerd!`);
                
                // Clear selected songs
                this.selectedPendingIds.clear();
                
                // Reload pending songs
                await this.loadPendingSongs();
                this.populateSongsList();
                this.updateSelectedCount();
                
                // Hide modal if no more pending songs
                if (this.pendingSongs.length === 0) {
                    this.hide();
                }
            } else {
                alert('Fout bij accepteren van songs: ' + (result.error || 'Onbekende fout'));
            }
        } catch (error) {
            console.error('Accept songs error:', error);
            alert('Er is een fout opgetreden bij het accepteren van songs.');
        } finally {
            if (this.acceptBtn) {
                this.acceptBtn.disabled = false;
                this.acceptBtn.textContent = 'Accept selected songs';
            }
        }
    }

    async handleReject() {
        const selectedIds = Array.from(this.selectedPendingIds);

        if (selectedIds.length === 0) {
            alert('Selecteer minimaal één song om te weigeren.');
            return;
        }

        if (!confirm(`Weet je zeker dat je ${selectedIds.length} song(s) wilt weigeren?`)) {
            return;
        }

        const currentUser = this.firebaseManager.getCurrentUser();
        if (!currentUser || !currentUser.uid) {
            alert('Je bent niet ingelogd.');
            return;
        }

        if (this.rejectBtn) {
            this.rejectBtn.disabled = true;
            this.rejectBtn.textContent = 'Weigeren...';
        }

        try {
            await this.firebaseManager.deletePendingSongs(
                currentUser.uid,
                selectedIds
            );

            alert(`${selectedIds.length} song(s) succesvol geweigerd.`);
            
            // Reload pending songs
            await this.loadPendingSongs();
            this.populateSongsList();
            this.updateSelectedCount();
            
            // Hide modal if no more pending songs
            if (this.pendingSongs.length === 0) {
                this.hide();
            }
        } catch (error) {
            console.error('Reject songs error:', error);
            alert('Er is een fout opgetreden bij het weigeren van songs.');
        } finally {
            if (this.rejectBtn) {
                this.rejectBtn.disabled = false;
                this.rejectBtn.textContent = 'Reject selected songs';
            }
        }
    }
}

