// SongDetailModal - Modal voor song details weergave
class SongDetailModal {
    constructor(songManager, onNavigate, onUpdate = null, chordModal = null, onToggleFavorite = null, onPlayYouTube = null, keyDetector = null, onAddToSetlist = null, onTogglePractice = null, isPracticeChecker = null, onPracticeRandomNext = null, onPracticeRandomPrev = null) {
        this.songManager = songManager;
        this.onNavigate = onNavigate;
        this.onUpdate = onUpdate;
        this.chordModal = chordModal;
        this.onToggleFavorite = onToggleFavorite;
        this.onPlayYouTube = onPlayYouTube;
        this.keyDetector = keyDetector;
        this.onAddToSetlist = onAddToSetlist;
        this.onTogglePractice = onTogglePractice;
        this.isPracticeChecker = isPracticeChecker;
        this.onPracticeRandomNext = onPracticeRandomNext;
        this.onPracticeRandomPrev = onPracticeRandomPrev;
        this.firebaseManager = songManager.firebaseManager;
        this.currentSongId = null;
        this.allSongs = [];
        this.modal = document.getElementById('songDetailModal');
        this.closeBtn = document.getElementById('songDetailModalCloseTop');
        this.deleteBtn = document.getElementById('menuDeleteSong');
        this.prevBtn = document.getElementById('songDetailPrev');
        this.nextBtn = document.getElementById('songDetailNext');
        this.saveBtn = document.getElementById('songDetailSaveBtn');
        this.artistElement = document.getElementById('songDetailArtist');
        this.titleElement = document.getElementById('songDetailTitle');
        this.favoriteBtn = document.getElementById('songDetailFavoriteBtn');
        this.chordSearchBtn = document.getElementById('menuSearchGoogle');
        this.practiceBtn = document.getElementById('songDetailPracticeBtn');
        this.keyDisplay = document.getElementById('songDetailKeyDisplay');
        this.bpmDisplay = document.getElementById('songDetailBpmDisplay');
        this.youtubeBtn = document.getElementById('songDetailYouTubeBtn');
        this.youtubePlayBtn = document.getElementById('songDetailYouTubePlayBtn');
        this.externalUrlBtn = document.getElementById('songDetailExternalUrlBtn');
        this.addToSetlistBtn = document.getElementById('menuAddToSetlist');
        this.publishSongBtn = document.getElementById('menuPublishSong');
        this.statusIcon = document.getElementById('songDetailStatusIcon');

        this.hamburgerBtn = document.getElementById('songDetailHamburgerBtn');
        this.hamburgerMenu = document.getElementById('songDetailHamburgerMenu');
        this.instrumentHeaderBtn = document.getElementById('songDetailInstrumentHeaderBtn');
        this.transposeUpBtn = document.getElementById('songDetailTransposeUp');
        this.transposeDownBtn = document.getElementById('songDetailTransposeDown');
        this.transposeBtn = document.getElementById('songDetailTransposeBtn');
        this.transposeMenu = document.getElementById('transposeMenu');
        this.transposeResetBtn = document.getElementById('songDetailTransposeReset');
        this.youtubeUrlModal = document.getElementById('youtubeUrlModal');
        this.youtubeUrlInput = document.getElementById('youtubeUrlInput');
        this.externalUrlInput = document.getElementById('externalUrlInput');
        this.youtubeUrlSaveBtn = document.getElementById('youtubeUrlSaveBtn');
        this.youtubeUrlCancelBtn = document.getElementById('youtubeUrlCancelBtn');
        this.youtubeUrlModalClose = document.getElementById('youtubeUrlModalClose');
        this.patchDetailsInput = document.getElementById('patchDetailsInput');
        this.practiceCountInput = document.getElementById('practiceCountInput');
        this.lyricOffsetInput = document.getElementById('lyricOffsetInput');
        this.performAbilityStars = document.getElementById('performAbilityStars');
        this.abilityStars = this.performAbilityStars ? this.performAbilityStars.querySelectorAll('.ability-star') : [];
        this.chordJsonInput = document.getElementById('chordJsonInput');
        this.chordJsonStatus = document.getElementById('chordJsonStatus');
        this.clearChordDataBtn = document.getElementById('clearChordDataBtn');
        this.lyricsBtn = document.getElementById('songDetailLyricsBtn');
        this.scrollingChordsBtn = document.getElementById('songDetailScrollingChordsBtn');
        this.songMapBtn = document.getElementById('songDetailSongMapBtn');
        this.chordTrainerBtn = document.getElementById('songDetailChordTrainerBtn');
        this.notesInput = document.getElementById('songDetailNotesInput');
        this.practiceCountDisplay = document.getElementById('songDetailPracticeCount');
        this.practiceIncrementBtn = document.getElementById('songDetailPracticeIncrementBtn');
        this.practiceControlsContainer = document.querySelector('.song-detail-practice-controls');
        this.lyricsOverlay = document.getElementById('lyricsTickerOverlay');
        this.lyricsText = document.getElementById('lyricsTickerText');
        this.closeLyricsBtn = document.getElementById('closeLyricsTicker');
        this.fullLyricsInput = document.getElementById('fullLyricsInput');
        this.lyricsEditModal = document.getElementById('lyricsEditModal');
        this.openLyricsModalBtn = document.getElementById('openLyricsModalBtn');
        this.lyricsEditModalClose = document.getElementById('lyricsEditModalClose');
        this.lyricsEditDoneBtn = document.getElementById('lyricsEditDoneBtn');
        this.lyricsStatusText = document.getElementById('lyricsStatusText');
        this.speedUpBtn = document.getElementById('lyricsSpeedUp');
        this.speedDownBtn = document.getElementById('lyricsSpeedDown');
        this.lyricsSpeedFactor = 1.0;
        this.isLyricsPaused = false;
        this.scrollAnimationId = null;
        this.scrollListenersAdded = false;
        this.chordDataToRemove = false;
        this.capoValue = 0; // Display-only capo (0-6)

        // Confirmation Modal
        this.confirmationModal = document.getElementById('confirmationModal');
        this.confirmSaveBtn = document.getElementById('confirmSaveBtn');
        this.confirmDontSaveBtn = document.getElementById('confirmDontSaveBtn');

        // Timeline Modal
        this.scrollingChordsModal = document.getElementById('scrollingChordsModal');
        this.scrollingChordsFrame = document.getElementById('scrollingChordsFrame');
        this.scrollingChordsCloseBtn = document.getElementById('scrollingChordsModalClose');
        this.scrollingChordsMinimizeBtn = document.getElementById('scrollingChordsModalMinimize');
        this.timelineChangesResolve = null;
        this._timelineMinimized = false;

        // Info Modal
        this.infoModal = document.getElementById('infoModal');
        this.infoModalTitle = document.getElementById('infoModalTitle');
        this.infoModalMessage = document.getElementById('infoModalMessage');
        this.infoModalOkBtn = document.getElementById('infoModalOkBtn');
        this.infoModalClose = document.getElementById('infoModalClose');
        this.capoMenuContainer = document.getElementById('capoMenuContainer');
        this.capoBtn = document.getElementById('songDetailCapoBtn');
        this.capoMenu = document.getElementById('capoMenu');
        this.capoBadge = document.getElementById('capoBadge');
        this.sections = {
            verse: {
                section: document.getElementById('verseSection'),
                title: document.getElementById('verseTitle'),
                content: document.getElementById('verseContent'),
                editInput: document.getElementById('verseEditInput'),
                dividerBtn: document.querySelector('.bar-divider-btn[data-section="verse"]'),
                cue: document.getElementById('verseCueInput')
            },
            preChorus: {
                section: document.getElementById('preChorusSection'),
                title: document.getElementById('preChorusTitle'),
                content: document.getElementById('preChorusContent'),
                editInput: document.getElementById('preChorusEditInput'),
                dividerBtn: document.querySelector('.bar-divider-btn[data-section="preChorus"]'),
                cue: document.getElementById('preChorusCueInput')
            },
            chorus: {
                section: document.getElementById('chorusSection'),
                title: document.getElementById('chorusTitle'),
                content: document.getElementById('chorusContent'),
                editInput: document.getElementById('chorusEditInput'),
                dividerBtn: document.querySelector('.bar-divider-btn[data-section="chorus"]'),
                cue: document.getElementById('chorusCueInput')
            },
            bridge: {
                section: document.getElementById('bridgeSection'),
                title: document.getElementById('bridgeTitle'),
                content: document.getElementById('bridgeContent'),
                editInput: document.getElementById('bridgeEditInput'),
                dividerBtn: document.querySelector('.bar-divider-btn[data-section="bridge"]'),
                cue: document.getElementById('bridgeCueInput')
            }
        };
        this.hasUnsavedChanges = false;
        this.originalSongData = null;
        this.isRandomMode = false;
        this.transposeOffset = 0;

        // Initialize Instrument Mode (Piano/Guitar)
        const user = songManager.firebaseManager ? songManager.firebaseManager.getCurrentUser() : null;
        const uid = user ? user.uid : 'guest';
        this.instrumentMode = localStorage.getItem(`instrument-mode-${uid}`) || 'piano';

        // Initialize a single shared audio player
        this.sharedAudioPlayer = new PianoAudioPlayer();
        this.chordParser = new ChordParser();

        // Initialize Piano Chord Overlay with shared player
        this.pianoChordOverlay = new PianoChordOverlay(this.sharedAudioPlayer);

        // Initialize Guitar Chord Overlay with shared player and parser
        this.guitarChordOverlay = new GuitarChordOverlay(this.sharedAudioPlayer, this.chordParser);

        // Initialize Ukulele Chord Overlay
        this.ukuleleChordOverlay = new UkuleleChordOverlay(this.sharedAudioPlayer, this.chordParser);

        // Initialize Chord Progression Editor with shared player
        this.chordProgressionEditor = new ChordProgressionEditor(this.sharedAudioPlayer);

        this.setupEventListeners();
        this.setupPianoButtons();
        this.setupChordEditorButtons();
        this.setupBarDividerButtons();
        // this.setupBarDividerButtons(); // Replaced by inline editing
        this.setupChordBlocks();
    }

    toggleLyricsTicker() {
        if (!this.lyricsOverlay || !this.lyricsText || !this.currentSongId) return;

        const song = this.songManager.getSongById(this.currentSongId);
        if (!song) return;

        // Check if there is anything to show
        const combinedBlocks = [
            song.verse || '',
            song.preChorus || '',
            song.chorus || '',
            song.bridge || ''
        ].filter(text => text && text.trim() !== '').join('\n\n');

        const cues = [
            song.verseCue,
            song.chorusCue,
            song.preChorusCue,
            song.bridgeCue
        ].filter(cue => cue && cue.trim() !== '');

        const hasOfficialLyrics = cues.length > 0 || (song.fullLyrics && song.fullLyrics.trim()) || (song.lyrics && song.lyrics.trim());

        if (!hasOfficialLyrics) {
            this.showInfoModal('Lyrics Guidance', 'No lyrics found for this song. Click the Gear icon (Details) to add lyrics in the "Lyrics" field!');
            return;
        }

        this.updateLyricsTickerContent();

        if (this.lyricsOverlay.classList.contains('hidden')) {
            this.lyricsOverlay.classList.remove('hidden');
            this.startAutoScroll();
            this.isLyricsPaused = false;
            this.updatePauseButton();
        } else {
            this.stopAutoScroll();
            this.lyricsOverlay.classList.add('hidden');
        }
    }

    updateLyricsTickerContent() {
        if (!this.lyricsOverlay || !this.lyricsText || !this.currentSongId) return;

        const song = this.songManager.getSongById(this.currentSongId);
        if (!song) return;

        const combinedBlocks = [
            song.verse || '',
            song.preChorus || '',
            song.chorus || '',
            song.bridge || ''
        ].filter(text => text && text.trim() !== '').join('\n\n');

        const cues = [
            song.verseCue,
            song.chorusCue,
            song.preChorusCue,
            song.bridgeCue
        ].filter(cue => cue && cue.trim() !== '');

        let lyrics = '';
        if (song.fullLyrics && song.fullLyrics.trim()) {
            lyrics = song.fullLyrics;
        } else if (song.lyrics && song.lyrics.trim()) {
            // Restore legacy fallback
            lyrics = song.lyrics;
        } else if (cues.length > 0) {
            lyrics = cues.join('\n\n');
        } else {
            lyrics = combinedBlocks;
        }

        // Strip LRC timestamps if they exist
        const cleanLyrics = LyricsParser.stripTimestamps(lyrics);
        this.lyricsText.innerText = cleanLyrics;

        // Reset scroll position visual state
        const scrollContainer = this.lyricsOverlay.querySelector('.lyrics-ticker-content');
        if (scrollContainer) {
            this.lyricsScrollPos = 0;
            scrollContainer.scrollTop = 0;
        }
    }

    searchChords() {
        if (!this.currentSongId) return;
        const song = this.songManager.getSongById(this.currentSongId);
        if (!song) return;

        const artist = song.artist || '';
        const title = song.title || '';
        const query = encodeURIComponent(`${artist} ${title} Chords`).replace(/%20/g, '+');
        const searchUrl = `https://www.google.com/search?q=${query}`;

        window.open(searchUrl, '_blank');
    }

    startAutoScroll() {
        this.stopAutoScroll();
        const scrollContainer = this.lyricsOverlay.querySelector('.lyrics-ticker-content');
        if (!scrollContainer) return;

        // Use a persistent internal property for sub-pixel accuracy
        if (!this.lyricsScrollPos || this.lyricsOverlay.classList.contains('hidden')) {
            this.lyricsScrollPos = 0;
        }
        scrollContainer.scrollTop = this.lyricsScrollPos;

        let lastTime = performance.now();
        const scroll = (currentTime) => {
            if (!this.lyricsOverlay || this.lyricsOverlay.classList.contains('hidden')) return;

            if (this.isLyricsPaused) {
                this.scrollAnimationId = requestAnimationFrame(scroll);
                lastTime = currentTime;
                return;
            }

            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;

            // Base speed: 20px per second at factor 1.0 (was 40)
            const pixelsPerMs = (20 * this.lyricsSpeedFactor) / 1000;
            this.lyricsScrollPos += pixelsPerMs * deltaTime;

            // Loop reset: if we reach the end of the text
            const maxScroll = scrollContainer.scrollHeight - scrollContainer.offsetHeight;
            if (this.lyricsScrollPos >= maxScroll && maxScroll > 0) {
                this.lyricsScrollPos = 0;
            }

            scrollContainer.scrollTop = this.lyricsScrollPos;

            this.scrollAnimationId = requestAnimationFrame(scroll);
        };
        this.scrollAnimationId = requestAnimationFrame(scroll);

        if (!this.scrollListenersAdded) {
            const handleInteractStart = () => {
                this.isUserInteracting = true;
                this.wasPausedBeforeInteraction = this.isLyricsPaused;
                this.isLyricsPaused = true;
            };
            const handleInteractEnd = () => {
                if (this.isUserInteracting) {
                    this.isUserInteracting = false;
                    this.isLyricsPaused = this.wasPausedBeforeInteraction;
                    // Sync our internal position with the user's manual scroll
                    this.lyricsScrollPos = scrollContainer.scrollTop;
                }
            };

            scrollContainer.addEventListener('touchstart', handleInteractStart, { passive: true });
            scrollContainer.addEventListener('touchend', handleInteractEnd, { passive: true });
            scrollContainer.addEventListener('mousedown', handleInteractStart);
            window.addEventListener('mouseup', handleInteractEnd);

            // Also sync during manual scroll
            scrollContainer.addEventListener('scroll', () => {
                if (this.isUserInteracting) {
                    this.lyricsScrollPos = scrollContainer.scrollTop;
                }
            });

            this.scrollListenersAdded = true;
        }
    }

    stopAutoScroll() {
        if (this.scrollAnimationId) {
            cancelAnimationFrame(this.scrollAnimationId);
            this.scrollAnimationId = null;
        }
    }

    toggleLyricsPause() {
        this.isLyricsPaused = !this.isLyricsPaused;
        this.updatePauseButton();
    }

    updatePauseButton() {
        const pauseBtn = document.getElementById('lyricsPauseBtn');
        if (pauseBtn) {
            const pauseIcon = pauseBtn.querySelector('.pause-icon');
            const playIcon = pauseBtn.querySelector('.play-icon');

            if (this.isLyricsPaused) {
                if (pauseIcon) pauseIcon.classList.add('hidden');
                if (playIcon) playIcon.classList.remove('hidden');
                pauseBtn.title = 'Play';
            } else {
                if (pauseIcon) pauseIcon.classList.remove('hidden');
                if (playIcon) playIcon.classList.add('hidden');
                pauseBtn.title = 'Pause';
            }
        }
    }

    adjustLyricsSpeed(delta) {
        this.lyricsSpeedFactor = Math.max(0.1, Math.min(5.0, this.lyricsSpeedFactor + delta));
        console.log(`Lyrics Speed Factor: ${this.lyricsSpeedFactor.toFixed(1)}x`);
    }

    updateTickerSpeed() {
        // Obsolete in JS-scrolling mode
    }

    formatKeyText(keyText) {
        if (!keyText) return '';

        let formatted = keyText.trim();

        // Ensure first letter is uppercase
        if (formatted.length > 0) {
            formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
        }

        // Handle minor 'm' - if it ends with 'M' or 'm', make it 'm'
        // But be careful with keys like 'Am', 'Abm'
        if (formatted.toLowerCase().endsWith('m')) {
            formatted = formatted.slice(0, -1) + 'm';
        }

        // Handle flats 'b' - ensure 'B' becomes 'b' after the note name
        // e.g., 'AB' becomes 'Ab'
        if (formatted.length > 1 && (formatted.charAt(1) === 'B' || formatted.charAt(1) === 'b')) {
            formatted = formatted.charAt(0) + 'b' + formatted.slice(2);
        }

        return formatted;
    }

    setSongs(songs) {
        this.allSongs = songs;
    }

    async toggleInstrumentMode() {
        if (this.instrumentMode === 'piano') {
            this.instrumentMode = 'guitar';
        } else if (this.instrumentMode === 'guitar') {
            this.instrumentMode = 'ukulele';
        } else {
            this.instrumentMode = 'piano';
        }

        const user = this.songManager.firebaseManager ? this.songManager.firebaseManager.getCurrentUser() : null;
        const uid = user ? user.uid : 'guest';
        
        // Save to LocalStorage
        localStorage.setItem(`instrument-mode-${uid}`, this.instrumentMode);
        // Fallback for index.html/other parts
        localStorage.setItem('instrumentMode', this.instrumentMode);

        // Save to Firebase if authenticated
        if (user && this.songManager.firebaseManager) {
            try {
                await this.songManager.firebaseManager.updatePreference('instrument', this.instrumentMode);
            } catch (e) {
                console.error('Error saving instrument to Firebase:', e);
            }
        }

        this.updateInstrumentToggleUI();
        this.refreshNotation();

        // Sync with timeline if open
        if (this.scrollingChordsFrame && this.scrollingChordsFrame.contentWindow) {
            this.scrollingChordsFrame.contentWindow.postMessage({
                type: 'setInstrumentMode',
                instrumentMode: this.instrumentMode
            }, '*');
        }

        // Sync with Profile Modal if it exists
        if (window.appInstance && window.appInstance.profileModal) {
            window.appInstance.profileModal.updateInstrumentUI(this.instrumentMode);
        }
    }

