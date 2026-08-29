const fs = require('fs');
const path = './src/config/env.js';
let content = fs.readFileSync(path, 'utf8');

// Force API_DOMAIN to always be staging for now to rule out local connectivity issues
content = content.replace(
  /export const API_DOMAIN = .*;/m,
  `export const API_DOMAIN = "https://api-stage.sewvee.com"; // FORCED STAGING`
);

fs.writeFileSync(path, content);
console.log('env.js patched to force staging API');
