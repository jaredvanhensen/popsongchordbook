class ChordFinderModal {
    constructor(onAddChord) {
        this.onAddChord = onAddChord;
        this.overlay = null;
        this.isVisible = false;

        this.createOverlay();
        this.setupEventListeners();
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'chordFinderModal';
        this.overlay.className = 'chord-finder-overlay hidden';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex; justify-content: center; align-items: center;
            z-index: 10010; /* Above editor */
            backdrop-filter: blur(2px);
        `;

        this.overlay.innerHTML = `
            <div class="chord-finder-content" style="
                background: white;
                padding: 25px;
                border-radius: 16px;
                width: 90%;
                max-width: 400px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                position: relative;
                animation: slideUp 0.3s ease;
            ">
                <button id="chordFinderClose" style="
                    position: absolute; top: 15px; right: 15px;
                    background: none; border: none; font-size: 24px; cursor: pointer; color: #666;
                ">&times;</button>
                
                <h3 style="margin-top:0; margin-bottom:20px; font-size:1.5rem; color:#2d3748;">Find Chord</h3>
                
                <p style="margin-bottom:15px; color:#666; font-size:0.95rem;">
                    Enter notes separated by spaces (e.g. <b>C E G</b> or <b>C E G B</b>).
                </p>

                <div style="display:flex; gap:10px; margin-bottom: 20px;">
                    <input type="text" id="finderModalInput" placeholder="e.g. C E G B" style="
                        flex:1; padding:12px; border:1px solid #e2e8f0; border-radius:8px;
                        font-family:monospace; font-size:1.1em; outline:none;
                    ">
                </div>

                <div id="finderResultSection" class="hidden" style="
                    background: #f7fafc; padding: 15px; border-radius: 8px;
                    margin-bottom: 20px; text-align: center; border: 1px solid #edf2f7;
                ">
                    <div style="font-size:0.9rem; color:#718096; margin-bottom:5px;">Identified Chord</div>
                    <div id="finderModalResultName" style="font-size:1.8rem; font-weight:800; color:#667eea; margin-bottom:10px;"></div>
                    <div style="display:flex; gap:10px; justify-content:center;">
                        <button id="finderPlayBtn" class="btn-secondary" style="font-size:0.9rem; padding: 5px 15px;">Play</button>
                        <button id="finderAddBtn" class="btn-primary" style="font-size:0.9rem; padding: 5px 20px;">Add to Editor</button>
                    </div>
                </div>

                <button id="finderIdentifyBtn" class="btn-primary" style="width:100%; padding:12px; font-size:1.1rem; justify-content: center;">Identify Chord</button>
            </div>
        `;

        document.body.appendChild(this.overlay);
    }

    setupEventListeners() {
        const closeBtn = this.overlay.querySelector('#chordFinderClose');
        const identifyBtn = this.overlay.querySelector('#finderIdentifyBtn');
        const input = this.overlay.querySelector('#finderModalInput');
        const resultSection = this.overlay.querySelector('#finderResultSection');
        const resultName = this.overlay.querySelector('#finderModalResultName');
        const playBtn = this.overlay.querySelector('#finderPlayBtn');
        const addBtn = this.overlay.querySelector('#finderAddBtn');

        const close = () => {
            this.overlay.classList.add('hidden');
            this.isVisible = false;
        };

        closeBtn.addEventListener('click', close);
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) close();
        });

        const performIdentification = () => {
            const val = input.value;
            const chord = this.identifyChord(val);

            if (chord) {
                resultName.textContent = chord;
                resultSection.classList.remove('hidden');
                identifyBtn.style.display = 'none'; // Hide big button to show result
            } else {
                resultName.textContent = "?";
                resultSection.classList.remove('hidden');
                identifyBtn.style.display = 'none';
            }
        };

        identifyBtn.addEventListener('click', performIdentification);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') performIdentification();
            if (resultSection.classList.contains('hidden') === false) {
                // Reset if typing again
                resultSection.classList.add('hidden');
                identifyBtn.style.display = 'flex';
            }
        });

        addBtn.addEventListener('click', () => {
            const chord = resultName.textContent;
            if (chord && chord !== "?") {
                if (this.onAddChord) this.onAddChord(chord);
                close();
            }
        });

        playBtn.addEventListener('click', () => {
            // We need access to play logic. We can emit event or just rely on Add.
            // But user wants to hear it. 
            // We can pass a playCallback or expose the note logic.
            // Simplest: The onAddChord callback adds it. 
            // To play without adding: We need the AudioPlayer. 
            // I'll accept an audioPlayer in constructor.
        });
    }

    show() {
        this.overlay.classList.remove('hidden');
        this.isVisible = true;
        const input = this.overlay.querySelector('#finderModalInput');
        input.value = '';
        this.overlay.querySelector('#finderResultSection').classList.add('hidden');
        this.overlay.querySelector('#finderIdentifyBtn').style.display = 'flex';
        setTimeout(() => input.focus(), 100);
    }

    identifyChord(inputString) {
        if (!inputString || !inputString.trim()) return null;

        const tokens = inputString.trim().split(/[\s,]+/);
        if (tokens.length < 3) return null;

        const noteToSemitone = {
            'C': 0, 'C#': 1, 'Db': 1,
            'D': 2, 'D#': 3, 'Eb': 3,
            'E': 4, 'Fb': 4,
            'F': 5, 'F#': 6, 'Gb': 6,
            'G': 7, 'G#': 8, 'Ab': 8,
            'A': 9, 'A#': 10, 'Bb': 10,
            'B': 11, 'Cb': 11
        };

        const semitoneToNote = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

        const noteMatch = (t) => {
            const m = t.match(/^([A-G])([#b]?)/i);
            return m ? (m[1].toUpperCase() + (m[2] || '')) : null;
        };

        const bassToken = tokens[0].toUpperCase();
        const bassNote = noteMatch(bassToken);
        if (!bassNote) return null;
        const bassSemi = noteToSemitone[bassNote];

        const uniqueSemitones = new Set();
        for (const token of tokens) {
            const n = noteMatch(token);
            if (n && noteToSemitone[n] !== undefined) {
                uniqueSemitones.add(noteToSemitone[n]);
            }
        }

        if (uniqueSemitones.size < 3) return null;

        // Pattern Intervals (semitones from ROOT)
        const patterns = {
            '': [0, 4, 7],      // Major
            'm': [0, 3, 7],     // Minor
            'dim': [0, 3, 6],   // Diminished
            'aug': [0, 4, 8],   // Augmented
            'sus4': [0, 5, 7],
            'sus2': [0, 2, 7],
            '7': [0, 4, 7, 10],     // Dominant 7
            'maj7': [0, 4, 7, 11],  // Maj 7
            'm7': [0, 3, 7, 10],    // min 7
            'm7b5': [0, 3, 6, 10],  // Half dim
            'dim7': [0, 3, 6, 9],   // Full dim
            '6': [0, 4, 7, 9],      // Major 6
            'm6': [0, 3, 7, 9],     // Minor 6
            'add9': [0, 2, 4, 7],   // Add 9 (Root, 2, 3, 5) Note: 2 is same class as 9. 0,4,7,2 -> 0,2,4,7 sorted order if base is 0. 
            // Actually interval sets should be sorted relative to root? No, set has no order.
            // But (root+interval)%12 must exist.
        };

        for (const root of uniqueSemitones) { // Try each note as root
            for (const [suffix, intervals] of Object.entries(patterns)) {
                const allPresent = intervals.every(interval => {
                    const step = (root + interval) % 12;
                    return uniqueSemitones.has(step);
                });

                if (allPresent && intervals.length === uniqueSemitones.size) {
                    const rootName = semitoneToNote[root];
                    let result = rootName + suffix;
                    if (root !== bassSemi) {
                        const bassName = semitoneToNote[bassSemi];
                        result += '/' + bassName;
                    }
                    return result;
                }
            }
        }
        return null;
    }
}
