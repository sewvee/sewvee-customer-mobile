const fs = require('fs');
let code = fs.readFileSync('src/utils/pushNotificationHelper.js', 'utf8');
code = code.replace(
  "channelId: 'com.sewvee',",
  "channelId: 'sewvee_channel',"
);
fs.writeFileSync('src/utils/pushNotificationHelper.js', code);
