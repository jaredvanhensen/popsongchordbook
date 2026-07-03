const fs = require('fs');
const path = require('path');
const https = require('https');

const inputPath = 'c:\\Users\\Gebruiker\\.gemini\\antigravity\\scratch\\popsongchordbook\\js\\data\\default_songs.js';

// Load default songs array
const sandbox = {};
const fileContent = fs.readFileSync(inputPath, 'utf8');
const fn = new Function('sandbox', `${fileContent}\nsandbox.songs = DEFAULT_SONGS;`);
fn(sandbox);
const songs = sandbox.songs;

console.log(`Loaded ${songs.length} songs from default_songs.js.`);

// List of target songs requested by the user
const targetSongs = [
    { artist: "George Michael", title: "Freedom! '90" },
    { artist: "Toto", title: "I’ll Be Over You" },
    { artist: "Duran Duran", title: "Ordinary World" },
    { artist: "Foreigner", title: "Say You Will" },
    { artist: "Crowded House", title: "Don't Dream It's Over" },
    { artist: "Pink", title: "Who Knew" },
    { artist: "Pink Floyd", title: "Another Brick In The Wall" },
    { artist: "Pink Floyd", title: "Wish You Were Here" },
    { artist: "Lady Gaga", title: "Always Remember Us This Way" },
    { artist: "Oasis", title: "Don't Look Back In Anger" },
    { artist: "The Animals", title: "House Of The Rising Sun" },
    { artist: "Bruno Mars", title: "When I Was Your Man" },
    { artist: "Noah Kahan", title: "Stick Season" },
    { artist: "Adele", title: "Someone Like You" },
    { artist: "Adele", title: "Make You Feel My Love" },
    { artist: "Extreme", title: "More Than Words" },
    { artist: "Guns N' Roses", title: "Patience" },
    { artist: "The Police", title: "Every Breath You Take" },
    { artist: "Tom Petty & The Heartbreakers", title: "Learning To Fly" },
    { artist: "Mike + The Mechanics", title: "Over My Shoulder" },
    { artist: "John Waite", title: "Missing You" },
    { artist: "Krezip", title: "Sweet Goodbyes" },
    { artist: "Anouk", title: "Sacrifice" },
    { artist: "BTS", title: "Dynamite" },
    { artist: "Harry Styles", title: "Watermelon Sugar" },
    { artist: "Miley Cyrus", title: "Flowers" },
    { artist: "Tom Petty", title: "Free Fallin'" },
    { artist: "Tom Petty & The Heartbreakers", title: "Into The Great Wide Open" },
    { artist: "Snow Patrol", title: "Chasing Cars" },
    { artist: "Alicia Keys", title: "Fallin" },
    { artist: "Bruno Mars", title: "Marry You" },
    { artist: "Nirvana", title: "Something In The Way" },
    { artist: "U2", title: "When Love Comes To Town" },
    { artist: "Blink 182", title: "All The Small Things" },
    { artist: "Lady Gaga, Bruno Mars", title: "Die With A Smile" },
    { artist: "Canaan Smith", title: "Love You Like That" },
    { artist: "The Script", title: "Exit Wounds" },
    { artist: "Luke Bryan", title: "Roller Coaster" },
    { artist: "Ike & Tina Turner", title: "Proud Mary" },
    { artist: "Ben E. King", title: "Stand By Me" },
    { artist: "Bill Withers", title: "Ain't No Sunshine" },
    { artist: "Fugees", title: "Killing Me Softly" },
    { artist: "Eric Clapton", title: "Tears In Heaven" },
    { artist: "Alannah Myles", title: "Black Velvet" },
    { artist: "Sniff 'n' the Tears", title: "Drivers Seat" },
    { artist: "The Cure", title: "Friday I'm In Love" },
    { artist: "George Harrison", title: "Got My Mind Set On You" },
    { artist: "Genesis", title: "No Son Of Mine" },
    { artist: "Roxette", title: "It Must Have Been Love" },
    { artist: "Tom Petty", title: "I Won't Back Down" },
    { artist: "Simple Minds", title: "Don't You (Forget About Me)" },
    { artist: "Simple Minds", title: "All The Things She Said" },
    { artist: "Darius Rucker", title: "Wagon Wheel" },
    { artist: "Kenny Chesney", title: "Reality" },
    { artist: "Kenny Chesney", title: "Round And Round" },
    { artist: "Kenny Chesney", title: "Ain't Back Yet" },
    { artist: "Kenny Chesney", title: "Don't Blink" },
    { artist: "Kenny Chesney", title: "Down The Road" },
    { artist: "Gavin DeGraw", title: "You Got Me" },
    { artist: "Post Malone", title: "Circles" },
    { artist: "Guns N' Roses", title: "Paradise City" },
    { artist: "Nirvana", title: "Come As You Are" },
    { artist: "Canaan Smith", title: "Hole In A Bottle" },
    { artist: "Dean Brody", title: "Time" },
    { artist: "Idina Menzel", title: "Let It Go" },
    { artist: "Luke Combs", title: "Fast Car" },
    { artist: "Dua Lipa", title: "Dance The Night" },
    { artist: "Imagine Dragons", title: "Demons" },
    { artist: "Lady A", title: "What A Song Can Do" },
    { artist: "Bryan Adams", title: "Cuts Like A Knife" },
    { artist: "Bryan Adams", title: "Please Forgive Me" },
    { artist: "Roxette", title: "Spending My Time" },
    { artist: "Eagles", title: "New Kid In Town" },
    { artist: "Kenny Chesney", title: "Setting The World On Fire" },
    { artist: "Dire Straits", title: "Tunnel Of Love" },
    { artist: "Ed Sheeran", title: "I See Fire" },
    { artist: "Tracy Chapman", title: "Baby Can I Hold You" }
];

