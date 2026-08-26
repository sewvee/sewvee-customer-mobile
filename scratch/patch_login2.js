const fs = require('fs');

const loginPath = 'src/screens/LoginScreen.js';
let content = fs.readFileSync(loginPath, 'utf8');

// 1. Remove ImageBackground from imports
content = content.replace('  ImageBackground,\n', '');

// 2. Replace ImageBackground usage
content = content.replace(
  /<ImageBackground source=\{require\('\.\.\/assets\/boutique_lady\.jpg'\)\} style=\{styles\.container\} blurRadius=\{3\}>/,
  `<View style={styles.container}>
      <Image 
        source={require('../assets/boutique_lady.jpg')} 
        style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} 
        blurRadius={3} 
        resizeMode="cover"
      />`
);

content = content.replace(
  /<\/ImageBackground>/,
  `</View>`
);

fs.writeFileSync(loginPath, content);
console.log('Done');
