const fs = require('fs');

let content = fs.readFileSync('src/screens/CustomerDashboardScreen.js', 'utf8');

// 1. Add states for boutique selection
content = content.replace(
  /const \[loadingShop, setLoadingShop\] = useState\(true\);/,
  "const [loadingShop, setLoadingShop] = useState(true);\n  const [isBoutiqueModalVisible, setIsBoutiqueModalVisible] = useState(false);\n  const [selectedBoutique, setSelectedBoutique] = useState(null);"
);

// 2. Compute available boutiques
content = content.replace(
  /const fetchInitialShopItems = async \(\) => \{/,
  `const availableBoutiques = React.useMemo(() => {
    const boutiques = [];
    const ids = new Set();
    if (orders) {
      orders.forEach(o => {
        const bId = o.boutiqueId || o.company_id;
        if (bId && !ids.has(bId)) {
          ids.add(bId);
          boutiques.push({ id: bId, name: o.boutiqueName || 'Unknown Boutique' });
        }
      });
    }
    return boutiques;
  }, [orders]);

  useEffect(() => {
    if (availableBoutiques.length > 0 && !selectedBoutique) {
      setSelectedBoutique(availableBoutiques[0]);
      fetchShopItems(availableBoutiques[0].id);
    }
  }, [availableBoutiques]);

  const fetchInitialShopItems = async () => {`
);

// We need to stop fetchInitialShopItems from fetching if selectedBoutique is used instead, but let's just make it gracefully fall back.
// Actually, `fetchInitialShopItems` uses `orders[0]`. It's fine to leave it, it's called on mount.

// 3. Update the boutique selector text
content = content.replace(
  /const selectedBoutiqueName = React\.useMemo[\s\S]*?\}, \[orders\]\);/,
  "const selectedBoutiqueName = selectedBoutique ? selectedBoutique.name : 'All Boutiques';"
);

// 4. Update the TouchOpacity to open modal
content = content.replace(
  /<TouchableOpacity style=\{\[styles\.boutiqueSelector, \{flexDirection: 'row', alignItems: 'center', backgroundColor: '\#F8FAFC', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: '\#E2E8F0', flex: 1, marginRight: 16\}\]\}>/,
  "<TouchableOpacity onPress={() => setIsBoutiqueModalVisible(true)} style={[styles.boutiqueSelector, {flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', flex: 1, marginRight: 16}]}>"
);

// 5. Add the modal UI before the final return
const modalUI = `
      {/* BOUTIQUE SELECTION MODAL */}
      <Modal visible={isBoutiqueModalVisible} transparent={true} animationType="fade">
        <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'}}>
          <View style={{backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: Dimensions.get('window').height * 0.7}}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <Text style={{fontSize: 18, fontFamily: 'Inter-Bold', color: '#0F172A'}}>Select Boutique</Text>
              <TouchableOpacity onPress={() => setIsBoutiqueModalVisible(false)} style={{padding: 4}}>
                <Text style={{fontSize: 16, fontFamily: 'Inter-Bold', color: '#64748B'}}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {availableBoutiques.length > 0 ? availableBoutiques.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={{padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}
                  onPress={() => {
                    setSelectedBoutique(b);
                    fetchShopItems(b.id);
                    setIsBoutiqueModalVisible(false);
                  }}
                >
                  <Text style={{fontSize: 16, fontFamily: selectedBoutique?.id === b.id ? 'Inter-Bold' : 'Inter-Medium', color: selectedBoutique?.id === b.id ? '#4F46E5' : '#1E293B'}}>
                    {b.name}
                  </Text>
                  {selectedBoutique?.id === b.id && <Ionicons name="checkmark-circle" size={24} color="#4F46E5" />}
                </TouchableOpacity>
              )) : (
                <Text style={{textAlign: 'center', color: '#64748B', fontFamily: 'Inter-Medium', padding: 20}}>No boutiques available</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
`;

content = content.replace(
  /<\/SafeAreaView>/,
  modalUI + "\n    </SafeAreaView>"
);

// 6. Filter orders by selected boutique
content = content.replace(
  /const customerOrders = orders \|\| \[\];/,
  "const customerOrders = (orders || []).filter(o => !selectedBoutique || (o.boutiqueId || o.company_id) === selectedBoutique.id);"
);

fs.writeFileSync('src/screens/CustomerDashboardScreen.js', content);
console.log('Added boutique selector modal');
