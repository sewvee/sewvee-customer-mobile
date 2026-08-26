const fs = require('fs');
const path = 'src/screens/CustomerDashboardScreen.js';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /paddingBottom: 40,/g,
  "paddingBottom: 10,"
);

fs.writeFileSync(path, code);
