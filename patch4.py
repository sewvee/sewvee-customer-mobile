import re

with open('src/screens/CustomerOrderDetailScreen.js', 'r') as f:
    code = f.read()

# Crop Photo
crop_target = """      const fileUrl = uploadResult?.file_url || uploadResult?.data?.file_url || uploadResult?.url || uploadResult?.data?.url || '';
      if (!fileUrl) throw new Error('Upload failed');
      await fetch(`${URL_CUSTOMER_PORTAL_ORDERS}/${order.id}/outfits/${editingPhoto.outfitId}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachment_url: fileUrl, message: 'Updated reference photo (cropped)' }),
      });"""

new_crop_target = """      const fileUrl = uploadResult?.file_url || uploadResult?.data?.file_url || uploadResult?.url || uploadResult?.data?.url || '';
      if (!fileUrl) throw new Error('Upload failed');
      
      if (editingPhoto.isPending) {
        setPendingPhotos(prev => {
          const list = [...(prev[editingPhoto.outfitId] || [])];
          list[editingPhoto.pendingIndex] = fileUrl;
          return { ...prev, [editingPhoto.outfitId]: list };
        });
      } else {
        await fetch(`${URL_CUSTOMER_PORTAL_ORDERS}/${order.id}/outfits/${editingPhoto.outfitId}/requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attachment_url: fileUrl, message: 'Updated reference photo (cropped)' }),
        });
      }"""
code = code.replace(crop_target, new_crop_target)

# Change Photo
change_target = """        const fileUrl = uploadResult?.file_url || uploadResult?.data?.file_url || uploadResult?.url || uploadResult?.data?.url || '';
        if (!fileUrl) throw new Error('Upload failed');
        await fetch(`${URL_CUSTOMER_PORTAL_ORDERS}/${order.id}/outfits/${editingPhoto.outfitId}/requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attachment_url: fileUrl, message: 'Updated reference photo' }),
        });"""

new_change_target = """        const fileUrl = uploadResult?.file_url || uploadResult?.data?.file_url || uploadResult?.url || uploadResult?.data?.url || '';
        if (!fileUrl) throw new Error('Upload failed');
        
        if (editingPhoto.isPending) {
          setPendingPhotos(prev => {
            const list = [...(prev[editingPhoto.outfitId] || [])];
            list[editingPhoto.pendingIndex] = fileUrl;
            return { ...prev, [editingPhoto.outfitId]: list };
          });
        } else {
          await fetch(`${URL_CUSTOMER_PORTAL_ORDERS}/${order.id}/outfits/${editingPhoto.outfitId}/requests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ attachment_url: fileUrl, message: 'Updated reference photo' }),
          });
        }"""
code = code.replace(change_target, new_change_target)

# Annotate Photo
annotate_target = """      const fileUrl = uploadResult?.file_url || uploadResult?.data?.file_url || uploadResult?.url || uploadResult?.data?.url || '';
      if (!fileUrl) throw new Error('Upload failed');
      await fetch(`${URL_CUSTOMER_PORTAL_ORDERS}/${order.id}/outfits/${editingPhoto.outfitId}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachment_url: fileUrl, message: 'Annotated reference photo' }),
      });"""

new_annotate_target = """      const fileUrl = uploadResult?.file_url || uploadResult?.data?.file_url || uploadResult?.url || uploadResult?.data?.url || '';
      if (!fileUrl) throw new Error('Upload failed');
      
      if (editingPhoto.isPending) {
        setPendingPhotos(prev => {
          const list = [...(prev[editingPhoto.outfitId] || [])];
          list[editingPhoto.pendingIndex] = fileUrl;
          return { ...prev, [editingPhoto.outfitId]: list };
        });
      } else {
        await fetch(`${URL_CUSTOMER_PORTAL_ORDERS}/${order.id}/outfits/${editingPhoto.outfitId}/requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attachment_url: fileUrl, message: 'Annotated reference photo' }),
        });
      }"""
code = code.replace(annotate_target, new_annotate_target)

# Fix handleDeletePhoto for pending photos
delete_target = """  const handleDeletePhoto = async () => {
    setEditDrawerVisible(false);
    if (!editingPhoto) return;
    setLoading(true);
    try {
      await fetch(`${URL_CUSTOMER_PORTAL_ORDERS}/${order.id}/outfits/${editingPhoto.outfitId}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Deleted a reference photo', attachment_url: null }),
      });
      refreshData();
      showToast('Photo removed', 'success');
    } catch (err) {
      showToast(err?.message || 'Failed to remove photo', 'error');
    } finally {
      setLoading(false);
      setEditingPhoto(null);
    }
  };"""

new_delete_target = """  const handleDeletePhoto = async () => {
    setEditDrawerVisible(false);
    if (!editingPhoto) return;
    
    if (editingPhoto.isPending) {
      removePendingPhoto(editingPhoto.outfitId, editingPhoto.pendingIndex);
      setEditingPhoto(null);
      return;
    }
    
    setLoading(true);
    try {
      await fetch(`${URL_CUSTOMER_PORTAL_ORDERS}/${order.id}/outfits/${editingPhoto.outfitId}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Deleted a reference photo', attachment_url: null }),
      });
      refreshData();
      showToast('Photo removed', 'success');
    } catch (err) {
      showToast(err?.message || 'Failed to remove photo', 'error');
    } finally {
      setLoading(false);
      setEditingPhoto(null);
    }
  };"""
code = code.replace(delete_target, new_delete_target)

with open('src/screens/CustomerOrderDetailScreen.js', 'w') as f:
    f.write(code)

print("CustomerOrderDetailScreen.js edit logic fully patched!")
