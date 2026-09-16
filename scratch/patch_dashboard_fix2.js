const fs = require('fs');

let content = fs.readFileSync('src/screens/CustomerDashboardScreen.js', 'utf8');

// Header icon fix
content = content.replace(
  /<ShoppingBag size=\{18\} color="\#5B43EE" \/>/,
  '<Ionicons name="home" size={18} color="#5B43EE" />'
);

// Quick action cards
const badQuickActions = `<QuickActionCard
            title="Stitching"
            icon={<Scissors size={20} color={Colors.primary} />}
            primary={true}
            onPress={() => navigation.navigate('NewStitchRequest')}
          />
          <QuickActionCard
            title="Readymade"
            icon={<Ionicons name="home" size={20} color={Colors.primary} />}
            onPress={() => navigation.navigate('CustomerShop')}
          />
          <QuickActionCard
            title="My Designs"
            icon={<Camera size={20} color={Colors.primary} />}
            onPress={() => navigation.navigate('CustomerGallery')}
          />`;

const badQuickActions2 = `<QuickActionCard
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

// I actually injected the good one `badQuickActions2` but wait! Let's just check what is currently there!
const quickActionsRowRegex = /<QuickActionCard[\s\S]*?onPress=\{\(\) => navigation\.navigate\('CustomerGallery'\)\}\s*\/>/;

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

content = content.replace(quickActionsRowRegex, newQuickActionsRow);

fs.writeFileSync('src/screens/CustomerDashboardScreen.js', content);
