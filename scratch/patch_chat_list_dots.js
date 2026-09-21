const fs = require('fs');
const path = 'src/screens/CustomerChatListScreen.js';
let content = fs.readFileSync(path, 'utf8');

// Add state for Modal
content = content.replace(
  /const \[refreshing, setRefreshing\] = useState\(false\);/,
  "const [refreshing, setRefreshing] = useState(false);\n  const [menuVisible, setMenuVisible] = useState(false);\n  const [selectedThread, setSelectedThread] = useState(null);"
);

// Update 3 dots onPress
content = content.replace(
  /<TouchableOpacity style=\{\{marginLeft: 8, paddingHorizontal: 4\}\}>/,
  "<TouchableOpacity style={{marginLeft: 8, paddingHorizontal: 4}} onPress={() => { setSelectedThread(item); setMenuVisible(true); }}>"
);

// Add Modal component before the final closing View
const modalComponent = `
      {/* Three Dots Menu Modal */}
      <Modal visible={menuVisible} transparent={true} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 }}>
            <View style={{ width: 40, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{fontSize: 18, fontFamily: 'Inter-Bold', color: '#0F172A', marginBottom: 20}}>
              {selectedThread ? selectedThread.boutique_name : 'Options'}
            </Text>
            
            {selectedThread && selectedThread.order_id && (
              <TouchableOpacity 
                style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9'}} 
                onPress={() => { 
                  setMenuVisible(false); 
                  navigation.navigate('OrderDetails', { orderId: selectedThread.order_id });
                }}
              >
                <Ionicons name="receipt-outline" size={20} color="#475569" style={{ marginRight: 16 }} />
                <Text style={{fontSize: 16, fontFamily: 'Inter-Medium', color: '#0F172A'}}>View Order Details</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 16}} 
              onPress={() => { 
                setMenuVisible(false); 
                dispatch(markAsRead(String(selectedThread?.boutique_id)));
              }}
            >
              <Ionicons name="checkmark-done-outline" size={20} color="#475569" style={{ marginRight: 16 }} />
              <Text style={{fontSize: 16, fontFamily: 'Inter-Medium', color: '#0F172A'}}>Mark as Read</Text>
            </TouchableOpacity>

          </View>
        </TouchableOpacity>
      </Modal>
    </View>
`;

content = content.replace(/<\/View>\s*$/m, modalComponent);

fs.writeFileSync(path, content);
console.log('Patched chat list dots!');
