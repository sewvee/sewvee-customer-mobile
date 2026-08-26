import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Dimensions, ScrollView, Modal, FlatList, ActivityIndicator, Platform,
  PanResponder, TextInput, KeyboardAvoidingView, StatusBar
} from 'react-native';
import { Colors, Shadow } from '../constants/theme';
import { X, ImagePlus, Download, Share2, Check, Folder, ChevronRight, ArrowLeft, Crop, Trash2, PenTool, Type, RotateCcw, Minus, Plus } from 'lucide-react-native';
import ViewShot from 'react-native-view-shot';
import ImageCropPicker from 'react-native-image-crop-picker';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import Svg, { Path } from 'react-native-svg';
import { useToast } from '../context/ToastContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LAYOUTS = [
  { id: '1_single', slots: 1, label: 'Single' },
  { id: '2_vertical', slots: 2, label: '2 Vertical' },
  { id: '2_horizontal', slots: 2, label: '2 Horizontal' },
  { id: '3_grid', slots: 3, label: '3 Grid' },
  { id: '3_grid_v', slots: 3, label: '3 Stacked' },
  { id: '4_grid', slots: 4, label: '4 Grid' },
];

const MARKER_COLORS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#FFFFFF', '#000000'];
const TEXT_COLORS   = ['#000000', '#EF4444', '#3B82F6', '#22C55E', '#F97316', '#8B5CF6', '#FFFFFF'];

