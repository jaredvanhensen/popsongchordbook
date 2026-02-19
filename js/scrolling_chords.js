// Scrolling Chords Logic

const midiInput = document.getElementById('midiInput');
const chordinoInput = document.getElementById('chordinoInput');
const statusText = document.getElementById('statusText');
const playPauseBtn = document.getElementById('playPauseBtn');
const rwdBtn = document.getElementById('rwdBtn');
const fwdBtn = document.getElementById('fwdBtn');
const exportBtn = document.getElementById('exportBtn');
const timeline = document.getElementById('timeline');
const chordTrack = document.getElementById('chordTrack');
const markerTrack = document.getElementById('markerTrack');
const currentChordDisplay = document.getElementById('currentChordDisplay');
const instructions = document.getElementById('instructions');
const metronomeBtn = document.getElementById('metronomeBtn');
const bpmBtn = document.getElementById('bpmBtn');
const saveBtn = document.getElementById('saveBtn');
const clearDataBtn = document.getElementById('clearDataBtn');
const restartBtn = document.getElementById('restartBtn');
const audioToggleBtn = document.getElementById('audioToggleBtn');
const captureBtn = document.getElementById('captureBtn');
const speedBtn = document.getElementById('speedBtn'); // Fixed: Was missing
const youtubeToggleBtn = document.getElementById('youtubeToggleBtn');
const youtubePlayerContainer = document.getElementById('youtubePlayerContainer');
const recordingIndicator = document.getElementById('recordingIndicator');
const countInOverlay = document.getElementById('countInOverlay');
const countInNumber = document.getElementById('countInNumber');
const barDecBtn = document.getElementById('barDecBtn');
const barIncBtn = document.getElementById('barIncBtn');
const barOffsetDisplay = document.getElementById('barOffsetDisplay');
const toggleLyricsBtn = document.getElementById('toggleLyricsBtn');
const lyricsHUD = document.getElementById('lyricsHUD');
const lyricLine1 = document.getElementById('lyricLine1');
const lyricLine2 = document.getElementById('lyricLine2');
const COUNT_IN_SECONDS = 4;

// Check for embed mode
const urlParams = new URLSearchParams(window.location.search);
const isEmbed = urlParams.get('embed') === 'true';
if (isEmbed) {
    console.log("Scrolling Chords: Running in embed mode");

    // Debug Overlay removed for production
    const backLink = document.querySelector('a[href="index.html"]');
    if (backLink) backLink.style.display = 'none';

    // Use a solid light background for embed mode to ensure visibility
    document.body.style.background = '#f8fafc';

    // Force black text for white background
    const style = document.createElement('style');
    style.textContent = `
        body { color: #1e293b !important; }
        #instructions { color: #64748b !important; }
        #statusText { color: #334155 !important; }
        .marker-label { color: #94a3b8 !important; }
        #currentChordDisplay { color: #0f172a !important; text-shadow: none !important; }
        .file-input { color: #333 !important; }
        button { color: #000 !important; border-color: #ccc !important; }
    `;
    document.head.appendChild(style);
}

let midiData = null;
let currentFileName = 'song';
let chords = []; // Array of { time: seconds, name: string }
let markers = []; // Array of { time: seconds, label: string, type: 'bar'|'beat' }
let isPlaying = false;
let startTime = 0;
let pauseTime = 0; // The timestamp in the song where we paused
let animationFrame;
let isCountingIn = false;
let barOffsetInBeats = 0;
let lyricsEnabled = true;
let parsedLyrics = []; // Array of { time: seconds, text: string }
let originalChordsJson = '[]'; // For change detection
let originalTempo = 120; // For tempo change detection
let originalBarOffset = 0; // For bar offset change detection
let currentTempo = 120; // Shared state for tempo
let currentSpeed = 1.0; // Playback speed (1.0x or 0.5x)
let playbackOctave = 0; // Octave shift: 0 (default low), 1 (+1 oct), 2 (+2 oct)
let octaveCycleBtn = null;
let currentLyricOffset = 0; // Track current global lyrics offset
const syncFirstLyricBtn = document.getElementById('syncFirstLyricBtn');

// Dragging state
let isDragging = false;
let dragStartX = 0;
let dragStartTime = 0;
let isDraggingChord = false;
let draggedChordIndex = null;
let dragPointerStartX = 0;
let dragChordStartTime = 0;
let dragHasMoved = false;
let countInStartTime = 0;

// Virtual Drag State (Toolbar Chords)
let isVirtualDragging = false;
let potentialVirtualDrag = false;
let virtualDragStartX = 0;
let virtualDragStartY = 0;
let virtualDraggedChord = null;
let dragGhost = null;
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
let PIXELS_PER_SECOND = 100; // Speed of scrolling (Updated for 8 subdivisions)
const MIN_PIXELS_PER_SECOND = 25;
const MAX_PIXELS_PER_SECOND = 300;
const ZOOM_FACTOR = 1.2;

function getPlayheadOffset() {
    const w = window.innerWidth;
    if (w <= 600) return 60;
    if (w <= 1024) return 180; // Updated to match CSS shift
    return 220;
}

// Capture & YouTube State
let youtubePlayer = null;
let youtubeApiReady = false;
let youtubeUrl = null;
let enableTimingCapture = false;
let isYoutubePlaying = false;
let lastYoutubeSeekTime = 0; // Throttle seeks during drag
let suggestedChords = []; // Store blocks globally for smart keyboard matching

// Metronome/Audio state
let metronomeEnabled = false;
let audioEnabled = true; // Default ON
let wasAudioEnabledBeforeCapture = true;
let lastBeatPlayed = -1;
let lastChordPlayed = -1;

// Selection State
let isSelectionMode = false;
let selectedIndices = new Set();
let selectionBoxStart = null;
let isBoxSelecting = false;
let selectionBoxEl = null;
let isDraggingGroup = false;
let isCopying = false; // Track if we are in a copy-drag operation

// Pinch Zoom State
let timelinePointers = new Map();
let lastPinchDist = 0;

let editModeBtn = null;
let isEditMode = false;
let selectModeBtn = null;
let duplicateBtn = null;
let deleteSelectedBtn = null;
let audioCtx = null;
let pianoPlayer = null;
let chordParser = null;
let secondsPerBeat = 0.5; // Default 120 BPM
let beatsPerBar = 4; // Default 4/4

