const fs = require('fs');
const file = 'src/screens/CustomerShopScreen.js';
let content = fs.readFileSync(file, 'utf8');

const target = /<Text style=\{\{ fontSize: 13, color: Colors\.textSecondary, fontFamily: 'Inter-Bold'.*?<\/ScrollView>/s;

const replacement = `{/* Redesigned Boutique List */}
              <TouchableOpacity
                style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                onPress={() => {
                  setSelectedBoutique(SEWVEE_DIRECT);
                  setIsBoutiqueModalVisible(false);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: selectedBoutique?.id === 'sewvee_direct' ? '#EEF2FF' : '#F8FAFC', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Sparkles size={18} color={selectedBoutique?.id === 'sewvee_direct' ? '#4F46E5' : '#64748B'} />
                  </View>
                  <Text style={{ fontSize: 16, fontFamily: selectedBoutique?.id === 'sewvee_direct' ? 'Inter-Bold' : 'Inter-Medium', color: selectedBoutique?.id === 'sewvee_direct' ? '#4F46E5' : '#1E293B' }}>
                    Sewvee Originals
                  </Text>
                </View>
                {selectedBoutique?.id === 'sewvee_direct' && <Check size={20} color="#4F46E5" />}
              </TouchableOpacity>

              {boutiques.map(b => (
                <TouchableOpacity
                  key={b.id}
                  style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                  onPress={() => {
                    setSelectedBoutique(b);
                    setIsBoutiqueModalVisible(false);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: selectedBoutique?.id === b.id ? '#EEF2FF' : '#F8FAFC', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Store size={18} color={selectedBoutique?.id === b.id ? '#4F46E5' : '#64748B'} />
                    </View>
                    <Text style={{ fontSize: 16, fontFamily: selectedBoutique?.id === b.id ? 'Inter-Bold' : 'Inter-Medium', color: selectedBoutique?.id === b.id ? '#4F46E5' : '#1E293B' }}>
                      {b.name}
                    </Text>
                  </View>
                  {selectedBoutique?.id === b.id && <Check size={20} color="#4F46E5" />}
                </TouchableOpacity>
              ))}
            </ScrollView>`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Shop modal redesigned');