    updateInstrumentToggleUI() {
        const toggleBtn = document.getElementById('instrumentToggleBtn');
        if (toggleBtn) {
            const icon = toggleBtn.querySelector('.icon');
            const label = toggleBtn.querySelector('.label');
            if (this.instrumentMode === 'guitar') {
                if (icon) icon.textContent = '🎸';
                if (label) label.textContent = 'guitar';
                toggleBtn.title = 'Switch to Ukulele Mode';
                toggleBtn.classList.remove('instrument-ukulele');
            } else if (this.instrumentMode === 'ukulele') {
                if (icon) icon.innerHTML = `
                    <svg viewBox="0 0 100 100" width="34" height="34" style="vertical-align: middle; margin-top: -2px;">
                        <g transform="rotate(-35 50 50)">
                            <!-- Neck -->
                            <rect x="45" y="5" width="10" height="42" rx="2" fill="#8d6e63" stroke="#5d4037" stroke-width="2"/>
                            <!-- Body -->
                            <path d="M50,42 c-15,0 -25,12 -25,28 c0,22 12,32 25,32 s25,-10 25,-32 c0,-16 -10,-28 -25,-28" fill="#c08e51" stroke="#5d4037" stroke-width="3"/>
                            <!-- Details -->
                            <circle cx="50" cy="65" r="9" fill="#3e2723"/>
                            <rect x="40" y="85" width="20" height="6" rx="1.5" fill="#3e2723"/>
                        </g>
                    </svg>`;
                if (label) label.textContent = 'ukulele';
                toggleBtn.title = 'Switch to Piano Mode';
                toggleBtn.classList.add('instrument-ukulele');
            } else {
                if (icon) icon.textContent = '🎹';
                if (label) label.textContent = 'piano';
                toggleBtn.title = 'Switch to Guitar Mode';
                toggleBtn.classList.remove('instrument-ukulele');
            }
        }

        // Update header block instrument button
        if (this.instrumentHeaderBtn) {
            const icon = this.instrumentHeaderBtn.querySelector('.icon');
            if (icon) {
                if (this.instrumentMode === 'guitar') {
                    icon.textContent = '🎸';
                    this.instrumentHeaderBtn.title = 'Show Guitar Chords';
                } else if (this.instrumentMode === 'ukulele') {
                    icon.innerHTML = `
                        <svg viewBox="0 0 100 100" width="20" height="20" style="vertical-align: middle;">
                            <g transform="rotate(-35 50 50)">
                                <rect x="45" y="5" width="10" height="42" rx="2" fill="#8d6e63" stroke="#5d4037" stroke-width="2"/>
                                <path d="M50,42 c-15,0 -25,12 -25,28 c0,22 12,32 25,32 s25,-10 25,-32 c0,-16 -10,-28 -25,-28" fill="#c08e51" stroke="#5d4037" stroke-width="3"/>
                                <circle cx="50" cy="65" r="9" fill="#3e2723"/>
                                <rect x="40" y="85" width="20" height="6" rx="1.5" fill="#3e2723"/>
                            </g>
                        </svg>`;
                    this.instrumentHeaderBtn.title = 'Show Ukulele Chords';
                } else {
                    icon.textContent = '🎹';
                    this.instrumentHeaderBtn.title = 'Show Piano Chords';
                }
            }
        }

        const isGuitar = this.instrumentMode === 'guitar';
        const transposeContainer = this.transposeBtn ? this.transposeBtn.closest('.transpose-menu-container') : null;

        if (isGuitar) {
            // Unify: Switch Transpose for Capo button on ALL devices
            if (transposeContainer) transposeContainer.classList.add('hidden');
            if (this.capoMenuContainer) this.capoMenuContainer.classList.remove('hidden');
            this.updateCapoUI();
        } else {
            if (this.capoMenuContainer) this.capoMenuContainer.classList.add('hidden');
            if (transposeContainer) transposeContainer.classList.remove('hidden');
        }
    }



    updateCapoUI() {
        // Update Mobile Button/Menu UI
        if (this.capoBadge) {
            if (this.capoValue > 0) {
                this.capoBadge.textContent = this.capoValue;
                this.capoBadge.classList.remove('hidden');
            } else {
                this.capoBadge.classList.add('hidden');
            }
        }

        if (this.capoMenu) {
            const items = this.capoMenu.querySelectorAll('.capo-menu-item');
            items.forEach(item => {
                const val = parseInt(item.getAttribute('data-capo'));
                if (val === this.capoValue) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        }
    }

    setupEventListeners() {
        this.closeBtn.addEventListener('click', () => {
            if (window.appInstance) {
                window.appInstance.popModalState('songDetail');
            } else {
                this.hide();
            }
        });
        if (this.chordTrainerBtn) {
            this.chordTrainerBtn.onclick = () => {
                if (!this.currentSongId) return;
                const url = `ChordTrainer.html?songId=${this.currentSongId}&mode=songPractice`;
                console.log('Redirecting to Chord Trainer:', url);
                window.location.href = url;
            };
        }
        this.prevBtn.addEventListener('click', () => this.navigatePrevious());
        this.nextBtn.addEventListener('click', () => this.navigateNext());

        // Unified Instrument Mode Switcher (replaces lyrics button space)
        const instrToggle = document.getElementById('instrumentToggleBtn');
        if (instrToggle) {
            instrToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleInstrumentMode();
            });
        }



        if (this.capoBtn && this.capoMenu) {
            this.capoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.capoMenu.classList.toggle('hidden');
            });

            // Handle Capo Menu selection
            const capoMenuItems = this.capoMenu.querySelectorAll('.capo-menu-item');
            capoMenuItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const oldCapo = this.capoValue || 0;
                    const val = parseInt(item.getAttribute('data-capo'));
                    this.capoValue = val;
                    this.updateCapoUI();

                    // If a chord block is currently being edited, update its text to match new Capo
                    Object.keys(this.sections).forEach(key => {
                        const section = this.sections[key];
                        if (section.editInput && !section.editInput.classList.contains('hidden')) {
                            // Convert current display text back to original, then to new transposed version
                            const originalText = this.transposeBlockText(section.editInput.value, oldCapo);
                            section.editInput.value = this.transposeBlockText(originalText, -this.capoValue);
                        }
                    });

