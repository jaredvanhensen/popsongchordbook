// SongDetailModal - Modal voor song details weergave
class SongDetailModal {
    constructor(songManager, onNavigate, onUpdate = null, chordModal = null, onToggleFavorite = null, onPlayYouTube = null, keyDetector = null, onAddToSetlist = null, onTogglePractice = null, isPracticeChecker = null) {
        this.songManager = songManager;
        this.onNavigate = onNavigate;
        this.onUpdate = onUpdate;
        this.chordModal = chordModal;
        this.onToggleFavorite = onToggleFavorite;
        this.onPlayYouTube = onPlayYouTube;
        this.keyDetector = keyDetector;
        this.onAddToSetlist = onAddToSetlist;
        this.onTogglePractice = onTogglePractice;
        this.isPracticeChecker = isPracticeChecker;
        this.currentSongId = null;
        this.allSongs = [];
        this.modal = document.getElementById('songDetailModal');
        this.closeBtn = document.getElementById('songDetailModalCloseTop');
        this.deleteBtn = document.getElementById('songDetailDeleteBtn');
        this.prevBtn = document.getElementById('songDetailPrev');
        this.nextBtn = document.getElementById('songDetailNext');
        this.saveBtn = document.getElementById('songDetailSaveBtn');
        this.artistElement = document.getElementById('songDetailArtist');
        this.titleElement = document.getElementById('songDetailTitle');
        this.favoriteBtn = document.getElementById('songDetailFavoriteBtn');
        this.practiceBtn = document.getElementById('songDetailPracticeBtn');
        this.keyDisplay = document.getElementById('songDetailKeyDisplay');
        this.youtubeBtn = document.getElementById('songDetailYouTubeBtn');
        this.youtubePlayBtn = document.getElementById('songDetailYouTubePlayBtn');
        this.externalUrlBtn = document.getElementById('songDetailExternalUrlBtn');
        this.addToSetlistBtn = document.getElementById('songDetailAddToSetlistBtn');
        this.transposeUpBtn = document.getElementById('songDetailTransposeUp');
        this.transposeDownBtn = document.getElementById('songDetailTransposeDown');
        this.transposeBtn = document.getElementById('songDetailTransposeBtn');
        this.transposeMenu = document.getElementById('transposeMenu');
        this.transposeResetBtn = document.getElementById('songDetailTransposeReset');
        this.youtubeUrlModal = document.getElementById('youtubeUrlModal');
        this.songKeyInput = document.getElementById('songKeyInput');
        this.youtubeUrlInput = document.getElementById('youtubeUrlInput');
        this.externalUrlInput = document.getElementById('externalUrlInput');
        this.youtubeUrlSaveBtn = document.getElementById('youtubeUrlSaveBtn');
        this.youtubeUrlCancelBtn = document.getElementById('youtubeUrlCancelBtn');
        this.youtubeUrlModalClose = document.getElementById('youtubeUrlModalClose');
        this.patchDetailsInput = document.getElementById('patchDetailsInput');
        this.practiceCountInput = document.getElementById('practiceCountInput');
        this.performAbilitySelect = document.getElementById('performAbilitySelect');

        // Confirmation Modal
        this.confirmationModal = document.getElementById('confirmationModal');
        this.confirmSaveBtn = document.getElementById('confirmSaveBtn');
        this.confirmDontSaveBtn = document.getElementById('confirmDontSaveBtn');
        this.sections = {
            verse: {
                section: document.getElementById('verseSection'),
                title: document.getElementById('verseTitle'),
                content: document.getElementById('verseContent'),
                cue: document.getElementById('verseCueInput')
            },
            chorus: {
                section: document.getElementById('chorusSection'),
                title: document.getElementById('chorusTitle'),
                content: document.getElementById('chorusContent'),
                cue: document.getElementById('chorusCueInput')
            },
            preChorus: {
                section: document.getElementById('preChorusSection'),
                title: document.getElementById('preChorusTitle'),
                content: document.getElementById('preChorusContent'),
                cue: document.getElementById('preChorusCueInput')
            },
            bridge: {
                section: document.getElementById('bridgeSection'),
                title: document.getElementById('bridgeTitle'),
                content: document.getElementById('bridgeContent'),
                cue: document.getElementById('bridgeCueInput')
            }
        };
        this.hasUnsavedChanges = false;
        this.originalSongData = null;
        this.isRandomMode = false;
        this.transposeOffset = 0;

        // Initialize a single shared audio player
        this.sharedAudioPlayer = new PianoAudioPlayer();

        // Initialize Piano Chord Overlay with shared player
        this.pianoChordOverlay = new PianoChordOverlay(this.sharedAudioPlayer);

        // Initialize Chord Progression Editor with shared player
        this.chordProgressionEditor = new ChordProgressionEditor(this.sharedAudioPlayer);

        this.setupEventListeners();
        this.setupPianoButtons();
        this.setupChordEditorButtons();
    }

    formatKeyText(keyText) {
        if (!keyText) return '';

        let formatted = keyText.trim();

        // Ensure first letter is uppercase
        if (formatted.length > 0) {
            formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
        }

        // Handle minor 'm' - if it ends with 'M' or 'm', make it 'm'
        // But be careful with keys like 'Am', 'Abm'
        if (formatted.toLowerCase().endsWith('m')) {
            formatted = formatted.slice(0, -1) + 'm';
        }

        // Handle flats 'b' - ensure 'B' becomes 'b' after the note name
        // e.g., 'AB' becomes 'Ab'
        if (formatted.length > 1 && (formatted.charAt(1) === 'B' || formatted.charAt(1) === 'b')) {
            formatted = formatted.charAt(0) + 'b' + formatted.slice(2);
        }

        return formatted;
    }

    setSongs(songs) {
        this.allSongs = songs;
    }

