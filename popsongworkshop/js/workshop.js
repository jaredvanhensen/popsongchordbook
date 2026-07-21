// Javascript for Pop Song Workshop Page

document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initInteractivePiano();
    initContactForm();
});

/* ==========================================================================
   Mobile Menu Logic
   ========================================================================== */
function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (!menuBtn || !navLinks) return;

    menuBtn.addEventListener('click', () => {
        menuBtn.classList.toggle('active');
        navLinks.classList.toggle('active');
    });

    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            menuBtn.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });
}

/* ==========================================================================
   Interactive Piano (Web Audio API)
   ========================================================================== */
function initInteractivePiano() {
    const piano = document.getElementById('interactive-piano');
    const display = document.getElementById('piano-note-display');
    if (!piano || !display) return;

    // Frequencies of C4 octave to C5
    const noteFrequencies = {
        'C4': 261.63,
        'C#4': 277.18,
        'D4': 293.66,
        'D#4': 311.13,
        'E4': 329.63,
        'F4': 349.23,
        'F#4': 369.99,
        'G4': 392.00,
        'G#4': 415.30,
        'A4': 440.00,
        'A#4': 466.16,
        'B4': 493.88,
        'C5': 523.25
    };

    let audioCtx = null;
    let activeOscillators = {}; // Keep track of active notes to prevent overlaps
    let isMouseDown = false;

    // Initialize Audio Context on user interaction to satisfy browser policies
    function getAudioContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    // Play Note
    function playNote(noteKey) {
        const ctx = getAudioContext();
        if (!ctx) return;

        const freq = noteFrequencies[noteKey];
        if (!freq) return;

        // If note is already playing, stop it first to prevent multiple instances
        stopNote(noteKey);

        // 1. Create Nodes
        const osc1 = ctx.createOscillator(); // Main voice
        const osc2 = ctx.createOscillator(); // Warm sub voice
        const gainNode = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        // 2. Configure Oscillators
        osc1.type = 'triangle'; // Smooth flute/keyboard sound
        osc1.frequency.setValueAtTime(freq, ctx.currentTime);

        osc2.type = 'sine'; // Deep sub backing
        osc2.frequency.setValueAtTime(freq, ctx.currentTime);

        // 3. Configure Filter (warm low-pass filter)
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1500, ctx.currentTime);

        // 4. Configure Envelope (ADSR)
        const now = ctx.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        // Attack
        gainNode.gain.linearRampToValueAtTime(0.35, now + 0.03);
        // Decay to Sustain
        gainNode.gain.exponentialRampToValueAtTime(0.18, now + 0.2);

        // 5. Connections
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        // 6. Start playing
        osc1.start(now);
        osc2.start(now);

        // Save reference for release
        activeOscillators[noteKey] = {
            osc1: osc1,
            osc2: osc2,
            gainNode: gainNode,
            startTime: now
        };

        // Update UI
        display.textContent = `Noot: ${noteKey.replace('4', '').replace('5', ' (Hoge C)')}`;
    }

    // Stop Note with smooth release envelope
    function stopNote(noteKey) {
        const oscData = activeOscillators[noteKey];
        if (!oscData) return;

        const ctx = audioCtx;
        if (!ctx) return;

        const now = ctx.currentTime;
        const gainNode = oscData.gainNode;

        // Cancel scheduled gain events and trigger release phase
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        // Release
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

        // Stop oscillators after release finishes
        oscData.osc1.stop(now + 0.45);
        oscData.osc2.stop(now + 0.45);

        // Remove tracking
        delete activeOscillators[noteKey];
    }

    // UI Event Handlers
    const keys = piano.querySelectorAll('.key');

    keys.forEach(key => {
        const note = key.dataset.note;
        const octave = key.dataset.octave;
        const fullNoteName = note + octave;

        // Event: Mouse Down
        key.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isMouseDown = true;
            key.classList.add('active');
            playNote(fullNoteName);
        });

        // Event: Mouse Enter (for swiping/sliding over keys)
        key.addEventListener('mouseenter', () => {
            if (isMouseDown) {
                key.classList.add('active');
                playNote(fullNoteName);
            }
        });

        // Event: Mouse Leave
        key.addEventListener('mouseleave', () => {
            key.classList.remove('active');
            stopNote(fullNoteName);
        });

        // Event: Mouse Up
        key.addEventListener('mouseup', () => {
            key.classList.remove('active');
            stopNote(fullNoteName);
        });

        // Touch Support (Mobile)
        key.addEventListener('touchstart', (e) => {
            e.preventDefault();
            key.classList.add('active');
            playNote(fullNoteName);
        });

        key.addEventListener('touchend', (e) => {
            e.preventDefault();
            key.classList.remove('active');
            stopNote(fullNoteName);
        });
    });

    // Reset mouse state if mouse goes outside the piano area
    window.addEventListener('mouseup', () => {
        isMouseDown = false;
    });
}

/* ==========================================================================
   Contact Form Handler
   ========================================================================== */
function initContactForm() {
    const form = document.getElementById('workshop-contact-form');
    const modal = document.getElementById('success-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');

    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // 1. Gather values
        const naam = document.getElementById('naam').value.trim();
        const email = document.getElementById('email').value.trim();
        const telefoon = document.getElementById('telefoon').value.trim();
        const school = document.getElementById('school').value.trim();
        const doelgroep = document.getElementById('doelgroep').value;
        const bericht = document.getElementById('bericht').value.trim();

        // 2. Construct Email Content
        const emailTo = 'jaredvanhensen@gmail.com'; // Adjust to preferred recipient
        const subject = encodeURIComponent(`Aanvraag Pop Song Workshop - ${school}`);
        
        let bodyText = `Beste Jared,\n\n`;
        bodyText += `Ik wil graag een Pop Song Workshop aanvragen voor onze school.\n\n`;
        bodyText += `--- Gegevens ---\n`;
        bodyText += `Naam contactpersoon: ${naam}\n`;
        bodyText += `E-mailadres: ${email}\n`;
        if (telefoon) {
            bodyText += `Telefoonnummer: ${telefoon}\n`;
        }
        bodyText += `School & Plaats: ${school}\n`;
        if (doelgroep) {
            bodyText += `Doelgroep: ${doelgroep}\n`;
        }
        bodyText += `\n--- Bericht / Vragen / Gewenste datum ---\n`;
        bodyText += `${bericht}\n\n`;
        bodyText += `Met vriendelijke groet,\n${naam}`;

        const body = encodeURIComponent(bodyText);

        // 3. Show Success Modal
        if (modal) {
            modal.classList.add('active');
        }

        // 4. Open mailto Link (after a short delay to allow the modal to display first)
        setTimeout(() => {
            window.location.href = `mailto:${emailTo}?subject=${subject}&body=${body}`;
        }, 800);
    });

    // Modal Close
    if (modal && closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            modal.classList.remove('active');
            form.reset();
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                form.reset();
            }
        });
    }
}