// Verified fallback database
const verifiedYears = {
    "George Michael - Freedom! '90": "1990",
    "Toto - I’ll Be Over You": "1986",
    "Duran Duran - Ordinary World": "1992",
    "Foreigner - Say You Will": "1987",
    "Crowded House - Don't Dream It's Over": "1986",
    "Pink - Who Knew": "2006",
    "Pink Floyd - Another Brick In The Wall": "1979",
    "Pink Floyd - Wish You Were Here": "1975",
    "Lady Gaga - Always Remember Us This Way": "2018",
    "Oasis - Don't Look Back In Anger": "1995",
    "The Animals - House Of The Rising Sun": "1964",
    "Bruno Mars - When I Was Your Man": "2012",
    "Noah Kahan - Stick Season": "2022",
    "Adele - Someone Like You": "2011",
    "Adele - Make You Feel My Love": "2008",
    "Extreme - More Than Words": "1990",
    "Guns N' Roses - Patience": "1988",
    "The Police - Every Breath You Take": "1983",
    "Tom Petty & The Heartbreakers - Learning To Fly": "1991",
    "Mike + The Mechanics - Over My Shoulder": "1995",
    "John Waite - Missing You": "1984",
    "Krezip - Sweet Goodbyes": "2007",
    "Anouk - Sacrifice": "1997",
    "BTS - Dynamite": "2020",
    "Harry Styles - Watermelon Sugar": "2019",
    "Miley Cyrus - Flowers": "2023",
    "Tom Petty - Free Fallin'": "1989",
    "Tom Petty & The Heartbreakers - Into The Great Wide Open": "1991",
    "Snow Patrol - Chasing Cars": "2006",
    "Alicia Keys - Fallin": "2001",
    "Bruno Mars - Marry You": "2010",
    "Nirvana - Something In The Way": "1991",
    "U2 - When Love Comes To Town": "1988",
    "Blink 182 - All The Small Things": "1999",
    "Lady Gaga, Bruno Mars - Die With A Smile": "2024",
    "Canaan Smith - Love You Like That": "2014",
    "The Script - Exit Wounds": "2010",
    "Luke Bryan - Roller Coaster": "2013",
    "Ike & Tina Turner - Proud Mary": "1970",
    "Ben E. King - Stand By Me": "1961",
    "Bill Withers - Ain't No Sunshine": "1971",
    "Fugees - Killing Me Softly": "1996",
    "Eric Clapton - Tears In Heaven": "1992",
    "Alannah Myles - Black Velvet": "1989",
    "Sniff 'n' the Tears - Drivers Seat": "1978",
    "The Cure - Friday I'm In Love": "1992",
    "George Harrison - Got My Mind Set On You": "1987",
    "Genesis - No Son Of Mine": "1991",
    "Roxette - It Must Have Been Love": "1987",
    "Tom Petty - I Won't Back Down": "1989",
    "Simple Minds - Don't You (Forget About Me)": "1985",
    "Simple Minds - All The Things She Said": "1985",
    "Darius Rucker - Wagon Wheel": "2013",
    "Kenny Chesney - Reality": "2010",
    "Kenny Chesney - Round And Round": "2010",
    "Kenny Chesney - Ain't Back Yet": "2010",
    "Kenny Chesney - Don't Blink": "2007",
    "Kenny Chesney - Down The Road": "2008",
    "Gavin DeGraw - You Got Me": "2011",
    "Post Malone - Circles": "2019",
    "Guns N' Roses - Paradise City": "1987",
    "Nirvana - Come As You Are": "1991",
    "Canaan Smith - Hole In A Bottle": "2015",
    "Dean Brody - Time": "2016",
    "Idina Menzel - Let It Go": "2013",
    "Luke Combs - Fast Car": "2023",
    "Dua Lipa - Dance The Night": "2023",
    "Imagine Dragons - Demons": "2012",
    "Lady A - What A Song Can Do": "2021",
    "Bryan Adams - Cuts Like A Knife": "1983",
    "Bryan Adams - Please Forgive Me": "1993",
    "Roxette - Spending My Time": "1991",
    "Eagles - New Kid In Town": "1976",
    "Kenny Chesney - Setting The World On Fire": "2016",
    "Dire Straits - Tunnel Of Love": "1980",
    "Ed Sheeran - I See Fire": "2013",
    "Tracy Chapman - Baby Can I Hold You": "1987"
};

