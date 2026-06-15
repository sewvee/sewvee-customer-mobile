import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef
} from 'react';

const ToastContext = createContext(undefined);

export const ToastProvider = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState('success');
  const timerRef = useRef(null);

  const hideToast = useCallback(() => {
    setVisible(false);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const showToast = useCallback((msg, t = 'success', duration = 5000) => {
    // Clear previous timer if exists
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setMessage(msg);
    setType(t);
    setVisible(true);

    // Auto hide after specific duration
    timerRef.current = setTimeout(() => {
      hideToast();
    }, duration);
  }, [hideToast]);

  return (
    <ToastContext.Provider
      value={{
        showToast,
        hideToast,
        toast: { visible, message, type }
      }}
    >
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
};
