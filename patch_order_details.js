const fs = require('fs');
let code = fs.readFileSync('src/screens/CustomerOrderDetailScreen.js', 'utf8');

code = code.replace(
  /const API_BASE = URL_CUSTOMER_PORTAL_ORDERS\.includes\('api-stage'\) \? 'http:\/\/10\.0\.2\.2:3021\/mobile\/customer-portal\/orders' : URL_CUSTOMER_PORTAL_ORDERS;/g,
  `const API_BASE = URL_CUSTOMER_PORTAL_ORDERS;`
);

fs.writeFileSync('src/screens/CustomerOrderDetailScreen.js', code);