// Setup Event Listeners
// Setup Event Listeners (Safe Initialization)
document.addEventListener('DOMContentLoaded', () => {
    console.log('Scrolling Chords: Initializing Event Listeners');

    if (midiInput) midiInput.addEventListener('change', handleFileSelect);
    if (chordinoInput) chordinoInput.addEventListener('change', handleChordinoSelect);
    if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlayPause);
    if (rwdBtn) rwdBtn.addEventListener('click', () => seek(-10));
    if (fwdBtn) fwdBtn.addEventListener('click', () => seek(10));
    if (exportBtn) exportBtn.addEventListener('click', exportToJSON);
    if (saveBtn) saveBtn.addEventListener('click', saveToDatabase);
    if (clearDataBtn) clearDataBtn.addEventListener('click', clearData);
    if (metronomeBtn) metronomeBtn.addEventListener('click', toggleMetronome);
    if (bpmBtn) bpmBtn.addEventListener('click', changeBpm);
    if (captureBtn) captureBtn.addEventListener('click', toggleTimingCapture);
    if (audioToggleBtn) {
        audioToggleBtn.addEventListener('click', toggleAudio);
        // Set initial state for Default ON
        if (audioEnabled) audioToggleBtn.classList.add('active');
    }
    if (restartBtn) restartBtn.addEventListener('click', restart);

    // Octave Cycle Button
    octaveCycleBtn = document.getElementById('octaveCycleBtn');
    if (octaveCycleBtn) {
        octaveCycleBtn.addEventListener('click', toggleOctavePlayback);
    }

    // Zoom Buttons
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    if (zoomInBtn) zoomInBtn.addEventListener('click', () => zoom(1));
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => zoom(-1));

    if (barDecBtn) barDecBtn.addEventListener('click', () => adjustBarOffset(-1));
    if (barIncBtn) barIncBtn.addEventListener('click', () => adjustBarOffset(1));

    const shiftChordsLeftBtn = document.getElementById('shiftChordsLeftBtn');
    const shiftChordsRightBtn = document.getElementById('shiftChordsRightBtn');
    if (shiftChordsLeftBtn) shiftChordsLeftBtn.addEventListener('click', () => shiftChords(-1));
    if (shiftChordsRightBtn) shiftChordsRightBtn.addEventListener('click', () => shiftChords(1));

    if (toggleLyricsBtn) toggleLyricsBtn.addEventListener('click', toggleLyricsHUD);

    // Settings Menu Logic
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsMenu = document.getElementById('settingsMenu');
    const metronomeToggle = document.getElementById('metronomeToggle');
    const octaveOptions = document.querySelectorAll('.octave-option');
    const menuBpmOption = document.getElementById('menuBpmOption');
    const menuBpmDisplay = document.getElementById('menuBpmDisplay');

    if (settingsBtn && settingsMenu) {
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = settingsMenu.classList.contains('hidden');
            settingsMenu.classList.toggle('hidden');
            if (!settingsMenu.classList.contains('hidden')) {
                // Sync values when opening
                syncSettingsMenu();
            }
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!settingsMenu.contains(e.target) && e.target !== settingsBtn) {
                settingsMenu.classList.add('hidden');
            }
        });
    }

    // Edit Mode Toggle
    editModeBtn = document.getElementById('editModeBtn');
    if (editModeBtn) {
        editModeBtn.addEventListener('click', () => {
            isEditMode = !isEditMode;
            document.body.classList.toggle('edit-mode-active', isEditMode);
            editModeBtn.classList.toggle('active', isEditMode);

            // If turning off edit mode, also turn off selection mode if it was on
            if (!isEditMode && isSelectionMode) {
                toggleSelectionMode();
            }
        });
    }

    function syncSettingsMenu() {
        if (metronomeToggle) metronomeToggle.checked = metronomeEnabled;
        if (menuBpmDisplay) menuBpmDisplay.innerText = currentTempo;

        octaveOptions.forEach(opt => {
            const val = parseInt(opt.dataset.val);
            opt.classList.toggle('active', val === playbackOctave);
        });
    }

    // Connect menu tool buttons to main logic
    const menuExportBtn = document.getElementById('menuExportBtn');
    if (menuExportBtn) {
        menuExportBtn.addEventListener('click', () => {
            if (exportBtn) exportBtn.click();
        });
    }

    if (metronomeToggle) {
        metronomeToggle.addEventListener('change', () => {
            toggleMetronome();
        });
    }

    octaveOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            const val = parseInt(opt.dataset.val);
            playbackOctave = val;

            // Visual feedback
            octaveOptions.forEach(o => o.classList.toggle('active', parseInt(o.dataset.val) === val));

            // Persistent storage or preview
            triggerChordAudio('C', 1.0, true);
        });
    });

    if (menuBpmOption) {
        menuBpmOption.addEventListener('click', () => {
            changeBpm();
            setTimeout(() => {
                if (menuBpmDisplay) menuBpmDisplay.innerText = currentTempo;
            }, 100);
        });
    }

    // YouTube Logic (Toggle & Close)
    const closeYoutubeBtn = document.getElementById('closeYoutubeBtn');

    if (youtubeToggleBtn) {
        youtubeToggleBtn.addEventListener('pointerdown', (e) => {
            e.preventDefault(); // Prevent focus/zoom issues on mobile
            if (!youtubePlayerContainer) return;
            const isHidden = youtubePlayerContainer.classList.contains('hidden');
            if (isHidden) {
                youtubePlayerContainer.classList.remove('hidden');
                youtubeToggleBtn.classList.add('active');
            } else {
                youtubePlayerContainer.classList.add('hidden');
                youtubeToggleBtn.classList.remove('active');
                if (youtubePlayer && typeof youtubePlayer.pauseVideo === 'function') {
                    youtubePlayer.pauseVideo();
                }
            }
        });
    }

    if (closeYoutubeBtn) {
        closeYoutubeBtn.addEventListener('click', () => {
            if (youtubePlayer && typeof youtubePlayer.pauseVideo === 'function') {
                youtubePlayer.pauseVideo();
            }
            if (youtubePlayerContainer) youtubePlayerContainer.classList.add('hidden');
            if (youtubeToggleBtn) youtubeToggleBtn.classList.remove('active');
            // Also turn off capture mode if active
            if (enableTimingCapture) toggleTimingCapture();
        });
    }

    // YouTube Drag Logic (Handle)
    const youtubeDragHandle = document.getElementById('youtubeDragHandle');
    if (youtubeDragHandle && youtubePlayerContainer) {
        let isDraggingPlayer = false;
        let startX, startY, startRight, startBottom;

        const onPlayerPointerDown = (e) => {
            e.preventDefault(); // Prevent scrolling/selection
            isDraggingPlayer = true;
            startX = e.clientX;
            startY = e.clientY;

            const style = window.getComputedStyle(youtubePlayerContainer);
            // Default check if not set
            startRight = parseFloat(style.right) || 20;
            startBottom = parseFloat(style.bottom) || 20;

            youtubeDragHandle.setPointerCapture(e.pointerId);
            youtubeDragHandle.addEventListener('pointermove', onPlayerPointerMove);
            youtubeDragHandle.addEventListener('pointerup', onPlayerPointerUp);
            youtubeDragHandle.style.cursor = 'grabbing';
        };

        const onPlayerPointerMove = (e) => {
            if (!isDraggingPlayer) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            // Moving Mouse Right (positive dx) -> Container moves Right -> Right Offset decreases
            // Moving Mouse Down (positive dy) -> Container moves Down -> Bottom Offset decreases
            youtubePlayerContainer.style.right = (startRight - dx) + 'px';
            youtubePlayerContainer.style.bottom = (startBottom - dy) + 'px';
        };

        const onPlayerPointerUp = (e) => {
            isDraggingPlayer = false;
            youtubeDragHandle.releasePointerCapture(e.pointerId);
            youtubeDragHandle.removeEventListener('pointermove', onPlayerPointerMove);
            youtubeDragHandle.removeEventListener('pointerup', onPlayerPointerUp);
            youtubeDragHandle.style.cursor = 'move';
        };

        youtubeDragHandle.addEventListener('pointerdown', onPlayerPointerDown);
    }

    // Initialize Modals
    window.chordEditModal = new ChordEditModal();
    window.bpmEditModal = new BpmEditModal();
    window.confirmationModal = new ConfirmationModal();

    // Selection UI
    selectModeBtn = document.getElementById('selectModeBtn');
    duplicateBtn = document.getElementById('duplicateBtn');
    deleteSelectedBtn = document.getElementById('deleteSelectedBtn');

    if (selectModeBtn) selectModeBtn.addEventListener('click', toggleSelectionMode);
    if (duplicateBtn) duplicateBtn.addEventListener('click', () => duplicateSelectedChords());
    if (deleteSelectedBtn) deleteSelectedBtn.addEventListener('click', deleteSelectedChords);

    // Ctrl Key Listener for Cursor Feedback
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Control') {
            document.body.classList.add('ctrl-held');
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.key === 'Control') {
            document.body.classList.remove('ctrl-held');
        }
    });

    // iPad Pull-to-refresh fix for chord toolbar
    const buttonsContainer = document.getElementById('chordButtonsContainer');
    if (buttonsContainer) {
        buttonsContainer.addEventListener('touchmove', (e) => {
            // Prevent pull-to-refresh when dragging chords if at the top
            if (buttonsContainer.scrollTop <= 0 && e.touches[0].clientY > 0) {
                // If we are at top and pulling down, we might be trying to drag a button
                // or the browser might try to refresh. Let's prevent it.
                // We only do this for the toolbar to be safe.
                e.preventDefault();
            }
        }, { passive: false });
    }
    // Timeline Interaction (Scroll or Select)
    timeline.addEventListener('pointerdown', (e) => {
        if (isSelectionMode) {
            // Start selection box
            isBoxSelecting = true;
            selectionBoxStart = { x: e.clientX, y: e.clientY };
            selectionBoxEl = document.createElement('div');
            selectionBoxEl.className = 'selection-box';
            document.body.appendChild(selectionBoxEl);
            return;
        }

        // Timeline Dragging (Horizontal scroll)
        isDragging = true;
        dragStartX = e.clientX;
        // Current time at start of drag
        dragStartTime = isPlaying ? (performance.now() - startTime) / 1000 : pauseTime;
        timeline.classList.add('dragging');
    });

    // Support Pinch-to-Zoom (iPad/Touch) and Multi-pointer management
    timeline.addEventListener('pointerdown', (e) => {
        timelinePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (timelinePointers.size === 2) {
            // Cancel scrolling drag if we start a pinch
            isDragging = false;
            lastPinchDist = getTimelinePinchDist();
        }
    });

    window.addEventListener('pointerup', (e) => {
        timelinePointers.delete(e.pointerId);
        if (timelinePointers.size < 2) lastPinchDist = 0;
    });

    window.addEventListener('pointercancel', (e) => {
        timelinePointers.delete(e.pointerId);
        if (timelinePointers.size < 2) lastPinchDist = 0;
    });

    function getTimelinePinchDist() {
        const pts = Array.from(timelinePointers.values());
        return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }

    // Zoom and Scroll with Wheel
    timeline.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const direction = e.deltaY < 0 ? 1 : -1;
            zoom(direction);
        } else {
            // Horizontal scrolling with regular mouse wheel
            e.preventDefault();
            // Sensitivity: We want roughly a small jump per notch. 
            // deltaY is typically 100 per notch. 
            // 0.005 factor means 0.5s per notch at standard scale.
            const scrollSensitivity = 0.005;
            const delta = e.deltaY || e.deltaX;
            seek(delta * scrollSensitivity);
        }
    }, { passive: false });
});

// Space bar recording or toggle play/pause (Global listener)
document.addEventListener("keydown", e => {
    // Ignore if typing in an input field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.code === "Space") {
        e.preventDefault();
        if (enableTimingCapture) {
            recordChord();
        } else {
            togglePlayPause();
        }
        return;
    }

    // Capture chords and modifiers during recording
    if (enableTimingCapture) {
        const key = e.key.toUpperCase();

        // 1. Handle A-G base chords
        if (key.length === 1 && key >= 'A' && key <= 'G') {
            e.preventDefault();

            // Smart matching: Look in suggested chords (Blocks)
            let match = key;
            const allAvailableChords = [];

            if (suggestedChords && suggestedChords.length > 0) {
                const isGrouped = typeof suggestedChords[0] === 'object' && suggestedChords[0].chords;
                if (isGrouped) {
                    suggestedChords.forEach(group => allAvailableChords.push(...group.chords));
                } else {
                    allAvailableChords.push(...suggestedChords);
                }
            }

            // Find all chords starting with this letter (e.g., G matches G, G#m, G7)
            const matches = [...new Set(allAvailableChords)].filter(c => c.toUpperCase().startsWith(key));

            if (matches.length === 1) {
                // If only one G-type chord exists in the blocks, use it!
                match = matches[0];
            } else if (matches.length > 1) {
                // If multiple exist (e.g., G and G#m), prefer the exact letter if it exists
                if (matches.includes(key)) {
                    match = key;
                } else {
                    // Otherwise just pick the first one from the blocks as a best guess
                    match = matches[0];
                }
            }

            initAudio();
            triggerChordAudio(match, 1.0, true);
            recordChord(match);
            return;
        }

        // 2. Handle '#' or 'm' to modify the LAST recorded chord (Quick fix)
        // If user presses 'G' (records G#m) then thinks "wait no just G", 
        // they can still edit, but this logic helps if they actually pressed G then # (Shift+3)
        if (e.key === '#' || e.key === 'm' || e.key === 'M') {
            if (chords.length > 0) {
                const lastChord = chords[chords.length - 1];
                // Only modify if it was recorded very recently (e.g. within 2 seconds)
                const now = youtubePlayer ? youtubePlayer.getCurrentTime() : (isPlaying ? (performance.now() - startTime) / 1000 : pauseTime);
                if (Math.abs(now - lastChord.time) < 2.0) {
                    e.preventDefault();
                    if (e.key === '#') {
                        // Toggle sharp
                        if (lastChord.name.includes('#')) lastChord.name = lastChord.name.replace('#', '');
                        else lastChord.name = lastChord.name[0] + '#' + lastChord.name.slice(1);
                    } else if (e.key.toLowerCase() === 'm') {
                        // Toggle minor
                        if (lastChord.name.includes('m')) lastChord.name = lastChord.name.replace('m', '');
                        else lastChord.name += 'm';
                    }

                    initAudio();
                    triggerChordAudio(lastChord.name, 1.0, true);

                    renderStaticElements();
                    updateLoop();
                }
            }
        }
    }
});

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    if (!pianoPlayer) {
        // Pass the shared audio context
        pianoPlayer = new PianoAudioPlayer(audioCtx);
        pianoPlayer.initialize(audioCtx);
    }
    if (!chordParser) {
        chordParser = new ChordParser();
    }
}

function playTick(isDownbeat) {
    if (!audioCtx) initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    // Subtler frequencies: 1000 for downbeat, 800 for others
    osc.frequency.setValueAtTime(isDownbeat ? 1000 : 800, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.08, audioCtx.currentTime); // Very subtle
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.04);
}

function toggleMetronome() {
    metronomeEnabled = !metronomeEnabled;
    metronomeBtn.classList.toggle('active', metronomeEnabled);
    if (metronomeEnabled) initAudio();
}

