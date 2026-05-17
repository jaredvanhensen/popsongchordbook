const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'js', 'data', 'default_songs.js');
let content = fs.readFileSync(filePath, 'utf8');

const targetSongMarker = '"name": "Tears For Fears - Advice For The Young At Heart",';
const markerIndex = content.indexOf(targetSongMarker);

console.log('markerIndex:', markerIndex);

if (markerIndex !== -1) {
    const externalUrlStr = '"externalUrl"';
    const urlIndex = content.indexOf(externalUrlStr, markerIndex);
    console.log('urlIndex:', urlIndex);
    
    if (urlIndex !== -1) {
        console.log('Context around urlIndex:\n', content.substring(urlIndex - 50, urlIndex + 150));
    }
}
