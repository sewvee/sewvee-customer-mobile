const fs = require('fs');
const file = 'src/store/salesOrderSlice.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /if \(\/\^\(https\?:\|file:\|content:\|data:\)\/i\.test\(rawValue\)\) \{\n\s*return rawValue;\n\s*\}/,
  \`if (/^(https?:|file:|content:|data:)/i.test(rawValue)) {
    if (rawValue.includes('localhost:')) {
      const { API_DOMAIN } = require('../config/env');
      return rawValue.replace(/http:\\/\\/localhost:\\d+/, API_DOMAIN);
    }
    return rawValue;
  }\`
);

fs.writeFileSync(file, content);