function changeBpm() {
    bpmEditModal.show(currentTempo, (bpmVal) => {
        if (bpmVal && !isNaN(bpmVal) && bpmVal > 0) {
            currentTempo = bpmVal;
            secondsPerBeat = 60 / bpmVal;
            bpmBtn.innerText = window.innerWidth < 600 ? `${bpmVal}` : `${bpmVal} BPM`;

            // Update Midi Header Data if present
            if (midiData && midiData.header && midiData.header.tempos) {
                if (midiData.header.tempos.length > 0) {
                    midiData.header.tempos[0].bpm = bpmVal;
                } else {
                    midiData.header.tempos.push({ bpm: bpmVal });
                }
            }

            // Regenerate markers
            if (midiData) {
                markers = generateMarkers(midiData);
                renderStaticElements();
                updateLoop();
            }

            checkForChanges();
        }
    });
}


if (speedBtn) {
    speedBtn.onclick = () => {
        currentSpeed = currentSpeed === 1.0 ? 0.5 : 1.0;
        const icon = currentSpeed === 1.0
            ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>'
            : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>'; // Could use a different one for slow
        speedBtn.innerHTML = `${icon} <span>${currentSpeed === 1.0 ? '1.0x' : '0.5x'}</span>`;
        if (youtubePlayer && typeof youtubePlayer.setPlaybackRate === 'function') {
            youtubePlayer.setPlaybackRate(currentSpeed);
        }
    };
    // Initialize label
    speedBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> <span>1.0x</span>';
}

function toggleAudio() {
    audioEnabled = !audioEnabled;
    audioToggleBtn.classList.toggle('active', audioEnabled);
    if (audioEnabled) initAudio();
}

function restart() {
    if (pianoPlayer) pianoPlayer.stopAll();
    if (isCountingIn) stopCountIn();

    // Reset indices so audio triggers again at 0
    lastBeatPlayed = -1;
    lastChordPlayed = -1;

    if (isPlaying) {
        // Re-trigger count-in if already playing
        isCountingIn = true;
        countInStartTime = performance.now();
        countInOverlay.classList.remove('hidden');
        startTime = performance.now() + (COUNT_IN_SECONDS * 1000);
    } else {
        pauseTime = 0;
        updateLoop();
    }
}

function triggerChordAudio(chordName, duration = 10.0, force = false) {
    // Check if we should play: either global toggle is on OR we are forcing it (toolbar click)
    if (!pianoPlayer || !chordParser) return;

    if (!audioEnabled && !force) return;

    // Stop previous chord for clean transition
    try { pianoPlayer.stopAll(); } catch (e) { console.error(e); }

    // Resume context if needed
    if (pianoPlayer.audioContext && pianoPlayer.audioContext.state === 'suspended') {
        pianoPlayer.audioContext.resume();
    }

    const chord = chordParser.parse(chordName);
    if (chord && chord.notes) {
        // Apply playback octave shift
        let notes = [...chord.notes];
        if (playbackOctave > 0) {
            notes = notes.map(n => n + (playbackOctave * 12));
        }

        // Use provided duration (playback uses 10s, manual clicks use 1s)
        pianoPlayer.playChord(notes, duration, 0.4, 0.05);
    }
}

function toggleOctavePlayback() {
    playbackOctave = (playbackOctave + 1) % 3;
    const titles = ["Deep Range", "Middle Range", "High Range"];

    if (octaveCycleBtn) {
        octaveCycleBtn.title = titles[playbackOctave];
        // Visual feedback based on level
        octaveCycleBtn.classList.toggle('active', playbackOctave > 0);

        // Update the icon state
        octaveCycleBtn.dataset.octave = playbackOctave;
    }

    // Play a preview chord
    triggerChordAudio('C', 1.0, true);
}

// Listen for messages from parent (for auto-loading stored data)
// [DUPLICATE LISTENER REMOVED] - Consolidated into the standard listener at the end of the file.

// Load YouTube API
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

window.onYouTubeIframeAPIReady = function () {
    youtubeApiReady = true;
    if (youtubeUrl) {
        initYouTubePlayer(youtubeUrl);
    }
};

// --- Gesture Suppression for iPad ---
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());
document.addEventListener('gestureend', (e) => e.preventDefault());

// Block double-tap to zoom
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, false);

// Drag and drop support
timeline.addEventListener('dragover', (e) => {
    e.preventDefault();
    timeline.style.backgroundColor = '#333';
});
timeline.addEventListener('dragleave', (e) => {
    e.preventDefault();
    timeline.style.backgroundColor = '';
});
timeline.addEventListener('drop', (e) => {
    e.preventDefault();
    timeline.style.backgroundColor = '';

    // Check if it's a chord drop from toolbar
    const chordName = e.dataTransfer.getData('chordName');
    if (chordName) {
        const rect = timeline.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const playheadOffset = getPlayheadOffset();
        const dist = x - playheadOffset;

        const playbackTime = isPlaying ? (performance.now() - startTime) / 1000 : pauseTime;
        const dropTime = Math.max(0, playbackTime + (dist / PIXELS_PER_SECOND));
        const snappedTime = snapToGrid(dropTime);

        recordChord(chordName, snappedTime);
        triggerChordAudio(chordName, 1.0);
        return;
    }

    // Check if it's a file drop
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
});

// Chord Editing (Click) & Dragging
chordTrack.addEventListener('pointerdown', (e) => {
    // Disable chord dragging on mobile to allow easier timeline scrolling
    if (window.innerWidth < 600) return;

    const target = e.target.closest('.chord-item');
    if (target) {
        e.stopPropagation(); // Prevent bubbling to timeline drag

        const index = parseInt(target.dataset.index);

        // Selection Logic
        if (isSelectionMode || e.shiftKey) {
            if (selectedIndices.has(index)) {
                // If already selected and Shift clicked, deselect
                if (e.shiftKey) {
                    deselectChord(index);
                    return;
                }
            } else {
                // Determine if we are adding or replacing
                // If Select Mode is ON: simple tap toggles selection
                if (isSelectionMode) {
                    if (selectedIndices.has(index)) deselectChord(index);
                    else selectChord(index, true); // true = additive
                    return;
                }

                // Shift key logic
                if (e.shiftKey) {
                    selectChord(index, true); // additive
                    return;
                }
            }
        }

        // REMOVED: Automatic selection on pointerdown
        /*
        if (!selectedIndices.has(index) && !e.shiftKey && !isSelectionMode) {
            selectChord(index, false); // exclusive selection
        }
        */

        isDraggingChord = true;
        draggedChordIndex = index;
        isDraggingGroup = selectedIndices.has(index) && selectedIndices.size > 1;
        dragPointerStartX = e.clientX;

        // Store initial times for ALL chords to support group drag without drift
        window.dragInitialTimes = new Map();
        if (isDraggingGroup) {
            selectedIndices.forEach(idx => {
                if (chords[idx]) window.dragInitialTimes.set(idx, chords[idx].time);
            });
        } else {
            if (chords[index]) window.dragInitialTimes.set(index, chords[index].time);
        }

        let initialTime = chords[draggedChordIndex].time;
        if (Number.isNaN(initialTime) || !Number.isFinite(initialTime)) initialTime = 0;
        dragChordStartTime = initialTime;

        // Copy on Drag: Just flag it, don't duplicate yet
        // We wait for actual movement to "peel off" the copy
        if (e.ctrlKey) {
            isCopying = true;
        } else {
            isCopying = false;
        }

        dragHasMoved = false;

        // Removed setPointerCapture to avoid potential iPad gesture conflicts
    }
});

chordTrack.addEventListener('click', (e) => {
    if (dragHasMoved) return; // Don't trigger edit if we were dragging

    if (e.target.classList.contains('chord-item')) {
        e.stopPropagation(); // prevent other clicks

        // Auto-pause to allow editing
        if (isPlaying) pause();

        const index = parseInt(e.target.dataset.index);
        const currentName = chords[index].name;

        // Custom Professional Modal with Delete Option
        chordEditModal.show(currentName, (result) => {
            if (result === null) return; // Cancelled

            if (result === 'DELETE') {
                // Remove chord
                chords.splice(index, 1);
                // Re-render
                renderStaticElements();
                updateLoop();
                checkForChanges();
                return;
            }

            const newName = result;
            if (newName && newName !== currentName) {
                chords[index].name = newName;
                e.target.innerText = newName;
                checkForChanges();

                // If we also want to update the sticky display if it's the current chord
                const playbackTime = isPlaying ? (performance.now() - startTime) / 1000 : pauseTime;
                const activeIndex = chords.findLastIndex(c => c.time <= playbackTime);
                if (activeIndex === index) {
                    currentChordDisplay.innerText = newName;
                }
            }
        });
    }
});

