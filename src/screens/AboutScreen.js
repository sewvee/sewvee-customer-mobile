import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import {
  ShieldCheck,
  FileText,
  ChevronRight,
  CircleQuestionMark
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, Shadow } from '../constants/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';


const AboutScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const version = '7.0.0'; // Ideally fetch from app config

  const AboutItem = ({ icon: Icon, title, onPress }) => (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <View style={styles.itemLeft}>
        <Icon size={20} color={Colors.textSecondary} />
        <Text style={styles.itemTitle}>{title}</Text>
      </View>
      <ChevronRight size={20} color={Colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    // <View style={[styles.container, { paddingTop: insets.top }]}>
    //   {/* Header */}
    //   <View style={styles.header}>
    //     <TouchableOpacity onPress={() => navigation.goBack()}>
    //       <Text style={styles.backButtonText}>Back</Text>
    //     </TouchableOpacity>

    //     <Text style={styles.headerTitle}>About</Text>

    //     <View style={{ width: 40 }} />
    //   </View>

    <View style={styles.container} edges={['top']}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>S</Text>
            </View>
          </View>

          <Text style={styles.appName}>Sewvee</Text>
          <Text style={styles.version}>Version {version}</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <AboutItem
            icon={FileText}
            title="Terms of Service"
            onPress={() => navigation.navigate("Termsscreen")}
          />

          <View style={styles.separator} />

          <AboutItem
            icon={ShieldCheck}
            title="Privacy Policy"
            onPress={() => navigation.navigate("PrivacyPolicyScreen" )}
          />

          <View style={styles.separator} />

          <AboutItem
            icon={CircleQuestionMark}
            title="FAQ"
            onPress={() => navigation.navigate("FaqScreen" )}
          />
        </View>

        {/* Handcrafted Section */}
        <View style={styles.handcraftedSection}>
          <Text style={styles.handcraftedText}>
            Handcrafted for{' '}
            <Text style={styles.boutiqueText}>Boutiques</Text>
          </Text>

          <View style={styles.poweredByContainer}>
            <Text style={styles.poweredByText}>Powered by </Text>
            <Text style={styles.sewveeText}>Sewvee</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.copyright}>
          © 2024 Sewvee. All rights reserved.
        </Text>
      </View>
    </View>
  );
};

export default AboutScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },

  headerTitle: {
    ...Typography.h3,
    fontSize: 20,
    textAlign: "center"
  },

  content: {
    padding: Spacing.md,
    alignItems: 'center',
  },

  logoSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    marginBottom: Spacing.md,
  },

  logoContainer: {
    marginBottom: Spacing.md,
    elevation: 10,
  },

  logoPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
  },

  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },

  version: {
    fontSize: 14,
    color: Colors.textSecondary,
  },

  card: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.xxl,
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    paddingVertical: Spacing.lg,
  },

  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },

  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },

  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 50,
  },

  handcraftedSection: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },

  handcraftedText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 8,
  },

  boutiqueText: {
    ...Platform.select({
      ios: { fontFamily: 'Didot', fontStyle: 'italic' },
      android: { fontFamily: 'serif', fontStyle: 'italic' },
    }),
    fontSize: 18,
    color: Colors.primary,
    fontWeight: 'bold',
  },

  poweredByContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  poweredByText: {
    fontSize: 12,
    color: Colors.textSecondary,
    opacity: 0.7,
  },

  sewveeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 1,
    marginLeft: 4,
  },

  footer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },

  copyright: {
    fontSize: 12,
    color: Colors.textSecondary,
    opacity: 0.5,
  },
});
