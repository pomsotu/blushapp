const CACHE_NAME = 'blush-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png'
];

// Active background timeout pool for Safari/iOS fallback
const activeTimeouts = new Map();

// Install event - caching basic shell assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

// Fetch event - cache first, fallback to network
self.addEventListener('fetch', (e) => {
  // Only cache GET requests
  if (e.request.method !== 'GET') return;
  
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in background to update cache (stale-while-revalidate)
        fetch(e.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(e.request, networkResponse));
            }
          })
          .catch(() => {/* Ignore network failures when offline */});
        return cachedResponse;
      }
      
      return fetch(e.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Fallback for offline page assets
        return caches.match('/');
      });
    })
  );
});

// Handle incoming messages from the React app
self.addEventListener('message', (event) => {
  const data = event.data;
  
  if (data && data.type === 'SCHEDULE_REMINDERS') {
    const { appt, settings } = data;
    
    // Silence/clear any previous reminders for this appointment first
    clearRemindersForAppt(appt.id);

    // If cancelled, do not schedule new ones
    if (appt.status === 'cancelled') return;

    // Parse appointment time
    const appointmentTime = new Date(`${appt.date}T${appt.time}:00`).getTime();
    const now = Date.now();

    // Check reminder intervals: 24h, 2h, 30m
    const scheduleItems = [];
    
    if (settings.remind24h) {
      const time24h = appointmentTime - 24 * 60 * 60 * 1000;
      if (time24h > now) {
        scheduleItems.push({
          time: time24h,
          body: `Tomorrow at ${formatTime(appt.time)} — ${appt.type === 'business' ? `Braiding/Nails for ${appt.clientName}` : appt.title} 🌸`
        });
      }
    }
    
    if (settings.remind2h) {
      const time2h = appointmentTime - 2 * 60 * 60 * 1000;
      if (time2h > now) {
        scheduleItems.push({
          time: time2h,
          body: `In 2 hours — ${appt.type === 'business' ? `${appt.service === 'both' ? 'Hair & Nails' : appt.service} for ${appt.clientName}` : appt.title}. Get ready! 💅`
        });
      }
    }

    if (settings.remind30m) {
      const time30m = appointmentTime - 30 * 60 * 1000;
      if (time30m > now) {
        scheduleItems.push({
          time: time30m,
          body: `Tari! Your appt starts in 30 mins: ${appt.type === 'business' ? `${appt.clientName} 🌸` : appt.title}`
        });
      }
    }

    // Register each scheduled alert
    scheduleItems.forEach((item, index) => {
      const reminderId = `${appt.id}_${index}`;
      scheduleLocalReminder(reminderId, appt.type === 'business' ? 'Business Booking 💅' : 'Personal Schedule 🌸', item.body, item.time);
    });
  }
});

// Clear reminders helper
function clearRemindersForAppt(apptId) {
  // Clear active standard JS timeouts
  for (let i = 0; i < 3; i++) {
    const key = `${apptId}_${i}`;
    if (activeTimeouts.has(key)) {
      clearTimeout(activeTimeouts.get(key));
      activeTimeouts.delete(key);
    }
  }
  
  // Clear Notification Trigger API registrations (if active)
  if ('showTrigger' in Notification.prototype) {
    self.registration.getNotifications().then((notifications) => {
      notifications.forEach((notification) => {
        if (notification.tag && notification.tag.startsWith(apptId)) {
          notification.close();
        }
      });
    });
  }
}

// Schedule notification
function scheduleLocalReminder(id, title, body, timestamp) {
  // Check for progressive Notification Trigger API support (Chromium-only)
  if ('showTrigger' in Notification.prototype) {
    try {
      self.registration.showNotification(title, {
        body: body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: id,
        showTrigger: new TimestampTrigger(timestamp)
      });
      return;
    } catch (e) {
      console.warn('TimestampTrigger registration failed, falling back to timeout scheduler', e);
    }
  }

  // Fallback: standard service worker timer loop (runs as long as SW thread stays alive)
  const delay = timestamp - Date.now();
  if (delay > 0) {
    const timeout = setTimeout(() => {
      self.registration.showNotification(title, {
        body: body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: id
      });
      activeTimeouts.delete(id);
    }, delay);
    
    activeTimeouts.set(id, timeout);
  }
}

// Notification click behavior
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open, otherwise open new tab
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return self.clients.openWindow('/');
    })
  );
});

// Helper formatting utilities
function formatTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}
