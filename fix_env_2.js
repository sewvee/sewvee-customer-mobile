const fs = require('fs');
const path = './src/config/env.js';
let content = fs.readFileSync(path, 'utf8');

// Use staging as fallback instead of localhost
content = content.replace(
  /export const API_DOMAIN = "https:\/\/api-stage\.sewvee\.com"; \/\/ FORCED STAGING/m,
  `export const API_DOMAIN = process.env.EXPO_PUBLIC_API_URL || "https://api-stage.sewvee.com";`
);

fs.writeFileSync(path, content);
console.log('env.js patched to default to staging API safely');
