const fs = require('fs');
const path = 'src/screens/CustomerChatScreen.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /onPress=\{\(\) => Linking\.openURL\(item\.attachment_url\)/,
  "onPress={() => Linking.openURL(getFullImageUrl(item.attachment_url))"
);

fs.writeFileSync(path, content);
console.log('Fixed PDF URL!');
