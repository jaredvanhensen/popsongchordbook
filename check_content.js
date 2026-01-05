// Check if content elements are visible
const body = document.querySelector('.chord-detector-body');
const chordDisplay = document.getElementById('detectedChord');
const statusDisplay = document.getElementById('chordDetectorStatus');
const audioContainer = document.querySelector('.audio-level-container');
const audioBar = document.querySelector('.audio-level-bar');
const audioIndicator = document.getElementById('audioLevelIndicator');

console.log('=== Content Visibility Check ===');
console.log('Chord display found:', !!chordDisplay, chordDisplay?.textContent);
console.log('Chord display visible:', chordDisplay ? window.getComputedStyle(chordDisplay).display !== 'none' : 'N/A');
console.log('Status display found:', !!statusDisplay, statusDisplay?.textContent);
console.log('Audio container found:', !!audioContainer);
console.log('Audio bar found:', !!audioBar);
console.log('Audio indicator found:', !!audioIndicator);

if (audioContainer) {
  const rect = audioContainer.getBoundingClientRect();
  console.log('Audio container position:', {top: rect.top, left: rect.left, width: rect.width, height: rect.height});
  console.log('Audio container display:', window.getComputedStyle(audioContainer).display);
  console.log('Audio container visibility:', window.getComputedStyle(audioContainer).visibility);
}

if (audioBar) {
  const rect = audioBar.getBoundingClientRect();
  console.log('Audio bar position:', {top: rect.top, left: rect.left, width: rect.width, height: rect.height});
  console.log('Audio bar background:', window.getComputedStyle(audioBar).backgroundColor);
}

// Check body children
console.log('Body children count:', body?.children.length);
Array.from(body?.children || []).forEach((child, i) => {
  console.log(`Child ${i}:`, child.tagName, child.className, {
    display: window.getComputedStyle(child).display,
    visibility: window.getComputedStyle(child).visibility,
    offsetHeight: child.offsetHeight,
    offsetWidth: child.offsetWidth
  });
});