                    this.refreshNotation();
                    this.checkForChanges(); // Trigger change check
                    this.capoMenu.classList.add('hidden');
                });
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (this.capoMenu && !this.capoMenu.classList.contains('hidden') &&
                    !this.capoMenu.contains(e.target) &&
                    e.target !== this.capoBtn &&
                    !this.capoBtn.contains(e.target)) {
                    this.capoMenu.classList.add('hidden');
                }
            });
        }

        if (this.closeLyricsBtn) {
            this.closeLyricsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.lyricsOverlay) {
                    this.lyricsOverlay.classList.add('hidden');
                    this.stopAutoScroll();
                }
            });
        }

        const lyricsPauseBtn = document.getElementById('lyricsPauseBtn');
        if (lyricsPauseBtn) {
            lyricsPauseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleLyricsPause();
            });
        }

        if (this.speedUpBtn) {
            this.speedUpBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.adjustLyricsSpeed(0.2);
            });
        }

        if (this.speedDownBtn) {
            this.speedDownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.adjustLyricsSpeed(-0.2);
            });
        }

        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', async () => {
                await this.saveChanges(false);
            });
        }

        if (this.notesInput) {
            this.notesInput.addEventListener('input', () => {
                this.checkForChanges();
            });
        }

        if (this.favoriteBtn) {
            this.favoriteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleFavorite();
            });
        }

        if (this.chordSearchBtn) {
            this.chordSearchBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.hamburgerMenu) {
                    this.hamburgerMenu.classList.add('hidden');
                }
                this.searchChords();
            });
        }

        if (this.practiceBtn) {
            this.practiceBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (this.onTogglePractice) {
                    const isNowActive = await this.onTogglePractice(this.currentSongId);
                    this.setPracticeState(isNowActive);
                }
            });
        }

        if (this.songMapBtn) {
            this.songMapBtn.addEventListener('click', (e) => {
                console.log('Song Map button clicked - opening overlay with map flag');
                this._shouldOpenSongMap = true;
                if (this.scrollingChordsBtn) {
                    this.scrollingChordsBtn.click();
                }
            });
        }

        // Setup Scrolling Chords Button
        const scrollingChordsBtn = document.getElementById('songDetailScrollingChordsBtn');
        const scrollingChordsModal = document.getElementById('scrollingChordsModal');
        const scrollingChordsFrame = document.getElementById('scrollingChordsFrame');
        const scrollingChordsCloseBtn = document.getElementById('scrollingChordsModalClose');

        console.log('Setup Scrolling Chords:', { btn: !!scrollingChordsBtn, modal: !!scrollingChordsModal });
        if (scrollingChordsBtn && scrollingChordsModal) {
            scrollingChordsBtn.addEventListener('click', (e) => {
                console.log('Scrolling chords button clicked - opening overlay');
                e.preventDefault();
                e.stopPropagation();

                // If timeline is minimized, just restore it instantly — no reload
                if (this._timelineMinimized) {
                    this._timelineMinimized = false;
                    scrollingChordsModal.classList.remove('hidden');
                    this._updateTimelineMinimizedIndicator(false);

                    // Force a data refresh to ensured rendered state is restored
                    this.sendDataToTimeline();

                    if (window.appInstance) {
                        window.appInstance.pushModalState('scrollingChords', () => {
                            this.handleTimelineClose();
                        });
                    }
                    return;
                }

                // Define helper to send data - replaced by this.sendDataToTimeline()

                // Force reload iframe on each open to ensure fresh state
                if (scrollingChordsFrame) {
                    // 1. Assign onload logic BEFORE setting src to avoid race conditions
                    scrollingChordsFrame.onload = () => {
                        console.log('Iframe loaded (onload event). Handshake will trigger data transfer.');
                    };

                    // 2. Set src to trigger load
                    let url = 'scrolling_chords.html?v=2.483&embed=true&t=' + Date.now();
                    if (this._shouldOpenSongMap) {
                        url += '&openMap=true';
                        this._shouldOpenSongMap = false; // Reset flag
                    }

                    // Using location.replace prevents adding extra history entries that cause double-close issues
                    if (scrollingChordsFrame.contentWindow) {
                        scrollingChordsFrame.contentWindow.location.replace(url);
                    } else {
                        scrollingChordsFrame.src = url;
                    }
                }

                // Show modal overlay
                scrollingChordsModal.classList.remove('hidden');

                // Push modal state to history stack
                if (window.appInstance) {
                    window.appInstance.pushModalState('scrollingChords', () => {
                        console.log('Closing Scrolling Chords Modal via state pop');
                        this.handleTimelineClose();
                    });
                }
            });

            // Minimize logic
            if (this.scrollingChordsMinimizeBtn) {
                this.scrollingChordsMinimizeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Hide modal but keep iframe alive
                    this._timelineMinimized = true;
                    scrollingChordsModal.classList.add('hidden');
                    this._updateTimelineMinimizedIndicator(true);
                    // Pop modal state so back button / backdrop click doesn't interfere
                    if (window.appInstance) {
                        window.appInstance.popModalState('scrollingChords');
                    }
                });
            }

            // Close logic
            if (this.scrollingChordsCloseBtn) {
                this.scrollingChordsCloseBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (window.appInstance) {
                        window.appInstance.popModalState('scrollingChords');
                    } else {
                        this.handleTimelineClose();
                    }
                });
            }

            // Close on background click
            if (this.scrollingChordsModal) {
                let isTimelineModalMouseDown = false;
                this.scrollingChordsModal.addEventListener('mousedown', (e) => {
                    isTimelineModalMouseDown = (e.target === this.scrollingChordsModal);
                });
                this.scrollingChordsModal.addEventListener('click', (e) => {
                    if (e.target === this.scrollingChordsModal && isTimelineModalMouseDown) {
                        if (window.appInstance) {
                            window.appInstance.popModalState('scrollingChords');
                        } else {
                            this.handleTimelineClose();
                        }
                    }
                    isTimelineModalMouseDown = false;
                });
            }

            // Listen for Save message from iframe
            // Listen for messages from iframe
            window.addEventListener('message', async (event) => {
                if (!event.data) return;

                // 1. Handshake: Iframe says "I'm Ready"
                if (event.data.type === 'scrollingChordsReady') {
                    console.log('Received Ready signal from Scrolling Chords');
                    // Always send data if we have the frame, even if hidden (it might be minimized)
                    if (this.scrollingChordsFrame) {
                        this.sendDataToTimeline();
                    }
                }

                else if (event.data.type === 'toggleTimelineCloseBtn') {
                    // Hide/Show the entire group of buttons (Close/Minimize) to prevent accidental closing
                    const btnGroup = document.querySelector('.scrolling-chords-btn-group');
                    if (btnGroup) {
                        btnGroup.style.display = event.data.visible ? 'flex' : 'none';
                    }
                    // ALSO hide the main Song Detail Close button while Song Map is active to avoid 'double X'
                    if (this.closeBtn) {
                        this.closeBtn.style.display = event.data.visible ? 'flex' : 'none';
                    }
                }
                else if (event.data.type === 'closeScrollingChordsModal') {
                    // Force complete close of the modal (iframe) from the Map's close button
                    this.handleTimelineClose();
                }
                // 2. Change status response
                else if (event.data.type === 'unsavedChangesResult') {
                    // Save the current playback position for this song
                    if (event.data.currentTime !== undefined && this.currentSongId) {
                        if (!this._timelinePositions) this._timelinePositions = {};
                        this._timelinePositions[this.currentSongId] = event.data.currentTime;
                    }
                    if (this.timelineChangesResolve) {
                        this.timelineChangesResolve(event.data.hasChanges);
                        this.timelineChangesResolve = null;
                    }
                }

                // 2. Save Data
                else if (event.data.type === 'saveChordData' && this.currentSongId) {
                    const chordData = event.data.data;
                    console.log('SongDetailModal: Received saveChordData from Timeline', chordData);

                    try {
                        const song = this.songManager.getSongById(this.currentSongId);
                        const updates = { chordData: chordData };
                        
                        if (chordData.tempo) {
                            updates.tempo = chordData.tempo;
                            if (this.bpmDisplay) {
                                this.bpmDisplay.textContent = Math.round(chordData.tempo);
                            }
                        }

                        // FORK CHECK: If this is a public song we don't own, fork it first
                        if (song && song.isPublic && !this.songManager.canEditPublicSong(song)) {
                            console.log('SongDetailModal: Forking public song on timeline save...');
                            const newSong = await this.forkCurrentSong(updates);
                            if (newSong) {
                                console.log('SongDetailModal: Successfully forked song during timeline save:', newSong.id);
                            }
                            return;
                        }

                        await this.songManager.updateSong(this.currentSongId, updates);
                        console.log('Chord data saved to database');
                    } catch (e) {
                        console.error('Error saving chord data from timeline:', e);
                    }
                }

                // 3. Update lyric sync offset
                else if (event.data.type === 'updateLyricSync' && this.currentSongId) {
                    const offset = event.data.offset;
                    console.log('SongDetailModal: Received updateLyricSync from Timeline', offset);

                    try {
                        const song = this.songManager.getSongById(this.currentSongId);
                        const updates = { lyricOffset: offset };

                        if (this.lyricOffsetInput) {
                            this.lyricOffsetInput.value = offset.toFixed(2);
                        }

                        // FORK CHECK: If this is a public song we don't own, fork it first
                        if (song && song.isPublic && !this.songManager.canEditPublicSong(song)) {
                            console.log('SongDetailModal: Forking public song on lyric sync update...');
                            await this.forkCurrentSong(updates);
                            return;
                        }

                        // Update in memory and database
                        await this.songManager.updateSong(this.currentSongId, updates);
                        console.log('LyricSync offset updated in database:', offset);
                    } catch (e) {
                        console.error('Error updating lyric sync from timeline:', e);
                    }
                }

                // 4. Update Chord Block from Inline Editor in Timeline
                else if (event.data.type === 'updateChordBlock' && this.currentSongId) {
                    const { sectionType, text } = event.data;
                    console.log('SongDetailModal: Received updateChordBlock from Timeline', sectionType, text);

                    try {
                        const song = this.songManager.getSongById(this.currentSongId);
                        const updates = {};
                        if (sectionType === 'verse') updates.verse = text;
                        else if (sectionType === 'chorus') updates.chorus = text;
                        else if (sectionType === 'pre-chorus') updates.preChorus = text;
                        else if (sectionType === 'bridge') updates.bridge = text;

                        if (Object.keys(updates).length > 0) {
                            // Update UI textareas
                            const sectionKey = sectionType === 'pre-chorus' ? 'preChorus' : sectionType;
                            const section = this.sections[sectionKey];
                            if (section && section.editInput) {
                                section.editInput.value = text;
                                // Trigger input event to let other logic know it changed
                                section.editInput.dispatchEvent(new Event('input', { bubbles: true }));
                                // Re-render the buttons
                                if (section.editInput.classList.contains('hidden')) {
                                    this.renderChordBlock(sectionKey, text);
                                }
                            }

                            // FORK CHECK: If this is a public song we don't own, fork it first
                            if (song && song.isPublic && !this.songManager.canEditPublicSong(song)) {
                                console.log('SongDetailModal: Forking public song on block update...');
                                await this.forkCurrentSong(updates);
                                return;
                            }

                            // Save to database
                            await this.songManager.updateSong(this.currentSongId, updates);
                            console.log(`Chord block ${sectionType} updated and saved.`);

                            // Optionally refresh the timeline toolbar itself if needed
                            this.sendDataToTimeline();
                        }
                    } catch (e) {
                        console.error('Error updating chord block from timeline:', e);
                    }
                }
            });
        }

        if (this.performAbilityStars) {
            this.performAbilityStars.addEventListener('click', (e) => {
                e.stopPropagation();
                this.cycleAbility();
            });
        }

        if (this.practiceControlsContainer) {
            this.practiceControlsContainer.addEventListener('click', async (e) => {
                e.preventDefault(); // Prevent accidental double-firing on some touch browsers
                e.stopPropagation();

                // Add visual feedback directly in JS for instant response
                this.practiceControlsContainer.style.transition = 'transform 0.1s ease';
                this.practiceControlsContainer.style.transform = 'scale(0.85)';
                setTimeout(() => {
                    if (this.practiceControlsContainer) {
                        this.practiceControlsContainer.style.transform = '';
                    }
                }, 100);

                await this.incrementPracticeCount();
            });
        }

        // Setup YouTube URL button
        if (this.youtubeBtn) {
            this.youtubeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openYouTubeUrlModal();
            });
        }

        // Setup Lyrics Edit Modal buttons
        if (this.openLyricsModalBtn && this.lyricsEditModal) {
            this.openLyricsModalBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.lyricsEditModal.classList.remove('hidden');
                if (window.appInstance) {
                    window.appInstance.pushModalState('lyricsEdit', () => {
                        if (this.lyricsEditModal) this.lyricsEditModal.classList.add('hidden');
                    });
                }
                if (this.fullLyricsInput) this.fullLyricsInput.focus();
            });
        }

        if (this.lyricsEditModalClose) {
            this.lyricsEditModalClose.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.appInstance) {
                    window.appInstance.popModalState('lyricsEdit');
                } else {
                    if (this.lyricsEditModal) this.lyricsEditModal.classList.add('hidden');
                }
            });
        }

        if (this.lyricsEditDoneBtn) {
            this.lyricsEditDoneBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.appInstance) {
                    window.appInstance.popModalState('lyricsEdit');
                } else {
                    if (this.lyricsEditModal) this.lyricsEditModal.classList.add('hidden');
                }
                // Update status text in parent modal
                if (this.lyricsStatusText && this.fullLyricsInput) {
                    const hasLyrics = this.fullLyricsInput.value.trim() !== '';
                    this.lyricsStatusText.style.display = hasLyrics ? 'block' : 'none';
                }
                // Check for changes after editing lyrics
                this.checkForChanges();
            });
        }

        if (this.lyricsEditModal) {
            let isLyricsModalMouseDown = false;
            this.lyricsEditModal.addEventListener('mousedown', (e) => {
                isLyricsModalMouseDown = (e.target === this.lyricsEditModal);
            });
            this.lyricsEditModal.addEventListener('click', (e) => {
                if (e.target === this.lyricsEditModal && isLyricsModalMouseDown) {
                    this.lyricsEditModal.classList.add('hidden');
                }
                isLyricsModalMouseDown = false;
            });
        }

        // Setup title listeners for change detection
        Object.values(this.sections).forEach(section => {
            if (section.title) {
                section.title.addEventListener('focus', () => {
                    this.showTitleSuggestions(section.title);
                });
                section.title.addEventListener('blur', () => {
                    // Delay hide to allow click on suggestion to register
                    setTimeout(() => this.hideTitleSuggestions(), 200);
                });
                section.title.addEventListener('input', () => {
                    const text = section.title.textContent;
                    if (text.length > 38) {
                        section.title.textContent = text.substring(0, 38);
                        // Move cursor to end to prevent jumping to start
                        const range = document.createRange();
                        const sel = window.getSelection();
                        range.selectNodeContents(section.title);
                        range.collapse(false);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    }
                    this.checkForChanges();
                });
                section.title.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        section.title.blur();
                    }
                });
            }
        });

        // Setup YouTube Play button
        if (this.youtubePlayBtn) {
            this.youtubePlayBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.onPlayYouTube && this.currentSongId) {
                    this.onPlayYouTube(this.currentSongId);
                }
            });
        }

        // Setup External URL button
        if (this.externalUrlBtn) {
            this.externalUrlBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openExternalUrl();
            });
        }

        // Setup Delete Song button
        if (this.deleteBtn) {
            this.deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.hamburgerMenu) {
                    this.hamburgerMenu.classList.add('hidden');
                }
                this.handleDeleteSong();
            });
        }

        // Setup Add To Setlist button
        if (this.addToSetlistBtn) {
            this.addToSetlistBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.hamburgerMenu) {
                    this.hamburgerMenu.classList.add('hidden');
                }
                if (this.onAddToSetlist && this.currentSongId) {
                    this.onAddToSetlist(this.currentSongId);
                }
            });
        }

        // Setup Publish Song button
        if (this.publishSongBtn) {
            this.publishSongBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.hamburgerMenu) {
                    this.hamburgerMenu.classList.add('hidden');
                }
                this.handlePublishSong();
            });
        }

        // Setup Transpose buttons
        if (this.transposeUpBtn) {
            this.transposeUpBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.transposeChords(1);
            });
        }

        if (this.transposeDownBtn) {
            this.transposeDownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.transposeChords(-1);
            });
        }

        // Setup Transpose Menu Toggle
        if (this.transposeBtn && this.transposeMenu) {
            this.transposeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.transposeMenu.classList.toggle('hidden');
            });

            // Hamburger Menu Toggle
            if (this.hamburgerBtn && this.hamburgerMenu) {
                this.hamburgerBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.hamburgerMenu.classList.toggle('hidden');
                });
            }

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                // Transpose Menu logic
                if (this.transposeMenu && !this.transposeMenu.classList.contains('hidden') &&
                    !this.transposeMenu.contains(e.target) &&
                    e.target !== this.transposeBtn &&
                    !this.transposeBtn.contains(e.target)) {
                    this.transposeMenu.classList.add('hidden');
                }

                // Hamburger Menu logic
                if (this.hamburgerMenu && !this.hamburgerMenu.classList.contains('hidden') &&
                    !this.hamburgerMenu.contains(e.target) &&
                    e.target !== this.hamburgerBtn &&
                    !this.hamburgerBtn.contains(e.target)) {
                    this.hamburgerMenu.classList.add('hidden');
                }
            });

            // Close editing chord blocks when clicking anywhere outside of them
            // Use capture: true to catch the event before stopPropagation() blocks it
            document.addEventListener('mousedown', (e) => {
                if (!this.sections) return;

                // Ignore clicks inside known tool overlays that need the editor open
                const isInsideHelper = e.target.closest(
                    '.piano-chord-overlay, .chord-progression-overlay, .chord-finder-overlay, ' +
                    '.title-suggestions-portal, #youtubeUrlModal, #lyricsEditModal, ' +
                    '#confirmationModal, .confirmation-modal-overlay'
                );
                if (isInsideHelper) return;

                Object.keys(this.sections).forEach(key => {
                    const section = this.sections[key];
                    if (section && section.editInput && !section.editInput.classList.contains('hidden')) {
                        // If click is outside this specific section's container, close it
                        if (!section.section.contains(e.target)) {
                            this.toggleBlockEdit(key);
                        }
                    }
                });
            }, { capture: true });
        }

        if (this.transposeResetBtn) {
            this.transposeResetBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.transposeOffset !== 0) {
                    this.transposeChords(-this.transposeOffset);
                    this.transposeOffset = 0;
                    this.transposeMenu.classList.add('hidden');
                }
            });
        }

        if (this.deleteBtn) {
            this.deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleDeleteSong();
            });
        }

        // Setup YouTube URL modal
        if (this.youtubeUrlModal) {
            if (this.youtubeUrlModalClose) {
                this.youtubeUrlModalClose.addEventListener('click', () => {
                    this.closeYouTubeUrlModal();
                });
            }
            if (this.youtubeUrlCancelBtn) {
                this.youtubeUrlCancelBtn.addEventListener('click', () => {
                    this.closeYouTubeUrlModal();
                });
            }
            if (this.youtubeUrlSaveBtn) {
                this.youtubeUrlSaveBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.saveYouTubeUrl();
                });
            }
            let isYoutubeModalMouseDown = false;
            this.youtubeUrlModal.addEventListener('mousedown', (e) => {
                isYoutubeModalMouseDown = (e.target === this.youtubeUrlModal);
            });
            this.youtubeUrlModal.addEventListener('click', (e) => {
                if (e.target === this.youtubeUrlModal && isYoutubeModalMouseDown) {
                    this.closeYouTubeUrlModal();
                }
                isYoutubeModalMouseDown = false;
            });
            if (this.youtubeUrlInput) {
                this.youtubeUrlInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.saveYouTubeUrl();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        this.closeYouTubeUrlModal();
                    }
                });
            }
            if (this.externalUrlInput) {
                this.externalUrlInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.saveYouTubeUrl();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        this.closeYouTubeUrlModal();
                    }
                });
            }
        }

        // Setup Chord JSON listeners
        if (this.chordJsonInput) {
            this.chordJsonInput.addEventListener('change', (e) => {
                const fileLabel = document.querySelector('label[for="chordJsonInput"]');
                if (fileLabel && e.target.files && e.target.files[0]) {
                    fileLabel.textContent = `📄 ${e.target.files[0].name.substring(0, 15)}...`;
                }
            });
        }

        if (this.clearChordDataBtn) {
            this.clearChordDataBtn.addEventListener('click', () => {
                this.chordDataToRemove = true;
                if (this.chordJsonStatus) {
                    this.chordJsonStatus.textContent = '🗑️ Marking for removal...';
                    this.chordJsonStatus.style.color = '#f59e0b';
                }
                this.clearChordDataBtn.style.display = 'none';
            });
        }

        let isMainModalMouseDown = false;
        this.modal.addEventListener('mousedown', (e) => {
            isMainModalMouseDown = (e.target === this.modal);
        });
        this.modal.addEventListener('click', async (e) => {
            if (e.target === this.modal && isMainModalMouseDown) {
                await this.hide();
            }
            isMainModalMouseDown = false;
        });

        // Make fields editable on click
        this.setupEditableFields();

        // Keyboard navigation
        document.addEventListener('keydown', async (e) => {
            if (!this.modal.classList.contains('hidden')) {
                if (e.key === 'Escape') {
                    // If editing, exit edit mode; otherwise close modal
                    const activeElement = document.activeElement;
                    if (activeElement && activeElement.hasAttribute('contenteditable') && activeElement.getAttribute('contenteditable') === 'true') {
                        activeElement.setAttribute('contenteditable', 'false');
                        activeElement.blur();
                    } else {
                        await this.hide();
                    }
                } else if (e.key === 'ArrowLeft') {
                    const isEditing = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;
                    if (!isEditing) {
                        this.navigatePrevious();
                    }
                } else if (e.key === 'ArrowRight') {
                    const isEditing = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;
                    if (!isEditing) {
                        this.navigateNext();
                    }
                } else if ((e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    if (this.hasUnsavedChanges) {
                        await this.saveChanges(false);
                    }
                } else if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
                    // Pass Undo command to Scrolling Chords iframe if it is open
                    const scrollingChordsModal = document.getElementById('scrollingChordsModal');
                    if (scrollingChordsModal && !scrollingChordsModal.classList.contains('hidden')) {
                        e.preventDefault();
                        const scrollingChordsFrame = document.getElementById('scrollingChordsFrame');
                        if (scrollingChordsFrame && scrollingChordsFrame.contentWindow) {
                            scrollingChordsFrame.contentWindow.postMessage({ type: 'undoAction' }, '*');
                        }
                    }
                }
            }
        });
    }

    setupPianoButtons() {
        if (!this.instrumentHeaderBtn) return;

        this.instrumentHeaderBtn.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();

            // Always show overlay for the last active section or verse by default
            const sectionKey = this._lastActiveSection || 'verse';

            if (this.instrumentMode === 'guitar') {
                this.showGuitarChords(sectionKey);
            } else if (this.instrumentMode === 'ukulele') {
                this.showUkuleleChords(sectionKey);
            } else if (this.pianoChordOverlay) {
                const blocks = [
                    { name: this.sections.verse.title.textContent || 'Block 1', text: this.sections.verse.editInput.value || '' },
                    { name: this.sections.chorus.title.textContent || 'Block 2', text: this.sections.chorus.editInput.value || '' },
                    { name: this.sections.preChorus.title.textContent || 'Block 3', text: this.sections.preChorus.editInput.value || '' },
                    { name: this.sections.bridge.title.textContent || 'Block 4', text: this.sections.bridge.editInput.value || '' }
                ];

                const sectionKeyToIdx = { 'verse': 0, 'chorus': 1, 'preChorus': 2, 'bridge': 3 };
                const startIndex = sectionKeyToIdx[sectionKey] || 0;

                this.pianoChordOverlay.show(blocks, startIndex);
            }
        };
    }

    setupChordEditorButtons() {
        const editorButtons = this.modal.querySelectorAll('.chord-editor-btn');
        editorButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();

                const focusedField = document.activeElement;
                const isChordField = focusedField &&
                    focusedField.classList.contains('chord-section-content') &&
                    focusedField.getAttribute('contenteditable') === 'true';

                let sectionKey = btn.dataset.section;
                if (isChordField) {
                    sectionKey = focusedField.dataset.field || sectionKey;
                }

                if (this.sections[sectionKey] && this.chordProgressionEditor) {
                    const blocks = [
                        { name: this.sections.verse.title.textContent || 'Block 1', field: this.sections.verse.editInput, songKey: this.getSongKey() },
                        { name: this.sections.chorus.title.textContent || 'Block 2', field: this.sections.chorus.editInput, songKey: this.getSongKey() },
                        { name: this.sections.preChorus.title.textContent || 'Block 3', field: this.sections.preChorus.editInput, songKey: this.getSongKey() },
                        { name: this.sections.bridge.title.textContent || 'Block 4', field: this.sections.bridge.editInput, songKey: this.getSongKey() }
                    ];
                    const sectionKeyToIdx = { 'verse': 0, 'chorus': 1, 'preChorus': 2, 'bridge': 3 };
                    const startIndex = sectionKeyToIdx[sectionKey] || 0;
                    this.chordProgressionEditor.show(blocks, startIndex, () => this.checkForChanges());
                }
            });
        });
    }

    setupBarDividerButtons() {
        Object.keys(this.sections).forEach(key => {
            const section = this.sections[key];
            if (!section.dividerBtn) return;

            section.dividerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();

                const input = section.editInput;
                const isEditing = !input.classList.contains('hidden');
                let newValue;

                if (!isEditing) {
                    // Switch to edit mode first to make editing easy
                    this.toggleBlockEdit(key);

                    // Append strictly to the end since there was no cursor focus
                    const value = input.value;
                    const needsSpace = value.length > 0 && !value.match(/\s$/);
                    newValue = value + (needsSpace ? ' | ' : '| ');
                    input.value = newValue;

                    // Move cursor to the absolute end
                    input.focus();
                    input.selectionStart = input.selectionEnd = newValue.length;
                } else {
                    // Already in edit mode: insert exactly at current cursor position
                    const startPos = input.selectionStart;
                    const endPos = input.selectionEnd;
                    const value = input.value;

                    const prefix = value.substring(0, startPos);
                    const needsSpaceBefore = prefix.length > 0 && !prefix.match(/\s$/);

                    newValue = prefix + (needsSpaceBefore ? ' | ' : '| ') + value.substring(endPos);
                    input.value = newValue;

                    // Move cursor right after the newly inserted part
                    input.focus();
                    const newPos = startPos + (needsSpaceBefore ? 3 : 2);
                    input.setSelectionRange(newPos, newPos);
                }

                // Trigger change detection and re-render
                this.renderChordBlock(key, newValue);
                this.checkForChanges();
            });
        });
    }

    refreshNotation() {
        Object.keys(this.sections).forEach(key => {
            const section = this.sections[key];
            const isEditing = !section.editInput.classList.contains('hidden');
            
            // If we are currently editing, we may need to RE-TRANSPOSE the textarea content
            // However, since we don't store "lastCapo", this is tricky if we trigger refreshNotation 
            // after a Capo change.
            // For now, let's just re-render the view blocks.
            // (The Capo menu selection logic handles the current open block if needed? Actually it doesn't!)
            
            if (!isEditing) {
                this.renderChordBlock(key, section.editInput.value);
            }
        });
    }

    getUseTextNotation() {
        const user = (window.appInstance && window.appInstance.firebaseManager) ? window.appInstance.firebaseManager.getCurrentUser() : null;
        const uid = user ? user.uid : 'guest';
        return localStorage.getItem(`feature-text-notation-enabled-${uid}`) === 'true';
    }

    setupChordBlocks() {
        Object.keys(this.sections).forEach(key => {
            const section = this.sections[key];

            // Add toggle reveal for touch devices
            const header = section.section.querySelector('.chord-section-header');
            if (header) {
                header.addEventListener('click', (e) => {
                    this._lastActiveSection = key;
                    // Don't toggle if we clicked a button or the editable title
                    if (e.target.closest('.header-action-btn') || e.target.classList.contains('editable-title')) return;

                    // Toggle tools visibility for this block
                    section.section.classList.toggle('show-icons');
                });
            }

            // Click anywhere on the chords to instantly switch to Text Edit mode!
            if (section.content) {
                section.content.addEventListener('click', (e) => {
                    this._lastActiveSection = key;
                    // Don't trigger if they are intentionally clicking a chord button to play it
                    if (e.target.closest('.chord-suggestion-btn')) return;

                    const isEditing = !section.editInput.classList.contains('hidden');
                    if (!isEditing) {
                        this.toggleBlockEdit(key);
                    }
                });
            }

            if (section.editInput) {
                section.editInput.addEventListener('keydown', (e) => {
                    this._lastActiveSection = key;
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        this.toggleBlockEdit(key);
                    }
                    if (e.key === 'Escape') {
                        // Revert and close
                        const song = this.songManager.getSongById(this.currentSongId);
                        if (song) {
                            section.editInput.value = song[key] || '';
                        }
                        this.toggleBlockEdit(key);
                    }
                });

                section.editInput.addEventListener('input', () => {
                    this.hasUnsavedChanges = true;
                    this.checkForChanges();
                });
            }
        });
    }

    toggleBlockEdit(key) {
        const section = this.sections[key];
        const isEditing = !section.editInput.classList.contains('hidden');

        if (isEditing) {
            // TRANSPOSE BACK: If we were editing transposed chords, convert back to original before saving/viewing
            if (this.instrumentMode === 'guitar' && this.capoValue > 0) {
                section.editInput.value = this.transposeBlockText(section.editInput.value, this.capoValue);
            }

            // Save state and switch to view
            section.section.classList.remove('editing');
            section.editInput.classList.add('hidden');
            section.content.classList.remove('hidden');
            this.renderChordBlock(key, section.editInput.value);
        } else {
            // Switch to edit
            // Close other editing blocks first
            Object.keys(this.sections).forEach(otherKey => {
                if (otherKey !== key) {
                    const otherSection = this.sections[otherKey];
                    if (!otherSection.editInput.classList.contains('hidden')) {
                        // RECURSIVE-ISH: Close this block by calling toggleBlockEdit or manually
                        this.toggleBlockEdit(otherKey);
                    }
                }
            });

            // TRANSPOSE FOR DISPLAY: Show the chords relative to the Capo in the textarea
            if (this.instrumentMode === 'guitar' && this.capoValue > 0) {
                section.editInput.value = this.transposeBlockText(section.editInput.value, -this.capoValue);
            }

            section.section.classList.add('editing');
            section.editInput.classList.remove('hidden');
            section.content.classList.add('hidden');
            section.editInput.focus();
            this._lastActiveSection = key;
        }
    }

    renderChordBlock(key, text) {
        const section = this.sections[key];
        if (!section.content) return;

        section.content.innerHTML = '';
        if (!text) return;

        // Match dividers, repeat markers, or anything else (chords)
        const items = text.match(/\||\d+x|[^\s|]+/g) || [];

        if (items.length === 0) {
            return;
        }

        if (this.getUseTextNotation()) {
            // Text mode
            const textSpan = document.createElement('span');
            textSpan.className = 'chord-text-notation';
            textSpan.textContent = items.join(' ');
            section.content.appendChild(textSpan);
            return;
        }

        // Button mode
        items.forEach(item => {
            const trimmed = item.trim();
            if (!trimmed) return;

            // Check if it's a marker (| or 2x, etc.)
            if (trimmed === '|' || /^\d+x$/.test(trimmed)) {
                const marker = document.createElement('span');
                marker.className = 'chord-toolbar-inline-label';
                marker.textContent = trimmed;
                // Add explicit style to ensure it's just grey text
                marker.style.setProperty('color', '#64748b', 'important');
                marker.style.setProperty('background', 'none', 'important');
                marker.style.setProperty('border', 'none', 'important');
                marker.style.setProperty('box-shadow', 'none', 'important');
                marker.style.display = 'inline-block';
                marker.style.margin = '0 4px';
                marker.style.fontSize = '1.4rem';
                marker.style.fontWeight = 'bold';
                section.content.appendChild(marker);
            } else {
                // Defensive: what if item contains a divider? (Split it further)
                if (trimmed.includes('|')) {
                    const parts = trimmed.split(/(\|)/);
                    parts.forEach(part => {
                        const p = part.trim();
                        if (!p) return;
                        if (p === '|') {
                            const marker = document.createElement('span');
                            marker.className = 'chord-toolbar-inline-label';
                            marker.textContent = '|';
                            marker.style.setProperty('color', '#64748b', 'important');
                            marker.style.setProperty('background', 'none', 'important');
                            marker.style.display = 'inline-block';
                            marker.style.margin = '0 4px';
                            marker.style.fontSize = '1.4rem';
                            marker.style.fontWeight = 'bold';
                            section.content.appendChild(marker);
                        } else {
                            let cleanP = p;
                            if (this.instrumentMode === 'guitar' && this.capoValue > 0) {
                                cleanP = this.chordParser.transpose(cleanP, -this.capoValue);
                            }
                            this.createChordButton(section, key, cleanP, p);
                        }
                    });
                } else {
                    let cleanChord = item.trim();

                    // Apply display-only Capo transposition if in Guitar mode
                    if (this.instrumentMode === 'guitar' && this.capoValue > 0) {
                        cleanChord = this.chordParser.transpose(cleanChord, -this.capoValue);
                    }

                    if (this.instrumentMode === 'guitar') {
                        cleanChord = cleanChord.split('/')[0].replace(/[23]$/, '');
                    } else if (this.instrumentMode === 'ukulele') {
                        cleanChord = cleanChord.split('/')[0].replace(/[237]/g, '');
                    }
                    this.createChordButton(section, key, cleanChord, item.trim());
                }
            }
        });
    }

    /**
     * Transposes an entire block of text (chords and markers) by the given semitones.
     */
    transposeBlockText(text, semitones) {
        if (!text || semitones === 0) return text || '';
        
        // Match markers (| or 2x, etc.) or words (chords)
        const items = text.match(/\||\d+x|[^\s|]+/g) || [];
        return items.map(item => {
            const trimmed = item.trim();
            // Don't transpose musical markers
            if (trimmed === '|' || /^\d+x$/.test(trimmed)) return trimmed;
            
            return this.chordParser.transpose(trimmed, semitones);
        }).join(' ');
    }

    /**
     * Safety helper to get the original (non-transposed) chord text for a section,
     * regardless of whether the user is currently editing it in transposed mode.
     */
    getOriginalSectionValue(key) {
        const section = this.sections[key];
        if (!section || !section.editInput) return '';

        const isEditing = !section.editInput.classList.contains('hidden');
        let value = section.editInput.value || '';

        // If currently editing in Guitar mode with a Capo, the value in the textarea
        // is transposed for the user's convenience. We must transpose it BACK 
        // to original semitones for comparison/saving.
        if (isEditing && this.instrumentMode === 'guitar' && this.capoValue > 0) {
            value = this.transposeBlockText(value, this.capoValue);
        }
        return value;
    }

    createChordButton(section, key, chordText, originalText = null) {
        const btn = document.createElement('button');
        btn.className = `chord-suggestion-btn chord-type-${key.toLowerCase()}`;
        btn.textContent = chordText;

        btn.onclick = (e) => {
            e.stopPropagation();
            if (this.sharedAudioPlayer) {
                this.sharedAudioPlayer.initialize().then(() => {
                    const textToPlay = (originalText || chordText);
                    if (this.instrumentMode === 'guitar') {
                        // Use guitar-specific strum and fingering
                        this.sharedAudioPlayer.setSound('guitar-strum');
                        const chord = this.chordParser.parseGuitarChord(textToPlay, window.GuitarChordDatabase);
                        if (chord && chord.notes) {
                            this.sharedAudioPlayer.playChord(chord.notes, 3.0, 0.4, 0.035, true);
                        }
                    } else if (this.instrumentMode === 'ukulele') {
                        // Use dedicated ukulele sound profile
                        this.sharedAudioPlayer.setSound('ukulele');
                        const chord = this.chordParser.parseUkuleleChord(textToPlay, window.UkuleleChordDatabase);
                        if (chord && chord.notes) {
                            this.sharedAudioPlayer.playChord(chord.notes, 2.0, 0.4, 0.03, true);
                        }
                    } else {
                        // Use piano-style sound and triad
                        const chord = this.chordParser.parse(textToPlay);
                        if (chord && chord.notes) {
                            this.sharedAudioPlayer.playChord(chord.notes, 2.0);
                        }
                    }
                });
            }
        };
        section.content.appendChild(btn);
    }

    formatBlockTextForOverlay(rawText) {
        if (!rawText || this.instrumentMode !== 'guitar' || this.capoValue <= 0) return rawText || '';
        
        // Match dividers, repeat markers, or chords
        const items = rawText.match(/\||\d+x|[^\s|]+/g) || [];
        return items.map(item => {
            const trimmed = item.trim();
            if (trimmed === '|' || /^\d+x$/.test(trimmed)) return trimmed;
            
            // Transpose for Capo: e.g. G with Capo 2 -> F
            return this.chordParser.transpose(trimmed, -this.capoValue);
        }).join(' ');
    }

    showUkuleleChords(sectionKey = 'verse') {
        if (!this.ukuleleChordOverlay) return;

        const blocks = [
            { name: (this.sections.verse.title.textContent || 'Block 1').replace(/\s*\([^)]*\)\s*$/, ''), text: this.formatBlockTextForOverlay(this.sections.verse.editInput.value || '') },
            { name: (this.sections.chorus.title.textContent || 'Block 2').replace(/\s*\([^)]*\)\s*$/, ''), text: this.formatBlockTextForOverlay(this.sections.chorus.editInput.value || '') },
            { name: (this.sections.preChorus.title.textContent || 'Block 3').replace(/\s*\([^)]*\)\s*$/, ''), text: this.formatBlockTextForOverlay(this.sections.preChorus.editInput.value || '') },
            { name: (this.sections.bridge.title.textContent || 'Block 4').replace(/\s*\([^)]*\)\s*$/, ''), text: this.formatBlockTextForOverlay(this.sections.bridge.editInput.value || '') }
        ];

        const sectionKeyToIdx = { 'verse': 0, 'chorus': 1, 'preChorus': 2, 'bridge': 3 };
        const startIndex = sectionKeyToIdx[sectionKey] || 0;

        this.ukuleleChordOverlay.show(blocks, startIndex);
    }

    showGuitarChords(sectionKey = 'verse') {
        if (!this.guitarChordOverlay) return;

        const blocks = [
            { name: (this.sections.verse.title.textContent || 'Block 1').replace(/\s*\([^)]*\)\s*$/, ''), text: this.formatBlockTextForOverlay(this.sections.verse.editInput.value || '') },
            { name: (this.sections.chorus.title.textContent || 'Block 2').replace(/\s*\([^)]*\)\s*$/, ''), text: this.formatBlockTextForOverlay(this.sections.chorus.editInput.value || '') },
            { name: (this.sections.preChorus.title.textContent || 'Block 3').replace(/\s*\([^)]*\)\s*$/, ''), text: this.formatBlockTextForOverlay(this.sections.preChorus.editInput.value || '') },
            { name: (this.sections.bridge.title.textContent || 'Block 4').replace(/\s*\([^)]*\)\s*$/, ''), text: this.formatBlockTextForOverlay(this.sections.bridge.editInput.value || '') }
        ];

        const sectionKeyToIdx = { 'verse': 0, 'chorus': 1, 'preChorus': 2, 'bridge': 3 };
        const startIndex = sectionKeyToIdx[sectionKey] || 0;

        this.guitarChordOverlay.show(blocks, startIndex);
    }

    setupDynamicButtons() {
        // Placeholder kept for compatibility
    }

    getSongKey() {
        if (!this.currentSongId) return '';

        // Prioritize currently edited UI value if available
        if (this.keyDisplay && this.keyDisplay.textContent.trim()) {
            return this.keyDisplay.textContent.trim();
        }

        const song = this.songManager.getSongById(this.currentSongId);
        if (!song) return '';
        let songKey = song.key || '';
        if (!songKey.trim() && this.keyDetector) {
            songKey = this.keyDetector.detectFromSong(song) || '';
        }
        return songKey;
    }

    setupEditableFields() {
        // Setup artist and title
        if (this.artistElement) {
            this.artistElement.addEventListener('click', (e) => {
                e.stopPropagation();
                this.enterEditMode(this.artistElement);
            });
            this.artistElement.addEventListener('blur', (e) => {
                // Don't blur if we're moving to next field with Tab
                if (e.relatedTarget && e.relatedTarget.hasAttribute('contenteditable') && e.relatedTarget.getAttribute('contenteditable') === 'true') {
                    return;
                }

                this.artistElement.setAttribute('contenteditable', 'false');
                this.artistElement.classList.remove('editing');

                // Update placeholder state
                const artistText = this.artistElement.textContent || '';
                if (!artistText.trim()) {
                    this.artistElement.classList.add('empty-field');
                    this.artistElement.dataset.placeholder = 'Artist';
                    this.artistElement.textContent = ''; // Clear any whitespace
                } else {
                    this.artistElement.classList.remove('empty-field');
                    this.artistElement.removeAttribute('data-placeholder');
                }

                this.checkForChanges();
            });
            this.artistElement.addEventListener('input', () => {
                // Remove placeholder when user starts typing
                if (this.artistElement.classList.contains('empty-field')) {
                    this.artistElement.classList.remove('empty-field');
                    this.artistElement.removeAttribute('data-placeholder');
                }
                this.checkForChanges();
            });
            this.artistElement.addEventListener('keydown', (e) => {
                if (e.key === 'Tab' && !e.shiftKey) {
                    e.preventDefault();
                    this.moveToNextField(this.artistElement);
                }
            });
        }
        if (this.titleElement) {
            this.titleElement.addEventListener('click', (e) => {
                e.stopPropagation();
                // When entering edit mode, show only title without key
                const originalTitle = this.titleElement.dataset.originalTitle || this.titleElement.textContent.replace(/\s*\([^)]*\)\s*$/, '');
                this.titleElement.textContent = originalTitle;
                this.titleElement.dataset.originalTitle = originalTitle;
                this.enterEditMode(this.titleElement);
            });
            this.titleElement.addEventListener('blur', (e) => {
                // Don't blur if we're moving to next field with Tab
                if (e.relatedTarget && e.relatedTarget.hasAttribute('contenteditable') && e.relatedTarget.getAttribute('contenteditable') === 'true') {
                    return;
                }

                this.titleElement.setAttribute('contenteditable', 'false');
                this.titleElement.classList.remove('editing');

                // Update placeholder state
                const titleText = this.titleElement.textContent || '';
                // Store the edited title
                this.titleElement.dataset.originalTitle = titleText;

                // Get key from current song to display with title
                if (this.currentSongId) {
                    const song = this.songManager.getSongById(this.currentSongId);
                    const keyText = song ? (song.key || '') : '';
                    let displayText = titleText;
                    if (keyText.trim()) {
                        displayText = `${titleText} (${keyText})`;
                    }
                    this.titleElement.textContent = displayText;
                } else {
                    this.titleElement.textContent = titleText;
                }

                if (!titleText.trim()) {
                    this.titleElement.classList.add('empty-field');
                    this.titleElement.dataset.placeholder = 'Song Title';
                    this.titleElement.textContent = ''; // Clear any whitespace
                } else {
                    this.titleElement.classList.remove('empty-field');
                    this.titleElement.removeAttribute('data-placeholder');
                }

                this.checkForChanges();
                // Remove chord button if exists (shouldn't be there for title, but just in case)
                const chordBtn = this.titleElement.parentElement?.querySelector('.chord-modal-btn-detail');
                if (chordBtn) {
                    chordBtn.remove();
                }
            });
            this.titleElement.addEventListener('input', () => {
                // Remove placeholder when user starts typing
                if (this.titleElement.classList.contains('empty-field')) {
                    this.titleElement.classList.remove('empty-field');
                    this.titleElement.removeAttribute('data-placeholder');
                }
                this.checkForChanges();
            });
            this.titleElement.addEventListener('keydown', (e) => {
                if (e.key === 'Tab' && !e.shiftKey) {
                    e.preventDefault();
                    this.moveToNextField(this.titleElement);
                }
            });
        }

        // Setup section fields - Chord sections now use the Edit button instead of direct click-to-edit
        Object.values(this.sections).forEach(section => {
            // Content editing is now handled via setupChordBlocks() and toggleBlockEdit()
            /*
            if (section.content) {
                section.content.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.enterEditMode(section.content);
                });
                // ... other listeners ...
            }
            */

            if (section.cue) {
                section.cue.addEventListener('input', () => this.checkForChanges());
                section.cue.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        section.cue.blur();
                        this.saveChanges();
                    }
                });
            }
        });

        // Setup key field
        if (this.keyDisplay) {
            const keyBadge = this.keyDisplay.closest('.song-detail-key-badge');
            (keyBadge || this.keyDisplay).addEventListener('click', (e) => {
                e.stopPropagation();
                this.enterEditMode(this.keyDisplay);
            });
            this.keyDisplay.addEventListener('blur', (e) => {
                // Don't blur if we're moving to next field with Tab
                if (e.relatedTarget && e.relatedTarget.hasAttribute('contenteditable') && e.relatedTarget.getAttribute('contenteditable') === 'true') {
                    return;
                }

                this.keyDisplay.setAttribute('contenteditable', 'false');
                this.keyDisplay.classList.remove('editing');
                this.checkForChanges();
            });
            this.keyDisplay.addEventListener('input', () => this.checkForChanges());
            this.keyDisplay.addEventListener('keydown', (e) => {
                if (e.key === 'Tab' && !e.shiftKey) {
                    e.preventDefault();
                    this.moveToNextField(this.keyDisplay);
                }
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.keyDisplay.blur();
                }
            });
        }

        // Setup BPM field
        if (this.bpmDisplay) {
            const bpmBadge = this.bpmDisplay.closest('.song-detail-bpm-badge');
            (bpmBadge || this.bpmDisplay).addEventListener('click', (e) => {
                e.stopPropagation();
                this.enterEditMode(this.bpmDisplay);
            });
            this.bpmDisplay.addEventListener('blur', (e) => {
                // Don't blur if we're moving to next field with Tab
                if (e.relatedTarget && e.relatedTarget.hasAttribute('contenteditable') && e.relatedTarget.getAttribute('contenteditable') === 'true') {
                    return;
                }

                this.bpmDisplay.setAttribute('contenteditable', 'false');
                this.bpmDisplay.classList.remove('editing');
                this.checkForChanges();
            });
            this.bpmDisplay.addEventListener('input', () => this.checkForChanges());
            this.bpmDisplay.addEventListener('keydown', (e) => {
                if (e.key === 'Tab' && !e.shiftKey) {
                    e.preventDefault();
                    this.moveToNextField(this.bpmDisplay);
                }
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.bpmDisplay.blur();
                }
            });
        }
    }

    moveToNextField(currentElement) {
        // Define field order: artist -> title -> verse -> chorus -> preChorus -> bridge
        const fieldOrder = ['artist', 'title', 'verse', 'chorus', 'preChorus', 'bridge', 'key', 'tempo'];
        const currentField = currentElement.dataset.field;
        const currentIndex = fieldOrder.indexOf(currentField);

        if (currentIndex === -1 || currentIndex >= fieldOrder.length - 1) {
            // Last field or unknown field - just exit edit mode
            currentElement.setAttribute('contenteditable', 'false');
            currentElement.classList.remove('editing');
            return;
        }

        // Save current field content
        const currentValue = currentElement.textContent.trim();
        currentElement.setAttribute('contenteditable', 'false');
        currentElement.classList.remove('editing');

        // Update placeholder for current field if empty
        if (!currentValue && (currentField === 'artist' || currentField === 'title')) {
            if (currentField === 'artist') {
                currentElement.classList.add('empty-field');
                currentElement.dataset.placeholder = 'Artist';
                currentElement.textContent = '';
            } else if (currentField === 'title') {
                currentElement.classList.add('empty-field');
                currentElement.dataset.placeholder = 'Song Title';
                currentElement.textContent = '';
            }
        }

        // Check for changes on current field
        this.checkForChanges();

        // Find next field
        const nextField = fieldOrder[currentIndex + 1];
        let nextElement = null;

        if (nextField === 'artist') {
            nextElement = this.artistElement;
        } else if (nextField === 'title') {
            nextElement = this.titleElement;
        } else {
            // Section field
            const section = this.sections[nextField];
            nextElement = section?.content;
        }

        if (nextElement) {
            // Small delay to ensure previous field is saved
            setTimeout(() => {
                this.enterEditMode(nextElement);
            }, 50);
        }
    }

    enterEditMode(element) {
        if (!element) {
            return;
        }

        // If already in edit mode, do nothing
        if (element.getAttribute('contenteditable') === 'true') {
            return;
        }

        // Exit other edit modes
        document.querySelectorAll('.editable-field[contenteditable="true"]').forEach(el => {
            el.setAttribute('contenteditable', 'false');
            el.classList.remove('editing');
            // Remove chord button if exists
            const chordBtn = el.parentElement?.querySelector('.chord-modal-btn-detail');
            if (chordBtn) {
                chordBtn.remove();
            }
        });

        if (!this.currentSongId) return;
        
        const song = this.songManager.getSongById(this.currentSongId);
        if (song && song.isPublic) {
            if (!this.songManager.canEditPublicSong(song)) {
                this.showInfoModal('Access Denied', 'Editing this public song is restricted to the original submitter or an admin.');
                return;
            }
        }

        // Remove placeholder when entering edit mode
        if (element.classList.contains('empty-field')) {
            element.classList.remove('empty-field');
            element.removeAttribute('data-placeholder');
            // Clear text content so placeholder doesn't interfere
            if (!element.textContent.trim()) {
                element.textContent = '';
            }
        }

        // Enable editing
        element.setAttribute('contenteditable', 'true');
        element.setAttribute('spellcheck', 'false');
        element.setAttribute('autocorrect', 'off');
        element.setAttribute('autocapitalize', 'none');
        element.classList.add('editing');

        // Add chord button for chord fields (verse, preChorus, chorus, bridge)
        try {
            const fieldName = element.dataset.field;
            const chordFields = ['verse', 'preChorus', 'chorus', 'bridge'];
            if (chordFields.includes(fieldName) && this.chordModal) {
                this.addChordButton(element, fieldName);
            }
        } catch (error) {
            console.warn('Error adding chord button, continuing with edit mode:', error);
            // Don't prevent editing if button addition fails
        }

        // Focus and select text
        // Use longer timeout for iPad/iOS to ensure keyboard appears
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const timeout = isIOS ? 300 : 50;

        setTimeout(() => {
            try {
                element.focus();

                // For iPad/iOS: trigger a click event to ensure keyboard appears
                // This is necessary because iOS requires user interaction to show keyboard
                if (isIOS) {
                    // Simulate a click event to trigger keyboard on iOS/iPad
                    const clickEvent = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    element.dispatchEvent(clickEvent);

                    // Try focus again after click event
                    setTimeout(() => {
                        element.focus();
                    }, 50);
                }

                // Select all text if it's a single line field (artist, title)
                // Also handle placeholder text
                if (element === this.artistElement || element === this.titleElement) {
                    // If element is empty, don't select anything (just focus for editing)
                    if (element.textContent.trim() === '') {
                        // Just focus, cursor will be at start
                        // For iOS: place cursor at start explicitly
                        const range = document.createRange();
                        range.setStart(element, 0);
                        range.setEnd(element, 0);
                        const selection = window.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(range);
                    } else {
                        const range = document.createRange();
                        range.selectNodeContents(element);
                        const selection = window.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                } else {
                    // For multi-line fields, place cursor at end
                    const range = document.createRange();
                    range.selectNodeContents(element);
                    range.collapse(false);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            } catch (error) {
                console.warn('Error focusing element:', error);
            }
        }, timeout);
    }

    addChordButton(element, fieldName) {
        // Remove existing dynamic tool buttons if any
        const section = element.closest('.song-chord-section');
        if (section) {
            const existingDynamic = section.querySelector('.bar-divider-btn-dynamic');
            if (existingDynamic) existingDynamic.remove();

            const existingBtn = section.querySelector('.chord-modal-btn-detail');
            if (existingBtn) existingBtn.remove();
        }

        // Create tool buttons container if not exists or use section header
        const sectionHeader = section?.querySelector('.chord-section-title');
        if (!sectionHeader) return;

        // Wrap title text in a span if not already wrapped
        if (!sectionHeader.querySelector('.chord-section-title-text')) {
            const titleText = sectionHeader.textContent || sectionHeader.innerText || '';
            const titleSpan = document.createElement('span');
            titleSpan.className = 'chord-section-title-text';
            titleSpan.textContent = titleText;
            sectionHeader.textContent = '';
            sectionHeader.appendChild(titleSpan);
        }

        // Create chord button (🎵)
        const chordBtn = document.createElement('button');
        chordBtn.type = 'button';
        chordBtn.className = 'chord-modal-btn-detail';
        chordBtn.innerHTML = '🎵';
        chordBtn.title = 'Add chords';
        chordBtn.style.marginLeft = '5px';
        chordBtn.style.cursor = 'pointer';
        chordBtn.style.border = 'none';
        chordBtn.style.background = 'none';
        chordBtn.style.fontSize = '1.2em';
        chordBtn.style.verticalAlign = 'middle';

        chordBtn.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
        });

        chordBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (element.getAttribute('contenteditable') !== 'true') {
                element.setAttribute('contenteditable', 'true');
                element.classList.add('editing');
            }
            setTimeout(() => {
                if (this.chordModal) {
                    this.chordModal.show(element, fieldName, () => {
                        this.checkForChanges();
                    });
                }
            }, 0);
        });

        sectionHeader.appendChild(chordBtn);
    }

    checkForChanges() {
        if (!this.currentSongId) return;

        const song = this.songManager.getSongById(this.currentSongId);
        if (!song) return;

        // Ensure originalSongData is set (should be set in show(), but fallback for safety)
        if (!this.originalSongData) {
            this.originalSongData = {
                artist: song.artist || '',
                title: song.title || '',
                verse: song.verse || '',
                verseTitle: song.verseTitle || 'Block 1',
                verseCue: song.verseCue || '',
                preChorus: song.preChorus || '',
                preChorusTitle: song.preChorusTitle || 'Block 3',
                preChorusCue: song.preChorusCue || '',
                chorus: song.chorus || '',
                chorusTitle: song.chorusTitle || 'Block 2',
                chorusCue: song.chorusCue || '',
                bridge: song.bridge || '',
                bridgeTitle: song.bridgeTitle || 'Block 4',
                bridgeCue: song.bridgeCue || '',
                key: song.key || '',
                tempo: song.tempo || (song.chordData ? song.chordData.tempo : '') || '',
                fullLyrics: song.fullLyrics || song.lyrics || '',
                patchDetails: song.patchDetails || '',
                practiceCount: song.practiceCount || '',
                lyricOffset: song.lyricOffset || 0,
                performAbility: song.performAbility || 0,
                songNotes: song.songNotes || '',
                capo: song.capo || 0,
                isPublic: song.isPublic || false
            };
        }

        // Check current values - use textContent directly (not trimmed) to detect all changes including spaces
        // For title, use originalTitle from dataset (without key) or extract from textContent
        const titleText = this.titleElement ? (this.titleElement.dataset.originalTitle || this.titleElement.textContent.replace(/\s*\([^)]*\)\s*$/, '')) : '';
        const currentData = {
            artist: this.artistElement ? this.artistElement.textContent : '',
            title: titleText,
            verse: this.getOriginalSectionValue('verse'),
            verseTitle: this.sections.verse?.title ? this.sections.verse.title.textContent : '',
            verseCue: this.sections.verse?.cue ? this.sections.verse.cue.value : '',
            preChorus: this.getOriginalSectionValue('preChorus'),
            preChorusTitle: this.sections.preChorus?.title ? this.sections.preChorus.title.textContent : '',
            preChorusCue: this.sections.preChorus?.cue ? this.sections.preChorus.cue.value : '',
            chorus: this.getOriginalSectionValue('chorus'),
            chorusTitle: this.sections.chorus?.title ? this.sections.chorus.title.textContent : '',
            chorusCue: this.sections.chorus?.cue ? this.sections.chorus.cue.value : '',
            bridge: this.getOriginalSectionValue('bridge'),
            bridgeTitle: this.sections.bridge?.title ? this.sections.bridge.title.textContent : '',
            bridgeCue: this.sections.bridge?.cue ? this.sections.bridge.cue.value : '',
            key: this.keyDisplay ? this.keyDisplay.textContent : '',
            tempo: this.bpmDisplay ? this.bpmDisplay.textContent : '',
            fullLyrics: this.fullLyricsInput ? this.fullLyricsInput.value : '',
            patchDetails: this.patchDetailsInput ? this.patchDetailsInput.value : '',
            practiceCount: this.practiceCountInput ? this.practiceCountInput.value : '',
            lyricOffset: this.lyricOffsetInput ? parseFloat(this.lyricOffsetInput.value) || 0 : 0,
            performAbility: this.currentAbilityValue || 0,
            songNotes: this.notesInput ? this.notesInput.value : '',
            capo: this.capoValue || 0,
            isPublic: this.originalSongData ? this.originalSongData.isPublic : false
        };

        // Compare with original - normalize whitespace for comparison (trim each value)
        // This way we detect any change, including spaces, but ignore leading/trailing whitespace differences
        const normalizeData = (data) => ({
            artist: (data.artist || '').trim(),
            title: (data.title || '').trim(),
            verse: (data.verse || '').trim(),
            verseTitle: (data.verseTitle || '').trim(),
            verseCue: (data.verseCue || '').trim(),
            preChorus: (data.preChorus || '').trim(),
            preChorusTitle: (data.preChorusTitle || '').trim(),
            preChorusCue: (data.preChorusCue || '').trim(),
            chorus: (data.chorus || '').trim(),
            chorusTitle: (data.chorusTitle || '').trim(),
            chorusCue: (data.chorusCue || '').trim(),
            bridge: (data.bridge || '').trim(),
            bridgeTitle: (data.bridgeTitle || '').trim(),
            bridgeCue: (data.bridgeCue || '').trim(),
            key: (data.key || '').trim(),
            fullLyrics: (data.fullLyrics || '').trim(),
            patchDetails: (data.patchDetails || '').trim(),
            practiceCount: (data.practiceCount || '').trim(),
            lyricOffset: parseFloat(data.lyricOffset) || 0,
            performAbility: parseInt(data.performAbility) || 0,
            songNotes: (data.songNotes || '').trim(),
            capo: parseInt(data.capo) || 0,
            isPublic: !!data.isPublic
        });

        const normalizedCurrent = normalizeData(currentData);
        const normalizedOriginal = normalizeData(this.originalSongData);

        // Compare normalized data
        this.hasUnsavedChanges = JSON.stringify(normalizedCurrent) !== JSON.stringify(normalizedOriginal);

        // Show/hide save button
        if (this.saveBtn) {
            if (this.hasUnsavedChanges) {
                this.saveBtn.classList.remove('hidden');
            } else {
                this.saveBtn.classList.add('hidden');
            }
        }
    }

    async handleDeleteSong() {
        if (!this.currentSongId) return;

        const song = this.songManager.getSongById(this.currentSongId);
        if (!song) return;

        const performDelete = async () => {
            try {
                const success = await this.songManager.deleteSong(this.currentSongId);
                if (success) {
                    // Allow hiding even if unsaved changes exist
                    this.hasUnsavedChanges = false;
                    await this.hide();

                    // Refresh the song list in the main UI if callback exists
                    if (this.onUpdate) {
                        this.onUpdate();
                    }
                } else {
                    this.showInfoModal('Delete Failed', 'Failed to delete song. Please try again.');
                }
            } catch (error) {
                console.error('Error deleting song:', error);
                this.showInfoModal('Error', 'An error occurred while deleting the song.');
            }
        };

        if (window.appInstance && window.appInstance.confirmationModal) {
            window.appInstance.confirmationModal.show(
                'Confirm Deletion',
                `Are you sure you want to delete "<strong>${song.title}</strong>" by <strong>${song.artist}</strong>?`,
                performDelete,
                null,
                'Delete',
                'Cancel',
                'danger'
            );
        } else {
            // Fallback to confirm if modal instance is not available
            const confirmed = confirm(`Are you sure you want to delete "${song.title}" by ${song.artist}?`);
            if (confirmed) {
                performDelete();
            }
        }
    }

    async handlePublishSong() {
        if (!this.currentSongId) return;
        const song = this.songManager.getSongById(this.currentSongId);
        if (!song) return;

        if (song.isPublic) {
            this.showInfoModal('Already Public', 'This song is already published online.');
            return;
        }

        const performPublish = async () => {
            if (!this.firebaseManager || !this.firebaseManager.isAuthenticated()) {
                this.showInfoModal('Login Required', 'You must be logged in to publish a song.');
                return;
            }

            const user = this.firebaseManager.getCurrentUser();
            
            try {
                // Update song with public flag and submitter
                await this.songManager.updateSong(this.currentSongId, {
                    isPublic: true,
                    submittedBy: user.uid
                });
                
                // Show success feedback
                if (window.appInstance && window.appInstance.confirmationModal) {
                     this.showInfoModal('Success!', `"${song.title}" is now published online and visible to everyone.`);
                } else {
                    alert(`"${song.title}" is now published online!`);
                }
                
                // Refresh full UI by re-showing the current song (this updates the badge and the hamburger menu)
                const updatedSong = this.songManager.getSongById(this.currentSongId);
                await this.show(updatedSong, false, this.isRandomMode, this.isPracticeRandomMode);
                
            } catch (error) {
                console.error('Publish error:', error);
                this.showInfoModal('Publish Failed', 'An error occurred while uploading. Please check your connection.');
            }
        };

        if (window.appInstance && window.appInstance.confirmationModal) {
            window.appInstance.confirmationModal.show(
                'Publish Song Online',
                `Do you want to publish "<strong>${song.title}</strong>" by <strong>${song.artist}</strong> online? It will be shared in the public library and visible to all users.`,
                performPublish,
                null,
                'Publish Online',
                'Cancel',
                'primary'
            );
        } else {
            if (confirm(`Do you want to publish "${song.title}" online?`)) {
                performPublish();
            }
        }
    }

    async forkCurrentSong(updates = {}) {
        const song = this.songManager.getSongById(this.currentSongId);
        if (!song) return null;

        const user = this.firebaseManager ? this.firebaseManager.getCurrentUser() : null;
        const uid = user ? user.uid : 'guest';

        // Prepare forked song data
        const forkData = {
            ...song,
            ...updates,
            id: null, // Let SongManager generate a new one
            isPublic: false,
            favorite: false,
            submittedBy: uid,
            dateAdded: new Date().toISOString()
        };

        // Add as new song
        const newSong = await this.songManager.addSong(forkData);
        if (newSong) {
            // Update modal state to point to the new song
            this.currentSongId = newSong.id;
            this.hasUnsavedChanges = false;
            
            // Refresh modal UI to show private status (e.g. badge update)
            // CRITICAL: Pass the full song object, not just the ID, because show() expects an object
            await this.show(newSong, false, this.isRandomMode, this.isPracticeRandomMode);
            
            this.showInfoModal('Private Copy Created', 'This is a public song. A private copy has been created in your library for your edits.');
            
            // Notify global app instance to refresh the main table
            if (this.onUpdate) {
                this.onUpdate();
            }
        }
        return newSong;
    }

    async saveChanges(shouldClose = false) {
        if (!this.currentSongId || (!this.hasUnsavedChanges && !shouldClose)) {
            if (shouldClose) await this.hide();
            return;
        }

        // Permission check: cannot save public songs if user is not owner or admin
        const song = this.songManager.getSongById(this.currentSongId);
        const canEdit = this.songManager.canEditPublicSong(song);

        const artist = this.artistElement ? this.artistElement.textContent.trim() : '';
        const originalTitle = this.titleElement ? (this.titleElement.dataset.originalTitle || this.titleElement.textContent.replace(/\s*\([^)]*\)\s*$/, '')).trim() : '';

        if (!artist || !originalTitle) {
            this.showInfoModal('Required Fields', 'Band/Artist Name and Song Title are required and cannot be empty.');
            return;
        }

        const updates = {};

        // Get current values from editable fields
        if (this.artistElement) {
            updates.artist = artist;
        }
        if (this.titleElement) {
            updates.title = originalTitle;
        }
        if (this.sections.verse?.editInput) {
            updates.verse = this.getOriginalSectionValue('verse');
        }
        if (this.sections.verse?.title) {
            updates.verseTitle = this.sections.verse.title.textContent.trim();
        }
        if (this.sections.verse?.cue) {
            updates.verseCue = this.sections.verse.cue.value.trim();
        }
        if (this.sections.preChorus?.editInput) {
            updates.preChorus = this.getOriginalSectionValue('preChorus');
        }
        if (this.sections.preChorus?.title) {
            updates.preChorusTitle = this.sections.preChorus.title.textContent.trim();
        }
        if (this.sections.preChorus?.cue) {
            updates.preChorusCue = this.sections.preChorus.cue.value.trim();
        }
        if (this.sections.chorus?.editInput) {
            updates.chorus = this.getOriginalSectionValue('chorus');
        }
        if (this.sections.chorus?.title) {
            updates.chorusTitle = this.sections.chorus.title.textContent.trim();
        }
        if (this.sections.chorus?.cue) {
            updates.chorusCue = this.sections.chorus.cue.value.trim();
        }
        if (this.sections.bridge?.editInput) {
            updates.bridge = this.getOriginalSectionValue('bridge');
        }
        if (this.sections.bridge?.title) {
            updates.bridgeTitle = this.sections.bridge.title.textContent.trim();
        }
        if (this.sections.bridge?.cue) {
            updates.bridgeCue = this.sections.bridge.cue.value.trim();
        }
        if (this.keyDisplay) {
            updates.key = this.keyDisplay.textContent.trim();
        }
        if (this.bpmDisplay) {
            const newTempo = this.bpmDisplay.textContent.trim();
            updates.tempo = newTempo;

            // Sync with chordData if it exists to ensure timeline matches
            const song = this.songManager.getSongById(this.currentSongId);
            if (song && song.chordData) {
                // We create a copy of chordData to avoid direct mutation before save
                updates.chordData = { ...song.chordData, tempo: newTempo };
            }
        }
        if (this.fullLyricsInput) {
            updates.fullLyrics = this.fullLyricsInput.value.trim();
        }
        if (this.patchDetailsInput) {
            updates.patchDetails = this.patchDetailsInput.value.trim();
        }
        if (this.practiceCountInput) {
            updates.practiceCount = this.practiceCountInput.value.trim();
        }
        if (this.lyricOffsetInput) {
            updates.lyricOffset = parseFloat(this.lyricOffsetInput.value) || 0;
        }
        if (this.currentAbilityValue !== undefined) {
            updates.performAbility = this.currentAbilityValue;
        }
        if (this.notesInput) {
            updates.songNotes = this.notesInput.value.trim();
        }
        if (this.capoValue !== undefined) {
            updates.capo = parseInt(this.capoValue) || 0;
        }

        // Update song or create fork
        if (song && song.isPublic && !canEdit) {
            console.log('SongDetailModal: Detected public song edit on save - creating private copy...');
            await this.forkCurrentSong(updates);
            if (shouldClose) await this.hide();
            return; // Exit as forkCurrentSong handles its own workflow
        } else {
            await this.songManager.updateSong(this.currentSongId, updates);
        }

        // Update originalSongData to current saved values so they become the new baseline
        const savedSong = this.songManager.getSongById(this.currentSongId);
        if (savedSong) {
            this.originalSongData = {
                artist: savedSong.artist || '',
                title: savedSong.title || '',
                verse: savedSong.verse || '',
                verseTitle: savedSong.verseTitle || 'Block 1',
                verseCue: savedSong.verseCue || '',
                preChorus: savedSong.preChorus || '',
                preChorusTitle: savedSong.preChorusTitle || 'Block 3',
                preChorusCue: savedSong.preChorusCue || '',
                chorus: savedSong.chorus || '',
                chorusTitle: savedSong.chorusTitle || 'Block 2',
                chorusCue: savedSong.chorusCue || '',
                bridge: savedSong.bridge || '',
                bridgeTitle: savedSong.bridgeTitle || 'Block 4',
                bridgeCue: savedSong.bridgeCue || '',
                key: savedSong.key || '',
                fullLyrics: savedSong.fullLyrics || '',
                patchDetails: savedSong.patchDetails || '',
                practiceCount: savedSong.practiceCount || '',
                lyricOffset: savedSong.lyricOffset || 0,
                performAbility: savedSong.performAbility || 0,
                songNotes: savedSong.songNotes || '',
                capo: savedSong.capo || 0,
                isPublic: savedSong.isPublic || false
            };
        }

        // Reset change tracking BEFORE calling onUpdate or hide
        this.hasUnsavedChanges = false;

        // Hide save button
        if (this.saveBtn) {
            this.saveBtn.classList.add('hidden');
        }

        // Exit edit mode and remove chord buttons
        document.querySelectorAll('.editable-field[contenteditable="true"]').forEach(el => {
            el.setAttribute('contenteditable', 'false');
            el.classList.remove('editing');
            // Remove chord buttons
            const section = el.closest('.song-chord-section');
            if (section) {
                const chordBtn = section.querySelector('.chord-modal-btn-detail');
                if (chordBtn) {
                    chordBtn.remove();
                }
            }
        });

        if (shouldClose) {
            await this.hide();
        }

        // Notify parent to refresh table
        if (this.onUpdate) {
            this.onUpdate();
        }

        // If the Chord Timeline is alive (open or minimized), sync its toolbar with new chord data
        if (this.scrollingChordsFrame && this.scrollingChordsFrame.contentWindow &&
            this.scrollingChordsFrame.src && !this.scrollingChordsFrame.src.endsWith('about:blank')) {
            const savedSong = this.songManager.getSongById(this.currentSongId);
            if (savedSong) {
                const sections = [
                    { name: savedSong.verseTitle || 'BLOCK 1', type: 'verse', text: savedSong.verse || '' },
                    { name: savedSong.chorusTitle || 'BLOCK 2', type: 'chorus', text: savedSong.chorus || '' },
                    { name: savedSong.preChorusTitle || 'BLOCK 3', type: 'pre-chorus', text: savedSong.preChorus || '' },
                    { name: savedSong.bridgeTitle || 'BLOCK 4', type: 'bridge', text: savedSong.bridge || '' }
                ];

                const suggestedChordsGrouped = sections.map(section => {
                    const trimmedText = (section.text || '').trim();
                    const found = trimmedText ? trimmedText.match(/\||\d+x|[^\s|]+/g) || [] : [];
                    return { section: section.name, type: section.type, chords: found };
                }).filter(group => group.chords.length > 0);

                this.scrollingChordsFrame.contentWindow.postMessage({
                    type: 'updateSuggestedChords',
                    suggestedChords: suggestedChordsGrouped,
                    instrumentMode: this.instrumentMode
                }, '*');
            }
        }

        // Update relevant UI parts
        this.updateYouTubeButton();
        this.updateKeyDisplay();
    }

    showUnsavedChangesDialog() {
        // Re-fetch elements if they were not found during initialization (e.g. timing issues)
        if (!this.confirmationModal) this.confirmationModal = document.getElementById('confirmationModal');
        if (!this.confirmSaveBtn) this.confirmSaveBtn = document.getElementById('confirmSaveBtn');
        if (!this.confirmDontSaveBtn) this.confirmDontSaveBtn = document.getElementById('confirmDontSaveBtn');

        return new Promise((resolve) => {
            if (!this.confirmationModal || !this.confirmSaveBtn || !this.confirmDontSaveBtn) {
                // Fallback to confirm if elements are still missing
                const result = confirm('You have unsaved changes. Do you want to save them first?');
                resolve(result);
                return;
            }

            const handleSave = () => {
                cleanup();
                resolve(true);
            };

            const handleDontSave = () => {
                cleanup();
                resolve(false);
            };

            const cleanup = () => {
                this.confirmSaveBtn.removeEventListener('click', handleSave);
                this.confirmDontSaveBtn.removeEventListener('click', handleDontSave);
                this.confirmationModal.classList.add('hidden');
            };

            this.confirmSaveBtn.addEventListener('click', handleSave);
            this.confirmDontSaveBtn.addEventListener('click', handleDontSave);
            this.confirmationModal.classList.remove('hidden');
        });
    }

    showInfoModal(title, message) {
        if (!this.infoModal) this.infoModal = document.getElementById('infoModal');
        if (!this.infoModalTitle) this.infoModalTitle = document.getElementById('infoModalTitle');
        if (!this.infoModalMessage) this.infoModalMessage = document.getElementById('infoModalMessage');
        if (!this.infoModalOkBtn) this.infoModalOkBtn = document.getElementById('infoModalOkBtn');
        if (!this.infoModalClose) this.infoModalClose = document.getElementById('infoModalClose');

        if (!this.infoModal || !this.infoModalOkBtn) {
            alert(message);
            return;
        }

        this.infoModalTitle.textContent = title;
        this.infoModalMessage.textContent = message;

        const cleanup = () => {
            this.infoModalOkBtn.removeEventListener('click', handleOk);
            if (this.infoModalClose) this.infoModalClose.removeEventListener('click', handleOk);
            this.infoModal.removeEventListener('click', handleBgClick);
            this.infoModal.classList.add('hidden');
        };

        const handleOk = () => {
            cleanup();
        };

        const handleBgClick = (e) => {
            if (e.target === this.infoModal) {
                cleanup();
            }
        };

        this.infoModalOkBtn.addEventListener('click', handleOk);
        if (this.infoModalClose) this.infoModalClose.addEventListener('click', handleOk);
        this.infoModal.addEventListener('click', handleBgClick);
        this.infoModal.classList.remove('hidden');
    }

    async handleTimelineClose() {
        if (this.isTimelineClosing) return;
        if (!this.scrollingChordsModal || this.scrollingChordsModal.classList.contains('hidden')) {
            console.log('Timeline already closed or closing.');
            return;
        }
        this.isTimelineClosing = true;
        console.log('Closing Scrolling Chords Modal - checking for unsaved changes');

        try {
            const hasChanges = await this.checkTimelineChanges();

            if (hasChanges) {
                const wantsToSave = await this.showUnsavedChangesDialog();
                if (wantsToSave === true) { // Save
                    if (this.scrollingChordsFrame && this.scrollingChordsFrame.contentWindow) {
                        this.scrollingChordsFrame.contentWindow.postMessage({ type: 'saveChanges' }, '*');
                    }
                    // Small delay to ensure save message is processed before closing iframe
                    await new Promise(r => setTimeout(r, 200));
                    this._finishClosingTimeline();
                } else if (wantsToSave === false) { // Don't Save
                    this._finishClosingTimeline();
                }
                // If null (e.g. if we add cancel later), do nothing
            } else {
                this._finishClosingTimeline();
            }
        } catch (e) {
            console.error('Error during timeline close check:', e);
            this._finishClosingTimeline(); // Fallback
        }
    }

    async checkTimelineChanges() {
        if (!this.scrollingChordsFrame || !this.scrollingChordsFrame.contentWindow) return false;

        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                this.timelineChangesResolve = null;
                resolve(false); // Assume no changes on timeout
            }, 600);

            this.timelineChangesResolve = (hasChanges) => {
                clearTimeout(timeout);
                resolve(hasChanges);
            };

            this.scrollingChordsFrame.contentWindow.postMessage({ type: 'checkUnsavedChanges' }, '*');
        });
    }

    _updateTimelineMinimizedIndicator(minimized) {
        if (!this.scrollingChordsBtn) return;
        if (minimized) {
            this.scrollingChordsBtn.classList.add('timeline-minimized');
        } else {
            this.scrollingChordsBtn.classList.remove('timeline-minimized');
        }
    }

    _finishClosingTimeline() {
        console.log('Finishing timeline close...');
        this.isTimelineClosing = false;
        this._timelineMinimized = false;
        this._updateTimelineMinimizedIndicator(false);

        // 1. Stop Audio
        if (this.scrollingChordsFrame && this.scrollingChordsFrame.contentWindow) {
            this.scrollingChordsFrame.contentWindow.postMessage({ type: 'stopAudio' }, '*');
        }

        // 2. Hide Modal
        if (this.scrollingChordsModal) {
            this.scrollingChordsModal.classList.add('hidden');
        }

        if (window.appInstance) {
            window.appInstance.popModalState('scrollingChords');
        }

        // 3. Restore focus
        if (this.scrollingChordsBtn) {
            this.scrollingChordsBtn.focus();
        } else {
            window.focus();
        }
    }

    sendDataToTimeline() {
        const scrollingChordsFrame = document.getElementById('scrollingChordsFrame');
        if (!this.currentSongId || !scrollingChordsFrame || !scrollingChordsFrame.contentWindow) return;

        const song = this.songManager.getSongById(this.currentSongId);
        if (!song) return;

        console.log('Sending chord data to Timeline view', song);

        // Extract chords from song blocks for the toolbar
        const sections = [
            { name: song.verseTitle || 'BLOCK 1', type: 'verse', text: song.verse || '' },
            { name: song.chorusTitle || 'BLOCK 2', type: 'chorus', text: song.chorus || '' },
            { name: song.preChorusTitle || 'BLOCK 3', type: 'pre-chorus', text: song.preChorus || '' },
            { name: song.bridgeTitle || 'BLOCK 4', type: 'bridge', text: song.bridge || '' }
        ];

        // Grouped blocks follow the order of fields: Verse, Chorus, Pre-Chorus, Bridge
        const suggestedChordsGrouped = sections.map(section => {
            const trimmedText = (section.text || '').trim();
            const found = trimmedText ? trimmedText.match(/\||\d+x|[^\s|]+/g) || [] : [];
            return {
                section: section.name,
                type: section.type,
                chords: found
            };
        }).filter(group => group.chords.length > 0);



        // Prepare data for timeline
        const timelineData = song.chordData ? { ...song.chordData } : { chords: [] };
        if (song.tempo) timelineData.tempo = song.tempo;

        // Send data
        const lastPosition = (this._timelinePositions && this._timelinePositions[this.currentSongId]) || 0;
        scrollingChordsFrame.contentWindow.postMessage({
            type: 'loadChordData',
            data: timelineData,
            youtubeUrl: song.youtubeUrl || '',
            artist: song.artist,
            songTitle: song.title,
            title: (song.artist || '') + ' - ' + (song.title || ''),
            suggestedChords: suggestedChordsGrouped,
            fullLyrics: song.fullLyrics || '', // Pass lyrics for HUD
            lyrics: song.lyrics || '', // Fallback
            lyricOffset: song.lyricOffset || 0, // New Offset
            lastPosition: lastPosition, // Restore last playback position
            instrumentMode: this.instrumentMode,
            key: this.getSongKey() || 'C',
            capo: this.capoValue || 0,
            isPublic: !!song.isPublic,
            canEdit: this.songManager.canEditPublicSong(song)
        }, '*');
    }

    navigatePrevious() {
        if (!this.currentSongId || this.allSongs.length === 0) return;

        if (this.isPracticeRandomMode) {
            if (this.onPracticeRandomPrev) {
                this.onPracticeRandomPrev();
            }
            return;
        }

        if (this.isRandomMode) return;

        const currentIndex = this.allSongs.findIndex(song => song.id === this.currentSongId);
        if (currentIndex > 0) {
            const previousSong = this.allSongs[currentIndex - 1];
            if (this.onNavigate) {
                this.onNavigate(previousSong.id);
            }
        }
    }

    navigateNext() {
        if (!this.currentSongId || this.allSongs.length === 0) return;

        if (this.isPracticeRandomMode) {
            if (this.onPracticeRandomNext) {
                this.onPracticeRandomNext();
            }
            return;
        }

        if (this.isRandomMode) {
            // Pick a random song that is not the current one
            let randomIndex;
            if (this.allSongs.length > 1) {
                do {
                    randomIndex = Math.floor(Math.random() * this.allSongs.length);
                } while (this.allSongs[randomIndex].id === this.currentSongId);
            } else {
                randomIndex = 0;
            }

            const randomSong = this.allSongs[randomIndex];
            if (this.onNavigate) {
                this.onNavigate(randomSong.id, true);
            }
            return;
        }

        const currentIndex = this.allSongs.findIndex(song => song.id === this.currentSongId);
        if (currentIndex < this.allSongs.length - 1) {
            const nextSong = this.allSongs[currentIndex + 1];
            if (this.onNavigate) {
                this.onNavigate(nextSong.id);
            }
        }
    }

    async show(song, autoEditArtist = false, isRandomMode = false, isPracticeRandomMode = false) {
        if (!song) {
            await this.hide();
            return;
        }

        // Save any unsaved changes before switching songs
        if (this.hasUnsavedChanges && this.currentSongId) {
            const shouldSave = await this.showUnsavedChangesDialog();
            if (shouldSave) {
                await this.saveChanges();
            } else {
                // Discard changes and reload original data
                this.discardChanges();
            }
        }

        // Reset lyrics ticker scroll position for the new song
        this.lyricsScrollPos = 0;

        this.currentSongId = song.id;
        this.capoValue = parseInt(song.capo) || 0; // Load Capo from song
        this.updateCapoUI();
        this.hasUnsavedChanges = false;
        this.isRandomMode = isRandomMode;
        this.isPracticeRandomMode = isPracticeRandomMode;
        this.transposeOffset = 0;

        // Set originalSongData immediately when showing a song, before any user interaction
        this.originalSongData = {
            artist: song.artist || '',
            title: song.title || '',
            verse: song.verse || '',
            verseTitle: song.verseTitle || 'Block 1',
            verseCue: song.verseCue || '',
            preChorus: song.preChorus || '',
            preChorusTitle: song.preChorusTitle || 'Block 2',
            preChorusCue: song.preChorusCue || '',
            chorus: song.chorus || '',
            chorusTitle: song.chorusTitle || 'Block 3',
            chorusCue: song.chorusCue || '',
            bridge: song.bridge || '',
            bridgeTitle: song.bridgeTitle || 'Block 4',
            bridgeCue: song.bridgeCue || '',
            key: song.key || '',
            tempo: song.tempo || (song.chordData ? song.chordData.tempo : '') || '',
            youtubeUrl: song.youtubeUrl || '',
            fullLyrics: song.fullLyrics || song.lyrics || '',
            patchDetails: song.patchDetails || '',
            practiceCount: song.practiceCount !== undefined ? song.practiceCount.toString() : '0',
            lyricOffset: song.lyricOffset || 0,
            performAbility: song.performAbility || 0,
            songNotes: song.songNotes || '',
            capo: song.capo || 0,
            isPublic: song.isPublic || false,
            submittedBy: song.submittedBy || ''
        };

        // Enforce read-only mode for non-owners
        const canEdit = this.songManager.canEditPublicSong(song);
        if (this.titleElement) {
            const existingBadge = this.titleElement.querySelector('.public-badge-detail');
            if (existingBadge) existingBadge.remove();
        }

        // Update Status Icon (🔒 for Public, Hidden for Private)
        if (this.statusIcon) {
            if (song.isPublic) {
                this.statusIcon.classList.remove('hidden');
            } else {
                this.statusIcon.classList.add('hidden');
            }
        }

        // Apply read-only mode for public songs the user cannot edit
        if (this.modal) {
            if (song.isPublic && !canEdit) {
                this.modal.classList.add('public-read-only');
            } else {
                this.modal.classList.remove('public-read-only');
            }
        }

        // Handle 'Publish' button visibility in hamburger menu
        if (this.publishSongBtn) {
            // Only show 'Publish' for private songs that the user has permission to edit.
            // (For private songs, canEdit is generally true unless it's someone else's song shared via local cache)
            if (song.isPublic || !canEdit) {
                this.publishSongBtn.style.display = 'none';
            } else {
                this.publishSongBtn.style.display = ''; // Reset to default
            }
        }

        // Update artist and title
        if (this.artistElement) {
            const artistText = song.artist || '';
            this.artistElement.textContent = artistText;
            this.artistElement.setAttribute('contenteditable', 'false');
            this.artistElement.classList.remove('editing');

            // Add placeholder styling if empty
            if (!artistText.trim()) {
                this.artistElement.classList.add('empty-field');
                this.artistElement.dataset.placeholder = 'Artist';
            } else {
                this.artistElement.classList.remove('empty-field');
                this.artistElement.removeAttribute('data-placeholder');
            }
        }
        if (this.titleElement) {
            const titleText = song.title || '';
            let keyText = song.key || '';
            let isGuessed = false;

            // If no explicit key, try to detect it
            if (!keyText.trim() && this.keyDetector) {
                const detectedKey = this.keyDetector.detectFromSong(song);
                if (detectedKey) {
                    keyText = detectedKey;
                    isGuessed = true;
                }
            }

            // Display title
            this.titleElement.textContent = titleText;

            // Update Key Display in Footer
            this.updateKeyDisplay();

            // Update BPM Display in Footer
            this.updateBpmDisplay();

            // Store original title without key for editing
            this.titleElement.dataset.originalTitle = titleText;
            this.titleElement.setAttribute('contenteditable', 'false');
            this.titleElement.classList.remove('editing');

            // Add placeholder styling if empty
            if (!titleText.trim()) {
                this.titleElement.classList.add('empty-field');
                this.titleElement.dataset.placeholder = 'Song Title';
                // Clear display text if title is empty
                this.titleElement.innerHTML = '';
            } else {
                this.titleElement.classList.remove('empty-field');
                this.titleElement.removeAttribute('data-placeholder');
            }
        }

        // Update favorite button
        if (this.favoriteBtn) {
            this.updateFavoriteButton(song.favorite || false);
        }

        // Update Practice button state
        if (this.practiceBtn) {
            const isPractice = this.isPracticeChecker ? this.isPracticeChecker(song.id) : false;
            this.setPracticeState(isPractice);
        }

        // Update YouTube button
        if (this.youtubeBtn) {
            this.updateYouTubeButton(song.youtubeUrl || '', song.externalUrl || '');
        }

        // Update YouTube Play button visibility
        if (this.youtubePlayBtn) {
            this.updateYouTubePlayButton(song.youtubeUrl || '');
        }

        // Update External URL button visibility
        if (this.externalUrlBtn) {
            this.updateExternalUrlButton(song.externalUrl || '');
        }

        // Hide save button
        if (this.saveBtn) {
            this.saveBtn.classList.add('hidden');
        }

        // Update navigation buttons
        this.updateNavigationButtons();

        // Render sections
        Object.keys(this.sections).forEach(key => {
            const section = this.sections[key];
            if (!section) return;

            const text = song[key] || '';
            const title = song[key + 'Title'] || `Block ${Object.keys(this.sections).indexOf(key) + 1}`;
            const cue = song[key + 'Cue'] || '';

            if (section.title) section.title.textContent = title;
            if (section.cue) section.cue.value = cue;
            if (section.editInput) {
                section.editInput.value = text;
                section.editInput.classList.add('hidden');
            }
            if (section.content) {
                section.content.classList.remove('hidden');
                this.renderChordBlock(key, text);
            }
            if (section.section) {
                section.section.classList.remove('hidden');
                section.section.classList.remove('editing');
                section.section.classList.remove('show-icons');
            }
        });

        // Update technical notes
        if (this.notesInput) {
            this.notesInput.value = song.songNotes || '';
        }

        // Show modal
        if (this.modal) {
            const user = this.songManager.firebaseManager.getCurrentUser();
            const uid = user ? user.uid : 'guest';

            const lyricsEnabled = localStorage.getItem(`feature-lyrics-enabled-${uid}`) !== 'false';
            const timelineEnabled = localStorage.getItem(`feature-timeline-enabled-${uid}`) !== 'false';

            const hasAnyLyrics = (song.fullLyrics && song.fullLyrics.trim() !== '') ||
                (song.lyrics && song.lyrics.trim() !== '') ||
                (song.verseCue || song.chorusCue || song.preChorusCue || song.bridgeCue) ||
                (song.verse || song.chorus || song.preChorus || song.bridge);

            if (this.lyricsBtn) {
                // Always show the lyrics button so users can click it to see instructions if empty
                this.lyricsBtn.style.display = 'flex';
            }
            if (this.scrollingChordsBtn) {
                this.scrollingChordsBtn.style.display = timelineEnabled ? 'flex' : 'none';
            }

            // Always show toggle center actions container for the instrument switch visibility
            const centerActions = document.querySelector('.song-detail-center-actions');
            if (centerActions) {
                centerActions.style.display = 'flex';
            }

            this.modal.classList.remove('hidden');
        }

        // Update Instrument UI
        this.updateInstrumentToggleUI();

        // Update practice counter display
        if (this.practiceCountDisplay) {
            this.practiceCountDisplay.textContent = song.practiceCount || '0';
        }

        // Auto-focus and enter edit mode for artist field if requested (for new songs)
        if (autoEditArtist && this.artistElement) {
            setTimeout(() => {
                this.enterEditMode(this.artistElement);
            }, 100);
        }

        // Populate Full Lyrics Input
        if (this.fullLyricsInput) {
            this.fullLyricsInput.value = song.fullLyrics || song.lyrics || '';
            if (this.lyricsStatusText) {
                const hasLyrics = (song.fullLyrics && song.fullLyrics.trim() !== '') || (song.lyrics && song.lyrics.trim() !== '');
                this.lyricsStatusText.style.display = hasLyrics ? 'block' : 'none';
            }
        }

        // Update lyrics ticker content if it is visible
        if (this.lyricsOverlay && !this.lyricsOverlay.classList.contains('hidden')) {
            this.updateLyricsTickerContent();
        }

        this.fetchThumbnail(song.artist, song.title);
    }

    async fetchThumbnail(artist, title) {
        const thumbElement = document.getElementById('songDetailThumbnail');
        if (!thumbElement) return;

        // Reset state without hiding immediately (to maintain height)
        // We use visibility: hidden or just clear src to avoid display:none collapse
        thumbElement.style.visibility = 'hidden';
        thumbElement.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // Transparent placeholder
        thumbElement.classList.remove('hidden'); // Ensure it's not display:none

        if (!artist || !title) return;

        // 1. Try Local Backup First (for fallback and offline support)
        const safeArtist = artist.replace(/[<>:"/\\|?*]/g, '');
        const safeTitle = title.replace(/[<>:"/\\|?*]/g, '');
        const localPath = `assets/thumbnails/${safeArtist}-${safeTitle}.jpg`;

        try {
            const localExists = await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(true);
                img.onerror = () => resolve(false);
                img.src = localPath;
            });

            if (localExists) {
                thumbElement.src = localPath;
                thumbElement.style.visibility = 'visible';
                thumbElement.classList.remove('hidden');
                return; // Local copy used, skip API call
            }
        } catch (e) {
            console.log("Local thumbnail check failed, trying Deezer.");
        }

        // 2. Fallback to Deezer API
        try {
            const query = encodeURIComponent(`${artist} ${title}`);
            const callbackName = 'deezerCallback_' + Math.round(1000000 * Math.random());

            // Create a promise to handle the JSONP response
            const responsePromise = new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    cleanup();
                    reject(new Error('JSONP timeout'));
                }, 5000);

                const cleanup = () => {
                    clearTimeout(timeoutId);
                    delete window[callbackName];
                    if (script && script.parentNode) {
                        script.parentNode.removeChild(script);
                    }
                };

                window[callbackName] = (data) => {
                    cleanup();
                    resolve(data);
                };

                const script = document.createElement('script');
                script.src = `https://api.deezer.com/search?q=${query}&output=jsonp&callback=${callbackName}`;
                script.onerror = () => {
                    cleanup();
                    reject(new Error('JSONP load error'));
                };
                document.body.appendChild(script);
            });

            const data = await responsePromise;

            if (data && data.data && data.data.length > 0) {
                let artworkUrl = data.data[0].album.cover_medium || data.data[0].album.cover_small;
                if (artworkUrl) {
                    thumbElement.src = artworkUrl;
                    thumbElement.onload = () => {
                        thumbElement.style.visibility = 'visible';
                        thumbElement.classList.remove('hidden');
                    };
                } else {
                    thumbElement.classList.add('hidden');
                }
            } else {
                thumbElement.classList.add('hidden');
            }
        } catch (e) {
            console.error('Error fetching album thumbnail:', e);
            thumbElement.classList.add('hidden');
        }
    }

    updateNavigationButtons() {
        if (this.isPracticeRandomMode) {
            // Practice Random mode: Show Previous, change Next to Practice Random
            if (this.prevBtn) {
                this.prevBtn.classList.remove('hidden');
                this.prevBtn.style.opacity = '1';
                this.prevBtn.style.cursor = 'pointer';
                this.prevBtn.disabled = false;

                const prevIconSpan = this.prevBtn.querySelector('.icon');
                const prevLabelSpan = this.prevBtn.querySelector('.label');
                if (prevIconSpan) prevIconSpan.textContent = '‹';
                if (prevLabelSpan) prevLabelSpan.textContent = 'Previous';
            }
            if (this.nextBtn) {
                this.nextBtn.classList.remove('hidden');
                this.nextBtn.style.opacity = '1';
                this.nextBtn.style.cursor = 'pointer';
                this.nextBtn.disabled = false;
                this.nextBtn.title = 'Open another random practice song';

                const iconSpan = this.nextBtn.querySelector('.icon');
                const labelSpan = this.nextBtn.querySelector('.label');
                if (iconSpan) iconSpan.innerHTML = '&#127919;'; // Dartboard
                if (labelSpan) labelSpan.textContent = 'Practice';
            }
            return;
        }

        if (this.isRandomMode) {
            // Random mode: Hide Previous, change Next to Random
            if (this.prevBtn) {
                this.prevBtn.classList.add('hidden');
            }
            if (this.nextBtn) {
                this.nextBtn.classList.remove('hidden');
                this.nextBtn.style.opacity = '1';
                this.nextBtn.style.cursor = 'pointer';
                this.nextBtn.disabled = false;
                this.nextBtn.title = 'Open another random song';

                const iconSpan = this.nextBtn.querySelector('.icon');
                const labelSpan = this.nextBtn.querySelector('.label');
                if (iconSpan) iconSpan.textContent = '🎲';
                if (labelSpan) labelSpan.textContent = 'Random';
            }
            return;
        }

        // Normal mode: Show Previous and Next with standard labels
        if (this.prevBtn) {
            this.prevBtn.classList.remove('hidden');
            const prevIconSpan = this.prevBtn.querySelector('.icon');
            const prevLabelSpan = this.prevBtn.querySelector('.label');
            if (prevIconSpan) prevIconSpan.textContent = '‹';
            if (prevLabelSpan) prevLabelSpan.textContent = 'Previous';
        }
        if (this.nextBtn) {
            this.nextBtn.classList.remove('hidden');
            const nextIconSpan = this.nextBtn.querySelector('.icon');
            const nextLabelSpan = this.nextBtn.querySelector('.label');
            if (nextIconSpan) nextIconSpan.textContent = '›';
            if (nextLabelSpan) nextLabelSpan.textContent = 'Next';
            this.nextBtn.title = 'Next song';
        }

        if (!this.currentSongId || this.allSongs.length === 0) {
            this.prevBtn.style.opacity = '0.5';
            this.prevBtn.style.cursor = 'not-allowed';
            this.nextBtn.style.opacity = '0.5';
            this.nextBtn.style.cursor = 'not-allowed';
            return;
        }

        const currentIndex = this.allSongs.findIndex(song => song.id === this.currentSongId);

        // Previous button
        if (currentIndex > 0) {
            this.prevBtn.style.opacity = '1';
            this.prevBtn.style.cursor = 'pointer';
            this.prevBtn.disabled = false;
        } else {
            this.prevBtn.style.opacity = '0.5';
            this.prevBtn.style.cursor = 'not-allowed';
            this.prevBtn.disabled = true;
        }

        // Next button
        if (currentIndex < this.allSongs.length - 1) {
            this.nextBtn.style.opacity = '1';
            this.nextBtn.style.cursor = 'pointer';
            this.nextBtn.disabled = false;
        } else {
            this.nextBtn.style.opacity = '0.5';
            this.nextBtn.style.cursor = 'not-allowed';
            this.nextBtn.disabled = true;
        }
    }

    async toggleFavorite() {
        if (!this.currentSongId || !this.onToggleFavorite) return;
        const newState = await this.onToggleFavorite(this.currentSongId);
        this.updateFavoriteButton(newState);
    }

    updateFavoriteButton(isFavorite) {
        if (!this.favoriteBtn) return;
        const iconSpan = this.favoriteBtn.querySelector('.icon');
        if (iconSpan) {
            iconSpan.textContent = isFavorite ? '⭐' : '☆';
        } else {
            // Fallback for if structure is not yet set up
            this.favoriteBtn.innerHTML = isFavorite ? '⭐' : '☆';
        }
        this.favoriteBtn.title = isFavorite ? 'Remove from favorites' : 'Add to favorites';
        if (isFavorite) {
            this.favoriteBtn.classList.add('favorite-active');
        } else {
            this.favoriteBtn.classList.remove('favorite-active');
        }
    }


    cycleAbility() {
        const currentValue = this.currentAbilityValue || 0;
        const newValue = (currentValue + 1) % 4; // Cycle 0, 1, 2, 3
        this.updateAbilityStars(newValue);
        this.checkForChanges();
    }

    updateAbilityStars(value) {
        this.currentAbilityValue = parseInt(value) || 0;
        this.abilityStars.forEach((star, index) => {
            if (index < this.currentAbilityValue) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }

    setPracticeState(isActive) {
        if (!this.practiceBtn) return;
        if (isActive) {
            this.practiceBtn.classList.add('practice-active');
        } else {
            this.practiceBtn.classList.remove('practice-active');
        }
    }

    openYouTubeUrlModal() {
        if (!this.youtubeUrlModal || !this.currentSongId) return;

        const song = this.songManager.getSongById(this.currentSongId);
        if (!song) return;

        // Set current values in inputs
        if (this.youtubeUrlInput) {
            this.youtubeUrlInput.value = song.youtubeUrl || '';
        }
        if (this.externalUrlInput) {
            this.externalUrlInput.value = song.externalUrl || '';
        }

        if (this.patchDetailsInput) {
            this.patchDetailsInput.value = song.patchDetails || '';
        }

        if (this.practiceCountInput) {
            this.practiceCountInput.value = (song.practiceCount !== undefined && song.practiceCount !== null) ? song.practiceCount.toString() : '0';
        }
        if (this.lyricOffsetInput) {
            this.lyricOffsetInput.value = song.lyricOffset || '';
        }

        const abilityValue = song.performAbility || 0;
        this.updateAbilityStars(abilityValue);

        if (this.fullLyricsInput) {
            this.fullLyricsInput.value = song.fullLyrics || '';
        }

        if (this.lyricsStatusText) {
            const hasLyrics = song.fullLyrics && song.fullLyrics.trim() !== '';
            this.lyricsStatusText.style.display = hasLyrics ? 'block' : 'none';
        }

        // Update JSON Status
        if (this.chordJsonStatus) {
            if (song.chordData) {
                this.chordJsonStatus.textContent = '✅ Data loaded';
                this.chordJsonStatus.style.color = '#10b981';
                if (this.clearChordDataBtn) this.clearChordDataBtn.style.display = 'inline-block';
            } else {
                this.chordJsonStatus.textContent = '❌ No data';
                this.chordJsonStatus.style.color = '#ef4444';
                if (this.clearChordDataBtn) this.clearChordDataBtn.style.display = 'none';
            }
        }
        this.chordDataToRemove = false;

        // Reset file input label text if needed
        const fileLabel = document.querySelector('label[for="chordJsonInput"]');
        if (fileLabel) fileLabel.textContent = '📁 Select File';

        // Show modal
        this.youtubeUrlModal.classList.remove('hidden');
        if (window.appInstance) {
            window.appInstance.pushModalState('youtubeUrl', () => {
                this._reallyCloseYouTubeUrlModal();
            });
        }

        // Focus first input (youtube url input)
        setTimeout(() => {
            if (this.youtubeUrlInput) {
                this.youtubeUrlInput.focus();
                this.youtubeUrlInput.select();
            }
        }, 100);
    }

    closeYouTubeUrlModal() {
        if (window.appInstance) {
            window.appInstance.popModalState('youtubeUrl');
        } else {
            if (this.youtubeUrlModal) {
                this.youtubeUrlModal.classList.add('hidden');
            }
        }
    }

    _reallyCloseYouTubeUrlModal() {
        if (this.youtubeUrlModal) {
            this.youtubeUrlModal.classList.add('hidden');
        }
        // ONLY clear fields that are truly temporary and unique to this modal's entry state
        if (this.chordJsonInput) {
            this.chordJsonInput.value = '';
        }
        // NOTE: We do NOT clear youtubeUrlInput, externalUrlInput, patchDetailsInput, etc.
        // as they should reflect the current song's state in the UI.
    }

    async saveYouTubeUrl() {
        if (!this.currentSongId) {
            return;
        }

        const youtubeUrl = this.youtubeUrlInput ? this.youtubeUrlInput.value.trim() : '';
        const originalYoutubeUrl = this.originalSongData ? (this.originalSongData.youtubeUrl || '') : '';

        const performSave = async () => {
            const externalUrl = this.externalUrlInput ? this.externalUrlInput.value.trim() : '';
            const patchDetails = this.patchDetailsInput ? this.patchDetailsInput.value.trim() : '';
            let practiceCount = this.practiceCountInput ? this.practiceCountInput.value.trim() : '0';
            if (practiceCount === '') practiceCount = '0';
            const lyricOffset = this.lyricOffsetInput ? parseFloat(this.lyricOffsetInput.value) || 0 : 0;
            const performAbility = this.currentAbilityValue || 0;
            const fullLyrics = this.fullLyricsInput ? this.fullLyricsInput.value.trim() : '';

            const updates = {
                youtubeUrl: youtubeUrl,
                externalUrl: externalUrl,
                patchDetails: patchDetails,
                practiceCount: practiceCount,
                lyricOffset: lyricOffset,
                performAbility: performAbility,
                fullLyrics: fullLyrics
            };

            // Handle JSON removal
            if (this.chordDataToRemove) {
                updates.chordData = null;
            }

            // Handle JSON file upload
            if (this.chordJsonInput && this.chordJsonInput.files && this.chordJsonInput.files[0]) {
                const file = this.chordJsonInput.files[0];
                const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        const chordData = JSON.parse(event.target.result);
                        updates.chordData = chordData;

                        // Update song with chord data
                        await this.songManager.updateSong(this.currentSongId, updates);

                        // Finalize UI updates after async save
                        this.finalizeSave(youtubeUrl, externalUrl);
                    } catch (e) {
                        console.error("Error parsing chord JSON:", e);
                        this.showInfoModal('Import Error', 'Invalid JSON file. Please check the file format.');
                    }
                };
                reader.readAsText(file);
            } else {
                // No file uploaded, just update other fields
                await this.songManager.updateSong(this.currentSongId, updates);
                this.finalizeSave(youtubeUrl, externalUrl);
            }
        };

        // Check if YouTube URL has changed and show warning, but only when there are actual chords on the timeline
        const song = this.songManager.getSongById(this.currentSongId);
        const hasChords = song && song.chordData && Array.isArray(song.chordData.chords) && song.chordData.chords.length > 0;
        if (youtubeUrl !== originalYoutubeUrl && originalYoutubeUrl !== '' && hasChords) {
            if (window.appInstance && window.appInstance.confirmationModal) {
                window.appInstance.confirmationModal.show(
                    'YouTube URL Changed',
                    'Changing this will affect the timing of the lyrics and chords on the Chord Timeline. These might not be in Sync anymore, please check',
                    () => performSave(),
                    null,
                    'Update Anyway',
                    'Cancel',
                    'warning'
                );
            } else {
                if (confirm('Changing this will affect the timing of the lyrics and chords on the Chord Timeline. These might not be in Sync anymore, please check')) {
                    performSave();
                }
            }
        } else {
            performSave();
        }
    }

    finalizeSave(youtubeUrl, externalUrl) {
        // Update originalSongData to current saved values so they become the new baseline
        const savedSong = this.songManager.getSongById(this.currentSongId);
        if (savedSong) {
            this.originalSongData = {
                artist: savedSong.artist || '',
                title: savedSong.title || '',
                verse: savedSong.verse || '',
                verseTitle: savedSong.verseTitle || 'Block 1',
                verseCue: savedSong.verseCue || '',
                preChorus: savedSong.preChorus || '',
                preChorusTitle: savedSong.preChorusTitle || 'Block 3',
                preChorusCue: savedSong.preChorusCue || '',
                chorus: savedSong.chorus || '',
                chorusTitle: savedSong.chorusTitle || 'Block 2',
                chorusCue: savedSong.chorusCue || '',
                bridge: savedSong.bridge || '',
                bridgeTitle: savedSong.bridgeTitle || 'Block 4',
                bridgeCue: savedSong.bridgeCue || '',
                key: savedSong.key || '',
                tempo: savedSong.tempo || (savedSong.chordData ? savedSong.chordData.tempo : '') || '',
                youtubeUrl: savedSong.youtubeUrl || '',
                fullLyrics: savedSong.fullLyrics || '',
                patchDetails: savedSong.patchDetails || '',
                practiceCount: savedSong.practiceCount !== undefined ? savedSong.practiceCount.toString() : '0',
                lyricOffset: savedSong.lyricOffset || 0,
                performAbility: savedSong.performAbility || 0,
                songNotes: savedSong.songNotes || ''
            };
        }

        // Reset change tracking
        this.hasUnsavedChanges = false;
        if (this.saveBtn) {
            this.saveBtn.classList.add('hidden');
        }

        // Update Key Display in Footer
        this.updateKeyDisplay();

        // Update buttons state
        this.updateYouTubeButton(youtubeUrl, externalUrl);
        this.updateYouTubePlayButton(youtubeUrl);
        this.updateExternalUrlButton(externalUrl);

        // Close modal first
        this.closeYouTubeUrlModal();

        // Notify parent to refresh table
        if (this.onUpdate && typeof this.onUpdate === 'function') {
            this.onUpdate();
        }
    }

    /**
     * Updates the key display in the footer
     */
    updateKeyDisplay() {
        if (!this.keyDisplay || !this.currentSongId) return;

        const song = this.songManager.getSongById(this.currentSongId);
        if (!song) {
            this.keyDisplay.textContent = '';
            return;
        }

        let keyText = song.key || '';

        // If no explicit key, try to detect it
        if (!keyText.trim() && this.keyDetector) {
            const detectedKey = this.keyDetector.detectFromSong(song);
            if (detectedKey) {
                keyText = detectedKey;
            }
        }

        const formattedKey = this.formatKeyText(keyText);
        this.keyDisplay.textContent = formattedKey;

        const container = this.keyDisplay.closest('.song-detail-key-badge');
        if (container) {
            container.style.display = 'inline-flex';
            container.classList.remove('hidden');
        }

        // Update overall container visibility
        this.updateLeftBadgesVisibility();
    }

    /**
     * Updates the BPM display in the footer
     */
    updateBpmDisplay() {
        if (!this.bpmDisplay || !this.currentSongId) return;

        const song = this.songManager.getSongById(this.currentSongId);
        if (!song) {
            this.bpmDisplay.textContent = '';
            return;
        }

        const bpmText = song.tempo || (song.chordData ? song.chordData.tempo : '') || '';
        this.bpmDisplay.textContent = bpmText;

        // Update badge visibility
        const container = this.bpmDisplay.closest('.song-detail-bpm-badge');
        if (container) {
            container.style.display = 'inline-flex';
            container.classList.remove('hidden');
        }

        // Update overall container visibility
        this.updateLeftBadgesVisibility();
    }

    /**
     * Helper to hide the badges container if neither key nor bpm is present
     */
    updateLeftBadgesVisibility() {
        const leftBadges = document.querySelector('.song-detail-left-badges');
        if (!leftBadges) return;

        // Always show the badges container in the detail modal so user can add missing key/bpm
        leftBadges.style.display = 'flex';
        leftBadges.classList.remove('hidden');
    }

    updateYouTubeButton(youtubeUrl, externalUrl) {
        if (!this.youtubeBtn) return;

        const labelSpan = this.youtubeBtn.querySelector('.label');
        const hasAnyUrl = (youtubeUrl && youtubeUrl.trim()) || (externalUrl && externalUrl.trim());

        if (hasAnyUrl) {
            this.youtubeBtn.classList.add('youtube-active');
            this.youtubeBtn.title = 'Edit song details';
            if (labelSpan) {
                labelSpan.textContent = 'Details';
            }
        } else {
            this.youtubeBtn.classList.remove('youtube-active');
            this.youtubeBtn.title = 'Edit song details';
            if (labelSpan) {
                labelSpan.textContent = 'Details';
            }
        }
    }

    updateYouTubePlayButton(youtubeUrl) {
        if (!this.youtubePlayBtn) return;

        if (youtubeUrl && youtubeUrl.trim()) {
            this.youtubePlayBtn.classList.remove('hidden');
        } else {
            this.youtubePlayBtn.classList.add('hidden');
        }
    }

    updateExternalUrlButton(externalUrl) {
        if (!this.externalUrlBtn) return;

        if (externalUrl && externalUrl.trim()) {
            this.externalUrlBtn.classList.remove('hidden');
        } else {
            this.externalUrlBtn.classList.add('hidden');
        }
    }

    openExternalUrl() {
        if (!this.currentSongId) return;

        const song = this.songManager.getSongById(this.currentSongId);
        if (song && song.externalUrl) {
            let url = song.externalUrl;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            window.open(url, '_blank');
        }
    }

    transposeChords(semitones) {
        if (!this.currentSongId) return;

        // Mapping van noten naar semitones en terug
        const noteToSemitone = {
            'C': 0, 'C#': 1, 'Db': 1,
            'D': 2, 'D#': 3, 'Eb': 3,
            'E': 4, 'Fb': 4,
            'F': 5, 'F#': 6, 'Gb': 6,
            'G': 7, 'G#': 8, 'Ab': 8,
            'A': 9, 'A#': 10, 'Bb': 10,
            'B': 11, 'Cb': 11
        };

        const semitoneToNote = {
            0: ['C'],
            1: ['C#', 'Db'],
            2: ['D'],
            3: ['D#', 'Eb'],
            4: ['E'],
            5: ['F'],
            6: ['F#', 'Gb'],
            7: ['G'],
            8: ['G#', 'Ab'],
            9: ['A'],
            10: ['A#', 'Bb'],
            11: ['B']
        };

        // Functie om een enkel akkoord te transponeeren
        const transposeSingleChord = (chord) => {
            if (!chord || typeof chord !== 'string') return chord;

            // Match root note (met optionele sharp/flat)
            const rootMatch = chord.match(/^([A-Ga-g])([#b]?)/);
            if (!rootMatch) return chord;

            const rootNote = rootMatch[1].toUpperCase();
            const accidental = rootMatch[2];
            const rootKey = rootNote + accidental;

            const rootSemitone = noteToSemitone[rootKey];
            if (rootSemitone === undefined) return chord;

            // Bereken nieuwe semitone
            let newSemitone = (rootSemitone + semitones + 12) % 12;

            // Kies de notenaam (voorkeur voor dezelfde accidental als origineel, anders de eerste optie)
            const newNoteOptions = semitoneToNote[newSemitone];
            let newNote;
            if (accidental === '#' && newNoteOptions.includes(rootNote + '#')) {
                newNote = rootNote + '#';
            } else if (accidental === 'b' && newNoteOptions.includes(rootNote + 'b')) {
                newNote = rootNote + 'b';
            } else {
                // Gebruik de eerste optie, maar probeer consistent te blijven
                newNote = newNoteOptions[0];
            }

            // Vervang de root note in het akkoord
            const suffix = chord.slice(rootMatch[0].length);
            return newNote + suffix;
        };

        // Functie om een hele chord string te transponeeren
        const transposeChordString = (chordString) => {
            if (!chordString || typeof chordString !== 'string') return chordString;

            // Pattern om akkoorden te vinden (inclusief accidentals en suffixes)
            // Pattern om akkoorden te vinden (inclusief accidentals en suffixes)
            // Strict pattern: Capitalized root, delimiters boundaries, strictly valid suffixes
            const chordPattern = /(^|[\s,.;:(\[])([A-G][#b]?(?:m|min|maj|dim|aug|sus|add)?(?:[0-9]|sus[24]?|add[29]|maj[79]?|min[79]?|dim[79]?|aug|°|ø)*(?:\/[A-G][#b]?)?)(?=$|[\s,.;:)\]])/g;

            return chordString.replace(chordPattern, (match, prefix, chord) => {
                let newChord;
                // Voor slash chords (bijv. C/G), transponeer beide delen
                if (chord.includes('/')) {
                    const parts = chord.split('/');
                    const root = transposeSingleChord(parts[0]);
                    const bass = transposeSingleChord(parts[1]);
                    newChord = root + '/' + bass;
                } else {
                    newChord = transposeSingleChord(chord);
                }
                return prefix + newChord;
            });
        };

        // Transpose all sections
        const sectionsToTranspose = ['verse', 'chorus', 'preChorus', 'bridge'];
        let hasChanges = false;

        sectionsToTranspose.forEach(sectionKey => {
            const section = this.sections[sectionKey];
            if (section && section.editInput) {
                const currentText = section.editInput.value || '';
                if (currentText.trim()) {
                    const transposedText = transposeChordString(currentText);
                    if (transposedText !== currentText) {
                        section.editInput.value = transposedText;
                        this.renderChordBlock(sectionKey, transposedText);
                        hasChanges = true;
                    }
                }
            }
        });

        // Transponeer ook de toonsoort (key) als die bestaat
        const song = this.songManager.getSongById(this.currentSongId);
        if (song && song.key && song.key.trim()) {
            const transposedKey = transposeSingleChord(song.key.trim());
            if (transposedKey !== song.key.trim()) {
                // Update de key in de song (direct opslaan omdat key een metadata veld is)
                this.songManager.updateSong(this.currentSongId, { key: transposedKey });
                // Update de key display
                this.updateKeyDisplay();
                // Update originalSongData zodat change tracking correct blijft
                if (this.originalSongData) {
                    this.originalSongData.key = transposedKey;
                }
                hasChanges = true;
            }
        }

        if (hasChanges) {
            // Markeer als gewijzigd
            this.checkForChanges();
            this.transposeOffset += semitones;
        }
    }

    discardChanges() {
        if (!this.currentSongId || !this.originalSongData) return;

        // Reload original song data
        const song = this.songManager.getSongById(this.currentSongId);
        if (!song) return;

        // Restore original values
        if (this.artistElement) {
            const artistText = this.originalSongData.artist || '';
            this.artistElement.textContent = artistText;
            if (!artistText.trim()) {
                this.artistElement.classList.add('empty-field');
                this.artistElement.dataset.placeholder = 'Artist';
            } else {
                this.artistElement.classList.remove('empty-field');
                this.artistElement.removeAttribute('data-placeholder');
            }
        }
        if (this.titleElement) {
            const titleText = this.originalSongData.title || '';
            this.titleElement.textContent = titleText;
            if (!titleText.trim()) {
                this.titleElement.classList.add('empty-field');
                this.titleElement.dataset.placeholder = 'Song Title';
            } else {
                this.titleElement.classList.remove('empty-field');
                this.titleElement.removeAttribute('data-placeholder');
            }
        }
        if (this.sections.verse?.editInput) {
            const val = this.originalSongData.verse || '';
            this.sections.verse.editInput.value = val;
            this.renderChordBlock('verse', val);
            if (this.sections.verse.cue) {
                this.sections.verse.cue.value = this.originalSongData.verseCue || '';
            }
        }
        if (this.sections.preChorus?.editInput) {
            const val = this.originalSongData.preChorus || '';
            this.sections.preChorus.editInput.value = val;
            this.renderChordBlock('preChorus', val);
            if (this.sections.preChorus.cue) {
                this.sections.preChorus.cue.value = this.originalSongData.preChorusCue || '';
            }
        }
        if (this.sections.chorus?.editInput) {
            const val = this.originalSongData.chorus || '';
            this.sections.chorus.editInput.value = val;
            this.renderChordBlock('chorus', val);
            if (this.sections.chorus.cue) {
                this.sections.chorus.cue.value = this.originalSongData.chorusCue || '';
            }
        }
        if (this.sections.bridge?.editInput) {
            const val = this.originalSongData.bridge || '';
            this.sections.bridge.editInput.value = val;
            this.renderChordBlock('bridge', val);
            if (this.sections.bridge.cue) {
                this.sections.bridge.cue.value = this.originalSongData.bridgeCue || '';
            }
        }
        if (this.keyDisplay) {
            this.keyDisplay.textContent = this.originalSongData.key || '';
            this.updateKeyDisplay(); // To handle badge visibility
        }

        // Restore Full Lyrics in UI
        if (this.fullLyricsInput) {
            this.fullLyricsInput.value = this.originalSongData.fullLyrics || '';
            if (this.lyricsStatusText) {
                const hasLyrics = this.fullLyricsInput.value.trim() !== '';
                this.lyricsStatusText.style.display = hasLyrics ? 'block' : 'none';
            }
        }

        // Reset change tracking
        this.hasUnsavedChanges = false;
        this.originalSongData = null;

        // Hide save button
        if (this.saveBtn) {
            this.saveBtn.classList.add('hidden');
        }

        // Exit edit mode and remove chord buttons
        document.querySelectorAll('.editable-field[contenteditable="true"]').forEach(el => {
            el.setAttribute('contenteditable', 'false');
            el.classList.remove('editing');
            // Remove chord buttons
            const section = el.closest('.song-chord-section');
            if (section) {
                const chordBtn = section.querySelector('.chord-modal-btn-detail');
                if (chordBtn) {
                    chordBtn.remove();
                }
            }
        });
    }

    async hide(fromPopState = false) {
        if (!fromPopState && this._isHidingLocked) return;

        // If we are hiding NOT from a popstate event, we need to clean up the history stack
        if (!fromPopState && window.appInstance) {
            this._isHidingLocked = true;
            window.appInstance.popModalState('songDetail');
            setTimeout(() => { this._isHidingLocked = false; }, 300);
            return; // popModalState will trigger history.back() which triggers this hide(true)
        }

        this._isHidingLocked = false;

        const songIdToCheck = this.currentSongId;
        const originalDataSnapshot = this.originalSongData ? { ...this.originalSongData } : null;

        // Check for unsaved changes before closing
        if (this.hasUnsavedChanges) {
            const shouldSave = await this.showUnsavedChangesDialog();
            if (shouldSave) {
                await this.saveChanges();
            } else {
                this.discardChanges();

                // If this was a new empty song and user cancelled, delete it
                if (songIdToCheck && originalDataSnapshot) {
                    const isSongEmpty = !originalDataSnapshot.artist?.trim() &&
                        !originalDataSnapshot.title?.trim() &&
                        !originalDataSnapshot.verse?.trim() &&
                        !originalDataSnapshot.verseCue?.trim() &&
                        !originalDataSnapshot.chorus?.trim() &&
                        !originalDataSnapshot.chorusCue?.trim() &&
                        !originalDataSnapshot.preChorus?.trim() &&
                        !originalDataSnapshot.preChorusCue?.trim() &&
                        !originalDataSnapshot.bridge?.trim() &&
                        !originalDataSnapshot.bridgeCue?.trim();

                    if (isSongEmpty) {
                        // Delete the empty song
                        await this.songManager.deleteSong(songIdToCheck);
                        // Notify parent to refresh table
                        if (this.onUpdate) {
                            this.onUpdate();
                        }
                    }
                }
            }
        } else {
            // Even if no changes were made, check if it's an empty new song
            if (songIdToCheck && originalDataSnapshot) {
                const isSongEmpty = !originalDataSnapshot.artist?.trim() &&
                    !originalDataSnapshot.title?.trim() &&
                    !originalDataSnapshot.verse?.trim() &&
                    !originalDataSnapshot.verseCue?.trim() &&
                    !originalDataSnapshot.chorus?.trim() &&
                    !originalDataSnapshot.chorusCue?.trim() &&
                    !originalDataSnapshot.preChorus?.trim() &&
                    !originalDataSnapshot.preChorusCue?.trim() &&
                    !originalDataSnapshot.bridge?.trim() &&
                    !originalDataSnapshot.bridgeCue?.trim();

                if (isSongEmpty) {
                    // Delete the empty song
                    await this.songManager.deleteSong(songIdToCheck);
                    // Notify parent to refresh table
                    if (this.onUpdate) {
                        this.onUpdate();
                    }
                }
            }
        }

        this.modal.classList.add('hidden');
        this.currentSongId = null;
        this.hasUnsavedChanges = false;
        this.originalSongData = null;

        // Exit edit mode and remove chord buttons when hiding
        document.querySelectorAll('.editable-field[contenteditable="true"]').forEach(el => {
            el.setAttribute('contenteditable', 'false');
            el.classList.remove('editing');
            const section = el.closest('.song-chord-section');
            if (section) {
                const chordBtn = section.querySelector('.chord-modal-btn-detail');
                if (chordBtn) {
                    chordBtn.remove();
                }
            }
        });
    }

    async incrementPracticeCount() {
        if (!this.currentSongId) return;

        // Prevent double-triggering (common on touch devices)
        const now = Date.now();
        const threshold = 1000; // Increased to 1 second for higher safety
        if (this._isIncrementingPractice || (this._lastPracticeIncrement && (now - this._lastPracticeIncrement < threshold))) {
            console.log('Practice increment: skipping duplicate call');
            return;
        }

        this._isIncrementingPractice = true;
        this._lastPracticeIncrement = now;

        const song = this.songManager.getSongById(this.currentSongId);
        if (!song) return;

        // Ensure practiceCount is a number
        let count = parseInt(song.practiceCount) || 0;
        count++;

        // Update UI optimistically for instant feedback
        if (this.practiceCountDisplay) {
            this.practiceCountDisplay.textContent = count.toString();
        }

        // Optional: Update the details input if it's open
        if (this.practiceCountInput) {
            this.practiceCountInput.value = count.toString();
        }

        // Notify parent to refresh table (in case counter is visible there)
        if (this.onUpdate) {
            this.onUpdate();
        }

        try {
            // Update in DB
            await this.songManager.updateSong(this.currentSongId, { practiceCount: count.toString() });

            // Update Practice Streak if authenticated
            const fbManager = this.firebaseManager || (window.appInstance ? window.appInstance.firebaseManager : null);
            if (fbManager) {
                const user = fbManager.getCurrentUser();
                if (user) {
                    fbManager.updatePracticeStreak(user.uid);
                }
            }
        } catch (error) {
            console.error('Failed to increment practice count in backend', error);
        } finally {
            // Wait a bit before releasing the lock to ensure all ghost events have passed
            setTimeout(() => {
                this._isIncrementingPractice = false;
            }, 200);
        }
    }

    showTitleSuggestions(titleElement) {
        if (this.activeSuggestions && this.activeSuggestions._forElement === titleElement) {
            return;
        }

        this.hideTitleSuggestions();

        const container = document.createElement('div');
        container.className = 'title-suggestions-portal';
        container._forElement = titleElement;

        const suggestions = [
            'INTRO', 'VERSE', 'PRE CHORUS', 'CHORUS',
            'BRIDGE', 'SOLO', 'INTRO & VERSE'
        ];

        suggestions.forEach(text => {
            const chip = document.createElement('div');
            chip.className = 'suggestion-chip';
            chip.textContent = text;

            const handleSelection = (e) => {
                e.preventDefault(); // Prevent blur
                e.stopPropagation();
                titleElement.textContent = text;
                this.checkForChanges();
                // Character limit check
                if (titleElement.textContent.length > 38) {
                    titleElement.textContent = titleElement.textContent.substring(0, 38);
                }
                this.hideTitleSuggestions();
                // Blur to finish
                titleElement.blur();
            };

            // Touchend/Click for selection
            chip.addEventListener('click', handleSelection);

            // Add touchstart for faster/more reliable mobile interaction
            chip.addEventListener('touchstart', (e) => {
                // Prevent ghost clicks and focus loss
                e.preventDefault();
                handleSelection(e);
            });

            // Critical: Prevent focus loss on mousedown to keep title active
            chip.addEventListener('mousedown', (e) => e.preventDefault());

            container.appendChild(chip);
        });

        document.body.appendChild(container);

        // Enforce critical styles for visibility and positioning
        container.style.position = 'absolute';
        container.style.zIndex = '10000';

        // Positioning
        const updatePosition = () => {
            // Check if element is still in DOM
            if (!document.body.contains(titleElement)) {
                this.hideTitleSuggestions();
                return;
            }

            const rect = titleElement.getBoundingClientRect();
            // Position just below the element
            container.style.top = (rect.bottom + window.scrollY + 5) + 'px';
            container.style.left = (rect.left + window.scrollX) + 'px';
        };
        updatePosition();

        // Listen for scroll/resize to update position instead of closing
        // This keeps the menu attached to the input field
        const scrollHandler = () => {
            if (this.activeSuggestions) {
                updatePosition();
            }
        };

        // Attach listeners immediately to track layout changes
        window.addEventListener('scroll', scrollHandler, true);
        window.addEventListener('resize', scrollHandler);

        this._suggestionCleanup = () => {
            window.removeEventListener('scroll', scrollHandler, true);
            window.removeEventListener('resize', scrollHandler);
        };

        // Animate in
        requestAnimationFrame(() => {
            container.classList.add('visible');
        });

        this.activeSuggestions = container;
    }

    hideTitleSuggestions() {
        // Safety check: Don't hide if the associated input is still focused
        // This prevents accidental dismissal when clicking roughly or due to resize events
        if (this.activeSuggestions &&
            this.activeSuggestions._forElement &&
            document.activeElement === this.activeSuggestions._forElement) {
            return;
        }

        if (this.activeSuggestions) {
            if (this.activeSuggestions.parentNode) {
                this.activeSuggestions.parentNode.removeChild(this.activeSuggestions);
            }
            this.activeSuggestions = null;
        }
        if (this._suggestionCleanup) {
            this._suggestionCleanup();
            this._suggestionCleanup = null;
        }
    }

    setupBarDividerButtons() {
        const dividerButtons = this.modal.querySelectorAll('.bar-divider-btn');
        dividerButtons.forEach(btn => {
            // Desktop: prevent button from stealing focus
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });

            const insertDivider = () => {
                // If we are currently editing a field, use THAT field
                const focusedField = document.activeElement;
                const isChordField = focusedField &&
                    focusedField.classList.contains('chord-section-content') &&
                    focusedField.getAttribute('contenteditable') === 'true';

                let targetElement;
                if (isChordField) {
                    targetElement = focusedField;
                } else {
                    const sectionKey = btn.dataset.section;
                    if (!sectionKey || !this.sections[sectionKey]) return;
                    targetElement = this.sections[sectionKey].content;
                }

                this.insertTextToContent(targetElement, ' | ');
            };

            // Mobile: execute action directly on touch to prevent focus loss issues,
            // while preventing default so keyboard doesn't hide.
            let lastTouchTime = 0;
            btn.addEventListener('touchstart', (e) => {
                if (e.cancelable) e.preventDefault();
                e.stopPropagation();
                
                const now = Date.now();
                if (now - lastTouchTime < 300) return; // Prevent double trigger
                lastTouchTime = now;
                
                insertDivider();
            }, { passive: false });

            // Desktop / General Click
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                // If touchstart already handled it recently, ignore click
                if (Date.now() - lastTouchTime < 300) return;
                
                insertDivider();
            });
        });
    }

    insertTextToContent(element, text) {
        if (!element) return;

        const isAlreadyFocused = document.activeElement === element;

        // If not already focused/editable, enter edit mode (which moves cursor to end)
        if (element.getAttribute('contenteditable') !== 'true') {
            this.enterEditMode(element);
            // After enterEditMode, the cursor is at the end. 
            // We use a small delay to let the browser catch up.
            setTimeout(() => {
                this._doInsertText(element, text);
            }, 50);
        } else {
            // If already focused, just insert at current cursor
            this._doInsertText(element, text);
        }
    }

    _doInsertText(element, text) {
        try {
            // Ensure element is focused
            if (document.activeElement !== element) {
                element.focus();
            }

            // Verify the current selection is ACTUALLY inside the expected element!
            // If the user clicked/tapped the button rapidly, the selection might have moved to the button text.
            const selection = window.getSelection();
            let isSelectionInside = false;

            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                if (element.contains(range.commonAncestorContainer) || element === range.commonAncestorContainer) {
                    isSelectionInside = true;
                }
            }

            // If selection is outside the element (like on the button itself), force caret to the end of the element.
            if (!isSelectionInside && selection) {
                const newRange = document.createRange();
                newRange.selectNodeContents(element);
                newRange.collapse(false); // collapse to end
                selection.removeAllRanges();
                selection.addRange(newRange);
            }

            // Try to use insertText for better undo support
            if (!document.execCommand('insertText', false, text)) {
                // Fallback for browsers that don't support insertText command
                if (selection && selection.rangeCount > 0) {
                    const fallbackRange = selection.getRangeAt(0);
                    fallbackRange.deleteContents();
                    fallbackRange.insertNode(document.createTextNode(text));
                    // Move cursor to after the inserted text
                    fallbackRange.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(fallbackRange);
                } else {
                    element.textContent += text;
                }
            }
        } catch (e) {
            console.warn('Error inserting text:', e);
            // Absolute fallback
            element.textContent += text;
        }
        this.checkForChanges();
    }
}

