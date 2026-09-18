const fs = require('fs');
const path = 'src/screens/CustomerChatScreen.js';
let content = fs.readFileSync(path, 'utf8');

const oldInputArea = `            <>
              <TouchableOpacity 
                style={{ padding: 8, marginRight: 4 }} 
                onPress={handleAttachment}
                disabled={!contextSelected || sending}
              >
                <Paperclip size={24} color={!contextSelected || sending ? "#CBD5E1" : "#94A3B8"} />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor="#94A3B8"
                value={inputText}
                onChangeText={setInputText}
                multiline
              />
              {inputText.trim() ? (
                <TouchableOpacity 
                  style={[styles.sendBtn, (!contextSelected) && { opacity: 0.5 }]} 
                  onPress={handleSend}
                  disabled={!contextSelected || sending}
                >
                  {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Send size={20} color="#FFF" />}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[styles.sendBtn, { backgroundColor: '#5B43EE' }, (!contextSelected) && { opacity: 0.5 }]} 
                  onPress={startRecording}
                  disabled={!contextSelected || sending}
                >
                  <Mic size={20} color="#FFF" />
                </TouchableOpacity>
              )}
            </>`;

const newInputArea = `            <View style={{ flex: 1, flexDirection: 'column' }}>
              {attachedImage && (
                <View style={{ flexDirection: 'row', marginBottom: 8, position: 'relative', alignSelf: 'flex-start', paddingLeft: 4 }}>
                  <Image source={{ uri: attachedImage }} style={{ width: 60, height: 60, borderRadius: 8, backgroundColor: '#E2E8F0' }} />
                  <TouchableOpacity 
                    style={{ position: 'absolute', top: -6, right: -6, backgroundColor: '#FFF', borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.2, shadowRadius: 2, padding: 2 }}
                    onPress={() => setAttachedImage(null)}
                  >
                    <X size={14} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity 
                  style={{ padding: 8, marginRight: 4 }} 
                  onPress={handleAttachment}
                  disabled={!contextSelected || sending}
                >
                  <Paperclip size={24} color={!contextSelected || sending ? "#CBD5E1" : "#94A3B8"} />
                </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  placeholder="Type a message..."
                  placeholderTextColor="#94A3B8"
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                />
                {inputText.trim() || attachedImage ? (
                  <TouchableOpacity 
                    style={[styles.sendBtn, (!contextSelected) && { opacity: 0.5 }]} 
                    onPress={handleSend}
                    disabled={!contextSelected || sending}
                  >
                    {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Send size={20} color="#FFF" />}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.sendBtn, { backgroundColor: '#5B43EE' }, (!contextSelected) && { opacity: 0.5 }]} 
                    onPress={startRecording}
                    disabled={!contextSelected || sending}
                  >
                    <Mic size={20} color="#FFF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>`;

content = content.replace(oldInputArea, newInputArea);
fs.writeFileSync(path, content);
console.log('Patched UI');
