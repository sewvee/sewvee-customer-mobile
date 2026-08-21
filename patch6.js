const fs = require('fs');
const path = '/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Customer-Mobile/src/screens/CustomerOrderDetailScreen.js';
let code = fs.readFileSync(path, 'utf8');

const targetButton = `{/* REQUEST OUTFIT CHANGES — inline per outfit */}
              {order.order_type !== 'SALE_ORDER' && (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, marginTop: 4, backgroundColor: '#F8FAFC' }}
                  onPress={() => setActiveTab('requests')}
                >
                  <MessageSquare size={18} color={Colors.primary} style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 14, fontFamily: 'Inter-Bold', color: Colors.primary }}>Request Outfit Changes</Text>
                </TouchableOpacity>
              )}`;

code = code.replace(targetButton, '');

fs.writeFileSync(path, code);
console.log("CustomerOrderDetailScreen.js request button removed!");
