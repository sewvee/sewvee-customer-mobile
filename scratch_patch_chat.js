const fs = require('fs');

let content = fs.readFileSync('src/screens/CustomerChatScreen.js', 'utf8');
content = content.replace('paddingBottom: Math.max(insets.bottom, 8)', 'paddingBottom: Platform.OS === "android" && androidKeyboardHeight > 0 ? 16 : Math.max(insets.bottom, 16)');
fs.writeFileSync('src/screens/CustomerChatScreen.js', content);
console.log('Patched padding');
