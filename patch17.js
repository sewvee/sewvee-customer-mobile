const fs = require('fs');
const path = '/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Customer-Mobile/src/screens/CustomerShopScreen.js';
let code = fs.readFileSync(path, 'utf8');

const target = `<Text style={styles.headerTitle}>Shopping</Text>`;
const replacement = `<Text style={styles.headerTitle}>Shopping {selectedBoutique ? '('+selectedBoutique.id+')' : ''}</Text>`;

code = code.replace(target, replacement);

fs.writeFileSync(path, code);
console.log('Patched shopping title to show company ID');
