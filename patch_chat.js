const fs = require('fs');
let code = fs.readFileSync('src/components/CustomerRequestsTab.js', 'utf8');

// Add state
const stateTarget = "const [fullScreenImage, setFullScreenImage] = useState(null);";
code = code.replace(stateTarget, stateTarget + "\n  const [selectedMessage, setSelectedMessage] = useState(null);");

// Replace chat bubble rendering block
const oldBubbleStart = "return (\n              <View key={req.id} style={[styles.messageRow, isCustomer ? styles.msgRight : styles.msgLeft]}>";
const oldBubbleEnd = `                    <Text style={{ fontSize: 10, color: isCustomer ? 'rgba(255,255,255,0.7)' : '#94A3B8' }}>
                      {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              </View>
            );`;

const newBubble = `return (
              <View key={req.id} style={[styles.messageRow, isCustomer ? styles.msgRight : styles.msgLeft]}>
                
                {/* 3 DOTS FOR CUSTOMER (MOVED OUTSIDE) */}
                {isCustomer && (
                  <TouchableOpacity 
                    style={{ justifyContent: 'center', marginRight: 8, padding: 4 }}
                    onPress={() => setSelectedMessage(req)}
                  >
                    <MoreVertical size={16} color="#94A3B8" />
                  </TouchableOpacity>
                )}

                <View style={[styles.bubble, isCustomer ? styles.bubbleCustomer : styles.bubbleBoutique]}>
                  {req.attachment_url ? (
                    <View>
                      <TouchableOpacity onPress={() => setFullScreenImage(req.attachment_url)}>
                        <Image source={{ uri: normalizeImageUrl(req.attachment_url) }} style={{ width: 200, height: 200, borderRadius: 8, marginBottom: req.message ? 8 : 0 }} />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                  {req.message ? (
                    <Text style={{ fontSize: 14, color: isCustomer ? '#FFF' : '#1E293B' }}>{req.message}</Text>
                  ) : null}
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 }}>
                    {(req.is_edited || req.isEdited) && (
                      <Text style={{ fontSize: 9, fontStyle: 'italic', color: isCustomer ? 'rgba(255,255,255,0.6)' : '#94A3B8', marginRight: 4 }}>
                        (edited)
                      </Text>
                    )}
                    <Text style={{ fontSize: 10, color: isCustomer ? 'rgba(255,255,255,0.7)' : '#94A3B8' }}>
                      {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              </View>
            );`;

const bubbleRegex = /return \(\s*<View key=\{req\.id\} style=\{\[styles\.messageRow, isCustomer \? styles\.msgRight : styles\.msgLeft\]\}>[\s\S]*?\{new Date\(req\.created_at\)\.toLocaleTimeString\(\[\], \{ hour: '2-digit', minute: '2-digit' \}\)\}\s*<\/Text>\s*<\/View>\s*<\/View>\s*<\/View>\s*\);\s*/m;
code = code.replace(bubbleRegex, newBubble + '\n');


const customModal = `
      {/* Custom BottomSheet Modal for Message Options */}
      <Modal visible={!!selectedMessage} transparent animationType="slide" onRequestClose={() => setSelectedMessage(null)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setSelectedMessage(null)}>
          <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 }} onStartShouldSetResponder={() => true}>
            <Text style={{ fontSize: 16, fontFamily: 'Inter-Bold', color: '#1E293B', marginBottom: 16, textAlign: 'center' }}>Message Options</Text>
            
            {selectedMessage && !selectedMessage.attachment_url && (
              <TouchableOpacity 
                style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}
                onPress={() => {
                  setEditingId(selectedMessage.id);
                  setMessage(selectedMessage.message || '');
                  setSelectedMessage(null);
                }}
              >
                <Text style={{ fontSize: 15, fontFamily: 'Inter-Medium', color: '#1E293B', textAlign: 'center' }}>Edit Message</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}
              onPress={() => {
                handleDelete(selectedMessage.id);
                setSelectedMessage(null);
              }}
            >
              <Text style={{ fontSize: 15, fontFamily: 'Inter-Bold', color: '#EF4444', textAlign: 'center' }}>Delete Message</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{ paddingVertical: 16, marginTop: 8, backgroundColor: '#F1F5F9', borderRadius: 12 }}
              onPress={() => setSelectedMessage(null)}
            >
              <Text style={{ fontSize: 15, fontFamily: 'Inter-Bold', color: '#64748B', textAlign: 'center' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!fullScreenImage} transparent animationType="fade" onRequestClose={() => setFullScreenImage(null)}>`;

code = code.replace("<Modal visible={!!fullScreenImage} transparent animationType=\"fade\" onRequestClose={() => setFullScreenImage(null)}>", customModal);

fs.writeFileSync('src/components/CustomerRequestsTab.js', code);
