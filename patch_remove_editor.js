const fs = require('fs');
let code = fs.readFileSync('src/screens/CustomerOrderDetailScreen.js', 'utf8');

code = code.replace(
  /<PhotoAnnotationEditor[\s\S]*?\/>/,
  ""
);

fs.writeFileSync('src/screens/CustomerOrderDetailScreen.js', code);
