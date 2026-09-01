const CACHE_NAME = 'blush-cache-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon.png',
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
  
  if (!data) return;

  // Immediate notification trigger (for in-app alerts and test notifications)
  if (data.type === 'SHOW_IMMEDIATE_NOTIFICATION') {
    const { title, options } = data;
    self.registration.showNotification(title, {
      icon: '/icon.png',
      badge: '/icon.png',
      ...options
    });
    return;
  }

  if (data.type === 'SCHEDULE_REMINDERS') {
    const { appt, settings } = data;
    
    // Silence/clear any previous reminders for this appointment first
    clearRemindersForAppt(appt.id);

    // If cancelled or completed, do not schedule upcoming reminders
    if (appt.status === 'cancelled' || appt.status === 'completed') return;

    // Parse appointment start & end time
    const [year, month, day] = appt.date.split('-').map(Number);
    const [hour, minute] = appt.time.split(':').map(Number);
    const startTime = new Date(year, month - 1, day, hour, minute).getTime();
    const durationMins = appt.type === 'business' ? (appt.durationMins || 60) : 60;
    const endTime = startTime + durationMins * 60 * 1000;
    const now = Date.now();

    const scheduleItems = [];

    // 1. 30 Minutes Before (Requested by Tari)
    if (settings.remind30m) {
      const time30m = startTime - 30 * 60 * 1000;
      if (time30m > now) {
        scheduleItems.push({
          time: time30m,
          title: appt.type === 'business' ? 'Upcoming Booking in 30 Mins 💅' : 'Upcoming Schedule in 30 Mins 🌸',
          body: appt.type === 'business'
            ? `Tari, your appointment with ${appt.clientName} starts in 30 mins!`
            : `Tari, your event "${appt.title}" starts in 30 mins!`
        });
      }
    }

    // 2. 2 Hours After (Follow-up to mark completed/cancelled requested by Tari)
    if (settings.remind2hAfter) {
      const time2hAfter = endTime + 2 * 60 * 60 * 1000;
      if (time2hAfter > now) {
        scheduleItems.push({
          time: time2hAfter,
          title: 'Appointment Follow-up ✨',
          body: appt.type === 'business'
            ? `Did your appointment with ${appt.clientName} finish? Tap to mark it as completed or cancelled.`
            : `Did your event "${appt.title}" finish? Tap to mark it as completed or cancelled.`
        });
      }
    }

    // 3. 24 Hours Before (Optional)
    if (settings.remind24h) {
      const time24h = startTime - 24 * 60 * 60 * 1000;
      if (time24h > now) {
        scheduleItems.push({
          time: time24h,
          title: 'Appointment Tomorrow 🌸',
          body: `Tomorrow at ${formatTime(appt.time)}: ${appt.type === 'business' ? `Braiding/Nails for ${appt.clientName}` : appt.title}`
        });
      }
    }
    
    // 4. 2 Hours Before (Optional)
    if (settings.remind2h) {
      const time2h = startTime - 2 * 60 * 60 * 1000;
      if (time2h > now) {
        scheduleItems.push({
          time: time2h,
          title: 'Appointment in 2 Hours 💅',
          body: `In 2 hours: ${appt.type === 'business' ? `${appt.clientName}` : appt.title}. Get ready!`
        });
      }
    }

    // Register each scheduled alert
    scheduleItems.forEach((item, index) => {
      const reminderId = `${appt.id}_${index}`;
      scheduleLocalReminder(reminderId, item.title, item.body, item.time);
    });
  }
});

// Clear reminders helper
function clearRemindersForAppt(apptId) {
  // Clear active standard JS timeouts
  for (let i = 0; i < 6; i++) {
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
        icon: '/icon.png',
        badge: '/icon.png',
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
        icon: '/icon.png',
        badge: '/icon.png',
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
