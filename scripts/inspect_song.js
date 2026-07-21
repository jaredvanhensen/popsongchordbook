// inspect_song.js - reads a song and prints its fields
const fs = require('fs');
const content = fs.readFileSync('./js/data/default_songs.js', 'utf8');

// Extract just the array by replacing the var declaration
const arrayContent = content.replace('const DEFAULT_SONGS = ', 'var DEFAULT_SONGS = ');
eval(arrayContent);

// Find Take on Me
const song = DEFAULT_SONGS.find(s => s.title && s.title.includes('Take on Me'));
console.log('Song:', song ? song.artist + ' - ' + song.title : 'not found');
if (song) {
    console.log('Keys:', Object.keys(song).join(', '));
    console.log('---');
    console.log('key:', song.key);
    console.log('tempo:', song.tempo);
    console.log('genre:', song.genre);
    console.log('difficulty:', song.difficulty);
    console.log('capo:', song.capo);
    console.log('verse:', song.verse);
    console.log('chorus:', song.chorus);
    console.log('bridge:', song.bridge);
    console.log('hasChordData:', !!song.chordData);
    console.log('chordCount:', song.chordData ? song.chordData.chords.length : 0);
    if (song.chordData) {
        // Get unique chord names
        const unique = [...new Set(song.chordData.chords.map(c => c.name))];
        console.log('uniqueChords:', unique.join(', '));
    }
    console.log('songMap:', song.songMap ? JSON.stringify(song.songMap.slice(0,5)) : 'none');
    console.log('outro:', song.outro);
}
