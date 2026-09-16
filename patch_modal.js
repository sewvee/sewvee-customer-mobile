const fs = require('fs');
const file = 'src/screens/CustomerShopScreen.js';
let content = fs.readFileSync(file, 'utf8');

const target = `<View style={[styles.modalCard, { height: 'auto', maxHeight: '50%', marginTop: 'auto', marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Boutique</Text>
              <TouchableOpacity onPress={() => setIsBoutiqueModalVisible(false)} style={{ padding: 4 }}>
                <X size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }}>`;

const replacement = `<View style={[styles.modalCard, { height: 'auto', maxHeight: '70%', marginTop: 'auto', marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: 0, paddingBottom: Platform.OS === 'ios' ? 34 : 20 }]}>
            <View style={[styles.modalHeader, { paddingHorizontal: 20, paddingTop: 20 }]}>
              <Text style={styles.modalTitle}>Select Boutique</Text>
              <TouchableOpacity onPress={() => setIsBoutiqueModalVisible(false)} style={{ padding: 4 }}>
                <X size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>`;

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log('Modal patched');
