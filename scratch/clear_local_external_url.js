const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'js', 'data', 'default_songs.js');
console.log('Reading file:', filePath);

let content = fs.readFileSync(filePath, 'utf8');

const targetSongMarker = '"name": "Tears For Fears - Advice For The Young At Heart",';
const markerIndex = content.indexOf(targetSongMarker);

if (markerIndex === -1) {
    console.error('Could not find Tears For Fears song marker in local default_songs.js!');
    process.exit(1);
}

// Find the nearest "externalUrl" after this marker
const externalUrlStr = '"externalUrl":';
const urlIndex = content.indexOf(externalUrlStr, markerIndex);

if (urlIndex === -1 || urlIndex - markerIndex > 10000) {
    console.error('Could not find externalUrl property near Tears For Fears song marker');
    process.exit(1);
}

// Find the quotes of the URL value
const valueStartIndex = content.indexOf('"', urlIndex + externalUrlStr.length);
const valueEndIndex = content.indexOf('"', valueStartIndex + 1);

const urlValue = content.substring(valueStartIndex + 1, valueEndIndex);
console.log('Found local externalUrl value:', urlValue);

if (urlValue !== '') {
    // Replace it with empty string
    const before = content.substring(0, valueStartIndex + 1);
    const after = content.substring(valueEndIndex);
    content = before + after;

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully cleared externalUrl value in local default_songs.js!');
} else {
    console.log('local externalUrl is already empty.');
}
