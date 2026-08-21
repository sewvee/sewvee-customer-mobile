const fs = require('fs');
const path = '/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Customer-Mobile/src/screens/CustomerOrderDetailScreen.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Fix the upload error: change 'reference_images' to 'order_photos' in handleSaveCollage
code = code.replace(/key_name:\s*'reference_images'/g, "key_name: 'order_photos'");

// 2. Modify the Edit logic to support pending photos
// In handleCropPhoto
const cropTarget = /const fileUrl = uploadResult\?\.file_url \|\| uploadResult\?\.data\?\.file_url \|\| uploadResult\?\.url \|\| uploadResult\?\.data\?\.url \|\| '';\s*if \(!fileUrl\) \{\s*throw new Error\('No image URL returned from upload server'\);\s*\}\s*await fetch\(`\$\{URL_CUSTOMER_PORTAL_ORDERS\}\/\$\{order\.id\}\/outfits\/\$\{editingPhoto\.outfitId\}\/requests`, \{\s*method: 'POST',\s*headers: \{\s*'Content-Type': 'application\/json',\s*\},\s*body: JSON\.stringify\(\{\s*attachment_url: fileUrl,\s*message: 'Cropped reference photo',\s*phone: '9090909090'\s*\}\)\s*\}\);/;

const newCropTarget = `const fileUrl = uploadResult?.file_url || uploadResult?.data?.file_url || uploadResult?.url || uploadResult?.data?.url || '';
      if (!fileUrl) throw new Error('No image URL returned from upload server');

      if (editingPhoto.isPending) {
        setPendingPhotos(prev => {
          const list = [...(prev[editingPhoto.outfitId] || [])];
          list[editingPhoto.pendingIndex] = fileUrl;
          return { ...prev, [editingPhoto.outfitId]: list };
        });
        showToast('Photo cropped', 'success');
      } else {
        await fetch(\`\${URL_CUSTOMER_PORTAL_ORDERS}/\${order.id}/outfits/\${editingPhoto.outfitId}/requests\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attachment_url: fileUrl, message: 'Cropped reference photo', phone: '9090909090' })
        });
      }`;
code = code.replace(cropTarget, newCropTarget);


// In handleChangeUploadedPhoto
const changeTarget = /const fileUrl = uploadResult\?\.file_url \|\| uploadResult\?\.data\?\.file_url \|\| uploadResult\?\.url \|\| uploadResult\?\.data\?\.url \|\| '';\s*if \(!fileUrl\) \{\s*throw new Error\('No image URL returned from upload server'\);\s*\}\s*await fetch\(`\$\{URL_CUSTOMER_PORTAL_ORDERS\}\/\$\{order\.id\}\/outfits\/\$\{editingPhoto\.outfitId\}\/requests`, \{\s*method: 'POST',\s*headers: \{\s*'Content-Type': 'application\/json',\s*\},\s*body: JSON\.stringify\(\{\s*attachment_url: fileUrl,\s*message: 'Changed reference photo',\s*phone: '9090909090'\s*\}\)\s*\}\);/;

const newChangeTarget = `const fileUrl = uploadResult?.file_url || uploadResult?.data?.file_url || uploadResult?.url || uploadResult?.data?.url || '';
        if (!fileUrl) throw new Error('No image URL returned from upload server');

        if (editingPhoto.isPending) {
          setPendingPhotos(prev => {
            const list = [...(prev[editingPhoto.outfitId] || [])];
            list[editingPhoto.pendingIndex] = fileUrl;
            return { ...prev, [editingPhoto.outfitId]: list };
          });
          showToast('Photo changed', 'success');
        } else {
          await fetch(\`\${URL_CUSTOMER_PORTAL_ORDERS}/\${order.id}/outfits/\${editingPhoto.outfitId}/requests\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ attachment_url: fileUrl, message: 'Changed reference photo', phone: '9090909090' })
          });
        }`;
