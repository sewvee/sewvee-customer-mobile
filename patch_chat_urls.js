const fs = require('fs');
const file = 'src/screens/CustomerChatScreen.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /\`\$\{BASE_URL\}customer-portal\/orders\/\$\{passedOrderId \|\| orderNumber\}\/requests\/\$\{editingMessage.id\}\`/g,
  "\`${BASE_URL}customer-portal/orders/${editingMessage.order_id}/requests/${editingMessage.id}\`"
);

content = content.replace(
  /\`\$\{BASE_URL\}customer-portal\/orders\/\$\{passedOrderId \|\| orderNumber\}\/requests\/\$\{msgId\}\`/g,
  "\`${BASE_URL}customer-portal/orders/${selectedMessage ? selectedMessage.order_id : passedOrderId}/requests/${msgId}\`"
);

fs.writeFileSync(file, content);
console.log('Fixed URLs');
