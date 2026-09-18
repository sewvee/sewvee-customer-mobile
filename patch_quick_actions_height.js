const fs = require('fs');
const file = 'src/components/QuickActionCard.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("height: 110,", "height: 130,");
// Also slightly increase icon margin or size to fill the extra space?
content = content.replace("marginBottom: 8,", "marginBottom: 12,");
content = content.replace("marginTop: 2,", "marginTop: 4,");

fs.writeFileSync(file, content);
console.log('QuickActionCard height increased');
