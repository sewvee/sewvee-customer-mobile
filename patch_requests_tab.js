const fs = require('fs');
const path = 'src/components/CustomerRequestsTab.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Add placeholderTextColor to TextInput
code = code.replace(
  /<TextInput\s*style=\{styles.input\}\s*placeholder="Type a message..."/g,
  '<TextInput\n          style={styles.input}\n          placeholder="Type a message..."\n          placeholderTextColor="#94A3B8"'
);

// 2. Wrap the return with KeyboardAvoidingView
code = code.replace(
  /return \(\n    <View style=\{styles.container\}>/g,
  `return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >`
);

// Change the closing </View> to </KeyboardAvoidingView>
// Let's just find the last </View> and replace it.
const lastViewIndex = code.lastIndexOf('</View>');
if (lastViewIndex !== -1) {
  code = code.substring(0, lastViewIndex) + '</KeyboardAvoidingView>' + code.substring(lastViewIndex + 7);
}

// 3. Add Full Screen Image Modal
// Add state
code = code.replace(
  /const \[sending, setSending\] = useState\(false\);/,
  "const [sending, setSending] = useState(false);\n  const [fullScreenImage, setFullScreenImage] = useState(null);"
);

// Wrap Image with TouchableOpacity
code = code.replace(
  /\{req\.attachment_url && \(\n\s*<Image source=\{\{ uri: req\.attachment_url \}\} style=\{styles\.msgImage\} \/>\n\s*\)\}/g,
  `{req.attachment_url && (
              <TouchableOpacity activeOpacity={0.8} onPress={() => setFullScreenImage(req.attachment_url)}>
                <Image source={{ uri: req.attachment_url }} style={styles.msgImage} />
              </TouchableOpacity>
            )}`
);

// Add Modal JSX before the closing KeyboardAvoidingView
const modalJsx = `
      <Modal visible={!!fullScreenImage} transparent animationType="fade" onRequestClose={() => setFullScreenImage(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 10 }} onPress={() => setFullScreenImage(null)}>
            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>Close</Text>
          </TouchableOpacity>
          {fullScreenImage && <Image source={{ uri: fullScreenImage }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />}
        </View>
      </Modal>
`;

// Insert modal before the last </KeyboardAvoidingView>
const closingTag = '</KeyboardAvoidingView>';
const finalIndex = code.lastIndexOf(closingTag);
if (finalIndex !== -1) {
  code = code.substring(0, finalIndex) + modalJsx + code.substring(finalIndex);
}

fs.writeFileSync(path, code);
