class MidiInputHandler {
    constructor() {
        this.activeNotes = new Set();
        this.noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        this.isEnabled = true;

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
            if (navigator.requestMIDIAccess) {
                const midiAccess = await navigator.requestMIDIAccess();
                for (const input of midiAccess.inputs.values()) {
                    input.onmidimessage = this.onMidiMessage.bind(this);
                }

                midiAccess.onstatechange = (e) => {
                    if (e.port.type === 'input' && e.port.state === 'connected') {
                        e.port.onmidimessage = this.onMidiMessage.bind(this);
                    }
                };
                console.log("MIDI Input Handler initialized");
            } else {
                console.warn("Web MIDI API not supported in this browser.");
            }
        } catch (err) {
            console.error("Could not initialize MIDI", err);
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
    }

    stopNoteFeedback(noteIndex) {
        if (typeof pianoPlayer !== 'undefined' && pianoPlayer) {
            if (pianoPlayer.isInitialized) pianoPlayer.stopNote(noteIndex);
        } else if (this.audioPlayer && this.audioPlayer.isInitialized) {
            this.audioPlayer.stopNote(noteIndex);
        }
    }

    evaluateInput() {
        if (this.evaluateTimeout) clearTimeout(this.evaluateTimeout);

        this.evaluateTimeout = setTimeout(() => {
            // Evaluate input for chord recording if timing capture is enabled
            if (typeof enableTimingCapture !== 'undefined' && enableTimingCapture) {
                const notesArray = Array.from(this.activeNotes);
                if (notesArray.length >= 3) {
                    const chordName = this.detectChord(notesArray);
                    if (chordName) {
                        if (typeof recordChord === 'function') {
                            recordChord(chordName);
                            // Clear active notes slightly varied so we don't double trigger immediately
                            this.activeNotes.clear();
                        }
                    }
                } else if (notesArray.length === 1) {
                    // If single note, just record the raw note name exactly as played
                    const noteIndex = notesArray[0];
                    const noteName = this.noteNames[noteIndex % 12];
                    if (typeof recordChord === 'function') {
                        recordChord(noteName);
                    }
                }
            }
        }, 50); // 50ms debounce window allows all fingers of a chord to land before evaluating
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
            if (majorScore === 3) return this.noteNames[root];

            // Check minor
            const minorScore = minorPattern.filter(interval => semitones.includes((root + interval) % 12)).length;
            if (minorScore === 3) return this.noteNames[root] + 'm';
        }

        return null; // Could not detect basic triadic chord
    }
}

// Instantiate globally
if (typeof window !== 'undefined') {
    window.midiInputHandler = new MidiInputHandler();
}
