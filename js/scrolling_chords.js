// $12.544)

const midiInput = document.getElementById('midiInput');
const statusText = document.getElementById('statusText');
const playPauseBtn = document.getElementById('playPauseBtn');
const rwdBtn = document.getElementById('rwdBtn');
const fwdBtn = document.getElementById('fwdBtn');
const exportBtn = document.getElementById('exportBtn');
const timeline = document.getElementById('timeline');
const chordTrack = document.getElementById('chordTrack');
const markerTrack = document.getElementById('markerTrack');
const tracksContainer = document.getElementById('tracksContainer');
const currentChordDisplay = document.getElementById('currentChordDisplay');
const instructions = document.getElementById('instructions');
const metronomeBtn = document.getElementById('metronomeBtn');
const bpmBtn = document.getElementById('bpmBtn');
const saveBtn = document.getElementById('saveBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
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
const songMapPlayPauseBtn = document.getElementById('songMapPlayPauseBtn');
const chordProgressionBtn = document.getElementById('chordProgressionBtn');
let chordProgressionEditor = null;
const COUNT_IN_SECONDS = 4;

// Check for embed mode
const urlParams = new URLSearchParams(window.location.search);
const isEmbed = urlParams.get('embed') === 'true';
const autoOpenMap = urlParams.get('openMap') === 'true';
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
        .pure-timeline-menu-container { position: relative !important; }
        .pure-timeline-hamburger-menu { position: absolute !important; top: 100% !important; right: auto !important; left: 0 !important; margin-top: 15px !important; background: white !important; opacity: 1 !important; visibility: visible !important; text-shadow: none !important; min-width: 260px !important; }
        .file-input { color: #333 !important; }
        button { color: #000 !important; border-color: #ccc !important; }
        .controls-container { padding-right: 120px !important; }
    `;
    document.head.appendChild(style);
}

let midiData = null;
let currentFileName = 'song';
let currentSongKey = 'C';
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
let originalUseFlatNotation = false; // For notation change detection
let originalMapSectionsJson = 'null'; // For section change detection
let currentTempo = 120; // Shared state for tempo
let currentSpeed = 1.0; // Playback speed (1.0x, 0.75x or 0.5x)
let playbackOctave = 0; // Octave shift: 0 (default low), 1 (+1 oct), 2 (+2 oct)
let octaveCycleBtn = null;
let currentLyricOffset = 0; // Track current global lyrics offset
let originalLyricOffset = 0; // For lyric offset change detection
const syncFirstLyricBtn = document.getElementById('syncFirstLyricBtn');
let isPublicMode = false;
let canEditPublic = false;
let currentCapoValue = 0; // The Capo value from the parent modal (Guitar only)

// Dragging state
let isDragging = false;
let dragStartX = 0;
let dragStartTime = 0;
let isDraggingChord = false;
let draggedChord = null;
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
let PIXELS_PER_SECOND = 100; // Speed of scrolling (Updated for 16 subdivisions)
const MIN_PIXELS_PER_SECOND = 25;
const MAX_PIXELS_PER_SECOND = 300;
const ZOOM_FACTOR = 1.2;

window.lastActiveIndex = -1;
window.lastLyricIndex = -1;

function getPlayheadOffset() {
    const w = window.innerWidth;
    if (w <= 600) return 80;
    if (w <= 1024) return 180;
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
let selectedChords = new Set();
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

// Undo/Redo Stack
let undoStack = [];
let redoStack = [];
const MAX_UNDO = 50;
let dragUndoSnapshot = null; // Temporary hold for pre-drag state
let currentInstrumentMode = 'piano';

function simplifyDisplayName(chordName, isForAudio = false) {
    if (!chordName) return chordName;
    
    let resultName = chordName;

    // Apply CAPO for visual display ONLY
    // We transpose AWAY from original key (-capoValue) for display
    if (!isForAudio && currentInstrumentMode === 'guitar' && currentCapoValue !== 0) {
        if (chordParser) {
            resultName = chordParser.transpose(resultName, -currentCapoValue);
        }
    }

    if (currentInstrumentMode === 'guitar') {
        return resultName.split('/')[0].replace(/[23]$/, '');
    } else if (currentInstrumentMode === 'ukulele') {
        return resultName.split('/')[0].replace(/[237]/g, '');
    }
    return resultName;
}

function saveUndoState() {
    undoStack.push(JSON.parse(JSON.stringify(chords)));
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    // Clear redo stack on new action
    redoStack = [];
}

function undo() {
    if (undoStack.length === 0) return;

    // Save current state to redo stack before applying undo
    redoStack.push(JSON.parse(JSON.stringify(chords)));
    if (redoStack.length > MAX_UNDO) redoStack.shift();

    chords = undoStack.pop();

    finalizeUndoRedo('Undo successful');
}

function redo() {
    if (redoStack.length === 0) return;

    // Save current state to undo stack before applying redo
    undoStack.push(JSON.parse(JSON.stringify(chords)));
    if (undoStack.length > MAX_UNDO) undoStack.shift();

    chords = redoStack.pop();

    finalizeUndoRedo('Redo successful');
}

function finalizeUndoRedo(message) {
    // Attempt to clear UI selection state if that function exists
    if (typeof clearSelection === 'function') clearSelection();

    if (typeof renderStaticElements === 'function') renderStaticElements();
    if (typeof updateLoop === 'function') updateLoop();
    if (typeof checkForChanges === 'function') checkForChanges();

    if (typeof statusText !== 'undefined' && statusText) {
        statusText.innerText = message;
        setTimeout(() => {
            if (statusText) statusText.innerText = "Time: " + formatTime(typeof pauseTime !== 'undefined' ? pauseTime : 0);
        }, 2000);
    }
}


// --- Handshake & Message Listener (Moved to top for performance) ---
window.addEventListener('message', (event) => {
    const msg = event.data;

    if (msg.type === 'loadChordData') {
        console.log('Scrolling Chords received data:', msg);
        if (msg.isPublic !== undefined) isPublicMode = msg.isPublic;
        if (msg.canEdit !== undefined) canEditPublic = msg.canEdit;
        if (msg.capo !== undefined) currentCapoValue = parseInt(msg.capo) || 0;
        loadData(msg.data, msg.youtubeUrl, msg.title, msg.suggestedChords, msg.artist, msg.songTitle, msg.fullLyrics, msg.lyrics, msg.lyricOffset, msg.instrumentMode, msg.key, currentCapoValue);
        // Restore last playback position if provided
        if (msg.lastPosition && msg.lastPosition > 0) {
            pauseTime = msg.lastPosition;
            renderStaticElements();
        }
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
    else if (msg.type === 'undoAction') {
        if (typeof undo === 'function') {
            undo();
        }
    }
    else if (msg.type === 'checkUnsavedChanges') {
        const hasChanges = checkIfHasChanges();

        // Also report current playback position so the parent can restore it
        const currentTime = isPlaying ? (performance.now() - startTime) / 1000 : pauseTime;

        window.parent.postMessage({
            type: 'unsavedChangesResult',
            hasChanges: hasChanges,
            currentTime: Math.max(0, currentTime)
        }, '*');
    }
    else if (msg.type === 'toggleTimelineCloseBtn') {
        // This is just a signal from parent, we don't need a result usually 
        // but let's send one if it was an inquiry
        const hasChanges = checkIfHasChanges();
        window.parent.postMessage({
            type: 'unsavedChangesResult',
            hasChanges: hasChanges
        }, '*');
    }
    else if (msg.type === 'updateSuggestedChords') {
        // Refresh just the toolbar buttons — does not affect chords, position, or any other state
        if (Array.isArray(msg.suggestedChords)) {
            suggestedChords = msg.suggestedChords;
            if (msg.instrumentMode) currentInstrumentMode = msg.instrumentMode;
            renderSuggestedChords(suggestedChords);
        }
    }
    else if (msg.type === 'saveChanges') {
        saveToDatabase();
    }
    else if (msg.type === 'setInstrumentMode') {
        currentInstrumentMode = msg.instrumentMode;
        renderStaticElements();
        updateLoop();
    }
});

// Signal that we are ready to receive data
console.log('Scrolling Chords: Handshake ready');
if (window.parent) {
    window.parent.postMessage({ type: 'scrollingChordsReady' }, '*');
} else if (window.opener) {
    window.opener.postMessage({ type: 'scrollingChordsReady' }, '*');
}


// Setup Event Listeners
// Setup Event Listeners (Safe Initialization)
document.addEventListener('DOMContentLoaded', () => {
    console.log('Scrolling Chords: Initializing Event Listeners');

    if (midiInput) midiInput.addEventListener('change', handleFileSelect);
    if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlayPause);
    if (rwdBtn) rwdBtn.addEventListener('click', () => seek(-10));
    if (fwdBtn) fwdBtn.addEventListener('click', () => seek(10));
    if (exportBtn) exportBtn.addEventListener('click', exportToJSON);
    if (saveBtn) saveBtn.addEventListener('click', saveToDatabase);
    if (undoBtn) undoBtn.addEventListener('click', undo);
    if (redoBtn) redoBtn.addEventListener('click', redo);
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

    if (chordProgressionBtn) {
        chordProgressionBtn.addEventListener('click', () => {
            if (typeof ChordProgressionEditor === 'undefined') {
                console.error("ChordProgressionEditor script not loaded yet.");
                return;
            }

            if (!chordProgressionEditor) {
                // Initialize if not already done
                // Use the existing pianoPlayer if it exists, but editor can create its own
                chordProgressionEditor = new ChordProgressionEditor(pianoPlayer);
            }

            // Create a temporary target field to hold the editor's output
            const tempInput = document.createElement('textarea');
            tempInput.value = ""; // Start empty

            const blocks = [
                {
                    name: 'Chord Timeline Progression Editor',
                    field: tempInput,
                    songKey: currentSongKey || 'C'
                }
            ];

            chordProgressionEditor.show(blocks, 0, () => {
                // When "Done" is clicked, we take the chords and add them to suggested toolbar
                const chordString = tempInput.value;
                console.log("Timeline Editor Callback: Received chords from tempInput:", chordString);

                if (chordString && chordString.trim()) {
                    // Split by spaces, commas, or pipes and filter out empty strings
                    const newChords = chordString.trim().split(/[\s,\|]+/).filter(c => c);

                    if (newChords.length > 0) {
                        // Append to the global suggestedChords list instead of replacing it
                        console.log("Timeline Editor Callback: Appending to suggestedChords:", newChords);
                        const customGroup = {
                            title: 'Editor Result',
                            chords: newChords
                        };

                        // Add to current global state
                        suggestedChords.push(customGroup);

                        // Render the fully merged set
                        renderSuggestedChords(suggestedChords);

                        // Ensure the toolbar is centered/positioned correctly
                        if (typeof updateHUDPosition === 'function') {
                            updateHUDPosition();
                        }
                    }
                } else {
                    console.warn("Timeline Editor Callback: No chords found in tempInput.value");
                }
            });
        });
    }

    // Zoom Buttons
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    if (zoomInBtn) zoomInBtn.addEventListener('click', () => zoom(1));
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => zoom(-1));

    if (barDecBtn) barDecBtn.addEventListener('click', () => adjustBarOffset(-0.25));
    if (barIncBtn) barIncBtn.addEventListener('click', () => adjustBarOffset(0.25));

    const shiftChordsLeftBtn = document.getElementById('shiftChordsLeftBtn');
    const shiftChordsRightBtn = document.getElementById('shiftChordsRightBtn');
    if (shiftChordsLeftBtn) shiftChordsLeftBtn.addEventListener('click', () => shiftChords(-1));
    if (shiftChordsRightBtn) shiftChordsRightBtn.addEventListener('click', () => shiftChords(1));

    if (toggleLyricsBtn) toggleLyricsBtn.addEventListener('click', toggleLyricsHUD);

    // Timeline Hamburger Menu Logic
    const timelineHamburgerBtn = document.getElementById('timelineHamburgerBtn');
    const timelineHamburgerMenu = document.getElementById('timelineHamburgerMenu');
    if (timelineHamburgerBtn && timelineHamburgerMenu) {
        timelineHamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            timelineHamburgerMenu.classList.toggle('hidden');
            
            if (!timelineHamburgerMenu.classList.contains('hidden')) {
                // Sync values when opening
                if (typeof syncSettingsMenu === 'function') syncSettingsMenu();
            }

            // Lyrics toggle text sync removed as it is now in the main toolbar
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!timelineHamburgerMenu.contains(e.target) && e.target !== timelineHamburgerBtn) {
                timelineHamburgerMenu.classList.add('hidden');
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



    const metronomeToggle = document.getElementById('metronomeToggle');
    const octaveOptions = document.querySelectorAll('.octave-option');
    const menuBpmOption = document.getElementById('menuBpmOption');
    const menuBpmDisplay = document.getElementById('menuBpmDisplay');

    function syncSettingsMenu() {
        if (metronomeToggle) metronomeToggle.checked = metronomeEnabled;
        if (menuBpmDisplay) menuBpmDisplay.innerText = currentTempo;

        // Sync Octave Display
        if (menuOctaveValue) {
            const labels = ["LOW", "MID", "HIGH"];
            menuOctaveValue.innerText = labels[playbackOctave] || "MID";
        }

        octaveOptions.forEach(opt => {
            const val = parseInt(opt.dataset.val);
            opt.classList.toggle('active', val === playbackOctave);
        });
    }

    // Pure View Toggle inside Hamburger (if it exists)
    const switchToPureBtn = document.getElementById('switchToPureBtn');
    if (switchToPureBtn) {
        switchToPureBtn.addEventListener('click', () => {
            window.forcePureMode = true;
            window.forceFullMode = false;
            // Force refresh of the orientation/view logic
            if (typeof forceOrientationRefresh === 'function') {
                forceOrientationRefresh();
            } else {
                // If the function is not in current scope, we just trigger a resize
                window.dispatchEvent(new Event('resize'));
            }
            // Close the menu
            if (timelineHamburgerMenu) timelineHamburgerMenu.classList.add('hidden');
        });
    }

    // Chord Octave Cycle Switcher
    const menuOctaveCycleBtn = document.getElementById('menuOctaveCycleBtn');
    const menuOctaveValue = document.getElementById('menuOctaveValue');
    if (menuOctaveCycleBtn) {
        menuOctaveCycleBtn.addEventListener('click', () => {
            // Cycle: 0 (Low) -> 1 (Mid) -> 2 (High) -> 0
            playbackOctave = (playbackOctave + 1) % 3;
            
            // Visual feedback via trigger (optional)
            if (typeof triggerChordAudio === 'function') triggerChordAudio('C', 1.0, true);
            
            // Sync visibility
            if (typeof syncSettingsMenu === 'function') syncSettingsMenu();
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

    const midiNotationToggle = document.getElementById('midiNotationToggle');
    if (midiNotationToggle) {
        midiNotationToggle.addEventListener('change', () => {
            checkForChanges();
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
        const toggleYT = (e) => {
            if (e) e.preventDefault();
            if (!youtubePlayerContainer) return;
            const isHidden = youtubePlayerContainer.classList.contains('hidden');
            if (isHidden) {
                youtubePlayerContainer.classList.remove('hidden');
                youtubeToggleBtn.classList.add('active');
                if (document.getElementById('songMapYouTubeBtn')) document.getElementById('songMapYouTubeBtn').classList.add('active');
                if (youtubePlayer && typeof youtubePlayer.playVideo === 'function') {
                    youtubePlayer.playVideo();
                }
            } else {
                youtubePlayerContainer.classList.add('hidden');
                youtubeToggleBtn.classList.remove('active');
                if (document.getElementById('songMapYouTubeBtn')) document.getElementById('songMapYouTubeBtn').classList.remove('active');
                if (youtubePlayer && typeof youtubePlayer.pauseVideo === 'function') {
                    youtubePlayer.pauseVideo();
                }
            }
        };
        window.toggleYouTubePlayer = toggleYT;
        youtubeToggleBtn.addEventListener('click', toggleYT);
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

    // YouTube Volume Slider Logic
    const youtubeVolumeSlider = document.getElementById('youtubeVolumeSlider');
    if (youtubeVolumeSlider) {
        youtubeVolumeSlider.addEventListener('input', (e) => {
            if (youtubePlayer && typeof youtubePlayer.setVolume === 'function') {
                youtubePlayer.setVolume(e.target.value);
            }
        });

        // Prevent drag handle from triggering when sliding volume
        youtubeVolumeSlider.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
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

    // Ctrl Key Listener for Cursor Feedback and Undo
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Control') {
            document.body.classList.add('ctrl-held');
        }

        // Undo shortcut: Ctrl+Z or Cmd+Z
        if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'z')) {
            e.preventDefault();
            undo();
        }

        // Redo shortcut: Ctrl+Y or Cmd+Y
        if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y')) {
            e.preventDefault();
            redo();
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
        // Toggle box selection if in Selection Mode OR if in Edit Mode on PC (Mouse)
        if (isSelectionMode || (isEditMode && e.pointerType === 'mouse')) {
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
            if (menuZoomValue) menuZoomValue.textContent = `${Math.round(PIXELS_PER_SECOND / 100 * 100)}%`;
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

    // Dynamic Lyrics HUD Positioning (The \"Smart Push\")
    if (buttonsContainer) {
        const toolbarObserver = new ResizeObserver(() => {
            updateHUDPosition();
        });
        toolbarObserver.observe(buttonsContainer);
    }

    // --- Robust Mobile Orientation Detection (for v2.441 Landscape Timeline) ---
    const setupResponsiveView = () => {
        const checkView = () => {
            const isPortrait = window.innerHeight > window.innerWidth;
            const hasTouch = window.matchMedia("(pointer: coarse)").matches || window.devicePixelRatio > 1.5;
            
            // Mobile Phone / Small Tablet Landscape height inclusion
            const isPhoneLandscape = !isPortrait && window.innerHeight <= 768 && hasTouch;
            // Standard mobile/tablet check
            const isMobile = window.innerWidth <= 768 || (isPortrait && hasTouch) || isPhoneLandscape;

            if (isMobile || window.forcePureMode) {
                document.body.classList.add('is-mobile-view');
                if ((isPhoneLandscape || window.forcePureMode) && !window.forceFullMode) {
                    document.body.classList.add('is-mobile-landscape');
                } else {
                    document.body.classList.remove('is-mobile-landscape');
                }
            } else {
                document.body.classList.remove('is-mobile-view');
                document.body.classList.remove('is-mobile-landscape');
            }
        };

        const forceOrientationRefresh = () => {
            checkView();
            updateHUDPosition();
            renderStaticElements(); // Force staggering/size recalculation on rotation
        };

        window.addEventListener('resize', forceOrientationRefresh);
        window.addEventListener('orientationchange', forceOrientationRefresh);
        forceOrientationRefresh(); // Initial call

        // Setup the Pure Timeline Buttons
        window.forceFullMode = false;
        window.forcePureMode = false;
        
        const pureFullModeBtn = document.getElementById('pureTimelineFullModeBtn');
        if (pureFullModeBtn) {
            pureFullModeBtn.addEventListener('click', () => {
                window.forceFullMode = true;
                window.forcePureMode = false; // Reset pure mode if they exit it
                forceOrientationRefresh();
            });
        }

        const pureMenuBtn = document.getElementById('pureTimelineMenuBtn');
        const pureMenuMenu = document.getElementById('pureTimelineMenu');
        if (pureMenuBtn && pureMenuMenu) {
            pureMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                pureMenuMenu.classList.toggle('hidden');
                
                // Update labels for toggles
                const lyricsBtn = document.getElementById('pureMenuLyricsBtn');
                if (lyricsBtn) {
                    const label = lyricsBtn.querySelector('.label');
                    const isLyricsActive = !(document.getElementById('lyricsHUD') && document.getElementById('lyricsHUD').classList.contains('hidden'));
                    if (label) label.innerText = isLyricsActive ? "Lyrics (ON)" : "Lyrics (OFF)";
                }
                const audioBtn = document.getElementById('pureMenuAudioBtn');
                if (audioBtn) {
                    const label = audioBtn.querySelector('.label');
                    if (label) label.innerText = audioEnabled ? "Disable Chord Audio" : "Enable Chord Audio";
                }
            });

            document.addEventListener('click', (e) => {
                if (!pureMenuMenu.contains(e.target) && e.target !== pureMenuBtn) {
                    pureMenuMenu.classList.add('hidden');
                }
            });

            document.getElementById('pureMenuLyricsBtn')?.addEventListener('click', () => {
                if (typeof toggleLyricsHUD === 'function') toggleLyricsHUD();
                pureMenuMenu.classList.add('hidden');
            });

            document.getElementById('pureMenuAudioBtn')?.addEventListener('click', () => {
                if (typeof toggleAudio === 'function') toggleAudio();
                pureMenuMenu.classList.add('hidden');
            });

            document.getElementById('pureMenuZoomInBtn')?.addEventListener('click', () => {
                if (typeof zoom === 'function') zoom(1);
            });

            document.getElementById('pureMenuZoomOutBtn')?.addEventListener('click', () => {
                if (typeof zoom === 'function') zoom(-1);
            });
        }

        // --- Switch TO Pure View Button (from Full Mode) ---
        const switchToPureBtn = document.getElementById('switchToPureBtn');
        if (switchToPureBtn) {
            switchToPureBtn.addEventListener('click', () => {
                window.forceFullMode = false; // Override the previously clicked "Full Mode"
                window.forcePureMode = true;  // Explicitly request the Pure View
                forceOrientationRefresh();
            });
        }
    };

    setupResponsiveView();
});

// Space bar recording or toggle play/pause (Global listener)
document.addEventListener("keydown", e => {
    // Ignore if typing in an input field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.code === "Space") {
        // Ignore if Song Map is open
        const songMapOverlay = document.getElementById('songMapOverlay');
        if (songMapOverlay && !songMapOverlay.classList.contains('hidden')) return;

        e.preventDefault();
        if (enableTimingCapture) {
            recordChord();
        } else {
            togglePlayPause();
        }
        return;
    }

    // Delete selected chords in Chord Timeline (Edit Mode only)
    if (e.key === "Delete" && isEditMode) {
        if (selectedChords.size > 0) {
            e.preventDefault();
            deleteSelectedChords();
            return;
        }
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
                    checkForChanges();
                }
            }
        }
    }

    // Explicitly handle 'F' to prevent YouTube fullscreen interception if parent has focus
    if (e.key.toLowerCase() === 'f') {
        // Only prevent if not in an input, which is handled at the start of the listener
        e.preventDefault();
        console.log("Scrolling Chords: Intercepted 'F' key to prevent YouTube fullscreen");
        // Future: could trigger a timeline-specific find or fullscreen here
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
        if (currentSpeed === 1.0) {
            currentSpeed = 0.75;
        } else if (currentSpeed === 0.75) {
            currentSpeed = 0.5;
        } else {
            currentSpeed = 1.0;
        }

        const icon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
        speedBtn.innerHTML = `${icon} <span>${currentSpeed}x</span>`;

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

    // Set sound based on mode
    let actualStagger = 0.05;
    if (currentInstrumentMode === 'guitar') {
        pianoPlayer.setSound('guitar-strum');
        actualStagger = 0.035;
    } else if (currentInstrumentMode === 'ukulele') {
        pianoPlayer.setSound('ukulele');
        actualStagger = 0.03;
    } else {
        pianoPlayer.setSound('piano');
    }

    let chord;
    if (currentInstrumentMode === 'guitar' && window.GuitarChordDatabase) {
        chord = chordParser.parseGuitarChord(chordName, window.GuitarChordDatabase);
    } else if (currentInstrumentMode === 'ukulele' && window.UkuleleChordDatabase) {
        chord = chordParser.parseUkuleleChord(chordName, window.UkuleleChordDatabase);
    } else {
        chord = chordParser.parse(chordName);
    }

    if (chord && chord.notes) {
        // Apply playback octave shift
        let notes = [...chord.notes];
        if (playbackOctave > 0) {
            notes = notes.map(n => n + (playbackOctave * 12));
        }

        // Use provided duration (playback uses 10s, manual clicks use 1s)
        pianoPlayer.playChord(notes, duration, 0.4, actualStagger, currentInstrumentMode !== 'piano');
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
    triggerChordAudio('C', 2.0, true);
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
    // Disable chord dragging on touch devices unless EDIT mode is ON to allow easier timeline scrolling
    if (e.pointerType === 'touch' && !isEditMode) return;

    const target = e.target.closest('.chord-item');
    if (target) {
        e.stopPropagation(); // Prevent bubbling to timeline drag

        const index = parseInt(target.dataset.index);

        // Selection Logic
        if (isSelectionMode || e.shiftKey) {
            const chordObj = chords[index];
            if (selectedChords.has(chordObj)) {
                // If already selected and Shift clicked, deselect
                if (e.shiftKey) {
                    deselectChord(index);
                    return;
                }
            } else {
                // Determine if we are adding or replacing
                // If Select Mode is ON: simple tap toggles selection
                if (isSelectionMode) {
                    if (selectedChords.has(chordObj)) deselectChord(chordObj);
                    else selectChord(chordObj, true); // true = additive
                    return;
                }

                // Shift key logic
                if (e.shiftKey) {
                    selectChord(chordObj, true); // additive
                    return;
                }
            }
        }

        // REMOVED: Automatic selection on pointerdown
        /*
        if (!selectedChords.has(index) && !e.shiftKey && !isSelectionMode) {
            selectChord(index, false); // exclusive selection
        }
        */

        isDraggingChord = true;
        draggedChord = chords[index]; // Use reference instead of index
        isDraggingGroup = selectedChords.has(draggedChord) && selectedChords.size > 1;
        dragPointerStartX = e.clientX;

        // Store initial times for moved chords to support group drag without drift
        // Using a Map of chordObject -> initialTime for stability during array sorting
        window.dragInitialTimes = new Map();
        if (isDraggingGroup) {
            selectedChords.forEach(chord => {
                window.dragInitialTimes.set(chord, chord.time);
            });
        } else {
            window.dragInitialTimes.set(draggedChord, draggedChord.time);
        }

        let initialTime = draggedChord.time;
        if (Number.isNaN(initialTime) || !Number.isFinite(initialTime)) initialTime = 0;
        dragChordStartTime = initialTime;

        // Copy on Drag: Just flag it, don't duplicate yet
        // We wait for actual movement to "peel off" the copy
        if (e.ctrlKey) {
            // Ensure the chord we are dragging is actually selected so duplication works
            if (!selectedChords.has(chords[index])) {
                selectChord(chords[index], false); // exclusive selection
            }
            isCopying = true;
        } else {
            isCopying = false;
        }

        dragHasMoved = false;
        dragUndoSnapshot = JSON.parse(JSON.stringify(chords));

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
                saveUndoState();
                const targetChord = chords[index];
                // Remove chord by reference filter for stability
                chords = chords.filter(c => c !== targetChord);
                // Re-render
                renderStaticElements();
                updateLoop();
                checkForChanges();
                return;
            }

            const newName = result;
            if (newName && newName !== currentName) {
                saveUndoState();
                chords[index].name = newName;
                renderStaticElements();
                updateLoop();
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
            if (menuZoomValue) menuZoomValue.textContent = `${Math.round(PIXELS_PER_SECOND / 100 * 100)}%`;
            lastPinchDist = newDist;
        }
        return;
    }

    // 1. Timeline Drag (Scrolling)
    if (isDragging) {
        e.preventDefault();
        const deltaX = e.clientX - dragStartX;
        const deltaTime = deltaX / PIXELS_PER_SECOND;
        // Allow scrolling back into "negative" pre-roll space (Bar 0)
        const newTime = Math.max(-5.0, dragStartTime - deltaTime);

        if (isPlaying) {
            startTime = performance.now() - (newTime * 1000);
            if (youtubePlayer && isYoutubePlaying) {
                // Throttle seeks to 100ms and use allowSeekAhead=false during drag 
                // to prevent black screen/crash on mobile
                const now = Date.now();
                if (now - lastYoutubeSeekTime > 100) {
                    youtubePlayer.seekTo(Math.max(0, newTime), false);
                    lastYoutubeSeekTime = now;
                }
            }
        } else {
            pauseTime = newTime;
            if (youtubePlayer) {
                const now = Date.now();
                if (now - lastYoutubeSeekTime > 100) {
                    youtubePlayer.seekTo(Math.max(0, newTime), false);
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

            // Highlight specific chord if hovering over it
            const hoverTarget = document.elementFromPoint(e.clientX, e.clientY);
            // Clear previous hover states
            document.querySelectorAll('.chord-item.drag-hover').forEach(el => el.classList.remove('drag-hover'));

            if (hoverTarget && hoverTarget.classList.contains('chord-item')) {
                hoverTarget.classList.add('drag-hover');
            }
        } else {
            timeline.style.backgroundColor = '';
        }
    }

    if (!isDraggingChord || !draggedChord) return;

    const deltaX = e.clientX - dragPointerStartX;

    // Only start "dragging" if we moved more than a threshold to avoid accidental drags
    if (!dragHasMoved && Math.abs(deltaX) > 15) { // Increased to 15px
        dragHasMoved = true;

        if (isCopying) {
            // DUPLICATE selected chords and drag the NEW ones
            duplicateSelectedChords(0, true);
            isCopying = false;

            // Update dragInitialTimes to the new selection
            window.dragInitialTimes = new Map();
            selectedChords.forEach(chord => {
                window.dragInitialTimes.set(chord, chord.time);
            });
            // Pick any chord from the new selection as the reference point
            draggedChord = Array.from(selectedChords)[0];
            dragChordStartTime = draggedChord ? draggedChord.time : 0;
        }

        if (isPlaying) pause();
    }

    if (dragHasMoved) {
        e.preventDefault();
        const deltaTime = deltaX / PIXELS_PER_SECOND;

        // Apply to ALL moved chords via object references
        if (window.dragInitialTimes && window.dragInitialTimes.size > 0) {
            window.dragInitialTimes.forEach((initialT, chord) => {
                chord.time = snapToGrid(Math.max(0, initialT + deltaTime));
            });
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
            youtubePlayer._syncingFromTimeline = true;
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

            // Check if dropped directly onto a Placeholder '?' chord
            document.querySelectorAll('.chord-item.drag-hover').forEach(el => el.classList.remove('drag-hover'));
            const dropTarget = document.elementFromPoint(e.clientX, e.clientY);

            if (dropTarget && dropTarget.classList.contains('chord-item')) {
                const targetIndex = parseInt(dropTarget.dataset.index);
                if (!isNaN(targetIndex) && chords[targetIndex]) {
                    // Replace existing placeholder
                    saveUndoState();
                    chords[targetIndex].name = virtualDraggedChord;
                    renderStaticElements();
                    updateLoop();
                    checkForChanges();
                    triggerChordAudio(virtualDraggedChord, 1.0);
                } else {
                    // It was dropped on an existing valid chord, could either replace it or insert near it. 
                    recordChord(virtualDraggedChord, snappedTime);
                    triggerChordAudio(virtualDraggedChord, 1.0);
                }
            } else {
                // Not dropped on a chord specifically, so place it on the timeline normally
                recordChord(virtualDraggedChord, snappedTime);
                triggerChordAudio(virtualDraggedChord, 1.0);
            }

            // SET FLAG to prevent triggering the "click" event which would add another chord at the playhead
            window.justFinishedVirtualDrag = true;
            setTimeout(() => { window.justFinishedVirtualDrag = false; }, 200);
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
            if (dragUndoSnapshot) {
                undoStack.push(dragUndoSnapshot);
                if (undoStack.length > MAX_UNDO) undoStack.shift();
                redoStack = []; // Clear redo on drag drop
                dragUndoSnapshot = null;
            }
            // Sort chords and re-render to fix visual order and indices
            chords.sort((a, b) => a.time - b.time);
            renderStaticElements();
            updateLoop(); // Force visual refresh to prevent "bar focus loss"
            checkForChanges();
        }

        draggedChord = null;
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

function loadChordData(data) {
    if (!data.chords || !Array.isArray(data.chords)) {
        throw new Error('Invalid data format: missing chords array');
    }

    chords = data.chords;
    const duration = data.duration || (chords.length > 0 ? chords[chords.length - 1].time + 5 : 60);
    const bpm = data.tempo || 120;

    // Mock midi object for marker generation
    const mockMidi = {
        tracks: [],
        bpm: bpm,
        timeSignature: [4, 4]
    };
    markers = generateMarkers(mockMidi);
    midiData = mockMidi;

    customMapSections = data.customMapSections || null;
    originalMapSectionsJson = JSON.stringify(customMapSections);

    finishLoading(chords.length, bpm);
}

// Renders just the chord suggestion toolbar from a groups array
function renderSuggestedChords(groups) {
    const buttonsContainer = document.getElementById('chordButtonsContainer');
    if (!buttonsContainer) return;

    try {
        buttonsContainer.innerHTML = ''; // Clear previous

        if (!groups || !Array.isArray(groups) || groups.length === 0) {
            buttonsContainer.classList.add('hidden');
            return;
        }

        buttonsContainer.classList.remove('hidden');

        const isMarker = (item) => item === '|' || /^\d+x$/.test(item);

        const makeChordBtn = (chordName, type) => {
            const btn = document.createElement('button');
            btn.className = type ? `chord-suggestion-btn chord-type-${type}` : 'chord-suggestion-btn';
            btn.textContent = simplifyDisplayName(chordName);
            btn.draggable = false;
            btn.style.touchAction = 'none';
            btn.onpointerdown = () => { initAudio(); triggerChordAudio(simplifyDisplayName(chordName, true), 2.0, true); };
            btn.onclick = () => {
                if (window.justFinishedVirtualDrag) return;
                if (enableTimingCapture) recordChord(chordName);
            };
            btn.addEventListener('pointerdown', (e) => {
                btn.setPointerCapture(e.pointerId);
                potentialVirtualDrag = true;
                virtualDraggedChord = chordName; // Use original name for storage/undo consistency
                virtualDragStartX = e.clientX;
                virtualDragStartY = e.clientY;
            });
            return btn;
        };

        const makeMarkerEl = (label) => {
            const span = document.createElement('span');
            span.className = 'chord-toolbar-inline-marker';
            span.textContent = label;
            return span;
        };

        const makeHeaderActionBtn = (iconSvg, title, className, onClick) => {
            const btn = document.createElement('button');
            btn.className = `header-action-btn ${className}`;
            btn.innerHTML = iconSvg;
            btn.title = title;
            btn.onclick = (e) => {
                e.stopPropagation();
                onClick();
            };
            return btn;
        };

        // Safety check for grouping
        const isGrouped = groups.length > 0 && typeof groups[0] === 'object' && groups[0] !== null && groups[0].chords;

        if (isGrouped) {
            // Use the groups in the order received from the parent
            const sortedGroups = groups.filter(g => g && g.chords && g.chords.length > 0);
            
            sortedGroups.forEach((group, groupIdx) => {
                const groupContainer = document.createElement('div');
                groupContainer.className = 'chord-toolbar-group';

                const header = document.createElement('div');
                header.className = 'chord-toolbar-section-header';

                const titleSpan = document.createElement('span');
                titleSpan.textContent = group.section;
                header.appendChild(titleSpan);

                const actions = document.createElement('div');
                actions.className = 'chord-toolbar-header-actions';

                const buttonsRow = document.createElement('div');
                buttonsRow.className = 'chord-toolbar-buttons-row';

                // Edit Button
                const editIcon = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
                const saveIcon = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                const cancelIcon = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

                const startEditing = () => {
                    buttonsRow.innerHTML = '';
                    buttonsRow.classList.add('editing');
                    actions.innerHTML = '';

                    const input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'chord-block-edit-input';
                    input.value = group.chords.join(' ');
                    input.placeholder = 'Type chords...';

                    const finishEdit = (save) => {
                        if (save) {
                            const newText = input.value;
                            // Send to parent to sync with SongDetailModal
                            window.parent.postMessage({
                                type: 'updateChordBlock',
                                sectionType: group.type,
                                text: newText
                            }, '*');
                            // Local refresh will be triggered by SongDetailModal sending updateSuggestedChords back
                        } else {
                            // Just re-render this group locally
                            renderSuggestedChords(groups);
                        }
                    };

                    input.onkeydown = (e) => {
                        e.stopPropagation(); // Prevent global timeline shortcuts from firing while typing
                        if (e.key === 'Enter') finishEdit(true);
                        if (e.key === 'Escape') finishEdit(false);
                    };

                    input.style.pointerEvents = 'auto'; // Ensure it can be clicked
                    buttonsRow.appendChild(input);
                    actions.appendChild(makeHeaderActionBtn(saveIcon, 'Save Chords', 'save-btn', () => finishEdit(true)));
                    actions.appendChild(makeHeaderActionBtn(cancelIcon, 'Cancel', 'cancel-btn', () => finishEdit(false)));

                    setTimeout(() => input.focus(), 50);
                };

                actions.appendChild(makeHeaderActionBtn(editIcon, 'Edit Block Chords', 'edit-btn', startEditing));

                header.appendChild(actions);
                groupContainer.appendChild(header);

                group.chords.forEach(item => {
                    if (item) {
                        buttonsRow.appendChild(isMarker(item) ? makeMarkerEl(item) : makeChordBtn(item, group.type));
                    }
                });
                groupContainer.appendChild(buttonsRow);
                buttonsContainer.appendChild(groupContainer);
            });
        } else {
            const buttonsRow = document.createElement('div');
            buttonsRow.className = 'chord-toolbar-buttons-row';
            groups.forEach(item => {
                if (item) {
                    buttonsRow.appendChild(isMarker(item) ? makeMarkerEl(item) : makeChordBtn(item, null));
                }
            });
            buttonsContainer.appendChild(buttonsRow);
        }

        // Always add the "?" button at the end
        const qBtn = document.createElement('button');
        qBtn.className = 'chord-suggestion-btn q-chord-btn';
        qBtn.textContent = '?';
        qBtn.title = 'Mark unknown chord';
        qBtn.draggable = false;
        qBtn.style.touchAction = 'none';
        qBtn.onpointerdown = () => { initAudio(); triggerChordAudio('?', 2.0, true); };
        qBtn.addEventListener('pointerdown', (e) => {
            qBtn.setPointerCapture(e.pointerId);
            potentialVirtualDrag = true;
            virtualDraggedChord = '?';
            virtualDragStartX = e.clientX;
            virtualDragStartY = e.clientY;
        });
        qBtn.onclick = () => {
            if (window.justFinishedVirtualDrag) return;
            if (enableTimingCapture) recordChord('?');
        };
        buttonsContainer.appendChild(qBtn);

        // Always recalculate HUD position after rendering new buttons
        updateHUDPosition();

    } catch (err) {
        console.error("Error in renderSuggestedChords:", err);
        buttonsContainer.classList.add('hidden');
        updateHUDPosition();
    }
}

/**
 * Dynamically adjusts the vertical position of the Lyrics HUD based on the height
 * of the Suggested Chords toolbar. This prevents overlap on tablets (Galaxy A9+, iPad)
 * where the toolbar may wrap to multiple rows.
 */
function updateHUDPosition() {
    const headerMetadata = document.querySelector('.header-metadata');
    const controlsContainer = document.querySelector('.controls-container');
    const chordToolbar = document.getElementById('chordButtonsContainer');
    const lyricsHUD = document.getElementById('lyricsHUD');

    if (!lyricsHUD) return;

    let finalTop = 0;

    // We want to find the bottom-most point of the UI stack (Metadata + Controls + Toolbar)
    if (chordToolbar && !chordToolbar.classList.contains('hidden')) {
        const rect = chordToolbar.getBoundingClientRect();
        finalTop = rect.bottom;
    } else if (controlsContainer) {
        const rect = controlsContainer.getBoundingClientRect();
        finalTop = rect.bottom;
    } else if (headerMetadata) {
        const rect = headerMetadata.getBoundingClientRect();
        finalTop = rect.bottom;
    } else {
        // Fallback if everything is missing
        finalTop = 100;
    }

    // Add 20px of breathing room
    const topPadding = finalTop + 20;

    document.documentElement.style.setProperty('--hud-top-offset', `${topPadding}px`);
}

function loadData(data, url, title, inputSuggestedChords = [], artist = '', songTitle = '', inputFullLyrics = '', inputLyrics = '', inputLyricOffset = 0, inputInstrumentMode = 'piano', key = 'C', capo = 0) {
    if (key) currentSongKey = key;
    if (inputInstrumentMode) currentInstrumentMode = inputInstrumentMode;
    currentCapoValue = capo || 0;

    // Ensure chord parser is ready for simplifyDisplayName
    if (typeof ChordParser !== 'undefined' && !chordParser) {
        chordParser = new ChordParser();
    }
    
    console.log('loadData called for:', songTitle, {
        hasData: !!data,
        capo: currentCapoValue,
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
    try {
        renderSuggestedChords(suggestedChords);
    } catch (err) {
        console.error("Failed to render suggested chords during loadData:", err);
    }

    statusText.innerText = 'Loading stored data...';
    setupUIForLoading();

    youtubeUrl = url;
    if (youtubeUrl) {
        if (captureBtn) captureBtn.classList.remove('hidden');
        if (youtubeToggleBtn) {
            youtubeToggleBtn.classList.remove('hidden');
            youtubeToggleBtn.classList.add('active'); // Default to active since player starts shown
        }
        // Show player BEFORE initialising the YT.Player so the container
        // is visible when the iframe is injected (hidden containers cause black screens)
        if (youtubePlayerContainer) youtubePlayerContainer.classList.remove('hidden');
        if (youtubeApiReady) {
            initYouTubePlayer(youtubeUrl);
        }
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

        // Set MIDI notation preference
        const midiNotationToggle = document.getElementById('midiNotationToggle');
        if (midiNotationToggle) {
            midiNotationToggle.checked = !!data.useFlatNotation;
            originalUseFlatNotation = midiNotationToggle.checked;
        } else {
            originalUseFlatNotation = !!data.useFlatNotation;
        }

        // Parse lyrics if available
        parsedLyrics = [];
        if (inputFullLyrics || inputLyrics) {
            const rawLyrics = inputFullLyrics || inputLyrics;
            if (LyricsParser.hasTimestamps(rawLyrics)) {
                parsedLyrics = LyricsParser.parse(rawLyrics);

                // Apply LyricSync offset
                currentLyricOffset = parseFloat(inputLyricOffset) || 0;
                originalLyricOffset = currentLyricOffset;
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
                if (syncFirstLyricBtn) syncFirstLyricBtn.classList.add('hidden');
                hideLyricsHUD();
            }
        } else {
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

        // Load custom map sections
        customMapSections = data.customMapSections || null;

        // Normalize: ensures loaded sections have types for color persistence without mutation later
        if (customMapSections && Array.isArray(customMapSections)) {
            customMapSections.forEach(sec => {
                if (!sec.type) {
                    const name = sec.name ? sec.name.toUpperCase() : '';
                    if (name.includes('INTRO')) sec.type = 'intro';
                    else if (name.includes('VERSE')) sec.type = 'verse';
                    else if (name.includes('PRE')) sec.type = 'prechorus';
                    else if (name.includes('CHORUS')) sec.type = 'chorus';
                    else if (name.includes('BRIDGE')) sec.type = 'bridge';
                    else if (name.includes('OUTRO')) sec.type = 'outro';
                    else if (name.includes('SOLO')) sec.type = 'solo';
                    else sec.type = 'verse';
                }
            });
        }

        finishLoading(chords.length, bpm);

        // Record original state for change detection
        originalChordsJson = JSON.stringify(chords);
        originalTempo = bpm;
        originalBarOffset = barOffsetInBeats;
        originalLyricOffset = currentLyricOffset;
        originalMapSectionsJson = JSON.stringify(customMapSections);
        checkForChanges();

        // Auto-open Song Map if requested via URL param (e.g. from Song Detail Modal)
        if (typeof autoOpenMap !== 'undefined' && autoOpenMap) {
            console.log("Scrolling Chords: Auto-opening Song Map...");
            setTimeout(() => {
                if (typeof openSongMap === 'function') {
                    openSongMap();
                }
            }, 300); // Small delay to ensure everything is rendered
        }

        // Set initial pauseTime to -1.0 to give some breathing room for chords at 0:00
        pauseTime = -1.0;
        updateLoop();
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

    // Give the browser 1 frame to render the DOM elements before updating their transform positions,
    // which prevents the "stacked on top of each other" bug on initial load.
    requestAnimationFrame(() => {
        updateLoop(); // Update once to set initial positions
    });
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

    const midiNotationToggle = document.getElementById('midiNotationToggle');

    return {
        name: currentFileName,
        tempo: currentTempo,
        barOffset: barOffsetInBeats,
        duration: duration,
        chords: chords.map(c => {
            let chord = { time: c.time, name: c.name };
            // Only include yOffset if it has been modified from default 0
            if (c.yOffset !== undefined) chord.yOffset = c.yOffset;
            return chord;
        }),
        useFlatNotation: midiNotationToggle ? midiNotationToggle.checked : false,
        customMapSections: customMapSections
    };
}

function adjustBarOffset(deltaBeats) {
    barOffsetInBeats += deltaBeats;
    if (barOffsetDisplay) {
        // Show up to 2 decimals if needed (for 0.25 increments)
        const displayVal = barOffsetInBeats % 1 === 0 ? barOffsetInBeats : barOffsetInBeats.toFixed(2).replace(/\.?0+$/, "");
        barOffsetDisplay.innerText = `Bar: ${displayVal}`;
    }

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
    const snapInterval = barDuration / 16; // Finer precision (1/16th bar)
    const timeShift = deltaSteps * snapInterval;

    chords.forEach(c => {
        c.time = Math.round(Math.max(0, c.time + timeShift) * 1000) / 1000;
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
        if (toggleLyricsBtn) toggleLyricsBtn.classList.add('active');
    } else {
        hideLyricsHUD();
    }
}

// Logic for the LyricSync Button
if (syncFirstLyricBtn) {
    syncFirstLyricBtn.onclick = () => {
        if (!parsedLyrics || parsedLyrics.length === 0) {
            window.confirmationModal.show(
                'Lyrics Sync',
                'No lyrics available to sync.',
                null,
                null,
                'OK',
                null,
                'primary',
                true // isInfo
            );
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
            label: 'First Lyric',
            type: 'lyrics-sync'
        });

        renderStaticElements();
        updateLoop();
        checkForChanges();

        // Notify parent to update the input field
        window.parent.postMessage({
            type: 'updateLyricSync',
            offset: newOffset
        }, '*');

        window.confirmationModal.show(
            'LyricSync Updated',
            `The first lyric line will start at this point.<br>Offset: <b>${newOffset.toFixed(2)}s</b>`,
            null,
            null,
            'OK',
            null,
            'primary',
            true // isInfo
        );
    };
}

function hideLyricsHUD() {
    lyricsEnabled = false;
    lyricsHUD.classList.add('hidden');
    if (toggleLyricsBtn) toggleLyricsBtn.classList.remove('active');
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

    // Visual feedback - Only show local toast if we are NOT forking.
    // If forking, parent will show the "Private Copy Created" modal.
    if (!isPublicMode || canEditPublic) {
        showSaveToast();
    }

    // Update original state IMMEDIATELY so checkForChanges reflects saved state
    originalChordsJson = JSON.stringify(chords);
    originalTempo = currentTempo;
    originalBarOffset = barOffsetInBeats;
    originalLyricOffset = currentLyricOffset;
    originalMapSectionsJson = JSON.stringify(customMapSections);
    const midiNotationToggle = document.getElementById('midiNotationToggle');
    if (midiNotationToggle) {
        originalUseFlatNotation = midiNotationToggle.checked;
    }

    // Update save buttons instead of unconditionally hiding
    checkForChanges();
    if (saveBtn && JSON.stringify(chords) === originalChordsJson) {
        // only set the old general saveBtn conditionally hidden if we strictly wanted that, but checkForChanges covers it.
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



function checkIfHasChanges() {
    const currentJson = JSON.stringify(chords);
    return currentJson !== originalChordsJson ||
        currentTempo !== originalTempo ||
        barOffsetInBeats !== originalBarOffset ||
        currentLyricOffset !== originalLyricOffset ||
        (document.getElementById('midiNotationToggle') && document.getElementById('midiNotationToggle').checked !== originalUseFlatNotation) ||
        JSON.stringify(customMapSections) !== originalMapSectionsJson;
}

function checkForChanges() {
    if (!saveBtn) return;
    const hasUnsavedChanges = checkIfHasChanges();

    if (hasUnsavedChanges) {
        saveBtn.classList.remove('hidden');
        saveBtn.classList.add('unsaved-changes');
        saveBtn.disabled = false;
        saveBtn.style.opacity = '1';
        setSaveStatus(false);
    } else {
        saveBtn.classList.add('hidden');
        saveBtn.classList.remove('unsaved-changes');
        saveBtn.disabled = true;
    }

    const mapSaveBtn = document.getElementById('songMapSaveBtn');
    if (mapSaveBtn) {
        if (hasUnsavedChanges) {
            mapSaveBtn.classList.remove('hidden');
            mapSaveBtn.classList.add('unsaved-changes');
            mapSaveBtn.disabled = false;
            mapSaveBtn.style.opacity = '1';
        } else {
            mapSaveBtn.classList.add('hidden');
            mapSaveBtn.classList.remove('unsaved-changes');
            mapSaveBtn.disabled = true;
            mapSaveBtn.style.opacity = '0.5';
        }
    }
}

function extractChordsFromMidi(midi) {
    // 1. Collect all notes from all tracks into a single timeline
    let allNotes = [];
    midi.tracks.forEach(track => {
        track.notes.forEach(note => {
            allNotes.push({
                time: Math.round(note.time * 1000) / 1000,
                duration: Math.round(note.duration * 1000) / 1000,
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

    // Ensure we generate markers for a reasonable amount of time without crashing the browser
    let playerDuration = 0;
    try {
        if (typeof youtubePlayer !== 'undefined' && youtubePlayer && typeof youtubePlayer.getDuration === 'function') {
            playerDuration = youtubePlayer.getDuration() || 0;
        }
    } catch (e) { }

    let maxChordTime = 0;
    if (typeof chords !== 'undefined' && chords && chords.length > 0) {
        maxChordTime = chords[chords.length - 1].time + 60; // 1 minute past last chord
    }

    // Base duration of 5 minutes (300s) instead of 30 minutes (1800s) to prevent DOM overload
    const duration = Math.max(midi.duration || 0, playerDuration, maxChordTime, 300);

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
        // 16 subdivisions per bar (sixteenth notes)
        for (let b = 0.25; b < beatsPerBar; b += 0.25) {
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
    // Add Lyrics Sync marker if available
    if (typeof parsedLyrics !== 'undefined' && parsedLyrics && parsedLyrics.length > 0) {
        markers.push({
            time: parsedLyrics[0].time,
            label: 'First Lyric',
            type: 'lyrics-sync'
        });
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

    // Ensure sorted for predictable zig-zag
    chords.sort((a, b) => a.time - b.time);

    const THRESHOLD = 2.5; // Seconds (Higher for better spacing - v2.454)
    let lastOffset = -50; 

    for (let i = 0; i < chords.length; i++) {
        const chord = chords[i];
        const prevChord = i > 0 ? chords[i - 1] : null;
        const nextChord = i < chords.length - 1 ? chords[i + 1] : null;

        // Is this chord part of a "close" cluster?
        const isCluster = (prevChord && (chord.time - prevChord.time < THRESHOLD)) || 
                          (nextChord && (nextChord.time - chord.time < THRESHOLD));

        if (isCluster) {
            // Pick the opposite of the last used stagger position
            lastOffset = (lastOffset === -65) ? -35 : -65;
            chord.yOffset = lastOffset;
        } else {
            // Isolated chord: Center (50% Top)
            chord.yOffset = -50;
            lastOffset = -50; // Reset state machine
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

        el.innerText = simplifyDisplayName(chord.name);
        el.dataset.index = index;

        const pps = (typeof PIXELS_PER_SECOND === 'number' && isFinite(PIXELS_PER_SECOND)) ? PIXELS_PER_SECOND : 100;
        el.style.left = `${Math.round(chord.time * pps)}px`;

        // Apply staggering offset (Baseline moved to 40% in landscape v2.456)
        const baseline = document.body.classList.contains('is-mobile-landscape') ? 90 : 100;
        const y = chord.yOffset !== undefined ? (chord.yOffset + baseline) : 50;
        el.style.top = `${y}%`;

        chordFrag.appendChild(el);
    });
    chordTrack.appendChild(chordFrag);

    // Render markers
    markerTrack.innerHTML = '';

    const markerFrag = document.createDocumentFragment();
    markers.forEach(marker => {
        const el = document.createElement('div');
        el.className = `marker ${marker.type}`;

        // Optimized: Position once
        const pps = (typeof PIXELS_PER_SECOND === 'number' && isFinite(PIXELS_PER_SECOND)) ? PIXELS_PER_SECOND : 100;
        el.style.left = `${Math.round(marker.time * pps)}px`;

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
    if (songMapPlayPauseBtn) {
        songMapPlayPauseBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
        `;
    }

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

        // Resume YouTube if applicable — flag to prevent circular state-change sync
        // ONLY if the video container is visible
        if (youtubePlayer && youtubePlayerContainer && !youtubePlayerContainer.classList.contains('hidden')) {
            youtubePlayer._syncingFromTimeline = true;
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
    if (songMapPlayPauseBtn) {
        songMapPlayPauseBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" fill="currentColor"></polygon>
            </svg>
        `;
    }

    if (pianoPlayer) pianoPlayer.stopAll();

    if (isCountingIn) {
        stopCountIn();
    }

    const now = performance.now();
    pauseTime = (now - startTime) / 1000;

    cancelAnimationFrame(animationFrame);

    if (youtubePlayer) {
        youtubePlayer.pauseVideo();
    }
}

function seek(deltaSeconds) {
    let currentTime = isPlaying ? (performance.now() - startTime) / 1000 : pauseTime;
    let newTime = Math.max(-5.0, currentTime + deltaSeconds);

    if (pianoPlayer) pianoPlayer.stopAll();

    if (isCountingIn) {
        stopCountIn();
    }

    if (isPlaying) {
        startTime = performance.now() - (newTime * 1000);
            if (youtubePlayer && youtubePlayerContainer && !youtubePlayerContainer.classList.contains('hidden')) {
                youtubePlayer._syncingFromTimeline = true;
                youtubePlayer.seekTo(Math.max(0, newTime), true);
            }
    } else {
        pauseTime = newTime;
        updateLoop(); // Updates position while paused
        if (youtubePlayer && youtubePlayerContainer && !youtubePlayerContainer.classList.contains('hidden')) {
            youtubePlayer.seekTo(Math.max(0, newTime), true);
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
        if (youtubePlayer && youtubePlayerContainer && !youtubePlayerContainer.classList.contains('hidden') &&
            typeof youtubePlayer.getPlayerState === 'function' && youtubePlayer.getPlayerState() === 1) {
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
            triggerChordAudio(simplifyDisplayName(chords[audioChordIndex].name, true));
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

    const displayString = (typeof window !== 'undefined' && window.activeMidiChord)
        ? window.activeMidiChord
        : (currentChord ? simplifyDisplayName(currentChord.name) : '');

    if (displayString) {
        if (currentChordDisplay.innerText !== displayString) {
            currentChordDisplay.innerText = displayString;
        }
    } else {
        if (currentChordDisplay.innerText !== '') {
            currentChordDisplay.innerText = '';
        }
    }

    // Safety for PIXELS_PER_SECOND
    const pps = (typeof PIXELS_PER_SECOND === 'number' && isFinite(PIXELS_PER_SECOND)) ? PIXELS_PER_SECOND : 100;
    const playheadOffset = getPlayheadOffset();

    // PERFORMANCE CRITICAL: Use a single transform for all tracks
    if (tracksContainer) {
        const containerX = Math.round(playheadOffset - (playbackTime * pps));
        tracksContainer.style.transform = `translate3d(${containerX}px, 0, 0)`;
    }

    // Highlighting Logic in Song Map
    const activeIndex = chordIndex; // Reuse the index found for audio logic above
    if (activeIndex !== window.lastActiveIndex) {
        if (!document.getElementById('songMapOverlay').classList.contains('hidden')) {
            updateSongMapHighlight(activeIndex);
        }
        window.lastActiveIndex = activeIndex;
    }

    // Windowing Visibility & Active State (Optimized)
    // RECALCULATE stagger when dragging to see gaps live
    if (isDraggingChord || isBoxSelecting) {
        determineStaggerPositions();
    }

    // Instead of transforming EVERY element, we only toggle classes and display
    const winWidth = window.innerWidth;
    const bufferPx = 1000; // Increased buffer for smoother scrolling
    const viewLeft = playbackTime * pps - bufferPx;
    const viewRight = playbackTime * pps + winWidth + bufferPx;

    // We still iterate to handle "active" class (hiding played chords) 
    // and basic windowing for rendering performance.
    const chordElements = chordTrack.children;
    for (let i = 0; i < chordElements.length; i++) {
        const el = chordElements[i];
        const chord = chords[i];
        if (!chord) continue;

        // Windowing: Hide if far off-screen
        const absX = chord.time * pps;
        const isVisible = absX >= viewLeft && absX <= viewRight;

        if (isVisible) {
            if (el.style.display === 'none') el.style.display = '';

            // PERFORMANCE: Re-sync position during loop to support dragging and zoom feedback
            el.style.left = `${Math.round(absX)}px`;
            const y = chord.yOffset !== undefined ? (chord.yOffset + 100) : 50;
            el.style.top = `${y}%`;

            // Toggle active state
            if (i <= activeIndex) {
                if (!el.classList.contains('active')) el.classList.add('active');
            } else {
                if (el.classList.contains('active')) el.classList.remove('active');
            }
        } else {
            if (el.style.display !== 'none') el.style.display = 'none';
        }
    }

    // Marker windowing (Only if there are many markers)
    const markerElements = markerTrack.children;
    if (markerElements.length > 50) {
        for (let i = 0; i < markerElements.length; i++) {
            const el = markerElements[i];
            const marker = markers[i];
            const absX = marker.time * pps;
            const isVisible = absX >= viewLeft && absX <= viewRight;
            if (isVisible) {
                if (el.style.display === 'none') el.style.display = '';
                // Sync position for zoom support
                el.style.left = `${Math.round(absX)}px`;
            } else {
                if (el.style.display !== 'none') el.style.display = 'none';
            }
        }
    }

    // Throttle non-critical text updates
    if (!window._lastUIUpdate || now - window._lastUIUpdate > 100) {
        statusText.innerText = `Time: ${formatTime(playbackTime)}`;
        window._lastUIUpdate = now;
    }

    // Update Lyrics HUD (Optimized)
    if (lyricsEnabled && parsedLyrics.length > 0) {
        const currentIndex = parsedLyrics.findLastIndex(l => l.time <= playbackTime);
        if (currentIndex !== window.lastLyricIndex) {
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
                lyricLine2.classList.remove('hidden');
            }
            window.lastLyricIndex = currentIndex;
        }

        // HUD Visibility Logic
        const firstLyricTime = (parsedLyrics.length > 0) ? parsedLyrics[0].time : 0;
        const shouldShowHUD = playbackTime >= firstLyricTime - 5;
        if (shouldShowHUD) {
            if (lyricsHUD.classList.contains('hidden')) lyricsHUD.classList.remove('hidden');
        } else {
            if (!lyricsHUD.classList.contains('hidden')) lyricsHUD.classList.add('hidden');
        }
    } else {
        if (!lyricsHUD.classList.contains('hidden')) lyricsHUD.classList.add('hidden');
    }

    if (isPlaying) {
        animationFrame = requestAnimationFrame(updateLoop);
    }
}

function initYouTubePlayer(url) {
    const videoId = extractVideoID(url);
    if (!videoId) return;

    if (youtubePlayer) {
        // Destroy the existing player and recreate it from scratch.
        // cueVideoById() is unreliable when the previous player was initialised
        // while the container was hidden (causes a black screen for some songs).
        try {
            youtubePlayer.destroy();
        } catch (e) {
            console.warn('Could not destroy previous YouTube player:', e);
        }
        youtubePlayer = null;

        // Recreate the host div that the API replaces with an <iframe>
        const container = document.getElementById('youtubePlayerContainer');
        if (container) {
            const oldEl = document.getElementById('youtubePlayer');
            if (oldEl) oldEl.remove();
            const newEl = document.createElement('div');
            newEl.id = 'youtubePlayer';
            container.appendChild(newEl);
        }
    }

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

function onPlayerReady(event) {
    console.log("YouTube Player Ready");
}

function onPlayerError(event) {
    console.error("YouTube Player Error:", event.data);
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PLAYING) {
        isYoutubePlaying = true;

        // If we initiated this play from the timeline button, skip resync
        if (youtubePlayer._syncingFromTimeline) {
            youtubePlayer._syncingFromTimeline = false;
            if (!isPlaying) play();
            return;
        }

        // User scrubbed/played YouTube manually — sync timeline to YouTube's position
        const ytTime = youtubePlayer.getCurrentTime();
        const timeDiff = Math.abs(ytTime - (isPlaying ? (performance.now() - startTime) / 1000 : pauseTime));

        if (timeDiff > 0.5) {
            // YouTube is at a significantly different position — sync timeline to it
            if (pianoPlayer) pianoPlayer.stopAll();
            pauseTime = ytTime;
        }

        if (!isPlaying) {
            // Play timeline from YouTube's current position
            isPlaying = true;
            playPauseBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                <span>Pause</span>
            `;
            startTime = performance.now() - (pauseTime * 1000);
            requestAnimationFrame(updateLoop);
        } else {
            // Already playing — just re-anchor startTime if drift is large
            if (timeDiff > 0.5) {
                startTime = performance.now() - (pauseTime * 1000);
            }
        }

        if (enableTimingCapture) {
            setTimeout(() => {
                if (captureBtn) captureBtn.focus();
                else window.focus();
            }, 100);
        }
    } else if (event.data == YT.PlayerState.PAUSED || event.data == YT.PlayerState.ENDED) {
        isYoutubePlaying = false;
        if (youtubePlayer) youtubePlayer._syncingFromTimeline = false;
        // Sync timeline to pause if it was playing
        if (isPlaying) {
            pause();
        }
    }
}

function extractVideoID(url) {
    if (!url) return false;
    // youtu.be short URLs: youtu.be/VIDEO_ID
    const shortMatch = url.match(/youtu\.be\/([^#&?/]{11})/);
    if (shortMatch) return shortMatch[1];
    // Standard watch URL: youtube.com/watch?v=VIDEO_ID
    const watchMatch = url.match(/[?&]v=([^#&]{11})/);
    if (watchMatch) return watchMatch[1];
    // Embed URL: youtube.com/embed/VIDEO_ID
    const embedMatch = url.match(/embed\/([^#&?/]{11})/);
    if (embedMatch) return embedMatch[1];
    return false;
}

function toggleTimingCapture() {
    enableTimingCapture = !enableTimingCapture;

    if (enableTimingCapture) {
        document.body.classList.add('recording-active');
        captureBtn.classList.add('active');
        if (document.getElementById('songMapYouTubeBtn')) document.getElementById('songMapYouTubeBtn').classList.add('active');
        recordingIndicator.classList.remove('hidden');
        youtubePlayerContainer.classList.remove('hidden');
        if (youtubeToggleBtn) youtubeToggleBtn.classList.add('active');

        statusText.innerText = "CAPTURING: Press SPACE or Chord letter to mark chords";

        // Auto-play video when entering capture mode from the map/header
        if (youtubePlayer && typeof youtubePlayer.playVideo === 'function') {
            youtubePlayer.playVideo();
        }
    } else {
        document.body.classList.remove('recording-active');
        captureBtn.classList.remove('active');
        if (document.getElementById('songMapYouTubeBtn')) document.getElementById('songMapYouTubeBtn').classList.remove('active');
        recordingIndicator.classList.add('hidden');
        // Do NOT hide or pause YouTube automatically here per user request

        if (isPlaying) pause();

        statusText.innerText = "Capture Stopped";
    }
}

let lastRecordChordName = null;
let lastRecordChordTime = 0;

function recordChord(name = "?", time = null) {
    const now = Date.now();
    // Throttle duplicate calls (e.g. drag-and-drop vs click race condition)
    if (name === lastRecordChordName && (now - lastRecordChordTime < 150)) {
        console.log("Blocking duplicate recordChord call for:", name);
        return;
    }
    lastRecordChordName = name;
    lastRecordChordTime = now;

    saveUndoState();
    let currentTime = time;
    if (currentTime === null) {
        if (youtubePlayer && enableTimingCapture) {
            currentTime = youtubePlayer.getCurrentTime();
        } else {
            currentTime = isPlaying ? (performance.now() - startTime) / 1000 : pauseTime;
        }
    }

    // Minimum gap enforcement: chords must be at least 1 sixteenth note apart
    const minGap = secondsPerBeat / 4; // 16th note duration

    // Find any existing chord that is too close to currentTime
    // If so, nudge currentTime to be minGap after the nearest chord
    let nudged = true;
    let attempts = 0;
    while (nudged && attempts < 50) {
        nudged = false;
        attempts++;
        for (const chord of chords) {
            const diff = Math.abs(chord.time - currentTime);
            // Use 0.005 epsilon to avoid infinite floating-point loops where diff equals minGap but triggers < minGap
            if (diff < (minGap - 0.005)) {
                // Push our new chord just past this one
                currentTime = chord.time + minGap;
                nudged = true; // Re-check in case the nudged position still conflicts
                break;
            }
        }
    }

    currentTime = Math.round(currentTime * 1000) / 1000;

    // Safety: Prevent adding the exact same chord at the exact same time
    const isExactDuplicate = chords.some(c => c.name === name && Math.abs(c.time - currentTime) < 0.001);
    if (isExactDuplicate) return;

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
    if (selectedChords.size === 0) return;
    saveUndoState();

    // Sort original chords by time to keep sequential order
    const listToDuplicate = Array.from(selectedChords).sort((a, b) => a.time - b.time);
    const newChords = [];

    // Calculate bounds to find offset
    // Default offset: 1 bar (if beatsPerBar defined) or 2 seconds
    let offset = (beatsPerBar && secondsPerBeat) ? (beatsPerBar * secondsPerBeat) : 2.0;
    if (offsetOverride !== null) offset = offsetOverride;

    listToDuplicate.forEach(original => {
        newChords.push({
            name: original.name,
            time: Math.round((original.time + offset) * 1000) / 1000,
            _isNewCopy: true // Temporary tag to find them later
        });
    });

    // Add new chords
    chords.push(...newChords);

    // Re-sort main array
    chords.sort((a, b) => a.time - b.time);

    if (selectNew) {
        clearSelection();
        for (let i = 0; i < chords.length; i++) {
            if (chords[i]._isNewCopy) {
                selectChord(chords[i], true); // additive
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
// --- Snap to Grid Logic ---
function snapToGrid(time) {
    if (!beatsPerBar || !secondsPerBeat || beatsPerBar <= 0) return time;

    const barDuration = beatsPerBar * secondsPerBeat;
    const snapInterval = barDuration / 16; // 16 moments per bar (50% less aggressive)

    // Snap to nearest grid point
    const snapped = Math.round(time / snapInterval) * snapInterval;

    // Avoid snapping to negative
    return Math.round(Math.max(0, snapped) * 1000) / 1000;
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
    selectedChords.clear();
    renderSelection();
}

function selectChord(chord, addToSelection = false) {
    if (!chord) return;
    if (!addToSelection) {
        selectedChords.clear();
    }
    selectedChords.add(chord);
    renderSelection();
}

function deselectChord(chord) {
    if (!chord) return;
    selectedChords.delete(chord);
    renderSelection();
}

function renderSelection() {
    // Update visual state of all chords
    const chordElements = chordTrack.children;
    for (let i = 0; i < chordElements.length; i++) {
        const el = chordElements[i];
        const index = parseInt(el.dataset.index);
        const chord = chords[index];
        if (chord && selectedChords.has(chord)) {
            el.classList.add('selected');
        } else {
            el.classList.remove('selected');
        }
    }

    // Update Button Visibility
    const hasSelection = selectedChords.size > 0;
    if (duplicateBtn) duplicateBtn.classList.toggle('hidden', !hasSelection);
    if (deleteSelectedBtn) deleteSelectedBtn.classList.toggle('hidden', !hasSelection);
}

function updateSelectionFromBox() {
    if (!selectionBoxEl) return;
    const boxRect = selectionBoxEl.getBoundingClientRect();
    const chordElements = chordTrack.children;

    selectedChords.clear();

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
            const chord = chords[index];
            if (chord) selectedChords.add(chord);
        }
    }
    renderSelection();
}

function deleteSelectedChords() {
    if (selectedChords.size === 0) return;

    confirmationModal.show(
        'Delete Chords',
        `Are you sure you want to delete <b>${selectedChords.size}</b> selected chords?`,
        () => {
            saveUndoState();
            
            // Remove by reference
            chords = chords.filter(chord => !selectedChords.has(chord));

            clearSelection();
            renderStaticElements();
            updateLoop();
            checkForChanges();
        }
    );
}

// --- SONG MAP STATE & LOGIC ---
let customMapSections = null;
let mapSelectionState = { active: false, startIdx: -1, endIdx: -1 };
let isMapDragMode = false;
let isMapDraggingActive = false; // legacy
let isMapBoxSelecting = false;
let mapSelectionBoxStart = null;
let mapSelectionBoxEl = null;
let dragStartIndex = -1;
let isMapWindowDragging = false;
let mapWindowDragOffset = { x: 0, y: 0 };
let currentMapStyleIndex = 0;
const MAP_STYLES = ['map-style-metro', 'map-style-ribbon'];
const MAP_ZOOM_LEVELS = [1.0, 1.2, 1.4, 1.6, 0.6, 0.8]; // 6-step cycle including +/- 40% and 20%
let currentMapZoomIndex = 0;
let isPickerDragging = false;
let pickerDragOffset = { x: 0, y: 0 };

// Event Listeners for Song Map
if (document.getElementById('songMapBtn')) {
    document.getElementById('songMapBtn').addEventListener('click', openSongMap);
}
if (document.getElementById('closeSongMapBtn')) {
    document.getElementById('closeSongMapBtn').addEventListener('click', closeSongMap);
}
if (document.getElementById('songMapDragToggleBtn')) {
    const editBtn = document.getElementById('songMapDragToggleBtn');
    editBtn.addEventListener('click', () => {
        isMapDragMode = !isMapDragMode;
        editBtn.classList.toggle('active', isMapDragMode);
        // If we exit edit mode, clear any partial selection
        if (!isMapDragMode) {
            hideMapLabelPicker();
        }
    });
}
if (document.getElementById('songMapZoomBtn')) {
    document.getElementById('songMapZoomBtn').addEventListener('click', () => {
        currentMapZoomIndex = (currentMapZoomIndex + 1) % MAP_ZOOM_LEVELS.length;
        const timeline = document.querySelector('.map-fluid-timeline');
        if (timeline) {
            timeline.style.setProperty('--map-zoom-scale', MAP_ZOOM_LEVELS[currentMapZoomIndex]);
        }
        const zoomLabel = document.getElementById('mapZoomLabel');
        if (zoomLabel) {
            zoomLabel.textContent = Math.round(MAP_ZOOM_LEVELS[currentMapZoomIndex] * 100) + '%';
        }
    });
}

if (document.getElementById('songMapPlayPauseBtn')) {
    document.getElementById('songMapPlayPauseBtn').addEventListener('click', togglePlayPause);
}
if (document.getElementById('songMapSaveBtn')) {
    document.getElementById('songMapSaveBtn').addEventListener('click', () => saveToDatabase());
}

function toggleMapMobileMenu() {
    const menu = document.getElementById('songMapMobileMenu');
    if (menu) menu.classList.toggle('hidden');
}

if (document.getElementById('songMapYouTubeBtn')) {
    document.getElementById('songMapYouTubeBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof window.toggleYouTubePlayer === 'function') {
            window.toggleYouTubePlayer(e);
        }
    });
}

// Hamburger Menu Actions
if (document.getElementById('menuZoomOption')) {
    document.getElementById('menuZoomOption').addEventListener('click', (e) => {
        e.stopPropagation();
        const zoomBtn = document.getElementById('songMapZoomBtn');
        if (zoomBtn) zoomBtn.click();
        const menuZoomValue = document.getElementById('menuZoomValue');
        const zoomLabel = document.getElementById('mapZoomLabel');
        if (menuZoomValue && zoomLabel) menuZoomValue.textContent = zoomLabel.textContent;
    });
}

if (document.getElementById('menuEditOption')) {
    document.getElementById('menuEditOption').addEventListener('click', (e) => {
        e.stopPropagation();
        const editBtn = document.getElementById('songMapDragToggleBtn');
        if (editBtn) editBtn.click();
        const menuEditStatus = document.getElementById('menuEditStatus');
        if (menuEditStatus) menuEditStatus.textContent = isMapDragMode ? 'ON' : 'OFF';

        // Update color to show active state
        const menuEditOption = document.getElementById('menuEditOption');
        if (menuEditOption) menuEditOption.style.color = isMapDragMode ? '#6366f1' : '#1e293b';
    });
}



// Close menu when clicking outside
document.addEventListener('click', (e) => {
    const menu = document.getElementById('songMapMobileMenu');
    const burger = document.getElementById('songMapHamburgerBtn');
    if (menu && !menu.classList.contains('hidden')) {
        if (!menu.contains(e.target) && (!burger || !burger.contains(e.target))) {
            menu.classList.add('hidden');
        }
    }
});

// Window Dragging Logic
const mapHeader = document.querySelector('.song-map-header');
const mapModal = document.querySelector('.map-modal-content');

if (mapHeader && mapModal) {
    mapHeader.addEventListener('pointerdown', (e) => {
        // Only trigger drag if clicking the header itself or title section, not buttons
        if (e.target.closest('button') || e.target.closest('.song-map-toolbar-btn')) return;

        isMapWindowDragging = true;
        const rect = mapModal.getBoundingClientRect();
        mapWindowDragOffset.x = e.clientX - rect.left;
        mapWindowDragOffset.y = e.clientY - rect.top;

        mapHeader.setPointerCapture(e.pointerId);
    });

    mapHeader.addEventListener('pointermove', (e) => {
        if (isMapWindowDragging) {
            const x = e.clientX - mapWindowDragOffset.x;
            const y = Math.max(0, e.clientY - mapWindowDragOffset.y); // Constrain to top of screen

            mapModal.style.left = x + 'px';
            mapModal.style.top = y + 'px';
            mapModal.style.margin = '0'; // Override any centering
        }
    });

    mapHeader.addEventListener('pointerup', (e) => {
        isMapWindowDragging = false;
        mapHeader.releasePointerCapture(e.pointerId);
    });

    // CRITICAL: Prevent clicks and drags on the Song Map from bubbling to the parent timeline
    // This stops the parent window from scrolling when dragging the Song Map
    mapModal.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
    });
    mapModal.addEventListener('mousedown', (e) => {
        e.stopPropagation();
    });
}
// Pointer move for seamless song map drag selection
document.addEventListener('pointermove', (e) => {
    if (isMapBoxSelecting && isMapDragMode && mapSelectionBoxEl) {
        e.preventDefault();
        const currentX = e.clientX;
        const currentY = e.clientY;

        const left = Math.min(mapSelectionBoxStart.x, currentX);
        const top = Math.min(mapSelectionBoxStart.y, currentY);
        const width = Math.abs(mapSelectionBoxStart.x - currentX);
        const height = Math.abs(mapSelectionBoxStart.y - currentY);

        mapSelectionBoxEl.style.left = left + 'px';
        mapSelectionBoxEl.style.top = top + 'px';
        mapSelectionBoxEl.style.width = width + 'px';
        mapSelectionBoxEl.style.height = height + 'px';

        updateMapSelectionFromBox();
    }
});

function updateMapSelectionFromBox() {
    if (!mapSelectionBoxEl) return;
    const boxRect = mapSelectionBoxEl.getBoundingClientRect();
    const mapGrid = document.getElementById('songMapGrid');
    if (!mapGrid) return;

    let minIdx = -1;
    let maxIdx = -1;

    const chordElements = mapGrid.querySelectorAll('.map-chord-click-target');

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
            const index = parseInt(el.dataset.index, 10);
            if (!isNaN(index)) {
                if (minIdx === -1 || index < minIdx) minIdx = index;
                if (maxIdx === -1 || index > maxIdx) maxIdx = index;
            }
        }
    }

    if (minIdx !== -1 && maxIdx !== -1) {
        mapSelectionState = { active: true, startIdx: minIdx, endIdx: maxIdx };
        updateMapSelectionUI();
    } else {
        mapSelectionState = { active: false, startIdx: -1, endIdx: -1 };
        updateMapSelectionUI();
    }
}

// Listen for global pointerup to stop drag
document.addEventListener('pointerup', () => {
    if (isMapBoxSelecting) {
        isMapBoxSelecting = false;
        if (mapSelectionBoxEl) {
            mapSelectionBoxEl.remove();
            mapSelectionBoxEl = null;
        }
        if (mapSelectionState.active && mapSelectionState.startIdx !== -1 && typeof showMapLabelPicker === 'function') {
            showMapLabelPicker();
        }
    }
    if (isMapDraggingActive) {
        isMapDraggingActive = false;
        if (typeof showMapLabelPicker === 'function') {
            showMapLabelPicker();
        }
    }
});

function openSongMap() {
    const overlay = document.getElementById('songMapOverlay');
    if (!overlay) return;

    // Populate Metadata
    const mapArtist = document.getElementById('mapArtistDisplay');
    const mapTitle = document.getElementById('mapSongTitleDisplay');
    const mainArtist = document.getElementById('artistDisplay');
    const mainTitle = document.getElementById('songTitleDisplay');

    // Attempt thumbnail fetch from parent
    const mapThumb = document.getElementById('mapThumbnailDisplay');
    if (mapThumb) {
        if (typeof window.parent !== 'undefined' && window.parent.document.getElementById('songDetailThumbnail')) {
            const parentThumb = window.parent.document.getElementById('songDetailThumbnail');
            if (parentThumb.src && !parentThumb.classList.contains('hidden')) {
                mapThumb.src = parentThumb.src;
                mapThumb.classList.remove('hidden');
            } else {
                mapThumb.classList.add('hidden');
            }
        } else {
            mapThumb.classList.add('hidden');
        }
    }

    if (mapArtist && mainArtist) mapArtist.textContent = mainArtist.textContent;
    if (mapTitle && mainTitle) mapTitle.textContent = mainTitle.textContent;

    // Initial parsing of markers into custom sections
    if (customMapSections === null || customMapSections === undefined) {
        initCustomMapSectionsFromMarkers();
        // Record this as the original state if we just generated it
        originalMapSectionsJson = JSON.stringify(customMapSections);
    }

    populateSongMap();

    // Reset position to default (10vh top) which is now controlled by CSS initially, 
    // but if it was dragged, we should clear the inline styles to let CSS take over again.
    const mapModalEl = document.querySelector('.map-modal-content');
    if (mapModalEl) {
        mapModalEl.style.left = '';
        mapModalEl.style.top = '';
        mapModalEl.style.margin = '';
    }

    overlay.classList.remove('hidden');

    // Tell parent to hide its close button to avoid 'stacked' look and accidental closing of the whole thing
    // ONLY do this on small mobile screens where the map is fullscreen and the close button is integrated.
    // On Desktop, let the parent's close buttons remain visible at the top of the screen.
    const isSmallScreen = window.innerWidth <= 600;
    if (window.parent && typeof window.parent.postMessage === 'function') {
        window.parent.postMessage({ type: 'toggleTimelineCloseBtn', visible: !isSmallScreen }, '*');
    }

    // Sync style and zoom labels on open
    const styleLabel = document.getElementById('mapStyleLabel');
    if (styleLabel) {
        styleLabel.textContent = (currentMapStyleIndex + 1);
    }
    const zoomLabel = document.getElementById('mapZoomLabel');
    if (zoomLabel) {
        zoomLabel.textContent = Math.round(MAP_ZOOM_LEVELS[currentMapZoomIndex] * 100) + '%';
    }

    checkForChanges(); // Sync save button state immediately on open

    // Sync mobile menu labels on open
    const isMobile = window.innerWidth < 768 || window.matchMedia("(orientation: portrait)").matches;
    if (isMobile) {
        const menuZoomValue = document.getElementById('menuZoomValue');
        const zoomLabel = document.getElementById('mapZoomLabel');
        if (menuZoomValue && zoomLabel) menuZoomValue.textContent = zoomLabel.textContent;

        const menuEditStatus = document.getElementById('menuEditStatus');
        if (menuEditStatus) menuEditStatus.textContent = isMapDragMode ? 'ON' : 'OFF';

        const menuStyleValue = document.getElementById('menuStyleValue');
        const styleLabel = document.getElementById('mapStyleLabel');
        if (menuStyleValue && styleLabel) menuStyleValue.textContent = styleLabel.textContent;
    }

    // Hide Background Displays
    if (currentChordDisplay) currentChordDisplay.classList.add('hidden');
    if (lyricsHUD) lyricsHUD.classList.add('hidden');

    // Stop playback while viewing map to avoid confusing visuals
    if (isPlaying) togglePlayPause();

    // Ensure focus is on the document so we can catch keyboard events
    window.focus();
}

// Global listener for the overlay to catch any clicks/drags that missed the modal content
if (document.getElementById('songMapOverlay')) {
    const mapOverlay = document.getElementById('songMapOverlay');
    mapOverlay.addEventListener('pointerdown', (e) => e.stopPropagation());
    mapOverlay.addEventListener('mousedown', (e) => e.stopPropagation());
    mapOverlay.addEventListener('wheel', (e) => e.stopPropagation());
    mapOverlay.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
}

function initCustomMapSectionsFromMarkers() {
    customMapSections = [];
    if (!chords || chords.length === 0) return;

    const sortedMarkers = [...markers].sort((a, b) => a.time - b.time);
    const sectionStartMarkers = sortedMarkers.filter(m => m.label && (
        m.label.includes('[') ||
        m.label.toUpperCase().includes('BLOCK') ||
        m.label.toUpperCase().includes('VERSE') ||
        m.label.toUpperCase().includes('CHORUS') ||
        m.label.toUpperCase().includes('BRIDGE') ||
        m.label.toUpperCase().includes('INTRO') ||
        m.label.toUpperCase().includes('OUTRO') ||
        m.label.toUpperCase().includes('SOLO')
    ));

    if (sectionStartMarkers.length === 0) return;

    for (let i = 0; i < sectionStartMarkers.length; i++) {
        const currentMarker = sectionStartMarkers[i];
        const nextMarker = sectionStartMarkers[i + 1];

        const startTime = currentMarker.time;
        const endTime = nextMarker ? nextMarker.time : (chords[chords.length - 1].time + 10);

        const startIdx = chords.findIndex(c => c.time >= startTime);
        let endIdx = chords.findIndex(c => c.time >= endTime);
        if (endIdx === -1) endIdx = chords.length - 1;
        else endIdx--;

        if (startIdx !== -1 && startIdx <= endIdx) {
            const name = currentMarker.label.replace(/[\[\]]/g, '').toUpperCase().trim();
            let type = 'verse';
            if (name.includes('INTRO')) type = 'intro';
            else if (name.includes('VERSE')) type = 'verse';
            else if (name.includes('PRE')) type = 'prechorus';
            else if (name.includes('CHORUS')) type = 'chorus';
            else if (name.includes('BRIDGE')) type = 'bridge';
            else if (name.includes('OUTRO')) type = 'outro';
            else if (name.includes('SOLO')) type = 'solo';

            customMapSections.push({
                name: name,
                type: type,
                startIdx: startIdx,
                endIdx: endIdx
            });
        }
    }
}

function closeSongMap() {
    if (typeof checkIfHasChanges === 'function' && checkIfHasChanges()) {
        if (window.confirmationModal) {
            window.confirmationModal.show(
                'Unsaved Changes',
                'You have unsaved changes. Do you want to save them first?',
                () => {
                    // SAVE
                    saveToDatabase(() => {
                        _forceCloseSongMap();
                    });
                },
                () => {
                    // DON'T SAVE
                    _forceCloseSongMap();
                },
                'SAVE',
                "DON'T SAVE"
            );
            return;
        }
    }
    // If we were opened purely as a map (from songlist), close the entire parent modal
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('openMap') === 'true') {
        if (window.parent && typeof window.parent.postMessage === 'function') {
            window.parent.postMessage({ type: 'closeScrollingChordsModal' }, '*');
        }
    } else {
        _forceCloseSongMap();
    }
}

if (document.getElementById('closeSongMapBtn')) {
    document.getElementById('closeSongMapBtn').addEventListener('pointerdown', (e) => e.stopPropagation());
    document.getElementById('closeSongMapBtn').addEventListener('mousedown', (e) => e.stopPropagation());
}

function _forceCloseSongMap() {
    const overlay = document.getElementById('songMapOverlay');
    if (overlay) overlay.classList.add('hidden');

    // Restore parent's close button
    if (window.parent && typeof window.parent.postMessage === 'function') {
        window.parent.postMessage({ type: 'toggleTimelineCloseBtn', visible: true }, '*');
    }

    document.body.classList.remove('song-map-active'); // Remove clean mode class

    mapSelectionState = { active: false, startIdx: -1, endIdx: -1 };
    hideMapLabelPicker();

    // Restore Background Displays
    if (currentChordDisplay) currentChordDisplay.classList.remove('hidden');
    // HUD will restore itself based on its own state if needed
}

function populateSongMap() {
    const grid = document.getElementById('songMapGrid');
    if (!grid || !chords) return;

    document.body.classList.add('song-map-active'); // Enable clean mode class
    grid.innerHTML = '';

    // Create a fluid container for all chords
    const timelineContainer = document.createElement('div');
    timelineContainer.className = `map-fluid-timeline ${MAP_STYLES[currentMapStyleIndex]}`;

    timelineContainer.style.setProperty('--map-zoom-scale', MAP_ZOOM_LEVELS[currentMapZoomIndex]);

    // Add pointerdown to the container so we can draw the selection box from anywhere
    timelineContainer.addEventListener('pointerdown', (e) => {
        // If clicking inside the picker, on a section label, or on a chord button, don't start a new selection box
        if (e.target.closest('#mapLabelPicker') ||
            e.target.closest('.map-fluid-section-label') ||
            e.target.closest('.map-chord-click-target')) return;

        if (isMapDragMode) {
            e.preventDefault();
            isMapBoxSelecting = true;
            mapSelectionBoxStart = { x: e.clientX, y: e.clientY };
            mapSelectionBoxEl = document.createElement('div');
            mapSelectionBoxEl.className = 'selection-box';
            document.body.appendChild(mapSelectionBoxEl);

            mapSelectionState = { active: false, startIdx: -1, endIdx: -1 };
            updateMapSelectionUI();
            hideMapLabelPicker();
        }
    });

    grid.appendChild(timelineContainer);

    let lastTimeMarkerReached = -1;
    let currentContainer = timelineContainer; // Grouping container for Word Wrap logic

    chords.forEach((chord, index) => {
        const chordTimeSeconds = chord.time;
        const timeMarkerThreshold = Math.floor(chordTimeSeconds / 30) * 30;
        let isTimeMarkerStart = false;

        if (timeMarkerThreshold > lastTimeMarkerReached) {
            isTimeMarkerStart = true;
            lastTimeMarkerReached = timeMarkerThreshold;
        }

        // Detect if chord falls into a custom map section
        let sectionName = null;
        let isSectionStart = false;
        let isSectionEnd = false;
        let isSectionMember = false;
        let btnColorClass = 'chord-type-verse';

        for (let i = 0; i < customMapSections.length; i++) {
            const sec = customMapSections[i];
            if (index >= sec.startIdx && index <= sec.endIdx) {
                sectionName = sec.name;
                isSectionStart = (index === sec.startIdx);
                isSectionEnd = (index === sec.endIdx);
                isSectionMember = true;
                // Determine color class: prioritize stored type, fallback to name parsing
                let type = sec.type;
                if (!type) {
                    if (sectionName.includes('VERSE')) type = 'verse';
                    else if (sectionName.includes('PRE')) type = 'prechorus';
                    else if (sectionName.includes('CHORUS')) type = 'chorus';
                    else if (sectionName.includes('BRIDGE')) type = 'bridge';
                    else if (sectionName.includes('INTRO')) type = 'intro';
                    else if (sectionName.includes('OUTRO')) type = 'outro';
                    else if (sectionName.includes('SOLO')) type = 'solo';
                    else if (sectionName.includes('INSTRUMENTAL')) type = 'instrumental';
                    else type = 'verse';
                    // NO MUTATION (sec.type = type) here, it breaks change detection if the property was missing
                }
                btnColorClass = `chord-type-${type}`;
                break;
            }
        }

        const chordWrapper = document.createElement('div');
        chordWrapper.className = 'map-fluid-chord-wrapper';
        if (isSectionMember) {
            chordWrapper.classList.add('map-section-member');
            chordWrapper.classList.add(`map-color-group-${btnColorClass}`);
            if (isSectionStart) chordWrapper.classList.add('map-section-start');
            if (isSectionEnd) chordWrapper.classList.add('map-section-end');
            if (!isSectionStart && !isSectionEnd) chordWrapper.classList.add('map-section-middle');
        }

        // Add Time Marker
        if (isTimeMarkerStart) {
            const timeMarkerEl = document.createElement('div');
            timeMarkerEl.className = 'map-time-marker';
            timeMarkerEl.textContent = formatTime(timeMarkerThreshold);
            chordWrapper.appendChild(timeMarkerEl);
        }

        if (isSectionStart) {
            const labelEl = document.createElement('div');
            labelEl.className = 'map-fluid-section-label';
            labelEl.textContent = sectionName;

            if (btnColorClass === 'chord-type-verse') labelEl.style.color = '#3730a3'; // Indigo
            else if (btnColorClass === 'chord-type-chorus') labelEl.style.color = '#92400e'; // Rich Amber/Brown for contrast
            else if (btnColorClass === 'chord-type-bridge') labelEl.style.color = '#be123c'; // Rose
            else if (btnColorClass === 'chord-type-prechorus') labelEl.style.color = '#0e7490'; // Cyan/Teal
            else if (btnColorClass === 'chord-type-intro') labelEl.style.color = '#701a75'; // Fuchsia
            else if (btnColorClass === 'chord-type-outro') labelEl.style.color = '#9a3412'; // Rust
            else if (btnColorClass === 'chord-type-solo') labelEl.style.color = '#1e1b4b'; // Deep Indigo

            const sec = customMapSections.find(s => s.startIdx === index);
            labelEl.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!sec) return;
                showMapRenameModal(sec);
            });

            labelEl.title = "Click to rename label";
            chordWrapper.appendChild(labelEl);
            chordWrapper.classList.add('has-label');
        }

        const btn = document.createElement('button');
        const rootChar = chord.name ? chord.name.charAt(0).toUpperCase() : '';
        btn.className = `chord-suggestion-btn map-chord-click-target ${btnColorClass}`;

        if (rootChar >= 'A' && rootChar <= 'G') {
            btn.classList.add(`root-${rootChar}`);
        }

        if (!sectionName) {
            btn.classList.add('map-unassigned-chord');
        }

        btn.textContent = simplifyDisplayName(chord.name);

        if (mapSelectionState.active && mapSelectionState.startIdx !== -1) {
            const minIdx = Math.min(mapSelectionState.startIdx, mapSelectionState.endIdx !== -1 ? mapSelectionState.endIdx : mapSelectionState.startIdx);
            const maxIdx = Math.max(mapSelectionState.startIdx, mapSelectionState.endIdx !== -1 ? mapSelectionState.endIdx : mapSelectionState.startIdx);
            if (index >= minIdx && index <= maxIdx) {
                btn.classList.add('map-chord-selected');
            }
        }

        btn.dataset.index = index;
        btn.style.touchAction = 'none';

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isMapDragMode) {
                handleMapChordClick(index);
            } else {
                jumpToTime(chord.time);
            }
        });

        btn.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            // In either mode, jump to time on double click
            jumpToTime(chord.time);
            if (!isPlaying) togglePlayPause();
            // Never open label picker on dblclick
        });

        if (isSectionStart) {
            const sectionGroup = document.createElement('div');
            sectionGroup.className = 'map-section-group';
            timelineContainer.appendChild(sectionGroup);
            currentContainer = sectionGroup;
        }

        chordWrapper.appendChild(btn);
        currentContainer.appendChild(chordWrapper);

        if (isSectionEnd) {
            currentContainer = timelineContainer;
        }
    });
}

