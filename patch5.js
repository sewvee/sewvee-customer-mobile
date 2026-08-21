const fs = require('fs');
const path = '/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Customer-Mobile/src/screens/CustomerOrderDetailScreen.js';
let code = fs.readFileSync(path, 'utf8');

const targetUI = `<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                          {pendingPhotos[outfit.id].map((url, idx) => (
                            <View key={idx} style={{ marginRight: 10, position: 'relative' }}>
                              <Image source={{ uri: url }} style={{ width: 60, height: 60, borderRadius: 8, backgroundColor: '#FFEDD5' }} />
                              
                              {/* Edit Button */}
                              <TouchableOpacity
                                style={{ position: 'absolute', top: -6, right: 18, backgroundColor: '#6366F1', borderRadius: 10, width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fff' }}
                                onPress={() => {
                                  setEditingPhoto({ file_url: url, outfitId: outfit.id, isPending: true, pendingIndex: idx });
                                  setEditDrawerVisible(true);
                                }}
                              >
                                <Edit2 size={10} color="#fff" />
                              </TouchableOpacity>

                              {/* Delete Button */}
                              <TouchableOpacity
                                style={{ position: 'absolute', top: -6, right: -6, backgroundColor: '#EF4444', borderRadius: 10, width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fff' }}
                                onPress={() => removePendingPhoto(outfit.id, idx)}
                              >
                                <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>X</Text>
                              </TouchableOpacity>
                            </View>
                          ))}
                        </ScrollView>`;

const newUI = `<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8, paddingRight: 8 }}>
                          {pendingPhotos[outfit.id].map((url, idx) => (
                            <View key={idx} style={{ width: 72, height: 72, marginRight: 16 }}>
                              <Image source={{ uri: url }} style={{ width: '100%', height: '100%', borderRadius: 8, backgroundColor: '#FFEDD5' }} resizeMode="cover" />
                              
                              {/* Edit Button */}
                              <TouchableOpacity
                                style={{ position: 'absolute', top: -8, right: 24, backgroundColor: '#6366F1', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: {width: 0, height: 1} }}
                                onPress={() => {
                                  setEditingPhoto({ file_url: url, outfitId: outfit.id, isPending: true, pendingIndex: idx });
                                  setEditDrawerVisible(true);
                                }}
                              >
                                <Edit2 size={12} color="#fff" />
                              </TouchableOpacity>

                              {/* Delete Button */}
                              <TouchableOpacity
                                style={{ position: 'absolute', top: -8, right: -8, backgroundColor: '#EF4444', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: {width: 0, height: 1} }}
                                onPress={() => removePendingPhoto(outfit.id, idx)}
                              >
                                <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>X</Text>
                              </TouchableOpacity>
                            </View>
                          ))}
                        </ScrollView>`;

if (code.includes('style={{ flexDirection: \'row\' }}')) {
  code = code.replace(targetUI, newUI);
  fs.writeFileSync(path, code);
  console.log("CustomerOrderDetailScreen.js UI patched!");
} else {
  console.log("Could not find the target UI block.");
}
