// ChordModal - Modal voor akkoord selectie
class ChordModal {
    constructor() {
        this.modal = document.getElementById('chordModal');
        this.closeBtn = document.getElementById('chordModalClose');
        this.customInput = document.getElementById('chordCustomInput');
        this.addCustomBtn = document.getElementById('chordAddCustom');
        this.currentInput = null;
        this.currentField = null;
        
        this.setupChords();
        this.setupEventListeners();
    }

    setupChords() {
        const majorChords = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C#', 'D#', 'F#', 'G#', 'A#', 'Db', 'Eb', 'Gb', 'Ab', 'Bb'];
        const minorChords = ['Cm', 'Dm', 'Em', 'Fm', 'Gm', 'Am', 'Bm', 'C#m', 'D#m', 'F#m', 'G#m', 'A#m', 'Dbm', 'Ebm', 'Gbm', 'Abm', 'Bbm'];
        const susAddChords = ['Csus2', 'Csus4', 'Cadd9', 'Dsus2', 'Dsus4', 'Dsus2', 'Esus4', 'Fsus2', 'Fsus4', 'Gsus2', 'Gsus4', 'Asus2', 'Asus4', 'C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2'];
        const specialChords = ['C7', 'D7', 'E7', 'F7', 'G7', 'A7', 'B7', 'Cm7', 'Dm7', 'Em7', 'Fm7', 'Gm7', 'Am7', 'Bm7', 'Cdim', 'Caug', 'C/B', 'C/A', 'C/G', 'D/F#', 'Am/C'];
        
        this.renderChords('majorChords', majorChords);
        this.renderChords('minorChords', minorChords);
        this.renderChords('susAddChords', susAddChords);
        this.renderChords('specialChords', specialChords);
    }

    renderChords(containerId, chords) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        chords.forEach(chord => {
            const btn = document.createElement('button');
            btn.className = 'chord-btn';
            btn.textContent = chord;
            btn.addEventListener('click', () => this.addChord(chord));
            container.appendChild(btn);
        });
    }

    setupEventListeners() {
        this.closeBtn.addEventListener('click', () => this.hide());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });
        this.addCustomBtn.addEventListener('click', () => this.addCustomChords());
        this.customInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.addCustomChords();
            } else if (e.key === 'Escape') {
                this.hide();
            }
        });
        
        // Toggle category buttons
        const toggleSusAdd = document.getElementById('toggleSusAdd');
        const toggleSpecial = document.getElementById('toggleSpecial');
        const susAddCategory = document.getElementById('susAddCategory');
        const specialCategory = document.getElementById('specialCategory');
        const susAddButtons = document.getElementById('susAddChords');
        const specialButtons = document.getElementById('specialChords');
        
        if (toggleSusAdd) {
            toggleSusAdd.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = susAddButtons.classList.contains('hidden');
                susAddButtons.classList.toggle('hidden');
                toggleSusAdd.textContent = isHidden ? 'Verberg' : 'Toon';
            });
        }
        
        if (toggleSpecial) {
            toggleSpecial.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = specialButtons.classList.contains('hidden');
                specialButtons.classList.toggle('hidden');
                toggleSpecial.textContent = isHidden ? 'Verberg' : 'Toon';
            });
        }
        
        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
                this.hide();
            }
        });
    }

    show(inputElement, field) {
        this.currentInput = inputElement;
        this.currentField = field;
        this.modal.classList.remove('hidden');
        
        // Check if this is a chord field
        const chordFields = ['verse', 'chorus', 'preChorus', 'bridge'];
        if (!chordFields.includes(field)) {
            // Don't show modal for non-chord fields
            return;
        }
        
        // Reset toggle states - hide Sus & Add and Special buttons by default, but keep category visible
        const susAddButtons = document.getElementById('susAddChords');
        const specialButtons = document.getElementById('specialChords');
        const toggleSusAdd = document.getElementById('toggleSusAdd');
        const toggleSpecial = document.getElementById('toggleSpecial');
        
        if (susAddButtons && toggleSusAdd) {
            susAddButtons.classList.add('hidden');
            toggleSusAdd.textContent = 'Toon';
        }
        
        if (specialButtons && toggleSpecial) {
            specialButtons.classList.add('hidden');
            toggleSpecial.textContent = 'Toon';
        }
        
        // Clear custom input and focus on it
        this.customInput.value = '';
        setTimeout(() => {
            this.customInput.focus();
        }, 100);
    }

    hide() {
        this.modal.classList.add('hidden');
        this.currentInput = null;
        this.currentField = null;
        this.customInput.value = '';
    }

    addChord(chord) {
        // Add chord to custom input field instead of directly to table input
        const currentCustomValue = this.customInput.value.trim();
        const separator = currentCustomValue ? ' ' : '';
        this.customInput.value = currentCustomValue + separator + chord;
        
        // Focus on custom input
        this.customInput.focus();
        // Move cursor to end
        const len = this.customInput.value.length;
        this.customInput.setSelectionRange(len, len);
    }

    addCustomChords() {
        if (!this.currentInput) return;
        
        const customChords = this.customInput.value.trim();
        if (customChords) {
            // Get current value from table input
            const currentValue = this.currentInput.value.trim();
            // Add new chords after existing chords with a space
            const separator = currentValue ? ' ' : '';
            this.currentInput.value = currentValue + separator + customChords;
            
            // Clear custom input
            this.customInput.value = '';
            
            // Keep table input focused
            setTimeout(() => {
                this.currentInput.focus();
                // Move cursor to end
                const len = this.currentInput.value.length;
                this.currentInput.setSelectionRange(len, len);
            }, 10);
            
            // Close modal after adding chords
            this.hide();
        }
    }
}

// SetlistManager - Setlist data management
class SetlistManager {
    constructor() {
        this.storageKey = 'popsongSetlists';
        this.setlists = this.loadSetlists();
    }

