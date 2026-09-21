const fs = require('fs');
const path = 'src/screens/CustomerDashboardScreen.js';
let content = fs.readFileSync(path, 'utf8');

// Replace the view containing QUICK ACTIONS
const oldView = `<View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 0, marginHorizontal: -4 }}>
          <QuickActionCard`;

const newView = `<View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 0, marginHorizontal: -4, marginTop: 16 }}>
          <QuickActionCard`;

content = content.replace(oldView, newView);

fs.writeFileSync(path, content);
console.log('Gap patched!');
