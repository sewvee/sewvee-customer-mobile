const fs = require('fs');

let content = fs.readFileSync('src/screens/CustomerDashboardScreen.js', 'utf8');

content = content.replace(
  /const \[loadingShop, setLoadingShop\] = useState\(false\);/,
  "const [loadingShop, setLoadingShop] = useState(false);\n  const [isBoutiqueModalVisible, setIsBoutiqueModalVisible] = useState(false);\n  const [selectedBoutique, setSelectedBoutique] = useState(null);"
);

fs.writeFileSync('src/screens/CustomerDashboardScreen.js', content);
