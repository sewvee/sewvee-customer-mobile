const fs = require('fs');
let code = fs.readFileSync('src/components/CustomerRequestsTab.js', 'utf8');

code = code.replace(
  /const API_BASE = API_DOMAIN\.includes\('api-stage'\) \? 'http:\/\/10\.0\.2\.2:3021' : API_DOMAIN;/g,
  `const API_BASE = API_DOMAIN;`
);

fs.writeFileSync('src/components/CustomerRequestsTab.js', code);
