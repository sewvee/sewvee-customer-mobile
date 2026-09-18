const fs = require('fs');
const path = 'src/components/CustomerFeedbackModal.js';
let content = fs.readFileSync(path, 'utf8');

// Add outfitId to props
content = content.replace(
  /const CustomerFeedbackModal = \(\{ visible, onClose, orderId, onSubmitSuccess \}\) => \{/,
  'const CustomerFeedbackModal = ({ visible, onClose, orderId, outfitId, onSubmitSuccess }) => {'
);

// Update payload and API call
const newSubmit = `      const payload = {
        stitching_rating: stitchingRating,
        staff_rating: staffRating,
        overall_rating: overallRating, // API probably accepts this since mobile used it, but let's send both to be safe
        boutiqueRating: overallRating,
        comments: comments.trim()
      };

      if (!outfitId) {
        throw new Error('Outfit ID is required for feedback');
      }

      await axios.post(\`\${BASE_URL}customer-portal/orders/\${orderId}/outfits/\${outfitId}/feedback\`, payload, {
        headers: { Authorization: token }
      });
      
      const ratingMsg = \`⭐ Feedback Submitted!\\nStitching: \${stitchingRating}★ | Staff: \${staffRating}★ | Overall: \${overallRating}★\${comments.trim() ? \`\\nComments: \${comments.trim()}\` : ''}\`;
      await axios.post(\`\${BASE_URL}customer-portal/orders/\${orderId}/outfits/\${outfitId}/requests\`, { message: ratingMsg }, {
        headers: { Authorization: token }
      });
      
      Alert.alert('Success', 'Thank you for your feedback!');
      onSubmitSuccess();
      handleClose();`;

content = content.replace(
  /const payload = \{[\s\S]*?handleClose\(\);\n/m,
  newSubmit + '\n'
);

fs.writeFileSync(path, content);
console.log('Patched feedback modal!');
