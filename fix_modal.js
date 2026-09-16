const fs = require('fs');
const path = '../Sewvee-Business-Mobile/src/screens/MessagesListScreen.js';
let content = fs.readFileSync(path, 'utf8');

// Import Pressable
if (!content.includes('Pressable')) {
    content = content.replace("ScrollView } from 'react-native';", "ScrollView, Pressable } from 'react-native';");
}

// Replace the buggy modal section
const searchStr = `<View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setOptionsThread(null)} />
          <View style={styles.actionSheetContainer}>`;

const replaceStr = `<Pressable style={styles.modalOverlay} onPress={() => setOptionsThread(null)}>
          <Pressable onPress={() => {}} style={{ width: '100%' }}>
            <View style={styles.actionSheetContainer}>`;

content = content.replace(searchStr, replaceStr);

const closingSearchStr = `</View>
        </View>
      </Modal>`;

const closingReplaceStr = `</View>
          </Pressable>
        </Pressable>
      </Modal>`;

content = content.replace(closingSearchStr, closingReplaceStr);

fs.writeFileSync(path, content);
console.log("Fixed modal using Pressable");
