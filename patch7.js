const fs = require('fs');
const path = '/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Customer-Mobile/src/components/CustomerRequestsTab.js';
let code = fs.readFileSync(path, 'utf8');

const targetUI = `  if (!activeOutfit) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 16, fontFamily: 'Inter-Bold', color: '#1E293B', marginBottom: 16 }}>
          Which outfit do you want to request changes for?
        </Text>
        {outfits.map((outfit, index) => (
          <TouchableOpacity
            key={outfit.id}
            style={styles.outfitCard}
            onPress={() => setActiveOutfit(outfit)}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontFamily: 'Inter-Bold', color: Colors.primary }}>
                {outfit.name ? outfit.name.toUpperCase() : \`OUTFIT \${index + 1}\`}
              </Text>
              <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
                {outfit.orderType || 'Stitching'} • {outfit.urgency || 'NORMAL'}
              </Text>
            </View>
            <ChevronRight size={20} color="#94A3B8" />
          </TouchableOpacity>
        ))}
      </View>
    );
  }`;

const newUI = `  if (!activeOutfit) {
    return (
      <View style={{ flex: 1, padding: 16, backgroundColor: '#F8FAFC' }}>
        <View style={{ marginBottom: 20, paddingHorizontal: 4 }}>
          <Text style={{ fontSize: 18, fontFamily: 'Inter-Bold', color: '#0F172A', marginBottom: 6 }}>
            Boutique Support Chat
          </Text>
          <Text style={{ fontSize: 14, fontFamily: 'Inter-Regular', color: '#64748B' }}>
            Select an outfit below to message the boutique or request changes.
          </Text>
        </View>

        {outfits.map((outfit, index) => (
          <TouchableOpacity
            key={outfit.id}
            style={[styles.outfitCard, { 
              backgroundColor: '#fff', 
              borderWidth: 0, 
              borderLeftWidth: 4, 
              borderLeftColor: Colors.primary,
              shadowColor: '#000',
              shadowOpacity: 0.05,
              shadowRadius: 5,
              shadowOffset: { width: 0, height: 2 },
              elevation: 2,
              paddingVertical: 16
            }]}
            onPress={() => setActiveOutfit(outfit)}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontFamily: 'Inter-Bold', color: '#1E293B' }}>
                {outfit.name ? outfit.name.toUpperCase() : \`OUTFIT \${index + 1}\`}
              </Text>
              <Text style={{ fontSize: 13, fontFamily: 'Inter-Medium', color: '#64748B', marginTop: 6 }}>
                {outfit.orderType || 'Stitching'} • {outfit.urgency || 'NORMAL'}
              </Text>
            </View>
            <View style={{ backgroundColor: '#EEF2FF', padding: 8, borderRadius: 12 }}>
              <MessageSquare size={18} color={Colors.primary} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  }`;

code = code.replace(targetUI, newUI);

// Import MessageSquare if missing
if (!code.includes("MessageSquare")) {
  code = code.replace("import { ChevronRight, Image as ImageIcon, Send, ArrowLeft } from 'lucide-react-native';", "import { ChevronRight, Image as ImageIcon, Send, ArrowLeft, MessageSquare } from 'lucide-react-native';");
}

fs.writeFileSync(path, code);
console.log("CustomerRequestsTab.js UI patched!");
