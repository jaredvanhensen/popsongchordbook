/**
 * UkuleleChordDatabase - Static database of ukulele chord fingerings.
 * Standard G-C-E-A tuning.
 * Fingerings are represented as an array of 4 strings: [G, C, E, A]
 * Values:
 *  - number: fret to press (0 = open)
 *  - "x": string is muted/not played
 * Barre: { fret, fromString, toString } (fromString: 1=G, 4=A)
 */
const UkuleleChordDatabase = {
    // Basic Chords
    "C": {
        frets: [0, 0, 0, 3],
        fingers: [0, 0, 0, 3]
    },
    "Cm": {
        frets: [5, 3, 3, 3],
        baseFret: 3,
        barre: { fret: 3, fromString: 2, toString: 4 }
    },
    "D": {
        frets: [2, 2, 2, 0],
        fingers: [1, 2, 3, 0]
    },
    "Dm": {
        frets: [2, 2, 1, 0],
        fingers: [2, 3, 1, 0]
    },
    "E": {
        frets: [4, 4, 4, 2],
        baseFret: 2,
        barre: { fret: 4, fromString: 1, toString: 3 }
    },
    "Em": {
        frets: [0, 4, 3, 2],
        fingers: [0, 3, 2, 1]
    },
    "F": {
        frets: [2, 0, 1, 0],
        fingers: [2, 0, 1, 0]
    },
    "Fm": {
        frets: [1, 0, 1, 3],
        fingers: [1, 0, 2, 4]
    },
    "G": {
        frets: [0, 2, 3, 2],
        fingers: [0, 1, 3, 2]
    },
    "Gm": {
        frets: [0, 2, 3, 1],
        fingers: [0, 2, 3, 1]
    },
    "A": {
        frets: [2, 1, 0, 0],
        fingers: [2, 1, 0, 0]
    },
    "Am": {
        frets: [2, 0, 0, 0],
        fingers: [2, 0, 0, 0]
    },
    "B": {
        frets: [4, 3, 2, 2],
        baseFret: 2,
        barre: { fret: 2, fromString: 3, toString: 4 }
    },
    "Bm": {
        frets: [4, 2, 2, 2],
        baseFret: 2,
        barre: { fret: 2, fromString: 2, toString: 4 }
    },

    // Sharps & Flats
    "C#": {
        frets: [1, 1, 1, 4],
        fingers: [1, 1, 1, 4],
        barre: { fret: 1, fromString: 1, toString: 3 }
    },
    "Db": {
        frets: [1, 1, 1, 4],
        fingers: [1, 1, 1, 4],
        barre: { fret: 1, fromString: 1, toString: 3 }
    },
    "C#m": {
        frets: [1, 4, 4, 4],
        baseFret: 1,
        barre: { fret: 4, fromString: 2, toString: 4 }
    },
    "D#": {
        frets: [0, 3, 3, 1],
        fingers: [0, 2, 3, 1]
    },
    "Eb": {
        frets: [0, 3, 3, 1],
        fingers: [0, 2, 3, 1]
    },
    "F#": {
        frets: [3, 1, 2, 1],
        fingers: [3, 1, 2, 1],
        barre: { fret: 1, fromString: 2, toString: 4 }
    },
    "Gb": {
        frets: [3, 1, 2, 1],
        fingers: [3, 1, 2, 1],
        barre: { fret: 1, fromString: 2, toString: 4 }
    },
    "F#m": {
        frets: [2, 1, 2, 0],
        fingers: [2, 1, 3, 0]
    },
    "Ab": {
        frets: [5, 3, 4, 3],
        baseFret: 3,
        barre: { fret: 3, fromString: 2, toString: 4 }
    },
    "G#": {
        frets: [5, 3, 4, 3],
        baseFret: 3,
        barre: { fret: 3, fromString: 2, toString: 4 }
    },
    "G#m": {
        frets: [4, 3, 4, 2],
        baseFret: 2,
        fingers: [3, 2, 4, 1]
    },
    "Bb": {
        frets: [3, 2, 1, 1],
        fingers: [3, 2, 1, 1],
        barre: { fret: 1, fromString: 3, toString: 4 }
    },
    "Bbm": {
        frets: [3, 1, 1, 1],
        fingers: [3, 1, 1, 1],
        barre: { fret: 1, fromString: 2, toString: 4 }
    },

    // Additional common chords (mostly 7s, even if simplified, the DB should hold them)
    "C7": { frets: [0, 0, 0, 1], fingers: [0, 0, 0, 1] },
    "Cm7": { frets: [3, 3, 3, 3], baseFret: 3, barre: { fret: 3, fromString: 1, toString: 4 } },
    "Cmaj7": { frets: [0, 0, 0, 2], fingers: [0, 0, 0, 2] },
    "D7": { frets: [2, 2, 2, 3], fingers: [1, 2, 3, 4] },
    "Dm7": { frets: [2, 2, 1, 3], fingers: [2, 1, 1, 3] },
    "Dmaj7": { frets: [2, 2, 2, 4], fingers: [1, 1, 1, 3] },
    "E7": { frets: [1, 2, 0, 2], fingers: [1, 2, 0, 3] },
    "Em7": { frets: [0, 2, 0, 2], fingers: [0, 1, 0, 2] },
    "Emaj7": { frets: [1, 3, 0, 2], fingers: [1, 4, 0, 2] },
    "F7": { frets: [2, 3, 1, 3], fingers: [2, 3, 1, 4] },
    "Fm7": { frets: [1, 3, 1, 3], fingers: [1, 3, 1, 4] },
    "Fmaj7": { frets: [5, 4, 5, 7], baseFret: 4 },
    "G7": { frets: [0, 2, 1, 2], fingers: [0, 2, 1, 3] },
    "Gm7": { frets: [0, 2, 1, 1], fingers: [0, 2, 1, 1] },
    "Gmaj7": { frets: [0, 2, 2, 2], fingers: [0, 1, 2, 3] },
    "A7": { frets: [0, 1, 0, 0], fingers: [0, 1, 0, 0] },
    "Am7": { frets: [0, 0, 0, 0], fingers: [0, 0, 0, 0] },
    "Amaj7": { frets: [1, 1, 0, 0], fingers: [1, 2, 0, 0] },
    "B7": { frets: [2, 3, 2, 2], baseFret: 2, barre: { fret: 2, fromString: 1, toString: 4 } },
    "Bm7": { frets: [2, 2, 2, 2], baseFret: 2, barre: { fret: 2, fromString: 1, toString: 4 } },
    "Bmaj7": { frets: [4, 3, 2, 1], fingers: [4, 3, 2, 1] }
};

window.UkuleleChordDatabase = UkuleleChordDatabase;
