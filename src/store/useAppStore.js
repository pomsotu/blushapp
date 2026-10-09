import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { parseAppointmentTime, getOshawaTodayStr } from '../utils/dateUtils';
import { syncRemindersWithServer, sendServerTestPush } from '../utils/pushManager';
import { sanitizeItems, itemsTotal, deriveService } from '../utils/services';
import { absStart, getDurationMins, rangesOverlap, findConflict } from '../utils/schedule';

// Soft, pleasant blossom chime for in-app and active tab alerts
export const playAlertChime = () => {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const now = ctx.currentTime;
    
    // Note 1 (E5 - 659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.45);

    // Note 2 (B5 - 987.77 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.12);
    gain2.gain.setValueAtTime(0.25, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.75);
  } catch {
    // Audio context may be restricted before first interaction
  }
};

// Trigger service worker reschedule
const notifyServiceWorker = (appt, settings) => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SCHEDULE_REMINDERS',
      appt,
      settings
    });
  }
};

// Direct notification dispatcher with mobile & desktop compatibility
export const triggerDirectNotification = async (title, options = {}) => {
  if (typeof window === 'undefined') {
    return false;
  }

  // 1. Trigger in-app dynamic toast popup immediately
  try {
    const store = useAppStore.getState();
    if (store && store.showToast) {
      store.showToast({ 
        title, 
        body: options.body || 'Blush appointment reminder',
        id: Date.now()
      });
    }
  } catch {
    // In-app toast fallback
  }

  // 2. Play audio chime synchronously
  try {
    playAlertChime();
  } catch {}

  // 3. Trigger hardware vibration on mobile devices
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([200, 100, 200]);
    }
  } catch {}

  // 4. If Notification API is available and permission is granted, dispatch OS system notification
  if ('Notification' in window && Notification.permission === 'granted') {
    const notificationOptions = {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      tag: options.tag || ('blush_' + Date.now()),
      renotify: true,
      requireInteraction: false,
      ...options
    };

    // A. Service Worker Registration with 1000ms safety timeout to prevent hanging
    if ('serviceWorker' in navigator) {
      try {
        const swRegPromise = navigator.serviceWorker.ready;
        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 1000));
        const reg = await Promise.race([swRegPromise, timeoutPromise]);
        
        if (reg && reg.showNotification) {
          await reg.showNotification(title, notificationOptions);
          return true;
        }
      } catch (err) {
        console.warn('SW showNotification error:', err);
      }
    }

    // B. Direct browser Notification constructor fallback
    try {
      if (typeof Notification === 'function') {
        const notif = new Notification(title, notificationOptions);
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
        return true;
      }
    } catch (err2) {
      console.warn('Direct Notification constructor fallback error:', err2);
    }
  }

  return true;
};

// Check if two time slots overlap
export const checkOverlap = (date1, time1, duration1, date2, time2, duration2) => {
  const start1 = absStart(date1, time1);
  const start2 = absStart(date2, time2);
  return rangesOverlap(start1, start1 + (duration1 || 60), start2, start2 + (duration2 || 60));
};

// Redundant Data Safety Vault Helper (Guarantees data preservation across updates)
export const saveSafetyVault = (appointments) => {
  if (typeof window === 'undefined' || !Array.isArray(appointments) || appointments.length === 0) return;
  try {
    const vault = {
      timestamp: Date.now(),
      dateSaved: new Date().toISOString(),
      count: appointments.length,
      appointments
    };
    localStorage.setItem('blush_safety_vault', JSON.stringify(vault));
  } catch {}
};

export const getSafetyVault = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('blush_safety_vault');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// Keep a business booking's legacy service/price fields in sync with its items
const withNormalizedItems = (fields) => {
  if (!Array.isArray(fields.items)) return fields;
  const items = sanitizeItems(fields.items);
  return {
    ...fields,
    items,
    price: itemsTotal(items),
    service: deriveService(items)
  };
};

// How long the "Undo" bar stays up after completing or cancelling
export const UNDO_WINDOW_MS = 6000;

// Empty database by default for production use
const INITIAL_APPOINTMENTS = [];

