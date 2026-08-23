const fs = require('fs');
const path = '/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Customer-Mobile/src/config/env.js';
let code = fs.readFileSync(path, 'utf8');

const target = `// Use local backend so chat works with the local DB schema!
export const API_DOMAIN = process.env.EXPO_PUBLIC_API_URL || (__DEV__ ? (Platform.OS === 'android' ? "http://10.0.2.2:3021" : "http://localhost:3021") : "https://api.sewvee.com");`;
const replacement = `export const API_DOMAIN = process.env.EXPO_PUBLIC_API_URL || (__DEV__ ? "https://api-stage.sewvee.com" : "https://api.sewvee.com");`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(path, code);
  console.log('Reverted env.js to use stage backend');
}
