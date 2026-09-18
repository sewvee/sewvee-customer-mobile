const fs = require('fs');

let content = fs.readFileSync('src/screens/CustomerChatListScreen.js', 'utf8');

content = content.replace(
  /keyExtractor=\{item => item\.boutique_id\?\.toString\(\) \|\| Math\.random\(\)\.toString\(\)\}/,
  "keyExtractor={(item, index) => `${item.boutique_id}_${item.order_id}_${index}`}"
);

fs.writeFileSync('src/screens/CustomerChatListScreen.js', content);
