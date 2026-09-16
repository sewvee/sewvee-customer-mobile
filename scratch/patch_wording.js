const fs = require('fs');
const file = 'src/screens/CustomerChatScreen.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  />\n\s*Your boutique needs reference photos for this outfit\. Please upload them so they can get started!\n\s*<\/Text>/,
  `>
            {boutiqueName} needs reference photos for this outfit. Please upload them so they can get started!
          </Text>`
);

fs.writeFileSync(file, content);
