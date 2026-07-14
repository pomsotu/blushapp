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
  });
});
