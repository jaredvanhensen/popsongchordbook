const { execSync } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');

const token = process.argv[2];
const dbUrl = 'https://popsongchordbook-jared-default-rtdb.europe-west1.firebasedatabase.app/publicSongs.json';

function processJSON(json) {
    // The database stores songs as an object or array. 
    // We want to normalize it to an array.
    const songs = Array.isArray(json) ? json : Object.values(json);
    
    // Clean up songs (remove nulls, sort)
    const cleanSongs = songs.filter(s => s && s.title && s.artist);
    cleanSongs.sort((a, b) => {
        const artistCmp = (a.artist || '').localeCompare(b.artist || '');
        return artistCmp !== 0 ? artistCmp : (a.title || '').localeCompare(b.title || '');
    });

    console.log(`Fetched ${cleanSongs.length} songs.`);

    const today = new Date().toISOString().split('T')[0];
    const content = `// Default songs to be loaded for new users if their library is empty.
// Synchronized from Firebase on ${today}

const DEFAULT_SONGS = ${JSON.stringify(cleanSongs, null, 4)};
`;

    const filePath = path.join(__dirname, '../js/data/default_songs.js');
    fs.writeFileSync(filePath, content);
    console.log(`Successfully updated ${filePath}`);
}

function fetchSongs() {
    if (!token) {
        console.log('No token provided. Attempting to fetch songs via Firebase CLI...');
        try {
            const output = execSync('npx firebase database:get /publicSongs --instance popsongchordbook-jared-default-rtdb', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
            const json = JSON.parse(output);
            processJSON(json);
        } catch (err) {
            console.error('Failed to fetch via Firebase CLI:', err.message);
            console.error('Usage: node scripts/sync_songs.js <FIREBASE_TOKEN>');
            process.exit(1);
        }
        return;
    }

    console.log('Fetching songs from Firebase via HTTPS HTTPS...');
    const url = `${dbUrl}?auth=${token}`;

    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                if (json.error) {
                    throw new Error(json.error);
                }
                processJSON(json);
            } catch (e) {
                console.error('Error processing data:', e.message);
                process.exit(1);
            }
        });
    }).on('error', (err) => {
        console.error('Fetch error:', err.message);
        process.exit(1);
    });
}

fetchSongs();