function updateMapSelectionUI() {
    const buttons = document.querySelectorAll('.map-chord-click-target');
    const minIdx = Math.min(mapSelectionState.startIdx, mapSelectionState.endIdx !== -1 ? mapSelectionState.endIdx : mapSelectionState.startIdx);
    const maxIdx = Math.max(mapSelectionState.startIdx, mapSelectionState.endIdx !== -1 ? mapSelectionState.endIdx : mapSelectionState.startIdx);

    buttons.forEach((btn, index) => {
        if (mapSelectionState.active && index >= minIdx && index <= maxIdx) {
            btn.classList.add('map-chord-selected');
        } else {
            btn.classList.remove('map-chord-selected');
        }
    });
}

function handleMapChordClick(index) {
    if (!mapSelectionState.active || mapSelectionState.startIdx === -1) {
        // State 1: Nothing selected. Set the anchor point.
        mapSelectionState = { active: true, startIdx: index, endIdx: index };
    } else if (mapSelectionState.startIdx === mapSelectionState.endIdx && mapSelectionState.startIdx !== index) {
        // State 2: Already had an anchor, establishing a range with a different chord.
        mapSelectionState.endIdx = index;
    } else {
        // State 3: Already had a range, restart with a new anchor.
        mapSelectionState = { active: true, startIdx: index, endIdx: index };
    }

    updateMapSelectionUI();
    showMapLabelPicker();
}

