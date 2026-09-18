const fs = require('fs');
const file = 'src/screens/NewStitchRequestScreen.js';
let content = fs.readFileSync(file, 'utf8');

const target = "const CATEGORIES = ['Blouse', 'Kurta / Kurti', 'Lehenga', 'Suit / Salwar', 'Dress / Gown', 'Pants / Trousers', 'Other'];";
const replacement = "const CATEGORIES = ['Blouse', 'Chudithar', 'Kurta / Kurti', 'Lehenga', 'Suit / Salwar', 'Dress / Gown', 'Pants / Trousers', 'Other'];";

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log('Categories updated');
