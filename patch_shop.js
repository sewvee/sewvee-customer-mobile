const fs = require('fs');
const path = '/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Customer-Mobile/src/screens/CustomerShopScreen.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Add fullScreenImageIndex state
if (!code.includes('fullScreenImageIndex')) {
  code = code.replace(
    'const [selectedProduct, setSelectedProduct] = useState(null);',
    'const [selectedProduct, setSelectedProduct] = useState(null);\n  const [fullScreenImageIndex, setFullScreenImageIndex] = useState(null);'
  );
}

// 2. Add formatImageUrls helper and map images
const targetMapping = `const formatImageUrl = (url) => {`;
if (!code.includes('formatImageUrls')) {
  code = code.replace(
    targetMapping,
    `const formatImageUrls = (urlStr) => {
          if (!urlStr) return [];
          return urlStr.split(',').map(u => u.trim()).filter(Boolean).map(firstUrl => {
            if (Platform.OS === 'android' && firstUrl.includes('localhost')) {
              firstUrl = firstUrl.replace('localhost', '10.0.2.2');
            }
            if (firstUrl.startsWith('http')) return encodeURI(firstUrl);
            if (firstUrl.startsWith('/')) return encodeURI(rootUrl + firstUrl.substring(1));
            return encodeURI(rootUrl + firstUrl);
          });
        };\n        const formatImageUrl = (url) => {`
  );
}

const targetReturn = `image: validImg ? { uri: validImg } : require('../assets/bridal_blouse.png')`;
if (!code.includes('images: allImgs')) {
  code = code.replace(
    targetReturn,
    `images: (formatImageUrls(p.image_url).length > 0) ? formatImageUrls(p.image_url).map(u => ({uri: u})) : [require('../assets/bridal_blouse.png')],\n            image: validImg ? { uri: validImg } : require('../assets/bridal_blouse.png')`
  );
}

// 3. Replace the <Image source={selectedProduct.image} ... /> with a ScrollView
const oldImageRenderer = `<Image source={selectedProduct.image} style={styles.modalImage} resizeMode="cover" />`;
const newImageRenderer = `
                <View style={{ marginBottom: 16 }}>
                  {selectedProduct.images && selectedProduct.images.length > 1 ? (
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      snapToInterval={(SCREEN_WIDTH - 40) * 0.8 + 8}
                      decelerationRate="fast"
                      contentContainerStyle={{ gap: 8 }}
                    >
                      {selectedProduct.images.map((img, idx) => (
                        <TouchableOpacity key={idx} activeOpacity={0.9} onPress={() => setFullScreenImageIndex(idx)}>
                          <Image 
                            source={img} 
                            style={[styles.modalImage, { width: (SCREEN_WIDTH - 40) * 0.8, marginBottom: 0 }]} 
                            resizeMode="cover" 
                          />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  ) : (
                    <TouchableOpacity activeOpacity={0.9} onPress={() => setFullScreenImageIndex(0)}>
                      <Image 
                        source={selectedProduct.image} 
                        style={styles.modalImage} 
                        resizeMode="cover" 
                      />
                    </TouchableOpacity>
                  )}
                </View>
`;

code = code.replace(oldImageRenderer, newImageRenderer);

// 4. Add the Full Screen Image Modal right before the end of the main Modal or at the root
const modalRootEnd = `    </SafeAreaView>
  );
}`;
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
`;

if (!code.includes('visible={fullScreenImageIndex !== null}')) {
  code = code.replace(modalRootEnd, fullScreenModal + modalRootEnd);
}

fs.writeFileSync(path, code);
console.log("Successfully patched CustomerShopScreen.js");