function updateSongMapHighlight(activeIndex) {
    const mapGrid = document.getElementById('songMapGrid');
    if (!mapGrid) return;

    const buttons = mapGrid.querySelectorAll('.map-chord-click-target');
    buttons.forEach((btn, idx) => {
        if (idx === activeIndex) {
            btn.classList.add('map-chord-playing');
        } else {
            btn.classList.remove('map-chord-playing');
        }
    });
}

function showMapLabelPicker() {
    let picker = document.getElementById('mapLabelPicker');
    const modalContent = document.querySelector('.map-modal-content');
    if (!picker) {
        picker = document.createElement('div');
        picker.id = 'mapLabelPicker';
        picker.className = 'map-label-picker';
        if (modalContent) {
            modalContent.appendChild(picker);
        } else {
            document.getElementById('songMapOverlay').appendChild(picker);
        }
    }

    picker.innerHTML = ''; // Clear existing

    // Close button (X) in top right
    const closeBtnX = document.createElement('button');
    closeBtnX.className = 'map-label-picker-close-btn';
    closeBtnX.innerHTML = '&times;';
    closeBtnX.title = 'Close';
    closeBtnX.onclick = (e) => {
        e.stopPropagation();
        hideMapLabelPicker();
    };
    picker.appendChild(closeBtnX);

    const title = document.createElement('div');
    title.className = 'map-label-picker-title';
    title.textContent = 'Label Selection:';

    // Dragging Logic for Picker
    title.addEventListener('pointerdown', (e) => {
        isPickerDragging = true;
        const rect = picker.getBoundingClientRect();
        pickerDragOffset.x = e.clientX - rect.left;
        pickerDragOffset.y = e.clientY - rect.top;

        // Switch to absolute positioning if not already
        picker.style.bottom = 'auto';
        picker.style.left = rect.left + 'px';
        picker.style.top = rect.top + 'px';
        picker.style.transform = 'none';
        picker.style.margin = '0';

        title.setPointerCapture(e.pointerId);
    });

    title.addEventListener('pointermove', (e) => {
        if (isPickerDragging) {
            const x = e.clientX - pickerDragOffset.x;
            const y = e.clientY - pickerDragOffset.y;
            picker.style.left = x + 'px';
            picker.style.top = y + 'px';
        }
    });

    title.addEventListener('pointerup', (e) => {
        isPickerDragging = false;
        title.releasePointerCapture(e.pointerId);
    });

    picker.appendChild(title);

    const labels = ['INTRO', 'VERSE', 'PRE CHORUS', 'CHORUS', 'BRIDGE', 'OUTRO', 'SOLO', 'INSTRUMENTAL', 'REMOVE'];
    const pillContainer = document.createElement('div');
    pillContainer.className = 'map-label-pills-container';

    labels.forEach(lbl => {
        const btn = document.createElement('button');
        btn.className = 'map-label-pill';
        if (lbl.includes('INTRO')) btn.classList.add('pill-magenta');
        else if (lbl.includes('VERSE')) btn.classList.add('pill-cyan');
        else if (lbl.includes('PRE CHORUS')) btn.classList.add('pill-neon-green');
        else if (lbl.includes('CHORUS')) btn.classList.add('pill-amber');
        else if (lbl.includes('BRIDGE')) btn.classList.add('pill-hot-pink');
        else if (lbl.includes('SOLO')) btn.classList.add('pill-indigo');
        else if (lbl.includes('OUTRO')) btn.classList.add('pill-orange');
        else if (lbl.includes('INSTRUMENTAL')) btn.classList.add('pill-purple');
        else if (lbl === 'REMOVE') btn.classList.add('label-clear');

        btn.textContent = lbl;
        btn.onclick = (e) => {
            e.stopPropagation();
            applyMapLabel(lbl);
        };
        pillContainer.appendChild(btn);
    });

    picker.appendChild(pillContainer);

    const inputContainer = document.createElement('div');
    inputContainer.className = 'map-label-input-container';

    const customInput = document.createElement('input');
    customInput.type = 'text';
    customInput.placeholder = 'Custom Label...';
    customInput.className = 'map-label-custom-input';

    customInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && customInput.value.trim()) {
            applyMapLabel(customInput.value.trim().toUpperCase());
        }
    });

    const addBtn = document.createElement('button');
    addBtn.textContent = 'Apply';
    addBtn.className = 'map-label-custom-btn';
    addBtn.onclick = (e) => {
        e.stopPropagation();
        if (customInput.value.trim()) {
            applyMapLabel(customInput.value.trim().toUpperCase());
        }
    };

    inputContainer.appendChild(customInput);
    inputContainer.appendChild(addBtn);
    picker.appendChild(inputContainer);

    picker.classList.remove('hidden');
}

