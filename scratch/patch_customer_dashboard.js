const fs = require('fs');

let content = fs.readFileSync('src/screens/CustomerDashboardScreen.js', 'utf8');

// 1. Fix header icon: ShoppingBag -> Home
content = content.replace(
  /<ShoppingBag size=\{20\} color=\{Colors\.primary\} \/>/g,
  "<Ionicons name=\"home\" size={20} color={Colors.primary} />"
);

// 2. Fix Quick Actions text
content = content.replace(
  /<Text style=\{styles\.sectionTitle\}>Quick Actions \(Banners: \{banners\.length\}, Shop: \{shopItems\.length\}, Orders: \{orders\?\.length\}\)<\/Text>/,
  "<Text style={styles.sectionTitle}>Quick Actions</Text>"
);

// 3. Fix QuickActionCard calls to match web
// Subtitles and badges
// We need to modify QuickActionCard component first
const cardRegex = /const QuickActionCard = \(\{ title, icon, onPress, primary \} \)=> \(\s*<TouchableOpacity style=\{styles\.qaCard\} onPress=\{onPress\}>\s*<View style=\{\[styles\.qaIconBg, primary \&\& \{ backgroundColor: '\#EEF2FF' \} \]\}>\s*\{icon\}\s*<\/View>\s*<Text style=\{styles\.qaCardText\}>\{title\}<\/Text>\s*<\/TouchableOpacity>\s*\);/m;

const newCard = `const QuickActionCard = ({ title, icon, onPress, primary, subtitle, badge, customBg }) => (
    <TouchableOpacity style={styles.qaCard} onPress={onPress}>
      {badge && (
        <View style={{ position: 'absolute', top: -10, backgroundColor: '#4F46E5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, zIndex: 10 }}>
          <Text style={{ color: '#fff', fontSize: 9, fontFamily: 'Inter-Bold' }}>{badge}</Text>
        </View>
      )}
      <View style={[styles.qaIconBg, customBg ? { backgroundColor: customBg } : (primary && { backgroundColor: '#EEF2FF' }) ]}>
        {icon}
      </View>
      <Text style={styles.qaCardText}>{title}</Text>
      {subtitle && <Text style={{ fontSize: 10, fontFamily: 'Inter-Medium', color: '#64748B', marginTop: 2 }}>{subtitle}</Text>}
    </TouchableOpacity>
  );`;

content = content.replace(cardRegex, newCard);

const quickActionsRow = `<QuickActionCard
            title="Stitching"
            icon={<Scissors size={20} color={Colors.primary} />}
            primary={true}
            onPress={() => navigation.navigate('NewStitchRequest')}
          />
          <QuickActionCard
            title="Readymade"
            icon={<ShoppingBag size={20} color={Colors.primary} />}
            onPress={() => navigation.navigate('CustomerShop')}
          />
          <QuickActionCard
            title="My Designs"
            icon={<Camera size={20} color={Colors.primary} />}
            onPress={() => navigation.navigate('CustomerGallery')}
          />`;

const newQuickActionsRow = `<QuickActionCard
            title="Stitching"
            subtitle="Online stitching"
            badge="Online Order"
            icon={<Scissors size={20} color={'#4F46E5'} />}
            customBg={'#EEF2FF'}
            onPress={() => navigation.navigate('NewStitchRequest')}
          />
          <QuickActionCard
            title="Readymade"
            subtitle="Shop readymades"
            icon={<ShoppingBag size={20} color={'#D97706'} />}
            customBg={'#FEF3C7'}
            onPress={() => navigation.navigate('CustomerShop')}
          />
          <QuickActionCard
            title="My Designs"
            subtitle="View my designs"
            icon={<Camera size={20} color={'#059669'} />}
            customBg={'#ECFDF5'}
            onPress={() => navigation.navigate('CustomerGallery')}
          />`;

content = content.replace(quickActionsRow, newQuickActionsRow);

// 4. View All arrow in Featured Shop
content = content.replace(
  /<Text style=\{\{color:Colors\.primary, fontFamily:'Inter-SemiBold', fontSize:13\}\}>View All<\/Text>/,
  "<View style={{flexDirection: 'row', alignItems: 'center'}}><Text style={{color:Colors.primary, fontFamily:'Inter-SemiBold', fontSize:13}}>View All</Text><Ionicons name=\"arrow-forward\" size={14} color={Colors.primary} style={{marginLeft: 4}} /></View>"
);

// 5. Fix price display in product card
content = content.replace(
  /<Text style=\{styles\.dashShopPrice\}>₹\{item\.price\}<\/Text>/,
  "<Text style={styles.dashShopPrice}>₹{item.selling_price || item.price}</Text>"
);

// Change product card price color to match web
content = content.replace(
  /dashShopPrice: \{\s*fontSize: 13,\s*fontFamily: 'Inter-Medium',\s*color: Colors\.primary,\s*marginTop: 4,\s*\}/,
  "dashShopPrice: {\n    fontSize: 13,\n    fontFamily: 'Inter-Bold',\n    color: '#5B43EE',\n    marginTop: 4,\n  }"
);
content = content.replace( // fallback if regex fails
  /color: Colors\.primary/g,
  "color: Colors.primary"
);
// just hardcode it
content = content.replace(
  /color: Colors.primary,\n\s*marginTop: 4,/g,
  "color: '#5B43EE',\n    marginTop: 4,"
);
content = content.replace(
  /fontFamily: 'Inter-Medium',\n\s*color: '#5B43EE',/g,
  "fontFamily: 'Inter-Bold',\n    color: '#5B43EE',"
);


fs.writeFileSync('src/screens/CustomerDashboardScreen.js', content);
console.log('Patched dashboard screen');
