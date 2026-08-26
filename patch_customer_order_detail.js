const fs = require('fs');
const file = 'src/screens/CustomerOrderDetailScreen.js';
let content = fs.readFileSync(file, 'utf8');

const resolveFunction = `
const resolveImageUrl = (url) => {
  if (!url) return url;
  if (url.includes('localhost:')) {
    const { API_DOMAIN } = require('../config/env');
    return url.replace(/http:\\/\\/localhost:\\d+/, API_DOMAIN);
  }
  if (!url.startsWith('http')) {
    const { API_DOMAIN } = require('../config/env');
    return \`\${API_DOMAIN}\${url.startsWith('/') ? '' : '/'}\${url}\`;
  }
  return url;
};
`;

// Insert after imports
content = content.replace(/import .*?;\n\n/, match => match + resolveFunction + '\n');

// Replace refPhotos map
content = content.replace(/refPhotos\.map\(\(photo, pIdx\) => \{([\s\S]*?)let fullUrl = photo\.file_url;\n\s*if \(fullUrl.*\n\s*const \{ API_DOMAIN \}.*\n\s*fullUrl =.*\n\s*\}\n/m, 'refPhotos.map((photo, pIdx) => {\n                      let fullUrl = resolveImageUrl(photo.file_url);\n');

// Replace pendingPhotos map
content = content.replace(/\{pendingPhotos\[outfit\.id\]\.map\(\(url, idx\) => \(/g, '{pendingPhotos[outfit.id].map((rawUrl, idx) => { const url = resolveImageUrl(rawUrl); return (');
content = content.replace(/<Edit2 size=\{13\} color="\#fff" \/>\n\s*<\/TouchableOpacity>\n\s*<\/View>\n\s*\)\)/g, '<Edit2 size={13} color="#fff" />\n                              </TouchableOpacity>\n                            </View>\n                          )})');

fs.writeFileSync(file, content);
