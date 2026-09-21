const fs = require('fs');

function fixGallery() {
  const path = 'src/screens/CustomerGalleryScreen.js';
  let content = fs.readFileSync(path, 'utf8');
  if (!content.includes('Platform,')) {
    content = content.replace(
      /import \{\s*View,/,
      `import { View, Platform,`
    );
  }
  fs.writeFileSync(path, content);
}

function fixShop() {
  const path = 'src/screens/CustomerShopScreen.js';
  let content = fs.readFileSync(path, 'utf8');
  // I replaced 'import { View, Text, StyleSheet,' with 'import { View, Text, StyleSheet, StatusBar, Platform,'
  // Let's see how it looks
  content = content.replace(/Platform,\s*Platform,/, 'Platform,'); // in case it was double imported
  // let's just make sure it's correct
  fs.writeFileSync(path, content);
}

fixGallery();
fixShop();
