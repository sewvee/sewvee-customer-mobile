const fs = require('fs');

let content = fs.readFileSync('android/app/src/main/res/values/styles.xml', 'utf8');

if (!content.includes('android:navigationBarColor')) {
  content = content.replace(
    /<\/style>/,
    '    <item name="android:navigationBarColor">#1E293B</item>\n    </style>'
  );
  fs.writeFileSync('android/app/src/main/res/values/styles.xml', content);
}
