const fs = require('fs');
const path = '/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Business-Mobile/src/screens/MessagesListScreen.js';
let content = fs.readFileSync(path, 'utf8');

// The user wants: name | Ord or Enq | Tag.
// Right now, Name and Time are in threadHeader. orderLabel and Tag are below it.
// Let's combine them into the threadHeader!

content = content.replace(
  /<View style=\{styles\.threadHeader\}>\s*<Text style=\{\[styles\.customerName, isUnread && styles\.customerNameUnread\]\} numberOfLines=\{1\}>\s*\{toTitleCase\(item\.customer_name \|\| 'Unknown Customer'\)\}\s*<\/Text>\s*<Text style=\{\[styles\.timeText, isUnread && styles\.timeTextUnread\]\}>\s*\{timeFormatted\}\s*<\/Text>\s*<\/View>\s*\{\!\!orderLabel && \(\s*<View style=\{\{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 \}\}>\s*<Text style=\{styles\.orderLabel\} numberOfLines=\{1\}>\s*\#\{orderLabel\}\s*<\/Text>\s*\{item\.order_type === 'STITCHING_REQUEST' && \(\s*<View style=\{styles\.inquiryBadge\}>\s*<Text style=\{styles\.inquiryBadgeText\}>INQUIRY<\/Text>\s*<\/View>\s*\)\}\s*<\/View>\s*\)\}/m,
  `<View style={styles.threadHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8, overflow: 'hidden' }}>
              <Text style={[styles.customerName, isUnread && styles.customerNameUnread]} numberOfLines={1}>
                {toTitleCase(item.customer_name || 'Unknown Customer')} {!!orderLabel && \`| #\${orderLabel}\`}
              </Text>
              {item.order_type === 'STITCHING_REQUEST' && (
                <View style={[styles.inquiryBadge, { marginLeft: 6 }]}>
                  <Text style={styles.inquiryBadgeText}>INQUIRY</Text>
                </View>
              )}
            </View>
            <Text style={[styles.timeText, isUnread && styles.timeTextUnread, { flexShrink: 0 }]}>
              {timeFormatted}
            </Text>
          </View>`
);

fs.writeFileSync(path, content);
console.log('MessagesListScreen patched.');
