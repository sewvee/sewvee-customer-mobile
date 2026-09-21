const fs = require('fs');

function patchProfile() {
  const path = 'src/screens/CustomerProfileScreen.js';
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(
    /StatusBar\.setBackgroundColor\('#FFF'\);/,
    `StatusBar.setBackgroundColor('#F8FAFC');`
  );
  fs.writeFileSync(path, content);
}

function patchShop() {
  const path = 'src/screens/CustomerShopScreen.js';
  let content = fs.readFileSync(path, 'utf8');
  
  if (!content.includes('useFocusEffect')) {
    content = content.replace(
      /import React, \{ useState, useEffect \} from 'react';/,
      `import React, { useState, useEffect } from 'react';\nimport { useFocusEffect } from '@react-navigation/native';`
    );
  }
  
  if (!content.includes('StatusBar.setBackgroundColor')) {
    const focusEffectCode = `
  useFocusEffect(
    React.useCallback(() => {
      StatusBar.setBarStyle('dark-content');
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('#fff');
      }
    }, [])
  );
`;
    content = content.replace(
      /const CustomerShopScreen = \(\{ navigation, route \}\) => \{/,
      `const CustomerShopScreen = ({ navigation, route }) => {${focusEffectCode}`
    );
  }

  // Check if StatusBar and Platform are imported
  if (!content.includes('StatusBar,')) {
    content = content.replace(
      /import \{\s*View,\s*Text,\s*StyleSheet,/,
      `import { View, Text, StyleSheet, StatusBar, Platform,`
    );
  }

  fs.writeFileSync(path, content);
}

function patchGallery() {
  const path = 'src/screens/CustomerGalleryScreen.js';
  let content = fs.readFileSync(path, 'utf8');
  
  if (!content.includes('useFocusEffect')) {
    content = content.replace(
      /import \{ useNavigation \} from '@react-navigation\/native';/,
      `import { useNavigation, useFocusEffect } from '@react-navigation/native';`
    );
  }
  
  if (!content.includes('StatusBar.setBackgroundColor')) {
    const focusEffectCode = `
  useFocusEffect(
    React.useCallback(() => {
      StatusBar.setBarStyle('dark-content');
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('#F5F3FF');
      }
    }, [])
  );
`;
    content = content.replace(
      /const CustomerGalleryScreen = \(\) => \{/,
      `const CustomerGalleryScreen = () => {${focusEffectCode}`
    );
  }

  fs.writeFileSync(path, content);
}

try {
  patchProfile();
  patchShop();
  patchGallery();
  console.log('Status bar colors patched on all screens!');
} catch (e) {
  console.error('Error patching:', e);
}