    loadSetlists() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Error loading setlists:', e);
            return [];
        }
    }

    saveSetlists() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.setlists));
        } catch (e) {
            console.error('Error saving setlists:', e);
        }
    }

    createSetlist(name) {
        const setlist = {
            id: Date.now().toString(),
            name: name,
            songIds: [],
            createdAt: new Date().toISOString()
        };
        this.setlists.push(setlist);
        this.saveSetlists();
        return setlist;
    }

    deleteSetlist(id) {
        this.setlists = this.setlists.filter(sl => sl.id !== id);
        this.saveSetlists();
    }

    getSetlist(id) {
        return this.setlists.find(sl => sl.id === id);
    }

    getAllSetlists() {
        return this.setlists;
    }

    addSongToSetlist(setlistId, songId) {
        const setlist = this.getSetlist(setlistId);
        if (setlist && !setlist.songIds.includes(songId)) {
            setlist.songIds.push(songId);
            this.saveSetlists();
            return true;
        }
        return false;
    }

    removeSongFromSetlist(setlistId, songId) {
        const setlist = this.getSetlist(setlistId);
        if (setlist) {
            setlist.songIds = setlist.songIds.filter(id => id !== songId);
            this.saveSetlists();
            return true;
        }
        return false;
    }

    getSongsInSetlist(setlistId, allSongs) {
        const setlist = this.getSetlist(setlistId);
        if (!setlist) return [];
        return allSongs.filter(song => setlist.songIds.includes(song.id));
    }

    importSetlists(importedSetlists) {
        // Validate and normalize imported setlists
        const normalizedSetlists = importedSetlists.map(setlist => ({
            id: setlist.id || Date.now().toString() + Math.random(),
            name: setlist.name || 'Unnamed Setlist',
            songIds: Array.isArray(setlist.songIds) ? setlist.songIds : [],
            createdAt: setlist.createdAt || new Date().toISOString()
        }));

        // Replace all setlists
        this.setlists = normalizedSetlists;
        this.saveSetlists();
    }
}

// SongManager - Data management en localStorage
class SongManager {
    constructor() {
        this.storageKey = 'popsongChordBook';
        this.songs = this.loadSongs();
        this.nextId = this.songs.length > 0 
            ? Math.max(...this.songs.map(s => s.id)) + 1 
            : 1;
    }

    loadSongs() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const songs = JSON.parse(stored);
                // Ensure all songs have favorite property
                return songs.map(song => ({
                    ...song,
                    favorite: song.favorite || false
                }));
            }
        } catch (error) {
            console.error('Error loading songs:', error);
        }
        return [];
    }

    saveSongs() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.songs));
        } catch (error) {
            console.error('Error saving songs:', error);
        }
    }

    deleteAllSongs() {
        this.songs = [];
        this.nextId = 1;
        this.saveSongs();
    }

    addSong(song) {
        const newSong = {
            id: this.nextId++,
            artist: song.artist || '',
            title: song.title || '',
            verse: song.verse || '',
            chorus: song.chorus || '',
            preChorus: song.preChorus || '',
            bridge: song.bridge || '',
            favorite: song.favorite || false
        };
        this.songs.push(newSong);
        this.saveSongs();
        return newSong;
    }

    toggleFavorite(id) {
        const song = this.songs.find(s => s.id === id);
        if (song) {
            song.favorite = !song.favorite;
            this.saveSongs();
            return song;
        }
        return null;
    }

    getAllSongs() {
        return this.songs;
    }

    getFilteredSongs(filter) {
        if (filter === 'favorites') {
            return this.songs.filter(song => song.favorite === true);
        }
        return this.songs;
    }

    importSongs(importedSongs, replace = true) {
        // Validate and normalize imported songs
        const normalizedSongs = importedSongs.map(song => ({
            id: song.id || this.nextId++,
            artist: song.artist || '',
            title: song.title || '',
            verse: song.verse || '',
            chorus: song.chorus || '',
            preChorus: song.preChorus || '',
            bridge: song.bridge || '',
            favorite: song.favorite || false
        }));

        // Update nextId to avoid conflicts
        if (normalizedSongs.length > 0) {
            const maxId = Math.max(...normalizedSongs.map(s => s.id));
            this.nextId = Math.max(this.nextId, maxId + 1);
        }

        if (replace) {
            // Replace all songs
            this.songs = normalizedSongs;
        } else {
            // Add songs, checking for duplicates
            const existingSongs = this.songs;
            const newSongs = [];
            const duplicates = [];

            normalizedSongs.forEach(importedSong => {
                // Check if song already exists (case-insensitive comparison of artist + title)
                const normalizedArtist = (importedSong.artist || '').trim().toLowerCase();
                const normalizedTitle = (importedSong.title || '').trim().toLowerCase();
                
                const isDuplicate = existingSongs.some(existingSong => {
                    const existingArtist = (existingSong.artist || '').trim().toLowerCase();
                    const existingTitle = (existingSong.title || '').trim().toLowerCase();
                    return existingArtist === normalizedArtist && existingTitle === normalizedTitle;
                });

                if (isDuplicate) {
                    duplicates.push(`${importedSong.artist} - ${importedSong.title}`);
                } else {
                    newSongs.push(importedSong);
                }
            });

            // Add new songs
            this.songs = [...existingSongs, ...newSongs];
            
            // Return info about duplicates
            return {
                added: newSongs.length,
                duplicates: duplicates.length,
                duplicateSongs: duplicates
            };
        }

        this.saveSongs();
        return {
            added: normalizedSongs.length,
            duplicates: 0,
            duplicateSongs: []
        };
    }

    updateSong(id, updates) {
        const song = this.songs.find(s => s.id === id);
        if (song) {
            Object.assign(song, updates);
            this.saveSongs();
            return song;
        }
        return null;
    }

    deleteSong(id) {
        const index = this.songs.findIndex(s => s.id === id);
        if (index !== -1) {
            this.songs.splice(index, 1);
            this.saveSongs();
            return true;
        }
        return false;
    }

    getAllSongs() {
        return this.songs;
    }

    getSongById(id) {
        return this.songs.find(s => s.id === id);
    }
}

