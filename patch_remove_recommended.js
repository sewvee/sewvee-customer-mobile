const fs = require('fs');
const path = 'src/screens/CustomerDashboardScreen.js';
let content = fs.readFileSync(path, 'utf8');

const regex = /\s*<Text style=\{\[styles\.sectionTitle, \{ marginTop: 24 \}\]\}>Recommended For You<\/Text>\s*<ScrollView horizontal showsHorizontalScrollIndicator=\{false\} style=\{\{ marginBottom: 20 \}\}>\s*<View style=\{\[styles\.offerCard, \{ backgroundColor: '#FEF3C7' \}\]\}>\s*<Text style=\{styles\.offerTitle\}>Flat 20% Off<\/Text>\s*<Text style=\{styles\.offerSubtitle\}>On Bridal Lehengas<\/Text>\s*<\/View>\s*<View style=\{\[styles\.offerCard, \{ backgroundColor: '#E0E7FF' \}\]\}>\s*<Text style=\{styles\.offerTitle\}>New Arrivals<\/Text>\s*<Text style=\{styles\.offerSubtitle\}>Check out the latest blouses<\/Text>\s*<\/View>\s*<\/ScrollView>/;

content = content.replace(regex, '');

fs.writeFileSync(path, content);
console.log('Removed Recommended For You section');
