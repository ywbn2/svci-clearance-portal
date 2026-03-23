const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// Fix the old non-scrollable overlay pattern used by remaining inline modals
const oldStyle = `position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.30)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', transition: 'opacity 0.2s ease' }} className="flex items-center justify-center p-4 animate-fade-in"`;
const newStyle = `position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.30)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', transition: 'opacity 0.2s ease', overflowY: 'auto' }} className="flex items-start sm:items-center justify-center p-4 py-6 animate-fade-in"`;

code = code.split(oldStyle).join(newStyle);

// Also fix old non-scrollable max-h pattern on modal cards
code = code.split('max-h-[90vh] my-auto').join('my-auto');

fs.writeFileSync('src/App.jsx', code);
console.log("All modal overlays normalized for mobile scrolling!");
