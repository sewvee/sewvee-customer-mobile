const fs = require('fs');
const path = 'android/app/src/main/AndroidManifest.xml';

let content = fs.readFileSync(path, 'utf8');

if (content.includes('<application') && !content.includes('android:taskAffinity')) {
  content = content.replace(
    '<application',
    '<application\n      android:taskAffinity="${applicationId}"'
  );
  fs.writeFileSync(path, content);
  console.log("Patched AndroidManifest.xml successfully");
} else {
  console.log("Could not find <application or taskAffinity already exists");
}
