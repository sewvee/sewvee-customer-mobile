const fs = require('fs');
const path = '/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Customer-Mobile/src/screens/CustomerDashboardScreen.js';
let code = fs.readFileSync(path, 'utf8');

const target = `    let typeLabel = 'OUTFIT';
    if (isSale) {
      if (item.items && item.items.length > 0) {
        typeLabel = item.items.map(i => i.name).join(', ');
      } else if (item.outfits && item.outfits.length > 0) {
        typeLabel = item.outfits.map(o => o.name || o.outfitType).join(', ');
      } else {
        typeLabel = 'READY-MADE';
      }
    } else {
      const types = outfits.map(o => o.orderType || 'Stitching').filter((v, i, a) => a.indexOf(v) === i);
      if (types.length > 0) typeLabel = types.join(' • ').toUpperCase();
    }`;

const replacement = `    const typeLabel = isSale ? 'READY-MADE' : 'STITCHING';`;

if(code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync(path, code);
    console.log("Patched CustomerDashboardScreen.js successfully");
} else {
    console.log("Could not find target string");
}
