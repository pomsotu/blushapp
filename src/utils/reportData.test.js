import { describe, it, expect } from 'vitest';
import { buildReport, availableMonths, previousMonthKey, monthLabel } from './reportData';

const biz = (id, date, status, items, extra = {}) => ({
  id, type: 'business', clientName: extra.client || id, date, time: extra.time || '10:00',
  durationMins: extra.durationMins || 60, status, items,
  price: items.reduce((s, i) => s + (i.price || 0), 0), createdAt: `${date}T00:00:00Z`
});

const data = [
  biz('a', '2026-09-05', 'completed', [{ kind: 'hair', name: 'Knotless braids', price: 150 }], { client: 'Sola', durationMins: 240 }),
  biz('b', '2026-10-03', 'completed', [
    { kind: 'hair', name: 'Cornrows', price: 80 },
    { kind: 'nails', name: 'Acrylics (Long)', price: 55, catalog: 'Acrylics (Long)' }
  ], { client: 'Sola', durationMins: 180 }),
  biz('c', '2026-10-10', 'completed', [{ kind: 'nails', name: 'Nail repair (2 nails)', price: 10, catalog: 'Nail repair', qty: 2 }], { client: 'Kemi', durationMins: 60 }),
  biz('d', '2026-10-17', 'cancelled', [{ kind: 'nails', name: 'Gel-X (Short)', price: 35 }], { client: 'Ada' }),
  biz('e', '2026-10-24', 'upcoming', [{ kind: 'hair', name: 'Box braids', price: 200 }], { client: 'Ife' }),
  { id: 'p', type: 'personal', title: 'Gym', date: '2026-10-03', time: '08:00', durationMins: 60, status: 'completed' }
];

describe('report data', () => {
  it('monthly summary counts only that month, ignoring personal events', () => {
    const r = buildReport(data, { period: '2026-10', today: '2026-10-09' });
    expect(r.summary.earned).toBe(145);
    expect(r.summary.completedCount).toBe(2);
    expect(r.summary.cancelledCount).toBe(1);
    expect(r.summary.upcomingCount).toBe(1);
    expect(r.summary.upcomingValue).toBe(200);
    expect(r.summary.averagePerBooking).toBe(72.5);
    expect(r.summary.hoursWorked).toBe(4);
    expect(r.summary.earnedPerHour).toBe(36.25);
    expect(r.summary.cancellationRate).toBe(33.3);
    expect(r.summary.lostToCancellations).toBe(35);
    expect(r.summary.uniqueClients).toBe(2);
    expect(r.ledger).toHaveLength(4);
    expect(r.periodLabel).toBe('October 2026');
  });

  it('compares with the previous month', () => {
    const r = buildReport(data, { period: '2026-10', today: '2026-10-09' });
    expect(r.comparison.previousLabel).toBe('September 2026');
    expect(r.comparison.previousEarned).toBe(150);
    expect(r.comparison.earnedChangePct).toBe(-3.3);
    expect(r.comparison.completedChange).toBe(1);
  });

  it('daily timeline covers every day of the month', () => {
    const r = buildReport(data, { period: '2026-10', today: '2026-10-09' });
    expect(r.timeline).toHaveLength(31);
    expect(r.timeline[2]).toMatchObject({ label: '3', earned: 135, count: 1 });
  });

  it('all-time report spans first booking month to now, monthly buckets', () => {
    const r = buildReport(data, { period: 'all', today: '2026-10-09' });
    expect(r.summary.earned).toBe(295);
    expect(r.timeline.map((t) => t.key)).toEqual(['2026-09', '2026-10']);
    expect(r.comparison).toBeNull();
    expect(r.monthly.map((m) => m.key)).toEqual(['2026-10', '2026-09']);
    expect(r.monthly[0]).toMatchObject({ completed: 2, cancelled: 1, earned: 145, hours: 4, average: 72.5 });
    expect(r.periodLabel).toBe('September 2026 – October 2026');
  });

  it('breaks revenue down by service type and service, grouping per-nail lines', () => {
    const r = buildReport(data, { period: 'all', today: '2026-10-09' });
    const hair = r.kinds.find((k) => k.kind === 'hair');
    const nails = r.kinds.find((k) => k.kind === 'nails');
    expect(hair).toMatchObject({ label: 'Hair', count: 2, revenue: 230 });
    expect(nails).toMatchObject({ label: 'Nails', count: 2, revenue: 65 });
    expect(hair.share + nails.share).toBeCloseTo(100, 1);
    expect(r.services[0].name).toBe('Knotless braids');
    expect(r.services.find((s) => s.name === 'Nail repair')).toBeTruthy();
  });

  it('ranks clients by spend and writes data-backed highlights', () => {
    const r = buildReport(data, { period: 'all', today: '2026-10-09' });
    expect(r.clients[0]).toMatchObject({ name: 'Sola', visits: 2, spent: 285, lastVisit: '2026-10-03' });
    expect(r.highlights.some((h) => h.startsWith('Top client: Sola'))).toBe(true);
    expect(r.highlights.some((h) => h.includes('1 cancellation'))).toBe(true);
    expect(r.highlights.some((h) => h.includes('Best month: October 2026 with $145.00'))).toBe(false);
    expect(r.highlights.some((h) => h.includes('Best month: September 2026 with $150.00'))).toBe(true);
  });

  it('handles an empty month gracefully', () => {
    const r = buildReport(data, { period: '2026-11', today: '2026-11-01' });
    expect(r.summary.earned).toBe(0);
    expect(r.summary.averagePerBooking).toBe(0);
    expect(r.ledger).toHaveLength(0);
    expect(r.highlights[0]).toBe('No completed bookings this month yet.');
    expect(r.comparison.earnedChangePct).toBe(-100);
  });

  it('legacy bookings without items still report', () => {
    const legacy = [{ id: 'l', type: 'business', clientName: 'Old', service: 'nails', price: 45, date: '2026-08-01', time: '10:00', status: 'completed' }];
    const r = buildReport(legacy, { period: 'all', today: '2026-10-09' });
    expect(r.kinds[0]).toMatchObject({ kind: 'nails', revenue: 45 });
    expect(r.timeline).toHaveLength(3);
  });

  it('month helpers', () => {
    expect(availableMonths(data, '2026-11')).toEqual(['2026-11', '2026-10', '2026-09']);
    expect(previousMonthKey('2026-01')).toBe('2025-12');
    expect(monthLabel('2026-02')).toBe('February 2026');
  });
});