// TableRenderer - Tabel rendering en updates
class TableRenderer {
    constructor(songManager, onRowSelect, onCellEdit, onDelete, chordModal, onToggleFavorite, onPlayYouTube) {
        this.songManager = songManager;
        this.onRowSelect = onRowSelect;
        this.onCellEdit = onCellEdit;
        this.onDelete = onDelete;
        this.chordModal = chordModal;
        this.onToggleFavorite = onToggleFavorite;
        this.onPlayYouTube = onPlayYouTube;
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
            btn.title = isFavorite ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten';
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
                e.target.classList.contains('edit-btn') ||
                e.target.classList.contains('cancel-btn') ||
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

        // Songtitel (clickable for selection, editable via double-click)
        const titleCell = document.createElement('td');
        titleCell.className = 'title-cell editable';
        titleCell.textContent = song.title || '';
        titleCell.dataset.field = 'title';
        titleCell.dataset.songId = song.id;
        
        // Double click edits the title
        titleCell.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.startEditing(titleCell, 'title', song.id);
        });
        
        row.appendChild(titleCell);

        // Favorite button
        const favoriteCell = document.createElement('td');
        favoriteCell.className = 'favorite-cell';
        const favoriteBtn = document.createElement('button');
        favoriteBtn.className = 'favorite-btn';
        favoriteBtn.innerHTML = song.favorite ? '⭐' : '☆';
        favoriteBtn.title = song.favorite ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten';
        favoriteBtn.dataset.songId = song.id;
        favoriteBtn.dataset.favorite = song.favorite ? 'true' : 'false';
        if (song.favorite) {
            favoriteBtn.classList.add('favorite-active');
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
        verseCell.className += ' chord-cell';
        row.appendChild(verseCell);

        // Chorus
        const chorusCell = this.createEditableCell(song.chorus, 'chorus', song.id);
        chorusCell.className += ' chorus-cell chord-cell';
        row.appendChild(chorusCell);

        // Pre-Chorus
        const preChorusCell = this.createEditableCell(song.preChorus || '', 'preChorus', song.id);
        preChorusCell.className += ' chord-cell';
        row.appendChild(preChorusCell);

        // Bridge
        const bridgeCell = this.createEditableCell(song.bridge || '', 'bridge', song.id);
        bridgeCell.className += ' chord-cell';
        row.appendChild(bridgeCell);

        // YouTube URL cell (hidden by default, shown in edit mode)
        const youtubeUrlCell = document.createElement('td');
        youtubeUrlCell.className = 'youtube-url-cell hidden';
        youtubeUrlCell.textContent = song.youtubeUrl || '';
        youtubeUrlCell.dataset.field = 'youtubeUrl';
        youtubeUrlCell.dataset.songId = song.id;
        row.appendChild(youtubeUrlCell);

        // Actions cell with Edit, Cancel, Save and Delete buttons
        const actionsCell = document.createElement('td');
        actionsCell.className = 'actions-cell';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.textContent = '✏️';
        editBtn.title = 'Bewerken';
        editBtn.dataset.songId = song.id;
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleEditMode(song.id);
        });
        actionsCell.appendChild(editBtn);
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'cancel-btn hidden';
        cancelBtn.textContent = '❌';
        cancelBtn.title = 'Annuleren';
        cancelBtn.dataset.songId = song.id;
        cancelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const row = this.tbody.querySelector(`tr[data-id="${song.id}"]`);
            if (row) {
                this.cancelRowEdit(song.id, row, song);
            }
        });
        actionsCell.appendChild(cancelBtn);
        
        // YouTube button - only show if URL exists
        // Always check fresh data from songManager
        const currentSong = this.songManager.getSongById(song.id);
        const hasYouTubeUrl = currentSong && currentSong.youtubeUrl && currentSong.youtubeUrl.trim();
        
        // Debug logging
        if (song.id === 1 || song.id === 2) {
            console.log('CREATE ROW - Song ID:', song.id);
            console.log('  - Song param youtubeUrl:', song.youtubeUrl);
            console.log('  - Current song from manager:', currentSong);
            console.log('  - Current song youtubeUrl:', currentSong?.youtubeUrl);
            console.log('  - Has YouTube URL:', hasYouTubeUrl);
        }
        
        if (hasYouTubeUrl) {
            const youtubeBtn = document.createElement('button');
            youtubeBtn.className = 'youtube-btn';
            youtubeBtn.textContent = '▶️';
            youtubeBtn.title = 'YouTube afspelen';
            youtubeBtn.dataset.songId = song.id;
            youtubeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.onPlayYouTube) {
                    this.onPlayYouTube(song.id);
                }
            });
            actionsCell.appendChild(youtubeBtn);
        }
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '🗑️';
        deleteBtn.title = 'Verwijderen';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Weet je zeker dat je "${song.title || 'dit liedje'}" wilt verwijderen?`)) {
                if (this.onDelete) {
                    this.onDelete(song.id);
                }
            }
        });
        actionsCell.appendChild(deleteBtn);
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
        const fieldOrder = ['artist', 'title', 'favorite', 'verse', 'chorus', 'preChorus', 'bridge', 'youtubeUrl'];
        const inputs = [];
        
        // Show YouTube URL cell in edit mode
        const youtubeUrlCell = row.querySelector('.youtube-url-cell');
        if (youtubeUrlCell) {
            youtubeUrlCell.classList.remove('hidden');
        }
        
        cells.forEach((cell, index) => {
            // Skip actions cell (last one)
            if (index >= cells.length - 1) return;
            
            // Skip favorite cell (it's a button, not editable)
            if (cell.classList.contains('favorite-cell')) return;
            
            const field = fieldOrder[index];
            if (!field) return;
            
            // Handle YouTube URL field specially
            if (field === 'youtubeUrl') {
                const currentValue = cell.textContent.trim();
                const input = document.createElement('input');
                input.type = 'url';
                input.value = currentValue;
                input.className = 'row-edit-input youtube-url-input';
                input.placeholder = 'https://www.youtube.com/watch?v=...';
                input.dataset.field = field;
                input.dataset.songId = songId;
                inputs.push(input);
                
                // Tab navigation
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
                                editBtn.title = 'Bewerken';
                            }
                            const cancelBtn = row.querySelector('.cancel-btn');
                            if (cancelBtn) {
                                cancelBtn.classList.add('hidden');
                            }
                        }
                    } else if (e.key === 'Escape') {
                        this.cancelRowEdit(songId, row, song);
                    }
                });
                
                cell.textContent = '';
                cell.appendChild(input);
                return;
            }

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
                chordBtn.title = 'Akkoorden toevoegen';
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
                                editBtn.title = 'Bewerken';
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
                                editBtn.title = 'Bewerken';
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

        // Update edit button to save button
        const editBtn = row.querySelector('.edit-btn');
        if (editBtn) {
            editBtn.textContent = '💾';
            editBtn.title = 'Opslaan';
        }
        
        // Show cancel button
        const cancelBtn = row.querySelector('.cancel-btn');
        if (cancelBtn) {
            cancelBtn.classList.remove('hidden');
        }
    }

    cancelRowEdit(songId, row, song) {
        const inputs = row.querySelectorAll('.row-edit-input');
        
        // Hide YouTube URL cell
        const youtubeUrlCell = row.querySelector('.youtube-url-cell');
        if (youtubeUrlCell) {
            youtubeUrlCell.classList.add('hidden');
        }
        
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

        // Update edit button
        const editBtn = row.querySelector('.edit-btn');
        if (editBtn) {
            editBtn.textContent = '✏️';
            editBtn.title = 'Bewerken';
        }
        
        // Hide cancel button
        const cancelBtn = row.querySelector('.cancel-btn');
        if (cancelBtn) {
            cancelBtn.classList.add('hidden');
        }
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

        // Update edit button
        const editBtn = row.querySelector('.edit-btn');
        if (editBtn) {
            editBtn.textContent = '✏️';
            editBtn.title = 'Bewerken';
        }
        
        // Hide cancel button
        const cancelBtn = row.querySelector('.cancel-btn');
        if (cancelBtn) {
            cancelBtn.classList.add('hidden');
        }
    }

    createEditableCell(value, field, songId) {
        const cell = document.createElement('td');
        cell.className = 'editable';
        cell.textContent = value || '';
        cell.dataset.field = field;
        cell.dataset.songId = songId;


        cell.addEventListener('dblclick', () => {
            this.startEditing(cell, field, songId);
        });

        return cell;
    }

    startEditing(cell, field, songId) {
        const currentValue = cell.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentValue;
        input.className = 'edit-input';

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

// Sorter - Sorteer logica
class Sorter {
    constructor() {
        this.currentSort = {
            column: null,
            direction: 'asc'
        };
    }

    sort(songs, column, currentDirection) {
        const direction = currentDirection === 'asc' ? 'desc' : 'asc';
        this.currentSort = { column, direction };

        const sorted = [...songs].sort((a, b) => {
            // Special handling for favorite column (boolean)
            if (column === 'favorite') {
                const aVal = a.favorite ? 1 : 0;
                const bVal = b.favorite ? 1 : 0;
                if (direction === 'asc') {
                    return bVal - aVal; // Favorites first
                } else {
                    return aVal - bVal; // Non-favorites first
                }
            }
            
            let aVal = a[column] || '';
            let bVal = b[column] || '';

            // Normalize for sorting (case-insensitive)
            aVal = aVal.toString().toLowerCase().trim();
            bVal = bVal.toString().toLowerCase().trim();

            if (direction === 'asc') {
                return aVal.localeCompare(bVal, 'nl');
            } else {
                return bVal.localeCompare(aVal, 'nl');
            }
        });

        return { sorted, direction };
    }

    getCurrentSort() {
        return this.currentSort;
    }
}

// SongDetailModal - Modal voor song details weergave
class SongDetailModal {
    constructor(songManager, onNavigate) {
        this.songManager = songManager;
        this.onNavigate = onNavigate;
        this.currentSongId = null;
        this.allSongs = [];
        this.modal = document.getElementById('songDetailModal');
        this.closeBtn = document.getElementById('songDetailModalClose');
        this.prevBtn = document.getElementById('songDetailPrev');
        this.nextBtn = document.getElementById('songDetailNext');
        this.artistElement = document.getElementById('songDetailArtist');
        this.titleElement = document.getElementById('songDetailTitle');
        this.sections = {
            verse: {
                section: document.getElementById('verseSection'),
                content: document.getElementById('verseContent')
            },
            preChorus: {
                section: document.getElementById('preChorusSection'),
                content: document.getElementById('preChorusContent')
            },
            chorus: {
                section: document.getElementById('chorusSection'),
                content: document.getElementById('chorusContent')
            },
            bridge: {
                section: document.getElementById('bridgeSection'),
                content: document.getElementById('bridgeContent')
            }
        };
        this.setupEventListeners();
    }

    setSongs(songs) {
        this.allSongs = songs;
    }

    setupEventListeners() {
        this.closeBtn.addEventListener('click', () => this.hide());
        this.prevBtn.addEventListener('click', () => this.navigatePrevious());
        this.nextBtn.addEventListener('click', () => this.navigateNext());
        
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.modal.classList.contains('hidden')) {
                if (e.key === 'Escape') {
                    this.hide();
                } else if (e.key === 'ArrowLeft') {
                    this.navigatePrevious();
                } else if (e.key === 'ArrowRight') {
                    this.navigateNext();
                }
            }
        });
    }

    navigatePrevious() {
        if (!this.currentSongId || this.allSongs.length === 0) return;
        
        const currentIndex = this.allSongs.findIndex(song => song.id === this.currentSongId);
        if (currentIndex > 0) {
            const previousSong = this.allSongs[currentIndex - 1];
            if (this.onNavigate) {
                this.onNavigate(previousSong.id, true);
            }
        }
    }

    navigateNext() {
        if (!this.currentSongId || this.allSongs.length === 0) return;
        
        const currentIndex = this.allSongs.findIndex(song => song.id === this.currentSongId);
        if (currentIndex < this.allSongs.length - 1) {
            const nextSong = this.allSongs[currentIndex + 1];
            if (this.onNavigate) {
                this.onNavigate(nextSong.id, true);
            }
        }
    }

    show(song) {
        if (!song) {
            this.hide();
            return;
        }

        this.currentSongId = song.id;

        // Update artist and title
        if (this.artistElement) {
            this.artistElement.textContent = song.artist || 'Onbekende artiest';
        }
        if (this.titleElement) {
            this.titleElement.textContent = song.title || 'Geen titel';
        }

        // Update navigation buttons
        this.updateNavigationButtons();

        // Verse (only show if has content)
        if (song.verse && song.verse.trim()) {
            if (this.sections.verse && this.sections.verse.content) {
                this.sections.verse.content.textContent = song.verse;
                if (this.sections.verse.section) {
                    this.sections.verse.section.classList.remove('hidden');
                }
            }
        } else {
            if (this.sections.verse && this.sections.verse.section) {
                this.sections.verse.section.classList.add('hidden');
            }
        }

        // Pre-Chorus (only show if has content)
        if (song.preChorus && song.preChorus.trim()) {
            if (this.sections.preChorus && this.sections.preChorus.content) {
                this.sections.preChorus.content.textContent = song.preChorus;
                if (this.sections.preChorus.section) {
                    this.sections.preChorus.section.classList.remove('hidden');
                }
            }
        } else {
            if (this.sections.preChorus && this.sections.preChorus.section) {
                this.sections.preChorus.section.classList.add('hidden');
            }
        }

        // Chorus (only show if has content)
        if (song.chorus && song.chorus.trim()) {
            if (this.sections.chorus && this.sections.chorus.content) {
                this.sections.chorus.content.textContent = song.chorus;
                if (this.sections.chorus.section) {
                    this.sections.chorus.section.classList.remove('hidden');
                }
            }
        } else {
            if (this.sections.chorus && this.sections.chorus.section) {
                this.sections.chorus.section.classList.add('hidden');
            }
        }

        // Bridge (only show if has content)
        if (song.bridge && song.bridge.trim()) {
            if (this.sections.bridge && this.sections.bridge.content) {
                this.sections.bridge.content.textContent = song.bridge;
                if (this.sections.bridge.section) {
                    this.sections.bridge.section.classList.remove('hidden');
                }
            }
        } else {
            if (this.sections.bridge && this.sections.bridge.section) {
                this.sections.bridge.section.classList.add('hidden');
            }
        }

        // Show modal
        if (this.modal) {
            this.modal.classList.remove('hidden');
        }
    }

    updateNavigationButtons() {
        if (!this.currentSongId || this.allSongs.length === 0) {
            this.prevBtn.style.opacity = '0.5';
            this.prevBtn.style.cursor = 'not-allowed';
            this.nextBtn.style.opacity = '0.5';
            this.nextBtn.style.cursor = 'not-allowed';
            return;
        }

        const currentIndex = this.allSongs.findIndex(song => song.id === this.currentSongId);
        
        // Previous button
        if (currentIndex > 0) {
            this.prevBtn.style.opacity = '1';
            this.prevBtn.style.cursor = 'pointer';
            this.prevBtn.disabled = false;
        } else {
            this.prevBtn.style.opacity = '0.5';
            this.prevBtn.style.cursor = 'not-allowed';
            this.prevBtn.disabled = true;
        }

        // Next button
        if (currentIndex < this.allSongs.length - 1) {
            this.nextBtn.style.opacity = '1';
            this.nextBtn.style.cursor = 'pointer';
            this.nextBtn.disabled = false;
        } else {
            this.nextBtn.style.opacity = '0.5';
            this.nextBtn.style.cursor = 'not-allowed';
            this.nextBtn.disabled = true;
        }
    }

    hide() {
        this.modal.classList.add('hidden');
        this.currentSongId = null;
    }
}

// Main Application
class App {
    constructor() {
        this.songManager = new SongManager();
        this.setlistManager = new SetlistManager();
        this.sorter = new Sorter();
        this.chordModal = new ChordModal();
        this.songDetailModal = new SongDetailModal(
            this.songManager,
            (songId, skipTableSelection) => this.navigateToSong(songId, skipTableSelection),
            () => this.loadAndRender(),
            this.chordModal,
            (songId) => this.handleToggleFavorite(songId)
        );
        this.currentFilter = 'all';
        this.currentSetlistId = null;
        this.searchTerm = '';
        this.viewMode = 'full'; // 'simple' or 'full'
        
        this.tableRenderer = new TableRenderer(
            this.songManager,
            (songId) => this.handleRowSelect(songId),
            (songId, field, value) => this.handleCellEdit(songId, field, value),
            (songId) => this.handleDelete(songId),
            this.chordModal,
            (songId) => this.handleToggleFavorite(songId),
            (songId) => this.handlePlayYouTube(songId)
        );

        this.init();
    }

    init() {
        this.setupSorting();
        this.setupAddSongButton();
        this.setupFilters();
        this.setupSearch();
        this.setupSetlists();
        this.setupAddSongsToSetlistModal();
        this.setupImportExport();
        this.setupDeselect();
        this.setupToggleView();
        this.addExampleSongIfEmpty();
        this.loadAndRender();
    }

    loadAndRender() {
        console.log('loadAndRender called');
        // Save current selected row ID before rendering
        const currentSelectedId = this.tableRenderer ? this.tableRenderer.getSelectedRowId() : null;
        
        // Close modal when filtering/searching (unless we're restoring the same selection)
        const wasModalOpen = this.songDetailModal && !this.songDetailModal.modal.classList.contains('hidden');
        if (wasModalOpen && !currentSelectedId) {
            this.songDetailModal.hide();
        }
        
        let allSongs = this.songManager.getFilteredSongs(this.currentFilter);
        console.log('All songs before filters:', allSongs.length);
        
        // Check song 1 specifically
        const song1 = allSongs.find(s => s.id === 1);
        if (song1) {
            console.log('Song 1 in allSongs:', song1);
            console.log('Song 1 youtubeUrl:', song1.youtubeUrl);
        }
        
        // Apply setlist filter if a setlist is selected
        if (this.currentSetlistId) {
            const setlist = this.setlistManager.getSetlist(this.currentSetlistId);
            if (setlist) {
                allSongs = allSongs.filter(song => setlist.songIds.includes(song.id));
            }
        }
        
        // Apply search filter if search term exists
        if (this.searchTerm && this.searchTerm.trim() !== '') {
            const searchLower = this.searchTerm.toLowerCase().trim();
            allSongs = allSongs.filter(song => {
                const artistMatch = song.artist && song.artist.toLowerCase().includes(searchLower);
                const titleMatch = song.title && song.title.toLowerCase().includes(searchLower);
                return artistMatch || titleMatch;
            });
        }
        
        // Store current songs list for navigation
        this.currentSongsList = allSongs;
        this.songDetailModal.setSongs(allSongs);
        
        console.log('About to render', allSongs.length, 'songs');
        // Check song 1 again right before rendering
        const song1BeforeRender = allSongs.find(s => s.id === 1);
        if (song1BeforeRender) {
            console.log('Song 1 before render:', song1BeforeRender);
            console.log('Song 1 youtubeUrl before render:', song1BeforeRender.youtubeUrl);
        }
        
        this.tableRenderer.render(allSongs);
        
        // Apply view mode after rendering
        this.updateViewMode();
        
        // Restore selected row if it still exists (but don't open modal)
        if (currentSelectedId && this.tableRenderer) {
            // Check if the song still exists in the filtered list
            const songExists = allSongs.some(song => song.id === currentSelectedId);
            if (songExists) {
                // Small delay to ensure render is complete
                setTimeout(() => {
                    this.tableRenderer.selectRow(currentSelectedId, true); // Skip callback to prevent modal opening
                }, 50);
            } else {
                // Song no longer exists in filtered list, close modal
                this.songDetailModal.hide();
            }
        } else if (!currentSelectedId && wasModalOpen) {
            // No selection to restore and modal was open, close it
            this.songDetailModal.hide();
        }
    }

    setupFilters() {
        const filterAll = document.getElementById('filterAll');
        const filterFavorites = document.getElementById('filterFavorites');
        
        filterAll.addEventListener('click', () => {
            this.currentFilter = 'all';
            filterAll.classList.add('active');
            filterFavorites.classList.remove('active');
            this.loadAndRender();
        });
        
        filterFavorites.addEventListener('click', () => {
            this.currentFilter = 'favorites';
            filterFavorites.classList.add('active');
            filterAll.classList.remove('active');
            this.loadAndRender();
        });
    }

    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;
        
        // Search on input (real-time)
        searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value;
            this.loadAndRender();
        });
        
        // Clear search on Escape key
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                this.searchTerm = '';
                this.loadAndRender();
                searchInput.blur();
            }
        });
    }

    handleToggleFavorite(songId) {
        this.songManager.toggleFavorite(songId);
        this.loadAndRender();
    }

    setupSetlists() {
        this.updateSetlistSelect();
        this.setupSetlistSelect();
        this.setupCreateSetlist();
        this.setupDeleteSetlist();
    }

    updateSetlistSelect() {
        const select = document.getElementById('setlistSelect');
        const currentValue = select.value;
        select.innerHTML = '<option value="">Alle Songs</option>';
        
        this.setlistManager.getAllSetlists().forEach(setlist => {
            const option = document.createElement('option');
            option.value = setlist.id;
            option.textContent = setlist.name;
            select.appendChild(option);
        });
        
        if (currentValue) {
            select.value = currentValue;
        }
    }

    setupSetlistSelect() {
        const select = document.getElementById('setlistSelect');
        select.addEventListener('change', (e) => {
            this.currentSetlistId = e.target.value || null;
            this.updateButtonsForSetlistMode();
            this.loadAndRender();
        });
        
        // Initial check in case a setlist is already selected
        if (select.value) {
            this.currentSetlistId = select.value;
            this.updateButtonsForSetlistMode();
        }
    }

    updateButtonsForSetlistMode() {
        const deleteBtn = document.getElementById('deleteSetlistBtn');
        const addSongBtn = document.getElementById('addSongBtn');
        const importControls = document.querySelector('.import-export-controls');
        const deleteAllBtn = document.getElementById('deleteAllSongsBtn');
        
        if (this.currentSetlistId) {
            // Show setlist delete button
            if (deleteBtn) {
                deleteBtn.classList.remove('hidden');
            }
            // Change button to text when in setlist mode
            if (addSongBtn) {
                addSongBtn.textContent = 'Songs toevoegen';
                addSongBtn.title = 'Songs toevoegen aan setlist';
            }
            // Hide export, import, and delete all buttons
            if (importControls) {
                importControls.classList.add('hidden');
            }
            // Explicitly hide delete all button (double check)
            if (deleteAllBtn) {
                deleteAllBtn.classList.add('hidden');
                deleteAllBtn.style.display = 'none';
            }
        } else {
            // Hide setlist delete button
            if (deleteBtn) {
                deleteBtn.classList.add('hidden');
            }
            // Change button back to icon
            if (addSongBtn) {
                addSongBtn.textContent = '➕';
                addSongBtn.title = 'Nieuwe Song Toevoegen';
            }
            // Show export, import, and delete all buttons
            if (importControls) {
                importControls.classList.remove('hidden');
            }
            // Explicitly show delete all button
            if (deleteAllBtn) {
                deleteAllBtn.classList.remove('hidden');
                deleteAllBtn.style.display = '';
            }
        }
    }

    setupCreateSetlist() {
        const createBtn = document.getElementById('createSetlistBtn');
        const modal = document.getElementById('setlistModal');
        const closeBtn = document.getElementById('setlistModalClose');
        const nameInput = document.getElementById('setlistNameInput');
        const submitBtn = document.getElementById('setlistCreateBtn');

        createBtn.addEventListener('click', () => {
            modal.classList.remove('hidden');
            nameInput.value = '';
            nameInput.focus();
        });

        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });

        const createSetlist = () => {
            const name = nameInput.value.trim();
            if (name) {
                this.setlistManager.createSetlist(name);
                this.updateSetlistSelect();
                modal.classList.add('hidden');
                nameInput.value = '';
            }
        };

        submitBtn.addEventListener('click', createSetlist);
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                createSetlist();
            } else if (e.key === 'Escape') {
                modal.classList.add('hidden');
            }
        });
    }

    setupDeleteSetlist() {
        const deleteBtn = document.getElementById('deleteSetlistBtn');
        deleteBtn.addEventListener('click', () => {
            if (this.currentSetlistId) {
                const setlist = this.setlistManager.getSetlist(this.currentSetlistId);
                if (setlist) {
                    if (confirm(`Weet je zeker dat je de setlist "${setlist.name}" wilt verwijderen?`)) {
                        this.setlistManager.deleteSetlist(this.currentSetlistId);
                        this.currentSetlistId = null;
                        this.updateSetlistSelect();
                        const select = document.getElementById('setlistSelect');
                        select.value = '';
                        // Reset to "Alle Songs" view
                        this.updateButtonsForSetlistMode();
                        // Load all songs (reset to "Alle Songs" view)
                        this.loadAndRender();
                    }
                }
            }
        });
    }

    setupAddSongsToSetlistModal() {
        const modal = document.getElementById('addSongsToSetlistModal');
        const closeBtn = document.getElementById('addSongsModalClose');
        const cancelBtn = document.getElementById('cancelAddSongsBtn');
        const selectAllBtn = document.getElementById('selectAllSongs');
        const deselectAllBtn = document.getElementById('deselectAllSongs');
        const addSelectedBtn = document.getElementById('addSelectedSongsBtn');
        const songsContainer = document.getElementById('songsListContainer');
        const selectedCountSpan = document.getElementById('selectedCount');

        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        cancelBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });

        selectAllBtn.addEventListener('click', () => {
            const checkboxes = songsContainer.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => {
                if (!cb.disabled) {
                    cb.checked = true;
                }
            });
            this.updateSelectedCount();
        });

        deselectAllBtn.addEventListener('click', () => {
            const checkboxes = songsContainer.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = false);
            this.updateSelectedCount();
        });

        addSelectedBtn.addEventListener('click', () => {
            const checkboxes = songsContainer.querySelectorAll('input[type="checkbox"]:checked:not(:disabled)');
            let addedCount = 0;
            let alreadyInSetlistCount = 0;

            checkboxes.forEach(cb => {
                const songId = parseInt(cb.value);
                const success = this.setlistManager.addSongToSetlist(this.currentSetlistId, songId);
                if (success) {
                    addedCount++;
                } else {
                    alreadyInSetlistCount++;
                }
            });

            if (addedCount > 0 || alreadyInSetlistCount > 0) {
                this.loadAndRender();
                let message = '';
                if (addedCount > 0) {
                    message = `${addedCount} song(s) toegevoegd`;
                }
                if (alreadyInSetlistCount > 0) {
                    message += message ? `, ${alreadyInSetlistCount} al aanwezig` : `${alreadyInSetlistCount} song(s) al aanwezig`;
                }
                alert(message);
            }

            modal.classList.add('hidden');
        });

        // Update count when checkboxes change
        songsContainer.addEventListener('change', () => {
            this.updateSelectedCount();
        });
    }

    populateSongsList(setlist) {
        const container = document.getElementById('songsListContainer');
        container.innerHTML = '';
        
        const allSongs = this.songManager.getAllSongs();
        const songsInSetlist = setlist.songIds || [];

        allSongs.forEach(song => {
            const isInSetlist = songsInSetlist.includes(song.id);
            
            const songItem = document.createElement('div');
            songItem.className = 'song-item';
            if (isInSetlist) {
                songItem.classList.add('in-setlist');
            }

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = song.id;
            checkbox.id = `song-${song.id}`;
            checkbox.disabled = isInSetlist;
            if (isInSetlist) {
                checkbox.checked = true;
            }

            const label = document.createElement('label');
            label.htmlFor = `song-${song.id}`;
            label.textContent = `${song.artist || 'Onbekend'} - ${song.title || 'Geen titel'}`;
            if (isInSetlist) {
                label.innerHTML += ' <span class="in-setlist-badge">(al in setlist)</span>';
            }

            songItem.appendChild(checkbox);
            songItem.appendChild(label);
            container.appendChild(songItem);
        });

        this.updateSelectedCount();
    }

    updateSelectedCount() {
        const container = document.getElementById('songsListContainer');
        const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked:not(:disabled)');
        const countSpan = document.getElementById('selectedCount');
        countSpan.textContent = `${checkboxes.length} geselecteerd`;
    }

    setupDeselect() {
        const deselectBtn = document.getElementById('deselectBtn');
        if (deselectBtn) {
            deselectBtn.addEventListener('click', () => {
                this.deselectRow();
            });
        }
        
        // Escape key to deselect
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.tableRenderer.getSelectedRowId()) {
                this.deselectRow();
            }
        });
    }

    deselectRow() {
        this.tableRenderer.selectRow(null);
    }

    addExampleSongIfEmpty() {
        if (this.songManager.getAllSongs().length === 0) {
            // Add all default songs
            if (typeof DEFAULT_SONGS !== 'undefined' && DEFAULT_SONGS.length > 0) {
                DEFAULT_SONGS.forEach(song => {
                    this.songManager.addSong(song);
                });
            } else {
                // Fallback to single example if DEFAULT_SONGS is not available
                this.songManager.addSong({
                    artist: 'Bryan Adams',
                    title: 'Summer of 69',
                    verse: 'D A (3x)',
                    chorus: 'Bm A D G (2x)',
                    preChorus: 'D A (2x)',
                    bridge: 'F B C B (2x)'
                });
            }
            // Don't call loadAndRender here - it will be called after this function
        }
    }

    setupSorting() {
        const sortableHeaders = document.querySelectorAll('th.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.column;
                const currentSort = this.sorter.getCurrentSort();
                const currentDirection = currentSort.column === column 
                    ? currentSort.direction 
                    : 'asc';

                let songsToSort = this.songManager.getFilteredSongs(this.currentFilter);
                // Apply setlist filter if active
                if (this.currentSetlistId) {
                    const setlist = this.setlistManager.getSetlist(this.currentSetlistId);
                    if (setlist) {
                        songsToSort = songsToSort.filter(song => setlist.songIds.includes(song.id));
                    }
                }
                const { sorted, direction } = this.sorter.sort(
                    songsToSort,
                    column,
                    currentDirection
                );

                // Update UI indicators
                sortableHeaders.forEach(h => {
                    h.classList.remove('asc', 'desc');
                });
                header.classList.add(direction);

                // Preserve selection
                const selectedId = this.tableRenderer.getSelectedRowId();

                // Render sorted
                this.tableRenderer.render(sorted);

                // Restore selection (but don't open modal)
                if (selectedId) {
                    this.tableRenderer.selectRow(selectedId, true); // Skip callback to prevent modal opening
                }
            });
        });
    }

    handleRowSelect(songId) {
        // Open song detail modal when a row is selected
        if (songId) {
            this.navigateToSong(songId);
        } else {
            this.songDetailModal.hide();
        }
    }

    navigateToSong(songId, skipTableSelection = false) {
        const song = this.songManager.getSongById(songId);
        if (song) {
            this.songDetailModal.show(song);
            // Also select the row in the table, but only if not called from navigation
            if (this.tableRenderer && !skipTableSelection) {
                this.tableRenderer.selectRow(songId, true);
            }
        }
    }

    handleCellEdit(songId, field, value) {
        this.songManager.updateSong(songId, { [field]: value });
        // Selection remains visible in the row itself
    }

    setupAddSongButton() {
        const addBtn = document.getElementById('addSongBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                // If a setlist is selected, open the add songs modal
                if (this.currentSetlistId) {
                    this.openAddSongsToSetlistModal();
                } else {
                    // Otherwise, add a new song
                    this.addNewSong();
                }
            });
        }
    }

    openAddSongsToSetlistModal() {
        const modal = document.getElementById('addSongsToSetlistModal');
        const modalTitle = document.getElementById('addSongsModalTitle');
        const setlist = this.setlistManager.getSetlist(this.currentSetlistId);
        
        if (setlist) {
            modalTitle.textContent = `Songs toevoegen aan "${setlist.name}"`;
            this.populateSongsList(setlist);
            modal.classList.remove('hidden');
        }
    }

    addNewSong() {
        const newSong = this.songManager.addSong({
            artist: '',
            title: '',
            verse: '',
            chorus: '',
            preChorus: '',
            bridge: '',
            youtubeUrl: ''
        });

        // Re-render table
        this.loadAndRender();

        // Select the new row and scroll to it (but don't open modal)
        setTimeout(() => {
            this.tableRenderer.selectRow(newSong.id, true); // Skip callback to prevent modal opening
            
            // Enter edit mode for the entire row (so chord modal buttons are shown)
            const row = document.querySelector(`tr[data-id="${newSong.id}"]`);
            if (row) {
                this.tableRenderer.toggleEditMode(newSong.id);
            }
        }, 100);
    }

    handleDelete(songId) {
        if (this.songManager.deleteSong(songId)) {
            // Remove song from all setlists
            this.setlistManager.getAllSetlists().forEach(setlist => {
                this.setlistManager.removeSongFromSetlist(setlist.id, songId);
            });
            // Re-render table
            this.loadAndRender();
        }
    }

    handlePlayYouTube(songId) {
        const song = this.songManager.getSongById(songId);
        if (!song) return;
        
        const youtubeUrl = song.youtubeUrl || '';
        if (!youtubeUrl.trim()) {
            alert('Geen YouTube URL ingesteld voor dit liedje. Voeg een YouTube URL toe in de bewerkmodus.');
            return;
        }
        
        // Extract video ID from YouTube URL
        const videoId = this.extractYouTubeVideoId(youtubeUrl);
        if (!videoId) {
            alert('Ongeldige YouTube URL. Gebruik een volledige YouTube URL (bijv. https://www.youtube.com/watch?v=VIDEO_ID)');
            return;
        }
        
        // Show and initialize mini player
        this.showYouTubeMiniPlayer(song, videoId);
    }

    extractYouTubeVideoId(url) {
        if (!url) return null;
        
        // Handle various YouTube URL formats
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /youtube\.com\/watch\?.*v=([^&\n?#]+)/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        return null;
    }

    showYouTubeMiniPlayer(song, videoId) {
        const player = document.getElementById('youtubeMiniPlayer');
        const container = document.getElementById('youtubePlayerContainer');
        const title = document.getElementById('youtubePlayerTitle');
        
        if (!player || !container || !title) return;
        
        // Set title
        title.textContent = `${song.artist || 'Onbekend'} - ${song.title || 'Geen titel'}`;
        
        // Clear previous iframe
        container.innerHTML = '';
        
        // Create YouTube iframe
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.frameBorder = '0';
        iframe.className = 'youtube-iframe';
        
        container.appendChild(iframe);
        
        // Show player
        player.classList.remove('hidden');
        
        // Setup event listeners if not already done
        this.setupYouTubeMiniPlayer();
    }

    setupYouTubeMiniPlayer() {
        const player = document.getElementById('youtubeMiniPlayer');
        const closeBtn = document.getElementById('youtubePlayerClose');
        const minimizeBtn = document.getElementById('youtubePlayerMinimize');
        
        if (!player) return;
        
        // Remove existing listeners by cloning
        const newCloseBtn = closeBtn?.cloneNode(true);
        const newMinimizeBtn = minimizeBtn?.cloneNode(true);
        
        if (closeBtn && newCloseBtn) {
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            newCloseBtn.addEventListener('click', () => {
                this.hideYouTubeMiniPlayer();
            });
        }
        
        if (minimizeBtn && newMinimizeBtn) {
            minimizeBtn.parentNode.replaceChild(newMinimizeBtn, minimizeBtn);
            newMinimizeBtn.addEventListener('click', () => {
                player.classList.toggle('minimized');
                newMinimizeBtn.textContent = player.classList.contains('minimized') ? '🔺' : '🔻';
            });
        }
    }

    hideYouTubeMiniPlayer() {
        const player = document.getElementById('youtubeMiniPlayer');
        const container = document.getElementById('youtubePlayerContainer');
        
        if (player) {
            player.classList.add('hidden');
            player.classList.remove('minimized');
        }
        
        // Clear iframe to stop video
        if (container) {
            container.innerHTML = '';
        }
    }

    setupImportExport() {
        // Export functionality
        const exportBtn = document.getElementById('exportBtn');
        exportBtn.addEventListener('click', () => {
            this.exportSongs();
        });

        // Import functionality
        const importFile = document.getElementById('importFile');
        importFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.importSongs(file);
            }
            // Reset input so same file can be selected again
            e.target.value = '';
        });

        // Delete all songs functionality
        const deleteAllBtn = document.getElementById('deleteAllSongsBtn');
        if (deleteAllBtn) {
            deleteAllBtn.addEventListener('click', () => {
                this.deleteAllSongs();
            });
        }
    }

    setupToggleView() {
        const toggleBtn = document.getElementById('toggleViewBtn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.viewMode = this.viewMode === 'full' ? 'simple' : 'full';
                this.updateViewMode();
                this.loadAndRender();
            });
            this.updateViewMode();
        }
    }

    updateViewMode() {
        const toggleBtn = document.getElementById('toggleViewBtn');
        const table = document.getElementById('songsTable');
        if (toggleBtn && table) {
            if (this.viewMode === 'simple') {
                toggleBtn.textContent = '📊';
                toggleBtn.title = 'Volledig overzicht';
                table.classList.add('simple-view');
            } else {
                toggleBtn.textContent = '📋';
                toggleBtn.title = 'Simpel overzicht';
                table.classList.remove('simple-view');
            }
        }
    }

    deleteAllSongs() {
        const songCount = this.songManager.getAllSongs().length;
        
        if (songCount === 0) {
            alert('Er zijn geen songs om te verwijderen.');
            return;
        }

        // Show warning with song count
        const message = `WAARSCHUWING: Je staat op het punt om alle ${songCount} song(s) permanent te verwijderen!\n\n` +
                       `Deze actie kan niet ongedaan worden gemaakt.\n\n` +
                       `Weet je zeker dat je door wilt gaan?`;
        
        if (!confirm(message)) {
            return;
        }

        // Double confirmation
        const doubleConfirm = confirm(
            `Laatste bevestiging: Alle ${songCount} song(s) worden nu verwijderd.\n\n` +
            `Klik "OK" om te bevestigen of "Annuleren" om af te breken.`
        );

        if (!doubleConfirm) {
            return;
        }

        // Delete all songs
        this.songManager.deleteAllSongs();

        // Re-render
        this.loadAndRender();
        this.updateSetlistSelect();

        // Show success message
        alert(`Alle ${songCount} song(s) zijn succesvol verwijderd.`);
    }

    exportSongs() {
        const songs = this.songManager.getAllSongs();
        const setlists = this.setlistManager.getAllSetlists();
        
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            songs: songs,
            setlists: setlists
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `popsong-chordbook-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Show feedback
        const exportBtn = document.getElementById('exportBtn');
        const iconElement = exportBtn.querySelector('.icon');
        if (iconElement) {
            const originalIcon = iconElement.textContent;
            iconElement.textContent = '✓';
            setTimeout(() => {
                iconElement.textContent = originalIcon;
            }, 2000);
        } else {
            // Fallback for old structure
            const originalText = exportBtn.textContent;
            exportBtn.textContent = '✓ Geëxporteerd!';
            setTimeout(() => {
                exportBtn.textContent = originalText;
            }, 2000);
        }
    }

    async importSongs(file) {
        try {
            const text = await file.text();
            const importData = JSON.parse(text);

            // Validate structure
            if (!importData.songs || !Array.isArray(importData.songs)) {
                throw new Error('Ongeldig bestandsformaat: songs array ontbreekt');
            }

            const songCount = importData.songs.length;
            const setlistCount = importData.setlists ? importData.setlists.length : 0;
            const currentSongCount = this.songManager.getAllSongs().length;

            // Ask user how to import
            let replace = true;
            if (currentSongCount > 0) {
                const importChoice = confirm(
                    `Hoe wil je de ${songCount} song(s) importeren?\n\n` +
                    `Klik "OK" om huidige songs te verwijderen en nieuwe te importeren.\n` +
                    `Klik "Annuleren" om nieuwe songs toe te voegen aan bestaande songs.`
                );
                replace = importChoice;
            }

            // Import songs
            const result = this.songManager.importSongs(importData.songs, replace);

            // Import setlists if present
            if (importData.setlists && Array.isArray(importData.setlists)) {
                this.setlistManager.importSetlists(importData.setlists);
            }

            // Re-render
            this.loadAndRender();
            this.updateSetlistSelect();

            // Show success message with details
            let message = `Succesvol geïmporteerd: ${result.added} song(s)`;
            if (result.duplicates > 0) {
                message += `\n\n${result.duplicates} dubbel(ling)(en) overgeslagen:`;
                if (result.duplicateSongs.length <= 10) {
                    message += '\n' + result.duplicateSongs.join('\n');
                } else {
                    message += '\n' + result.duplicateSongs.slice(0, 10).join('\n');
                    message += `\n... en ${result.duplicateSongs.length - 10} meer`;
                }
            }
            if (setlistCount > 0) {
                message += `\n\n${setlistCount} setlist(s) geïmporteerd`;
            }
            alert(message);
        } catch (error) {
            console.error('Import error:', error);
            alert(`Fout bij importeren: ${error.message}`);
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new App();
});

