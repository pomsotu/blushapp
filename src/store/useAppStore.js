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

// Initial mockup data
const today = new Date();
const fmt = (d) => d.toISOString().split('T')[0];
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

const INITIAL_APPOINTMENTS = [
  { id: "1", type: "business", clientName: "Sola", service: "braiding", price: 80, durationMins: 180, date: fmt(today), time: "14:00", status: "upcoming", notes: "Medium length box braids", createdAt: new Date().toISOString() },
  { id: "2", type: "business", clientName: "Kemi", service: "nails", price: 40, durationMins: 60, date: fmt(today), time: "17:30", status: "upcoming", notes: "Acrylic set with cherry design", createdAt: new Date().toISOString() },
  { id: "3", type: "personal", title: "Doctor's Visit", date: fmt(addDays(today, 1)), time: "10:00", status: "upcoming", notes: "Checkup at clinic", createdAt: new Date().toISOString() },
  { id: "4", type: "business", clientName: "Lola", service: "both", price: 110, durationMins: 240, date: fmt(addDays(today, 2)), time: "13:00", status: "upcoming", notes: "Braids and full nail set combo", createdAt: new Date().toISOString() },
  { id: "5", type: "personal", title: "Study Session", date: fmt(addDays(today, 4)), time: "09:00", status: "upcoming", notes: "Exam preparation with study group", createdAt: new Date().toISOString() },
  { id: "6", type: "business", clientName: "Bisi", service: "nails", price: 45, durationMins: 75, date: fmt(addDays(today, 6)), time: "15:00", status: "upcoming", notes: "Gel manicure + pedicure", createdAt: new Date().toISOString() },
  { id: "7", type: "business", clientName: "Amara", service: "nails", price: 45, durationMins: 90, date: fmt(addDays(today, -2)), time: "15:00", status: "completed", notes: "Refill and line art", createdAt: new Date().toISOString() },
  { id: "8", type: "business", clientName: "Zara", service: "braiding", price: 75, durationMins: 150, date: fmt(addDays(today, -5)), time: "11:00", status: "completed", notes: "Knotless bob", createdAt: new Date().toISOString() },
  { id: "9", type: "business", clientName: "Tolu", service: "both", price: 100, durationMins: 210, date: fmt(addDays(today, -7)), time: "13:00", status: "cancelled", notes: "Double booked - cancelled by client", createdAt: new Date().toISOString() }
];

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
