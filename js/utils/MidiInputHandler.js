class MidiInputHandler {
    constructor() {
        this.activeNotes = new Set();
        this.noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        this.isEnabled = true;
        this.isInitialized = false;

        // Auto-unlock audio context on first UI interaction
        const unlockAudio = () => {
            if (typeof initAudio === 'function') initAudio();
            if (this.audioPlayer && this.audioPlayer.audioContext && this.audioPlayer.audioContext.state === 'suspended') {
                this.audioPlayer.audioContext.resume();
            }
        };
        document.addEventListener('pointerdown', unlockAudio, { once: true });
        document.addEventListener('keydown', unlockAudio, { once: true });

        this.init();
    }

    async init() {
        try {
            // 1. Identify if we are on the main songlist page
            // We check for 'songsTableBody' because it's a unique element on the main page.
            // This is more robust than URL checks which can vary by hosting (e.g., GitHub Pages).
            const isMainPage = !!document.getElementById('songsTableBody');

            if (isMainPage) {
                console.log("MIDI: Skipping auto-prompt on main page. Will initialize in Scrolling Chords view if needed.");
                return;
            }

            if (!navigator.requestMIDIAccess) {
                console.warn("Web MIDI API not supported in this browser.");
                return;
            }

            // 2. Check if we already have permission - if so, init silently
            if (navigator.permissions && navigator.permissions.query) {
                try {
                    const permission = await navigator.permissions.query({ name: 'midi', sysex: false });
                    if (permission.state === 'granted') {
                        return await this.requestAccess();
                    }
                } catch (e) {
                    console.warn("MIDI permission query failed:", e);
                }
            }

            // 3. Delayed initialization on first user interaction to avoid "immediate" popup
            // only on non-main pages (like scrolling_chords.html)
            const handleFirstInteraction = () => {
                this.requestAccess();
                document.removeEventListener('pointerdown', handleFirstInteraction);
                document.removeEventListener('keydown', handleFirstInteraction);
            };

            document.addEventListener('pointerdown', handleFirstInteraction);
            document.addEventListener('keydown', handleFirstInteraction);

        } catch (err) {
            console.error("Could not initialize MIDI", err);
        }
    }

    async requestAccess() {
        if (this.isInitialized) return;

        try {
            const midiAccess = await navigator.requestMIDIAccess();
            this.isInitialized = true;

            for (const input of midiAccess.inputs.values()) {
                input.onmidimessage = this.onMidiMessage.bind(this);
            }

            midiAccess.onstatechange = (e) => {
                if (e.port.type === 'input' && e.port.state === 'connected') {
                    e.port.onmidimessage = this.onMidiMessage.bind(this);
                }
            };
            console.log("MIDI Input Handler initialized");
        } catch (err) {
            console.warn("MIDI access request failed or denied:", err);
        }
    }

    onMidiMessage(message) {
        if (!this.isEnabled) return;

        const command = message.data[0] >> 4;
        const note = message.data[1];
        const velocity = (message.data.length > 2) ? message.data[2] : 1;

        if (command === 9 && velocity > 0) { // Note On
            this.handleNoteOn(note, velocity);
        } else if (command === 8 || (command === 9 && velocity === 0)) { // Note Off
            this.handleNoteOff(note);
        }
    }

    handleNoteOn(noteIndex, velocity) {
        this.activeNotes.add(noteIndex);

        this.playNoteFeedback(noteIndex, velocity);

        this.evaluateInput();
    }

    playNoteFeedback(noteIndex, velocity) {
        if (typeof initAudio === 'function') {
            initAudio(); // Initialize global context and pianoPlayer in app if available
        }

        if (typeof pianoPlayer !== 'undefined' && pianoPlayer) {
            this.triggerAudio(pianoPlayer, noteIndex, velocity);
        } else {
            if (!this.audioPlayer) {
                if (typeof window.PianoAudioPlayer !== 'undefined') {
                    this.audioPlayer = new window.PianoAudioPlayer();
                } else {
                    return; // No audio player class available
                }
            }
            this.triggerAudio(this.audioPlayer, noteIndex, velocity);
        }
    }

    triggerAudio(player, noteIndex, velocity) {
        if (player.isInitialized) {
            player.playNote(noteIndex, 2.0, velocity / 127);
        } else {
            if (!player._midiInitPromise) {
                player._midiInitPromise = player.initialize();
            }
            player._midiInitPromise.then(() => {
                player.playNote(noteIndex, 2.0, velocity / 127);
            }).catch(e => console.error("Failed to initialize MIDI audio:", e));
        }
    }

    handleNoteOff(noteIndex) {
        this.activeNotes.delete(noteIndex);

        this.stopNoteFeedback(noteIndex);
        this.updateDisplay(); // Instantly update display when lifting keys
    }

    stopNoteFeedback(noteIndex) {
        if (typeof pianoPlayer !== 'undefined' && pianoPlayer) {
            if (pianoPlayer.isInitialized) pianoPlayer.stopNote(noteIndex);
        } else if (this.audioPlayer && this.audioPlayer.isInitialized) {
            this.audioPlayer.stopNote(noteIndex);
        }
    }

    updateDisplay() {
        const notesArray = Array.from(this.activeNotes);
        let displayChord = null;

        if (notesArray.length >= 3) {
            displayChord = this.detectChord(notesArray) || this.getNoteName(notesArray[0]);
        } else if (notesArray.length > 0) {
            displayChord = this.getNoteName(notesArray[0]);
        }

        // Expose the currently held MIDI chord/note globally for the UI
        if (typeof window !== 'undefined') {
            window.activeMidiChord = displayChord;
        }
    }

    evaluateInput() {
        if (this.evaluateTimeout) clearTimeout(this.evaluateTimeout);

        this.evaluateTimeout = setTimeout(() => {
            this.updateDisplay(); // Ensure latest display is computed

            // Evaluate input for chord recording if timing capture is enabled
            if (typeof enableTimingCapture !== 'undefined' && enableTimingCapture) {
                const notesArray = Array.from(this.activeNotes);

                if (notesArray.length === 0) return;

                let displayChord = null;
                if (notesArray.length >= 3) {
                    displayChord = this.detectChord(notesArray) || this.getNoteName(notesArray[0]);
                } else if (notesArray.length > 0) {
                    displayChord = this.getNoteName(notesArray[0]);
                }

                if (displayChord) {
                    if (notesArray.length >= 3) {
                        const chordName = this.detectChord(notesArray);
                        if (chordName) {
                            if (typeof recordChord === 'function') {
                                recordChord(chordName);
                                // Clear active notes slightly varied so we don't double trigger immediately
                                this.activeNotes.clear();
                                this.updateDisplay();
                            }
                        }
                    } else if (notesArray.length === 1) {
                        // If single note, just record the raw note name exactly as played
                        if (typeof recordChord === 'function') {
                            recordChord(displayChord);
                        }
                    }
                }
            }
        }, 50); // 50ms debounce window allows all fingers of a chord to land before evaluating
    }

    getNoteName(noteIndex) {
        const toggle = document.getElementById('midiNotationToggle');
        const isFlat = toggle && toggle.checked;
        const flatNoteNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
        return isFlat ? flatNoteNames[noteIndex % 12] : this.noteNames[noteIndex % 12];
    }

    smartMatchSingleNote(key) {
        if (typeof recordChord === 'function') {
            recordChord(key.toUpperCase());
        }
    }

    detectChord(midiNotes) {
        // Map notes to their 0-11 semitone class
        const semitones = [...new Set(midiNotes.map(n => n % 12))];
        if (semitones.length < 3) return null;

        const majorPattern = [0, 4, 7];
        const minorPattern = [0, 3, 7];

        const sorted = [...semitones].sort((a, b) => a - b);

        for (const root of sorted) {
            // Check major
            const majorScore = majorPattern.filter(interval => semitones.includes((root + interval) % 12)).length;
            if (majorScore === 3) return this.getNoteName(root);

            // Check minor
            const minorScore = minorPattern.filter(interval => semitones.includes((root + interval) % 12)).length;
            if (minorScore === 3) return this.getNoteName(root) + 'm';
        }

        return null; // Could not detect basic triadic chord
    }
}

// Instantiate globally
if (typeof window !== 'undefined') {
    window.midiInputHandler = new MidiInputHandler();
}
