// Scrolling Chords Logic (v3.141)

const midiInput = document.getElementById('midiInput');
const statusText = document.getElementById('statusText');
const playPauseBtn = document.getElementById('playPauseBtn');
const rwdBtn = document.getElementById('rwdBtn');
const fwdBtn = document.getElementById('fwdBtn');
const exportBtn = document.getElementById('exportBtn');
const timeline = document.getElementById('timeline');
const chordTrack = document.getElementById('chordTrack');
const markerTrack = document.getElementById('markerTrack');
const interactionTrack = document.getElementById('interactionTrack');
const tracksContainer = document.getElementById('tracksContainer');
const currentChordDisplay = document.getElementById('currentChordDisplay');
const instructions = document.getElementById('instructions');
const metronomeBtn = document.getElementById('metronomeBtn');
const bpmBtn = document.getElementById('bpmBtn');
const saveBtn = document.getElementById('saveBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const clearDataBtn = document.getElementById('clearDataBtn');
const clearLinksBtn = document.getElementById('clearLinksBtn');
const restartBtn = document.getElementById('restartBtn');
const audioToggleBtn = document.getElementById('audioToggleBtn');
const captureBtn = document.getElementById('captureBtn');
const speedBtn = document.getElementById('speedBtn'); // Fixed: Was missing
const youtubeToggleBtn = document.getElementById('youtubeToggleBtn');
const youtubeToggleBtnCompact = document.getElementById('youtubeToggleBtnCompact');
const youtubePlayerContainer = document.getElementById('youtubePlayerContainer');
const recordingIndicator = document.getElementById('recordingIndicator');
const countInOverlay = document.getElementById('countInOverlay');
const countInNumber = document.getElementById('countInNumber');
const barDecBtn = document.getElementById('barDecBtn');
const barIncBtn = document.getElementById('barIncBtn');
const barOffsetDisplay = document.getElementById('barOffsetDisplay');
const toggleLyricsBtn = document.getElementById('toggleLyricsBtn');
const textModeBtn = document.getElementById('textModeBtn');
const textModeOverlay = document.getElementById('textModeOverlay');
const textModeContent = document.getElementById('textModeContent');
const lyricsHUD = document.getElementById('lyricsHUD');
const lyricLine1 = document.getElementById('lyricLine1');
const lyricLine2 = document.getElementById('lyricLine2');
const songMapPlayPauseBtn = document.getElementById('songMapPlayPauseBtn');
const playPauseBtnCompact = document.getElementById('playPauseBtnCompact');
const audioToggleBtnCompact = document.getElementById('audioToggleBtnCompact');
const chordProgressionBtn = document.getElementById('chordProgressionBtn');
const fullscreenToggleBtn = document.getElementById('fullscreenToggleBtn');
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
        .controls-container { padding-right: 44px !important; }
        @media screen and (min-width: 1024px) {
            .controls-container { padding-right: 120px !important; }
        }
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
let isTextMode = false;
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
let simplifyChordsMode = false;
let currentTeacherNotes = '';
let timelineNotes = []; // Array of { id: string, time: number, text: string }
let currentEditingNoteId = null; // Track note currently being created/edited
let isDraggingNoteMarker = false;
let dragNoteMarkerId = null;
let dragNoteMarkerPointerStartX = 0;
let dragNoteMarkerStartTime = 0;
let isTeacherMode = false;

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
let isDraggingLyricMarker = false;
let dragLyricMarkerPointerStartX = 0;
let dragLyricMarkerStartTime = 0;

function saveTimelineNotesToParent() {
    if (window.parent) {
        window.parent.postMessage({
            type: 'saveTimelineNotes',
            timelineNotes: timelineNotes
        }, '*');
    }
}

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
let audioEnabled = true; // Initial default, will be overridden by Profile setting (v3.141)
let currentUid = 'guest'; // Track current user for preferences
let loadedSongId = null; // Track current loaded song ID for band sync
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
let clipboardChords = [];
let isPasteMode = false;
const COPY_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
const PASTE_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>`;

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

function syncInstrumentModeClass() {
    if (typeof document !== 'undefined' && document.body) {
        document.body.classList.remove('instrument-mode-piano', 'instrument-mode-guitar', 'instrument-mode-ukulele', 'dual-instrument-active');
        document.body.classList.add(`instrument-mode-${currentInstrumentMode}`);
        const isDualInstrumentEnabled = localStorage.getItem('feature-dual-instrument-enabled-global') === 'true';
        if (isDualInstrumentEnabled) {
            document.body.classList.add('dual-instrument-active');
        }
    }
}

function simplifyChord(name) {
    if (!name) return "";
    let baseChord = name.split('/')[0].trim();
    const match = baseChord.match(/^([A-G][b#]?(?:m(?!a))?)/);
    if (match) return match[1];
    return baseChord.replace(/\d+$/, '').replace(/maj$/i, '').replace(/add$/i, '');
}

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

    if (typeof simplifyChordsMode !== 'undefined' && simplifyChordsMode) {
        resultName = simplifyChord(resultName);
    } else if (currentInstrumentMode === 'guitar') {
        resultName = resultName.split('/').map(part => {
            const lowPart = part.toLowerCase();
            if (lowPart.includes('sus') || lowPart.includes('add')) return part;
            return part.replace(/([23])$/, '');
        }).join('/');
    } else if (currentInstrumentMode === 'ukulele') {
        resultName = resultName.split('/').map(part => part.replace(/^([A-G][b#]?)[237]$/, '$1')).join('/');
    }
    return resultName;
}

function transposeBlockText(text, semitones) {
    if (!text || semitones === 0 || !chordParser) return text || '';
    
    // Match bracketed text, dividers, repeat markers, or chords
    const items = text.match(/\[.*?\]|\||\d+x|[^\s|]+/g) || [];
    return items.map(item => {
        const trimmed = item.trim();
        if (trimmed === '|' || /^\d+x$/.test(trimmed) || /^\[.*\]$/.test(trimmed)) return trimmed;
        
        return chordParser.transpose(trimmed, semitones);
    }).join(' ');
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
    if (typeof generateTextModeContent === 'function') generateTextModeContent();

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
        loadedSongId = msg.songId || null;
        if (msg.isPublic !== undefined) isPublicMode = msg.isPublic;
        if (msg.canEdit !== undefined) canEditPublic = msg.canEdit;
        if (msg.capo !== undefined) currentCapoValue = parseInt(msg.capo) || 0;
        if (msg.simplifyChords !== undefined) simplifyChordsMode = !!msg.simplifyChords;
        if (msg.timelineNotes !== undefined) {
            timelineNotes = Array.isArray(msg.timelineNotes) ? msg.timelineNotes : [];
        } else if (msg.teacherNotes !== undefined) {
            const oldNotes = (msg.teacherNotes || '').trim();
            if (oldNotes) {
                timelineNotes = [{
                    id: 'note_default',
                    time: 0.1,
                    text: oldNotes
                }];
            } else {
                timelineNotes = [];
            }
        } else {
            timelineNotes = [];
        }
        currentTeacherNotes = msg.teacherNotes || '';
        if (msg.userRole !== undefined) {
            isTeacherMode = (msg.userRole === 'teacher');
        } else {
            isTeacherMode = (localStorage.getItem('userRole') === 'teacher');
        }
        updateTeacherNoteButtonVisibility();
        if (msg.uid) {
            currentUid = msg.uid;
            // Apply default audio setting from Profile (v3.141)
            const profileAudioDefault = localStorage.getItem(`feature-timeline-audio-enabled-${currentUid}`);
            audioEnabled = profileAudioDefault !== null ? (profileAudioDefault === 'true') : false; // Default to OFF if no setting
            syncPureTimelineButtons(); // Update UI buttons
            if (audioToggleBtn) audioToggleBtn.classList.toggle('active', audioEnabled);
        }
        loadData(msg.data, msg.youtubeUrl, msg.title, msg.suggestedChords, msg.artist, msg.songTitle, msg.fullLyrics, msg.lyrics, msg.lyricOffset, msg.instrumentMode, msg.key, currentCapoValue);
        // Restore last playback position if provided
        if (msg.lastPosition && msg.lastPosition > 0) {
            pauseTime = msg.lastPosition;
            renderStaticElements();
        }
        if (window.bandSyncInstance) {
            window.bandSyncInstance.updateSongPresence();
        }
    }
    else if (msg.type === 'stopAudio') {
        if (pianoPlayer) pianoPlayer.stopAll();
        if (youtubePlayer && isYoutubePlaying && typeof youtubePlayer.pauseVideo === 'function') {
            youtubePlayer.pauseVideo();
        }
        isPlaying = false;
        if (playPauseBtn) {
            playPauseBtn.innerHTML = '▶ <span>PLAY</span>';
            playPauseBtn.classList.remove('playing');
        }
        cancelAnimationFrame(animationFrame);
    }
    else if (msg.type === 'stopPianoAudio') {
        if (pianoPlayer) pianoPlayer.stopAll();
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
            if (msg.instrumentMode) {
                currentInstrumentMode = msg.instrumentMode;
                syncInstrumentModeClass();
            }
            if (msg.capo !== undefined) currentCapoValue = parseInt(msg.capo) || 0;
            renderSuggestedChords(suggestedChords);
        }
    }
    else if (msg.type === 'saveChanges') {
        saveToDatabase();
    }
    else if (msg.type === 'songForked') {
        isPublicMode = false;
        canEditPublic = true;
        console.log('Timeline received songForked notification. New ID:', msg.newSongId);
    }
    else if (msg.type === 'setInstrumentMode') {
        currentInstrumentMode = msg.instrumentMode;
        syncInstrumentModeClass();
        if (msg.capo !== undefined) currentCapoValue = parseInt(msg.capo) || 0;
        // Force audition display to refresh for new instrument mode
        window.lastAuditionChordName = null;
        renderStaticElements();
        updateLoop();
    }
    else if (msg.type === 'setDualInstrument') {
        syncInstrumentModeClass();
        if (typeof updateAuditionKeyboardChord === 'function') {
            updateAuditionKeyboardChord(window.lastAuditionChordName || '');
        }
    }
    else if (msg.type === 'setCapoValue') {
        currentCapoValue = parseInt(msg.capo) || 0;
        if (suggestedChords && typeof renderSuggestedChords === 'function') {
            renderSuggestedChords(suggestedChords);
        }
        renderStaticElements();
        updateLoop();
    }
    else if (msg.type === 'forwardKeyDown') {
        // Manually trigger the local keydown logic for forwarded keys
        const syntheticEvent = {
            key: msg.key,
            code: msg.code,
            ctrlKey: msg.ctrlKey,
            metaKey: msg.metaKey,
            preventDefault: () => {},
            target: document.body
        };
        if (typeof handleGlobalKeyDown === 'function') {
            handleGlobalKeyDown(syntheticEvent);
        }
    }
});

// Signal that we are ready to receive data
console.log('Scrolling Chords: Handshake ready');
window.focus(); // Force focus to capture spacebar immediately
if (window.parent) {
    window.parent.postMessage({ type: 'scrollingChordsReady' }, '*');
} else if (window.opener) {
    window.opener.postMessage({ type: 'scrollingChordsReady' }, '*');
}


// Setup Event Listeners
// Setup Event Listeners (Safe Initialization)
document.addEventListener('DOMContentLoaded', () => {
    console.log('Scrolling Chords: Initializing Event Listeners');
    syncInstrumentModeClass();

    if (midiInput) midiInput.addEventListener('change', handleFileSelect);
    if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlayPause);
    if (rwdBtn) rwdBtn.addEventListener('click', () => seek(-10));
    if (fwdBtn) fwdBtn.addEventListener('click', () => seek(10));
    if (exportBtn) exportBtn.addEventListener('click', exportToJSON);
    if (saveBtn) saveBtn.addEventListener('click', saveToDatabase);
    if (undoBtn) undoBtn.addEventListener('click', undo);
    if (redoBtn) redoBtn.addEventListener('click', redo);
    const textModeUndoBtn = document.getElementById('textModeUndoBtn');
    const textModeRedoBtn = document.getElementById('textModeRedoBtn');
    const textModeSaveBtn = document.getElementById('textModeSaveBtn');
    if (textModeUndoBtn) textModeUndoBtn.addEventListener('click', undo);
    if (textModeRedoBtn) textModeRedoBtn.addEventListener('click', redo);
    if (textModeSaveBtn) textModeSaveBtn.addEventListener('click', saveToDatabase);
    if (clearDataBtn) clearDataBtn.addEventListener('click', clearData);
    if (clearLinksBtn) clearLinksBtn.addEventListener('click', clearAllLyricLinks);
    const textModeHeaderPrevBtn = document.getElementById('textModeHeaderPrevBtn');
    const textModeHeaderNextBtn = document.getElementById('textModeHeaderNextBtn');
    if (textModeHeaderPrevBtn) textModeHeaderPrevBtn.addEventListener('click', () => { if (typeof window.prevTextPage === 'function') window.prevTextPage(); });
    if (textModeHeaderNextBtn) textModeHeaderNextBtn.addEventListener('click', () => { if (typeof window.nextTextPage === 'function') window.nextTextPage(); });
    if (metronomeBtn) metronomeBtn.addEventListener('click', toggleMetronome);
    if (bpmBtn) bpmBtn.addEventListener('click', changeBpm);
    if (captureBtn) captureBtn.addEventListener('click', toggleTimingCapture);
    if (audioToggleBtn) {
        audioToggleBtn.addEventListener('click', toggleAudio);
        // Set initial state for Default ON
        if (audioEnabled) audioToggleBtn.classList.add('active');
    }

    if (playPauseBtnCompact) playPauseBtnCompact.addEventListener('click', togglePlayPause);
    if (audioToggleBtnCompact) audioToggleBtnCompact.addEventListener('click', toggleAudio);

    if (restartBtn) restartBtn.addEventListener('click', restart);

    // Teacher Note Event Listeners
    const teacherNoteBtn = document.getElementById('teacherNoteBtn');
    const teacherNoteOverlay = document.getElementById('teacherNoteOverlay');
    const closeTeacherNoteBtn = document.getElementById('closeTeacherNoteBtn');
    const cancelTeacherNoteBtn = document.getElementById('cancelTeacherNoteBtn');
    const saveTeacherNoteBtn = document.getElementById('saveTeacherNoteBtn');
    const teacherNoteTextarea = document.getElementById('teacherNoteTextarea');

    if (teacherNoteBtn && teacherNoteOverlay) {
        const canEditNotes = () => {
            return isTeacherMode || !isPublicMode || canEditPublic;
        };

        const showNotesOverlay = (noteId = null) => {
            currentEditingNoteId = noteId;
            const editable = canEditNotes();
            const deleteBtn = document.getElementById('deleteTeacherNoteBtn');

            if (noteId === null) {
                // ADDING A NEW NOTE
                if (!editable) {
                    alert("You do not have permission to add notes to this song.");
                    return;
                }
                document.getElementById('teacherNoteEditView').classList.remove('hidden');
                document.getElementById('teacherNoteReadView').classList.add('hidden');
                document.getElementById('teacherNoteBtnGroup').style.display = 'flex';
                
                if (saveTeacherNoteBtn) saveTeacherNoteBtn.style.display = 'block';
                if (cancelTeacherNoteBtn) cancelTeacherNoteBtn.textContent = 'Cancel';
                if (deleteBtn) deleteBtn.style.display = 'none';
                
                if (teacherNoteTextarea) {
                    teacherNoteTextarea.value = '';
                    setTimeout(() => teacherNoteTextarea.focus(), 150);
                }
            } else {
                // VIEWING/EDITING EXISTING NOTE
                const note = timelineNotes.find(n => n.id === noteId);
                if (!note) return;

                if (editable) {
                    document.getElementById('teacherNoteEditView').classList.remove('hidden');
                    document.getElementById('teacherNoteReadView').classList.add('hidden');
                    document.getElementById('teacherNoteBtnGroup').style.display = 'flex';
                    
                    if (saveTeacherNoteBtn) saveTeacherNoteBtn.style.display = 'block';
                    if (cancelTeacherNoteBtn) cancelTeacherNoteBtn.textContent = 'Cancel';
                    if (deleteBtn) deleteBtn.style.display = 'block';
                    
                    if (teacherNoteTextarea) {
                        teacherNoteTextarea.value = note.text;
                        setTimeout(() => teacherNoteTextarea.focus(), 150);
                    }
                } else {
                    document.getElementById('teacherNoteEditView').classList.add('hidden');
                    document.getElementById('teacherNoteReadView').classList.remove('hidden');
                    const readView = document.getElementById('teacherNoteReadView');
                    if (readView) {
                        readView.textContent = note.text || 'No content.';
                    }
                    if (saveTeacherNoteBtn) saveTeacherNoteBtn.style.display = 'none';
                    if (cancelTeacherNoteBtn) cancelTeacherNoteBtn.textContent = 'Close';
                    if (deleteBtn) deleteBtn.style.display = 'none';
                }
            }
            teacherNoteOverlay.classList.remove('hidden');
        };

        const hideNotesOverlay = () => {
            teacherNoteOverlay.classList.add('hidden');
            currentEditingNoteId = null;
        };

        window.showNotesOverlay = showNotesOverlay;

        // Toolbar "ADD NOTE" creates a new note at the current playback position
        teacherNoteBtn.addEventListener('click', () => {
            showNotesOverlay(null);
        });

        if (closeTeacherNoteBtn) closeTeacherNoteBtn.addEventListener('click', hideNotesOverlay);
        if (cancelTeacherNoteBtn) cancelTeacherNoteBtn.addEventListener('click', hideNotesOverlay);
        
        // Save Note Listener
        if (saveTeacherNoteBtn && teacherNoteTextarea) {
            saveTeacherNoteBtn.addEventListener('click', () => {
                const newText = (teacherNoteTextarea.value || '').trim();
                if (!newText) {
                    hideNotesOverlay();
                    return;
                }
                
                if (currentEditingNoteId === null) {
                    // Create a new note at current timeline position
                    const time = isPlaying ? (performance.now() - startTime) / 1000 : pauseTime;
                    const targetTime = Math.max(0, parseFloat(time.toFixed(2)));
                    const newNote = {
                        id: 'note_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                        time: targetTime,
                        text: newText
                    };
                    timelineNotes.push(newNote);
                } else {
                    // Update existing note
                    const note = timelineNotes.find(n => n.id === currentEditingNoteId);
                    if (note) {
                        note.text = newText;
                    }
                }
                
                saveTimelineNotesToParent();
                hideNotesOverlay();
                updateTeacherNoteButtonVisibility();
                
                // Regenerate markers to reflect additions/changes
                if (midiData) {
                    markers = generateMarkers(midiData);
                } else if (typeof mockMidi !== 'undefined' && mockMidi) {
                    markers = generateMarkers(mockMidi);
                }
                renderStaticElements();
            });
        }

        // Delete Note Listener
        const deleteTeacherNoteBtn = document.getElementById('deleteTeacherNoteBtn');
        if (deleteTeacherNoteBtn) {
            deleteTeacherNoteBtn.addEventListener('click', () => {
                if (currentEditingNoteId !== null) {
                    timelineNotes = timelineNotes.filter(n => n.id !== currentEditingNoteId);
                    saveTimelineNotesToParent();
                }
                hideNotesOverlay();
                updateTeacherNoteButtonVisibility();
                
                // Regenerate markers to remove deleted pin
                if (midiData) {
                    markers = generateMarkers(midiData);
                } else if (typeof mockMidi !== 'undefined' && mockMidi) {
                    markers = generateMarkers(mockMidi);
                }
                renderStaticElements();
            });
        }
    }

    // Octave Cycle Button
    octaveCycleBtn = document.getElementById('octaveCycleBtn');
    if (octaveCycleBtn) {
        octaveCycleBtn.addEventListener('click', toggleOctavePlayback);
    }

    const menuChordProgressionBtn = document.getElementById('menuChordProgressionBtn');
    if (menuChordProgressionBtn) {
        menuChordProgressionBtn.addEventListener('click', () => {
            if (typeof ChordProgressionEditor === 'undefined') {
                console.error("ChordProgressionEditor script not loaded yet.");
                return;
            }

            if (!chordProgressionEditor) {
                // Initialize if not already done
                // Use the existing pianoPlayer if it exists, but editor can create its own
                chordProgressionEditor = new ChordProgressionEditor(pianoPlayer);
            }

            // Close the menu
            if (timelineHamburgerMenu) timelineHamburgerMenu.classList.add('hidden');

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

    // Mode Toggles
    const textModeBtn = document.getElementById('textModeBtn');
    if (textModeBtn) textModeBtn.addEventListener('click', toggleTextMode);

    const closeTextModeBtn = document.getElementById('closeTextModeBtn');
    if (closeTextModeBtn) closeTextModeBtn.addEventListener('click', toggleTextMode);

    const textModeEditBtn = document.getElementById('textModeEditBtn');
    if (textModeEditBtn) {
        textModeEditBtn.addEventListener('click', () => {
            if (editModeBtn) editModeBtn.click();
        });
    }

    const textModePlayPauseBtn = document.getElementById('textModePlayPauseBtn');
    if (textModePlayPauseBtn) {
        textModePlayPauseBtn.addEventListener('click', togglePlayPause);
    }

    const textModeRestartBtn = document.getElementById('textModeRestartBtn');
    if (textModeRestartBtn) {
        textModeRestartBtn.addEventListener('click', () => {
            if (restartBtn) restartBtn.click();
        });
    }

    // Enable draggable header for classic chord sheet overlay
    if (typeof makeTextModeOverlayDraggable === 'function') {
        makeTextModeOverlayDraggable();
    }
    // Enable resizable bottom handle for classic chord sheet overlay
    if (typeof makeTextModeOverlayResizable === 'function') {
        makeTextModeOverlayResizable();
    }

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
            if (!timelineHamburgerMenu.contains(e.target) && !timelineHamburgerBtn.contains(e.target)) {
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
            
            // Refresh chord display/highlights on toggle
            if (typeof updateAuditionKeyboardChord === 'function') {
                updateAuditionKeyboardChord(window.lastAuditionChordName || '');
            }
            
            const textModeEditBtn = document.getElementById('textModeEditBtn');
            if (textModeEditBtn) textModeEditBtn.classList.toggle('active', isEditMode);

            // Refresh suggested chords toolbar to show/hide empty blocks
            if (suggestedChords && typeof renderSuggestedChords === 'function') {
                renderSuggestedChords(suggestedChords);
            }

            if (!isEditMode && isSelectionMode) {
                toggleSelectionMode();
            }

            // Immediately re-render text mode to apply/remove pagination
            if (isTextMode && typeof generateTextModeContent === 'function') {
                if (isEditMode && parsedLyrics && parsedLyrics.length > 0) {
                    const currentPlaybackTime = typeof isPlaying !== 'undefined' ? (isPlaying ? (performance.now() - startTime) / 1000 : pauseTime) : 0;
                    const activeIdx = parsedLyrics.findLastIndex(l => l.time <= currentPlaybackTime);
                    if (activeIdx !== -1) {
                        window.textModeEditPage = Math.floor(activeIdx / 4);
                    } else {
                        window.textModeEditPage = 0;
                    }

                    // Taller window to accommodate edit elements comfortably
                    const overlay = document.getElementById('textModeOverlay');
                    if (overlay) {
                        const screenHeight = window.innerHeight;
                        const currentTop = parseFloat(overlay.style.top) || 80;
                        const optimalEditHeight = Math.min(screenHeight - currentTop - 20, 520);
                        const currentHeight = parseFloat(overlay.style.height) || overlay.offsetHeight;
                        if (currentHeight < optimalEditHeight) {
                            overlay.style.height = `${optimalEditHeight}px`;
                        }
                    }
                }
                generateTextModeContent();
            }

            // Reset Copy/Paste state when toggling
            if (!isEditMode) {
                isPasteMode = false;
                if (duplicateBtn) {
                    duplicateBtn.innerHTML = COPY_ICON;
                    duplicateBtn.classList.remove('paste-active');
                    duplicateBtn.title = "Copy Selected Chords";
                }
                // Force re-highlight of current chord on audition keyboard when returning to play mode
                window.lastAuditionChordName = null;
            } else {
                // Clear chord highlights from the audition keyboard in edit mode
                if (typeof clearAuditionKeyboardHighlights === 'function') {
                    clearAuditionKeyboardHighlights();
                }
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
    const toggleKeyboardMenuBtn = document.getElementById('toggleKeyboardMenuBtn');
    if (toggleKeyboardMenuBtn) {
        toggleKeyboardMenuBtn.addEventListener('click', () => {
            const keyboard = document.getElementById('auditionKeyboard');
            const guitarDiagram = document.getElementById('auditionGuitarDiagram');
            if (keyboard) keyboard.classList.toggle('force-hidden');
            if (guitarDiagram) guitarDiagram.classList.toggle('force-hidden');
            // Close the menu
            if (timelineHamburgerMenu) timelineHamburgerMenu.classList.add('hidden');
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

    if (youtubeToggleBtn || youtubeToggleBtnCompact) {
        const toggleYT = (e) => {
            if (e) e.preventDefault();
            if (!youtubePlayerContainer) return;
            const isHidden = youtubePlayerContainer.classList.contains('hidden');
            if (isHidden) {
                youtubePlayerContainer.classList.remove('hidden');
                if (youtubeToggleBtn) youtubeToggleBtn.classList.add('active');
                if (youtubeToggleBtnCompact) youtubeToggleBtnCompact.classList.add('active');
                if (document.getElementById('songMapYouTubeBtn')) document.getElementById('songMapYouTubeBtn').classList.add('active');
                if (youtubePlayer && typeof youtubePlayer.playVideo === 'function') {
                    youtubePlayer.playVideo();
                }
            } else {
                youtubePlayerContainer.classList.add('hidden');
                if (youtubeToggleBtn) youtubeToggleBtn.classList.remove('active');
                if (youtubeToggleBtnCompact) youtubeToggleBtnCompact.classList.remove('active');
                if (document.getElementById('songMapYouTubeBtn')) document.getElementById('songMapYouTubeBtn').classList.remove('active');
                if (youtubePlayer && typeof youtubePlayer.pauseVideo === 'function') {
                    youtubePlayer.pauseVideo();
                }
            }
        };
        window.toggleYouTubePlayer = toggleYT;
        if (youtubeToggleBtn) {
            youtubeToggleBtn.addEventListener('click', toggleYT);
            youtubeToggleBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
        }
        if (youtubeToggleBtnCompact) {
            youtubeToggleBtnCompact.addEventListener('click', toggleYT);
            youtubeToggleBtnCompact.addEventListener('pointerdown', (e) => e.stopPropagation());
        }
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
    if (duplicateBtn) duplicateBtn.addEventListener('click', () => handleDuplicateBtnClick());
    if (deleteSelectedBtn) deleteSelectedBtn.addEventListener('click', deleteSelectedChords);

    // Ctrl Key Listener for Cursor Feedback and Undo
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Control') {
            document.body.classList.add('ctrl-held');
        }

        // Copy shortcut: Ctrl+C or Cmd+C
        if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'c')) {
            if (isEditMode) {
                e.preventDefault();
                performCopy();
            }
        }

        // Paste shortcut: Ctrl+V or Cmd+V
        if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'v')) {
            if (isEditMode) {
                e.preventDefault();
                performPaste();
            }
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
        if ((isSelectionMode || (isEditMode && e.pointerType === 'mouse')) && !e.target.closest('.marker-track-handle')) {
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
            const isParentPortrait = (window.parent && window.parent !== window) 
                ? (window.parent.innerHeight > window.parent.innerWidth) 
                : (window.innerHeight > window.innerWidth);
            
            if (isParentPortrait) {
                document.body.classList.add('is-portrait');
                document.body.classList.remove('is-landscape');
            } else {
                document.body.classList.add('is-landscape');
                document.body.classList.remove('is-portrait');
            }

            if (isEmbed) {
                document.body.classList.add('is-embed');
            } else {
                document.body.classList.remove('is-embed');
            }

            const hasTouch = window.matchMedia("(pointer: coarse)").matches || window.devicePixelRatio > 1.5;
            
            // Mobile Phone / Small Tablet Landscape height inclusion
            const isPhoneLandscape = !isParentPortrait && window.innerHeight <= 768 && hasTouch;
            // Standard mobile/tablet check
            const isMobile = window.innerWidth <= 768 || (isParentPortrait && hasTouch) || isPhoneLandscape;

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
            syncPureTimelineButtons();
            if (typeof initTextModeOverlaySize === 'function') {
                initTextModeOverlaySize();
            }
        };

        // Setup the Pure Timeline Buttons
        window.forceFullMode = false;
        window.forcePureMode = urlParams.get('pure') === 'true';

        window.addEventListener('resize', forceOrientationRefresh);
        window.addEventListener('orientationchange', forceOrientationRefresh);
        forceOrientationRefresh(); // Initial call
        
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
                    if (label) label.innerText = "Lyrics On/Off";
                }
                const audioBtn = document.getElementById('pureMenuAudioBtn');
                if (audioBtn) {
                    const label = audioBtn.querySelector('.label');
                    if (label) label.innerText = "Chord Audio Toggle";
                }
            });

            document.addEventListener('click', (e) => {
                if (!pureMenuMenu.contains(e.target) && !pureMenuBtn.contains(e.target)) {
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

            document.getElementById('pureMenuKeyboardBtn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                const keyboard = document.getElementById('auditionKeyboard');
                const guitarDiagram = document.getElementById('auditionGuitarDiagram');
                if (keyboard) keyboard.classList.toggle('force-hidden');
                if (guitarDiagram) guitarDiagram.classList.toggle('force-hidden');
                pureMenuMenu.classList.add('hidden');
            });
        }

        // --- Zoom In Cycle Button (120 -> 140 -> 160 -> 100%) ---
        document.getElementById('pureMenuZoomInBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const levels = [100, 120, 140, 160];
            let currentLevel = Math.round(PIXELS_PER_SECOND);
            let nextIndex = (levels.indexOf(currentLevel) + 1) % levels.length;
            if (nextIndex === -1) nextIndex = 1; // Start at 120 if current is non-standard
            
            PIXELS_PER_SECOND = levels[nextIndex];
            
            // Sync all zoom displays
            document.querySelectorAll('#pureZoomInDisplay, #pureZoomOutDisplay').forEach(el => el.innerText = `${levels[nextIndex]}%`);
            if (typeof renderStaticElements === 'function') renderStaticElements();
            if (typeof syncScrollToAudio === 'function') syncScrollToAudio();
        });

        // --- Zoom Out Cycle Button (80 -> 60 -> 40 -> 100%) ---
        document.getElementById('pureMenuZoomOutBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const levels = [100, 80, 60, 40];
            let currentLevel = Math.round(PIXELS_PER_SECOND);
            let nextIndex = (levels.indexOf(currentLevel) + 1) % levels.length;
            if (nextIndex === -1) nextIndex = 1; // Start at 80 if current is non-standard
            
            PIXELS_PER_SECOND = levels[nextIndex];
            
            // Sync all zoom displays
            document.querySelectorAll('#pureZoomInDisplay, #pureZoomOutDisplay').forEach(el => el.innerText = `${levels[nextIndex]}%`);
            if (typeof renderStaticElements === 'function') renderStaticElements();
            if (typeof syncScrollToAudio === 'function') syncScrollToAudio();
        });

        // --- New Direct Toolbar Buttons (Restart, Lyrics, Speed) ---
        document.getElementById('pureRestartBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof restart === 'function') restart();
        });

        document.getElementById('pureMenuSpeedBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof cycleSpeed === 'function') cycleSpeed();
        });

        document.getElementById('fullscreenToggleBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable full-screen mode: ${err.message}`);
                });
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        });

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

    // --- Audition Keyboard Logic ---
    const auditionKeys = document.querySelectorAll('.audition-keyboard .key');
    auditionKeys.forEach(key => {
        key.addEventListener('pointerdown', async (e) => {
            e.stopPropagation();
            const note = parseInt(key.dataset.note);
            
            // Visual Feedback
            key.classList.add('active');
            
            // Audio Feedback
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }
            if (!pianoPlayer) {
                if (typeof PianoAudioPlayer !== 'undefined') {
                    pianoPlayer = new PianoAudioPlayer(audioCtx);
                    await pianoPlayer.initialize();
                } else {
                    console.error('PianoAudioPlayer not found');
                }
            }
            
            if (pianoPlayer) {
                // Play a single note for auditioning
                pianoPlayer.playNote(note, 1.0, 0.6);
            }
        });

        const stopKey = () => key.classList.remove('active');
        key.addEventListener('pointerup', stopKey);
        key.addEventListener('pointerleave', stopKey);
        key.addEventListener('pointercancel', stopKey);
    });

    setupResponsiveView();

    // Initialize BandSync
    window.bandSyncInstance = new BandSync();
});

