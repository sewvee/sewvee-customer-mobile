const fs = require('fs');
const path = 'src/screens/CustomerChatScreen.js';
let content = fs.readFileSync(path, 'utf8');

// Fix isPdf logic to handle query parameters
content = content.replace(
  /const isPdf = item\.attachment_url && item\.attachment_url\.toLowerCase\(\)\.endsWith\('\.pdf'\);/,
  `const isPdf = item.attachment_url && (item.attachment_url.toLowerCase().includes('.pdf') || item.attachment_type === 'application/pdf' || msgText.includes('invoice/receipt'));`
);

// Fix photo requested logic to handle spaces or missing emojis
content = content.replace(
  /!isCustomer && msgText === "📷 Photo requested" && \(/,
  `!isCustomer && msgText && msgText.includes("Photo requested") && (`
);

fs.writeFileSync(path, content);
console.log('Patched chat fixes!');
