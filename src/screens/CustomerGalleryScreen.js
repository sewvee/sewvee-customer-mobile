import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Modal,
  ActivityIndicator,
  Dimensions,
  SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Shadow } from '../constants/theme';
import { 
  FolderPlus, 
  Folder, 
  ChevronRight, 
  Plus, 
  ArrowLeft, 
  Upload, 
  Trash2, 
  Image as ImageIcon,
  X,
  Maximize2
} from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useDispatch } from 'react-redux';
import { uploadImageAction } from '../store/uploadSlice';
import { useToast } from '../context/ToastContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CustomerGalleryScreen = () => {
  const dispatch = useDispatch();
  const { showToast } = useToast();

  const [folders, setFolders] = useState([
    { id: 'f1', name: 'Blouse Designs', images: [] },
    { id: 'f2', name: 'Lehengas & Skirts', images: [] },
    { id: 'f3', name: 'Kurtas & Chudiyars', images: [] }
  ]);
  const [activeFolderId, setActiveFolderId] = useState(null); // null means root folder list
  const [newFolderName, setNewFolderName] = useState('');
  const [createFolderModal, setCreateFolderModal] = useState(false);
  
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    loadGalleryData();
  }, []);

  const loadGalleryData = async () => {
    try {
      const data = await AsyncStorage.getItem('sewvee_customer_gallery');
      if (data) {
        setFolders(JSON.parse(data));
      }
    } catch (e) {
      console.log('Error loading customer gallery', e);
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
      
      let finalUrl = asset.uri; // fallback local URI

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
        console.log('Upload image error (using local path fallback):', err);
      }

      // Append image to active folder
      const updated = folders.map(folder => {
        if (folder.id === activeFolderId) {
          return {
            ...folder,
            images: [
              ...folder.images,
              {
                id: 'img_' + Date.now(),
                url: finalUrl,
                date: new Date().toISOString()
              }
            ]
          };
        }
        return folder;
      });

      await saveGalleryData(updated);
      setUploading(false);
      showToast('Design inspiration added!', 'success');
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

  const activeFolder = folders.find(f => f.id === activeFolderId);

  const renderFolderItem = ({ item }) => {
    return (
      <View style={styles.folderRow}>
        <TouchableOpacity
          style={styles.folderClickArea}
          onPress={() => setActiveFolderId(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.folderIconWrap}>
            <Folder size={24} color={Colors.primary} fill="#EEF2FF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.folderNameText}>{item.name}</Text>
            <Text style={styles.folderCountText}>{item.images.length} items</Text>
          </View>
          <ChevronRight size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.deleteFolderBtn}
          onPress={() => handleDeleteFolder(item.id, item.name)}
        >
          <Trash2 size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.navbar}>
        {activeFolderId ? (
          <TouchableOpacity style={styles.backIconBtn} onPress={() => setActiveFolderId(null)}>
            <ArrowLeft size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        ) : <View style={{ width: 34 }} />}
        
        <Text style={styles.navbarTitle}>
          {activeFolderId ? activeFolder?.name : 'My Gallery'}
        </Text>
        
        {!activeFolderId ? (
          <TouchableOpacity style={styles.addFolderBtn} onPress={() => setCreateFolderModal(true)}>
            <FolderPlus size={22} color={Colors.primary} />
          </TouchableOpacity>
        ) : <View style={{ width: 34 }} />}
      </View>

      {/* Main Content */}
      {activeFolderId ? (
        // Folder Details (Images Grid)
        <View style={{ flex: 1 }}>
          <View style={styles.folderSubHeader}>
            <Text style={styles.folderCountLabel}>{activeFolder?.images.length || 0} inspiration images</Text>
            <TouchableOpacity 
              style={[styles.uploadBtn, uploading && { opacity: 0.7 }]}
              onPress={handleUploadImage}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Upload size={16} color="white" style={{ marginRight: 6 }} />
                  <Text style={styles.uploadBtnText}>Add Photo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {activeFolder?.images.length > 0 ? (
            <FlatList
              data={activeFolder.images}
              numColumns={3}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.imageGridContent}
              columnWrapperStyle={{ gap: 12, marginBottom: 12 }}
              renderItem={({ item }) => (
                <View style={styles.gridImageWrapper}>
                  <TouchableOpacity onPress={() => setPreviewImage(item.url)}>
                    <Image source={{ uri: item.url }} style={styles.gridImage} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.deleteImageBtn}
                    onPress={() => handleDeleteImage(item.id)}
                  >
                    <X size={12} color="white" />
                  </TouchableOpacity>
                </View>
              )}
            />
          ) : (
            <View style={styles.emptyGalleryContainer}>
              <ImageIcon size={48} color={Colors.textSecondary} />
              <Text style={styles.emptyGalleryTitle}>Empty Folder</Text>
              <Text style={styles.emptyGalleryText}>
                No photos in this folder. Upload screenshots of your neckline patterns, sleeve reference pictures, or bridal designs.
              </Text>
            </View>
          )}
        </View>
      ) : (
        // Folders List (Root View)
        <View style={{ flex: 1, padding: 16 }}>
          {folders.length > 0 ? (
            <FlatList
              data={folders}
              renderItem={renderFolderItem}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyGalleryContainer}>
              <FolderPlus size={48} color={Colors.textSecondary} />
              <Text style={styles.emptyGalleryTitle}>No Folders Created</Text>
              <Text style={styles.emptyGalleryText}>
                Create design folders to organize blouse styles, kurtas, or wedding inspirations.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* CREATE FOLDER MODAL */}
      <Modal visible={createFolderModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitleText}>Create New Folder</Text>
              <TouchableOpacity onPress={() => setCreateFolderModal(false)} style={{ padding: 4 }}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.inputField}
              placeholder="e.g. Bridal Blouses"
              placeholderTextColor={Colors.textSecondary}
              value={newFolderName}
              onChangeText={setNewFolderName}
              maxLength={24}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelModalBtn}
                onPress={() => setCreateFolderModal(false)}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmModalBtn}
                onPress={handleCreateFolder}
              >
                <Text style={styles.confirmModalBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FULL SCREEN IMAGE PREVIEW */}
      <Modal visible={!!previewImage} transparent animationType="fade">
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.closePreviewBtn} onPress={() => setPreviewImage(null)}>
            <X size={28} color="white" />
          </TouchableOpacity>
          {previewImage && (
            <Image 
              source={{ uri: previewImage }} 
              style={styles.fullPreviewImage} 
              resizeMode="contain" 
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default CustomerGalleryScreen;

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
  backIconBtn: {
    padding: 6,
  },
  navbarTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
  },
  addFolderBtn: {
    padding: 6,
  },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    ...Shadow.subtle,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  folderClickArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  folderIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  folderNameText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
  },
  folderCountText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: 'Inter-Medium',
    marginTop: 2,
  },
  deleteFolderBtn: {
    padding: 8,
    marginLeft: 8,
  },
  emptyGalleryContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyGalleryTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
    marginTop: 16,
  },
  emptyGalleryText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    fontFamily: 'Inter-Medium',
  },
  folderSubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  folderCountLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'Inter-SemiBold',
  },
  uploadBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    ...Shadow.subtle,
  },
  uploadBtnText: {
    color: Colors.white,
    fontFamily: 'Inter-Bold',
    fontSize: 13,
  },
  imageGridContent: {
    padding: 16,
  },
  gridImageWrapper: {
    position: 'relative',
    width: (SCREEN_WIDTH - 56) / 3,
    height: (SCREEN_WIDTH - 56) / 3,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  deleteImageBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    ...Shadow.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitleText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
  },
  inputField: {
    height: 52,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: 'Inter-Medium',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelModalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelModalBtnText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: Colors.textSecondary,
  },
  confirmModalBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  confirmModalBtnText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.white,
  },

  // Preview Modal
  previewOverlay: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closePreviewBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  fullPreviewImage: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
});
