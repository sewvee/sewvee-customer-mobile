const fs = require('fs');
const path = '/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Backend-API/src/Mobile/payments/payments.controller.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'payment.order_details.order_id',
  'payment.order_id'
);

fs.writeFileSync(path, content);
console.log('Patched payments.controller.ts order_details');
