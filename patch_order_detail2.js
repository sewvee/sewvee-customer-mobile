const fs = require('fs');
const path = 'src/screens/CustomerOrderDetailScreen.js';
let content = fs.readFileSync(path, 'utf8');

const regex = /return \(\s*let cat = outfit\.name/g;
content = content.replace(regex, "let cat = outfit.name");

const regex2 = /else if \(l\.startsWith\('Expected By:'\)\) expDate = l\.replace\('Expected By:', ''\)\.trim\(\);\s*}\);\s*}/g;
content = content.replace(regex2, "else if (l.startsWith('Expected By:')) expDate = l.replace('Expected By:', '').trim();\n                });\n              }\n\n              return (");

fs.writeFileSync(path, content);
console.log('Patched again');
