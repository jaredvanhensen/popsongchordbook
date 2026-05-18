const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function main() {
    const inputPath = 'c:\\Users\\Gebruiker\\.gemini\\antigravity\\scratch\\popsongchordbook\\js\\data\\default_songs.js';
    const tempUploadPath = 'c:\\Users\\Gebruiker\\.gemini\\antigravity\\scratch\\popsongchordbook\\scratch\\songs_to_upload.json';

    console.log(`Reading songs from: ${inputPath}`);
    
    // Evaluate the file content securely to extract array
    const sandbox = {};
    const fn = new Function('sandbox', `${fs.readFileSync(inputPath, 'utf8')}\nsandbox.songs = DEFAULT_SONGS;`);
    fn(sandbox);
    const songs = sandbox.songs;

    console.log(`Loaded ${songs.length} songs from default_songs.js`);

    // Format songs as an object keyed by ID for Firebase Realtime Database
    const dbObject = {};
    songs.forEach(song => {
        if (!song.id) return;
        
        // Ensure that we preserve only public songs or clean up properties
        // The live database at /publicSongs stores only public songs
        if (song.isPublic) {
            // Re-map to preserve clean data structure
            dbObject[song.id] = {
                ...song,
                favorite: false, // Ensure favorite is false in the public database
                practiceCount: song.practiceCount ? String(song.practiceCount) : '0'
            };
        }
    });

    const publicCount = Object.keys(dbObject).length;
    console.log(`Formatted ${publicCount} public songs for upload.`);

    // Write clean UTF-8 JSON file
    fs.writeFileSync(tempUploadPath, JSON.stringify(dbObject, null, 4), 'utf8');
    console.log(`Saved temporary upload payload to: ${tempUploadPath}`);

    // Execute upload via authenticated Firebase CLI
    console.log('Uploading payload to live Firebase Realtime Database (/publicSongs)...');
    try {
        const cmd = `cmd /c firebase database:set /publicSongs "${tempUploadPath}" --force`;
        const output = execSync(cmd, { encoding: 'utf8' });
        console.log('Firebase CLI output:');
        console.log(output);
        console.log('🎉 Live database upload successful!');
    } catch (e) {
        console.error('Error during upload:', e.message);
        if (e.stdout) console.log('Stdout:', e.stdout);
        if (e.stderr) console.log('Stderr:', e.stderr);
    } finally {
        // Clean up temporary file
        if (fs.existsSync(tempUploadPath)) {
            fs.unlinkSync(tempUploadPath);
            console.log('Cleaned up temporary upload file.');
        }
    }
}

main();
