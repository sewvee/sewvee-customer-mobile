const fs = require('fs');
let code = fs.readFileSync('src/components/CollageMaker.js', 'utf8');

// 1. Add 1_single layout
code = code.replace(
  "const LAYOUTS = [",
  "const LAYOUTS = [\n  { id: '1_single', slots: 1, label: 'Single' },"
);

// 2. Add initialImage prop and logic
code = code.replace(
  "galleryFolders = [] }) => {",
  "galleryFolders = [], initialImage = null }) => {"
);

code = code.replace(
  "      setImages({});\n      setOriginalImages({});\n      setActiveSlot(null);",
  `      if (initialImage) {
        setImages({ 0: initialImage });
        setOriginalImages({ 0: initialImage });
        setSelectedLayout(LAYOUTS.find(l => l.id === '1_single') || LAYOUTS[0]);
      } else {
        setImages({});
        setOriginalImages({});
      }
      setActiveSlot(null);`
);

// 3. Fix canvas rendering for single slot
code = code.replace(
  `              {(selectedLayout.id === '3_grid' || selectedLayout.id === '4_grid') ? (`,
  `              {selectedLayout.id === '1_single' ? (
                <TouchableOpacity activeOpacity={0.9} style={[s.slot, activeSlot === 0 && activeTool === 'select' && s.slotActive]} onPress={() => handleSlotPress(0)}>
                  {images[0] ? <Image source={{ uri: images[0] }} style={s.slotImage} /> : <View style={s.emptySlot}><ImagePlus size={24} color={Colors.textSecondary} /><Text style={s.emptySlotText}>Tap to add</Text></View>}
                </TouchableOpacity>
              ) : (selectedLayout.id === '3_grid' || selectedLayout.id === '4_grid') ? (`
);

fs.writeFileSync('src/components/CollageMaker.js', code);