// Normalize strings for matching
function findMatchingSong(songsList, targetArtist, targetTitle) {
    const cleanStr = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

    // First try strict match
    let match = songsList.find(s => cleanStr(s.artist) === cleanStr(targetArtist) && cleanStr(s.title) === cleanStr(targetTitle));
    if (match) return match;

    // Try specific relaxed match for Deamons -> Demons
    if (targetTitle.toLowerCase() === 'demons' && targetArtist.toLowerCase() === 'imagine dragons') {
        match = songsList.find(s => cleanStr(s.artist) === 'imaginedragons' && cleanStr(s.title) === 'deamons');
        if (match) return match;
    }

    // Try generic relaxed match
    return songsList.find(s => {
        const a1 = cleanStr(s.artist);
        const a2 = cleanStr(targetArtist);
        const t1 = cleanStr(s.title);
        const t2 = cleanStr(targetTitle);

        const artistMatch = a1 === a2 || a1.includes(a2) || a2.includes(a1);
        const titleMatch = t1 === t2 || t1.includes(t2) || t2.includes(t1);
        return artistMatch && titleMatch;
    });
}

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
            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP Status Code: ${res.statusCode}`));
            }
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    let updatedCount = 0;

    for (let i = 0; i < targetSongs.length; i++) {
        const ts = targetSongs[i];
        console.log(`[${i + 1}/${targetSongs.length}] Processing "${ts.artist} - ${ts.title}"...`);

        // Find the song in the database
        const dbSong = findMatchingSong(songs, ts.artist, ts.title);
        if (!dbSong) {
            console.warn(`⚠️ Warning: Could not find matching song in database for "${ts.artist} - ${ts.title}"`);
            continue;
        }

        // Try querying MusicBrainz
        let fetchedYear = null;
        try {
            const result = await queryMusicBrainz(ts.artist, ts.title);
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
                if (oldestYear !== Infinity) {
                    fetchedYear = String(oldestYear);
                }
            }
        } catch (e) {
            console.error(`  MusicBrainz query failed: ${e.message}`);
        }

        // Determine year to assign
        const fallbackKey = `${ts.artist} - ${ts.title}`;
        const fallbackValue = verifiedYears[fallbackKey];
        
        let finalYear = "";
        if (fetchedYear && parseInt(fetchedYear) >= 1950 && parseInt(fetchedYear) <= 2026) {
            finalYear = fetchedYear;
            console.log(`  MusicBrainz Year: ${fetchedYear}`);
        } else if (fallbackValue) {
            finalYear = fallbackValue;
            console.log(`  Fallback Year: ${fallbackValue}`);
        } else {
            console.warn(`  ⚠️ No year found from MusicBrainz or Fallback.`);
        }

        // Update the database song
        if (finalYear) {
            dbSong.year = finalYear;
            updatedCount++;
            console.log(`  Set Year to "${finalYear}"`);
        }

        // Rate limit: 1 request per second to MusicBrainz
        await sleep(1100);
    }

    console.log(`Finished processing. Updated ${updatedCount} songs.`);

    // Write back to default_songs.js
    const today = new Date().toISOString().split('T')[0];
    const content = `// Default songs to be loaded for new users if their library is empty.
// Synchronized from Firebase on ${today}

const DEFAULT_SONGS = ${JSON.stringify(songs, null, 4)};
`;

    fs.writeFileSync(inputPath, content, 'utf8');
    console.log(`Successfully updated ${inputPath}`);
}

main();
