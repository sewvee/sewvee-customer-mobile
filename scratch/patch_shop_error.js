const fs = require('fs');

let content = fs.readFileSync('src/screens/CustomerShopScreen.js', 'utf8');

content = content.replace(
  /showToast\('Failed to load products', 'error'\);/,
  "showToast(`Failed to load products: ${err.message}`, 'error');"
);

fs.writeFileSync('src/screens/CustomerShopScreen.js', content);
