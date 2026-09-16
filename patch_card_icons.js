const fs = require('fs');
const path = 'src/screens/CustomerDashboardScreen.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /icon=\{<Scissors size=\{20\} color=\{'#4F46E5'\} \/>\}/g,
  "icon={<Scissors size={24} color={'#4F46E5'} />}"
);

content = content.replace(
  /icon=\{<ShoppingBag size=\{20\} color=\{'#D97706'\} \/>\}/g,
  "icon={<ShoppingBag size={24} color={'#D97706'} />}"
);

fs.writeFileSync(path, content);
console.log('Increased icon sizes in dashboard!');
