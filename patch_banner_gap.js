const fs = require('fs');
const path = 'src/screens/CustomerDashboardScreen.js';
let content = fs.readFileSync(path, 'utf8');

// The inlineBanners view has marginTop: 16. We can reduce it to 0.
content = content.replace(
  /<View style=\{\{ marginBottom: 8, marginTop: 16, marginHorizontal: -4 \}\}>/,
  `<View style={{ marginBottom: 8, marginTop: 0, marginHorizontal: -4 }}>`
);

fs.writeFileSync(path, content);
console.log('Banner gap patched!');
