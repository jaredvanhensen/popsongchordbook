/**
 * Smart App Banner & Google Play Store Funnel for PopSongChordBook
 * Shows a sticky top "Open in App / Free on Google Play" banner for Android mobile browser visitors,
 * while automatically hiding all Play Store prompts when running inside the installed Android App (TWA/PWA).
 */
(function () {
    const PLAY_STORE_PACKAGE = 'com.popsongchordbook.app';
    const PLAY_STORE_BASE_URL = `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}`;

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
            /* Always hide Play Store badges when running inside the installed app */
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

    // Expose helper so language switchers can refresh the banner text
    window.updatePscbSmartBannerLanguage = updateSmartBannerLanguage;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderSmartBanner);
    } else {
        renderSmartBanner();
    }
})();
