import { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';

// Extracts the API base url without /mobile/
const getSocketUrl = (apiUrl) => {
  try {
    const url = new URL(apiUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return 'https://api-stage.sewvee.com'; // fallback
  }
};

export function useOrderChat(orderId, apiUrl) {
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  
  const authUser = useSelector(state => state.auth?.user);
  
  const getToken = () => {
    const token = authUser?.token || authUser?.data?.token || authUser?.accessToken || authUser?.data?.accessToken || authUser?.access_token || authUser?.data?.access_token || '';
    return token ? (token.startsWith('Bearer ') ? token.substring(7) : token) : '';
  };

  useEffect(() => {
    const token = getToken();
    if (!orderId || !token) return;

    const socketUrl = getSocketUrl(apiUrl);
    
    console.log(`[Mobile] Connecting to socket at ${socketUrl} for order ${orderId}...`);
    
    const newSocket = io(socketUrl, {
      transports: ['websocket'], // force websocket for React Native
      auth: {
        token: token,
        orderId: String(orderId),
      },
    });

    newSocket.on('connect', () => {
      console.log('[Mobile] Order chat socket connected');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('[Mobile] Order chat socket disconnected');
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('[Mobile] Order chat socket connection error:', error);
      setConnected(false);
    });

    newSocket.on('CHAT_MESSAGE_SENT', (data) => {
      console.log('[Mobile] Received CHAT_MESSAGE_SENT event:', data);
      if (data && data.payload) {
        setMessages((prevMessages) => {
          // Avoid duplicates based on ID
          const exists = prevMessages.find(m => m.id === data.payload.id);
          if (exists) return prevMessages;
          
          return [...prevMessages, data.payload];
        });
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [orderId, authUser]);

  const addMessageLocally = useCallback((message) => {
    setMessages((prevMessages) => {
      const exists = prevMessages.find(m => m.id === message.id);
      if (exists) return prevMessages;
      return [...prevMessages, message];
    });
  }, []);

  return {
    socketMessages: messages,
    connected,
    addMessageLocally,
  };
}
