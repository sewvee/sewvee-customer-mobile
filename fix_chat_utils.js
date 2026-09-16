const fs = require('fs');
const path = 'src/utils/chatUtils.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /case 'PHOTO_REQUEST': return '📷 Photo requested';/,
  "case 'PHOTO_REQUEST': return '📸 Please upload reference photos';"
);

content = content.replace(
  /default: return '⚠️ Action required';/,
  "default: return '⭐ We would love your feedback on this order!';"
);

fs.writeFileSync(path, content);
console.log('Fixed chat utils placeholder text!');