code = code.replace(changeTarget, newChangeTarget);


// In handleAnnotateDone
const annotateTarget = /const fileUrl = uploadResult\?\.file_url \|\| uploadResult\?\.data\?\.file_url \|\| uploadResult\?\.url \|\| uploadResult\?\.data\?\.url \|\| '';\s*if \(!fileUrl\) \{\s*throw new Error\('No image URL returned from upload server'\);\s*\}\s*await fetch\(`\$\{URL_CUSTOMER_PORTAL_ORDERS\}\/\$\{order\.id\}\/outfits\/\$\{editingPhoto\.outfitId\}\/requests`, \{\s*method: 'POST',\s*headers: \{\s*'Content-Type': 'application\/json',\s*\},\s*body: JSON\.stringify\(\{ attachment_url: fileUrl, message: 'Annotated reference photo' \}\)\s*\}\);/;

const newAnnotateTarget = `const fileUrl = uploadResult?.file_url || uploadResult?.data?.file_url || uploadResult?.url || uploadResult?.data?.url || '';
      if (!fileUrl) throw new Error('No image URL returned from upload server');

      if (editingPhoto.isPending) {
        setPendingPhotos(prev => {
          const list = [...(prev[editingPhoto.outfitId] || [])];
          list[editingPhoto.pendingIndex] = fileUrl;
          return { ...prev, [editingPhoto.outfitId]: list };
        });
        showToast('Photo annotated', 'success');
      } else {
        await fetch(\`\${URL_CUSTOMER_PORTAL_ORDERS}/\${order.id}/outfits/\${editingPhoto.outfitId}/requests\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attachment_url: fileUrl, message: 'Annotated reference photo', phone: '9090909090' })
        });
      }`;
code = code.replace(annotateTarget, newAnnotateTarget);


// 3. Add Edit2 icon on pending photos UI
const pendingUITarget = `<View key={idx} style={{ marginRight: 10, position: 'relative' }}>
                              <Image source={{ uri: url }} style={{ width: 60, height: 60, borderRadius: 8, backgroundColor: '#FFEDD5' }} />
                              <TouchableOpacity
                                style={{ position: 'absolute', top: -6, right: -6, backgroundColor: '#EF4444', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}
                                onPress={() => removePendingPhoto(outfit.id, idx)}
                              >
                                <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>X</Text>
                              </TouchableOpacity>
                            </View>`;

const newPendingUI = `<View key={idx} style={{ marginRight: 10, position: 'relative' }}>
                              <Image source={{ uri: url }} style={{ width: 60, height: 60, borderRadius: 8, backgroundColor: '#FFEDD5' }} />
                              
                              {/* Edit Button */}
                              <TouchableOpacity
                                style={{ position: 'absolute', top: -6, right: 18, backgroundColor: '#6366F1', borderRadius: 10, width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fff' }}
                                onPress={() => {
                                  setEditingPhoto({ file_url: url, outfitId: outfit.id, isPending: true, pendingIndex: idx });
                                  setEditDrawerVisible(true);
                                }}
                              >
                                <Edit2 size={10} color="#fff" />
                              </TouchableOpacity>

                              {/* Delete Button */}
                              <TouchableOpacity
                                style={{ position: 'absolute', top: -6, right: -6, backgroundColor: '#EF4444', borderRadius: 10, width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fff' }}
                                onPress={() => removePendingPhoto(outfit.id, idx)}
                              >
                                <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>X</Text>
                              </TouchableOpacity>
                            </View>`;
code = code.replace(pendingUITarget, newPendingUI);

// Import Edit2 if not already imported from lucide-react-native
if(!code.includes("import {") || (!code.includes("Edit2") && code.includes("lucide-react-native"))) {
  // It should be there because the previous code used it for boutique photos. Let's just make sure.
}

fs.writeFileSync(path, code);
console.log("CustomerOrderDetailScreen.js edit icons patched!");
