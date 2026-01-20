// ChordProgressionEditor - Modal for building chord progressions with drag & drop
class ChordProgressionEditor {
    constructor(audioPlayer = null) {
        this.overlay = null;
        this.isVisible = false;
        this.currentKey = 'C';
        this.targetField = null;
        this.targetFieldName = '';
        this.onComplete = null;
        this.draggedProgressionBlock = null;

        // Initialize audio player (reuse PianoAudioPlayer)
        this.audioPlayer = audioPlayer || new PianoAudioPlayer();
        this.isAudioInitialized = false;

        // Define scale degrees for each key
        this.scaleChords = this.initializeScaleChords();

        this.createOverlay();

        // Initialize Chord Finder Modal
        this.chordFinderModal = new ChordFinderModal(
            (chord) => { // onAdd
                this.addProgressionBlock(chord);
                this.playChord(chord);
            },
            (chord) => { // onPlay
                this.playChord(chord);
            }
        );

        this.setupEventListeners();
    }

    initializeScaleChords() {
        // Major keys with their diatonic chords (I, ii, iii, IV, V, vi, vii°)
        // Plus common borrowed chords
        const majorKeys = {
            'C': { diatonic: ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'], borrowed: ['Cm', 'Fm', 'Ab', 'Bb', 'Eb'] },
            'G': { diatonic: ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim'], borrowed: ['Gm', 'Cm', 'Eb', 'F', 'Bb'] },
            'D': { diatonic: ['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'C#dim'], borrowed: ['Dm', 'Gm', 'Bb', 'C', 'F'] },
            'A': { diatonic: ['A', 'Bm', 'C#m', 'D', 'E', 'F#m', 'G#dim'], borrowed: ['Am', 'Dm', 'F', 'G', 'C'] },
            'E': { diatonic: ['E', 'F#m', 'G#m', 'A', 'B', 'C#m', 'D#dim'], borrowed: ['Em', 'Am', 'C', 'D', 'G'] },
            'B': { diatonic: ['B', 'C#m', 'D#m', 'E', 'F#', 'G#m', 'A#dim'], borrowed: ['Bm', 'Em', 'G', 'A', 'D'] },
            'F#': { diatonic: ['F#', 'G#m', 'A#m', 'B', 'C#', 'D#m', 'E#dim'], borrowed: ['F#m', 'Bm', 'D', 'E', 'A'] },
            'F': { diatonic: ['F', 'Gm', 'Am', 'Bb', 'C', 'Dm', 'Edim'], borrowed: ['Fm', 'Bbm', 'Db', 'Eb', 'Ab'] },
            'Bb': { diatonic: ['Bb', 'Cm', 'Dm', 'Eb', 'F', 'Gm', 'Adim'], borrowed: ['Bbm', 'Ebm', 'Gb', 'Ab', 'Db'] },
            'Eb': { diatonic: ['Eb', 'Fm', 'Gm', 'Ab', 'Bb', 'Cm', 'Ddim'], borrowed: ['Ebm', 'Abm', 'Cb', 'Db', 'Gb'] },
            'Ab': { diatonic: ['Ab', 'Bbm', 'Cm', 'Db', 'Eb', 'Fm', 'Gdim'], borrowed: ['Abm', 'Dbm', 'Fb', 'Gb', 'Cb'] },
            'Db': { diatonic: ['Db', 'Ebm', 'Fm', 'Gb', 'Ab', 'Bbm', 'Cdim'], borrowed: ['Dbm', 'Gbm', 'Bbb', 'Cb', 'Fb'] }
        };

        // Minor keys with their diatonic chords (i, ii°, III, iv, v/V, VI, VII)
        const minorKeys = {
            'Am': { diatonic: ['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G'], borrowed: ['A', 'D', 'E', 'E7'] },
            'Em': { diatonic: ['Em', 'F#dim', 'G', 'Am', 'Bm', 'C', 'D'], borrowed: ['E', 'A', 'B', 'B7'] },
            'Bm': { diatonic: ['Bm', 'C#dim', 'D', 'Em', 'F#m', 'G', 'A'], borrowed: ['B', 'E', 'F#', 'F#7'] },
            'F#m': { diatonic: ['F#m', 'G#dim', 'A', 'Bm', 'C#m', 'D', 'E'], borrowed: ['F#', 'B', 'C#', 'C#7'] },
            'C#m': { diatonic: ['C#m', 'D#dim', 'E', 'F#m', 'G#m', 'A', 'B'], borrowed: ['C#', 'F#', 'G#', 'G#7'] },
            'G#m': { diatonic: ['G#m', 'A#dim', 'B', 'C#m', 'D#m', 'E', 'F#'], borrowed: ['G#', 'C#', 'D#', 'D#7'] },
            'Dm': { diatonic: ['Dm', 'Edim', 'F', 'Gm', 'Am', 'Bb', 'C'], borrowed: ['D', 'G', 'A', 'A7'] },
            'Gm': { diatonic: ['Gm', 'Adim', 'Bb', 'Cm', 'Dm', 'Eb', 'F'], borrowed: ['G', 'C', 'D', 'D7'] },
            'Cm': { diatonic: ['Cm', 'Ddim', 'Eb', 'Fm', 'Gm', 'Ab', 'Bb'], borrowed: ['C', 'F', 'G', 'G7'] },
            'Fm': { diatonic: ['Fm', 'Gdim', 'Ab', 'Bbm', 'Cm', 'Db', 'Eb'], borrowed: ['F', 'Bb', 'C', 'C7'] },
            'Bbm': { diatonic: ['Bbm', 'Cdim', 'Db', 'Ebm', 'Fm', 'Gb', 'Ab'], borrowed: ['Bb', 'Eb', 'F', 'F7'] },
            'Ebm': { diatonic: ['Ebm', 'Fdim', 'Gb', 'Abm', 'Bbm', 'Cb', 'Db'], borrowed: ['Eb', 'Ab', 'Bb', 'Bb7'] }
        };

        return { ...majorKeys, ...minorKeys };
    }

    // Parse chord to get notes for playing
    parseChord(chordName) {
        if (!chordName || typeof chordName !== 'string') return null;

        const noteToSemitone = {
            'C': 0, 'C#': 1, 'Db': 1,
            'D': 2, 'D#': 3, 'Eb': 3,
            'E': 4, 'Fb': 4,
            'F': 5, 'F#': 6, 'Gb': 6,
            'G': 7, 'G#': 8, 'Ab': 8,
            'A': 9, 'A#': 10, 'Bb': 10,
            'B': 11, 'Cb': 11
        };

        const chordIntervals = {
            '': [0, 4, 7],           // Major
            'm': [0, 3, 7],          // Minor
            'dim': [0, 3, 6],        // Diminished
            '7': [0, 4, 7, 10],      // Dominant 7
            'maj7': [0, 4, 7, 11],   // Major 7
            'm7': [0, 3, 7, 10],     // Minor 7
            'sus4': [0, 5, 7],       // Sus4
            'sus2': [0, 2, 7],       // Sus2
        };

        // Parse root note
        const rootMatch = chordName.match(/^([A-G])([#b]?)/);
        if (!rootMatch) return null;

        const rootNote = rootMatch[1].toUpperCase();
        const accidental = rootMatch[2];
        const rootKey = rootNote + accidental;

        const rootSemitone = noteToSemitone[rootKey];
        if (rootSemitone === undefined) return null;

        // Get suffix
        let suffix = chordName.slice(rootMatch[0].length);

        // Find matching interval pattern
        let intervals = chordIntervals[suffix];
        if (!intervals) {
            // Try common patterns
            if (suffix.startsWith('m') && !suffix.startsWith('maj')) {
                intervals = chordIntervals['m'];
            } else if (suffix.includes('dim')) {
                intervals = chordIntervals['dim'];
            } else if (suffix.includes('7')) {
                intervals = chordIntervals['7'];
            } else {
                intervals = chordIntervals[''];
            }
        }

        // Calculate notes
        const notes = intervals.map(interval => rootSemitone + interval);

        return { notes, rootSemitone };
    }

    async playChord(chordName) {
        if (!this.isAudioInitialized) {
            try {
                await this.audioPlayer.initialize();
                this.isAudioInitialized = true;
            } catch (error) {
                console.error('Failed to initialize audio:', error);
                return;
            }
        }

        const chord = this.parseChord(chordName);
        if (chord && chord.notes && chord.notes.length > 0) {
            this.audioPlayer.playChord(chord.notes, 0.85, 0.6, 0.02);
        }
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'chordProgressionEditor';
        this.overlay.className = 'chord-progression-overlay hidden';

        this.overlay.innerHTML = `
            <div class="chord-progression-modal">
                <div class="chord-progression-header">
                    <h3>Chord Progression Editor</h3>
                    <div style="display:flex; gap:10px;">
                        <button id="openChordFinderBtn" class="btn-secondary" style="padding:5px 10px; font-size:0.85em;" title="Find Chord by Notes">
                            🔍 Find Chord
                        </button>
                        <button class="chord-progression-close" id="chordProgressionClose">&times;</button>
                    </div>
                </div>
                <div class="chord-progression-body">
                    <div class="key-selector-section">
                        <label for="keySelector">Key:</label>
                        <select id="keySelector" class="key-selector">
                            <optgroup label="Major Keys">
                                <option value="C">C Major</option>
                                <option value="G">G Major</option>
                                <option value="D">D Major</option>
                                <option value="A">A Major</option>
                                <option value="E">E Major</option>
                                <option value="B">B Major</option>
                                <option value="F#">F# Major</option>
                                <option value="F">F Major</option>
                                <option value="Bb">Bb Major</option>
                                <option value="Eb">Eb Major</option>
                                <option value="Ab">Ab Major</option>
                                <option value="Db">Db Major</option>
                            </optgroup>
                            <optgroup label="Minor Keys">
                                <option value="Am">A Minor</option>
                                <option value="Em">E Minor</option>
                                <option value="Bm">B Minor</option>
                                <option value="F#m">F# Minor</option>
                                <option value="C#m">C# Minor</option>
                                <option value="G#m">G# Minor</option>
                                <option value="Dm">D Minor</option>
                                <option value="Gm">G Minor</option>
                                <option value="Cm">C Minor</option>
                                <option value="Fm">F Minor</option>
                                <option value="Bbm">Bb Minor</option>
                                <option value="Ebm">Eb Minor</option>
                            </optgroup>
                        </select>
                    </div>
                    
                    <div class="chord-palette-section">
                        <div class="chord-palette-label">Diatonic Chords:</div>
                        <div class="chord-palette" id="diatonicChords"></div>
                        <div class="chord-palette-label borrowed-label">Borrowed / Common Chords:</div>
                        <div class="chord-palette borrowed" id="borrowedChords"></div>
                    </div>
                    
                    <div class="progression-builder-section">
                        <label>Your Progression:</label>
                        <div class="progression-drop-zone" id="progressionDropZone">
                            <div class="progression-blocks" id="progressionBlocks"></div>
                            <div class="drop-placeholder" id="dropPlaceholder">
                                <span>Double-tap or drag chords here to add</span>
                            </div>
                        </div>
                        <div class="progression-hint">Tip: Tap to hear • Double-tap or drag down to add • Drag blocks to reorder • Tap × to remove</div>
                    </div>
                </div>
                <div class="chord-progression-footer">
                    <button class="btn-cancel" id="progressionCancel">Cancel</button>
                    <button class="btn-done" id="progressionDone">Done</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);
    }

    setupEventListeners() {
        // Close button
        const closeBtn = this.overlay.querySelector('#chordProgressionClose');
        closeBtn.addEventListener('click', () => this.hide());

        // Cancel button
        const cancelBtn = this.overlay.querySelector('#progressionCancel');
        cancelBtn.addEventListener('click', () => this.hide());

        // Done button
        const doneBtn = this.overlay.querySelector('#progressionDone');
        doneBtn.addEventListener('click', () => this.complete());

        // Key selector
        const keySelector = this.overlay.querySelector('#keySelector');
        keySelector.addEventListener('change', (e) => {
            this.currentKey = e.target.value;
            this.renderChordPalette();
        });

        // Click outside to close
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.hide();
            }
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });

        // Setup drag and drop for the input area
        this.setupDragDrop();

        // Chord Finder Button
        const openFinderBtn = this.overlay.querySelector('#openChordFinderBtn');
        if (openFinderBtn) {
            openFinderBtn.addEventListener('click', () => {
                if (this.chordFinderModal) {
                    this.chordFinderModal.show();
                }
            });
        }
    }

    identifyChord(inputString) {
        if (!inputString || !inputString.trim()) return null;

        // Clean input: split by spaces or commas
        // "C E G" -> ["C", "E", "G"]
        const tokens = inputString.trim().split(/[\s,]+/);
        if (tokens.length < 3) return null; // Need 3+ notes

        const noteToSemitone = {
            'C': 0, 'C#': 1, 'Db': 1,
            'D': 2, 'D#': 3, 'Eb': 3,
            'E': 4, 'Fb': 4,
            'F': 5, 'F#': 6, 'Gb': 6,
            'G': 7, 'G#': 8, 'Ab': 8,
            'A': 9, 'A#': 10, 'Bb': 10,
            'B': 11, 'Cb': 11
        };

        const semitoneToNote = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

        // Initial Bass Note (first input token)
        const bassToken = tokens[0].toUpperCase();
        // Extract note from token (e.g. "C#" from "C#" or "C#4")
        const noteMatch = (t) => {
            const m = t.match(/^([A-G])([#b]?)/i);
            return m ? (m[1].toUpperCase() + (m[2] || '')) : null;
        };

        const bassNote = noteMatch(bassToken);
        if (!bassNote) return null;

        const bassSemi = noteToSemitone[bassNote];

        const uniqueSemitones = new Set();
        for (const token of tokens) {
            const n = noteMatch(token);
            if (n && noteToSemitone[n] !== undefined) {
                uniqueSemitones.add(noteToSemitone[n]);
            }
        }

        if (uniqueSemitones.size < 3) return null;

        const semitones = Array.from(uniqueSemitones).sort((a, b) => a - b);

        // Pattern Intervals (semitones)
        const patterns = {
            '': [0, 4, 7],      // Major
            'm': [0, 3, 7],     // Minor
            'dim': [0, 3, 6],   // Diminished
            'aug': [0, 4, 8],   // Augmented
            'sus4': [0, 5, 7],
            'sus2': [0, 2, 7],
            '7': [0, 4, 7, 10],     // Dominant 7
            'maj7': [0, 4, 7, 11],  // Maj 7
            'm7': [0, 3, 7, 10],    // min 7
            'm7b5': [0, 3, 6, 10],  // Half dim
            'dim7': [0, 3, 6, 9]    // Full dim
        };

        // Check each note as potential ROOT
        for (const root of semitones) {
            for (const [suffix, intervals] of Object.entries(patterns)) {
                // Must have all intervals
                const allPresent = intervals.every(interval => {
                    const step = (root + interval) % 12;
                    return uniqueSemitones.has(step);
                });

                // If match found
                if (allPresent) {
                    // Start with basic match
                    // If unique count > interval count, it might be an 'add' chord or just extra notes
                    // For now, prioritize exact matches or simple extensions containment
                    // Logic: If pattern size == unique size, it's exact.

                    if (intervals.length === uniqueSemitones.size) {
                        const rootName = semitoneToNote[root];
                        let result = rootName + suffix;

                        // Inversion check
                        if (root !== bassSemi) {
                            const bassName = semitoneToNote[bassSemi];
                            result += '/' + bassName;
                        }
                        return result;
                    }
                }
            }
        }

        return null;
    }

    setupDragDrop() {
        const dropZone = this.overlay.querySelector('#progressionDropZone');
        const blocksContainer = this.overlay.querySelector('#progressionBlocks');

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // Highlight drop zone
        dropZone.addEventListener('dragenter', () => {
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragover', (e) => {
            dropZone.classList.add('drag-over');

            // Show insertion indicator for reordering
            if (this.draggedProgressionBlock) {
                this.showInsertionIndicator(e, blocksContainer);
            }
        });

        dropZone.addEventListener('dragleave', (e) => {
            if (!dropZone.contains(e.relatedTarget)) {
                dropZone.classList.remove('drag-over');
                this.hideInsertionIndicator();
            }
        });

        // Handle drop
        dropZone.addEventListener('drop', (e) => {
            dropZone.classList.remove('drag-over');
            this.hideInsertionIndicator();

            // Check if we're reordering an existing block
            if (this.draggedProgressionBlock) {
                const insertIndex = this.getInsertionIndex(e, blocksContainer);
                this.reorderBlock(this.draggedProgressionBlock, insertIndex);
                this.draggedProgressionBlock = null;
            } else {
                // Adding a new chord from palette
                const chord = e.dataTransfer.getData('text/plain');
                if (chord) {
                    this.addProgressionBlock(chord);
                    this.playChord(chord);
                }
            }

            this.updatePlaceholderVisibility();
        });
    }

    showInsertionIndicator(e, container) {
        const blocks = Array.from(container.querySelectorAll('.progression-block:not(.dragging)'));
        const insertIndex = this.getInsertionIndex(e, container);

        // Remove existing indicator
        this.hideInsertionIndicator();

        // Create indicator
        const indicator = document.createElement('div');
        indicator.className = 'insertion-indicator';
        indicator.id = 'insertionIndicator';

        if (blocks.length === 0 || insertIndex >= blocks.length) {
            container.appendChild(indicator);
        } else {
            container.insertBefore(indicator, blocks[insertIndex]);
        }
    }

    hideInsertionIndicator() {
        const indicator = this.overlay.querySelector('#insertionIndicator');
        if (indicator) {
            indicator.remove();
        }
    }

    getInsertionIndex(e, container) {
        const blocks = Array.from(container.querySelectorAll('.progression-block:not(.dragging)'));

        if (blocks.length === 0) return 0;

        const mouseX = e.clientX;

        for (let i = 0; i < blocks.length; i++) {
            const rect = blocks[i].getBoundingClientRect();
            const midPoint = rect.left + rect.width / 2;

            if (mouseX < midPoint) {
                return i;
            }
        }

        return blocks.length;
    }

    reorderBlock(block, newIndex) {
        const container = this.overlay.querySelector('#progressionBlocks');
        const blocks = Array.from(container.querySelectorAll('.progression-block'));
        const currentIndex = blocks.indexOf(block);

        if (currentIndex === newIndex || currentIndex === newIndex - 1) {
            return; // No change needed
        }

        // Remove from current position
        block.remove();

        // Get updated blocks list
        const updatedBlocks = Array.from(container.querySelectorAll('.progression-block'));

        // Insert at new position
        if (newIndex >= updatedBlocks.length) {
            container.appendChild(block);
        } else {
            // Adjust index since we removed the block
            const adjustedIndex = currentIndex < newIndex ? newIndex - 1 : newIndex;
            if (adjustedIndex >= updatedBlocks.length) {
                container.appendChild(block);
            } else {
                container.insertBefore(block, updatedBlocks[adjustedIndex]);
            }
        }
    }

    addProgressionBlock(chordName, insertAtEnd = true) {
        const container = this.overlay.querySelector('#progressionBlocks');
        const block = this.createProgressionBlock(chordName);

        if (insertAtEnd) {
            container.appendChild(block);
        }

        this.updatePlaceholderVisibility();
        return block;
    }

    createProgressionBlock(chordName) {
        const block = document.createElement('div');
        block.className = 'progression-block';
        block.dataset.chord = chordName;
        block.draggable = true;

        const chordLabel = document.createElement('span');
        chordLabel.className = 'progression-block-chord';
        chordLabel.textContent = chordName;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'progression-block-delete';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Remove chord';

        block.appendChild(chordLabel);
        block.appendChild(deleteBtn);

        // Click to play chord
        block.addEventListener('click', (e) => {
            if (e.target !== deleteBtn) {
                this.playChord(chordName);
                block.classList.add('playing');
                setTimeout(() => block.classList.remove('playing'), 200);
            }
        });

        // Delete button
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            block.classList.add('removing');
            setTimeout(() => {
                block.remove();
                this.updatePlaceholderVisibility();
            }, 150);
        });

        // Drag to reorder
        block.addEventListener('dragstart', (e) => {
            this.draggedProgressionBlock = block;
            block.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', chordName);
        });

        block.addEventListener('dragend', () => {
            block.classList.remove('dragging');
            this.draggedProgressionBlock = null;
            this.hideInsertionIndicator();
        });

        // Touch support for reordering
        this.addTouchReorderSupport(block, chordName);

        return block;
    }

    addTouchReorderSupport(block, chordName) {
        let touchStartX = 0;
        let touchStartY = 0;
        let isDragging = false;
        let dragClone = null;
        let longPressTimer = null;

        block.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            isDragging = false;

            // Long press to start drag
            longPressTimer = setTimeout(() => {
                isDragging = true;
                block.classList.add('dragging');

                // Create visual clone
                dragClone = block.cloneNode(true);
                dragClone.className = 'progression-block drag-clone';
                document.body.appendChild(dragClone);
                dragClone.style.left = touchStartX - 30 + 'px';
                dragClone.style.top = touchStartY - 20 + 'px';

                // Vibration feedback if available
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
            }, 300);
        }, { passive: true });

        block.addEventListener('touchmove', (e) => {
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;

            // Cancel long press if moved too much before it triggered
            if (!isDragging && longPressTimer) {
                const deltaX = Math.abs(touchX - touchStartX);
                const deltaY = Math.abs(touchY - touchStartY);
                if (deltaX > 10 || deltaY > 10) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            }

            if (isDragging && dragClone) {
                e.preventDefault();
                dragClone.style.left = touchX - 30 + 'px';
                dragClone.style.top = touchY - 20 + 'px';

                // Show insertion indicator
                const container = this.overlay.querySelector('#progressionBlocks');
                this.showInsertionIndicatorAtPoint(touchX, touchY, container);
            }
        }, { passive: false });

        block.addEventListener('touchend', (e) => {
            clearTimeout(longPressTimer);

            if (isDragging && dragClone) {
                const touch = e.changedTouches[0];
                const container = this.overlay.querySelector('#progressionBlocks');
                const insertIndex = this.getInsertionIndexAtPoint(touch.clientX, touch.clientY, container);

                this.reorderBlock(block, insertIndex);

                document.body.removeChild(dragClone);
                dragClone = null;
                this.hideInsertionIndicator();
            } else if (!isDragging) {
                // It was a tap - play the chord
                this.playChord(chordName);
                block.classList.add('playing');
                setTimeout(() => block.classList.remove('playing'), 200);
            }

            block.classList.remove('dragging');
            isDragging = false;
        });
    }

    showInsertionIndicatorAtPoint(x, y, container) {
        const fakeEvent = { clientX: x, clientY: y };
        this.showInsertionIndicator(fakeEvent, container);
    }

    getInsertionIndexAtPoint(x, y, container) {
        const fakeEvent = { clientX: x, clientY: y };
        return this.getInsertionIndex(fakeEvent, container);
    }

    updatePlaceholderVisibility() {
        const container = this.overlay.querySelector('#progressionBlocks');
        const placeholder = this.overlay.querySelector('#dropPlaceholder');
        const hasBlocks = container.querySelectorAll('.progression-block').length > 0;

        if (hasBlocks) {
            placeholder.classList.add('hidden');
        } else {
            placeholder.classList.remove('hidden');
        }
    }

    clearProgressionBlocks() {
        const container = this.overlay.querySelector('#progressionBlocks');
        container.innerHTML = '';
        this.updatePlaceholderVisibility();
    }

    getProgressionChords() {
        const container = this.overlay.querySelector('#progressionBlocks');
        const blocks = container.querySelectorAll('.progression-block');
        return Array.from(blocks).map(block => block.dataset.chord);
    }

    renderChordPalette() {
        const diatonicContainer = this.overlay.querySelector('#diatonicChords');
        const borrowedContainer = this.overlay.querySelector('#borrowedChords');

        diatonicContainer.innerHTML = '';
        borrowedContainer.innerHTML = '';

        const keyData = this.scaleChords[this.currentKey];
        if (!keyData) return;

        // Render diatonic chords
        keyData.diatonic.forEach((chord, index) => {
            const chordBlock = this.createChordBlock(chord, index, false);
            diatonicContainer.appendChild(chordBlock);
        });

        // Render borrowed chords
        if (keyData.borrowed) {
            keyData.borrowed.forEach((chord, index) => {
                const chordBlock = this.createChordBlock(chord, index, true);
                borrowedContainer.appendChild(chordBlock);
            });
        }
    }

    createChordBlock(chordName, index, isBorrowed) {
        const block = document.createElement('div');
        block.className = `chord-block ${isBorrowed ? 'borrowed' : ''}`;
        block.textContent = chordName;
        block.draggable = true;

        // Roman numeral labels for diatonic chords
        if (!isBorrowed) {
            const isMinorKey = this.currentKey.endsWith('m');
            const romanNumerals = isMinorKey ?
                ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'] :
                ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];

            const label = document.createElement('span');
            label.className = 'chord-block-label';
            label.textContent = romanNumerals[index] || '';
            block.appendChild(label);
        }

        // Shared state for this block
        block._touchState = {
            lastAddTime: 0,
            lastTapTime: 0,
            lastTouchTime: 0,
            singleTapTimeout: null
        };
        const state = block._touchState;

        // Click to play (with delay to detect double-click) - desktop only
        let clickTimeout = null;

        block.addEventListener('click', (e) => {
            // Skip click events that came from touch (prevent double-firing on mobile)
            if (Date.now() - state.lastTouchTime < 800) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            if (!e.defaultPrevented) {
                // Clear any pending single-click action
                if (clickTimeout) {
                    clearTimeout(clickTimeout);
                    clickTimeout = null;
                }

                // Delay single-click to wait for potential double-click
                clickTimeout = setTimeout(() => {
                    this.playChord(chordName);

                    // Visual feedback
                    block.classList.add('playing');
                    setTimeout(() => block.classList.remove('playing'), 200);
                    clickTimeout = null;
                }, 250);
            }
        });

        // Double-click to add chord (desktop only)
        block.addEventListener('dblclick', (e) => {
            // Skip if this came from touch
            if (Date.now() - state.lastTouchTime < 800) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            e.preventDefault();

            // Cancel the pending single-click
            if (clickTimeout) {
                clearTimeout(clickTimeout);
                clickTimeout = null;
            }

            // Check cooldown
            const now = Date.now();
            if (now - state.lastAddTime < 500) return;
            state.lastAddTime = now;

            this.addProgressionBlock(chordName);
            this.playChord(chordName);

            // Visual feedback
            block.classList.add('added');
            setTimeout(() => block.classList.remove('added'), 300);
        });

        // Track touch time to prevent click/dblclick from firing
        block.addEventListener('touchstart', () => {
            state.lastTouchTime = Date.now();
        }, { passive: true });

        block.addEventListener('touchend', () => {
            state.lastTouchTime = Date.now();
        }, { passive: true });

        // Drag start
        block.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', chordName);
            e.dataTransfer.effectAllowed = 'copy';
            block.classList.add('dragging');
        });

        // Drag end
        block.addEventListener('dragend', () => {
            block.classList.remove('dragging');
        });

        // Touch support for mobile devices (includes double-tap)
        this.addTouchDragSupport(block, chordName);

        return block;
    }

    addTouchDragSupport(block, chordName) {
        // Use a shared state object attached to the block to prevent issues
        if (!block._touchState) {
            block._touchState = {
                lastAddTime: 0,
                lastTapTime: 0,
                singleTapTimeout: null
            };
        }
        const state = block._touchState;

        let touchStartX = 0;
        let touchStartY = 0;
        let isDragging = false;
        let dragClone = null;
        let lastTouchX = 0;
        let lastTouchY = 0;
        let hasMoved = false;
        const doubleTapDelay = 350; // ms between taps for double-tap
        const addCooldown = 500; // ms cooldown between adds

        block.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            lastTouchX = touchStartX;
            lastTouchY = touchStartY;
            isDragging = false;
            hasMoved = false;
        }, { passive: true });

        block.addEventListener('touchmove', (e) => {
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;
            const deltaY = touchY - touchStartY;
            const deltaX = Math.abs(touchX - touchStartX);

            // Store last touch position for touchend
            lastTouchX = touchX;
            lastTouchY = touchY;

            // Mark as moved if significant movement
            if (Math.abs(deltaY) > 5 || deltaX > 5) {
                hasMoved = true;
            }

            // Start drag if moved down significantly
            if (deltaY > 20 && !isDragging) {
                isDragging = true;

                // Cancel any pending single tap
                if (state.singleTapTimeout) {
                    clearTimeout(state.singleTapTimeout);
                    state.singleTapTimeout = null;
                }

                // Create visual clone
                dragClone = block.cloneNode(true);
                dragClone.className = 'chord-block drag-clone';
                dragClone.style.cssText = 'position:fixed;z-index:10003;pointer-events:none;opacity:0.9;transform:scale(1.1);';
                document.body.appendChild(dragClone);

                // Highlight drop zone
                const dropZone = this.overlay.querySelector('#progressionDropZone');
                if (dropZone) dropZone.classList.add('drag-over');
            }

            if (isDragging && dragClone) {
                e.preventDefault();
                dragClone.style.left = (touchX - 30) + 'px';
                dragClone.style.top = (touchY - 20) + 'px';
            }
        }, { passive: false });

        block.addEventListener('touchend', (e) => {
            const dropZone = this.overlay.querySelector('#progressionDropZone');
            if (dropZone) dropZone.classList.remove('drag-over');

            const now = Date.now();

            if (isDragging && dragClone) {
                // Handle drag drop
                const touchX = lastTouchX;
                const touchY = lastTouchY;

                // Hide clone temporarily to check element underneath
                dragClone.style.visibility = 'hidden';

                // Use elementFromPoint to find what's under the touch
                const elementUnder = document.elementFromPoint(touchX, touchY);

                // Check if we're over the drop zone or its children
                const isOverDropZone = elementUnder && (
                    elementUnder.id === 'progressionDropZone' ||
                    elementUnder.id === 'progressionBlocks' ||
                    elementUnder.id === 'dropPlaceholder' ||
                    elementUnder.closest('#progressionDropZone')
                );

                if (isOverDropZone && (now - state.lastAddTime > addCooldown)) {
                    state.lastAddTime = now;
                    this.addProgressionBlock(chordName);
                    this.playChord(chordName);
                }

                // Remove clone
                if (dragClone && dragClone.parentNode) {
                    dragClone.parentNode.removeChild(dragClone);
                }
                dragClone = null;
                isDragging = false;
                return;
            }

            isDragging = false;

            // Don't process taps if we moved significantly
            if (hasMoved) {
                return;
            }

            // Check for double-tap
            const timeSinceLastTap = now - state.lastTapTime;

            if (timeSinceLastTap < doubleTapDelay && timeSinceLastTap > 50) {
                // Double-tap detected - cancel pending single tap
                if (state.singleTapTimeout) {
                    clearTimeout(state.singleTapTimeout);
                    state.singleTapTimeout = null;
                }

                // Check cooldown to prevent duplicate adds
                if (now - state.lastAddTime < addCooldown) {
                    state.lastTapTime = 0;
                    return;
                }

                state.lastAddTime = now;
                state.lastTapTime = 0;

                e.preventDefault();
                this.addProgressionBlock(chordName);
                this.playChord(chordName);

                // Visual feedback
                block.classList.add('added');
                setTimeout(() => block.classList.remove('added'), 300);
            } else {
                // First tap - wait for potential second tap
                state.lastTapTime = now;

                state.singleTapTimeout = setTimeout(() => {
                    state.singleTapTimeout = null;
                    // Single tap confirmed - play the chord
                    this.playChord(chordName);
                    block.classList.add('playing');
                    setTimeout(() => block.classList.remove('playing'), 200);
                }, doubleTapDelay);
            }
        });

        // Also handle touchcancel
        block.addEventListener('touchcancel', () => {
            const dropZone = this.overlay.querySelector('#progressionDropZone');
            if (dropZone) dropZone.classList.remove('drag-over');

            if (dragClone && dragClone.parentNode) {
                dragClone.parentNode.removeChild(dragClone);
            }
            dragClone = null;
            isDragging = false;

            if (state.singleTapTimeout) {
                clearTimeout(state.singleTapTimeout);
                state.singleTapTimeout = null;
            }
        });
    }

    show(sectionName, targetField, songKey, onComplete) {
        this.targetField = targetField;
        this.targetFieldName = sectionName;
        this.onComplete = onComplete;
        this.draggedProgressionBlock = null;

        // Set the key from song or default to C
        if (songKey && this.scaleChords[songKey]) {
            this.currentKey = songKey;
        } else if (songKey) {
            // Try to find matching key (case insensitive, handle variations)
            const normalizedKey = this.normalizeKey(songKey);
            if (normalizedKey && this.scaleChords[normalizedKey]) {
                this.currentKey = normalizedKey;
            } else {
                this.currentKey = 'C';
            }
        } else {
            this.currentKey = 'C';
        }

        // Set key selector value
        const keySelector = this.overlay.querySelector('#keySelector');
        keySelector.value = this.currentKey;

        // Clear existing progression blocks
        this.clearProgressionBlocks();

        // Parse existing chords from field and add as blocks
        const existingChords = targetField ? targetField.textContent.trim() : '';
        if (existingChords) {
            const chords = this.parseExistingChords(existingChords);
            chords.forEach(chord => this.addProgressionBlock(chord));
        }

        // Render chord palette
        this.renderChordPalette();

        // Show overlay
        this.overlay.classList.remove('hidden');
        this.isVisible = true;

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    parseExistingChords(text) {
        // Parse chord text into individual chords
        // Handle formats like "C Am F G" or "C - Am - F - G" or "C | Am | F | G"
        const chordPattern = /([A-Ga-g][#b]?(?:m|min|maj|dim|aug|sus|add)?[0-9]?(?:sus[24]?|add[29]|maj[79]?|min[79]?|dim[79]?|aug)?[0-9]?)/g;
        const matches = text.match(chordPattern);
        return matches || [];
    }

    normalizeKey(key) {
        if (!key) return null;

        // Standardize the key format
        let normalized = key.trim();

        // Capitalize first letter
        normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);

        // Handle common variations
        if (normalized.endsWith('m') || normalized.endsWith('M')) {
            // Minor key
            normalized = normalized.slice(0, -1) + 'm';
        }

        // Handle flats
        if (normalized.length > 1 && normalized.charAt(1).toLowerCase() === 'b') {
            normalized = normalized.charAt(0) + 'b' + normalized.slice(2);
        }

        return normalized;
    }

    hide() {
        this.overlay.classList.add('hidden');
        this.isVisible = false;
        document.body.style.overflow = '';

        this.targetField = null;
        this.onComplete = null;
    }

    complete() {
        const chords = this.getProgressionChords();
        const progression = chords.join(' ');

        // Update the target field
        if (this.targetField) {
            this.targetField.textContent = progression;
        }

        // Call completion callback
        if (this.onComplete) {
            this.onComplete(progression);
        }

        this.hide();
    }
}

// Make it globally available
window.ChordProgressionEditor = ChordProgressionEditor;

