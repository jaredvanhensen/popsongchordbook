/**
 * GuitarRenderer - Utility for drawing guitar chord diagrams as SVGs.
 */
class GuitarRenderer {
    constructor() {
        this.width = 120;
        this.height = 150;
        this.margin = { top: 25, right: 10, bottom: 10, left: 25 };
        this.innerWidth = this.width - this.margin.left - this.margin.right;
        this.innerHeight = this.height - this.margin.top - this.margin.bottom;

        this.numStrings = 6;
        this.numFrets = 4; // Display 4 frets usually
        this.stringGap = this.innerWidth / (this.numStrings - 1);
        this.fretGap = this.innerHeight / this.numFrets;
    }

    /**
     * Determines if a string & fret combination is the root note of the chord.
     * @param {number} stringIndex 0..5 (0 = Low E, 5 = High E)
     * @param {number} fret Fret number (0 for open, 1.. for fretted)
     * @param {string|number} root Root note name (e.g. 'C', 'G#') or pitch class (0..11)
     * @returns {boolean}
     */
    isRootNote(stringIndex, fret, root) {
        if (root === undefined || root === null || root === '') return false;
        const stringOpenPitches = [4, 9, 2, 7, 11, 4]; // E, A, D, G, B, e (semitones from C=0)
        const notePitches = {
            'C': 0, 'B#': 0,
            'C#': 1, 'DB': 1, 'Db': 1,
            'D': 2,
            'D#': 3, 'EB': 3, 'Eb': 3,
            'E': 4, 'FB': 4, 'Fb': 4,
            'F': 5, 'E#': 5,
            'F#': 6, 'GB': 6, 'Gb': 6,
            'G': 7,
            'G#': 8, 'AB': 8, 'Ab': 8,
            'A': 9,
            'A#': 10, 'BB': 10, 'Bb': 10,
            'B': 11, 'CB': 11, 'Cb': 11
        };

        let targetPitch = null;
        if (typeof root === 'number') {
            targetPitch = (root % 12 + 12) % 12;
        } else if (typeof root === 'string') {
            const match = root.trim().match(/^([A-Ga-g][#b]?)/);
            if (match) {
                const cleanRoot = match[1].charAt(0).toUpperCase() + match[1].slice(1);
                if (cleanRoot in notePitches) {
                    targetPitch = notePitches[cleanRoot];
                }
            }
        }

        if (targetPitch === null) return false;
        const notePitch = (stringOpenPitches[stringIndex] + fret) % 12;
        return notePitch === targetPitch;
    }

    /**
     * Renders a chord diagram as string
     * @param {Object} chord Fingering data from database
     * @param {Object|string} options Optional settings or chord name (e.g. { chordName: 'C', highlightRoot: true })
     * @returns {string} SVG string
     */
    renderSVG(chord, options = {}) {
        if (!chord) return '';

        const baseFret = chord.baseFret || 1;
        const frets = chord.frets; // [E, A, D, G, B, e]
        const fingers = chord.fingers || [];
        const barre = chord.barre;

        const optObj = (typeof options === 'string') ? { chordName: options } : (options || {});
        const root = optObj.rootNote || optObj.chordName || chord.rootNote || chord.chordName || chord.name || null;
        const highlightRoot = (optObj.highlightRoot !== false) && (root != null);

        let svg = `<svg width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}" xmlns="http://www.w3.org/2000/svg">`;

        // Background
        svg += `<rect width="${this.width}" height="${this.height}" fill="white" />`;

        // Fret Number (for bar chords)
        if (baseFret > 1) {
            svg += `<text x="${this.margin.left - 5}" y="${this.margin.top + this.fretGap / 2}" font-family="Arial" font-size="12" text-anchor="end" alignment-baseline="middle" fill="#333" font-weight="bold">${baseFret}</text>`;
        }

        // Nut (if baseFret is 1)
        if (baseFret === 1) {
            svg += `<line x1="${this.margin.left}" y1="${this.margin.top}" x2="${this.margin.left + this.innerWidth}" y2="${this.margin.top}" stroke="black" stroke-width="4" />`;
        } else {
            svg += `<line x1="${this.margin.left}" y1="${this.margin.top}" x2="${this.margin.left + this.innerWidth}" y2="${this.margin.top}" stroke="#ccc" stroke-width="2" />`;
        }

        // Frets
        for (let i = 1; i <= this.numFrets; i++) {
            const y = this.margin.top + (i * this.fretGap);
            svg += `<line x1="${this.margin.left}" y1="${y}" x2="${this.margin.left + this.innerWidth}" y2="${y}" stroke="black" stroke-width="1" />`;
        }

        // Strings
        for (let i = 0; i < this.numStrings; i++) {
            const x = this.margin.left + (i * this.stringGap);
            svg += `<line x1="${x}" y1="${this.margin.top}" x2="${x}" y2="${this.margin.top + this.innerHeight}" stroke="black" stroke-width="1" />`;
        }

        // Muted/Open strings indicators
        frets.forEach((f, i) => {
            const x = this.margin.left + (i * this.stringGap);
            if (f === 'x') {
                svg += `<text x="${x}" y="${this.margin.top - 8}" font-family="Arial" font-size="12" text-anchor="middle" fill="red">×</text>`;
            } else if (f === 0) {
                const isRoot = highlightRoot && this.isRootNote(i, 0, root);
                if (isRoot) {
                    // Highlight open root note with red filled circle
                    svg += `<circle cx="${x}" cy="${this.margin.top - 10}" r="4.5" fill="#ef4444" stroke="#b91c1c" stroke-width="1.5" />`;
                } else {
                    svg += `<circle cx="${x}" cy="${this.margin.top - 10}" r="4" fill="none" stroke="black" stroke-width="1" />`;
                }
            }
        });

        // Barre
        if (barre) {
            const fretIdx = barre.fret - baseFret;
            if (fretIdx >= 0 && fretIdx < this.numFrets) {
                const y = this.margin.top + (fretIdx * this.fretGap) + (this.fretGap / 2);
                const xStart = this.margin.left + ((barre.fromString - 1) * this.stringGap);
                const xEnd = this.margin.left + ((barre.toString - 1) * this.stringGap);

                svg += `<rect x="${xStart - 6}" y="${y - 6}" width="${xEnd - xStart + 12}" height="12" rx="6" fill="#4a5568" />`;
            }
        }

        // Fingers (dots)
        frets.forEach((f, i) => {
            if (typeof f === 'number' && f > 0) {
                const fretIdx = f - baseFret;
                if (fretIdx >= 0 && fretIdx < this.numFrets) {
                    const x = this.margin.left + (i * this.stringGap);
                    const y = this.margin.top + (fretIdx * this.fretGap) + (this.fretGap / 2);

                    // Don't draw dot if it's covered by barre (unless it's a specific finger or root note)
                    const isBarreString = barre && i >= (barre.fromString - 1) && i <= (barre.toString - 1) && f === barre.fret;
                    const isRoot = highlightRoot && this.isRootNote(i, f, root);

                    // Always draw dot if it has a finger number, is a root note, or is not covered by barre
                    if (!isBarreString || (fingers[i] && fingers[i] !== 1) || isRoot) {
                        const dotFill = isRoot ? '#ef4444' : '#2d3748';
                        const dotStroke = isRoot ? '#b91c1c' : 'none';
                        const dotStrokeWidth = isRoot ? '1.5' : '0';

                        svg += `<circle cx="${x}" cy="${y}" r="8" fill="${dotFill}" stroke="${dotStroke}" stroke-width="${dotStrokeWidth}" />`;
                        if (fingers[i]) {
                            svg += `<text x="${x}" y="${y}" font-family="Arial" font-size="10" text-anchor="middle" alignment-baseline="middle" fill="white" font-weight="${isRoot ? 'bold' : 'normal'}">${fingers[i]}</text>`;
                        } else if (isRoot && isBarreString) {
                            svg += `<text x="${x}" y="${y}" font-family="Arial" font-size="9" text-anchor="middle" alignment-baseline="middle" fill="white" font-weight="bold">1</text>`;
                        }
                    }
                }
            }
        });

        svg += `</svg>`;
        return svg;
    }
}

window.GuitarRenderer = GuitarRenderer;

