const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');
code = code.replace(/backdrop-blur-sm/g, 'backdrop-blur-md backdrop-saturate-150');
fs.writeFileSync('src/App.jsx', code);
console.log('Replaced all modal backdrops to be more pronounced and vivid.');
