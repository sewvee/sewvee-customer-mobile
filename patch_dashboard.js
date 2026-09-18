const fs = require('fs');
const path = 'src/screens/CustomerDashboardScreen.js';
let content = fs.readFileSync(path, 'utf8');

const regex = /<QuickActionCard\s+title="My Designs"[\s\S]*?\/>/;
content = content.replace(regex, '');

fs.writeFileSync(path, content);
console.log('Removed My Designs card!');
