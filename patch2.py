import re

with open('src/screens/CustomerOrderDetailScreen.js', 'r') as f:
    content = f.read()

target_start = "const handleUploadReferencePhoto = (outfitId) => {"
target_end = "  };"

match = re.search(r"  const handleUploadReferencePhoto = \(outfitId\) => \{.*?\n  \};\n", content, re.DOTALL)
if match:
    old_func = match.group(0)
    new_func = """  const handleUploadReferencePhoto = (outfitId) => {
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
        name: `collage_${Date.now()}.jpg`,
        key_name: 'reference_images',
      })).unwrap();

      const fileUrl = uploadResult?.file_url || uploadResult?.data?.file_url || uploadResult?.url || uploadResult?.data?.url || '';

      if (!fileUrl) {
        throw new Error('No image URL returned from upload server');
      }

      const URL_CUSTOMER_PORTAL_ORDERS = 'http://192.168.1.16:3021/mobile/customer-portal/orders';
      const response = await fetch(`${URL_CUSTOMER_PORTAL_ORDERS}/${order.id}/outfits/${collageOutfitId}/requests`, {
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
         throw new Error('Failed to notify backend');
      }

      refreshData();
      showToast('Photo uploaded successfully', 'success');
    } catch (err) {
      console.log('Upload error:', err);
      showToast(err?.message || 'Failed to upload photo', 'error');
    } finally {
      setUploadingOutfitId(null);
      setLoading(false);
    }
  };
"""
    content = content.replace(old_func, new_func)
    with open('src/screens/CustomerOrderDetailScreen.js', 'w') as f:
        f.write(content)
    print("Patched handleUploadReferencePhoto!")
else:
    print("Could not find the function block")
