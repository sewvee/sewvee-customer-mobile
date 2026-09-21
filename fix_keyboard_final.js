const fs = require('fs');
const path = 'src/screens/CustomerChatScreen.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /behavior=\{Platform\.OS === 'ios' \? 'padding' : undefined\}/g,
  "behavior=\"padding\""
);

content = content.replace(
  /keyboardVerticalOffset=\{Platform\.OS === 'ios' \? \(insets\.top \+ 56\) : 0\}/g,
  "keyboardVerticalOffset={insets.top + 56}"
);

fs.writeFileSync(path, content);
console.log("Forced padding behavior on Android");
