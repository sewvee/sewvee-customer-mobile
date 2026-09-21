const fs = require('fs');
const path = 'src/screens/NewStitchRequestScreen.js';
let content = fs.readFileSync(path, 'utf8');

const oldCode = `{isActive && opt === 'Use Previous Measurements' && (
                              <View style={styles.subInputBox}>
                                <Text style={styles.subInputText}>Tap to select an order...</Text>
                              </View>
                            )}`;

const newCode = `{isActive && opt === 'Use Previous Measurements' && (
                              <TextInput
                                style={[styles.subInputBox, { color: '#0F172A', fontFamily: 'Inter-Medium', fontSize: 14 }]}
                                placeholder="Enter previous order ID or details..."
                                placeholderTextColor="#94A3B8"
                                value={activeOutfit.previousOrderDetails || ''}
                                onChangeText={(val) => updateOutfit(activeOutfit.id, 'previousOrderDetails', val)}
                              />
                            )}`;

content = content.replace(oldCode, newCode);
fs.writeFileSync(path, content);
console.log('Patched previous order logic');
