// PianoAudioPlayer - Synthesizes realistic piano and synth sounds using Web Audio API
class PianoAudioPlayer {
    constructor(audioContext = null) {
        this.audioContext = audioContext;
        this.masterGain = null;
        this.isInitialized = false;
        this.activeNotes = new Map(); // Track active notes for cleanup
        this.noiseBuffer = null; // Pre-computed hammer noise

        // Piano sound parameters
        this.baseVolume = 0.3;

        // Sound profiles
        this.soundProfiles = {
            'piano': {
                name: 'Piano',
                attack: 0.005,
                decay: 0.3,      // Reduced 50% from 0.6
                sustain: 0.15,   // Reverted to 0.15
                release: 0.8,    // Reduced 50% from 1.6
                filterMult: 5,
                harmonics: [
                    [1, 1.0, 'sine'],
                    [2, 0.4, 'sine'],
                    [3, 0.15, 'triangle'],
                    [4, 0.1, 'triangle'],
                    [5, 0.05, 'triangle']
                ],
                hammer: true
            },
            'sawtooth': {
                name: 'Sawtooth',
                attack: 0.05,
                decay: 0.8,      // Reduced 50% from 1.6
                sustain: 0.6,
                release: 1.2,    // Reduced 50% from 2.4
                filterMult: 8,
                harmonics: [
                    [1.0, 1.0, 'sawtooth'],
                    [2.0, 0.4, 'sawtooth'],
                    [1.005, 0.3, 'sawtooth'],
                    [0.995, 0.3, 'sawtooth'],
                    [0.5, 0.2, 'triangle']
                ],
                hammer: false
            },
            'brass': {
                name: 'Brass',
                attack: 0.02,
                decay: 0.4,      // Reduced 50% from 0.8
                sustain: 0.7,
                release: 0.6,    // Reduced 50% from 1.2
                filterMult: 4,
                harmonics: [
                    [1.0, 1.0, 'sawtooth'],
                    [1.01, 0.5, 'sawtooth'],
                    [2.0, 0.3, 'sawtooth'],
                    [3.0, 0.1, 'sawtooth']
                ],
                hammer: false
            },
            'warm-pad': {
                name: 'Warm Pad',
                attack: 1.2,
                decay: 2.0,      // Reduced 50% from 4.0
                sustain: 0.8,
                release: 3.0,    // Reduced 50% from 6.0
                filterMult: 2,
                harmonics: [
                    [1, 1.0, 'sine'],
                    [1.002, 0.5, 'sine'],
                    [2, 0.3, 'sine'],
                    [0.5, 0.4, 'sine']
                ],
                hammer: false
            },
            'guitar-strum': {
                name: 'Guitar',
                attack: 0.002, // Sharper attack
                decay: 0.7,   // Reduced 50% from 1.4
                sustain: 0.05,  // Reduced 50% from 0.1
                release: 2.4,  // Reduced 50% from 4.8
                filterMult: 2.5, // Warmer base tone
                harmonics: [
                    [1, 1.0, 'triangle'],     // Fundamental
                    [2, 0.4, 'triangle'],     // Higher octave
                    [3, 0.15, 'sine'],        // Fifth
                    [4, 0.08, 'sine'],        // Second octave
                    [5, 0.04, 'sine']         // Third
                ],
                hammer: true,
                hammerGain: 0.35 // Stronger pick sound
            },
            'ukulele': {
                name: 'Ukulele',
                attack: 0.002,
                decay: 0.5,    // Reduced 50% from 1.0
                sustain: 0.05,  // Reduced 50% from 0.1
                release: 1.6,  // Reduced 50% from 3.2
                filterMult: 3.5, // Brighter tone
                harmonics: [
                    [1, 1.0, 'sine'],
                    [1.001, 0.3, 'sine'],     // Minimal detune
                    [2, 0.6, 'triangle'],     // Strong second harmonic
                    [3, 0.2, 'sine'],
                    [4, 0.1, 'sine']
                ],
                hammer: true,
                hammerGain: 0.3
            }
        };

        this.currentSound = 'piano';

        // Try to load saved sound
        if (typeof localStorage !== 'undefined') {
            const saved = localStorage.getItem('piano_audio_sound');
            if (saved && this.soundProfiles[saved]) {
                this.currentSound = saved;
            }
        }

        this.applyProfile(this.currentSound);
    }

