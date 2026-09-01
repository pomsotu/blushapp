import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

// Direct notification dispatcher
export const triggerDirectNotification = (title, options = {}) => {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
    return false;
  }

  const notificationOptions = {
    icon: '/icon.png',
    badge: '/icon.png',
    ...options
  };

  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_IMMEDIATE_NOTIFICATION',
        title,
        options: notificationOptions
      });
      return true;
    } else {
      new Notification(title, notificationOptions);
      return true;
    }
  } catch (e) {
    console.warn('Direct notification error:', e);
    return false;
  }
};

// Check if two time slots overlap
export const checkOverlap = (date1, time1, duration1, date2, time2, duration2) => {
  if (date1 !== date2) return false;

  const [h1, m1] = time1.split(':').map(Number);
  const start1 = h1 * 60 + m1;
  const end1 = start1 + (duration1 || 60); // Default to 60m if not specified

  const [h2, m2] = time2.split(':').map(Number);
  const start2 = h2 * 60 + m2;
  const end2 = start2 + (duration2 || 60);

  return start1 < end2 && start2 < end1;
};

// Empty database by default for production use
const INITIAL_APPOINTMENTS = [];

export const useAppStore = create(
  persist(
    (set, get) => ({
      appointments: INITIAL_APPOINTMENTS,
      notifiedHistory: {},
      settings: {
        remind30m: true,       // 30 mins before appointment
        remind2hAfter: true,   // 2 hours after appointment (follow-up to mark completed/cancelled)
        remind24h: false,      // 24 hours before
        remind2h: false        // 2 hours before
      },

      // Conflict Check helper
      checkConflict: (newAppt) => {
        const appts = get().appointments.filter(
          (a) => a.status === 'upcoming' && a.id !== newAppt.id && a.date === newAppt.date
        );

        const newDuration = newAppt.type === 'business' 
          ? (newAppt.durationMins || 60) 
          : 60; // Personal is always 60m

        return appts.some((existing) => {
          const extDuration = existing.type === 'business'
            ? (existing.durationMins || 60)
            : 60;
          return checkOverlap(
            newAppt.date, newAppt.time, newDuration,
            existing.date, existing.time, extDuration
          );
        });
      },

      // Check and fire pending live alerts (called periodically and on app focus)
      checkPendingNotifications: () => {
        const state = get();
        const { appointments, settings, notifiedHistory } = state;
        const now = Date.now();
        const updatedHistory = { ...notifiedHistory };
        let historyChanged = false;

        appointments.forEach((appt) => {
          if (appt.status !== 'upcoming') return;

          const [year, month, day] = appt.date.split('-').map(Number);
          const [hour, minute] = appt.time.split(':').map(Number);
          const startTime = new Date(year, month - 1, day, hour, minute).getTime();
          const durationMins = appt.type === 'business' ? (appt.durationMins || 60) : 60;
          const endTime = startTime + durationMins * 60 * 1000;

          // 1. Check 30-minute Pre-Appointment Reminder
          if (settings.remind30m) {
            const reminderTime = startTime - 30 * 60 * 1000;
            const reminderKey = `30m_${appt.id}_${appt.date}_${appt.time}`;

            // Trigger window: between 30m before and start time
            if (now >= reminderTime && now < startTime && !updatedHistory[reminderKey]) {
              const title = appt.type === 'business' 
                ? 'Upcoming Booking in 30 Mins 💅' 
                : 'Upcoming Schedule in 30 Mins 🌸';
              const body = appt.type === 'business'
                ? `Tari, your appointment with ${appt.clientName} starts in 30 mins!`
                : `Tari, your event "${appt.title}" starts in 30 mins!`;

              triggerDirectNotification(title, {
                body,
                tag: reminderKey
              });

              updatedHistory[reminderKey] = now;
              historyChanged = true;
            }
          }

          // 2. Check 2-hour Post-Appointment Follow-up Reminder
          if (settings.remind2hAfter) {
            const followupTime = endTime + 2 * 60 * 60 * 1000;
            const followupKey = `2hAfter_${appt.id}_${appt.date}_${appt.time}`;

            // Trigger window: from 2 hours after end time up to 48 hours after
            if (now >= followupTime && now <= (endTime + 48 * 60 * 60 * 1000) && !updatedHistory[followupKey]) {
              const title = 'Appointment Follow-up ✨';
              const body = appt.type === 'business'
                ? `Did your appointment with ${appt.clientName} finish? Tap to mark it as completed or cancelled.`
                : `Did your event "${appt.title}" finish? Tap to mark it as completed or cancelled.`;

              triggerDirectNotification(title, {
                body,
                tag: followupKey
              });

              updatedHistory[followupKey] = now;
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
          ...appt,
          id,
          status: 'upcoming',
          createdAt: new Date().toISOString()
        };
        
        set((state) => ({
          appointments: [...state.appointments, newAppt]
        }));

        notifyServiceWorker(newAppt, get().settings);
        // Immediate check in case the appointment is scheduled within 30 minutes
        get().checkPendingNotifications();
      },

      updateAppointment: (id, updatedFields) => {
        set((state) => {
          const updatedAppts = state.appointments.map((a) => 
            a.id === id ? { ...a, ...updatedFields } : a
          );
          
          const updatedAppt = updatedAppts.find((a) => a.id === id);
          if (updatedAppt) {
            notifyServiceWorker(updatedAppt, state.settings);
          }
          
          return { appointments: updatedAppts };
        });

        get().checkPendingNotifications();
      },

      completeAppointment: (id) => {
        set((state) => {
          const updatedAppts = state.appointments.map((a) => 
            a.id === id ? { ...a, status: 'completed' } : a
          );
          
          const completedAppt = updatedAppts.find((a) => a.id === id);
          if (completedAppt) {
            notifyServiceWorker({ ...completedAppt, status: 'completed' }, state.settings);
          }

          return { appointments: updatedAppts };
        });
      },

      cancelAppointment: (id) => {
        set((state) => {
          const updatedAppts = state.appointments.map((a) => 
            a.id === id ? { ...a, status: 'cancelled' } : a
          );
          
          const cancelledAppt = updatedAppts.find((a) => a.id === id);
          if (cancelledAppt) {
            notifyServiceWorker({ ...cancelledAppt, status: 'cancelled' }, state.settings);
          }

          return { appointments: updatedAppts };
        });
      },

      updateSettings: (newSettings) => {
        set((state) => {
          const mergedSettings = { ...state.settings, ...newSettings };
          
          // Reschedule reminders for all upcoming appointments
          state.appointments.forEach((appt) => {
            if (appt.status === 'upcoming') {
              notifyServiceWorker(appt, mergedSettings);
            }
          });

          return { settings: mergedSettings };
        });

        get().checkPendingNotifications();
      },

      sendTestNotification: () => {
        return triggerDirectNotification('Blush Alerts Active 🌸', {
          body: 'Your appointment reminders and post-appointment follow-up alerts are working perfectly!',
          tag: 'test_alert_' + Date.now()
        });
      },

      importData: (jsonData) => {
        try {
          const parsed = JSON.parse(jsonData);
          if (!Array.isArray(parsed)) throw new Error('Data must be an array of appointments.');
          
          // Basic validation of fields
          const isValid = parsed.every(appt => 
            appt.id && 
            appt.type && 
            (appt.type === 'business' || appt.type === 'personal') &&
            appt.date && 
            appt.time && 
            appt.status
          );
          
          if (!isValid) throw new Error('Invalid appointment schema in JSON file.');

          set({ appointments: parsed });
          
          // Register reminders for all imported upcoming appointments
          const settings = get().settings;
          parsed.forEach((appt) => {
            if (appt.status === 'upcoming') {
              notifyServiceWorker(appt, settings);
            }
          });

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
      name: 'blush_appointments'
    }
  )
);
