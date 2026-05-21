/**
 * GuitarChordTrainer.js - Controller logic for the dedicated Guitar Chord Trainer.
 * Provides interactive virtual fretboard chord creation and song chord study modes.
 */
class GuitarChordTrainer {
    constructor() {
        this.audioPlayer = new PianoAudioPlayer();
        this.chordParser = new ChordParser();
        this.firebaseManager = new FirebaseManager();
        this.songManager = new SongManager(this.firebaseManager);
        this.renderer = new GuitarRenderer();
        
        // State Variables
        this.songId = null;
        this.songData = null;
        this.songChords = [];
        this.currentChordIndex = 0;
        this.currentChordName = '';
        this.currentChordFingering = null;
        this.isAudioEnabled = true;
        this.isInitialLoad = true;
        
        // User's active fretboard shape: [LowE, A, D, G, B, HighE]
        // 0 = open, 'x' = muted, number = fret
        this.userFrets = ['x', 'x', 'x', 'x', 'x', 'x'];
        this.isShowingHint = false;
        this.complexity = 'basic'; // basic or pro

        this.dom = {
            practicingSongName: document.getElementById('practicingSongName'),
            practicingSongThumbnail: document.getElementById('practicingSongThumbnail'),
            chordButtonsContainer: document.getElementById('chordButtonsContainer'),
            chordDisplay: document.getElementById('chordDisplay'),
            notesDisplay: document.getElementById('notesDisplay'),
            chordDiagramContainer: document.getElementById('chordDiagramContainer'),
            interactiveFretboard: document.getElementById('interactiveFretboard'),
            strumTargetBtn: document.getElementById('strumTargetBtn'),
            showHintBtn: document.getElementById('showHintBtn'),
            checkFretboardBtn: document.getElementById('checkFretboardBtn'),
            nextChordBtn: document.getElementById('nextChordBtn'),
            guitarComplexityBtn: document.getElementById('guitarComplexityBtn'),
            complexityText: document.getElementById('complexityText'),
            complexityIcon: document.getElementById('complexityIcon'),
            resultOverlay: document.getElementById('resultOverlay'),
            audioToggle: document.getElementById('audioToggle'),
            complexityAudioIcon: document.getElementById('complexityAudioIcon'),
            guideToggle: document.getElementById('guideToggle'),
            chordOverviewToggle: document.getElementById('chordOverviewToggle'),
            chordOverviewLabel: document.getElementById('chordOverviewLabel'),
            trainerPracticeMode: document.getElementById('trainerPracticeMode'),
            trainerOverviewMode: document.getElementById('trainerOverviewMode'),
            chordOverviewGrid: document.getElementById('chordOverviewGrid'),
            recreateChordsBtn: document.getElementById('recreateChordsBtn')
        };

        this.init();
    }

    async init() {
        console.log('Initializing Guitar Chord Trainer...');
        
        // 0. Initialize Firebase Manager
        try {
            await this.firebaseManager.initialize();
            
            // Wait for Firebase to restore session if not authenticated
            if (this.firebaseManager && !this.firebaseManager.isAuthenticated()) {
                console.log('GuitarChordTrainer: Waiting for auth to resolve before loading song...');
                await new Promise(resolve => {
                    const unsubscribe = this.firebaseManager.onAuthStateChanged(user => {
                        if (user) {
                            unsubscribe();
                            resolve();
                        } else {
                            // If no user after 2 seconds, stop waiting
                            setTimeout(() => { unsubscribe(); resolve(); }, 2000);
                        }
                    });
                });
            }

            // Sync with the authenticated user's database key (popsongChordBook_<userId>)
            const currentUser = this.firebaseManager.getCurrentUser();
            if (currentUser) {
                console.log('GuitarChordTrainer: User is authenticated. Enabling sync for user:', currentUser.uid);
                this.songManager.enableSync(currentUser.uid);
            } else {
                console.log('GuitarChordTrainer: No authenticated user. Running as guest/offline.');
            }
        } catch (e) {
            console.warn('Firebase initialization bypassed or failed:', e);
        }
        
        // 1. Initialize Audio Player
        try {
            await this.audioPlayer.initialize();
            this.audioPlayer.setSound('guitar-strum');
        } catch (e) {
            console.error('Audio initialization failed:', e);
        }

        // 2. Parse URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        this.songId = urlParams.get('songId');
        
        // Load saved complexity preference
        const savedComplexity = localStorage.getItem('guitar_trainer_complexity');
        if (savedComplexity) {
            this.complexity = savedComplexity;
            this.updateComplexityUI();
        }

        // Initialize Audio Toggle UI
        this.updateAudioToggleUI();

        // Initialize Guide/Hint Toggle UI
        this.updateGuideToggleUI();

        // 3. Load Song details and setup UI
        if (!this.songId) {
            console.log('GuitarChordTrainer: No songId provided, attempting to find a fallback song...');
            try {
                let songs = await this.songManager.loadSongs(true);
                if (!songs || songs.length === 0) {
                    songs = await this.songManager.loadSongs(false);
                }

                // If there are absolutely no songs, seed them!
                if (!songs || songs.length === 0) {
                    await this.seedDefaultSongs();
                    // Load again after seeding
                    songs = await this.songManager.loadSongs(false);
                }

                if (songs && songs.length > 0) {
                    // Try to find a song that has chords
                    const practiceable = songs.find(s => {
                        const stringFields = ['verse', 'chorus', 'preChorus', 'bridge'];
                        const hasChords = stringFields.some(field => s[field] && typeof s[field] === 'string' && s[field].trim().length > 0);
                        const hasChordData = s.chordData && s.chordData.chords && s.chordData.chords.length > 0;
                        return hasChords || hasChordData;
                    });
                    this.songId = practiceable ? practiceable.id : songs[0].id;
                    console.log('GuitarChordTrainer: Selected fallback song ID:', this.songId);
                }
            } catch (e) {
                console.error('Error loading songs for fallback:', e);
            }
        }

        if (this.songId) {
            await this.loadSongDetails();
        } else {
            alert('No Song ID provided. Redirecting to library.');
            window.location.href = 'songlist.html';
            return;
        }

        // 4. Draw empty fretboard grid
        this.renderInteractiveFretboardGrid();

        // 5. Setup Action Button Event Listeners
        this.setupEventListeners();

        // 6. Force start in Chord Overview mode by default
        this.toggleChordOverviewMode(true);
    }

