const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectId = "popsongchordbook-jared";
const songId = "1777830788521zasgkttgh";

const tempSetPath = path.join(__dirname, 'temp_set_user.json');

try {
    console.log('Fetching all users database path...');
    const getCmd = `npx firebase database:get "/users" --project ${projectId}`;
    const result = execSync(getCmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }).trim();
    
    if (!result || result === 'null') {
        console.log('No users found in database.');
        process.exit(0);
    }

    const users = JSON.parse(result);
    let foundCount = 0;

    for (const userId in users) {
        const user = users[userId];
        if (user.songs && user.songs[songId]) {
            const song = user.songs[songId];
            console.log(`\nFound copy under user ${userId} (${song.title})`);
            console.log(`Current externalUrl: "${song.externalUrl}"`);
            
            if (song.externalUrl !== "") {
                song.externalUrl = "";
                fs.writeFileSync(tempSetPath, JSON.stringify(song, null, 2));

                const setCmd = `npx firebase database:set "/users/${userId}/songs/${songId}" "${tempSetPath}" --force --project ${projectId}`;
                console.log(`Running: ${setCmd}`);
                execSync(setCmd, { stdio: 'inherit' });
                console.log(`Successfully cleared externalUrl under user ${userId}`);
                foundCount++;
            } else {
                console.log(`externalUrl is already empty under user ${userId}`);
            }
        }
    }

    console.log(`\nScan complete. Updated ${foundCount} user copies.`);
} catch (e) {
    console.error('Error scanning/updating user copies:', e.message);
}

if (fs.existsSync(tempSetPath)) {
    fs.unlinkSync(tempSetPath);
}
