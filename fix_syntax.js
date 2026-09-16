const fs = require('fs');
const path = 'src/screens/CustomerChatScreen.js';
let content = fs.readFileSync(path, 'utf8');

// The first modal is showAttachMenu. Its opening tag is TouchableOpacity, but its closing tag got replaced with View.
// Let's change its opening tag to View (sibling architecture) to match the closing tag!
const attachMenuSearch = `<TouchableOpacity style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end'}} activeOpacity={1} onPress={() => setShowAttachMenu(false)}>
          <View style={{backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20}}>`;

const attachMenuReplace = `<View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} onPress={() => setShowAttachMenu(false)} />
          <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, zIndex: 10, elevation: 10 }}>`;

content = content.replace(attachMenuSearch, attachMenuReplace);

// The second modal is messageOptionsVisible. Its opening tag was already changed to View.
// But its closing tag is STILL TouchableOpacity! We need to change it to View!
const messageOptionsClosingSearch = `          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};`;

const messageOptionsClosingReplace = `          </View>
        </View>
      </Modal>
    </View>
  );
};`;

content = content.replace(messageOptionsClosingSearch, messageOptionsClosingReplace);

fs.writeFileSync(path, content);
console.log("Syntax fixed!");
