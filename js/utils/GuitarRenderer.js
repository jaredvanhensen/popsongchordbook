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
     * Renders a chord diagram as string
     * @param {Object} chord Fingering data from database
     * @returns {string} SVG string
     */
    renderSVG(chord) {
        if (!chord) return '';

        const baseFret = chord.baseFret || 1;
        const frets = chord.frets; // [E, A, D, G, B, e]
        const fingers = chord.fingers || [];
        const barre = chord.barre;

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
                svg += `<circle cx="${x}" cy="${this.margin.top - 10}" r="4" fill="none" stroke="black" stroke-width="1" />`;
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

                    // Don't draw dot if it's covered by barre (unless it's a specific finger)
                    const isBarreString = barre && i >= (barre.fromString - 1) && i <= (barre.toString - 1) && f === barre.fret;

                    // Always draw anyway for clarity or if it's a different fret than barre
                    if (!isBarreString || (fingers[i] && fingers[i] !== 1)) {
                        svg += `<circle cx="${x}" cy="${y}" r="8" fill="#2d3748" />`;
                        if (fingers[i]) {
                            svg += `<text x="${x}" y="${y}" font-family="Arial" font-size="10" text-anchor="middle" alignment-baseline="middle" fill="white">${fingers[i]}</text>`;
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
