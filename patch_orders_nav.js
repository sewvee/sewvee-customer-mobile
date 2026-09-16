const fs = require('fs');
const file = 'src/screens/CustomerOrdersScreen.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "/* Navigate to new stitch order flow */",
  "navigation.navigate('NewStitchRequest');"
);

fs.writeFileSync(file, content);
console.log('Orders navigation patched');
