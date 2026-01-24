// TableRenderer - Tabel rendering en updates
class TableRenderer {
    constructor(songManager, onRowSelect, onCellEdit, onDelete, chordModal, onToggleFavorite, onPlayYouTube, keyDetector) {
        this.songManager = songManager;
        this.onRowSelect = onRowSelect;
        this.onCellEdit = onCellEdit;
        this.onDelete = onDelete;
        this.chordModal = chordModal;
        this.onToggleFavorite = onToggleFavorite;
        this.onPlayYouTube = onPlayYouTube;
        this.keyDetector = keyDetector;
        this.tbody = document.getElementById('songsTableBody');
        this.selectedRowId = null;
        this.editingRowId = null;
    }

    render(songs) {
        // Save current editing state
        const wasEditing = this.editingRowId;

        this.tbody.innerHTML = '';
        songs.forEach(song => {
            const row = this.createRow(song);
            this.tbody.appendChild(row);
        });

        // Restore edit mode if it was active
        if (wasEditing) {
            const song = this.songManager.getSongById(wasEditing);
            if (song) {
                const row = this.tbody.querySelector(`tr[data-id="${wasEditing}"]`);
                if (row) {
                    this.enterEditMode(wasEditing, row, song);
                }
            }
        }

        this.updateSelection();
        // Update header if a row is selected - but don't call updateSelectedSongHeader here
        // because it's already called from selectRow, and calling it here causes timing issues
        // The overlay will be shown by selectRow when the row is selected
    }

    updateFavoriteButton(songId, isFavorite) {
        const btn = this.tbody.querySelector(`button.favorite-btn[data-song-id="${songId}"]`);
        if (btn) {
            btn.innerHTML = isFavorite ? '⭐' : '☆';
            btn.title = isFavorite ? 'Remove from favorites' : 'Add to favorites';
            btn.dataset.favorite = isFavorite ? 'true' : 'false';
            if (isFavorite) {
                btn.classList.add('favorite-active');
            } else {
                btn.classList.remove('favorite-active');
            }
        }
    }

