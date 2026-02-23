// PianoAudioPlayer - Professional Piano Sampler with Synthesis Fallback
class PianoAudioPlayer {
    constructor(audioContext = null) {
        this.audioContext = audioContext;
        this.masterGain = null;
        this.reverbNode = null;
        this.reverbGain = null;
        this.isInitialized = false;

        this.samples = {};
        this.isSamplesLoaded = false;
        this.isLoading = false;

        this.currentSound = 'piano'; // 'piano' (synthesized), 'sampled-piano', 'sawtooth', 'brass', 'warm-pad'

        this.baseVolume = 0.5;

        // Synthesis profiles for sounds
        this.soundProfiles = {
            'piano': {
                attack: 0.005, decay: 0.3, sustain: 0.2, release: 0.8, filterMult: 3,
                harmonics: [
                    [1.0, 1.0, 'triangle'], // Fundamental
                    [1.01, 0.4, 'sine'],    // Slight detune for richness
                    [2.0, 0.3, 'sine'],    // Overtones
                    [3.0, 0.1, 'sine'],
                    [0.5, 0.2, 'sine']     // Sub-harmonic for depth
                ]
            },
            'sawtooth': {
                attack: 0.05, decay: 0.4, sustain: 0.6, release: 0.6, filterMult: 8,
                harmonics: [[1.0, 1.0, 'sawtooth'], [2.0, 0.4, 'sawtooth'], [1.005, 0.3, 'sawtooth'], [0.5, 0.2, 'triangle']]
            },
            'brass': {
                attack: 0.02, decay: 0.2, sustain: 0.7, release: 0.3, filterMult: 4,
                harmonics: [[1.0, 1.0, 'sawtooth'], [1.01, 0.5, 'sawtooth'], [2.0, 0.3, 'sawtooth']]
            },
            'warm-pad': {
                attack: 1.2, decay: 1.0, sustain: 0.8, release: 1.5, filterMult: 2,
                harmonics: [[1, 1.0, 'sine'], [1.002, 0.5, 'sine'], [2, 0.3, 'sine'], [0.5, 0.4, 'sine']]
            }
        };

        if (typeof localStorage !== 'undefined') {
            const saved = localStorage.getItem('piano_audio_sound');
            if (saved && (saved === 'sampled-piano' || this.soundProfiles[saved])) {
                this.currentSound = saved;
            }
        }
    }

    async initialize(audioContext = null) {
        if (this.isInitialized) return;

        if (audioContext) this.audioContext = audioContext;
        if (!this.audioContext) this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // 1. Setup Audio Chain
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = this.baseVolume;
        this.masterGain.connect(this.audioContext.destination);

        // 2. Setup Reverb for Piano
        this.reverbNode = this.audioContext.createConvolver();
        this.reverbNode.buffer = this.createImpulseResponse(1.8, 1.2);
        this.reverbGain = this.audioContext.createGain();
        this.reverbGain.gain.value = 0.4; // Wet mix

        this.reverbNode.connect(this.reverbGain);
        this.reverbGain.connect(this.masterGain);

        this.isInitialized = true;

        // 3. Start Loading Samples if explicitly set to sampled-piano
        if (this.currentSound === 'sampled-piano') {
            await this.loadSamples();
        }
    }

    createImpulseResponse(duration, decay) {
        const sampleRate = this.audioContext.sampleRate;
        const length = sampleRate * duration;
        const impulse = this.audioContext.createBuffer(2, length, sampleRate);
        for (let i = 0; i < 2; i++) {
            const channel = impulse.getChannelData(i);
            for (let j = 0; j < length; j++) {
                channel[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, decay);
            }
        }
        return impulse;
    }

    async loadSamples() {
        if (this.isSamplesLoaded || this.isLoading) return;
        this.isLoading = true;

        console.log("Loading Premium Piano Samples...");
        const sampleBase = 'https://tonejs.github.io/audio/salamander/';
        const notes = {
            36: 'C2.mp3', 39: 'Ds2.mp3', 42: 'Fs2.mp3', 45: 'A2.mp3',
            48: 'C3.mp3', 51: 'Ds3.mp3', 54: 'Fs3.mp3', 57: 'A3.mp3',
            60: 'C4.mp3', 63: 'Ds4.mp3', 66: 'Fs4.mp3', 69: 'A4.mp3',
            72: 'C5.mp3', 75: 'Ds5.mp3', 78: 'Fs5.mp3', 81: 'A5.mp3'
        };

        const promises = Object.entries(notes).map(async ([midi, file]) => {
            try {
                const response = await fetch(`${sampleBase}${file}`);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.samples[midi] = audioBuffer;
            } catch (e) {
                console.warn(`Failed to load piano sample: ${file}`, e);
            }
        });

        await Promise.all(promises);
        this.isSamplesLoaded = true;
        this.isLoading = false;
        console.log("Premium Piano Samples Loaded.");
    }

