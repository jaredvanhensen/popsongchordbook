const https = require('https');
const fs = require('fs');
const path = require('path');

const token = process.argv[2];
const dbUrl = 'https://popsongchordbook-jared-default-rtdb.europe-west1.firebasedatabase.app/publicSongs.json';

if (!token) {
    console.error('Usage: node scripts/sync_songs.js <FIREBASE_TOKEN>');
    process.exit(1);
}

function fetchSongs() {
    console.log('Fetching songs from Firebase...');
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
