const fs = require('fs');

let code = fs.readFileSync('src/App.jsx', 'utf8');

// Replace the deep heavy glass filter with the user's explicit request: bg-black/30 backdrop-blur-[2px]
const oldFilter1 = 'bg-slate-900/30 dark:bg-black/50 backdrop-blur-xl';
const oldFilter2 = 'bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm'; // Fallbacks just in case
const newFilter = 'bg-black/30 backdrop-blur-[2px]';

// Replace transitions
const oldTransition = 'transition-all duration-300';
const newTransition = 'transition-opacity duration-200 ease-in-out';

code = code.split(oldFilter1).join(newFilter);
code = code.split(oldFilter2).join(newFilter);
code = code.split(oldTransition).join(newTransition);

// Just to be exhaustive, if any Modal component internal backdrop exists:
code = code.split('bg-white/30 dark:bg-slate-950/40 backdrop-blur-2xl').join(newFilter);

fs.writeFileSync('src/App.jsx', code);
console.log("Overlay aesthetics normalized.");
