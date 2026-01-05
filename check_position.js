// Check position and z-index
const body = document.querySelector('.chord-detector-body');
const overlay = document.querySelector('.chord-detector-overlay');
const rect = body.getBoundingClientRect();
console.log('Body position:', {
  top: rect.top,
  left: rect.left,
  right: rect.right,
  bottom: rect.bottom,
  width: rect.width,
  height: rect.height
});
console.log('Body z-index:', window.getComputedStyle(body).zIndex);
console.log('Overlay z-index:', window.getComputedStyle(overlay).zIndex);
console.log('Body transform:', window.getComputedStyle(body).transform);
console.log('Overlay transform:', window.getComputedStyle(overlay).transform);
console.log('Body overflow:', window.getComputedStyle(body).overflow);
console.log('Overlay overflow:', window.getComputedStyle(overlay).overflow);
console.log('Content overflow:', window.getComputedStyle(overlay.querySelector('.chord-detector-content')).overflow);
