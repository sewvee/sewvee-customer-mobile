const fs = require('fs');
const path = 'src/screens/CustomerOrdersScreen.js';
let content = fs.readFileSync(path, 'utf8');

const oldFilter = `return type === 'TAILORING' || type === 'STITCHING' || type === 'CUSTOM' || type === 'ENQUIRY';`;
const newFilter = `return type === 'TAILORING' || type === 'STITCHING' || type === 'STITCHING_REQUEST' || type === 'CUSTOM' || type === 'ENQUIRY';`;

content = content.replace(oldFilter, newFilter);
fs.writeFileSync(path, content);
console.log('Patched CustomerOrdersScreen.js filter');
