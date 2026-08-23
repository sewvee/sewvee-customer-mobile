const fs = require('fs');
let code = fs.readFileSync('src/components/CollageMaker.js', 'utf8');

code = code.replace(
  /<\/ViewShot>\s*\{\/\* Toolbar \*\/\}/m,
  `</ViewShot>
        </View>

        {/* Selected Slot Action (Remove) */}
        {activeSlot !== null && images[activeSlot] && activeTool === 'select' && (
           <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 10 }}>
              <TouchableOpacity onPress={handleRemovePhoto} style={s.removeBtn}>
                 <Trash2 size={16} color="#EF4444" />
                 <Text style={s.removeBtnText}>Remove Photo {activeSlot + 1}</Text>
              </TouchableOpacity>
           </View>
        )}

        {/* Toolbar */}`
);

fs.writeFileSync('src/components/CollageMaker.js', code);