// Global pointer listeners for the second half of dragging
window.addEventListener('pointermove', (e) => {
    // 0. Selection Box
    if (isBoxSelecting && selectionBoxEl) {
        const currentX = e.clientX;
        const currentY = e.clientY;
        const left = Math.min(selectionBoxStart.x, currentX);
        const top = Math.min(selectionBoxStart.y, currentY);
        const width = Math.abs(selectionBoxStart.x - currentX);
        const height = Math.abs(selectionBoxStart.y - currentY);

        selectionBoxEl.style.left = left + 'px';
        selectionBoxEl.style.top = top + 'px';
        selectionBoxEl.style.width = width + 'px';
        selectionBoxEl.style.height = height + 'px';

        updateSelectionFromBox();
        return;
    }

    // 1. Timeline Pinch-to-Zoom
    if (timelinePointers.size === 2) {
        timelinePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const newDist = getTimelinePinchDist();
        if (lastPinchDist > 0 && Math.abs(newDist - lastPinchDist) > 5) {
            const direction = newDist > lastPinchDist ? 1 : -1;
            zoom(direction, 1.05); // Smaller zoom factor for smooth pinch
            lastPinchDist = newDist;
        }
        return;
    }

    // 1. Timeline Drag (Scrolling)
    if (isDragging) {
        e.preventDefault();
        const deltaX = e.clientX - dragStartX;
        const deltaTime = deltaX / PIXELS_PER_SECOND;
        const newTime = Math.max(0, dragStartTime - deltaTime);

        if (isPlaying) {
            startTime = performance.now() - (newTime * 1000);
            if (youtubePlayer && isYoutubePlaying) {
                // Throttle seeks to 100ms and use allowSeekAhead=false during drag 
                // to prevent black screen/crash on mobile
                const now = Date.now();
                if (now - lastYoutubeSeekTime > 100) {
                    youtubePlayer.seekTo(newTime, false);
                    lastYoutubeSeekTime = now;
                }
            }
        } else {
            pauseTime = newTime;
            if (youtubePlayer) {
                const now = Date.now();
                if (now - lastYoutubeSeekTime > 100) {
                    youtubePlayer.seekTo(newTime, false);
                    lastYoutubeSeekTime = now;
                }
            }
        }
        updateLoop();
        return; // Prioritize timeline drag over others if active
    }

    // Check for start of virtual drag
    if (potentialVirtualDrag && !isVirtualDragging) {
        // ONLY start if button is still pressed!
        if (!(e.buttons & 1)) {
            potentialVirtualDrag = false;
            return;
        }
        const dist = Math.hypot(e.clientX - virtualDragStartX, e.clientY - virtualDragStartY);
        if (dist > 10) { // lowered threshold to 10px for better responsiveness on toolbar buttons
            isVirtualDragging = true;
            potentialVirtualDrag = false;

            // Create ghost element
            if (dragGhost) dragGhost.remove();
            dragGhost = document.createElement('div');
            dragGhost.className = 'chord-drag-ghost';
            dragGhost.textContent = virtualDraggedChord;
            document.body.appendChild(dragGhost);
            updateGhostPosition(e);
        }
    }

    if (isVirtualDragging && dragGhost) {
        updateGhostPosition(e);

        // Visual feedback when over timeline
        const timelineRect = timeline.getBoundingClientRect();
        const overTimeline = (
            e.clientX >= timelineRect.left &&
            e.clientX <= timelineRect.right &&
            e.clientY >= timelineRect.top &&
            e.clientY <= timelineRect.bottom
        );

        if (overTimeline) {
            timeline.style.backgroundColor = '#333';
        } else {
            timeline.style.backgroundColor = '';
        }
    }

    if (!isDraggingChord || draggedChordIndex === null) return;

    const deltaX = e.clientX - dragPointerStartX;

    // Only start "dragging" if we moved more than a threshold to avoid accidental drags
    if (!dragHasMoved && Math.abs(deltaX) > 15) { // Increased to 15px
        dragHasMoved = true;

        if (isCopying) {
            // DUPLICATE NOW with 0 offset, select NEW chords, and drag THEM.
            const newIndices = duplicateSelectedChords(0, true);
            isCopying = false; // Handled

            // Re-build dragInitialTimes for the NEW items
            window.dragInitialTimes = new Map();
            selectedIndices.forEach(idx => {
                if (chords[idx]) window.dragInitialTimes.set(idx, chords[idx].time);
            });

            // Update draggedChordIndex to something valid in the new selection
            if (newIndices && newIndices.length > 0) {
                draggedChordIndex = newIndices[0];
                dragChordStartTime = chords[draggedChordIndex].time;
            }
        }

        if (isPlaying) pause();
    }

    if (dragHasMoved) {
        e.preventDefault();
        const deltaTime = deltaX / PIXELS_PER_SECOND;

        // Apply to ALL moved chords
        if (window.dragInitialTimes && window.dragInitialTimes.size > 0) {
            window.dragInitialTimes.forEach((initialT, idx) => {
                if (chords[idx]) {
                    const rawTime = Math.max(0, initialT + deltaTime);
                    // Only snap the primary dragged chord? 
                    // Or snap all? Snapping all is better for group alignment.
                    // But if relative positions are not on grid, they might snap to same grid.
                    // Ideally: Snap primary, apply same delta to others?
                    // User asked: "snap to grid when i place or move".
                    // If we snap each individually, they might align to grid perfectly.
                    chords[idx].time = snapToGrid(rawTime);
                }
            });
        } else {
            // Fallback
            if (chords[draggedChordIndex]) {
                const rawTime = Math.max(0, dragChordStartTime + deltaTime);
                chords[draggedChordIndex].time = snapToGrid(rawTime);
            }
        }

        // Force update loop to prevent collapse
        updateLoop();
    }
});

window.addEventListener('pointerup', (e) => {
    // Finalize Selection Box
    if (isBoxSelecting) {
        isBoxSelecting = false;
        if (selectionBoxEl) {
            selectionBoxEl.remove();
            selectionBoxEl = null;
        }
        return;
    }

    // Reset Timeline Drag
    if (isDragging) {
        isDragging = false;
        timeline.classList.remove('dragging');

        // Final accurate seek on release
        if (youtubePlayer) {
            const finalTime = isPlaying ? (performance.now() - startTime) / 1000 : pauseTime;
            youtubePlayer.seekTo(finalTime, true);
        }

        updateLoop(); // Final refresh after drag ends
    }

    potentialVirtualDrag = false; // Reset potential drag

    // Reset Virtual Drag (Toolbar Chords)
    if (isVirtualDragging) {
        const timelineRect = timeline.getBoundingClientRect();
        const overTimeline = (
            e.clientX >= timelineRect.left &&
            e.clientX <= timelineRect.right &&
            e.clientY >= timelineRect.top &&
            e.clientY <= timelineRect.bottom
        );

        if (overTimeline && virtualDraggedChord) {
            const x = e.clientX - timelineRect.left;
            const playheadOffset = getPlayheadOffset();
            const dist = x - playheadOffset;

            const playbackTime = isPlaying ? (performance.now() - startTime) / 1000 : pauseTime;
            const dropTime = Math.max(0, playbackTime + (dist / PIXELS_PER_SECOND));
            const snappedTime = snapToGrid(dropTime);

            recordChord(virtualDraggedChord, snappedTime);
            triggerChordAudio(virtualDraggedChord, 1.0);
        }

        // Cleanup
        isVirtualDragging = false;
        virtualDraggedChord = null;
        if (dragGhost) {
            dragGhost.remove();
            dragGhost = null;
        }
        timeline.style.backgroundColor = '';
    }

    // Reset Chord Drag (Existing on timeline)
    if (isDraggingChord) {
        isDraggingChord = false;

        if (dragHasMoved) {
            // Sort chords and re-render to fix visual order and indices
            chords.sort((a, b) => a.time - b.time);
            renderStaticElements();
            updateLoop(); // Force visual refresh to prevent "bar focus loss"
            checkForChanges();
        }

        draggedChordIndex = null;
    }
});

function updateGhostPosition(e) {
    if (dragGhost) {
        dragGhost.style.left = `${e.clientX}px`;
        dragGhost.style.top = `${e.clientY}px`;
    }
}


function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) handleFile(file);
}

function handleChordinoSelect(e) {
    const file = e.target.files[0];
    if (file) processChordinoFile(file);
}

function handleFile(file) {
    currentFileName = file.name.replace(/\.[^/.]+$/, ""); // strip extension

    if (file.name.toLowerCase().endsWith('.json')) {
        processJsonFile(file);
    } else {
        processMidiFile(file);
    }
}

async function processJsonFile(file) {
    statusText.innerText = 'Parsing JSON...';
    setupUIForLoading();

    try {
        const text = await file.text();
        const data = JSON.parse(text);
        loadChordData(data);
    } catch (error) {
        console.error(error);
        statusText.innerText = 'Error parsing JSON file. Invalid format.';
    }
}

async function processChordinoFile(file) {
    statusText.innerText = 'Parsing Chordino CSV...';
    setupUIForLoading();

    try {
        const text = await file.text();

        // Use current app state for context if available
        const options = {
            songName: file.name.replace(/\.[^/.]+$/, ""),
            tempo: currentTempo || 120,
            barOffset: barOffsetInBeats / 4 // Convert beats to bars (assumes 4/4)
        };

        const data = convertSonicCsvToChordJson(text, options);
        loadChordData(data);

    } catch (error) {
        console.error(error);
        statusText.innerText = 'Error parsing Chordino file.';
    }
}

function loadChordData(data) {
    if (!data.chords || !Array.isArray(data.chords)) {
        throw new Error('Invalid data format: missing chords array');
    }

    chords = data.chords;
    const duration = data.duration || (chords.length > 0 ? chords[chords.length - 1].time + 5 : 60);
    const bpm = data.tempo || 120;

    // Mock midi object for marker generation
    const mockMidi = {
        duration: duration,
        header: { tempos: [{ bpm: bpm }], timeSignatures: [{ timeSignature: [4, 4] }] }
    };
    markers = generateMarkers(mockMidi);
    midiData = mockMidi;

    finishLoading(chords.length, bpm);
}

function convertSonicCsvToChordJson(csvText, options = {}) {
    const {
        songName = "Unknown Song",
        tempo = 120,
        barOffset = 0,
        duration = null,
        minDuration = 0.25, // remove glitch chords shorter than this
        yOffsets = [-50, -90] // alternating visual positions
    } = options;

    // Parse CSV
    const lines = csvText
        .trim()
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);

    let rawChords = [];

    for (let line of lines) {
        const parts = line.split(",");
        if (parts.length < 2) continue;

        const time = parseFloat(parts[0]);
        const chord = parts[1].trim();

        if (!isNaN(time) && chord !== "N") {
            rawChords.push({
                time: parseFloat(time.toFixed(2)),
                name: chord
            });
        }
    }

    // Remove duplicate consecutive chords
    let deduped = [];
    for (let i = 0; i < rawChords.length; i++) {
        if (
            i === 0 ||
            rawChords[i].name !== rawChords[i - 1].name
        ) {
            deduped.push(rawChords[i]);
        }
    }

    // Remove very short glitch chords
    let cleaned = [];
    for (let i = 0; i < deduped.length; i++) {
        const current = deduped[i];
        const next = deduped[i + 1];

        if (!next) {
            cleaned.push(current);
            break;
        }

        const duration = next.time - current.time;
        if (duration >= minDuration) {
            cleaned.push(current);
        }
    }

    // Generate alternating yOffsets
    let finalChords = cleaned.map((chord, index) => ({
        name: chord.name,
        time: chord.time,
        yOffset: yOffsets[index % yOffsets.length]
    }));

    return {
        name: songName,
        tempo: tempo,
        barOffset: barOffset,
        duration: duration || (finalChords.length > 0 ? finalChords[finalChords.length - 1].time + 2 : 0),
        chords: finalChords
    };
}




