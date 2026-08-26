const fs = require('fs');
let code = fs.readFileSync('src/components/CustomerRequestsTab.js', 'utf8');

// 1. Add KeyboardAvoidingView & Modal to imports
code = code.replace(
  "import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Image } from 'react-native';",
  "import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Image, KeyboardAvoidingView, Platform, Modal } from 'react-native';"
);

// 2. Add state
code = code.replace(
  "const [sending, setSending] = useState(false);",
  "const [sending, setSending] = useState(false);\n  const [fullScreenImage, setFullScreenImage] = useState(null);"
);

// 3. Add placeholderTextColor
code = code.replace(
  'placeholder="Type a message..."',
  'placeholder="Type a message..."\n          placeholderTextColor="#94A3B8"'
);

// 4. Wrap second return in KeyboardAvoidingView
code = code.replace(
  "  return (\n    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>",
  "  return (\n    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F8FAFC' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>"
);

// 5. Wrap the Image in chat bubble
code = code.replace(
  "                      {req.attachment_url ? (\n                        <Image source={{ uri: req.attachment_url }} style={{ width: 200, height: 200, borderRadius: 8, marginBottom: req.message ? 8 : 0 }} />\n                      ) : null}",
  `                      {req.attachment_url ? (
                        <TouchableOpacity activeOpacity={0.8} onPress={() => setFullScreenImage(req.attachment_url)}>
                          <Image source={{ uri: req.attachment_url }} style={{ width: 200, height: 200, borderRadius: 8, marginBottom: req.message ? 8 : 0 }} />
                        </TouchableOpacity>
                      ) : null}`
);

// 6. Add Modal and close KeyboardAvoidingView at the end of the second return
const modalAndClosing = `
      <Modal visible={!!fullScreenImage} transparent animationType="fade" onRequestClose={() => setFullScreenImage(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 10 }} onPress={() => setFullScreenImage(null)}>
            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>Close</Text>
          </TouchableOpacity>
          {fullScreenImage && <Image source={{ uri: fullScreenImage }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />}
        </View>
      </Modal>
    </KeyboardAvoidingView>
`;
// Find the exact closing </View> for the second return block.
// We can just find the end of the file and replace the last </View>\n    );\n  }
code = code.replace(
  /      <\/View>\n    \);\n  \}\n\n  const outfitRequests/g,
  "      </View>\n    );\n  }\n\n  const outfitRequests"
);

// The second return block ends with:
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// }
// Wait, let's see how it ends!
code = code.replace(
  "      </View>\n    </View>\n  );\n}",
  `      </View>
      <Modal visible={!!fullScreenImage} transparent animationType="fade" onRequestClose={() => setFullScreenImage(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 10 }} onPress={() => setFullScreenImage(null)}>
            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>Close</Text>
          </TouchableOpacity>
          {fullScreenImage && <Image source={{ uri: fullScreenImage }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}`
);

fs.writeFileSync('src/components/CustomerRequestsTab.js', code);
