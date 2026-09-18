const fs = require('fs');
const file = 'src/screens/NewStitchRequestScreen.js';
let content = fs.readFileSync(file, 'utf8');

const target = /for \(const image of outfit\.images\) \{.*?\}\n/s;
const replacement = `for (const image of outfit.images) {
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
`;

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log('Collage upload logic added');
