const fs = require('fs');
const path = 'src/components/CollageMaker.js';
let content = fs.readFileSync(path, 'utf8');

// Remove Sewvee Gallery option
content = content.replace(
  /<TouchableOpacity style=\{s\.pickerOption\} onPress=\{\(\) => \{ setSourcePickerVisible\(false\); setGalleryBrowserVisible\(true\); \}\}>\s*<Folder color=\{Colors\.primary\} size=\{24\} \/>\s*<View style=\{\{ flex: 1 \}\}>\s*<Text style=\{s\.pickerOptionTitle\}>Sewvee Gallery<\/Text>\s*<Text style=\{s\.pickerOptionDesc\}>Choose from your saved designs<\/Text>\s*<\/View>\s*<ChevronRight color=\{Colors\.textSecondary\} size=\{20\} \/>\s*<\/TouchableOpacity>/,
  ""
);

// We should also remove the Modal for Sewvee Gallery to clean up code
content = content.replace(
  /\{\/\* Sewvee Gallery Modal \*\/\}[\s\S]*?<\/Modal>/,
  ""
);

fs.writeFileSync(path, content);
console.log('Removed Sewvee Gallery from CollageMaker!');
