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
        this.currentSongId = null;
        this.allSongs = [];
        this.modal = document.getElementById('songDetailModal');
        this.closeBtn = document.getElementById('songDetailModalCloseTop');
        this.deleteBtn = document.getElementById('songDetailDeleteBtn');
        this.prevBtn = document.getElementById('songDetailPrev');
        this.nextBtn = document.getElementById('songDetailNext');
        this.saveBtn = document.getElementById('songDetailSaveBtn');
        this.artistElement = document.getElementById('songDetailArtist');
        this.titleElement = document.getElementById('songDetailTitle');
        this.favoriteBtn = document.getElementById('songDetailFavoriteBtn');
        this.chordSearchBtn = document.getElementById('songDetailChordSearchBtn');
        this.practiceBtn = document.getElementById('songDetailPracticeBtn');
        this.keyDisplay = document.getElementById('songDetailKeyDisplay');
        this.youtubeBtn = document.getElementById('songDetailYouTubeBtn');
        this.youtubePlayBtn = document.getElementById('songDetailYouTubePlayBtn');
        this.externalUrlBtn = document.getElementById('songDetailExternalUrlBtn');
        this.addToSetlistBtn = document.getElementById('songDetailAddToSetlistBtn');
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
        this.performAbilityStars = document.getElementById('performAbilityStars');
        this.abilityStars = this.performAbilityStars ? this.performAbilityStars.querySelectorAll('.ability-star') : [];
        this.chordJsonInput = document.getElementById('chordJsonInput');
        this.chordJsonStatus = document.getElementById('chordJsonStatus');
        this.clearChordDataBtn = document.getElementById('clearChordDataBtn');
        this.lyricsBtn = document.getElementById('songDetailLyricsBtn');
        this.scrollingChordsBtn = document.getElementById('songDetailScrollingChordsBtn');
        this.practiceCountDisplay = document.getElementById('songDetailPracticeCount');
        this.practiceIncrementBtn = document.getElementById('songDetailPracticeIncrementBtn');
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

        // Confirmation Modal
        this.confirmationModal = document.getElementById('confirmationModal');
        this.confirmSaveBtn = document.getElementById('confirmSaveBtn');
        this.confirmDontSaveBtn = document.getElementById('confirmDontSaveBtn');

        // Info Modal
        this.infoModal = document.getElementById('infoModal');
        this.infoModalTitle = document.getElementById('infoModalTitle');
        this.infoModalMessage = document.getElementById('infoModalMessage');
        this.infoModalOkBtn = document.getElementById('infoModalOkBtn');
        this.infoModalClose = document.getElementById('infoModalClose');
        this.sections = {
            verse: {
                section: document.getElementById('verseSection'),
                title: document.getElementById('verseTitle'),
                content: document.getElementById('verseContent'),
                cue: document.getElementById('verseCueInput')
            },
            chorus: {
                section: document.getElementById('chorusSection'),
                title: document.getElementById('chorusTitle'),
                content: document.getElementById('chorusContent'),
                cue: document.getElementById('chorusCueInput')
            },
            preChorus: {
                section: document.getElementById('preChorusSection'),
                title: document.getElementById('preChorusTitle'),
                content: document.getElementById('preChorusContent'),
                cue: document.getElementById('preChorusCueInput')
            },
            bridge: {
                section: document.getElementById('bridgeSection'),
                title: document.getElementById('bridgeTitle'),
                content: document.getElementById('bridgeContent'),
                cue: document.getElementById('bridgeCueInput')
            }
        };
        this.hasUnsavedChanges = false;
        this.originalSongData = null;
        this.isRandomMode = false;
        this.transposeOffset = 0;

        // Initialize a single shared audio player
        this.sharedAudioPlayer = new PianoAudioPlayer();

        // Initialize Piano Chord Overlay with shared player
        this.pianoChordOverlay = new PianoChordOverlay(this.sharedAudioPlayer);

        // Initialize Chord Progression Editor with shared player
        this.chordProgressionEditor = new ChordProgressionEditor(this.sharedAudioPlayer);

        this.setupEventListeners();
        this.setupPianoButtons();
        this.setupChordEditorButtons();
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

        if (cues.length === 0 && (!song.fullLyrics || !song.fullLyrics.trim()) && (!song.lyrics || !song.lyrics.trim()) && !combinedBlocks.trim()) {
            this.showInfoModal('Lyrics', 'No lyrics found for this song. Add them in the "Details (Gear) - "lyrics" field, or in the Verse/Chorus blocks!');
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

        this.lyricsText.innerText = lyrics;

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

    setupEventListeners() {
        this.closeBtn.addEventListener('click', () => {
            if (window.appInstance) {
                window.appInstance.popModalState('songDetail');
            } else {
                this.hide();
            }
        });
        this.prevBtn.addEventListener('click', () => this.navigatePrevious());
        this.nextBtn.addEventListener('click', () => this.navigateNext());

        if (this.lyricsBtn) {
            this.lyricsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleLyricsTicker();
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

        if (this.favoriteBtn) {
            this.favoriteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.onToggleFavorite(this.currentSongId);
            });
        }

        if (this.chordSearchBtn) {
            this.chordSearchBtn.addEventListener('click', () => this.searchChords());
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

                // Define helper to send data
                const sendChordData = () => {
                    const song = this.songManager.getSongById(this.currentSongId);
                    if (!song || !scrollingChordsFrame.contentWindow) return;

                    console.log('Sending chord data to Timeline view', song);

                    // Extract unique chords from song blocks for the toolbar
                    const sections = [
                        { name: 'BLOCK 1', type: 'verse', text: song.verse || '' },
                        { name: 'BLOCK 2', type: 'chorus', text: song.chorus || '' },
                        { name: 'BLOCK 3', type: 'pre-chorus', text: song.preChorus || '' },
                        { name: 'BLOCK 4', type: 'bridge', text: song.bridge || '' }
                    ];

                    const chordRegex = /\b[A-G][b#]?(?:m|maj|min|dim|aug|sus|add|[2379]|11|13)*(?!\w)/g;
                    const suggestedChordsGrouped = sections.map(section => {
                        const found = section.text.match(chordRegex) || [];
                        // MIRROR CHORDS EXACTLY: Include all duplicates
                        return {
                            section: section.name,
                            type: section.type,
                            chords: found
                        };
                    }).filter(group => group.chords.length > 0);

                    // Send data
                    scrollingChordsFrame.contentWindow.postMessage({
                        type: 'loadChordData',
                        data: song.chordData || { chords: [] },
                        youtubeUrl: song.youtubeUrl || '',
                        artist: song.artist,
                        songTitle: song.title,
                        title: song.artist + ' - ' + song.title,
                        suggestedChords: suggestedChordsGrouped
                    }, '*');
                };

                // Force reload iframe on each open to ensure fresh state
                if (scrollingChordsFrame) {
                    // 1. Assign onload logic BEFORE setting src to avoid race conditions
                    scrollingChordsFrame.onload = () => {
                        console.log('Iframe loaded (onload event). Waiting for Ready signal or sending data as fallback...');
                        // Fallback: Try to send data immediately in case Ready signal was missed (though unlikely with this order)
                        setTimeout(sendChordData, 500);
                    };

                    // 2. Set src to trigger load
                    scrollingChordsFrame.src = 'scrolling_chords.html?embed=true&t=' + Date.now();
                }

                // Show modal overlay
                scrollingChordsModal.classList.remove('hidden');

                // One-time listener for Ready signal (managed per open session for simplicity, or we check if listener exists)
                // To avoid duplicate listeners, we can rely on a shared handler setup in constructor, OR just use the global one below.
                // For this fix, I'll rely on the global message listener adding a specific check for 'scrollingChordsReady'
            });

            // Close logic
            if (scrollingChordsCloseBtn) {
                scrollingChordsCloseBtn.addEventListener('click', (e) => {
                    e.preventDefault(); // Prevent any default button behavior
                    e.stopPropagation();

                    console.log('Closing Scrolling Chords Modal');

                    // 1. Stop Audio first
                    if (scrollingChordsFrame && scrollingChordsFrame.contentWindow) {
                        scrollingChordsFrame.contentWindow.postMessage({ type: 'stopAudio' }, '*');
                    }

                    // 2. Hide Modal immediately
                    scrollingChordsModal.classList.add('hidden');

                    // 3. Restore focus to opener (helps clear focus from iframe)
                    if (scrollingChordsBtn) {
                        scrollingChordsBtn.focus();
                    } else {
                        window.focus(); // Fallback
                    }
                });
            }

            // Close on background click
            scrollingChordsModal.addEventListener('click', (e) => {
                if (e.target === scrollingChordsModal) {
                    // Same logic as close button
                    if (scrollingChordsFrame && scrollingChordsFrame.contentWindow) {
                        scrollingChordsFrame.contentWindow.postMessage({ type: 'stopAudio' }, '*');
                    }
                    scrollingChordsModal.classList.add('hidden');
                    if (scrollingChordsBtn) scrollingChordsBtn.focus();
                }
            });

            // Listen for Save message from iframe
            // Listen for messages from iframe
            window.addEventListener('message', async (event) => {
                if (!event.data) return;

                // 1. Handshake: Iframe says "I'm Ready"
                if (event.data.type === 'scrollingChordsReady') {
                    console.log('Received Ready signal from Scrolling Chords');
                    // Find the frame and send data
                    if (scrollingChordsFrame && !scrollingChordsModal.classList.contains('hidden')) {
                        // Re-trigger the logic used in the click handler. 
                        // Since we don't have easy access to the scoped sendChordData, we duplicate the minimal fetch logic here for robustness.
                        const song = this.songManager.getSongById(this.currentSongId);
                        if (song) {
                            console.log('Responding to Ready signal with Data');

                            // (Simplified chord extraction for the handshake response - reusing the full logic is better but this is a patch)
                            // Actually, let's just trigger the message directly.
                            // To keep it DRY, ideally we'd have a method `sendDataToIframe()`, but for now I will duplicate the structure safely.

                            const sections = [
                                { name: 'BLOCK 1', type: 'verse', text: song.verse || '' },
                                { name: 'BLOCK 2', type: 'chorus', text: song.chorus || '' },
                                { name: 'BLOCK 3', type: 'pre-chorus', text: song.preChorus || '' },
                                { name: 'BLOCK 4', type: 'bridge', text: song.bridge || '' }
                            ];
                            const chordRegex = /\b[A-G][b#]?(?:m|maj|min|dim|aug|sus|add|[2379]|11|13)*(?!\w)/g;
                            const suggestedChordsGrouped = sections.map(section => {
                                const found = section.text.match(chordRegex) || [];
                                return { section: section.name, type: section.type, chords: found };
                            }).filter(group => group.chords.length > 0);

                            scrollingChordsFrame.contentWindow.postMessage({
                                type: 'loadChordData',
                                data: song.chordData || { chords: [] },
                                youtubeUrl: song.youtubeUrl || '',
                                artist: song.artist,
                                songTitle: song.title,
                                title: song.artist + ' - ' + song.title,
                                suggestedChords: suggestedChordsGrouped
                            }, '*');
                        }
                    }
                }

                // 2. Save Data
                else if (event.data.type === 'saveChordData' && this.currentSongId) {
                    const chordData = event.data.data;
                    console.log('SongDetailModal: Received saveChordData from Timeline', chordData);

                    try {
                        const song = this.songManager.getSongById(this.currentSongId);
                        console.log('SongDetailModal: Current song data BEFORE update:', song.chordData);

                        await this.songManager.updateSong(this.currentSongId, { chordData: chordData });

                        const updatedSong = this.songManager.getSongById(this.currentSongId);
                        console.log('SongDetailModal: Current song data AFTER update:', updatedSong.chordData);
                        console.log('Chord data saved to database');
                    } catch (e) {
                        console.error('Error saving chord data from timeline:', e);
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

        if (this.practiceIncrementBtn) {
            this.practiceIncrementBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
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
                if (this.fullLyricsInput) this.fullLyricsInput.focus();
            });
        }

        if (this.lyricsEditModalClose) {
            this.lyricsEditModalClose.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.lyricsEditModal) this.lyricsEditModal.classList.add('hidden');
            });
        }

        if (this.lyricsEditDoneBtn) {
            this.lyricsEditDoneBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.lyricsEditModal) this.lyricsEditModal.classList.add('hidden');
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
            this.lyricsEditModal.addEventListener('click', (e) => {
                if (e.target === this.lyricsEditModal) {
                    this.lyricsEditModal.classList.add('hidden');
                }
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

        // Setup Add To Setlist button
        if (this.addToSetlistBtn) {
            this.addToSetlistBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.onAddToSetlist && this.currentSongId) {
                    this.onAddToSetlist(this.currentSongId);
                }
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

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!this.transposeMenu.classList.contains('hidden') &&
                    !this.transposeMenu.contains(e.target) &&
                    e.target !== this.transposeBtn &&
                    !this.transposeBtn.contains(e.target)) {
                    this.transposeMenu.classList.add('hidden');
                }
            });
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
            this.youtubeUrlModal.addEventListener('click', (e) => {
                if (e.target === this.youtubeUrlModal) {
                    this.closeYouTubeUrlModal();
                }
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

        this.modal.addEventListener('click', async (e) => {
            if (e.target === this.modal) {
                await this.hide();
            }
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
                }
            }
        });
    }

    setupPianoButtons() {
        // Setup piano chord buttons for each section
        const pianoButtons = this.modal.querySelectorAll('.piano-chord-btn');

        pianoButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();

                const sectionKey = btn.dataset.section;
                const section = this.sections[sectionKey];

                if (section && section.content && this.pianoChordOverlay) {
                    // Gather all blocks for navigation
                    const blocks = [
                        { name: this.sections.verse.title.textContent || 'Block 1', text: this.sections.verse.content.textContent || '' },
                        { name: this.sections.chorus.title.textContent || 'Block 2', text: this.sections.chorus.content.textContent || '' },
                        { name: this.sections.preChorus.title.textContent || 'Block 3', text: this.sections.preChorus.content.textContent || '' },
                        { name: this.sections.bridge.title.textContent || 'Block 4', text: this.sections.bridge.content.textContent || '' }
                    ];

                    const sectionKeyToIdx = { 'verse': 0, 'chorus': 1, 'preChorus': 2, 'bridge': 3 };
                    const startIndex = sectionKeyToIdx[sectionKey] || 0;

                    this.pianoChordOverlay.show(blocks, startIndex);
                }
            });
        });
    }

    setupChordEditorButtons() {
        // Setup chord progression editor buttons for each section
        const editorButtons = this.modal.querySelectorAll('.chord-editor-btn');

        editorButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();

                const sectionKey = btn.dataset.section;
                const section = this.sections[sectionKey];

                if (section && section.content && this.chordProgressionEditor) {
                    // Gather all blocks for navigation
                    const blocks = [
                        { name: this.sections.verse.title.textContent || 'Block 1', field: this.sections.verse.content, songKey: this.getSongKey() },
                        { name: this.sections.chorus.title.textContent || 'Block 2', field: this.sections.chorus.content, songKey: this.getSongKey() },
                        { name: this.sections.preChorus.title.textContent || 'Block 3', field: this.sections.preChorus.content, songKey: this.getSongKey() },
                        { name: this.sections.bridge.title.textContent || 'Block 4', field: this.sections.bridge.content, songKey: this.getSongKey() }
                    ];

                    const sectionKeyToIdx = { 'verse': 0, 'chorus': 1, 'preChorus': 2, 'bridge': 3 };
                    const startIndex = sectionKeyToIdx[sectionKey] || 0;

                    this.chordProgressionEditor.show(
                        blocks,
                        startIndex,
                        (progression) => {
                            this.checkForChanges();
                        }
                    );
                }
            });
        });
    }

    getSongKey() {
        if (!this.currentSongId) return '';
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

        // Setup section fields
        Object.values(this.sections).forEach(section => {
            if (section.content) {
                section.content.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.enterEditMode(section.content);
                });
                section.content.addEventListener('blur', (e) => {
                    // Don't blur if we're moving to next field with Tab
                    if (e.relatedTarget && e.relatedTarget.hasAttribute('contenteditable') && e.relatedTarget.getAttribute('contenteditable') === 'true') {
                        return;
                    }

                    // Use setTimeout to allow click event on button to fire first
                    setTimeout(() => {
                        // Check if button still exists and if we're still in edit mode
                        const chordBtn = section.section?.querySelector('.chord-modal-btn-detail');
                        const isStillEditing = section.content.getAttribute('contenteditable') === 'true';

                        // Only exit edit mode if we're not clicking on the button
                        // Check if the active element is the button
                        const activeElement = document.activeElement;
                        if (!chordBtn || (activeElement !== chordBtn && !chordBtn.contains(activeElement))) {
                            section.content.setAttribute('contenteditable', 'false');
                            section.content.classList.remove('editing');
                            this.checkForChanges();
                            // Remove chord button
                            if (chordBtn) {
                                chordBtn.remove();
                            }
                        }
                    }, 100);
                });
                section.content.addEventListener('input', () => this.checkForChanges());
                section.content.addEventListener('keydown', (e) => {
                    if (e.key === 'Tab' && !e.shiftKey) {
                        e.preventDefault();
                        this.moveToNextField(section.content);
                    }
                });
            }

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
            this.keyDisplay.addEventListener('click', (e) => {
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
    }

    moveToNextField(currentElement) {
        // Define field order: artist -> title -> verse -> chorus -> preChorus -> bridge
        const fieldOrder = ['artist', 'title', 'verse', 'chorus', 'preChorus', 'bridge', 'key'];
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
        console.log('addChordButton called for field:', fieldName);
        // Remove existing button if any
        const section = element.closest('.song-chord-section');
        console.log('Section found:', !!section);
        if (section) {
            const existingBtn = section.querySelector('.chord-modal-btn-detail');
            if (existingBtn) {
                console.log('Removing existing button');
                existingBtn.remove();
            }
        }

        // Create chord button
        const chordBtn = document.createElement('button');
        chordBtn.type = 'button';
        chordBtn.className = 'chord-modal-btn-detail';
        chordBtn.innerHTML = '🎵';
        chordBtn.title = 'Add chords';
        chordBtn.style.cursor = 'pointer';
        chordBtn.style.pointerEvents = 'auto';
        chordBtn.addEventListener('mousedown', (e) => {
            // Use mousedown instead of click, and prevent default to avoid blur
            e.stopPropagation();
            e.preventDefault();
        });

        chordBtn.addEventListener('click', (e) => {
            console.log('Chord button clicked, fieldName:', fieldName);
            e.stopPropagation();
            e.preventDefault();
            // Prevent blur by keeping focus
            if (element.getAttribute('contenteditable') !== 'true') {
                element.setAttribute('contenteditable', 'true');
                element.classList.add('editing');
            }
            // Use setTimeout to ensure click completes before any blur
            setTimeout(() => {
                if (this.chordModal) {
                    console.log('ChordModal exists, calling show()');
                    this.chordModal.show(element, fieldName, () => {
                        // Callback when chords are added - check for changes
                        this.checkForChanges();
                    });
                } else {
                    console.error('ChordModal is null!');
                }
            }, 0);
        });

        // Insert button in the section header next to title
        if (section) {
            const sectionHeader = section.querySelector('.chord-section-title');
            console.log('Section header found:', !!sectionHeader);
            if (sectionHeader) {
                // Wrap title text in a span if not already wrapped
                if (!sectionHeader.querySelector('.chord-section-title-text')) {
                    const titleText = sectionHeader.textContent || sectionHeader.innerText || '';
                    const titleSpan = document.createElement('span');
                    titleSpan.className = 'chord-section-title-text';
                    titleSpan.textContent = titleText;
                    sectionHeader.textContent = ''; // Clear first
                    sectionHeader.appendChild(titleSpan);
                }

                sectionHeader.appendChild(chordBtn);
                console.log('Button appended to section header');
                console.log('Button in DOM:', document.body.contains(chordBtn));
            } else {
                console.error('Section header not found!');
            }
        } else {
            console.error('Section not found!');
        }
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
                fullLyrics: song.fullLyrics || song.lyrics || ''
            };
        }

        // Check current values - use textContent directly (not trimmed) to detect all changes including spaces
        // For title, use originalTitle from dataset (without key) or extract from textContent
        const titleText = this.titleElement ? (this.titleElement.dataset.originalTitle || this.titleElement.textContent.replace(/\s*\([^)]*\)\s*$/, '')) : '';
        const currentData = {
            artist: this.artistElement ? this.artistElement.textContent : '',
            title: titleText,
            verse: this.sections.verse?.content ? this.sections.verse.content.textContent : '',
            verseTitle: this.sections.verse?.title ? this.sections.verse.title.textContent : '',
            verseCue: this.sections.verse?.cue ? this.sections.verse.cue.value : '',
            preChorus: this.sections.preChorus?.content ? this.sections.preChorus.content.textContent : '',
            preChorusTitle: this.sections.preChorus?.title ? this.sections.preChorus.title.textContent : '',
            preChorusCue: this.sections.preChorus?.cue ? this.sections.preChorus.cue.value : '',
            chorus: this.sections.chorus?.content ? this.sections.chorus.content.textContent : '',
            chorusTitle: this.sections.chorus?.title ? this.sections.chorus.title.textContent : '',
            chorusCue: this.sections.chorus?.cue ? this.sections.chorus.cue.value : '',
            bridge: this.sections.bridge?.content ? this.sections.bridge.content.textContent : '',
            bridgeTitle: this.sections.bridge?.title ? this.sections.bridge.title.textContent : '',
            bridgeCue: this.sections.bridge?.cue ? this.sections.bridge.cue.value : '',
            key: this.keyDisplay ? this.keyDisplay.textContent : '',
            fullLyrics: this.fullLyricsInput ? this.fullLyricsInput.value : ''
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
            fullLyrics: (data.fullLyrics || '').trim()
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

        const confirmed = confirm(`Are you sure you want to delete "${song.title}" by ${song.artist}?`);
        if (!confirmed) return;

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
                alert('Failed to delete song. Please try again.');
            }
        } catch (error) {
            console.error('Error deleting song:', error);
            alert('An error occurred while deleting the song.');
        }
    }

    async saveChanges(shouldClose = false) {
        if (!this.currentSongId || !this.hasUnsavedChanges) {
            if (shouldClose) await this.hide();
            return;
        }

        const artist = this.artistElement ? this.artistElement.textContent.trim() : '';
        const originalTitle = this.titleElement ? (this.titleElement.dataset.originalTitle || this.titleElement.textContent.replace(/\s*\([^)]*\)\s*$/, '')).trim() : '';

        if (!artist || !originalTitle) {
            alert('Band/Artist Name and Song Title are required and cannot be empty.');
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
        if (this.sections.verse?.content) {
            updates.verse = this.sections.verse.content.textContent.trim();
        }
        if (this.sections.verse?.title) {
            updates.verseTitle = this.sections.verse.title.textContent.trim();
        }
        if (this.sections.verse?.cue) {
            updates.verseCue = this.sections.verse.cue.value.trim();
        }
        if (this.sections.preChorus?.content) {
            updates.preChorus = this.sections.preChorus.content.textContent.trim();
        }
        if (this.sections.preChorus?.title) {
            updates.preChorusTitle = this.sections.preChorus.title.textContent.trim();
        }
        if (this.sections.preChorus?.cue) {
            updates.preChorusCue = this.sections.preChorus.cue.value.trim();
        }
        if (this.sections.chorus?.content) {
            updates.chorus = this.sections.chorus.content.textContent.trim();
        }
        if (this.sections.chorus?.title) {
            updates.chorusTitle = this.sections.chorus.title.textContent.trim();
        }
        if (this.sections.chorus?.cue) {
            updates.chorusCue = this.sections.chorus.cue.value.trim();
        }
        if (this.sections.bridge?.content) {
            updates.bridge = this.sections.bridge.content.textContent.trim();
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
        if (this.fullLyricsInput) {
            updates.fullLyrics = this.fullLyricsInput.value.trim();
        }

        // Update song
        await this.songManager.updateSong(this.currentSongId, updates);

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
                fullLyrics: savedSong.fullLyrics || ''
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
            preChorusTitle: song.preChorusTitle || 'Block 3',
            preChorusCue: song.preChorusCue || '',
            chorus: song.chorus || '',
            chorusTitle: song.chorusTitle || 'Block 2',
            chorusCue: song.chorusCue || '',
            bridge: song.bridge || '',
            bridgeTitle: song.bridgeTitle || 'Block 4',
            bridgeCue: song.bridgeCue || '',
            key: song.key || '',
            fullLyrics: song.fullLyrics || song.lyrics || ''
        };

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

        // Verse (always show, even if empty - so user can add content)
        if (this.sections.verse && this.sections.verse.content) {
            this.sections.verse.content.textContent = song.verse || '';
            if (this.sections.verse.title) {
                this.sections.verse.title.textContent = song.verseTitle || 'Block 1';
            }
            if (this.sections.verse.cue) {
                this.sections.verse.cue.value = song.verseCue || '';
            }
            this.sections.verse.content.setAttribute('contenteditable', 'false');
            this.sections.verse.content.classList.remove('editing');
            if (this.sections.verse.section) {
                this.sections.verse.section.classList.remove('hidden');
            }
        }

        // Chorus (always show)
        if (this.sections.chorus && this.sections.chorus.content) {
            this.sections.chorus.content.textContent = song.chorus || '';
            if (this.sections.chorus.title) {
                this.sections.chorus.title.textContent = song.chorusTitle || 'Block 2';
            }
            if (this.sections.chorus.cue) {
                this.sections.chorus.cue.value = song.chorusCue || '';
            }
            this.sections.chorus.content.setAttribute('contenteditable', 'false');
            this.sections.chorus.content.classList.remove('editing');
            if (this.sections.chorus.section) {
                this.sections.chorus.section.classList.remove('hidden');
            }
        }

        // Pre-Chorus (always show)
        if (this.sections.preChorus && this.sections.preChorus.content) {
            this.sections.preChorus.content.textContent = song.preChorus || '';
            if (this.sections.preChorus.title) {
                this.sections.preChorus.title.textContent = song.preChorusTitle || 'Block 3';
            }
            if (this.sections.preChorus.cue) {
                this.sections.preChorus.cue.value = song.preChorusCue || '';
            }
            this.sections.preChorus.content.setAttribute('contenteditable', 'false');
            this.sections.preChorus.content.classList.remove('editing');
            if (this.sections.preChorus.section) {
                this.sections.preChorus.section.classList.remove('hidden');
            }
        }

        // Bridge (always show)
        if (this.sections.bridge && this.sections.bridge.content) {
            this.sections.bridge.content.textContent = song.bridge || '';
            if (this.sections.bridge.title) {
                this.sections.bridge.title.textContent = song.bridgeTitle || 'Block 4';
            }
            if (this.sections.bridge.cue) {
                this.sections.bridge.cue.value = song.bridgeCue || '';
            }
            this.sections.bridge.content.setAttribute('contenteditable', 'false');
            this.sections.bridge.content.classList.remove('editing');
            if (this.sections.bridge.section) {
                this.sections.bridge.section.classList.remove('hidden');
            }
        }

        // Show modal
        if (this.modal) {
            const user = this.songManager.firebaseManager.getCurrentUser();
            const uid = user ? user.uid : 'guest';

            const lyricsEnabled = localStorage.getItem(`feature-lyrics-enabled-${uid}`) === 'true';
            const timelineEnabled = localStorage.getItem(`feature-timeline-enabled-${uid}`) === 'true';

            const hasAnyLyrics = (song.fullLyrics && song.fullLyrics.trim() !== '') ||
                (song.lyrics && song.lyrics.trim() !== '') ||
                (song.verseCue || song.chorusCue || song.preChorusCue || song.bridgeCue) ||
                (song.verse || song.chorus || song.preChorus || song.bridge);

            if (this.lyricsBtn) {
                this.lyricsBtn.style.display = (hasAnyLyrics || lyricsEnabled) ? 'flex' : 'none';
            }
            if (this.scrollingChordsBtn) {
                this.scrollingChordsBtn.style.display = timelineEnabled ? 'flex' : 'none';
            }

            // Hide toggle center actions container if both are hidden
            const centerActions = document.querySelector('.song-detail-center-actions');
            if (centerActions) {
                centerActions.style.display = (lyricsEnabled || timelineEnabled) ? 'flex' : 'none';
            }

            this.modal.classList.remove('hidden');
        }

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

    toggleFavorite() {
        if (!this.currentSongId || !this.onToggleFavorite) return;
        this.onToggleFavorite(this.currentSongId);

        // Update button state from current song data
        const song = this.songManager.getSongById(this.currentSongId);
        if (song) {
            this.updateFavoriteButton(song.favorite || false);
        }
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
            this.practiceCountInput.value = song.practiceCount || '';
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

        // Focus first input (youtube url input)
        setTimeout(() => {
            if (this.youtubeUrlInput) {
                this.youtubeUrlInput.focus();
                this.youtubeUrlInput.select();
            }
        }, 100);
    }

    closeYouTubeUrlModal() {
        if (this.youtubeUrlModal) {
            this.youtubeUrlModal.classList.add('hidden');
        }
        if (this.youtubeUrlInput) {
            this.youtubeUrlInput.value = '';
        }
        if (this.externalUrlInput) {
            this.externalUrlInput.value = '';
        }
        if (this.patchDetailsInput) {
            this.patchDetailsInput.value = '';
        }
        if (this.practiceCountInput) {
            this.practiceCountInput.value = '';
        }
        this.updateAbilityStars(0);
        this.chordDataToRemove = false;
        if (this.chordJsonInput) {
            this.chordJsonInput.value = '';
        }
        if (this.fullLyricsInput) {
            this.fullLyricsInput.value = '';
        }
    }

    saveYouTubeUrl() {
        if (!this.currentSongId) {
            return;
        }

        const youtubeUrl = this.youtubeUrlInput ? this.youtubeUrlInput.value.trim() : '';
        const externalUrl = this.externalUrlInput ? this.externalUrlInput.value.trim() : '';
        const patchDetails = this.patchDetailsInput ? this.patchDetailsInput.value.trim() : '';
        const practiceCount = this.practiceCountInput ? this.practiceCountInput.value.trim() : '';
        const performAbility = this.currentAbilityValue || 0;
        const fullLyrics = this.fullLyricsInput ? this.fullLyricsInput.value.trim() : '';

        const updates = {
            youtubeUrl: youtubeUrl,
            externalUrl: externalUrl,
            patchDetails: patchDetails,
            practiceCount: practiceCount,
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
                    alert("Invalid JSON file. Please check the file format.");
                }
            };
            reader.readAsText(file);
        } else {
            // No file uploaded, just update other fields
            this.songManager.updateSong(this.currentSongId, updates);
            this.finalizeSave(youtubeUrl, externalUrl);
        }
    }

    finalizeSave(youtubeUrl, externalUrl) {
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

        // Update badge visibility
        const container = this.keyDisplay.closest('.song-detail-key-badge');
        if (container) {
            if (formattedKey.trim()) {
                container.style.display = 'inline-flex';
                container.classList.remove('hidden');
            } else {
                container.style.display = 'none';
                container.classList.add('hidden');
            }
        }
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

        // Transponeer alle secties
        const sectionsToTranspose = ['verse', 'chorus', 'preChorus', 'bridge'];
        let hasChanges = false;

        sectionsToTranspose.forEach(sectionKey => {
            const section = this.sections[sectionKey];
            if (section && section.content) {
                const currentText = section.content.textContent || '';
                if (currentText.trim()) {
                    const transposedText = transposeChordString(currentText);
                    if (transposedText !== currentText) {
                        section.content.textContent = transposedText;
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
        if (this.sections.verse?.content) {
            this.sections.verse.content.textContent = this.originalSongData.verse || '';
            if (this.sections.verse.cue) {
                this.sections.verse.cue.value = this.originalSongData.verseCue || '';
            }
        }
        if (this.sections.preChorus?.content) {
            this.sections.preChorus.content.textContent = this.originalSongData.preChorus || '';
            if (this.sections.preChorus.cue) {
                this.sections.preChorus.cue.value = this.originalSongData.preChorusCue || '';
            }
        }
        if (this.sections.chorus?.content) {
            this.sections.chorus.content.textContent = this.originalSongData.chorus || '';
            if (this.sections.chorus.cue) {
                this.sections.chorus.cue.value = this.originalSongData.chorusCue || '';
            }
        }
        if (this.sections.bridge?.content) {
            this.sections.bridge.content.textContent = this.originalSongData.bridge || '';
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
        // If we are hiding NOT from a popstate event, we need to clean up the history stack
        if (!fromPopState && window.appInstance) {
            window.appInstance.popModalState('songDetail');
            return; // popModalState will trigger history.back() which triggers this hide(true)
        }

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

        const song = this.songManager.getSongById(this.currentSongId);
        if (!song) return;

        // Ensure practiceCount is a number
        let count = parseInt(song.practiceCount) || 0;
        count++;

        // Update in DB
        await this.songManager.updateSong(this.currentSongId, { practiceCount: count.toString() });

        // Update UI
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
            'BRIDGE', 'INTRO & VERSE'
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
}

