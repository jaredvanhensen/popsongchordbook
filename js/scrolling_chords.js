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

// Check for embed mode
const urlParams = new URLSearchParams(window.location.search);
const isEmbed = urlParams.get('embed') === 'true';
if (isEmbed) {
    document.querySelector('a[href="index.html"]').style.display = 'none';
    document.body.style.background = 'transparent'; // Optional: transparent bg
}

let midiData = null;
let currentFileName = 'song';
let chords = []; // Array of { time: seconds, name: string }
let markers = []; // Array of { time: seconds, label: string, type: 'bar'|'beat' }
let isPlaying = false;
let startTime = 0;
let pauseTime = 0; // The timestamp in the song where we paused
let animationFrame;
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const PIXELS_PER_SECOND = 200; // Speed of scrolling

// Setup Event Listeners
midiInput.addEventListener('change', handleFileSelect);
playPauseBtn.addEventListener('click', togglePlayPause);
rwdBtn.addEventListener('click', () => seek(-10));
fwdBtn.addEventListener('click', () => seek(10));
exportBtn.addEventListener('click', exportToJSON);

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
    instructions.style.display = 'none';
}

function finishLoading(chordCount, bpm) {
    statusText.innerText = `Ready! ${chordCount} chords. Tempo: ${bpm} BPM`;
    playPauseBtn.disabled = false;
    exportBtn.disabled = false;

    // Reset playback
    pause();
    pauseTime = 0;

    renderStaticElements();
    updateLoop(); // Update once to set initial positions
}

function exportToJSON() {
    if (!chords || chords.length === 0) return;

    const exportData = {
        name: currentFileName,
        tempo: midiData.header.tempos[0]?.bpm || 120,
        duration: midiData.duration,
        chords: chords
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", currentFileName + "_chords.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
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
    isPlaying = true;
    playPauseBtn.innerText = '⏸ Pause';

    // resume from pauseTime
    startTime = performance.now() - (pauseTime * 1000);

    requestAnimationFrame(updateLoop);
}

function pause() {
    isPlaying = false;
    playPauseBtn.innerText = '▶ Play';

    const now = performance.now();
    pauseTime = (now - startTime) / 1000;

    cancelAnimationFrame(animationFrame);
}

function seek(deltaSeconds) {
    let currentTime = isPlaying ? (performance.now() - startTime) / 1000 : pauseTime;
    let newTime = Math.max(0, currentTime + deltaSeconds);

    if (isPlaying) {
        startTime = performance.now() - (newTime * 1000);
    } else {
        pauseTime = newTime;
        updateLoop(); // Updates position while paused
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
        playbackTime = (now - startTime) / 1000;
    } else {
        playbackTime = pauseTime;
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
            // Once it hits the playhead (dist <= 0), hide it from scroll track
            // because sticky display takes over
            if (dist <= 0) {
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
