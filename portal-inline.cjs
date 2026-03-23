const fs = require('fs');

let code = fs.readFileSync('src/App.jsx', 'utf8');

// All inline modal overlays have this backdrop div pattern.
// We need to wrap them with <ModalPortal> and close it after </div></div>
// Pattern: {someCondition && (\n        <div ... bg-black/30 ...>
//            <div ...>  (modal card)
//              ... content ...
//            </div>
//         </div>
//       )}

// Replace the opening backdrop div (inline modals that are NOT inside ModalPortal already)
const oldOverlay = `<div\n        className="flex items-center justify-center p-4 animate-fade-in"\n        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.30)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', transition: 'opacity 0.2s ease' }}\n      >`;

// For inline modals with Tailwind classes (the ones we haven't converted yet)
const inlineOverlayPattern = `        <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 transition-opacity duration-200 ease-in-out animate-fade-in">`;
const inlineOverlayReplacement = `        <ModalPortal>\n        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.30)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', transition: 'opacity 0.2s ease' }} className="flex items-center justify-center p-4 animate-fade-in">`;

code = code.split(inlineOverlayPattern).join(inlineOverlayReplacement);

// Now fix the closing tag - each inline modal ends with:
//         </div>
//       </div>
//     )}
// We need to add </ModalPortal> before the last closing )}
const inlineClosingPattern = `</div>\n        </div>\n      )}`;
const inlineClosingReplacement = `</div>\n        </div>\n        </ModalPortal>\n      )}`;

code = code.split(inlineClosingPattern).join(inlineClosingReplacement);

fs.writeFileSync('src/App.jsx', code);
console.log("All inline modal overlays wrapped in ModalPortal!");