function loadData(data, url, title, inputSuggestedChords = [], artist = '', songTitle = '', inputFullLyrics = '', inputLyrics = '', inputLyricOffset = 0) {
    console.log('loadData called for:', songTitle, {
        hasData: !!data,
        receivedFullLyrics: inputFullLyrics ? inputFullLyrics.substring(0, 30) + '...' : 'none',
        receivedLyrics: inputLyrics ? inputLyrics.substring(0, 30) + '...' : 'none',
        hasTimestamps: LyricsParser.hasTimestamps(inputFullLyrics || inputLyrics)
    });

    // Ensure global suggestedChords is based on input
    suggestedChords = Array.isArray(inputSuggestedChords) ? inputSuggestedChords : [];

    // Populate Metadata Header
    const artistDisplay = document.getElementById('artistDisplay');
    const songTitleDisplay = document.getElementById('songTitleDisplay');

    if (artistDisplay) artistDisplay.textContent = artist || '';
    if (songTitleDisplay) songTitleDisplay.textContent = songTitle || '';

    if (!data || !data.chords || !Array.isArray(data.chords)) {
        console.warn('Scrolling Chords: data.chords missing or invalid, using empty array');
        // Preserve tempo if it exists even if chords are missing
        const preservedTempo = (data && data.tempo) ? Number(data.tempo) : 120;
        data = { chords: [], duration: 300, tempo: preservedTempo };
    }

    if (title) {
        currentFileName = title;
    }

    // Render Suggested Chords Toolbar
    const buttonsContainer = document.getElementById('chordButtonsContainer');
    if (buttonsContainer) {
        buttonsContainer.innerHTML = ''; // Clear previous
        if (suggestedChords && suggestedChords.length > 0) {
            buttonsContainer.classList.remove('hidden');

            // Render suggested chords (handle both grouped and simple array)
            const isGrouped = typeof suggestedChords[0] === 'object' && suggestedChords[0].chords;

            if (isGrouped) {
                suggestedChords.forEach(group => {
                    // Create a container for this section
                    const groupContainer = document.createElement('div');
                    groupContainer.className = 'chord-toolbar-group';

                    // Add Section Header Label
                    const header = document.createElement('div');
                    header.className = 'chord-toolbar-section-header';
                    header.textContent = group.section;
                    groupContainer.appendChild(header);

                    // Row for buttons
                    const buttonsRow = document.createElement('div');
                    buttonsRow.className = 'chord-toolbar-buttons-row';

                    group.chords.forEach(chordName => {
                        const btn = document.createElement('button');
                        btn.className = `chord-suggestion-btn chord-type-${group.type}`;
                        btn.textContent = chordName;
                        btn.draggable = false;
                        btn.style.touchAction = 'none';

                        btn.onpointerdown = (e) => {
                            initAudio();
                            triggerChordAudio(chordName, 1.0, true);
                        };

                        btn.onclick = () => {
                            if (enableTimingCapture) {
                                recordChord(chordName);
                            }
                        };

                        btn.addEventListener('pointerdown', (e) => {
                            btn.setPointerCapture(e.pointerId);
                            potentialVirtualDrag = true;
                            virtualDraggedChord = chordName;
                            virtualDragStartX = e.clientX;
                            virtualDragStartY = e.clientY;
                        });

                        buttonsRow.appendChild(btn);
                    });

                    groupContainer.appendChild(buttonsRow);
                    buttonsContainer.appendChild(groupContainer);
                });
            } else {
                suggestedChords.forEach(chordName => {
                    const btn = document.createElement('button');
                    btn.className = 'chord-suggestion-btn';
                    btn.textContent = chordName;
                    btn.draggable = false;
                    btn.style.touchAction = 'none'; // Prevent iPad scroll while dragging

                    btn.onpointerdown = (e) => {
                        if (typeof updateDebug === 'function') updateDebug(`Click: ${chordName}`);
                        initAudio(); // Ensure context is ready
                        triggerChordAudio(chordName, 1.0, true); // Force play even if global audio is OFF
                    };

                    btn.onclick = () => {
                        if (enableTimingCapture) {
                            recordChord(chordName);
                        }
                    };

                    btn.ondragstart = (e) => {
                        e.dataTransfer.setData('chordName', chordName);
                    };

                    // iPad/Touch Virtual Drag
                    btn.addEventListener('pointerdown', (e) => {
                        btn.setPointerCapture(e.pointerId);
                        potentialVirtualDrag = true;
                        virtualDraggedChord = chordName;
                        virtualDragStartX = e.clientX;
                        virtualDragStartY = e.clientY;
                    });

                    buttonsContainer.appendChild(btn);
                });
            }

            // Appending "?" button
            const qBtn = document.createElement('button');
            qBtn.className = 'chord-suggestion-btn q-chord-btn';
            qBtn.textContent = '?';
            qBtn.title = 'Mark unknown chord';
            qBtn.draggable = false;
            qBtn.style.touchAction = 'none';

            qBtn.onpointerdown = (e) => {
                initAudio();
                triggerChordAudio('?', 1.0, true);
            };

            // iPad/Touch Virtual Drag
            qBtn.addEventListener('pointerdown', (e) => {
                qBtn.setPointerCapture(e.pointerId);
                potentialVirtualDrag = true;
                virtualDraggedChord = '?';
                virtualDragStartX = e.clientX;
                virtualDragStartY = e.clientY;
            });

            qBtn.onclick = () => {
                if (enableTimingCapture) {
                    recordChord("?");
                }
            };

            qBtn.ondragstart = (e) => {
                e.dataTransfer.setData('chordName', "?");
            };
            buttonsContainer.appendChild(qBtn);

        } else {
            buttonsContainer.classList.add('hidden');
        }
    }

    statusText.innerText = 'Loading stored data...';
    setupUIForLoading();

    youtubeUrl = url;
    if (youtubeUrl) {
        if (youtubeApiReady) {
            initYouTubePlayer(youtubeUrl);
        }
        if (captureBtn) captureBtn.classList.remove('hidden');
        if (youtubeToggleBtn) {
            youtubeToggleBtn.classList.remove('hidden');
            youtubeToggleBtn.classList.add('active'); // Default to active since player starts shown
        }
        // Show player immediately so user can see it
        if (youtubePlayerContainer) youtubePlayerContainer.classList.remove('hidden');
    } else {
        if (captureBtn) captureBtn.classList.add('hidden');
        if (youtubeToggleBtn) youtubeToggleBtn.classList.add('hidden');
        if (youtubePlayerContainer) youtubePlayerContainer.classList.add('hidden');
    }

    try {
        chords = data.chords || [];
        const duration = data.duration || (chords.length > 0 ? chords[chords.length - 1].time + 5 : 300);
        const bpm = Number(data.tempo) || 120;

        barOffsetInBeats = data.barOffset || 0;
        originalBarOffset = barOffsetInBeats;
        if (barOffsetDisplay) barOffsetDisplay.innerText = `Bar: ${barOffsetInBeats}`;

        // Parse lyrics if available
        parsedLyrics = [];
        if (inputFullLyrics || inputLyrics) {
            const rawLyrics = inputFullLyrics || inputLyrics;
            if (LyricsParser.hasTimestamps(rawLyrics)) {
                parsedLyrics = LyricsParser.parse(rawLyrics);

                // Apply LyricSync offset
                currentLyricOffset = parseFloat(inputLyricOffset) || 0;
                if (currentLyricOffset) {
                    parsedLyrics.forEach(l => l.time += currentLyricOffset);
                }

                console.log('Scrolling Chords: Timtimestamped lyrics detected and parsed.', parsedLyrics.length, 'lines, offset:', currentLyricOffset);
                if (toggleLyricsBtn) toggleLyricsBtn.classList.remove('hidden');
                if (syncFirstLyricBtn) syncFirstLyricBtn.classList.remove('hidden'); // Show sync helper

                // Show HUD if enabled by default
                if (lyricsEnabled) {
                    if (lyricsHUD) lyricsHUD.classList.remove('hidden');
                    if (toggleLyricsBtn) toggleLyricsBtn.classList.add('active');
                }
            } else {
                if (toggleLyricsBtn) toggleLyricsBtn.classList.add('hidden');
                hideLyricsHUD();
            }
        } else {
            if (toggleLyricsBtn) toggleLyricsBtn.classList.add('hidden');
            if (syncFirstLyricBtn) syncFirstLyricBtn.classList.add('hidden');
            hideLyricsHUD();
        }

        currentTempo = bpm;
        originalTempo = bpm;
        secondsPerBeat = 60 / bpm;
        if (bpmBtn) bpmBtn.innerText = window.innerWidth < 600 ? `${Math.round(bpm)}` : `${Math.round(bpm)} BPM`;

        console.log('Scrolling Chords: loadData - data.tempo:', data.tempo, 'bpm:', bpm, 'currentTempo:', currentTempo);

        // Mock midi object for marker generation
        const mockMidi = {
            duration: duration,
            header: { tempos: [{ bpm: bpm }], timeSignatures: [{ timeSignature: [4, 4] }] }
        };
        markers = generateMarkers(mockMidi);
        midiData = mockMidi;

        finishLoading(chords.length, bpm);

        // Record original state for change detection
        originalChordsJson = JSON.stringify(chords);
        originalTempo = bpm;
        checkForChanges();
    } catch (e) {
        console.error(e);
        statusText.innerText = `Error loading data: ${e.message}`;
    }
}

async function processMidiFile(file) {
    statusText.innerText = 'Parsing MIDI...';
    setupUIForLoading();

    try {
        const arrayBuffer = await file.arrayBuffer();
        const midi = new Midi(arrayBuffer);

        console.log('MIDI Parsed:', midi);
        midiData = midi;

        // Extract chords
        chords = extractChordsFromMidi(midi);
        markers = generateMarkers(midi);

        if (chords.length === 0) {
            statusText.innerText = 'No chords detected in MIDI file.';
            return;
        }

        finishLoading(chords.length, Math.round(midi.header.tempos[0]?.bpm || 120));

    } catch (error) {
        console.error(error);
        statusText.innerText = 'Error parsing MIDI file. Make sure it is a valid .mid file.';
    }
}

function setupUIForLoading() {
    playPauseBtn.disabled = true;
    exportBtn.disabled = true;
    if (saveBtn) {
        saveBtn.disabled = true;
        setSaveStatus(false);
    }
    if (clearDataBtn) clearDataBtn.disabled = true;
    instructions.style.display = 'none';
}

function finishLoading(chordCount, bpm) {
    statusText.innerText = window.innerWidth < 600 ? `${chordCount} chords` : `Ready! ${chordCount} chords. Tempo: ${Math.round(bpm)} BPM`;
    if (bpmBtn) bpmBtn.innerText = window.innerWidth < 600 ? `${Math.round(bpm)}` : `${Math.round(bpm)} BPM`;
    playPauseBtn.disabled = false;
    exportBtn.disabled = false;
    if (saveBtn) saveBtn.disabled = false;
    if (clearDataBtn) clearDataBtn.disabled = false;

    // Update metronome timing
    secondsPerBeat = 60 / bpm;
    beatsPerBar = (midiData && midiData.header.timeSignatures[0]) ? midiData.header.timeSignatures[0].timeSignature[0] : 4;

    // Reset playback
    pause();
    pauseTime = 0;
    lastBeatPlayed = -1;

    renderStaticElements();

    // Apply responsive zoom for mobile: show ~3 bars by default
    if (window.innerWidth < 600) {
        const barDuration = (60 / bpm) * beatsPerBar;
        if (barDuration > 0) {
            const availableWidth = window.innerWidth - 80; // Margin for playhead and padding
            PIXELS_PER_SECOND = Math.max(MIN_PIXELS_PER_SECOND, Math.min(MAX_PIXELS_PER_SECOND, availableWidth / (3.1 * barDuration)));
        }
    }

    updateLoop(); // Update once to set initial positions
}

function getExportData() {
    // Return data as long as we have a valid tempo or chords
    if (currentTempo <= 0 && (!chords || chords.length === 0)) return null;

    // Duration: Use midi duration, or last chord time + 5s, or default 300s
    let duration = 300;
    if (midiData) {
        duration = midiData.duration;
    } else if (chords && chords.length > 0) {
        duration = chords[chords.length - 1].time + 5;
    }

    return {
        name: currentFileName,
        tempo: currentTempo,
        barOffset: barOffsetInBeats,
        duration: duration,
        chords: chords
    };
}

