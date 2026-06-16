const fs = require('fs');
const path = require('path');

const pwaHeroPath = path.join(__dirname, '..', 'images', 'pwa_logo_hero.jpg');
const logoSmallPath = path.join(__dirname, '..', 'images', 'LogoSmall1050x1050.jpg');

console.log('pwa_logo_hero.jpg exists:', fs.existsSync(pwaHeroPath));
console.log('LogoSmall1050x1050.jpg exists:', fs.existsSync(logoSmallPath));

// Read first 100 bytes of both files to check headers
const pwaHeroHeader = fs.readFileSync(pwaHeroPath).slice(0, 100);
const logoSmallHeader = fs.readFileSync(logoSmallPath).slice(0, 100);

console.log('pwaHeroHeader:', pwaHeroHeader.toString('hex'));
console.log('logoSmallHeader:', logoSmallHeader.toString('hex'));