describe('report fingerprint (detects changes since last report)', () => {
  it('is stable for the same data and changes when a booking changes', async () => {
    const { reportFingerprint } = await import('./reportData');
    const base = reportFingerprint(data, '2026-10');
    expect(reportFingerprint([...data].reverse(), '2026-10')).toBe(base);

    const edited = data.map((a) => (a.id === 'b' ? { ...a, price: 999 } : a));
    expect(reportFingerprint(edited, '2026-10')).not.toBe(base);

    const completed = data.map((a) => (a.id === 'e' ? { ...a, status: 'completed' } : a));
    expect(reportFingerprint(completed, '2026-10')).not.toBe(base);

    const deleted = data.filter((a) => a.id !== 'c');
    expect(reportFingerprint(deleted, '2026-10')).not.toBe(base);
  });

  it('ignores unrelated months and personal events, but counts the previous month', async () => {
    const { reportFingerprint } = await import('./reportData');
    const base = reportFingerprint(data, '2026-10');
    const otherMonth = [...data, { id: 'z', type: 'business', clientName: 'Z', date: '2026-05-01', time: '10:00', status: 'completed', items: [], price: 50 }];
    expect(reportFingerprint(otherMonth, '2026-10')).toBe(base);
    const personal = data.map((a) => (a.id === 'p' ? { ...a, title: 'Spa' } : a));
    expect(reportFingerprint(personal, '2026-10')).toBe(base);
    const prevMonthEdit = data.map((a) => (a.id === 'a' ? { ...a, price: 1 } : a));
    expect(reportFingerprint(prevMonthEdit, '2026-10')).not.toBe(base);
    expect(reportFingerprint(otherMonth, 'all')).not.toBe(reportFingerprint(data, 'all'));
    // a new month outdates the all-time report even with no booking changes
    expect(reportFingerprint(data, 'all', '2026-11')).not.toBe(reportFingerprint(data, 'all', '2026-10'));
    expect(reportFingerprint(data, '2026-10', '2026-11')).toBe(base);
  });
});
