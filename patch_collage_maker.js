const fs = require('fs');
const path = '/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Customer-Mobile/src/screens/CustomerOrderDetailScreen.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Add Import
if(!code.includes("import CollageMaker")) {
    code = code.replace("import { formatOrderNumber } from '../utils/orderIdFormatter';", "import { formatOrderNumber } from '../utils/orderIdFormatter';\nimport CollageMaker from '../components/CollageMaker';");
}

// 2. Add State
const stateTarget = "const [uploadingOutfitId, setUploadingOutfitId] = useState(null);";
const stateReplacement = "const [uploadingOutfitId, setUploadingOutfitId] = useState(null);\n  const [showCollageMaker, setShowCollageMaker] = useState(false);\n  const [collageOutfitId, setCollageOutfitId] = useState(null);";
if(code.includes(stateTarget) && !code.includes("showCollageMaker")) {
    code = code.replace(stateTarget, stateReplacement);
}

// 3. Replace handleUploadReferencePhoto logic
const handleUploadRegex = /const handleUploadReferencePhoto = \(outfitId\) => \{[\s\S]*?showToast\('Photo uploaded successfully', 'success'\);[\s\S]*?\} finally \{[\s\S]*?setUploadingOutfitId\(null\);[\s\S]*?setLoading\(false\);[\s\S]*?\}[\s\S]*?\};/m;

const newHandleUpload = `const handleUploadReferencePhoto = (outfitId) => {
    setCollageOutfitId(outfitId);
    setShowCollageMaker(true);
  };

  const handleSaveCollage = async (uri) => {
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

      // Call the public customer-portal API directly!
      const URL_CUSTOMER_PORTAL_ORDERS = 'http://192.168.1.16:3021/mobile/customer-portal/orders';
      const response = await fetch(\`\${URL_CUSTOMER_PORTAL_ORDERS}/\${order.id}/outfits/\${collageOutfitId}/requests\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attachment_url: fileUrl,
          message: 'Uploaded via Customer App',
          phone: '9090909090' // Since we don't have user object here easily, but the API accepts it loosely
        })
      });

      if (!response.ok) {
         throw new Error('Failed to notify backend');
      }

      showToast('Photo uploaded successfully', 'success');
      fetchOrderDetails(); // Refresh details
    } catch (err) {
      console.log('Upload error:', err);
      showToast(err?.message || 'Failed to upload photo', 'error');
    } finally {
      setUploadingOutfitId(null);
      setLoading(false);
    }
  };`;

if(code.match(handleUploadRegex)) {
    code = code.replace(handleUploadRegex, newHandleUpload);
} else {
    console.log("Could not match handleUploadReferencePhoto");
}

// 4. Add component to return block
const renderTarget = "</SafeAreaView>";
const renderReplacement = `  <CollageMaker
        visible={showCollageMaker}
        onClose={() => setShowCollageMaker(false)}
        onSaveReference={handleSaveCollage}
        galleryFolders={[]}
      />
    </SafeAreaView>`;

if(code.includes(renderTarget) && !code.includes("<CollageMaker")) {
    code = code.replace(renderTarget, renderReplacement);
}

fs.writeFileSync(path, code);
console.log("CustomerOrderDetailScreen.js patched!");
