/**
 * UkuleleChordOverlay - Modal for displaying ukulele chord diagrams.
 * Modified from GuitarChordOverlay.
 */
class UkuleleChordOverlay {
    constructor(audioPlayer = null, chordParser = null) {
        this.audioPlayer = audioPlayer;
        this.chordParser = chordParser;
        this.overlay = null;
        this.isVisible = false;
        this.currentChords = [];
        this.sectionName = '';
        this.lastChordText = '';
        this.allBlocks = [];
        this.currentBlockIndex = 0;
        this.deduplicate = true; // Use unique chords by default for ukulele simplicity

        // Initialize Renderer and Database
        this.renderer = new UkuleleRenderer();
        this.database = window.UkuleleChordDatabase || {};

        this.createOverlay();
        this.setupEventListeners();
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'ukuleleChordOverlay';
        this.overlay.className = 'piano-chord-overlay hidden';

        this.overlay.innerHTML = `
            <div class="piano-chord-modal">
                <div class="piano-chord-header ukulele-header">
                    <div class="header-row-top">
                        <h3 id="ukuleleChordTitle">Ukulele Chords</h3>
                        <button class="piano-chord-close" id="ukuleleChordClose">&times;</button>
                    </div>
                    <div class="header-row-bottom">
                        <button id="ukuleleBlockPrev" class="piano-nav-btn" title="Previous Block">‹</button>
                        
                        <div class="sound-selector-wrapper">
                            <button id="ukuleleModeBtn" class="piano-toggle-btn active" style="pointer-events: none;">
                                <span class="toggle-icon">
                                    <svg viewBox="0 0 100 100" width="32" height="32" style="vertical-align: middle;">
                                        <g transform="rotate(-35 50 50)">
                                            <rect x="45" y="5" width="10" height="42" rx="2" fill="#8d6e63" stroke="#5d4037" stroke-width="2"/>
                                            <path d="M50,42 c-15,0 -25,12 -25,28 c0,22 12,32 25,32 s25,-10 25,-32 c0,-16 -10,-28 -25,-28" fill="#c08e51" stroke="#5d4037" stroke-width="3"/>
                                            <circle cx="50" cy="65" r="9" fill="#3e2723"/>
                                            <rect x="40" y="85" width="20" height="6" rx="1.5" fill="#3e2723"/>
                                        </g>
                                    </svg>
                                </span>
                                <span class="toggle-label">Ukulele Mode</span>
                            </button>
                        </div>

                        <button id="ukuleleBlockNext" class="piano-nav-btn" title="Next Block">›</button>
                    </div>
                </div>
                <div class="piano-chord-body">
                    <div class="piano-chord-list" id="ukuleleChordList">
                        <!-- Ukulele diagrams will be inserted here -->
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);
    }

    setupEventListeners() {
        const closeBtn = this.overlay.querySelector('#ukuleleChordClose');
        closeBtn.addEventListener('click', () => this.hide());

        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.hide();
        });

        const prevBtn = this.overlay.querySelector('#ukuleleBlockPrev');
        const nextBtn = this.overlay.querySelector('#ukuleleBlockNext');

        if (prevBtn) prevBtn.addEventListener('click', () => this.navigateBlock(-1));
        if (nextBtn) nextBtn.addEventListener('click', () => this.navigateBlock(1));
    }

    show(blocks, startIndex = 0) {
        this.allBlocks = blocks || [];
        this.currentBlockIndex = Math.max(0, Math.min(startIndex, this.allBlocks.length - 1));

        this.refreshSection();
        this.overlay.classList.remove('hidden');
        this.isVisible = true;
        document.body.style.overflow = 'hidden';
    }

    hide() {
        this.overlay.classList.add('hidden');
        this.isVisible = false;
        document.body.style.overflow = '';
    }

    navigateBlock(delta) {
        const newIndex = this.currentBlockIndex + delta;
        if (newIndex >= 0 && newIndex < this.allBlocks.length) {
            this.currentBlockIndex = newIndex;
            this.refreshSection();
        }
    }

    refreshSection() {
        const currentBlock = this.allBlocks[this.currentBlockIndex];
        if (!currentBlock) return;

        this.sectionName = currentBlock.name;
        this.lastChordText = currentBlock.text;

        // Update Title
        const title = this.overlay.querySelector('#ukuleleChordTitle');
        title.textContent = `Ukulele Chords - ${this.sectionName}`;

        // Update Nav
        const prevBtn = this.overlay.querySelector('#ukuleleBlockPrev');
        const nextBtn = this.overlay.querySelector('#ukuleleBlockNext');
        if (prevBtn) prevBtn.style.visibility = this.currentBlockIndex > 0 ? 'visible' : 'hidden';
        if (nextBtn) nextBtn.style.visibility = this.currentBlockIndex < this.allBlocks.length - 1 ? 'visible' : 'hidden';

        this.refreshChordList();
    }

    refreshChordList() {
        const list = this.overlay.querySelector('#ukuleleChordList');
        list.innerHTML = '';

        const rawChords = this.extractChordsFromText(this.lastChordText);

        if (rawChords.length === 0) {
            list.innerHTML = '<div class="no-chords-message">No chords found in this section.</div>';
            return;
        }

        rawChords.forEach(chordName => {
            const card = this.createChordCard(chordName);
            if (card) list.appendChild(card);
        });
    }

    extractChordsFromText(text) {
        if (!text) return [];
        const pattern = /(?:^|[\s,|(\[])([A-Ga-g][#b]?(?:m|min|maj|dim|aug|sus|add)?[0-9]?(?:sus[24]?|add[29]|maj[79]?|min[79]?|dim[79]?|aug)?[0-9]?(?:\/[A-Ga-g][#b]?)?)(?=[\s,|)\]:]|$)/g;
        const matches = [...text.matchAll(pattern)];
        const chords = [];
        const seen = new Set();

        for (const match of matches) {
            const raw = match[1].trim();
            const simple = this.simplifyChord(raw);

            if (!seen.has(simple)) {
                seen.add(simple);
                chords.push(raw);
            }
        }
        return chords;
    }

    simplifyChord(chordName) {
        // Strip 2, 3 AND 7 digits but maintain slash
        return chordName.split('/').map(part => part.replace(/[237]/g, '')).join('/');
    }

    createChordCard(chordName) {
        const simpleName = this.simplifyChord(chordName);
        // Try exact match, then simplified, then just the root part
        const chordInfo = this.database[chordName] || this.database[simpleName] || this.database[simpleName.split('/')[0]];
        if (!chordInfo) return null;

        const card = document.createElement('div');
        card.className = 'piano-chord-card ukulele-card';
        card.style.cursor = 'pointer';

        card.onclick = (e) => {
            e.stopPropagation();
            if (this.audioPlayer && this.chordParser) {
                this.audioPlayer.initialize().then(() => {
                    // Switch to ukulele sound profile
                    this.audioPlayer.setSound('ukulele');

                    // Parse based on actual fingerings for accurate voicing
                    // Use original name, ChordParser handles lookup
                    const chord = this.chordParser.parseUkuleleChord(chordName, this.database);
                    if (chord && chord.notes) {
                        this.audioPlayer.playChord(chord.notes, 2.5, 0.4, 0.03, true);
                    }
                });
            }
        };

        card.innerHTML = `
            <div class="chord-card-title">${simpleName}</div>
            <div class="chord-svg-container">
                ${this.renderer.renderSVG(chordInfo)}
            </div>
            <button class="sound-preview-btn" title="Play Chord">🔊</button>
        `;

        return card;
    }
}