export const useAppStore = create(
  persist(
    (set, get) => ({
      appointments: INITIAL_APPOINTMENTS,
      notifiedHistory: {},
      activeToast: null,
      lastStatusChange: null,
      settings: {
        remind30m: true,       // 30 mins before appointment
        remind2hAfter: true,   // 2 hours after appointment (follow-up to mark completed/cancelled)
        remind24h: false,      // 24 hours before
        remind2h: false        // 2 hours before
      },

      showToast: (toast) => {
        set({ activeToast: toast });
        setTimeout(() => {
          if (get().activeToast === toast) {
            set({ activeToast: null });
          }
        }, 6000);
      },

      dismissToast: () => set({ activeToast: null }),

      // Conflict Check helper
      checkConflict: (newAppt) => !!findConflict(newAppt, get().appointments),

      // Check and fire pending live alerts (called periodically and on app focus)
      checkPendingNotifications: () => {
        const state = get();
        const { appointments, settings, notifiedHistory } = state;
        const now = Date.now();
        const updatedHistory = { ...notifiedHistory };
        let historyChanged = false;

        appointments.forEach((appt) => {
          if (appt.status !== 'upcoming') return;

          const startTime = parseAppointmentTime(appt.date, appt.time);
          const durationMins = getDurationMins(appt);
          const endTime = startTime + durationMins * 60 * 1000;

          // 1. Check 30-minute Pre-Appointment Reminder
          if (settings.remind30m) {
            const reminderTime = startTime - 30 * 60 * 1000;
            const key = `30m_${appt.id}_${appt.date}_${appt.time}`;

            if (now >= reminderTime && now < startTime) {
              if (!updatedHistory[key]) {
                const title = appt.type === 'business' ? 'Upcoming Booking in 30 Mins 💅' : 'Upcoming Schedule in 30 Mins 🌸';
                const body = appt.type === 'business'
                  ? `Tari, your appointment with ${appt.clientName || 'your client'} starts in 30 mins!`
                  : `Tari, your event "${appt.title || 'your schedule item'}" starts in 30 mins!`;

                triggerDirectNotification(title, { body, tag: key });
                updatedHistory[key] = now;
                historyChanged = true;
              }
            }
          }

          // 2. Check 2-hour Post-Appointment Follow-up Reminder
          if (settings.remind2hAfter) {
            const followupTime = endTime + 2 * 60 * 60 * 1000;
            const followupWindowEnd = followupTime + 24 * 60 * 60 * 1000;
            const key = `2hAfter_${appt.id}_${appt.date}_${appt.time}`;

            // Trigger window: from 2 hours after end time up to 24 hours after
            if (now >= followupTime && now <= followupWindowEnd && !updatedHistory[key]) {
              const title = 'Appointment Follow-up ✨';
              const body = appt.type === 'business'
                ? `Did your appointment with ${appt.clientName || 'your client'} finish? Tap to mark it as completed or cancelled.`
                : `Did your event "${appt.title || 'your event'}" finish? Tap to mark it as completed or cancelled.`;

              triggerDirectNotification(title, {
                body,
                tag: key
              });

              updatedHistory[key] = now;
              historyChanged = true;
            }
          }
        });

        if (historyChanged) {
          set({ notifiedHistory: updatedHistory });
        }
      },

      // Store actions
      addAppointment: (appt) => {
        const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
        const newAppt = {
          ...withNormalizedItems(appt),
          id,
          status: 'upcoming',
          createdAt: new Date().toISOString()
        };
        
        set((state) => {
          const updated = [...state.appointments, newAppt];
          saveSafetyVault(updated);
          return { appointments: updated };
        });

        notifyServiceWorker(newAppt, get().settings);
        syncRemindersWithServer(get().appointments, get().settings);
        // Immediate check in case the appointment is scheduled within 30 minutes
        get().checkPendingNotifications();
      },

      updateAppointment: (id, rawFields) => {
        const updatedFields = withNormalizedItems(rawFields);
        set((state) => {
          const updatedAppts = state.appointments.map((a) => 
            a.id === id ? { ...a, ...updatedFields } : a
          );
          
          saveSafetyVault(updatedAppts);

          const updatedAppt = updatedAppts.find((a) => a.id === id);
          if (updatedAppt) {
            notifyServiceWorker(updatedAppt, state.settings);
          }
          syncRemindersWithServer(updatedAppts, state.settings);
          
          return { appointments: updatedAppts };
        });

        get().checkPendingNotifications();
      },

      // Shared status transition: completed / cancelled / back to upcoming
      setAppointmentStatus: (id, status, { trackUndo = true } = {}) => {
        const previous = get().appointments.find((a) => a.id === id);
        if (!previous || previous.status === status) return;

        set((state) => {
          const updatedAppts = state.appointments.map((a) =>
            a.id === id ? { ...a, status } : a
          );

          saveSafetyVault(updatedAppts);

          const changedAppt = updatedAppts.find((a) => a.id === id);
          if (changedAppt) {
            notifyServiceWorker(changedAppt, state.settings);
          }
          syncRemindersWithServer(updatedAppts, state.settings);

          const change = trackUndo
            ? { id, previousStatus: previous.status, status, at: Date.now() }
            : null;

          return { appointments: updatedAppts, lastStatusChange: change };
        });

        const change = get().lastStatusChange;
        if (change) {
          setTimeout(() => {
            if (get().lastStatusChange === change) {
              set({ lastStatusChange: null });
            }
          }, UNDO_WINDOW_MS);
        }
      },

      completeAppointment: (id) => get().setAppointmentStatus(id, 'completed'),

      cancelAppointment: (id) => get().setAppointmentStatus(id, 'cancelled'),

      // Move a completed or cancelled booking back to upcoming
      reopenAppointment: (id) => {
        get().setAppointmentStatus(id, 'upcoming', { trackUndo: false });
        get().checkPendingNotifications();
      },

      // Revert the most recent complete/cancel (from the Undo bar)
      undoLastStatusChange: () => {
        const change = get().lastStatusChange;
        if (!change) return;
        get().setAppointmentStatus(change.id, change.previousStatus, { trackUndo: false });
        get().checkPendingNotifications();
      },

      dismissStatusChange: () => set({ lastStatusChange: null }),

      updateSettings: (newSettings) => {
        set((state) => {
          const mergedSettings = { ...state.settings, ...newSettings };
          
          // Reschedule reminders for all upcoming appointments
          state.appointments.forEach((appt) => {
            if (appt.status === 'upcoming') {
              notifyServiceWorker(appt, mergedSettings);
            }
          });
          syncRemindersWithServer(state.appointments, mergedSettings);

          return { settings: mergedSettings };
        });

        get().checkPendingNotifications();
      },

      sendTestNotification: () => {
        sendServerTestPush().catch(() => {});
        return triggerDirectNotification('Blush Alerts Active 🌸', {
          body: 'Your appointment reminders and post-appointment follow-up alerts are working perfectly!',
          tag: 'test_alert_' + Date.now()
        });
      },

      importData: (jsonData) => {
        try {
          if (typeof jsonData !== 'string' || jsonData.length > 5 * 1024 * 1024) {
            throw new Error('File payload exceeds maximum allowed size (5MB).');
          }

          const parsed = JSON.parse(jsonData);
          if (!Array.isArray(parsed)) {
            throw new Error('Backup data must contain an array of appointments.');
          }

          if (parsed.length > 10000) {
            throw new Error('Backup data exceeds maximum appointment limit (10,000 items).');
          }
          
          // Strict schema mapping and sanitization (prevents prototype pollution & invalid inputs)
          const sanitizedAppts = parsed.map((item, index) => {
            if (typeof item !== 'object' || item === null || Array.isArray(item)) {
              throw new Error(`Item at position ${index + 1} is not a valid object.`);
            }

            // Reject prototype pollution attempts
            if (Object.prototype.hasOwnProperty.call(item, '__proto__') || Object.prototype.hasOwnProperty.call(item, 'constructor')) {
              throw new Error('Malicious payload detected.');
            }

            // Validate date (YYYY-MM-DD)
            if (typeof item.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
              throw new Error(`Invalid date format in record ${index + 1}. Expected YYYY-MM-DD.`);
            }

            // Validate time (HH:mm)
            if (typeof item.time !== 'string' || !/^\d{2}:\d{2}$/.test(item.time)) {
              throw new Error(`Invalid time format in record ${index + 1}. Expected HH:mm.`);
            }

            const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim().slice(0, 64) : crypto.randomUUID();
            const type = item.type === 'personal' ? 'personal' : 'business';
            const status = ['upcoming', 'completed', 'cancelled'].includes(item.status) ? item.status : 'upcoming';
            const notes = typeof item.notes === 'string' && item.notes.trim() ? item.notes.trim().slice(0, 2000) : null;
            const createdAt = typeof item.createdAt === 'string' && item.createdAt ? item.createdAt.slice(0, 50) : new Date().toISOString();

            const clean = {
              id,
              type,
              status,
              date: item.date,
              time: item.time,
              notes,
              createdAt
            };

            if (type === 'business') {
              clean.clientName = typeof item.clientName === 'string' && item.clientName.trim() ? item.clientName.trim().slice(0, 100) : 'Client';
              clean.service = ['braiding', 'nails', 'both'].includes(item.service) ? item.service : 'braiding';
              clean.durationMins = typeof item.durationMins === 'number' && Number.isFinite(item.durationMins) && item.durationMins > 0 && item.durationMins <= 1440 
                ? Math.round(item.durationMins) 
                : 60;
              clean.price = typeof item.price === 'number' && Number.isFinite(item.price) && item.price >= 0 && item.price <= 100000 
                ? Number(item.price.toFixed(2))
                : null;
              if (Array.isArray(item.items) && item.items.length > 0) {
                Object.assign(clean, withNormalizedItems({ items: item.items }));
              }
            } else {
              clean.title = typeof item.title === 'string' && item.title.trim() ? item.title.trim().slice(0, 150) : 'Personal Schedule';
              clean.durationMins = typeof item.durationMins === 'number' && Number.isFinite(item.durationMins) && item.durationMins > 0 && item.durationMins <= 1440
                ? Math.round(item.durationMins)
                : 60;
            }

            return clean;
          });

          set({ appointments: sanitizedAppts });
          saveSafetyVault(sanitizedAppts);
          
          // Register reminders for all imported upcoming appointments
          const settings = get().settings;
          sanitizedAppts.forEach((appt) => {
            if (appt.status === 'upcoming') {
              notifyServiceWorker(appt, settings);
            }
          });
          syncRemindersWithServer(sanitizedAppts, settings);

          get().checkPendingNotifications();

          return { success: true };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },

      exportData: () => {
        return JSON.stringify(get().appointments, null, 2);
      }
    }),
    {
      name: 'blush_appointments',
      version: 2,
      partialize: (state) => ({
        appointments: state.appointments,
        settings: state.settings,
        notifiedHistory: state.notifiedHistory
      }),
      migrate: (persistedState) => {
        if (!persistedState) return { appointments: [], settings: {}, notifiedHistory: {} };
        
        let appts = Array.isArray(persistedState.appointments) ? persistedState.appointments : [];
        
        // If current state is empty, check and recover from safety vault
        if (appts.length === 0) {
          const vault = getSafetyVault();
          if (vault && Array.isArray(vault.appointments) && vault.appointments.length > 0) {
            appts = vault.appointments;
          }
        }

        // Migrate and guarantee complete field integrity
        const migratedAppts = appts.map((appt) => {
          if (!appt || typeof appt !== 'object') return null;
          return {
            id: appt.id || crypto.randomUUID(),
            type: appt.type === 'personal' ? 'personal' : 'business',
            status: ['upcoming', 'completed', 'cancelled'].includes(appt.status) ? appt.status : 'upcoming',
            clientName: appt.clientName || (appt.type === 'business' ? 'Client' : undefined),
            title: appt.title || (appt.type === 'personal' ? 'Personal Schedule' : undefined),
            service: appt.service || (appt.type === 'business' ? 'braiding' : undefined),
            durationMins: typeof appt.durationMins === 'number' ? appt.durationMins : 60,
            price: typeof appt.price === 'number' ? appt.price : (appt.price ? Number(appt.price) : null),
            ...(Array.isArray(appt.items) && appt.items.length > 0 ? withNormalizedItems({ items: appt.items }) : {}),
            date: appt.date || getOshawaTodayStr(),
            time: appt.time || '12:00',
            notes: appt.notes || null,
            createdAt: appt.createdAt || new Date().toISOString()
          };
        }).filter(Boolean);

        saveSafetyVault(migratedAppts);

        return {
          ...persistedState,
          appointments: migratedAppts,
          settings: {
            remind30m: true,
            remind2hAfter: true,
            remind24h: false,
            remind2h: false,
            ...(persistedState.settings || {})
          },
          notifiedHistory: persistedState.notifiedHistory || {}
        };
      }
    }
  )
);
