const fs = require('fs');

const content = `import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Shadow } from '../constants/theme';
import LinearGradient from 'react-native-linear-gradient';

const QuickActionCard = ({ title, subtitle, icon, onPress, primary, badge, customBg }) => {
  return (
    <TouchableOpacity
      style={[styles.card, styles.shadow]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      {badge && (
        <View style={styles.badgeContainer}>
          <LinearGradient
            colors={['#4F46E5', '#818cf8', '#4F46E5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.badgeBg}
          >
            <Text style={styles.badgeText}>{badge}</Text>
          </LinearGradient>
        </View>
      )}
      <View style={[styles.iconContainer, { backgroundColor: customBg || '#EEF2FF' }]}>
        {icon}
      </View>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
    </TouchableOpacity>
  );
};

export default QuickActionCard;

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 4,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    height: 110,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
    letterSpacing: -0.2,
  },
  badgeContainer: {
    position: 'absolute',
    top: -10,
    zIndex: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  badgeBg: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: 'Inter-Bold',
  }
});
`;
fs.writeFileSync('src/components/QuickActionCard.js', content);
console.log('Rewrote QuickActionCard.js');
