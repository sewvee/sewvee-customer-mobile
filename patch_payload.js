const fs = require('fs');
const path = 'src/screens/NewStitchRequestScreen.js';
let content = fs.readFileSync(path, 'utf8');

const oldCode = `        if (outfit.description) lines.push(\`Description: \${outfit.description}\`);
        if (outfit.measurement) lines.push(\`Measurement: \${outfit.measurement}\`);
        if (deliveryDate) lines.push(\`Expected Date: \${deliveryDate}\`);`;

const newCode = `        if (outfit.description) lines.push(\`Description: \${outfit.description}\`);
        if (outfit.measurement) {
          let meas = \`Measurement: \${outfit.measurement}\`;
          if (outfit.measurement === 'Use Previous Measurements' && outfit.previousOrderDetails) {
            meas += \` (Order details: \${outfit.previousOrderDetails})\`;
          }
          lines.push(meas);
        }
        if (deliveryDate) lines.push(\`Expected Date: \${deliveryDate}\`);`;

content = content.replace(oldCode, newCode);
fs.writeFileSync(path, content);
console.log('Patched payload logic');
