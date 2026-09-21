const fs = require('fs');
const path = 'src/screens/CustomerChatScreen.js';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('TouchableWithoutFeedback')) {
    content = content.replace("import { Modal,", "import { TouchableWithoutFeedback, Modal,");
}

// Fix Attach Menu Modal
const attachMenuSearch = `<View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} onPress={() => setShowAttachMenu(false)} />
          <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, zIndex: 10, elevation: 10 }}>`;
const attachMenuReplace = `<TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setShowAttachMenu(false)}>
          <TouchableWithoutFeedback>
            <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 }}>`;
content = content.replace(attachMenuSearch, attachMenuReplace);

const attachMenuClosingSearch = `          </View>
        </View>
      </Modal>

      {/* Message Options Modal */}`;
const attachMenuClosingReplace = `            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Message Options Modal */}`;
content = content.replace(attachMenuClosingSearch, attachMenuClosingReplace);


// Fix Message Options Modal
const msgOptionsSearch = `<View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} onPress={() => setMessageOptionsVisible(false)} />
          <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, zIndex: 10, elevation: 10 }}>`;
const msgOptionsReplace = `<TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setMessageOptionsVisible(false)}>
          <TouchableWithoutFeedback>
            <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 }}>`;
content = content.replace(msgOptionsSearch, msgOptionsReplace);

const msgOptionsClosingSearch = `          </View>
        </View>
      </Modal>
    </View>
  );`;
const msgOptionsClosingReplace = `            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    </View>
  );`;
content = content.replace(msgOptionsClosingSearch, msgOptionsClosingReplace);

fs.writeFileSync(path, content);
console.log("Applied TouchableWithoutFeedback to Modals");
