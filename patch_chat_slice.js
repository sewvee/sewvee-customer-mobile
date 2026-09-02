const fs = require('fs');
const path = '/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Business-Mobile/src/store/chatSlice.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove mock logic from fetchChatThreads
content = content.replace(
  /\/\/ BYPASS: If using demo token, return mock threads immediately[\s\S]*?const token = await getAuthToken\(getState\);/m,
  `const token = await getAuthToken(getState);`
);

// 2. Remove mock logic from fetchOrderMessages
content = content.replace(
  /if \(token && token\.includes\('demo_tailor_token'\)\) \{[\s\S]*?\] \} \};\s*\}/m,
  ``
);

fs.writeFileSync(path, content);
console.log('chatSlice.js patched to remove mock data.');
