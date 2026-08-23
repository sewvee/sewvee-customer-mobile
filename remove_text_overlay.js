const fs = require('fs');
let code = fs.readFileSync('src/components/CollageMaker.js', 'utf8');

const regex = /\{\s*activeTool === 'text' && \(\s*<TouchableOpacity\s*activeOpacity=\{1\}\s*style=\{StyleSheet\.absoluteFill\}\s*onPress=\{\(e\) => \{[\s\S]*?setAddingText\(true\);\s*\}\}\s*\/>\s*\)\s*\}/;
code = code.replace(regex, "");

fs.writeFileSync('src/components/CollageMaker.js', code);
