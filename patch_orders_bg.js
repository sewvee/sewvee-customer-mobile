const fs = require('fs');
const file = 'src/screens/CustomerOrdersScreen.js';
let content = fs.readFileSync(file, 'utf8');

const target = `<SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F3FF" />`;

const replacement = `<SafeAreaView style={[styles.container, { backgroundColor: '#fff' }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Orders background patched');
