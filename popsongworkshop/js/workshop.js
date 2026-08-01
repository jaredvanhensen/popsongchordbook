// Javascript for Pop Song Workshop Page

document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
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
        const emailTo = 'PopSongWorkshop@vanhensen.nl';
        const subject = encodeURIComponent(`Aanvraag Pop Song Workshop - ${school}`);
        
        let bodyText = `Beste Jared,\n\n`;
        bodyText += `Ik wil graag informatie/een offerte aanvragen voor een Pop Song Workshop op onze school.\n\n`;
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
