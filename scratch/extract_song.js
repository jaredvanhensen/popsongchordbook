const fs = require('fs');

const oldExportPath = 'C:\\Users\\Gebruiker\\Downloads\\popsong-chordbook-2026-02-27.json';
const targetTitle = "Advice For The Young At Heart";

try {
    const content = fs.readFileSync(oldExportPath, 'utf8');
    const data = JSON.parse(content);
    const song = data.songs.find(s => s.title === targetTitle);
    
    if (song) {
        console.log(JSON.stringify(song, null, 2));
    } else {
        console.error(`Song "${targetTitle}" not found in ${oldExportPath}`);
    }
} catch (e) {
    console.error(`Error processing ${oldExportPath}:`, e);
}
