const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = 'c:\\Users\\Gebruiker\\.gemini\\antigravity\\scratch\\popsongchordbook';
const oldVer = "3.189";
const newVer = "3.190";

const files = [
    "index.html",
    "songlist.html",
    "songlist-old.html",
    "js/app.js",
    "scrolling_chords.html",
    "ChordTrainer.html",
    "GuitarChordTrainer.html",
    "ChordTheory&Tips.html",
    "ChordTheory&TipsGuitar.html",
    "song.html",
    "artist.html",
    "changelog.html",
    "js/scrolling_chords.js",
    "teacher.html",
    "student.html",
    "student_detail.html",
    "teacher_students.html",
    "teacher_groups.html",
    "band.html"
];

console.log(`Bumping version from ${oldVer} to ${newVer}...`);

files.forEach(fileName => {
    const filePath = path.join(rootDir, fileName);
    if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${fileName}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // General replacements
    content = content.split(`?v=${oldVer}`).join(`?v=${newVer}`);
    content = content.split(`v${oldVer}`).join(`v${newVer}`);
    content = content.split(`'${oldVer}'`).join(`'${newVer}'`);
    content = content.split(`"${oldVer}"`).join(`"${newVer}"`);
    content = content.split(`>${oldVer}<`).join(`>${newVer}<`);

    // Specific replacements for changelog and comments
    if (fileName === "index.html") {
        const targetComment = "<!-- Version history: \n        v3.190";
        if (!content.includes(targetComment)) {
            content = content.replace(
                "<!-- Version history:",
                "<!-- Version history: \n        v3.190: Widened inline chord block editor to use wrapping textarea, and fixed admin privileges for secondary admins to access SongMap."
            );
            console.log("  - Updated index.html comment history block.");
        }
    }

    if (fileName === "changelog.html") {
        const targetChangelog = '<span class="version-number">v3.190</span>';
        if (!content.includes(targetChangelog)) {
            const oldCard = `<div class="version-card current">
                <div class="version-header">
                    <span class="version-number">v3.189</span>`;
                    
            const newCard = `<div class="version-card current">
                <div class="version-header">
                    <span class="version-number">v3.190</span>
                    <span class="version-date">July 3, 2026</span>
                </div>
                <div class="version-body">
                    <ul>
                        <li><strong>Chord Block Editor Width:</strong> Switched inline chord block edit field to a wrapping textarea, ensuring long chord blocks fit without clipping.</li>
                        <li><strong>Admin Privileges:</strong> Fixed SongMap and CTL column access for secondary administrators.</li>
                    </ul>
                </div>
            </div>

            <div class="version-card">
                <div class="version-header">
                    <span class="version-number">v3.189</span>`;
            
            content = content.replace(oldCard, newCard);
            console.log("  - Updated changelog.html list card block.");
        }
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated version in ${fileName}`);
});

// Run generate_static_pages.js and generate_sitemap.js to complete pre-rendering
console.log("Running static pages pre-renderer...");
try {
    const outputStatic = execSync("node scripts/generate_static_pages.js", { encoding: 'utf8', cwd: rootDir });
    console.log(outputStatic);
} catch (e) {
    console.error("Error running generate_static_pages.js:", e.message);
}

console.log("Generating sitemap...");
try {
    const outputSitemap = execSync("node scripts/generate_sitemap.js", { encoding: 'utf8', cwd: rootDir });
    console.log(outputSitemap);
} catch (e) {
    console.error("Error running generate_sitemap.js:", e.message);
}

console.log("Version bump and page generation complete!");
