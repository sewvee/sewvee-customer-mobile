/**
 * chatSocketService.js
 *
 * Maintains a SINGLE persistent Socket.IO connection for the customer.
 * Listens for CHAT_MESSAGE_SENT events globally (for all orders).
 * When a message arrives and the customer is NOT inside that specific chat,
 * it increments the tab badge immediately — exactly like WhatsApp.
 */
import io from 'socket.io-client';
import { API_DOMAIN } from '../config/env';

let globalSocket = null;
let activeChatOrderId = null;

const chatSocketService = {
  start(token, dispatch) {
    if (globalSocket?.connected) return;

    globalSocket = io(API_DOMAIN, {
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
    });

    globalSocket.on('connect', () => {
      console.log('[GlobalSocket] Connected — listening for all chat events');
    });

    globalSocket.on('CHAT_MESSAGE_SENT', (event) => {
      const msg = event?.payload;
      if (!msg) return;
      if (msg.sender_type !== 'BUSINESS') return;

      const incomingOrderId = String(msg.order_id);
      const currentlyViewing = String(activeChatOrderId || '');

      if (incomingOrderId === currentlyViewing) return;

      import('../store/chatSlice').then(({ incrementChatUnread }) => {
        dispatch(incrementChatUnread());
      });
    });

    globalSocket.on('disconnect', () => {
      console.log('[GlobalSocket] Disconnected');
    });

    globalSocket.on('connect_error', (err) => {
      console.warn('[GlobalSocket] Connection error:', err.message);
    });
  },

  setActiveChatOrderId(orderId) {
    activeChatOrderId = orderId ? String(orderId) : null;
  },

  clearActiveChatOrderId() {
    activeChatOrderId = null;
  },

  stop() {
    if (globalSocket) {
      globalSocket.disconnect();
      globalSocket = null;
    }
    activeChatOrderId = null;
  },
};

export default chatSocketService;
