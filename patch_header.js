const fs = require('fs');
const path = 'src/screens/CustomerChatScreen.js';
let content = fs.readFileSync(path, 'utf8');

// Add ShoppingBag import
if (!content.includes('ShoppingBag')) {
  content = content.replace(
    /import \{ ChevronLeft, Send, Store \} from 'lucide-react-native';/,
    `import { ChevronLeft, Send, Store, ShoppingBag } from 'lucide-react-native';`
  );
}

// Replace header
const oldHeaderRegex = /<View style=\{styles\.header\}>[\s\S]*?<\/View>/;

const newHeader = `<View style={[styles.header, { backgroundColor: '#5B43EE', borderBottomWidth: 0, paddingVertical: 12, paddingHorizontal: 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12, paddingVertical: 8, paddingRight: 8 }}>
          <ChevronLeft size={24} color="#FFF" />
        </TouchableOpacity>
        
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
          <ShoppingBag size={20} color="#FFF" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontFamily: 'Inter-Bold', color: '#FFF', marginBottom: 2 }}>
            {orderNumber ? orderNumber : 'Boutique Chat'}
          </Text>
          <Text style={{ fontSize: 13, fontFamily: 'Inter-Medium', color: 'rgba(255,255,255,0.8)' }} numberOfLines={1}>
            {boutiqueName}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setFeedbackModalVisible(true)} style={{ padding: 8, marginRight: 8 }}>
            <Star size={20} color="#F59E0B" fill="#F59E0B" />
          </TouchableOpacity>
          {passedOrderId && (
            <TouchableOpacity 
              onPress={() => navigation.navigate('CustomerOrderDetail', { orderId: passedOrderId })}
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 }}
            >
              <Text style={{ color: '#FFF', fontSize: 13, fontFamily: 'Inter-SemiBold' }}>View Order</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>`;

content = content.replace(oldHeaderRegex, newHeader);

fs.writeFileSync(path, content);
console.log('Header patched!');
