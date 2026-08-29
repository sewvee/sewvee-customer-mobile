const fs = require('fs');
const path = './src/screens/CustomerChatListScreen.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix array parsing for threadsRes
content = content.replace(
  /let activeThreads = \[\];\s*if \(threadsRes\?\.data\?\.success !== false\) \{\s*activeThreads = Array\.isArray\(threadsRes\?\.data\?\.data\) \? threadsRes\.data\.data : \[\];\s*\}/,
  `let activeThreads = [];
      if (threadsRes?.data) {
        activeThreads = Array.isArray(threadsRes.data) ? threadsRes.data : (Array.isArray(threadsRes.data.data) ? threadsRes.data.data : []);
      }`
);

// 2. Remove the boutique_id grouping logic
content = content.replace(
  /const threadMap = new Map\(\);\s*activeThreads\.forEach\(t => threadMap\.set\(t\.boutique_id, t\)\);\s*allBoutiques\.forEach[\s\S]*?setThreads\(Array\.from\(threadMap\.values\(\)\)\);/,
  `// Instead of grouping by boutique, we show all active threads (orders) directly.
      // And we append any boutique that has NO active thread so the user can start a new order/chat.
      const activeBoutiqueIds = new Set(activeThreads.map(t => t.boutique_id));
      
      const newBoutiqueThreads = allBoutiques
        .filter(b => !activeBoutiqueIds.has(b.id))
        .map(b => ({
          boutique_id: b.id,
          boutique_name: b.boutique_name || b.name,
          profile_icon_url: b.profile_icon_url || null,
          latest_message_text: 'Tap to start a conversation',
          latest_message_timestamp: null,
          order_id: null,
          order_number: ''
        }));
        
      setThreads([...activeThreads, ...newBoutiqueThreads]);`
);

// 3. Update renderItem to use order_number and navigate with orderId
content = content.replace(
  /const renderItem = \(\{ item \}\) => \([\s\S]*?navigation\.navigate\('CustomerChat', \{ boutiqueId: item\.boutique_id, boutiqueName: item\.boutique_name \}\)[\s\S]*?<\/View>\s*<\/TouchableOpacity>\s*\);/,
  `const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.chatItem}
      onPress={() => navigation.navigate('CustomerChat', { 
        boutiqueId: item.boutique_id, 
        boutiqueName: item.boutique_name,
        orderId: item.order_id,
        orderNumber: item.order_number
      })}
    >
      <View style={styles.avatar}>
        {item.profile_icon_url ? (
          <Image source={{ uri: item.profile_icon_url }} style={styles.avatarImg} />
        ) : (
          <Store size={24} color="#6366F1" />
        )}
      </View>
      <View style={styles.chatInfo}>
        <View style={styles.chatHeaderRow}>
          <Text style={styles.boutiqueName} numberOfLines={1}>
            {item.boutique_name} {item.order_number ? \`#\${item.order_number}\` : ''}
          </Text>
          <Text style={styles.timeText}>{formatTime(item.latest_message_timestamp)}</Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.latest_message_text || (item.latest_message_attachment ? '📷 Image' : 'Started a conversation')}
        </Text>
      </View>
    </TouchableOpacity>
  );`
);

fs.writeFileSync(path, content);
console.log('CustomerChatListScreen patched.');
