import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
} from 'react-native';
import {
  MessageCircle,
  Mail,
  Phone,
  ChevronRight,
  HelpCircle,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, Shadow } from '../constants/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';

const HelpSupportScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const handleEmail = () => {
    Linking.openURL('mailto:support@sewvee.com');
  };

  const handleWhatsApp = () => {
    Linking.openURL('https://wa.me/919999999999'); // Replace with actual number
  };

  const handleCall = () => {
    Linking.openURL('tel:+919999999999'); // Replace with actual number
  };

  const SupportItem = ({ icon: Icon, title, subtitle, onPress, color }) => (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
        <Icon size={24} color={color} />
      </View>

      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{title}</Text>
        {subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
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

    //     <Text style={styles.headerTitle}>Help & Support</Text>

    //     <View style={{ width: 40 }} />
    //   </View>


    <View style={styles.container} edges={['top']}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content}>
        {/* Banner */}
        <View style={styles.banner}>
          <HelpCircle size={48} color={Colors.primary} />
          <Text style={styles.bannerTitle}>How can we help you?</Text>
          <Text style={styles.bannerText}>
            We are here to help you with any questions or issues you may have.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>CONTACT US</Text>

        <View style={styles.card}>
          <SupportItem
            icon={Mail}
            title="Email Support"
            subtitle="Get help via email"
            color="#EA4335"
            onPress={handleEmail}
          />

          <View style={styles.separator} />

          <SupportItem
            icon={MessageCircle}
            title="Chat on WhatsApp"
            subtitle="Instant support"
            color="#25D366"
            onPress={handleWhatsApp}
          />

          <View style={styles.separator} />

          <SupportItem
            icon={Phone}
            title="Call Us"
            subtitle="Speak to our team"
            color="#3B82F6"
            onPress={handleCall}
          />
        </View>

        <View style={{ height: 20 }} />

        {/* <Text style={styles.sectionTitle}>FAQ</Text>

        <View style={styles.card}>
          <TouchableOpacity style={styles.item}>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>
                How to add a new order?
              </Text>
            </View>
            <ChevronRight size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity style={styles.item}>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>
                How to manage outfits?
              </Text>
            </View>
            <ChevronRight size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View> */}
      </ScrollView>
    </View>
  );
};

export default HelpSupportScreen;

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
  },

  banner: {
    alignItems: 'center',
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },

  bannerTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    color: Colors.textPrimary,
  },

  bannerText: {
    fontSize: 14,
    textAlign: 'center',
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.lg,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },

  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },

  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },

  itemContent: {
    flex: 1,
  },

  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },

  itemSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 70,
  },
});
