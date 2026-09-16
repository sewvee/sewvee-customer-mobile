const fs = require('fs');
const path = 'src/screens/CustomerChatListScreen.js';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('import { formatChatMessage }')) {
  content = content.replace(
    /import AsyncStorage from '@react-native-async-storage\/async-storage';/,
    `import AsyncStorage from '@react-native-async-storage/async-storage';\nimport { formatChatMessage } from '../utils/chatUtils';`
  );
  fs.writeFileSync(path, content);
  console.log('Import added!');
}
