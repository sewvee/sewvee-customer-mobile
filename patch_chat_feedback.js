const fs = require('fs');
const path = 'src/screens/CustomerChatScreen.js';
let content = fs.readFileSync(path, 'utf8');

const regex = /<CustomerFeedbackModal[\s\S]*?\/>/;
const replacement = `{(() => {
        const [ctxOrderId, ctxOutfitId] = (contextSelected || '').split('_');
        return (
          <CustomerFeedbackModal 
            visible={feedbackModalVisible} 
            onClose={() => setFeedbackModalVisible(false)} 
            orderId={ctxOrderId || passedOrderId || (boutiqueOrders[0]?.id)}
            outfitId={ctxOutfitId}
            onSubmitSuccess={() => fetchMessages()}
          />
        );
      })()}`;

content = content.replace(regex, replacement);

fs.writeFileSync(path, content);
console.log('Patched chat screen feedback modal props!');
