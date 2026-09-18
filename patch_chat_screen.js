const fs = require('fs');
const file = 'src/screens/CustomerChatScreen.js';
let content = fs.readFileSync(file, 'utf8');

// Add import
content = content.replace(
  "import { Colors } from '../constants/theme';",
  "import { Colors } from '../constants/theme';\nimport { formatChatMessage } from '../utils/chatUtils';"
);

// Replace fallback text
content = content.replace(
  "{msgText}",
  "{formatChatMessage(msgText)}"
);

fs.writeFileSync(file, content);
console.log('ChatScreen patched');
