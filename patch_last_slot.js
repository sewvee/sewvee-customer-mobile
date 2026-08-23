const fs = require('fs');
let code = fs.readFileSync('src/components/CollageMaker.js', 'utf8');

code = code.replace(
  /\[0, 1\]\.map\(i => \([\s\S]*?<\/TouchableOpacity>\s*\)\)/g,
  `[0, 1].map(i => renderSlot(i))`
);

fs.writeFileSync('src/components/CollageMaker.js', code);
