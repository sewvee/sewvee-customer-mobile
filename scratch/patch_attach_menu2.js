const fs = require('fs');

let content = fs.readFileSync('src/screens/CustomerChatScreen.js', 'utf8');

const targetStr = `<Modal visible={showAttachMenu} transparent={true} animationType="fade" onRequestClose={() => setShowAttachMenu(false)}>
        <TouchableOpacity style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'}} onPress={() => setShowAttachMenu(false)}>
          <View style={{backgroundColor: '#FFF', borderRadius: 16, width: '80%', padding: 16}}>
            <Text style={{fontSize: 16, fontWeight: 'bold', marginBottom: 16}}>Attach File</Text>
            <TouchableOpacity style={{paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9'}} onPress={openCamera}><Text>Take Photo</Text></TouchableOpacity>
            <TouchableOpacity style={{paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9'}} onPress={openLibrary}><Text>Choose from Library</Text></TouchableOpacity>
            <TouchableOpacity style={{paddingVertical: 12}} onPress={() => {setShowAttachMenu(false); setCollageOutfitId(contextSelected); setCollageMakerVisible(true);}}><Text>Create Collage</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>`;

const replacementStr = `<Modal visible={showAttachMenu} transparent={true} animationType="fade" onRequestClose={() => setShowAttachMenu(false)}>
        <TouchableOpacity style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end'}} activeOpacity={1} onPress={() => setShowAttachMenu(false)}>
          <View style={{backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20}}>
            <View style={{ width: 40, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{fontSize: 18, fontFamily: 'Inter-Bold', color: '#0F172A', marginBottom: 20}}>Attach Photo</Text>
            
            <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9'}} onPress={() => { setShowAttachMenu(false); setTimeout(openCamera, 300); }}>
              <Camera size={20} color="#475569" style={{ marginRight: 16 }} />
              <Text style={{fontSize: 16, fontFamily: 'Inter-Medium', color: '#0F172A'}}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9'}} onPress={() => { setShowAttachMenu(false); setTimeout(openLibrary, 300); }}>
              <ImageIcon size={20} color="#475569" style={{ marginRight: 16 }} />
              <Text style={{fontSize: 16, fontFamily: 'Inter-Medium', color: '#0F172A'}}>Choose from Library</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 16}} onPress={() => {setShowAttachMenu(false); setCollageOutfitId(contextSelected); setCollageMakerVisible(true);}}>
              <Scissors size={20} color="#475569" style={{ marginRight: 16 }} />
              <Text style={{fontSize: 16, fontFamily: 'Inter-Medium', color: '#0F172A'}}>Create Collage</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>`;

content = content.replace(targetStr, replacementStr);

if (content.includes('import {') && !content.includes('Camera,')) {
  content = content.replace(/import \{\s*Store,/, "import {\n  Store,\n  Camera,");
}

fs.writeFileSync('src/screens/CustomerChatScreen.js', content);
