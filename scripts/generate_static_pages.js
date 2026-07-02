const fs = require('fs');
const path = require('path');

// Utility to slugify strings (matching sitemap / app logic)
function slugify(text) {
    if (!text) return "";
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

// Escape HTML helper
function escapeHTML(text) {
    if (!text) return "";
    return text.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function generateStaticPages() {
    console.log('--- PopSongChordBook Static Page Pre-renderer ---');
    
    const rootDir = path.join(__dirname, '..');
    
    // Load default songs
    const songsFilePath = path.join(rootDir, 'js/data/default_songs.js');
    if (!fs.existsSync(songsFilePath)) {
        console.error(`Error: ${songsFilePath} not found.`);
        return;
    }

    let songsFileContent = fs.readFileSync(songsFilePath, 'utf8');
    
    // Extract the array part
    const startMarker = 'const DEFAULT_SONGS = ';
    const startIndex = songsFileContent.indexOf(startMarker);
    if (startIndex === -1) {
        console.error('Error: Could not find DEFAULT_SONGS constant in default_songs.js');
        return;
    }
    
    let jsonContent = songsFileContent.substring(startIndex + startMarker.length).trim();
    if (jsonContent.endsWith(';')) {
        jsonContent = jsonContent.slice(0, -1);
    }

    let songs = [];
    try {
        songs = JSON.parse(jsonContent);
    } catch (e) {
        console.error('Error: Failed to parse songs JSON.', e.message);
        return;
    }

    console.log(`Loaded ${songs.length} songs from default_songs.js.`);

    // Load templates
    const songTemplatePath = path.join(rootDir, 'song.html');
    const artistTemplatePath = path.join(rootDir, 'artist.html');
    
    if (!fs.existsSync(songTemplatePath) || !fs.existsSync(artistTemplatePath)) {
        console.error('Error: song.html or artist.html template missing.');
        return;
    }

    const songTemplate = fs.readFileSync(songTemplatePath, 'utf8');
    const artistTemplate = fs.readFileSync(artistTemplatePath, 'utf8');

    // Create target directories
    const songOutputDir = path.join(rootDir, 'song');
    const artistOutputDir = path.join(rootDir, 'artist');
    
    if (!fs.existsSync(songOutputDir)) fs.mkdirSync(songOutputDir);
    if (!fs.existsSync(artistOutputDir)) fs.mkdirSync(artistOutputDir);

    // 1. Generate Song Pages
    let songCount = 0;
    songs.forEach(song => {
        if (!song.artist || !song.title) return;
        
        const songSlug = slugify(`${song.artist}-${song.title}`);
        const songTitle = escapeHTML(song.title);
        const songArtist = escapeHTML(song.artist);
        const songKey = escapeHTML(song.key || 'C');
        const songTempo = song.tempo || 120;
        
        const desc = `Master "${songTitle}" by ${songArtist} with our interactive scrolling chords. This tutorial covers the ${songKey} major progression at ${songTempo} BPM. Perfect for keyboard and guitar players.`;
        
        let previewText = "";
        if (song.verse) previewText += `VERSE:\n${song.verse}\n\n`;
        if (song.chorus) previewText += `CHORUS:\n${song.chorus}\n\n`;
        if (!previewText) previewText = "Preview not available.";
        previewText = escapeHTML(previewText);

        const schema = {
            "@context": "https://schema.org",
            "@type": "MusicRecording",
            "name": song.title,
            "byArtist": {
                "@type": "MusicGroup",
                "name": song.artist
            },
            "genre": "Pop",
            "url": `https://www.popsongchordbook.com/song/${songSlug}`
        };

        // Populate song template
        let html = songTemplate;
        
        // Head enhancements
        html = html.replace(
            '<title id="page-title">Song Preview - PopSongChordBook</title>',
            `<title id="page-title">${songTitle} by ${songArtist} - Piano & Guitar Chords - PopSongChordBook</title>`
        );
        html = html.replace(
            '<meta name="description" id="meta-description" content="Learn how to play your favorite songs on piano and guitar with interactive scrolling chord timelines.">',
            `<meta name="description" id="meta-description" content="${escapeHTML(desc)}">`
        );
        html = html.replace(
            '</head>',
            `    <link rel="canonical" href="https://www.popsongchordbook.com/song/${songSlug}">\n</head>`
        );
        html = html.replace(
            '<script type="application/ld+json" id="structured-data"></script>',
            `<script type="application/ld+json" id="structured-data">${JSON.stringify(schema, null, 4)}</script>`
        );

        // Body content
        html = html.replace('<span id="breadcrumb-song">...</span>', `<span id="breadcrumb-song">${songTitle}</span>`);
        html = html.replace('<h1 id="song-title">Loading Song...</h1>', `<h1 id="song-title">${songTitle}</h1>`);
        const artistSlugForLink = slugify(song.artist);
        html = html.replace('<h2 id="song-artist">Artist</h2>', `<h2 id="song-artist"><a href="/artist/${artistSlugForLink}" style="color: inherit; text-decoration: none; border-bottom: 2px solid transparent; transition: border-color 0.2s;" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='transparent'">${songArtist}</a></h2>`);
        html = html.replace('<span class="meta-value" id="meta-key">-</span>', `<span class="meta-value" id="meta-key">${songKey}</span>`);
        html = html.replace('<span class="meta-value" id="meta-tempo">- BPM</span>', `<span class="meta-value" id="meta-tempo">${songTempo} BPM</span>`);
        
        // Song description replacement
        const descPlaceholder = `                    Learn how to play this song on piano or guitar with our interactive scrolling chord timeline. 
                    Perfect for beginners and intermediate players who want to master the progression without memorizing complex charts.`;
        if (html.includes(descPlaceholder)) {
            html = html.replace(descPlaceholder, `                    ${escapeHTML(desc)}`);
        } else {
            // Fallback regex replacement
            html = html.replace(/<p id="song-description">[\s\S]*?<\/p>/, `<p id="song-description">${escapeHTML(desc)}</p>`);
        }

        // Chords preview replacement
        const chordsPlaceholder = `                    <!-- Preview content will be injected here -->`;
        if (html.includes(chordsPlaceholder)) {
            html = html.replace(chordsPlaceholder, `                    ${previewText}`);
        } else {
            html = html.replace(/<div class="chords-preview" id="chords-preview">[\s\S]*?<\/div>/, `<div class="chords-preview" id="chords-preview">${previewText}</div>`);
        }

        // FAQ container replacement
        const faqPlaceholder = `                    <!-- FAQ will be injected here -->`;
        const faqContent = `
                    <div class="faq-item">
                        <div class="faq-question">What is the key of "${songTitle}" by ${songArtist}?</div>
                        <div class="faq-answer">The song "${songTitle}" is originally in the key of ${songKey}.</div>
                    </div>
                    <div class="faq-item">
                        <div class="faq-question">How fast is "${songTitle}"?</div>
                        <div class="faq-answer">The tempo of "${songTitle}" is approximately ${songTempo} BPM.</div>
                    </div>
        `;
        if (html.includes(faqPlaceholder)) {
            html = html.replace(faqPlaceholder, faqContent);
        } else {
            html = html.replace(/<div id="faq-container">[\s\S]*?<\/div>/, `<div id="faq-container">${faqContent}</div>`);
        }

        // Write file
        const songDir = path.join(songOutputDir, songSlug);
        if (!fs.existsSync(songDir)) fs.mkdirSync(songDir);
        
        fs.writeFileSync(path.join(songDir, 'index.html'), html);
        songCount++;
    });

    console.log(`Generated ${songCount} static song detail pages.`);

    // 2. Generate Artist Pages
    // Group songs by artist slug
    const artistGroups = {};
    songs.forEach(song => {
        if (!song.artist) return;
        const artistSlug = slugify(song.artist);
        if (!artistSlug) return;
        
        if (!artistGroups[artistSlug]) {
            artistGroups[artistSlug] = {
                name: song.artist,
                songs: []
            };
        }
        artistGroups[artistSlug].songs.push(song);
    });

    let artistCount = 0;
    Object.keys(artistGroups).forEach(artistSlug => {
        const group = artistGroups[artistSlug];
        const artistName = escapeHTML(group.name);
        
        let songsHTML = "";
        group.songs.forEach(song => {
            const songSlug = slugify(`${song.artist}-${song.title}`);
            const songTitle = escapeHTML(song.title);
            const songKey = escapeHTML(song.key || 'C');
            const songTempo = song.tempo || 120;
            songsHTML += `
            <a class="song-card" href="/song/${songSlug}">
                <div class="song-icon">🎵</div>
                <div class="song-meta">
                    <h3>${songTitle}</h3>
                    <span>Key: ${songKey} • ${songTempo} BPM</span>
                </div>
            </a>`;
        });

        let html = artistTemplate;
        
        // Head replacements
        html = html.replace(
            '<title id="page-title">Artist Hub - PopSongChordBook</title>',
            `<title id="page-title">${artistName} Chords & Tutorials - PopSongChordBook</title>`
        );
        html = html.replace(
            '<meta name="description" id="meta-description" content="Explore songs and chord progressions by your favorite artists on PopSongChordBook.">',
            `<meta name="description" id="meta-description" content="Explore songs and chord progressions by ${artistName} on PopSongChordBook.">`
        );
        html = html.replace(
            '</head>',
            `    <link rel="canonical" href="https://www.popsongchordbook.com/artist/${artistSlug}">\n</head>`
        );

        // Body replacements
        html = html.replace('<h1 id="artist-name">Loading Artist...</h1>', `<h1 id="artist-name">${artistName}</h1>`);
        html = html.replace('<p id="artist-stats">...</p>', `<p id="artist-stats">Explore ${group.songs.length} interactive song tutorials by ${artistName}.</p>`);
        
        // Song grid replacement
        const gridPlaceholder = `            <!-- Songs will be injected here -->`;
        if (html.includes(gridPlaceholder)) {
            html = html.replace(gridPlaceholder, songsHTML);
        } else {
            html = html.replace(/<div class="song-grid" id="song-grid">[\s\S]*?<\/div>/, `<div class="song-grid" id="song-grid">${songsHTML}</div>`);
        }

        // Write file
        const artistDir = path.join(artistOutputDir, artistSlug);
        if (!fs.existsSync(artistDir)) fs.mkdirSync(artistDir);
        
        fs.writeFileSync(path.join(artistDir, 'index.html'), html);
        artistCount++;
    });

    console.log(`Generated ${artistCount} static artist hub pages.`);
    console.log('-------------------------------------------');

    // 3. Update index.html with SEO directory of artists
    const indexPath = path.join(rootDir, 'index.html');
    if (fs.existsSync(indexPath)) {
        let indexHTML = fs.readFileSync(indexPath, 'utf8');
        
        // Group artists by name and sort them alphabetically
        const sortedArtists = Object.keys(artistGroups).sort((a, b) => {
            return artistGroups[a].name.localeCompare(artistGroups[b].name);
        });
        
        let directoryHTML = `<!-- BEGIN_SEO_DIRECTORY -->
            <details class="seo-directory" style="margin: 40px auto 20px auto; text-align: left; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 20px; max-width: 900px; font-family: 'Inter', sans-serif;">
                <summary style="cursor: pointer; font-weight: 600; opacity: 0.8; font-size: 0.95rem; outline: none; user-select: none; color: #fff; list-style: none; display: flex; align-items: center; justify-content: space-between;">
                    <span>Browse Chords by Artist</span>
                    <span style="font-size: 0.8rem; opacity: 0.6;">▼</span>
                </summary>
                <div style="margin-top: 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; font-size: 0.85rem; max-height: 350px; overflow-y: auto; padding-right: 10px;">`;
        
        sortedArtists.forEach(artistSlug => {
            const artistName = escapeHTML(artistGroups[artistSlug].name);
            directoryHTML += `
                    <a href="/artist/${artistSlug}" style="color: rgba(255, 255, 255, 0.7); text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='#3b82f6'" onmouseout="this.style.color='rgba(255,255,255,0.7)'">${artistName} Chords</a>`;
        });
        
        directoryHTML += `
                </div>
            </details>
            <!-- END_SEO_DIRECTORY -->`;
        
        const beginMarker = '<!-- BEGIN_SEO_DIRECTORY -->';
        const endMarker = '<!-- END_SEO_DIRECTORY -->';
        const beginIndex = indexHTML.indexOf(beginMarker);
        const endIndex = indexHTML.indexOf(endMarker);
        
        if (beginIndex !== -1 && endIndex !== -1) {
            indexHTML = indexHTML.substring(0, beginIndex) + directoryHTML + indexHTML.substring(endIndex + endMarker.length);
            console.log('Updated existing SEO directory in index.html.');
        } else {
            const placeholder = '<!-- SEO_DIRECTORY_PLACEHOLDER -->';
            if (indexHTML.includes(placeholder)) {
                indexHTML = indexHTML.replace(placeholder, directoryHTML);
                console.log('Inserted new SEO directory in index.html.');
            } else {
                console.warn('Warning: Could not find SEO directory placeholder in index.html.');
            }
        }
        
        fs.writeFileSync(indexPath, indexHTML, 'utf8');
    }
}

generateStaticPages();
