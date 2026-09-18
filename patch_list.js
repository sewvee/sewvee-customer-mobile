const fs = require('fs');
const file = 'src/screens/CustomerChatListScreen.js';
let content = fs.readFileSync(file, 'utf8');

// Remove three dots button
content = content.replace(
  /<TouchableOpacity style={{marginLeft: 8, paddingHorizontal: 4}} onPress={\(\) => { setSelectedThread\(item\); setMenuVisible\(true\); }}>\s*<Ionicons name="ellipsis-vertical" size={16} color="#94A3B8" \/>\s*<\/TouchableOpacity>/,
  ''
);

// Remove the modal
content = content.replace(/{\/\* Three Dots Menu Modal \*\/}[\s\S]*?<\/Modal>/, '');

fs.writeFileSync(file, content);
console.log('Patched chat list screen');
