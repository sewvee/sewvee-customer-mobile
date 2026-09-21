const fs = require('fs');
const path = 'src/screens/CustomerShopScreen.js';
let content = fs.readFileSync(path, 'utf8');

const oldCartLogic = `<TouchableOpacity style={styles.cartIconBtn} onPress={() => setIsCartVisible(true)}>
            <ShoppingBag size={24} color={Colors.textPrimary} />
            {cart.length > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cart.reduce((a, c) => a + (c.quantity || 1), 0)}</Text>
              </View>
            )}
          </TouchableOpacity>`;

const newCartLogic = `<TouchableOpacity 
            style={[
              styles.cartIconBtn, 
              cart.length > 0 && { 
                flexDirection: 'row', 
                alignItems: 'center', 
                backgroundColor: Colors.primary, 
                paddingHorizontal: 16, 
                paddingVertical: 10, 
                borderRadius: 24,
                elevation: 3,
                shadowColor: Colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
              }
            ]} 
            onPress={() => setIsCartVisible(true)}
          >
            <ShoppingBag size={cart.length > 0 ? 18 : 24} color={cart.length > 0 ? '#FFF' : Colors.textPrimary} />
            {cart.length > 0 && (
              <Text style={{ color: '#FFF', fontFamily: 'Inter-Bold', fontSize: 13, marginLeft: 8 }}>
                Cart ({cart.reduce((a, c) => a + (c.quantity || 1), 0)})
              </Text>
            )}
          </TouchableOpacity>`;

content = content.replace(oldCartLogic, newCartLogic);
fs.writeFileSync(path, content);
console.log('Patched CustomerShopScreen.js');
