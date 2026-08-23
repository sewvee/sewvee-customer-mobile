const fs = require('fs');
let code = fs.readFileSync('src/screens/CustomerOrderDetailScreen.js', 'utf8');

// 1. Remove PhotoAnnotationEditor import
code = code.replace(
  "import PhotoAnnotationEditor from '../components/PhotoAnnotationEditor';\n",
  ""
);

// 2. Remove obsolete states
code = code.replace(
  "  const [annotateVisible, setAnnotateVisible] = useState(false);\n  const [annotatePhotoUri, setAnnotatePhotoUri] = useState(null);\n",
  ""
);

// 3. Update drawer UI
// The drawer has 3 options: Crop Photo, Change Photo, Add Text
// Let's replace the whole modal content for the drawer to just two options: 
// "Edit Photo (Crop, Text, Draw)" and "Change Photo"
code = code.replace(
  /<Text style=\{\{ fontSize: 13, fontFamily: 'Inter-Medium', color: '#64748B', marginBottom: 20 \}\}>What would you like to do with this photo\?<\/Text>[\s\S]*?(?=<\/View>\s*<\/Modal>)/g,
  `<Text style={{ fontSize: 13, fontFamily: 'Inter-Medium', color: '#64748B', marginBottom: 20 }}>What would you like to do with this photo?</Text>

          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' }}
            onPress={() => {
              setEditDrawerVisible(false);
              setCollageOutfitId(editingPhoto.outfitId);
              setShowCollageMaker(true); // Open the unified editor!
            }}
          >
            <View style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
              <ImagePlus size={22} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontFamily: 'Inter-Bold', color: '#1E293B' }}>Edit Photo</Text>
              <Text style={{ fontSize: 12, fontFamily: 'Inter-Medium', color: '#64748B', marginTop: 2 }}>Crop, draw, or add text</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' }}
            onPress={handleChangeUploadedPhoto}
          >
            <View style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
              <ImageIcon size={22} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontFamily: 'Inter-Bold', color: '#1E293B' }}>Change Photo</Text>
              <Text style={{ fontSize: 12, fontFamily: 'Inter-Medium', color: '#64748B', marginTop: 2 }}>Replace with a new image</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ alignItems: 'center', paddingVertical: 14, marginTop: 4 }}
            onPress={() => setEditDrawerVisible(false)}
          >
            <Text style={{ fontSize: 15, fontFamily: 'Inter-SemiBold', color: '#64748B' }}>Cancel</Text>
          </TouchableOpacity>
        `
);

// 4. Modify <CollageMaker /> to pass initialImage
code = code.replace(
  /<CollageMaker[\s\S]*?galleryFolders=\{\[\]\}\s*\/>/,
  `<CollageMaker
        visible={showCollageMaker}
        onClose={() => { setShowCollageMaker(false); setEditingPhoto(null); }}
        onSaveReference={handleSaveCollage}
        galleryFolders={[]}
        initialImage={editingPhoto ? editingPhoto.file_url : null}
      />`
);

// 5. Remove <PhotoAnnotationEditor /> rendering at the bottom
code = code.replace(
  /<PhotoAnnotationEditor[\s\S]*?\/>\s*<\/View>\s*\);\s*\}\s*export default CustomerOrderDetailScreen;/,
  `</View>\n  );\n}\n\nexport default CustomerOrderDetailScreen;`
);

fs.writeFileSync('src/screens/CustomerOrderDetailScreen.js', code);
