const fs = require('fs');

const file = 'src/screens/CustomerShopScreen.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove activeTab state
content = content.replace(/const \[activeTab, setActiveTab\] = useState\('sewvee'\); \/\/ 'sewvee' \| 'boutique'\n/, '');

// 2. Remove activeTab dependency from useEffect
content = content.replace(/}, \[selectedBoutique, activeTab\]\);/g, '}, [selectedBoutique]);');

// 3. Fix fetchProducts logic
content = content.replace(/if \(activeTab === 'sewvee'\) \{\s*url = `\$\{BASE_URL\}customer\/store\/catalogue`;\s*\} else if \(boutique && !boutique.isSewveeDirect\) \{/, 'if (boutique && !boutique.isSewveeDirect) {');

// 4. Replace Shop Header with Dropdown
const headerRegex = /<View style=\{\{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, backgroundColor: '#fff' \}\}>\s*<Text style=\{\{ fontSize: 22, fontFamily: 'Inter-Bold', color: '#0F172A' \}\}>Shop<\/Text>/;
const newHeader = `<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, backgroundColor: '#fff' }}>
          <TouchableOpacity
            onPress={() => setIsBoutiqueModalVisible(true)}
            activeOpacity={0.7}
            style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <Store size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'Inter-Bold', letterSpacing: 0.5, marginBottom: 1 }}>SHOPPING AT</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontFamily: 'Inter-Bold', color: '#0F172A', marginRight: 4 }} numberOfLines={1}>
                  {selectedBoutique ? selectedBoutique.name : 'Select Boutique'}
                </Text>
                <ChevronDown size={16} color="#64748B" />
              </View>
            </View>
          </TouchableOpacity>`;
content = content.replace(headerRegex, newHeader);

// 5. Remove Tab Bar and old Dropdown
const tabBarAndDropdownRegex = /\{\/\* Tab Bar \*\/\}[\s\S]*?\{\/\* Boutique selector — only shown under Boutique tab \*\/\}[\s\S]*?<\/SafeAreaView>/;
content = content.replace(tabBarAndDropdownRegex, '</SafeAreaView>');

fs.writeFileSync(file, content);
console.log('Patched', file);
