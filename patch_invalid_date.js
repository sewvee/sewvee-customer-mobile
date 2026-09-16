const fs = require('fs');
const file = 'src/screens/NewStitchRequestScreen.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /onSelect=\{\(date\) => \{\n\s*const dateObj = new Date\(date\);\n\s*const formattedDate = dateObj\.toLocaleDateString\('en-GB', \{ day: 'numeric', month: 'long', year: 'numeric' \}\);\n\s*setDeliveryDate\(formattedDate\);\n\s*\}\}/;

const replacement = `onSelect={(date) => {
            const parts = date.split('/');
            const dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
            const formattedDate = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
            setDeliveryDate(formattedDate);
          }}`;

content = content.replace(regex, replacement);

fs.writeFileSync(file, content);
console.log('Date fixed');
