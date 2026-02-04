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
const saveBtn = document.getElementById('saveBtn');
const clearDataBtn = document.getElementById('clearDataBtn');
const restartBtn = document.getElementById('restartBtn');
const audioToggleBtn = document.getElementById('audioToggleBtn');
const captureBtn = document.getElementById('captureBtn');
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
let audioEnabled = false;
let lastBeatPlayed = -1;
let lastChordPlayed = -1;
let audioCtx = null;
let pianoPlayer = null;
let chordParser = null;
let secondsPerBeat = 0.5; // Default 120 BPM
let beatsPerBar = 4; // Default 4/4

// Setup Event Listeners
midiInput.addEventListener('change', handleFileSelect);
playPauseBtn.addEventListener('click', togglePlayPause);
rwdBtn.addEventListener('click', () => seek(-10));
fwdBtn.addEventListener('click', () => seek(10));
exportBtn.addEventListener('click', exportToJSON);
saveBtn.addEventListener('click', saveToDatabase);
clearDataBtn.addEventListener('click', clearData);
metronomeBtn.addEventListener('click', toggleMetronome);
if (captureBtn) captureBtn.addEventListener('click', toggleTimingCapture);
audioToggleBtn.addEventListener('click', toggleAudio);
restartBtn.addEventListener('click', restart);

// Space bar recording
document.addEventListener("keydown", e => {
    if (!enableTimingCapture) return;
    if (e.code !== "Space") return;

    e.preventDefault();
    recordChord();
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

// Speed Toggle Logic
const speedBtn = document.getElementById('speedBtn');
let currentSpeed = 1.0;

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

function triggerChordAudio(chordName) {
    if (!audioEnabled || !pianoPlayer || !chordParser) return;

    // Stop previous chord for clean transition
    pianoPlayer.stopAll();

    // Resume context if needed
    if (pianoPlayer.audioContext && pianoPlayer.audioContext.state === 'suspended') {
        pianoPlayer.audioContext.resume();
    }

    const chord = chordParser.parse(chordName);
    if (chord && chord.notes) {
        // High duration since we stop it manually at next chord or pause
        pianoPlayer.playChord(chord.notes, 10.0, 0.4, 0.05);
    }
}

// Listen for messages from parent (for auto-loading stored data)
window.addEventListener('message', (event) => {
    if (!event.data) return;

    if (event.data.type === 'loadChordData') {
        console.log('Received chord data from parent');
        loadData(
            event.data.data,
            event.data.youtubeUrl,
            event.data.title,
            event.data.suggestedChords,
            event.data.artist,
            event.data.songTitle
        );
    }
    // NEW: Stop Audio Command (No-Unload Strategy)
    if (event.data.type === 'stopAudio') {
        console.log('Stopping audio via message');
        if (typeof isPlaying !== 'undefined' && isPlaying) {
            // Assuming pause() is defined globally
            pause();
        }
        // Also ensure piano player stops if it exists
        if (typeof pianoPlayer !== 'undefined' && pianoPlayer) {
            pianoPlayer.stopAll();
        }
        // Stop YouTube if playing
        if (typeof youtubePlayer !== 'undefined' && youtubePlayer && typeof youtubePlayer.pauseVideo === 'function') {
            youtubePlayer.pauseVideo();
        }
    }
});

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
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
});

// Chord Editing (Click)
chordTrack.addEventListener('click', (e) => {
    if (e.target.classList.contains('chord-item')) {
        e.stopPropagation(); // prevent other clicks

        // Auto-pause to allow editing
        if (isPlaying) pause();

        const index = parseInt(e.target.dataset.index);
        const currentName = chords[index].name;

        // Custom Professional Modal
        chordEditModal.show(currentName, (newName) => {
            if (newName && newName !== currentName) {
                chords[index].name = newName;
                e.target.innerText = newName;

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
    console.log('Loading Data:', { chordCount: data.chords?.length, url, suggestedCount: suggestedChords.length, artist, songTitle });

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
                        btn.onclick = () => {
                            if (enableTimingCapture) {
                                recordChord(chordName);
                            }
                        };
                        buttonsContainer.appendChild(btn);
                    });
                });
            } else {
                suggestedChords.forEach(chordName => {
                    const btn = document.createElement('button');
                    btn.className = 'chord-suggestion-btn';
                    btn.textContent = chordName;
                    btn.onclick = () => {
                        if (enableTimingCapture) {
                            recordChord(chordName);
                        }
                    };
                    buttonsContainer.appendChild(btn);
                });
            }

            // Appending "?" button as requested
            const qBtn = document.createElement('button');
            qBtn.className = 'chord-suggestion-btn';
            qBtn.textContent = '?';
            qBtn.title = 'Mark unknown chord';
            qBtn.onclick = () => {
                if (enableTimingCapture) {
                    recordChord("?");
                }
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
    } else {
        if (captureBtn) captureBtn.classList.add('hidden');
    }

    chords = data.chords;
    const duration = data.duration || (chords.length > 0 ? chords[chords.length - 1].time + 5 : 300);
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
    if (saveBtn) saveBtn.disabled = true;
    if (clearDataBtn) clearDataBtn.disabled = true;
    instructions.style.display = 'none';
}

