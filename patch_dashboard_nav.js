const fs = require('fs');
const file = 'src/screens/CustomerDashboardScreen.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "navigation.navigate('NewStitchRequest')",
  "navigation.navigate('NewStitchRequest', { selectedBoutique })"
);

fs.writeFileSync(file, content);
console.log('Dashboard navigation patched');
