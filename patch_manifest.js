const fs = require('fs');
let code = fs.readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
code = code.replace(
  '<meta-data android:name="com.google.firebase.messaging.default_notification_channel_id" android:value="sewvee_channel" />',
  '<meta-data android:name="com.google.firebase.messaging.default_notification_channel_id" android:value="sewvee_channel" tools:replace="android:value" />'
);
fs.writeFileSync('android/app/src/main/AndroidManifest.xml', code);
