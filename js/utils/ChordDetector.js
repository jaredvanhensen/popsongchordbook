// ChordDetector - Audio analysis engine for chord detection
class ChordDetector {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;
        this.isListening = false;
        this.animationFrame = null;
        this.detectedChord = null;
        this.confidence = 0;
        
        // Event callbacks
        this.onChordDetected = null;
        this.onStatusChange = null;
        this.onAudioLevel = null;
        
        // Audio level tracking
        this.currentAudioLevel = 0;
        
        // Audio analysis parameters
        this.bufferSize = 2048; // Smaller buffer for faster processing
        this.smoothingTimeConstant = 0.2; // Less smoothing for faster response
        this.confidenceThreshold = 0.45; // Lower threshold for more sensitive detection
        
        // Chord stabilization parameters (reduced for faster response)
        this.candidateChord = null;
        this.candidateStartTime = 0;
        this.stabilizationTime = 50; // ms - chord must be detected consistently (very short for quick response)
        this.lastDisplayedChord = null;
        this.chordHoldTime = 100; // ms - minimum time to hold a chord before it can change
        this.lastChordChangeTime = null;
        
        // Musical note frequencies (A4 = 440Hz, equal temperament)
        this.noteFrequencies = this.calculateNoteFrequencies();
        
        // Basic chord patterns (intervals from root)
        this.chordPatterns = {
            // Major chords (root, major third, perfect fifth)
            'C': [0, 4, 7], 'D': [2, 6, 9], 'E': [4, 8, 11],
            'F': [5, 9, 0], 'G': [7, 11, 2], 'A': [9, 1, 4], 'B': [11, 3, 6],
            // Minor chords (root, minor third, perfect fifth)
            'Cm': [0, 3, 7], 'Dm': [2, 5, 9], 'Em': [4, 7, 11],
            'Fm': [5, 8, 0], 'Gm': [7, 10, 2], 'Am': [9, 0, 4], 'Bm': [11, 2, 6]
        };
    }
    
    calculateNoteFrequencies() {
        // Calculate frequencies for all 12 semitones across multiple octaves
        const frequencies = [];
        const A4 = 440; // A4 = 440Hz
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        
        // Calculate from C0 to C8
        for (let octave = 0; octave <= 8; octave++) {
            for (let semitone = 0; semitone < 12; semitone++) {
                const noteIndex = semitone;
                const octaveOffset = (octave - 4) * 12;
                const semitoneOffset = noteIndex - 9; // A is index 9
                const frequency = A4 * Math.pow(2, (octaveOffset + semitoneOffset) / 12);
                frequencies.push({
                    note: notes[noteIndex],
                    octave: octave,
                    frequency: frequency
                });
            }
        }
        return frequencies;
    }
    
    async startListening(deviceId = null) {
        if (this.isListening) {
            return;
        }
        
        try {
            // Check for Web Audio API support
            if (!window.AudioContext && !window.webkitAudioContext) {
                throw new Error('Web Audio API wordt niet ondersteund in deze browser');
            }
            
            // Get microphone access with optional device selection
            const constraints = { 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            };
            
            if (deviceId) {
                constraints.audio.deviceId = { exact: deviceId };
            }
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Create audio context
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContextClass();
            
            // Create analyser node
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = this.bufferSize;
            this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;
            
            // Connect microphone to analyser
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.microphone.connect(this.analyser);
            
            // Initialize data array
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            
            this.isListening = true;
            this.updateStatus('listening');
            this.startAnalysis();
            
        } catch (error) {
            console.error('Error starting microphone:', error);
            this.updateStatus('error', error.message);
            this.isListening = false;
            throw error;
        }
    }
    
    stopListening() {
        if (!this.isListening) {
            return;
        }
        
        this.isListening = false;
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        if (this.microphone) {
            this.microphone.disconnect();
            this.microphone = null;
        }
        
        if (this.analyser) {
            this.analyser.disconnect();
            this.analyser = null;
        }
        
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.dataArray = null;
        this.detectedChord = null;
        this.confidence = 0;
        
        // Reset stabilization state
        this.candidateChord = null;
        this.candidateStartTime = 0;
        this.lastDisplayedChord = null;
        this.lastChordChangeTime = null;
        
        this.updateStatus('stopped');
    }
    
    startAnalysis() {
        if (!this.isListening) {
            return;
        }
        
        const analyze = () => {
            if (!this.isListening || !this.analyser || !this.dataArray) {
                return;
            }
            
            // Get frequency data
            this.analyser.getByteFrequencyData(this.dataArray);
            
            // Calculate audio level (average amplitude)
            const sum = this.dataArray.reduce((acc, val) => acc + val, 0);
            const average = sum / this.dataArray.length;
            const normalizedLevel = Math.min(1, average / 128); // Normalize to 0-1
            
            this.currentAudioLevel = normalizedLevel;
            
            // Report audio level
            if (this.onAudioLevel) {
                this.onAudioLevel(normalizedLevel);
            }
            
            // Only detect chord if there's sufficient audio input (very low threshold)
            if (normalizedLevel > 0.01) {
                // Detect chord from frequency data
                const chord = this.detectChord(this.dataArray);
                const now = performance.now();
                
                if (chord && chord.confidence >= this.confidenceThreshold) {
                    // Use stabilization to prevent rapid chord changes
                    this.updateStabilizedChord(chord.chord, chord.confidence, now);
                }
                // Don't clear the chord - keep the last detected chord displayed
            }
            // When audio is quiet, just clear the candidate but keep the last chord displayed
            
            this.animationFrame = requestAnimationFrame(analyze);
        };
        
        analyze();
    }
    
    detectChord(frequencyData) {
        // Find dominant frequencies (peaks)
        const peaks = this.findPeaks(frequencyData);
        
        if (peaks.length < 2) {
            return null; // Need at least 2 notes for detection
        }
        
        // Convert frequency bins to actual frequencies
        const sampleRate = this.audioContext.sampleRate;
        const frequencies = peaks.map(peak => {
            const bin = peak.bin;
            return (bin * sampleRate) / (2 * this.bufferSize);
        });
        
        // Find closest notes for each frequency
        const detectedNotes = frequencies
            .map(freq => this.findClosestNote(freq))
            .filter(note => note !== null);
        
        if (detectedNotes.length < 2) {
            return null;
        }
        
        // Match against chord patterns
        const bestMatch = this.matchChordPattern(detectedNotes);
        
        return bestMatch;
    }
    
    findPeaks(frequencyData) {
        const peaks = [];
        // Dynamic threshold based on average amplitude (very low for maximum sensitivity)
        const sum = frequencyData.reduce((acc, val) => acc + val, 0);
        const average = sum / frequencyData.length;
        const threshold = Math.max(10, average * 1.0); // Very low threshold for maximum sensitivity
        const minDistance = 3; // Minimum distance between peaks
        
        // Focus on lower frequencies where chord fundamentals are (80-1000 Hz)
        const sampleRate = this.audioContext.sampleRate;
        const maxBin = Math.floor((1000 * this.bufferSize) / sampleRate);
        const minBin = Math.floor((80 * this.bufferSize) / sampleRate);
        
        for (let i = Math.max(1, minBin); i < Math.min(frequencyData.length - 1, maxBin); i++) {
            const value = frequencyData[i];
            const prevValue = frequencyData[i - 1];
            const nextValue = frequencyData[i + 1];
            
            // Check if this is a peak above threshold
            if (value > threshold && value > prevValue && value > nextValue) {
                // Check distance from previous peak
                if (peaks.length === 0 || (i - peaks[peaks.length - 1].bin) >= minDistance) {
                    peaks.push({
                        bin: i,
                        amplitude: value
                    });
                }
            }
        }
        
        // Sort by amplitude and take top frequencies
        peaks.sort((a, b) => b.amplitude - a.amplitude);
        return peaks.slice(0, 6); // Top 6 frequencies (enough for chord detection)
    }
    
    findClosestNote(frequency) {
        if (frequency < 80 || frequency > 2000) {
            return null; // Filter out extreme frequencies
        }
        
        let closest = null;
        let minDiff = Infinity;
        
        // Only check frequencies in a reasonable range for chord detection
        for (const noteData of this.noteFrequencies) {
            if (noteData.frequency >= 80 && noteData.frequency <= 1000) {
                const diff = Math.abs(noteData.frequency - frequency);
                // Allow larger tolerance for better matching
                const tolerance = noteData.frequency * 0.08; // 8% tolerance for more forgiving detection
                if (diff < minDiff && diff <= tolerance) {
                    minDiff = diff;
                    closest = noteData;
                }
            }
        }
        
        return closest;
    }
    
    matchChordPattern(detectedNotes) {
        // Get unique note names (without octave)
        const noteNames = [...new Set(detectedNotes.map(note => note.note))];
        
        if (noteNames.length < 2) {
            return null;
        }
        
        // Map note names to semitone indices (C=0, C#=1, ..., B=11)
        const noteToSemitone = {
            'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
            'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
        };
        
        const semitones = [...new Set(noteNames
            .map(name => noteToSemitone[name])
            .filter(s => s !== undefined)
            .map(s => s % 12))]; // Normalize to 0-11 range
        
        if (semitones.length < 2) {
            return null;
        }
        
        let bestMatch = null;
        let bestScore = 0;
        
        // Define chord intervals
        const majorPattern = [0, 4, 7]; // root, major third, perfect fifth
        const minorPattern = [0, 3, 7]; // root, minor third, perfect fifth
        
        // Try each detected note as a potential root (prioritize lower notes as they're more likely to be the root)
        const sortedSemitones = [...semitones].sort((a, b) => a - b);
        
        for (const rootSemitone of sortedSemitones) {
            // Try major chord
            const majorIntervals = majorPattern.map(interval => (rootSemitone + interval) % 12);
            const majorMatches = majorIntervals.filter(expected => semitones.includes(expected)).length;
            const majorScore = majorMatches / majorPattern.length;
            
            if (majorScore > bestScore && majorScore >= this.confidenceThreshold) {
                bestScore = majorScore;
                const rootNote = Object.keys(noteToSemitone).find(
                    name => noteToSemitone[name] % 12 === rootSemitone
                );
                
                if (rootNote) {
                    bestMatch = {
                        chord: rootNote,
                        confidence: majorScore
                    };
                }
            }
            
            // Try minor chord
            const minorIntervals = minorPattern.map(interval => (rootSemitone + interval) % 12);
            const minorMatches = minorIntervals.filter(expected => semitones.includes(expected)).length;
            const minorScore = minorMatches / minorPattern.length;
            
            if (minorScore > bestScore && minorScore >= this.confidenceThreshold) {
                bestScore = minorScore;
                const rootNote = Object.keys(noteToSemitone).find(
                    name => noteToSemitone[name] % 12 === rootSemitone
                );
                
                if (rootNote) {
                    bestMatch = {
                        chord: rootNote + 'm',
                        confidence: minorScore
                    };
                }
            }
        }
        
        return bestMatch;
    }
    
    updateStabilizedChord(chord, confidence, now) {
        // If this is the same as the current candidate, check if stabilization time has passed
        if (chord === this.candidateChord) {
            const elapsed = now - this.candidateStartTime;
            
            // Chord has been stable long enough - display it
            if (elapsed >= this.stabilizationTime) {
                // Only update if different from currently displayed chord
                // AND enough time has passed since last chord change
                if (chord !== this.detectedChord) {
                    const timeSinceLastChange = this.lastChordChangeTime ? 
                        now - this.lastChordChangeTime : Infinity;
                    
                    if (timeSinceLastChange >= this.chordHoldTime || !this.detectedChord) {
                        this.detectedChord = chord;
                        this.confidence = confidence;
                        this.lastDisplayedChord = chord;
                        this.lastChordChangeTime = now;
                        
                        if (this.onChordDetected) {
                            this.onChordDetected(chord, confidence);
                        }
                    }
                }
            }
        } else {
            // New candidate chord - start stabilization timer
            this.candidateChord = chord;
            this.candidateStartTime = now;
        }
    }
    
    updateStatus(status, message = null) {
        if (this.onStatusChange) {
            this.onStatusChange(status, message);
        }
    }
    
    getDetectedChord() {
        return {
            chord: this.detectedChord,
            confidence: this.confidence
        };
    }
    
    setOnChordDetected(callback) {
        this.onChordDetected = callback;
    }
    
    setOnStatusChange(callback) {
        this.onStatusChange = callback;
    }
    
    setOnAudioLevel(callback) {
        this.onAudioLevel = callback;
    }
    
    getCurrentAudioLevel() {
        return this.currentAudioLevel;
    }
    
    async getAvailableDevices(requirePermission = false) {
        try {
            // Only request permission if explicitly required
            if (requirePermission) {
                await navigator.mediaDevices.getUserMedia({ audio: true });
            }
            
            // Get devices
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter(device => device.kind === 'audioinput');
            
            // If devices don't have labels and permission wasn't requested, return empty
            // (devices without permission don't have labels)
            if (!requirePermission && audioInputs.length > 0 && !audioInputs[0].label) {
                return [];
            }
            
            return audioInputs;
        } catch (error) {
            console.error('Error getting audio devices:', error);
            return [];
        }
    }
}

