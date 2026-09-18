const fs = require('fs');
const file = 'src/screens/NewStitchRequestScreen.js';
let content = fs.readFileSync(file, 'utf8');

const target = /const handleSubmit = async \(\) => \{[\s\S]*?const renderStep1 = \(\) => \(/s;

const replacement = `const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const formattedToken = token ? (token.startsWith('Bearer ') ? token : \`Bearer \${token}\`) : '';
      
      const payloadOutfits = [];
      
      for (const outfit of outfits) {
        const uploadedUrls = [];
        for (const image of outfit.images) {
          const formData = new FormData();
          formData.append('file', {
            uri: image.uri,
            type: image.type || 'image/jpeg',
            name: image.fileName || 'photo.jpg'
          });
          formData.append('key_name', 'order_photos');
          
          try {
            const uploadRes = await axios.post(URL_UPLOAD, formData, {
              headers: { 
                Authorization: formattedToken,
                'Content-Type': 'multipart/form-data'
              }
            });
            const url = uploadRes.data?.file_url || uploadRes.data?.data?.file_url || uploadRes.data?.url;
            if (url) uploadedUrls.push(url);
          } catch (err) {
            console.warn('Failed to upload image', err);
          }
        }
        
        if (outfit.collageUrl) {
          const formData = new FormData();
          formData.append('file', {
            uri: outfit.collageUrl,
            type: 'image/jpeg',
            name: 'collage.jpg'
          });
          formData.append('key_name', 'order_photos');
          
          try {
            const uploadRes = await axios.post(URL_UPLOAD, formData, {
              headers: { 
                Authorization: formattedToken,
                'Content-Type': 'multipart/form-data'
              }
            });
            const url = uploadRes.data?.file_url || uploadRes.data?.data?.file_url || uploadRes.data?.url;
            if (url) uploadedUrls.push(url);
          } catch (err) {
            console.warn('Failed to upload collage', err);
          }
        }
        
        const lines = [];
        lines.push(\`Category: \${outfit.category}\`);
        if (outfit.description) lines.push(\`Description: \${outfit.description}\`);
        if (outfit.measurement) lines.push(\`Measurement: \${outfit.measurement}\`);
        if (deliveryDate) lines.push(\`Expected Date: \${deliveryDate}\`);
        
        payloadOutfits.push({
          name: outfit.category,
          quantity: 1,
          total_amount: 0,
          customer_notes: lines.join('\\n'),
          photos: uploadedUrls.map(u => ({ file_url: u })),
          items: [],
        });
      }

      const payload = {
        order_type: 'STITCHING_REQUEST',
        customer_mobile: user?.mobile,
        customer_name: user?.name,
        company_id: companyId,
        outfits: payloadOutfits,
      };

      await axios.post(\`\${URL_ORDERS.replace('/orders', '/customer-portal/orders')}\`, payload, {
        headers: { 
          Authorization: formattedToken, 
          'Content-Type': 'application/json' 
        }
      });
      
      Alert.alert('Success', 'Stitch Request Sent Successfully!');
      navigation.navigate('CustomerOrders');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep1 = () => (`

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log('Fixed handleSubmit syntax');
