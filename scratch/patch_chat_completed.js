const fs = require('fs');

let content = fs.readFileSync('src/screens/CustomerChatScreen.js', 'utf8');

// 1. Add Check to lucide-react-native imports
if (content.includes('import {') && !content.includes('Check,')) {
  content = content.replace(/import \{\s*Camera,/, "import {\n  Check,\n  Camera,");
}

// 2. Patch Photo Request logic
const photoReqRegex = /\/\/ 3\. PWA-style Photo Request Card\n\s*if \(\!isCustomer && msgText && \(msgText\.includes\("PHOTO_REQUEST"\) \|\| msgText\.toLowerCase\(\)\.includes\("photo requested"\)\)\) \{\n\s*return \(\n\s*<View style=\{\{/;

const newPhotoReq = `// 3. PWA-style Photo Request Card
    if (!isCustomer && msgText && (msgText.includes("PHOTO_REQUEST") || msgText.toLowerCase().includes("photo requested"))) {
      const hasUploadedAfter = messages.some(m => 
        m.order_outfit_id === item.order_outfit_id && 
        m.sender_type === 'CUSTOMER' && 
        m.attachment_url && 
        new Date(m.created_at) > new Date(item.created_at)
      );

      if (hasUploadedAfter) {
        return (
          <View style={{ backgroundColor: '#ECFDF5', borderRadius: 12, marginTop: 4, borderWidth: 1, borderColor: '#D1FAE5', borderTopWidth: 4, borderTopColor: '#34D399', padding: 16, alignItems: 'center', width: 260 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
              <Check size={20} color="#059669" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#064E3B', marginBottom: 8, textAlign: 'center' }}>Photos Sent</Text>
            <Text style={{ fontSize: 13, color: '#065F46', textAlign: 'center', lineHeight: 18 }}>
              You have uploaded the requested photos.
            </Text>
          </View>
        );
      }

      return (
        <View style={{`;

content = content.replace(photoReqRegex, newPhotoReq);

// 3. Patch Feedback Request logic
const feedbackReqRegex = /\/\/ 4\. PWA-style Feedback Request Card \(Action required\)\n\s*if \(\!isCustomer && msgText && \(\(msgText\.includes\("\[ACTION_REQUIRED:"\) && \!msgText\.includes\("PHOTO_REQUEST"\)\) \|\| msgText\.toLowerCase\(\)\.includes\("action required"\) \|\| msgText\.toLowerCase\(\)\.includes\("feedback requested"\)\)\) \{\n\s*return \(\n\s*<View style=\{\{/;

const newFeedbackReq = `// 4. PWA-style Feedback Request Card (Action required)
    if (!isCustomer && msgText && ((msgText.includes("[ACTION_REQUIRED:") && !msgText.includes("PHOTO_REQUEST")) || msgText.toLowerCase().includes("action required") || msgText.toLowerCase().includes("feedback requested"))) {
      const hasReviewedAfter = messages.some(m => 
        m.order_outfit_id === item.order_outfit_id && 
        m.sender_type === 'CUSTOMER' && 
        m.message && m.message.includes("⭐ Feedback Submitted!") && 
        new Date(m.created_at) > new Date(item.created_at)
      );

      if (hasReviewedAfter) {
        return (
          <View style={{ backgroundColor: '#ECFDF5', borderRadius: 12, marginTop: 4, borderWidth: 1, borderColor: '#D1FAE5', borderTopWidth: 4, borderTopColor: '#34D399', padding: 16, alignItems: 'center', width: 260 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
              <Check size={20} color="#059669" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#064E3B', marginBottom: 8, textAlign: 'center' }}>Feedback Sent</Text>
            <Text style={{ fontSize: 13, color: '#065F46', textAlign: 'center', lineHeight: 18 }}>
              Thank you for providing your feedback!
            </Text>
          </View>
        );
      }

      return (
        <View style={{`;

content = content.replace(feedbackReqRegex, newFeedbackReq);

fs.writeFileSync('src/screens/CustomerChatScreen.js', content);