// Space bar recording or toggle play/pause (Global listener)
document.addEventListener("keydown", handleGlobalKeyDown);

function handleGlobalKeyDown(e) {
    // Ignore if typing in an input field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === "Escape") {
        const songMapOverlay = document.getElementById('songMapOverlay');
        const isSongMapOpen = songMapOverlay && !songMapOverlay.classList.contains('hidden');
        const isCurrentlyEditingInline = document.querySelector('.inline-chord-edit-input') !== null;

        if (!isSongMapOpen && !isCurrentlyEditingInline) {
            e.preventDefault();
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'closeScrollingChordsModal' }, '*');
            }
            return;
        }
    }

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
            let chosenConcertPitch = null;
            const allAvailableChords = [];

            if (suggestedChords && suggestedChords.length > 0) {
                const isGrouped = typeof suggestedChords[0] === 'object' && suggestedChords[0].chords;
                if (isGrouped) {
                    suggestedChords.forEach(group => allAvailableChords.push(...group.chords));
                } else {
                    allAvailableChords.push(...suggestedChords);
                }
            }

            // Create unique list of all available chords
            const uniqueChords = [...new Set(allAvailableChords)];

            // Map each available chord to its capo-relative display name
            const mappings = uniqueChords.map(c => {
                return {
                    original: c,
                    display: simplifyDisplayName(c) // Capo-relative display name
                };
            });

            // Find matches where display name starts with key (e.g. key E matches E, Em, etc.)
            const matches = mappings.filter(m => m.display.toUpperCase().startsWith(key));

            if (matches.length === 1) {
                // If only one matching chord exists, use it!
                chosenConcertPitch = matches[0].original;
            } else if (matches.length > 1) {
                // If multiple exist (e.g. E and Em), prefer the exact match if it exists
                const exactMatch = matches.find(m => m.display.toUpperCase() === key);
                if (exactMatch) {
                    chosenConcertPitch = exactMatch.original;
                } else {
                    // Otherwise pick the first one from the matched suggested chords
                    chosenConcertPitch = matches[0].original;
                }
            } else {
                // No matches found in suggested chords.
                // Fallback to the typed key itself. Since key is capo-relative,
                // we transpose it back to concert pitch if guitar mode and capo is active.
                if (currentInstrumentMode === 'guitar' && currentCapoValue !== 0 && chordParser) {
                    chosenConcertPitch = chordParser.transpose(key, currentCapoValue);
                } else {
                    chosenConcertPitch = key;
                }
            }

            initAudio();
            triggerChordAudio(chosenConcertPitch, 1.0, true);
            recordChord(chosenConcertPitch);
            return;
        }

        // 2. Handle '#' or 'm' to modify the LAST recorded chord (Quick fix)
        if (e.key === '#' || e.key === 'm' || e.key === 'M') {
            if (chords.length > 0) {
                const lastChord = chords[chords.length - 1];
                // Only modify if it was recorded very recently (e.g. within 2 seconds)
                const now = youtubePlayer ? youtubePlayer.getCurrentTime() : (isPlaying ? (performance.now() - startTime) / 1000 : pauseTime);
                if (Math.abs(now - lastChord.time) < 2.0) {
                    e.preventDefault();

                    // Convert lastChord.name to capo-relative name for modification
                    let relName = lastChord.name;
                    const isCapoActive = currentInstrumentMode === 'guitar' && currentCapoValue !== 0 && chordParser;
                    if (isCapoActive) {
                        relName = chordParser.transpose(relName, -currentCapoValue);
                    }

                    if (e.key === '#') {
                        // Toggle sharp/accidental on the capo-relative name
                        if (relName.includes('#')) {
                            relName = relName.replace('#', '');
                        } else if (relName.includes('b')) {
                            relName = relName.replace('b', '');
                        } else {
                            // Add sharp after the root note
                            relName = relName[0] + '#' + relName.slice(1);
                        }
                    } else if (e.key.toLowerCase() === 'm') {
                        // Toggle minor on the capo-relative name
                        if (relName.includes('m')) {
                            relName = relName.replace('m', '');
                        } else {
                            relName += 'm';
                        }
                    }

                    // Convert back to concert pitch
                    let newConcertName = relName;
                    if (isCapoActive) {
                        newConcertName = chordParser.transpose(relName, currentCapoValue);
                    }

                    lastChord.name = newConcertName;

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
}

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


function cycleSpeed() {
    if (currentSpeed === 1.0) {
        currentSpeed = 0.75;
    } else if (currentSpeed === 0.75) {
        currentSpeed = 0.5;
    } else {
        currentSpeed = 1.0;
    }

    // Update Main Speed Button
    if (speedBtn) {
        const icon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
        speedBtn.innerHTML = `${icon} <span>${currentSpeed}x</span>`;
    }

    // Update Pure Speed Button Display
    const pureSpeedDisplay = document.getElementById('pureMenuSpeedDisplay');
    if (pureSpeedDisplay) {
        pureSpeedDisplay.innerText = `${currentSpeed}x`;
    }

    if (youtubePlayer && typeof youtubePlayer.setPlaybackRate === 'function') {
        youtubePlayer.setPlaybackRate(currentSpeed);
    }
}

/**
 * Synchronizes the visual state of the compact (Pure Timeline) buttons with the global state.
 */
function syncPureTimelineButtons() {
    const pureLyricsBtn = document.getElementById('pureLyricsBtn');
    if (pureLyricsBtn) {
        pureLyricsBtn.classList.toggle('active', lyricsEnabled);
    }
    
    document.querySelectorAll('#pureZoomInDisplay, #pureZoomOutDisplay').forEach(el => {
        el.innerText = `${Math.round(PIXELS_PER_SECOND)}%`;
    });
    
    const audioToggleBtnComp = document.getElementById('audioToggleBtnCompact');
    if (audioToggleBtnComp) {
        const audioIcon = document.getElementById('audioIconCompact');
        if (audioIcon) {
            audioIcon.innerHTML = audioEnabled ? '🔊' : '🔇';
            audioIcon.style.color = 'rgba(255, 255, 255, 0.85)';
        }
        audioToggleBtnComp.classList.toggle('active', audioEnabled);
    }
    
    const pureSpeedDisplay = document.getElementById('pureMenuSpeedDisplay');
    if (pureSpeedDisplay) {
        pureSpeedDisplay.innerText = `${currentSpeed}x`;
    }
}

if (speedBtn) {
    speedBtn.onclick = cycleSpeed;
    // Initialize label
    speedBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> <span>1.0x</span>';
}

function toggleAudio() {
    audioEnabled = !audioEnabled;
    
    // Sync main button
    if (audioToggleBtn) audioToggleBtn.classList.toggle('active', audioEnabled);
    
    // Sync compact button
    if (audioToggleBtnCompact) {
        const audioIcon = document.getElementById('audioIconCompact');
        if (audioIcon) audioIcon.innerText = audioEnabled ? '🔊' : '🔇';
        audioToggleBtnCompact.classList.toggle('active', audioEnabled);
    }

    if (audioEnabled) initAudio();
}

function restart() {
    if (pianoPlayer) pianoPlayer.stopAll();
    if (isCountingIn) stopCountIn();

    // Reset indices so audio triggers again at 0
    lastBeatPlayed = -1;
    lastChordPlayed = -1;

    // Sync YouTube if enabled
    if (youtubePlayer && youtubePlayerContainer && !youtubePlayerContainer.classList.contains('hidden')) {
        youtubePlayer._syncingFromTimeline = true;
        youtubePlayer.seekTo(0, true);
        // Pause and wait for count-in (if playing) or just pause (if stopped)
        youtubePlayer.pauseVideo();
    }

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

/**
 * Updates the bottom-corner chord display:
 * - In GUITAR mode: renders a guitar chord diagram SVG (same as Chord Trainer)
 * - In PIANO/UKULELE mode: highlights keys on the mini keyboard with green
 * Only active in PLAY mode (not edit mode).
 * @param {string} chordName - Raw chord name (e.g. "Dm", "A#", "Gm")
 */
function updateAuditionKeyboardChord(chordName) {
    const keyboard = document.getElementById('auditionKeyboard');
    const guitarDiagram = document.getElementById('auditionGuitarDiagram');

    const isDualInstrumentEnabled = localStorage.getItem('feature-dual-instrument-enabled-global') === 'true';

    // If in edit mode, hide guitar diagram but ALWAYS show keyboard
    if (isEditMode) {
        if (guitarDiagram) {
            guitarDiagram.classList.add('hidden');
            guitarDiagram.innerHTML = '';
        }
        if (keyboard) {
            keyboard.style.display = 'block';
        }
    }

    const showGuitarDiagram = (currentInstrumentMode === 'guitar' || currentInstrumentMode === 'ukulele' || isDualInstrumentEnabled) && !isEditMode;
    const showKeyboard = (currentInstrumentMode === 'piano' || isDualInstrumentEnabled || isEditMode);

    // --- RENDER GUITAR/UKULELE DIAGRAM ---
    if (showGuitarDiagram && guitarDiagram) {
        guitarDiagram.style.display = '';
        if (!chordName || chordName === '') {
            guitarDiagram.classList.add('hidden');
            guitarDiagram.innerHTML = '';
        } else {
            guitarDiagram.classList.remove('hidden');
            const isUkuleleMode = (currentInstrumentMode === 'ukulele');
            const renderer = isUkuleleMode && window.UkuleleRenderer ? new window.UkuleleRenderer() : (window.GuitarRenderer ? new window.GuitarRenderer() : null);
            const db = isUkuleleMode ? window.UkuleleChordDatabase : window.GuitarChordDatabase;

            if (renderer && db) {
                let displayChordName = chordName;
                if (!isUkuleleMode && currentCapoValue !== 0 && chordParser) {
                    displayChordName = chordParser.transpose(displayChordName, -currentCapoValue);
                }

                // Simplify name for DB lookup (strip inversion number: D2 -> D, Dm2 -> Dm)
                const simpleName = displayChordName.split('/').map(part => {
                    const lowPart = part.toLowerCase();
                    if (lowPart.includes('sus') || lowPart.includes('add')) return part;
                    return part.replace(/([23])$/, '');
                }).join('/');

                const fingering = db[displayChordName] || db[simpleName] || db[simpleName.split('/')[0]];

                if (fingering) {
                    const svgHtml = renderer.renderSVG(fingering);
                    const displayName = simpleName.split('/')[0];
                    guitarDiagram.innerHTML = `<div class="agd-chord-name">${displayName}</div>${svgHtml}`;
                } else {
                    guitarDiagram.innerHTML = `<div class="agd-chord-name" style="font-size:1rem;margin-top:20px;">${simpleName}</div>`;
                }
            } else {
                guitarDiagram.innerHTML = '';
            }
        }
    } else if (guitarDiagram && !isEditMode) {
        guitarDiagram.classList.add('hidden');
        guitarDiagram.innerHTML = '';
        guitarDiagram.style.display = 'none';
    }

    // --- RENDER PIANO KEYBOARD HIGHLIGHTS ---
    if (!showKeyboard || !keyboard || !chordParser) {
        if (keyboard && !isEditMode && !showKeyboard) {
            keyboard.style.display = 'none';
        }
        return;
    }

    // Ensure keyboard is visible
    keyboard.style.display = isEditMode ? 'block' : '';

    // Clear all existing highlights
    keyboard.querySelectorAll('.key.chord-highlight').forEach(k => k.classList.remove('chord-highlight'));

    if (!chordName || chordName === '') {
        // No chord: reset the proximity anchor so the next chord starts fresh
        window._lastKeyboardCentroid = null;
        return;
    }

    // Parse the chord to get MIDI notes
    const chord = chordParser.parse(chordName);
    if (!chord || !chord.notes) return;

    // -----------------------------------------------------------------------
    // PROXIMITY-AWARE VOICING
    // Goal: among all valid octave shifts for this chord, pick the one whose
    // resulting voicing centroid (average MIDI note) is closest to the centroid
    // of the PREVIOUS chord that was displayed. This prevents the keyboard from
    // jumping an octave when consecutive chords could be shown in the same range.
    //
    // The bass-note anchoring still preserves inversion order (e.g. G#m3 stays
    // as B-D#-G# rather than collapsing to a root-position voicing).
    // -----------------------------------------------------------------------
    const KEYBOARD_MIN = 48;
    const KEYBOARD_MAX = 71;

    const notes = [...chord.notes];
    const sortedNotes = [...notes].sort((a, b) => a - b);
    const bassNote = sortedNotes[0];

    // Collect ALL valid octave-shifts (those landing the bass in range)
    const candidateVoicings = [];
    for (let octaveShift = -5; octaveShift <= 5; octaveShift++) {
        const shift = octaveShift * 12;
        const shiftedBass = bassNote + shift;
        if (shiftedBass >= KEYBOARD_MIN && shiftedBass <= KEYBOARD_MAX) {
            // Apply this shift to all notes, then clamp out-of-range notes by
            // pitch-class-mapping (preserves inversion order for in-range notes)
            const transposed = notes.map(n => {
                let v = n + shift;
                while (v > KEYBOARD_MAX) v -= 12;
                while (v < KEYBOARD_MIN) v += 12;
                return v;
            });
            const centroid = transposed.reduce((s, v) => s + v, 0) / transposed.length;
            candidateVoicings.push({ transposed, centroid });
        }
    }

    let bestTransposedNotes = null;

    if (candidateVoicings.length > 0) {
        if (window._lastKeyboardCentroid != null) {
            // Pick the voicing whose centroid is NEAREST to the previous chord's centroid
            candidateVoicings.sort((a, b) =>
                Math.abs(a.centroid - window._lastKeyboardCentroid) -
                Math.abs(b.centroid - window._lastKeyboardCentroid)
            );
        }
        // Default (no previous chord): first candidate = lowest valid shift (natural position)
        bestTransposedNotes = candidateVoicings[0].transposed;
        // Update the proximity anchor for next chord
        window._lastKeyboardCentroid = candidateVoicings[0].centroid;
    } else {
        // Ultimate fallback: transpose notes individually to fit within range
        bestTransposedNotes = notes.map(n => {
            let v = n;
            while (v < KEYBOARD_MIN) v += 12;
            while (v > KEYBOARD_MAX) v -= 12;
            return v;
        });
        const centroid = bestTransposedNotes.reduce((s, v) => s + v, 0) / bestTransposedNotes.length;
        window._lastKeyboardCentroid = centroid;
    }

    // Highlight matching keys on the mini keyboard
    const highlightNotes = new Set(bestTransposedNotes);
    keyboard.querySelectorAll('.key[data-note]').forEach(key => {
        const midiNote = parseInt(key.dataset.note);
        if (highlightNotes.has(midiNote)) {
            key.classList.add('chord-highlight');
        }
    });
}

/**
 * Clears all chord highlights / guitar diagrams from the audition display
 * (e.g. when entering edit mode).
 */
function clearAuditionKeyboardHighlights() {
    const keyboard = document.getElementById('auditionKeyboard');
    const isDualInstrumentEnabled = localStorage.getItem('feature-dual-instrument-enabled-global') === 'true';
    if (keyboard) {
        keyboard.querySelectorAll('.key.chord-highlight').forEach(k => k.classList.remove('chord-highlight'));
        if (!isDualInstrumentEnabled) {
            keyboard.style.display = '';
        }
    }
    const guitarDiagram = document.getElementById('auditionGuitarDiagram');
    if (guitarDiagram) {
        if (!isDualInstrumentEnabled) {
            guitarDiagram.style.display = 'none';
        }
        guitarDiagram.innerHTML = '';
    }
    // Reset proximity anchor so the next song/session starts fresh
    window._lastKeyboardCentroid = null;
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
    if (!isEditMode) return; // Only allow editing in Edit Mode
    if (dragHasMoved) return; // Don't trigger edit if we were dragging

    if (e.target.classList.contains('chord-item')) {
        e.stopPropagation(); // prevent other clicks

        // Auto-pause to allow editing
        if (isPlaying) pause();

        const index = parseInt(e.target.dataset.index);
        const realName = chords[index].name;

        // Capo-aware display name for editing
        let displayChordName = realName;
        if (currentInstrumentMode === 'guitar' && currentCapoValue !== 0 && chordParser) {
            displayChordName = chordParser.transpose(realName, -currentCapoValue);
        }

        // Custom Professional Modal with Delete Option
        chordEditModal.show(displayChordName, (result) => {
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

            let newRealName = result;
            // Transpose back to real concert pitch if Capo is active
            if (currentInstrumentMode === 'guitar' && currentCapoValue !== 0 && chordParser) {
                newRealName = chordParser.transpose(result, currentCapoValue);
            }

            if (newRealName && newRealName !== realName) {
                saveUndoState();
                chords[index].name = newRealName;
                renderStaticElements();
                updateLoop();
                checkForChanges();

                // If we also want to update the sticky display if it's the current chord
                const playbackTime = isPlaying ? (performance.now() - startTime) / 1000 : pauseTime;
                const activeIndex = chords.findLastIndex(c => c.time <= playbackTime);
                if (activeIndex === index) {
                    currentChordDisplay.innerText = simplifyDisplayName(newRealName);
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

    // 1b. Lyric Marker Drag
    if (isDraggingLyricMarker) {
        e.preventDefault();
        const deltaX = e.clientX - dragLyricMarkerPointerStartX;
        const deltaTime = deltaX / PIXELS_PER_SECOND;

        if (window.lyricInitialTimes) {
            const timeShift = deltaTime;
            
            // Update all lyrics by the shift relative to their start-of-drag positions
            parsedLyrics.forEach((l, i) => {
                l.time = Math.max(0, window.lyricInitialTimes[i] + timeShift);
            });

            // Update the global offset tracker (integer-ish for storage)
            currentLyricOffset = window.initialLyricOffsetAtDragStart + timeShift;
        }

        // We need to update markers too because the "First Lyric" marker is in the markers array
        markers.forEach(m => {
            if (m.type === 'lyrics-sync') {
                m.time = parsedLyrics[0].time;
            }
        });

        renderStaticElements();
        updateLoop();
        return;
    }

    // 1c. Note Marker Drag
    if (isDraggingNoteMarker) {
        e.preventDefault();
        const deltaX = e.clientX - dragNoteMarkerPointerStartX;
        const deltaTime = deltaX / PIXELS_PER_SECOND;
        const newTime = Math.max(0, dragNoteMarkerStartTime + deltaTime);

        // Update this note's time in memory
        const note = timelineNotes.find(n => n.id === dragNoteMarkerId);
        if (note) {
            note.time = parseFloat(newTime.toFixed(2));
        }

        // Update markers list
        markers.forEach(m => {
            if (m.type === 'note-marker' && m.id === dragNoteMarkerId) {
                m.time = newTime;
            }
        });

        renderStaticElements();
        updateLoop();
        return;
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

    // Reset Lyric Marker Drag
    if (isDraggingLyricMarker) {
        isDraggingLyricMarker = false;
        // Notify parent to update the input field
        window.parent.postMessage({
            type: 'updateLyricSync',
            offset: Math.round(currentLyricOffset)
        }, '*');
        checkForChanges();
        renderStaticElements();
        return;
    }

    // Reset Note Marker Drag
    if (isDraggingNoteMarker) {
        isDraggingNoteMarker = false;
        const deltaX = Math.abs(e.clientX - dragNoteMarkerPointerStartX);
        if (deltaX < 4) {
            if (typeof window.showNotesOverlay === 'function') {
                window.showNotesOverlay(dragNoteMarkerId);
            }
        } else {
            saveTimelineNotesToParent();
            checkForChanges();
        }
        dragNoteMarkerId = null;
        renderStaticElements();
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
            // Use the left edge of the ghost box for calculating drop time, aligning with the yellow arrow
            const ghostLeftX = e.clientX - (dragGhost ? dragGhost.offsetWidth / 2 : 0);
            const x = ghostLeftX - timelineRect.left;
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

        const isMarker = (item) => item === '|' || /^\d+x$/.test(item) || /^\[.*\]$/.test(item);

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
            if (/^\[.*\]$/.test(label)) {
                span.textContent = label.substring(1, label.length - 1);
                span.style.fontSize = '0.85rem';
                span.style.color = '#475569';
                span.style.fontWeight = '600';
                span.style.textTransform = 'uppercase';
                span.style.fontFamily = 'inherit';
                span.style.margin = '0 6px';
            } else {
                span.textContent = label;
            }
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
            // Use the groups in the order received from the parent, keeping empty ones
            groups.forEach((group, groupIdx) => {
                if (!group) return;
                const isGroupEmpty = !group.chords || group.chords.length === 0;

                const groupContainer = document.createElement('div');
                groupContainer.className = 'chord-toolbar-group';
                if (isGroupEmpty) {
                    groupContainer.classList.add('empty-group');
                }

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
                    const proceedWithEditing = () => {
                        buttonsRow.innerHTML = '';
                        buttonsRow.classList.add('editing');
                        actions.innerHTML = '';

                        const input = document.createElement('input');
                        input.type = 'text';
                        input.className = 'chord-block-edit-input';
                        
                        const originalText = group.chords ? group.chords.join(' ') : '';
                        let displayText = originalText;
                        if (currentInstrumentMode === 'guitar' && currentCapoValue !== 0) {
                            displayText = transposeBlockText(originalText, -currentCapoValue);
                        }
                        input.value = displayText;
                        input.placeholder = 'Type chords...';

                        const finishEdit = (save) => {
                            if (save) {
                                let newText = input.value;
                                if (currentInstrumentMode === 'guitar' && currentCapoValue !== 0) {
                                    newText = transposeBlockText(newText, currentCapoValue);
                                }
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

                    // Check if there are unsaved timeline changes first
                    if (typeof checkIfHasChanges === 'function' && checkIfHasChanges()) {
                        if (window.confirmationModal) {
                            window.confirmationModal.show(
                                'Save Changes',
                                'Save Chord Changes on Timeline first?',
                                () => {
                                    saveToDatabase();
                                    proceedWithEditing();
                                },
                                () => {
                                    proceedWithEditing();
                                },
                                'YES',
                                'NO',
                                'primary'
                            );
                            return;
                        } else {
                            const confirmSave = confirm("Save Chord Changes on Timeline first?");
                            if (confirmSave) {
                                saveToDatabase();
                            }
                        }
                    }

                    proceedWithEditing();
                };

                actions.appendChild(makeHeaderActionBtn(editIcon, 'Edit Block Chords', 'edit-btn edit-only', startEditing));

                header.appendChild(actions);
                groupContainer.appendChild(header);

                if (group.chords) {
                    group.chords.forEach(item => {
                        if (item) {
                            buttonsRow.appendChild(isMarker(item) ? makeMarkerEl(item) : makeChordBtn(item, group.type));
                        }
                    });
                }
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
        qBtn.className = 'chord-suggestion-btn q-chord-btn edit-only';
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
    if (inputInstrumentMode) {
        currentInstrumentMode = inputInstrumentMode;
        syncInstrumentModeClass();
    }
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
    const headerThumb = document.getElementById('songThumbnailDisplay');

    if (artistDisplay) artistDisplay.textContent = artist || '';
    if (songTitleDisplay) songTitleDisplay.textContent = songTitle || '';

    // Attempt to fetch thumbnail from parent (consistent with Song Map behavior)
    if (headerThumb) {
        if (typeof window.parent !== 'undefined' && window.parent.document.getElementById('songDetailThumbnail')) {
            const parentThumb = window.parent.document.getElementById('songDetailThumbnail');
            // Only use if it has a real source and isn't hidden
            if (parentThumb && parentThumb.src && !parentThumb.classList.contains('hidden') && !parentThumb.src.includes('placeholder')) {
                headerThumb.src = parentThumb.src;
                headerThumb.classList.remove('hidden');
            } else {
                headerThumb.classList.add('hidden');
            }
        } else {
            headerThumb.classList.add('hidden');
        }
    }

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
        if (youtubeToggleBtnCompact) {
            youtubeToggleBtnCompact.classList.remove('hidden');
            youtubeToggleBtnCompact.classList.add('active');
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
        if (youtubeToggleBtnCompact) youtubeToggleBtnCompact.classList.add('hidden');
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
            if (c.lyricLineIdx !== undefined) chord.lyricLineIdx = c.lyricLineIdx;
            if (c.lyricWordIdx !== undefined) chord.lyricWordIdx = c.lyricWordIdx;
            if (c.isUserEdited !== undefined) chord.isUserEdited = c.isUserEdited;
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
    const pureLyricsBtn = document.getElementById('pureLyricsBtn');
    if (lyricsEnabled) {
        lyricsHUD.classList.remove('hidden');
        if (toggleLyricsBtn) toggleLyricsBtn.classList.add('active');
        if (pureLyricsBtn) pureLyricsBtn.classList.add('active');
    } else {
        hideLyricsHUD();
    }
}

function toggleTextMode() {
    isTextMode = !isTextMode;
    const btn = document.getElementById('textModeBtn');
    if (isTextMode) {
        document.body.classList.add('text-mode-active');
        if (btn) btn.classList.add('active');
        if (textModeOverlay) {
            textModeOverlay.classList.remove('hidden');
            initTextModeOverlaySize();
        }
        
        // Auto-jump to the page containing the current lyrics
        if (parsedLyrics && parsedLyrics.length > 0) {
            const currentPlaybackTime = typeof isPlaying !== 'undefined' ? (isPlaying ? (performance.now() - startTime) / 1000 : pauseTime) : 0;
            const activeIdx = parsedLyrics.findLastIndex(l => l.time <= currentPlaybackTime);
            if (activeIdx !== -1) {
                window.textModeEditPage = Math.floor(activeIdx / 4);
            } else {
                window.textModeEditPage = 0;
            }
        }
        
        generateTextModeContent();
    } else {
        document.body.classList.remove('text-mode-active');
        if (btn) btn.classList.remove('active');
        if (textModeOverlay) textModeOverlay.classList.add('hidden');
    }
}

// Clears all lyrics links from chords without deleting the chords themselves
function clearAllLyricLinks() {
    if (!chords || chords.length === 0) return;
    
    if (window.confirmationModal) {
        window.confirmationModal.show(
            'Unlink All Chords',
            'Are you sure you want to remove all lyric linking? The chord timings will be preserved.',
            () => {
                saveUndoState();
                chords.forEach(c => {
                    delete c.lyricLineIdx;
                    delete c.lyricWordIdx;
                    delete c.isUserEdited;
                });
                
                generateTextModeContent();
                setSaveStatus(false);
                checkForChanges();
                if (typeof showNotification === 'function') showNotification("All text links cleared!");
            },
            null,
            'Unlink Chords',
            'Cancel',
            'danger'
        );
    } else {
        if (confirm("Are you sure you want to remove all lyric linking? The chord timings will be preserved.")) {
            saveUndoState();
            chords.forEach(c => {
                delete c.lyricLineIdx;
                delete c.lyricWordIdx;
                delete c.isUserEdited;
            });
            
            generateTextModeContent();
            setSaveStatus(false);
            checkForChanges();
            if (typeof showNotification === 'function') showNotification("All text links cleared!");
        }
    }
}

// Initialize the size and position of the text mode overlay to be optimal for the current viewport
function initTextModeOverlaySize() {
    const overlay = document.getElementById('textModeOverlay');
    if (!overlay || overlay.classList.contains('hidden')) return;

    const screenHeight = window.innerHeight;
    const isSmallScreen = screenHeight < 600;
    const isMobileView = document.body.classList.contains('is-mobile-view');
    const isMobilePortrait = document.body.classList.contains('is-portrait') && isMobileView;

    // Reset styles on mobile to prevent landscape values persisting in portrait and vice versa
    if (isMobileView) {
        overlay.style.top = "";
        overlay.style.left = "";
        overlay.style.width = "";
        overlay.style.height = "";
    }

    const defaultTop = isMobilePortrait ? 10 : (isSmallScreen ? 50 : 80);
    const bottomBuffer = isMobilePortrait ? 150 : (isSmallScreen ? 140 : 300); // Leave space for scrolling timeline at the bottom

    if (!overlay.style.top || overlay.style.top === "") {
        overlay.style.top = `${defaultTop}px`;
    }
    if (!overlay.style.left || overlay.style.left === "") {
        overlay.style.left = "50%";
    }
    if (!overlay.style.width || overlay.style.width === "") {
        overlay.style.width = isMobilePortrait ? "96vw" : "90vw";
    }
    if (!overlay.style.height || overlay.style.height === "") {
        const currentTop = parseFloat(overlay.style.top) || defaultTop;
        let optimalHeight = Math.max(120, screenHeight - currentTop - bottomBuffer);
        if (isEditMode) {
            // Edit Mode has more content (badges + pagination controls) -> make it taller by default
            const editMaxHeight = screenHeight - currentTop - bottomBuffer;
            optimalHeight = Math.min(editMaxHeight, 520);
        }
        overlay.style.height = `${optimalHeight}px`;
    }

    // Always ensure the bottom of the window is on screen and doesn't get pushed off
    const currentTop = parseFloat(overlay.style.top) || defaultTop;
    const currentHeight = parseFloat(overlay.style.height) || 200;
    const maxHeight = screenHeight - currentTop - (isMobilePortrait ? bottomBuffer : 20); // Respect bottomBuffer on mobile portrait
    
    if (currentHeight > maxHeight) {
        overlay.style.height = `${Math.max(120, maxHeight)}px`;
    }

    // Adjust left position to keep window completely on-screen horizontally during screen resize
    const currentLeft = overlay.style.left;
    if (currentLeft && currentLeft !== "50%") {
        const leftVal = parseFloat(currentLeft);
        const overlayWidth = overlay.offsetWidth;
        const minLeft = overlayWidth / 2 + 10;
        const maxLeft = window.innerWidth - (overlayWidth / 2) - 10;
        let newLeft = leftVal;
        if (newLeft < minLeft) newLeft = minLeft;
        if (newLeft > maxLeft) newLeft = maxLeft;
        overlay.style.left = `${newLeft}px`;
    }
}

// Make the text mode overlay draggable vertically and horizontally from the header
function makeTextModeOverlayDraggable() {
    const overlay = document.getElementById('textModeOverlay');
    const header = overlay ? overlay.querySelector('.text-mode-header') : null;
    if (!overlay || !header) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startTop = 0;
    let startLeft = 0;

    header.style.cursor = 'grab';

    const onPointerDown = (e) => {
        // Only drag with left mouse click or touch
        if (e.button !== 0 && e.type !== 'touchstart') return;
        
        // Don't drag if clicking buttons inside header
        if (e.target.closest('.text-mode-header-buttons') || e.target.closest('.text-mode-header-btn')) {
            return;
        }

        isDragging = true;
        header.style.cursor = 'grabbing';

        const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
        startX = clientX;
        startY = clientY;
        
        // Parse current top position (or fall back to current offsetTop)
        const currentTop = window.getComputedStyle(overlay).top;
        startTop = parseFloat(currentTop) || overlay.offsetTop;

        // Parse current left position (or fall back to current centered offset)
        const currentLeft = window.getComputedStyle(overlay).left;
        startLeft = parseFloat(currentLeft) || (window.innerWidth / 2);

        // Prevent default touch gestures / text selections while dragging header
        e.preventDefault();
    };

    const onPointerMove = (e) => {
        if (!isDragging) return;

        const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
        
        const deltaX = clientX - startX;
        const deltaY = clientY - startY;
        
        let newTop = startTop + deltaY;
        let newLeft = startLeft + deltaX;

        // Constraint boundaries - ensure the header stays accessible and the bottom stays on screen
        const overlayHeight = overlay.offsetHeight;
        if (newTop < 10) newTop = 10;
        if (newTop + overlayHeight > window.innerHeight - 20) {
            newTop = window.innerHeight - overlayHeight - 20;
        }
        if (newTop < 10) newTop = 10; // safety double-cap

        // Constraint boundaries - ensure the window stays completely on screen horizontally
        const overlayWidth = overlay.offsetWidth;
        const minLeft = overlayWidth / 2 + 10;
        const maxLeft = window.innerWidth - (overlayWidth / 2) - 10;
        if (newLeft < minLeft) newLeft = minLeft;
        if (newLeft > maxLeft) newLeft = maxLeft;

        overlay.style.top = `${newTop}px`;
        overlay.style.left = `${newLeft}px`;
    };

    const onPointerUp = () => {
        if (!isDragging) return;
        isDragging = false;
        header.style.cursor = 'grab';
    };

    header.addEventListener('mousedown', onPointerDown);
    header.addEventListener('touchstart', onPointerDown, { passive: false });

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('touchmove', onPointerMove, { passive: false });

    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchend', onPointerUp);
}

// Make the text mode overlay resizable by dragging its handles (top, bottom, left, right)
function makeTextModeOverlayResizable() {
    const overlay = document.getElementById('textModeOverlay');
    if (!overlay) return;

    const handles = {
        top: overlay.querySelector('.text-mode-resize-handle.top'),
        bottom: overlay.querySelector('.text-mode-resize-handle.bottom'),
        left: overlay.querySelector('.text-mode-resize-handle.left'),
        right: overlay.querySelector('.text-mode-resize-handle.right')
    };

    let activeHandle = null;
    let startY = 0;
    let startTop = 0;
    let startHeight = 0;

    const onPointerDown = (e, direction) => {
        if (e.button !== 0 && e.type !== 'touchstart') return;
        
        activeHandle = direction;
        const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
        
        startY = clientY;
        
        const currentTop = window.getComputedStyle(overlay).top;
        startTop = parseFloat(currentTop) || overlay.offsetTop;
        
        const currentHeight = window.getComputedStyle(overlay).height;
        startHeight = parseFloat(currentHeight) || overlay.offsetHeight;

        e.preventDefault();
    };

    const onPointerMove = (e) => {
        if (!activeHandle) return;

        const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
        const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;

        if (activeHandle === 'bottom') {
            const deltaY = clientY - startY;
            let newHeight = startHeight + deltaY;

            // Set min and max limits
            const minHeight = 120;
            const maxHeight = window.innerHeight - overlay.offsetTop - 20; // Leave 20px space at bottom
            
            if (newHeight < minHeight) newHeight = minHeight;
            if (newHeight > maxHeight) newHeight = maxHeight;

            overlay.style.height = `${newHeight}px`;
        } else if (activeHandle === 'top') {
            const deltaY = clientY - startY;
            let newTop = startTop + deltaY;
            const startBottom = startTop + startHeight;
            let newHeight = startHeight - deltaY;

            const minHeight = 120;
            if (newHeight < minHeight) {
                newHeight = minHeight;
                newTop = startBottom - minHeight;
            }
            if (newTop < 10) {
                newTop = 10;
                newHeight = startBottom - 10;
            }

            overlay.style.top = `${newTop}px`;
            overlay.style.height = `${newHeight}px`;
        } else if (activeHandle === 'left' || activeHandle === 'right') {
            const currentCenterX = window.innerWidth / 2;
            const distanceFromCenter = Math.abs(clientX - currentCenterX);
            let newWidth = distanceFromCenter * 2;

            const minWidth = 200;
            const maxWidth = window.innerWidth - 20;
            if (newWidth < minWidth) newWidth = minWidth;
            if (newWidth > maxWidth) newWidth = maxWidth;

            overlay.style.width = `${newWidth}px`;
        }
    };

    const onPointerUp = () => {
        activeHandle = null;
    };

    // Attach listeners to each handle
    Object.keys(handles).forEach(dir => {
        const handle = handles[dir];
        if (handle) {
            handle.addEventListener('mousedown', (e) => onPointerDown(e, dir));
            handle.addEventListener('touchstart', (e) => onPointerDown(e, dir), { passive: false });
        }
    });

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('touchmove', onPointerMove, { passive: false });

    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchend', onPointerUp);
}

window.textModeEditPage = 0;
window.nextTextPage = function() {
    if (!parsedLyrics) return;
    const maxPage = Math.ceil(parsedLyrics.length / 4) - 1;
    if (window.textModeEditPage < maxPage) {
        window.textModeEditPage++;
        generateTextModeContent();
    }
};
window.prevTextPage = function() {
    if (window.textModeEditPage > 0) {
        window.textModeEditPage--;
        generateTextModeContent();
    }
};

// Generate the new text-based view for lyrics with chords integrated
function generateTextModeContent() {
    const textModeContent = document.getElementById('textModeContent');
    if (!textModeContent) return;
    
    const makeChordBadge = (c, idx) => {
        const isManuallyPlaced = c.isUserEdited === true || (c.lyricLineIdx !== undefined && c.lyricWordIdx !== undefined);
        const placedClass = isManuallyPlaced ? ' manually-placed' : '';
        // Use a stable key: time (ms) + name — survives array re-sorting
        const stableKey = `${Math.round(c.time * 1000)}_${c.name}`;
        // data-chord-idx for drag-and-drop, data-chord-key for click-to-link
        const draggableAttr = isEditMode ? 'draggable="true"' : '';
        const chordIdxAttr = idx !== undefined ? `data-chord-idx="${idx}"` : '';
        return `<span class="draggable-chord${placedClass}" ${draggableAttr} ${chordIdxAttr} data-chord-key="${stableKey}">${simplifyDisplayName(c.name)}</span>`;
    };
    
    textModeContent.innerHTML = '';
    
    if (!parsedLyrics || parsedLyrics.length === 0) {
        let html = '<div class="text-mode-lyric-row">No lyrics available. Chords:</div>';
        html += '<div class="text-mode-chord-row">';
        chords.forEach(c => {
            html += simplifyDisplayName(c.name) + '  ';
        });
        html += '</div>';
        textModeContent.innerHTML = html;
        return;
    }

    let html = '';
    let currentMarkerIdx = 0;
    
    const sortedMarkers = [...markers].sort((a, b) => a.time - b.time);
    
    const currentPlaybackTime = typeof isPlaying !== 'undefined' ? (isPlaying ? (performance.now() - startTime) / 1000 : pauseTime) : 0;
    
    // Default to 0 so the first lyric line is visible before the song starts
    let activeIdx = parsedLyrics ? parsedLyrics.findLastIndex(l => l.time <= currentPlaybackTime) : -1;
    if (activeIdx === -1 && parsedLyrics && parsedLyrics.length > 0) activeIdx = 0;

    for (let i = 0; i < parsedLyrics.length; i++) {
        const lyric = parsedLyrics[i];
        const nextLyricTime = i < parsedLyrics.length - 1 ? parsedLyrics[i+1].time : lyric.time + 6;
        
        // Marker logic has been removed so time info is not shown in the text box
        while (currentMarkerIdx < sortedMarkers.length && sortedMarkers[currentMarkerIdx].time <= lyric.time + 0.1) {
            currentMarkerIdx++;
        }
        
        // Time-based chords (not manually linked anywhere)
        const startTimeWindow = i === 0 ? 0 : lyric.time - 0.5;
        const timeChords = chords.filter(c => c.lyricLineIdx === undefined && c.time >= startTimeWindow && c.time < nextLyricTime - 0.5);
        // Chords manually linked specifically to this line
        const linkedChords = chords.filter(c => c.lyricLineIdx === i);
        
        let words = lyric.text.trim().split(/\s+/).filter(w => w.length > 0);
        if (words.length === 0) words = [''];

        // 1. Establish timestamps for each word
        let wordItems = words.map((w, idx) => ({
            type: 'word',
            word: w,
            wordIdx: idx,
            linkedChords: [],
            time: -1
        }));

        linkedChords.forEach(c => {
            if (c.lyricWordIdx !== undefined && c.lyricWordIdx >= 0 && c.lyricWordIdx < words.length) {
                wordItems[c.lyricWordIdx].linkedChords.push(c);
            } else {
                wordItems[0].linkedChords.push(c); // Fallback
            }
        });

        let hasExplicit = false;
        wordItems.forEach(wi => {
            wi.linkedChords.sort((a, b) => a.time - b.time);
            if (wi.linkedChords.length > 0) {
                wi.time = wi.linkedChords[0].time;
                hasExplicit = true;
            }
        });

        const duration = nextLyricTime - lyric.time;
        const vocalDuration = Math.max(1.0, duration * 0.5);

        if (!hasExplicit) {
            wordItems.forEach((wi, idx) => {
                wi.time = lyric.time + (idx / wordItems.length) * vocalDuration;
            });
        } else {
            // Interpolate missing times
            let lastTime = lyric.time;
            for (let j = 0; j < wordItems.length; j++) {
                if (wordItems[j].time !== -1) {
                    lastTime = wordItems[j].time;
                } else {
                    let nextTime = lyric.time + vocalDuration;
                    let nextIdx = -1;
                    for (let k = j + 1; k < wordItems.length; k++) {
                        if (wordItems[k].time !== -1) {
                            nextTime = wordItems[k].time;
                            nextIdx = k;
                            break;
                        }
                    }
                    let steps = nextIdx !== -1 ? (nextIdx - j + 1) : 2;
                    lastTime = lastTime + (nextTime - lastTime) / steps;
                    wordItems[j].time = lastTime;
                }
            }
            
            // Enforce monotonicity
            let maxTime = -Infinity;
            for (let j = 0; j < wordItems.length; j++) {
                if (wordItems[j].time < maxTime) {
                    wordItems[j].time = maxTime + 0.001;
                }
                maxTime = wordItems[j].time;
            }
        }

        // 2. Prepare unlinked chords
        let unlinkedItems = timeChords.map(c => ({
            type: 'unlinked',
            chord: c,
            time: c.time
        }));

        // 3. Merge and sort
        let allItems = [...wordItems, ...unlinkedItems];
        allItems.sort((a, b) => {
            if (Math.abs(a.time - b.time) < 0.0001) {
                if (a.type === 'unlinked' && b.type === 'word') return -1;
                if (b.type === 'unlinked' && a.type === 'word') return 1;
                return 0;
            }
            return a.time - b.time;
        });

        // 4. Render
        let blockClass = 'text-lyric-block';
        if (isEditMode) {
            const startIdx = window.textModeEditPage * 4;
            const endIdx = startIdx + 3;
            if (i >= startIdx && i <= endIdx) {
                blockClass += ' active edit-static';
            } else {
                blockClass += ' passed';
            }
        } else {
            if (i === activeIdx) blockClass += ' active';
            else if (i === activeIdx + 1) blockClass += ' upcoming';
            else if (i < activeIdx) blockClass += ' passed';
        }

        const isDottedOrEmpty = (item) => {
            if (item.type === 'unlinked') return true;
            if (item.type === 'word') {
                const text = (item.word || '').trim();
                return text === '' || text === '...' || text === '..' || text === '.';
            }
            return false;
        };

        // Identify the runs of dotted/empty items
        const runs = [];
        let currentRunStart = -1;
        for (let idx = 0; idx < allItems.length; idx++) {
            if (isDottedOrEmpty(allItems[idx])) {
                if (currentRunStart === -1) {
                    currentRunStart = idx;
                }
            } else {
                if (currentRunStart !== -1) {
                    runs.push({ start: currentRunStart, end: idx - 1, length: idx - currentRunStart });
                    currentRunStart = -1;
                }
            }
        }
        if (currentRunStart !== -1) {
            runs.push({ start: currentRunStart, end: allItems.length - 1, length: allItems.length - currentRunStart });
        }

        // Filter runs to only those with length >= 3
        const splitRuns = runs.filter(r => r.length >= 3);

        // Build rows by splitting at the start and end of these runs
        const rows = [];
        let lastIdx = 0;
        splitRuns.forEach(run => {
            if (run.start > lastIdx) {
                rows.push({
                    type: 'normal',
                    items: allItems.slice(lastIdx, run.start)
                });
            }
            rows.push({
                type: 'instrumental',
                items: allItems.slice(run.start, run.end + 1)
            });
            lastIdx = run.end + 1;
        });
        if (lastIdx < allItems.length) {
            rows.push({
                type: 'normal',
                items: allItems.slice(lastIdx)
            });
        }
        if (rows.length === 0 && allItems.length > 0) {
            rows.push({
                type: 'normal',
                items: allItems
            });
        }

        html += `<div id="text-lyric-block-${i}" class="${blockClass}">`;

        rows.forEach(row => {
            if (row.type === 'instrumental') {
                html += `<div class="text-mode-lyric-row instrumental-row">`;
                row.items.forEach(item => {
                    if (item.type === 'unlinked') {
                        const cIdx = chords.indexOf(item.chord);
                        const chordHtml = makeChordBadge(item.chord, cIdx);
                        html += `<div class="word-group">`;
                        html += `<div class="text-chord">${chordHtml}</div>`;
                        html += `<div class="lyric-word instrumental-word" data-time="${item.chord.time}">...</div>`;
                        html += `</div>`;
                    } else {
                        const chordHtml = item.linkedChords.map(c => makeChordBadge(c, chords.indexOf(c))).join('');
                        html += `<div class="word-group">`;
                        html += `<div class="text-chord">${chordHtml || '&nbsp;'}</div>`;
                        html += `<div class="lyric-word" data-line-idx="${i}" data-word-idx="${item.wordIdx}">${item.word || '...'}</div>`;
                        html += `</div>`;
                    }
                });
                html += `</div>`;
            } else {
                html += `<div class="text-mode-lyric-row">`;
                row.items.forEach(item => {
                    if (item.type === 'word') {
                        const chordHtml = item.linkedChords.map(c => makeChordBadge(c, chords.indexOf(c))).join('');
                        html += `<div class="word-group">`;
                        html += `<div class="text-chord">${chordHtml || '&nbsp;'}</div>`;
                        html += `<div class="lyric-word" data-line-idx="${i}" data-word-idx="${item.wordIdx}">${item.word}</div>`;
                        html += `</div>`;
                    } else if (item.type === 'unlinked') {
                        const cIdx = chords.indexOf(item.chord);
                        const chordHtml = makeChordBadge(item.chord, cIdx);
                        html += `<div class="word-group">`;
                        html += `<div class="text-chord">${chordHtml}</div>`;
                        html += `<div class="lyric-word instrumental-word" data-time="${item.chord.time}">...</div>`;
                        html += `</div>`;
                    }
                });
                html += `</div>`;
            }
        });

        html += `</div>`;
    }
    
    // Marker logic has been removed so time info is not shown in the text box
    while (currentMarkerIdx < sortedMarkers.length) {
        currentMarkerIdx++;
    }
    
    const headerPager = document.getElementById('textModeHeaderPager');
    const headerPrevBtn = document.getElementById('textModeHeaderPrevBtn');
    const headerNextBtn = document.getElementById('textModeHeaderNextBtn');
    const headerPageInfo = document.getElementById('textModeHeaderPageInfo');

    if (isEditMode && parsedLyrics && parsedLyrics.length > 0) {
        const maxPage = Math.ceil(parsedLyrics.length / 4) - 1;

        // Show and update header pager controls
        if (headerPager) headerPager.classList.remove('hidden');
        if (headerPageInfo) headerPageInfo.textContent = `Page ${window.textModeEditPage + 1} of ${maxPage + 1}`;
        if (headerPrevBtn) {
            headerPrevBtn.disabled = (window.textModeEditPage === 0);
            headerPrevBtn.style.opacity = (window.textModeEditPage === 0) ? '0.4' : '1';
        }
        if (headerNextBtn) {
            headerNextBtn.disabled = (window.textModeEditPage >= maxPage);
            headerNextBtn.style.opacity = (window.textModeEditPage >= maxPage) ? '0.4' : '1';
        }

        html += `
            <div class="text-mode-pagination">
                <button class="btn" onclick="window.prevTextPage()" ${window.textModeEditPage === 0 ? 'disabled' : ''}>← Previous 4 Lines</button>
                <span style="font-size: 0.9em; color: #64748b;">Page ${window.textModeEditPage + 1} of ${maxPage + 1}</span>
                <button class="btn" onclick="window.nextTextPage()" ${window.textModeEditPage >= maxPage ? 'disabled' : ''}>Next 4 Lines →</button>
            </div>
        `;
    } else {
        if (headerPager) headerPager.classList.add('hidden');
    }
    
    textModeContent.innerHTML = html;
    
    // Reset this so updateLoop ensures scrolling is re-applied correctly on next frame
    window.lastActiveTextLyricIdx = -1;

    // ── Attach drag-and-drop listeners once ──────────────────────────────────
    // We use a dataset flag so listeners are only added once, not on every render.
    if (!textModeContent.dataset.dragListenersAdded) {
        textModeContent.addEventListener('dragstart', (e) => {
            if (!isEditMode) return;
            const chordEl = e.target.closest('.draggable-chord');
            if (!chordEl) return;
            const chordIdx = chordEl.dataset.chordIdx;
            e.dataTransfer.setData('text/plain', chordIdx);
            chordEl.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        textModeContent.addEventListener('dragend', (e) => {
            const chordEl = e.target.closest('.draggable-chord');
            if (chordEl) chordEl.classList.remove('dragging');
            textModeContent.querySelectorAll('.lyric-word.drag-over').forEach(el => el.classList.remove('drag-over'));
        });

        textModeContent.addEventListener('dragover', (e) => {
            if (!isEditMode) return;
            const wordEl = e.target.closest('.lyric-word');
            if (!wordEl || wordEl.classList.contains('instrumental-word')) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            textModeContent.querySelectorAll('.lyric-word.drag-over').forEach(el => {
                if (el !== wordEl) el.classList.remove('drag-over');
            });
            wordEl.classList.add('drag-over');
        });

        textModeContent.addEventListener('dragleave', (e) => {
            const wordEl = e.target.closest('.lyric-word');
            if (wordEl) wordEl.classList.remove('drag-over');
        });

        textModeContent.addEventListener('drop', (e) => {
            if (!isEditMode) return;
            const wordEl = e.target.closest('.lyric-word');
            if (!wordEl || wordEl.classList.contains('instrumental-word')) return;
            e.preventDefault();
            wordEl.classList.remove('drag-over');
            const chordIdxStr = e.dataTransfer.getData('text/plain');
            const targetChordIdx = parseInt(chordIdxStr);
            const lineIdx = parseInt(wordEl.dataset.lineIdx);
            const wordIdx = parseInt(wordEl.dataset.wordIdx);
            if (!isNaN(targetChordIdx) && targetChordIdx >= 0 && targetChordIdx < chords.length &&
                !isNaN(lineIdx) && !isNaN(wordIdx)) {
                if (typeof saveUndoState === 'function') saveUndoState();
                // Prevent stacking: clear any other chord on this word
                chords.forEach(c => {
                    if (c !== chords[targetChordIdx] && c.lyricLineIdx === lineIdx && c.lyricWordIdx === wordIdx) {
                        delete c.lyricLineIdx;
                        delete c.lyricWordIdx;
                        delete c.isUserEdited;
                    }
                });
                chords[targetChordIdx].lyricLineIdx = lineIdx;
                chords[targetChordIdx].lyricWordIdx = wordIdx;
                chords[targetChordIdx].isUserEdited = true;
                if (typeof setSaveStatus === 'function') setSaveStatus(false);
                if (typeof checkForChanges === 'function') checkForChanges();
                generateTextModeContent();
                if (typeof showNotification === 'function') showNotification('✅ Chord moved!');
            }
        });

        textModeContent.dataset.dragListenersAdded = 'true';
    }

    // ── Click-to-link (two-click) mechanism ─────────────────────────────────
    //   Click 1 — click a chord badge → selects it (amber glow, chord-selected class)
    //   Click 2 — click a lyric word  → links selected chord to that word (turns purple)
    // The chord's .time (timeline position) is NEVER changed here.
    if (!textModeContent.dataset.clickListenerAdded) {
        let pendingChordKey = null;

        textModeContent.addEventListener('click', (e) => {
            if (!isEditMode) return;

            // --- Did the user click a chord badge? ---
            const chordEl = e.target.closest('.draggable-chord');
            if (chordEl) {
                e.stopPropagation();
                // Deselect any previously selected badge
                textModeContent.querySelectorAll('.draggable-chord.chord-selected')
                               .forEach(el => el.classList.remove('chord-selected'));
                if (pendingChordKey === chordEl.dataset.chordKey) {
                    // Second click on same badge → deselect
                    pendingChordKey = null;
                } else {
                    pendingChordKey = chordEl.dataset.chordKey;
                    chordEl.classList.add('chord-selected');
                    if (typeof showNotification === 'function') showNotification('Chord selected — now drag or click a word to place it');
                }
                return;
            }

            // --- Did the user click a lyric word? ---
            const wordEl = e.target.closest('.lyric-word');
            if (!wordEl || wordEl.classList.contains('instrumental-word')) return;

            const lineIdx = parseInt(wordEl.dataset.lineIdx);
            const wordIdx = parseInt(wordEl.dataset.wordIdx);
            if (isNaN(lineIdx) || isNaN(wordIdx)) return;

            if (pendingChordKey) {
                // === Path A: a chord badge was selected — place it here ===
                const c = chords.find(ch => `${Math.round(ch.time * 1000)}_${ch.name}` === pendingChordKey);
                if (!c) {
                    console.warn('[TextMode] Chord not found for key', pendingChordKey);
                    pendingChordKey = null;
                    return;
                }
                if (typeof saveUndoState === 'function') saveUndoState();
                chords.forEach(other => {
                    if (other !== c && other.lyricLineIdx === lineIdx && other.lyricWordIdx === wordIdx) {
                        delete other.lyricLineIdx;
                        delete other.lyricWordIdx;
                        delete other.isUserEdited;
                    }
                });
                c.lyricLineIdx = lineIdx;
                c.lyricWordIdx = wordIdx;
                c.isUserEdited = true;
                pendingChordKey = null;
                if (typeof setSaveStatus === 'function') setSaveStatus(false);
                if (typeof checkForChanges === 'function') checkForChanges();
                generateTextModeContent();
                if (typeof showNotification === 'function') showNotification('✅ Chord placed! It is now purple.');

            } else {
                // === Path B: no chord selected — auto-link nearest chord by time ===
                const currentPlaybackTime = isPlaying ? (performance.now() - startTime) / 1000 : pauseTime;
                let closestIdx = -1, minDiff = Infinity;
                chords.forEach((c, idx) => {
                    const diff = Math.abs(c.time - currentPlaybackTime);
                    if (diff < minDiff) { minDiff = diff; closestIdx = idx; }
                });
                if (closestIdx !== -1 && minDiff <= 3.0) {
                    if (typeof saveUndoState === 'function') saveUndoState();
                    const c = chords[closestIdx];
                    chords.forEach(other => {
                        if (other !== c && other.lyricLineIdx === lineIdx && other.lyricWordIdx === wordIdx) {
                            delete other.lyricLineIdx;
                            delete other.lyricWordIdx;
                            delete other.isUserEdited;
                        }
                    });
                    c.lyricLineIdx = lineIdx;
                    c.lyricWordIdx = wordIdx;
                    c.isUserEdited = true;
                    if (typeof setSaveStatus === 'function') setSaveStatus(false);
                    if (typeof checkForChanges === 'function') checkForChanges();
                    wordEl.style.transition = 'all 0.2s';
                    wordEl.style.transform = 'scale(1.15)';
                    setTimeout(() => { wordEl.style.transform = ''; generateTextModeContent(); }, 200);
                } else {
                    wordEl.style.transition = 'background-color 0.2s';
                    wordEl.style.backgroundColor = 'rgba(239,68,68,0.25)';
                    setTimeout(() => { wordEl.style.backgroundColor = ''; }, 400);
                    if (typeof showNotification === 'function') showNotification('Drag or select a chord badge first, then click a word');
                }
            }
        });

        textModeContent.dataset.clickListenerAdded = 'true';
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
    const pureLyricsBtn = document.getElementById('pureLyricsBtn');
    if (pureLyricsBtn) pureLyricsBtn.classList.remove('active');
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

    const textModeSaveBtn = document.getElementById('textModeSaveBtn');
    if (textModeSaveBtn) {
        if (hasUnsavedChanges) {
            textModeSaveBtn.classList.remove('hidden');
            textModeSaveBtn.classList.add('unsaved-changes');
            textModeSaveBtn.disabled = false;
            textModeSaveBtn.style.opacity = '1';
        } else {
            textModeSaveBtn.classList.add('hidden');
            textModeSaveBtn.classList.remove('unsaved-changes');
            textModeSaveBtn.disabled = true;
            textModeSaveBtn.style.opacity = '0.5';
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

    // Add Note Markers if available
    if (typeof timelineNotes !== 'undefined' && Array.isArray(timelineNotes)) {
        timelineNotes.forEach(note => {
            markers.push({
                id: note.id,
                time: note.time,
                label: 'Note',
                type: 'note-marker'
            });
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

    // Use a copy for calculation to avoid messing up the main array order during drag
    // This allows chords to visually "pass" each other without swapping DOM elements
    const sortedChords = [...chords].sort((a, b) => a.time - b.time);

    const THRESHOLD = 2.5; // Seconds (Higher for better spacing - v2.454)
    let lastOffset = -50; 

    for (let i = 0; i < sortedChords.length; i++) {
        const chord = sortedChords[i];
        const prevChord = i > 0 ? sortedChords[i - 1] : null;
        const nextChord = i < sortedChords.length - 1 ? sortedChords[i + 1] : null;

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

        const displayName = simplifyDisplayName(chord.name);
        el.innerText = displayName;
        if (displayName.length > 10) {
            el.classList.add('long-text');
        }
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
    if (interactionTrack) interactionTrack.innerHTML = '';

    const markerFrag = document.createDocumentFragment();
    const interactionFrag = document.createDocumentFragment();

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

        if (marker.type === 'lyrics-sync') {
            el.style.cursor = 'grab';
            el.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                if (isPlaying) pause();
                isDraggingLyricMarker = true;
                dragLyricMarkerPointerStartX = e.clientX;
                dragLyricMarkerStartTime = marker.time;
                
                // Track initial times of all lyrics
                window.lyricInitialTimes = parsedLyrics.map(l => l.time);
                window.initialLyricOffsetAtDragStart = currentLyricOffset;
                
                el.style.cursor = 'grabbing';
            });
            
            if (interactionFrag) {
                interactionFrag.appendChild(el);
            } else {
                markerFrag.appendChild(el);
            }
        } else if (marker.type === 'note-marker') {
            const canEdit = isTeacherMode || !isPublicMode || canEditPublic;
            if (canEdit) {
                el.style.cursor = 'grab';
                el.addEventListener('pointerdown', (e) => {
                    e.stopPropagation();
                    if (isPlaying) pause();
                    isDraggingNoteMarker = true;
                    dragNoteMarkerId = marker.id;
                    dragNoteMarkerPointerStartX = e.clientX;
                    dragNoteMarkerStartTime = marker.time;
                    el.style.cursor = 'grabbing';
                });
            } else {
                el.style.cursor = 'pointer';
            }
            
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                if (isDraggingNoteMarker) return;
                if (typeof window.showNotesOverlay === 'function') {
                    window.showNotesOverlay(marker.id);
                }
            });

            if (interactionFrag) {
                interactionFrag.appendChild(el);
            } else {
                markerFrag.appendChild(el);
            }
        } else {
            markerFrag.appendChild(el);
        }
    });
    markerTrack.appendChild(markerFrag);
    if (interactionTrack && interactionFrag) {
        interactionTrack.appendChild(interactionFrag);
    }
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
    if (window.bandSyncInstance) {
        window.bandSyncInstance.updateBandSyncBtn(true);
    }
    initAudio();

    // Extra kick for iPad/Safari
    if (audioCtx && audioCtx.resume) audioCtx.resume();

    isPlaying = true;
    playPauseBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
        <span>PAUSE</span>
    `;

    if (playPauseBtnCompact) {
        playPauseBtnCompact.innerHTML = `
            <span class="icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
            </span>
        `;
    }

    if (songMapPlayPauseBtn) {
        songMapPlayPauseBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
        `;
    }

    const textModePlayPauseBtn = document.getElementById('textModePlayPauseBtn');
    if (textModePlayPauseBtn) {
        textModePlayPauseBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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

        // Prepare YouTube for the start
        if (youtubePlayer && youtubePlayerContainer && !youtubePlayerContainer.classList.contains('hidden')) {
            youtubePlayer._syncingFromTimeline = true;
            youtubePlayer.seekTo(0, true);
            youtubePlayer.pauseVideo();
        }
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

    // Start/Resume YouTube playback when the actual song starts
    if (isPlaying && youtubePlayer && youtubePlayerContainer && !youtubePlayerContainer.classList.contains('hidden')) {
        youtubePlayer._syncingFromTimeline = true;
        youtubePlayer.playVideo();
    }
}

function pause() {
    isPlaying = false;
    if (window.bandSyncInstance) {
        window.bandSyncInstance.updateBandSyncBtn(false);
    }
    playPauseBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        <span>PLAY</span>
    `;

    if (playPauseBtnCompact) {
        playPauseBtnCompact.innerHTML = `
            <span class="icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
            </span>
        `;
    }

    if (songMapPlayPauseBtn) {
        songMapPlayPauseBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" fill="currentColor"></polygon>
            </svg>
        `;
    }

    const textModePlayPauseBtn = document.getElementById('textModePlayPauseBtn');
    if (textModePlayPauseBtn) {
        textModePlayPauseBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
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

    // Chord Audio Logic (Robust to unsorted arrays during drag)
    let audioChordIndex = -1;
    let maxAudioTime = -1;
    for (let i = 0; i < chords.length; i++) {
        if (chords[i].time <= playbackTime && chords[i].time > maxAudioTime) {
            maxAudioTime = chords[i].time;
            audioChordIndex = i;
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
    let maxDisplayTime = -1;
    for (let i = 0; i < chords.length; i++) {
        if (chords[i].time <= playbackTime + 0.05 && chords[i].time > maxDisplayTime) {
            maxDisplayTime = chords[i].time;
            chordIndex = i;
        }
    }

    // Display current chord (Sticky)
    const currentChord = chords[chordIndex];

    const displayString = (typeof window !== 'undefined' && window.activeMidiChord)
        ? window.activeMidiChord
        : (currentChord ? simplifyDisplayName(currentChord.name) : '');

    // If chord/text is longer than 10 chars (e.g. "YouTube Video..."), don't show it in the yellow box
    if (displayString && displayString.length <= 10) {
        if (currentChordDisplay.innerText !== displayString) {
            currentChordDisplay.innerText = displayString;
        }
    } else {
        if (currentChordDisplay.innerText !== '') {
            currentChordDisplay.innerText = '';
        }
    }

    // Update audition keyboard chord highlight (PLAY mode only, not in edit mode)
    // Only update when chord changes to avoid per-frame DOM overhead
    const auditionChordName = currentChord ? simplifyDisplayName(currentChord.name, true) : '';
    if (auditionChordName !== window.lastAuditionChordName) {
        window.lastAuditionChordName = auditionChordName;
        if (typeof updateAuditionKeyboardChord === 'function') {
            updateAuditionKeyboardChord(auditionChordName);
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

    // Update Lyrics HUD (Advanced Lookahead Logic)
    if (lyricsEnabled && parsedLyrics.length > 0) {
        const firstLyricTime = parsedLyrics[0].time;
        const nextIdx = parsedLyrics.findIndex(l => l.time > playbackTime);
        const activeIdx = parsedLyrics.findLastIndex(l => l.time <= playbackTime);

        let line1Text = '';
        let line2Text = '';

        // Check if we haven't reached the first lyric yet
        if (playbackTime < firstLyricTime) {
            line1Text = '';
            if (playbackTime >= firstLyricTime - 4) {
                line2Text = parsedLyrics[0].text;
            } else {
                line2Text = '';
            }
        } else {
            // Priority Logic for active/subsequent lyrics:
            // 1. If we have an active lyric that started less than 10 seconds ago, Line 1 shows IT.
            if (activeIdx !== -1 && (playbackTime - parsedLyrics[activeIdx].time) < 10) {
                line1Text = parsedLyrics[activeIdx].text;
                if (nextIdx !== -1) {
                    line2Text = parsedLyrics[nextIdx].text;
                }
            } 
            // 2. If no active lyric (pre-song) or it's old (solo), check for a 5s heads-up for the NEXT lyric.
            else if (nextIdx !== -1 && parsedLyrics[nextIdx].time <= playbackTime + 5) {
                line1Text = parsedLyrics[nextIdx].text;
                if (nextIdx + 1 < parsedLyrics.length) {
                    line2Text = parsedLyrics[nextIdx + 1].text;
                }
            }
            // 3. Otherwise, Line 1 is empty (solo gap), Line 2 shows the next one coming up eventually.
            else {
                line1Text = '';
                if (nextIdx !== -1) {
                    line2Text = parsedLyrics[nextIdx].text;
                } else if (activeIdx !== -1 && (playbackTime - parsedLyrics[activeIdx].time) < 15) {
                    // Keep the very last lyric on line 1 for a bit longer at the final end
                    line1Text = parsedLyrics[activeIdx].text;
                }
            }
        }

        // Apply Updates (minimize DOM thrashing)
        if (lyricLine1.innerText !== line1Text) {
            lyricLine1.innerText = line1Text;
        }
        if (lyricLine2.innerText !== line2Text) {
            lyricLine2.innerText = line2Text;
            if (line2Text) lyricLine2.classList.remove('hidden');
            else lyricLine2.classList.add('hidden');
        }

        // HUD Visibility Logic (Sync with lookahead)
        const shouldShowHUD = playbackTime >= firstLyricTime - 4;
        if (shouldShowHUD) {
            if (lyricsHUD.classList.contains('hidden')) lyricsHUD.classList.remove('hidden');
        } else {
            if (!lyricsHUD.classList.contains('hidden')) lyricsHUD.classList.add('hidden');
        }
    } else {
        if (!lyricsHUD.classList.contains('hidden')) lyricsHUD.classList.add('hidden');
    }

    // Text Mode Auto-scroll Logic
    if (isTextMode && parsedLyrics.length > 0) {
        if (!isEditMode) {
            let activeIdx = parsedLyrics.findLastIndex(l => l.time <= playbackTime);
            if (activeIdx === -1) activeIdx = 0; // Default to 0 so the first lyric line is visible before the song starts

            if (activeIdx !== window.lastActiveTextLyricIdx) {
                const textModeBlocks = textModeOverlay ? textModeOverlay.querySelectorAll('.text-lyric-block') : [];
                textModeBlocks.forEach((block, idx) => {
                    block.classList.remove('active', 'passed', 'upcoming', 'edit-static');
                    
                    if (idx === activeIdx) {
                        block.classList.add('active');
                    } else if (idx === activeIdx + 1) {
                        block.classList.add('upcoming');
                    } else if (idx < activeIdx) {
                        block.classList.add('passed');
                    }
                });

                const textModeContent = document.getElementById('textModeContent');
                if (textModeContent) {
                    // Smoothly scroll the active block into the middle of the content viewport
                    const activeBlock = textModeContent.querySelector('.text-lyric-block.active');
                    if (activeBlock) {
                        const contentHeight = textModeContent.clientHeight;
                        const blockTop = activeBlock.offsetTop;
                        const blockHeight = activeBlock.offsetHeight;
                        textModeContent.scrollTo({
                            top: blockTop - (contentHeight / 2) + (blockHeight / 2),
                            behavior: 'smooth'
                        });
                    }
                }
                window.lastActiveTextLyricIdx = activeIdx;
            }
        }
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
        // Ensure buttons reflect inactive state
        if (youtubeToggleBtn) youtubeToggleBtn.classList.remove('active');
        if (youtubeToggleBtnCompact) youtubeToggleBtnCompact.classList.remove('active');
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
        if (youtubeToggleBtnCompact) youtubeToggleBtnCompact.classList.add('active');

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

function performCopy() {
    if (selectedChords.size === 0) {
        if (statusText) {
            statusText.innerText = "Select chords first to copy";
            setTimeout(() => {
                if (statusText) statusText.innerText = "Time: " + formatTime(pauseTime);
            }, 2000);
        }
        return;
    }

    // Sort to ensure relative spacing is captured from the earliest chord
    const sortedSelection = Array.from(selectedChords).sort((a, b) => a.time - b.time);
    clipboardChords = sortedSelection.map(c => ({
        name: c.name,
        time: c.time
    }));

    // Store relative times from the first selected chord
    const firstTime = clipboardChords[0].time;
    clipboardChords.forEach(c => {
        c.relativeTime = c.time - firstTime;
    });

    isPasteMode = true;
    if (duplicateBtn) {
        duplicateBtn.innerHTML = PASTE_ICON;
        duplicateBtn.title = "Paste Chords at Playhead (Ctrl+V)";
        duplicateBtn.classList.add('paste-active');
    }

    if (statusText) {
        statusText.innerText = `Copied ${clipboardChords.length} chords. Click again (or Ctrl+V) to paste at playhead.`;
    }
}

function performPaste() {
    if (!clipboardChords || clipboardChords.length === 0) {
        if (statusText) {
            statusText.innerText = "Nothing in clipboard to paste";
            setTimeout(() => {
                if (statusText) statusText.innerText = "Time: " + formatTime(pauseTime);
            }, 2000);
        }
        return;
    }

    saveUndoState();
    
    // Paste starting at the current playhead position
    const playheadTime = isPlaying ? (performance.now() - startTime) / 1000 : pauseTime;
    
    const newChords = clipboardChords.map(c => ({
        name: c.name,
        time: Math.round((playheadTime + c.relativeTime) * 1000) / 1000,
        _isNewCopy: true
    }));

    chords.push(...newChords);
    chords.sort((a, b) => a.time - b.time);

    // After pasting, select the new chords so they can be moved immediately
    clearSelection();
    for (let i = 0; i < chords.length; i++) {
        if (chords[i]._isNewCopy) {
            selectChord(chords[i], true); // additive
            delete chords[i]._isNewCopy;
        }
    }

    renderStaticElements();
    updateLoop();
    checkForChanges();

    // Revert icon and mode
    isPasteMode = false;
    if (duplicateBtn) {
        duplicateBtn.innerHTML = COPY_ICON;
        duplicateBtn.title = "Copy Selected Chords (Ctrl+C)";
        duplicateBtn.classList.remove('paste-active');
    }

    if (statusText) {
        statusText.innerText = `Pasted ${newChords.length} chords`;
        setTimeout(() => {
            if (statusText) statusText.innerText = "Time: " + formatTime(pauseTime);
        }, 2000);
    }
}

function handleDuplicateBtnClick() {
    if (!isPasteMode) {
        performCopy();
    } else {
        performPaste();
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
            isPasteMode = false;
            clipboardChords = [];
            if (duplicateBtn) {
                duplicateBtn.innerHTML = COPY_ICON;
                duplicateBtn.classList.remove('paste-active');
            }

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
    const auditionKeyboard = document.getElementById('auditionKeyboard');
    if (auditionKeyboard) auditionKeyboard.classList.add('song-map-open');
    const auditionGuitarDiagram = document.getElementById('auditionGuitarDiagram');
    if (auditionGuitarDiagram) auditionGuitarDiagram.classList.add('song-map-open');

    // Note: playback intentionally NOT stopped here — video/music continues while Song Map is open

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
    const auditionKeyboard = document.getElementById('auditionKeyboard');
    if (auditionKeyboard) auditionKeyboard.classList.remove('song-map-open');
    const auditionGuitarDiagram = document.getElementById('auditionGuitarDiagram');
    if (auditionGuitarDiagram) auditionGuitarDiagram.classList.remove('song-map-open');
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
                    else if (sectionName.includes('INTERLUDE')) type = 'interlude';
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
            else if (btnColorClass === 'chord-type-interlude') labelEl.style.color = '#0d9488'; // Teal

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
        // State 1: First click. Establish anchor.
        mapSelectionState = { active: true, startIdx: index, endIdx: index };
        updateMapSelectionUI();
        // Do NOT show picker yet
    } else if (mapSelectionState.startIdx === mapSelectionState.endIdx) {
        // State 2: Second click. Finish the range.
        mapSelectionState.endIdx = index;
        updateMapSelectionUI();
        showMapLabelPicker(); // Popup appears NOW
    } else {
        // State 3: Third click or change. Restart selection.
        const picker = document.getElementById('mapLabelPicker');
        if (picker) picker.classList.add('hidden'); 
        
        mapSelectionState = { active: true, startIdx: index, endIdx: index };
        updateMapSelectionUI();
    }
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

    const labels = ['INTRO', 'VERSE', 'PRE CHORUS', 'CHORUS', 'BRIDGE', 'OUTRO', 'SOLO', 'INSTRUMENTAL', 'INTERLUDE', 'REMOVE'];
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
        else if (lbl.includes('INTERLUDE')) btn.classList.add('pill-teal');
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
            else if (up.includes('INTERLUDE')) type = 'interlude';
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

function updateTeacherNoteButtonVisibility() {
    const teacherNoteBtn = document.getElementById('teacherNoteBtn');
    const canEditNotes = isTeacherMode || !isPublicMode || canEditPublic;
    const hasNotes = timelineNotes && timelineNotes.length > 0;
    const visible = canEditNotes || hasNotes;
    if (teacherNoteBtn) {
        teacherNoteBtn.classList.toggle('visible-note', visible);
    }
}

// ==========================================
// Band Sync Real-time Collaboration Module
// ==========================================

class BandSync {
    constructor() {
        this.firebaseManager = new FirebaseManager();
        this.currentBandId = null;
        this.bands = [];
        
        // DOM elements
        this.bandSyncBtn = document.getElementById('bandSyncBtn');
        this.bandSyncSelect = document.getElementById('bandSyncSelect');
        this.bandSyncSelectorContainer = document.getElementById('bandSyncSelectorContainer');
        this.bandLobbyCount = document.getElementById('bandLobbyCount');
        
        // Listeners & state
        this.presenceRef = null;
        this.syncListenerRef = null;
        this.currentUserId = null;
        this.startTimeoutId = null;
        this.lastExecutedEventId = null;  // unique per-event dedup (was: lastExecutedFireAt)
        this.initTime = Date.now();       // used to ignore stale events from before this page load
        
        this.init();
    }

    updateBandSyncBtn(isPlayingState) {
        if (!this.bandSyncBtn) return;
        const iconSpan = this.bandSyncBtn.querySelector('.icon');
        if (!iconSpan) return;
        
        if (isPlayingState) {
            iconSpan.innerHTML = `
                <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>
                </svg>
            `;
            this.bandSyncBtn.title = "Synced Pause with Band";
        } else {
            iconSpan.innerHTML = `
                <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                    <polyline points="21 3 21 8 16 8" />
                </svg>
            `;
            this.bandSyncBtn.title = "Synced Start with Band";
        }
    }

    async init() {
        try {
            await this.firebaseManager.initialize();
            this.firebaseManager.auth.onAuthStateChanged(user => {
                if (user) {
                    this.currentUserId = user.uid;
                    this.loadBands();
                    this.setupEventListeners();
                } else {
                    this.hideUI();
                }
            });
        } catch (e) {
            console.error('BandSync init error:', e);
        }
    }

    setupEventListeners() {
        if (this.bandSyncBtn) {
            this.bandSyncBtn.onclick = () => this.handleSyncBtnClick();
        }
        if (this.bandSyncSelect) {
            this.bandSyncSelect.onchange = (e) => {
                this.selectBand(e.target.value);
            };
        }
    }

    hideUI() {
        if (this.bandSyncSelectorContainer) this.bandSyncSelectorContainer.style.display = 'none';
        if (this.bandSyncBtn) this.bandSyncBtn.style.display = 'none';
        this.cleanup();
    }

    async loadBands() {
        const result = await this.firebaseManager.getBands();
        if (result.success && result.bands.length > 0) {
            this.bands = result.bands;
            
            // Populate select options
            if (this.bandSyncSelect) {
                this.bandSyncSelect.innerHTML = '<option value="" style="color: black;">No Band Sync</option>';
                this.bands.forEach(b => {
                    const opt = document.createElement('option');
                    opt.value = b.id;
                    opt.textContent = b.name;
                    opt.style.color = 'black';
                    this.bandSyncSelect.appendChild(opt);
                });
            }
            
            if (this.bandSyncSelectorContainer) {
                this.bandSyncSelectorContainer.classList.remove('hidden');
                this.bandSyncSelectorContainer.style.display = 'flex';
            }
            
            // Restore last selected band if possible
            const savedId = localStorage.getItem('lastSelectedBandId');
            const stillExists = this.bands.some(b => b.id === savedId);
            if (savedId && stillExists) {
                if (this.bandSyncSelect) this.bandSyncSelect.value = savedId;
                this.selectBand(savedId);
            }
        } else {
            this.hideUI();
        }
    }

    async selectBand(bandId) {
        this.cleanup();
        
        if (!bandId) {
            if (this.bandSyncBtn) this.bandSyncBtn.style.display = 'none';
            localStorage.removeItem('lastSelectedBandId');
            return;
        }
        
        this.currentBandId = bandId;
        localStorage.setItem('lastSelectedBandId', bandId);
        
        if (this.bandSyncBtn) {
            this.bandSyncBtn.classList.remove('hidden');
            this.bandSyncBtn.style.display = 'flex';
            
            // Set initial state based on isPlaying
            this.updateBandSyncBtn(isPlaying);
        }
        
        // Update presence
        await this.updateSongPresence();
        
        // Listen to online presence count
        const lobbyRef = this.firebaseManager.database.ref(`bandSync/${bandId}/present`);
        lobbyRef.on('value', snapshot => {
            const val = snapshot.val() || {};
            const count = Object.keys(val).length;
            if (this.bandLobbyCount) {
                this.bandLobbyCount.textContent = count;
                this.bandLobbyCount.classList.remove('hidden');
                this.bandLobbyCount.style.display = 'inline-block';
            }
        });
        
        // Listen to sync events
        const syncRef = this.firebaseManager.database.ref(`bandSync/${bandId}`);
        this.syncListenerRef = syncRef.on('value', snapshot => {
            const data = snapshot.val();
            if (data && data.action && data.triggeredBy !== this.currentUserId) {
                this.executeSyncAction(data);
            }
        });
    }

    async updateSongPresence() {
        if (!this.currentBandId || !this.currentUserId) return;
        
        const sessionActive = localStorage.getItem('bandPracticeSessionActive') === 'true';
        if (!sessionActive) {
            if (this.presenceRef) {
                await this.presenceRef.remove();
                this.presenceRef = null;
            }
            return;
        }
        
        const displayName = this.firebaseManager.currentUser.displayName || this.firebaseManager.currentUser.email.split('@')[0];
        const titleEl = document.getElementById('songTitleDisplay');
        const songName = titleEl ? titleEl.textContent : (loadedSongId || 'Unknown Song');
        
        this.presenceRef = this.firebaseManager.database.ref(`bandSync/${this.currentBandId}/present/${this.currentUserId}`);
        await this.presenceRef.set({
            displayName: displayName,
            songId: songName,
            connectedAt: Date.now()
        });
        
        this.presenceRef.onDisconnect().remove();
    }

    cleanup() {
        if (this.presenceRef) {
            this.presenceRef.remove();
            this.presenceRef = null;
        }
        if (this.currentBandId) {
            this.firebaseManager.database.ref(`bandSync/${this.currentBandId}/present`).off('value');
            this.firebaseManager.database.ref(`bandSync/${this.currentBandId}`).off('value');
        }
        if (this.bandLobbyCount) this.bandLobbyCount.style.display = 'none';
        this.currentBandId = null;
    }

    async handleSyncBtnClick() {
        if (!this.currentBandId) return;
        
        const sessionActive = localStorage.getItem('bandPracticeSessionActive') === 'true';
        if (!sessionActive) {
            if (window.confirmationModal) {
                window.confirmationModal.show(
                    '🎸 Band Practice Session',
                    'Your Band Practice Session is currently stopped. Please start a practice session on the Band Practice page to synchronize playback.',
                    () => {},
                    null,
                    'OK',
                    null,
                    'primary',
                    true
                );
            } else {
                alert('Your Band Practice Session is currently stopped. Please start a practice session on the Band Practice page to synchronize playback.');
            }
            return;
        }
        
        const titleEl = document.getElementById('songTitleDisplay');
        const currentSongName = titleEl ? titleEl.textContent : (loadedSongId || 'Unknown Song');
        const pos = isPlaying ? ((performance.now() - startTime) / 1000) : pauseTime;
        
        if (isPlaying) {
            // Write PAUSE action
            const pauseEventId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            await this.firebaseManager.database.ref(`bandSync/${this.currentBandId}`).update({
                action: 'pause',
                eventId: pauseEventId,
                fireAt: Date.now() + 100, // 100ms execution delay for stop
                position: pos,
                songId: currentSongName,
                triggeredBy: this.currentUserId
            });
            // Execute locally immediately
            pause();
            jumpToTime(pos);
        } else {
            // Write PLAY action
            const playEventId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            await this.firebaseManager.database.ref(`bandSync/${this.currentBandId}`).update({
                action: 'play',
                eventId: playEventId,
                fireAt: Date.now() + 5000, // 5 seconds countdown
                position: pos,
                songId: currentSongName,
                triggeredBy: this.currentUserId
            });
            // Execute countdown locally
            this.startCountdown(5000, pos);
        }
    }

    executeSyncAction(data) {
        if (!data || !data.fireAt) return;
        
        // Deduplicate using unique eventId (falls back to fireAt for backwards compat)
        const eventKey = data.eventId || data.fireAt;
        if (eventKey === this.lastExecutedEventId) {
            return;
        }
        this.lastExecutedEventId = eventKey;

        const sessionActive = localStorage.getItem('bandPracticeSessionActive') === 'true';
        if (!sessionActive) return;

        // Ignore stale sync events:
        // 1. Events older than 10 seconds (fireAt is in the past by > 10s)
        // 2. Events whose fireAt predates this page load (stale from a previous session)
        const age = Date.now() - data.fireAt;
        if (age > 10000) {
            console.log(`Ignoring stale sync action from ${age}ms ago:`, data);
            return;
        }
        if (data.fireAt < this.initTime) {
            console.log(`Ignoring pre-load sync action (fireAt: ${data.fireAt}, initTime: ${this.initTime}):`, data);
            return;
        }

        const titleEl = document.getElementById('songTitleDisplay');
        const currentSongName = titleEl ? titleEl.textContent : (loadedSongId || 'Unknown Song');
        if (data.songId !== currentSongName) {
            let songId = null;
            if (window.parent && window.parent.appInstance && window.parent.appInstance.songManager) {
                const song = window.parent.appInstance.songManager.songs.find(s => s.title.trim().toLowerCase() === data.songId.trim().toLowerCase());
                if (song) {
                    songId = song.id;
                }
            }

            // Show song mismatch alert using ConfirmationModal
            if (window.confirmationModal) {
                let messageHTML = `Band Member is playing: <strong>"${data.songId}"</strong>.<br><br>Open that song on your songlist to play along together!`;
                if (songId) {
                    messageHTML = `Band Member is playing: <a href="#" style="color: #4f46e5; text-decoration: underline; font-weight: bold;" onclick="event.preventDefault(); window.parent.appInstance.songDetailModal.openPureTimelineForSong('${songId}'); window.confirmationModal.hide();">"${data.songId}"</a>.<br><br>Open that song on your songlist to play along together!`;
                }

                window.confirmationModal.show(
                    '🎸 Band Playback Sync',
                    messageHTML,
                    () => {},
                    null,
                    'OK',
                    null,
                    'primary',
                    true
                );
            } else {
                alert(`Band Member is playing: "${data.songId}". Open that song to play along together!`);
            }
            return;
        }
        
        const delay = data.fireAt - Date.now();
        
        if (data.action === 'play') {
            if (delay > 0) {
                this.startCountdown(delay, data.position);
            } else {
                // If late, just play immediately at the adjusted position
                const lateOffset = Math.abs(delay) / 1000;
                pause();
                jumpToTime(data.position + lateOffset);
                play();
            }
        } else if (data.action === 'pause') {
            // Cancel countdowns
            if (this.startTimeoutId) {
                clearTimeout(this.startTimeoutId);
                this.startTimeoutId = null;
            }
            if (this.countdownIntervalId) {
                clearInterval(this.countdownIntervalId);
                this.countdownIntervalId = null;
            }
            const overlay = document.getElementById('bandCountdownOverlay');
            if (overlay) {
                overlay.style.display = 'none';
            }

            if (delay > 0) {
                setTimeout(() => {
                    pause();
                    jumpToTime(data.position);
                }, delay);
            } else {
                pause();
                jumpToTime(data.position);
            }
        }
    }

    startCountdown(delayMs, position) {
        // Cancel existing countdowns
        if (this.startTimeoutId) {
            clearTimeout(this.startTimeoutId);
            this.startTimeoutId = null;
        }
        if (this.countdownIntervalId) {
            clearInterval(this.countdownIntervalId);
            this.countdownIntervalId = null;
        }
        
        const overlay = document.getElementById('bandCountdownOverlay');
        const numberEl = document.getElementById('bandCountdownNumber');
        if (!overlay || !numberEl) {
            // Fallback if elements don't exist
            this.startTimeoutId = setTimeout(() => {
                this.startTimeoutId = null;
                this.executeSyncStart(position);
            }, delayMs);
            return;
        }
        
        overlay.style.display = 'flex';
        overlay.style.opacity = '1';
        
        // Prepare YouTube in the background so it is ready
        if (youtubePlayer && youtubePlayerContainer && !youtubePlayerContainer.classList.contains('hidden')) {
            youtubePlayer._syncingFromTimeline = true;
            youtubePlayer.seekTo(Math.max(0, position), true);
            youtubePlayer.pauseVideo();
        }
        
        // Standard countdown is 5 seconds
        let count = 5;
        numberEl.textContent = count;
        numberEl.style.color = '#4f46e5';
        numberEl.style.transform = 'scale(1)';
        
        if (audioEnabled && pianoPlayer) {
            try { pianoPlayer.playCountdownTick(false); } catch (e) { console.error(e); }
        }
        
        this.countdownIntervalId = setInterval(() => {
            count--;
            if (count > 0) {
                numberEl.textContent = count;
                numberEl.style.transform = 'scale(1.2)';
                setTimeout(() => { numberEl.style.transform = 'scale(1)'; }, 100);
                if (audioEnabled && pianoPlayer) {
                    try { pianoPlayer.playCountdownTick(false); } catch (e) { console.error(e); }
                }
            } else if (count === 0) {
                numberEl.textContent = 'GO!';
                numberEl.style.color = '#10b981';
                numberEl.style.transform = 'scale(1.5)';
                if (audioEnabled && pianoPlayer) {
                    try { pianoPlayer.playCountdownTick(true); } catch (e) { console.error(e); }
                }
                
                // Trigger song play synchronously on count = 0
                this.executeSyncStart(position);
            } else {
                clearInterval(this.countdownIntervalId);
                this.countdownIntervalId = null;
                
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.style.display = 'none';
                    numberEl.style.color = '#4f46e5';
                    numberEl.style.transform = 'scale(1)';
                }, 300);
            }
        }, 1000);
    }

    executeSyncStart(position) {
        isPlaying = true;
        startTime = performance.now() - (position * 1000);
        
        // Update play/pause buttons
        playPauseBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
            <span>PAUSE</span>
        `;
        if (playPauseBtnCompact) {
            playPauseBtnCompact.innerHTML = `
                <span class="icon">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="6" y="4" width="4" height="16"></rect>
                        <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                </span>
            `;
        }
        if (songMapPlayPauseBtn) {
            songMapPlayPauseBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
            `;
        }
        
        const textModePlayPauseBtn = document.getElementById('textModePlayPauseBtn');
        if (textModePlayPauseBtn) {
            textModePlayPauseBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
            `;
        }
        
        // Resume YouTube if applicable
        if (youtubePlayer && youtubePlayerContainer && !youtubePlayerContainer.classList.contains('hidden')) {
            youtubePlayer._syncingFromTimeline = true;
            youtubePlayer.seekTo(position, true);
            youtubePlayer.playVideo();
        }
        
        // Update Sync Button
        this.updateBandSyncBtn(true);
        
        // Kick off update loop
        requestAnimationFrame(updateLoop);
    }
}









































































































