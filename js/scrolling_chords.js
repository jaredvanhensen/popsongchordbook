// Scrolling Chords Logic

const midiInput = document.getElementById('midiInput');
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
const youtubePlayerContainer = document.getElementById('youtubePlayerContainer');
const recordingIndicator = document.getElementById('recordingIndicator');
const countInOverlay = document.getElementById('countInOverlay');
const countInNumber = document.getElementById('countInNumber');
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
        .chord-item { color: #0f172a !important; text-shadow: none !important; }
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
let originalChordsJson = '[]'; // For change detection

// Dragging state
let isDraggingChord = false;
let draggedChordIndex = null;
let dragPointerStartX = 0;
let dragChordStartTime = 0;
let dragHasMoved = false;
let countInStartTime = 0;
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const PIXELS_PER_SECOND = 150; // Speed of scrolling (was 100, originally 200)

// Capture & YouTube State
let youtubePlayer = null;
let youtubeApiReady = false;
let youtubeUrl = null;
let enableTimingCapture = false;
let isYoutubePlaying = false;

// Metronome/Audio state
let metronomeEnabled = false;
let audioEnabled = true; // Default ON
let lastBeatPlayed = -1;
let lastChordPlayed = -1;
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

    // YouTube Close Button
    const closeYoutubeBtn = document.getElementById('closeYoutubeBtn');
    if (closeYoutubeBtn) {
        closeYoutubeBtn.addEventListener('click', () => {
            if (youtubePlayer && typeof youtubePlayer.pauseVideo === 'function') {
                youtubePlayer.pauseVideo();
            }
            if (youtubePlayerContainer) youtubePlayerContainer.classList.add('hidden');
            // Also turn off capture mode if active
            if (enableTimingCapture) toggleTimingCapture();
        });
    }
});

// Space bar recording or toggle play/pause (Global listener)
document.addEventListener("keydown", e => {
    if (e.code !== "Space") return;

    // Prevent default scrolling
    e.preventDefault();

    if (enableTimingCapture) {
        recordChord();
    } else {
        togglePlayPause();
    }
});

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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
    const currentBpm = Math.round(60 / secondsPerBeat);
    const newBpm = prompt("Enter new Tempo (BPM):", currentBpm);

    if (newBpm && !isNaN(newBpm)) {
        const bpmVal = parseInt(newBpm);
        if (bpmVal > 0) {
            secondsPerBeat = 60 / bpmVal;
            bpmBtn.innerText = `${bpmVal} BPM`;

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
        }
    }
}


if (speedBtn) {
    speedBtn.onclick = () => {
        currentSpeed = currentSpeed === 1.0 ? 0.5 : 1.0;
        speedBtn.innerHTML = currentSpeed === 1.0 ? '🏃 <span>1.0x</span>' : '🚶 <span>0.5x</span>';
        if (youtubePlayer && typeof youtubePlayer.setPlaybackRate === 'function') {
            youtubePlayer.setPlaybackRate(currentSpeed);
        }
    };
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
        // Use provided duration (playback uses 10s, manual clicks use 1s)
        pianoPlayer.playChord(chord.notes, duration, 0.4, 0.05);
    }
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
        const playheadOffset = 200; // Updated to match CSS
        const dist = x - playheadOffset;

        const playbackTime = isPlaying ? (performance.now() - startTime) / 1000 : pauseTime;
        const dropTime = Math.max(0, playbackTime + (dist / PIXELS_PER_SECOND));

        recordChord(chordName, dropTime);
        triggerChordAudio(chordName, 1.0);
        return;
    }

    // Check if it's a file drop
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
});