    setupEventListeners() {
        this.closeBtn.addEventListener('click', () => this.hide());
        this.prevBtn.addEventListener('click', () => this.navigatePrevious());
        this.nextBtn.addEventListener('click', () => this.navigateNext());

        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', async () => {
                await this.saveChanges(false);
            });
        }

        if (this.favoriteBtn) {
            this.favoriteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleFavorite();
            });
        }

        if (this.practiceBtn) {
            this.practiceBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (this.onTogglePractice) {
                    const isNowActive = await this.onTogglePractice(this.currentSongId);
                    this.setPracticeState(isNowActive);
                }
            });
        }

        // Setup YouTube URL button
        if (this.youtubeBtn) {
            this.youtubeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openYouTubeUrlModal();
            });
        }

        // Setup title listeners for change detection
        Object.values(this.sections).forEach(section => {
            if (section.title) {
                section.title.addEventListener('input', () => this.checkForChanges());
                section.title.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        section.title.blur();
                    }
                });
            }
        });

        // Setup YouTube Play button
        if (this.youtubePlayBtn) {
            this.youtubePlayBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.onPlayYouTube && this.currentSongId) {
                    this.onPlayYouTube(this.currentSongId);
                }
            });
        }

        // Setup External URL button
        if (this.externalUrlBtn) {
            this.externalUrlBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openExternalUrl();
            });
        }

        // Setup Add To Setlist button
        if (this.addToSetlistBtn) {
            this.addToSetlistBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.onAddToSetlist && this.currentSongId) {
                    this.onAddToSetlist(this.currentSongId);
                }
            });
        }

        // Setup Transpose buttons
        if (this.transposeUpBtn) {
            this.transposeUpBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.transposeChords(1);
            });
        }

        if (this.transposeDownBtn) {
            this.transposeDownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.transposeChords(-1);
            });
        }

        // Setup Transpose Menu Toggle
        if (this.transposeBtn && this.transposeMenu) {
            this.transposeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.transposeMenu.classList.toggle('hidden');
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!this.transposeMenu.classList.contains('hidden') &&
                    !this.transposeMenu.contains(e.target) &&
                    e.target !== this.transposeBtn &&
                    !this.transposeBtn.contains(e.target)) {
                    this.transposeMenu.classList.add('hidden');
                }
            });
        }

        if (this.transposeResetBtn) {
            this.transposeResetBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.transposeOffset !== 0) {
                    this.transposeChords(-this.transposeOffset);
                    this.transposeOffset = 0;
                    this.transposeMenu.classList.add('hidden');
                }
            });
        }

        if (this.deleteBtn) {
            this.deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleDeleteSong();
            });
        }

        // Setup YouTube URL modal
        if (this.youtubeUrlModal) {
            if (this.youtubeUrlModalClose) {
                this.youtubeUrlModalClose.addEventListener('click', () => {
                    this.closeYouTubeUrlModal();
                });
            }
            if (this.youtubeUrlCancelBtn) {
                this.youtubeUrlCancelBtn.addEventListener('click', () => {
                    this.closeYouTubeUrlModal();
                });
            }
            if (this.youtubeUrlSaveBtn) {
                this.youtubeUrlSaveBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.saveYouTubeUrl();
                });
            }
            this.youtubeUrlModal.addEventListener('click', (e) => {
                if (e.target === this.youtubeUrlModal) {
                    this.closeYouTubeUrlModal();
                }
            });
            if (this.youtubeUrlInput) {
                this.youtubeUrlInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.saveYouTubeUrl();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        this.closeYouTubeUrlModal();
                    }
                });
            }
            if (this.externalUrlInput) {
                this.externalUrlInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.saveYouTubeUrl();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        this.closeYouTubeUrlModal();
                    }
                });
            }
            if (this.songKeyInput) {
                this.songKeyInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.saveYouTubeUrl();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        this.closeYouTubeUrlModal();
                    }
                });
            }
        }

        this.modal.addEventListener('click', async (e) => {
            if (e.target === this.modal) {
                await this.hide();
            }
        });

        // Make fields editable on click
        this.setupEditableFields();

        // Keyboard navigation
        document.addEventListener('keydown', async (e) => {
            if (!this.modal.classList.contains('hidden')) {
                if (e.key === 'Escape') {
                    // If editing, exit edit mode; otherwise close modal
                    const activeElement = document.activeElement;
                    if (activeElement && activeElement.hasAttribute('contenteditable') && activeElement.getAttribute('contenteditable') === 'true') {
                        activeElement.setAttribute('contenteditable', 'false');
                        activeElement.blur();
                    } else {
                        await this.hide();
                    }
                } else if (e.key === 'ArrowLeft' && !e.target.hasAttribute('contenteditable')) {
                    this.navigatePrevious();
                } else if (e.key === 'ArrowRight' && !e.target.hasAttribute('contenteditable')) {
                    this.navigateNext();
                } else if ((e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    if (this.hasUnsavedChanges) {
                        await this.saveChanges(false);
                    }
                }
            }
        });
    }

    setupPianoButtons() {
        // Setup piano chord buttons for each section
        const pianoButtons = this.modal.querySelectorAll('.piano-chord-btn');

        pianoButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();

                const sectionKey = btn.dataset.section;
                const section = this.sections[sectionKey];

                if (section && section.content && this.pianoChordOverlay) {
                    const chordText = section.content.textContent || '';
                    const sectionNames = {
                        'verse': 'Block 1',
                        'chorus': 'Block 2',
                        'preChorus': 'Block 3',
                        'bridge': 'Block 4'
                    };
                    const sectionName = sectionNames[sectionKey] || sectionKey;

                    this.pianoChordOverlay.show(sectionName, chordText);
                }
            });
        });
    }

    setupChordEditorButtons() {
        // Setup chord progression editor buttons for each section
        const editorButtons = this.modal.querySelectorAll('.chord-editor-btn');

        editorButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();

                const sectionKey = btn.dataset.section;
                const section = this.sections[sectionKey];

                if (section && section.content && this.chordProgressionEditor) {
                    const sectionNames = {
                        'verse': 'Block 1',
                        'chorus': 'Block 2',
                        'preChorus': 'Block 3',
                        'bridge': 'Block 4'
                    };
                    const sectionName = sectionNames[sectionKey] || sectionKey;

                    // Get song key (explicit or detected)
                    let songKey = '';
                    if (this.currentSongId) {
                        const song = this.songManager.getSongById(this.currentSongId);
                        if (song) {
                            songKey = song.key || '';
                            // If no explicit key, try to detect it
                            if (!songKey.trim() && this.keyDetector) {
                                songKey = this.keyDetector.detectFromSong(song) || '';
                            }
                        }
                    }

                    this.chordProgressionEditor.show(
                        sectionName,
                        section.content,
                        songKey,
                        (progression) => {
                            // Callback when chords are added
                            this.checkForChanges();
                        }
                    );
                }
            });
        });
    }

    setupEditableFields() {
        // Setup artist and title
        if (this.artistElement) {
            this.artistElement.addEventListener('click', (e) => {
                e.stopPropagation();
                this.enterEditMode(this.artistElement);
            });
            this.artistElement.addEventListener('blur', (e) => {
                // Don't blur if we're moving to next field with Tab
                if (e.relatedTarget && e.relatedTarget.hasAttribute('contenteditable') && e.relatedTarget.getAttribute('contenteditable') === 'true') {
                    return;
                }

                this.artistElement.setAttribute('contenteditable', 'false');
                this.artistElement.classList.remove('editing');

                // Update placeholder state
                const artistText = this.artistElement.textContent || '';
                if (!artistText.trim()) {
                    this.artistElement.classList.add('empty-field');
                    this.artistElement.dataset.placeholder = 'Artist';
                    this.artistElement.textContent = ''; // Clear any whitespace
                } else {
                    this.artistElement.classList.remove('empty-field');
                    this.artistElement.removeAttribute('data-placeholder');
                }

                this.checkForChanges();
            });
            this.artistElement.addEventListener('input', () => {
                // Remove placeholder when user starts typing
                if (this.artistElement.classList.contains('empty-field')) {
                    this.artistElement.classList.remove('empty-field');
                    this.artistElement.removeAttribute('data-placeholder');
                }
                this.checkForChanges();
            });
            this.artistElement.addEventListener('keydown', (e) => {
                if (e.key === 'Tab' && !e.shiftKey) {
                    e.preventDefault();
                    this.moveToNextField(this.artistElement);
                }
            });
        }
        if (this.titleElement) {
            this.titleElement.addEventListener('click', (e) => {
                e.stopPropagation();
                // When entering edit mode, show only title without key
                const originalTitle = this.titleElement.dataset.originalTitle || this.titleElement.textContent.replace(/\s*\([^)]*\)\s*$/, '');
                this.titleElement.textContent = originalTitle;
                this.titleElement.dataset.originalTitle = originalTitle;
                this.enterEditMode(this.titleElement);
            });
            this.titleElement.addEventListener('blur', (e) => {
                // Don't blur if we're moving to next field with Tab
                if (e.relatedTarget && e.relatedTarget.hasAttribute('contenteditable') && e.relatedTarget.getAttribute('contenteditable') === 'true') {
                    return;
                }

                this.titleElement.setAttribute('contenteditable', 'false');
                this.titleElement.classList.remove('editing');

                // Update placeholder state
                const titleText = this.titleElement.textContent || '';
                // Store the edited title
                this.titleElement.dataset.originalTitle = titleText;

                // Get key from current song to display with title
                if (this.currentSongId) {
                    const song = this.songManager.getSongById(this.currentSongId);
                    const keyText = song ? (song.key || '') : '';
                    let displayText = titleText;
                    if (keyText.trim()) {
                        displayText = `${titleText} (${keyText})`;
                    }
                    this.titleElement.textContent = displayText;
                } else {
                    this.titleElement.textContent = titleText;
                }

                if (!titleText.trim()) {
                    this.titleElement.classList.add('empty-field');
                    this.titleElement.dataset.placeholder = 'Song Title';
                    this.titleElement.textContent = ''; // Clear any whitespace
                } else {
                    this.titleElement.classList.remove('empty-field');
                    this.titleElement.removeAttribute('data-placeholder');
                }

                this.checkForChanges();
                // Remove chord button if exists (shouldn't be there for title, but just in case)
                const chordBtn = this.titleElement.parentElement?.querySelector('.chord-modal-btn-detail');
                if (chordBtn) {
                    chordBtn.remove();
                }
            });
            this.titleElement.addEventListener('input', () => {
                // Remove placeholder when user starts typing
                if (this.titleElement.classList.contains('empty-field')) {
                    this.titleElement.classList.remove('empty-field');
                    this.titleElement.removeAttribute('data-placeholder');
                }
                this.checkForChanges();
            });
            this.titleElement.addEventListener('keydown', (e) => {
                if (e.key === 'Tab' && !e.shiftKey) {
                    e.preventDefault();
                    this.moveToNextField(this.titleElement);
                }
            });
        }

        // Setup section fields
        Object.values(this.sections).forEach(section => {
            if (section.content) {
                section.content.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.enterEditMode(section.content);
                });
                section.content.addEventListener('blur', (e) => {
                    // Don't blur if we're moving to next field with Tab
                    if (e.relatedTarget && e.relatedTarget.hasAttribute('contenteditable') && e.relatedTarget.getAttribute('contenteditable') === 'true') {
                        return;
                    }

                    // Use setTimeout to allow click event on button to fire first
                    setTimeout(() => {
                        // Check if button still exists and if we're still in edit mode
                        const chordBtn = section.section?.querySelector('.chord-modal-btn-detail');
                        const isStillEditing = section.content.getAttribute('contenteditable') === 'true';

                        // Only exit edit mode if we're not clicking on the button
                        // Check if the active element is the button
                        const activeElement = document.activeElement;
                        if (!chordBtn || (activeElement !== chordBtn && !chordBtn.contains(activeElement))) {
                            section.content.setAttribute('contenteditable', 'false');
                            section.content.classList.remove('editing');
                            this.checkForChanges();
                            // Remove chord button
                            if (chordBtn) {
                                chordBtn.remove();
                            }
                        }
                    }, 100);
                });
                section.content.addEventListener('input', () => this.checkForChanges());
                section.content.addEventListener('keydown', (e) => {
                    if (e.key === 'Tab' && !e.shiftKey) {
                        e.preventDefault();
                        this.moveToNextField(section.content);
                    }
                });
            }

            if (section.cue) {
                section.cue.addEventListener('input', () => this.checkForChanges());
                section.cue.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        section.cue.blur();
                        this.saveChanges();
                    }
                });
            }
        });
    }

    moveToNextField(currentElement) {
        // Define field order: artist -> title -> verse -> chorus -> preChorus -> bridge
        const fieldOrder = ['artist', 'title', 'verse', 'chorus', 'preChorus', 'bridge'];
        const currentField = currentElement.dataset.field;
        const currentIndex = fieldOrder.indexOf(currentField);

        if (currentIndex === -1 || currentIndex >= fieldOrder.length - 1) {
            // Last field or unknown field - just exit edit mode
            currentElement.setAttribute('contenteditable', 'false');
            currentElement.classList.remove('editing');
            return;
        }

        // Save current field content
        const currentValue = currentElement.textContent.trim();
        currentElement.setAttribute('contenteditable', 'false');
        currentElement.classList.remove('editing');

        // Update placeholder for current field if empty
        if (!currentValue && (currentField === 'artist' || currentField === 'title')) {
            if (currentField === 'artist') {
                currentElement.classList.add('empty-field');
                currentElement.dataset.placeholder = 'Artist';
                currentElement.textContent = '';
            } else if (currentField === 'title') {
                currentElement.classList.add('empty-field');
                currentElement.dataset.placeholder = 'Song Title';
                currentElement.textContent = '';
            }
        }

        // Check for changes on current field
        this.checkForChanges();

        // Find next field
        const nextField = fieldOrder[currentIndex + 1];
        let nextElement = null;

        if (nextField === 'artist') {
            nextElement = this.artistElement;
        } else if (nextField === 'title') {
            nextElement = this.titleElement;
        } else {
            // Section field
            const section = this.sections[nextField];
            nextElement = section?.content;
        }

        if (nextElement) {
            // Small delay to ensure previous field is saved
            setTimeout(() => {
                this.enterEditMode(nextElement);
            }, 50);
        }
    }

    enterEditMode(element) {
        if (!element) {
            return;
        }

        // If already in edit mode, do nothing
        if (element.getAttribute('contenteditable') === 'true') {
            return;
        }

        // Exit other edit modes
        document.querySelectorAll('.editable-field[contenteditable="true"]').forEach(el => {
            el.setAttribute('contenteditable', 'false');
            el.classList.remove('editing');
            // Remove chord button if exists
            const chordBtn = el.parentElement?.querySelector('.chord-modal-btn-detail');
            if (chordBtn) {
                chordBtn.remove();
            }
        });

        // Remove placeholder when entering edit mode
        if (element.classList.contains('empty-field')) {
            element.classList.remove('empty-field');
            element.removeAttribute('data-placeholder');
            // Clear text content so placeholder doesn't interfere
            if (!element.textContent.trim()) {
                element.textContent = '';
            }
        }

        // Enable editing
        element.setAttribute('contenteditable', 'true');
        element.setAttribute('spellcheck', 'false');
        element.setAttribute('autocorrect', 'off');
        element.setAttribute('autocapitalize', 'none');
        element.classList.add('editing');

        // Add chord button for chord fields (verse, preChorus, chorus, bridge)
        try {
            const fieldName = element.dataset.field;
            const chordFields = ['verse', 'preChorus', 'chorus', 'bridge'];
            if (chordFields.includes(fieldName) && this.chordModal) {
                this.addChordButton(element, fieldName);
            }
        } catch (error) {
            console.warn('Error adding chord button, continuing with edit mode:', error);
            // Don't prevent editing if button addition fails
        }

        // Focus and select text
        // Use longer timeout for iPad/iOS to ensure keyboard appears
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const timeout = isIOS ? 300 : 50;

        setTimeout(() => {
            try {
                element.focus();

                // For iPad/iOS: trigger a click event to ensure keyboard appears
                // This is necessary because iOS requires user interaction to show keyboard
                if (isIOS) {
                    // Simulate a click event to trigger keyboard on iOS/iPad
                    const clickEvent = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    element.dispatchEvent(clickEvent);

                    // Try focus again after click event
                    setTimeout(() => {
                        element.focus();
                    }, 50);
                }

                // Select all text if it's a single line field (artist, title)
                // Also handle placeholder text
                if (element === this.artistElement || element === this.titleElement) {
                    // If element is empty, don't select anything (just focus for editing)
                    if (element.textContent.trim() === '') {
                        // Just focus, cursor will be at start
                        // For iOS: place cursor at start explicitly
                        const range = document.createRange();
                        range.setStart(element, 0);
                        range.setEnd(element, 0);
                        const selection = window.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(range);
                    } else {
                        const range = document.createRange();
                        range.selectNodeContents(element);
                        const selection = window.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                } else {
                    // For multi-line fields, place cursor at end
                    const range = document.createRange();
                    range.selectNodeContents(element);
                    range.collapse(false);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            } catch (error) {
                console.warn('Error focusing element:', error);
            }
        }, timeout);
    }

    addChordButton(element, fieldName) {
        console.log('addChordButton called for field:', fieldName);
        // Remove existing button if any
        const section = element.closest('.song-chord-section');
        console.log('Section found:', !!section);
        if (section) {
            const existingBtn = section.querySelector('.chord-modal-btn-detail');
            if (existingBtn) {
                console.log('Removing existing button');
                existingBtn.remove();
            }
        }

        // Create chord button
        const chordBtn = document.createElement('button');
        chordBtn.type = 'button';
        chordBtn.className = 'chord-modal-btn-detail';
        chordBtn.innerHTML = '🎵';
        chordBtn.title = 'Add chords';
        chordBtn.style.cursor = 'pointer';
        chordBtn.style.pointerEvents = 'auto';
        chordBtn.addEventListener('mousedown', (e) => {
            // Use mousedown instead of click, and prevent default to avoid blur
            e.stopPropagation();
            e.preventDefault();
        });

        chordBtn.addEventListener('click', (e) => {
            console.log('Chord button clicked, fieldName:', fieldName);
            e.stopPropagation();
            e.preventDefault();
            // Prevent blur by keeping focus
            if (element.getAttribute('contenteditable') !== 'true') {
                element.setAttribute('contenteditable', 'true');
                element.classList.add('editing');
            }
            // Use setTimeout to ensure click completes before any blur
            setTimeout(() => {
                if (this.chordModal) {
                    console.log('ChordModal exists, calling show()');
                    this.chordModal.show(element, fieldName, () => {
                        // Callback when chords are added - check for changes
                        this.checkForChanges();
                    });
                } else {
                    console.error('ChordModal is null!');
                }
            }, 0);
        });

        // Insert button in the section header next to title
        if (section) {
            const sectionHeader = section.querySelector('.chord-section-title');
            console.log('Section header found:', !!sectionHeader);
            if (sectionHeader) {
                // Wrap title text in a span if not already wrapped
                if (!sectionHeader.querySelector('.chord-section-title-text')) {
                    const titleText = sectionHeader.textContent || sectionHeader.innerText || '';
                    const titleSpan = document.createElement('span');
                    titleSpan.className = 'chord-section-title-text';
                    titleSpan.textContent = titleText;
                    sectionHeader.textContent = ''; // Clear first
                    sectionHeader.appendChild(titleSpan);
                }

                sectionHeader.appendChild(chordBtn);
                console.log('Button appended to section header');
                console.log('Button in DOM:', document.body.contains(chordBtn));
            } else {
                console.error('Section header not found!');
            }
        } else {
            console.error('Section not found!');
        }
    }

    checkForChanges() {
        if (!this.currentSongId) return;

        const song = this.songManager.getSongById(this.currentSongId);
        if (!song) return;

        // Ensure originalSongData is set (should be set in show(), but fallback for safety)
        if (!this.originalSongData) {
            this.originalSongData = {
                artist: song.artist || '',
                title: song.title || '',
                verse: song.verse || '',
                verseTitle: song.verseTitle || 'Block 1',
                verseCue: song.verseCue || '',
                preChorus: song.preChorus || '',
                preChorusTitle: song.preChorusTitle || 'Block 3',
                preChorusCue: song.preChorusCue || '',
                chorus: song.chorus || '',
                chorusTitle: song.chorusTitle || 'Block 2',
                chorusCue: song.chorusCue || '',
                bridge: song.bridge || '',
                bridgeTitle: song.bridgeTitle || 'Block 4',
                bridgeCue: song.bridgeCue || ''
            };
        }

        // Check current values - use textContent directly (not trimmed) to detect all changes including spaces
        // For title, use originalTitle from dataset (without key) or extract from textContent
        const titleText = this.titleElement ? (this.titleElement.dataset.originalTitle || this.titleElement.textContent.replace(/\s*\([^)]*\)\s*$/, '')) : '';
        const currentData = {
            artist: this.artistElement ? this.artistElement.textContent : '',
            title: titleText,
            verse: this.sections.verse?.content ? this.sections.verse.content.textContent : '',
            verseTitle: this.sections.verse?.title ? this.sections.verse.title.textContent : '',
            verseCue: this.sections.verse?.cue ? this.sections.verse.cue.value : '',
            preChorus: this.sections.preChorus?.content ? this.sections.preChorus.content.textContent : '',
            preChorusTitle: this.sections.preChorus?.title ? this.sections.preChorus.title.textContent : '',
            preChorusCue: this.sections.preChorus?.cue ? this.sections.preChorus.cue.value : '',
            chorus: this.sections.chorus?.content ? this.sections.chorus.content.textContent : '',
            chorusTitle: this.sections.chorus?.title ? this.sections.chorus.title.textContent : '',
            chorusCue: this.sections.chorus?.cue ? this.sections.chorus.cue.value : '',
            bridge: this.sections.bridge?.content ? this.sections.bridge.content.textContent : '',
            bridgeTitle: this.sections.bridge?.title ? this.sections.bridge.title.textContent : '',
            bridgeCue: this.sections.bridge?.cue ? this.sections.bridge.cue.value : ''
        };

        // Compare with original - normalize whitespace for comparison (trim each value)
        // This way we detect any change, including spaces, but ignore leading/trailing whitespace differences
        const normalizeData = (data) => ({
            artist: (data.artist || '').trim(),
            title: (data.title || '').trim(),
            verse: (data.verse || '').trim(),
            verseTitle: (data.verseTitle || '').trim(),
            verseCue: (data.verseCue || '').trim(),
            preChorus: (data.preChorus || '').trim(),
            preChorusTitle: (data.preChorusTitle || '').trim(),
            preChorusCue: (data.preChorusCue || '').trim(),
            chorus: (data.chorus || '').trim(),
            chorusTitle: (data.chorusTitle || '').trim(),
            chorusCue: (data.chorusCue || '').trim(),
            bridge: (data.bridge || '').trim(),
            bridgeTitle: (data.bridgeTitle || '').trim(),
            bridgeCue: (data.bridgeCue || '').trim()
        });

        const normalizedCurrent = normalizeData(currentData);
        const normalizedOriginal = normalizeData(this.originalSongData);

        // Compare normalized data
        this.hasUnsavedChanges = JSON.stringify(normalizedCurrent) !== JSON.stringify(normalizedOriginal);

        // Show/hide save button
        if (this.saveBtn) {
            if (this.hasUnsavedChanges) {
                this.saveBtn.classList.remove('hidden');
            } else {
                this.saveBtn.classList.add('hidden');
            }
        }
    }

    async handleDeleteSong() {
        if (!this.currentSongId) return;

        const song = this.songManager.getSongById(this.currentSongId);
        if (!song) return;

        const confirmed = confirm(`Are you sure you want to delete "${song.title}" by ${song.artist}?`);
        if (!confirmed) return;

        try {
            const success = await this.songManager.deleteSong(this.currentSongId);
            if (success) {
                // Allow hiding even if unsaved changes exist
                this.hasUnsavedChanges = false;
                await this.hide();

                // Refresh the song list in the main UI if callback exists
                if (this.onUpdate) {
                    this.onUpdate();
                }
            } else {
                alert('Failed to delete song. Please try again.');
            }
        } catch (error) {
            console.error('Error deleting song:', error);
            alert('An error occurred while deleting the song.');
        }
    }

    async saveChanges(shouldClose = false) {
        if (!this.currentSongId || !this.hasUnsavedChanges) {
            if (shouldClose) await this.hide();
            return;
        }

        const artist = this.artistElement ? this.artistElement.textContent.trim() : '';
        const originalTitle = this.titleElement ? (this.titleElement.dataset.originalTitle || this.titleElement.textContent.replace(/\s*\([^)]*\)\s*$/, '')).trim() : '';

        if (!artist || !originalTitle) {
            alert('Band/Artist Name and Song Title are required and cannot be empty.');
            return;
        }

        const updates = {};

        // Get current values from editable fields
        if (this.artistElement) {
            updates.artist = artist;
        }
        if (this.titleElement) {
            updates.title = originalTitle;
        }
        if (this.sections.verse?.content) {
            updates.verse = this.sections.verse.content.textContent.trim();
        }
        if (this.sections.verse?.title) {
            updates.verseTitle = this.sections.verse.title.textContent.trim();
        }
        if (this.sections.verse?.cue) {
            updates.verseCue = this.sections.verse.cue.value.trim();
        }
        if (this.sections.preChorus?.content) {
            updates.preChorus = this.sections.preChorus.content.textContent.trim();
        }
        if (this.sections.preChorus?.title) {
            updates.preChorusTitle = this.sections.preChorus.title.textContent.trim();
        }
        if (this.sections.preChorus?.cue) {
            updates.preChorusCue = this.sections.preChorus.cue.value.trim();
        }
        if (this.sections.chorus?.content) {
            updates.chorus = this.sections.chorus.content.textContent.trim();
        }
        if (this.sections.chorus?.title) {
            updates.chorusTitle = this.sections.chorus.title.textContent.trim();
        }
        if (this.sections.chorus?.cue) {
            updates.chorusCue = this.sections.chorus.cue.value.trim();
        }
        if (this.sections.bridge?.content) {
            updates.bridge = this.sections.bridge.content.textContent.trim();
        }
        if (this.sections.bridge?.title) {
            updates.bridgeTitle = this.sections.bridge.title.textContent.trim();
        }
        if (this.sections.bridge?.cue) {
            updates.bridgeCue = this.sections.bridge.cue.value.trim();
        }

        // Update song
        await this.songManager.updateSong(this.currentSongId, updates);

        // Update originalSongData to current saved values so they become the new baseline
        const savedSong = this.songManager.getSongById(this.currentSongId);
        if (savedSong) {
            this.originalSongData = {
                artist: savedSong.artist || '',
                title: savedSong.title || '',
                verse: savedSong.verse || '',
                verseTitle: savedSong.verseTitle || 'Block 1',
                verseCue: savedSong.verseCue || '',
                preChorus: savedSong.preChorus || '',
                preChorusTitle: savedSong.preChorusTitle || 'Block 3',
                preChorusCue: savedSong.preChorusCue || '',
                chorus: savedSong.chorus || '',
                chorusTitle: savedSong.chorusTitle || 'Block 2',
                chorusCue: savedSong.chorusCue || '',
                bridge: savedSong.bridge || '',
                bridgeTitle: savedSong.bridgeTitle || 'Block 4',
                bridgeCue: savedSong.bridgeCue || ''
            };
        }

        // Reset change tracking BEFORE calling onUpdate or hide
        this.hasUnsavedChanges = false;

        // Hide save button
        if (this.saveBtn) {
            this.saveBtn.classList.add('hidden');
        }

        // Exit edit mode and remove chord buttons
        document.querySelectorAll('.editable-field[contenteditable="true"]').forEach(el => {
            el.setAttribute('contenteditable', 'false');
            el.classList.remove('editing');
            // Remove chord buttons
            const section = el.closest('.song-chord-section');
            if (section) {
                const chordBtn = section.querySelector('.chord-modal-btn-detail');
                if (chordBtn) {
                    chordBtn.remove();
                }
            }
        });

        if (shouldClose) {
            await this.hide();
        }

        // Notify parent to refresh table
        if (this.onUpdate) {
            this.onUpdate();
        }

        // Update relevant UI parts
        this.updateYouTubeButton();
        this.updateKeyDisplay();
    }

    showUnsavedChangesDialog() {
        // Re-fetch elements if they were not found during initialization (e.g. timing issues)
        if (!this.confirmationModal) this.confirmationModal = document.getElementById('confirmationModal');
        if (!this.confirmSaveBtn) this.confirmSaveBtn = document.getElementById('confirmSaveBtn');
        if (!this.confirmDontSaveBtn) this.confirmDontSaveBtn = document.getElementById('confirmDontSaveBtn');

        return new Promise((resolve) => {
            if (!this.confirmationModal || !this.confirmSaveBtn || !this.confirmDontSaveBtn) {
                // Fallback to confirm if elements are still missing
                const result = confirm('You have unsaved changes. Do you want to save them first?');
                resolve(result);
                return;
            }

            const handleSave = () => {
                cleanup();
                resolve(true);
            };

            const handleDontSave = () => {
                cleanup();
                resolve(false);
            };

            const cleanup = () => {
                this.confirmSaveBtn.removeEventListener('click', handleSave);
                this.confirmDontSaveBtn.removeEventListener('click', handleDontSave);
                this.confirmationModal.classList.add('hidden');
            };

            this.confirmSaveBtn.addEventListener('click', handleSave);
            this.confirmDontSaveBtn.addEventListener('click', handleDontSave);
            this.confirmationModal.classList.remove('hidden');
        });
    }

    navigatePrevious() {
        if (this.isRandomMode) return;
        if (!this.currentSongId || this.allSongs.length === 0) return;

        const currentIndex = this.allSongs.findIndex(song => song.id === this.currentSongId);
        if (currentIndex > 0) {
            const previousSong = this.allSongs[currentIndex - 1];
            if (this.onNavigate) {
                this.onNavigate(previousSong.id);
            }
        }
    }

    navigateNext() {
        if (!this.currentSongId || this.allSongs.length === 0) return;

        if (this.isRandomMode) {
            // Pick a random song that is not the current one
            let randomIndex;
            if (this.allSongs.length > 1) {
                do {
                    randomIndex = Math.floor(Math.random() * this.allSongs.length);
                } while (this.allSongs[randomIndex].id === this.currentSongId);
            } else {
                randomIndex = 0;
            }

            const randomSong = this.allSongs[randomIndex];
            if (this.onNavigate) {
                this.onNavigate(randomSong.id, true);
            }
            return;
        }

        const currentIndex = this.allSongs.findIndex(song => song.id === this.currentSongId);
        if (currentIndex < this.allSongs.length - 1) {
            const nextSong = this.allSongs[currentIndex + 1];
            if (this.onNavigate) {
                this.onNavigate(nextSong.id);
            }
        }
    }

    async show(song, autoEditArtist = false, isRandomMode = false) {
        if (!song) {
            await this.hide();
            return;
        }

        // Save any unsaved changes before switching songs
        if (this.hasUnsavedChanges && this.currentSongId) {
            const shouldSave = await this.showUnsavedChangesDialog();
            if (shouldSave) {
                await this.saveChanges();
            } else {
                // Discard changes and reload original data
                this.discardChanges();
            }
        }

        this.currentSongId = song.id;
        this.hasUnsavedChanges = false;
        this.currentSongId = song.id;
        this.hasUnsavedChanges = false;
        this.isRandomMode = isRandomMode;
        this.transposeOffset = 0;

        // Set originalSongData immediately when showing a song, before any user interaction
        this.originalSongData = {
            artist: song.artist || '',
            title: song.title || '',
            verse: song.verse || '',
            verseTitle: song.verseTitle || 'Block 1',
            verseCue: song.verseCue || '',
            preChorus: song.preChorus || '',
            preChorusTitle: song.preChorusTitle || 'Block 3',
            preChorusCue: song.preChorusCue || '',
            chorus: song.chorus || '',
            chorusTitle: song.chorusTitle || 'Block 2',
            chorusCue: song.chorusCue || '',
            bridge: song.bridge || '',
            bridgeTitle: song.bridgeTitle || 'Block 4',
            bridgeCue: song.bridgeCue || ''
        };

        // Update artist and title
        if (this.artistElement) {
            const artistText = song.artist || '';
            this.artistElement.textContent = artistText;
            this.artistElement.setAttribute('contenteditable', 'false');
            this.artistElement.classList.remove('editing');

            // Add placeholder styling if empty
            if (!artistText.trim()) {
                this.artistElement.classList.add('empty-field');
                this.artistElement.dataset.placeholder = 'Artist';
            } else {
                this.artistElement.classList.remove('empty-field');
                this.artistElement.removeAttribute('data-placeholder');
            }
        }
        if (this.titleElement) {
            const titleText = song.title || '';
            let keyText = song.key || '';
            let isGuessed = false;

            // If no explicit key, try to detect it
            if (!keyText.trim() && this.keyDetector) {
                const detectedKey = this.keyDetector.detectFromSong(song);
                if (detectedKey) {
                    keyText = detectedKey;
                    isGuessed = true;
                }
            }

            // Display title
            this.titleElement.textContent = titleText;

            // Update Key Display in Footer
            this.updateKeyDisplay();

            // Store original title without key for editing
            this.titleElement.dataset.originalTitle = titleText;
            this.titleElement.setAttribute('contenteditable', 'false');
            this.titleElement.classList.remove('editing');

            // Add placeholder styling if empty
            if (!titleText.trim()) {
                this.titleElement.classList.add('empty-field');
                this.titleElement.dataset.placeholder = 'Song Title';
                // Clear display text if title is empty
                this.titleElement.innerHTML = '';
            } else {
                this.titleElement.classList.remove('empty-field');
                this.titleElement.removeAttribute('data-placeholder');
            }
        }

        // Update favorite button
        if (this.favoriteBtn) {
            this.updateFavoriteButton(song.favorite || false);
        }

        // Update Practice button state
        if (this.practiceBtn) {
            const isPractice = this.isPracticeChecker ? this.isPracticeChecker(song.id) : false;
            this.setPracticeState(isPractice);
        }

        // Update YouTube button
        if (this.youtubeBtn) {
            this.updateYouTubeButton(song.youtubeUrl || '', song.externalUrl || '');
        }

        // Update YouTube Play button visibility
        if (this.youtubePlayBtn) {
            this.updateYouTubePlayButton(song.youtubeUrl || '');
        }

        // Update External URL button visibility
        if (this.externalUrlBtn) {
            this.updateExternalUrlButton(song.externalUrl || '');
        }

        // Hide save button
        if (this.saveBtn) {
            this.saveBtn.classList.add('hidden');
        }

        // Update navigation buttons
        this.updateNavigationButtons();

        // Verse (always show, even if empty - so user can add content)
        if (this.sections.verse && this.sections.verse.content) {
            this.sections.verse.content.textContent = song.verse || '';
            if (this.sections.verse.title) {
                this.sections.verse.title.textContent = song.verseTitle || 'Block 1';
            }
            if (this.sections.verse.cue) {
                this.sections.verse.cue.value = song.verseCue || '';
            }
            this.sections.verse.content.setAttribute('contenteditable', 'false');
            this.sections.verse.content.classList.remove('editing');
            if (this.sections.verse.section) {
                this.sections.verse.section.classList.remove('hidden');
            }
        }

        // Chorus (always show)
        if (this.sections.chorus && this.sections.chorus.content) {
            this.sections.chorus.content.textContent = song.chorus || '';
            if (this.sections.chorus.title) {
                this.sections.chorus.title.textContent = song.chorusTitle || 'Block 2';
            }
            if (this.sections.chorus.cue) {
                this.sections.chorus.cue.value = song.chorusCue || '';
            }
            this.sections.chorus.content.setAttribute('contenteditable', 'false');
            this.sections.chorus.content.classList.remove('editing');
            if (this.sections.chorus.section) {
                this.sections.chorus.section.classList.remove('hidden');
            }
        }

        // Pre-Chorus (always show)
        if (this.sections.preChorus && this.sections.preChorus.content) {
            this.sections.preChorus.content.textContent = song.preChorus || '';
            if (this.sections.preChorus.title) {
                this.sections.preChorus.title.textContent = song.preChorusTitle || 'Block 3';
            }
            if (this.sections.preChorus.cue) {
                this.sections.preChorus.cue.value = song.preChorusCue || '';
            }
            this.sections.preChorus.content.setAttribute('contenteditable', 'false');
            this.sections.preChorus.content.classList.remove('editing');
            if (this.sections.preChorus.section) {
                this.sections.preChorus.section.classList.remove('hidden');
            }
        }

        // Bridge (always show)
        if (this.sections.bridge && this.sections.bridge.content) {
            this.sections.bridge.content.textContent = song.bridge || '';
            if (this.sections.bridge.title) {
                this.sections.bridge.title.textContent = song.bridgeTitle || 'Block 4';
            }
            if (this.sections.bridge.cue) {
                this.sections.bridge.cue.value = song.bridgeCue || '';
            }
            this.sections.bridge.content.setAttribute('contenteditable', 'false');
            this.sections.bridge.content.classList.remove('editing');
            if (this.sections.bridge.section) {
                this.sections.bridge.section.classList.remove('hidden');
            }
        }

        // Show modal
        if (this.modal) {
            this.modal.classList.remove('hidden');
        }

        // Auto-focus and enter edit mode for artist field if requested (for new songs)
        if (autoEditArtist && this.artistElement) {
            setTimeout(() => {
                this.enterEditMode(this.artistElement);
            }, 100);
        }
    }

    updateNavigationButtons() {
        if (this.isRandomMode) {
            // Random mode: Hide Previous, change Next to Random
            if (this.prevBtn) {
                this.prevBtn.classList.add('hidden');
            }
            if (this.nextBtn) {
                this.nextBtn.classList.remove('hidden');
                this.nextBtn.style.opacity = '1';
                this.nextBtn.style.cursor = 'pointer';
                this.nextBtn.disabled = false;
                this.nextBtn.title = 'Open another random song';

                const iconSpan = this.nextBtn.querySelector('.icon');
                const labelSpan = this.nextBtn.querySelector('.label');
                if (iconSpan) iconSpan.textContent = '🎲';
                if (labelSpan) labelSpan.textContent = 'Random';
            }
            return;
        }

        // Normal mode: Show Previous and Next with standard labels
        if (this.prevBtn) {
            this.prevBtn.classList.remove('hidden');
            const prevIconSpan = this.prevBtn.querySelector('.icon');
            const prevLabelSpan = this.prevBtn.querySelector('.label');
            if (prevIconSpan) prevIconSpan.textContent = '‹';
            if (prevLabelSpan) prevLabelSpan.textContent = 'Previous';
        }
        if (this.nextBtn) {
            this.nextBtn.classList.remove('hidden');
            const nextIconSpan = this.nextBtn.querySelector('.icon');
            const nextLabelSpan = this.nextBtn.querySelector('.label');
            if (nextIconSpan) nextIconSpan.textContent = '›';
            if (nextLabelSpan) nextLabelSpan.textContent = 'Next';
            this.nextBtn.title = 'Next song';
        }

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

    toggleFavorite() {
        if (!this.currentSongId || !this.onToggleFavorite) return;
        this.onToggleFavorite(this.currentSongId);

        // Update button state from current song data
        const song = this.songManager.getSongById(this.currentSongId);
        if (song) {
            this.updateFavoriteButton(song.favorite || false);
        }
    }

    updateFavoriteButton(isFavorite) {
        if (!this.favoriteBtn) return;
        const iconSpan = this.favoriteBtn.querySelector('.icon');
        if (iconSpan) {
            iconSpan.textContent = isFavorite ? '⭐' : '☆';
        } else {
            // Fallback for if structure is not yet set up
            this.favoriteBtn.innerHTML = isFavorite ? '⭐' : '☆';
        }
        this.favoriteBtn.title = isFavorite ? 'Remove from favorites' : 'Add to favorites';
        if (isFavorite) {
            this.favoriteBtn.classList.add('favorite-active');
        } else {
            this.favoriteBtn.classList.remove('favorite-active');
        }
    }


    setPracticeState(isActive) {
        if (!this.practiceBtn) return;
        if (isActive) {
            this.practiceBtn.classList.add('practice-active');
        } else {
            this.practiceBtn.classList.remove('practice-active');
        }
    }

    openYouTubeUrlModal() {
        if (!this.youtubeUrlModal || !this.currentSongId) return;

        const song = this.songManager.getSongById(this.currentSongId);
        if (!song) return;

        // Set current values in inputs
        if (this.songKeyInput) {
            this.songKeyInput.value = song.key || '';
        }
        if (this.youtubeUrlInput) {
            this.youtubeUrlInput.value = song.youtubeUrl || '';
        }
        if (this.externalUrlInput) {
            this.externalUrlInput.value = song.externalUrl || '';
        }

        if (this.patchDetailsInput) {
            this.patchDetailsInput.value = song.patchDetails || '';
        }

        if (this.practiceCountInput) {
            this.practiceCountInput.value = song.practiceCount || '';
        }

        if (this.performAbilitySelect) {
            this.performAbilitySelect.value = song.performAbility || '';
        }

        // Show modal
        this.youtubeUrlModal.classList.remove('hidden');

        // Focus first input (key input)
        setTimeout(() => {
            if (this.songKeyInput) {
                this.songKeyInput.focus();
                this.songKeyInput.select();
            }
        }, 100);
    }

    closeYouTubeUrlModal() {
        if (this.youtubeUrlModal) {
            this.youtubeUrlModal.classList.add('hidden');
        }
        if (this.songKeyInput) {
            this.songKeyInput.value = '';
        }
        if (this.youtubeUrlInput) {
            this.youtubeUrlInput.value = '';
        }
        if (this.externalUrlInput) {
            this.externalUrlInput.value = '';
        }
        if (this.patchDetailsInput) {
            this.patchDetailsInput.value = '';
        }
        if (this.practiceCountInput) {
            this.practiceCountInput.value = '';
        }
        if (this.performAbilitySelect) {
            this.performAbilitySelect.value = '';
        }
    }

    saveYouTubeUrl() {
        if (!this.currentSongId) {
            return;
        }

        const key = this.songKeyInput ? this.songKeyInput.value.trim() : '';
        const youtubeUrl = this.youtubeUrlInput ? this.youtubeUrlInput.value.trim() : '';
        const externalUrl = this.externalUrlInput ? this.externalUrlInput.value.trim() : '';
        const patchDetails = this.patchDetailsInput ? this.patchDetailsInput.value.trim() : '';
        const practiceCount = this.practiceCountInput ? this.practiceCountInput.value.trim() : '';
        const performAbility = this.performAbilitySelect ? this.performAbilitySelect.value : '';

        // Update song
        this.songManager.updateSong(this.currentSongId, {
            key: key,
            youtubeUrl: youtubeUrl,
            externalUrl: externalUrl,
            patchDetails: patchDetails,
            practiceCount: practiceCount,
            performAbility: performAbility
        });

        // Update title display with key
        this.updateTitleWithKey();

        // Update buttons state
        this.updateYouTubeButton(youtubeUrl, externalUrl);
        this.updateYouTubePlayButton(youtubeUrl);
        this.updateExternalUrlButton(externalUrl);

        // Close modal first
        this.closeYouTubeUrlModal();

        // Notify parent to refresh table
        if (this.onUpdate && typeof this.onUpdate === 'function') {
            this.onUpdate();
        }
    }

    /**
     * Updates the key display in the footer
     */
    updateKeyDisplay() {
        if (!this.keyDisplay || !this.currentSongId) return;

        const song = this.songManager.getSongById(this.currentSongId);
        if (!song) {
            this.keyDisplay.textContent = '';
            return;
        }

        let keyText = song.key || '';

        // If no explicit key, try to detect it
        if (!keyText.trim() && this.keyDetector) {
            const detectedKey = this.keyDetector.detectFromSong(song);
            if (detectedKey) {
                keyText = detectedKey;
            }
        }

        const formattedKey = this.formatKeyText(keyText);
        if (formattedKey.trim()) {
            this.keyDisplay.textContent = `KEY: ${formattedKey}`;
        } else {
            this.keyDisplay.textContent = '';
        }
    }

    updateYouTubeButton(youtubeUrl, externalUrl) {
        if (!this.youtubeBtn) return;

        const labelSpan = this.youtubeBtn.querySelector('.label');
        const hasAnyUrl = (youtubeUrl && youtubeUrl.trim()) || (externalUrl && externalUrl.trim());

        if (hasAnyUrl) {
            this.youtubeBtn.classList.add('youtube-active');
            this.youtubeBtn.title = 'Edit song details';
            if (labelSpan) {
                labelSpan.textContent = 'Details';
            }
        } else {
            this.youtubeBtn.classList.remove('youtube-active');
            this.youtubeBtn.title = 'Edit song details';
            if (labelSpan) {
                labelSpan.textContent = 'Details';
            }
        }
    }

    updateYouTubePlayButton(youtubeUrl) {
        if (!this.youtubePlayBtn) return;

        if (youtubeUrl && youtubeUrl.trim()) {
            this.youtubePlayBtn.classList.remove('hidden');
        } else {
            this.youtubePlayBtn.classList.add('hidden');
        }
    }

    updateExternalUrlButton(externalUrl) {
        if (!this.externalUrlBtn) return;

        if (externalUrl && externalUrl.trim()) {
            this.externalUrlBtn.classList.remove('hidden');
        } else {
            this.externalUrlBtn.classList.add('hidden');
        }
    }

    openExternalUrl() {
        if (!this.currentSongId) return;

        const song = this.songManager.getSongById(this.currentSongId);
        if (song && song.externalUrl) {
            let url = song.externalUrl;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            window.open(url, '_blank');
        }
    }

    transposeChords(semitones) {
        if (!this.currentSongId) return;

        // Mapping van noten naar semitones en terug
        const noteToSemitone = {
            'C': 0, 'C#': 1, 'Db': 1,
            'D': 2, 'D#': 3, 'Eb': 3,
            'E': 4, 'Fb': 4,
            'F': 5, 'F#': 6, 'Gb': 6,
            'G': 7, 'G#': 8, 'Ab': 8,
            'A': 9, 'A#': 10, 'Bb': 10,
            'B': 11, 'Cb': 11
        };

        const semitoneToNote = {
            0: ['C'],
            1: ['C#', 'Db'],
            2: ['D'],
            3: ['D#', 'Eb'],
            4: ['E'],
            5: ['F'],
            6: ['F#', 'Gb'],
            7: ['G'],
            8: ['G#', 'Ab'],
            9: ['A'],
            10: ['A#', 'Bb'],
            11: ['B']
        };

        // Functie om een enkel akkoord te transponeeren
        const transposeSingleChord = (chord) => {
            if (!chord || typeof chord !== 'string') return chord;

            // Match root note (met optionele sharp/flat)
            const rootMatch = chord.match(/^([A-Ga-g])([#b]?)/);
            if (!rootMatch) return chord;

            const rootNote = rootMatch[1].toUpperCase();
            const accidental = rootMatch[2];
            const rootKey = rootNote + accidental;

            const rootSemitone = noteToSemitone[rootKey];
            if (rootSemitone === undefined) return chord;

            // Bereken nieuwe semitone
            let newSemitone = (rootSemitone + semitones + 12) % 12;

            // Kies de notenaam (voorkeur voor dezelfde accidental als origineel, anders de eerste optie)
            const newNoteOptions = semitoneToNote[newSemitone];
            let newNote;
            if (accidental === '#' && newNoteOptions.includes(rootNote + '#')) {
                newNote = rootNote + '#';
            } else if (accidental === 'b' && newNoteOptions.includes(rootNote + 'b')) {
                newNote = rootNote + 'b';
            } else {
                // Gebruik de eerste optie, maar probeer consistent te blijven
                newNote = newNoteOptions[0];
            }

            // Vervang de root note in het akkoord
            const suffix = chord.slice(rootMatch[0].length);
            return newNote + suffix;
        };

        // Functie om een hele chord string te transponeeren
        const transposeChordString = (chordString) => {
            if (!chordString || typeof chordString !== 'string') return chordString;

            // Pattern om akkoorden te vinden (inclusief accidentals en suffixes)
            // Pattern om akkoorden te vinden (inclusief accidentals en suffixes)
            // Strict pattern: Capitalized root, delimiters boundaries, strictly valid suffixes
            const chordPattern = /(^|[\s,.;:(\[])([A-G][#b]?(?:m|min|maj|dim|aug|sus|add)?(?:[0-9]|sus[24]?|add[29]|maj[79]?|min[79]?|dim[79]?|aug|°|ø)*(?:\/[A-G][#b]?)?)(?=$|[\s,.;:)\]])/g;

            return chordString.replace(chordPattern, (match, prefix, chord) => {
                let newChord;
                // Voor slash chords (bijv. C/G), transponeer beide delen
                if (chord.includes('/')) {
                    const parts = chord.split('/');
                    const root = transposeSingleChord(parts[0]);
                    const bass = transposeSingleChord(parts[1]);
                    newChord = root + '/' + bass;
                } else {
                    newChord = transposeSingleChord(chord);
                }
                return prefix + newChord;
            });
        };

        // Transponeer alle secties
        const sectionsToTranspose = ['verse', 'chorus', 'preChorus', 'bridge'];
        let hasChanges = false;

        sectionsToTranspose.forEach(sectionKey => {
            const section = this.sections[sectionKey];
            if (section && section.content) {
                const currentText = section.content.textContent || '';
                if (currentText.trim()) {
                    const transposedText = transposeChordString(currentText);
                    if (transposedText !== currentText) {
                        section.content.textContent = transposedText;
                        hasChanges = true;
                    }
                }
            }
        });

        // Transponeer ook de toonsoort (key) als die bestaat
        const song = this.songManager.getSongById(this.currentSongId);
        if (song && song.key && song.key.trim()) {
            const transposedKey = transposeSingleChord(song.key.trim());
            if (transposedKey !== song.key.trim()) {
                // Update de key in de song (direct opslaan omdat key een metadata veld is)
                this.songManager.updateSong(this.currentSongId, { key: transposedKey });
                // Update de key display
                this.updateTitleWithKey();
                // Update originalSongData zodat change tracking correct blijft
                if (this.originalSongData) {
                    this.originalSongData.key = transposedKey;
                }
                hasChanges = true;
            }
        }

        if (hasChanges) {
            // Markeer als gewijzigd
            this.checkForChanges();
            this.transposeOffset += semitones;
        }
    }

    discardChanges() {
        if (!this.currentSongId || !this.originalSongData) return;

        // Reload original song data
        const song = this.songManager.getSongById(this.currentSongId);
        if (!song) return;

        // Restore original values
        if (this.artistElement) {
            const artistText = this.originalSongData.artist || '';
            this.artistElement.textContent = artistText;
            if (!artistText.trim()) {
                this.artistElement.classList.add('empty-field');
                this.artistElement.dataset.placeholder = 'Artist';
            } else {
                this.artistElement.classList.remove('empty-field');
                this.artistElement.removeAttribute('data-placeholder');
            }
        }
        if (this.titleElement) {
            const titleText = this.originalSongData.title || '';
            this.titleElement.textContent = titleText;
            if (!titleText.trim()) {
                this.titleElement.classList.add('empty-field');
                this.titleElement.dataset.placeholder = 'Song Title';
            } else {
                this.titleElement.classList.remove('empty-field');
                this.titleElement.removeAttribute('data-placeholder');
            }
        }
        if (this.sections.verse?.content) {
            this.sections.verse.content.textContent = this.originalSongData.verse || '';
            if (this.sections.verse.cue) {
                this.sections.verse.cue.value = this.originalSongData.verseCue || '';
            }
        }
        if (this.sections.preChorus?.content) {
            this.sections.preChorus.content.textContent = this.originalSongData.preChorus || '';
            if (this.sections.preChorus.cue) {
                this.sections.preChorus.cue.value = this.originalSongData.preChorusCue || '';
            }
        }
        if (this.sections.chorus?.content) {
            this.sections.chorus.content.textContent = this.originalSongData.chorus || '';
            if (this.sections.chorus.cue) {
                this.sections.chorus.cue.value = this.originalSongData.chorusCue || '';
            }
        }
        if (this.sections.bridge?.content) {
            this.sections.bridge.content.textContent = this.originalSongData.bridge || '';
            if (this.sections.bridge.cue) {
                this.sections.bridge.cue.value = this.originalSongData.bridgeCue || '';
            }
        }

        // Reset change tracking
        this.hasUnsavedChanges = false;
        this.originalSongData = null;

        // Hide save button
        if (this.saveBtn) {
            this.saveBtn.classList.add('hidden');
        }

        // Exit edit mode and remove chord buttons
        document.querySelectorAll('.editable-field[contenteditable="true"]').forEach(el => {
            el.setAttribute('contenteditable', 'false');
            el.classList.remove('editing');
            // Remove chord buttons
            const section = el.closest('.song-chord-section');
            if (section) {
                const chordBtn = section.querySelector('.chord-modal-btn-detail');
                if (chordBtn) {
                    chordBtn.remove();
                }
            }
        });
    }

    async hide() {
        // Force a check for changes to ensure state is up to date
        this.checkForChanges();

        const songIdToCheck = this.currentSongId;
        const originalDataSnapshot = this.originalSongData ? { ...this.originalSongData } : null;

        // Check for unsaved changes before closing
        if (this.hasUnsavedChanges) {
            const shouldSave = await this.showUnsavedChangesDialog();
            if (shouldSave) {
                await this.saveChanges();
            } else {
                this.discardChanges();

                // If this was a new empty song and user cancelled, delete it
                if (songIdToCheck && originalDataSnapshot) {
                    const isSongEmpty = !originalDataSnapshot.artist?.trim() &&
                        !originalDataSnapshot.title?.trim() &&
                        !originalDataSnapshot.verse?.trim() &&
                        !originalDataSnapshot.verseCue?.trim() &&
                        !originalDataSnapshot.chorus?.trim() &&
                        !originalDataSnapshot.chorusCue?.trim() &&
                        !originalDataSnapshot.preChorus?.trim() &&
                        !originalDataSnapshot.preChorusCue?.trim() &&
                        !originalDataSnapshot.bridge?.trim() &&
                        !originalDataSnapshot.bridgeCue?.trim();

                    if (isSongEmpty) {
                        // Delete the empty song
                        await this.songManager.deleteSong(songIdToCheck);
                        // Notify parent to refresh table
                        if (this.onUpdate) {
                            this.onUpdate();
                        }
                    }
                }
            }
        } else {
            // Even if no changes were made, check if it's an empty new song
            if (songIdToCheck && originalDataSnapshot) {
                const isSongEmpty = !originalDataSnapshot.artist?.trim() &&
                    !originalDataSnapshot.title?.trim() &&
                    !originalDataSnapshot.verse?.trim() &&
                    !originalDataSnapshot.verseCue?.trim() &&
                    !originalDataSnapshot.chorus?.trim() &&
                    !originalDataSnapshot.chorusCue?.trim() &&
                    !originalDataSnapshot.preChorus?.trim() &&
                    !originalDataSnapshot.preChorusCue?.trim() &&
                    !originalDataSnapshot.bridge?.trim() &&
                    !originalDataSnapshot.bridgeCue?.trim();

                if (isSongEmpty) {
                    // Delete the empty song
                    await this.songManager.deleteSong(songIdToCheck);
                    // Notify parent to refresh table
                    if (this.onUpdate) {
                        this.onUpdate();
                    }
                }
            }
        }

        this.modal.classList.add('hidden');
        this.currentSongId = null;
        this.hasUnsavedChanges = false;
        this.originalSongData = null;

        // Exit edit mode and remove chord buttons when hiding
        document.querySelectorAll('.editable-field[contenteditable="true"]').forEach(el => {
            el.setAttribute('contenteditable', 'false');
            el.classList.remove('editing');
            const section = el.closest('.song-chord-section');
            if (section) {
                const chordBtn = section.querySelector('.chord-modal-btn-detail');
                if (chordBtn) {
                    chordBtn.remove();
                }
            }
        });
    }
}

