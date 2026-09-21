const fs = require('fs');

let content = fs.readFileSync('src/screens/CustomerChatScreen.js', 'utf8');

// Find the rendering of bubble
const targetBubbleRender = /<View style=\{\[styles\.bubble, isCustomer \? styles\.bubbleCustomer : styles\.bubbleBusiness\]\}>\n\s*<Text style=\{styles\.contextTag\}>\{item\.order_number\} - \{item\.outfit_name\}<\/Text>\n\s*\{renderMessageContent\(item, isCustomer\)\}\n\s*<Text style=\{\[styles\.msgTime, isCustomer \? styles\.msgTimeCustomer : styles\.msgTimeBusiness\]\}>\n\s*\{formatTime\(item\.created_at\)\}\n\s*<\/Text>\n\s*<\/View>/;

const replacedBubbleRender = `<View style={[styles.bubble, isCustomer ? styles.bubbleCustomer : styles.bubbleBusiness, { position: 'relative' }]}>
          {item.order_number || item.outfit_name ? (
             <Text style={styles.contextTag}>
               {[item.order_number, item.outfit_name].filter(Boolean).join(' - ')}
             </Text>
          ) : null}
          {renderMessageContent(item, isCustomer)}
          <Text style={[styles.msgTime, isCustomer ? styles.msgTimeCustomer : styles.msgTimeBusiness]}>
            {formatTime(item.created_at)}
          </Text>
          
          {item.reaction_emoji ? (
            <View style={{
              position: 'absolute',
              bottom: -10,
              right: isCustomer ? undefined : -5,
              left: isCustomer ? -5 : undefined,
              backgroundColor: '#FFF',
              borderRadius: 12,
              padding: 2,
              paddingHorizontal: 4,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              elevation: 2,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
            }}>
              <Text style={{ fontSize: 12 }}>{item.reaction_emoji}</Text>
            </View>
          ) : null}
        </View>`;

content = content.replace(targetBubbleRender, replacedBubbleRender);

fs.writeFileSync('src/screens/CustomerChatScreen.js', content);