// Chord Editing (Click) & Dragging
chordTrack.addEventListener('pointerdown', (e) => {
    const target = e.target.closest('.chord-item');
    if (target) {
        e.stopPropagation(); // Prevent bubbling to timeline drag
        isDraggingChord = true;
        draggedChordIndex = parseInt(target.dataset.index);
        dragPointerStartX = e.clientX;

        let initialTime = chords[draggedChordIndex].time;
        if (Number.isNaN(initialTime) || !Number.isFinite(initialTime)) initialTime = 0;
        dragChordStartTime = initialTime;

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
    if (!isDraggingChord || draggedChordIndex === null) return;

    const deltaX = e.clientX - dragPointerStartX;

    // Only start "dragging" if we moved more than a few pixels to avoid accidental drags
    if (!dragHasMoved && Math.abs(deltaX) > 4) {
        dragHasMoved = true;
        if (isPlaying) pause();
    }

    if (dragHasMoved) {
        e.preventDefault();
        const deltaTime = deltaX / PIXELS_PER_SECOND;

        // Safety check
        if (chords[draggedChordIndex]) {
            chords[draggedChordIndex].time = Math.max(0, dragChordStartTime + deltaTime);
        }

        // Force update loop to prevent collapse
        updateLoop();
    }
});

window.addEventListener('pointerup', (e) => {
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

        if (!data.chords || !Array.isArray(data.chords)) {
            throw new Error('Invalid JSON format: missing chords array');
        }

        chords = data.chords;
        // Reconstruct markers if possible, or simple time markers
        // For now, simpler markers based on duration
        const duration = data.duration || (chords[chords.length - 1].time + 5);
        const bpm = data.tempo || 120;

        // Mock midi object for marker generation (reusing existing function with mock)
        const mockMidi = {
            duration: duration,
            header: { tempos: [{ bpm: bpm }], timeSignatures: [{ timeSignature: [4, 4] }] }
        };
        markers = generateMarkers(mockMidi);
        midiData = mockMidi; // Store for export reuse (though re-exporting JSON is redundant)

        finishLoading(chords.length, bpm);

    } catch (error) {
        console.error(error);
        statusText.innerText = 'Error parsing JSON file. Invalid format.';
    }
}




function loadData(data, url, title, suggestedChords = [], artist = '', songTitle = '') {
    console.log('loadData called with:', {
        data: data ? 'present' : 'missing',
        chordCount: data?.chords?.length,
        url,
        suggestedChordsType: typeof suggestedChords,
        suggestedChordsLen: Array.isArray(suggestedChords) ? suggestedChords.length : 'N/A',
        suggestedChordsPreview: suggestedChords,
        artist,
        songTitle
    });

    // Ensure suggestedChords is an array
    if (!suggestedChords) suggestedChords = [];


    // Populate Metadata Header
    const artistDisplay = document.getElementById('artistDisplay');
    const songTitleDisplay = document.getElementById('songTitleDisplay');

    if (artistDisplay) artistDisplay.textContent = artist || '';
    if (songTitleDisplay) songTitleDisplay.textContent = songTitle || '';

    if (!data || !data.chords || !Array.isArray(data.chords)) {
        console.error('Invalid data format received');
        // If we have a YouTube URL but no chords, initialize with empty chords
        if (url) {
            data = { chords: [], duration: 300, tempo: 120 }; // Default 5 mins
        } else {
            return;
        }
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
                    // Add Section Header Label
                    const header = document.createElement('div');
                    header.className = 'chord-toolbar-section-header';
                    header.textContent = group.section;
                    buttonsContainer.appendChild(header);

                    group.chords.forEach(chordName => {
                        const btn = document.createElement('button');
                        btn.className = `chord-suggestion-btn chord-type-${group.type}`;
                        btn.textContent = chordName;
                        btn.draggable = true;

                        // Use pointerdown for immediate audio feedback across all devices
                        btn.onpointerdown = (e) => {
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
                            // Audio already triggered by pointerdown
                        };
                        buttonsContainer.appendChild(btn);
                    });
                });
            } else {
                suggestedChords.forEach(chordName => {
                    const btn = document.createElement('button');
                    btn.className = 'chord-suggestion-btn';
                    btn.textContent = chordName;
                    btn.draggable = true;

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
                    buttonsContainer.appendChild(btn);
                });
            }

            // Appending "?" button
            const qBtn = document.createElement('button');
            qBtn.className = 'chord-suggestion-btn';
            qBtn.textContent = '?';
            qBtn.title = 'Mark unknown chord';
            qBtn.draggable = true;

            qBtn.onpointerdown = (e) => {
                initAudio();
                triggerChordAudio("?", 1.0, true);
            };

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
        // Show player immediately so user can see it
        if (youtubePlayerContainer) youtubePlayerContainer.classList.remove('hidden');
    } else {
        if (captureBtn) captureBtn.classList.add('hidden');
        if (youtubePlayerContainer) youtubePlayerContainer.classList.add('hidden');
    }

    try {
        chords = data.chords || [];
        const duration = data.duration || (chords.length > 0 ? chords[chords.length - 1].time + 5 : 300);
        const bpm = data.tempo || 120;

        // Update global secondsPerBeat for metronome
        secondsPerBeat = 60 / bpm;
        if (bpmBtn) bpmBtn.innerText = `${Math.round(bpm)} BPM`;

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
    statusText.innerText = `Ready! ${chordCount} chords. Tempo: ${Math.round(bpm)} BPM`;
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
    updateLoop(); // Update once to set initial positions
}

