const fs = require('fs');
const path = 'src/screens/CustomerOrderDetailScreen.js';
let content = fs.readFileSync(path, 'utf8');

// The rogue tags at 833-834:
const rogueRegex = /<\/TouchableOpacity>\s*<\/>\s*\)\}\s*<\/View>/g;
content = content.replace(rogueRegex, "</TouchableOpacity>\n                            </View>");

// Now add the missing `</>` and `)}` for `isConfigured && isExpanded && (`
const closeRegex = /<\/View>\s*\) : null}\s*<\/View>\s*\);\s*}\)\(\)}/g;
content = content.replace(closeRegex, "</View>\n              ) : null}\n            </>\n          )}\n          </View>\n              );\n            })()}");

fs.writeFileSync(path, content);
console.log('Patched mangled JSX 2');
