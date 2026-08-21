const fs = require('fs');
const path = '/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Customer-Mobile/src/screens/CustomerGalleryScreen.js';
let code = fs.readFileSync(path, 'utf8');

const targetModal = `<Modal visible={!!previewImage} transparent animationType="fade">
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewImage(null)}>
            <X size={28} color="#FFF" />
          </TouchableOpacity>
          {previewImage && (
            <Image source={{ uri: previewImage }} style={styles.previewImageFull} resizeMode="contain" />
          )}
        </View>
      </Modal>`;

const newModal = `<Modal visible={!!previewImage} transparent animationType="fade">
        <View style={styles.previewOverlay}>
          <View style={{ position: 'absolute', top: 50, right: 20, flexDirection: 'row', gap: 16, zIndex: 10 }}>
            <TouchableOpacity 
              onPress={() => {
                if (previewImage?.id) {
                  handleDeleteImage(previewImage.id);
                  setPreviewImage(null);
                }
              }}
              style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 24, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}
            >
              <Trash2 size={24} color="#EF4444" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => setPreviewImage(null)}
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 24, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}
            >
              <X size={28} color="#FFF" />
            </TouchableOpacity>
          </View>
          {previewImage?.url && (
            <Image source={{ uri: previewImage.url }} style={styles.previewImageFull} resizeMode="contain" />
          )}
        </View>
      </Modal>`;

code = code.replace(targetModal, newModal);
fs.writeFileSync(path, code);
console.log("CustomerGalleryScreen.js modal correctly patched!");
