/**
 * ChordParser - Standalone utility for parsing chord names into MIDI semitones.
 * Extracted and optimized from PianoChordOverlay logic.
 */
class ChordParser {
    constructor() {
        this.noteToSemitone = {
            'C': 0, 'C#': 1, 'Db': 1,
            'D': 2, 'D#': 3, 'Eb': 3,
            'E': 4, 'Fb': 4,
            'F': 5, 'F#': 6, 'Gb': 6,
            'G': 7, 'G#': 8, 'Ab': 8,
            'A': 9, 'A#': 10, 'Bb': 10,
            'B': 11, 'Cb': 11
        };

        this.chordIntervals = {
            '': [0, 4, 7],
            'maj': [0, 4, 7],
            'M': [0, 4, 7],
            'm': [0, 3, 7],
            'min': [0, 3, 7],
            '-': [0, 3, 7],
            '7': [0, 4, 7, 10],
            'maj7': [0, 4, 7, 11],
            'M7': [0, 4, 7, 11],
            'm7': [0, 3, 7, 10],
            'min7': [0, 3, 7, 10],
            'dim': [0, 3, 6],
            'dim7': [0, 3, 6, 9],
            'aug': [0, 4, 8],
            'sus2': [0, 2, 7],
            'sus4': [0, 5, 7],
            'sus': [0, 5, 7],
            '7sus4': [0, 5, 7, 10],
            'add9': [0, 4, 7, 14],
            'add2': [0, 2, 4, 7],
            '9': [0, 4, 7, 10, 14],
            'maj9': [0, 4, 7, 11, 14],
            'm9': [0, 3, 7, 10, 14],
            '11': [0, 4, 7, 10, 14, 17],
            '13': [0, 4, 7, 10, 14, 21],
            '6': [0, 4, 7, 9],
            'm6': [0, 3, 7, 9],
            '5': [0, 7],
        };
    }

    parse(chordName) {
        if (!chordName || typeof chordName !== 'string') return null;

        chordName = chordName.trim();
        const rootMatch = chordName.match(/^([A-Ga-g])([#b]?)/);
        if (!rootMatch) return null;

        let rootNote = rootMatch[1].toUpperCase();
        const accidental = rootMatch[2];
        const rootKey = rootNote + accidental;

        const rootSemitone = this.noteToSemitone[rootKey];
        if (rootSemitone === undefined) return null;

        let suffix = chordName.slice(rootMatch[0].length);

        // Handle slash chords (e.g., C/G)
        let bassNotePart = null;
        const slashIndex = suffix.indexOf('/');
        if (slashIndex !== -1) {
            bassNotePart = suffix.slice(slashIndex + 1);
            suffix = suffix.slice(0, slashIndex);
        }

        // Check for inversion indicator at the end (custom notation)
        // "2" = 2nd inversion (Root is 2nd note in triad: G-C-E)
        // "3" = 1st inversion (Root is 3rd note in triad: E-G-C)
        let inversion = 0;
        const inversionMatch = suffix.match(/([23])$/);
        if (inversionMatch) {
            const invNum = parseInt(inversionMatch[1]);
            // Custom notation: "2" means 2nd inversion, "3" means 1st inversion
            if (invNum === 2) {
                inversion = 2; // 2nd inversion: 3rd note becomes bass
            } else if (invNum === 3) {
                inversion = 1; // 1st inversion: 2nd note becomes bass
            }
            suffix = suffix.slice(0, -1); // Remove the inversion number from suffix
        }

        // Find matching interval pattern
        let intervals = this.chordIntervals[suffix];

        // Fallback for common variations
        if (!intervals) {
            if (suffix.startsWith('m') && !suffix.startsWith('maj')) {
                intervals = this.chordIntervals['m'];
            } else {
                intervals = this.chordIntervals[''];
            }
        }

        // Calculate actual notes (octave 3 by default, MIDI 48)
        const baseOctave = 48; // C3 area (One octave lower than Middle C)
        let notes = intervals.map(interval => rootSemitone + baseOctave + interval);

        // Auto-detect inversion from slash chord if present
        if (bassNotePart) {
            const bassMatch = bassNotePart.match(/^([A-Ga-g])([#b]?)/);
            if (bassMatch) {
                const bassRoot = bassMatch[1].toUpperCase();
                const bassAccidental = bassMatch[2];
                const bassKey = bassRoot + bassAccidental;
                const bassSemitone = this.noteToSemitone[bassKey];

                if (bassSemitone !== undefined) {
                    for (let i = 0; i < notes.length; i++) {
                        if (notes[i] % 12 === bassSemitone) {
                            inversion = i;
                            break;
                        }
                    }
                }
            }
        }

        // Apply inversion if specified
        if (inversion > 0 && inversion < notes.length) {
            // Move the first 'inversion' notes up by an octave
            for (let i = 0; i < inversion; i++) {
                notes[i] = notes[i] + 12;
            }

            // Sort notes so bass is first (lowest)
            notes.sort((a, b) => a - b);

            // Ensure notes stay in reasonable range (MIDI 48-72 range approx, octave 3-4)
            while (notes[notes.length - 1] > 84) {
                notes = notes.map(n => n - 12);
            }
            while (notes[0] < 48) {
                notes = notes.map(n => n + 12);
            }
        }

        return {
            name: chordName,
            notes: notes,
            root: rootSemitone,
            inversion: inversion
        };
    }
}

// Global availability
window.ChordParser = ChordParser;
