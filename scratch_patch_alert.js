const fs = require('fs');
let content = fs.readFileSync('src/screens/CustomerChatScreen.js', 'utf8');

const anchor = `            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}
              onPress={() => {
                Alert.alert(
                  'Delete Message',
                  'Are you sure you want to delete this message?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => handleDeleteMessage(selectedMessage.id) }
                  ]
                );
              }}
            >`;

const patch = `            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}
              onPress={() => {
                setMessageOptionsVisible(false);
                setTimeout(() => setDeleteConfirmVisible(true), 300);
              }}
            >`;

content = content.replace(anchor, patch);
fs.writeFileSync('src/screens/CustomerChatScreen.js', content);
console.log('Replaced Alert with custom modal trigger');