function hideMapLabelPicker() {
    const picker = document.getElementById('mapLabelPicker');
    if (picker) picker.classList.add('hidden');
    mapSelectionState = { active: false, startIdx: -1, endIdx: -1 };
    populateSongMap(); // clear selection styles
}

function applyMapLabel(label) {
    if (!mapSelectionState.active || mapSelectionState.startIdx === -1) return;

    const minIdx = Math.min(mapSelectionState.startIdx, mapSelectionState.endIdx !== -1 ? mapSelectionState.endIdx : mapSelectionState.startIdx);
    const maxIdx = Math.max(mapSelectionState.startIdx, mapSelectionState.endIdx !== -1 ? mapSelectionState.endIdx : mapSelectionState.startIdx);

    // Remove overlapping sections entirely or truncate them
    customMapSections = customMapSections.filter(sec => {
        // If entirely inside the new selection, drop it
        if (sec.startIdx >= minIdx && sec.endIdx <= maxIdx) return false;
        return true;
    });

    // Adjust existing overlapping sections (basic truncation logic)
    customMapSections.forEach(sec => {
        if (sec.startIdx < minIdx && sec.endIdx >= minIdx && sec.endIdx <= maxIdx) {
            sec.endIdx = minIdx - 1; // Touched left side
        }
        if (sec.startIdx >= minIdx && sec.startIdx <= maxIdx && sec.endIdx > maxIdx) {
            sec.startIdx = maxIdx + 1; // Touched right side
        }
    });

    if (label !== 'REMOVE') {
        let type = 'verse';
        let finalLabel = label;
        const up = label.toUpperCase();

        // Intelligent numbering for VERSE label
        if (up === 'VERSE') {
            // Count how many existing sections have "VERSE" in their name
            const verseCount = customMapSections.filter(sec => sec.name.toUpperCase().includes('VERSE')).length;
            finalLabel = `VERSE ${verseCount + 1}`;
            type = 'verse';
        } else {
            // Standard detection for other labels
            if (up.includes('INTRO')) type = 'intro';
            else if (up.includes('VERSE')) type = 'verse';
            else if (up.includes('PRE CHORUS') || up.includes('PRECHORUS')) type = 'prechorus';
            else if (up.includes('CHORUS')) type = 'chorus';
            else if (up.includes('BRIDGE')) type = 'bridge';
            else if (up.includes('OUTRO')) type = 'outro';
            else if (up.includes('SOLO')) type = 'solo';
            else if (up.includes('INSTRUMENTAL')) type = 'instrumental';
        }

        customMapSections.push({
            name: finalLabel,
            type: type,
            startIdx: minIdx,
            endIdx: maxIdx
        });
    }

    // Retain sorted order
    customMapSections.sort((a, b) => a.startIdx - b.startIdx);

    // Find markers backing code and sync? 
    // Usually map annotations could optionally be synced back, but for now we keep it visual on the map.

    hideMapLabelPicker(); // This clears state & re-renders
    checkForChanges(); // Enable Save button
}

