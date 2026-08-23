const fs = require('fs');
const path = 'src/screens/CustomerShopScreen.js';
let code = fs.readFileSync(path, 'utf8');

const newHeader = `        <View style={[styles.navbar, { justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, height: 'auto' }]}>
          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
            onPress={() => setIsBoutiqueModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Store size={22} color={Colors.primary} />
            </View>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Text style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Inter-Bold', letterSpacing: 0.5, marginBottom: 2 }}>
                SHOPPING AT
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 17, fontFamily: 'Inter-Bold', color: '#0F172A', marginRight: 6, flexShrink: 1 }} numberOfLines={1}>
                  {selectedBoutique ? selectedBoutique.name : 'Select Boutique'}
                </Text>
                <ChevronDown size={16} color="#64748B" />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cartIconBtn} onPress={() => setIsCartVisible(true)}>
            <ShoppingBag size={24} color={Colors.textPrimary} />
            {cart.length > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cart.reduce((a, c) => a + (c.quantity || 1), 0)}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>`;

const startIdx = code.indexOf('<View style={styles.navbar}>');
const endIdx = code.indexOf('        {/* CATEGORIES */}');

if (startIdx !== -1 && endIdx !== -1) {
  code = code.substring(0, startIdx) + newHeader + '\n\n' + code.substring(endIdx);
  fs.writeFileSync(path, code);
  console.log('Patched');
} else {
  console.log('Could not find markers', startIdx, endIdx);
}
