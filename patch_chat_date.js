const fs = require('fs');
const path = 'src/components/CustomerRequestsTab.js';

let content = fs.readFileSync(path, 'utf8');

// Ensure React is imported if React.Fragment is used.
if (!content.includes('import React')) {
  content = "import React from 'react';\n" + content;
}

const target = `outfitRequests.map(req => {
            const isCustomer = req.sender_type === 'CUSTOMER';
            return (
              <View key={req.id} style={[styles.messageRow, isCustomer ? styles.msgRight : styles.msgLeft]}>
                <View style={[styles.bubble, isCustomer ? styles.bubbleCustomer : styles.bubbleBoutique]}>
                  {req.attachment_url ? (
                    <Image source={{ uri: req.attachment_url }} style={{ width: 200, height: 200, borderRadius: 8, marginBottom: req.message ? 8 : 0 }} />
                  ) : null}
                  {req.message ? (
                    <Text style={{ fontSize: 14, color: isCustomer ? '#FFF' : '#1E293B' }}>{req.message}</Text>
                  ) : null}
                  <Text style={{ fontSize: 10, color: isCustomer ? 'rgba(255,255,255,0.7)' : '#94A3B8', marginTop: 4, alignSelf: 'flex-end' }}>
                    {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            );
          })`;

const replacement = `(() => {
            let lastDateString = null;
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            return outfitRequests.map(req => {
              const isCustomer = req.sender_type === 'CUSTOMER';
              const reqDate = new Date(req.created_at);
              
              let dateLabel = '';
              if (reqDate.toDateString() === today.toDateString()) {
                dateLabel = 'Today';
              } else if (reqDate.toDateString() === yesterday.toDateString()) {
                dateLabel = 'Yesterday';
              } else {
                dateLabel = reqDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              }
              
              let showDivider = false;
              if (dateLabel !== lastDateString) {
                showDivider = true;
                lastDateString = dateLabel;
              }

              return (
                <React.Fragment key={req.id}>
                  {showDivider && (
                    <View style={{ alignItems: 'center', marginVertical: 12 }}>
                      <View style={{ backgroundColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                        <Text style={{ fontSize: 11, fontFamily: 'Inter-Medium', color: '#475569' }}>{dateLabel}</Text>
                      </View>
                    </View>
                  )}
                  <View style={[styles.messageRow, isCustomer ? styles.msgRight : styles.msgLeft]}>
                    <View style={[styles.bubble, isCustomer ? styles.bubbleCustomer : styles.bubbleBoutique]}>
                      {req.attachment_url ? (
                        <Image source={{ uri: req.attachment_url }} style={{ width: 200, height: 200, borderRadius: 8, marginBottom: req.message ? 8 : 0 }} />
                      ) : null}
                      {req.message ? (
                        <Text style={{ fontSize: 14, color: isCustomer ? '#FFF' : '#1E293B' }}>{req.message}</Text>
                      ) : null}
                      <Text style={{ fontSize: 10, color: isCustomer ? 'rgba(255,255,255,0.7)' : '#94A3B8', marginTop: 4, alignSelf: 'flex-end' }}>
                        {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                </React.Fragment>
              );
            });
          })()`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(path, content);
  console.log("Patched CustomerRequestsTab.js successfully");
} else {
  console.log("Target not found!");
}
