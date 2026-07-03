const https = require('https');

function queryMusicBrainz(artist, title) {
    return new Promise((resolve, reject) => {
        const cleanArtist = artist.replace(/['"’]/g, '');
        const cleanTitle = title.replace(/['"’]/g, '');
        const query = encodeURIComponent(`recording:"${cleanTitle}" AND artist:"${cleanArtist}"`);
        const url = `https://musicbrainz.org/ws/2/recording/?query=${query}&fmt=json`;

        const options = {
            headers: {
                'User-Agent': 'PopSongChordBook/1.0.0 ( contact@popsongchordbook.com )'
            }
        };

        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function run() {
    try {
        const result = await queryMusicBrainz("George Michael", "Freedom! '90");
        if (result.recordings && result.recordings.length > 0) {
            let oldestYear = Infinity;
            result.recordings.forEach(rec => {
                const dateStr = rec['first-release-date'];
                if (dateStr) {
                    const match = dateStr.match(/^(\d{4})/);
                    if (match) {
                        const year = parseInt(match[1]);
                        if (year >= 1900 && year <= 2026 && year < oldestYear) {
                            oldestYear = year;
                        }
                    }
                }
            });
            console.log(`Oldest year found: ${oldestYear}`);
        } else {
            console.log("No recordings found.");
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
