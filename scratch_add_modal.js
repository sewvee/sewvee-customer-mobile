const fs = require('fs');
let content = fs.readFileSync('src/screens/CustomerChatScreen.js', 'utf8');

const anchor = `      </Modal>
    </View>
  );`;

const patch = `      </Modal>

      {/* Custom Delete Confirmation Modal */}
      <Modal visible={deleteConfirmVisible} transparent animationType="fade" onRequestClose={() => setDeleteConfirmVisible(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={() => setDeleteConfirmVisible(false)}>
          <TouchableWithoutFeedback>
            <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 24, width: '85%', maxWidth: 340 }}>
              <Text style={{ fontSize: 18, fontFamily: 'Inter-Bold', color: '#0F172A', marginBottom: 12 }}>Delete Message</Text>
              <Text style={{ fontSize: 15, fontFamily: 'Inter-Regular', color: '#475569', marginBottom: 24, lineHeight: 22 }}>
                Are you sure you want to delete this message? This action cannot be undone.
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                <TouchableOpacity 
                  onPress={() => setDeleteConfirmVisible(false)}
                  style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, marginRight: 8 }}
                >
                  <Text style={{ fontSize: 15, fontFamily: 'Inter-SemiBold', color: '#64748B' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    setDeleteConfirmVisible(false);
                    if (selectedMessage) handleDeleteMessage(selectedMessage.id);
                  }}
                  style={{ backgroundColor: '#FEE2E2', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 }}
                >
                  <Text style={{ fontSize: 15, fontFamily: 'Inter-SemiBold', color: '#EF4444' }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    </View>
  );`;

content = content.replace(anchor, patch);
fs.writeFileSync('src/screens/CustomerChatScreen.js', content);
console.log('Added custom delete modal');
