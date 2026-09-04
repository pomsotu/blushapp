// Check if device is iOS and not yet installed to home screen
export function isIOSRequiresInstall() {
  if (typeof window === 'undefined') return false;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  return isIOS && !isStandalone;
}

// Utility to convert VAPID base64 key to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// Subscribe current browser/device to Web Push Notifications
export async function registerPushSubscription(userId = 'tari') {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, reason: 'Push notifications unsupported in this browser' };
  }

  // On iOS, Web Push requires PWA to be installed on home screen (iOS 16.4+)
  if (isIOSRequiresInstall()) {
    return { success: false, reason: 'ios_install_required' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Get VAPID public key from backend
      const res = await fetch('/api/vapid-public-key');
      if (!res.ok) throw new Error('Failed to retrieve VAPID key');
      const { publicKey } = await res.json();
      const convertedVapidKey = urlBase64ToUint8Array(publicKey);

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
    }

    // Register subscription on backend
    if (subscription) {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription, userId })
      });
    }

    return { success: true, subscription };
  } catch (err) {
    console.error('[PushManager] Registration failed:', err);
    return { success: false, error: err.message };
  }
}

// Unsubscribe flow
export async function unsubscribeFromPush() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });
      await subscription.unsubscribe();
    }
    return { success: true };
  } catch (err) {
    console.error('[PushManager] Unsubscribe failed:', err);
    return { success: false, error: err.message };
  }
}

// Sync appointments and active settings to backend push scheduler
export async function syncRemindersWithServer(appointments, settings) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    // If permission is granted but not yet subscribed, attempt automatic subscription
    if (!subscription && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const regRes = await registerPushSubscription();
      if (regRes.success) {
        subscription = regRes.subscription;
      }
    }

    await fetch('/api/sync-reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription || null,
        appointments: appointments || [],
        settings: settings || {}
      })
    });
  } catch (err) {
    console.warn('[PushManager] Sync reminders failed:', err);
  }
}

// Trigger a server-side real Web Push test
export async function sendServerTestPush() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, reason: 'Unsupported' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const subResult = await registerPushSubscription();
      if (!subResult.success) return subResult;
      subscription = subResult.subscription;
    }

    const res = await fetch('/api/test-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription })
    });

    const data = await res.json();
    return { success: res.ok, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
