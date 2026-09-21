const fs = require('fs');
const path = 'src/components/CustomerRequestsTab.js';
let content = fs.readFileSync(path, 'utf8');

// Import Pressable
if (!content.includes('Pressable')) {
    content = content.replace("Modal } from 'react-native';", "Modal, Pressable } from 'react-native';");
}

// Replace the outer TouchableOpacity with Pressable
const searchStr = `<TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setSelectedMessage(null)}>
          <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 }} onStartShouldSetResponder={() => true}>`;

const replaceStr = `<Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} onPress={() => setSelectedMessage(null)}>
          <Pressable onPress={() => {}} style={{ width: '100%' }}>
            <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 }}>`;

content = content.replace(searchStr, replaceStr);

// Replace the closing tags
const closingSearchStr = `</View>
        </TouchableOpacity>
      </Modal>`;

const closingReplaceStr = `</View>
          </Pressable>
        </Pressable>
      </Modal>`;

content = content.replace(closingSearchStr, closingReplaceStr);

fs.writeFileSync(path, content);
console.log("Fixed modal using Pressable in Customer App");