    async seedDefaultSongs() {
        console.log('GuitarChordTrainer: Seeding default songs...');
        try {
            // Load the script dynamically to get DEFAULT_SONGS
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'js/data/default_songs.js';
                script.onload = () => {
                    console.log('default_songs.js loaded successfully');
                    resolve();
                };
                script.onerror = () => {
                    console.error('Failed to load default_songs.js');
                    reject(new Error('Script load failed'));
                };
                document.head.appendChild(script);
            });

            if (typeof DEFAULT_SONGS !== 'undefined' && Array.isArray(DEFAULT_SONGS)) {
                console.log(`GuitarChordTrainer: Importing ${DEFAULT_SONGS.length} default songs...`);
                // Import songs without replacing existing ones (though list is currently empty)
                await this.songManager.importSongs(DEFAULT_SONGS, false);
                return true;
            } else {
                throw new Error('DEFAULT_SONGS is not defined or is not an array after script load');
            }
        } catch (error) {
            console.error('GuitarChordTrainer: Seeding default songs failed, using hardcoded fallback song...', error);
            // Last resort: add Bryan Adams - Summer of 69
            const fallbackSong = {
                id: 'fallback_summer69',
                artist: 'Bryan Adams',
                title: 'Summer of 69',
                verse: 'D A (3x)',
                chorus: 'Bm A D G (2x)',
                preChorus: 'D A (2x)',
                bridge: 'F B C B (2x)'
            };
            await this.songManager.importSongs([fallbackSong], false);
            return true;
        }
    }

    async loadSongDetails() {
        try {
            console.log('Loading song details for practice ID:', this.songId);
            // Load songs database
            let songs = await this.songManager.loadSongs(true);
            
            // Robust Fallback: If no songs returned (offline or not authenticated), fall back to local storage cache
            if (!songs || songs.length === 0) {
                console.log('No songs returned from Firebase force-load, falling back to local cache...');
                songs = await this.songManager.loadSongs(false);
            }

            let song = this.songManager.getSongById(this.songId);
            if (!song && !isNaN(this.songId)) {
                song = this.songManager.getSongById(Number(this.songId));
            }

            if (!song) {
                alert(`Song with ID ${this.songId} not found.`);
                window.location.href = 'songlist.html';
                return;
            }

            this.songData = song;

            // Update Header labels
            if (this.dom.practicingSongName) {
                const artist = song.artist || 'Unknown';
                const title = song.title || 'Untitled';
                this.dom.practicingSongName.textContent = `${artist} - ${title}`;
                
                // Set Back button to go back to this song's details
                const backLink = document.querySelector('.back-link');
                if (backLink) {
                    backLink.href = `songlist.html?id=${this.songId}`;
                }
            }

            // Fetch cover artwork
            if (this.dom.practicingSongThumbnail) {
                this.loadSongArtwork(song.artist, song.title);
            }

            // Load and filter chords
            this.extractAndFilterChords();

            // Render Chord blocks toolbar
            this.renderSongChordToolbar();

            // Load first chord
            if (this.songChords.length > 0) {
                this.selectChord(0);
            } else {
                alert('No practiceable chords found in this song.');
                window.location.href = 'songlist.html';
            }

        } catch (e) {
            console.error('Failed to load song details:', e);
        }
    }

    extractAndFilterChords() {
        if (!this.songData) return;

        // 1. Get unique chords from text fields
        const stringFields = ['verse', 'chorus', 'preChorus', 'bridge'];
        const isChord = (s) => /^[A-G][b#]?/.test(s) && !s.includes('(');
        const uniqueNames = new Set();

        stringFields.forEach(field => {
            if (this.songData[field] && typeof this.songData[field] === 'string') {
                const parts = this.songData[field].split(/[\s|]+/);
                parts.forEach(p => {
                    const trimmed = p.trim();
                    if (trimmed && trimmed !== '?' && trimmed !== 'N.C.' && isChord(trimmed)) {
                        uniqueNames.add(trimmed);
                    }
                });
            }
        });

        // 2. Also extract from chordData.chords array
        if (this.songData.chordData && Array.isArray(this.songData.chordData.chords)) {
            this.songData.chordData.chords.forEach(c => {
                const name = c.name || c.chord;
                if (name && name !== '?' && name !== 'N.C.') {
                    uniqueNames.add(name);
                }
            });
        }

        let chordsList = Array.from(uniqueNames);

        // Apply complexity filtering
        if (this.complexity === 'basic') {
            chordsList = [...new Set(chordsList.map(c => this.simplifyChord(c)))];
        }

        // Keep only chords that actually have a fingering in our GuitarChordDatabase
        this.songChords = chordsList.filter(chordName => {
            const simplified = this.simplifyChord(chordName);
            return window.GuitarChordDatabase[chordName] || window.GuitarChordDatabase[simplified];
        });
    }

    renderSongChordToolbar() {
        if (!this.dom.chordButtonsContainer || !this.songData) return;

        this.dom.chordButtonsContainer.innerHTML = '';

        const sections = [
            { name: this.songData.verseTitle || 'VERSE', type: 'verse', text: this.songData.verse || '' },
            { name: this.songData.chorusTitle || 'CHORUS', type: 'chorus', text: this.songData.chorus || '' },
            { name: this.songData.preChorusTitle || 'PRE-CHORUS', type: 'pre-chorus', text: this.songData.preChorus || '' },
            { name: this.songData.bridgeTitle || 'BRIDGE', type: 'bridge', text: this.songData.bridge || '' }
        ];

        // Map blocks, filter empty, build UI rows
        const grouped = sections.map(sec => {
            const trimmed = (sec.text || '').trim();
            const found = trimmed ? trimmed.match(/\||\d+x|[^\s|]+/g) || [] : [];
            return {
                section: sec.name,
                type: sec.type,
                chords: found
            };
        }).filter(g => g.chords.length > 0);

        if (grouped.length === 0) {
            this.dom.chordButtonsContainer.style.display = 'none';
            return;
        }

        grouped.forEach(group => {
            const groupEl = document.createElement('div');
            groupEl.className = 'chord-toolbar-group';

            const header = document.createElement('div');
            header.className = 'chord-toolbar-section-header';
            header.textContent = group.section;
            groupEl.appendChild(header);

            const row = document.createElement('div');
            row.className = 'chord-toolbar-buttons-row';

            group.chords.forEach(chord => {
                if (chord === '|' || /^\d+x$/.test(chord)) {
                    const marker = document.createElement('span');
                    marker.className = 'chord-toolbar-inline-marker';
                    marker.textContent = chord;
                    row.appendChild(marker);
                } else {
                    const btn = document.createElement('button');
                    btn.className = `chord-suggestion-btn chord-type-${group.type}`;
                    
                    const displayName = this.complexity === 'basic' ? this.simplifyChord(chord) : chord;
                    btn.textContent = displayName;

                    // Click selects the chord
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        const idx = this.songChords.indexOf(displayName);
                        if (idx !== -1) {
                            this.selectChord(idx);
                        } else {
                            // Temporary selection if not strictly in filtered list
                            this.currentChordName = displayName;
                            this.loadActiveChord();
                        }
                    };

                    row.appendChild(btn);
                }
            });

            groupEl.appendChild(row);
            this.dom.chordButtonsContainer.appendChild(groupEl);
        });
    }

    selectChord(index) {
        if (index < 0 || index >= this.songChords.length) return;
        this.currentChordIndex = index;
        this.currentChordName = this.songChords[index];
        this.loadActiveChord();

        // Highlight selected button in toolbar
        document.querySelectorAll('.chord-suggestion-btn').forEach(btn => {
            btn.classList.toggle('active', btn.textContent === this.currentChordName);
        });
    }

    loadActiveChord() {
        this.isShowingHint = false;
        this.updateGuideToggleUI();
        
        // 1. Fetch fingering data
        const simplified = this.simplifyChord(this.currentChordName);
        this.currentChordFingering = window.GuitarChordDatabase[this.currentChordName] || 
                                     window.GuitarChordDatabase[simplified] || 
                                     window.GuitarChordDatabase[simplified.split('/')[0]];

        if (!this.currentChordFingering) {
            console.error('No fingering found for:', this.currentChordName);
            return;
        }

        // 2. Clear/reset user fret selections
        this.userFrets = ['x', 'x', 'x', 'x', 'x', 'x'];

        // 3. Update Text labels
        if (this.dom.chordDisplay) {
            this.dom.chordDisplay.textContent = this.currentChordName;
        }
        if (this.dom.notesDisplay) {
            this.dom.notesDisplay.textContent = 'RECREATE THIS CHORD';
        }

        // 4. Render correct SVG diagram card
        if (this.dom.chordDiagramContainer && this.currentChordFingering) {
            this.dom.chordDiagramContainer.innerHTML = this.renderer.renderSVG(this.currentChordFingering);
        }

        // 5. Update Interactive Fretboard UI
        this.updateInteractiveFretboardDisplay();

        // 6. Strum target automatically to introduce the sound (only if not initial load)
        if (!this.isInitialLoad) {
            setTimeout(() => {
                this.strumChord(this.currentChordName);
            }, 300);
        } else {
            // Reset flag so subsequent chord selections/clicks will trigger sound
            this.isInitialLoad = false;
        }
    }

    renderInteractiveFretboardGrid() {
        const fretboard = this.dom.interactiveFretboard;
        if (!fretboard) return;
        fretboard.innerHTML = '';

        const numStrings = 6;
        const numFrets = 5;
        const romanNumerals = ['I', 'II', 'III', 'IV', 'V'];

        // Draw vertical metal strings
        for (let i = 0; i < numStrings; i++) {
            const stringLine = document.createElement('div');
            stringLine.className = 'fretboard-string';
            stringLine.style.left = `calc(10px + (${i} * (100% - 20px) / 5))`;
            fretboard.appendChild(stringLine);
        }

        // Draw horizontal frets & click targets
        for (let fretIdx = 1; fretIdx <= numFrets; fretIdx++) {
            const fretRow = document.createElement('div');
            fretRow.className = 'fret-row';
            
            const fretLabel = document.createElement('span');
            fretLabel.className = 'fret-label';
            fretLabel.textContent = romanNumerals[fretIdx - 1];
            fretRow.appendChild(fretLabel);

            // Click zone intersections positioned absolute on the strings
            for (let stringIdx = 0; stringIdx < numStrings; stringIdx++) {
                const zone = document.createElement('div');
                zone.className = 'fretboard-intersection';
                zone.style.position = 'absolute';
                zone.style.left = `calc(10px + (${stringIdx} * (100% - 20px) / 5) - 16px)`;
                zone.style.width = '32px';

                zone.onclick = (e) => {
                    e.stopPropagation();
                    this.handleFretboardClick(stringIdx, fretIdx);
                };

                fretRow.appendChild(zone);
            }
            fretboard.appendChild(fretRow);
        }
    }

    handleFretboardClick(stringIdx, fretIdx) {
        this.isShowingHint = false;
        this.updateGuideToggleUI();
        
        const currentVal = this.userFrets[stringIdx];
        
        if (currentVal === fretIdx) {
            // Tapping same fret clears it (reset to open/muted depending on standard)
            this.userFrets[stringIdx] = 'x';
        } else {
            // Select new fret
            this.userFrets[stringIdx] = fretIdx;
        }

        this.updateInteractiveFretboardDisplay();
        this.strumUserSelectionLocally();
    }

    updateInteractiveFretboardDisplay() {
        const numStrings = 6;
        const numFrets = 5;

        // 1. Draw Open/Muted nut indicator row
        const controls = document.querySelectorAll('.string-control');
        controls.forEach((control, idx) => {
            const val = this.userFrets[idx];
            control.classList.remove('open', 'mute');

            if (val === 0) {
                control.textContent = this.getNoteName(idx, 0);
                control.classList.add('open');
            } else if (val === 'x') {
                control.textContent = 'X';
                control.classList.add('mute');
            } else {
                // Fretted note: nut indicator is blank
                control.textContent = '';
            }
        });

        // 2. Draw finger dots on the fretboard
        const rows = this.dom.interactiveFretboard.querySelectorAll('.fret-row');
        rows.forEach((row, rIdx) => {
            const fretIdx = rIdx + 1;
            const intersections = row.querySelectorAll('.fretboard-intersection');
            
            intersections.forEach((zone, sIdx) => {
                // Clear old dot
                zone.innerHTML = '';

                const userVal = this.userFrets[sIdx];
                const correctVal = this.currentChordFingering ? this.currentChordFingering.frets[sIdx] : null;
                const correctFinger = this.currentChordFingering && this.currentChordFingering.fingers ? this.currentChordFingering.fingers[sIdx] : null;

                const noteName = this.getNoteName(sIdx, fretIdx);
                const isNatural = ['C', 'D', 'E', 'F', 'G', 'A', 'B'].includes(noteName);

                if (this.isShowingHint && String(correctVal) === String(fretIdx)) {
                    // Draw hint dot
                    const hintDot = document.createElement('div');
                    hintDot.className = 'fretboard-finger-dot hint-dot';
                    hintDot.textContent = noteName;
                    zone.appendChild(hintDot);
                } else if (String(userVal) === String(fretIdx)) {
                    // Draw active user dot
                    const dot = document.createElement('div');
                    dot.className = 'fretboard-finger-dot';
                    dot.textContent = noteName;
                    zone.appendChild(dot);
                } else if (this.isShowingHint && isNatural) {
                    // Draw subtle natural note dot
                    const naturalDot = document.createElement('div');
                    naturalDot.className = 'fretboard-finger-dot natural-note-dot';
                    naturalDot.textContent = noteName;
                    zone.appendChild(naturalDot);
                }
            });
        });
    }

    getNoteName(stringIdx, fretVal) {
        if (fretVal === 'x' || fretVal === null || fretVal === undefined) return '';
        const fretNum = parseInt(fretVal);
        if (isNaN(fretNum)) return '';
        
        const openStrings = [40, 45, 50, 55, 59, 64];
        const midi = openStrings[stringIdx] + fretNum;
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        return noteNames[midi % 12];
    }

    strumUserSelectionLocally() {
        if (!this.isAudioEnabled) return;
        // Calculate MIDI notes from user's current shape and play a strum
        const openStrings = [40, 45, 50, 55, 59, 64];
        const notes = [];

        this.userFrets.forEach((fret, stringIdx) => {
            if (fret === 'x' || fret === null) return;
            const fretNum = parseInt(fret);
            if (!isNaN(fretNum)) {
                notes.push(openStrings[stringIdx] + fretNum);
            }
        });

        if (notes.length > 0) {
            this.audioPlayer.initialize().then(() => {
                this.audioPlayer.setSound('guitar-strum');
                this.audioPlayer.playChord(notes, 2.5, 0.4, 0.035, true);
            });
        }
    }

    strumChord(chordName) {
        if (!this.isAudioEnabled) return;
        this.audioPlayer.initialize().then(() => {
            this.audioPlayer.setSound('guitar-strum');
            const chord = this.chordParser.parseGuitarChord(chordName, window.GuitarChordDatabase);
            if (chord && chord.notes) {
                this.audioPlayer.playChord(chord.notes, 3.0, 0.5, 0.035, true);
            }
        });
    }

    checkAnswer() {
        if (!this.currentChordFingering) return;

        const correctFrets = this.currentChordFingering.frets;
        let isCorrect = true;

        for (let i = 0; i < 6; i++) {
            const userVal = this.userFrets[i];
            const correctVal = correctFrets[i];

            if (String(userVal) !== String(correctVal)) {
                isCorrect = false;
                break;
            }
        }

        this.showResultOverlay(isCorrect);

        if (isCorrect) {
            // Play target strum and triumphant feedback
            this.strumChord(this.currentChordName);
            
            // Advance to next song chord automatically after short delay
            setTimeout(() => {
                const nextIdx = (this.currentChordIndex + 1) % this.songChords.length;
                this.selectChord(nextIdx);
            }, 1200);
        } else {
            // Play error low frequency hum
            if (this.isAudioEnabled) {
                this.audioPlayer.initialize().then(() => {
                    this.audioPlayer.playNote(36, 0.5, 0.4);
                });
            }
            
            // Shake the fretboard card for premium physical response
            const card = document.querySelector('.fretboard-card');
            if (card) {
                card.classList.add('shake');
                setTimeout(() => card.classList.remove('shake'), 400);
            }
        }
    }

    showResultOverlay(correct) {
        const overlay = this.dom.resultOverlay;
        if (!overlay) return;

        overlay.classList.remove('show', 'correct', 'incorrect');
        
        // Trigger reflow
        void overlay.offsetWidth;

        overlay.classList.add('show', correct ? 'correct' : 'incorrect');

        setTimeout(() => {
            overlay.classList.remove('show');
        }, 800);
    }

    showHint() {
        this.isShowingHint = true;
        this.updateGuideToggleUI();
        // Autofill correct open/muted values for user convenience
        if (this.currentChordFingering) {
            this.currentChordFingering.frets.forEach((val, idx) => {
                if (val === 0 || val === 'x') {
                    this.userFrets[idx] = val;
                } else {
                    this.userFrets[idx] = 'x'; // Clear fretted notes to let them tap correct visual targets
                }
            });
        }
        this.updateInteractiveFretboardDisplay();
    }

    toggleHint() {
        this.isShowingHint = !this.isShowingHint;
        this.updateGuideToggleUI();
        if (this.isShowingHint) {
            // Autofill correct open/muted values for user convenience
            if (this.currentChordFingering) {
                this.currentChordFingering.frets.forEach((val, idx) => {
                    if (val === 0 || val === 'x') {
                        this.userFrets[idx] = val;
                    } else {
                        // Clear non-matching notes
                        if (String(this.userFrets[idx]) !== String(val)) {
                            this.userFrets[idx] = 'x';
                        }
                    }
                });
            }
        }
        this.updateInteractiveFretboardDisplay();
    }

    updateGuideToggleUI() {
        if (this.dom.guideToggle) {
            const label = this.dom.guideToggle.querySelector('.label');
            if (label) label.textContent = this.isShowingHint ? 'GUIDE ON' : 'GUIDE OFF';
            this.dom.guideToggle.classList.toggle('active', this.isShowingHint);
        }
    }

    cycleComplexity() {
        this.complexity = this.complexity === 'basic' ? 'pro' : 'basic';
        localStorage.setItem('guitar_trainer_complexity', this.complexity);
        this.updateComplexityUI();

        // Reload song list and reset active index
        this.extractAndFilterChords();
        this.renderSongChordToolbar();
        if (this.songChords.length > 0) {
            this.selectChord(0);
        }

        // Proactively refresh Chord Overview if visible
        if (this.dom.trainerOverviewMode && !this.dom.trainerOverviewMode.classList.contains('hidden')) {
            this.renderChordOverviewGrid();
        }
    }

    updateComplexityUI() {
        const isBasic = this.complexity === 'basic';
        if (this.dom.complexityText) this.dom.complexityText.textContent = isBasic ? 'BASIC' : 'PRO';
        if (this.dom.complexityIcon) this.dom.complexityIcon.textContent = isBasic ? '🔘' : '🔄';
        
        if (this.dom.guitarComplexityBtn) {
            this.dom.guitarComplexityBtn.style.background = isBasic ? 'rgba(255,255,255,0.2)' : '#fbbf24';
            this.dom.guitarComplexityBtn.style.color = isBasic ? 'white' : '#92400e';
            this.dom.guitarComplexityBtn.style.borderColor = isBasic ? 'rgba(255,255,255,0.3)' : '#f59e0b';
        }
    }

    updateAudioToggleUI() {
        if (this.dom.audioToggle) {
            const label = this.dom.audioToggle.querySelector('.label');
            const icon = this.dom.audioToggle.querySelector('.icon');
            if (label) label.textContent = this.isAudioEnabled ? 'AUDIO ON' : 'AUDIO OFF';
            if (icon) icon.textContent = this.isAudioEnabled ? '🔊' : '🔇';
            this.dom.audioToggle.classList.toggle('active', this.isAudioEnabled);
        }
        if (this.dom.complexityAudioIcon) {
            this.dom.complexityAudioIcon.textContent = this.isAudioEnabled ? '🔊' : '🔇';
        }
    }

    setupEventListeners() {
        // Nut Open/Muted controls click cycling
        const controls = document.querySelectorAll('.string-control');
        controls.forEach((control, idx) => {
            control.onclick = (e) => {
                e.stopPropagation();
                this.isShowingHint = false;
                this.updateGuideToggleUI();
                const currentVal = this.userFrets[idx];

                if (currentVal === 'x') {
                    this.userFrets[idx] = 0; // Cycle X -> O
                } else if (currentVal === 0) {
                    this.userFrets[idx] = 'x'; // Cycle O -> X
                } else {
                    // Fretted: cycle to open
                    this.userFrets[idx] = 0;
                }

                this.updateInteractiveFretboardDisplay();
                this.strumUserSelectionLocally();
            };
        });

        // Strum button
        if (this.dom.strumTargetBtn) {
            this.dom.strumTargetBtn.onclick = () => {
                this.strumChord(this.currentChordName);
            };
        }

        // Show Hint / Show Shape
        if (this.dom.showHintBtn) {
            this.dom.showHintBtn.onclick = () => this.showHint();
        }

        // Check Answer
        if (this.dom.checkFretboardBtn) {
            this.dom.checkFretboardBtn.onclick = () => this.checkAnswer();
        }

        // Skip Chord
        if (this.dom.nextChordBtn) {
            this.dom.nextChordBtn.onclick = () => {
                const nextIdx = (this.currentChordIndex + 1) % this.songChords.length;
                this.selectChord(nextIdx);
            };
        }

        // Complexity Cycle
        if (this.dom.guitarComplexityBtn) {
            this.dom.guitarComplexityBtn.onclick = () => this.cycleComplexity();
        }

        // Audio Toggle
        if (this.dom.audioToggle) {
            this.dom.audioToggle.onclick = () => {
                this.isAudioEnabled = !this.isAudioEnabled;
                this.updateAudioToggleUI();
            };
        }

        // Guide/Hints Toggle
        if (this.dom.guideToggle) {
            this.dom.guideToggle.onclick = () => {
                this.toggleHint();
            };
        }
        if (this.dom.complexityAudioIcon) {
            this.dom.complexityAudioIcon.onclick = () => {
                this.isAudioEnabled = !this.isAudioEnabled;
                this.updateAudioToggleUI();
            };
        }

        // Chord Overview Toggle next to Hints
        if (this.dom.chordOverviewToggle) {
            this.dom.chordOverviewToggle.onclick = () => {
                this.toggleChordOverviewMode();
            };
        }

        // Recreate Chords Button
        if (this.dom.recreateChordsBtn) {
            this.dom.recreateChordsBtn.onclick = () => {
                this.toggleChordOverviewMode(false);
            };
        }

        // Fullscreen Mode BACK Button
        const exitTestBtn = document.getElementById('exitTestBtn');
        if (exitTestBtn) {
            exitTestBtn.onclick = () => {
                this.toggleChordOverviewMode(true);
            };
        }

        // Header BACK Button (back-link) interception
        const backLink = document.querySelector('.back-link');
        if (backLink) {
            backLink.onclick = (e) => {
                const overviewMode = this.dom.trainerOverviewMode;
                // If we are currently in Practice Mode (Overview Mode is hidden), go to Overview Mode instead of leaving the page
                if (overviewMode && overviewMode.classList.contains('hidden')) {
                    e.preventDefault();
                    this.toggleChordOverviewMode(true);
                }
                // Otherwise, let the default link behavior take us back to the songlist
            };
        }
    }

    simplifyChord(name) {
        if (!name) return "";
        const match = name.match(/^([A-G][b#]?(?:m(?!a))?)/);
        if (match) return match[1];
        return name.replace(/\d+$/, '').replace(/maj$/i, '').replace(/add$/i, '');
    }

    async loadSongArtwork(artist, title) {
        const thumbElement = this.dom.practicingSongThumbnail;
        if (!thumbElement) return;

        thumbElement.style.visibility = 'hidden';
        thumbElement.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

        if (!artist || !title) return;

        // Try Local Assets First
        const safeArtist = artist.replace(/[<>:"/\\|?]|\*/g, '').trim();
        const safeTitle = title.replace(/[<>:"/\\|?]|\*/g, '').trim();
        const localPath = `assets/thumbnails/${safeArtist}-${safeTitle}.jpg`;

        const localExists = await new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = localPath;
        });

        if (localExists) {
            thumbElement.src = localPath;
            thumbElement.style.visibility = 'visible';
            thumbElement.classList.remove('hidden');
            thumbElement.style.display = 'block';
            return;
        }

        // Fallback to Deezer API
        try {
            const query = encodeURIComponent(`${artist} ${title}`);
            const callbackName = 'deezerGuitar_' + Math.round(1000000 * Math.random());
            
            const data = await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                window[callbackName] = (res) => {
                    document.body.removeChild(script);
                    delete window[callbackName];
                    resolve(res);
                };
                script.src = `https://api.deezer.com/search?q=${query}&output=jsonp&callback=${callbackName}`;
                script.onerror = () => reject('JSONP Error');
                document.body.appendChild(script);
            });

            if (data && data.data && data.data.length > 0) {
                const artworkUrl = data.data[0].album.cover_medium || data.data[0].album.cover_small;
                if (artworkUrl) {
                    thumbElement.src = artworkUrl;
                    thumbElement.onload = () => {
                        thumbElement.style.visibility = 'visible';
                        thumbElement.classList.remove('hidden');
                        thumbElement.style.display = 'block';
                    };
                }
            }
        } catch (e) {
            console.warn('Deezer artwork fetch failed:', e);
        }
    }

    toggleChordOverviewMode(forceState) {
        const overviewMode = this.dom.trainerOverviewMode;
        const practiceMode = this.dom.trainerPracticeMode;
        if (!overviewMode || !practiceMode) return;

        // Determine target visibility state
        const showOverview = typeof forceState === 'boolean' ? forceState : overviewMode.classList.contains('hidden');

        if (showOverview) {
            // Switch to overview screen
            overviewMode.classList.remove('hidden');
            practiceMode.classList.add('hidden');
            document.body.classList.remove('fullscreen-test-active');
            if (this.dom.chordOverviewToggle) {
                this.dom.chordOverviewToggle.classList.add('active');
                const label = this.dom.chordOverviewToggle.querySelector('.label');
                const icon = this.dom.chordOverviewToggle.querySelector('.icon');
                if (label) label.textContent = 'TEST';
                if (icon) icon.textContent = '🎸';
            }
            if (this.dom.guideToggle) {
                this.dom.guideToggle.classList.remove('recreate-mode-mobile-hidden');
                const actionsContainer = this.dom.guideToggle.parentElement;
                if (actionsContainer) {
                    actionsContainer.classList.remove('recreate-active');
                }
            }

            // Dynamically render all song chords in order
            this.renderChordOverviewGrid();
        } else {
            // Switch back to trainer practice mode
            overviewMode.classList.add('hidden');
            practiceMode.classList.remove('hidden');
            document.body.classList.add('fullscreen-test-active');
            if (this.dom.chordOverviewToggle) {
                this.dom.chordOverviewToggle.classList.remove('active');
                const label = this.dom.chordOverviewToggle.querySelector('.label');
                const icon = this.dom.chordOverviewToggle.querySelector('.icon');
                if (label) label.textContent = 'Chords';
                if (icon) icon.textContent = '📋';
            }
            if (this.dom.guideToggle) {
                this.dom.guideToggle.classList.add('recreate-mode-mobile-hidden');
                const actionsContainer = this.dom.guideToggle.parentElement;
                if (actionsContainer) {
                    actionsContainer.classList.add('recreate-active');
                }
            }
        }
    }

    renderChordOverviewGrid() {
        const grid = this.dom.chordOverviewGrid;
        if (!grid) return;

        grid.innerHTML = '';

        if (this.songChords.length === 0) {
            grid.innerHTML = '<div style="color: #94a3b8; font-size: 1rem; text-align: center; grid-column: 1/-1; padding: 40px 0;">No chords found in this song.</div>';
            return;
        }

        this.songChords.forEach((chordName, index) => {
            const simplified = this.simplifyChord(chordName);
            const fingering = window.GuitarChordDatabase[chordName] || 
                              window.GuitarChordDatabase[simplified] || 
                              window.GuitarChordDatabase[simplified.split('/')[0]];

            if (!fingering) return;

            // Create beautiful card
            const card = document.createElement('div');
            card.className = 'overview-chord-card';

            // Chord Name
            const nameEl = document.createElement('h3');
            nameEl.className = 'overview-chord-name';
            nameEl.textContent = chordName;
            card.appendChild(nameEl);

            // Chord Diagram Container
            const diagramContainer = document.createElement('div');
            diagramContainer.className = 'overview-chord-diagram';
            diagramContainer.innerHTML = this.renderer.renderSVG(fingering);
            
            // Clicking diagram itself plays strum audio WITHOUT entering test/practice mode
            diagramContainer.onclick = (e) => {
                e.stopPropagation(); // Avoid triggering card.onclick select/redirect
                this.strumChord(chordName);
            };
            
            card.appendChild(diagramContainer);

            // Clicking card (outside diagram) strums chord, selects it for trainer, and redirects back to Practice Mode
            card.onclick = () => {
                this.strumChord(chordName);
                this.selectChord(index);
                this.toggleChordOverviewMode(false); // Back to practice mode!
            };

            grid.appendChild(card);
        });
    }
}

// Instantiate when ready
document.addEventListener('DOMContentLoaded', () => {
    window.guitarChordTrainer = new GuitarChordTrainer();
});
