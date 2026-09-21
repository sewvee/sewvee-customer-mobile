const fs = require('fs');
const file = 'src/components/QuickActionCard.js';
let content = fs.readFileSync(file, 'utf8');

// Replace imports
content = content.replace(
  "import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';",
  "import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';"
);

// Add scale anim state
const stateTarget = "const glowAnim = useRef(new Animated.Value(0)).current;";
const stateReplacement = `const glowAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, speed: 20 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
  };`;
content = content.replace(stateTarget, stateReplacement);

// Replace TouchableOpacity with Pressable
const renderTarget = /<TouchableOpacity[\s\S]*?<Animated\.View style=\{\[/;
const renderReplacement = `<Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={{ flex: 1, marginHorizontal: 4 }}
    >
      <Animated.View style={[
        { transform: [{ scale: scaleAnim }] },`;
content = content.replace(renderTarget, renderReplacement);

// Close tag
content = content.replace("</TouchableOpacity>", "</Pressable>");

fs.writeFileSync(file, content);
console.log('Patched QuickActionCard with Pressable');
