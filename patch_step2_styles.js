const fs = require('fs');
const file = 'src/screens/NewStitchRequestScreen.js';
let content = fs.readFileSync(file, 'utf8');

const styleTarget = /outfitCard: \{.*?\},\n  outfitTitle: \{.*?\},\n  fieldLabel: \{.*?\},\n  textArea: \{.*?\},\n  radioRow: \{.*?\},\n  radioCircle: \{.*?\},\n  radioCircleActive: \{.*?\},\n  radioDot: \{.*?\},\n  radioText: \{.*?\},\n  \n  imagesGrid: \{.*?\},\n  imageWrapper: \{.*?\},\n  previewImage: \{.*?\},\n  removeImageBtn: \{.*?\},\n  addPhotoBtn: \{.*?\},\n  addPhotoText: \{.*?\},/s;

const styleReplacement = `// Step 2 (Accordion)
  outfitCard: {
    backgroundColor: '#FFF',
    borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 16, marginBottom: 16,
  },
  outfitCardExpanded: {
    borderColor: '#CBD5E1',
  },
  accordionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16,
  },
  accordionHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  accordionIndexCircle: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center', marginRight: 16,
  },
  accordionIndexText: { fontSize: 16, fontFamily: 'Inter-Bold', color: '#64748B' },
  outfitTitle: { fontSize: 18, fontFamily: 'Inter-Bold', color: '#0F172A' },
  outfitSubtitle: { fontSize: 13, fontFamily: 'Inter-Medium', color: '#94A3B8', marginTop: 2 },
  
  accordionBody: { padding: 16, paddingTop: 0 },
  
  dashedBox: {
    borderWidth: 1, borderColor: '#CBD5E1', borderStyle: 'dashed', borderRadius: 16,
    padding: 24, alignItems: 'center', marginBottom: 24, backgroundColor: '#F8FAFC',
  },
  iconCircle: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  boxTitle: { fontSize: 16, fontFamily: 'Inter-Bold', color: '#0F172A', marginBottom: 8 },
  boxSubtitle: { fontSize: 13, fontFamily: 'Inter-Medium', color: '#64748B', textAlign: 'center', marginBottom: 16, paddingHorizontal: 12 },
  btnCollage: {
    backgroundColor: '#5B43EE', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12,
  },
  btnCollageText: { fontSize: 14, fontFamily: 'Inter-Bold', color: '#FFF' },

  sectionHeading: { fontSize: 16, fontFamily: 'Inter-Bold', color: '#0F172A', marginBottom: 12 },
  textArea: {
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 12, padding: 16, fontSize: 14, fontFamily: 'Inter-Medium', color: '#64748B',
    minHeight: 120, marginBottom: 12,
  },
  orText: { fontSize: 13, fontFamily: 'Inter-Medium', color: '#64748B', marginBottom: 12 },
  btnVoiceNote: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#CBD5E1', borderStyle: 'dashed', borderRadius: 12,
    paddingVertical: 14, marginBottom: 24,
  },
  btnVoiceNoteText: { fontSize: 14, fontFamily: 'Inter-Bold', color: '#5B43EE' },

  measurementOptionBox: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, marginBottom: 12,
    backgroundColor: '#FFF',
  },
  measurementOptionBoxActive: { borderColor: '#5B43EE', backgroundColor: '#EEF2FF' },
  measurementOptionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  measurementOptionText: { fontSize: 14, fontFamily: 'Inter-Bold', color: '#475569' },
  measurementOptionTextActive: { color: '#5B43EE' },
  subInputBox: {
    marginTop: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 8, padding: 12,
  },
  subInputText: { fontSize: 13, fontFamily: 'Inter-Medium', color: '#5B43EE' },

  imagesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  imageWrapper: { width: 70, height: 70, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  previewImage: { width: '100%', height: '100%' },
  removeImageBtn: {
    position: 'absolute', top: 4, right: 4,
    width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center'
  },`;

content = content.replace(styleTarget, styleReplacement);

fs.writeFileSync(file, content);
console.log('Step 2 styles implemented');
