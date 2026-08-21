import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Dimensions, ScrollView, Modal, FlatList, ActivityIndicator, Platform,
} from 'react-native';
import { Colors, Shadow } from '../constants/theme';
import { X, ImagePlus, Download, Share2, Check, Folder, ChevronRight, ArrowLeft, Crop, Trash2 } from 'lucide-react-native';
import ViewShot from 'react-native-view-shot';
import ImageCropPicker from 'react-native-image-crop-picker';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import { useToast } from '../context/ToastContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LAYOUTS = [
  { id: '2_vertical', slots: 2, label: '2 Vertical' },
  { id: '2_horizontal', slots: 2, label: '2 Horizontal' },
  { id: '3_grid', slots: 3, label: '3 Grid' },
  { id: '4_grid', slots: 4, label: '4 Grid' },
];

const CollageMaker = ({ visible, onClose, onSaveReference, galleryFolders = [] }) => {
  const { showToast } = useToast();
  const [selectedLayout, setSelectedLayout] = useState(LAYOUTS[0]);
  const [images, setImages] = useState({});
  const [originalImages, setOriginalImages] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const viewShotRef = useRef(null);

  // Photo source picker state
  const [sourcePickerVisible, setSourcePickerVisible] = useState(false);
  const [slotActionVisible, setSlotActionVisible] = useState(false);
  const [activeSlot, setActiveSlot] = useState(null);

  // My Gallery browser state
  const [galleryBrowserVisible, setGalleryBrowserVisible] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(null); // null = folder list

  // Open source picker when user taps a slot
  const handleSlotPress = (slotIndex) => {
    setActiveSlot(slotIndex);
    if (images[slotIndex]) {
      setSlotActionVisible(true);
    } else {
      setSourcePickerVisible(true);
    }
  };

  // Option 1: From Phone Gallery (pick original, then crop)
  const handlePickFromPhone = () => {
    setSourcePickerVisible(false);
    ImageCropPicker.openPicker({
      cropping: false,
      mediaType: 'photo',
    }).then(originalImage => {
      // Store the original uncropped image
      setOriginalImages(prev => ({ ...prev, [activeSlot]: originalImage.path }));
      
      // Immediately open cropper on the original image
      return ImageCropPicker.openCropper({
        path: originalImage.path,
        freeStyleCropEnabled: true,
      });
    }).then(croppedImage => {
      setImages(prev => ({ ...prev, [activeSlot]: croppedImage.path }));
    }).catch(e => {
      console.log('Image pick/crop cancelled', e);
    });
  };

  // Crop existing photo (from the original)
  const handleCropExisting = () => {
    setSlotActionVisible(false);
    const sourcePath = originalImages[activeSlot] || images[activeSlot];
    ImageCropPicker.openCropper({
      path: sourcePath,
      freeStyleCropEnabled: true,
    }).then(image => {
      setImages(prev => ({ ...prev, [activeSlot]: image.path }));
    }).catch(e => {
      console.log('Crop cancelled', e);
    });
  };

  // Remove existing photo
  const handleRemovePhoto = () => {
    setImages(prev => {
      const newImgs = { ...prev };
      delete newImgs[activeSlot];
      return newImgs;
    });
    setOriginalImages(prev => {
      const newImgs = { ...prev };
      delete newImgs[activeSlot];
      return newImgs;
    });
    setSlotActionVisible(false);
  };

  // Option 2: Browse My Gallery
  const handlePickFromGallery = () => {
    setSourcePickerVisible(false);
    setSelectedFolder(null);
    setGalleryBrowserVisible(true);
  };

  // Select an image from gallery
  const handleGalleryImageSelect = (imgUri) => {
    setImages(prev => ({ ...prev, [activeSlot]: imgUri }));
    setOriginalImages(prev => ({ ...prev, [activeSlot]: imgUri }));
    setGalleryBrowserVisible(false);
    setSelectedFolder(null);
  };

  const captureCollage = async () => {
    try {
      if (Object.keys(images).length < selectedLayout.slots) {
        showToast('Please fill all slots before saving/sharing', 'error');
        return null;
      }
      setIsProcessing(true);
      const uri = await viewShotRef.current.capture();
      setIsProcessing(false);
      return uri;
    } catch (err) {
      console.log('Capture error', err);
      setIsProcessing(false);
      showToast('Failed to capture collage', 'error');
      return null;
    }
  };

  const handleDownload = async () => {
    const uri = await captureCollage();
    if (!uri) return;
    try {
      if (Platform.OS === 'android') {
        const fileName = `collage_${Date.now()}.jpg`;
        const destPath = `${RNFS.PicturesDirectoryPath}/${fileName}`;
        await RNFS.copyFile(uri, destPath);
        await RNFS.scanFile(destPath); // Tells Android to scan for new image to show in Gallery
        showToast('Collage saved to your Gallery!', 'success');
      } else {
        // On iOS, saving directly to Camera Roll requires a native package not currently installed.
        // We fallback to the Share sheet which natively includes a "Save Image" option.
        await Share.open({
          url: uri,
          title: 'Save Collage',
          failOnCancel: false,
        });
      }
    } catch (err) {
      if (err && err.message && err.message.includes('User did not share')) {
        return; // User cancelled, ignore
      }
      showToast('Failed to save collage', 'error');
    }
  };

  const handleShare = async () => {
    const uri = await captureCollage();
    if (!uri) return;
    try {
      await Share.open({ url: uri, title: 'My Sewvee Design Ideas' });
    } catch (err) {
      console.log('Share error', err);
    }
  };

  const handleSaveAsReference = async () => {
    const uri = await captureCollage();
    if (!uri) return;
    if (onSaveReference) {
      onSaveReference(uri);
    }
  };

  const renderSlot = (index, style) => (
    <TouchableOpacity
      style={[styles.slot, style]}
      onPress={() => handleSlotPress(index)}
      activeOpacity={0.8}
    >
      {images[index] ? (
        <Image source={{ uri: images[index] }} style={styles.slotImage} />
      ) : (
        <View style={styles.emptySlot}>
          <ImagePlus size={24} color={Colors.textSecondary} />
          <Text style={styles.emptySlotText}>Tap to add</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderCollageView = () => {
    const s = selectedLayout.id;
    return (
      <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 1.0 }} style={styles.collageContainer}>
        {s === '2_vertical' && (
          <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
            {renderSlot(0, { flex: 1 })}
            {renderSlot(1, { flex: 1 })}
          </View>
        )}
        {s === '2_horizontal' && (
          <View style={{ flex: 1, flexDirection: 'column', gap: 4 }}>
            {renderSlot(0, { flex: 1 })}
            {renderSlot(1, { flex: 1 })}
          </View>
        )}
        {s === '3_grid' && (
          <View style={{ flex: 1, flexDirection: 'column', gap: 4 }}>
            {renderSlot(0, { flex: 1 })}
            <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
              {renderSlot(1, { flex: 1 })}
              {renderSlot(2, { flex: 1 })}
            </View>
          </View>
        )}
        {s === '4_grid' && (
          <View style={{ flex: 1, flexDirection: 'column', gap: 4 }}>
            <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
              {renderSlot(0, { flex: 1 })}
              {renderSlot(1, { flex: 1 })}
            </View>
            <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
              {renderSlot(2, { flex: 1 })}
              {renderSlot(3, { flex: 1 })}
            </View>
          </View>
        )}
      </ViewShot>
    );
  };

  return (
    <>
      {/* ── Slot Action Modal ── */}
      <Modal visible={slotActionVisible} transparent animationType="slide">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Photo Options</Text>
            <Text style={styles.pickerSubtitle}>What would you like to do with this photo?</Text>

            <TouchableOpacity style={styles.pickerOption} onPress={() => { setSlotActionVisible(false); setSourcePickerVisible(true); }}>
              <View style={styles.pickerOptionIcon}>
                <ImagePlus size={24} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pickerOptionTitle}>Change Photo</Text>
                <Text style={styles.pickerOptionSub}>Replace with a new image</Text>
              </View>
              <ChevronRight size={18} color={Colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.pickerOption} onPress={handleCropExisting}>
              <View style={styles.pickerOptionIcon}>
                <Crop size={24} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pickerOptionTitle}>Crop Photo</Text>
                <Text style={styles.pickerOptionSub}>Adjust framing and dimensions</Text>
              </View>
              <ChevronRight size={18} color={Colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.pickerOption, { borderColor: '#FEE2E2', backgroundColor: '#FEF2F2' }]} onPress={handleRemovePhoto}>
              <View style={[styles.pickerOptionIcon, { backgroundColor: '#FEE2E2' }]}>
                <Trash2 size={24} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pickerOptionTitle, { color: '#EF4444' }]}>Remove Photo</Text>
                <Text style={styles.pickerOptionSub}>Clear this slot</Text>
              </View>
              <ChevronRight size={18} color={Colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelPickerBtn} onPress={() => setSlotActionVisible(false)}>
              <Text style={styles.cancelPickerText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Main Collage Maker Modal ── */}
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Collage Maker</Text>
              <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                <X size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Layout Selector */}
            <View style={styles.layoutSelector}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
                {LAYOUTS.map(l => (
                  <TouchableOpacity
                    key={l.id}
                    style={[styles.layoutBtn, selectedLayout.id === l.id && styles.layoutBtnActive]}
                    onPress={() => { setSelectedLayout(l); setImages({}); setOriginalImages({}); }}
                  >
                    <Text style={[styles.layoutBtnText, selectedLayout.id === l.id && styles.layoutBtnTextActive]}>
                      {l.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Canvas View */}
            <View style={styles.canvasArea}>
              {renderCollageView()}
            </View>

            {/* Actions */}
            <View style={styles.actionsFooter}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleDownload} disabled={isProcessing}>
                <Download size={20} color={Colors.textPrimary} />
                <Text style={styles.actionBtnText}>Download</Text>
              </TouchableOpacity>
              {onSaveReference && (
                <TouchableOpacity style={styles.actionBtnPrimary} onPress={handleSaveAsReference} disabled={isProcessing}>
                  <Check size={20} color="white" />
                  <Text style={styles.actionBtnTextPrimary}>Save</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Photo Source Picker Modal ── */}
      <Modal visible={sourcePickerVisible} transparent animationType="slide">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Choose Photo Source</Text>
            <Text style={styles.pickerSubtitle}>Where would you like to pick the photo from?</Text>

            <TouchableOpacity style={styles.pickerOption} onPress={handlePickFromGallery}>
              <View style={styles.pickerOptionIcon}>
                <Folder size={24} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pickerOptionTitle}>My Gallery</Text>
                <Text style={styles.pickerOptionSub}>Pick from your saved design folders</Text>
              </View>
              <ChevronRight size={18} color={Colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.pickerOption} onPress={handlePickFromPhone}>
              <View style={styles.pickerOptionIcon}>
                <ImagePlus size={24} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pickerOptionTitle}>Phone Gallery</Text>
                <Text style={styles.pickerOptionSub}>Choose any photo from your device</Text>
              </View>
              <ChevronRight size={18} color={Colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelPickerBtn} onPress={() => setSourcePickerVisible(false)}>
              <Text style={styles.cancelPickerText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── My Gallery Browser Modal ── */}
      <Modal visible={galleryBrowserVisible} animationType="slide">
        <View style={styles.galleryBrowserContainer}>
          <View style={styles.galleryBrowserHeader}>
            <TouchableOpacity
              onPress={() => {
                if (selectedFolder) {
                  setSelectedFolder(null);
                } else {
                  setGalleryBrowserVisible(false);
                }
              }}
              style={{ padding: 6 }}
            >
              <ArrowLeft size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.galleryBrowserTitle}>
              {selectedFolder ? selectedFolder.name : 'My Gallery'}
            </Text>
            <TouchableOpacity onPress={() => { setGalleryBrowserVisible(false); setSelectedFolder(null); }} style={{ padding: 6 }}>
              <X size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {!selectedFolder ? (
            // Show folder list
            <FlatList
              data={galleryFolders}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 16 }}
              ListEmptyComponent={
                <View style={styles.emptyBrowserState}>
                  <Folder size={48} color={Colors.textSecondary} />
                  <Text style={styles.emptyBrowserText}>No folders yet. Add photos to your Gallery first.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.folderPickerRow}
                  onPress={() => setSelectedFolder(item)}
                >
                  <View style={styles.folderPickerIcon}>
                    <Folder size={22} color={Colors.primary} fill="#EEF2FF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.folderPickerName}>{item.name}</Text>
                    <Text style={styles.folderPickerCount}>{item.images?.length || 0} images</Text>
                  </View>
                  <ChevronRight size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
              )}
            />
          ) : (
            // Show images in selected folder
            selectedFolder.images?.length > 0 ? (
              <FlatList
                data={selectedFolder.images}
                keyExtractor={item => item.id}
                numColumns={3}
                contentContainerStyle={{ padding: 12 }}
                columnWrapperStyle={{ gap: 6, marginBottom: 6 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.galleryThumb}
                    onPress={() => handleGalleryImageSelect(item.url)}
                  >
                    <Image source={{ uri: item.url }} style={styles.galleryThumbImage} />
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View style={styles.emptyBrowserState}>
                <Text style={styles.emptyBrowserText}>No images in this folder.</Text>
              </View>
            )
          )}
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // Main modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 30, ...Shadow.large },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  headerTitle: { fontSize: 18, fontFamily: 'Inter-Bold', color: Colors.textPrimary },
  layoutSelector: { paddingVertical: 16, backgroundColor: '#F8FAFC' },
  layoutBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0' },
  layoutBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  layoutBtnText: { fontSize: 13, fontFamily: 'Inter-SemiBold', color: Colors.textSecondary },
  layoutBtnTextActive: { color: 'white' },
  canvasArea: { padding: 20, alignItems: 'center' },
  collageContainer: { width: SCREEN_WIDTH - 40, height: SCREEN_WIDTH - 40, backgroundColor: '#F1F5F9', padding: 4, borderRadius: 12 },
  slot: { backgroundColor: '#E2E8F0', overflow: 'hidden', borderRadius: 8 },
  slotImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  emptySlot: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptySlotText: { fontSize: 12, fontFamily: 'Inter-Medium', color: Colors.textSecondary, marginTop: 4 },
  actionsFooter: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginTop: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9', paddingVertical: 14, borderRadius: 12, gap: 8 },
  actionBtnText: { fontSize: 15, fontFamily: 'Inter-SemiBold', color: Colors.textPrimary },
  actionBtnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 12, gap: 8, ...Shadow.subtle },
  actionBtnTextPrimary: { fontSize: 15, fontFamily: 'Inter-SemiBold', color: 'white' },
  saveAsRefBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingVertical: 14, marginHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: Colors.primary },
  saveAsRefBtnText: { fontSize: 15, fontFamily: 'Inter-SemiBold', color: Colors.primary, marginLeft: 8 },

  // Source picker
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  pickerTitle: { fontSize: 18, fontFamily: 'Inter-Bold', color: Colors.textPrimary, marginBottom: 6 },
  pickerSubtitle: { fontSize: 13, fontFamily: 'Inter-Medium', color: Colors.textSecondary, marginBottom: 20 },
  pickerOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  pickerOptionIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  pickerOptionTitle: { fontSize: 15, fontFamily: 'Inter-Bold', color: Colors.textPrimary },
  pickerOptionSub: { fontSize: 12, fontFamily: 'Inter-Medium', color: Colors.textSecondary, marginTop: 2 },
  cancelPickerBtn: { alignItems: 'center', paddingVertical: 16, marginTop: 4 },
  cancelPickerText: { fontSize: 15, fontFamily: 'Inter-SemiBold', color: Colors.textSecondary },

  // Gallery browser
  galleryBrowserContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  galleryBrowserHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: 'white' },
  galleryBrowserTitle: { fontSize: 17, fontFamily: 'Inter-Bold', color: Colors.textPrimary },
  folderPickerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  folderPickerIcon: { width: 42, height: 42, borderRadius: 10, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  folderPickerName: { fontSize: 14, fontFamily: 'Inter-Bold', color: Colors.textPrimary },
  folderPickerCount: { fontSize: 12, fontFamily: 'Inter-Medium', color: Colors.textSecondary, marginTop: 2 },
  galleryThumb: { flex: 1, aspectRatio: 1, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  galleryThumbImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  emptyBrowserState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 60 },
  emptyBrowserText: { fontSize: 14, fontFamily: 'Inter-Medium', color: Colors.textSecondary, textAlign: 'center', marginTop: 16 },
});

export default CollageMaker;
