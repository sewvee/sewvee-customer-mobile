const fs = require('fs');
const path = '../Sewvee-Business-Mobile/src/screens/MessagesListScreen.js';
let content = fs.readFileSync(path, 'utf8');

const searchStr = '<TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOptionsThread(null)}>';
const replaceStr = `<View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setOptionsThread(null)} />`;

content = content.replace(searchStr, replaceStr);

const closingSearchStr = `</View>
        </TouchableOpacity>
      </Modal>`;
const closingReplaceStr = `</View>
        </View>
      </Modal>`;

content = content.replace(closingSearchStr, closingReplaceStr);

fs.writeFileSync(path, content);
console.log("Patched successfully");
