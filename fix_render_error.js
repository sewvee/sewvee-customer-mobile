const fs = require('fs');
const path = 'src/screens/CustomerDashboardScreen.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /          \}\n            customBg=\{'#ECFDF5'\}\n            onPress=\{\(\) => navigation\.navigate\('CustomerGallery'\)\}\n          \/>/,
  ""
);

fs.writeFileSync(path, content);
console.log('Fixed the dangling text!');
