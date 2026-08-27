import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Shadow } from '../constants/theme';
import LinearGradient from 'react-native-linear-gradient';

const QuickActionCard = ({ title, icon, onPress, primary }) => {
  if (primary) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={[styles.card, styles.shadow]}>
        <LinearGradient
          colors={['#F5F3FF', '#EDE9FE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBg}
        >
          <View style={styles.iconContainerPrimary}>
            {icon}
          </View>
          <Text style={styles.titlePrimary} numberOfLines={2} textAlign="center">{title}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, styles.secondaryCard, styles.shadow]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.iconContainerSecondary}>
        {icon}
      </View>
      <Text style={styles.titleSecondary} numberOfLines={2} textAlign="center">{title}</Text>
    </TouchableOpacity>
  );
};

export default QuickActionCard;

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    marginHorizontal: 4,
    height: 100,
  },
  shadow: {
    shadowColor: '#5B43EE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  gradientBg: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCard: {
    backgroundColor: Colors.white,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  iconContainerPrimary: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainerSecondary: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  titlePrimary: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 16,
  },
  titleSecondary: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
