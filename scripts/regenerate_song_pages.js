// regenerate_song_pages.js
// Regenerates all song/*/index.html files with rich, static SEO content:
//   - Song Map (proportional colored section blocks)
//   - Chord Progressions per section (Verse, Pre-Chorus, Chorus, Bridge)
//   - Chord Badge Grid (unique chords as colored pills)
//   - Extended FAQs (key, tempo, year, capo, chord list)
//   - YouTube link
//   - Static canonical tag (no JS-injected duplicate)
//
// Writes UTF-8 safely — no PowerShell, no emoji corruption.

const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function sectionColor(type) {
    const map = {
        intro:      '#6b7280',
        verse:      '#3b82f6',
        prechorus:  '#06b6d4',
        'pre-chorus': '#06b6d4',
        chorus:     '#22c55e',
        bridge:     '#f59e0b',
        outro:      '#8b5cf6',
        interlude:  '#ec4899',
        solo:       '#f43f5e',
    };
    return map[(type || '').toLowerCase().replace(/\s/g, '')] || '#64748b';
}

function chordColor(name) {
    const n = (name || '').trim();
    if (/sus/.test(n))                              return { bg: '#7c3aed22', border: '#7c3aed60', text: '#6d28d9' };
    if (/dim/.test(n))                              return { bg: '#db277722', border: '#db277760', text: '#be185d' };
    if (/(^|[^a-z])m(7|aj)?$|min/i.test(n) && !/^m$/.test(n.replace(/[^a-zA-Z]/g,'')))
                                                    return { bg: '#dc262622', border: '#dc262660', text: '#b91c1c' };
    if (/maj7|M7/.test(n))                          return { bg: '#059669' + '22', border: '#05966960', text: '#047857' };
    if (/7/.test(n))                                return { bg: '#d9770622', border: '#d9770660', text: '#b45309' };
    if (/[0-9]/.test(n))                            return { bg: '#0d948822', border: '#0d948860', text: '#0f766e' };
    return                                                 { bg: '#2563eb22', border: '#2563eb60', text: '#1d4ed8' };
}

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------
function buildSongMap(sections, chordData) {
    if (!sections || sections.length === 0) return '';
    const totalChords = (chordData && chordData.chords) ? chordData.chords.length : 1;

    const blocks = sections.map(sec => {
        const count  = Math.max(1, (sec.endIdx - sec.startIdx + 1));
        const color  = sectionColor(sec.type);
        const label  = esc(sec.name);
        return `<div class="map-block" style="flex:${count};background:${color};" title="${label}">
                <span class="map-label">${label}</span>
            </div>`;
    }).join('\n            ');

    const uniqueTypes = [...new Set(sections.map(s => s.type))];
    const legend = uniqueTypes.map(type => {
        const color = sectionColor(type);
        return `<span class="legend-item"><span class="legend-dot" style="background:${color}"></span>${esc(type)}</span>`;
    }).join('');

    const sectionNames = sections.map(s => esc(s.name)).join(' → ');

    return `
        <section class="preview-section">
            <h2>Song Structure</h2>
            <p class="section-desc">This song has ${sections.length} sections: ${sectionNames}</p>
            <div class="song-map-container">
                ${blocks}
            </div>
            <div class="map-legend">${legend}</div>
        </section>`;
}

function buildChordSections(song) {
    const defs = [
        { key: 'verse',     titleKey: 'verseTitle',     fallback: 'Verse',      type: 'verse'     },
        { key: 'preChorus', titleKey: 'preChorusTitle', fallback: 'Pre-Chorus', type: 'prechorus' },
        { key: 'chorus',    titleKey: 'chorusTitle',    fallback: 'Chorus',     type: 'chorus'    },
        { key: 'bridge',    titleKey: 'bridgeTitle',    fallback: 'Bridge',     type: 'bridge'    },
    ].filter(d => song[d.key] && song[d.key].trim());

    if (defs.length === 0) return '';

    const cards = defs.map(d => {
        const color = sectionColor(d.type);
        const title = esc(song[d.titleKey] || d.fallback);
        const chords = esc(song[d.key].trim());
        return `<div class="chord-section-card" style="border-left-color:${color};">
                <div class="chord-section-title" style="color:${color};">${title}</div>
                <div class="chord-section-text">${chords}</div>
            </div>`;
    }).join('\n            ');

    return `
        <section class="preview-section">
            <h2>Chord Progressions</h2>
            <p class="section-desc">These are the chord sequences for each part of the song:</p>
            <div class="chord-sections-grid">
                ${cards}
            </div>
        </section>`;
}

