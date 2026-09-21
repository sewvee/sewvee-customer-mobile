const fs = require('fs');
const path = 'src/screens/CustomerChatScreen.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /if \(!isCustomer && msgText && msgText\.includes\("Action required"\)\) \{/,
  'if (!isCustomer && msgText && msgText.toLowerCase().includes("action required")) {'
);

content = content.replace(
  /if \(!isCustomer && msgText && msgText\.includes\("Photo requested"\)\) \{/,
  'if (!isCustomer && msgText && msgText.toLowerCase().includes("photo requested")) {'
);

fs.writeFileSync(path, content);
console.log('Patched action required!');
