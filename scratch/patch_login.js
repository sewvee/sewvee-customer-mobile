const fs = require('fs');

const loginPath = 'src/screens/LoginScreen.js';
let content = fs.readFileSync(loginPath, 'utf8');

// 1. Add ImageBackground to imports
content = content.replace(
  /SafeAreaView/g,
  'SafeAreaView,\n  ImageBackground'
);

// 2. Wrap SafeAreaView in ImageBackground
content = content.replace(
  /<SafeAreaView style=\{styles\.container\}>/,
  `<ImageBackground source={require('../assets/boutique_lady.jpg')} style={styles.container} blurRadius={3}>
      <View style={styles.overlay}>
      <SafeAreaView style={styles.safeArea}>`
);

content = content.replace(
  /<\/SafeAreaView>/,
  `</SafeAreaView>
      </View>
    </ImageBackground>`
);

// 3. Update Styles
content = content.replace(
  /container: \{\s*flex: 1,\s*backgroundColor: '#FFFFFF',\s*\}/,
  `container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  safeArea: {
    flex: 1,
  }`
);

// 4. Update Logo Style
content = content.replace(
  /logoImage: \{\s*width: 70,\s*height: 70,\s*marginBottom: 16,\s*\}/,
  `logoImage: {
    width: 185,
    height: 150,
    marginBottom: 16,
  }`
);

// 5. Change StatusBar style since we have a dark background
content = content.replace(
  /barStyle="dark-content"/,
  'barStyle="light-content"'
);

// 6. Make StatusBar transparent
content = content.replace(
  /backgroundColor="#FFFFFF"/,
  'backgroundColor="transparent"'
);

fs.writeFileSync(loginPath, content);
console.log('Done replacing');
