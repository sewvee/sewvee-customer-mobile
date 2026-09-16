const fs = require('fs');
const path = 'src/screens/CustomerChatScreen.js';
let content = fs.readFileSync(path, 'utf8');

// Fix PWA-style Photo Request Card
content = content.replace(
  /if \(!isCustomer && msgText && msgText\.toLowerCase\(\)\.includes\("photo requested"\)\) \{/,
  'if (!isCustomer && msgText && (msgText.includes("[ACTION_REQUIRED:PHOTO_REQUEST]") || msgText.toLowerCase().includes("photo requested"))) {'
);

// Fix PWA-style Feedback Request Card (Action required)
content = content.replace(
  /if \(!isCustomer && msgText && msgText\.toLowerCase\(\)\.includes\("action required"\)\) \{/,
  'if (!isCustomer && msgText && (msgText.includes("[ACTION_REQUIRED:") && !msgText.includes("PHOTO_REQUEST")) || msgText.toLowerCase().includes("action required")) {'
);

fs.writeFileSync(path, content);
console.log('Fixed message format detection!');
