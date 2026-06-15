import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Clipboard,
  LayoutAnimation,
  Platform,
  UIManager,
  SafeAreaView
} from 'react-native';
import { Colors, Spacing, Shadow } from '../constants/theme';
import { 
  User, 
  MapPin, 
  Copy, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  LogOut, 
  Info,
  PhoneCall,
  Scissors
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const FAQ_DATA = [
  {
    question: "How do I upload reference design photos?",
    answer: "Go to your Orders tab on the home dashboard, select your order, and look for outfits showing the 'Reference Design Needed' notification. Tap '+ Upload Photo' to select neckline, embroidery, or style ideas directly from your gallery."
  },
  {
    question: "How do I send my measurement sample garments?",
    answer: "You can ship your best-fitting blouse or salwar suit as a measurement sample garment to the boutique. Copy the boutique's courier address from the Profile or Order screen, ship it, and record the tracking details to lock your measurement history."
  },
  {
    question: "How do I organize my styling inspirations?",
    answer: "Use the 'My Gallery' tab to create custom folders like 'Neck Designs' or 'Bridal Inspiration'. You can upload images from your library and manage your style folder list entirely in one offline-persisted place."
  },
  {
    question: "Who can I contact for orders support?",
    answer: "For design revisions, date alterations, or pricing inquiries, tap on the phone number or WhatsApp links inside the boutique info card on this page to chat with the boutique owners directly."
  }
];

const CustomerProfileScreen = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [expandedIndex, setExpandedIndex] = useState(null);

  const handleCopyBoutiqueAddress = () => {
    const address = "Sewvee Premium Boutique, Block C, 4th Cross Road, Indira Nagar, Bengaluru, Karnataka 560038";
    Clipboard.setString(address);
    showToast('Boutique address copied!', 'success');
  };

  const handleToggleFaq = (index) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleCallBoutique = () => {
    showToast('Calling Boutique: +91 98765 43210', 'success');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.navbar}>
        <View style={{ width: 24 }} />
        <Text style={styles.navbarTitle}>My Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarText}>
              {user?.name?.[0]?.toUpperCase() || 'C'}
            </Text>
          </View>
          <Text style={styles.userNameText}>{user?.name || 'Customer'}</Text>
          <Text style={styles.userMobileText}>+91 {user?.mobile || '9876543210'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Sewvee Customer</Text>
          </View>
        </View>

        {/* Boutique Info Card */}
        <View style={styles.boutiqueCard}>
          <View style={styles.boutiqueHeader}>
            <Scissors size={20} color={Colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.boutiqueTitle}>Boutique Information</Text>
          </View>
          
          <Text style={styles.boutiqueName}>Sewvee Premium Boutique</Text>
          
          <View style={styles.boutiqueDetailRow}>
            <MapPin size={16} color={Colors.textSecondary} style={{ marginRight: 8, marginTop: 2 }} />
            <Text style={styles.boutiqueDetailText}>
              Block C, 4th Cross Road, Indira Nagar, Bengaluru, Karnataka 560038
            </Text>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopyBoutiqueAddress}>
              <Copy size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.boutiqueDetailRow}
            onPress={handleCallBoutique}
          >
            <PhoneCall size={16} color={Colors.textSecondary} style={{ marginRight: 8 }} />
            <Text style={[styles.boutiqueDetailText, { color: Colors.primary, fontFamily: 'Inter-SemiBold' }]}>
              +91 98765 43210
            </Text>
          </TouchableOpacity>
        </View>

        {/* FAQs Section */}
        <View style={styles.faqHeader}>
          <HelpCircle size={20} color={Colors.textPrimary} style={{ marginRight: 8 }} />
          <Text style={styles.faqTitle}>Help & FAQs</Text>
        </View>

        {FAQ_DATA.map((faq, index) => {
          const isExpanded = expandedIndex === index;
          return (
            <TouchableOpacity
              key={index}
              style={styles.faqCard}
              activeOpacity={0.8}
              onPress={() => handleToggleFaq(index)}
            >
              <View style={styles.faqQuestionRow}>
                <Text style={styles.faqQuestionText}>{faq.question}</Text>
                {isExpanded ? (
                  <ChevronUp size={18} color={Colors.textSecondary} />
                ) : (
                  <ChevronDown size={18} color={Colors.textSecondary} />
                )}
              </View>
              {isExpanded && (
                <View style={styles.faqAnswerWrapper}>
                  <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <LogOut size={20} color="white" style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnText}>Logout Session</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CustomerProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: Colors.white,
  },
  navbarTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    ...Shadow.subtle,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  avatarBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: Colors.white,
  },
  userNameText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
  },
  userMobileText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'Inter-Medium',
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  roleBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
    textTransform: 'uppercase',
  },
  boutiqueCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    ...Shadow.subtle,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  boutiqueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  boutiqueTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  boutiqueName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  boutiqueDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  boutiqueDetailText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'Inter-Medium',
    lineHeight: 18,
  },
  copyBtn: {
    padding: 4,
    marginLeft: 8,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  faqTitle: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
  },
  faqCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    ...Shadow.subtle,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: Colors.textPrimary,
    paddingRight: 8,
  },
  faqAnswerWrapper: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  faqAnswerText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'Inter-Medium',
    lineHeight: 18,
  },
  logoutBtn: {
    backgroundColor: Colors.danger,
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
    ...Shadow.subtle,
  },
  logoutBtnText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: Colors.white,
  },
});
