const fs = require('fs');
const file = 'src/screens/CustomerChatScreen.js';
let content = fs.readFileSync(file, 'utf8');

// We need to inject the token into the Linking.openURL call
// Find: onPress={() => Linking.openURL(getFullImageUrl(item.attachment_url)).catch(err => console.error("Couldn't load page", err))}
// We need to make a wrapper function that appends token.

const newFunc = `  const handleOpenAttachment = async (url) => {
    try {
      let finalUrl = getFullImageUrl(url);
      if (finalUrl.includes('.pdf') || finalUrl.includes('download')) {
        let token = await AsyncStorage.getItem('userToken');
        if (token) {
          token = token.replace('Bearer ', '');
          finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(token);
        }
      }
      await Linking.openURL(finalUrl);
    } catch (err) {
      console.error("Couldn't load page", err);
    }
  };`;

if (!content.includes('handleOpenAttachment')) {
  content = content.replace('const getFullImageUrl = (url) => {', newFunc + '\n\n  const getFullImageUrl = (url) => {');
  content = content.replace(
    `onPress={() => Linking.openURL(getFullImageUrl(item.attachment_url)).catch(err => console.error("Couldn't load page", err))}`,
    `onPress={() => handleOpenAttachment(item.attachment_url)}`
  );
  fs.writeFileSync(file, content);
  console.log('Patched chat screen');
} else {
  console.log('Already patched');
}