    setSound(soundType) {
        if (this.soundProfiles[soundType]) {
            this.currentSound = soundType;
            this.applyProfile(soundType);
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('piano_audio_sound', soundType);
            }
        }
    }

    applyProfile(soundType) {
        const profile = this.soundProfiles[soundType];
        this.attack = profile.attack;
        this.decay = profile.decay;
        this.sustain = profile.sustain;
        this.release = profile.release;
        this.harmonics = profile.harmonics;
        this.filterMult = profile.filterMult;
        this.hammerEnabled = profile.hammer;
        this.hammerGain = profile.hammerGain || 0.15;
    }

    async initialize(audioContext = null) {
        if (this.isInitialized) return;

        try {
            // Use provided context or create new one if not already set
            if (audioContext) {
                this.audioContext = audioContext;
            } else if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            // Create master gain node
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.baseVolume;
            // Create reverb chain
            this.reverbNode = this.audioContext.createConvolver();
            this.reverbGain = this.audioContext.createGain();
            this.reverbGain.gain.value = 0.3; // Default level

            // Create a simple algorithm impulse
            this.reverbNode.buffer = this.createImpulseResponse(2.5, 2.0);

            this.reverbNode.connect(this.reverbGain);
            this.reverbGain.connect(this.masterGain);
            this.masterGain.connect(this.audioContext.destination);

            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize audio context:', error);
            throw error;
        }
    }

    createImpulseResponse(duration, decay) {
        const sampleRate = this.audioContext.sampleRate;
        const length = sampleRate * duration;
        const impulse = this.audioContext.createBuffer(2, length, sampleRate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);

        for (let i = 0; i < length; i++) {
            const n = length - i;
            const envelope = Math.pow(n / length, decay);
            left[i] = (Math.random() * 2 - 1) * envelope;
            right[i] = (Math.random() * 2 - 1) * envelope;
        }
        return impulse;
    }

    setReverb(level) {
        const val = Math.max(0, Math.min(1, level));
        if (this.reverbGain) {
            this.reverbGain.gain.setTargetAtTime(val, this.audioContext.currentTime, 0.05);
        }
    }

    setADSR(a, d, s, r) {
        if (a !== undefined) this.attack = a;
        if (d !== undefined) this.decay = d;
        if (s !== undefined) this.sustain = s;
        if (r !== undefined) this.release = r;
    }

    setFilterMult(m) {
        this.filterMult = m;
    }

    precomputeNoise() {
        const bufferSize = this.audioContext.sampleRate * 0.02; // 20ms of noise
        this.noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = this.noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
        }
    }

    // Convert MIDI note number to frequency in Hz
    semitoneToFrequency(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    // Play a single note
    playNote(semitone, duration = 10.0, velocity = 0.6, startTime = null) {
        if (!this.isInitialized) return;

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const now = startTime || this.audioContext.currentTime;
        const frequency = this.semitoneToFrequency(semitone);

        if (!isFinite(frequency) || frequency <= 0) {
            console.warn('Invalid frequency for note:', semitone, frequency);
            return;
        }

        // 1. Create Filter
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 1.0;

        // Filter Envelope: Start bright, drop to base filter frequency
        const filterStartFreq = frequency * (this.filterMult * 3 || 15);
        const filterEndFreq = frequency * (this.filterMult || 5);
        filter.frequency.setValueAtTime(filterStartFreq, now);
        filter.frequency.exponentialRampToValueAtTime(filterEndFreq, now + (this.decay * 1.5));

        // 2. Create Amp (VCA)
        const noteGain = this.audioContext.createGain();
        noteGain.gain.value = 0;

        filter.connect(noteGain);
        noteGain.connect(this.masterGain);
        if (this.reverbNode) {
            noteGain.connect(this.reverbNode);
        }

        // 3. Add Hammer Noise
        if (this.hammerEnabled) {
            this.addHammerNoise(noteGain, now, velocity);
        }

        // ADSR envelope
        const attackEnd = now + this.attack;
        const decayEnd = attackEnd + this.decay;
        const sustainLevel = this.sustain * velocity;
        const releaseStart = now + duration;
        const releaseEnd = releaseStart + this.release;

        noteGain.gain.setValueAtTime(0, now);
        noteGain.gain.linearRampToValueAtTime(velocity, attackEnd);
        noteGain.gain.linearRampToValueAtTime(sustainLevel, decayEnd);
        noteGain.gain.setValueAtTime(sustainLevel, releaseStart);
        noteGain.gain.exponentialRampToValueAtTime(0.001, releaseEnd);

        // 4. Create Oscillators
        const oscillators = [];

        this.harmonics.forEach(([multiplier, amplitude, type]) => {
            const hFreq = frequency * multiplier;
            if (hFreq > 15000) return;

            const osc = this.audioContext.createOscillator();
            osc.type = type || 'triangle';
            osc.frequency.value = hFreq;

            const hGain = this.audioContext.createGain();
            hGain.gain.value = amplitude;

            osc.connect(hGain);
            hGain.connect(filter);

            osc.start(now);
            osc.stop(releaseEnd);

            oscillators.push(osc);
        });

        // Store reference and cleanup
        const noteId = `${semitone}-${now}`;
        this.activeNotes.set(noteId, { oscillators, noteGain, filter });

        const cleanupTime = (releaseEnd - this.audioContext.currentTime + 0.5) * 1000;
        const timeoutId = setTimeout(() => {
            this.forceStopNoteId(noteId);
        }, Math.max(0, cleanupTime));

        // Save timeoutId to allow clearing it if note is stopped early
        this.activeNotes.get(noteId).timeoutId = timeoutId;
    }

    forceStopNoteId(noteId) {
        if (this.activeNotes.has(noteId)) {
            const note = this.activeNotes.get(noteId);
            const now = this.audioContext.currentTime;

            // Cancel any remaining envelopes and fade out quickly
            try {
                note.noteGain.gain.cancelScheduledValues(now);
                note.noteGain.gain.setValueAtTime(note.noteGain.gain.value, now);
                note.noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            } catch (e) { }

            setTimeout(() => {
                note.oscillators.forEach(osc => { try { osc.stop(); osc.disconnect(); } catch (e) { } });
                try { note.noteGain.disconnect(); } catch (e) { }
                try { note.filter.disconnect(); } catch (e) { }
                this.activeNotes.delete(noteId);
            }, 150);
        }
    }

    stopNote(semitone) {
        if (!this.isInitialized) return;
        // Find all active instances of this semitone
        for (const [noteId, note] of this.activeNotes.entries()) {
            if (noteId.startsWith(`${semitone}-`)) {
                if (note.timeoutId) clearTimeout(note.timeoutId);
                this.forceStopNoteId(noteId);
            }
        }
    }

    addHammerNoise(destination, startTime, velocity) {
        if (!this.noiseBuffer) return;
        const noise = this.audioContext.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2000;
        filter.Q.value = 1;
        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.value = velocity * (this.hammerGain || 0.15);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(destination);
        noise.start(startTime);
    }

    playChord(semitones, duration = 2.0, velocity = 0.6, stagger = 0.02, isStrum = false) {
        if (!this.isInitialized) {
            this.initialize().then(() => this.playChordInternal(semitones, duration, velocity, stagger, isStrum));
        } else {
            this.playChordInternal(semitones, duration, velocity, stagger, isStrum);
        }
    }

    playChordInternal(semitones, duration, velocity, stagger, isStrum = false) {
        if (this.audioContext.state === 'suspended') this.audioContext.resume();
        const now = this.audioContext.currentTime;

        // If strumming, we use a slightly longer stagger and random velocity variation
        const actualStagger = isStrum ? 0.035 : stagger;
        const sortedNotes = [...semitones].sort((a, b) => a - b);

        sortedNotes.forEach((semitone, index) => {
            // Add slight timing jitter and velocity variation for realism
            const jitter = isStrum ? (Math.random() * 0.01) : 0;
            const noteVelocity = velocity * (isStrum ? (0.7 + Math.random() * 0.4) : (0.9 + Math.random() * 0.2));
            this.playNote(semitone, duration, noteVelocity, now + (index * actualStagger) + jitter);
        });
    }

    playChordByName(chordName, chordParser) {
        const chord = chordParser(chordName);
        if (chord && chord.notes) this.playChord(chord.notes);
    }

    playTriumph() {
        if (!this.isInitialized) return;
        if (this.audioContext.state === 'suspended') this.audioContext.resume();
        const now = this.audioContext.currentTime;
        
        // Celebratory C Major 7 sequence
        const notes = [48, 52, 55, 59, 60, 64, 67, 72]; // C3, E3, G3, B3, C4, E4, G4, C5
        notes.forEach((note, i) => {
            this.playNote(note, 2.0, 0.5 + (i * 0.05), now + (i * 0.1));
        });
        
        // Final big chord
        this.playChord([60, 64, 67, 71, 72], 3.0, 0.8, 0.02, true);
    }

    playCountdownTick(isFinal = false) {
        if (!this.isInitialized) return;
        if (this.audioContext.state === 'suspended') this.audioContext.resume();
        const now = this.audioContext.currentTime;
        if (isFinal) {
            this.playNote(48, 1.0, 0.8, now); // C3
            this.playChord([60, 64, 67], 1.5, 0.7, 0, false); // C4 Chord
        } else {
            this.playNote(84, 0.2, 0.6, now); // C6
        }
    }

    stopAll() {
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        this.activeNotes.forEach(({ noteGain }) => {
            noteGain.gain.cancelScheduledValues(now);
            noteGain.gain.setValueAtTime(noteGain.gain.value, now);
            noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        });
        this.activeNotes.clear();
    }

    setVolume(volume) {
        this.baseVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) this.masterGain.gain.value = this.baseVolume;
    }

    getVolume() { return this.baseVolume; }

    dispose() {
        this.stopAll();
        // Only close context if we created it internally and it's not being shared
        // But since we can't easily track ownership without a flag I forgot to add,
        // we'll assume for now that if we are disposing, we might want to close it 
        // OR we should just rely on the caller to manage the context lifecycle.
        // Better: Don't close the context here if it was injected. 
        // For this refactor, let's assume the main app manages the context.
        // So we just disconnect nodes.

        if (this.masterGain) {
            try {
                this.masterGain.disconnect();
            } catch (e) { }
            this.masterGain = null;
        }

        // We do NOT close the context here as it might be shared
        // if (this.audioContext) { this.audioContext.close(); this.audioContext = null; }

        this.audioContext = null;
        this.isInitialized = false;
    }
}

window.PianoAudioPlayer = PianoAudioPlayer;
