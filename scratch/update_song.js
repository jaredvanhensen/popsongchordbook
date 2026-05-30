const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'js', 'data', 'default_songs.js');
console.log('Reading file:', filePath);
const content = fs.readFileSync(filePath, 'utf8');

const arrayStart = content.indexOf('[');
const arrayEnd = content.lastIndexOf(']') + 1;
const arrayStr = content.substring(arrayStart, arrayEnd);

console.log('Parsing JSON...');
let songs;
try {
    songs = JSON.parse(arrayStr);
} catch (e) {
    console.error('Failed to parse as JSON, trying evaluation...', e);
    // Fallback: evaluate the JS content
    eval(content);
    songs = DEFAULT_SONGS;
}

console.log('Total songs found:', songs.length);
const targetId = '1780077832924zuf69l6mo';
const songIdx = songs.findIndex(s => s.id === targetId);

if (songIdx === -1) {
    console.error('Could not find song with ID:', targetId);
    process.exit(1);
}

console.log('Found song at index:', songIdx, songs[songIdx].name);

const updatedSong = {
    "artist": "Lady A",
    "bridge": "",
    "bridgeCue": "",
    "bridgeTitle": "Block 4",
    "capo": 1,
    "chordData": {
        "barOffset": 0,
        "chords": [
            {
                "name": "Eb",
                "time": 5.591,
                "yOffset": -50
            },
            {
                "name": "Ab",
                "time": 9.237,
                "yOffset": -50
            },
            {
                "name": "Cm",
                "time": 13.295,
                "yOffset": -65
            },
            {
                "name": "Bb",
                "time": 15.36,
                "yOffset": -35
            },
            {
                "name": "Ab",
                "time": 17.39,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 0,
                "lyricWordIdx": 3,
                "name": "Eb",
                "time": 21.551,
                "yOffset": -50
            },
            {
                "lyricLineIdx": 1,
                "lyricWordIdx": 3,
                "name": "Ab",
                "time": 25.629,
                "yOffset": -50
            },
            {
                "lyricLineIdx": 2,
                "lyricWordIdx": 0,
                "name": "Cm",
                "time": 29.72,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 3,
                "lyricWordIdx": 1,
                "name": "Bb",
                "time": 31.82,
                "yOffset": -35
            },
            {
                "lyricLineIdx": 3,
                "lyricWordIdx": 5,
                "name": "Ab",
                "time": 33.868,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 4,
                "lyricWordIdx": 4,
                "name": "Eb",
                "time": 37.992,
                "yOffset": -50
            },
            {
                "lyricLineIdx": 5,
                "lyricWordIdx": 4,
                "name": "Ab",
                "time": 42.102,
                "yOffset": -50
            },
            {
                "lyricLineIdx": 6,
                "lyricWordIdx": 1,
                "name": "Cm",
                "time": 46.158,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 6,
                "lyricWordIdx": 4,
                "name": "Bb",
                "time": 48.191,
                "yOffset": -35
            },
            {
                "lyricLineIdx": 7,
                "lyricWordIdx": 7,
                "name": "Ab",
                "time": 50.262,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 8,
                "lyricWordIdx": 4,
                "name": "Ab",
                "time": 54.415,
                "yOffset": -35
            },
            {
                "lyricLineIdx": 8,
                "lyricWordIdx": 8,
                "name": "Eb",
                "time": 56.406,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 9,
                "lyricWordIdx": 2,
                "name": "Bb",
                "time": 58.414,
                "yOffset": -35
            },
            {
                "lyricLineIdx": 9,
                "lyricWordIdx": 7,
                "name": "Cm",
                "time": 60.525,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 10,
                "lyricWordIdx": 0,
                "name": "Ab",
                "time": 62.582,
                "yOffset": -35
            },
            {
                "lyricLineIdx": 10,
                "lyricWordIdx": 6,
                "name": "Eb",
                "time": 64.597,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 11,
                "lyricWordIdx": 3,
                "name": "Bb",
                "time": 66.652,
                "yOffset": -35
            },
            {
                "lyricLineIdx": 12,
                "lyricWordIdx": 3,
                "name": "Ab",
                "time": 70.757,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 12,
                "lyricWordIdx": 7,
                "name": "Eb",
                "time": 72.831,
                "yOffset": -35
            },
            {
                "lyricLineIdx": 13,
                "lyricWordIdx": 0,
                "name": "Bb",
                "time": 74.839,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 13,
                "lyricWordIdx": 4,
                "name": "Cm",
                "time": 76.948,
                "yOffset": -35
            },
            {
                "lyricLineIdx": 14,
                "lyricWordIdx": 2,
                "name": "Ab",
                "time": 79.013,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 14,
                "lyricWordIdx": 5,
                "name": "Eb",
                "time": 81.06,
                "yOffset": -35
            },
            {
                "lyricLineIdx": 14,
                "lyricWordIdx": 7,
                "name": "Bb",
                "time": 83.063,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 15,
                "lyricWordIdx": 5,
                "name": "Ab",
                "time": 85.125,
                "yOffset": -35
            },
            {
                "name": "Eb",
                "time": 88.534,
                "yOffset": -50
            },
            {
                "name": "Ab",
                "time": 91.305,
                "yOffset": -50
            },
            {
                "lyricLineIdx": 16,
                "lyricWordIdx": 2,
                "name": "Eb",
                "time": 95.388,
                "yOffset": -50
            },
            {
                "lyricLineIdx": 17,
                "lyricWordIdx": 4,
                "name": "Ab",
                "time": 99.509,
                "yOffset": -50
            },
            {
                "lyricLineIdx": 18,
                "lyricWordIdx": 3,
                "name": "Cm",
                "time": 103.593,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 19,
                "lyricWordIdx": 2,
                "name": "Bb",
                "time": 105.6,
                "yOffset": -35
            },
            {
                "lyricLineIdx": 19,
                "lyricWordIdx": 5,
                "name": "Ab",
                "time": 107.702,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 20,
                "lyricWordIdx": 3,
                "name": "Ab",
                "time": 111.804,
                "yOffset": -35
            },
            {
                "lyricLineIdx": 20,
                "lyricWordIdx": 7,
                "name": "Eb",
                "time": 113.878,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 21,
                "lyricWordIdx": 2,
                "name": "Bb",
                "time": 115.921,
                "yOffset": -35
            },
            {
                "lyricLineIdx": 21,
                "lyricWordIdx": 7,
                "name": "Cm",
                "time": 117.94,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 22,
                "lyricWordIdx": 0,
                "name": "Ab",
                "time": 119.996,
                "yOffset": -35
            },
            {
                "lyricLineIdx": 22,
                "lyricWordIdx": 6,
                "name": "Eb",
                "time": 122.053,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 23,
                "lyricWordIdx": 3,
                "name": "Bb",
                "time": 124.063,
                "yOffset": -35
            },
            {
                "lyricLineIdx": 24,
                "lyricWordIdx": 3,
                "name": "Ab",
                "time": 128.214,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 24,
                "lyricWordIdx": 7,
                "name": "Eb",
                "time": 130.264,
                "yOffset": -35
            },
            {
                "lyricLineIdx": 25,
                "lyricWordIdx": 0,
                "name": "Bb",
                "time": 132.342,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 25,
                "lyricWordIdx": 4,
                "name": "Cm",
                "time": 134.437,
                "yOffset": -35
            },
            {
                "lyricLineIdx": 26,
                "lyricWordIdx": 2,
                "name": "Ab",
                "time": 136.433,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 26,
                "lyricWordIdx": 5,
                "name": "Eb",
                "time": 138.516,
                "yOffset": -35
            },
            {
                "lyricLineIdx": 26,
                "lyricWordIdx": 7,
                "name": "Bb",
                "time": 140.504,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 27,
                "lyricWordIdx": 5,
                "name": "Ab",
                "time": 144.5,
                "yOffset": -35
            },
            {
                "lyricLineIdx": 28,
                "lyricWordIdx": 0,
                "name": "Eb",
                "time": 146.642,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 28,
                "lyricWordIdx": 1,
                "name": "Bb",
                "time": 148.718,
                "yOffset": -35
            },
            {
                "lyricLineIdx": 28,
                "lyricWordIdx": 2,
                "name": "Cm",
                "time": 150.739,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 28,
                "lyricWordIdx": 4,
                "name": "Ab",
                "time": 152.811,
                "yOffset": -35
            },
            {
                "lyricLineIdx": 28,
                "lyricWordIdx": 5,
                "name": "Eb",
                "time": 154.846,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 28,
                "lyricWordIdx": 6,
                "name": "Bb",
                "time": 156.923,
                "yOffset": -35
            },
            {
                "lyricLineIdx": 29,
                "lyricWordIdx": 0,
                "name": "Ab",
                "time": 161.019,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 29,
                "lyricWordIdx": 3,
                "name": "Eb",
                "time": 163.088,
                "yOffset": -35
            },
            {
                "lyricLineIdx": 30,
                "lyricWordIdx": 0,
                "name": "Bb",
                "time": 165.121,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 30,
                "lyricWordIdx": 2,
                "name": "Cm",
                "time": 167.221,
                "yOffset": -35
            },
            {
                "lyricLineIdx": 31,
                "lyricWordIdx": 4,
                "name": "Ab",
                "time": 169.251,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 31,
                "lyricWordIdx": 6,
                "name": "Eb",
                "time": 171.303,
                "yOffset": -35
            },
            {
                "lyricLineIdx": 31,
                "lyricWordIdx": 9,
                "name": "Bb",
                "time": 173.337,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 32,
                "lyricWordIdx": 3,
                "name": "Ab",
                "time": 177.431,
                "yOffset": -35
            },
            {
                "lyricLineIdx": 32,
                "lyricWordIdx": 7,
                "name": "Eb",
                "time": 179.513,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 32,
                "lyricWordIdx": 9,
                "name": "Bb",
                "time": 181.566,
                "yOffset": -35
            },
            {
                "lyricLineIdx": 33,
                "lyricWordIdx": 0,
                "name": "Cm",
                "time": 183.578,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 33,
                "lyricWordIdx": 4,
                "name": "Ab",
                "time": 185.675,
                "yOffset": -35
            },
            {
                "lyricLineIdx": 34,
                "lyricWordIdx": 1,
                "name": "Eb",
                "time": 187.674,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 34,
                "lyricWordIdx": 6,
                "name": "Bb",
                "time": 189.74,
                "yOffset": -35
            },
            {
                "lyricLineIdx": 34,
                "lyricWordIdx": 8,
                "name": "Ab",
                "time": 192,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 35,
                "lyricWordIdx": 2,
                "name": "Eb",
                "time": 198.159,
                "yOffset": -50
            },
            {
                "lyricLineIdx": 35,
                "lyricWordIdx": 5,
                "name": "Ab",
                "time": 202.102,
                "yOffset": -50
            },
            {
                "lyricLineIdx": 36,
                "lyricWordIdx": 3,
                "name": "Cm",
                "time": 206.185,
                "yOffset": -65
            },
            {
                "lyricLineIdx": 36,
                "lyricWordIdx": 4,
                "name": "Bb",
                "time": 208.175,
                "yOffset": -35
            },
            {
                "lyricLineIdx": 37,
                "lyricWordIdx": 1,
                "name": "Ab",
                "time": 210.326,
                "yOffset": -65
            }
        ],
        "duration": 300,
        "name": "Lady A - What A Song Can Do",
        "tempo": 120,
        "useFlatNotation": false
    },
    "chorus": "Ab Eb Bb Cm Ab Eb Bb 2x",
    "chorusCue": "",
    "chorusTitle": "CHORUS",
    "dateAdded": "2026-05-29T18:03:52.924Z",
    "externalUrl": "",
    "favorite": false,
    "fullLyrics": "[00:21.55] Makes you wanna take a Sunday drive\n[00:25.63] Throws you right back to a different time\n[00:29.72] Puts your lighter up\n[00:31.82] Singing loud and out of tune\n[00:37.99] It puts a little sound in an empty space\n[00:42.10] And for a little while, lets you drift away\n[00:46.16] It's simple, but it's true\n[00:48.19] Yeah, it's crazy what a song can do\n[00:54.42] It can make you dance and make you cry\n[00:58.41] Make you wanna give it one more try\n[01:02.58] Start a band and kiss that girl\n[01:06.65] And break some rules\n[01:10.76] It'll make you give your heart and get it back\n[01:14.84] Change your mind just like that\n[01:19.01] When it's like every single line was written just for you\n[01:25.13] Ain't it crazy what a song can do?\n[01:35.39] Makes you make a call at 4 a.m.\n[01:39.51] Makes you say you want him all over again\n[01:43.59] It's like you knew it all along\n[01:45.60] Ain't it crazy that a song\n[01:51.80] Can make you dance and make you cry\n[01:55.92] Make you wanna give it one more try\n[01:59.99] Start a band and kiss that girl\n[02:04.06] And break some rules\n[02:08.21] It'll make you give your heart and get it back\n[02:12.34] Change your mind just like that\n[02:16.43] When it's like every single line was written just for you\n[02:24.50] Ain't it crazy what a song can do?\n[02:26.64] Woah, crazy what a song can do\n[02:41.02] Shake the ground, steal your breath\n[02:45.12] Feel that pounding in your chest\n[02:49.25] Bring you to your knees right there in that old church pew\n[02:57.43] Ooh, make you give your heart and get it back\n[03:03.58] Change your mind just like that\n[03:18.16] And most of all it's what brought me here to you\n[03:22.10] Ain't it crazy what a song (crazy what a song)\n[03:26.19] Crazy what a song can do?\n[03:30.33] (Ooh) crazy what a song can do\n[03:34.33] Crazy what a song can do\n[03:40.00]",
    "genre": [
        "Country"
    ],
    "id": "1780077832924zuf69l6mo",
    "isPublic": true,
    "key": "Eb",
    "lyricOffset": 0,
    "patchDetails": "",
    "performAbility": 0,
    "practiceCount": "0",
    "preChorus": "",
    "preChorusCue": "",
    "preChorusTitle": "Block 3",
    "songNotes": "",
    "submittedBy": "9oAEJa3dqsPKSAGrQdgOMxwZiNk2",
    "tempo": 120,
    "title": "What A Song Can Do",
    "verse": "Eb Ab Cm Bb Ab",
    "verseCue": "",
    "verseTitle": "INTRO & VERSE",
    "youtubeUrl": "https://youtu.be/bSRuc8h-GeM?si=FKyw7vQHTt0ROyiY"
};

songs[songIdx] = updatedSong;

console.log('Writing back to file...');
const newContent = '// Default songs to be loaded for new users if their library is empty.\n// Synchronized from Firebase on 2026-05-29\n\nconst DEFAULT_SONGS = ' + JSON.stringify(songs, null, 4) + ';\n';
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Update complete!');
