const fs = require('fs');
const path = 'src/screens/CustomerShopScreen.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /import \{ View, Text, StyleSheet, StatusBar, Platform, /,
  `import { View, Text, StyleSheet, StatusBar, `
);

fs.writeFileSync(path, content);
