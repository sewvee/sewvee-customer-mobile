const fs = require('fs');
const path = '/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Customer-Mobile/src/screens/CustomerShopScreen.js';
let code = fs.readFileSync(path, 'utf8');

const target = `  );
};

export default CustomerShopScreen;`;

const fullScreenModal = `
      <Modal visible={fullScreenImageIndex !== null} transparent animationType="fade">
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
      </Modal>
  );
};

export default CustomerShopScreen;`;

if (!code.includes('visible={fullScreenImageIndex !== null}')) {
  code = code.replace(target, fullScreenModal);
  fs.writeFileSync(path, code);
  console.log("Appended full-screen modal successfully.");
} else {
  console.log("Already appended.");
}
