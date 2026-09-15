import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Image, Alert, Platform, KeyboardAvoidingView,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Minus, Camera, ImageIcon, Calendar, X } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { URL_UPLOAD, URL_ORDERS } from '../config/env';

const CATEGORIES = ['Blouse', 'Kurta / Kurti', 'Lehenga', 'Suit / Salwar', 'Dress / Gown', 'Pants / Trousers', 'Other'];
const MEASUREMENT_OPTIONS = ['Use Previous Measurements', 'I will provide later', 'Take measurements at store', 'Send sample dress via courier', 'Measurement dress given'];

const NewStitchRequestScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  
  // Accept selectedBoutique from route params, fallback to user company_id or 1
  const selectedBoutique = route.params?.selectedBoutique;
  const companyId = selectedBoutique?.id || user?.company_id || 1;
  const boutiqueName = selectedBoutique?.name || 'Sewvee Originals';

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  
  // Step 1 State
  const [categoryCounts, setCategoryCounts] = useState({});
  
  // Step 2 State
  const [outfits, setOutfits] = useState([]);
  
  // Step 3 State
  const [deliveryDate, setDeliveryDate] = useState('');

  const handleNext = () => {
    if (step === 1) {
      const totalOutfits = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
      if (totalOutfits === 0) {
        Alert.alert('Error', 'Please select at least one outfit to stitch.');
        return;
      }
      
      const newOutfits = [];
      Object.entries(categoryCounts).forEach(([cat, count]) => {
        for (let i = 0; i < count; i++) {
          const id = `${cat}-${i}`;
          const existing = outfits.find(o => o.id === id);
          if (existing) {
            newOutfits.push(existing);
          } else {
            newOutfits.push({
              id,
              category: cat,
              name: `${cat}${count > 1 ? ` ${i + 1}` : ''}`,
              description: '',
              measurement: 'Use Previous Measurements',
              images: []
            });
          }
        }
      });
      setOutfits(newOutfits);
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 1) {
      navigation.goBack();
    } else {
      setStep(prev => prev - 1);
    }
  };

  const updateCount = (cat, delta) => {
    setCategoryCounts(prev => {
      const current = prev[cat] || 0;
      const next = Math.max(0, current + delta);
      const newCounts = { ...prev };
      if (next === 0) {
        delete newCounts[cat];
      } else {
        newCounts[cat] = next;
      }
      return newCounts;
    });
  };

  const pickImageForOutfit = (outfitId) => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8, selectionLimit: 5 }, (response) => {
      if (response.assets && response.assets.length > 0) {
        setOutfits(prev => prev.map(o => {
          if (o.id === outfitId) {
            return { ...o, images: [...o.images, ...response.assets] };
          }
          return o;
        }));
      }
    });
  };

  const removeImage = (outfitId, imageIndex) => {
    setOutfits(prev => prev.map(o => {
      if (o.id === outfitId) {
        return { ...o, images: o.images.filter((_, idx) => idx !== imageIndex) };
      }
      return o;
    }));
  };

  const updateOutfit = (outfitId, key, value) => {
    setOutfits(prev => prev.map(o => {
      if (o.id === outfitId) {
        return { ...o, [key]: value };
      }
      return o;
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const formattedToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';
      
      const payloadOutfits = [];
      
      for (const outfit of outfits) {
        const uploadedUrls = [];
        for (const image of outfit.images) {
          const formData = new FormData();
          formData.append('file', {
            uri: image.uri,
            type: image.type || 'image/jpeg',
            name: image.fileName || 'photo.jpg'
          });
          formData.append('key_name', 'order_photos');
          
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
        
        const lines = [];
        lines.push(`Category: ${outfit.category}`);
        if (outfit.description) lines.push(`Description: ${outfit.description}`);
        if (outfit.measurement) lines.push(`Measurement: ${outfit.measurement}`);
        if (deliveryDate) lines.push(`Expected Date: ${deliveryDate}`);
        
        payloadOutfits.push({
          name: outfit.category,
          quantity: 1,
          total_amount: 0,
          customer_notes: lines.join('\n'),
          photos: uploadedUrls.map(u => ({ file_url: u })),
          items: [],
        });
      }

      const payload = {
        order_type: 'STITCHING_REQUEST',
        customer_mobile: user?.mobile,
        customer_name: user?.name,
        company_id: companyId,
        outfits: payloadOutfits,
      };

      await axios.post(`${URL_ORDERS.replace('/orders', '/customer-portal/orders')}`, payload, {
        headers: { 
          Authorization: formattedToken, 
          'Content-Type': 'application/json' 
        }
      });
      
      Alert.alert('Success', 'Stitch Request Sent Successfully!');
      navigation.navigate('CustomerOrders');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What would you like to stitch?</Text>
      <Text style={styles.stepSubtitle}>Select the number of outfits for each category.</Text>
      
      {CATEGORIES.map(cat => (
        <View key={cat} style={styles.categoryCard}>
          <Text style={styles.categoryName}>{cat}</Text>
          <View style={styles.counterBox}>
            <TouchableOpacity style={styles.counterBtn} onPress={() => updateCount(cat, -1)}>
              <Minus size={16} color="#64748B" />
            </TouchableOpacity>
            <Text style={styles.counterText}>{categoryCounts[cat] || 0}</Text>
            <TouchableOpacity style={styles.counterBtn} onPress={() => updateCount(cat, 1)}>
              <Plus size={16} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Configure Outfits</Text>
      <Text style={styles.stepSubtitle}>Add details and references for your outfits.</Text>
      
      {outfits.map((outfit, index) => (
        <View key={outfit.id} style={styles.outfitCard}>
          <Text style={styles.outfitTitle}>{outfit.name}</Text>
          
          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={3}
            placeholder="E.g. I need a 3/4th sleeve with deep neck."
            value={outfit.description}
            onChangeText={(text) => updateOutfit(outfit.id, 'description', text)}
            textAlignVertical="top"
          />
          
          <Text style={styles.fieldLabel}>Measurements</Text>
          {MEASUREMENT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[styles.radioRow, outfit.measurement === opt && styles.radioRowActive]}
              onPress={() => updateOutfit(outfit.id, 'measurement', opt)}
            >
              <View style={[styles.radioCircle, outfit.measurement === opt && styles.radioCircleActive]}>
                {outfit.measurement === opt && <View style={styles.radioDot} />}
              </View>
              <Text style={styles.radioText}>{opt}</Text>
            </TouchableOpacity>
          ))}
          
          <Text style={styles.fieldLabel}>Reference Photos</Text>
          <View style={styles.imagesGrid}>
            {outfit.images.map((img, idx) => (
              <View key={idx} style={styles.imageWrapper}>
                <Image source={{ uri: img.uri }} style={styles.previewImage} />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(outfit.id, idx)}>
                  <X size={12} color="#FFF" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addPhotoBtn} onPress={() => pickImageForOutfit(outfit.id)}>
              <Camera size={24} color="#64748B" />
              <Text style={styles.addPhotoText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Final Details</Text>
      
      <Text style={styles.fieldLabel}>Preferred Delivery Date (Optional)</Text>
      <View style={styles.dateInputWrapper}>
        <Calendar size={20} color="#64748B" style={{ marginRight: 10 }} />
        <TextInput
          style={styles.dateInput}
          placeholder="e.g. 15th October"
          value={deliveryDate}
          onChangeText={setDeliveryDate}
        />
      </View>
      
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Order Summary</Text>
        <Text style={styles.summaryText}>Total Outfits: {outfits.length}</Text>
        <Text style={styles.summaryText}>Boutique: {boutiqueName}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        {/* Header matching web PWA */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtnWrapper}>
            <View style={styles.backBtnCircle}>
              <ArrowLeft size={20} color="#0F172A" />
            </View>
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>New Stitching Request</Text>
            <Text style={styles.headerSubtitle}>to {boutiqueName}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressLine} />
          {[1, 2, 3].map(num => (
            <View key={num} style={[styles.progressDot, step >= num && styles.progressDotActive]}>
              <Text style={[styles.progressDotText, step >= num && styles.progressDotTextActive]}>{num}</Text>
            </View>
          ))}
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.btnSecondary} 
            onPress={handleBack}
          >
            <ArrowLeft size={18} color="#64748B" style={{ marginRight: 6 }} />
            <Text style={styles.btnSecondaryText}>Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.btnPrimary, submitting && { opacity: 0.7 }]} 
            onPress={step === 3 ? handleSubmit : handleNext}
            disabled={submitting}
          >
            <Text style={styles.btnPrimaryText}>{submitting ? 'Submitting...' : (step === 3 ? 'Submit Request' : 'Continue')}</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtnWrapper: { padding: 4 },
  backBtnCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center', justifyContent: 'center'
  },
  headerTitleBox: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Inter-Bold', color: '#0F172A' },
  headerSubtitle: { fontSize: 12, fontFamily: 'Inter-Medium', color: '#5B43EE', marginTop: 2 },
  
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingVertical: 20,
    position: 'relative',
  },
  progressLine: {
    position: 'absolute',
    left: 60, right: 60, top: 32,
    height: 2, backgroundColor: '#E2E8F0',
    zIndex: 0,
  },
  progressDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 1,
  },
  progressDotActive: { backgroundColor: '#5B43EE' },
  progressDotText: { fontSize: 12, fontFamily: 'Inter-Bold', color: '#64748B' },
  progressDotTextActive: { color: '#FFF' },

  scrollContent: { padding: 20, paddingBottom: 40 },
  stepContainer: { flex: 1 },
  stepTitle: { fontSize: 20, fontFamily: 'Inter-Bold', color: '#0F172A', marginBottom: 6 },
  stepSubtitle: { fontSize: 14, fontFamily: 'Inter-Medium', color: '#64748B', marginBottom: 24 },
  
  // Step 1
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryName: { fontSize: 16, fontFamily: 'Inter-Bold', color: '#1E293B' },
  counterBox: { flexDirection: 'row', alignItems: 'center' },
  counterBtn: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center',
  },
  counterText: { fontSize: 16, fontFamily: 'Inter-Bold', color: '#0F172A', width: 32, textAlign: 'center' },

  // Step 2
  outfitCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 16, padding: 16, marginBottom: 20,
  },
  outfitTitle: { fontSize: 16, fontFamily: 'Inter-Bold', color: '#0F172A', marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontFamily: 'Inter-Bold', color: '#64748B', marginBottom: 8, marginTop: 12 },
  textArea: {
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 12, padding: 12, fontSize: 14, fontFamily: 'Inter-Medium', color: '#1E293B',
    minHeight: 80,
  },
  radioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  radioCircle: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#CBD5E1',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  radioCircleActive: { borderColor: '#5B43EE' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#5B43EE' },
  radioText: { fontSize: 14, fontFamily: 'Inter-Medium', color: '#334155' },
  
  imagesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  imageWrapper: { width: 70, height: 70, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  previewImage: { width: '100%', height: '100%' },
  removeImageBtn: {
    position: 'absolute', top: 4, right: 4,
    width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center'
  },
  addPhotoBtn: {
    width: 70, height: 70, borderRadius: 8,
    borderWidth: 1, borderColor: '#CBD5E1', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  addPhotoText: { fontSize: 10, fontFamily: 'Inter-Medium', color: '#64748B', marginTop: 4 },

  // Step 3
  dateInputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
  },
  dateInput: { flex: 1, fontSize: 15, fontFamily: 'Inter-Medium', color: '#1E293B' },
  summaryCard: {
    backgroundColor: '#EEF2FF', borderRadius: 12, padding: 16, marginTop: 24,
  },
  summaryTitle: { fontSize: 14, fontFamily: 'Inter-Bold', color: '#4F46E5', marginBottom: 12 },
  summaryText: { fontSize: 14, fontFamily: 'Inter-Medium', color: '#312E81', marginBottom: 4 },

  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9',
    backgroundColor: '#FFF'
  },
  btnSecondary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F8FAFC', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12,
  },
  btnSecondaryText: { fontSize: 15, fontFamily: 'Inter-Bold', color: '#64748B' },
  btnPrimary: {
    flex: 1, marginLeft: 16,
    backgroundColor: '#5B43EE', paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  btnPrimaryText: { fontSize: 15, fontFamily: 'Inter-Bold', color: '#FFF' },
});

export default NewStitchRequestScreen;
