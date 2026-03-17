class ChordTrainer {
    constructor() {
        this.audioPlayer = new PianoAudioPlayer();
        this.chordParser = new ChordParser();
        
        this.currentMode = 1;
        this.currentChord = null;
        this.currentScore = 0;
        this.totalQuestions = 0;
        this.correctAnswers = 0;
        this.streak = 0;
        this.bestStreak = parseInt(localStorage.getItem('chordTrainerBestStreak') || '0');
        
        this.timerSeconds = 0;
        this.timerLimit = 0;
        this.timerInterval = null;
        this.isAudioEnabled = true;
        this.useInversions = false;
        this.difficultyLevel = 1; // 1: Triads, 2: Triads + Inversions, 3: 4-Note Chords
        
        this.userSelection = []; // Used for "Chord -> Keys" mode
        this.stats = JSON.parse(localStorage.getItem('chordTrainerStats') || '{}');
        this.isQuestionHandled = false;
        
        this.init();
    }

    async init() {
        await this.audioPlayer.initialize();
        this.setupDOM();
        this.setupEventListeners();
        this.generateKeys();
        this.updateStatsDisplay();
        this.nextQuestion();
        
        // Listen for MIDI if handler exists
        if (window.midiInputHandler) {
            this.setupMidiHook();
        }
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
            inversionToggle: document.getElementById('inversionToggle'),
            midiStatus: document.getElementById('midiStatus'),
            midiLabel: document.getElementById('midiLabel'),
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
            sessionCount: document.getElementById('sessionCount')
        };
    }

    setupEventListeners() {
        // Mode buttons
        document.querySelectorAll('.mode-btn[data-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mode-btn[data-mode]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentMode = parseInt(btn.dataset.mode);
                this.resetSession();
                this.nextQuestion();
            });
        });

        // Timer buttons
        if (this.dom.timerCycleBtn) {
            this.dom.timerCycleBtn.addEventListener('click', () => {
                const times = [0, 60, 120, 180];
                const labels = ['⏱ FREE PLAY', '⏱ 1 MIN', '⏱ 2 MIN', '⏱ 3 MIN'];
                
                // Find current index
                let currentIdx = times.indexOf(this.timerLimit || 0);
                let nextIdx = (currentIdx + 1) % times.length;
                
                this.timerLimit = times[nextIdx];
                this.dom.timerCycleBtn.textContent = labels[nextIdx];
                this.dom.timerCycleBtn.classList.toggle('active', this.timerLimit > 0);
                
                this.startTimer(this.timerLimit);
            });
        }

        // Toggles
        this.dom.audioToggle.addEventListener('click', () => {
            this.isAudioEnabled = !this.isAudioEnabled;
            this.dom.audioToggle.classList.toggle('active', this.isAudioEnabled);
            this.dom.audioToggle.querySelector('.label').textContent = this.isAudioEnabled ? 'AUDIO ON' : 'AUDIO OFF';
            this.dom.audioToggle.querySelector('.icon').textContent = this.isAudioEnabled ? '🔊' : '🔇';
        });

        this.dom.inversionToggle.addEventListener('click', () => {
            this.useInversions = !this.useInversions;
            this.dom.inversionToggle.classList.toggle('active', this.useInversions);
            this.dom.inversionToggle.querySelector('.label').textContent = this.useInversions ? 'INVERSIONS ON' : 'INVERSIONS OFF';
            
            // If we disable inversions, regenerate to fix the display name immediately
            if (!this.useInversions && this.currentChord && this.currentChord.inversion > 0) {
                this.nextQuestion();
            }
        });

        // Difficulty Toggle (Cycle 1, 2, 3)
        if (this.dom.difficultyToggle) {
            this.dom.difficultyToggle.addEventListener('click', () => {
                this.difficultyLevel = (this.difficultyLevel % 3) + 1;
                const labels = {
                    1: 'LEVEL 1: TRIADS',
                    2: 'LEVEL 2: INVERSIONS',
                    3: 'LEVEL 3: 4-NOTE'
                };
                this.dom.difficultyLabel.textContent = labels[this.difficultyLevel];
                
                // Set inversion setting based on level
                if (this.difficultyLevel >= 2) {
                    this.useInversions = true;
                    this.dom.inversionToggle.classList.add('active');
                    this.dom.inversionToggle.querySelector('.label').textContent = 'INVERSIONS ON';
                } else {
                    this.useInversions = false;
                    this.dom.inversionToggle.classList.remove('active');
                    this.dom.inversionToggle.querySelector('.label').textContent = 'INVERSIONS OFF';
                }
                
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
                this.resetSession();
                this.nextQuestion();
            });
        }
    }

    setupMidiHook() {
        const originalHandleNoteOn = window.midiInputHandler.handleNoteOn.bind(window.midiInputHandler);
        const originalHandleNoteOff = window.midiInputHandler.handleNoteOff.bind(window.midiInputHandler);

        window.midiInputHandler.handleNoteOn = (noteIndex, velocity) => {
            originalHandleNoteOn(noteIndex, velocity);
            this.handleKeyPress(noteIndex, true);
        };

        window.midiInputHandler.handleNoteOff = (noteIndex) => {
            originalHandleNoteOff(noteIndex);
            this.handleKeyPress(noteIndex, false);
        };

        // Update MIDI label
        this.dom.midiLabel.textContent = 'MIDI READY';
        this.dom.midiStatus.classList.add('active');
    }

    generateKeys() {
        this.dom.piano.innerHTML = '';
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const numOctaves = 3;
        const startOctave = 4; // C3 to B5 (MIDI 48 to 83)

        for (let o = 0; o < numOctaves; o++) {
            notes.forEach((note, i) => {
                const noteIndex = (startOctave + o) * 12 + i;
                const isBlack = note.includes('#');
                const key = document.createElement('div');
                key.className = isBlack ? 'black-key' : 'white-key';
                key.dataset.note = noteIndex;
                
                key.addEventListener('mousedown', () => this.handleKeyPress(noteIndex, true, true));
                key.addEventListener('mouseup', () => this.handleKeyPress(noteIndex, false, true));
                key.addEventListener('mouseleave', () => this.handleKeyPress(noteIndex, false, true));
                
                this.dom.piano.appendChild(key);
            });
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
            
            // Collect notes for validation in Mode 3 & 4
            if (this.currentMode === 3) {
                if (this.userSelection.includes(noteIndex)) {
                    // Toggle OFF if already selected
                    this.userSelection = this.userSelection.filter(n => n !== noteIndex);
                    key.classList.remove('wrong');
                } else {
                    // Toggle ON
                    this.userSelection.push(noteIndex);
                    key.classList.add('wrong');
                    
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

    startTimer(minutes) {
        clearInterval(this.timerInterval);
        if (minutes === 0) {
            this.dom.countdown.textContent = '00:00';
            return;
        }

        this.timerSeconds = minutes;
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
        this.dom.answerOptions.classList.add('hidden');
        this.dom.chordBoxContainer.style.display = 'block';
        this.dom.resultOverlay.classList.remove('show');
        
        document.querySelectorAll('.white-key, .black-key').forEach(k => {
            k.classList.remove('correct', 'wrong', 'active');
        });
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
                    const bassNote = this.getNoteName(tempNotesForDisplay[0]);
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

        const adjustedNotes = notes.map(n => n); 

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

        switch (this.currentMode) {
            case 1: // Notes -> Chord
                this.dom.chordDisplay.textContent = '?';
                this.dom.notesDisplay.textContent = this.currentChord.noteNames.join(' - ');
                this.showChordOptions();
                break;
            case 2: // Visual -> Notes
                this.dom.chordDisplay.textContent = '?';
                this.dom.notesDisplay.textContent = 'Identify this chord highlighted:';
                this.highlightKeys(this.currentChord.notes, 'correct');
                this.showChordOptions();
                break;
            case 3: // Chord -> Keys
                this.dom.chordDisplay.textContent = this.currentChord.name;
                this.dom.notesDisplay.textContent = 'Play the correct keys!';
                break;
            case 4: // Chord -> Notes
                this.dom.chordDisplay.textContent = this.currentChord.name;
                this.dom.notesDisplay.textContent = 'Select the right notes';
                this.showNoteOptions();
                break;
        }
    }

    showChordOptions() {
        this.dom.answerOptions.classList.remove('hidden');
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
        
        options.sort(() => Math.random() - 0.5);
        
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'mode-btn';
            btn.textContent = opt;
            btn.addEventListener('click', () => this.handleSelection(opt));
            this.dom.answerOptions.appendChild(btn);
        });
    }

    showNoteOptions() {
        this.dom.answerOptions.classList.remove('hidden');
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
        if (this.currentMode <= 2) {
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

        if (this.currentMode === 1 || this.currentMode === 2) {
            // For multiple choice, Check Answer can act as a "Show Answer" or validate selected button
            // But since buttons are clicked directly, we'll just show the keys as feedback
            this.highlightKeys(this.currentChord.notes, 'correct');
            return;
        }

        if (this.currentMode === 3) {
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

    showFeedback(isCorrect) {
        // Reveal the name in the golden box
        if (this.dom.chordDisplay) {
            this.dom.chordDisplay.textContent = this.currentChord.name;
        }

        // For identifying modes, show the correct keys as feedback
        if (this.currentMode === 1 || this.currentMode === 2) {
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
            if (key) key.classList.add(className);
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
        this.dom.currentScore.textContent = this.currentScore;
        this.dom.bestStreak.textContent = this.bestStreak;
        this.dom.totalChords.textContent = this.totalQuestions;
        
        const acc = this.totalQuestions > 0 ? Math.round((this.correctAnswers / this.totalQuestions) * 100) : 0;
        this.dom.accuracyValue.textContent = `${acc}%`;
    }

    getNoteName(noteIndex, rootOverride = null) {
        const sharps = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const flats = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
        
        const root = rootOverride || (this.currentChord ? this.currentChord.root : 'C');
        // Chords that should prefer flats to follow 'skip one letter' rule (e.g., Cm needs Eb, Gm needs Bb)
        const preferFlats = root.includes('b') || ['F', 'C', 'G'].includes(root);
        
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
        
        if (this.dom.sessionModal) {
            this.dom.sessionScore.textContent = this.currentScore;
            this.dom.sessionAccuracy.textContent = `${acc}%`;
            this.dom.sessionCount.textContent = this.totalQuestions;
            this.dom.sessionModal.classList.add('show');
        } else {
            alert(`Time's up!\nScore: ${this.currentScore}\nAccuracy: ${acc}%\nChords: ${this.totalQuestions}`);
            this.resetSession();
            this.nextQuestion();
        }
    }
}

// Initialize when ready
document.addEventListener('DOMContentLoaded', () => {
    window.chordTrainer = new ChordTrainer();
});
