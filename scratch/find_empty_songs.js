const fs = require('fs');
const path = require('path');

const inputPath = 'c:\\Users\\Gebruiker\\.gemini\\antigravity\\scratch\\popsongchordbook\\js\\data\\default_songs.js';
const sandbox = {};
const fn = new Function('sandbox', `${fs.readFileSync(inputPath, 'utf8')}\nsandbox.songs = DEFAULT_SONGS;`);
fn(sandbox);
const songs = sandbox.songs;

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

console.log(`Checking ${targetSongs.length} target songs...`);

const cleanStr = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

targetSongs.forEach(ts => {
    let match = songs.find(s => cleanStr(s.artist) === cleanStr(ts.artist) && cleanStr(s.title) === cleanStr(ts.title));
    
    // Deamons -> Demons relaxed
    if (!match && ts.title.toLowerCase() === 'demons' && ts.artist.toLowerCase() === 'imagine dragons') {
        match = songs.find(s => cleanStr(s.artist) === 'imaginedragons' && cleanStr(s.title) === 'deamons');
    }
    
    // Generic fallback relaxed
    if (!match) {
        match = songs.find(s => {
            const a1 = cleanStr(s.artist);
            const a2 = cleanStr(ts.artist);
            const t1 = cleanStr(s.title);
            const t2 = cleanStr(ts.title);
            return (a1 === a2 || a1.includes(a2) || a2.includes(a1)) && (t1 === t2 || t1.includes(t2) || t2.includes(t1));
        });
    }

    if (!match) {
        console.log(`❌ NOT FOUND: "${ts.artist} - ${ts.title}"`);
    } else {
        console.log(`Found: ID=${match.id} | Artist="${match.artist}" | Title="${match.title}" | Year="${match.year}"`);
    }
});
