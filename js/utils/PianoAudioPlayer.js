// PianoAudioPlayer - Synthesizes realistic piano sounds using Web Audio API
class PianoAudioPlayer {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.isInitialized = false;
        this.activeNotes = new Map(); // Track active notes for cleanup
        this.noiseBuffer = null; // Pre-computed hammer noise

        // Piano sound parameters
        this.baseVolume = 0.3;

        // ADSR envelope parameters (in seconds)
        // Brass has a slightly slower attack than piano
        this.attack = 0.04;
        this.decay = 0.2;
        this.sustain = 0.3;
        this.release = 0.15;

        // Harmonic overtones for realistic piano sound
        // Each overtone has: [frequency multiplier, amplitude, decay rate]
        // Reduced number of harmonics for better performance on mobile
        this.harmonics = [
            [1, 1.0, 1.0],      // Fundamental
            [2, 0.5, 1.2],      // 2nd harmonic
            [3, 0.25, 1.5],     // 3rd harmonic
            [4, 0.15, 1.8],     // 4th harmonic
            [5, 0.1, 2.0],      // 5th harmonic
        ];
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Create master gain node
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.baseVolume;
            this.masterGain.connect(this.audioContext.destination);

            // Add a subtle reverb/room effect using convolution
            // this.createReverbEffect(); // REVERB DISABLED

            // Pre-compute hammer noise (unused for synth brass but kept for structure)
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

    createReverbEffect() {
        // ... (kept commented or unused)
    }

    // Convert semitone offset (C4=0) to frequency in Hz
    semitoneToFrequency(semitone) {
        // C4 (middle C) = 261.63 Hz = semitone 0
        // Each semitone is 2^(1/12) times the previous
        const c4Frequency = 261.63;
        return c4Frequency * Math.pow(2, semitone / 12);
    }

