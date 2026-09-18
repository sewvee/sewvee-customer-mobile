const fs = require('fs');

let content = fs.readFileSync('src/screens/CustomerChatScreen.js', 'utf8');

// 1. Add listeners to useEffect
const effectAnchor = `  // On mount: clear the unread badge and record last-visited time for this boutique
  useEffect(() => {
    dispatch(resetChatUnread());`;

const effectPatch = `  // On mount: clear the unread badge and record last-visited time for this boutique
  useEffect(() => {
    if (Platform.OS === 'android') {
      const showSub = Keyboard.addListener('keyboardDidShow', (e) => setAndroidKeyboardHeight(e.endCoordinates.height));
      const hideSub = Keyboard.addListener('keyboardDidHide', () => setAndroidKeyboardHeight(0));
      return () => {
        showSub.remove();
        hideSub.remove();
      };
    }
  }, []);

  useEffect(() => {
    dispatch(resetChatUnread());`;

if (content.includes(effectAnchor)) {
    content = content.replace(effectAnchor, effectPatch);
}

// 2. Add padding to the end of KeyboardView
const viewAnchor = `          </TouchableOpacity>
        </View>
      </KeyboardView>`;

const viewPatch = `          </TouchableOpacity>
        </View>
        {Platform.OS === 'android' && <View style={{ height: androidKeyboardHeight }} />}
      </KeyboardView>`;

if (content.includes(viewAnchor)) {
    content = content.replace(viewAnchor, viewPatch);
}

fs.writeFileSync('src/screens/CustomerChatScreen.js', content);
console.log('Fixed keyboard in CustomerChatScreen');
