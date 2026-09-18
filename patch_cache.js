const fs = require('fs');
const path = 'src/context/DataContext.js';
let content = fs.readFileSync(path, 'utf8');

const oldCheck = `if (userPhone && orderMobile && userPhone !== orderMobile) {`;
const newCheck = `if (userPhone && (!orderMobile || userPhone !== orderMobile)) {`;

content = content.replace(oldCheck, newCheck);
fs.writeFileSync(path, content);
console.log('Patched cache check');
