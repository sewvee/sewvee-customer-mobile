const fs = require('fs');
const path = '/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Customer-Mobile/src/screens/CustomerOrderDetailScreen.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Add pendingPhotos state
if(!code.includes("const [pendingPhotos, setPendingPhotos] = useState({});")) {
    code = code.replace("const [showCollageMaker, setShowCollageMaker] = useState(false);", "const [showCollageMaker, setShowCollageMaker] = useState(false);\n  const [pendingPhotos, setPendingPhotos] = useState({});");
}

// 2. Replace handleSaveCollage and add handleConfirmPhotos
const handleSaveCollageRegex = /const handleSaveCollage = async \(uri\) => \{[\s\S]*?finally \{\s*setUploadingOutfitId\(null\);\s*setLoading\(false\);\s*\}\s*\};/;

const newHandleSave = `const handleSaveCollage = async (uri) => {
    setShowCollageMaker(false);
    setUploadingOutfitId(collageOutfitId);
    setLoading(true);
    try {
      const uploadResult = await dispatch(uploadImageAction({
        uri: uri,
        type: 'image/jpeg',
        name: \`collage_\${Date.now()}.jpg\`,
        key_name: 'reference_images',
      })).unwrap();

      const fileUrl = uploadResult?.file_url || uploadResult?.data?.file_url || uploadResult?.url || uploadResult?.data?.url || '';

      if (!fileUrl) {
        throw new Error('No image URL returned from upload server');
      }

      setPendingPhotos(prev => ({
        ...prev,
        [collageOutfitId]: [...(prev[collageOutfitId] || []), fileUrl]
      }));

    } catch (err) {
      console.log('Upload error:', err);
      showToast(err?.message || 'Failed to upload photo', 'error');
    } finally {
      setUploadingOutfitId(null);
      setLoading(false);
    }
  };

  const removePendingPhoto = (outfitId, index) => {
    setPendingPhotos(prev => {
      const list = [...(prev[outfitId] || [])];
      list.splice(index, 1);
      return { ...prev, [outfitId]: list };
    });
  };

  const handleConfirmPhotos = async (outfitId) => {
    const urls = pendingPhotos[outfitId] || [];
    if (urls.length === 0) return;

    setUploadingOutfitId(outfitId);
    setLoading(true);
    try {
      // NOTE: Using a local fallback URL if the staging backend isn't updated yet!
      const API_BASE = URL_CUSTOMER_PORTAL_ORDERS.includes('api-stage') ? 'http://10.0.2.2:3021/mobile/customer-portal/orders' : URL_CUSTOMER_PORTAL_ORDERS;

      for (const fileUrl of urls) {
        const response = await fetch(\`\${API_BASE}/\${order.id}/outfits/\${outfitId}/requests\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            attachment_url: fileUrl,
            message: 'Uploaded via Customer App',
            phone: '9090909090'
          })
        });

        if (!response.ok) {
           const errText = await response.text();
           throw new Error(\`API Error: \${errText}\`);
        }
      }

      setPendingPhotos(prev => {
        const copy = { ...prev };
        delete copy[outfitId];
        return copy;
      });

      refreshData();
      showToast('Photos submitted successfully!', 'success');
    } catch (err) {
      console.log('Confirm error:', err);
      showToast(err?.message || 'Failed to notify backend', 'error');
    } finally {
      setUploadingOutfitId(null);
      setLoading(false);
    }
  };`;

if(code.match(handleSaveCollageRegex)) {
    code = code.replace(handleSaveCollageRegex, newHandleSave);
}

// 3. Update the UI for the "Action Required" box
const uiTarget = `<TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F97316', paddingVertical: 12, borderRadius: 8 }}
                      onPress={() => handleUploadReferencePhoto(outfit.id)}
                      disabled={uploadingOutfitId === outfit.id}
                    >
                      {uploadingOutfitId === outfit.id ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <>
                          <Upload size={18} color="#FFF" style={{ marginRight: 8 }} />
                          <Text style={{ color: '#FFF', fontFamily: 'Inter-Bold', fontSize: 14 }}>Upload Photo</Text>
                        </>
                      )}
                    </TouchableOpacity>`;

const uiReplacement = `{(pendingPhotos[outfit.id] || []).length > 0 && (
                      <View style={{ marginBottom: 12 }}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                          {pendingPhotos[outfit.id].map((url, idx) => (
                            <View key={idx} style={{ marginRight: 10, position: 'relative' }}>
                              <Image source={{ uri: url }} style={{ width: 60, height: 60, borderRadius: 8, backgroundColor: '#FFEDD5' }} />
                              <TouchableOpacity
                                style={{ position: 'absolute', top: -6, right: -6, backgroundColor: '#EF4444', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}
                                onPress={() => removePendingPhoto(outfit.id, idx)}
                              >
                                <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>X</Text>
                              </TouchableOpacity>
                            </View>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity 
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F97316', paddingVertical: 12, borderRadius: 8 }}
                        onPress={() => handleUploadReferencePhoto(outfit.id)}
                        disabled={uploadingOutfitId === outfit.id}
                      >
                        {uploadingOutfitId === outfit.id ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <>
                            <Upload size={18} color="#FFF" style={{ marginRight: 8 }} />
                            <Text style={{ color: '#FFF', fontFamily: 'Inter-Bold', fontSize: 14 }}>
                              {(pendingPhotos[outfit.id] || []).length > 0 ? 'Add More' : 'Upload Photo'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      {(pendingPhotos[outfit.id] || []).length > 0 && (
                        <TouchableOpacity 
                          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', paddingVertical: 12, borderRadius: 8 }}
                          onPress={() => handleConfirmPhotos(outfit.id)}
                          disabled={uploadingOutfitId === outfit.id}
                        >
                          <Text style={{ color: '#FFF', fontFamily: 'Inter-Bold', fontSize: 14 }}>Confirm Photos</Text>
                        </TouchableOpacity>
                      )}
                    </View>`;

if(code.includes(uiTarget)) {
    code = code.replace(uiTarget, uiReplacement);
}

fs.writeFileSync(path, code);
console.log("CustomerOrderDetailScreen.js queue patched!");
