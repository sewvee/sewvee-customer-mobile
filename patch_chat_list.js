const fs = require('fs');
const file = 'src/screens/CustomerChatListScreen.js';
let content = fs.readFileSync(file, 'utf8');

// Add import
content = content.replace(
  "import { Colors } from '../constants/theme';",
  "import { Colors } from '../constants/theme';\nimport { formatChatMessage } from '../utils/chatUtils';"
);

// Replace lastMessage
content = content.replace(
  "{item.latest_message_text || (item.latest_message_attachment ? 'Image' : 'Started a conversation')}",
  "{item.latest_message_text ? formatChatMessage(item.latest_message_text) : (item.latest_message_attachment ? 'Image' : 'Started a conversation')}"
);

fs.writeFileSync(file, content);
console.log('ChatList patched');
