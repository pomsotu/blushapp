import { describe, it, expect } from 'vitest';
import { findConflict, findNextFreeStart, formatTimeRange, formatDurationLabel, endTimeOf, DURATION_OPTIONS } from './schedule';
import { checkOverlap } from '../store/useAppStore';
import { findOption, optionLine, hasOptions, sectionsForKind } from '../data/priceList';
import { sanitizeItems } from './services';

const booked = (id, time, durationMins, extra = {}) => ({
  id, type: 'business', clientName: id, date: '2026-10-10', time, durationMins, status: 'upcoming', ...extra
});

describe('booking overlap with durations', () => {
  const appts = [booked('Sola', '14:00', 120), booked('Kemi', '17:00', 60)];

  it('blocks anything inside 2pm–4pm', () => {
    expect(findConflict({ date: '2026-10-10', time: '15:00', durationMins: 30 }, appts)?.id).toBe('Sola');
    expect(findConflict({ date: '2026-10-10', time: '13:00', durationMins: 90 }, appts)?.id).toBe('Sola');
    expect(findConflict({ date: '2026-10-10', time: '13:00', durationMins: 240 }, appts)?.id).toBe('Sola');
  });

  it('allows back-to-back bookings', () => {
    expect(findConflict({ date: '2026-10-10', time: '16:00', durationMins: 60 }, appts)).toBeNull();
    expect(findConflict({ date: '2026-10-10', time: '12:00', durationMins: 120 }, appts)).toBeNull();
  });

  it('personal events use their own duration', () => {
    const list = [{ ...booked('Gym', '09:00', 90), type: 'personal', title: 'Gym' }];
    expect(findConflict({ date: '2026-10-10', time: '10:00', durationMins: 30 }, list)?.id).toBe('Gym');
  });

  it('ignores itself, completed and cancelled bookings', () => {
    const list = [booked('A', '14:00', 120, { status: 'completed' }), booked('B', '14:00', 120, { status: 'cancelled' }), booked('C', '14:00', 120)];
    expect(findConflict({ id: 'C', date: '2026-10-10', time: '14:30', durationMins: 60 }, list)).toBeNull();
  });

  it('a late booking running past midnight blocks the next morning', () => {
    const list = [booked('Late', '23:00', 180)];
    expect(findConflict({ date: '2026-10-11', time: '01:00', durationMins: 60 }, list)?.id).toBe('Late');
    expect(findConflict({ date: '2026-10-11', time: '02:00', durationMins: 60 }, list)).toBeNull();
  });

  it('suggests the next free start that fits the full duration', () => {
    expect(findNextFreeStart({ date: '2026-10-10', time: '15:00', durationMins: 60 }, appts)).toBe('16:00');
    // 2h does not fit 4–5pm, so it moves past Kemi
    expect(findNextFreeStart({ date: '2026-10-10', time: '15:00', durationMins: 120 }, appts)).toBe('18:00');
    expect(findNextFreeStart({ date: '2026-10-10', time: '23:30', durationMins: 60 }, [booked('X', '23:00', 60)])).toBeNull();
  });

  it('checkOverlap keeps its old contract', () => {
    expect(checkOverlap('2026-07-14', '14:00', 180, '2026-07-14', '15:00', 60)).toBe(true);
    expect(checkOverlap('2026-07-14', '14:00', 60, '2026-07-15', '14:00', 60)).toBe(false);
  });

  it('formats ranges and durations', () => {
    expect(formatTimeRange('14:00', 120)).toBe('2:00 – 4:00 PM');
    expect(formatTimeRange('11:00', 120)).toBe('11:00 AM – 1:00 PM');
    expect(formatTimeRange('22:00', 180)).toBe('10:00 PM – 1:00 AM (next day)');
    expect(formatDurationLabel(90)).toBe('1 hr 30 min');
    expect(formatDurationLabel(30)).toBe('30 min');
    expect(endTimeOf('14:00', 150)).toBe('16:30');
    expect(DURATION_OPTIONS[0]).toBe(30);
    expect(DURATION_OPTIONS.at(-1)).toBe(720);
  });
});

describe('price list by service type', () => {
  it('nail options only exist under nails', () => {
    expect(findOption('nails', 'Acrylics (Long)')?.price).toBe(55);
    expect(findOption('hair', 'Acrylics (Long)')).toBeNull();
    expect(findOption('other', 'Chrome')).toBeNull();
    expect(hasOptions('nails')).toBe(true);
    expect(hasOptions('hair')).toBe(false);
    expect(sectionsForKind('unknown')).toEqual([]);
  });

  it('per-nail options scale name and price with quantity', () => {
    const repair = findOption('nails', 'Nail repair');
    expect(optionLine(repair, 3)).toEqual({ name: 'Nail repair (3 nails)', price: 15 });
    expect(optionLine(repair, 1)).toEqual({ name: 'Nail repair (1 nail)', price: 5 });
    expect(optionLine(findOption('nails', 'Chrome'), 4)).toEqual({ name: 'Chrome', price: 10 });
  });

  it('sanitizeItems keeps catalog and qty within bounds', () => {
    const [a, b] = sanitizeItems([
      { kind: 'nails', name: 'Nail repair (3 nails)', price: 15, catalog: 'Nail repair', qty: 3 },
      { kind: 'nails', name: 'x', price: 1, catalog: '', qty: 999 }
    ]);
    expect(a.catalog).toBe('Nail repair');
    expect(a.qty).toBe(3);
    expect(b.catalog).toBeUndefined();
    expect(b.qty).toBeUndefined();
  });
});
