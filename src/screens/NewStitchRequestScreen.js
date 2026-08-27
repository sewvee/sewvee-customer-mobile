import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadow } from '../constants/theme';
import { ArrowLeft, Check, Camera, Image as ImageIcon, Calendar } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { URL_ORDERS, URL_UPLOAD } from '../config/env';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';

const CATEGORIES = [
  'Women\'s Wear', 'Men\'s Wear', 'Kids Wear', 'Blouse', 'Lehenga', 'Alteration', 'Others'
];

const MEASUREMENT_OPTIONS = [
  'Use Saved Measurements', 'Will Visit Boutique', 'I\'ll Share Later'
];

const NewStitchRequestScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [category, setCategory] = useState('');
  const [images, setImages] = useState([]);
  const [description, setDescription] = useState('');
  const [measurement, setMeasurement] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(''); // Just text for simplicity

  const handleNext = () => {
    if (step === 1 && !category) {
      showToast('Please select a category', 'error');
      return;
    }
    if (step === 4 && !measurement) {
      showToast('Please select a measurement option', 'error');
      return;
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (step === 1) {
      navigation.goBack();
    } else {
      setStep(prev => prev - 1);
    }
  };

  const pickImage = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (response) => {
      if (response.assets && response.assets.length > 0) {
        setImages([...images, response.assets[0]]);
      }
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const formattedToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';
      
      // Upload images
      const uploadedUrls = [];
      for (const image of images) {
        const formData = new FormData();
        formData.append('file', {
          uri: image.uri,
          type: image.type,
          name: image.fileName || 'photo.jpg'
        });
        formData.append('key_name', 'order_reference');
        
        try {
          const uploadRes = await axios.post(URL_UPLOAD, formData, {
            headers: { 
              Authorization: formattedToken,
              'Content-Type': 'multipart/form-data'
            }
          });
          const url = uploadRes.data?.file_url || uploadRes.data?.data?.file_url || uploadRes.data?.url;
          if (url) uploadedUrls.push(url);
        } catch (err) {
          console.warn('Failed to upload image', err);
        }
      }

      // Payload matching the new customer-portal endpoint structure
      const payload = {
        order_type: 'STITCHING_REQUEST',
        customer_mobile: user?.mobile,
        company_id: user?.company_id || 1, // Fallback to 1 for standalone
        details: {
          category: category,
          description: description,
          measurement_option: measurement,
          delivery_date: deliveryDate,
          photos: uploadedUrls
        }
      };

      await axios.post(`${URL_ORDERS.replace('/orders', '/customer-portal/orders')}`, payload, {
        headers: { 
          Authorization: formattedToken, 
          'Content-Type': 'application/json' 
        }
      });
      
      showToast('Stitch Request Sent Successfully!', 'success');
      navigation.navigate('CustomerRequestedOrders'); // Send to their orders list
    } catch (error) {
      console.error(error);
      showToast('Error submitting request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch(step) {
      case 1:
        return (
          <View>
            <Text style={styles.stepTitle}>Step 1: Choose Category</Text>
            <View style={styles.grid}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.gridItem, category === cat && styles.gridItemActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.gridItemText, category === cat && styles.gridItemTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 2:
        return (
          <View>
            <Text style={styles.stepTitle}>Step 2: Upload References</Text>
            <Text style={styles.stepSubtitle}>Upload reference images, fabric, or existing dress.</Text>
            
            <View style={styles.imagesContainer}>
              {images.map((img, idx) => (
                <Image key={idx} source={{ uri: img.uri }} style={styles.previewImage} />
              ))}
              <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
                <ImageIcon size={24} color={Colors.primary} />
                <Text style={styles.addImageText}>Add Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 3:
        return (
          <View>
            <Text style={styles.stepTitle}>Step 3: Description</Text>
            <Text style={styles.stepSubtitle}>Example: Need this neck. 3/4 sleeve. Delivery before September 10.</Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={6}
              placeholder="Describe your requirements..."
              value={description}
              onChangeText={setDescription}
              textAlignVertical="top"
            />
          </View>
        );
      case 4:
        return (
          <View>
            <Text style={styles.stepTitle}>Step 4: Measurements</Text>
            {MEASUREMENT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.optionRow, measurement === opt && styles.optionRowActive]}
                onPress={() => setMeasurement(opt)}
              >
                <View style={[styles.radio, measurement === opt && styles.radioActive]}>
                  {measurement === opt && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.optionText}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      case 5:
        return (
          <View>
            <Text style={styles.stepTitle}>Step 5: Preferred Delivery Date</Text>
            <Text style={styles.stepSubtitle}>Optional</Text>
            <View style={styles.inputRow}>
              <Calendar size={20} color={Colors.textSecondary} style={{ marginRight: 10 }} />
              <TextInput
                style={{ flex: 1, fontFamily: 'Inter-Medium', fontSize: 15 }}
                placeholder="e.g. 15th October"
                value={deliveryDate}
                onChangeText={setDeliveryDate}
              />
            </View>
          </View>
        );
      case 6:
        return (
          <View>
            <Text style={styles.stepTitle}>Step 6: Review & Submit</Text>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewLabel}>Category</Text>
              <Text style={styles.reviewValue}>{category}</Text>
              
              <Text style={styles.reviewLabel}>Description</Text>
              <Text style={styles.reviewValue}>{description || 'None'}</Text>
              
              <Text style={styles.reviewLabel}>Measurement</Text>
              <Text style={styles.reviewValue}>{measurement}</Text>
              
              <Text style={styles.reviewLabel}>Delivery Date</Text>
              <Text style={styles.reviewValue}>{deliveryDate || 'Flexible'}</Text>
              
              <Text style={styles.reviewLabel}>Images Attached</Text>
              <Text style={styles.reviewValue}>{images.length} photos</Text>
            </View>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <ArrowLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Stitch Request</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${(step / 6) * 100}%` }]} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        {renderStepContent()}
      </ScrollView>

      <View style={styles.footer}>
        {step < 6 ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
            <Text style={styles.primaryBtnText}>Continue</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.primaryBtn} 
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.primaryBtnText}>Submit Request</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

export default NewStitchRequestScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#F1F5F9',
    width: '100%',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  stepTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  gridItemActive: {
    borderColor: Colors.primary,
    backgroundColor: '#EEF2FF',
  },
  gridItemText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: Colors.textPrimary,
  },
  gridItemTextActive: {
    color: Colors.primary,
    fontFamily: 'Inter-Bold',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  addImageBtn: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  addImageText: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.primary,
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: Colors.textPrimary,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  optionRowActive: {
    backgroundColor: '#F8FAFC',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  optionText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.textPrimary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  reviewCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 20,
    ...Shadow.subtle,
  },
  reviewLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.textSecondary,
    marginBottom: 4,
    marginTop: 12,
  },
  reviewValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.textPrimary,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: Colors.white,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.white,
  },
});
