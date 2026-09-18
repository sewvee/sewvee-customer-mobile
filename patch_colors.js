const fs = require('fs');
const path = 'src/screens/CustomerChatScreen.js';
let content = fs.readFileSync(path, 'utf8');

// Container to purple
content = content.replace(
  /container: \{ flex: 1, backgroundColor: '#F8FAFC' \}/,
  `container: { flex: 1, backgroundColor: '#5B43EE' }`
);

// KeyboardAvoidingView background to original color
content = content.replace(
  /<KeyboardAvoidingView style=\{\{ flex: 1 \}\} behavior=\{Platform\.OS === 'ios' \? 'padding' : undefined\}/,
  `<KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F8FAFC' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}`
);

fs.writeFileSync(path, content);
console.log('Colors patched!');
