const fs = require('fs');
let code = fs.readFileSync('src/components/CollageMaker.js', 'utf8');

// 1. Add renderSlot function right before captureAndSave
code = code.replace(
  /  const captureAndSave = async \(isDownload = false\) => \{/m,
  `  const renderSlot = (i) => {
    const isActive = activeSlot === i && activeTool === 'select';
    return (
      <TouchableOpacity key={i} activeOpacity={0.9} style={[s.slot, isActive && s.slotActive]} onPress={() => handleSlotPress(i)}>
        {images[i] ? <Image source={{ uri: images[i] }} style={s.slotImage} /> : <View style={s.emptySlot}><ImagePlus size={24} color={Colors.textSecondary} /><Text style={s.emptySlotText}>Tap to add</Text></View>}
        {images[i] && isActive && (
          <TouchableOpacity 
             style={s.slotDeleteBtn} 
             onPress={(e) => { 
                // Don't trigger the slot press
                if (e && e.stopPropagation) e.stopPropagation();
                // We need to pass the slot index so we can delete it directly instead of relying on state which might be weird in this closure
                setImages(prev => { const n = {...prev}; delete n[i]; return n; });
                setOriginalImages(prev => { const n = {...prev}; delete n[i]; return n; });
                setActiveSlot(null);
             }}
          >
            <Trash2 size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const captureAndSave = async (isDownload = false) => {
    setActiveSlot(null);`
);

// 2. Replace the slot rendering in the UI with renderSlot(i)
const regex1_single = /\{selectedLayout\.id === '1_single' \? \([\s\S]*?<\/TouchableOpacity>\s*\) : \(selectedLayout\.id === '3_grid' \|\| selectedLayout\.id === '4_grid'\) \? \(/;
code = code.replace(regex1_single, `{selectedLayout.id === '1_single' ? (
                renderSlot(0)
              ) : (selectedLayout.id === '3_grid' || selectedLayout.id === '4_grid') ? (`);

code = code.replace(
  /\{\[0, 1\]\.map\(i => \([\s\S]*?<\/TouchableOpacity>\s*\)\)\}/,
  `{[0, 1].map(i => renderSlot(i))}`
);

// We have TWO `{[0, 1].map...}` now because of the regex replacing the first one. Let's do the other loops.
code = code.replace(
  /\{\[2, selectedLayout\.id === '4_grid' \? 3 : null\]\.filter\(x => x !== null\)\.map\(i => \([\s\S]*?<\/TouchableOpacity>\s*\)\)\}/,
  `{[2, selectedLayout.id === '4_grid' ? 3 : null].filter(x => x !== null).map(i => renderSlot(i))}`
);

// And the last one (for 2_vertical and 2_horizontal):
code = code.replace(
  /\{\[0, 1\]\.map\(i => \([\s\S]*?<\/TouchableOpacity>\s*\)\)\}/,
  `{[0, 1].map(i => renderSlot(i))}`
);

// 3. Remove the "Selected Slot Action (Remove)" block
const removeBlockRegex = /\{\/\* Selected Slot Action \(Remove\) \*\/\}\s*\{activeSlot !== null && images\[activeSlot\] && activeTool === 'select' && \([\s\S]*?<\/View>\s*\)\}/;
code = code.replace(removeBlockRegex, "");

// 4. Add slotDeleteBtn to styles
code = code.replace(
  /emptySlotText: \{ fontSize: 12, fontFamily: 'Inter-Medium', color: Colors\.textSecondary, marginTop: 4 \},/,
  `emptySlotText: { fontSize: 12, fontFamily: 'Inter-Medium', color: Colors.textSecondary, marginTop: 4 },
  slotDeleteBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(239, 68, 68, 0.95)', padding: 8, borderRadius: 20, zIndex: 10, ...Shadow.subtle },`
);

fs.writeFileSync('src/components/CollageMaker.js', code);
