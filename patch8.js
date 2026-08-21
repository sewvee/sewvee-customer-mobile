const fs = require('fs');
const path = '/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Customer-Mobile/src/components/CustomerRequestsTab.js';
let code = fs.readFileSync(path, 'utf8');

// Replace API_DOMAIN with fallback logic for local development
const targetFetchGET = "const res = await fetch(`\${API_DOMAIN}/mobile/customer-portal/orders/\${order.id}/requests`, {";
const newFetchGET = `const API_BASE = API_DOMAIN.includes('api-stage') ? 'http://10.0.2.2:3021' : API_DOMAIN;
      const res = await fetch(\`\${API_BASE}/mobile/customer-portal/orders/\${order.id}/requests\`, {`;

const targetFetchPOST = "const res = await fetch(`\${API_DOMAIN}/mobile/customer-portal/orders/\${order.id}/outfits/\${activeOutfit.id}/requests`, {";
const newFetchPOST = `const API_BASE = API_DOMAIN.includes('api-stage') ? 'http://10.0.2.2:3021' : API_DOMAIN;
      const res = await fetch(\`\${API_BASE}/mobile/customer-portal/orders/\${order.id}/outfits/\${activeOutfit.id}/requests\`, {`;

code = code.replace(targetFetchGET, newFetchGET);
code = code.replace(targetFetchPOST, newFetchPOST);

fs.writeFileSync(path, code);
console.log("CustomerRequestsTab.js fetch URLs patched!");