function jumpToTime(time) {
    if (pianoPlayer) pianoPlayer.stopAll();

    if (isPlaying) {
        startTime = performance.now() - (time * 1000);
        if (youtubePlayer && !youtubePlayerContainer.classList.contains('hidden')) {
            youtubePlayer.seekTo(time, true);
        }
    } else {
        pauseTime = time;
        updateLoop();
        if (youtubePlayer && !youtubePlayerContainer.classList.contains('hidden')) {
            youtubePlayer.seekTo(time, true);
        }
    }

    statusText.innerText = "Jumped to " + formatTime(time);
}

function showMapRenameModal(sec) {
    if (!sec) return;

    // Remove existing if any
    const existing = document.getElementById('mapRenameModalOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'mapRenameModalOverlay';
    overlay.className = 'map-rename-modal-overlay';

    overlay.innerHTML = `
        <div class="map-rename-modal">
            <h3 class="map-rename-title">Rename Section</h3>
            <div class="map-rename-input-wrap">
                <label class="map-rename-input-label">Label Name</label>
                <input type="text" id="mapRenameInput" class="map-rename-input" value="${sec.name}" placeholder="INTRO, VERSE, CHORUS..." />
            </div>
            <div class="map-rename-footer">
                <button id="mapRenameCancel" class="map-rename-btn map-rename-btn-secondary">Cancel</button>
                <button id="mapRenameSave" class="map-rename-btn map-rename-btn-primary">SAVE</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector('#mapRenameInput');
    const saveBtn = overlay.querySelector('#mapRenameSave');
    const cancelBtn = overlay.querySelector('#mapRenameCancel');

    input.focus();
    input.select();

    const performSave = () => {
        const newName = input.value.trim();
        if (newName !== '') {
            sec.name = newName.toUpperCase();
            populateSongMap();
            checkForChanges();
        }
        overlay.remove();
    };

    saveBtn.onclick = (e) => {
        e.stopPropagation();
        performSave();
    };

    cancelBtn.onclick = (e) => {
        e.stopPropagation();
        overlay.remove();
    };

    // Close on background click
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    };

    // Handle keys
    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            performSave();
        } else if (e.key === 'Escape') {
            overlay.remove();
        }
    };
}







