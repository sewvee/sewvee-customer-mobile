const fs = require('fs');
const file = 'src/screens/CustomerOrdersScreen.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/backgroundColor: '#F5F3FF',/, "backgroundColor: '#FFF',");
content = content.replace(/backgroundColor="#F5F3FF"/g, 'backgroundColor="#FFF"');

fs.writeFileSync(file, content);
console.log('Background updated to white');