function adjustBarOffset(deltaBeats) {
    barOffsetInBeats += deltaBeats;
    if (barOffsetDisplay) barOffsetDisplay.innerText = `Bar: ${barOffsetInBeats}`;

    // Regenerate markers and re-render
    if (midiData) {
        markers = generateMarkers(midiData);
        renderStaticElements();
        updateLoop();
    }
    checkForChanges();
}

/**
 * Shifts all chords in the timeline by a specific number of grid steps (1/8 of a bar).
 * @param {number} deltaSteps - Number of steps to shift (+ for right, - for left)
 */
function shiftChords(deltaSteps) {
    if (!chords || chords.length === 0 || !secondsPerBeat || !beatsPerBar) return;

    const barDuration = beatsPerBar * secondsPerBeat;
    const snapInterval = barDuration / 8;
    const timeShift = deltaSteps * snapInterval;

    chords.forEach(c => {
        c.time = Math.max(0, c.time + timeShift);
    });

    // Ensure they stay sorted
    chords.sort((a, b) => a.time - b.time);

    renderStaticElements();
    updateLoop();
    checkForChanges();
}

function toggleLyricsHUD() {
    lyricsEnabled = !lyricsEnabled;
    if (lyricsEnabled) {
        lyricsHUD.classList.remove('hidden');
        toggleLyricsBtn.classList.add('active');
    } else {
        hideLyricsHUD();
    }
}

// Logic for the LyricSync Button
if (syncFirstLyricBtn) {
    syncFirstLyricBtn.onclick = () => {
        if (!parsedLyrics || parsedLyrics.length === 0) {
            alert("No lyrics available to sync.");
            return;
        }

        const playbackTime = isPlaying ? (performance.now() - startTime) / 1000 : pauseTime;

        // Calculate where the first lyric SHOULD be if it started at current playback time
        // firstLyricOriginalTime = parsedLyrics[0].time - currentLyricOffset
        // newOffset = playbackTime - firstLyricOriginalTime
        const firstLyricOriginalTime = parsedLyrics[0].time - currentLyricOffset;
        const newOffset = Math.round(playbackTime - firstLyricOriginalTime);

        // Apply difference to all parsed lyrics
        const diff = newOffset - currentLyricOffset;
        parsedLyrics.forEach(l => l.time += diff);
        currentLyricOffset = newOffset;

        // Add visual marker to timeline
        // Remove existing sync markers first to avoid clutter
        markers = markers.filter(m => m.type !== 'lyrics-sync');
        markers.push({
            time: playbackTime,
            label: 'L First Lyric',
            type: 'lyrics-sync'
        });

        renderStaticElements();
        updateLoop();

        // Notify parent to update the input field
        window.parent.postMessage({
            type: 'updateLyricSync',
            offset: newOffset
        }, '*');

        alert(`LyricSync value set. The first lyric line will start at this point\nOffset: ${newOffset.toFixed(2)}s`);
    };
}

function hideLyricsHUD() {
    lyricsEnabled = false;
    lyricsHUD.classList.add('hidden');
    toggleLyricsBtn.classList.remove('active');
}

