/**
 * GuitarChordOverlay - Modal for displaying guitar chord diagrams.
 * Heavily based on PianoChordOverlay structure.
 */
class GuitarChordOverlay {
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
        this.deduplicate = false;

        // Try to load saved preferences
        if (typeof localStorage !== 'undefined') {
            const savedDeduplicate = localStorage.getItem('piano_chord_deduplicate');
            if (savedDeduplicate !== null) this.deduplicate = savedDeduplicate === 'true';
        }

        // Initialize Renderer and Database
        this.renderer = new GuitarRenderer();
        this.database = window.GuitarChordDatabase || {};

        this.createOverlay();
        this.setupEventListeners();
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'guitarChordOverlay';
        this.overlay.className = 'piano-chord-overlay hidden'; // Reuse piano styles for modal structure

        this.overlay.innerHTML = `
            <div class="piano-chord-modal">
                <div class="piano-chord-header guitar-header">
                    <div class="header-row-top">
                        <h3 id="guitarChordTitle">Guitar Chords</h3>
                        <button class="piano-chord-close" id="guitarChordClose">&times;</button>
                    </div>
                    <div class="header-row-bottom">
                        <button id="guitarBlockPrev" class="piano-nav-btn" title="Previous Block">‹</button>
                        
                        <div class="sound-selector-wrapper">
                            <button id="guitarModeBtn" class="piano-toggle-btn active" style="pointer-events: none;">
                                <span class="toggle-icon">🎸</span>
                                <span class="toggle-label">Guitar Mode</span>
                            </button>
                        </div>

                        <div class="sound-selector-wrapper">
                            <button id="guitarDeduplicateToggle" class="piano-toggle-btn ${this.deduplicate ? 'active' : ''}" title="Toggle Unique vs Chronological Chords">
                                <span class="toggle-icon">🗂️</span>
                                <span class="toggle-label">${this.deduplicate ? 'Unique' : 'All'}</span>
                            </button>
                        </div>

                        <button id="guitarBlockNext" class="piano-nav-btn" title="Next Block">›</button>
                    </div>
                </div>
                <div class="piano-chord-body">
                    <div class="piano-chord-list" id="guitarChordList">
                        <!-- Guitar diagrams will be inserted here -->
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);
    }

    setupEventListeners() {
        const closeBtn = this.overlay.querySelector('#guitarChordClose');
        closeBtn.addEventListener('click', () => this.hide());

        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.hide();
        });

        const prevBtn = this.overlay.querySelector('#guitarBlockPrev');
        const nextBtn = this.overlay.querySelector('#guitarBlockNext');

        if (prevBtn) prevBtn.addEventListener('click', () => this.navigateBlock(-1));
        if (nextBtn) nextBtn.addEventListener('click', () => this.navigateBlock(1));

        // Deduplicate Toggle
        const deduplicateToggle = this.overlay.querySelector('#guitarDeduplicateToggle');
        if (deduplicateToggle) {
            deduplicateToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deduplicate = !this.deduplicate;

                // Update UI
                deduplicateToggle.classList.toggle('active', this.deduplicate);
                const label = deduplicateToggle.querySelector('.toggle-label');
                if (label) label.textContent = this.deduplicate ? 'Unique' : 'All';

                // Save preference
                localStorage.setItem('piano_chord_deduplicate', this.deduplicate);

                // Re-render
                if (this.isVisible && this.lastChordText) {
                    this.refreshChordList();
                }
            });
        }
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
        const title = this.overlay.querySelector('#guitarChordTitle');
        title.textContent = `Guitar Chords - ${this.sectionName}`;

        // Update Nav
        const prevBtn = this.overlay.querySelector('#guitarBlockPrev');
        const nextBtn = this.overlay.querySelector('#guitarBlockNext');
        if (prevBtn) prevBtn.style.visibility = this.currentBlockIndex > 0 ? 'visible' : 'hidden';
        if (nextBtn) nextBtn.style.visibility = this.currentBlockIndex < this.allBlocks.length - 1 ? 'visible' : 'hidden';

        this.refreshChordList();
    }

    refreshChordList() {
        const list = this.overlay.querySelector('#guitarChordList');
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
        const pattern = /(?:^|[\s,|(\[𝄀𝄁𝄆𝄇𝄈])([A-Ga-g][#b]?(?:m|min|maj|dim|aug|sus|add)?[0-9]?(?:sus[24]?|add[29]|maj[79]?|min[79]?|dim[79]?|aug)?[0-9]?(?:\/[A-Ga-g][#b]?)?)(?=[\s,|)\]:𝄀𝄁𝄆𝄇𝄈]|$)/g;
        const matches = [...text.matchAll(pattern)];
        const chords = [];
        const seen = new Set();

        for (const match of matches) {
            const raw = match[1].trim();

            if (this.deduplicate) {
                const simple = this.simplifyChord(raw);
                if (!seen.has(simple)) {
                    seen.add(simple);
                    chords.push(raw);
                }
            } else {
                chords.push(raw);
            }
        }
        return chords;
    }

    simplifyChord(chordName) {
        // Strip 2/3 at end of each part but ONLY if it's not a sus or add chord (e.g., D2 -> D, but Dsus2 stays Dsus2)
        return chordName.split('/').map(part => {
            const lowPart = part.toLowerCase();
            if (lowPart.includes('sus') || lowPart.includes('add')) return part;
            return part.replace(/([23])$/, '');
        }).join('/');
    }

    createChordCard(chordName) {
        const simpleName = this.simplifyChord(chordName);
        
        // Alias '4' to 'sus4' if not found explicitly
        let alternateName = null;
        if (simpleName.endsWith('4')) {
            alternateName = simpleName.replace(/4$/, 'sus4');
        }

        // Try exact match, then simplified, then alias (4->sus4), then just the root part
        const fingering = this.database[chordName] || 
                         this.database[simpleName] || 
                         (alternateName ? this.database[alternateName] : null) ||
                         this.database[simpleName.split('/')[0]];

        const card = document.createElement('div');
        card.className = 'piano-chord-card guitar-card'; // Reuse piano card styles with modifier
        card.style.cursor = 'pointer';

        card.onclick = (e) => {
            e.stopPropagation();
            if (this.audioPlayer && this.chordParser) {
                this.audioPlayer.initialize().then(() => {
                    // Switch to guitar sound profile
                    this.audioPlayer.setSound('guitar-strum');

                    // Parse based on actual guitar fingerings for a realistic strum
                    // Try to parse full name if possible, ChordParser will handle lookup
                    const chord = this.chordParser.parseGuitarChord(chordName, this.database);
                    if (chord && chord.notes) {
                        this.audioPlayer.playChord(chord.notes, 3.0, 0.4, 0.035, true);
                    }
                });
            }
        };

        const header = document.createElement('div');
        header.className = 'chord-card-header';
        header.innerHTML = `
            <span class="chord-name">${simpleName}</span>
        `;

        const diagramContainer = document.createElement('div');
        diagramContainer.className = 'guitar-diagram-container';

        if (fingering) {
            diagramContainer.innerHTML = this.renderer.renderSVG(fingering);
        } else {
            diagramContainer.innerHTML = `<div class="missing-fingering">No diagram for ${simpleName}</div>`;
        }

        card.appendChild(header);
        card.appendChild(diagramContainer);
        return card;
    }
}

window.GuitarChordOverlay = GuitarChordOverlay;