    // Play a single note with piano-like sound
    playNote(semitone, duration = 1.5, velocity = 0.7, startTime = null) {
        if (!this.isInitialized) {
            console.warn('Audio not initialized. Call initialize() first.');
            return;
        }

        // Resume context if suspended (required for iOS Safari)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const now = startTime || this.audioContext.currentTime;
        const frequency = this.semitoneToFrequency(semitone);

        // 80s Synth Brass Architecture:
        // Oscillators (Sawtooth) -> Filter (Lowpass with Envelope) -> VCA (Amp Envelope) -> Master

        // 1. Create Filter
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 4.0; // Resonance for that "synth" bite

        // Filter Envelope: Start closed, sweep open fast (attack), then decay
        // Center frequency depends on note pitch to track roughly
        const startFreq = frequency * 1.5;
        const maxFreq = frequency * 6; // Opens up bright
        const susFreq = frequency * 2; // Sustains slightly warm

        filter.frequency.setValueAtTime(startFreq, now);
        // Attack: Sweep up typically slightly slower than amp attack
        filter.frequency.linearRampToValueAtTime(maxFreq, now + this.attack * 1.2);
        // Decay/Sustain
        filter.frequency.exponentialRampToValueAtTime(susFreq, now + this.attack + this.decay);

        filter.connect(this.masterGain);

        // 2. Create Amp (VCA)
        const noteGain = this.audioContext.createGain();
        noteGain.gain.value = 0;
        noteGain.connect(filter); // Connect Amp to Filter

        // ADSR envelope for Amp
        const attackEnd = now + this.attack;
        const decayEnd = attackEnd + this.decay;
        const sustainLevel = this.sustain * velocity;
        const releaseStart = now + duration;
        const releaseEnd = releaseStart + this.release;

        // Apply Amp envelope
        noteGain.gain.setValueAtTime(0, now);
        noteGain.gain.linearRampToValueAtTime(velocity, attackEnd);
        noteGain.gain.linearRampToValueAtTime(sustainLevel, decayEnd);
        noteGain.gain.setValueAtTime(sustainLevel, releaseStart);
        noteGain.gain.exponentialRampToValueAtTime(0.001, releaseEnd); // STRICT silence

        // 3. Create Oscillators (Harmonics/Detuned Voices)
        const oscillators = [];
        const harmonicGains = [];

        this.harmonics.forEach(([multiplier, amplitude, decayRate], index) => {
            const harmonicFreq = frequency * multiplier;

            // Skip extremely high frequencies
            if (harmonicFreq > 10000) return;

            const osc = this.audioContext.createOscillator();
            osc.type = 'sawtooth'; // Classic synth brass waveform

            // Detune slightly for "fat" sound
            // Random detune between -10 and +10 cents
            const detune = (Math.random() * 20) - 10;
            osc.detune.value = detune;

            osc.frequency.value = harmonicFreq;

            const harmonicGain = this.audioContext.createGain();
            // Brass harmonics are rich, but we balance them
            // Lower amplitudes for higher harmonics
            const hAmp = (amplitude * 0.4) / (index + 1);
            harmonicGain.gain.value = hAmp;

            osc.connect(harmonicGain);
            harmonicGain.connect(noteGain); // Sum into Amp

            osc.start(now);
            osc.stop(releaseEnd); // Stop exactly with envelope

            oscillators.push(osc);
            harmonicGains.push(harmonicGain);
        });

        // Store reference for potential cleanup
        const noteId = `${semitone}-${now}`;
        this.activeNotes.set(noteId, { oscillators, harmonicGains, noteGain, filter }); // Store filter to disconnect too

        // Clean up nodes after note ends
        const cleanupTime = (releaseEnd - this.audioContext.currentTime + 0.5) * 1000;
        setTimeout(() => {
            if (this.activeNotes.has(noteId)) {
                const note = this.activeNotes.get(noteId);
                note.oscillators.forEach(osc => { try { osc.disconnect(); } catch (e) { } });
                note.harmonicGains.forEach(g => { try { g.disconnect(); } catch (e) { } });
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

        // Filter the noise to sound more like a piano hammer
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

        // Cleanup noise nodes
        setTimeout(() => {
            try {
                noise.disconnect();
                filter.disconnect();
                noiseGain.disconnect();
            } catch (e) { }
        }, 100);
    }

    // Play a chord (array of semitones)
    playChord(semitones, duration = 2.0, velocity = 0.6, stagger = 0.02) {
        if (!this.isInitialized) {
            this.initialize().then(() => {
                this.playChordInternal(semitones, duration, velocity, stagger);
            });
        } else {
            this.playChordInternal(semitones, duration, velocity, stagger);
        }
    }

    playChordInternal(semitones, duration, velocity, stagger) {
        // Resume context if suspended
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const now = this.audioContext.currentTime;

        // Sort notes from low to high
        const sortedNotes = [...semitones].sort((a, b) => a - b);

        // Play each note with a slight stagger (like a human strumming)
        // Using Web Audio timing instead of setTimeout for better performance and precision
        sortedNotes.forEach((semitone, index) => {
            // Vary velocity slightly for more natural sound
            const noteVelocity = velocity * (0.9 + Math.random() * 0.2);
            const startTime = now + (index * stagger);
            this.playNote(semitone, duration, noteVelocity, startTime);
        });
    }

    // Play a chord by name using the chord parser
    playChordByName(chordName, chordParser) {
        const chord = chordParser(chordName);
        if (chord && chord.notes) {
            this.playChord(chord.notes);
        }
    }

    // Stop all currently playing notes
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

    // Set master volume (0.0 to 1.0)
    setVolume(volume) {
        this.baseVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.baseVolume;
        }
    }

    // Get current volume
    getVolume() {
        return this.baseVolume;
    }

    // Clean up resources
    dispose() {
        this.stopAll();
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.isInitialized = false;
    }
}

// Make it globally available
window.PianoAudioPlayer = PianoAudioPlayer;


