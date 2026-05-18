const fs = require('fs');
const path = require('path');
const https = require('https');

// Helper to sleep/stagger requests to avoid hitting rate limits
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to make an HTTPS request and return parsed JSON response
function getJSON(url) {
    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

// Helper to download an image URL directly to a local path
function downloadImage(url, destPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        https.get(url, (res) => {
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(destPath, () => {});
            reject(err);
        });
    });
}

async function main() {
    const defaultSongsPath = path.join(__dirname, '../js/data/default_songs.js');
    const destDir = path.join(__dirname, '../assets/thumbnails/artists');

    console.log(`Creating output directory: ${destDir}`);
    fs.mkdirSync(destDir, { recursive: true });

    if (!fs.existsSync(defaultSongsPath)) {
        console.error(`Could not find default_songs.js at: ${defaultSongsPath}`);
        return;
    }

    console.log(`Parsing unique artists from: ${defaultSongsPath}`);
    const code = fs.readFileSync(defaultSongsPath, 'utf8');
    
    // Evaluate in a sandbox safely to retrieve DEFAULT_SONGS array
    const sandbox = {};
    const fn = new Function('sandbox', `${code}\nsandbox.songs = DEFAULT_SONGS;`);
    fn(sandbox);
    const songs = sandbox.songs || [];

    // Extract unique artist names
    const artists = new Set();
    songs.forEach(song => {
        if (song.artist && song.artist.trim() !== '') {
            artists.add(song.artist.trim());
        }
    });

    console.log(`Found ${artists.size} unique artists in the songbook.`);

    const artistList = Array.from(artists).sort((a, b) => a.localeCompare(b));

    for (let i = 0; i < artistList.length; i++) {
        const artist = artistList[i];
        const safeArtist = artist.replace(/[<>:"/\\|?*]/g, '').trim();
        const destPath = path.join(destDir, `${safeArtist}.jpg`);

        // Skip if already downloaded
        if (fs.existsSync(destPath)) {
            console.log(`[${i + 1}/${artistList.length}] Already downloaded: "${artist}"`);
            continue;
        }

        console.log(`[${i + 1}/${artistList.length}] Fetching thumbnail for: "${artist}"...`);
        try {
            const query = encodeURIComponent(artist);
            const searchUrl = `https://api.deezer.com/search/artist?q=${query}`;
            const data = await getJSON(searchUrl);

            if (data && data.data && data.data.length > 0) {
                const pictureUrl = data.data[0].picture_medium || data.data[0].picture_small;
                if (pictureUrl) {
                    await downloadImage(pictureUrl, destPath);
                    console.log(`   └─ Successfully saved to: ${path.basename(destPath)}`);
                } else {
                    console.log(`   └─ No picture URL found in Deezer.`);
                }
            } else {
                console.log(`   └─ Not found on Deezer.`);
            }

            // Sleep 350ms to respect Deezer API rate limits (5 req/sec max)
            await sleep(350);
        } catch (e) {
            console.error(`   └─ Error fetching/downloading:`, e.message);
        }
    }

    console.log('\n🎉 Finished downloading all available artist thumbnails locally!');
}

main();
