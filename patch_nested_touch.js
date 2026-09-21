const fs = require('fs');
const file = 'src/screens/NewStitchRequestScreen.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /<TouchableOpacity \n          key=\{outfit\.id\} \n          style=\{styles\.outfitDrawerCard\} \n          onPress=\{.*?\}\n        >\n          <View style=\{styles\.accordionHeaderLeft\}>[\s\S]*?<Text style=\{styles\.outfitSubtitle\}>Tap to add details<\/Text>\n            <\/View>\n          <\/View>\n          <View style=\{\{ flexDirection: 'row', alignItems: 'center', gap: 12 \}\}>\n            <TouchableOpacity onPress=\{.*?\} style=\{.*?\}>\n              <X size=\{14\} color="#EF4444" \/>\n            <\/TouchableOpacity>\n            <ChevronRight size=\{20\} color="#CBD5E1" \/>\n          <\/View>\n        <\/TouchableOpacity>/;

const replacement = `<View key={outfit.id} style={styles.outfitDrawerCard}>
          <TouchableOpacity 
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} 
            onPress={() => setEditingOutfitId(outfit.id)}
          >
            <View style={styles.accordionHeaderLeft}>
              <View style={styles.accordionIndexCircle}>
                <Text style={styles.accordionIndexText}>{index + 1}</Text>
              </View>
              <View>
                <Text style={styles.outfitTitle}>{outfit.name}</Text>
                <Text style={styles.outfitSubtitle}>Tap to add details</Text>
              </View>
            </View>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => removeOutfit(outfit.id)} style={{ padding: 4, backgroundColor: '#FEE2E2', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} color="#EF4444" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditingOutfitId(outfit.id)}>
              <ChevronRight size={20} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        </View>`;

content = content.replace(regex, replacement);
fs.writeFileSync(file, content);
console.log('Fixed nested TouchableOpacity');
