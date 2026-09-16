const fs = require('fs');
const path = 'src/screens/CustomerChatScreen.js';
let content = fs.readFileSync(path, 'utf8');

// Replace SafeAreaView wrapper with View and manual padding
content = content.replace(
  /<SafeAreaView style=\{styles\.container\} edges=\{\['top'\]\}>/g,
  '<View style={[styles.container, { paddingTop: insets.top }]}>'
);
content = content.replace(
  /<\/SafeAreaView>/g,
  '</View>'
);

// Fix the Modal touch bug (sibling architecture)
const modalSearch = `<TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setMessageOptionsVisible(false)}>
          <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 }}>`;
const modalReplace = `<View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} onPress={() => setMessageOptionsVisible(false)} />
          <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, zIndex: 10, elevation: 10 }}>`;
content = content.replace(modalSearch, modalReplace);

const modalClosingSearch = `          </View>
        </TouchableOpacity>
      </Modal>`;
const modalClosingReplace = `          </View>
        </View>
      </Modal>`;
content = content.replace(modalClosingSearch, modalClosingReplace);

// Also make KeyboardView default back to KeyboardAvoidingView with behavior padding on android just in case
content = content.replace(
  /const KeyboardView = Platform.OS === 'ios' \? KeyboardAvoidingView : View;/g,
  "const KeyboardView = KeyboardAvoidingView;"
);

content = content.replace(
  /behavior=\{Platform.OS === 'ios' \? 'padding' : undefined\}/g,
  "behavior={Platform.OS === 'ios' ? 'padding' : undefined}" 
);


// Ensure Pressable and StyleSheet are imported
if (!content.includes('Pressable')) {
    content = content.replace("Image } from 'react-native';", "Image, Pressable, StyleSheet } from 'react-native';");
}


fs.writeFileSync(path, content);
console.log("Patched CustomerChatScreen!");
