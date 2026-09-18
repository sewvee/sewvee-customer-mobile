const fs = require('fs');
const path = 'src/components/CollageMaker.js';
let content = fs.readFileSync(path, 'utf8');

// Remove Sewvee Gallery option
content = content.replace(
  /<TouchableOpacity style=\{s\.pickerOption\} onPress=\{\(\) => \{ setSourcePickerVisible\(false\); setGalleryBrowserVisible\(true\); \}\}>[\s\S]*?<View style=\{s\.pickerOptionIcon\}><Folder size=\{24\} color=\{Colors\.primary\} \/><\/View>[\s\S]*?<View style=\{\{ flex: 1 \}\}><Text style=\{s\.pickerOptionTitle\}>Sewvee Gallery<\/Text><\/View>[\s\S]*?<ChevronRight size=\{18\} color=\{Colors\.textSecondary\} \/>[\s\S]*?<\/TouchableOpacity>/,
  ""
);

fs.writeFileSync(path, content);
console.log('Cleaned Sewvee Gallery option!');
