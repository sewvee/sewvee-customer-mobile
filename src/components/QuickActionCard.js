import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Colors } from '../constants/theme';
import LinearGradient from 'react-native-linear-gradient';

const QuickActionCard = ({ title, subtitle, icon, onPress, primary, badge, customBg }) => {
  const glowAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: false, speed: 20 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: false, speed: 20 }).start();
  };

  useEffect(() => {
    if (badge) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [badge]);

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E2E8F0', '#818CF8']
  });

  const shadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.05, 0.4]
  });

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={{ flex: 1, marginHorizontal: 4 }}
    >
      <Animated.View style={[
        { transform: [{ scale: scaleAnim }] },
        styles.card,
        {
          borderColor: badge ? borderColor : '#E2E8F0',
          shadowColor: badge ? '#4F46E5' : '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: badge ? shadowOpacity : 0.05,
          shadowRadius: badge ? 8 : 2,
          elevation: badge ? 4 : 1,
        }
      ]}>
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
      </Animated.View>
    </Pressable>
  );
};

export default QuickActionCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
    height: 130,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
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
    marginTop: 4,
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
