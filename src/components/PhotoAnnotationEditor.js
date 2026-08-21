import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  PanResponder,
  Dimensions,
  StyleSheet,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';
import ImageCropPicker from 'react-native-image-crop-picker';
import { Type, PenTool, Trash2, RotateCcw, Check, X, Minus, Plus, Crop } from 'lucide-react-native';
import { Colors } from '../constants/theme';

const MARKER_COLORS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#FFFFFF', '#000000'];
const TEXT_COLORS   = ['#000000', '#EF4444', '#3B82F6', '#22C55E', '#F97316', '#8B5CF6', '#FFFFFF'];

export default function PhotoAnnotationEditor({ visible, photoUri, onClose, onDone }) {
  const viewShotRef = useRef(null);

  const [activeTool, setActiveTool] = useState('text');
  const [internalPhotoUri, setInternalPhotoUri] = useState(photoUri);
  const [editingTextId, setEditingTextId] = useState(null);
  const [imgDims, setImgDims] = useState(null);
  const [canvasLayout, setCanvasLayout] = useState({ width: 0, height: 0 });

  React.useEffect(() => {
    if (photoUri) setInternalPhotoUri(photoUri);
  }, [photoUri]);

  React.useEffect(() => {
    if (internalPhotoUri) {
      Image.getSize(internalPhotoUri, (w, h) => setImgDims({ w, h }), () => setImgDims(null));
    }
  }, [internalPhotoUri]);

  // --- Text annotations ---
  const [textItems, setTextItems] = useState([]);
  const [selectedTextId, setSelectedTextId] = useState(null);
  const [addingText, setAddingText] = useState(false);
  const [pendingPos, setPendingPos] = useState(null);
  const [draftText, setDraftText] = useState('');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [fontSize, setFontSize] = useState(20);

  // --- Marker ---
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);
  const [markerColor, setMarkerColor] = useState('#EF4444');
  const [markerWidth, setMarkerWidth] = useState(4);

  const panRefs = useRef({});

  // -- canvas PanResponder (marker) --
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

  // -- text tap PanResponder --
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

  // -- per-item drag PanResponder --
  const makeTextPan = useCallback((id) => {
    if (!panRefs.current[id]) {
      let ox = 0, oy = 0;
      panRefs.current[id] = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          setSelectedTextId(id);
          setTextItems(prev => {
            const item = prev.find(t => t.id === id);
            if (item) { ox = item.x; oy = item.y; }
            return prev;
          });
        },
        onPanResponderMove: (e, g) => {
          setTextItems(prev =>
            prev.map(t => t.id === id ? { ...t, x: ox + g.dx, y: oy + g.dy } : t)
          );
        },
        onPanResponderRelease: (e, g) => {
          if (Math.abs(g.dx) < 5 && Math.abs(g.dy) < 5) {
            setTextItems(prev => {
              const item = prev.find(t => t.id === id);
              if (item) {
                setDraftText(item.text);
                setTextColor(item.color);
                setFontSize(item.fontSize);
                setEditingTextId(id);
                setAddingText(true);
              }
              return prev;
            });
          }
        },
      });
    }
    return panRefs.current[id].panHandlers;
  }, []);

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
    if (activeTool === 'marker') setPaths(prev => prev.slice(0, -1));
    else setTextItems(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    Alert.alert('Clear All', 'Remove all annotations?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => { setPaths([]); setTextItems([]); } },
    ]);
  };

  const deleteSelectedText = () => {
    setTextItems(prev => prev.filter(t => t.id !== selectedTextId));
    delete panRefs.current[selectedTextId];
    setSelectedTextId(null);
  };

  const handleDone = async () => {
    setSelectedTextId(null);
    await new Promise(r => setTimeout(r, 100));
    try {
      const uri = await viewShotRef.current.capture();
      onDone(uri);
    } catch (e) {
      console.log('capture error', e);
    }
  };

  const handleClose = () => {
    setPaths([]); setTextItems([]); setCurrentPath(null);
    setAddingText(false); setSelectedTextId(null);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <StatusBar backgroundColor="#000" barStyle="light-content" />
      <View style={s.root}>

        {/* Top bar */}
        <View style={s.topBar}>
          <TouchableOpacity onPress={handleClose} style={s.iconBtn}>
            <X size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={s.topTitle}>Annotate Photo</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity 
              style={[s.iconBtn, { backgroundColor: '#334155', borderRadius: 8, paddingHorizontal: 12 }]}
              onPress={() => {
                ImageCropPicker.openCropper({
                  path: internalPhotoUri,
                  freeStyleCropEnabled: true,
                }).then(img => setInternalPhotoUri(img.path)).catch(e => console.log('Crop cancelled'));
              }}
            >
              <Crop size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDone} style={[s.iconBtn, { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 12 }]}>
              <Check size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Canvas */}
        <View style={s.canvasWrap} onLayout={e => setCanvasLayout(e.nativeEvent.layout)}>
          {(() => {
            let scaledW = canvasLayout.width;
            let scaledH = canvasLayout.height;
            if (imgDims && canvasLayout.width > 0 && canvasLayout.height > 0) {
              const imgRatio = imgDims.w / imgDims.h;
              const canvasRatio = canvasLayout.width / canvasLayout.height;
              if (imgRatio > canvasRatio) {
                scaledW = canvasLayout.width;
                scaledH = canvasLayout.width / imgRatio;
              } else {
                scaledH = canvasLayout.height;
                scaledW = canvasLayout.height * imgRatio;
              }
            }
            return (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.95 }} style={{ width: scaledW || '100%', height: scaledH || '100%', overflow: 'hidden' }}>
                  {internalPhotoUri ? <Image source={{ uri: internalPhotoUri }} style={s.photo} resizeMode="contain" /> : null}
                  <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
              {paths.map((p, i) => (
                <Path key={i} d={p.d} stroke={p.color} strokeWidth={p.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              ))}
              {currentPath && (
                <Path d={currentPath.d} stroke={currentPath.color} strokeWidth={currentPath.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </Svg>
            {textItems.map(item => (
              <View
                key={item.id}
                {...makeTextPan(item.id)}
                style={[s.textItem, { left: item.x, top: item.y }, selectedTextId === item.id && s.textItemSelected]}
              >
                <Text style={[s.annotationText, { color: item.color, fontSize: item.fontSize }]}>{item.text}</Text>
                {selectedTextId === item.id && (
                  <TouchableOpacity style={s.deleteTextBtn} onPress={deleteSelectedText}>
                    <Trash2 size={13} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ViewShot>
              </View>
            );
          })()}

          {/* Touch interceptor */}
          <View
            style={StyleSheet.absoluteFill}
            {...(activeTool === 'marker' ? canvasPan.panHandlers : textTapPan.panHandlers)}
          />
        </View>

        {/* Bottom toolbar */}
        <View style={s.bottomBar}>
          <View style={s.toolRow}>
            <TouchableOpacity style={[s.toolBtn, activeTool === 'text' && s.toolBtnActive]} onPress={() => setActiveTool('text')}>
              <Type size={22} color={activeTool === 'text' ? Colors.primary : '#94A3B8'} />
              <Text style={[s.toolLabel, activeTool === 'text' && { color: Colors.primary }]}>Text</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.toolBtn, activeTool === 'marker' && s.toolBtnActive]} onPress={() => setActiveTool('marker')}>
              <PenTool size={22} color={activeTool === 'marker' ? Colors.primary : '#94A3B8'} />
              <Text style={[s.toolLabel, activeTool === 'marker' && { color: Colors.primary }]}>Marker</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.toolBtn} onPress={handleUndo}>
              <RotateCcw size={22} color="#94A3B8" />
              <Text style={s.toolLabel}>Undo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.toolBtn} onPress={handleClear}>
              <Trash2 size={22} color="#EF4444" />
              <Text style={[s.toolLabel, { color: '#EF4444' }]}>Clear</Text>
            </TouchableOpacity>
          </View>

          {/* Size */}
          <View style={[s.colorRow, { justifyContent: 'center' }]}>
            <View style={s.sizeRow}>
              <TouchableOpacity style={s.sizeBtn} onPress={() => activeTool === 'marker' ? setMarkerWidth(w => Math.max(1, w - 1)) : setFontSize(f => Math.max(12, f - 2))}>
                <Minus size={13} color="#fff" />
              </TouchableOpacity>
              <Text style={s.sizeLabel}>{activeTool === 'marker' ? markerWidth : fontSize}</Text>
              <TouchableOpacity style={s.sizeBtn} onPress={() => activeTool === 'marker' ? setMarkerWidth(w => Math.min(20, w + 1)) : setFontSize(f => Math.min(60, f + 2))}>
                <Plus size={13} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={s.hint}>
            {activeTool === 'text'
              ? 'Tap photo to add text  •  Drag label to move  •  Tap label to select & delete'
              : 'Draw on photo  •  Adjust color & thickness above'}
          </Text>
        </View>
      </View>

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
              <TouchableOpacity style={s.cancelBtn} onPress={() => setAddingText(false)}>
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
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 46 : 56, paddingBottom: 12, backgroundColor: '#111827' },
  topTitle: { fontSize: 16, fontFamily: 'Inter-Bold', color: '#fff' },
  iconBtn: { padding: 8, alignItems: 'center', justifyContent: 'center' },
  canvasWrap: { flex: 1, backgroundColor: '#000', position: 'relative' },
  canvasInner: { flex: 1 },
  photo: { width: '100%', height: '100%' },
  textItem: { position: 'absolute', padding: 4 },
  textItemSelected: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.7)', borderRadius: 4, borderStyle: 'dashed' },
  annotationText: { fontFamily: 'Inter-Bold', textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  deleteTextBtn: { position: 'absolute', top: -11, right: -11, backgroundColor: '#EF4444', borderRadius: 11, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  bottomBar: { backgroundColor: '#111827', paddingTop: 14, paddingBottom: Platform.OS === 'ios' ? 34 : 18, paddingHorizontal: 16 },
  toolRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  toolBtn: { alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  toolBtnActive: { backgroundColor: '#1E293B' },
  toolLabel: { fontSize: 11, fontFamily: 'Inter-SemiBold', color: '#64748B' },
  colorRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  colorDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  colorDotActive: { borderWidth: 3, borderColor: '#fff', transform: [{ scale: 1.2 }] },
  sizeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 8, overflow: 'hidden', marginLeft: 4 },
  sizeBtn: { paddingHorizontal: 10, paddingVertical: 7 },
  sizeLabel: { fontSize: 13, fontFamily: 'Inter-Bold', color: '#fff', minWidth: 24, textAlign: 'center' },
  hint: { fontSize: 11, color: '#475569', fontFamily: 'Inter-Medium', textAlign: 'center', lineHeight: 16 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  inputCard: { backgroundColor: '#1E293B', padding: 20, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 42 },
  inputTitle: { fontSize: 15, fontFamily: 'Inter-Bold', color: '#fff', marginBottom: 12 },
  inputField: { backgroundColor: '#0F172A', borderRadius: 10, padding: 12, fontSize: 15, fontFamily: 'Inter-Medium', borderWidth: 1.5, minHeight: 72, color: '#fff' },
  cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, backgroundColor: '#334155', borderRadius: 10 },
  placeBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, backgroundColor: Colors.primary, borderRadius: 10 },
});
