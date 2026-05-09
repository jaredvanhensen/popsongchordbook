const fs = require('fs');

function extractSongsWithRegex(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        // Match the whole song object approximately to get artist and title
        // This is a bit tricky with regex, so let's just find "artist" and "title" near each other
        const songs = [];
        const songBlockRegex = /\{[^{}]*"title"\s*:\s*"([^"]+)"[^{}]*"artist"\s*:\s*"([^"]+)"[^{}]*\}/g;
        // Or "artist" first
        const songBlockRegex2 = /\{[^{}]*"artist"\s*:\s*"([^"]+)"[^{}]*"title"\s*:\s*"([^"]+)"[^{}]*\}/g;
        
        let match;
        while ((match = songBlockRegex.exec(content)) !== null) {
            songs.push({ title: match[1], artist: match[2] });
        }
        while ((match = songBlockRegex2.exec(content)) !== null) {
            songs.push({ title: match[2], artist: match[1] });
        }
        return songs;
    } catch (e) {
        console.error(`Error processing ${filePath}:`, e);
        return [];
    }
}

const oldExportPath = 'C:\\Users\\Gebruiker\\Downloads\\popsong-chordbook-2026-02-27.json';
const currentSongsPath = 'c:\\Users\\Gebruiker\\.gemini\\antigravity\\scratch\\popsongchordbook\\js\\data\\default_songs.js';

const oldSongs = extractSongsWithRegex(oldExportPath);
const currentSongs = extractSongsWithRegex(currentSongsPath);

const currentTitlesSet = new Set(currentSongs.map(s => s.title.toLowerCase()));

const missingInCurrent = oldSongs.filter(s => !currentTitlesSet.has(s.title.toLowerCase()));

console.log('--- MISSING SONGS (In Old Export but NOT in Current, Case-Insensitive) ---');
missingInCurrent.forEach(s => {
    console.log(`${s.artist} - ${s.title}`);
});

console.log(`\nSummary:`);
console.log(`Old Export Total: ${oldSongs.length}`);
console.log(`Current Total: ${currentSongs.length}`);
console.log(`Missing: ${missingInCurrent.length}`);
