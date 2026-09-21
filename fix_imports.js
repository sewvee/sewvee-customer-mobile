const fs = require('fs');
const file = 'src/screens/CustomerDashboardScreen.js';
let content = fs.readFileSync(file, 'utf8');

const target = `import React from 'react';
import { StatusBar, Platform } from 'react-native';
const CustomerDashboardScreen = ({ navigation, route }) => {`;
const replacement = `const CustomerDashboardScreen = ({ navigation, route }) => {`;

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log('Fixed imports');
