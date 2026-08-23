const fs = require('fs');
let code = fs.readFileSync('src/store/uploadSlice.js', 'utf8');

code = code.replace(
  /transformRequest: \[\(data\) => data\]/g,
  `// transformRequest removed for React Native`
);

fs.writeFileSync('src/store/uploadSlice.js', code);
