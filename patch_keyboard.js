const fs = require('fs');
const file = 'src/screens/CustomerChatScreen.js';
let content = fs.readFileSync(file, 'utf8');

const target = `        behavior="padding"`;
const replacement = `        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Patched KeyboardAvoidingView behavior');
