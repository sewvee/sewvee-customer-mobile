const fs = require('fs');

let content = fs.readFileSync('src/screens/CustomerChatScreen.js', 'utf8');

// Replace showAttachMenu modal
const targetModal = /<Modal visible=\{showAttachMenu\}[^>]*>\s*<TouchableOpacity[^>]*>\s*<View[^>]*>\s*<Text[^>]*>Attach File<\/Text>\s*<TouchableOpacity[^>]*>\s*<Text>Take Photo<\/Text>\s*<\/TouchableOpacity>\s*<TouchableOpacity[^>]*>\s*<Text>Choose from Library<\/Text>\s*<\/TouchableOpacity>\s*<TouchableOpacity[^>]*>\s*<Text>Create Collage<\/Text>\s*<\/TouchableOpacity>\s*<\/View>\s*<\/TouchableOpacity>\s*<\/Modal>/m;

const replacementModal = `<Modal visible={showAttachMenu} transparent={true} animationType="fade" onRequestClose={() => setShowAttachMenu(false)}>
        <TouchableOpacity style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end'}} activeOpacity={1} onPress={() => setShowAttachMenu(false)}>
          <View style={{backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20}}>
            <View style={{ width: 40, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{fontSize: 18, fontFamily: 'Inter-Bold', color: '#0F172A', marginBottom: 20}}>Attach Photo</Text>
            
            <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9'}} onPress={openCamera}>
              <Camera size={20} color="#475569" style={{ marginRight: 16 }} />
              <Text style={{fontSize: 16, fontFamily: 'Inter-Medium', color: '#0F172A'}}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9'}} onPress={openLibrary}>
              <Image as={ImageIcon} size={20} color="#475569" style={{ marginRight: 16 }} />
              <Text style={{fontSize: 16, fontFamily: 'Inter-Medium', color: '#0F172A'}}>Choose from Library</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 16}} onPress={() => {setShowAttachMenu(false); setCollageOutfitId(contextSelected); setCollageMakerVisible(true);}}>
              <Scissors size={20} color="#475569" style={{ marginRight: 16 }} />
              <Text style={{fontSize: 16, fontFamily: 'Inter-Medium', color: '#0F172A'}}>Create Collage</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>`;

content = content.replace(targetModal, replacementModal);

// We need to import Camera. ImageIcon and Scissors are already imported probably? Let's check imports.
if (!content.includes('Camera,')) {
  content = content.replace(/import \{ \n  Store, \n  User, \n  MoreVertical,/, "import { \n  Store, \n  User, \n  MoreVertical, \n  Camera,");
}
fs.writeFileSync('src/screens/CustomerChatScreen.js', content);
