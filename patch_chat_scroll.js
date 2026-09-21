const fs = require('fs');
const path = 'src/screens/CustomerChatScreen.js';
let content = fs.readFileSync(path, 'utf8');

// Add onLayout to FlatList
content = content.replace(
  /onContentSizeChange=\{\(\) => flatListRef\.current\?\.scrollToEnd\(\{ animated: true \}\)\}/,
  'onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}\n            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}'
);

fs.writeFileSync(path, content);
console.log('Patched chat scroll behavior!');
