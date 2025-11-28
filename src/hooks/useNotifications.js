import { useEffect, useState } from 'react';

/**
 * Hook to manage browser notifications
 */
export function useNotifications() {
  const [permission, setPermission] = useState(Notification.permission);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      setEnabled(Notification.permission === 'granted');
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      setPermission(result);
      setEnabled(result === 'granted');
      return result === 'granted';
    }

    return Notification.permission === 'granted';
  };

  const showNotification = (title, options = {}) => {
    if (!enabled || !('Notification' in window)) {
      return;
    }

    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  };

  return {
    permission,
    enabled,
    requestPermission,
    showNotification,
  };
}

/**
 * Hook to watch for new items and show notifications
 */
export function useNewItemNotifications(items, itemType, options = {}) {
  const { showNotification, enabled, requestPermission } = useNotifications();
  const [lastCount, setLastCount] = useState(0);

  useEffect(() => {
    if (!enabled && options.autoRequest !== false) {
      requestPermission();
    }
  }, [enabled, options.autoRequest, requestPermission]);

  useEffect(() => {
    if (!items || items.length === 0) {
      setLastCount(0);
      return;
    }

    const currentCount = items.length;
    const newItemsCount = currentCount - lastCount;

    if (lastCount > 0 && newItemsCount > 0 && enabled) {
      const message = newItemsCount === 1 
        ? `New ${itemType} received`
        : `${newItemsCount} new ${itemType}s received`;
      
      showNotification(message, {
        body: `You have ${currentCount} ${itemType}${currentCount !== 1 ? 's' : ''} total`,
        tag: `new-${itemType}`,
      });
    }

    setLastCount(currentCount);
  }, [items, lastCount, enabled, itemType, showNotification]);
}

