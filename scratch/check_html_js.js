const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, '../songlist.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Simple regex to extract script contents (ignoring attributes, src, etc.)
const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;
let errors = 0;

while ((match = scriptRegex.exec(html)) !== null) {
    const scriptContent = match[1].trim();
    if (!scriptContent) continue;
    
    // Skip external script references (which won't have inline code)
    if (match[0].includes('src=')) continue;

    count++;
    try {
        new vm.Script(scriptContent);
    } catch (err) {
        console.error(`Syntax error in script block #${count}:`);
        console.error(err.stack);
        errors++;
    }
}

console.log(`Checked ${count} inline script blocks. Found ${errors} errors.`);
process.exit(errors > 0 ? 1 : 0);
