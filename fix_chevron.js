const fs = require('fs');
const path = '/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Customer-Mobile/src/components/CustomerRequestsTab.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Add ChevronRight to imports
if (!code.includes('ChevronRight')) {
  code = code.replace('ChevronLeft } from', 'ChevronLeft, ChevronRight } from');
}

// 2. Replace the left chevron with right chevron
const targetIcon = `<ChevronLeft size={20} color="#94A3B8" style={{ transform: [{ rotate: '180deg' }] }} />`;
const replacementIcon = `<ChevronRight size={20} color="#94A3B8" />`;

if (code.includes(targetIcon)) {
  code = code.replace(targetIcon, replacementIcon);
  fs.writeFileSync(path, code);
  console.log("Fixed chevron in CustomerRequestsTab.js");
} else {
  console.log("Could not find the target chevron icon.");
}
