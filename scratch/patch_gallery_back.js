const fs = require('fs');

let content = fs.readFileSync('src/screens/CustomerGalleryScreen.js', 'utf8');

// Add import
if (!content.includes("useNavigation")) {
  content = content.replace(
    /import \{ SafeAreaView, useSafeAreaInsets \} from 'react-native-safe-area-context';/,
    "import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';\nimport { useNavigation } from '@react-navigation/native';"
  );
}

// Add hook
if (!content.includes("const navigation = useNavigation();")) {
  content = content.replace(
    /const CustomerGalleryScreen = \(\) => \{/,
    "const CustomerGalleryScreen = () => {\n  const navigation = useNavigation();"
  );
}

// Add button
content = content.replace(
  /<>(\s*)<View style=\{\{ flex: 1 \}\}>(\s*)<Text style=\{styles\.headerTitle\}>My Gallery<\/Text>/,
  `<>
            <TouchableOpacity style={[styles.iconBtn, { marginRight: 12 }]} onPress={() => navigation.goBack()}>
              <ArrowLeft size={24} color="#0F172A" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>My Gallery</Text>`
);

fs.writeFileSync('src/screens/CustomerGalleryScreen.js', content);
