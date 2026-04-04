const fs = require('fs');
const path = require('path');

const repairs = [
    {
        file: 'index.html',
        fixes: [
            { from: /font-size='90'>.*?<\/text>/, to: "font-size='90'>🎸</text>" },
            { from: /<div class="instrument-icon" style="font-size: 3rem; margin-bottom: 10px;">.*?<\/div>/, to: '<div class="instrument-icon" style="font-size: 3rem; margin-bottom: 10px;">🎸</div>' },
            { from: /<div class="instrument-card piano-card" onclick="selectInstrument\('piano'\)"[\s\S]*?<div class="instrument-icon" style="font-size: 3rem; margin-bottom: 10px;">.*?<\/div>/, to: '<div class="instrument-card piano-card" onclick="selectInstrument(\'piano\')" style="cursor: pointer; transition: transform 0.2s; border: 2px solid transparent; background: #f8fafc; padding: 20px 15px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);"><div class="instrument-icon" style="font-size: 3rem; margin-bottom: 10px;">🎹</div>' }
        ]
    }
];

// Re-doing the emoji fix for songlist too
const songlistPath = path.join(process.cwd(), 'songlist.html');
if (fs.existsSync(songlistPath)) {
    let c = fs.readFileSync(songlistPath, 'utf8');
    c = c.replace(/<span class="icon">.*?<\/span>/g, '<span class="icon">🎸</span>');
    fs.writeFileSync(songlistPath, c, 'utf8');
}

repairs.forEach(r => {
    const p = path.join(process.cwd(), r.file);
    if (fs.existsSync(p)) {
        let c = fs.readFileSync(p, 'utf8');
        r.fixes.forEach(f => {
            c = c.replace(f.from, f.to);
        });
        fs.writeFileSync(p, c, 'utf8');
    }
});
