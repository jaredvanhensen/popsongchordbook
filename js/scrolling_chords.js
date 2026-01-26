// Scrolling Chords Logic

const midiInput = document.getElementById('midiInput');
const statusText = document.getElementById('statusText');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const timeline = document.getElementById('timeline');
const chordTrack = document.getElementById('chordTrack');
const instructions = document.getElementById('instructions');

let midiData = null;
let chords = []; // Array of { time: seconds, name: string }
let isPlaying = false;
let startTime = 0;
let pauseTime = 0;
let animationFrame;
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const PIXELS_PER_SECOND = 200; // Speed of scrolling

// Setup Event Listeners
midiInput.addEventListener('change', handleFileSelect);
playBtn.addEventListener('click', play);
pauseBtn.addEventListener('click', pause);

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
    if (file) processMidiFile(file);
});


async function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) processMidiFile(file);
}

async function processMidiFile(file) {
    statusText.innerText = 'Parsing MIDI...';
    instructions.style.display = 'none';

    try {
        const arrayBuffer = await file.arrayBuffer();
        const midi = new Midi(arrayBuffer);

        console.log('MIDI Parsed:', midi);
        midiData = midi;

        // Extract chords
        chords = extractChordsFromMidi(midi);

        if (chords.length === 0) {
            statusText.innerText = 'No chords detected in MIDI file.';
            return;
        }

        statusText.innerText = `Ready! ${chords.length} chords loaded. Tempo: ${Math.round(midi.header.tempos[0]?.bpm || 120)} BPM`;
        playBtn.disabled = false;
        renderStaticChords();

    } catch (error) {
        console.error(error);
        statusText.innerText = 'Error parsing MIDI file. Make sure it is a valid .mid file.';
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

    // Sort by time
    allNotes.sort((a, b) => a.time - b.time);

    // 2. Group simultaneous notes (chords)
    // We define a small window to consider notes as "simultaneous" (e.g., 50ms)
    const timeWindow = 0.05;
    const noteGroups = [];

    if (allNotes.length === 0) return [];

    let currentGroup = { time: allNotes[0].time, notes: [allNotes[0].midi] };

    for (let i = 1; i < allNotes.length; i++) {
        const note = allNotes[i];
        if (note.time - currentGroup.time < timeWindow) {
            // Add to current group
            if (!currentGroup.notes.includes(note.midi)) {
                currentGroup.notes.push(note.midi);
            }
        } else {
            // Finalize current group and start new one
            noteGroups.push(currentGroup);
            currentGroup = { time: note.time, notes: [note.midi] };
        }
    }
    noteGroups.push(currentGroup);

    // 3. Identify chords from note groups
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

    // 4. Filter out rapid changes or duplicates
    // Only keep if chord changes
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

function identifyChord(midiNotes) {
    if (midiNotes.length < 3) return null; // Need at least 3 notes for a triad

    // Convert to pitch classes (0-11)
    const pitchClasses = [...new Set(midiNotes.map(n => n % 12))].sort((a, b) => a - b);

    // Definitions
    const intervals = {
        major: [0, 4, 7],
        minor: [0, 3, 7],
        diminished: [0, 3, 6],
        augmented: [0, 4, 8],
        major7: [0, 4, 7, 11],
        minor7: [0, 3, 7, 10],
        dominant7: [0, 4, 7, 10]
    };

    // Try each pitch as root
    for (let root of pitchClasses) {
        // Normalize other notes relative to root
        const normalized = pitchClasses.map(p => (p - root + 12) % 12).sort((a, b) => a - b);

        // Check exact match (ignoring extra notes for now, naive matching)
        if (isSubset(intervals.major, normalized)) return NOTE_NAMES[root];
        if (isSubset(intervals.minor, normalized)) return NOTE_NAMES[root] + 'm';
        if (isSubset(intervals.dominant7, normalized)) return NOTE_NAMES[root] + '7';
        if (isSubset(intervals.major7, normalized)) return NOTE_NAMES[root] + 'maj7';
        if (isSubset(intervals.minor7, normalized)) return NOTE_NAMES[root] + 'm7';
        if (isSubset(intervals.diminished, normalized)) return NOTE_NAMES[root] + 'dim';
    }

    return null; // Could not identify simple chord
}

function isSubset(pattern, notes) {
    return pattern.every(p => notes.includes(p));
}

function renderStaticChords() {
    chordTrack.innerHTML = '';
    chords.forEach((chord, index) => {
        const el = document.createElement('div');
        el.className = 'chord-item';
        el.innerText = chord.name;
        el.dataset.index = index;
        // Initial position will be updated by animation loop
        chordTrack.appendChild(el);
    });
}

function play() {
    if (isPlaying) return;
    isPlaying = true;
    playBtn.disabled = true;
    pauseBtn.disabled = false;

    if (pauseTime > 0) {
        startTime = performance.now() - pauseTime;
    } else {
        startTime = performance.now();
    }

    requestAnimationFrame(updateLoop);
}

function pause() {
    isPlaying = false;
    playBtn.disabled = false;
    pauseBtn.disabled = true;
    pauseTime = performance.now() - startTime;
    cancelAnimationFrame(animationFrame);
}

function updateLoop() {
    if (!isPlaying) return;

    const now = performance.now();
    const playbackTime = (now - startTime) / 1000; // in seconds

    // Update chord positions
    // We want the chord to be at x=0 (left edge / playhead) when playbackTime == chord.time
    // position = (chord.time - playbackTime) * PIXELS_PER_SECOND

    const chordElements = document.querySelectorAll('.chord-item');

    chordElements.forEach((el, index) => {
        const chord = chords[index];
        const dist = (chord.time - playbackTime) * PIXELS_PER_SECOND;

        if (dist < -200 || dist > window.innerWidth + 200) {
            el.style.display = 'none'; // Optimize: hide if off screen
        } else {
            el.style.display = 'block';
            el.style.transform = `translateX(${dist}px) translateY(-50%)`;

            // Highlight active chord (just passed the playhead, within last 0.5s)
            const diff = playbackTime - chord.time;
            if (diff >= 0 && diff < 0.5) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        }
    });

    statusText.innerText = `Time: ${playbackTime.toFixed(1)}s`;

    animationFrame = requestAnimationFrame(updateLoop);
}