function buildChordBadges(chordData) {
    if (!chordData || !chordData.chords || chordData.chords.length === 0) return '';
    const unique = [...new Set(chordData.chords.map(c => c.name))];
    if (unique.length === 0) return '';

    const badges = unique.map(chord => {
        const { bg, border, text } = chordColor(chord);
        return `<span class="chord-badge" style="background:${bg};border-color:${border};color:${text};">${esc(chord)}</span>`;
    }).join('');

    return `
        <section class="preview-section">
            <h2>Chords Used in This Song</h2>
            <p class="section-desc">${unique.length} unique chord${unique.length !== 1 ? 's' : ''} appear in this song:</p>
            <div class="chord-badges-container">${badges}</div>
        </section>`;
}

function buildFAQs(song, uniqueChords) {
    const items = [];

    items.push({
        q: `What is the key of &quot;${esc(song.title)}&quot; by ${esc(song.artist)}?`,
        a: `&quot;${esc(song.title)}&quot; is in the key of ${esc(song.key || 'C')}.`,
    });
    items.push({
        q: `What is the tempo of &quot;${esc(song.title)}&quot;?`,
        a: `The tempo of &quot;${esc(song.title)}&quot; is ${song.tempo || 120} BPM.`,
    });
    if (song.year) {
        items.push({
            q: `When was &quot;${esc(song.title)}&quot; by ${esc(song.artist)} released?`,
            a: `&quot;${esc(song.title)}&quot; by ${esc(song.artist)} was released in ${song.year}.`,
        });
    }
    if (song.capo !== undefined) {
        items.push({
            q: `Does &quot;${esc(song.title)}&quot; require a capo?`,
            a: song.capo > 0
                ? `Yes, &quot;${esc(song.title)}&quot; requires a capo on fret ${song.capo}.`
                : `No capo is needed to play &quot;${esc(song.title)}&quot;.`,
        });
    }
    if (uniqueChords.length > 0) {
        items.push({
            q: `What chords do I need for &quot;${esc(song.title)}&quot;?`,
            a: `The chords in &quot;${esc(song.title)}&quot; are: ${uniqueChords.map(esc).join(', ')}.`,
        });
    }
    if (song.chorus) {
        items.push({
            q: `What are the chorus chords of &quot;${esc(song.title)}&quot;?`,
            a: `The chorus chords of &quot;${esc(song.title)}&quot; are: ${esc(song.chorus.trim())}.`,
        });
    }

    const itemsHtml = items.map(({ q, a }) => `
            <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
                <div class="faq-question" itemprop="name">${q}</div>
                <div class="faq-answer" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
                    <span itemprop="text">${a}</span>
                </div>
            </div>`).join('');

    return `
        <section class="faq-section" itemscope itemtype="https://schema.org/FAQPage">
            <h2>Frequently Asked Questions</h2>
            ${itemsHtml}
        </section>`;
}

