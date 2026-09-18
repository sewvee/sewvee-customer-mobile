const fs = require('fs');
const path = 'src/screens/CustomerOrderDetailScreen.js';
let content = fs.readFileSync(path, 'utf8');

const oldReturn = `              return (
                              const isEnquiry = order.order_type === 'ENQUIRY' || order.order_type === 'STITCHING_REQUEST';
              const isConfigured = !isEnquiry;
              const isExpanded = expandedOutfits[outfit.id || index];

              let cat = outfit.name || 'Outfit';`;

const newReturn = `              const isEnquiry = order.order_type === 'ENQUIRY' || order.order_type === 'STITCHING_REQUEST';
              const isConfigured = !isEnquiry;
              const isExpanded = expandedOutfits[outfit.id || index];

              let cat = outfit.name || 'Outfit';
              let desc = '-';
              let meas = '-';
              let expDate = '-';
              if (outfit.customer_notes) {
                const lines = outfit.customer_notes.split('\\n');
                lines.forEach(l => {
                  if (l.startsWith('Category:')) cat = l.replace('Category:', '').trim();
                  else if (l.startsWith('Description:')) desc = l.replace('Description:', '').trim();
                  else if (l.startsWith('Measurements:')) meas = l.replace('Measurements:', '').trim();
                  else if (l.startsWith('Expected By:')) expDate = l.replace('Expected By:', '').trim();
                });
              }

              return (`;

// Since the oldReturn block doesn't include the full if logic for customer_notes, let me do a more targeted regex replacement.

content = content.replace(/return \(\s*const isEnquiry =/, "const isEnquiry =");
content = content.replace(/const isExpanded = expandedOutfits\[outfit\.id \|\| index\];\s*/, "const isExpanded = expandedOutfits[outfit.id || index];\n\n              return (\n");

fs.writeFileSync(path, content);
console.log('Patched order detail');
