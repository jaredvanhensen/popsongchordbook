const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const uid = "9oAEJa3dqsPKSAGrQdgOMxwZiNk2";
const projectId = "popsongchordbook-jared";
const songId = "1777830788521zasgkttgh";

const tempGetPath = path.join(__dirname, 'temp_get.json');
const tempSetPath = path.join(__dirname, 'temp_set.json');

function cleanSongInDb(dbPath) {
    console.log(`\n--- Processing DB Path: ${dbPath} ---`);
    try {
        // Step 1: Get data
        const getCmd = `npx firebase database:get "${dbPath}" --project ${projectId}`;
        console.log(`Running: ${getCmd}`);
        const result = execSync(getCmd, { encoding: 'utf8' }).trim();
        
        if (!result || result === 'null') {
            console.log(`No song found at path: ${dbPath}`);
            return;
        }

        let song;
        try {
            song = JSON.parse(result);
        } catch (e) {
            console.error('Error parsing JSON result:', e);
            return;
        }

        console.log(`Found song: "${song.title}" by ${song.artist}`);
        console.log(`Current externalUrl value: "${song.externalUrl}"`);

        if (song.externalUrl !== "") {
            song.externalUrl = "";
            fs.writeFileSync(tempSetPath, JSON.stringify(song, null, 2));

            // Step 2: Set data back
            const setCmd = `npx firebase database:set "${dbPath}" "${tempSetPath}" --force --project ${projectId}`;
            console.log(`Running: ${setCmd}`);
            execSync(setCmd, { stdio: 'inherit' });
            console.log(`Successfully cleared externalUrl at path: ${dbPath}`);
        } else {
            console.log(`externalUrl is already empty for this song at path: ${dbPath}`);
        }
    } catch (e) {
        console.error(`Error processing path ${dbPath}:`, e.message);
    }
}

// Clear the public song copy
cleanSongInDb(`/publicSongs/${songId}`);

// Clean up temp files if they exist
if (fs.existsSync(tempSetPath)) {
    fs.unlinkSync(tempSetPath);
}
console.log('\nFinished cleanup task!');
