const fs = require('fs');
const path = '/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Backend-API/src/Mobile/customer-auth/customer-auth.service.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. Change to 4 digit OTP
content = content.replace(
  /const otp = Math\.floor\(100000 \+ Math\.random\(\) \* 900000\)\.toString\(\);/,
  "const otp = Math.floor(1000 + Math.random() * 9000).toString();"
);

// 2. Change template and context
content = content.replace(
  /template: 'resetpassword', \/\/ Reusing existing template[\s\S]*?context: \{[\s\S]*?title: 'Reset your PIN',[\s\S]*?name: customer\.name,[\s\S]*?description: `Your OTP to reset your PIN is: \$\{otp\}\. It is valid for 15 minutes\.`,[\s\S]*?click: '', \/\/ No link needed for OTP[\s\S]*?\},/,
  "template: 'otp',\n        context: {\n          name: customer.name,\n          otp: otp,\n        },"
);

fs.writeFileSync(path, content);
console.log('Patched backend auth service!');
