const fs = require('fs');
const file = 'src/screens/NewStitchRequestScreen.js';
let content = fs.readFileSync(file, 'utf8');

const target = "sectionHeading: { fontSize: 16, fontFamily: 'Inter-Bold', color: '#0F172A', marginBottom: 12 },";
const replacement = `sectionHeading: { fontSize: 16, fontFamily: 'Inter-Bold', color: '#0F172A', marginBottom: 4 },
  sectionSubheading: { fontSize: 13, fontFamily: 'Inter-Medium', color: '#64748B', marginBottom: 16, lineHeight: 20 },
  
  collagePreviewContainer: { marginBottom: 24 },
  collagePreviewImage: { width: '100%', height: 350, borderRadius: 12, backgroundColor: '#F1F5F9' },
  collageActionRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  btnEditCollage: { flex: 1, borderWidth: 1, borderColor: '#5B43EE', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnEditCollageText: { fontSize: 14, fontFamily: 'Inter-Bold', color: '#5B43EE' },
  btnRemoveCollage: { flex: 1, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnRemoveCollageText: { fontSize: 14, fontFamily: 'Inter-Bold', color: '#EF4444' },`;

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log('Collage styles patched');