const CollageMaker = ({ visible, onClose, onSaveReference, galleryFolders = [], initialImage = null }) => {
  const { showToast } = useToast();
  
  // Collage State
  const [selectedLayout, setSelectedLayout] = useState(LAYOUTS[0]);
  const [images, setImages] = useState({});
  const [originalImages, setOriginalImages] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeSlot, setActiveSlot] = useState(null);
  
  const viewShotRef = useRef(null);

  // Gallery Picker State
  const [sourcePickerVisible, setSourcePickerVisible] = useState(false);
  const [galleryBrowserVisible, setGalleryBrowserVisible] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(null);

  // Editing & Annotation State
  const [activeTool, setActiveTool] = useState('select'); // 'select', 'marker', 'text'
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);
  const [markerColor, setMarkerColor] = useState('#EF4444');
  const [markerWidth, setMarkerWidth] = useState(4);
  
  const [textItems, setTextItems] = useState([]);
  const [selectedTextId, setSelectedTextId] = useState(null);
  const [addingText, setAddingText] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [fontSize, setFontSize] = useState(20);
  const [pendingPos, setPendingPos] = useState(null);
  const [editingTextId, setEditingTextId] = useState(null);
  
  const panRefs = useRef({});
  const textItemsRef = useRef(textItems);
  textItemsRef.current = textItems;

  // Reset state when opened
  useEffect(() => {
    if (visible) {
      if (initialImage) {
        setImages({ 0: initialImage });
        setOriginalImages({ 0: initialImage });
        setSelectedLayout(LAYOUTS.find(l => l.id === '1_single') || LAYOUTS[0]);
      } else {
        setImages({});
        setOriginalImages({});
      }
      setActiveSlot(null);
      setPaths([]);
      setTextItems([]);
      setActiveTool('select');
    }
  }, [visible, initialImage]);

  // Handle slot tap
  const handleSlotPress = (index) => {
    setActiveSlot(index);
    if (!images[index]) {
      setSourcePickerVisible(true);
    }
  };

  // Image Picking
  const handlePickFromPhone = () => {
    setSourcePickerVisible(false);
    ImageCropPicker.openPicker({ cropping: false, mediaType: 'photo' })
      .then(originalImage => {
        setOriginalImages(prev => ({ ...prev, [activeSlot]: originalImage.path }));
        setImages(prev => ({ ...prev, [activeSlot]: originalImage.path }));
      })
      .catch(e => console.log('pick cancelled', e));
  };
  const handleGalleryImageSelect = (imgUri) => {
    setImages(prev => ({ ...prev, [activeSlot]: imgUri }));
    setOriginalImages(prev => ({ ...prev, [activeSlot]: imgUri }));
    setGalleryBrowserVisible(false);
    setSelectedFolder(null);
  };
  const handleRemovePhoto = () => {
    setImages(prev => { const n = {...prev}; delete n[activeSlot]; return n; });
    setOriginalImages(prev => { const n = {...prev}; delete n[activeSlot]; return n; });
    setActiveSlot(null);
  };

  const handleGlobalCrop = async () => {
    let slotToCrop = activeSlot;
    if (slotToCrop == null || !images[slotToCrop]) {
      const firstSlot = Object.keys(images).find(k => images[k]);
      if (firstSlot) slotToCrop = firstSlot;
    }
    if (!slotToCrop || !images[slotToCrop]) {
      showToast("Please select or add a photo to crop first", "error");
      return;
    }
    let sourcePath = originalImages[slotToCrop] || images[slotToCrop];

    if (sourcePath && sourcePath.startsWith('http')) {
      try {
        const localPath = `${RNFS.CachesDirectoryPath}/temp_crop_${Date.now()}.jpg`;
        await RNFS.downloadFile({ fromUrl: sourcePath, toFile: localPath }).promise;
        sourcePath = Platform.OS === 'android' ? `file://${localPath}` : localPath;
      } catch (err) {
        showToast("Failed to download image for cropping", "error");
        return;
      }
    } else if (Platform.OS === 'android' && sourcePath && !sourcePath.startsWith('file://')) {
      sourcePath = 'file://' + sourcePath;
    }

    ImageCropPicker.openCropper({ path: sourcePath, freeStyleCropEnabled: true, cropperToolbarTitle: 'Crop Photo' })
      .then(img => {
        setImages(prev => ({ ...prev, [slotToCrop]: img.path }));
        setActiveSlot(slotToCrop);
      })
      .catch(e => console.log('Crop cancelled', e));
  };

  // Drawing & Text Logic (PanResponders)
  const markerColorRef = useRef(markerColor);
  const markerWidthRef = useRef(markerWidth);
  markerColorRef.current = markerColor;
  markerWidthRef.current = markerWidth;

  const canvasPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX: x, locationY: y } = e.nativeEvent;
        setCurrentPath({ d: `M ${x} ${y}`, color: markerColorRef.current, width: markerWidthRef.current });
      },
      onPanResponderMove: (e) => {
        const { locationX: x, locationY: y } = e.nativeEvent;
        setCurrentPath(prev => prev ? { ...prev, d: `${prev.d} L ${x} ${y}` } : null);
      },
      onPanResponderRelease: () => {
        setCurrentPath(prev => {
          if (prev) setPaths(p => [...p, prev]);
          return null;
        });
      },
    })
  ).current;

  const textTapPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => false,
      onPanResponderGrant: (e) => {
        const { locationX: x, locationY: y } = e.nativeEvent;
        setSelectedTextId(null);
        setPendingPos({ x, y });
        setDraftText('');
        setAddingText(true);
      },
    })
  ).current;

  const makeTextPan = useCallback((id) => {
    if (!panRefs.current[id]) {
      let ox = 0, oy = 0;
      panRefs.current[id] = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          setSelectedTextId(id);
          if (activeTool !== 'text') setActiveTool('text');
          const item = textItemsRef.current.find(t => t.id === id);
          if (item) {
            ox = item.x;
            oy = item.y;
          }
        },
        onPanResponderMove: (e, g) => {
          setTextItems(prev => prev.map(t => t.id === id ? { ...t, x: ox + g.dx, y: oy + g.dy } : t));
        },
        onPanResponderRelease: (e, g) => {
          if (Math.abs(g.dx) < 5 && Math.abs(g.dy) < 5) {
            const item = textItemsRef.current.find(t => t.id === id);
            if (item) {
              setDraftText(item.text);
              setTextColor(item.color);
              setFontSize(item.fontSize);
              setEditingTextId(id);
              setAddingText(true);
            }
          }
        },
      });
    }
    return panRefs.current[id].panHandlers;
  }, [activeTool]);

  const confirmText = () => {
    if (!draftText.trim()) { setAddingText(false); setEditingTextId(null); return; }
    if (editingTextId) {
      setTextItems(prev => prev.map(t => t.id === editingTextId ? { ...t, text: draftText.trim(), color: textColor, fontSize } : t));
    } else {
      const id = Date.now().toString();
      setTextItems(prev => [...prev, {
        id, text: draftText.trim(),
        x: pendingPos ? pendingPos.x : 50, y: pendingPos ? pendingPos.y : 50,
        color: textColor, fontSize
      }]);
    }
    setEditingTextId(null);
    setAddingText(false);
    setDraftText('');
  };

  const handleUndo = () => {
    if (selectedTextId) {
      setTextItems(prev => prev.filter(t => t.id !== selectedTextId));
      setSelectedTextId(null);
      return;
    }
    if (paths.length > 0) {
      setPaths(prev => prev.slice(0, -1));
    } else if (textItems.length > 0) {
      setTextItems(prev => prev.slice(0, -1));
    }
  };
  
  const handleClear = () => {
    setPaths([]); setTextItems([]);
  };

  const renderSlot = (i) => {
    const isActive = activeSlot === i && activeTool === 'select';
    return (
      <TouchableOpacity key={i} activeOpacity={0.9} style={[s.slot, isActive && s.slotActive]} onPress={() => handleSlotPress(i)}>
        {images[i] ? <Image source={{ uri: images[i] }} style={s.slotImage} /> : <View style={s.emptySlot}><ImagePlus size={24} color={Colors.textSecondary} /><Text style={s.emptySlotText}>Tap to add</Text></View>}
        {images[i] && isActive && (
          <TouchableOpacity 
             style={s.slotDeleteBtn} 
             onPress={(e) => { 
                // Don't trigger the slot press
                if (e && e.stopPropagation) e.stopPropagation();
                // We need to pass the slot index so we can delete it directly instead of relying on state which might be weird in this closure
                setImages(prev => { const n = {...prev}; delete n[i]; return n; });
                setOriginalImages(prev => { const n = {...prev}; delete n[i]; return n; });
                setActiveSlot(null);
             }}
          >
            <Trash2 size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const captureAndSave = async (isDownload = false) => {
    setActiveSlot(null);
    if (Object.keys(images).length < selectedLayout.slots) {
      showToast('Please fill all slots before saving', 'error');
      return;
    }
    setIsProcessing(true);
    setSelectedTextId(null);
    await new Promise(r => setTimeout(r, 100)); // wait for UI
    try {
      const uri = await viewShotRef.current.capture();
      if (isDownload) {
        if (Platform.OS === 'android') {
          const dlPath = RNFS.DownloadDirectoryPath + '/Collage_' + Date.now() + '.jpg';
          await RNFS.copyFile(uri, dlPath);
          showToast('Saved to Downloads!');
        } else {
          await Share.open({ url: uri });
        }
      } else {
        onSaveReference(uri, selectedLayout.id);
      }
    } catch (e) {
      showToast('Failed to save image', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <View style={s.root}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Collage & Edit</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <X size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Layout Selector */}
        <View style={s.layoutSelector}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
            {LAYOUTS.map(layout => (
              <TouchableOpacity
                key={layout.id}
                style={[s.layoutBtn, selectedLayout.id === layout.id && s.layoutBtnActive]}
                onPress={() => setSelectedLayout(layout)}
              >
                <Text style={[s.layoutBtnText, selectedLayout.id === layout.id && s.layoutBtnTextActive]}>
                  {layout.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Collage Canvas */}
        <View style={s.canvasArea}>
          <ViewShot ref={viewShotRef} style={s.collageContainer} options={{ format: 'jpg', quality: 0.95 }}>
            {/* The Layout Slots */}
            <View style={{ flex: 1, flexDirection: selectedLayout.id.includes('horizontal') || selectedLayout.id === '4_grid' || selectedLayout.id === '3_grid_v' ? 'column' : 'row', gap: 4 }}>
              {selectedLayout.id === '1_single' ? (
                renderSlot(0)
              ) : selectedLayout.id === '3_grid_v' ? (
                <>
                  <View style={{ flex: 1 }}>{renderSlot(0)}</View>
                  <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
                    {[1, 2].map(i => renderSlot(i))}
                  </View>
                </>
              ) : (selectedLayout.id === '3_grid' || selectedLayout.id === '4_grid') ? (
                <>
                  <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
                    {[0, 1].map(i => renderSlot(i))}
                  </View>
                  <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
                    {[2, selectedLayout.id === '4_grid' ? 3 : null].filter(x => x !== null).map(i => renderSlot(i))}
                  </View>
                </>
              ) : (
                [0, 1].map(i => renderSlot(i))
              )}
            </View>

            {/* Annotations Overlay */}
            {activeTool === 'marker' && (
              <View style={StyleSheet.absoluteFill} {...canvasPan.panHandlers} />
            )}
            
            <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
              {paths.map((p, i) => <Path key={i} d={p.d} stroke={p.color} strokeWidth={p.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />)}
              {currentPath && <Path d={currentPath.d} stroke={currentPath.color} strokeWidth={currentPath.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
            </Svg>
            {textItems.map(item => (
              <View key={item.id} {...makeTextPan(item.id)} style={[s.textItem, { left: item.x, top: item.y }, selectedTextId === item.id && s.textItemSelected]}>
                <Text style={[s.annotationText, { color: item.color, fontSize: item.fontSize }]}>{item.text}</Text>
                {selectedTextId === item.id && (
                  <TouchableOpacity style={s.deleteTextBtn} onPress={() => setTextItems(p => p.filter(t => t.id !== item.id))}>
                    <Trash2 size={13} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ViewShot>
        </View>

        

        {/* Toolbar */}
        <View style={s.toolbar}>
           <TouchableOpacity style={[s.toolBtn, activeTool === 'select' && s.toolBtnActive]} onPress={() => setActiveTool('select')}>
             <ImagePlus size={22} color={activeTool === 'select' ? Colors.primary : Colors.textSecondary} />
             <Text style={[s.toolLabel, activeTool === 'select' && { color: Colors.primary }]}>Select</Text>
           </TouchableOpacity>
           <TouchableOpacity style={s.toolBtn} onPress={handleGlobalCrop}>
             <Crop size={22} color={Colors.textSecondary} />
             <Text style={s.toolLabel}>Crop</Text>
           </TouchableOpacity>
           <TouchableOpacity style={[s.toolBtn, activeTool === 'marker' && s.toolBtnActive]} onPress={() => setActiveTool('marker')}>
             <PenTool size={22} color={activeTool === 'marker' ? Colors.primary : Colors.textSecondary} />
             <Text style={[s.toolLabel, activeTool === 'marker' && { color: Colors.primary }]}>Marker</Text>
           </TouchableOpacity>
           <TouchableOpacity style={[s.toolBtn, activeTool === 'text' && s.toolBtnActive]} onPress={() => {
    setActiveTool('text');
    setSelectedTextId(null);
    setPendingPos({ x: 100, y: 100 });
    setDraftText('');
    setAddingText(true);
  }}>
             <Type size={22} color={activeTool === 'text' ? Colors.primary : Colors.textSecondary} />
             <Text style={[s.toolLabel, activeTool === 'text' && { color: Colors.primary }]}>Text</Text>
           </TouchableOpacity>
           <TouchableOpacity style={s.toolBtn} onPress={handleUndo}>
             <RotateCcw size={22} color={Colors.textSecondary} />
             <Text style={s.toolLabel}>Undo</Text>
           </TouchableOpacity>
        </View>

        {/* Bottom Actions */}
        <View style={s.actionsFooter}>
          <TouchableOpacity style={s.actionBtn} onPress={() => captureAndSave(true)} disabled={isProcessing}>
            <Download size={20} color={Colors.textPrimary} />
            <Text style={s.actionBtnText}>Download</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtnPrimary} onPress={() => captureAndSave(false)} disabled={isProcessing}>
            {isProcessing ? <ActivityIndicator color="#fff" /> : <Check size={20} color="#fff" />}
            <Text style={s.actionBtnTextPrimary}>Save</Text>
          </TouchableOpacity>
        </View>

      </View>

      {/* Pick Source Modal */}
      <Modal visible={sourcePickerVisible} transparent animationType="fade">
        <View style={s.pickerOverlay}>
          <View style={s.pickerSheet}>
            <Text style={s.pickerTitle}>Add Photo</Text>
            <Text style={s.pickerSubtitle}>Choose a source</Text>
            <TouchableOpacity style={s.pickerOption} onPress={handlePickFromPhone}>
              <View style={s.pickerOptionIcon}><ImagePlus size={24} color={Colors.primary} /></View>
              <View style={{ flex: 1 }}><Text style={s.pickerOptionTitle}>Phone Gallery</Text></View>
              <ChevronRight size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={s.pickerOption} onPress={() => { setSourcePickerVisible(false); setGalleryBrowserVisible(true); }}>
              <View style={s.pickerOptionIcon}><Folder size={24} color={Colors.primary} /></View>
              <View style={{ flex: 1 }}><Text style={s.pickerOptionTitle}>Sewvee Gallery</Text></View>
              <ChevronRight size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelPickerBtn} onPress={() => setSourcePickerVisible(false)}>
              <Text style={s.cancelPickerText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Sewvee Gallery Modal */}
      <Modal visible={galleryBrowserVisible} animationType="slide">
        <View style={s.galleryBrowserContainer}>
          <View style={s.galleryBrowserHeader}>
            <TouchableOpacity onPress={() => selectedFolder ? setSelectedFolder(null) : setGalleryBrowserVisible(false)} style={{ padding: 6 }}>
              <ArrowLeft size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={s.galleryBrowserTitle}>{selectedFolder ? selectedFolder.name : 'My Gallery'}</Text>
            <TouchableOpacity onPress={() => { setGalleryBrowserVisible(false); setSelectedFolder(null); }} style={{ padding: 6 }}>
              <X size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          {!selectedFolder ? (
            <FlatList
              data={galleryFolders}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.folderPickerRow} onPress={() => setSelectedFolder(item)}>
                  <View style={s.folderPickerIcon}><Folder size={22} color={Colors.primary} fill="#EEF2FF" /></View>
                  <View style={{ flex: 1 }}><Text style={s.folderPickerName}>{item.name}</Text></View>
                  <ChevronRight size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
              )}
            />
          ) : (
            <FlatList
              data={selectedFolder.images}
              keyExtractor={item => item.id}
              numColumns={3}
              contentContainerStyle={{ padding: 12 }}
              columnWrapperStyle={{ gap: 6, marginBottom: 6 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.galleryThumb} onPress={() => handleGalleryImageSelect(item.url)}>
                  <Image source={{ uri: item.url }} style={s.galleryThumbImage} />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>

      {/* Text input overlay */}
      {addingText && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.overlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setAddingText(false)} />
          <View style={s.inputCard}>
            <Text style={s.inputTitle}>Add Text Annotation</Text>
            <TextInput
              style={[s.inputField, { color: textColor, borderColor: textColor }]}
              placeholder="Type your annotation..."
              placeholderTextColor="#475569"
              value={draftText}
              onChangeText={setDraftText}
              autoFocus
              multiline
              maxLength={120}
            />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
              <TouchableOpacity style={s.cancelTextBtn} onPress={() => setAddingText(false)}>
                <Text style={{ color: '#94A3B8', fontFamily: 'Inter-SemiBold', fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.placeBtn} onPress={confirmText}>
                <Check size={15} color="#fff" />
                <Text style={{ color: '#fff', fontFamily: 'Inter-Bold', fontSize: 14, marginLeft: 6 }}>Place</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

    </Modal>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  headerTitle: { fontSize: 18, fontFamily: 'Inter-Bold', color: Colors.textPrimary },
  closeBtn: { padding: 4 },
  layoutSelector: { paddingVertical: 12, backgroundColor: '#fff' },
  layoutBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0' },
  layoutBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  layoutBtnText: { fontSize: 13, fontFamily: 'Inter-SemiBold', color: Colors.textSecondary },
  layoutBtnTextActive: { color: 'white' },
  canvasArea: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  collageContainer: { width: SCREEN_WIDTH - 40, height: SCREEN_WIDTH - 40, backgroundColor: '#F1F5F9', padding: 4, borderRadius: 12 },
  slot: { flex: 1, backgroundColor: '#E2E8F0', overflow: 'hidden', borderRadius: 8, borderWidth: 2, borderColor: 'transparent' },
  slotActive: { borderColor: Colors.primary },
  slotImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  emptySlot: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptySlotText: { fontSize: 12, fontFamily: 'Inter-Medium', color: Colors.textSecondary, marginTop: 4 },
  slotDeleteBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(239, 68, 68, 0.95)', padding: 8, borderRadius: 20, zIndex: 10, ...Shadow.subtle },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF2F2', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  removeBtnText: { color: '#EF4444', fontFamily: 'Inter-SemiBold', fontSize: 13 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, borderTopWidth: 1, borderColor: '#F1F5F9', backgroundColor: '#F8FAFC' },
  toolBtn: { alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  toolBtnActive: { backgroundColor: '#EEF2FF' },
  toolLabel: { fontSize: 11, fontFamily: 'Inter-SemiBold', color: Colors.textSecondary },
  actionsFooter: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20, paddingTop: 10, gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9', paddingVertical: 14, borderRadius: 12, gap: 8 },
  actionBtnText: { fontSize: 15, fontFamily: 'Inter-SemiBold', color: Colors.textPrimary },
  actionBtnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 12, gap: 8, ...Shadow.subtle },
  actionBtnTextPrimary: { fontSize: 15, fontFamily: 'Inter-SemiBold', color: 'white' },
  textItem: { position: 'absolute', padding: 4 },
  textItemSelected: { borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 4, borderStyle: 'dashed' },
  annotationText: { fontFamily: 'Inter-Bold' },
  deleteTextBtn: { position: 'absolute', top: -11, right: -11, backgroundColor: '#EF4444', borderRadius: 11, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 100 },
  inputCard: { backgroundColor: '#1E293B', padding: 20, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 42 },
  inputTitle: { fontSize: 15, fontFamily: 'Inter-Bold', color: '#fff', marginBottom: 12 },
  inputField: { backgroundColor: '#0F172A', borderRadius: 10, padding: 12, fontSize: 15, fontFamily: 'Inter-Medium', borderWidth: 1.5, minHeight: 72, color: '#fff' },
  cancelTextBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, backgroundColor: '#334155', borderRadius: 10 },
  placeBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, backgroundColor: Colors.primary, borderRadius: 10 },
  
  // Pickers & Modals
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  pickerTitle: { fontSize: 18, fontFamily: 'Inter-Bold', color: Colors.textPrimary, marginBottom: 6 },
  pickerSubtitle: { fontSize: 13, fontFamily: 'Inter-Medium', color: Colors.textSecondary, marginBottom: 20 },
  pickerOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  pickerOptionIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  pickerOptionTitle: { fontSize: 15, fontFamily: 'Inter-Bold', color: Colors.textPrimary },
  cancelPickerBtn: { alignItems: 'center', paddingVertical: 16, marginTop: 4 },
  cancelPickerText: { fontSize: 15, fontFamily: 'Inter-SemiBold', color: Colors.textSecondary },
  galleryBrowserContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  galleryBrowserHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: 'white' },
  galleryBrowserTitle: { fontSize: 17, fontFamily: 'Inter-Bold', color: Colors.textPrimary },
  folderPickerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  folderPickerIcon: { width: 42, height: 42, borderRadius: 10, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  folderPickerName: { fontSize: 14, fontFamily: 'Inter-Bold', color: Colors.textPrimary },
  galleryThumb: { flex: 1, aspectRatio: 1, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  galleryThumbImage: { width: '100%', height: '100%', resizeMode: 'cover' },
});

export default CollageMaker;
