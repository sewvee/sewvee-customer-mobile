const fs = require('fs');
const path = '/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Customer-Mobile/src/screens/CustomerShopScreen.js';
let code = fs.readFileSync(path, 'utf8');

const oldStr = `</View>

      <Modal visible={fullScreenImageIndex !== null}`;

const newStr = `
      <Modal visible={fullScreenImageIndex !== null}`;

// The goal is to move the </View> after the Modal.
// Let's just find the exact block and replace it correctly.

let fullModalBlock = `      <Modal visible={fullScreenImageIndex !== null} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' }}>
          <TouchableOpacity 
            style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 }} 
            onPress={() => setFullScreenImageIndex(null)}
          >
            <X size={32} color="#FFF" />
          </TouchableOpacity>
          {fullScreenImageIndex !== null && selectedProduct?.images && (
            <ScrollView 
              horizontal 
              pagingEnabled 
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: SCREEN_WIDTH * fullScreenImageIndex, y: 0 }}
            >
              {selectedProduct.images.map((img, idx) => (
                <View key={idx} style={{ width: SCREEN_WIDTH, height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                  <Image 
                    source={img} 
                    style={{ width: SCREEN_WIDTH, height: '80%' }} 
                    resizeMode="contain" 
                  />
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>`;

// Remove the wrongly placed modal block first
code = code.replace(`</View>\n\n${fullModalBlock}\n  );\n};`, `</View>\n  );\n};`);

// Now insert it BEFORE the </View>
code = code.replace(`</View>\n  );\n};`, `${fullModalBlock}\n    </View>\n  );\n};`);

fs.writeFileSync(path, code);
console.log("JSX fixed!");