    createRow(song) {
        const row = document.createElement('tr');
        row.dataset.id = song.id;
        row.className = 'song-row';

        // Make entire row clickable for selection (except when editing)
        row.addEventListener('click', (e) => {
            // Don't select if clicking on buttons or input fields
            if (e.target.classList.contains('delete-btn') ||
                e.target.classList.contains('youtube-btn') ||
                e.target.classList.contains('favorite-btn') ||
                e.target.closest('.favorite-btn') ||
                e.target.tagName === 'INPUT') {
                return;
            }
            // Don't select if double-clicking (for editing)
            if (e.detail === 2) {
                return;
            }
            // Don't select if row is in edit mode
            if (this.editingRowId === song.id) {
                return;
            }
            this.selectRow(song.id);
        });

        // Artiest
        const artistCell = this.createEditableCell(song.artist, 'artist', song.id);
        row.appendChild(artistCell);

        // Songtitel (clickable for selection)
        const titleCell = document.createElement('td');
        titleCell.className = 'title-cell editable';
        titleCell.textContent = song.title || '';
        titleCell.dataset.field = 'title';
        titleCell.dataset.songId = song.id;

        row.appendChild(titleCell);

        // Favorite button
        const favoriteCell = document.createElement('td');
        favoriteCell.className = 'favorite-cell';
        const favoriteBtn = document.createElement('button');
        favoriteBtn.className = 'favorite-btn';
        favoriteBtn.innerHTML = song.favorite ? '⭐' : '☆';
        favoriteBtn.title = song.favorite ? 'Remove from favorites' : 'Add to favorites';
        favoriteBtn.dataset.songId = song.id;
        favoriteBtn.dataset.favorite = song.favorite ? 'true' : 'false';
        if (song.favorite) {
            favoriteBtn.classList.add('favorite-active');
        }

        // Hide favorite button for guests
        const isGuest = this.songManager && this.songManager.firebaseManager && this.songManager.firebaseManager.isGuest && this.songManager.firebaseManager.isGuest();
        if (isGuest) {
            favoriteBtn.style.display = 'none';
        }

        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.onToggleFavorite) {
                this.onToggleFavorite(song.id);
            }
        });
        favoriteCell.appendChild(favoriteBtn);
        row.appendChild(favoriteCell);

        // Verse
        const verseCell = this.createEditableCell(song.verse, 'verse', song.id);
        verseCell.className += ' verse-cell chord-cell';
        row.appendChild(verseCell);

        // Chorus
        const chorusCell = this.createEditableCell(song.chorus, 'chorus', song.id);
        chorusCell.className += ' chorus-cell chord-cell';
        row.appendChild(chorusCell);

        // Pre-Chorus
        const preChorusCell = this.createEditableCell(song.preChorus || '', 'preChorus', song.id);
        preChorusCell.className += ' pre-chorus-cell chord-cell';
        row.appendChild(preChorusCell);

        // Bridge
        const bridgeCell = this.createEditableCell(song.bridge || '', 'bridge', song.id);
        bridgeCell.className += ' bridge-cell chord-cell';
        row.appendChild(bridgeCell);

        // Actions cell with Delete and YouTube buttons
        const actionsCell = document.createElement('td');
        actionsCell.className = 'actions-cell';

        // Delete button first
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '🗑️';
        deleteBtn.title = 'Delete';

        // Hide delete button for guests
        if (isGuest) {
            deleteBtn.style.display = 'none';
        }

        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete "${song.title || 'this song'}"?`)) {
                if (this.onDelete) {
                    this.onDelete(song.id);
                }
            }
        });
        actionsCell.appendChild(deleteBtn);

        // YouTube button - always create but hide if no URL exists
        // Always check fresh data from songManager
        const currentSong = this.songManager.getSongById(song.id);
        const hasYouTubeUrl = currentSong && currentSong.youtubeUrl && currentSong.youtubeUrl.trim();
        const hasExternalUrl = currentSong && currentSong.externalUrl && currentSong.externalUrl.trim();

        const youtubeBtn = document.createElement('button');
        youtubeBtn.className = 'youtube-btn';
        youtubeBtn.innerHTML = '<svg viewBox="0 0 68 48" xmlns="http://www.w3.org/2000/svg" width="16" height="16"><path d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.63-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#FF0000"/><path d="M 45,24 27,14 27,34" fill="#fff"/></svg>';
        youtubeBtn.title = 'Play YouTube';
        youtubeBtn.dataset.songId = song.id;

        // Hide button if no YouTube URL
        if (!hasYouTubeUrl) {
            youtubeBtn.style.display = 'none';
        }

        youtubeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.onPlayYouTube) {
                this.onPlayYouTube(song.id);
            }
        });
        actionsCell.appendChild(youtubeBtn);

        // External URL button
        const externalBtn = document.createElement('button');
        externalBtn.className = 'external-url-btn';
        externalBtn.textContent = '🌐';
        externalBtn.title = 'Open external website';

        if (!hasExternalUrl) {
            externalBtn.style.display = 'none';
        }

        externalBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            let url = currentSong.externalUrl;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            window.open(url, '_blank');
        });
        actionsCell.appendChild(externalBtn);

        row.appendChild(actionsCell);

        return row;
    }

    toggleEditMode(songId) {
        const row = this.tbody.querySelector(`tr[data-id="${songId}"]`);
        if (!row) return;

        const song = this.songManager.getSongById(songId);
        if (!song) return;

        if (this.editingRowId === songId) {
            // Save and exit edit mode
            this.saveRowEdit(songId, row);
            this.editingRowId = null;
        } else {
            // Enter edit mode
            if (this.editingRowId) {
                // Save previous row first
                const prevRow = this.tbody.querySelector(`tr[data-id="${this.editingRowId}"]`);
                if (prevRow) {
                    this.saveRowEdit(this.editingRowId, prevRow);
                }
            }
            this.editingRowId = songId;
            this.enterEditMode(songId, row, song);
        }
    }

    enterEditMode(songId, row, song) {
        const cells = row.querySelectorAll('td');
        const fieldOrder = ['artist', 'title', 'favorite', 'verse', 'chorus', 'preChorus', 'bridge'];
        const inputs = [];

        cells.forEach((cell, index) => {
            // Skip actions cell (last one)
            if (index >= cells.length - 1) return;

            // Skip favorite cell (it's a button, not editable)
            if (cell.classList.contains('favorite-cell')) return;

            const field = fieldOrder[index];
            if (!field) return;

            const currentValue = cell.textContent.trim();

            // Create wrapper for input and chord button (for chord fields)
            const chordFields = ['verse', 'chorus', 'preChorus', 'bridge'];
            const isChordField = chordFields.includes(field);

            if (isChordField) {
                // Create wrapper div for input and button
                const inputWrapper = document.createElement('div');
                inputWrapper.className = 'chord-input-wrapper';

                const input = document.createElement('input');
                input.type = 'text';
                input.value = currentValue;
                input.className = 'row-edit-input';
                input.dataset.field = field;
                input.dataset.songId = songId;
                input.spellcheck = false;
                input.setAttribute('autocorrect', 'off');
                input.setAttribute('autocapitalize', 'none');
                inputs.push(input);

                // Make input wider on focus to show all content
                input.addEventListener('focus', () => {
                    input.classList.add('input-focused');

                    // Calculate width based on actual content width
                    const minWidth = 200;
                    const maxWidth = Math.min(1000, window.innerWidth * 0.95);

                    // Create a temporary span to measure text width
                    const measureSpan = document.createElement('span');
                    measureSpan.style.position = 'absolute';
                    measureSpan.style.visibility = 'hidden';
                    measureSpan.style.whiteSpace = 'pre';
                    measureSpan.style.font = window.getComputedStyle(input).font;
                    measureSpan.textContent = input.value || input.placeholder || 'M';
                    document.body.appendChild(measureSpan);

                    const textWidth = measureSpan.offsetWidth;
                    document.body.removeChild(measureSpan);

                    // Add padding (36px = 18px left + 18px right)
                    const contentWidth = textWidth + 36;
                    const finalWidth = Math.max(minWidth, Math.min(maxWidth, contentWidth));
                    input.style.width = `${finalWidth}px`;
                    input.style.minWidth = `${finalWidth}px`;
                });

                input.addEventListener('blur', () => {
                    input.classList.remove('input-focused');
                    input.style.width = '';
                    input.style.minWidth = '';
                });

                // Create chord modal button
                const chordBtn = document.createElement('button');
                chordBtn.type = 'button';
                chordBtn.className = 'chord-modal-btn';
                chordBtn.innerHTML = '🎵';
                chordBtn.title = 'Add chords';
                chordBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.chordModal) {
                        this.chordModal.show(input, field);
                    }
                });

                inputWrapper.appendChild(input);
                inputWrapper.appendChild(chordBtn);

                // Tab navigation between inputs
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Tab' || e.key === 'Enter') {
                        e.preventDefault();
                        const currentIndex = inputs.indexOf(input);
                        if (currentIndex < inputs.length - 1) {
                            inputs[currentIndex + 1].focus();
                            inputs[currentIndex + 1].select();
                        } else {
                            // Last field - save and exit
                            this.saveRowEdit(songId, row);
                            this.editingRowId = null;
                            const editBtn = row.querySelector('.edit-btn');
                            if (editBtn) {
                                editBtn.textContent = '✏️';
                                editBtn.title = 'Edit';
                            }
                            const cancelBtn = row.querySelector('.cancel-btn');
                            if (cancelBtn) {
                                cancelBtn.classList.add('hidden');
                            }
                        }
                    } else if (e.key === 'Escape') {
                        // Cancel editing
                        this.cancelRowEdit(songId, row, song);
                    }
                });

                cell.textContent = '';
                cell.appendChild(inputWrapper);
            } else {
                // Regular input field (non-chord)
                const input = document.createElement('input');
                input.type = 'text';
                input.value = currentValue;
                input.className = 'row-edit-input';
                input.dataset.field = field;
                input.dataset.songId = songId;
                input.spellcheck = false;
                input.setAttribute('autocorrect', 'off');
                input.setAttribute('autocapitalize', 'none');
                inputs.push(input);

                // Make input wider on focus to show all content
                input.addEventListener('focus', () => {
                    input.classList.add('input-focused');

                    // Calculate width based on actual content width
                    const minWidth = 200;
                    const maxWidth = Math.min(1000, window.innerWidth * 0.95);

                    // Create a temporary span to measure text width
                    const measureSpan = document.createElement('span');
                    measureSpan.style.position = 'absolute';
                    measureSpan.style.visibility = 'hidden';
                    measureSpan.style.whiteSpace = 'pre';
                    measureSpan.style.font = window.getComputedStyle(input).font;
                    measureSpan.textContent = input.value || input.placeholder || 'M';
                    document.body.appendChild(measureSpan);

                    const textWidth = measureSpan.offsetWidth;
                    document.body.removeChild(measureSpan);

                    // Add padding (36px = 18px left + 18px right)
                    const contentWidth = textWidth + 36;
                    const finalWidth = Math.max(minWidth, Math.min(maxWidth, contentWidth));
                    input.style.width = `${finalWidth}px`;
                    input.style.minWidth = `${finalWidth}px`;
                });

                input.addEventListener('blur', () => {
                    input.classList.remove('input-focused');
                    input.style.width = '';
                    input.style.minWidth = '';
                });

                // Tab navigation between inputs
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Tab' || e.key === 'Enter') {
                        e.preventDefault();
                        const currentIndex = inputs.indexOf(input);
                        if (currentIndex < inputs.length - 1) {
                            inputs[currentIndex + 1].focus();
                            inputs[currentIndex + 1].select();
                        } else {
                            // Last field - save and exit
                            this.saveRowEdit(songId, row);
                            this.editingRowId = null;
                            const editBtn = row.querySelector('.edit-btn');
                            if (editBtn) {
                                editBtn.textContent = '✏️';
                                editBtn.title = 'Edit';
                            }
                            const cancelBtn = row.querySelector('.cancel-btn');
                            if (cancelBtn) {
                                cancelBtn.classList.add('hidden');
                            }
                        }
                    } else if (e.key === 'Escape') {
                        // Cancel editing
                        this.cancelRowEdit(songId, row, song);
                    }
                });

                cell.textContent = '';
                cell.appendChild(input);
            }
        });

        // Focus first input
        if (inputs.length > 0) {
            inputs[0].focus();
            inputs[0].select();
        }
    }

    cancelRowEdit(songId, row, song) {
        const inputs = row.querySelectorAll('.row-edit-input');

        inputs.forEach(input => {
            const field = input.dataset.field;
            if (field && field !== 'favorite') {
                const originalValue = song[field] || '';
                const cell = input.closest('td');
                if (cell) {
                    // Check if input is in a wrapper (chord field)
                    const wrapper = input.parentElement;
                    if (wrapper && wrapper.classList.contains('chord-input-wrapper')) {
                        // Remove the entire wrapper
                        wrapper.remove();
                    } else {
                        // Regular input, just remove it
                        input.remove();
                    }
                    cell.textContent = originalValue;
                }
            } else {
                // Remove input even if field is not found
                const cell = input.closest('td');
                if (cell) {
                    // Try to get original value from cell or song
                    const field = input.dataset.field || cell.dataset.field;
                    const originalValue = field && song[field] ? song[field] : '';

                    // Check if input is in a wrapper (chord field)
                    const wrapper = input.parentElement;
                    if (wrapper && wrapper.classList.contains('chord-input-wrapper')) {
                        // Remove the entire wrapper
                        wrapper.remove();
                    } else {
                        // Regular input, just remove it
                        input.remove();
                    }
                    cell.textContent = originalValue;
                }
            }
        });

        // Make sure all inputs and wrappers are removed
        const remainingWrappers = row.querySelectorAll('.chord-input-wrapper');
        remainingWrappers.forEach(wrapper => {
            const cell = wrapper.closest('td');
            if (cell) {
                const input = wrapper.querySelector('.row-edit-input');
                const field = input ? input.dataset.field : null;
                const originalValue = field && song[field] ? song[field] : '';
                cell.textContent = originalValue;
                wrapper.remove();
            }
        });

        const remainingInputs = row.querySelectorAll('.row-edit-input');
        remainingInputs.forEach(input => {
            const cell = input.closest('td');
            if (cell) {
                const field = input.dataset.field;
                const originalValue = field && song[field] ? song[field] : '';
                cell.textContent = originalValue;
                input.remove();
            }
        });

        this.editingRowId = null;
    }

    saveRowEdit(songId, row) {
        const inputs = row.querySelectorAll('.row-edit-input');
        const updates = {};

        inputs.forEach(input => {
            const field = input.dataset.field;
            const value = input.value.trim();
            updates[field] = value;

            // Restore cell content - check if input is in a wrapper
            const wrapper = input.parentElement;
            const cell = wrapper.classList.contains('chord-input-wrapper')
                ? wrapper.closest('td')
                : input.closest('td');

            if (cell) {
                cell.textContent = value;
                // Remove wrapper if it exists, otherwise just remove input
                if (wrapper.classList.contains('chord-input-wrapper')) {
                    wrapper.remove();
                } else {
                    input.remove();
                }
            }
        });

        // Save all updates
        if (this.onCellEdit) {
            Object.keys(updates).forEach(field => {
                this.onCellEdit(songId, field, updates[field]);
            });
        }

    }

    createEditableCell(value, field, songId) {
        const cell = document.createElement('td');
        cell.className = 'editable';
        cell.textContent = value || '';
        cell.dataset.field = field;
        cell.dataset.songId = songId;

        return cell;
    }

    startEditing(cell, field, songId) {
        const currentValue = cell.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentValue;
        input.className = 'edit-input';
        input.spellcheck = false;
        input.setAttribute('autocorrect', 'off');
        input.setAttribute('autocapitalize', 'none');

        // Define field order for tab navigation
        const fieldOrder = ['artist', 'title', 'verse', 'chorus', 'preChorus', 'bridge'];
        const currentIndex = fieldOrder.indexOf(field);

        const finishEditing = () => {
            const newValue = input.value.trim();
            cell.textContent = newValue;
            if (this.onCellEdit) {
                this.onCellEdit(songId, field, newValue);
            }
        };

        const cancelEditing = () => {
            cell.textContent = currentValue;
        };

        const moveToNextField = () => {
            // Hide modal when moving to next field
            if (this.chordModal) {
                this.chordModal.hide();
            }

            if (currentIndex < fieldOrder.length - 1) {
                const nextField = fieldOrder[currentIndex + 1];
                const row = cell.closest('tr');
                const nextCell = row.querySelector(`td[data-field="${nextField}"]`) ||
                    row.querySelector(`td.title-cell[data-field="${nextField}"]`);

                if (nextCell) {
                    finishEditing();
                    // Small delay to ensure the previous edit is saved
                    setTimeout(() => {
                        this.startEditing(nextCell, nextField, songId);
                    }, 50);
                } else {
                    finishEditing();
                }
            } else {
                finishEditing();
            }
        };

        input.addEventListener('blur', (e) => {
            // Don't finish if we're moving to next field
            if (e.relatedTarget && e.relatedTarget.tagName === 'INPUT') {
                return;
            }
            finishEditing();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                moveToNextField();
            } else if (e.key === 'Tab') {
                e.preventDefault();
                moveToNextField();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEditing();
                input.remove();
                cell.style.display = '';
            }
        });

        cell.textContent = '';
        cell.appendChild(input);
        input.focus();
        input.select();
    }

    selectRow(songId, skipCallback = false) {
        this.selectedRowId = songId;
        this.updateSelection();
        if (this.onRowSelect && !skipCallback) {
            this.onRowSelect(songId);
        }
    }


    updateSelection() {
        const rows = this.tbody.querySelectorAll('tr');
        rows.forEach(row => {
            const rowId = parseInt(row.dataset.id);
            const selectedId = this.selectedRowId ? parseInt(this.selectedRowId) : null;
            if (rowId === selectedId) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
        });
    }


    getSelectedRowId() {
        return this.selectedRowId;
    }
}