function exportToJSON() {
    const exportData = getExportData();
    if (!exportData) return;

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", currentFileName + "_chords.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function saveToDatabase() {
    const exportData = getExportData();
    if (!exportData) return;

    console.log('Requesting parent to save chord data...', exportData);
    window.parent.postMessage({
        type: 'saveChordData',
        data: exportData
    }, '*');

    // Visual feedback
    showSaveToast();

    // Update original state IMMEDIATELY so checkForChanges reflects saved state
    originalChordsJson = JSON.stringify(chords);
    originalTempo = currentTempo;
    originalBarOffset = barOffsetInBeats;

    // Hide save button
    if (saveBtn) {
        saveBtn.classList.add('hidden');
    }
}

function showSaveToast() {
    let toast = document.querySelector('.save-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'save-toast';
        toast.innerHTML = '<span class="checkmark">✅</span> Saved Successfully';
        document.body.appendChild(toast);
    }

    // Reset and show
    toast.classList.remove('show');
    void toast.offsetWidth; // Trigger reflow
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

function setSaveStatus(isSaved) {
    if (!saveBtn) return;

    if (isSaved) {
        saveBtn.classList.add('saved');
        saveBtn.title = "Saved";
        // Optionally show toast or checkmark briefly
    } else {
        saveBtn.classList.remove('saved');
        saveBtn.title = "Save Changes";
    }
}

/**
 * Detects if current chords differ from original and toggles Save button
 */
function checkForChanges() {
    if (!saveBtn) return;

    const currentJson = JSON.stringify(chords);
    const hasUnsavedChanges = currentJson !== originalChordsJson ||
        currentTempo !== originalTempo ||
        barOffsetInBeats !== originalBarOffset;

    if (hasUnsavedChanges) {
        saveBtn.classList.remove('hidden');
        saveBtn.disabled = false;
        setSaveStatus(false);
    } else {
        saveBtn.classList.add('hidden');
    }
}

function extractChordsFromMidi(midi) {
    // 1. Collect all notes from all tracks into a single timeline
    let allNotes = [];
    midi.tracks.forEach(track => {
        track.notes.forEach(note => {
            allNotes.push({
                time: note.time,
                duration: note.duration,
                midi: note.midi,
                name: note.name
            });
        });
    });

    allNotes.sort((a, b) => a.time - b.time);

    // 2. Group simultaneous notes (chords)
    const timeWindow = 0.05;
    const noteGroups = [];

    if (allNotes.length === 0) return [];

    let currentGroup = { time: allNotes[0].time, notes: [allNotes[0].midi] };

    for (let i = 1; i < allNotes.length; i++) {
        const note = allNotes[i];
        if (note.time - currentGroup.time < timeWindow) {
            if (!currentGroup.notes.includes(note.midi)) {
                currentGroup.notes.push(note.midi);
            }
        } else {
            noteGroups.push(currentGroup);
            currentGroup = { time: note.time, notes: [note.midi] };
        }
    }
    noteGroups.push(currentGroup);

    // 3. Identify chords
    const detectedChords = noteGroups.map(group => {
        const chordName = identifyChord(group.notes);
        if (chordName) {
            return {
                time: group.time,
                name: chordName
            };
        }
        return null;
    }).filter(c => c !== null);

    // 4. Filter duplicates
    const filteredChords = [];
    let lastChordName = null;

    detectedChords.forEach(chord => {
        if (chord.name !== lastChordName) {
            filteredChords.push(chord);
            lastChordName = chord.name;
        }
    });

    return filteredChords;
}

function generateMarkers(midi) {
    // Generate markers for bars and seconds
    const markers = [];
    const duration = midi.duration;
    const bpm = midi.header.tempos[0]?.bpm || 120;
    const timeSignature = midi.header.timeSignatures[0]?.timeSignature || [4, 4]; // [numerator, denominator]

    const secondsPerBeat = 60 / bpm;
    const secondsPerBar = secondsPerBeat * timeSignature[0];

    // Add time markers every 15 seconds
    for (let t = 0; t <= duration; t += 15) {
        markers.push({
            time: t,
            label: formatTime(t),
            type: 'time'
        });
    }

    // Add bar and beat markers
    const barOffsetSeconds = barOffsetInBeats * secondsPerBeat;
    const numBars = Math.ceil(duration / secondsPerBar);

    // We start from -40 to ensure we have markers even with large offsets
    for (let i = -40; i <= numBars + 40; i++) {
        const barTime = (i * secondsPerBar) + barOffsetSeconds;

        // Only add if within or near duration
        if (barTime < -secondsPerBar || barTime > duration + secondsPerBar) continue;

        // Bar Marker
        markers.push({
            time: barTime,
            label: `Bar ${i + 1}`,
            type: 'bar'
        });

        // Beat Markers (add beats between this bar and next)
        const beatsPerBar = timeSignature[0];
        // 8 subdivisions per bar (eighth notes)
        for (let b = 0.5; b < beatsPerBar; b += 0.5) {
            const beatTime = barTime + (b * secondsPerBeat);
            if (beatTime >= 0 && beatTime <= duration) {
                markers.push({
                    time: beatTime,
                    label: '',
                    type: 'beat'
                });
            }
        }
    }

    return markers;
}


function identifyChord(midiNotes) {
    if (midiNotes.length < 3) return null;

    const pitchClasses = [...new Set(midiNotes.map(n => n % 12))].sort((a, b) => a - b);

    const intervals = {
        major: [0, 4, 7],
        minor: [0, 3, 7],
        diminished: [0, 3, 6],
        augmented: [0, 4, 8],
        major7: [0, 4, 7, 11],
        minor7: [0, 3, 7, 10],
        dominant7: [0, 4, 7, 10]
    };

    for (let root of pitchClasses) {
        const normalized = pitchClasses.map(p => (p - root + 12) % 12).sort((a, b) => a - b);

        if (isSubset(intervals.major, normalized)) return NOTE_NAMES[root];
        if (isSubset(intervals.minor, normalized)) return NOTE_NAMES[root] + 'm';
        if (isSubset(intervals.dominant7, normalized)) return NOTE_NAMES[root] + '7';
        if (isSubset(intervals.major7, normalized)) return NOTE_NAMES[root] + 'maj7';
        if (isSubset(intervals.minor7, normalized)) return NOTE_NAMES[root] + 'm7';
        if (isSubset(intervals.diminished, normalized)) return NOTE_NAMES[root] + 'dim';
    }

    return null;
}

function isSubset(pattern, notes) {
    return pattern.every(p => notes.includes(p));
}

/**
 * Pre-calculates vertical offsets for chords to prevent overlaps during fast changes.
 * Ensures that for any sequence of close chords, the first is UP and the second is DOWN.
 */
function determineStaggerPositions() {
    if (!chords || chords.length === 0) return;

    for (let i = 0; i < chords.length; i++) {
        const chord = chords[i];
        const prevChord = i > 0 ? chords[i - 1] : null;
        const nextChord = i < chords.length - 1 ? chords[i + 1] : null;

        const isCloseToPrev = prevChord && (chord.time - prevChord.time < 1.0);
        const isCloseToNext = nextChord && (nextChord.time - chord.time < 1.0);

        if (isCloseToPrev || isCloseToNext) {
            // Part of a "close" cluster
            if (!isCloseToPrev) {
                // We are the START of a cluster
                chord.yOffset = -90; // Start at UP
            } else {
                // Continue the zigzag from the previous chord
                chord.yOffset = (chords[i - 1].yOffset === -90) ? -10 : -90;
            }
        } else {
            // Isolated chord
            chord.yOffset = -50; // Center
        }
    }
}

function renderStaticElements() {
    determineStaggerPositions();
    // Render chords
    chordTrack.innerHTML = '';

    // Fragment for performance
    const chordFrag = document.createDocumentFragment();
    chords.forEach((chord, index) => {
        const el = document.createElement('div');
        el.className = 'chord-item';

        // Apply root color class (A-G)
        const root = chord.name.charAt(0).toUpperCase();
        if (root >= 'A' && root <= 'G') {
            el.classList.add(`root-${root}`);
        }

        el.innerText = chord.name;
        el.dataset.index = index;
        chordFrag.appendChild(el);
    });
    chordTrack.appendChild(chordFrag);

    // Render markers
    markerTrack.innerHTML = '';

    // Debug markers
    console.log(`Rendering ${markers.length} markers.`);

    const markerFrag = document.createDocumentFragment();
    markers.forEach(marker => {
        const el = document.createElement('div');
        el.className = `marker ${marker.type}`;

        if (marker.label) {
            const label = document.createElement('div');
            label.className = 'marker-label';
            label.innerText = marker.label;
            el.appendChild(label);
        }

        markerFrag.appendChild(el);
    });
    markerTrack.appendChild(markerFrag);
}

function togglePlayPause() {
    if (isPlaying) {
        pause();
    } else {
        play();
    }
}

function play() {
    if (isPlaying) return;
    initAudio();

    // Extra kick for iPad/Safari
    if (audioCtx && audioCtx.resume) audioCtx.resume();

    isPlaying = true;
    playPauseBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
        <span>Pause</span>
    `;

    // If starting from absolute beginning, do count-in
    if (pauseTime === 0 && !isCountingIn) {
        isCountingIn = true;
        countInStartTime = performance.now();
        countInOverlay.classList.remove('hidden');
        // Set startTime in the future so playbackTime starts at -4
        startTime = performance.now() + (COUNT_IN_SECONDS * 1000);
    } else {
        // resume from pauseTime
        startTime = performance.now() - (pauseTime * 1000);

        // Resume YouTube if applicable
        if (youtubePlayer && enableTimingCapture) {
            youtubePlayer.seekTo(pauseTime, true);
            youtubePlayer.playVideo();
        }
    }

    requestAnimationFrame(updateLoop);
}

function stopCountIn() {
    isCountingIn = false;
    countInOverlay.classList.add('hidden');
}

function pause() {
    isPlaying = false;
    playPauseBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        <span>Play</span>
    `;

    if (pianoPlayer) pianoPlayer.stopAll();

    if (isCountingIn) {
        stopCountIn();
    }

    const now = performance.now();
    pauseTime = (now - startTime) / 1000;

    cancelAnimationFrame(animationFrame);

    if (youtubePlayer && enableTimingCapture) {
        youtubePlayer.pauseVideo();
    }
}

function seek(deltaSeconds) {
    let currentTime = isPlaying ? (performance.now() - startTime) / 1000 : pauseTime;
    let newTime = Math.max(0, currentTime + deltaSeconds);

    if (pianoPlayer) pianoPlayer.stopAll();

    if (isCountingIn) {
        stopCountIn();
    }

    if (isPlaying) {
        startTime = performance.now() - (newTime * 1000);
        if (youtubePlayer && enableTimingCapture) {
            youtubePlayer.seekTo(newTime, true);
        }
    } else {
        pauseTime = newTime;
        updateLoop(); // Updates position while paused
        if (youtubePlayer && enableTimingCapture) {
            youtubePlayer.seekTo(newTime, true);
        }
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateLoop() {
    const now = performance.now();
    let playbackTime;

    if (isPlaying) {
        if (youtubePlayer && typeof youtubePlayer.getPlayerState === 'function' && youtubePlayer.getPlayerState() === 1) {
            const ytTime = youtubePlayer.getCurrentTime();
            if (Number.isFinite(ytTime) && !Number.isNaN(ytTime)) {
                playbackTime = ytTime;
                startTime = now - (ytTime * 1000);
            } else {
                playbackTime = (now - startTime) / 1000;
            }
        } else {
            playbackTime = (now - (startTime || now)) / 1000;
        }

        // Count-in Overlay Logic
        if (isCountingIn) {
            const timeLeft = Math.max(0, -playbackTime);
            const countNumber = Math.ceil(timeLeft);

            if (countNumber > 0) {
                countInNumber.innerText = countNumber;
            } else {
                stopCountIn();
            }
        }
    } else {
        playbackTime = pauseTime || 0;
    }

    // Emergency NaN Reset
    if (Number.isNaN(playbackTime) || !Number.isFinite(playbackTime)) {
        playbackTime = 0;
        if (isPlaying) startTime = now;
        else pauseTime = 0;
    }

    // Metronome Logic (Accounts for Bar Adjust)
    const currentBeat = Math.floor((playbackTime / secondsPerBeat) - barOffsetInBeats);
    if (currentBeat > lastBeatPlayed) {
        if (isPlaying && metronomeEnabled && playbackTime >= 0) {
            // Check if this beat is a downbeat (Bar start)
            const isDownbeat = currentBeat % beatsPerBar === 0;
            playTick(isDownbeat);
        }
        lastBeatPlayed = currentBeat;
    } else if (currentBeat < lastBeatPlayed) {
        lastBeatPlayed = currentBeat - 1;
    }

    // Chord Audio Logic (Precise)
    let audioChordIndex = -1;
    for (let i = chords.length - 1; i >= 0; i--) {
        if (chords[i].time <= playbackTime) {
            audioChordIndex = i;
            break;
        }
    }

    if (audioChordIndex > lastChordPlayed) {
        if (isPlaying && audioEnabled && playbackTime >= -0.1) {
            triggerChordAudio(chords[audioChordIndex].name);
        }
        lastChordPlayed = audioChordIndex;
    } else if (audioChordIndex < lastChordPlayed) {
        lastChordPlayed = audioChordIndex;
    }

    // Display chordIndex (with tolerance for smoother visual transitions)
    let chordIndex = -1;
    for (let i = chords.length - 1; i >= 0; i--) {
        if (chords[i].time <= playbackTime + 0.05) {
            chordIndex = i;
            break;
        }
    }

    // Display current chord (Sticky)
    const currentChord = chords[chordIndex]; // Use the index we found
    if (currentChord) {
        currentChordDisplay.innerText = currentChord.name;

        // Remove existing root classes
        // currentChordDisplay.className = 'current-chord-display';

        // Add current root class for color
        const root = currentChord.name.charAt(0).toUpperCase();
        if (root >= 'A' && root <= 'G') {
            // currentChordDisplay.classList.add(`root-${root}`);
        }
    } else {
        currentChordDisplay.innerText = '';
        currentChordDisplay.className = 'current-chord-display';
    }

    // Safety for PIXELS_PER_SECOND
    const pps = (typeof PIXELS_PER_SECOND === 'number' && isFinite(PIXELS_PER_SECOND)) ? PIXELS_PER_SECOND : 100;
    const winWidth = window.innerWidth;
    const bufferTime = 200 / pps; // Time buffer for 200px off-screen

    // Find the CURRENT chord index for highlighting
    const activeIndex = chordIndex; // Reuse the index found for audio logic above

    // Optimize scrolling chord positions (Visibility Windowing)
    const chordElements = chordTrack.children;
    const visibleStartTime = playbackTime - bufferTime;
    const visibleEndTime = playbackTime + (winWidth + 200) / pps;

    for (let i = 0; i < chordElements.length; i++) {
        const el = chordElements[i];
        const chord = chords[i];
        if (!chord) continue;

        // Skip processing if far off-screen (basic windowing)
        if (chord.time < visibleStartTime || chord.time > visibleEndTime) {
            if (el.style.display !== 'none') el.style.display = 'none';
            continue;
        }

        let dist = (chord.time - playbackTime) * pps;

        if (!isFinite(dist) || isNaN(dist)) {
            dist = 0;
            if (el.style.display !== 'none') el.style.display = 'none';
        } else {
            if (el.style.display !== 'block') el.style.display = 'block';

            // Use pre-calculated yOffset (default to -50 if missing)
            let yOffset = chord.yOffset || -50;

            el.style.transform = `translate3d(${dist}px, ${yOffset}%, 0)`;

            // Apply 'active' class to the current/passed chords
            // Chords exactly at or past the playhead (dist <= 0) are "active" and hidden in the track
            if (i <= activeIndex) {
                if (!el.classList.contains('active')) el.classList.add('active');
            } else {
                if (el.classList.contains('active')) el.classList.remove('active');
            }
        }
    }

    // Update markers (Visibility Windowing)
    const markerElements = markerTrack.children;
    for (let i = 0; i < markerElements.length; i++) {
        const el = markerElements[i];
        const marker = markers[i];

        if (marker) {
            if (marker.time < visibleStartTime || marker.time > visibleEndTime) {
                if (el.style.display !== 'none') el.style.display = 'none';
                continue;
            }

            let dist = (marker.time - playbackTime) * pps;

            if (!isFinite(dist) || isNaN(dist)) {
                dist = 0;
                if (el.style.display !== 'none') el.style.display = 'none';
            } else {
                if (el.style.display !== 'block') el.style.display = 'block';
                el.style.transform = `translate3d(${dist}px, 0, 0)`;
            }
        }
    }

    statusText.innerText = `Time: ${formatTime(playbackTime)}`;

    // Update Lyrics HUD
    if (lyricsEnabled && parsedLyrics.length > 0) {
        const currentIndex = parsedLyrics.findLastIndex(l => l.time <= playbackTime);
        const nextIndex = parsedLyrics.findIndex(l => l.time > playbackTime);

        if (currentIndex !== -1) {
            lyricLine1.innerText = parsedLyrics[currentIndex].text;
            if (currentIndex + 1 < parsedLyrics.length) {
                lyricLine2.innerText = parsedLyrics[currentIndex + 1].text;
                lyricLine2.classList.remove('hidden');
            } else {
                lyricLine2.innerText = '';
                lyricLine2.classList.add('hidden');
            }
        } else {
            lyricLine1.innerText = '';
            lyricLine2.innerText = parsedLyrics[0].text;
        }

        // Visibility Logic: On PC, only show if we are within 5s of the first lyric or already past it
        let showHUD = true;
        if (window.innerWidth >= 600) {
            const firstLyricTime = (parsedLyrics.length > 0) ? parsedLyrics[0].time : 0;
            if (playbackTime < firstLyricTime - 5) {
                showHUD = false;
            }
        }

        if (showHUD) {
            lyricsHUD.classList.remove('hidden');
        } else {
            lyricsHUD.classList.add('hidden');
        }
    } else {
        lyricsHUD.classList.add('hidden');
    }

    if (isPlaying) {
        animationFrame = requestAnimationFrame(updateLoop);
    }
}

function initYouTubePlayer(url) {
    const videoId = extractVideoID(url);
    if (!videoId) return;

    if (youtubePlayer) {
        youtubePlayer.cueVideoById(videoId);
    } else {
        youtubePlayer = new YT.Player('youtubePlayer', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: {
                'autoplay': 0,
                'playsinline': 1,
                'controls': 1,
                'rel': 0,
                'origin': window.location.origin
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
                'onError': onPlayerError
            }
        });
    }
}

function onPlayerReady(event) {
    console.log("YouTube Player Ready");
}

function onPlayerError(event) {
    console.error("YouTube Player Error:", event.data);
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PLAYING) {
        isYoutubePlaying = true;
        // Sync timeline to start playing if it was paused
        if (!isPlaying) {
            play();
        }

        if (enableTimingCapture) {
            setTimeout(() => {
                if (captureBtn) captureBtn.focus();
                else window.focus();
            }, 100);
        }
    } else if (event.data == YT.PlayerState.PAUSED || event.data == YT.PlayerState.ENDED) {
        isYoutubePlaying = false;
        // Sync timeline to pause if it was playing
        if (isPlaying) {
            pause();
        }
    }
}

function extractVideoID(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length == 11) ? match[7] : false;
}

function toggleTimingCapture() {
    enableTimingCapture = !enableTimingCapture;
    const touchHandler = (e) => {
        if (e.target.closest('.chord-suggestion-btn')) return;
        recordChord("?");
    };

    if (enableTimingCapture) {
        captureBtn.classList.add('active');
        recordingIndicator.classList.remove('hidden');
        youtubePlayerContainer.classList.remove('hidden');
        if (timeline) {
            timeline.addEventListener('touchstart', touchHandler, { passive: true });
        }
        wasAudioEnabledBeforeCapture = audioEnabled;
        audioEnabled = false;
        if (audioToggleBtn) audioToggleBtn.classList.remove('active');
        statusText.innerText = "CAPTURING: Press SPACE or Chord letter to mark chords";
    } else {
        captureBtn.classList.remove('active');
        recordingIndicator.classList.add('hidden');
        youtubePlayerContainer.classList.add('hidden');
        if (youtubePlayer) youtubePlayer.pauseVideo();
        if (isPlaying) pause();

        // Restore audio state
        audioEnabled = wasAudioEnabledBeforeCapture;
        if (audioToggleBtn) {
            audioToggleBtn.classList.toggle('active', audioEnabled);
        }

        statusText.innerText = "Capture Stopped";
    }
}

function recordChord(name = "?", time = null) {
    let currentTime = time;
    if (currentTime === null) {
        if (youtubePlayer && enableTimingCapture) {
            currentTime = youtubePlayer.getCurrentTime();
        } else {
            currentTime = isPlaying ? (performance.now() - startTime) / 1000 : pauseTime;
        }
    }

    chords.push({ name: name, time: currentTime });
    chords.sort((a, b) => a.time - b.time);

    renderStaticElements();
    updateLoop();
    checkForChanges();

    const currentDisplay = document.getElementById('currentChordDisplay');
    if (currentDisplay) {
        const originalColor = currentDisplay.style.color;
        currentDisplay.style.color = "#ef4444";
        setTimeout(() => {
            currentDisplay.style.color = originalColor || "";
        }, 300);
    }
}

function duplicateSelectedChords(offsetOverride = null, selectNew = false) {
    if (selectedIndices.size === 0) return;

    // Sort to keep order
    const indices = Array.from(selectedIndices).sort((a, b) => a - b);
    const newChords = [];

    // Calculate bounds to find offset
    // Default offset: 1 bar (if beatsPerBar defined) or 2 seconds
    let offset = (beatsPerBar && secondsPerBeat) ? (beatsPerBar * secondsPerBeat) : 2.0;
    if (offsetOverride !== null) offset = offsetOverride;

    indices.forEach(index => {
        const original = chords[index];
        if (original) {
            newChords.push({
                name: original.name,
                time: original.time + offset,
                _isNewCopy: true // Temporary tag to find them later
            });
        }
    });

    // Add new chords
    chords.push(...newChords);

    // To select the new chords, we need their new indices after sort.
    // Since sort changes indices, using a tag or unique ID is best.
    chords.sort((a, b) => a.time - b.time);

    let newIndices = [];
    if (selectNew) {
        clearSelection();
        for (let i = 0; i < chords.length; i++) {
            if (chords[i]._isNewCopy) {
                newIndices.push(i);
                selectChord(i, true); // additive
                delete chords[i]._isNewCopy; // Clean up
            }
        }
    } else {
        // Just clean up tags
        for (let i = 0; i < chords.length; i++) {
            if (chords[i]._isNewCopy) delete chords[i]._isNewCopy;
        }
    }

    renderStaticElements();
    updateLoop();
    checkForChanges();

    // Optional: Flash success
    if (statusText && !selectNew) { // Don't flash if dragging, distracting
        statusText.innerText = `Duplicated ${newChords.length} chords`;
        setTimeout(() => statusText.innerText = "Time: " + formatTime(pauseTime), 2000);
    }

    return newIndices;
}

function clearData() {
    confirmationModal.show(
        'Remove Data',
        '<span style="color: #e53e3e; font-weight: bold;">Warning:</span> This will remove all chord data for this song. Are you sure?',
        () => {
            // Clear internal data
            chords = [];
            markers = [];
            midiData = null;

            // Reset Markers to simple time
            const duration = 300; // Default 5 mins
            const bpm = 120;
            const mockMidi = {
                duration: duration,
                header: { tempos: [{ bpm: bpm }], timeSignatures: [{ timeSignature: [4, 4] }] }
            };
            markers = generateMarkers(mockMidi);
            midiData = mockMidi;

            // Reset UI
            chordTrack.innerHTML = '';
            markerTrack.innerHTML = '';
            renderStaticElements();

            // Save empty state to database
            saveToDatabase();

            // Update status
            statusText.innerText = 'Data cleared.';
        }
    );
}

// --- Message Listener for Parent Window (Embed Mode) ---
window.addEventListener('message', (event) => {
    const msg = event.data;

    if (msg.type === 'loadChordData') {
        console.log('Scrolling Chords received data:', msg);
        loadData(msg.data, msg.youtubeUrl, msg.title, msg.suggestedChords, msg.artist, msg.songTitle, msg.fullLyrics, msg.lyrics, msg.lyricOffset);
    }
    else if (msg.type === 'stopAudio') {
        if (pianoPlayer) pianoPlayer.stopAll();
        if (youtubePlayer && isYoutubePlaying && typeof youtubePlayer.pauseVideo === 'function') {
            youtubePlayer.pauseVideo();
        }
        isPlaying = false;
        if (playPauseBtn) {
            playPauseBtn.innerHTML = '▶ <span>Play</span>';
            playPauseBtn.classList.remove('playing');
        }
        cancelAnimationFrame(animationFrame);
    }
});

// --- Snap to Grid Logic ---
function snapToGrid(time) {
    if (!beatsPerBar || !secondsPerBeat || beatsPerBar <= 0) return time;

    const barDuration = beatsPerBar * secondsPerBeat;
    const snapInterval = barDuration / 8; // 8 moments per bar

    // Snap to nearest grid point
    const snapped = Math.round(time / snapInterval) * snapInterval;

    // Avoid snapping to negative
    return Math.max(0, snapped);
}

// --- Zoom Logic ---
function zoom(direction, customFactor = null) {
    const factor = customFactor || ZOOM_FACTOR;
    if (direction > 0) {
        PIXELS_PER_SECOND = Math.min(MAX_PIXELS_PER_SECOND, PIXELS_PER_SECOND * factor);
    } else {
        PIXELS_PER_SECOND = Math.max(MIN_PIXELS_PER_SECOND, PIXELS_PER_SECOND / factor);
    }

    // Immediate refresh
    updateLoop();
}

// Update existing listeners to use snapToGrid

// 1. Drop Listener (Timeline) - We need to replace the existing one or just override behavior? 
// Since we can't easily replace just part of an event listener without replacing the whole block in this tool,
// I will append the snap logic helper and rely on you (the user) knowing I need to edit the specific lines above.
// ACTUALLY, I should use multi_replace to target the specific blocks. This block is just for the function definition.
// ... Moving snapToGrid execution to multi_replace ...

// --- Selection & Group Operations ---

function toggleSelectionMode() {
    isSelectionMode = !isSelectionMode;
    if (selectModeBtn) {
        selectModeBtn.classList.toggle('active', isSelectionMode);
    }

    // Clear selection when exiting mode? Optional. Let's keep it for now.
    if (!isSelectionMode) {
        clearSelection();
    }

    // Update timeline interaction style
    timeline.style.cursor = isSelectionMode ? 'crosshair' : 'grab';
}

function clearSelection() {
    selectedIndices.clear();
    renderSelection();
}

function selectChord(index, addToSelection = false) {
    if (!addToSelection) {
        selectedIndices.clear();
    }
    selectedIndices.add(index);
    renderSelection();
}

function deselectChord(index) {
    selectedIndices.delete(index);
    renderSelection();
}

function renderSelection() {
    // Update visual state of all chords
    const chordElements = chordTrack.children;
    for (let i = 0; i < chordElements.length; i++) {
        const index = parseInt(chordElements[i].dataset.index);
        if (selectedIndices.has(index)) {
            chordElements[i].classList.add('selected');
        } else {
            chordElements[i].classList.remove('selected');
        }
    }

    // Update Button Visibility
    const hasSelection = selectedIndices.size > 0;
    if (duplicateBtn) duplicateBtn.classList.toggle('hidden', !hasSelection);
    if (deleteSelectedBtn) deleteSelectedBtn.classList.toggle('hidden', !hasSelection);
}

function updateSelectionFromBox() {
    if (!selectionBoxEl) return;
    const boxRect = selectionBoxEl.getBoundingClientRect();
    const chordElements = chordTrack.children;

    selectedIndices.clear();

    for (let i = 0; i < chordElements.length; i++) {
        const el = chordElements[i];
        const rect = el.getBoundingClientRect();

        const overlap = !(
            rect.right < boxRect.left ||
            rect.left > boxRect.right ||
            rect.bottom < boxRect.top ||
            rect.top > boxRect.bottom
        );

        if (overlap) {
            const index = parseInt(el.dataset.index);
            selectedIndices.add(index);
        }
    }
    renderSelection();
}

function deleteSelectedChords() {
    if (selectedIndices.size === 0) return;

    confirmationModal.show(
        'Delete Chords',
        `Are you sure you want to delete <b>${selectedIndices.size}</b> selected chords?`,
        () => {
            // Sort indices descending to remove safely
            const indices = Array.from(selectedIndices).sort((a, b) => b - a);

            indices.forEach(index => {
                chords.splice(index, 1);
            });

            clearSelection();
            renderStaticElements();
            updateLoop();
            checkForChanges();
        }
    );
}

// duplicateSelectedChords is defined above

// Signal that we are ready to receive data
console.log('Scrolling Chords: Listener ready');
if (window.parent) {
    window.parent.postMessage({ type: 'scrollingChordsReady' }, '*');
} else if (window.opener) {
    window.opener.postMessage({ type: 'scrollingChordsReady' }, '*');
}
