const fs = require('fs');
const path = 'src/screens/CustomerChatScreen.js';
let content = fs.readFileSync(path, 'utf8');

const regex = /const handleSend = async \(\) => \{[\s\S]*?\} finally \{\s*setSending\(false\);\s*\}\s*\};/;

const newHandleSend = `const handleSend = async () => {
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
      
      try {
        const existing = await AsyncStorage.getItem('chat_last_visited');
        const map = existing ? JSON.parse(existing) : {};
        map[String(boutiqueId)] = new Date().toISOString();
        await AsyncStorage.setItem('chat_last_visited', JSON.stringify(map));
      } catch (e) {}
    } catch (err) {
      console.warn('Failed to send message', err);
    } finally {
      setSending(false);
    }
  };`;

content = content.replace(regex, newHandleSend);
fs.writeFileSync(path, content);
console.log('Patched handleSend');
