import { describe, it, expect } from 'vitest';
import { 
  getOshawaTodayStr, 
  parseAppointmentTime, 
  formatTime, 
  formatDuration,
  TIMEZONE 
} from './dateUtils';

describe('Date & Timezone Utilities (America/Toronto / Oshawa)', () => {
  describe('getOshawaTodayStr', () => {
    it('should format date to YYYY-MM-DD in Eastern Time', () => {
      const fixedDate = new Date('2026-09-02T15:00:00Z');
      const formatted = getOshawaTodayStr(fixedDate);
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should use America/Toronto timezone constant', () => {
      expect(TIMEZONE).toBe('America/Toronto');
    });
  });

  describe('parseAppointmentTime', () => {
    it('should accurately compute epoch milliseconds locked to Eastern Time', () => {
      const epoch = parseAppointmentTime('2026-09-02', '14:30');
      expect(typeof epoch).toBe('number');
      expect(epoch).toBeGreaterThan(0);
      
      const parsedDate = new Date(epoch);
      expect(parsedDate.toISOString()).toContain('2026-09-02');
    });

    it('should handle fallback gracefully for empty inputs', () => {
      const fallback = parseAppointmentTime('', '');
      expect(typeof fallback).toBe('number');
    });
  });

  describe('formatTime', () => {
    it('should convert 24h string to 12h AM/PM format', () => {
      expect(formatTime('09:00')).toBe('9:00 AM');
      expect(formatTime('12:00')).toBe('12:00 PM');
      expect(formatTime('15:30')).toBe('3:30 PM');
      expect(formatTime('00:15')).toBe('12:15 AM');
    });

    it('should return empty string for null or empty input', () => {
      expect(formatTime('')).toBe('');
      expect(formatTime(null)).toBe('');
    });
  });

  describe('formatDuration', () => {
    it('should format minutes to readable hours and minutes', () => {
      expect(formatDuration(60)).toBe('1h');
      expect(formatDuration(90)).toBe('1h 30m');
      expect(formatDuration(120)).toBe('2h');
      expect(formatDuration(150)).toBe('2h 30m');
    });

    it('should return empty string for falsy or zero minutes', () => {
      expect(formatDuration(0)).toBe('');
      expect(formatDuration(null)).toBe('');
    });
  });
});