// ---------------------------------------------------------------------------
// Full page generator
// ---------------------------------------------------------------------------
function generateHtml(song, slug) {
    const artistSlug   = slugify(song.artist);
    const uniqueChords = (song.chordData && song.chordData.chords)
        ? [...new Set(song.chordData.chords.map(c => c.name))]
        : [];

    const yearText  = song.year   ? ` (${song.year})`              : '';
    const capoText  = song.capo > 0 ? ` with capo on fret ${song.capo}` : '';
    const shortList = uniqueChords.slice(0, 6).join(', ');
    const desc      = `Learn to play "${song.title}" by ${song.artist}${yearText}. `
                    + `Key of ${song.key || 'C'} at ${song.tempo || 120} BPM${capoText}. `
                    + `Chords: ${shortList || 'various'}. `
                    + `Interactive chord timeline for piano and guitar on PopSongChordBook.`;

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'MusicRecording',
        'name': song.title,
        'byArtist': { '@type': 'MusicGroup', 'name': song.artist },
        'url': `https://www.popsongchordbook.com/song/${slug}`,
        ...(song.year ? { 'datePublished': String(song.year) } : {}),
        ...(uniqueChords.length ? { 'description': `Chords: ${uniqueChords.join(', ')}. Key of ${song.key || 'C'}.` } : {}),
    };

    // FAQPage schema
    const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': [
            { '@type': 'Question', 'name': `What key is "${song.title}" in?`, 'acceptedAnswer': { '@type': 'Answer', 'text': `"${song.title}" is in the key of ${song.key || 'C'}.` } },
            { '@type': 'Question', 'name': `What is the tempo of "${song.title}"?`, 'acceptedAnswer': { '@type': 'Answer', 'text': `The tempo is ${song.tempo || 120} BPM.` } },
            ...(song.year ? [{ '@type': 'Question', 'name': `When was "${song.title}" released?`, 'acceptedAnswer': { '@type': 'Answer', 'text': `Released in ${song.year}.` } }] : []),
        ],
    };

    // Meta items
    const yearMeta   = song.year
        ? `<div class="meta-item"><span class="meta-label">Year</span><span class="meta-value">${song.year}</span></div>`
        : '';
    const capoMeta   = song.capo > 0
        ? `<div class="meta-item"><span class="meta-label">Capo</span><span class="meta-value">Fret ${song.capo}</span></div>`
        : '';
    const chordsMeta = uniqueChords.length > 0
        ? `<div class="meta-item"><span class="meta-label">Chords</span><span class="meta-value">${uniqueChords.length} unique</span></div>`
        : '';

    // YouTube button
    const youtubeCta = song.youtubeUrl
        ? `<a href="${esc(song.youtubeUrl)}" class="youtube-button" target="_blank" rel="noopener noreferrer">&#9654; Watch on YouTube</a>`
        : '';

    // Song icon — rotate through a small set based on slug char
    const icons = ['🎵','🎹','🎸','🎶','🎼','🎷','🎺'];
    const icon  = icons[slug.charCodeAt(0) % icons.length];

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(song.title)} by ${esc(song.artist)} - Piano &amp; Guitar Chords | PopSongChordBook</title>
    <meta name="description" content="${esc(desc)}">
    <link rel="canonical" href="https://www.popsongchordbook.com/song/${slug}">
    <script type="application/ld+json">${JSON.stringify(schema)}</script>
    <script type="application/ld+json">${JSON.stringify(faqSchema)}</script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #3b82f6;
            --primary-hover: #2563eb;
            --bg-gradient: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            --glass: rgba(255,255,255,0.85);
        }
        *,*::before,*::after { box-sizing: border-box; }
        body {
            font-family: 'Inter', sans-serif;
            background: var(--bg-gradient);
            color: #1e293b;
            line-height: 1.6;
            margin: 0;
            min-height: 100vh;
        }
        a { color: var(--primary); text-decoration: none; }
        a:hover { text-decoration: underline; }

        /* Layout */
        .preview-container { max-width: 900px; margin: 40px auto; padding: 20px; }
        .breadcrumb { font-size: 13px; color: #64748b; margin-bottom: 20px; }
        .breadcrumb a { color: #64748b; }
        .breadcrumb a:hover { color: var(--primary); }

        /* Card */
        .song-card {
            background: var(--glass);
            backdrop-filter: blur(10px);
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.08), 0 10px 10px -5px rgba(0,0,0,0.04);
            border: 1px solid rgba(255,255,255,0.6);
        }

        /* Header */
        .song-header { display: flex; align-items: center; gap: 28px; margin-bottom: 36px; }
        .song-art {
            width: 110px; height: 110px; flex-shrink: 0;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            border-radius: 20px;
            display: flex; align-items: center; justify-content: center;
            font-size: 48px;
            box-shadow: 0 10px 20px rgba(59,130,246,0.25);
        }
        .song-info h1 { margin: 0; font-size: 34px; font-weight: 800; letter-spacing: -0.02em; color: #0f172a; }
        .song-info .artist-link {
            display: inline-block; margin-top: 6px;
            font-size: 20px; font-weight: 600; color: var(--primary);
            border-bottom: 2px solid transparent; transition: border-color 0.2s;
        }
        .song-info .artist-link:hover { border-bottom-color: var(--primary); text-decoration: none; }

        /* Meta grid */
        .meta-grid {
            display: flex; flex-wrap: wrap; gap: 16px;
            background: rgba(255,255,255,0.5);
            padding: 20px; border-radius: 16px;
            margin-bottom: 36px;
        }
        .meta-item { display: flex; flex-direction: column; min-width: 80px; }
        .meta-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; }
        .meta-value { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 2px; }

        /* Section headings */
        .preview-section { margin-bottom: 36px; }
        .preview-section h2, .faq-section h2 {
            font-size: 20px; font-weight: 700; color: #0f172a;
            margin: 0 0 8px 0;
            padding-left: 14px;
            border-left: 4px solid var(--primary);
        }
        .section-desc { margin: 4px 0 16px; font-size: 14px; color: #64748b; }

        /* Song Map */
        .song-map-container {
            display: flex; height: 56px; border-radius: 12px;
            overflow: hidden; gap: 3px;
            margin-bottom: 12px;
        }
        .map-block {
            display: flex; align-items: center; justify-content: center;
            min-width: 40px; overflow: hidden;
            transition: opacity 0.2s;
            cursor: default;
        }
        .map-block:hover { opacity: 0.85; }
        .map-label {
            font-size: 11px; font-weight: 700; color: #fff;
            text-transform: uppercase; letter-spacing: 0.06em;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            padding: 0 6px;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }
        .map-legend { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
        .legend-item {
            display: flex; align-items: center; gap: 5px;
            font-size: 12px; color: #64748b; text-transform: capitalize;
        }
        .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

        /* Chord Sections */
        .chord-sections-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .chord-section-card {
            background: rgba(255,255,255,0.6);
            border-left: 4px solid var(--primary);
            border-radius: 10px;
            padding: 14px 16px;
        }
        .chord-section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
        .chord-section-text {
            font-family: 'Courier New', Courier, monospace;
            font-size: 15px; font-weight: 600; color: #1e293b;
            white-space: pre-wrap; line-height: 1.7;
        }

        /* Chord Badges */
        .chord-badges-container { display: flex; flex-wrap: wrap; gap: 8px; }
        .chord-badge {
            display: inline-block;
            padding: 5px 14px;
            border-radius: 9999px;
            border: 1.5px solid;
            font-size: 14px; font-weight: 700;
            font-family: 'Courier New', Courier, monospace;
            transition: transform 0.15s, box-shadow 0.15s;
            cursor: default;
        }
        .chord-badge:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }

        /* Teaser Images */
        .teaser-section { margin-bottom: 36px; text-align: center; }
        .teaser-image-container {
            position: relative; border-radius: 16px; overflow: hidden;
            box-shadow: 0 12px 30px rgba(59,130,246,0.2);
            background: #0f172a;
        }
        .teaser-image { width: 100%; display: block; opacity: 0.92; transition: transform 0.4s ease, opacity 0.4s; }
        .teaser-image-container:hover .teaser-image { transform: scale(1.02); opacity: 1; }

        /* CTA */
        .cta-container {
            text-align: center; margin: 40px 0;
            padding: 36px;
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border-radius: 20px;
            border: 1px solid #bfdbfe;
        }
        .cta-container h2 { font-size: 20px; font-weight: 700; color: #1e3a5f; margin: 0 0 20px; border: none; padding: 0; }
        .cta-button {
            display: inline-block;
            background: var(--primary); color: #fff;
            padding: 14px 32px; border-radius: 9999px;
            font-weight: 700; font-size: 17px;
            box-shadow: 0 10px 20px rgba(59,130,246,0.35);
            transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
        }
        .cta-button:hover {
            background: var(--primary-hover);
            transform: translateY(-2px);
            box-shadow: 0 16px 24px rgba(59,130,246,0.4);
            text-decoration: none;
        }
        .youtube-button {
            display: inline-block; margin-top: 14px;
            background: #ff0000; color: #fff;
            padding: 11px 24px; border-radius: 9999px;
            font-weight: 600; font-size: 15px;
            transition: background 0.2s, transform 0.2s;
        }
        .youtube-button:hover { background: #cc0000; transform: translateY(-2px); text-decoration: none; }
        .cta-buttons { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin-top: 4px; }

        /* FAQ */
        .faq-section { margin-top: 36px; }
        .faq-item { margin-bottom: 22px; padding-bottom: 22px; border-bottom: 1px solid #e2e8f0; }
        .faq-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
        .faq-question { font-weight: 700; font-size: 16px; color: #0f172a; margin-bottom: 6px; }
        .faq-answer { font-size: 15px; color: #475569; line-height: 1.65; }

        /* Footer */
        footer { text-align: center; padding: 36px; color: #94a3b8; font-size: 13px; }

        /* Responsive */
        @media (max-width: 640px) {
            .song-header { flex-direction: column; text-align: center; }
            .song-art { margin: 0 auto; }
            .song-card { padding: 22px 18px; }
            .chord-sections-grid { grid-template-columns: 1fr; }
            .song-info h1 { font-size: 26px; }
            .map-label { font-size: 9px; }
        }
    </style>
</head>
<body>
    <div class="preview-container">
        <nav class="breadcrumb" aria-label="breadcrumb">
            <a href="/">Home</a> &rsaquo;
            <a href="/songlist.html">Songs</a> &rsaquo;
            <span>${esc(song.title)}</span>
        </nav>

        <article class="song-card" itemscope itemtype="https://schema.org/MusicRecording">
            <div class="song-header">
                <div class="song-art" aria-hidden="true">${icon}</div>
                <div class="song-info">
                    <h1 itemprop="name">${esc(song.title)}</h1>
                    <a href="/artist/${artistSlug}" class="artist-link" itemprop="byArtist" itemscope itemtype="https://schema.org/MusicGroup">
                        <span itemprop="name">${esc(song.artist)}</span>
                    </a>
                </div>
            </div>

            <div class="meta-grid">
                <div class="meta-item">
                    <span class="meta-label">Key</span>
                    <span class="meta-value">${esc(song.key || 'C')}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Tempo</span>
                    <span class="meta-value">${song.tempo || 120} BPM</span>
                </div>
                ${yearMeta}
                ${capoMeta}
                ${chordsMeta}
            </div>

            <section class="preview-section">
                <h2>About this Song</h2>
                <p>${esc(desc)}</p>
            </section>

            ${buildSongMap(song.customMapSections, song.chordData)}

            ${buildChordSections(song)}

            ${buildChordBadges(song.chordData)}

            <div class="teaser-section">
                <div class="teaser-image-container">
                    <img src="/images/pure_chordtimeline.png"
                         alt="PopSongChordBook interactive scrolling chord timeline for ${esc(song.title)}"
                         class="teaser-image" loading="lazy">
                </div>
            </div>

            <div class="teaser-section">
                <div class="teaser-image-container">
                    <img src="/images/song_map_example.png"
                         alt="PopSongChordBook song map visualization for ${esc(song.title)}"
                         class="teaser-image" loading="lazy">
                </div>
            </div>

            <div class="cta-container">
                <h2>Play the full interactive version with real-time scrolling chords and audio sync</h2>
                <div class="cta-buttons">
                    <a href="/" class="cta-button">Open PopSongChordBook</a>
                    ${youtubeCta}
                </div>
            </div>

            ${buildFAQs(song, uniqueChords)}
        </article>

        <footer>
            <p>&copy; 2026 PopSongChordBook &mdash; Interactive chord timelines for piano &amp; guitar</p>
        </footer>
    </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const SONGS_FILE = path.join('.', 'js', 'data', 'default_songs.js');
const SONG_DIR   = path.join('.', 'song');

console.log('Reading song data...');
const rawContent = fs.readFileSync(SONGS_FILE, 'utf8');
eval(rawContent.replace('const DEFAULT_SONGS', 'var DEFAULT_SONGS'));
console.log(`Loaded ${DEFAULT_SONGS.length} songs.\n`);

let written = 0, skipped = 0;
const errors = [];

for (const song of DEFAULT_SONGS) {
    try {
        if (!song.title || !song.artist) { skipped++; continue; }

        const slug    = slugify(`${song.artist}-${song.title}`);
        const dir     = path.join(SONG_DIR, slug);
        const outFile = path.join(dir, 'index.html');

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const html = generateHtml(song, slug);
        fs.writeFileSync(outFile, html, 'utf8');
        written++;

        if (written % 50 === 0) process.stdout.write(`  ${written} files written...\n`);
    } catch (err) {
        errors.push(`${song.artist} - ${song.title}: ${err.message}`);
        skipped++;
    }
}

console.log(`\nDone.`);
console.log(`  Written: ${written} files`);
console.log(`  Skipped: ${skipped} files`);
if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    errors.forEach(e => console.log('  ' + e));
}
