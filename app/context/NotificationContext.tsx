import React, { createContext, useState, ReactNode, useCallback } from 'react';

export interface NotificationState {
  visible: boolean;
  title: string;
  message: string;
}

interface NotificationContextProps {
  notification: NotificationState;
  showNotification: (title: string, message: string) => void;
  hideNotification: () => void;
}

export const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notification, setNotification] = useState<NotificationState>({
    visible: false,
    title: '',
    message: '',
  });

  const showNotification = useCallback((title: string, message: string) => {
    setNotification({ visible: true, title, message });
    
    // Auto hide after 4 seconds
    setTimeout(() => {
      setNotification((prev) => ({ ...prev, visible: false }));
    }, 4000);
  }, []);

  const hideNotification = useCallback(() => {
    setNotification((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <NotificationContext.Provider value={{ notification, showNotification, hideNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};
