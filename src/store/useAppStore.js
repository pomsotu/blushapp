import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Trigger service worker reschedule
const notifyServiceWorker = (appt, settings) => {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SCHEDULE_REMINDERS',
      appt,
      settings
    });
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
      settings: {
        remind24h: true,
        remind2h: true,
        remind30m: true
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
      },

      completeAppointment: (id) => {
        set((state) => {
          const updatedAppts = state.appointments.map((a) => 
            a.id === id ? { ...a, status: 'completed' } : a
          );
          
          // Clear reminders in service worker by sending status: 'completed'
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
          
          // Clear reminders in service worker by sending status: 'cancelled'
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
