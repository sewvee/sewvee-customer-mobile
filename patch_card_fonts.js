const fs = require('fs');
const path = 'src/components/QuickActionCard.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /title: \{\s*fontSize: 13,/,
  "title: {\n    fontSize: 15,"
);

content = content.replace(
  /subtitle: \{\s*fontSize: 10,/,
  "subtitle: {\n    fontSize: 12,"
);

content = content.replace(
  /badgeText: \{\s*color: '#fff',\s*fontSize: 9,/,
  "badgeText: {\n    color: '#fff',\n    fontSize: 10,"
);

// also let's make the icon bigger since the card is bigger
content = content.replace(
  /iconContainer: \{\s*width: 40,\s*height: 40,\s*borderRadius: 20,/,
  "iconContainer: {\n    width: 48,\n    height: 48,\n    borderRadius: 24,"
);

fs.writeFileSync(path, content);
console.log('Increased QuickActionCard font sizes and icon container!');
