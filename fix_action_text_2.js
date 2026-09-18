const fs = require('fs');
const path = 'src/screens/CustomerChatScreen.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /if \(!isCustomer && msgText && \(msgText\.includes\("\[ACTION_REQUIRED:"\) && !msgText\.includes\("PHOTO_REQUEST"\)\) \|\| msgText\.toLowerCase\(\)\.includes\("action required"\)\) \{/,
  'if (!isCustomer && msgText && ((msgText.includes("[ACTION_REQUIRED:") && !msgText.includes("PHOTO_REQUEST")) || msgText.toLowerCase().includes("action required"))) {'
);

fs.writeFileSync(path, content);
console.log('Fixed parens!');
