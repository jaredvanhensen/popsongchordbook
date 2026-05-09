const fs = require('fs');

const targetTitle = "Advice For The Young At Heart";
const currentSongsPath = 'c:\\Users\\Gebruiker\\.gemini\\antigravity\\scratch\\popsongchordbook\\js\\data\\default_songs.js';

try {
    let content = fs.readFileSync(currentSongsPath, 'utf8');
    
    // This is a bit complex for regex because of the object structure.
    // However, I just added it at the end.
    // Let's use a more robust way to find and remove it.
    
    // Find the start of the object with the title
    const titleIndex = content.lastIndexOf(`"title": "${targetTitle}"`);
    if (titleIndex === -1) {
        console.log('Song not found in default_songs.js, skipping removal.');
        process.exit(0);
    }
    
    // Find the start of the object { before the title
    const objectStart = content.lastIndexOf('{', titleIndex);
    
    // Find the end of the object } after the title
    // Since it's the last song, it's followed by ]
    const arrayEnd = content.lastIndexOf(']');
    const objectEnd = content.lastIndexOf('}', arrayEnd);
    
    if (objectStart === -1 || objectEnd === -1) {
        throw new Error('Could not determine object boundaries');
    }
    
    // Remove the object and the leading comma if it exists
    let newContent = content.substring(0, objectStart).trimEnd();
    if (newContent.endsWith(',')) {
        newContent = newContent.substring(0, newContent.length - 1).trimEnd();
    }
    newContent += '\n' + content.substring(arrayEnd);
    
    fs.writeFileSync(currentSongsPath, newContent);
    console.log('Successfully removed song from default_songs.js');
} catch (e) {
    console.error('Error removing song:', e);
    process.exit(1);
}
