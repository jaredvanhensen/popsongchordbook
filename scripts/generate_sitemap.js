const fs = require('fs');
const path = require('path');

// Utility to slugify strings (matching SEO.js logic)
function slugify(text) {
    if (!text) return "";
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

const BASE_URL = 'https://www.popsongchordbook.com';

function generateSitemap() {
    console.log('--- PopSongChordBook Sitemap Generator ---');
    
    // Load default songs
    const songsFilePath = path.join(__dirname, '../js/data/default_songs.js');
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
        console.error('Error: Failed to parse songs JSON. Make sure default_songs.js is clean JSON.');
        console.error('Details:', e.message);
        return;
    }

    if (songs.length < 250) {
        console.warn(`Warning: Only ${songs.length} songs found. This seems lower than the expected library size (~350).`);
        console.warn('Consider running "node scripts/sync_songs.js <TOKEN>" first.');
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <!-- Main Pages -->
    <url>
        <loc>${BASE_URL}/</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>${BASE_URL}/songlist.html</loc>
        <changefreq>daily</changefreq>
        <priority>0.9</priority>
    </url>
    <url>
        <loc>${BASE_URL}/changelog.html</loc>
        <changefreq>weekly</changefreq>
        <priority>0.5</priority>
    </url>
    <url>
        <loc>${BASE_URL}/ChordTheory&Tips.html</loc>
        <changefreq>monthly</changefreq>
        <priority>0.4</priority>
    </url>
    <url>
        <loc>${BASE_URL}/ChordTheory&TipsGuitar.html</loc>
        <changefreq>monthly</changefreq>
        <priority>0.4</priority>
    </url>`;

    const artists = new Set();
    let songCount = 0;

    songs.forEach(song => {
        if (!song.artist || !song.title) return;
        
        const songSlug = slugify(`${song.artist}-${song.title}`);
        const artistSlug = slugify(song.artist);
        
        if (artistSlug) artists.add(artistSlug);

        xml += `
    <url>
        <loc>${BASE_URL}/song/${songSlug}</loc>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>`;
        songCount++;
    });

    console.log(`Processing ${artists.size} artists...`);
    artists.forEach(artistSlug => {
        xml += `
    <url>
        <loc>${BASE_URL}/artist/${artistSlug}</loc>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>`;
    });

    xml += '\n</urlset>';

    const outputPath = path.join(__dirname, '../sitemap.xml');
    fs.writeFileSync(outputPath, xml);
    
    console.log('-------------------------------------------');
    console.log(`Success! Sitemap saved to ${outputPath}`);
    console.log(`Total URLs: ${songCount + artists.size + 5}`);
    console.log(`- Songs: ${songCount}`);
    console.log(`- Artists: ${artists.size}`);
    console.log(`- Static Pages: 5`);
    console.log('-------------------------------------------');
}

generateSitemap();

