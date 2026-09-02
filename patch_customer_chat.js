const fs = require('fs');
const path = require('path');
const file = path.join('src', 'screens', 'CustomerChatScreen.js');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "behavior={Platform.OS === 'ios' ? 'padding' : null}",
  "behavior={Platform.OS === 'ios' ? 'padding' : undefined}\n        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}"
);

fs.writeFileSync(file, content);
console.log("Patched CustomerChatScreen.js");
