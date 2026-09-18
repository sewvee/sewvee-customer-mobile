const fs = require('fs');
const path = 'src/components/CustomerRequestsTab.js';
let content = fs.readFileSync(path, 'utf8');

const searchStr = `<Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} onPress={() => setSelectedMessage(null)}>
          <Pressable onPress={() => {}} style={{ width: '100%' }}>
            <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 }}>`;

const replaceStr = `<View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' }]} onPress={() => setSelectedMessage(null)} />
          <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, zIndex: 10, elevation: 10 }}>`;

content = content.replace(searchStr, replaceStr);

const closingSearchStr = `</View>
          </Pressable>
        </Pressable>
      </Modal>`;

const closingReplaceStr = `</View>
        </View>
      </Modal>`;

content = content.replace(closingSearchStr, closingReplaceStr);

fs.writeFileSync(path, content);
console.log("Fixed modal using sibling architecture");
