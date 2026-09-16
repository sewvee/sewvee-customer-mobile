const fs = require('fs');
const file = 'src/screens/CustomerDashboardScreen.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/<StatusBar barStyle="dark-content" backgroundColor="#F5F3FF" \/>/, '');

fs.writeFileSync(file, content);
console.log('Dashboard StatusBar removed');
