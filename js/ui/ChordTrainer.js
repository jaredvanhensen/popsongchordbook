class ChordTrainer {
    constructor() {
        this.audioPlayer = new PianoAudioPlayer();
        this.chordParser = new ChordParser();
        
        this.currentMode = 1; // Default to "Shape to Chord" (mode 1)
        this.currentChord = null;
        this.currentScore = 0;
        this.totalQuestions = 0;
        this.correctAnswers = 0;
        this.streak = 0;
        this.bestStreak = parseInt(localStorage.getItem('chordTrainerBestStreak') || '0');
        this.highScores = JSON.parse(localStorage.getItem('chordTrainerHighScores') || '{}');
        
        this.timerSeconds = 0;
        this.timerLimit = 0;
        this.timerInterval = null;
        this.isAudioEnabled = true;
        this.useInversions = false;
        this.difficultyLevel = 1; // 1: Triads, 2: Triads + Inversions, 3: 4-Note Chords
        
        this.userSelection = []; // Used for "Play the Chord" mode
        this.stats = JSON.parse(localStorage.getItem('chordTrainerStats') || '{}');
        this.isQuestionHandled = false;
        this.isGuideEnabled = false;
        this.currentOptions = [];
        this.lastSessionWasHigh = false;
        
        this.init();
    }

    async init() {
        await this.audioPlayer.initialize();
        this.setupDOM();
        this.setupEventListeners();
        this.generateKeys();
        this.updateStatsDisplay();

        // 5. Sync High Scores from Firebase once authenticated
        if (window.firebaseManager) {
            window.firebaseManager.onAuthStateChanged(async (user) => {
                if (user) {
                    const dbScores = await window.firebaseManager.getHighScores(user.uid);
                    if (dbScores) {
                        // Merge db scores into highScores (db wins if different)
                        this.highScores = { ...this.highScores, ...dbScores };
                        localStorage.setItem('chordTrainerHighScores', JSON.stringify(this.highScores));
                        this.updateStatsDisplay();
                    }
                }
            });
        }

        this.nextQuestion();
        
        this.nextQuestion();
        
        // Listen for resize to update keyboard on mobile
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile();
            if (this.lastWasMobile !== wasMobile) {
                this.generateKeys();
                this.updateToggleLabels();
                this.updateToggleKeyboardBtnLabel();
                this.updateTimerBtnLabel();
                this.lastWasMobile = wasMobile;
            }
        });
        this.lastWasMobile = this.isMobile();
        this.updateToggleLabels();
        this.updateToggleKeyboardBtnLabel();
        this.updateTimerBtnLabel();
    }

    updateTimerBtnLabel() {
        if (!this.dom.timerCycleBtn) return;
        const isMob = this.isMobile();
        const times = [0, 60];
        const labels = isMob 
            ? ['⏱ FREE', '⏱ RANKED']
            : ['⏱ FREE PLAY', '⏱ RANKED'];
        
        let currentIdx = times.indexOf(this.timerLimit || 0);
        this.dom.timerCycleBtn.textContent = labels[currentIdx];

        // Toggle Start button visibility
        if (this.dom.startRankedBtn) {
            this.dom.startRankedBtn.style.display = (this.timerLimit === 60) ? 'block' : 'none';
        }
    }

    updateToggleLabels() {
        const isMob = this.isMobile();
        
        // Audio
        this.dom.audioToggle.querySelector('.label').textContent = this.isAudioEnabled 
            ? (isMob ? '' : 'AUDIO ON') 
            : (isMob ? '' : 'AUDIO OFF');
        this.dom.audioToggle.querySelector('.icon').textContent = this.isAudioEnabled ? '🔊' : '🔇';

        // Difficulty
        const diffLabels = isMob 
            ? { 1: 'LVL 1', 2: 'LVL 2', 3: 'LVL 3' } 
            : { 1: 'LEVEL 1: TRIADS', 2: 'LEVEL 2: INVERSIONS', 3: 'LEVEL 3: 4-NOTE' };
        
        if (this.dom.difficultyLabel) {
            this.dom.difficultyLabel.textContent = diffLabels[this.difficultyLevel];
        }

        // Guide
        if (this.dom.guideLabel) {
            this.dom.guideLabel.textContent = this.isGuideEnabled 
                ? (isMob ? '' : 'BEGINNER GUIDE: ON') 
                : (isMob ? '' : 'BEGINNER GUIDE: OFF');
            this.dom.guideToggle.classList.toggle('active', this.isGuideEnabled);
            
            // Apply global show/hide to piano
            if (this.dom.piano) {
                this.dom.piano.classList.toggle('show-labels', this.isGuideEnabled);
                if (this.isGuideEnabled) {
                    this.updateKeyLabels();
                }
            }
        }

        if (this.dom.modeCycleBtn) {
            const modeNames = {
                1: '1. Shape to Chord',
                2: '2. Play the Chord',
                3: '3. Notes → Chord',
                4: '4. Chord → Notes'
            };
            this.dom.modeCycleBtn.textContent = `🔄 ${modeNames[this.currentMode]}`;
        }
    }

    isMobile() {
        return window.innerWidth < 640 || window.matchMedia("(pointer: coarse)").matches;
    }

    setupDOM() {
        this.dom = {
            piano: document.getElementById('piano'),
            chordDisplay: document.getElementById('chordDisplay'),
            notesDisplay: document.getElementById('notesDisplay'),
            answerOptions: document.getElementById('answerOptions'),
            currentScore: document.getElementById('currentScore'),
            accuracyValue: document.getElementById('accuracyValue'),
            bestStreak: document.getElementById('bestStreak'),
            totalChords: document.getElementById('totalChords'),
            countdown: document.getElementById('countdown'),
            timerCycleBtn: document.getElementById('timerCycleBtn'),
            audioToggle: document.getElementById('audioToggle'),
            difficultyToggle: document.getElementById('difficultyToggle'),
            difficultyLabel: document.getElementById('difficultyLabel'),
            resultOverlay: document.getElementById('resultOverlay'),
            statsModal: document.getElementById('statsModal'),
            openStatsBtn: document.getElementById('openStatsBtn'),
            closeStatsBtn: document.getElementById('closeStatsBtn'),
            statsContent: document.getElementById('statsContent'),
            checkBtn: document.getElementById('checkBtn'),
            nextBtn: document.getElementById('nextBtn'),
            chordBoxContainer: document.getElementById('chordBoxContainer'),
            sessionModal: document.getElementById('sessionModal'),
            sessionOkBtn: document.getElementById('sessionOkBtn'),
            sessionScore: document.getElementById('sessionScore'),
            sessionAccuracy: document.getElementById('sessionAccuracy'),
            sessionHighScore: document.getElementById('sessionHighScore'),
            sessionCount: document.getElementById('sessionCount'),
            toggleKeyboardBtn: document.getElementById('toggleKeyboardBtn'),
            toggleKeyboardToolbarBtn: document.getElementById('toggleKeyboardToolbarBtn'),
            keyboardSection: document.querySelector('.keyboard-section'),
            modeCycleBtn: document.getElementById('modeCycleBtn'),
            guideToggle: document.getElementById('guideToggle'),
            guideLabel: document.getElementById('guideLabel'),
            leaderboardModal: document.getElementById('leaderboardModal'),
            openLeaderboardBtn: document.getElementById('openLeaderboardBtn'),
            closeLeaderboardBtn: document.getElementById('closeLeaderboardBtn'),
            chordTrainerHighScoresGrid: document.getElementById('chordTrainerHighScoresGrid'),
            leaderboardLists: {
                1: document.getElementById('leaderboardList1'),
                2: document.getElementById('leaderboardList2'),
                3: document.getElementById('leaderboardList3'),
                4: document.getElementById('leaderboardList4')
            },
            countdownOverlay: document.getElementById('countdownOverlay'),
            countdownNumber: document.getElementById('countdownNumber'),
            startRankedBtn: document.getElementById('startRankedBtn')
        };
    }

    setupEventListeners() {
        // Mode buttons
        document.querySelectorAll('.mode-btn[data-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mode-btn[data-mode]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentMode = parseInt(btn.dataset.mode);
                this.updateToggleLabels();
                
                // Reset to FREE PLAY when switching modes
                this.timerLimit = 0;
                this.updateTimerBtnLabel();
                this.stopTimer();
                
                this.resetSession(); // Reset session when changing mode via desktop buttons
                this.nextQuestion();
            });
        });

        // Mode Cycle button (Mobile)
        if (this.dom.modeCycleBtn) {
            this.dom.modeCycleBtn.addEventListener('click', () => {
                this.currentMode = (this.currentMode % 4) + 1;
                this.updateToggleLabels();
                
                // Reset to FREE PLAY when switching modes
                this.timerLimit = 0;
                this.updateTimerBtnLabel();
                this.stopTimer();
                
                this.resetSession(); // Reset session when changing mode via mobile cycle button
                this.nextQuestion();
            });
        }

        // Timer buttons
        if (this.dom.timerCycleBtn) {
            this.dom.timerCycleBtn.addEventListener('click', () => {
                const limits = [0, 60];
                let currentIdx = limits.indexOf(this.timerLimit || 0);
                this.timerLimit = limits[(currentIdx + 1) % limits.length];
                
                this.updateTimerBtnLabel();
                this.dom.timerCycleBtn.classList.toggle('active', this.timerLimit > 0);
                
                if (this.timerLimit === 0) {
                    this.stopTimer();
                }
            });
        }

        if (this.dom.startRankedBtn) {
            this.dom.startRankedBtn.addEventListener('click', () => {
                this.startPreflightCountdown(() => {
                    this.startTimer(this.timerLimit);
                    this.dom.startRankedBtn.style.display = 'none'; // Hide once started
                });
            });
        }

        // Toggles
        this.dom.audioToggle.addEventListener('click', () => {
            this.isAudioEnabled = !this.isAudioEnabled;
            this.dom.audioToggle.classList.toggle('active', this.isAudioEnabled);
            this.updateToggleLabels();
        });

        // Difficulty Toggle (Cycle 1, 2, 3)
        if (this.dom.difficultyToggle) {
            this.dom.difficultyToggle.addEventListener('click', () => {
                this.difficultyLevel = (this.difficultyLevel % 3) + 1;
                
                // Set inversion setting based on level
                if (this.difficultyLevel >= 2) {
                    this.useInversions = true;
                } else {
                    this.useInversions = false;
                }
                
                this.updateToggleLabels();
                this.nextQuestion();
            });
        }

        // Action buttons
        this.dom.checkBtn.addEventListener('click', () => this.checkAnswer());
        this.dom.nextBtn.addEventListener('click', () => this.nextQuestion());

        // Modal
        this.dom.openStatsBtn.addEventListener('click', () => this.showStats());
        this.dom.closeStatsBtn.addEventListener('click', () => this.hideStats());
        this.dom.statsModal.addEventListener('click', (e) => {
            if (e.target === this.dom.statsModal) this.hideStats();
        });

        if (this.dom.sessionOkBtn) {
            this.dom.sessionOkBtn.addEventListener('click', () => {
                this.dom.sessionModal.classList.remove('show');
                const wasHigh = this.lastSessionWasHigh;
                this.lastSessionWasHigh = false; // Reset early to avoid double triggers
                
                this.resetSession();
                this.nextQuestion();
                
                if (wasHigh) {
                    this.showLeaderboards();
                }
            });
        }

        if (this.dom.toggleKeyboardBtn) {
            this.dom.toggleKeyboardBtn.addEventListener('click', () => this.toggleKeyboard());
        }

        if (this.dom.guideToggle) {
            this.dom.guideToggle.addEventListener('click', () => {
                this.isGuideEnabled = !this.isGuideEnabled;
                this.updateToggleLabels();
                this.setupQuestionByMode(); // Refresh immediately
            });
        }
        if (this.dom.toggleKeyboardToolbarBtn) {
            this.dom.toggleKeyboardToolbarBtn.addEventListener('click', () => this.toggleKeyboard());
        }

        // Leaderboard modal
        if (this.dom.openLeaderboardBtn) {
            this.dom.openLeaderboardBtn.addEventListener('click', () => this.showLeaderboards());
        }
        if (this.dom.closeLeaderboardBtn) {
            this.dom.closeLeaderboardBtn.addEventListener('click', () => this.hideLeaderboards());
        }
        if (this.dom.leaderboardModal) {
            this.dom.leaderboardModal.addEventListener('click', (e) => {
                if (e.target === this.dom.leaderboardModal) this.hideLeaderboards();
            });
        }
    }

    toggleKeyboard() {
        if (!this.dom.keyboardSection) return;
        this.dom.keyboardSection.classList.toggle('hidden');
        const isHidden = this.dom.keyboardSection.classList.contains('hidden');
        if (!isHidden) this.dom.keyboardSection.classList.remove('invisible');
        this.updateToggleKeyboardBtnLabel();
    }

    updateToggleKeyboardBtnLabel() {
        if (!this.dom.toggleKeyboardBtn) return;
        const isHidden = this.dom.keyboardSection.classList.contains('hidden');
        if (this.isMobile()) {
            this.dom.toggleKeyboardBtn.textContent = '🎹';
            // Slate theme instead of yellow
            this.dom.toggleKeyboardBtn.style.background = isHidden ? '#e2e8f0' : '#94a3b8';
            this.dom.toggleKeyboardBtn.style.color = isHidden ? '#475569' : '#ffffff';
            this.dom.toggleKeyboardBtn.style.boxShadow = isHidden ? 'none' : 'inset 0 2px 4px rgba(0,0,0,0.1)';
            
            if (this.dom.toggleKeyboardToolbarBtn) {
                this.dom.toggleKeyboardToolbarBtn.style.background = isHidden ? '#e2e8f0' : '#94a3b8';
                this.dom.toggleKeyboardToolbarBtn.style.color = isHidden ? '#475569' : '#ffffff';
            }
        } else {
            this.dom.toggleKeyboardBtn.textContent = isHidden ? 'SHOW KEYBOARD' : 'HIDE KEYBOARD';
            this.dom.toggleKeyboardBtn.style.background = isHidden ? '#fbbf24' : '#f59e0b';
            this.dom.toggleKeyboardBtn.style.color = isHidden ? '#78350f' : '#ffffff';
            this.dom.toggleKeyboardBtn.style.boxShadow = 'none';
        }
    }

    generateKeys() {
        this.dom.piano.innerHTML = '';
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        
        const isMobile = this.isMobile();
        const numOctaves = isMobile ? 2 : 3;
        const startOctave = isMobile ? 4 : 4; // Mobile: C3 to B4 (24 keys), Desktop: C3 to B5 (36 keys)
        const totalKeys = (numOctaves * 12) + 1; // Include final C

        let keyCount = 0;
        for (let o = 0; o <= numOctaves; o++) {
            for (let i = 0; i < 12; i++) {
                if (keyCount >= totalKeys) break;
                
                const noteName = notes[i];
                const noteIndex = (startOctave + o) * 12 + i;
                
                const isBlack = noteName.includes('#');
                const key = document.createElement('div');
                key.className = isBlack ? 'black-key' : 'white-key';
                key.dataset.note = noteIndex;
                
                // Add note name to white keys on mobile
                if (!isBlack && isMobile) {
                    const label = document.createElement('span');
                    label.className = 'key-label';
                    label.textContent = noteName;
                    key.appendChild(label);
                }

                key.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    this.handleKeyPress(noteIndex, true, true);
                });
                key.addEventListener('mouseup', () => this.handleKeyPress(noteIndex, false, true));
                key.addEventListener('mouseleave', () => this.handleKeyPress(noteIndex, false, true));
                
                // Touch support
                key.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.handleKeyPress(noteIndex, true, true);
                });
                key.addEventListener('touchend', () => this.handleKeyPress(noteIndex, false, true));

                // Add universal note label for Beginner Guide
                const label = document.createElement('span');
                label.className = 'key-note-label';
                label.textContent = noteName;
                key.appendChild(label);

                this.dom.piano.appendChild(key);
                keyCount++;
            }
        }
    }

    handleKeyPress(noteIndex, isPressed, isMouse = false) {
        const key = this.dom.piano.querySelector(`[data-note="${noteIndex}"]`);
        if (!key) return;

        if (isPressed) {
            key.classList.add('active');
            if (isMouse && this.isAudioEnabled) {
                this.audioPlayer.playNote(noteIndex, 1.0, 0.8);
            }
            
            // Collect notes for validation in Mode 2 (Play the Chord)
            if (this.currentMode === 2) {
                if (this.userSelection.includes(noteIndex)) {
                    // Toggle OFF if already selected
                    this.userSelection = this.userSelection.filter(n => n !== noteIndex);
                    key.classList.remove('selected-key');
                } else {
                    // Toggle ON
                    this.userSelection.push(noteIndex);
                    // Light blue selection highlight
                    key.classList.add('selected-key');
                    
                    // Proactive check for MIDI/Piano users
                    if (this.userSelection.length >= this.currentChord.notes.length) {
                        this.checkAnswer(true); // silent check
                    }
                }
            } else if (this.currentMode === 4) {
                const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
                const noteName = noteNames[noteIndex % 12];
                
                // Toggle the button state and selection
                if (this.userSelection.includes(noteName)) {
                    this.userSelection = this.userSelection.filter(n => n !== noteName);
                } else {
                    this.userSelection.push(noteName);
                }
                
                // Update UI buttons to reflect selection
                document.querySelectorAll('#answerOptions .mode-btn').forEach(btn => {
                    const btnValue = btn.dataset.value;
                    if (btnValue === noteName) {
                        btn.classList.toggle('active', this.userSelection.includes(noteName));
                    }
                });
                
                this.updatePianoHighlightsForNotes();

                // Proactive check if user has selected enough notes
                const uniqueTargetCount = new Set(this.currentChord.noteNames).size;
                if (this.userSelection.length >= uniqueTargetCount) {
                    this.checkAnswer(true);
                }
            }
        } else {
            key.classList.remove('active');
            if (isMouse && this.isAudioEnabled) {
                this.audioPlayer.stopNote(noteIndex + 12);
            }
        }
    }

    startTimer(seconds) {
        clearInterval(this.timerInterval);
        if (seconds === 0) {
            this.stopTimer();
            return;
        }

        this.timerSeconds = seconds;
        this.updateTimerDisplay();

        this.timerInterval = setInterval(() => {
            this.timerSeconds--;
            this.updateTimerDisplay();
            if (this.timerSeconds <= 0) {
                clearInterval(this.timerInterval);
                this.showSessionComplete();
            }
        }, 1000);
    }

    stopTimer() {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.timerSeconds = 0;
        this.timerLimit = 0;
        if (this.dom.countdown) {
            this.dom.countdown.textContent = '00:00';
        }
    }

    updateTimerDisplay() {
        const mins = Math.floor(this.timerSeconds / 60);
        const secs = this.timerSeconds % 60;
        this.dom.countdown.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    resetSession() {
        this.currentScore = 0;
        this.totalQuestions = 0;
        this.correctAnswers = 0;
        this.streak = 0;
        this.updateStatsDisplay();
    }

    nextQuestion() {
        this.isQuestionHandled = false;
        this.clearBoard();
        this.generateRandomChord();
        this.setupQuestionByMode();
    }

    clearBoard() {
        this.userSelection = [];
        this.dom.chordDisplay.textContent = '?';
        this.dom.notesDisplay.textContent = '';
        this.dom.answerOptions.innerHTML = '';
        this.dom.answerOptions.classList.add('invisible');
        this.dom.answerOptions.classList.remove('hidden');
        this.dom.chordBoxContainer.style.display = 'block';
        this.dom.resultOverlay.classList.remove('show');
        
        // Hide toolbar toggle by default
        if (this.dom.toggleKeyboardToolbarBtn) {
            this.dom.toggleKeyboardToolbarBtn.style.display = 'none';
        }
        
        document.querySelectorAll('.white-key, .black-key').forEach(k => {
            k.classList.remove('correct', 'wrong', 'active', 'selected-key', 'guide-hint');
            // Remove highlight class from labels but KEEP the labels themselves
            const labels = k.querySelectorAll('.key-note-label');
            labels.forEach(l => l.classList.remove('highlighted'));
        });

        // Reset keyboard visibility
        if (this.dom.keyboardSection) {
            this.dom.keyboardSection.classList.remove('hidden');
        }
        if (this.dom.toggleKeyboardBtn) {
            this.dom.toggleKeyboardBtn.classList.add('hidden');
            this.updateToggleKeyboardBtnLabel();
        }
    }

    generateRandomChord() {
        const roots = ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
        let types = ['', 'm']; // Default for Levels 1 & 2 (Triads)
        
        if (this.difficultyLevel === 3) {
            // Strictly 4-note max chords
            types = ['7', 'maj7', 'm7', '6', 'm6', '7sus4', 'add9', 'dim7'];
        }
        
        let root, type, chordName, displayName, notes, inversion;

        // Loop to ensure the new chord is different from the current one
        do {
            root = roots[Math.floor(Math.random() * roots.length)];
            type = types[Math.floor(Math.random() * types.length)];
            chordName = root + type;
            
            const parsed = this.chordParser.parse(chordName) || this.chordParser.parse('C');
            notes = parsed && parsed.notes ? [...parsed.notes] : [48, 52, 55];
            
            // Handle random inversion / slash chords
            inversion = 0;
            displayName = chordName;
            
            if (this.useInversions && Math.random() > 0.4) {
                inversion = Math.floor(Math.random() * notes.length);
                if (inversion > 0) {
                    // Check bass note for display name without permanent mutation yet
                    const n0 = notes[inversion % notes.length]; 
                    // This is simple logic: notes[inversion] is roughly the new bass if we rotated
                    // But notes.shift() is what actually happens in the original code. 
                    // Let's just do a mock rotation.
                    const tempNotesForDisplay = [...notes];
                    for(let i=0; i<inversion; i++) {
                        const n = tempNotesForDisplay.shift();
                        tempNotesForDisplay.push(n + 12);
                    }
                    const bassNote = this.getNoteName(tempNotesForDisplay[0], root);
                    displayName = `${chordName}/${bassNote}`;
                }
            }
        } while (this.currentChord && displayName === this.currentChord.name);

        // Finalize the notes after uniqueness check
        if (inversion > 0) {
            for(let i=0; i<inversion; i++) {
                const n = notes.shift();
                notes.push(n + 12);
            }
        }

        // Mobile: C3(48) to C5(72), Desktop: C3(48) to C5(72) + octave?
        const isMob = this.isMobile();
        const minMIDI = 48; // C3
        const maxMIDI = isMob ? 72 : 84; // Mobile 2 octaves + C, Desktop 3 octaves
        
        // Final sort to be sure
        notes.sort((a, b) => a - b);
        
        // Intelligent centering loop: shift chord until it fits properly
        // We try to keep it as centered as possible, but priority is fitting within view.
        let shiftCount = 0;
        const maxShifts = 10; // Prevent infinite loops
        
        while (shiftCount < maxShifts) {
            const currentMin = notes[0];
            const currentMax = notes[notes.length - 1];
            
            if (currentMin < minMIDI) {
                notes = notes.map(n => n + 12);
                shiftCount++;
                continue;
            }
            if (currentMax > maxMIDI) {
                notes = notes.map(n => n - 12);
                shiftCount++;
                continue;
            }
            break; // Fits!
        }

        const adjustedNotes = [...notes]; 

        this.currentChord = {
            name: displayName,
            baseName: chordName,
            root: root,
            notes: adjustedNotes,
            noteNames: adjustedNotes.map(n => this.getNoteName(n, root)),
            inversion: inversion
        };
    }

    setupQuestionByMode() {
        if (!this.currentChord) this.generateRandomChord();
        this.dom.answerOptions.innerHTML = '';
        this.clearGuides();

        switch (this.currentMode) {
            case 1: // 1. Shape to Chord
                this.dom.chordDisplay.textContent = '?';
                this.dom.notesDisplay.textContent = 'Identify this chord shape:';
                if (this.dom.keyboardSection) this.dom.keyboardSection.classList.remove('hidden', 'invisible');
                this.highlightKeys(this.currentChord.notes, 'correct');
                if (this.isGuideEnabled) this.applyGuides();
                this.showChordOptions();
                break;
            case 2: // 2. Play the Chord
                this.dom.chordDisplay.textContent = this.currentChord.name;
                this.dom.notesDisplay.textContent = 'Play the correct keys!';
                if (this.dom.keyboardSection) this.dom.keyboardSection.classList.remove('hidden', 'invisible');
                if (this.isGuideEnabled) this.applyGuides();
                this.dom.answerOptions.classList.add('invisible');
                this.dom.answerOptions.classList.remove('hidden');
                break;
            case 3: // 3. Notes -> Chord
                this.dom.chordDisplay.textContent = '?';
                this.dom.notesDisplay.textContent = this.currentChord.noteNames.join(' - ');
                if (this.dom.keyboardSection) this.dom.keyboardSection.classList.remove('hidden', 'invisible');
                this.showChordOptions();
                break;
            case 4: // 4. Chord -> Notes
                this.dom.chordDisplay.textContent = this.currentChord.name;
                this.dom.notesDisplay.textContent = 'Select the right notes';
                this.showNoteOptions();
                
                // Hide keyboard visually but keep space
                if (this.dom.keyboardSection) {
                    this.dom.keyboardSection.classList.add('hidden');
                }
                // Hide the bottom keyboard button on mobile (obsolete with toolbar icon)
                if (this.dom.toggleKeyboardBtn) {
                    if (this.isMobile()) {
                        this.dom.toggleKeyboardBtn.classList.add('hidden');
                    } else {
                        this.dom.toggleKeyboardBtn.classList.remove('hidden');
                    }
                }
                // Show toolbar toggle ONLY for mode 4 on mobile
                if (this.dom.toggleKeyboardToolbarBtn) {
                    this.dom.toggleKeyboardToolbarBtn.style.display = this.isMobile() ? 'block' : 'none';
                }
                this.updateToggleKeyboardBtnLabel();
                break;
        }

        if (this.isGuideEnabled) {
            this.updateKeyLabels();
        }
    }

    showChordOptions() {
        this.dom.answerOptions.classList.remove('hidden', 'invisible');
        const options = [this.currentChord.name];
        
        // Use matching types for distractors based on level
        const roots = ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
        let types = ['', 'm'];
        if (this.difficultyLevel === 3) {
            // Match Level 3 chords (4-note max)
            types = ['7', 'maj7', 'm7', '6', 'm6', '7sus4', 'add9', 'dim7'];
        }
        
        while(options.length < 4) {
            const root = roots[Math.floor(Math.random() * roots.length)];
            const type = types[Math.floor(Math.random() * types.length)];
            const opt = root + type;
            
            // Avoid duplicate enharmonic options
            const isDuplicate = options.some(o => 
                this.normalizeChordName(o) === this.normalizeChordName(opt)
            );
            
            if (!isDuplicate) options.push(opt);
        }
        
        this.currentOptions = options;
        options.sort(() => Math.random() - 0.5);
        
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = this.isMobile() ? 'mode-btn small-btn' : 'mode-btn';
            btn.textContent = opt;
            btn.addEventListener('click', () => this.handleSelection(opt));
            this.dom.answerOptions.appendChild(btn);
        });
    }

    showNoteOptions() {
        this.dom.answerOptions.classList.remove('hidden', 'invisible');
        this.dom.answerOptions.style.display = 'flex'; // Ensure flex
        if (this.isMobile()) {
            this.dom.answerOptions.classList.add('note-grid');
        } else {
            this.dom.answerOptions.classList.remove('note-grid');
        }
        
        const notes = [
            { label: 'C', value: 'C' },
            { label: 'C#/Db', value: 'C#' },
            { label: 'D', value: 'D' },
            { label: 'D#/Eb', value: 'D#' },
            { label: 'E', value: 'E' },
            { label: 'F', value: 'F' },
            { label: 'F#/Gb', value: 'F#' },
            { label: 'G', value: 'G' },
            { label: 'G#/Ab', value: 'G#' },
            { label: 'A', value: 'A' },
            { label: 'A#/Bb', value: 'A#' },
            { label: 'B', value: 'B' }
        ];
        
        notes.forEach(noteObj => {
            const btn = document.createElement('button');
            btn.className = 'mode-btn';
            btn.style.minWidth = '75px';
            btn.style.padding = '10px';
            btn.textContent = noteObj.label;
            btn.dataset.value = noteObj.value; // Store value for exact matching
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
                if (btn.classList.contains('active')) {
                    this.userSelection.push(noteObj.value);
                } else {
                    this.userSelection = this.userSelection.filter(n => n !== noteObj.value);
                }
                this.updatePianoHighlightsForNotes();

                // Proactive check if user has selected enough notes
                const uniqueTargetCount = new Set(this.currentChord.noteNames).size;
                if (this.userSelection.length >= uniqueTargetCount) {
                    this.checkAnswer(true);
                }
            });
            this.dom.answerOptions.appendChild(btn);
        });
    }

    updatePianoHighlightsForNotes() {
        // Only for Mode 4
        if (this.currentMode !== 4) return;

        // Clear red highlights first
        document.querySelectorAll('.white-key.wrong, .black-key.wrong').forEach(k => k.classList.remove('wrong'));

        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const enharmonics = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };

        this.userSelection.forEach(name => {
            const normName = enharmonics[name] || name;
            const baseIndex = noteNames.indexOf(normName);
            if (baseIndex !== -1) {
                document.querySelectorAll(`.white-key[data-note], .black-key[data-note]`).forEach(key => {
                    const idx = parseInt(key.dataset.note);
                    if (idx % 12 === baseIndex) {
                        key.classList.add('wrong');
                    }
                });
            }
        });
    }

    handleSelection(selection) {
        if (this.currentMode === 1 || this.currentMode === 3) {
            const isCorrect = this.normalizeChordName(selection) === this.normalizeChordName(this.currentChord.name);
            this.validate(isCorrect);
        }
    }

    normalizeChordName(name) {
        if (!name) return "";
        return name
            .replace(/C#/g, 'Db')
            .replace(/D#/g, 'Eb')
            .replace(/F#/g, 'Gb')
            .replace(/G#/g, 'Ab')
            .replace(/A#/g, 'Bb');
    }

    checkAnswer(isAuto = false) {
        let isCorrect = false;

        if (this.currentMode === 1 || this.currentMode === 3) {
            // For multiple choice, Check Answer can act as a "Show Answer" or validate selected button
            // But since buttons are clicked directly, we'll just show the keys as feedback
            this.highlightKeys(this.currentChord.notes, 'correct');
            return;
        }

        if (this.currentMode === 2) {
            const targetSemitones = this.currentChord.notes.map(n => n % 12).sort();
            const userSemitones = [...new Set(this.userSelection.map(n => n % 12))].sort();
            isCorrect = JSON.stringify(targetSemitones) === JSON.stringify(userSemitones);
        } else if (this.currentMode === 4) {
            const targetNotes = [...new Set(this.currentChord.noteNames)].sort();
            const userNotes = [...new Set(this.userSelection)].sort();
            const normalize = (n) => n.replace('Db','C#').replace('Eb','D#').replace('Gb','F#').replace('Ab','G#').replace('Bb','A#');
            const targetNorm = targetNotes.map(normalize).sort();
            const userNorm = userNotes.map(normalize).sort();
            isCorrect = JSON.stringify(targetNorm) === JSON.stringify(userNorm);
        }

        if (isCorrect) {
            this.validate(true);
        } else if (!isAuto) {
            this.validate(false);
        }
    }

    validate(isCorrect) {
        if (this.isQuestionHandled && isCorrect) return;
        
        this.totalQuestions++;
        if (isCorrect) {
            this.isQuestionHandled = true;
            this.correctAnswers++;
            this.currentScore += 10;
            this.streak++;
            if (this.streak > this.bestStreak) {
                this.bestStreak = this.streak;
                localStorage.setItem('chordTrainerBestStreak', this.bestStreak);
            }
            this.showFeedback(true);
            this.updateChordStats(this.currentChord.name, true);
        } else {
            this.streak = 0;
            this.showFeedback(false);
            this.updateChordStats(this.currentChord.name, false);
        }
        this.updateStatsDisplay();
    }

    applyGuides() {
        if (!this.currentChord) return;
        
        this.currentChord.notes.forEach((n, i) => {
            const key = this.dom.piano.querySelector(`[data-note="${n}"]`);
            if (key) {
                // Show blue pulse/dots for Mode 2
                if (this.currentMode === 2) {
                    key.classList.add('guide-hint');
                }
                
                // Highlight the specific chord note labels
                const label = key.querySelector('.key-note-label');
                if (label) {
                    label.classList.add('highlighted');
                }
            }
        });
    }

    updateKeyLabels() {
        if (!this.currentChord) return;

        let preferFlats = false;

        // 1. Check current chord name
        if (this.currentChord.name.includes('b')) preferFlats = true;

        // 2. Check chord root
        if (this.currentChord.root.includes('b') || this.currentChord.root === 'F') preferFlats = true;

        // 3. Match distractors/options
        if (this.currentOptions && this.currentOptions.length > 0) {
            if (this.currentOptions.some(opt => opt.includes('b'))) {
                preferFlats = true;
            }
        }

        // 4. Check shown note names (Mode 3)
        if (this.currentChord.noteNames && this.currentChord.noteNames.some(n => n.includes('b'))) {
            preferFlats = true;
        }

        const sharps = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const flats = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
        const names = preferFlats ? flats : sharps;

        this.dom.piano.querySelectorAll('.key-note-label').forEach(label => {
            const key = label.parentElement;
            const index = parseInt(key.dataset.note);
            label.textContent = names[index % 12];
        });
    }

    clearGuides() {
        document.querySelectorAll('.white-key, .black-key').forEach(k => {
            k.classList.remove('guide-hint');
            const labels = k.querySelectorAll('.key-note-label');
            labels.forEach(l => l.classList.remove('highlighted'));
        });
    }

    showFeedback(isCorrect) {
        // Reveal the name in the golden box
        if (this.dom.chordDisplay) {
            this.dom.chordDisplay.textContent = this.currentChord.name;
        }

        // For identifying modes, show the correct keys as feedback
        if (this.currentMode === 1 || this.currentMode === 3) {
            this.highlightKeys(this.currentChord.notes, 'correct');
        }

        // For "Play the Chord" mode, highlight user selection results
        if (this.currentMode === 2) {
            this.highlightKeys(this.currentChord.notes, 'correct');
        }

        if (isCorrect) {
            this.dom.resultOverlay.classList.add('show');
            if (this.isAudioEnabled) {
                // Play chord 1 octave higher (previously noteIndex-12 was used, now n directly)
                this.audioPlayer.playChord(this.currentChord.notes.map(n => n), 1.0, 1.0);
            }
        } else {
            // Error sound
            if (this.isAudioEnabled) {
                this.audioPlayer.playNote(36, 0.5, 0.5); // Low C for error
            }
        }
    }

    highlightKeys(notes, className) {
        notes.forEach(n => {
            const key = this.dom.piano.querySelector(`[data-note="${n}"]`);
            if (key) {
                key.classList.remove('selected-key', 'wrong', 'correct');
                key.classList.add(className);
            }
        });
    }

    updateChordStats(chordName, isCorrect) {
        if (!this.stats[chordName]) {
            this.stats[chordName] = { correct: 0, total: 0 };
        }
        this.stats[chordName].total++;
        if (isCorrect) this.stats[chordName].correct++;
        localStorage.setItem('chordTrainerStats', JSON.stringify(this.stats));
    }

    updateStatsDisplay() {
        const isMob = this.isMobile();
        this.dom.currentScore.textContent = this.currentScore;
        this.dom.accuracyValue.textContent = `${this.totalQuestions === 0 ? 0 : Math.round((this.correctAnswers / this.totalQuestions) * 100)}%`;
        this.dom.bestStreak.textContent = this.streak;
        this.dom.totalChords.textContent = this.correctAnswers;

        // Space saving labels for footer on mobile
        // Space saving labels for footer on mobile
        const footerLabels = document.querySelectorAll('.stats-panel .stat-item .stat-label');
        if (isMob && footerLabels.length >= 4) {
            footerLabels[0].textContent = 'SCORE';
            footerLabels[1].textContent = 'ACC';
            footerLabels[2].textContent = 'STREAK';
            footerLabels[3].textContent = 'TOTAL';
        } else if (!isMob && footerLabels.length >= 4) {
            footerLabels[0].textContent = 'Current Score';
            footerLabels[1].textContent = 'Accuracy';
            footerLabels[2].textContent = 'Best Streak';
            footerLabels[3].textContent = 'Session Chords';
        }
    }

    getNoteName(noteIndex, rootOverride = null) {
        const sharps = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const flats = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
        
        const root = rootOverride || (this.currentChord ? this.currentChord.root : 'C');
        // Chords that should prefer flats (F, Bb, Eb, etc.)
        const preferFlats = root.includes('b') || ['F'].includes(root);
        
        const names = preferFlats ? flats : sharps;
        return names[noteIndex % 12];
    }

    showStats() {
        this.dom.statsContent.innerHTML = '';
        const sortedChords = Object.keys(this.stats).sort((a, b) => {
            const accA = this.stats[a].correct / this.stats[a].total;
            const accB = this.stats[b].correct / this.stats[b].total;
            return accA - accB; // Show weak chords first
        });

        if (sortedChords.length === 0) {
            this.dom.statsContent.innerHTML = '<p style="text-align:center; color:#64748b;">No data yet. Keep practicing!</p>';
        }

        sortedChords.forEach(chord => {
            const data = this.stats[chord];
            const acc = Math.round((data.correct / data.total) * 100);
            
            const card = document.createElement('div');
            card.className = 'chord-stat-card';
            card.innerHTML = `
                <div class="chord-stat-info">
                    <div class="chord-mini-box">${chord}</div>
                    <div style="font-weight:700;">${acc}% Accuracy</div>
                </div>
                <div class="progress-container">
                    <div class="progress-fill" style="width: ${acc}%"></div>
                </div>
                <div style="font-size:0.8rem; color:#64748b;">${data.correct}/${data.total}</div>
            `;
            this.dom.statsContent.appendChild(card);
        });

        this.dom.statsModal.classList.add('show');
    }

    hideStats() {
        this.dom.statsModal.classList.remove('show');
    }

    showSessionComplete() {
        const acc = this.totalQuestions > 0 ? Math.round((this.correctAnswers / this.totalQuestions) * 100) : 0;
        let isNewHigh = false;
        
        // Track High Score with Time Category (Now only 2M)
        if (this.timerLimit > 0) {
            const minutes = Math.round(this.timerLimit / 60);
            const modeKey = `mode${this.currentMode}_${minutes}m`;
            const prevHigh = this.highScores[modeKey] || 0;
            
            // Always sync current score to high scores if it's better than previous local high
            if (this.currentScore > prevHigh) {
                this.highScores[modeKey] = this.currentScore;
                localStorage.setItem('chordTrainerHighScores', JSON.stringify(this.highScores));
                isNewHigh = true;
            }
            
            // Proactively Sync with Firebase and Global Leaderboard
            if (window.firebaseManager && window.firebaseManager.isAuthenticated()) {
                const user = window.firebaseManager.getCurrentUser();
                window.firebaseManager.saveHighScores(user.uid, this.highScores);
                const username = user.displayName || localStorage.getItem('popsongUsername') || 'New Player';
                window.firebaseManager.updateLeaderboard(modeKey, this.currentScore, username);
            }
        }
        
        // Fallback for UI display (current high for this mode)
        const minutesSuffix = this.timerLimit > 0 ? `_${Math.round(this.timerLimit / 60)}m` : "";
        const uiKey = `mode${this.currentMode}${minutesSuffix}`;
        const currentHigh = this.highScores[uiKey] || 0;
        this.lastSessionWasHigh = isNewHigh; // Store for the 'AWESOME' click

        if (this.dom.sessionModal) {
            this.dom.sessionScore.textContent = this.currentScore;
            this.dom.sessionAccuracy.textContent = `${acc}%`;
            this.dom.sessionCount.textContent = this.totalQuestions;
            if (this.dom.sessionHighScore) {
                this.dom.sessionHighScore.textContent = currentHigh;
            }
            
            const card = this.dom.sessionModal.querySelector('.flashy-card');
            const title = this.dom.sessionModal.querySelector('.flashy-title');
            
            if (isNewHigh && this.currentScore > 0) {
                if (title) title.textContent = "🏆 NEW HIGH SCORE!";
                if (card) card.classList.add('new-high-score-card');
                if (this.isAudioEnabled) this.audioPlayer.playTriumph();
                this.spawnConfetti();
            } else {
                if (title) title.textContent = "🎉 SESSION COMPLETE!";
                if (card) card.classList.remove('new-high-score-card');
            }
            
            this.dom.sessionModal.classList.add('show');
        } else {
            alert(`Time's up!\nScore: ${this.currentScore}\nHigh Score: ${currentHigh}\nAccuracy: ${acc}%\nChords: ${this.totalQuestions}`);
            this.resetSession();
            this.nextQuestion();
        }
    }

    showLeaderboards() {
        if (!this.dom.leaderboardModal) return;
        this.dom.leaderboardModal.classList.add('show');
        this.renderHighScoresGrid();
        this.renderGlobalLeaderboards();
    }

    hideLeaderboards() {
        if (!this.dom.leaderboardModal) return;
        this.dom.leaderboardModal.classList.remove('show');
    }

    renderHighScoresGrid() {
        if (!this.dom.chordTrainerHighScoresGrid) return;
        this.dom.chordTrainerHighScoresGrid.innerHTML = '';
        
        const modeNames = { 1: 'SHAPE / CHORD', 2: 'PLAY CHORD', 3: 'NOTES / CHORD', 4: 'CHORD / NOTES' };
        const modeIcons = { 1: '👁️', 2: '🎹', 3: '📝', 4: '👂' };
        
        for (let m = 1; m <= 4; m++) {
            const score = this.highScores[`mode${m}_1m`] || 0;
            const card = document.createElement('div');
            card.className = 'achievement-card unlocked';
            card.style.background = 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)';
            card.style.padding = '15px';
            card.style.borderRadius = '12px';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.alignItems = 'center';
            card.style.justifyContent = 'center';
            card.style.color = 'white';
            card.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
            
            card.innerHTML = `
                <div style="font-size: 1.5rem; margin-bottom: 8px;">${modeIcons[m]}</div>
                <div style="font-size: 0.65rem; font-weight: 900; margin-bottom: 5px; text-transform: uppercase;">${modeNames[m]}</div>
                <div style="font-size: 1.2rem; font-weight: 900;">${score} <span style="font-size: 0.7rem; opacity: 0.7;">pts</span></div>
            `;
            this.dom.chordTrainerHighScoresGrid.appendChild(card);
        }
    }

    async renderGlobalLeaderboards() {
        if (!window.firebaseManager) return;
        
        for (let m = 1; m <= 4; m++) {
            const listEl = this.dom.leaderboardLists[m];
            if (!listEl) continue;

            listEl.innerHTML = '<div style="text-align:center; padding: 10px; font-size: 0.7rem; color: #94a3b8;">Loading...</div>';
            
            const modeKey = `mode${m}_1m`;
            const top10 = await window.firebaseManager.getLeaderboard(modeKey);
            
            listEl.innerHTML = '';
            
            if (!top10 || top10.length === 0) {
                listEl.innerHTML = '<div style="text-align:center; padding: 10px; font-size: 0.7rem; color: #94a3b8;">No scores yet</div>';
            } else {
                top10.forEach((entry, index) => {
                    const rank = index + 1;
                    const entryEl = document.createElement('div');
                    entryEl.className = `leaderboard-entry rank-${rank} compact`;
                    entryEl.style.display = 'flex';
                    entryEl.style.alignItems = 'center';
                    entryEl.style.gap = '8px';
                    entryEl.style.padding = '4px 8px';
                    entryEl.style.marginBottom = '4px';
                    entryEl.style.background = 'white';
                    entryEl.style.borderRadius = '6px';
                    entryEl.style.fontSize = '0.7rem';
                    
                    entryEl.innerHTML = `
                        <div class="rank-badge" style="width: 18px; height: 18px; min-width: 18px; border-radius: 50%; background: #e2e8f0; color: #475569; font-size: 0.6rem; font-weight: 800; display: flex; align-items: center; justify-content: center;">${rank}</div>
                        <div style="flex: 1; font-weight: 600; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${entry.username || 'Anon'}</div>
                        <div style="color: #4f46e5; font-weight: 700;">${entry.score}</div>
                    `;
                    listEl.appendChild(entryEl);
                });
            }
        }
    }

    spawnConfetti() {
        const emojis = ['🎉', '🏆', '✨', '🎈', '⭐', '🎊'];
        const container = this.dom.sessionModal || document.body;
        
        for (let i = 0; i < 30; i++) {
            const span = document.createElement('span');
            span.className = 'confetti';
            span.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            span.style.left = (Math.random() * 100) + '%';
            span.style.top = (60 + Math.random() * 20) + '%';
            span.style.animationDelay = (Math.random() * 0.5) + 's';
            container.appendChild(span);
            
            // Cleanup
            setTimeout(() => span.remove(), 2000);
        }
    }

    startPreflightCountdown(onComplete) {
        if (!this.dom.countdownOverlay) {
            onComplete();
            return;
        }

        this.dom.countdownOverlay.style.display = 'flex';
        setTimeout(() => this.dom.countdownOverlay.classList.add('show'), 10);
        this.dom.countdownOverlay.style.pointerEvents = 'all';

        let count = 3;
        this.dom.countdownNumber.textContent = count;
        if (this.isAudioEnabled) this.audioPlayer.playCountdownTick(false);

        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                this.dom.countdownNumber.textContent = count;
                this.dom.countdownNumber.style.transform = 'scale(1.2)';
                setTimeout(() => this.dom.countdownNumber.style.transform = 'scale(1)', 100);
                if (this.isAudioEnabled) this.audioPlayer.playCountdownTick(false);
            } else if (count === 0) {
                this.dom.countdownNumber.textContent = 'GO!';
                this.dom.countdownNumber.style.color = '#10b981';
                this.dom.countdownNumber.style.transform = 'scale(1.5)';
                if (this.isAudioEnabled) this.audioPlayer.playCountdownTick(true);
            } else {
                clearInterval(interval);
                this.dom.countdownOverlay.classList.remove('show');
                setTimeout(() => {
                    this.dom.countdownOverlay.style.display = 'none';
                    this.dom.countdownNumber.style.color = '#4f46e5';
                    this.dom.countdownNumber.style.transform = 'scale(1)';
                    onComplete();
                }, 300);
            }
        }, 1000);
    }
}

// Initialize when ready
document.addEventListener('DOMContentLoaded', () => {
    window.chordTrainer = new ChordTrainer();
});
