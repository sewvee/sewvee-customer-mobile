import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { X, Star } from 'lucide-react-native';
import { Colors, Spacing, Shadow } from '../constants/theme';
import axios from 'axios';
import { BASE_URL } from '../config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CustomerFeedbackModal = ({ visible, onClose, orderId, onSubmitSuccess }) => {
  const [stitchingRating, setStitchingRating] = useState(0);
  const [staffRating, setStaffRating] = useState(0);
  const [overallRating, setOverallRating] = useState(0);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (stitchingRating === 0 || staffRating === 0 || overallRating === 0) {
      Alert.alert('Incomplete', 'Please provide a rating for all 3 categories.');
      return;
    }

    setSubmitting(true);
    try {
      let token = await AsyncStorage.getItem('userToken');
      token = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';
      
      const payload = {
        stitching_rating: stitchingRating,
        staff_rating: staffRating,
        overall_rating: overallRating,
        comments: comments.trim()
      };

      await axios.post(`${BASE_URL}customer-portal/orders/${orderId}/feedback`, payload, {
        headers: { Authorization: token }
      });
      
      Alert.alert('Success', 'Thank you for your feedback!');
      onSubmitSuccess();
      handleClose();
    } catch (error) {
      console.warn('Failed to submit feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStitchingRating(0);
    setStaffRating(0);
    setOverallRating(0);
    setComments('');
    onClose();
  };

  const renderStars = (rating, setRating) => (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7} style={{ padding: 4 }}>
          <Star 
            size={32} 
            color={star <= rating ? "#FACC15" : "#E2E8F0"} 
            fill={star <= rating ? "#FACC15" : "transparent"} 
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Rate Your Experience</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.subtitle}>Your feedback helps us improve our service.</Text>

            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>Stitching Quality</Text>
              {renderStars(stitchingRating, setStitchingRating)}
            </View>

            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>Staff Behavior</Text>
              {renderStars(staffRating, setStaffRating)}
            </View>

            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>Overall Experience</Text>
              {renderStars(overallRating, setOverallRating)}
            </View>

            <View style={styles.commentSection}>
              <Text style={styles.ratingLabel}>Additional Comments</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Tell us what you liked or how we can improve..."
                placeholderTextColor={Colors.textLight}
                multiline
                numberOfLines={4}
                value={comments}
                onChangeText={setComments}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity 
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]} 
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Submit Feedback</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontFamily: 'Inter-Regular',
    marginBottom: 24,
  },
  ratingSection: {
    marginBottom: 24,
  },
  ratingLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentSection: {
    marginBottom: 32,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: Colors.textPrimary,
    minHeight: 120,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    ...Shadow.medium,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
});

export default CustomerFeedbackModal;
