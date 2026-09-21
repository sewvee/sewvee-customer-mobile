const fs = require('fs');
const path = 'src/utils/pushNotificationHelper.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /if \(state\.auth && state\.auth\.token\) \{[\s\S]*?store\.dispatch\(saveFcmTokenAction\(\{ fcm_token: token \}\)\)[\s\S]*?\.catch\(err => console\.log\('FCM token dispatch error:', err\)\);[\s\S]*?\}/,
  "store.dispatch(saveFcmTokenAction({ fcm_token: token })).catch(err => console.log('FCM token dispatch error:', err));"
);

fs.writeFileSync(path, content);
console.log('Fixed FCM dispatch!');
