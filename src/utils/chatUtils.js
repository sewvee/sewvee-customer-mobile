export const formatChatMessage = (text) => {
  if (!text) return text;
  
  if (text.startsWith('[ACTION_REQUIRED:')) {
    const actionType = text.replace('[ACTION_REQUIRED:', '').replace(']', '').trim();
    switch (actionType) {
      case 'PHOTO_REQUEST': return '📸 Please upload reference photos';
      case 'MEASUREMENT_UPDATE': return '📏 Measurement update required';
      case 'PAYMENT': return '💳 Payment required';
      default: return '⭐ We would love your feedback on this order!';
    }
  }
  
  if (text.startsWith('⭐ Feedback Submitted!')) {
    return '⭐ Feedback submitted';
  }
  
  if (text.startsWith('Category:')) {
    return '📝 Order details update';
  }
  
  return text;
};
