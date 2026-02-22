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
                attack: 0.008, // Slightly softer attack
                decay: 0.2,
                sustain: 0.15,
                release: 0.25, // Slightly longer release for resonance
                filterMult: 8,  // Higher filter for more "sparkle"
                harmonics: [
                    [1, 1.0, 'sine'],
                    [1.003, 0.4, 'sine'],   // Slight detune for string chorus effect
                    [2, 0.35, 'sine'],
                    [3, 0.15, 'triangle'],
                    [4, 0.1, 'sine'],
                    [5, 0.05, 'triangle'],
                    [6, 0.02, 'sine']      // Higher overtones for realism
                ],
                hammer: true
            },
            'sawtooth': {
                name: 'Sawtooth',
                attack: 0.05,
                decay: 0.4,
                sustain: 0.6,
                release: 0.6,
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
                decay: 0.2,
                sustain: 0.7,
                release: 0.3,
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
                decay: 1.0,
                sustain: 0.8,
                release: 1.5,
                filterMult: 2,
                harmonics: [
                    [1, 1.0, 'sine'],
                    [1.002, 0.5, 'sine'],
                    [2, 0.3, 'sine'],
                    [0.5, 0.4, 'sine']
                ],
                hammer: false
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
            this.masterGain.connect(this.audioContext.destination);

            // Pre-compute hammer noise
            this.precomputeNoise();

            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize audio context:', error);
            throw error;
        }
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
        filter.frequency.setValueAtTime(frequency * (this.filterMult || 5), now);

        // 2. Create Amp (VCA)
        const noteGain = this.audioContext.createGain();
        noteGain.gain.value = 0;

        filter.connect(noteGain);
        noteGain.connect(this.masterGain);

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
        setTimeout(() => {
            if (this.activeNotes.has(noteId)) {
                const note = this.activeNotes.get(noteId);
                note.oscillators.forEach(osc => { try { osc.disconnect(); } catch (e) { } });
                try { note.noteGain.disconnect(); } catch (e) { }
                try { note.filter.disconnect(); } catch (e) { }
                this.activeNotes.delete(noteId);
            }
        }, Math.max(0, cleanupTime));
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
        noiseGain.gain.value = velocity * 0.15;
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(destination);
        noise.start(startTime);
    }

    playChord(semitones, duration = 2.0, velocity = 0.6, stagger = 0.02) {
        if (!this.isInitialized) {
            this.initialize().then(() => this.playChordInternal(semitones, duration, velocity, stagger));
        } else {
            this.playChordInternal(semitones, duration, velocity, stagger);
        }
    }

    playChordInternal(semitones, duration, velocity, stagger) {
        if (this.audioContext.state === 'suspended') this.audioContext.resume();
        const now = this.audioContext.currentTime;
        const sortedNotes = [...semitones].sort((a, b) => a - b);
        sortedNotes.forEach((semitone, index) => {
            const noteVelocity = velocity * (0.9 + Math.random() * 0.2);
            this.playNote(semitone, duration, noteVelocity, now + (index * stagger));
        });
    }

    playChordByName(chordName, chordParser) {
        const chord = chordParser(chordName);
        if (chord && chord.notes) this.playChord(chord.notes);
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
