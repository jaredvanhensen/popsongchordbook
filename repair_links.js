const fs = require('fs');
const path = require('path');
const files = ['index.html', 'songlist.html', 'scrolling_chords.html', 'ChordTrainer.html'];

files.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // 1. Fix Firebase Script Tags (Recovering the closing tag)
        content = content.replace(/firebase-(app|auth|database|app-check)-compat\.js[^"'>]*\?.*?(?=["' \n>])/g, 'firebase-$1-compat.js"></script>');
        // Check for the "firebase...js?" pattern that produced the cut off
        content = content.replace(/firebase-([a-z-]+)-compat\.js\?[\s\n]*<script/g, 'firebase-$1-compat.js"></script>\n    <script');
        
        // 2. Fix local CSS links
        content = content.replace(/(\.css)(\?|\$)[^"<> ]*/g, '$1?v=2.546');
        
        // 3. Fix local JS script tags
        content = content.replace(/(\.js)(\?|\$)[^"<> ]*/g, '$1?v=2.546');
        
        // 4. Fix site version span
        content = content.replace(/site-version">[\d\.?]+/g, 'site-version">2.546');
        
        // 5. Fix truncated manifest link
        content = content.replace(/manifest\.js\?[^"']*["']?/g, 'manifest.json"');
        
        // 6. Fix corrupted meta descriptions
        content = content.replace(/content="\$12[^"]*/g, 'content="Pop Song Chord Book v2.546');
        
        // Cleanup double ?? or duplicated v= caused by previous bad repairs
        content = content.replace(/\?v=2\.546\.js\?v=2\.546/g, '?v=2.546');
        content = content.replace(/\?v=2\.54612\?v=2\.546/g, '?v=2.546');
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Successfully repaired: ${file}`);
    } else {
        console.log(`Skipping (not found): ${file}`);
    }
});
