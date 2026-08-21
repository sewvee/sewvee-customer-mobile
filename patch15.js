const fs = require('fs');
const path = '/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Customer-Mobile/src/screens/CustomerGalleryScreen.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Remove the deleteImageBtn from the thumbnail grid
const targetGrid = `<TouchableOpacity onPress={() => setPreviewImage(item.url)} activeOpacity={0.9}>
                      <Image source={{ uri: item.url }} style={styles.imageItem} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteImageBtn} onPress={() => handleDeleteImage(item.id)}>
                      <X size={14} color="#FFF" />
                    </TouchableOpacity>`;

const newGrid = `<TouchableOpacity onPress={() => setPreviewImage(item)} activeOpacity={0.9}>
                      <Image source={{ uri: item.url }} style={styles.imageItem} />
                    </TouchableOpacity>`;

code = code.replace(targetGrid, newGrid);

// Wait, previewImage is currently just the URL string?
// `setPreviewImage(item.url)` is replaced with `setPreviewImage(item)` so we have the `item.id` for deletion!

// 2. Add the delete button to the Modal
const targetModal = `<Modal visible={!!previewImage} transparent animationType="fade">
        <View style={styles.previewContainer}>
          <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewImage(null)}>
            <X size={28} color="#FFF" />
          </TouchableOpacity>
          <Image source={{ uri: previewImage }} style={styles.previewImage} resizeMode="contain" />
        </View>
      </Modal>`;

const newModal = `<Modal visible={!!previewImage} transparent animationType="fade">
        <View style={styles.previewContainer}>
          <View style={{ position: 'absolute', top: 50, right: 20, flexDirection: 'row', gap: 16, zIndex: 10 }}>
            <TouchableOpacity 
              onPress={() => {
                if (previewImage?.id) {
                  handleDeleteImage(previewImage.id);
                  setPreviewImage(null);
                }
              }}
              style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20 }}
            >
              <Trash2 size={24} color="#EF4444" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => setPreviewImage(null)}
              style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20 }}
            >
              <X size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
          {previewImage?.url && (
            <Image source={{ uri: previewImage.url }} style={styles.previewImage} resizeMode="contain" />
          )}
        </View>
      </Modal>`;

code = code.replace(targetModal, newModal);

// Update import to include Trash2
if (!code.includes("Trash2")) {
  code = code.replace("import { Trash, Edit3", "import { Trash, Trash2, Edit3");
  if (!code.includes("Trash2")) {
      code = code.replace("import { X, Plus", "import { X, Plus, Trash2");
  }
}

fs.writeFileSync(path, code);
console.log("CustomerGalleryScreen.js patched!");
