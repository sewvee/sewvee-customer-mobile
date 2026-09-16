const fs = require('fs');
const path = 'src/screens/CustomerChatScreen.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Add API_DOMAIN
content = content.replace(
  /import \{ BASE_URL, URL_UPLOAD \} from '\.\.\/config\/env';/,
  "import { BASE_URL, URL_UPLOAD, API_DOMAIN } from '../config/env';"
);

// 2. Add getFullImageUrl helper right before renderMessageContent
const getFullImageHelper = `
  const getFullImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('file://')) return url;
    return \`\${API_DOMAIN}\${url.startsWith('/') ? '' : '/'}\${url}\`;
  };
`;
content = content.replace(
  /const renderMessageContent = \(item, isCustomer\) => \{/,
  getFullImageHelper + "\n  const renderMessageContent = (item, isCustomer) => {"
);

// Use getFullImageUrl in renderMessageContent
content = content.replace(
  /<Image source=\{\{ uri: item\.attachment_url \}\} style=\{\{ width: 200, height: 200, borderRadius: 8, marginBottom: 8 \}\} \/>/,
  "<Image source={{ uri: getFullImageUrl(item.attachment_url) }} style={{ width: 200, height: 200, borderRadius: 8, marginBottom: 8 }} />"
);

// 3. Fix Attach Menu Bottom Sheet
const oldAttachMenu = /<Modal visible=\{showAttachMenu\} transparent animationType="fade" onRequestClose=\{\(\) => setShowAttachMenu\(false\)\}>[\s\S]*?<\/Modal>/;
const newAttachMenu = `<Modal visible={showAttachMenu} transparent animationType="slide" onRequestClose={() => setShowAttachMenu(false)}>
        <TouchableOpacity style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'}} activeOpacity={1} onPress={() => setShowAttachMenu(false)}>
          <View style={{backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 34 : 24}}>
            <View style={{ width: 40, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: '#1E293B'}}>Attach File</Text>
            
            <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9'}} onPress={() => { setShowAttachMenu(false); setTimeout(openCamera, 300); }}>
              <Camera size={20} color="#4F46E5" style={{marginRight: 12}} />
              <Text style={{fontSize: 16, color: '#334155'}}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9'}} onPress={() => { setShowAttachMenu(false); setTimeout(openLibrary, 300); }}>
              <ImageIcon size={20} color="#4F46E5" style={{marginRight: 12}} />
              <Text style={{fontSize: 16, color: '#334155'}}>Choose from Library</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 14}} onPress={() => {setShowAttachMenu(false); setCollageOutfitId(contextSelected); setTimeout(() => setCollageMakerVisible(true), 300);}}>
              <Scissors size={20} color="#4F46E5" style={{marginRight: 12}} />
              <Text style={{fontSize: 16, color: '#334155'}}>Create Collage</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>`;

content = content.replace(oldAttachMenu, newAttachMenu);

// 4. Fix Collage Maker Modal wrapper
const oldCollageMaker = /\{\/\* Collage Maker \*\/\}[\s\S]*?<Modal visible=\{collageMakerVisible\}[\s\S]*?<SafeAreaView[\s\S]*?<View[\s\S]*?<\/View>[\s\S]*?<CollageMaker visible=\{collageMakerVisible\} onClose=\{\(\) => setCollageMakerVisible\(false\)\} onSaveReference=\{handleCollageComplete\} \/>[\s\S]*?<\/SafeAreaView>[\s\S]*?<\/Modal>/;
const newCollageMaker = `{/* Collage Maker */}
      <CollageMaker 
        visible={collageMakerVisible} 
        onClose={() => setCollageMakerVisible(false)} 
        onSaveReference={handleCollageComplete} 
      />`;

content = content.replace(oldCollageMaker, newCollageMaker);

// Wait, I need to make sure Scissors is imported!
if (!content.includes('Scissors')) {
  content = content.replace(
    /import \{ Camera, Paperclip, MoreVertical, Image as ImageIcon, Star, Edit2, Trash2, X, FileText, ShoppingBag as Shirt \} from 'lucide-react-native';/,
    "import { Camera, Paperclip, MoreVertical, Image as ImageIcon, Star, Edit2, Trash2, X, FileText, ShoppingBag as Shirt, Scissors } from 'lucide-react-native';"
  );
}

fs.writeFileSync(path, content);
console.log('Patched chat screen issues 3, 4, 5!');
