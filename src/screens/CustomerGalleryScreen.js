import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Shadow } from '../constants/theme';
import { 
  FolderPlus, 
  Folder, 
  ChevronRight, 
  ArrowLeft, 
  Upload, 
  Trash2, 
  Image as ImageIcon,
  X,
  MoreVertical,
  Scissors
} from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import CollageMaker from '../components/CollageMaker';
import { launchImageLibrary } from 'react-native-image-picker';
import { useDispatch } from 'react-redux';
import { uploadImageAction } from '../store/uploadSlice';
import { useToast } from '../context/ToastContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_SPACING = 12;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_SPACING * 3) / 2;

const DEFAULT_FOLDERS = [
  { id: 'f1', name: 'Chudithars', images: [] },
  { id: 'f2', name: 'Lehengas', images: [] },
  { id: 'f3', name: 'Kurtas & Skirts', images: [] },
  { id: 'f4', name: 'Blouses', images: [] },
  { id: 'f5', name: 'Embroidery', images: [] }
];

const CustomerGalleryScreen = () => {
  const dispatch = useDispatch();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const [folders, setFolders] = useState([]);
  const [activeFolderId, setActiveFolderId] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [createFolderModal, setCreateFolderModal] = useState(false);
  
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [showCollageMaker, setShowCollageMaker] = useState(false);

  useEffect(() => {
    loadGalleryData();
  }, []);

  const loadGalleryData = async () => {
    try {
      const data = await AsyncStorage.getItem('sewvee_customer_gallery');
      if (data) {
        const parsed = JSON.parse(data);
        let merged = [...parsed];
        let changed = false;
        
        DEFAULT_FOLDERS.forEach(defF => {
          if (!merged.find(f => f.name.toLowerCase() === defF.name.toLowerCase())) {
            merged.push({ ...defF, id: 'folder_' + Date.now() + Math.random().toString(36).substr(2, 9) });
            changed = true;
          }
        });

        const oldMisspelled = ['Blouse Designs', 'Lehengas & Skirts', 'Kurtas & Chudiyars'];
        merged = merged.filter(f => {
          if (oldMisspelled.includes(f.name) && f.images.length === 0) {
            changed = true;
            return false;
          }
          return true;
        });

        setFolders(merged);
        if (changed) {
          await AsyncStorage.setItem('sewvee_customer_gallery', JSON.stringify(merged));
        }
      } else {
        setFolders(DEFAULT_FOLDERS);
        await AsyncStorage.setItem('sewvee_customer_gallery', JSON.stringify(DEFAULT_FOLDERS));
      }
    } catch (e) {
      console.log('Error loading customer gallery', e);
      setFolders(DEFAULT_FOLDERS);
    }
  };

  const saveGalleryData = async (updatedFolders) => {
    try {
      setFolders(updatedFolders);
      await AsyncStorage.setItem('sewvee_customer_gallery', JSON.stringify(updatedFolders));
    } catch (e) {
      console.log('Error saving customer gallery', e);
    }
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      showToast('Enter folder name', 'error');
      return;
    }
    const newFolder = {
      id: 'folder_' + Date.now(),
      name: newFolderName.trim(),
      images: []
    };
    const updated = [...folders, newFolder];
    saveGalleryData(updated);
    setNewFolderName('');
    setCreateFolderModal(false);
    showToast('Folder created successfully!', 'success');
  };

  const handleDeleteFolder = (folderId, folderName) => {
    const updated = folders.filter(f => f.id !== folderId);
    saveGalleryData(updated);
    showToast(`Folder "${folderName}" deleted.`, 'success');
  };

  const handleUploadImage = () => {
    if (!activeFolderId) return;

    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, async (response) => {
      if (response.didCancel || response.errorCode || !response.assets?.length) return;

      const asset = response.assets[0];
      setUploading(true);
      
      let finalUrl = asset.uri; 

      try {
        const uploadResult = await dispatch(uploadImageAction({
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || `gallery_${Date.now()}.jpg`,
          key_name: 'customer_gallery',
        })).unwrap();

        const remoteUrl = uploadResult?.file_url || uploadResult?.data?.file_url || uploadResult?.url || uploadResult?.data?.url || '';
        if (remoteUrl) {
          finalUrl = remoteUrl;
        }
      } catch (err) {
        console.log('Upload image error:', err);
      }

      const updated = folders.map(folder => {
        if (folder.id === activeFolderId) {
          return {
            ...folder,
            images: [
              { id: 'img_' + Date.now(), url: finalUrl, date: new Date().toISOString() },
              ...folder.images
            ]
          };
        }
        return folder;
      });

      await saveGalleryData(updated);
      setUploading(false);
      showToast('Added to folder!', 'success');
    });
  };

  const handleDeleteImage = (imgId) => {
    const updated = folders.map(folder => {
      if (folder.id === activeFolderId) {
        return {
          ...folder,
          images: folder.images.filter(img => img.id !== imgId)
        };
      }
      return folder;
    });
    saveGalleryData(updated);
    showToast('Image removed.', 'success');
  };

  const handleSaveCollageToFolder = async (uri) => {
    if (!activeFolderId) return;
    setUploading(true);
    setShowCollageMaker(false);
    
    let finalUrl = uri;
    try {
      const uploadResult = await dispatch(uploadImageAction({
        uri,
        type: 'image/jpeg',
        name: `collage_${Date.now()}.jpg`,
        key_name: 'customer_gallery',
      })).unwrap();

      const remoteUrl = uploadResult?.file_url || uploadResult?.data?.file_url || uploadResult?.url || uploadResult?.data?.url || '';
      if (remoteUrl) {
        finalUrl = remoteUrl;
      }
    } catch (err) {
      console.log('Upload collage error:', err);
    }

    const updated = folders.map(folder => {
      if (folder.id === activeFolderId) {
        return {
          ...folder,
          images: [
            { id: 'img_' + Date.now(), url: finalUrl, date: new Date().toISOString() },
            ...folder.images
          ]
        };
      }
      return folder;
    });

    await saveGalleryData(updated);
    setUploading(false);
    showToast('Collage added to folder!', 'success');
  };

  const activeFolder = folders.find(f => f.id === activeFolderId);

  const renderFolderItem = ({ item, index }) => {
    const hasImages = item.images && item.images.length > 0;
    const coverImage = hasImages ? item.images[0].url : null;
    const gradients = [
      ['#FDF2F8', '#FCE7F3'], // pink
      ['#F0FDF4', '#DCFCE7'], // green
      ['#EFF6FF', '#DBEAFE'], // blue
      ['#FFF7ED', '#FFEDD5'], // orange
      ['#F5F3FF', '#EDE9FE'], // violet
    ];
    const bgGradient = gradients[index % gradients.length];
    const iconColor = ['#DB2777', '#16A34A', '#2563EB', '#EA580C', '#7C3AED'][index % gradients.length];

    return (
      <TouchableOpacity
        style={styles.folderCard}
        onPress={() => setActiveFolderId(item.id)}
        activeOpacity={0.8}
      >
        <View style={styles.folderCardInner}>
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={styles.folderCover} />
          ) : (
            <LinearGradient colors={bgGradient} style={styles.folderCoverFallback}>
              <Folder size={32} color={iconColor} strokeWidth={1.5} />
            </LinearGradient>
          )}
          
          {/* Glassmorphism-style footer */}
          <View style={styles.folderFooter}>
            <View style={{ flex: 1 }}>
              <Text style={styles.folderName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.folderCount}>{item.images?.length || 0} items</Text>
            </View>
            <TouchableOpacity 
              style={styles.deleteFolderBtn}
              onPress={() => handleDeleteFolder(item.id, item.name)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Trash2 size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {/* Header */}
      <View style={styles.header}>
        {activeFolderId ? (
          <>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setActiveFolderId(null)}>
              <ArrowLeft size={24} color="#0F172A" />
            </TouchableOpacity>
            <View style={{ flex: 1, paddingHorizontal: 12 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>{activeFolder?.name}</Text>
              <Text style={styles.headerSubtitle}>{activeFolder?.images?.length || 0} items</Text>
            </View>
            <TouchableOpacity style={styles.collageBtn} onPress={() => setShowCollageMaker(true)}>
              <Scissors size={18} color="#FFF" />
              <Text style={styles.collageBtnText}>Collage</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>My Gallery</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.makeCollageBtn} onPress={() => setShowCollageMaker(true)}>
                <Scissors size={18} color={Colors.primary} />
                <Text style={styles.makeCollageBtnText}>Make Collage</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtnPrimary} onPress={() => setCreateFolderModal(true)}>
                <FolderPlus size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {activeFolderId ? (
          // Inside a folder
          <>
            {activeFolder?.images.length > 0 ? (
              <FlatList
                data={activeFolder.images}
                numColumns={3}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.imageGrid}
                columnWrapperStyle={{ gap: 4, marginBottom: 4 }}
                renderItem={({ item }) => (
                  <View style={styles.imageWrapper}>
                    <TouchableOpacity onPress={() => setPreviewImage(item.url)} activeOpacity={0.9}>
                      <Image source={{ uri: item.url }} style={styles.imageItem} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteImageBtn} onPress={() => handleDeleteImage(item.id)}>
                      <X size={14} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                )}
              />
            ) : (
              <View style={styles.emptyState}>
                <LinearGradient colors={['#F1F5F9', '#E2E8F0']} style={styles.emptyStateIcon}>
                  <ImageIcon size={40} color="#94A3B8" />
                </LinearGradient>
                <Text style={styles.emptyStateTitle}>Empty Folder</Text>
                <Text style={styles.emptyStateText}>
                  Save your inspirations, reference styles, or favorite designs here.
                </Text>
              </View>
            )}
            
            {/* Floating Action Button for Upload */}
            <TouchableOpacity 
              style={[styles.fab, uploading && { opacity: 0.8 }]} 
              onPress={handleUploadImage}
              disabled={uploading}
              activeOpacity={0.8}
            >
              <LinearGradient colors={[Colors.primary, '#4F46E5']} style={styles.fabGradient} start={{x:0, y:0}} end={{x:1, y:1}}>
                {uploading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Upload size={22} color="#FFF" />
                    <Text style={styles.fabText}>Add Photo</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          // Folder List
          <>
            {folders.length > 0 ? (
              <FlatList
                key="grid-2"
                data={folders}
                renderItem={renderFolderItem}
                keyExtractor={item => item.id}
                numColumns={2}
                contentContainerStyle={styles.folderList}
                columnWrapperStyle={{ justifyContent: 'space-between' }}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <LinearGradient colors={['#EEF2FF', '#E0E7FF']} style={styles.emptyStateIcon}>
                  <FolderPlus size={40} color={Colors.primary} />
                </LinearGradient>
                <Text style={styles.emptyStateTitle}>No Folders</Text>
                <Text style={styles.emptyStateText}>
                  Create your first folder to start organizing your fashion inspirations.
                </Text>
                <TouchableOpacity style={styles.createFolderBtn} onPress={() => setCreateFolderModal(true)}>
                  <Text style={styles.createFolderBtnText}>Create Folder</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>

      {/* Modals */}
      <Modal visible={createFolderModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Folder</Text>
              <TouchableOpacity onPress={() => setCreateFolderModal(false)}>
                <X size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="e.g. Wedding Outfits"
              placeholderTextColor="#94A3B8"
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
              maxLength={30}
            />
            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleCreateFolder}>
              <Text style={styles.modalSubmitText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!previewImage} transparent animationType="fade">
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewImage(null)}>
            <X size={28} color="#FFF" />
          </TouchableOpacity>
          {previewImage && (
            <Image source={{ uri: previewImage }} style={styles.previewImageFull} resizeMode="contain" />
          )}
        </View>
      </Modal>

      <CollageMaker 
        visible={showCollageMaker} 
        onClose={() => setShowCollageMaker(false)} 
        onSaveReference={activeFolderId ? handleSaveCollageToFolder : undefined}
        galleryFolders={folders}
      />
    </SafeAreaView>
  );
};

export default CustomerGalleryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F5F3FF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    ...Shadow.subtle,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontFamily: 'Inter-Medium',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnPrimary: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.medium,
  },
  iconBtnSecondary: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  makeCollageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    gap: 8,
  },
  makeCollageBtnText: {
    color: Colors.primary,
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
  },
  collageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  collageBtnText: {
    color: '#FFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
  },
  content: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  folderList: {
    padding: GRID_SPACING,
    gap: GRID_SPACING,
  },
  folderCard: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    marginBottom: GRID_SPACING,
  },
  folderCardInner: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Shadow.medium,
  },
  folderCover: {
    flex: 1,
    width: '100%',
    backgroundColor: '#F1F5F9',
  },
  folderCoverFallback: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 50, // Accounts for the absolute footer to keep the icon visually centered
  },
  folderFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  folderName: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  folderCount: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    marginTop: 2,
  },
  deleteFolderBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageGrid: {
    padding: 2,
  },
  imageWrapper: {
    width: SCREEN_WIDTH / 3 - (8 / 3),
    height: SCREEN_WIDTH / 3 - (8 / 3),
    position: 'relative',
  },
  imageItem: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F1F5F9',
  },
  deleteImageBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    ...Shadow.large,
  },
  fabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    gap: 8,
  },
  fabText: {
    color: '#FFF',
    fontFamily: 'Inter-Bold',
    fontSize: 15,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
  createFolderBtn: {
    marginTop: 24,
    backgroundColor: '#0F172A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 100,
  },
  createFolderBtnText: {
    color: '#FFF',
    fontFamily: 'Inter-Bold',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    ...Shadow.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#0F172A',
    marginBottom: 24,
  },
  modalSubmitBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalSubmitText: {
    color: '#FFF',
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
  },
  previewClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImageFull: {
    width: '100%',
    height: '100%',
  }
});
