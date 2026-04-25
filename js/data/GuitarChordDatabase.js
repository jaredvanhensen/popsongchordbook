/**
 * GuitarChordDatabase - Static database of guitar chord fingerings.
 * Fingerings are represented as an array of 6 strings: [Low E, A, D, G, B, High E]
 * Values:
 *  - number: fret to press (0 = open)
 *  - "x": string is muted/not played
 * Barre: { fret, fromString, toString } (fromString: 1=Low E, 6=High E)
 */
const GuitarChordDatabase = {
    // Basic Chords
    "C": {
        frets: ["x", 3, 2, 0, 1, 0],
        fingers: [0, 3, 2, 0, 1, 0]
    },
    "C7": {
        frets: ["x", 3, 2, 3, 1, 0],
        fingers: [0, 3, 2, 4, 1, 0]
    },
    "Cm": {
        baseFret: 3,
        frets: ["x", 3, 5, 5, 4, 3],
        barre: { fret: 3, fromString: 2, toString: 6 },
        fingers: [0, 1, 3, 4, 2, 1]
    },
    "D": {
        frets: ["x", "x", 0, 2, 3, 2],
        fingers: [0, 0, 0, 1, 3, 2]
    },
    "Dm": {
        frets: ["x", "x", 0, 2, 3, 1],
        fingers: [0, 0, 0, 2, 3, 1]
    },
    "D7": {
        frets: ["x", "x", 0, 2, 1, 2],
        fingers: [0, 0, 0, 2, 1, 3]
    },
    "E": {
        frets: [0, 2, 2, 1, 0, 0],
        fingers: [0, 2, 3, 1, 0, 0]
    },
    "Em": {
        frets: [0, 2, 2, 0, 0, 0],
        fingers: [0, 2, 3, 0, 0, 0]
    },
    "E7": {
        frets: [0, 2, 0, 1, 0, 0],
        fingers: [0, 2, 0, 1, 0, 0]
    },
    "F": {
        baseFret: 1,
        frets: [1, 3, 3, 2, 1, 1],
        barre: { fret: 1, fromString: 1, toString: 6 },
        fingers: [1, 3, 4, 2, 1, 1]
    },
    "Fm": {
        baseFret: 1,
        frets: [1, 3, 3, 1, 1, 1],
        barre: { fret: 1, fromString: 1, toString: 6 },
        fingers: [1, 3, 4, 1, 1, 1]
    },
    "Fmaj7": {
        frets: ["x", "x", 3, 2, 1, 0],
        fingers: [0, 0, 3, 2, 1, 0]
    },
    "G": {
        frets: [3, 2, 0, 0, 0, 3],
        fingers: [2, 1, 0, 0, 0, 3]
    },
    "Gm": {
        baseFret: 3,
        frets: [3, 5, 5, 3, 3, 3],
        barre: { fret: 3, fromString: 1, toString: 6 },
        fingers: [1, 3, 4, 1, 1, 1]
    },
    "G7": {
        frets: [3, 2, 0, 0, 0, 1],
        fingers: [3, 2, 0, 0, 0, 1]
    },
    "A": {
        frets: ["x", 0, 2, 2, 2, 0],
        fingers: [0, 0, 1, 2, 3, 0]
    },
    "Am": {
        frets: ["x", 0, 2, 2, 1, 0],
        fingers: [0, 0, 2, 3, 1, 0]
    },
    "A7": {
        frets: ["x", 0, 2, 0, 2, 0],
        fingers: [0, 0, 1, 0, 2, 0]
    },
    "A#": {
        baseFret: 1,
        frets: ["x", 1, 3, 3, 3, 1],
        barre: { fret: 1, fromString: 2, toString: 6 },
        fingers: [0, 1, 2, 3, 4, 1]
    },
    "A#m": {
        baseFret: 1,
        frets: ["x", 1, 3, 3, 2, 1],
        barre: { fret: 1, fromString: 2, toString: 6 },
        fingers: [0, 1, 3, 4, 2, 1]
    },
    "B": {
        baseFret: 2,
        frets: ["x", 2, 4, 4, 4, 2],
        barre: { fret: 2, fromString: 2, toString: 6 },
        fingers: [0, 1, 2, 3, 4, 1]
    },
    "Bm": {
        baseFret: 2,
        frets: ["x", 2, 4, 4, 3, 2],
        barre: { fret: 2, fromString: 2, toString: 6 },
        fingers: [0, 1, 3, 4, 2, 1]
    },
    "B7": {
        frets: ["x", 2, 1, 2, 0, 2],
        fingers: [0, 2, 1, 3, 0, 4]
    },

    // Sharps & Flats
    "C#": {
        baseFret: 4,
        frets: ["x", 4, 6, 6, 6, 4],
        barre: { fret: 4, fromString: 2, toString: 6 },
        fingers: [0, 1, 2, 3, 4, 1]
    },
    "C#m": {
        baseFret: 4,
        frets: ["x", 4, 6, 6, 5, 4],
        barre: { fret: 4, fromString: 2, toString: 6 },
        fingers: [0, 1, 3, 4, 2, 1]
    },
    "Dbm": {
        baseFret: 4,
        frets: ["x", 4, 6, 6, 5, 4],
        barre: { fret: 4, fromString: 2, toString: 6 },
        fingers: [0, 1, 3, 4, 2, 1]
    },
    "Db": {
        baseFret: 4,
        frets: ["x", 4, 6, 6, 6, 4],
        barre: { fret: 4, fromString: 2, toString: 6 },
        fingers: [0, 1, 2, 3, 4, 1]
    },
    "D#": {
        baseFret: 6,
        frets: ["x", 6, 8, 8, 8, 6],
        barre: { fret: 6, fromString: 2, toString: 6 },
        fingers: [0, 1, 2, 3, 4, 1]
    },
    "Eb": {
        baseFret: 6,
        frets: ["x", 6, 8, 8, 8, 6],
        barre: { fret: 6, fromString: 2, toString: 6 },
        fingers: [0, 1, 2, 3, 4, 1]
    },
    "Ebm": {
        baseFret: 6,
        frets: ["x", 6, 8, 8, 7, 6],
        barre: { fret: 6, fromString: 2, toString: 6 },
        fingers: [0, 1, 3, 4, 2, 1]
    },
    "D#m": {
        baseFret: 6,
        frets: ["x", 6, 8, 8, 7, 6],
        barre: { fret: 6, fromString: 2, toString: 6 },
        fingers: [0, 1, 3, 4, 2, 1]
    },
    "F#": {
        baseFret: 2,
        frets: [2, 4, 4, 3, 2, 2],
        barre: { fret: 2, fromString: 1, toString: 6 },
        fingers: [1, 3, 4, 2, 1, 1]
    },
    "F#m": {
        baseFret: 2,
        frets: [2, 4, 4, 2, 2, 2],
        barre: { fret: 2, fromString: 1, toString: 6 },
        fingers: [1, 3, 4, 1, 1, 1]
    },
    "Gbm": {
        baseFret: 2,
        frets: [2, 4, 4, 2, 2, 2],
        barre: { fret: 2, fromString: 1, toString: 6 },
        fingers: [1, 3, 4, 1, 1, 1]
    },
    "Gb": {
        baseFret: 2,
        frets: [2, 4, 4, 3, 2, 2],
        barre: { fret: 2, fromString: 1, toString: 6 },
        fingers: [1, 3, 4, 2, 1, 1]
    },
    "Ab": {
        baseFret: 4,
        frets: [4, 6, 6, 5, 4, 4],
        barre: { fret: 4, fromString: 1, toString: 6 },
        fingers: [1, 3, 4, 2, 1, 1]
    },
    "G#": {
        baseFret: 4,
        frets: [4, 6, 6, 5, 4, 4],
        barre: { fret: 4, fromString: 1, toString: 6 },
        fingers: [1, 3, 4, 2, 1, 1]
    },
    "G#m": {
        baseFret: 4,
        frets: [4, 6, 6, 4, 4, 4],
        barre: { fret: 4, fromString: 1, toString: 6 },
        fingers: [1, 3, 4, 1, 1, 1]
    },
    "Abm": {
        baseFret: 4,
        frets: [4, 6, 6, 4, 4, 4],
        barre: { fret: 4, fromString: 1, toString: 6 },
        fingers: [1, 3, 4, 1, 1, 1]
    },
    "Bb": {
        baseFret: 1,
        frets: ["x", 1, 3, 3, 3, 1],
        barre: { fret: 1, fromString: 2, toString: 6 },
        fingers: [0, 1, 2, 3, 4, 1]
    },
    "Bbm": {
        baseFret: 1,
        frets: ["x", 1, 3, 3, 2, 1],
        barre: { fret: 1, fromString: 2, toString: 6 },
        fingers: [0, 1, 3, 4, 2, 1]
    },

    // Major 7th Chords
    "Cmaj7": {
        frets: ["x", 3, 2, 0, 0, 0],
        fingers: [0, 3, 2, 0, 0, 0]
    },
    "Dmaj7": {
        frets: ["x", "x", 0, 2, 2, 2],
        fingers: [0, 0, 0, 1, 1, 1]
    },
    "Emaj7": {
        frets: [0, 2, 1, 1, 0, 0],
        fingers: [0, 2, 1, 1, 0, 0]
    },
    "Gmaj7": {
        frets: [3, 2, 0, 0, 0, 2],
        fingers: [2, 1, 0, 0, 0, 3]
    },
    "Amaj7": {
        frets: ["x", 0, 2, 1, 2, 0],
        fingers: [0, 0, 2, 1, 3, 0]
    },
    "Bmaj7": {
        baseFret: 2,
        frets: ["x", 2, 4, 3, 4, 2],
        barre: { fret: 2, fromString: 2, toString: 6 },
        fingers: [0, 1, 3, 2, 4, 1]
    },

    // Suspended Chords (sus2, sus4)
    "Csus2": { frets: ["x", 3, 0, 0, 3, 3], fingers: [0, 2, 0, 0, 3, 4] },
    "Csus4": { frets: ["x", 3, 3, 0, 1, 1], fingers: [0, 3, 4, 0, 1, 1] },
    "Dsus2": { frets: ["x", "x", 0, 2, 3, 0], fingers: [0, 0, 0, 1, 3, 0] },
    "Dsus4": { frets: ["x", "x", 0, 2, 3, 3], fingers: [0, 0, 0, 1, 3, 4] },
    "D#sus2": { baseFret: 6, frets: ["x", 6, 8, 8, 6, 6], barre: { fret: 6, fromString: 2, toString: 6 }, fingers: [0, 1, 3, 4, 1, 1] },
    "Ebsus2": { baseFret: 6, frets: ["x", 6, 8, 8, 6, 6], barre: { fret: 6, fromString: 2, toString: 6 }, fingers: [0, 1, 3, 4, 1, 1] },
    "Esus2": { frets: [0, 2, 4, 4, 0, 0], fingers: [0, 1, 3, 4, 0, 0] },
    "Esus4": { frets: [0, 2, 2, 2, 0, 0], fingers: [0, 1, 2, 3, 0, 0] },
    "Fsus2": { baseFret: 1, frets: [1, 3, 3, 0, 1, 1], fingers: [1, 3, 4, 0, 1, 1] },
    "Fsus4": { baseFret: 1, frets: [1, 3, 3, 3, 1, 1], fingers: [1, 3, 4, 5, 1, 1] },
    "Gsus2": { frets: [3, 0, 0, 2, 3, 3], fingers: [2, 0, 0, 1, 3, 4] },
    "Gsus4": { frets: [3, 3, 0, 0, 3, 3], fingers: [2, 3, 0, 0, 4, 1] },
    "Asus2": { frets: ["x", 0, 2, 2, 0, 0], fingers: [0, 0, 2, 3, 0, 0] },
    "Asus4": { frets: ["x", 0, 2, 2, 3, 0], fingers: [0, 0, 1, 2, 4, 0] },
    "Bsus2": { baseFret: 2, frets: ["x", 2, 4, 4, 2, 2], barre: { fret: 2, fromString: 2, toString: 6 }, fingers: [0, 1, 3, 4, 1, 1] },
    "Bsus4": { baseFret: 2, frets: ["x", 2, 4, 4, 5, 2], barre: { fret: 2, fromString: 2, toString: 6 }, fingers: [0, 1, 2, 3, 4, 1] },

    // Added Tone Chords (add2, add9)
    "Cadd9": { frets: ["x", 3, 2, 0, 3, 3], fingers: [0, 2, 1, 0, 3, 4] },
    "Cadd2": { frets: ["x", 3, 2, 0, 3, 0], fingers: [0, 3, 2, 0, 4, 0] },
    "Dadd9": { frets: ["x", "x", 0, 2, 5, 2], fingers: [0, 0, 0, 1, 4, 2] },
    "Dadd2": { frets: ["x", "x", 0, 2, 3, 0], fingers: [0, 0, 0, 1, 3, 0] },
    "Eadd9": { frets: [0, 2, 4, 1, 0, 0], fingers: [0, 2, 4, 1, 0, 0] },
    "Gadd9": { frets: [3, 2, 0, 2, 0, 3], fingers: [2, 1, 0, 3, 0, 4] },
    "Aadd9": { frets: ["x", 0, 2, 4, 2, 0], fingers: [0, 0, 1, 4, 2, 0] },
    "Aadd2": { frets: ["x", 0, 2, 4, 2, 0], fingers: [0, 0, 1, 4, 2, 0] },
    
    // 9th and Major 9th Chords
    "Em9": { frets: [0, 2, 0, 0, 0, 2], fingers: [0, 2, 0, 0, 0, 3] },
    "Dmaj9": { frets: ["x", "x", 0, 2, 2, 0], fingers: [0, 0, 0, 1, 2, 0] },

    // Power Chords (5 chords)
    "C5": { baseFret: 3, frets: ["x", 3, 5, 5, "x", "x"], fingers: [0, 1, 3, 4, 0, 0] },
    "C#5": { baseFret: 4, frets: ["x", 4, 6, 6, "x", "x"], fingers: [0, 1, 3, 4, 0, 0] },
    "Db5": { baseFret: 4, frets: ["x", 4, 6, 6, "x", "x"], fingers: [0, 1, 3, 4, 0, 0] },
    "D5": { baseFret: 5, frets: ["x", 5, 7, 7, "x", "x"], fingers: [0, 1, 3, 4, 0, 0] },
    "D#5": { baseFret: 6, frets: ["x", 6, 8, 8, "x", "x"], fingers: [0, 1, 3, 4, 0, 0] },
    "Eb5": { baseFret: 6, frets: ["x", 6, 8, 8, "x", "x"], fingers: [0, 1, 3, 4, 0, 0] },
    "E5": { frets: [0, 2, 2, "x", "x", "x"], fingers: [0, 1, 3, 0, 0, 0] }, // Common E Power Chord
    "F5": { frets: [1, 3, 3, "x", "x", "x"], fingers: [1, 3, 4, 0, 0, 0] },
    "F#5": { baseFret: 2, frets: [2, 4, 4, "x", "x", "x"], fingers: [1, 3, 4, 0, 0, 0] },
    "Gb5": { baseFret: 2, frets: [2, 4, 4, "x", "x", "x"], fingers: [1, 3, 4, 0, 0, 0] },
    "G5": { baseFret: 3, frets: [3, 5, 5, "x", "x", "x"], fingers: [1, 3, 4, 0, 0, 0] },
    "G#5": { baseFret: 4, frets: [4, 6, 6, "x", "x", "x"], fingers: [1, 3, 4, 0, 0, 0] },
    "Ab5": { baseFret: 4, frets: [4, 6, 6, "x", "x", "x"], fingers: [1, 3, 4, 0, 0, 0] },
    "A5": { frets: ["x", 0, 2, 2, "x", "x"], fingers: [0, 0, 1, 2, 0, 0] },
    "A#5": { baseFret: 1, frets: ["x", 1, 3, 3, "x", "x"], fingers: [0, 1, 3, 4, 0, 0] },
    "Bb5": { baseFret: 1, frets: ["x", 1, 3, 3, "x", "x"], fingers: [0, 1, 3, 4, 0, 0] },
    "B5": { baseFret: 2, frets: ["x", 2, 4, 4, "x", "x"], fingers: [0, 1, 3, 4, 0, 0] }
};

window.GuitarChordDatabase = GuitarChordDatabase;
