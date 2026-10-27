// Browser Push & In-App Notification Helper for Payv Marketplace

export const isPushNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getPushPermissionState = (): NotificationPermission => {
  if (!isPushNotificationSupported()) return 'denied';
  return Notification.permission;
};

export const requestPushNotificationPermission = async (): Promise<boolean> => {
  if (!isPushNotificationSupported()) {
    console.warn("Web Push Notifications are not supported by this browser.");
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (e) {
      console.warn("Failed to request push notification permission:", e);
    }
  }

  return false;
};

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: any;
  url?: string;
}

export const showBrowserPushNotification = (payload: PushNotificationPayload): Notification | null => {
  if (!isPushNotificationSupported() || Notification.permission !== 'granted') {
    return null;
  }

  try {
    const notification = new Notification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: payload.tag || `notif_${Date.now()}`,
      data: payload.data
    });

    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      if (payload.data?.itemId && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('payv_open_item', { detail: { itemId: payload.data.itemId } }));
      }
      notification.close();
    };

    return notification;
  } catch (e) {
    console.warn("Failed to display browser push notification:", e);
    return null;
  }
};
