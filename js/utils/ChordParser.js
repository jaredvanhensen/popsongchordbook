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

        // Handle slash chords
        let suffixNoSlash = suffix;
        const slashIndex = suffix.indexOf('/');
        if (slashIndex !== -1) {
            suffixNoSlash = suffix.slice(0, slashIndex);
        }

        // Find matching interval pattern
        let intervals = this.chordIntervals[suffixNoSlash];

        // Fallback for common variations
        if (!intervals) {
            if (suffixNoSlash.startsWith('m') && !suffixNoSlash.startsWith('maj')) {
                intervals = this.chordIntervals['m'];
            } else {
                intervals = this.chordIntervals[''];
            }
        }

        // Calculate actual notes (octave 4 by default)
        const baseOctave = 48; // C3
        let notes = intervals.map(interval => rootSemitone + baseOctave + interval);

        return {
            name: chordName,
            notes: notes,
            root: rootSemitone
        };
    }
}

// Global availability
window.ChordParser = ChordParser;
