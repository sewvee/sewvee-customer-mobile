import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Image, Alert, Platform, KeyboardAvoidingView, Modal,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Minus, Camera, ImageIcon, Calendar, X, ChevronRight, ChevronDown, Mic, Image as ImageIconLucide, CheckCircle2 } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { URL_UPLOAD, URL_ORDERS } from '../config/env';
import CollageMaker from '../components/CollageMaker';
import DateTimePicker from '@react-native-community/datetimepicker';

const CATEGORIES = ['Blouse', 'Chudithar', 'Kurta / Kurti', 'Lehenga', 'Suit / Salwar', 'Dress / Gown', 'Pants / Trousers', 'Other'];
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
  
  // Accordion & Features State
  const [editingOutfitId, setEditingOutfitId] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [collageMakerVisible, setCollageMakerVisible] = useState(false);
  const [activeCollageOutfitId, setActiveCollageOutfitId] = useState(null);

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

  const removeOutfit = (outfitId) => {
    setOutfits(prev => {
      const outfitToRemove = prev.find(o => o.id === outfitId);
      if (outfitToRemove) {
        updateCount(outfitToRemove.category, -1);
      }
      return prev.filter(o => o.id !== outfitId);
    });
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
        
        if (outfit.collageUrl) {
          const formData = new FormData();
          formData.append('file', {
            uri: outfit.collageUrl,
            type: 'image/jpeg',
            name: 'collage.jpg'
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
            console.warn('Failed to upload collage', err);
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
      
      {CATEGORIES.map(cat => {
        const count = categoryCounts[cat] || 0;
        const isActive = count > 0;
        return (
          <View key={cat} style={[styles.categoryCard, isActive && styles.categoryCardActive]}>
            <Text style={[styles.categoryName, isActive && styles.categoryNameActive]}>{cat}</Text>
            <View style={styles.counterBox}>
              <TouchableOpacity style={[styles.counterBtn, isActive && styles.counterBtnActive]} onPress={() => updateCount(cat, -1)}>
                <Minus size={16} color={isActive ? "#5B43EE" : "#64748B"} />
              </TouchableOpacity>
              <Text style={styles.counterText}>{count}</Text>
              <TouchableOpacity style={[styles.counterBtn, isActive && styles.counterBtnActive]} onPress={() => updateCount(cat, 1)}>
                <Plus size={16} color={isActive ? "#5B43EE" : "#64748B"} />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Configure Outfits</Text>
      <Text style={styles.stepSubtitle}>Tap each outfit to provide design references, details, and measurements.</Text>
      
      {outfits.map((outfit, index) => (
        <View key={outfit.id} style={styles.outfitDrawerCard}>
          <TouchableOpacity 
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} 
            onPress={() => setEditingOutfitId(outfit.id)}
          >
            <View style={styles.accordionHeaderLeft}>
              <View style={styles.accordionIndexCircle}>
                <Text style={styles.accordionIndexText}>{index + 1}</Text>
              </View>
              <View>
                <Text style={styles.outfitTitle}>{outfit.name}</Text>
                <Text style={styles.outfitSubtitle}>Tap to add details</Text>
              </View>
            </View>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => removeOutfit(outfit.id)} style={{ padding: 4, backgroundColor: '#FEE2E2', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} color="#EF4444" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditingOutfitId(outfit.id)}>
              <ChevronRight size={20} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        </View>
      ))}
      
      <CollageMaker
        visible={collageMakerVisible}
        onClose={() => setCollageMakerVisible(false)}
        onSaveReference={(url) => {
          if (activeCollageOutfitId) {
            updateOutfit(activeCollageOutfitId, 'collageUrl', url);
          }
          setCollageMakerVisible(false);
        }}
      />
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Final Details</Text>
      
      <Text style={styles.fieldLabel}>Preferred Delivery Date (Optional)</Text>
      <TouchableOpacity 
        style={styles.dateInputWrapper}
        onPress={() => setShowDatePicker(true)}
      >
        <Calendar size={20} color="#64748B" style={{ marginRight: 10 }} />
        <Text style={[styles.dateInput, !deliveryDate && { color: '#94A3B8' }]}>
          {deliveryDate || 'e.g. 15th October'}
        </Text>
      </TouchableOpacity>
      
      {showDatePicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(event, date) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (date) {
              const formattedDate = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
              setDeliveryDate(formattedDate);
            }
          }}
        />
      )}
      
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Order Summary</Text>
        <Text style={styles.summaryText}>Total Outfits: {outfits.length}</Text>
        <Text style={styles.summaryText}>Boutique: {boutiqueName}</Text>
      </View>
      
      {selectedBoutique?.terms_and_conditions ? (
        <View style={styles.termsCard}>
          <Text style={styles.termsTitle}>Terms & Conditions</Text>
          <Text style={styles.termsText}>{selectedBoutique.terms_and_conditions}</Text>
        </View>
      ) : null}
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



        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </ScrollView>

        {/* OUTFIT CONFIGURATION DRAWER (BOTTOM SHEET) */}
        <Modal
          visible={!!editingOutfitId}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setEditingOutfitId(null)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setEditingOutfitId(null)} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContainer}>
              {(() => {
                const activeOutfit = outfits.find(o => o.id === editingOutfitId);
                if (!activeOutfit) return null;
                return (
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>{activeOutfit.name}</Text>
                      <TouchableOpacity onPress={() => setEditingOutfitId(null)} style={styles.closeBtn}>
                        <X size={24} color="#0F172A" />
                      </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 40 }}>
                      
                      {/* 1. Reference Photos (Collage) */}
                      <Text style={styles.sectionHeading}>1. Reference Photos</Text>
                      <Text style={styles.sectionSubheading}>Add your fabric & design inspiration. 1) Collage your saree/outfit material, any embroidery or patterns, and reference images.</Text>
                      
                      {activeOutfit.collageUrl ? (
                        <View style={styles.collagePreviewContainer}>
                          <Image 
                            source={{ uri: (activeOutfit.collageUrl.startsWith('file://') || activeOutfit.collageUrl.startsWith('http')) ? activeOutfit.collageUrl : `file://${activeOutfit.collageUrl}` }} 
                            style={styles.collagePreviewImage} 
                            resizeMode="cover" 
                          />
                          <View style={styles.collageActionRow}>
                            <TouchableOpacity 
                              style={styles.btnEditCollage}
                              onPress={() => {
                                setActiveCollageOutfitId(activeOutfit.id);
                                setCollageMakerVisible(true);
                              }}
                            >
                              <Text style={styles.btnEditCollageText}>Edit Collage</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={styles.btnRemoveCollage}
                              onPress={() => updateOutfit(activeOutfit.id, 'collageUrl', null)}
                            >
                              <Text style={styles.btnRemoveCollageText}>Remove</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.dashedBox}>
                          <View style={styles.iconCircle}>
                            <ImageIconLucide size={24} color="#5B43EE" />
                          </View>
                          <Text style={styles.boxTitle}>Build a Collage</Text>
                          <Text style={styles.boxSubtitle}>Combine your fabric photos with design references in one image.</Text>
                          <TouchableOpacity 
                            style={styles.btnCollage}
                            onPress={() => {
                              setActiveCollageOutfitId(activeOutfit.id);
                              setCollageMakerVisible(true);
                            }}
                          >
                            <Text style={styles.btnCollageText}>Open Collage Maker</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* 2. Description & Voice Note */}
                      <Text style={styles.sectionHeading}>2. Description & Voice Note</Text>
                      <TextInput
                        style={styles.textArea}
                        multiline
                        numberOfLines={4}
                        placeholder="Describe your design, specific requirements, fabric details..."
                        value={activeOutfit.description}
                        onChangeText={(text) => updateOutfit(activeOutfit.id, 'description', text)}
                        textAlignVertical="top"
                      />
                      
                      <Text style={styles.orText}>Or record a voice note</Text>
                      <TouchableOpacity 
                        style={styles.btnVoiceNote}
                        onPress={() => Alert.alert('Coming Soon', 'Voice recording will be available in the next app update.')}
                      >
                        <Mic size={18} color="#5B43EE" style={{marginRight: 8}} />
                        <Text style={styles.btnVoiceNoteText}>Record Voice Note</Text>
                      </TouchableOpacity>

                      {/* 3. Measurement Option */}
                      <Text style={styles.sectionHeading}>3. Measurement Option</Text>
                      {MEASUREMENT_OPTIONS.map(opt => {
                        const isActive = activeOutfit.measurement === opt;
                        return (
                          <TouchableOpacity
                            key={opt}
                            style={[styles.measurementOptionBox, isActive && styles.measurementOptionBoxActive]}
                            onPress={() => updateOutfit(activeOutfit.id, 'measurement', opt)}
                          >
                            <View style={styles.measurementOptionHeader}>
                              <Text style={[styles.measurementOptionText, isActive && styles.measurementOptionTextActive]}>{opt}</Text>
                              {isActive && <CheckCircle2 size={20} color="#5B43EE" />}
                            </View>
                            
                            {isActive && opt === 'Use Previous Measurements' && (
                              <View style={styles.subInputBox}>
                                <Text style={styles.subInputText}>Tap to select an order...</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}

                      <TouchableOpacity style={styles.btnSaveDrawer} onPress={() => setEditingOutfitId(null)}>
                        <Text style={styles.btnSaveDrawerText}>Done</Text>
                      </TouchableOpacity>

                    </ScrollView>
                  </View>
                );
              })()}
            </KeyboardAvoidingView>
          </View>
        </Modal>

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
  // Step 2 (Accordion)
  outfitCard: {
    backgroundColor: '#FFF',
    borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 16, marginBottom: 16,
  },
  outfitCardExpanded: {
    borderColor: '#CBD5E1',
  },
  accordionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16,
  },
  accordionHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  accordionIndexCircle: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center', marginRight: 16,
  },
  accordionIndexText: { fontSize: 16, fontFamily: 'Inter-Bold', color: '#64748B' },
  outfitTitle: { fontSize: 18, fontFamily: 'Inter-Bold', color: '#0F172A' },
  outfitSubtitle: { fontSize: 13, fontFamily: 'Inter-Medium', color: '#94A3B8', marginTop: 2 },
  
  accordionBody: { padding: 16, paddingTop: 0 },
  
  dashedBox: {
    borderWidth: 1, borderColor: '#CBD5E1', borderStyle: 'dashed', borderRadius: 16,
    padding: 24, alignItems: 'center', marginBottom: 24, backgroundColor: '#F8FAFC',
  },
  iconCircle: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  boxTitle: { fontSize: 16, fontFamily: 'Inter-Bold', color: '#0F172A', marginBottom: 8 },
  boxSubtitle: { fontSize: 13, fontFamily: 'Inter-Medium', color: '#64748B', textAlign: 'center', marginBottom: 16, paddingHorizontal: 12 },
  btnCollage: {
    backgroundColor: '#5B43EE', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12,
  },
  btnCollageText: { fontSize: 14, fontFamily: 'Inter-Bold', color: '#FFF' },

  sectionHeading: { fontSize: 16, fontFamily: 'Inter-Bold', color: '#0F172A', marginBottom: 4 },
  sectionSubheading: { fontSize: 13, fontFamily: 'Inter-Medium', color: '#64748B', marginBottom: 16, lineHeight: 20 },
  
  collagePreviewContainer: { marginBottom: 24 },
  collagePreviewImage: { width: '100%', height: 350, borderRadius: 12, backgroundColor: '#F1F5F9' },
  collageActionRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  btnEditCollage: { flex: 1, borderWidth: 1, borderColor: '#5B43EE', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnEditCollageText: { fontSize: 14, fontFamily: 'Inter-Bold', color: '#5B43EE' },
  btnRemoveCollage: { flex: 1, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnRemoveCollageText: { fontSize: 14, fontFamily: 'Inter-Bold', color: '#EF4444' },
  textArea: {
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 12, padding: 16, fontSize: 14, fontFamily: 'Inter-Medium', color: '#64748B',
    minHeight: 120, marginBottom: 12,
  },
  orText: { fontSize: 13, fontFamily: 'Inter-Medium', color: '#64748B', marginBottom: 12 },
  btnVoiceNote: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#CBD5E1', borderStyle: 'dashed', borderRadius: 12,
    paddingVertical: 14, marginBottom: 24,
  },
  btnVoiceNoteText: { fontSize: 14, fontFamily: 'Inter-Bold', color: '#5B43EE' },

  measurementOptionBox: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, marginBottom: 12,
    backgroundColor: '#FFF',
  },
  measurementOptionBoxActive: { borderColor: '#5B43EE', backgroundColor: '#EEF2FF' },
  measurementOptionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  measurementOptionText: { fontSize: 14, fontFamily: 'Inter-Bold', color: '#475569' },
  measurementOptionTextActive: { color: '#5B43EE' },
  subInputBox: {
    marginTop: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 8, padding: 12,
  },
  subInputText: { fontSize: 13, fontFamily: 'Inter-Medium', color: '#5B43EE' },

  imagesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  imageWrapper: { width: 70, height: 70, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  previewImage: { width: '100%', height: '100%' },
  removeImageBtn: {
    position: 'absolute', top: 4, right: 4,
    width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center'
  },

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
  categoryCardActive: { borderColor: '#5B43EE', backgroundColor: '#EEF2FF' },
  categoryNameActive: { color: '#5B43EE' },
  counterBtnActive: { borderColor: '#5B43EE', backgroundColor: '#FFF' },
  outfitDrawerCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 16, marginBottom: 16,
  },
  
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  modalContent: { padding: 20, flexShrink: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: 'Inter-Bold', color: '#0F172A' },
  closeBtn: { padding: 4 },
  modalScroll: { flexGrow: 0 },
  btnSaveDrawer: {
    backgroundColor: '#5B43EE', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 20
  },
  btnSaveDrawerText: { fontSize: 16, fontFamily: 'Inter-Bold', color: '#FFF' },
  
  termsCard: { marginTop: 24, padding: 16, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  termsTitle: { fontSize: 14, fontFamily: 'Inter-Bold', color: '#475569', marginBottom: 8 },
  termsText: { fontSize: 13, fontFamily: 'Inter-Medium', color: '#64748B', lineHeight: 20 },
});

export default NewStitchRequestScreen;
