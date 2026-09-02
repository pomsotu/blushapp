import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore, checkOverlap } from './useAppStore';

describe('useAppStore test suite', () => {
  
  beforeEach(() => {
    // Reset Zustand store state before each test
    useAppStore.setState({
      appointments: [],
      settings: {
        remind24h: true,
        remind2h: true,
        remind30m: true
      }
    });
  });

  describe('checkOverlap helper function', () => {
    it('detects overlap for matching dates and overlapping intervals', () => {
      // 14:00 - 17:00 vs 15:00 - 16:00
      expect(checkOverlap('2026-07-14', '14:00', 180, '2026-07-14', '15:00', 60)).toBe(true);
      // 14:00 - 15:00 vs 14:30 - 15:30
      expect(checkOverlap('2026-07-14', '14:00', 60, '2026-07-14', '14:30', 60)).toBe(true);
    });

    it('returns false for non-overlapping times', () => {
      // 14:00 - 15:00 vs 15:00 - 16:00
      expect(checkOverlap('2026-07-14', '14:00', 60, '2026-07-14', '15:00', 60)).toBe(false);
      // Different dates
      expect(checkOverlap('2026-07-14', '14:00', 60, '2026-07-15', '14:00', 60)).toBe(false);
    });
  });

  describe('Zustand store actions', () => {
    it('should add appointments correctly', () => {
      const appt = {
        type: 'business',
        clientName: 'Test Client',
        service: 'nails',
        date: '2026-07-14',
        time: '12:00',
        durationMins: 60,
        price: 45
      };

      useAppStore.getState().addAppointment(appt);
      const appts = useAppStore.getState().appointments;

      expect(appts).toHaveLength(1);
      expect(appts[0].clientName).toBe('Test Client');
      expect(appts[0].status).toBe('upcoming');
      expect(appts[0].id).toBeDefined();
    });

    it('should update appointment status to completed or cancelled', () => {
      const appt = {
        type: 'personal',
        title: 'Lunch meeting',
        date: '2026-07-14',
        time: '13:00'
      };

      useAppStore.getState().addAppointment(appt);
      const savedAppt = useAppStore.getState().appointments[0];
      const id = savedAppt.id;

      // Complete
      useAppStore.getState().completeAppointment(id);
      expect(useAppStore.getState().appointments[0].status).toBe('completed');

      // Cancel
      useAppStore.getState().cancelAppointment(id);
      expect(useAppStore.getState().appointments[0].status).toBe('cancelled');
    });

    it('should detect booking time conflicts', () => {
      const appt1 = {
        id: 'mock-1',
        type: 'business',
        clientName: 'Client 1',
        service: 'braiding',
        date: '2026-07-14',
        time: '14:00',
        durationMins: 180, // 2:00 PM to 5:00 PM
        status: 'upcoming'
      };

      // Add to store
      useAppStore.setState({ appointments: [appt1] });

      // Check conflict with overlapping slot (3:00 PM to 4:00 PM)
      const appt2 = {
        id: 'mock-2',
        type: 'business',
        clientName: 'Client 2',
        service: 'nails',
        date: '2026-07-14',
        time: '15:00',
        durationMins: 60
      };

      const hasConflict = useAppStore.getState().checkConflict(appt2);
      expect(hasConflict).toBe(true);

      // Check conflict with non-overlapping slot (5:00 PM to 6:00 PM)
      const appt3 = {
        id: 'mock-3',
        type: 'business',
        clientName: 'Client 3',
        service: 'nails',
        date: '2026-07-14',
        time: '17:00',
        durationMins: 60
      };

      const hasConflict3 = useAppStore.getState().checkConflict(appt3);
      expect(hasConflict3).toBe(false);
    });

    it('should track 30m pre-appointment and 2h follow-up alerts in notifiedHistory', () => {
      const now = new Date();
      
      // Appointment starting in 15 minutes (within 30m window)
      const startIn15 = new Date(now.getTime() + 15 * 60 * 1000);
      const year1 = startIn15.getFullYear();
      const month1 = String(startIn15.getMonth() + 1).padStart(2, '0');
      const day1 = String(startIn15.getDate()).padStart(2, '0');
      const appt1Date = `${year1}-${month1}-${day1}`;
      const appt1Time = `${String(startIn15.getHours()).padStart(2, '0')}:${String(startIn15.getMinutes()).padStart(2, '0')}`;

      // Appointment ended 3 hours ago (past 2h follow-up window)
      const ended3hAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000); // started 4 hours ago, 1h duration -> ended 3 hours ago
      const year2 = ended3hAgo.getFullYear();
      const month2 = String(ended3hAgo.getMonth() + 1).padStart(2, '0');
      const day2 = String(ended3hAgo.getDate()).padStart(2, '0');
      const appt2Date = `${year2}-${month2}-${day2}`;
      const appt2Time = `${String(ended3hAgo.getHours()).padStart(2, '0')}:${String(ended3hAgo.getMinutes()).padStart(2, '0')}`;

      useAppStore.setState({
        appointments: [
          {
            id: 'appt-soon',
            type: 'business',
            clientName: 'Sola',
            service: 'braiding',
            date: appt1Date,
            time: appt1Time,
            durationMins: 60,
            status: 'upcoming'
          },
          {
            id: 'appt-past',
            type: 'business',
            clientName: 'Kemi',
            service: 'nails',
            date: appt2Date,
            time: appt2Time,
            durationMins: 60,
            status: 'upcoming'
          }
        ],
        notifiedHistory: {},
        settings: {
          remind30m: true,
          remind2hAfter: true,
          remind24h: false,
          remind2h: false
        }
      });

      // Run checkPendingNotifications
      useAppStore.getState().checkPendingNotifications();
      const history = useAppStore.getState().notifiedHistory;

      // Expect both 30m alert and 2hAfter follow-up alert keys to be registered in history
      expect(history[`30m_appt-soon_${appt1Date}_${appt1Time}`]).toBeDefined();
      expect(history[`2hAfter_appt-past_${appt2Date}_${appt2Time}`]).toBeDefined();
    });

    it('should reject malformed or malicious JSON imports securely', () => {
      // Rejects non-array JSON
      const res1 = useAppStore.getState().importData(JSON.stringify({ notAnArray: true }));
      expect(res1.success).toBe(false);

      // Rejects invalid date format
      const res2 = useAppStore.getState().importData(JSON.stringify([
        { id: '1', type: 'business', clientName: 'Attacker', date: '2026/07/14', time: '14:00', status: 'upcoming' }
      ]));
      expect(res2.success).toBe(false);

      // Sanitizes and accepts valid backup payload
      const res3 = useAppStore.getState().importData(JSON.stringify([
        { id: '1', type: 'business', clientName: 'Valid Client', service: 'braiding', date: '2026-09-01', time: '14:00', status: 'upcoming', price: 80 }
      ]));
      expect(res3.success).toBe(true);
      expect(useAppStore.getState().appointments).toHaveLength(1);
      expect(useAppStore.getState().appointments[0].clientName).toBe('Valid Client');
    });
  });
});
