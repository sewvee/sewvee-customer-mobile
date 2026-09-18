const fs = require('fs');
const path = 'src/screens/NewStitchRequestScreen.js';
let content = fs.readFileSync(path, 'utf8');

const oldText = `<Text style={styles.sectionSubheading}>Add your fabric & design inspiration. 1) Collage your saree/outfit material, any embroidery or patterns, and reference images.</Text>`;
const newText = `<Text style={styles.sectionSubheading}>Add your fabric, patterns, and design inspiration.</Text>`;

content = content.replace(oldText, newText);

const oldStyle = `sectionSubheading: { fontSize: 13, fontFamily: 'Inter-Medium', color: '#64748B', marginBottom: 16, lineHeight: 20 },`;
const newStyle = `sectionSubheading: { fontSize: 12, fontFamily: 'Inter-Medium', color: '#64748B', marginBottom: 12, lineHeight: 18 },`;

content = content.replace(oldStyle, newStyle);

fs.writeFileSync(path, content);
console.log('Patched NewStitchRequestScreen.js');
