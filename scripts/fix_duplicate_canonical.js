// fix_duplicate_canonical.js
// Removes the duplicate JS-injected canonical link from all song pages.
// Song pages already have a static canonical in <head>; the JS one is redundant.

const fs = require('fs');
const path = require('path');

const SONG_DIR = path.join(__dirname, 'song');

const BLOCK_TO_REMOVE = [
    '            // Inject Dynamic Canonical Link for SEO indexing',
    "            const canonicalLink = document.createElement('link');",
    "            canonicalLink.rel = 'canonical';",
    "            canonicalLink.href = window.location.origin + window.location.pathname;",
    "            document.head.appendChild(canonicalLink);"
].join('\n');

let fixed = 0;
let skipped = 0;
let alreadyClean = 0;

const songFolders = fs.readdirSync(SONG_DIR).filter(name => {
    return fs.statSync(path.join(SONG_DIR, name)).isDirectory();
});

console.log('Found ' + songFolders.length + ' song folders.\n');

for (const folder of songFolders) {
    const filePath = path.join(SONG_DIR, folder, 'index.html');

    if (!fs.existsSync(filePath)) {
        console.warn('  SKIP (no index.html): ' + folder);
        skipped++;
        continue;
    }

    const original = fs.readFileSync(filePath, 'utf8');

    if (!original.includes(BLOCK_TO_REMOVE)) {
        alreadyClean++;
        continue;
    }

    const updated = original.replace(BLOCK_TO_REMOVE, '');

    fs.writeFileSync(filePath, updated, 'utf8');
    fixed++;
}

console.log('Done.');
console.log('  Fixed:      ' + fixed + ' files');
console.log('  Already OK: ' + alreadyClean + ' files');
console.log('  Skipped:    ' + skipped + ' files');
