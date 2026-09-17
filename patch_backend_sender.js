const fs = require('fs');
const path = '/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Backend-API/src/Mobile/customer-portal/customer-portal.service.ts';
let content = fs.readFileSync(path, 'utf8');

// Update json_build_object
content = content.replace(
  /'message', r\.message,\n\s*'attachment_url', r\.attachment_url,\n\s*'created_at', r\.created_at\n/,
  "'message', r.message,\n            'attachment_url', r.attachment_url,\n            'created_at', r.created_at,\n            'sender_type', r.sender_type\n"
);

// Update threads.map
content = content.replace(
  /latest_message_timestamp: row\.latest_message \? row\.latest_message\.created_at : null,/g,
  "latest_message_timestamp: row.latest_message ? row.latest_message.created_at : null,\n      latest_message_sender: row.latest_message ? row.latest_message.sender_type : null,"
);

fs.writeFileSync(path, content);
console.log('Patched latest_message_sender');
