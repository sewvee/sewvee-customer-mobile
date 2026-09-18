const fs = require('fs');
const file = 'src/navigation/RootNavigator.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "const isTailor = user?.role === 'Tailor';",
  "const isTailor = false; // Forced for Customer App"
);
content = content.replace(
  "const isCustomer = user?.role === 'Customer' || !user?.role;",
  "const isCustomer = true; // Forced for Customer App"
);

fs.writeFileSync(file, content);
console.log('Forced Customer UI');
