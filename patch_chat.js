const fs = require('fs');
const path = 'src/screens/CustomerChatScreen.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Add state
content = content.replace(
  "const [collageMakerVisible, setCollageMakerVisible] = useState(false);",
  "const [collageMakerVisible, setCollageMakerVisible] = useState(false);\n  const [attachedImage, setAttachedImage] = useState(null);"
);

// 2. Modify openCamera, openLibrary, handleCollageComplete
const oldCamera = `    ImagePicker.launchCamera({ mediaType: 'photo', quality: 0.8 }, (res) => {
      if (res.assets && res.assets.length > 0) {
        uploadImageAndSend(res.assets[0].uri, contextSelected);
      }
    });`;
const newCamera = `    ImagePicker.launchCamera({ mediaType: 'photo', quality: 0.8 }, (res) => {
      if (res.assets && res.assets.length > 0) {
        setAttachedImage(res.assets[0].uri);
      }
    });`;
content = content.replace(oldCamera, newCamera);

const oldLibrary = `    ImagePicker.launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (res) => {
      if (res.assets && res.assets.length > 0) {
        uploadImageAndSend(res.assets[0].uri, contextSelected);
      }
    });`;
const newLibrary = `    ImagePicker.launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (res) => {
      if (res.assets && res.assets.length > 0) {
        setAttachedImage(res.assets[0].uri);
      }
    });`;
content = content.replace(oldLibrary, newLibrary);

const oldCollage = `  const handleCollageComplete = (uri) => {
    setCollageMakerVisible(false);
    if (uri && collageOutfitId) {
      uploadImageAndSend(uri, collageOutfitId);
    }
  };`;
const newCollage = `  const handleCollageComplete = (uri) => {
    setCollageMakerVisible(false);
    if (uri && collageOutfitId) {
      setAttachedImage(uri);
    }
  };`;
content = content.replace(oldCollage, newCollage);

// 3. Modify handleSend
const oldHandleSend = `  const handleSend = async () => {

    if (editingMessage) {
      return handleUpdateMessage();
    }

    if (!inputText.trim() || !contextSelected) return;
    const [orderId, outfitId] = contextSelected.split('_');
    if (!orderId || !outfitId) return;

    try {
      setSending(true);
      let token = await AsyncStorage.getItem('userToken');
      token = token ? (token.startsWith('Bearer ') ? token : \`Bearer \${token}\`) : '';
      const res = await axios.post(\`\${BASE_URL}customer-portal/orders/\${orderId}/outfits/\${outfitId}/requests\`, {
        message: inputText.trim()
      }, {
        headers: { Authorization: token }
      });
      setInputText('');
      fetchMessages();
    } catch (e) {
      console.warn('Failed to send msg', e);
    } finally {
      setSending(false);
    }
  };`;

const newHandleSend = `  const handleSend = async () => {

    if (editingMessage) {
      return handleUpdateMessage();
    }

    if (!inputText.trim() && !attachedImage) return;
    if (!contextSelected) return;

    if (attachedImage) {
      const msg = inputText.trim() || 'Uploaded Photos';
      const img = attachedImage;
      setAttachedImage(null);
      setInputText('');
      await uploadImageAndSend(img, contextSelected, msg);
      return;
    }

    const [orderId, outfitId] = contextSelected.split('_');
    if (!orderId || !outfitId) return;

    try {
      setSending(true);
      let token = await AsyncStorage.getItem('userToken');
      token = token ? (token.startsWith('Bearer ') ? token : \`Bearer \${token}\`) : '';
      const res = await axios.post(\`\${BASE_URL}customer-portal/orders/\${orderId}/outfits/\${outfitId}/requests\`, {
        message: inputText.trim()
      }, {
        headers: { Authorization: token }
      });
      setInputText('');
      fetchMessages();
    } catch (e) {
      console.warn('Failed to send msg', e);
    } finally {
      setSending(false);
    }
  };`;

content = content.replace(oldHandleSend, newHandleSend);

// 4. Modify UI in chatbox
const oldInputArea = `            <View style={styles.inputContainer}>
              <TouchableOpacity 
                style={styles.attachBtn} 
                onPress={handleAttachment}
                disabled={!contextSelected || sending}
              >
                <Paperclip size={24} color={!contextSelected || sending ? "#CBD5E1" : "#94A3B8"} />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor="#94A3B8"
                value={inputText}
                onChangeText={setInputText}
                multiline
              />
              {inputText.trim() ? (
                <TouchableOpacity 
                  style={[styles.sendBtn, (!contextSelected) && { opacity: 0.5 }]} 
                  onPress={handleSend}
                  disabled={!contextSelected || sending}
                >
                  {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Send size={20} color="#FFF" />}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[styles.sendBtn, { backgroundColor: '#5B43EE' }, (!contextSelected) && { opacity: 0.5 }]} 
                  onPress={startRecording}
                  disabled={!contextSelected || sending}
                >
                  <Mic size={20} color="#FFF" />
                </TouchableOpacity>
              )}`;

const newInputArea = `            <View style={{ flexDirection: 'column', backgroundColor: '#F8FAFC', borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingHorizontal: 16, paddingVertical: 12 }}>
              {attachedImage && (
                <View style={{ flexDirection: 'row', marginBottom: 12, position: 'relative', alignSelf: 'flex-start' }}>
                  <Image source={{ uri: attachedImage }} style={{ width: 80, height: 80, borderRadius: 8, backgroundColor: '#E2E8F0' }} />
                  <TouchableOpacity 
                    style={{ position: 'absolute', top: -8, right: -8, backgroundColor: '#FFF', borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.2, shadowRadius: 2, padding: 2 }}
                    onPress={() => setAttachedImage(null)}
                  >
                    <X size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity 
                style={styles.attachBtn} 
                onPress={handleAttachment}
                disabled={!contextSelected || sending}
              >
                <Paperclip size={24} color={!contextSelected || sending ? "#CBD5E1" : "#94A3B8"} />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor="#94A3B8"
                value={inputText}
                onChangeText={setInputText}
                multiline
              />
              {inputText.trim() || attachedImage ? (
                <TouchableOpacity 
                  style={[styles.sendBtn, (!contextSelected) && { opacity: 0.5 }]} 
                  onPress={handleSend}
                  disabled={!contextSelected || sending}
                >
                  {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Send size={20} color="#FFF" />}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[styles.sendBtn, { backgroundColor: '#5B43EE' }, (!contextSelected) && { opacity: 0.5 }]} 
                  onPress={startRecording}
                  disabled={!contextSelected || sending}
                >
                  <Mic size={20} color="#FFF" />
                </TouchableOpacity>
              )}
            </View>`;

content = content.replace(oldInputArea, newInputArea);
// Note: wait, in the oldInputArea, it replaced `<View style={styles.inputContainer}>` with the wrapper. I should fix the closing tag if needed, but the original block ended with `}` and the parent was just `{/* Input */}`. Let's see if the closing tags match.

fs.writeFileSync(path, content);
console.log('Patched');
