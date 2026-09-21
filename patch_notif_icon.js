const fs = require('fs');
const file = 'src/utils/pushNotificationHelper.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/smallIcon: "ic_launcher"/g, 'smallIcon: "ic_notification"');
content = content.replace(/largeIcon: "ic_launcher"/g, 'largeIcon: "ic_notification"');

fs.writeFileSync(file, content);
console.log('Patched local notification icons to ic_notification');