function getExportData() {
    if (!chords || chords.length === 0) return null;

    return {
        name: currentFileName,
        tempo: (midiData && midiData.header && midiData.header.tempos) ? midiData.header.tempos[0]?.bpm : (midiData?.tempo || 120),
        duration: midiData ? midiData.duration : (chords[chords.length - 1].time + 5),
        chords: chords
    };
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

    console.log('Requesting parent to save chord data...');
    window.parent.postMessage({
        type: 'saveChordData',
        data: exportData
    }, '*');

    // Visual feedback
    setSaveStatus(true);

    // Update original state and hide after a delay
    originalChordsJson = JSON.stringify(chords);
    setTimeout(() => {
        checkForChanges();
    }, 1500);
}

function setSaveStatus(isSaved) {
    if (!saveBtn) return;

    const iconEl = saveBtn.querySelector('.icon');
    const labelEl = saveBtn.querySelector('.label');

    if (isSaved) {
        if (iconEl) iconEl.innerText = '✅';
        if (labelEl) labelEl.innerText = 'Saved';
        saveBtn.classList.add('saved');
    } else {
        if (iconEl) iconEl.innerText = '💾';
        if (labelEl) labelEl.innerText = 'Save';
        saveBtn.classList.remove('saved');
    }
}

/**
 * Detects if current chords differ from original and toggles Save button
 */
