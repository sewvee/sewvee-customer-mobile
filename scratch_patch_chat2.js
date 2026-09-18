const fs = require('fs');
let content = fs.readFileSync('src/screens/CustomerChatScreen.js', 'utf8');

const anchor = 'paddingBottom: Platform.OS === "android" && androidKeyboardHeight > 0 ? 16 : Math.max(insets.bottom, 16)';
const patch = 'paddingBottom: Math.max(insets.bottom, 8) + (Platform.OS === "android" && androidKeyboardHeight > 0 ? 12 : 0)';

content = content.replace(anchor, patch);
fs.writeFileSync('src/screens/CustomerChatScreen.js', content);
