const fs = require('fs');
const path = require('path');

const inputPath = 'c:\\Users\\Gebruiker\\.gemini\\antigravity\\scratch\\popsongchordbook\\js\\data\\default_songs.js';

// Load default songs array
const sandbox = {};
const fileContent = fs.readFileSync(inputPath, 'utf8');
const fn = new Function('sandbox', `${fileContent}\nsandbox.songs = DEFAULT_SONGS;`);
fn(sandbox);
const songs = sandbox.songs;

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

let enforcedCount = 0;

Object.entries(verifiedYears).forEach(([key, year]) => {
    const parts = key.split(' - ');
    const artist = parts[0];
    const title = parts[1];

    const dbSong = findMatchingSong(songs, artist, title);
    if (dbSong) {
        dbSong.year = year;
        enforcedCount++;
        console.log(`Enforced: "${dbSong.artist} - ${dbSong.title}" -> ${year}`);
    } else {
        console.warn(`⚠️ Mismatch key: ${key}`);
    }
});

console.log(`Enforced years for ${enforcedCount} songs.`);

// Write back to default_songs.js
const today = new Date().toISOString().split('T')[0];
const content = `// Default songs to be loaded for new users if their library is empty.
// Synchronized from Firebase on ${today}

const DEFAULT_SONGS = ${JSON.stringify(songs, null, 4)};
`;

fs.writeFileSync(inputPath, content, 'utf8');
console.log('Successfully updated default_songs.js with verified years!');