    setSound(soundType) {
        this.currentSound = soundType;
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('piano_audio_sound', soundType);
        }
        if (soundType === 'sampled-piano' && this.isInitialized && !this.isSamplesLoaded) {
            this.loadSamples();
        }
    }

    playNote(midi, duration = 2.0, velocity = 0.6, startTime = null) {
        if (!this.isInitialized) return;
        if (this.audioContext.state === 'suspended') this.audioContext.resume();

        const now = startTime || this.audioContext.currentTime;

        if (this.currentSound === 'sampled-piano' && this.isSamplesLoaded) {
            this.playSampledNote(midi, duration, velocity, now);
        } else {
            this.playSynthesizedNote(midi, duration, velocity, now);
        }
    }

    playSampledNote(midi, duration, velocity, now) {
        const midis = Object.keys(this.samples).map(Number);
        if (midis.length === 0) return this.playSynthesizedNote(midi, duration, velocity, now);

        const closest = midis.reduce((prev, curr) =>
            Math.abs(curr - midi) < Math.abs(prev - midi) ? curr : prev
        );

        const source = this.audioContext.createBufferSource();
        source.buffer = this.samples[closest];
        source.playbackRate.value = Math.pow(2, (midi - closest) / 12);

        const noteGain = this.audioContext.createGain();
        noteGain.gain.setValueAtTime(velocity, now);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        source.connect(noteGain);
        noteGain.connect(this.masterGain);
        noteGain.connect(this.reverbNode);

        source.start(now);
        source.stop(now + duration + 0.1);

        // Damper sound on release
        setTimeout(() => this.playDamperSound(), duration * 400);
    }

    playDamperSound() {
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        const noise = this.audioContext.createBufferSource();
        const noiseBuf = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.1, this.audioContext.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.02;
        noise.buffer = noiseBuf;

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;

        const g = this.audioContext.createGain();
        g.gain.setValueAtTime(0.015, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        noise.connect(filter);
        filter.connect(g);
        g.connect(this.masterGain);
        noise.start(now);
    }

    playSynthesizedNote(midi, duration, velocity, now) {
        const profile = this.soundProfiles[this.currentSound] || this.soundProfiles['sawtooth'];
        const frequency = 440 * Math.pow(2, (midi - 69) / 12);

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(frequency * (profile.filterMult || 4), now);

        const noteGain = this.audioContext.createGain();
        noteGain.gain.setValueAtTime(0, now);
        noteGain.gain.linearRampToValueAtTime(velocity, now + (profile.attack || 0.01));
        noteGain.gain.linearRampToValueAtTime(velocity * (profile.sustain || 0.5), now + (profile.attack || 0.01) + (profile.decay || 0.1));
        noteGain.gain.setValueAtTime(velocity * (profile.sustain || 0.5), now + duration);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + duration + (profile.release || 0.2));

        filter.connect(noteGain);
        noteGain.connect(this.masterGain);

        profile.harmonics.forEach(([mult, amp, type]) => {
            const osc = this.audioContext.createOscillator();
            osc.type = type || 'sine';
            osc.frequency.value = frequency * mult;
            const hGain = this.audioContext.createGain();
            hGain.gain.value = amp;
            osc.connect(hGain);
            hGain.connect(filter);
            osc.start(now);
            osc.stop(now + duration + (profile.release || 0.2));
        });
    }

    playChord(semitones, duration = 2.0, velocity = 0.6, stagger = 0.02) {
        if (!this.isInitialized) {
            this.initialize().then(() => this.playChord(semitones, duration, velocity, stagger));
            return;
        }
        const now = this.audioContext.currentTime;
        semitones.forEach((midi, i) => {
            this.playNote(midi, duration, velocity, now + (i * stagger));
        });
    }

    playChordByName(chordName, chordParser) {
        const chord = chordParser(chordName);
        if (chord && chord.notes) this.playChord(chord.notes);
    }

    stopAll() {
        if (this.masterGain) {
            const now = this.audioContext.currentTime;
            this.masterGain.gain.cancelScheduledValues(now);
            this.masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            setTimeout(() => { if (this.masterGain) this.masterGain.gain.value = this.baseVolume; }, 100);
        }
    }

    setVolume(volume) {
        this.baseVolume = Math.max(0, Math.min(1.5, volume));
        if (this.masterGain) this.masterGain.gain.value = this.baseVolume;
    }

    dispose() {
        this.isInitialized = false;
        if (this.masterGain) this.masterGain.disconnect();
        this.audioContext = null;
    }
}

window.PianoAudioPlayer = PianoAudioPlayer;
