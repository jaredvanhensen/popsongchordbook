/**
 * Smart App Banner & Google Play Store Funnel + Smart 5-Star Review Prompt for PopSongChordBook
 * 1. Shows a sticky top "Open in App / Free on Google Play" banner for Android mobile browser visitors,
 *    while automatically hiding all Play Store download badges when running inside the installed Android App (TWA/PWA).
 * 2. Tracks song opens and shows a friendly, high-converting 5-Star Review Prompt after 3 opened songs
 *    (when returning from a song to the songlist), complete with 1-click copyable ASO keyword review templates
 *    and a 1-3 star feedback shield.
 */
(function () {
    const PLAY_STORE_PACKAGE = 'com.popsongchordbook.app';
    const PLAY_STORE_BASE_URL = `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}`;

    const STORAGE_KEYS = {
        OPENED_SONGS: 'pscb_opened_songs_v1',
        REVIEW_COMPLETED: 'pscb_review_completed_v1',
        REVIEW_DISMISSED: 'pscb_review_dismissed_v1',
        REVIEW_SNOOZED_UNTIL: 'pscb_review_snoozed_until_v1',
        SONGS_REQUIRED: 3
    };

    function isRunningInNativeOrInstalledApp() {
        try {
            if (sessionStorage.getItem('pscb_is_native_app') === '1' || window.isNativeAndroidApp) {
                return true;
            }
            const ua = navigator.userAgent || '';
            const ref = document.referrer || '';
            const search = window.location.search || '';

            // 1. Launched from Android TWA / Play Store app
            if (
                ref.includes('android-app://') ||
                ref.includes('com.popsongchordbook') ||
                search.includes('source=android') ||
                search.includes('utm_source=android')
            ) {
                sessionStorage.setItem('pscb_is_native_app', '1');
                return true;
            }

            // 2. Standalone / Fullscreen / Minimal-UI PWA or TWA mode
            const isStandalone = (window.matchMedia && (
                window.matchMedia('(display-mode: standalone)').matches ||
                window.matchMedia('(display-mode: fullscreen)').matches ||
                window.matchMedia('(display-mode: minimal-ui)').matches
            )) || window.navigator.standalone === true;

            if (isStandalone) {
                sessionStorage.setItem('pscb_is_native_app', '1');
                return true;
            }

            // 3. Android WebView wrapper
            if (/Android/i.test(ua) && (/; wv\)/i.test(ua) || /Version\/[\d.]+.*Chrome/i.test(ua))) {
                sessionStorage.setItem('pscb_is_native_app', '1');
                return true;
            }
        } catch (e) {
            // Ignore storage access errors in strict privacy modes
        }
        return false;
    }

    function detectLanguage() {
        try {
            const urlLang = new URLSearchParams(window.location.search).get('lang');
            if (urlLang === 'nl' || urlLang === 'en') return urlLang;
            if (document.documentElement.lang === 'nl') return 'nl';
            const stored = localStorage.getItem('preferredLanguage');
            if (stored === 'nl' || stored === 'en') return stored;
            if ((navigator.language || '').toLowerCase().startsWith('nl')) return 'nl';
        } catch (e) {}
        return 'en';
    }

    function injectStyles() {
        if (document.getElementById('pscb-smart-banner-styles')) return;
        const style = document.createElement('style');
        style.id = 'pscb-smart-banner-styles';
        style.textContent = `
            /* Always hide Play Store download badges when running inside the installed app */
            html.pscb-in-native-app .hide-in-native-app,
            html.pscb-in-native-app #pscbSmartAppBanner {
                display: none !important;
            }

            #pscbSmartAppBanner {
                background: linear-gradient(90deg, #0f172a 0%, #1e1b4b 55%, #1e293b 100%);
                color: #ffffff;
                padding: 8px 12px;
                border-bottom: 1px solid rgba(99, 102, 241, 0.35);
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.28);
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                position: sticky;
                top: 0;
                z-index: 9999;
                width: 100%;
                box-sizing: border-box;
                animation: pscbBannerSlideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            }

            @keyframes pscbBannerSlideDown {
                from { transform: translateY(-100%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }

            .pscb-banner-inner {
                max-width: 1200px;
                margin: 0 auto;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
            }

            .pscb-banner-close {
                background: transparent;
                border: none;
                color: rgba(255, 255, 255, 0.65);
                font-size: 20px;
                line-height: 1;
                padding: 4px 6px;
                cursor: pointer;
                flex-shrink: 0;
                border-radius: 6px;
                transition: color 0.15s, background 0.15s;
            }
            .pscb-banner-close:hover {
                color: #ffffff;
                background: rgba(255, 255, 255, 0.1);
            }

            .pscb-banner-app-info {
                display: flex;
                align-items: center;
                gap: 10px;
                min-width: 0;
                flex: 1;
                text-decoration: none;
                color: inherit;
            }

            .pscb-banner-icon {
                width: 40px;
                height: 40px;
                border-radius: 10px;
                object-fit: cover;
                flex-shrink: 0;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }

            .pscb-banner-text {
                display: flex;
                flex-direction: column;
                min-width: 0;
            }

            .pscb-banner-title {
                font-size: 0.88rem;
                font-weight: 800;
                color: #ffffff;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                line-height: 1.2;
            }

            .pscb-banner-sub {
                font-size: 0.73rem;
                color: #cbd5e1;
                display: flex;
                align-items: center;
                gap: 5px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                margin-top: 2px;
            }

            .pscb-banner-stars {
                color: #fbbf24;
                font-size: 0.75rem;
                letter-spacing: -0.5px;
            }

            .pscb-banner-cta {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                color: #ffffff !important;
                font-size: 0.78rem;
                font-weight: 800;
                padding: 8px 14px;
                border-radius: 999px;
                text-decoration: none;
                white-space: nowrap;
                flex-shrink: 0;
                box-shadow: 0 2px 10px rgba(34, 197, 94, 0.4);
                border: 1px solid rgba(255, 255, 255, 0.25);
                transition: transform 0.15s ease, filter 0.15s ease;
                letter-spacing: 0.02em;
            }

            .pscb-banner-cta:hover,
            .pscb-banner-cta:active {
                transform: scale(1.03);
                filter: brightness(1.08);
            }

            /* Hide banner in landscape timeline mode so it never steals playalong space */
            @media (max-height: 500px) and (orientation: landscape) {
                #pscbSmartAppBanner {
                    display: none !important;
                }
            }

            /* ==================== SMART 5-STAR REVIEW MODAL ==================== */
            #pscbReviewModalOverlay {
                position: fixed;
                inset: 0;
                background: rgba(15, 23, 42, 0.78);
                backdrop-filter: blur(6px);
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 16px;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                animation: pscbFadeIn 0.25s ease;
            }

            @keyframes pscbFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            .pscb-review-card {
                background: linear-gradient(180deg, #1e1b4b 0%, #0f172a 100%);
                color: #f8fafc;
                width: 100%;
                max-width: 460px;
                border-radius: 22px;
                border: 1px solid rgba(129, 140, 248, 0.35);
                box-shadow: 0 24px 60px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255,255,255,0.06) inset;
                padding: 24px 22px 20px;
                position: relative;
                text-align: center;
                box-sizing: border-box;
                max-height: 92vh;
                overflow-y: auto;
            }

            .pscb-review-close {
                position: absolute;
                top: 12px;
                right: 14px;
                background: rgba(255, 255, 255, 0.08);
                border: none;
                color: #94a3b8;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                font-size: 20px;
                line-height: 1;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.15s;
            }
            .pscb-review-close:hover {
                background: rgba(255, 255, 255, 0.18);
                color: #ffffff;
            }

            .pscb-review-header-icon {
                width: 60px;
                height: 60px;
                border-radius: 16px;
                margin: 0 auto 12px;
                box-shadow: 0 8px 24px rgba(99, 102, 241, 0.45);
                border: 2px solid rgba(255, 255, 255, 0.25);
                display: block;
            }

            .pscb-review-title {
                font-size: 1.25rem;
                font-weight: 800;
                margin: 0 0 8px;
                color: #ffffff;
                line-height: 1.3;
            }

            .pscb-review-desc {
                font-size: 0.88rem;
                color: #cbd5e1;
                line-height: 1.5;
                margin: 0 0 14px;
            }

            .pscb-star-picker {
                display: flex;
                justify-content: center;
                gap: 8px;
                margin: 8px 0 16px;
            }

            .pscb-star-btn {
                background: transparent;
                border: none;
                font-size: 2.2rem;
                line-height: 1;
                cursor: pointer;
                color: #475569;
                transition: transform 0.15s ease, color 0.15s ease, text-shadow 0.15s ease;
                padding: 2px;
            }
            .pscb-star-btn.active {
                color: #fbbf24;
                text-shadow: 0 0 16px rgba(251, 191, 36, 0.55);
            }
            .pscb-star-btn:hover {
                transform: scale(1.18);
            }

            .pscb-keyword-box {
                background: rgba(30, 41, 59, 0.85);
                border: 1px solid rgba(99, 102, 241, 0.35);
                border-radius: 14px;
                padding: 12px;
                margin-bottom: 16px;
                text-align: left;
            }

            .pscb-keyword-box-title {
                font-size: 0.78rem;
                font-weight: 700;
                color: #a5b4fc;
                margin: 0 0 8px;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .pscb-sample-item {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 10px;
                background: rgba(15, 23, 42, 0.75);
                border: 1px solid rgba(148, 163, 184, 0.22);
                border-radius: 10px;
                padding: 8px 10px;
                margin-bottom: 6px;
                cursor: pointer;
                transition: border-color 0.15s, background 0.15s;
                font-size: 0.78rem;
                color: #e2e8f0;
                line-height: 1.4;
            }
            .pscb-sample-item span:first-child {
                flex: 1;
                min-width: 0;
                word-break: break-word;
            }
            .pscb-sample-item:last-child {
                margin-bottom: 0;
            }
            .pscb-sample-item:hover {
                border-color: #fbbf24;
                background: rgba(30, 41, 59, 0.95);
            }
            .pscb-sample-item.copied {
                border-color: #22c55e;
                background: rgba(22, 163, 74, 0.18);
            }

            .pscb-copy-badge {
                font-size: 0.7rem;
                font-weight: 700;
                color: #fbbf24;
                background: rgba(251, 191, 36, 0.14);
                padding: 3px 7px;
                border-radius: 6px;
                white-space: nowrap;
                flex-shrink: 0;
                margin-top: 1px;
            }
            .pscb-sample-item.copied .pscb-copy-badge {
                color: #4ade80;
                background: rgba(34, 197, 94, 0.2);
            }

            .pscb-review-primary-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                width: 100%;
                padding: 13px 18px;
                background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                color: #ffffff !important;
                font-size: 0.96rem;
                font-weight: 800;
                border: none;
                border-radius: 12px;
                cursor: pointer;
                text-decoration: none;
                box-shadow: 0 6px 20px rgba(34, 197, 94, 0.4);
                transition: transform 0.15s, filter 0.15s;
                box-sizing: border-box;
            }
            .pscb-review-primary-btn:hover {
                transform: translateY(-1px);
                filter: brightness(1.06);
            }

            .pscb-feedback-shield {
                display: none;
                text-align: left;
                margin-bottom: 14px;
            }
            .pscb-feedback-textarea {
                width: 100%;
                min-height: 80px;
                border-radius: 10px;
                border: 1px solid rgba(148, 163, 184, 0.35);
                background: rgba(15, 23, 42, 0.85);
                color: #ffffff;
                padding: 10px;
                font-size: 0.85rem;
                font-family: inherit;
                box-sizing: border-box;
                margin-top: 8px;
                resize: vertical;
            }

            .pscb-review-footer-links {
                display: flex;
                justify-content: center;
                gap: 16px;
                margin-top: 14px;
            }
            .pscb-review-already-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                width: 100%;
                box-sizing: border-box;
                padding: 9px 14px;
                background: rgba(34, 197, 94, 0.14);
                border: 1px solid rgba(34, 197, 94, 0.45);
                color: #86efac;
                font-size: 0.82rem;
                font-weight: 700;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.2s ease;
                margin: 10px 0 6px 0;
                font-family: inherit;
            }
            .pscb-review-already-btn:hover {
                background: rgba(34, 197, 94, 0.28);
                border-color: rgba(34, 197, 94, 0.7);
                color: #bbf7d0;
                transform: translateY(-1px);
            }
            .pscb-review-link-btn {
                background: transparent;
                border: none;
                color: #94a3b8;
                font-size: 0.78rem;
                cursor: pointer;
                padding: 4px 6px;
                text-decoration: underline;
            }
            .pscb-review-link-btn:hover {
                color: #e2e8f0;
            }
        `;
        document.head.appendChild(style);
    }

    function getBannerTranslations(lang) {
        if (lang === 'nl') {
            return {
                title: 'PopSongChordBook App',
                sub: 'Gratis in Google Play',
                cta: 'OPEN IN APP',
                closeLabel: 'Sluiten'
            };
        }
        return {
            title: 'PopSongChordBook App',
            sub: 'Free on Google Play',
            cta: 'OPEN IN APP',
            closeLabel: 'Close'
        };
    }

    function getReviewTranslations(lang) {
        if (lang === 'nl') {
            return {
                title: 'Blij met Pop Song Chord Book? 🎸🎹',
                desc: 'Ik bouw deze app als muziekliefhebber zonder reclamebudgetten. Met een korte 5-sterren review in Google Play help je enorm zodat andere muzikanten de app ook kunnen vinden!',
                tipTitle: '💡 Optioneel: klik op een zin om als opzetje te kopiëren:',
                shuffleBtn: '🔄 Andere zinnen',
                samplesPool: [
                    'Top songbook app met duidelijke akkoorden en teksten voor gitaar en piano!',
                    'Super fijn digitaal akkoordenboek! Vooral de transpose en tijdlijn werken geweldig.',
                    'Beste gratis chord book & songbook app voor popklassiekers op telefoon en tablet.',
                    'Eindelijk een overzichtelijke akkoorden app zonder rommelige tabs. Aanrader voor gitaristen!',
                    'Heerlijke app om piano en keyboard mee te oefenen, de meespeel-tijdlijn is echt uniek.',
                    'Wij gebruiken dit songbook inmiddels bij elke bandrepetitie. Snel transponeren en altijd strak in de maat.',
                    'Fijne collectie popsongs met kloppende akkoordenschema\'s en duidelijke songstructuur.',
                    'Ideaal hulpmiddel voor gitaar en zang! Met 1 tik staat een nummer in de juiste toonsoort.',
                    'Veel fijner en moderner dan de bekende betaalde songbook apps. Echt met liefde voor muziek gemaakt!',
                    'Super handig voor bij het kampvuur en thuis op de bank met mijn akoestische gitaar.',
                    'De combinatie van akkoorden, songteksten en YouTube meespelen werkt echt fantastisch.',
                    'Overzichtelijk akkoordenboek met goede popklassiekers. Ook de beginnerslessen zijn erg leuk!',
                    'Mijn favoriete muziek-app op mijn tablet! Geen gedoe meer met losse papieren akkoordenschema\'s.',
                    'Erg blij met de Nashville-nummers en snelle capo/transpose functie. Top voor muzikanten!',
                    'Geweldige gratis songbook app! De akkoorden lopen mooi synchroon mee op het scherm.',
                    'Als toetsenist zocht ik al lang naar zo\'n duidelijk akkoordenboek voor bekende popnummers.',
                    'Praktische en mooie chordbook app, je merkt meteen dat dit door een echte muzikant is gebouwd.',
                    'Heel fijn om snel nieuwe nummers op gitaar of piano in te studeren. Dikke 5 sterren!',
                    'Duidelijke akkoorddiagrammen, goede songlist en alles werkt lekker snel op Android.',
                    'Onmisbare app op mijn muziekstandaard! Setlists maken en akkoorden lezen gaat super soepel.',
                    'Fantastisch alternatief voor SongbookPro, veel muzikaler opgezet met de scrollende akkoorden.',
                    'Eindelijk kloppende akkoorden per maat in plaats van verschoven woorden boven een tekst!',
                    'Zowel voor beginners als gevorderde bandspelers een geweldig digitaal songbook.',
                    'Speel nu elke avond weer met plezier piano dankzij deze interactieve akkoorden-app!'
                ],
                copyBadge: '📋 Kopieer',
                copiedBadge: '✓ Gekopieerd!',
                primaryCta: '⭐ Geef 5 Sterren in Google Play',
                feedbackLabel: 'Wat kunnen we verbeteren of welk nummer mis je? Laat het ons direct weten:',
                feedbackPlaceholder: 'Typ hier je suggestie, wens of opmerking...',
                feedbackSubmit: '✉️ Stuur Feedback naar de Maker',
                feedbackThanks: 'Bedankt voor je feedback! We gaan ermee aan de slag.',
                laterBtn: 'Later herinneren',
                neverBtn: 'Al beoordeeld / Niet meer tonen',
                alreadyReviewedBtn: 'Ik heb al een review geplaatst (verberg knop)',
                reviewConfirmedToast: 'Dankjewel voor je review! De beoordelingsknop is nu definitief verborgen.'
            };
        }
        return {
            returnObj: true,
            title: 'Enjoying Pop Song Chord Book? 🎸🎹',
            desc: 'I built this app as a music lover without ad budgets. A short 5-star review on Google Play helps enormously so other musicians can find the app too!',
            tipTitle: '💡 Optional: tap a phrase to copy as inspiration:',
            shuffleBtn: '🔄 More phrases',
            samplesPool: [
                'Great interactive songbook app with accurate guitar and piano chords!',
                'Best digital chord book! The instant transpose and chord timeline work brilliantly.',
                'Awesome free pop songbook and chord chart app for practicing and band rehearsals.',
                'Finally a clean chord app where chords actually line up bar by bar instead of messy tabs!',
                'Love playing piano along with the scrolling chord timeline. Super intuitive for musicians.',
                'Our cover band uses this songbook at every rehearsal now. Instant key transpose is a lifesaver!',
                'Way better and more musical than traditional PDF songbook apps. Highly recommended!',
                'Fantastic collection of pop and rock classics with spot-on chord progressions and lyrics.',
                'Perfect companion for acoustic guitar practice—capo and key changes take just one tap.',
                'You can tell this chord book was built by a real musician. Clean, fast, and super helpful!',
                'My go-to digital music stand on my Android tablet. No more carrying heavy binders of chord sheets!',
                'The scrolling chords + YouTube playalong feature makes learning new songs so much faster.',
                'Great chord library and beginner lessons for both guitar and keyboard players. 5 stars!',
                'Love the Nashville Number System support and clean song structures (Intro, Verse, Chorus).',
                'Best free songbook app on Google Play! Accurate chords and zero clutter.',
                'Super helpful for singing and playing guitar at the same time—auto-scroll keeps perfect tempo.',
                'As a keyboard player, having clear bar-by-bar chord charts for 600+ pop songs is pure gold.',
                'Replaced my old songbook app with this one. The live timeline and backing rhythms are amazing!',
                'Easy to read chord charts, great song selection, and super smooth on both phone and tablet.',
                'Wonderful tool for music teachers and students alike. Learning pop songs has never been easier!',
                'Such a hidden gem on the Play Store for guitarists and piano players. Deserves way more downloads!',
                'Creating custom setlists and transposing songs on the fly for gigs works like a charm.',
                'Accurate chords, clear lyrics, and a great Circle of Fifths tool built right in.',
                'Makes practicing guitar every evening so much fun. Thank you for building this songbook!'
            ],
            copyBadge: '📋 Copy',
            copiedBadge: '✓ Copied!',
            primaryCta: '⭐ Rate 5 Stars on Google Play',
            feedbackLabel: 'What can we improve or what song are you missing? Let us know directly:',
            feedbackPlaceholder: 'Type your suggestion or song request here...',
            feedbackSubmit: '✉️ Send Feedback to Developer',
            feedbackThanks: 'Thank you for your feedback! We really appreciate it.',
            laterBtn: 'Remind me later',
            neverBtn: 'Already rated / Don\'t show again',
            alreadyReviewedBtn: 'I already submitted a review (hide button)',
            reviewConfirmedToast: 'Thank you for your review! The rating button is now permanently hidden.'
        };
    }

    const FIREBASE_DB_URL = 'https://popsongchordbook-jared-default-rtdb.europe-west1.firebasedatabase.app';
    const REVIEW_POOL_STORAGE_KEY = 'pscb_review_pool_v1';
    const USED_REVIEW_IDS_STORAGE_KEY = 'pscb_used_review_ids_v1';

    function getDefaultPoolObjects(t, lang) {
        return (t.samplesPool || []).map((text, idx) => ({
            id: `${lang}_${idx + 1}`,
            text: text,
            used: false,
            usedAt: null
        }));
    }

    function normalizePoolLangArray(rawLangData, fallbackItems) {
        const fallbacks = (Array.isArray(fallbackItems) && fallbackItems.length > 0) ? fallbackItems : [];
        if (!rawLangData) return fallbacks;

        const fallbackMap = new Map();
        fallbacks.forEach(item => {
            if (item && item.id) fallbackMap.set(item.id, item);
        });

        // Initialize merged map with cloned fallback items
        const mergedMap = new Map();
        fallbacks.forEach(item => {
            mergedMap.set(item.id, {
                id: item.id,
                text: item.text || '',
                used: Boolean(item.used),
                usedAt: item.usedAt || null,
                order: typeof item.order === 'number' ? item.order : 9999
            });
        });

        // Convert rawLangData into list of items
        let rawList = [];
        if (Array.isArray(rawLangData)) {
            rawList = rawLangData.filter(Boolean).map((item, idx) => {
                if (typeof item === 'string') return { id: `item_${idx}`, text: item };
                return { id: item.id || `item_${idx}`, ...item };
            });
        } else if (typeof rawLangData === 'object') {
            rawList = Object.keys(rawLangData).map(k => {
                const item = rawLangData[k];
                if (!item) return null;
                if (typeof item === 'string') return { id: k, text: item };
                return { id: item.id || k, ...item };
            }).filter(Boolean);
        }

        // Apply raw data updates over mergedMap
        rawList.forEach((rawItem, idx) => {
            const id = rawItem.id || `item_${idx}`;
            const fallback = fallbackMap.get(id);
            const existing = mergedMap.get(id);

            // Determine text: prefer valid non-empty rawItem.text, else fallback.text, else existing.text
            const rawText = typeof rawItem.text === 'string' ? rawItem.text.trim() : '';
            const fallbackText = fallback && typeof fallback.text === 'string' ? fallback.text.trim() : '';
            const existingText = existing && typeof existing.text === 'string' ? existing.text.trim() : '';
            const resolvedText = rawText || fallbackText || existingText;

            // Only store item if it has actual text
            if (resolvedText) {
                const used = rawItem.used !== undefined ? Boolean(rawItem.used) : (existing ? existing.used : false);
                const usedAt = rawItem.usedAt || (existing ? existing.usedAt : null);
                const order = typeof rawItem.order === 'number' ? rawItem.order : (existing && typeof existing.order === 'number' ? existing.order : idx);

                mergedMap.set(id, {
                    id: id,
                    text: resolvedText,
                    used: used,
                    usedAt: usedAt,
                    order: order
                });
            }
        });

        // Filter out any item that has empty or whitespace-only text
        const result = Array.from(mergedMap.values()).filter(item => item && typeof item.text === 'string' && item.text.trim().length > 0);
        return result.length > 0 ? result : fallbacks;
    }

    function getLocalReviewPoolForLang(lang, t) {
        const defaults = getDefaultPoolObjects(t, lang);
        let list = defaults;
        try {
            const rawPool = localStorage.getItem(REVIEW_POOL_STORAGE_KEY);
            if (rawPool) {
                const parsed = JSON.parse(rawPool);
                if (parsed && parsed[lang]) {
                    list = normalizePoolLangArray(parsed[lang], defaults);
                }
            }
        } catch (e) {}

        try {
            const rawUsed = localStorage.getItem(USED_REVIEW_IDS_STORAGE_KEY);
            const usedMap = rawUsed ? JSON.parse(rawUsed) : {};
            list.forEach(item => {
                if (usedMap[item.id]) {
                    item.used = true;
                    item.usedAt = item.usedAt || usedMap[item.id];
                }
            });
        } catch (e) {}

        return list;
    }

    async function fetchRemoteReviewPoolForLang(lang, t) {
        const localList = getLocalReviewPoolForLang(lang, t);
        let localUpdatedAt = 0;
        try {
            const rawPool = localStorage.getItem(REVIEW_POOL_STORAGE_KEY);
            if (rawPool) {
                const parsed = JSON.parse(rawPool);
                localUpdatedAt = Number(parsed && parsed.updatedAt) || 0;
            }
        } catch (e) {}

        try {
            const resp = await fetch(`${FIREBASE_DB_URL}/settings/reviewTexts.json`, { cache: 'no-store' });
            if (resp.ok) {
                const rootData = await resp.json();
                if (rootData && rootData[lang]) {
                    const remoteUpdatedAt = Number(rootData.updatedAt) || 0;
                    const remoteList = normalizePoolLangArray(rootData[lang], localList);
                    const rawUsed = localStorage.getItem(USED_REVIEW_IDS_STORAGE_KEY);
                    const usedMap = rawUsed ? JSON.parse(rawUsed) : {};

                    // If localStorage has newer edits than remote Firebase, keep localList texts and merge remote used flags
                    const baseList = (localUpdatedAt > remoteUpdatedAt) ? localList : remoteList;
                    baseList.forEach(item => {
                        const rMatch = remoteList.find(r => r.id === item.id);
                        if (usedMap[item.id] || (rMatch && rMatch.used)) {
                            item.used = true;
                        }
                    });
                    const valid = baseList.filter(item => item && typeof item.text === 'string' && item.text.trim().length > 0);
                    return valid.length > 0 ? valid : localList;
                }
            }
        } catch (e) {}
        return localList;
    }

    function markReviewItemUsedState(lang, itemId, isUsed) {
        if (!itemId) return;
        const nowIso = isUsed ? new Date().toISOString() : null;

        // 1. Update local used IDs map
        try {
            const rawUsed = localStorage.getItem(USED_REVIEW_IDS_STORAGE_KEY);
            const usedMap = rawUsed ? JSON.parse(rawUsed) : {};
            if (isUsed) {
                usedMap[itemId] = nowIso;
            } else {
                delete usedMap[itemId];
            }
            localStorage.setItem(USED_REVIEW_IDS_STORAGE_KEY, JSON.stringify(usedMap));
        } catch (e) {}

        // 2. Update local pool cache
        try {
            const rawPool = localStorage.getItem(REVIEW_POOL_STORAGE_KEY);
            let pool = rawPool ? JSON.parse(rawPool) : null;
            if (!pool) {
                pool = {
                    nl: getDefaultPoolObjects(getReviewTranslations('nl'), 'nl'),
                    en: getDefaultPoolObjects(getReviewTranslations('en'), 'en')
                };
            }
            if (Array.isArray(pool[lang])) {
                const target = pool[lang].find(x => x.id === itemId);
                if (target) {
                    target.used = Boolean(isUsed);
                    target.usedAt = nowIso;
                }
                localStorage.setItem(REVIEW_POOL_STORAGE_KEY, JSON.stringify(pool));
            }
        } catch (e) {}

        // 3. Also update popSongPromoSuite in localStorage if Admin dashboard is on same browser
        try {
            const rawSuite = localStorage.getItem('popSongPromoSuite');
            if (rawSuite) {
                const suite = JSON.parse(rawSuite);
                if (suite && suite.reviewTexts && Array.isArray(suite.reviewTexts[lang])) {
                    const target = suite.reviewTexts[lang].find(x => x.id === itemId);
                    if (target) {
                        target.used = Boolean(isUsed);
                        target.usedAt = nowIso;
                        localStorage.setItem('popSongPromoSuite', JSON.stringify(suite));
                    }
                }
            }
        } catch (e) {}

        // 4. Update Firebase Realtime Database (settings/reviewTexts/$lang/$itemId)
        try {
            if (window.firebase && typeof window.firebase.database === 'function') {
                window.firebase.database().ref(`settings/reviewTexts/${lang}/${itemId}`).update({
                    used: Boolean(isUsed),
                    usedAt: nowIso
                }).catch(() => {});
            } else {
                fetch(`${FIREBASE_DB_URL}/settings/reviewTexts/${lang}/${encodeURIComponent(itemId)}.json`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ used: Boolean(isUsed), usedAt: nowIso })
                }).catch(() => {});
            }
        } catch (e) {}
    }

    function isReviewAlreadyDone() {
        try {
            const keys = [
                STORAGE_KEYS.REVIEW_COMPLETED,
                'pscb_review_completed',
                STORAGE_KEYS.REVIEW_DISMISSED,
                'pscb_review_dismissed',
                'pscb_review_completed_v1',
                'pscb_review_dismissed_v1',
                'pscb_reviewed',
                'review_completed',
                'app_reviewed'
            ];
            for (let i = 0; i < keys.length; i++) {
                const val = localStorage.getItem(keys[i]);
                if (val === '1' || val === 'true' || val === true) return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    function markReviewDoneLocally() {
        try {
            const keys = [
                STORAGE_KEYS.REVIEW_COMPLETED,
                'pscb_review_completed',
                STORAGE_KEYS.REVIEW_DISMISSED,
                'pscb_review_dismissed',
                'pscb_review_completed_v1',
                'pscb_review_dismissed_v1',
                'pscb_reviewed',
                'review_completed',
                'app_reviewed'
            ];
            keys.forEach(k => {
                try { localStorage.setItem(k, '1'); } catch (e) {}
            });
        } catch (e) {}
    }

    function markReviewDismissedLocally() {
        markReviewDoneLocally();
    }

    function hideSidebarRateButton() {
        const rateBtn = document.getElementById('btnRateAppSidebar');
        if (rateBtn) {
            rateBtn.style.display = 'none';
            rateBtn.setAttribute('data-hidden-by-review', '1');
        }
    }

    function syncReviewStatusWithFirebaseUser() {
        try {
            const hasFirebaseApps = window.firebase && typeof window.firebase.apps !== 'undefined' && window.firebase.apps.length > 0;
            const auth = (hasFirebaseApps && typeof window.firebase.auth === 'function') 
                ? window.firebase.auth() 
                : (window.firebaseManager && window.firebaseManager.auth ? window.firebaseManager.auth : null);
            const user = auth && auth.currentUser;
            if (!user || !user.uid) return;
            const db = (hasFirebaseApps && typeof window.firebase.database === 'function') 
                ? window.firebase.database() 
                : (window.firebaseManager && window.firebaseManager.database ? window.firebaseManager.database : null);
            if (!db) return;

            const userPrefRef = db.ref(`users/${user.uid}/preferences/review_completed`);
            if (isReviewAlreadyDone()) {
                userPrefRef.set(true).catch(() => {});
            } else {
                userPrefRef.once('value').then(snap => {
                    const val = snap.val();
                    if (val === true || val === 'true' || val === 1 || val === '1') {
                        markReviewDoneLocally();
                        hideSidebarRateButton();
                    }
                }).catch(() => {});
            }
        } catch (e) {}
    }

    function setupFirebaseAuthSync() {
        function tryAttach() {
            try {
                if (window.firebase && typeof window.firebase.apps !== 'undefined' && window.firebase.apps.length > 0 && typeof window.firebase.auth === 'function') {
                    window.firebase.auth().onAuthStateChanged((user) => {
                        if (user) {
                            syncReviewStatusWithFirebaseUser();
                        }
                    });
                    return true;
                }
            } catch (e) {}
            return false;
        }

        if (!tryAttach()) {
            let count = 0;
            const timer = setInterval(() => {
                count++;
                if (tryAttach() || count > 30) {
                    clearInterval(timer);
                }
            }, 500);
        }
    }

    function checkAndApplyRateButtonVisibility() {
        if (isReviewAlreadyDone()) {
            hideSidebarRateButton();
        }
        syncReviewStatusWithFirebaseUser();
    }

    function pickRandomUnusedItems(poolItems, count, excludeIds) {
        const validItems = (poolItems || []).filter(item => item && typeof item.text === 'string' && item.text.trim().length > 0);
        const unused = validItems.filter(item => !item.used);
        const notDisplayed = unused.filter(item => !excludeIds || !excludeIds.includes(item.id));
        const source = notDisplayed.length >= count ? notDisplayed : (unused.length > 0 ? unused : validItems);
        const copy = source.slice();
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = copy[i];
            copy[i] = copy[j];
            copy[j] = temp;
        }
        return copy.slice(0, count);
    }

    function updateSmartBannerLanguage() {
        const banner = document.getElementById('pscbSmartAppBanner');
        if (!banner) return;
        const lang = detectLanguage();
        const t = getBannerTranslations(lang);
        const titleEl = banner.querySelector('.pscb-banner-title');
        const subTextEl = banner.querySelector('.pscb-banner-sub-text');
        const ctaTextEl = banner.querySelector('.pscb-banner-cta-text');
        if (titleEl) titleEl.textContent = t.title;
        if (subTextEl) subTextEl.textContent = t.sub;
        if (ctaTextEl) ctaTextEl.textContent = t.cta;
    }

    function renderSmartBanner() {
        injectStyles();

        const inNativeApp = isRunningInNativeOrInstalledApp();
        const urlParams = new URLSearchParams(window.location.search);
        const forceTestBanner = urlParams.get('testBanner') === '1';
        const forceTestReview = urlParams.get('testReview') === '1' || urlParams.get('review') === '1';

        if (forceTestReview) {
            setTimeout(() => openReviewModal(true), 400);
        }

        if (inNativeApp && !forceTestBanner) {
            document.documentElement.classList.add('pscb-in-native-app');
            return;
        }

        const isAndroid = /Android/i.test(navigator.userAgent || '');
        if (!isAndroid && !forceTestBanner) {
            return;
        }

        try {
            if (sessionStorage.getItem('pscb_banner_dismissed') === '1' && !forceTestBanner) {
                return;
            }
        } catch (e) {}

        if (document.getElementById('pscbSmartAppBanner')) return;

        const lang = detectLanguage();
        const t = getBannerTranslations(lang);
        const pageSource = encodeURIComponent(window.location.pathname.replace(/\//g, '_') || 'home');
        const playUrl = `${PLAY_STORE_BASE_URL}&referrer=${encodeURIComponent(`utm_source=website&utm_medium=smart_banner&utm_campaign=${pageSource}`)}`;

        const banner = document.createElement('div');
        banner.id = 'pscbSmartAppBanner';
        banner.setAttribute('role', 'region');
        banner.setAttribute('aria-label', 'Download Android App');

        banner.innerHTML = `
            <div class="pscb-banner-inner">
                <button type="button" class="pscb-banner-close" aria-label="${t.closeLabel}" title="${t.closeLabel}">&times;</button>
                <a href="${playUrl}" target="_blank" rel="noopener" class="pscb-banner-app-info">
                    <img src="/images/pwa_icon_192.png" alt="PopSongChordBook" class="pscb-banner-icon">
                    <div class="pscb-banner-text">
                        <span class="pscb-banner-title">${t.title}</span>
                        <span class="pscb-banner-sub">
                            <span class="pscb-banner-stars">★★★★★</span>
                            <span>•</span>
                            <span class="pscb-banner-sub-text">${t.sub}</span>
                        </span>
                    </div>
                </a>
                <a href="${playUrl}" target="_blank" rel="noopener" class="pscb-banner-cta">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0;">
                        <path d="M3.609 1.814L13.792 12 3.61 22.186a1.96 1.96 0 0 1-.497-1.314V3.128c0-.508.19-.968.496-1.314zm11.29 11.29l2.765 2.765-10.97 6.334 8.205-9.099zm3.822-3.368l2.583 1.491c.735.424.735 1.122 0 1.546l-2.583 1.491-2.828-2.264 2.828-2.264zM6.694 1.819l10.97 6.334-2.765 2.765L6.694 1.819z"/>
                    </svg>
                    <span class="pscb-banner-cta-text">${t.cta}</span>
                </a>
            </div>
        `;

        const closeBtn = banner.querySelector('.pscb-banner-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function () {
                banner.remove();
                try {
                    sessionStorage.setItem('pscb_banner_dismissed', '1');
                } catch (e) {}
            });
        }

        if (document.body) {
            document.body.insertBefore(banner, document.body.firstChild);
        }
    }

    // ==================== REVIEW PROMPT LOGIC ====================

    function trackSongOpen(songId) {
        if (!songId) return;
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.OPENED_SONGS);
            let list = [];
            if (raw) {
                try { list = JSON.parse(raw); } catch (e) { list = []; }
            }
            if (!Array.isArray(list)) list = [];
            const idStr = String(songId);
            if (!list.includes(idStr)) {
                list.push(idStr);
                if (list.length > 50) list = list.slice(-50);
                localStorage.setItem(STORAGE_KEYS.OPENED_SONGS, JSON.stringify(list));
            }
        } catch (e) {}
    }

    function shouldAutoShowReviewPrompt() {
        try {
            if (isReviewAlreadyDone()) return false;

            const snoozedUntil = parseInt(localStorage.getItem(STORAGE_KEYS.REVIEW_SNOOZED_UNTIL) || '0', 10);
            if (snoozedUntil && Date.now() < snoozedUntil) return false;

            const raw = localStorage.getItem(STORAGE_KEYS.OPENED_SONGS);
            const list = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(list) || list.length < STORAGE_KEYS.SONGS_REQUIRED) return false;

            // Auto-trigger on Android (both inside the TWA app and on Android browsers)
            const isAndroid = /Android/i.test(navigator.userAgent || '') || isRunningInNativeOrInstalledApp();
            return isAndroid;
        } catch (e) {
            return false;
        }
    }

    function checkReviewPromptOnSongClose() {
        if (shouldAutoShowReviewPrompt()) {
            setTimeout(() => openReviewModal(false), 350);
        }
    }

    function openReviewModal(isManualOrTest) {
        injectStyles();
        if (document.getElementById('pscbReviewModalOverlay')) return;

        const lang = detectLanguage();
        const t = getReviewTranslations(lang);
        const playReviewUrl = `${PLAY_STORE_BASE_URL}&referrer=${encodeURIComponent('utm_source=in_app_review_prompt&utm_medium=review_modal')}`;

        const overlay = document.createElement('div');
        overlay.id = 'pscbReviewModalOverlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');

        let poolItems = getLocalReviewPoolForLang(lang, t);
        let currentDisplayedItems = pickRandomUnusedItems(poolItems, 3, []);
        let sessionCopiedItemId = null;

        function buildSamplesMarkup(itemsList) {
            const valid = (itemsList || []).filter(item => item && typeof item.text === 'string' && item.text.trim().length > 0);
            return valid.map((item, idx) => `
                <div class="pscb-sample-item ${sessionCopiedItemId === item.id ? 'copied' : ''}" data-sample-idx="${idx}" data-sample-id="${item.id}" data-sample-text="${item.text.replace(/"/g, '&quot;')}">
                    <span>"${item.text}"</span>
                    <span class="pscb-copy-badge">${sessionCopiedItemId === item.id ? t.copiedBadge : t.copyBadge}</span>
                </div>
            `).join('');
        }

        overlay.innerHTML = `
            <div class="pscb-review-card">
                <button type="button" class="pscb-review-close" aria-label="Close">&times;</button>
                <img src="/images/pwa_icon_192.png" alt="PopSongChordBook" class="pscb-review-header-icon">
                <h3 class="pscb-review-title">${t.title}</h3>
                <p class="pscb-review-desc">${t.desc}</p>

                <button type="button" id="pscbAlreadyReviewedProminentBtn" class="pscb-review-already-btn">
                    <span style="font-size: 1.05rem; line-height: 1;">✓</span>
                    <span>${t.alreadyReviewedBtn}</span>
                </button>

                <div class="pscb-star-picker" aria-label="Rate 1 to 5 stars">
                    <button type="button" class="pscb-star-btn active" data-star="1">★</button>
                    <button type="button" class="pscb-star-btn active" data-star="2">★</button>
                    <button type="button" class="pscb-star-btn active" data-star="3">★</button>
                    <button type="button" class="pscb-star-btn active" data-star="4">★</button>
                    <button type="button" class="pscb-star-btn active" data-star="5">★</button>
                </div>

                <!-- Shown for 4-5 stars -->
                <div id="pscbPositiveFlow">
                    <div class="pscb-keyword-box">
                        <div class="pscb-keyword-box-title" style="justify-content: space-between;">
                            <span>${t.tipTitle}</span>
                            <button type="button" id="pscbShuffleSamplesBtn" style="background:rgba(99,102,241,0.2); border:1px solid rgba(129,140,248,0.4); color:#c7d2fe; border-radius:6px; padding:2px 7px; font-size:0.7rem; font-weight:700; cursor:pointer; white-space:nowrap;">${t.shuffleBtn}</button>
                        </div>
                        <div id="pscbSamplesContainer">
                            ${buildSamplesMarkup(currentDisplayedItems)}
                        </div>
                    </div>
                    <a href="${playReviewUrl}" target="_blank" rel="noopener" id="pscbGoToPlayReviewBtn" class="pscb-review-primary-btn">
                        ${t.primaryCta}
                    </a>
                    <button type="button" id="pscbDoneReviewBtn" class="pscb-review-already-btn" style="margin-top: 10px;">
                        <span style="font-size: 1.05rem; line-height: 1;">✓</span>
                        <span>${t.alreadyReviewedBtn}</span>
                    </button>
                </div>

                <!-- Shown for 1-3 stars (Feedback Shield) -->
                <div id="pscbFeedbackFlow" class="pscb-feedback-shield">
                    <label style="font-size:0.83rem; color:#cbd5e1; font-weight:600; display:block;">${t.feedbackLabel}</label>
                    <textarea id="pscbFeedbackTextarea" class="pscb-feedback-textarea" placeholder="${t.feedbackPlaceholder}"></textarea>
                    <button type="button" id="pscbSendFeedbackBtn" class="pscb-review-primary-btn" style="margin-top:10px; background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%); box-shadow:0 6px 20px rgba(99,102,241,0.4);">
                        ${t.feedbackSubmit}
                    </button>
                </div>

                <div class="pscb-review-footer-links">
                    <button type="button" class="pscb-review-link-btn" id="pscbReviewLaterBtn">${t.laterBtn}</button>
                    <button type="button" class="pscb-review-link-btn" id="pscbReviewNeverBtn">${t.neverBtn}</button>
                </div>
            </div>
        `;

        function snoozeModal() {
            try {
                // Snooze for 5 days
                localStorage.setItem(STORAGE_KEYS.REVIEW_SNOOZED_UNTIL, String(Date.now() + 5 * 24 * 60 * 60 * 1000));
            } catch (e) {}
            overlay.remove();
        }

        // Star picker interaction
        const starBtns = overlay.querySelectorAll('.pscb-star-btn');
        const positiveFlow = overlay.querySelector('#pscbPositiveFlow');
        const feedbackFlow = overlay.querySelector('#pscbFeedbackFlow');

        starBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const selected = parseInt(btn.getAttribute('data-star'), 10);
                starBtns.forEach(b => {
                    const s = parseInt(b.getAttribute('data-star'), 10);
                    b.classList.toggle('active', s <= selected);
                });
                if (selected >= 4) {
                    positiveFlow.style.display = 'block';
                    feedbackFlow.style.display = 'none';
                } else {
                    positiveFlow.style.display = 'none';
                    feedbackFlow.style.display = 'block';
                }
            });
        });

        function bindSampleCopyListeners() {
            const sampleItems = overlay.querySelectorAll('.pscb-sample-item');
            sampleItems.forEach(item => {
                item.addEventListener('click', () => {
                    const text = item.getAttribute('data-sample-text') || '';
                    const itemId = item.getAttribute('data-sample-id') || '';
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(text).catch(() => {});
                    }
                    // If user already clicked another phrase in this same popup session, unmark that previous one
                    if (sessionCopiedItemId && sessionCopiedItemId !== itemId) {
                        const prevObj = poolItems.find(x => x.id === sessionCopiedItemId);
                        if (prevObj) prevObj.used = false;
                        markReviewItemUsedState(lang, sessionCopiedItemId, false);
                    }
                    // Mark newly copied phrase as used so it won't be shown a 2nd time
                    sessionCopiedItemId = itemId;
                    const currObj = poolItems.find(x => x.id === itemId);
                    if (currObj) currObj.used = true;
                    markReviewItemUsedState(lang, itemId, true);

                    sampleItems.forEach(other => {
                        other.classList.remove('copied');
                        const badge = other.querySelector('.pscb-copy-badge');
                        if (badge) badge.textContent = t.copyBadge;
                    });
                    item.classList.add('copied');
                    const badge = item.querySelector('.pscb-copy-badge');
                    if (badge) badge.textContent = t.copiedBadge;
                });
            });
        }

        bindSampleCopyListeners();

        // Also sync with remote Firebase pool if available
        const samplesContainer = overlay.querySelector('#pscbSamplesContainer');
        fetchRemoteReviewPoolForLang(lang, t).then(remoteItems => {
            if (remoteItems && remoteItems.length > 0 && !sessionCopiedItemId) {
                poolItems = remoteItems;
                currentDisplayedItems = pickRandomUnusedItems(poolItems, 3, []);
                if (samplesContainer) {
                    samplesContainer.innerHTML = buildSamplesMarkup(currentDisplayedItems);
                    bindSampleCopyListeners();
                }
            }
        }).catch(() => {});

        // Shuffle button to rotate through unused review phrases
        const shuffleBtn = overlay.querySelector('#pscbShuffleSamplesBtn');
        if (shuffleBtn && samplesContainer) {
            shuffleBtn.addEventListener('click', () => {
                const excludeIds = currentDisplayedItems.map(x => x.id);
                currentDisplayedItems = pickRandomUnusedItems(poolItems, 3, excludeIds);
                samplesContainer.innerHTML = buildSamplesMarkup(currentDisplayedItems);
                bindSampleCopyListeners();
            });
        }

        // Primary CTA -> Google Play
        const goBtn = overlay.querySelector('#pscbGoToPlayReviewBtn');
        if (goBtn) {
            goBtn.addEventListener('click', () => {
                markReviewDoneLocally();
                hideSidebarRateButton();
                syncReviewStatusWithFirebaseUser();
                setTimeout(() => overlay.remove(), 300);
            });
        }

        // Feedback shield submit (1-3 stars)
        const sendFeedbackBtn = overlay.querySelector('#pscbSendFeedbackBtn');
        if (sendFeedbackBtn) {
            sendFeedbackBtn.addEventListener('click', () => {
                const msg = (overlay.querySelector('#pscbFeedbackTextarea')?.value || '').trim();
                markReviewDismissedLocally();
                hideSidebarRateButton();
                syncReviewStatusWithFirebaseUser();
                if (msg) {
                    const subject = encodeURIComponent('PopSongChordBook App Feedback');
                    const body = encodeURIComponent(msg);
                    window.open(`mailto:info@popsongchordbook.com?subject=${subject}&body=${body}`, '_blank');
                }
                alert(t.feedbackThanks);
                overlay.remove();
            });
        }

        function handleAlreadyReviewed() {
            markReviewDoneLocally();
            hideSidebarRateButton();
            syncReviewStatusWithFirebaseUser();
            if (window.appInstance && typeof window.appInstance.showHUD === 'function') {
                window.appInstance.showHUD(t.reviewConfirmedToast);
            } else {
                alert(t.reviewConfirmedToast);
            }
            overlay.remove();
        }

        overlay.querySelector('#pscbAlreadyReviewedProminentBtn')?.addEventListener('click', handleAlreadyReviewed);
        overlay.querySelector('#pscbDoneReviewBtn')?.addEventListener('click', handleAlreadyReviewed);

        // Close / Later / Never buttons
        overlay.querySelector('.pscb-review-close')?.addEventListener('click', snoozeModal);
        overlay.querySelector('#pscbReviewLaterBtn')?.addEventListener('click', snoozeModal);
        overlay.querySelector('#pscbReviewNeverBtn')?.addEventListener('click', handleAlreadyReviewed);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) snoozeModal();
        });

        document.body.appendChild(overlay);
    }

    // Expose global helpers
    window.updatePscbSmartBannerLanguage = updateSmartBannerLanguage;
    window.trackPscbSongOpen = trackSongOpen;
    window.checkPscbReviewPromptOnSongClose = checkReviewPromptOnSongClose;
    window.openPscbReviewModal = function () { openReviewModal(true); };
    window.checkPscbRateButtonVisibility = checkAndApplyRateButtonVisibility;
    window.hidePscbRateAppSidebar = function() {
        markReviewDoneLocally();
        hideSidebarRateButton();
        syncReviewStatusWithFirebaseUser();
    };

    function initSmartAppBannerAndReview() {
        renderSmartBanner();
        checkAndApplyRateButtonVisibility();
        setupFirebaseAuthSync();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSmartAppBannerAndReview);
    } else {
        initSmartAppBannerAndReview();
    }
})();
