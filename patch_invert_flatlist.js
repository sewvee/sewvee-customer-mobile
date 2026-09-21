const fs = require('fs');
const path = 'src/screens/CustomerChatScreen.js';
let content = fs.readFileSync(path, 'utf8');

// We need to reverse the data array and add inverted prop
// Currently: data={messages}
content = content.replace(
  /data=\{messages\}/,
  'data={[...messages].reverse()}\n            inverted={true}'
);

// We should remove the onContentSizeChange and onLayout since they are no longer needed
content = content.replace(
  /onContentSizeChange=\{\(\) => flatListRef\.current\?\.scrollToEnd\(\{ animated: true \}\)\}\n\s*onLayout=\{\(\) => flatListRef\.current\?\.scrollToEnd\(\{ animated: false \}\)\}/,
  ''
);

fs.writeFileSync(path, content);
console.log('Inverted FlatList!');
