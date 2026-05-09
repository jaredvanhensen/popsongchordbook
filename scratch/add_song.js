const fs = require('fs');

const songToAdd = {
  "artist": "Tears For Fears",
  "title": "Advice For The Young At Heart",
  "verse": "Fmaj7   Em7 | Cmaj7",
  "chorus": "Gm7   Bb   C2 I C Bb C2/D F (D)",
  "preChorus": "Bb   Am7   Bb Am7",
  "bridge": "",
  "favorite": false,
  "youtubeUrl": "https://youtu.be/vBtzFOgKcv8?si=CtR77iHXr2SpztFE",
  "externalUrl": "https://tabs.ultimate-guitar.com/tab/tears-for-fears/advice-for-the-young-at-heart-chords-268727",
  "key": "F",
  "verseCue": "",
  "preChorusCue": "",
  "chorusCue": "",
  "bridgeCue": "",
  "fullLyrics": "[00:00.000] Advice For The Young At Heart - Tears For Fears\n[00:04.720] Advice for the young at heart\n[00:08.375] Soon we will be older\n[00:12.359] When we're gonna make it work \n[00:34.124] Too many people living in a secret world\n[00:40.220] While they play mothers and fathers\n[00:43.784] We play little boys and girls\n[00:51.554] When we're gonna make it work \n[00:57.747] I could be happy  I could be quite nice\n[01:03.882] It's only me and my shadow happy in our make believe  soon\n[01:14.670] And with the hounds at bay I'll call your bluff\n[01:22.136] 'Cause it would be okay to walk on tiptoes everyday\n[01:28.425] And when I think of you and all the love that's due\n[01:32.243] I'll make a promise  I'll make a stand\n[01:35.881] 'Cause to these big brown eyes this comes as no surprise\n[01:39.990] We've got the whole wide world in our hands\n[01:46.489] Advice for the young at heart\n[01:50.302] Soon we will be older\n[01:54.116] When we're gonna make it work \n[02:00.365] Love is a promise  love is a souvenir\n[02:06.316] Once given never forgotten  never let it disappear\n[02:13.924] This could be our last chance\n[02:17.781] When we're gonna make it work  working hour is over \n[02:33.209] How it makes me weep\n[02:35.454] 'Cause someone sent my soul to sleep\n[02:39.073] And when I think of you and all the love that's due\n[02:42.697] I'll make a promise  I'll make a stand\n[02:46.574] 'Cause to these big brown eyes this comes as no surprise\n[02:50.573] We've got the whole wide world in our hands\n[03:24.013] We've got the whole wide world in our hands\n[03:31.851] We've got the whole wide world in our hands  in our hands\n[03:44.163] Advice for the young at heart\n[03:47.788] Soon we will be older\n[03:51.712] When we're gonna make it work \n[03:58.997] Advice for the young at heart\n[04:03.483] Soon we will be older\n[04:07.495] When we're gonna make it work  working hour is over \n[04:17.357] We can do anything that we want\n[04:29.234] Anything that we feel like doing\n[04:40.928] Advice\n[04:43.114]",
  "chordData": {
    "chords": [
      { "name": "Fmaj7", "time": 0 },
      { "name": "Em7", "time": 7.87 },
      { "name": "Fmaj7", "time": 15.74 },
      { "name": "Em7", "time": 23.61 },
      { "name": "Fmaj7", "time": 31.48 },
      { "name": "Em7", "time": 39.35 },
      { "name": "Fmaj7", "time": 47.22 },
      { "name": "Em7", "time": 55.09 },
      { "name": "Fmaj7", "time": 62.96 },
      { "name": "Em7", "time": 70.83 },
      { "name": "Fmaj7", "time": 78.7 },
      { "name": "Em7", "time": 86.57 },
      { "name": "Cmaj7", "time": 94.44 },
      { "name": "Cmaj7", "time": 102.31 },
      { "name": "Fmaj7", "time": 110.18 },
      { "name": "Em7", "time": 118.05 },
      { "name": "Fmaj7", "time": 125.92 },
      { "name": "Em7", "time": 133.79 },
      { "name": "Fmaj7", "time": 141.66 },
      { "name": "Em7", "time": 149.53 },
      { "name": "Fmaj7", "time": 157.4 },
      { "name": "Em7", "time": 165.27 },
      { "name": "Gm7", "time": 173.14 },
      { "name": "Bb", "time": 181.01 },
      { "name": "C", "time": 188.88 },
      { "name": "Gm7", "time": 196.75 },
      { "name": "Bb", "time": 204.62 },
      { "name": "C", "time": 212.49 },
      { "name": "Bb", "time": 220.36 },
      { "name": "C", "time": 228.23 },
      { "name": "Bb", "time": 236.1 },
      { "name": "C", "time": 243.97 },
      { "name": "Fmaj7", "time": 251.84 },
      { "name": "Em7", "time": 259.71 },
      { "name": "Fmaj7", "time": 267.58 },
      { "name": "Em7", "time": 275.45 },
      { "name": "Fmaj7", "time": 283.32 },
      { "name": "Em7", "time": 291.19 },
      { "name": "Fmaj7", "time": 299.06 },
      { "name": "Em7", "time": 306.93 },
      { "name": "Cmaj7", "time": 314.8 },
      { "name": "Cmaj7", "time": 322.67 },
      { "name": "Gm7", "time": 330.54 },
      { "name": "Bb", "time": 338.41 },
      { "name": "C", "time": 346.28 },
      { "name": "Gm7", "time": 354.15 },
      { "name": "Bb", "time": 362.02 },
      { "name": "C", "time": 369.89 },
      { "name": "Bb", "time": 377.76 },
      { "name": "C", "time": 385.63 },
      { "name": "Bb", "time": 393.5 },
      { "name": "Am7", "time": 401.37 },
      { "name": "Am7", "time": 409.24 },
      { "name": "Bb", "time": 417.11 },
      { "name": "Am7", "time": 424.98 },
      { "name": "Am7", "time": 432.85 },
      { "name": "Fmaj7", "time": 440.72 },
      { "name": "Em7", "time": 448.59 },
      { "name": "Fmaj7", "time": 456.46 },
      { "name": "Em7", "time": 464.33 },
      { "name": "Fmaj7", "time": 472.2 },
      { "name": "Em7", "time": 480.07 },
      { "name": "Fmaj7", "time": 487.94 },
      { "name": "Em7", "time": 495.81 },
      { "name": "Fmaj7", "time": 503.68 },
      { "name": "Em7", "time": 511.55 },
      { "name": "Fmaj7", "time": 519.42 },
      { "name": "Em7", "time": 527.29 }
    ],
    "duration": 534.59,
    "name": "Advice1",
    "tempo": 122
  },
  "practiceCount": "1",
  "patchDetails": "",
  "lyricOffset": 0,
  "performAbility": 0,
  "verseTitle": "Block 1",
  "preChorusTitle": "Block 3",
  "chorusTitle": "Block 2",
  "bridgeTitle": "Block 4",
  "id": 216,
  "tempo": 122
};

const currentSongsPath = 'c:\\Users\\Gebruiker\\.gemini\\antigravity\\scratch\\popsongchordbook\\js\\data\\default_songs.js';

try {
    let content = fs.readFileSync(currentSongsPath, 'utf8');
    
    // Find the end of the array ]
    const lastBracketIndex = content.lastIndexOf(']');
    if (lastBracketIndex === -1) {
        throw new Error('Could not find end of DEFAULT_SONGS array');
    }
    
    // Check if we need to add a comma before the new song
    const beforeBracket = content.substring(0, lastBracketIndex).trim();
    const needsComma = !beforeBracket.endsWith(',') && !beforeBracket.endsWith('[');
    
    const newSongString = JSON.stringify(songToAdd, null, 4);
    const updatedContent = content.substring(0, lastBracketIndex).trimEnd() + 
                           (needsComma ? ',\n' : '\n') + 
                           newSongString + '\n' + 
                           content.substring(lastBracketIndex);
    
    fs.writeFileSync(currentSongsPath, updatedContent);
    console.log('Successfully added song to default_songs.js');
} catch (e) {
    console.error('Error adding song:', e);
    process.exit(1);
}
