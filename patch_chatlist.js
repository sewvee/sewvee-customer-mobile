const fs = require('fs');
const path = 'src/screens/CustomerChatListScreen.js';
let content = fs.readFileSync(path, 'utf8');

// Add states
content = content.replace(
  `  const [threads, setThreads] = useState([]);`,
  `  const [threads, setThreads] = useState([]);
  const [boutiques, setBoutiques] = useState([]);
  const [isBoutiqueModalVisible, setIsBoutiqueModalVisible] = useState(false);`
);

// Remove fake threads and set boutiques
const oldThreadLogic = `      const newBoutiqueThreads = allBoutiques
        .filter(b => !activeBoutiqueIds.has(b.id))
        .map(b => ({
          boutique_id: b.id,
          boutique_name: b.boutique_name || b.name,
          profile_icon_url: b.profile_icon_url || null,
          latest_message_text: 'Started a conversation',
          latest_message_timestamp: null,
          order_id: null,
          order_number: ''
        }));
        
      const allThreads = [...activeThreads, ...newBoutiqueThreads];
      setThreads(allThreads);`;

const newThreadLogic = `      setThreads(activeThreads);
      setBoutiques(allBoutiques);`;

content = content.replace(oldThreadLogic, newThreadLogic);

// Add empty state and FAB onPress
const oldFlatList = `        <View style={{ flex: 1 }}>
          <FlatList
            data={threads}
            keyExtractor={(item, index) => \`\${item.boutique_id}_\${item.order_id}_\${index}\`}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 24 }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
          <TouchableOpacity style={styles.fab}>`;

const newFlatList = `        <View style={{ flex: 1 }}>
          {threads.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                <MessageSquarePlus color="#94A3B8" size={32} />
              </View>
              <Text style={{ fontSize: 18, fontFamily: 'Inter-Bold', color: '#1E293B', marginBottom: 8 }}>No Messages Yet</Text>
              <Text style={{ fontSize: 14, fontFamily: 'Inter-Medium', color: '#64748B', textAlign: 'center', marginBottom: 24 }}>
                Start a conversation with your favorite boutiques.
              </Text>
              <TouchableOpacity 
                style={{ backgroundColor: '#5B43EE', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, flexDirection: 'row', alignItems: 'center' }}
                onPress={() => setIsBoutiqueModalVisible(true)}
              >
                <MessageSquarePlus color="#fff" size={18} style={{ marginRight: 8 }} />
                <Text style={{ color: '#fff', fontFamily: 'Inter-Bold', fontSize: 14 }}>Start Conversation</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={threads}
              keyExtractor={(item, index) => \`\${item.boutique_id}_\${item.order_id}_\${index}\`}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 24 }}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
          
          <TouchableOpacity style={styles.fab} onPress={() => setIsBoutiqueModalVisible(true)}>`;

content = content.replace(oldFlatList, newFlatList);

// Add Modal
const oldReturn = `    </SafeAreaView>
  );
};`;

const newReturn = `      <Modal visible={isBoutiqueModalVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontFamily: 'Inter-Bold', color: '#0F172A' }}>Select a Boutique</Text>
              <TouchableOpacity onPress={() => setIsBoutiqueModalVisible(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 24, color: '#64748B', fontFamily: 'Inter-Medium' }}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {boutiques.map(b => (
                <TouchableOpacity
                  key={b.id}
                  style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => {
                    setIsBoutiqueModalVisible(false);
                    navigation.navigate('CustomerChat', {
                      boutiqueId: b.id,
                      boutiqueName: b.boutique_name || b.name,
                      boutiqueLogo: b.boutique_logo || b.logo_url
                    });
                  }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Text style={{ fontSize: 16, fontFamily: 'Inter-Bold', color: '#5B43EE' }}>{(b.boutique_name || b.name || 'B').charAt(0)}</Text>
                  </View>
                  <Text style={{ fontSize: 16, fontFamily: 'Inter-Medium', color: '#1E293B' }}>{b.boutique_name || b.name}</Text>
                </TouchableOpacity>
              ))}
              {boutiques.length === 0 && (
                <Text style={{ fontSize: 14, fontFamily: 'Inter-Medium', color: '#64748B', textAlign: 'center', marginTop: 24 }}>No boutiques found.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};`;

content = content.replace(oldReturn, newReturn);
fs.writeFileSync(path, content);
console.log('Patched CustomerChatListScreen.js');
