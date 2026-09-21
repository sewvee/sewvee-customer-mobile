const fs = require('fs');
const file = 'src/utils/pushNotificationHelper.js';
let content = fs.readFileSync(file, 'utf8');

// Remove largeIconUrl to prevent invalid URL crashes in local notifications
content = content.replace('largeIconUrl: "ic_launcher",', '');

fs.writeFileSync(file, content);
console.log('Patched local notification config');