function finishLoading(chordCount, bpm) {
    statusText.innerText = `Ready! ${chordCount} chords. Tempo: ${bpm} BPM`;
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
    const originalText = saveBtn.innerText;
    saveBtn.innerText = '✅ Saved';
    saveBtn.style.backgroundColor = '#00b894';
    setTimeout(() => {
        saveBtn.innerText = originalText;
        saveBtn.style.backgroundColor = ''; // Restore to CSS gradient
    }, 2000);
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

    // Add bar markers
    let barCount = 1;
    for (let t = 0; t <= duration; t += secondsPerBar) {
        markers.push({
            time: t,
            label: `Bar ${barCount}`,
            type: 'bar'
        });
        barCount++;
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
        // If Capture Mode is active with YouTube, we sync to YouTube time instead of performance.now()
        // but only if video is actually playing to avoid drift or buffering issues
        if (enableTimingCapture && youtubePlayer && youtubePlayer.getPlayerState() === 1) {
            const ytTime = youtubePlayer.getCurrentTime();
            // Smooth out small diffs or just Use it directly? Direct use is safer for sync.
            playbackTime = ytTime;

            // Sync our startTime reverse-calc so if we toggle off, it's correct
            startTime = now - (ytTime * 1000);
        } else {
            playbackTime = (now - startTime) / 1000;
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
        playbackTime = pauseTime;
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

    // Update scrolling chord positions
    const chordElements = chordTrack.children;
    for (let i = 0; i < chordElements.length; i++) {
        const el = chordElements[i];
        const chord = chords[i];
        const dist = (chord.time - playbackTime) * PIXELS_PER_SECOND;

        if (dist < -200 || dist > window.innerWidth + 200) {
            el.style.display = 'none';
        } else {
            // Once it hits the playhead background block (dist < ~140), hide it from scroll track
            // because sticky display takes over
            if (dist < 140) {
                el.style.opacity = '0';
            } else {
                el.style.opacity = '1';
                el.style.display = 'block';
                el.style.transform = `translateX(${dist}px) translateY(-50%)`;
            }
        }
    }

    // Update markers
    const markerElements = markerTrack.children;
    for (let i = 0; i < markerElements.length; i++) {
        const el = markerElements[i];
        const marker = markers[i]; // Assuming direct mapping if we didn't filter
        // Logic note: childNodes might include text nodes if not careful. children is safer.
        // Also markers array maps 1:1 if we appended in order.

        if (marker) {
            const dist = (marker.time - playbackTime) * PIXELS_PER_SECOND;
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
        youtubePlayer.loadVideoById(videoId);
    } else {
        console.log("Initializing YouTube Player with ID:", videoId);
        youtubePlayer = new YT.Player('youtubePlayer', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: {
                'playsinline': 1,
                'controls': 1,
                'rel': 0,
                'origin': window.location.origin // standard fix for some embedded issues
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

function recordChord(name = "?") {
    let currentTime;

    if (youtubePlayer && enableTimingCapture) {
        currentTime = youtubePlayer.getCurrentTime();
    } else {
        currentTime = isPlaying ? (performance.now() - startTime) / 1000 : pauseTime;
    }

    // Add new chord
    const newChord = {
        name: name,
        time: currentTime
    };

    // Insert in specific order
    chords.push(newChord);
    chords.sort((a, b) => a.time - b.time);

    // Performance Optimization: Append single element instead of full re-render

    const el = document.createElement('div');
    el.className = 'chord-item';
    el.innerText = newChord.name;
    el.dataset.index = chords.length - 1;

    // Initial position at 0 relative to playhead (since we just recorded it at current time)
    el.style.transform = `translateX(0px) translateY(-50%)`;
    el.style.display = 'block';

    chordTrack.appendChild(el);

    // Flash effect?
    const currentDisplay = document.getElementById('currentChordDisplay');
    const originalColor = currentDisplay.style.color;

    // Pulse red briefly to show registration
    currentDisplay.style.color = "#ef4444";
    setTimeout(() => {
        currentDisplay.style.color = originalColor;
    }, 300);
}

const confirmationModal = new ConfirmationModal();
const chordEditModal = new ChordEditModal();

// --- Drag to Scroll (Seeking) Logic ---
let isDragging = false;
let dragStartX;
let dragStartTime;

timeline.addEventListener('mousedown', (e) => {
    // Ignore if clicking interactive elements
    if (e.target.closest('.chord-item') || e.target.closest('.chord-suggestion-btn') || e.target.closest('button')) return;

    isDragging = true;
    timeline.classList.add('dragging');
    dragStartX = e.pageX;

    // Remember the time when we started dragging
    dragStartTime = isPlaying ? (performance.now() - startTime) / 1000 : pauseTime;
});

window.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        timeline.classList.remove('dragging');
    }
});

timeline.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();

    const deltaX = e.pageX - dragStartX;
    // Map pixels back to seconds. Dragging left (negative deltaX) should advance time (positive deltaT)
    const deltaT = deltaX / PIXELS_PER_SECOND;

    let newTime = Math.max(0, dragStartTime - deltaT);

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
