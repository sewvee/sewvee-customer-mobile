const fs = require('fs');

let content = fs.readFileSync('src/screens/CustomerShopScreen.js', 'utf8');

content = content.replace(
  /fetchProducts\(selectedBoutique\.id\);/g,
  "fetchProducts(selectedBoutique);"
);

fs.writeFileSync('src/screens/CustomerShopScreen.js', content);
