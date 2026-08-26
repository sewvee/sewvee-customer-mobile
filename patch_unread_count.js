const fs = require('fs');
const path = 'src/components/CustomerRequestsTab.js';

let content = fs.readFileSync(path, 'utf8');
content = content.replace(
  "r.sender_type === 'BOUTIQUE'",
  "r.sender_type === 'BUSINESS'"
);
fs.writeFileSync(path, content);
console.log("Patched unread count logic");
