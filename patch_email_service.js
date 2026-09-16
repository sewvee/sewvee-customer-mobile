const fs = require('fs');
const path = '/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Backend-API/src/email/email.service.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. Add import
content = content.replace(
  /import \{ getPasswordResetTemplate \} from '\.\/templates\/password-reset\.template';/,
  "import { getPasswordResetTemplate } from './templates/password-reset.template';\nimport { getOtpTemplate } from './templates/otp.template';"
);

// 2. Add mapping logic
content = content.replace(
  /if \(mailOptions\.template === 'resetpassword'\) \{/,
  "if (mailOptions.template === 'otp') {\n          htmlContent = getOtpTemplate(\n            mailOptions.context.name,\n            mailOptions.context.otp\n          );\n        } else if (mailOptions.template === 'resetpassword') {"
);

fs.writeFileSync(path, content);
console.log('Patched email service!');
