const fs = require('fs');
const file = 'src/screens/NewStitchRequestScreen.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Add removeOutfit function
const updateOutfitRegex = /const updateOutfit = \(outfitId, key, value\) => \{.*?\};\n/s;
const updateOutfitCode = content.match(updateOutfitRegex)[0];
const removeOutfitCode = `const removeOutfit = (outfitId) => {
    setOutfits(prev => {
      const outfitToRemove = prev.find(o => o.id === outfitId);
      if (outfitToRemove) {
        updateCount(outfitToRemove.category, -1);
      }
      return prev.filter(o => o.id !== outfitId);
    });
  };
  
  `;

content = content.replace(updateOutfitCode, updateOutfitCode + removeOutfitCode);

// 2. Add Red X to the card
const cardRegex = /<ChevronRight size=\{20\} color="#CBD5E1" \/>\n\s*<\/TouchableOpacity>/s;
const cardReplacement = `<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => removeOutfit(outfit.id)} style={{ padding: 4, backgroundColor: '#FEE2E2', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} color="#EF4444" />
            </TouchableOpacity>
            <ChevronRight size={20} color="#CBD5E1" />
          </View>
        </TouchableOpacity>`;

content = content.replace(cardRegex, cardReplacement);

// 3. Increase modal height
content = content.replace("maxHeight: '85%'", "maxHeight: '92%'");

fs.writeFileSync(file, content);
console.log('Remove button added and drawer height increased');