function checkForChanges() {
    if (!saveBtn) return;

    const currentJson = JSON.stringify(chords);
    const hasUnsavedChanges = currentJson !== originalChordsJson;

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

    // Add time markers (every 5 seconds)
    for (let t = 0; t <= duration; t += 5) {
        markers.push({
            time: t,
            label: formatTime(t),
            type: 'time'
        });
    }

    // Add bar and beat markers
    const numBars = Math.ceil(duration / secondsPerBar);

    for (let i = 0; i <= numBars; i++) {
        const barTime = i * secondsPerBar;

        // Bar Marker
        markers.push({
            time: barTime,
            label: `Bar ${i + 1}`,
            type: 'bar'
        });

        // Beat Markers (add beats between this bar and next)
        // For 4/4, we add beats at 1, 2, 3 offset (0 is bar start)
        if (i < numBars) {
            const beatsPerBar = timeSignature[0];
            for (let b = 1; b < beatsPerBar; b++) {
                markers.push({
                    time: barTime + (b * secondsPerBeat),
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

function renderStaticElements() {
    // Render chords
    chordTrack.innerHTML = '';

    // Fragment for performance
    const chordFrag = document.createDocumentFragment();
    chords.forEach((chord, index) => {
        const el = document.createElement('div');
        el.className = 'chord-item';
        el.innerText = chord.name;
        el.dataset.index = index;
        chordFrag.appendChild(el);
    });
    chordTrack.appendChild(chordFrag);

    // Render markers
    markerTrack.innerHTML = '';
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

    isPlaying = true;
    playPauseBtn.innerText = '⏸ Pause';

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
    playPauseBtn.innerText = '▶ Play';

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

function old_clearData() {
    if (!confirm('Warning: This will remove all chord data for this song. Are you sure?')) {
        return;
    }

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

function updateLoop() {
    const now = performance.now();
    let playbackTime;

    if (isPlaying) {
        if (enableTimingCapture && youtubePlayer && typeof youtubePlayer.getPlayerState === 'function' && youtubePlayer.getPlayerState() === 1) {
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

    // Metronome Logic
    const currentBeat = Math.floor(playbackTime / secondsPerBeat);
    if (currentBeat > lastBeatPlayed) {
        if (isPlaying && metronomeEnabled && playbackTime >= 0) {
            const isDownbeat = currentBeat % beatsPerBar === 0;
            playTick(isDownbeat);
        }
        lastBeatPlayed = currentBeat;
    } else if (currentBeat < lastBeatPlayed) {
        lastBeatPlayed = currentBeat - 1;
    }

    // Chord Audio Logic
    const chordIndex = chords.findLastIndex(c => c.time <= playbackTime);
    if (chordIndex > lastChordPlayed) {
        if (isPlaying && audioEnabled && playbackTime >= 0) {
            triggerChordAudio(chords[chordIndex].name);
        }
        lastChordPlayed = chordIndex;
    } else if (chordIndex < lastChordPlayed) {
        lastChordPlayed = chordIndex;
    }

    // Don't scroll past end? Or just let it go.

    // Display current chord (Sticky)
    const currentChord = chords.findLast(c => c.time <= playbackTime);
    if (currentChord) {
        currentChordDisplay.innerText = currentChord.name;
    } else {
        currentChordDisplay.innerText = '';
    }

    // Safety for PIXELS_PER_SECOND
    const pps = (typeof PIXELS_PER_SECOND === 'number' && isFinite(PIXELS_PER_SECOND)) ? PIXELS_PER_SECOND : 150;

    // Update scrolling chord positions
    const chordElements = chordTrack.children;
    for (let i = 0; i < chordElements.length; i++) {
        const el = chordElements[i];
        const chord = chords[i];
        if (!chord) continue;

        let dist = (chord.time - playbackTime) * pps;

        // Final sanity check on dist
        if (!isFinite(dist) || isNaN(dist)) {
            dist = 0;
            el.style.display = 'none'; // Hide it if it's broken
        }

        if (dist < -200 || dist > window.innerWidth + 200) {
            el.style.display = 'none';
        } else {
            el.style.display = 'block';
            el.style.transform = `translateX(${dist}px) translateY(-50%)`;

            // Fade out as it passes the playhead to the left
            if (dist < 0) {
                el.style.opacity = '0.5';
            } else {
                el.style.opacity = '1';
            }
        }
    }

    // Update markers
    const markerElements = markerTrack.children;
    for (let i = 0; i < markerElements.length; i++) {
        const el = markerElements[i];
        const marker = markers[i];

        if (marker) {
            let dist = (marker.time - playbackTime) * pps;

            if (!isFinite(dist) || isNaN(dist)) {
                dist = 0;
                el.style.display = 'none';
            }

            if (dist < -200 || dist > window.innerWidth + 200) {
                el.style.display = 'none';
            } else {
                el.style.display = 'block';
                el.style.transform = `translateX(${dist}px)`;
            }
        }
    }

    statusText.innerText = `Time: ${formatTime(playbackTime)}`;

    if (isPlaying) {
        animationFrame = requestAnimationFrame(updateLoop);
    }
}

// --- YouTube & Capture Logic ---

function initYouTubePlayer(url) {
    const videoId = extractVideoID(url);
    if (!videoId) return;

    if (youtubePlayer) {
        // Use cueVideoById to load thumbnail but NOT auto-play
        youtubePlayer.cueVideoById(videoId);
    } else {
        console.log("Initializing YouTube Player with ID:", videoId);
        youtubePlayer = new YT.Player('youtubePlayer', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: {
                'autoplay': 0, // Ensure no autoplay on init
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
    // event.target.playVideo(); // Don't auto-play, wait for user
}

function onPlayerError(event) {
    console.error("YouTube Player Error:", event.data);
    let errorMsg = "YouTube Error: ";
    if (event.data === 2) errorMsg += "Invalid Video ID";
    else if (event.data === 5) errorMsg += "HTML5 Player Error";
    else if (event.data === 100) errorMsg += "Video Not Found";
    else if (event.data === 101 || event.data === 150) errorMsg += "Embedding Not Allowed";

    statusText.innerText = errorMsg;
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PLAYING) {
        isYoutubePlaying = true;

        // Sync: If video plays, start our timeline
        if (enableTimingCapture) {
            console.log("YouTube played -> Starting Timeline & Stealing Focus");
            if (!isPlaying) play();

            // CRITICAL: Steal focus back so Space bar triggers our listener, not YouTube pause
            // We do this after a short delay to ensure the player has finished its event handling
            setTimeout(() => {
                if (captureBtn) {
                    captureBtn.focus();
                } else {
                    window.focus();
                }
                statusText.innerText = "Recording! Press SPACE to mark.";
            }, 100);
        }
    } else if (event.data == YT.PlayerState.PAUSED || event.data == YT.PlayerState.ENDED) {
        isYoutubePlaying = false;

        // Sync: If video pauses, pause our timeline
        if (isPlaying && enableTimingCapture) {
            console.log("YouTube paused -> Pausing Timeline");
            pause();
        }
    } else {
        isYoutubePlaying = false;
    }
}

function extractVideoID(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length == 11) ? match[7] : false;
}

function toggleTimingCapture() {
    enableTimingCapture = !enableTimingCapture;

    // Toggle touch listener for iPad
    const timeline = document.getElementById('timeline');
    const touchHandler = (e) => {
        // Prevent default zoom/scroll if necessary, though we want some scrolling maybe?
        // e.preventDefault(); 
        if (e.target.closest('.chord-suggestion-btn')) return; // Don't trigger if clicking buttons

        recordChord("?");
    };

    if (enableTimingCapture) {
        captureBtn.classList.add('active');
        recordingIndicator.classList.remove('hidden');
        youtubePlayerContainer.classList.remove('hidden');

        // Add Touch/Click listener to background for easy recording
        if (timeline) {
            timeline.addEventListener('touchstart', touchHandler, { passive: true });
            // Also mousedown for testing on desktop
            timeline.addEventListener('mousedown', (e) => {
                if (!enableTimingCapture) return;
                if (e.target.closest('.chord-suggestion-btn') || e.target.closest('.chord-item')) return;
                recordChord("?");
            });
        }

        // Set up for capture
        audioEnabled = false; // Mute piano audio while recording to focus on video
        audioToggleBtn.classList.remove('active');

        statusText.innerText = "CAPTURING: Press SPACE to mark chords";
    } else {
        captureBtn.classList.remove('active');
        recordingIndicator.classList.add('hidden');
        youtubePlayerContainer.classList.add('hidden');

        // Stop YouTube if playing
        if (youtubePlayer) youtubePlayer.pauseVideo();
        if (isPlaying) pause();

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

    // Add new chord
    const newChord = {
        name: name,
        time: currentTime
    };

    // Insert in specific order
    chords.push(newChord);
    chords.sort((a, b) => a.time - b.time);

    // Refresh all elements to ensure correct order and indices
    renderStaticElements();
    updateLoop(); // Ensure immediate visual alignment
    checkForChanges();

    // Flash effect?
    const currentDisplay = document.getElementById('currentChordDisplay');
    if (currentDisplay) {
        const originalColor = currentDisplay.style.color;
        // Pulse red briefly to show registration
        currentDisplay.style.color = "#ef4444";
        setTimeout(() => {
            currentDisplay.style.color = originalColor || "";
        }, 300);
    }
}

const confirmationModal = new ConfirmationModal();
const chordEditModal = new ChordEditModal();

// --- Drag to Scroll (Seeking) Logic ---
let isDragging = false;
let dragStartX;
let dragStartTime;

timeline.addEventListener('pointerdown', (e) => {
    // Ignore if clicking interactive elements
    if (e.target.closest('.chord-item') || e.target.closest('.chord-suggestion-btn') || e.target.closest('button')) return;

    isDragging = true;
    timeline.classList.add('dragging');
    dragStartX = e.clientX;

    // Remember the time when we started dragging
    let initialT = isPlaying ? (performance.now() - startTime) / 1000 : pauseTime;
    if (Number.isNaN(initialT) || !Number.isFinite(initialT)) initialT = 0;
    dragStartTime = initialT;
});

window.addEventListener('pointerup', () => {
    if (isDragging) {
        isDragging = false;
        timeline.classList.remove('dragging');
        updateLoop(); // Final refresh after drag ends
    }
});

timeline.addEventListener('pointermove', (e) => {
    if (!isDragging) return;

    // On iPad, prevent default helps block browser-level gestures during drag
    e.preventDefault();

    const deltaX = e.clientX - dragStartX;
    // Map pixels back to seconds. Dragging left (negative deltaX) should advance time (positive deltaT)
    const deltaT = deltaX / PIXELS_PER_SECOND;

    let newTime = Math.max(0, dragStartTime - deltaT);
    if (Number.isNaN(newTime)) newTime = 0;

    if (isPlaying) {
        startTime = performance.now() - (newTime * 1000);
        if (youtubePlayer && enableTimingCapture) {
            youtubePlayer.seekTo(newTime, true);
        }
    } else {
        pauseTime = newTime;
        updateLoop(); // Update visual representative immediately
    }
});


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
        loadData(msg.data, msg.youtubeUrl, msg.title, msg.suggestedChords, msg.artist, msg.songTitle);
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

// Signal that we are ready to receive data
console.log('Scrolling Chords: Listener ready');
if (window.parent) {
    window.parent.postMessage({ type: 'scrollingChordsReady' }, '*');
} else if (window.opener) {
    window.opener.postMessage({ type: 'scrollingChordsReady' }, '*');
}
