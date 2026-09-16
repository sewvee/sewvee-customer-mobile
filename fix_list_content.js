const fs = require('fs');
const path = 'src/screens/CustomerChatScreen.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /listContent: \{ padding: 16, flexGrow: 1, justifyContent: 'flex-end' \}/,
  "listContent: { padding: 16, flexGrow: 1 }"
);

fs.writeFileSync(path, content);
console.log('Fixed listContent style!');
