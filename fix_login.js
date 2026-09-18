const fs = require('fs');
const path = '../Sewvee-Business-Mobile/src/screens/LoginScreen.js';
let content = fs.readFileSync(path, 'utf8');

// Fix lightBlue image dimensions
content = content.replace(
    /source={require\('\.\.\/assets\/lightBlue\.png'\)}[\s\n]*style={{ position: 'absolute' }}/g,
    "source={require('../assets/lightBlue.png')} style={{ position: 'absolute', width: 250, height: 250 }}"
);

// Ensure KeyboardAwareScrollView has style={{ flex: 1 }}
if (!content.includes('style={{ flex: 1 }}') && content.includes('<KeyboardAwareScrollView')) {
    content = content.replace(
        '<KeyboardAwareScrollView',
        '<KeyboardAwareScrollView style={{ flex: 1 }}'
    );
}

fs.writeFileSync(path, content);
console.log("Fixed LoginScreen");
