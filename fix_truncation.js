const fs = require('fs');

const fixFile = (file) => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /style=\{\{ flexDirection: 'row', alignItems: 'center', height: 50, paddingHorizontal: 10 \}\}/g,
    "style={{ flexDirection: 'row', alignItems: 'center', height: 50, paddingHorizontal: 10, minWidth: 85 }}"
  );
  fs.writeFileSync(file, content);
  console.log("Fixed truncation in", file);
};

fixFile('src/screens/CustomerSignupScreen.js');
fixFile('src/screens/LoginScreen.js');
