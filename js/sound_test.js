document.addEventListener('DOMContentLoaded', () => {
    const player = new PianoAudioPlayer();
    let analyser = null;
    let dataArray = null;

    // UI Elements
    const sliders = {
        attack: document.getElementById('attackSlider'),
        decay: document.getElementById('decaySlider'),
        sustain: document.getElementById('sustainSlider'),
        release: document.getElementById('releaseSlider'),
        filter: document.getElementById('filterSlider'),
        reverb: document.getElementById('reverbSlider'),
        volume: document.getElementById('volumeSlider'),
        paramsOutput: document.getElementById('parametersOutput')
    };

    const displays = {
        attack: document.getElementById('attackVal'),
        decay: document.getElementById('decayVal'),
        sustain: document.getElementById('sustainVal'),
        release: document.getElementById('releaseVal'),
        filter: document.getElementById('filterVal'),
        reverb: document.getElementById('reverbVal'),
        volume: document.getElementById('volumeVal')
    };

    // Initialize UI from player defaults
    function syncUI() {
        sliders.attack.value = player.attack;
        sliders.decay.value = player.decay;
        sliders.sustain.value = player.sustain;
        sliders.release.value = player.release;
        sliders.filter.value = player.filterMult;

        updateDisplays();
    }

    function updateDisplays() {
        displays.attack.textContent = parseFloat(sliders.attack.value).toFixed(3) + 's';
        displays.decay.textContent = parseFloat(sliders.decay.value).toFixed(2) + 's';
        displays.sustain.textContent = parseFloat(sliders.sustain.value).toFixed(2);
        displays.release.textContent = parseFloat(sliders.release.value).toFixed(2) + 's';
        displays.filter.textContent = parseFloat(sliders.filter.value).toFixed(1) + 'x';
        displays.reverb.textContent = Math.round(parseFloat(sliders.reverb.value) * 100) + '%';
        displays.volume.textContent = Math.round(parseFloat(sliders.volume.value) * 100) + '%';

        updateExportString();
    }

    function updateExportString() {
        const activeCard = document.querySelector('.instrument-card.active');
        const instrument = activeCard ? activeCard.querySelector('.instrument-name').textContent : 'Custom';

        const params = [
            instrument,
            parseFloat(sliders.attack.value).toFixed(3),
            parseFloat(sliders.decay.value).toFixed(2),
            parseFloat(sliders.sustain.value).toFixed(2),
            parseFloat(sliders.release.value).toFixed(2),
            parseFloat(sliders.filter.value).toFixed(1) + 'x',
            Math.round(parseFloat(sliders.reverb.value) * 100) + '%'
        ];

        sliders.paramsOutput.value = params.join('\t');
    }

    window.copyParams = function () {
        sliders.paramsOutput.select();
        document.execCommand('copy');

        const feedback = document.getElementById('copyFeedback');
        feedback.style.display = 'inline';
        setTimeout(() => feedback.style.display = 'none', 2000);
    };

    // Slider Events
    Object.keys(sliders).forEach(key => {
        sliders[key].addEventListener('input', () => {
            updateDisplays();

            if (key === 'volume') {
                player.setVolume(parseFloat(sliders.volume.value));
            } else if (key === 'reverb') {
                player.setReverb(parseFloat(sliders.reverb.value));
            } else if (key === 'filter') {
                player.setFilterMult(parseFloat(sliders.filter.value));
            } else {
                player.setADSR(
                    parseFloat(sliders.attack.value),
                    parseFloat(sliders.decay.value),
                    parseFloat(sliders.sustain.value),
                    parseFloat(sliders.release.value)
                );
            }
        });
    });

    // Instrument Selection
    const instrumentCards = document.querySelectorAll('.instrument-card');
    instrumentCards.forEach(card => {
        card.addEventListener('click', () => {
            const type = card.dataset.sound;
            instrumentCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            player.setSound(type);
            syncUI();

            // Visual feedback - short beep
            player.playNote(72, 0.1, 0.3);
        });
    });

    // Hammer Switch
    const hammerSwitch = document.getElementById('hammerSwitch');
    hammerSwitch.addEventListener('click', () => {
        hammerSwitch.classList.toggle('on');
        player.hammerEnabled = hammerSwitch.classList.contains('on');
    });

    // Pads
    document.querySelectorAll('.sound-pad').forEach(pad => {
        pad.addEventListener('mousedown', () => {
            if (!player.isInitialized) {
                initAudio();
            }

            if (pad.dataset.type === 'chord') {
                const notes = pad.dataset.notes.split(',').map(n => parseInt(n));
                const isStrum = (player.currentSound === 'guitar-strum' || player.currentSound === 'ukulele');
                player.playChord(notes, 2.0, 0.6, 0.03, isStrum);
            } else {
                const note = parseInt(pad.dataset.note);
                player.playNote(note, 2.0, 0.6);
            }

            // Visual glow
            pad.style.background = 'rgba(255, 255, 255, 0.2)';
            setTimeout(() => pad.style.background = '', 150);
        });
    });

    // Sequence Test
    document.getElementById('playSequence').addEventListener('click', async () => {
        if (!player.isInitialized) await initAudio();

        const sequence = [60, 64, 67, 72, 67, 64, 60];
        const now = player.audioContext.currentTime;
        const speed = 0.2;

        sequence.forEach((note, i) => {
            player.playNote(note, 1.0, 0.5, now + (i * speed));
        });
    });

    document.getElementById('stopAll').addEventListener('click', () => {
        player.stopAll();
    });

    async function initAudio() {
        await player.initialize();

        // Setup Visualizer
        analyser = player.audioContext.createAnalyser();
        analyser.fftSize = 256;
        player.masterGain.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        draw();
    }

    // Visualizer Drawing
    const canvas = document.getElementById('visualizer');
    const ctx = canvas.getContext('2d');

    function draw() {
        requestAnimationFrame(draw);
        if (!analyser) return;

        analyser.getByteFrequencyData(dataArray);

        // Responsive canvas size
        if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / dataArray.length) * 2.5;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height;

            const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
            gradient.addColorStop(0, 'rgba(99, 102, 241, 0.1)');
            gradient.addColorStop(1, 'rgba(99, 102, 241, 0.8)');

            ctx.fillStyle = gradient;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

            x += barWidth + 1;
        }
    }

    // Initial Sync
    syncUI();
});
