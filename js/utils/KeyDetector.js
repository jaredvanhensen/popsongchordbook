// KeyDetector - Musical key detection from chord progression
class KeyDetector {
    constructor() {
        // Major scales (I, ii, iii, IV, V, vi, viio)
        this.majorScales = {
            'C': ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'],
            'G': ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim'],
            'D': ['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'C#dim'],
            'A': ['A', 'Bm', 'C#m', 'D', 'E', 'F#m', 'G#dim'],
            'E': ['E', 'F#m', 'G#m', 'A', 'B', 'C#m', 'D#dim'],
            'B': ['B', 'C#m', 'D#m', 'E', 'F#', 'G#m', 'A#dim'],
            'F#': ['F#', 'G#m', 'A#m', 'B', 'C#', 'D#m', 'E#dim'],
            'F': ['F', 'Gm', 'Am', 'Bb', 'C', 'Dm', 'Edim'],
            'Bb': ['Bb', 'Cm', 'Dm', 'Eb', 'F', 'Gm', 'Adim'],
            'Eb': ['Eb', 'Fm', 'Gm', 'Ab', 'Bb', 'Cm', 'Ddim'],
            'Ab': ['Ab', 'Bbm', 'Cm', 'Db', 'Eb', 'Fm', 'Gdim'],
            'Db': ['Db', 'Ebm', 'Fm', 'Gb', 'Ab', 'Bbm', 'Cdim']
        };

        // Minor scales (natural minor)
        this.minorScales = {
            'Am': ['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G'],
            'Em': ['Em', 'F#dim', 'G', 'Am', 'Bm', 'C', 'D'],
            'Bm': ['Bm', 'C#dim', 'D', 'Em', 'F#m', 'G', 'A'],
            'F#m': ['F#m', 'G#dim', 'A', 'Bm', 'C#m', 'D', 'E'],
            'C#m': ['C#m', 'D#dim', 'E', 'F#m', 'G#m', 'A', 'B'],
            'G#m': ['G#m', 'A#dim', 'B', 'C#m', 'D#m', 'E', 'F#'],
            'Dm': ['Dm', 'Edim', 'F', 'Gm', 'Am', 'Bb', 'C'],
            'Gm': ['Gm', 'Adim', 'Bb', 'Cm', 'Dm', 'Eb', 'F'],
            'Cm': ['Cm', 'Ddim', 'Eb', 'Fm', 'Gm', 'Ab', 'Bb'],
            'Fm': ['Fm', 'Gdim', 'Ab', 'Bbm', 'Cm', 'Db', 'Eb'],
            'Bbm': ['Bbm', 'Cdim', 'Db', 'Ebm', 'Fm', 'Gb', 'Ab'],
            'Ebm': ['Ebm', 'Fdim', 'Gb', 'Abm', 'Bbm', 'Cb', 'Db'],
            'Abm': ['Abm', 'Bbdim', 'Cb', 'Dbm', 'Ebm', 'Fb', 'Gb']
        };
    }

    detectKey(chordString) {
        if (!chordString || typeof chordString !== 'string') return null;

        // Extract chords from string (e.g., "C G Am F")
        // Remove text in parentheses like (3x) and split by whitespace/common separators
        // Also handle [ ] and other common chord sheet markers
        const chords = chordString
            .replace(/\([^)]*\)/g, ' ')
            .replace(/\[[^\]]*\]/g, ' ')
            .split(/[\s,|/-]+/)
            .filter(c => c && c.trim() !== '')
            .map(c => this.normalizeChord(c))
            .filter(c => this.isValidChord(c));

        if (chords.length === 0) return null;

        const scores = {};

        // Initialize scores
        [...Object.keys(this.majorScales), ...Object.keys(this.minorScales)].forEach(key => {
            scores[key] = 0;
        });

        // Score each key based on how many of the detected chords fit in its scale
        chords.forEach((chord, index) => {
            // First chord gets extra weight as it's often the tonic
            // Last chord also gets some extra weight (cadence)
            let weight = 1.0;
            if (index === 0) weight = 2.0;
            if (index === chords.length - 1) weight = 1.5;

            for (const [key, scale] of Object.entries(this.majorScales)) {
                if (scale.includes(chord)) {
                    scores[key] += weight;
                }
            }
            for (const [key, scale] of Object.entries(this.minorScales)) {
                if (scale.includes(chord)) {
                    scores[key] += weight;
                }
            }
        });

        // Find the key with the highest score
        let bestKey = null;
        let highestScore = -1;

        for (const [key, score] of Object.entries(scores)) {
            if (score > highestScore) {
                highestScore = score;
                bestKey = key;
            } else if (score === highestScore) {
                // In case of tie, prioritize the first chord if it's a key
                if (chords[0] === key) {
                    bestKey = key;
                }
            }
        }

        return highestScore > 0 ? bestKey : null;
    }

    isValidChord(chord) {
        // Very basic validation - should start with A-G
        return /^[A-G]/.test(chord);
    }

    normalizeChord(chord) {
        // Remove numbers and special suffixes that don't affect the basic scale position
        // e.g., Cmaj7 -> C, Dm7 -> Dm, Gsus4 -> G, Cadd9 -> C
        let normalized = chord
            .replace(/[0-9]/g, '')
            .replace(/sus[0-9]*/g, '')
            .replace(/add[0-9]*/g, '')
            .replace(/maj/g, '')
            .replace(/min/g, 'm')
            .replace(/dim[0-9]*/g, 'dim')
            .replace(/\+$/, '') // Remove augmented +
            .replace(/aug$/, '');

        // Standardize minor
        if (normalized.endsWith('m') || normalized.includes('min')) {
            const root = normalized.replace(/m|min/, '');
            normalized = root.charAt(0).toUpperCase() + root.slice(1) + 'm';
        } else if (!normalized.endsWith('dim')) {
            normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
        }

        return normalized;
    }

    detectFromSong(song) {
        // Combine chords from all sections
        const allChords = [
            song.verse || '',
            song.chorus || '',
            song.preChorus || '',
            song.bridge || ''
        ].join(' ');

        return this.detectKey(allChords);
    }
}

