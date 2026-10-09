import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useAppStore, UNDO_WINDOW_MS } from './useAppStore';
import { getServiceItems, itemsTotal, deriveService, scopeSummary, sanitizeItems, formatMoney } from '../utils/services';

const baseBooking = {
  type: 'business',
  clientName: 'Sola',
  date: '2026-07-14',
  time: '12:00',
  durationMins: 120,
  items: [{ kind: 'hair', name: 'Knotless braids', price: 120 }]
};

describe('itemized services and editing scope/price', () => {
  beforeEach(() => {
    useAppStore.setState({ appointments: [], lastStatusChange: null });
  });

  it('derives price and service from items on add', () => {
    useAppStore.getState().addAppointment(baseBooking);
    const appt = useAppStore.getState().appointments[0];
    expect(appt.price).toBe(120);
    expect(appt.service).toBe('braiding');
    expect(appt.items).toHaveLength(1);
    expect(appt.items[0].id).toBeTruthy();
  });

  it('updates scope and price when nails are added to a hair booking', () => {
    useAppStore.getState().addAppointment(baseBooking);
    const { id, items } = useAppStore.getState().appointments[0];

    useAppStore.getState().updateAppointment(id, {
      items: [...items, { kind: 'nails', name: 'Gel nails', price: 40.5 }]
    });

    const appt = useAppStore.getState().appointments[0];
    expect(appt.price).toBe(160.5);
    expect(appt.service).toBe('both');
    expect(scopeSummary(appt)).toBe('Knotless braids + Gel nails');
  });

  it('lets a completed booking be repriced without changing its status', () => {
    useAppStore.getState().addAppointment(baseBooking);
    const { id } = useAppStore.getState().appointments[0];
    useAppStore.getState().completeAppointment(id);

    useAppStore.getState().updateAppointment(id, {
      items: [{ kind: 'hair', name: 'Knotless braids', price: 150 }]
    });

    const appt = useAppStore.getState().appointments[0];
    expect(appt.status).toBe('completed');
    expect(appt.price).toBe(150);
  });

  it('price is null when no service has a price', () => {
    useAppStore.getState().addAppointment({ ...baseBooking, items: [{ kind: 'nails', name: '', price: null }] });
    const appt = useAppStore.getState().appointments[0];
    expect(appt.price).toBeNull();
    expect(appt.service).toBe('nails');
    expect(appt.items[0].name).toBe('Nails');
  });

  it('synthesizes items for legacy bookings without changing the total', () => {
    expect(getServiceItems({ id: 'a', type: 'business', service: 'nails', price: 45 }))
      .toEqual([{ id: 'a-1', kind: 'nails', name: 'Nail art', price: 45 }]);
    const both = getServiceItems({ id: 'b', type: 'business', service: 'both', price: 200 });
    expect(both).toHaveLength(2);
    expect(itemsTotal(both)).toBe(200);
    expect(deriveService(both)).toBe('both');
    expect(getServiceItems({ type: 'personal', title: 'Gym' })).toEqual([]);
  });

  it('sanitizes hostile item input', () => {
    const items = sanitizeItems([
      { kind: 'evil', name: 'x'.repeat(500), price: -5 },
      null,
      'nope',
      { kind: 'hair', name: 'Braids', price: 999999 }
    ]);
    expect(items).toHaveLength(2);
    expect(items[0].kind).toBe('other');
    expect(items[0].name).toHaveLength(80);
    expect(items[0].price).toBeNull();
    expect(items[1].price).toBeNull();
  });

  it('imports backups that include items', () => {
    const res = useAppStore.getState().importData(JSON.stringify([
      { id: '1', type: 'business', clientName: 'Kemi', date: '2026-09-01', time: '14:00', status: 'completed',
        items: [{ kind: 'hair', name: 'Cornrows', price: 60 }, { kind: 'nails', name: 'Acrylic', price: 50 }] }
    ]));
    expect(res.success).toBe(true);
    const appt = useAppStore.getState().appointments[0];
    expect(appt.price).toBe(110);
    expect(appt.service).toBe('both');
  });

  it('formats money', () => {
    expect(formatMoney(160)).toBe('$160');
    expect(formatMoney(160.5)).toBe('$160.50');
    expect(formatMoney(null)).toBe('$0');
  });
});

describe('undoing a completed or cancelled booking', () => {
  beforeEach(() => {
    useAppStore.setState({ appointments: [], lastStatusChange: null });
    useAppStore.getState().addAppointment(baseBooking);
  });
  afterEach(() => vi.useRealTimers());

  it('undo restores upcoming after a mistaken completion', () => {
    const { id } = useAppStore.getState().appointments[0];
    useAppStore.getState().completeAppointment(id);
    expect(useAppStore.getState().lastStatusChange).toMatchObject({ id, previousStatus: 'upcoming', status: 'completed' });

    useAppStore.getState().undoLastStatusChange();
    expect(useAppStore.getState().appointments[0].status).toBe('upcoming');
    expect(useAppStore.getState().lastStatusChange).toBeNull();
  });

  it('undo after cancel restores upcoming', () => {
    const { id } = useAppStore.getState().appointments[0];
    useAppStore.getState().cancelAppointment(id);
    useAppStore.getState().undoLastStatusChange();
    expect(useAppStore.getState().appointments[0].status).toBe('upcoming');
  });

  it('reopenAppointment moves a completed booking back to upcoming at any time', () => {
    const { id } = useAppStore.getState().appointments[0];
    useAppStore.getState().completeAppointment(id);
    useAppStore.setState({ lastStatusChange: null }); // undo window long gone
    useAppStore.getState().reopenAppointment(id);
    expect(useAppStore.getState().appointments[0].status).toBe('upcoming');
  });

  it('undo offer expires after the undo window', () => {
    vi.useFakeTimers();
    const { id } = useAppStore.getState().appointments[0];
    useAppStore.getState().completeAppointment(id);
    vi.advanceTimersByTime(UNDO_WINDOW_MS + 10);
    expect(useAppStore.getState().lastStatusChange).toBeNull();
    // Undo with nothing pending is a no-op
    useAppStore.getState().undoLastStatusChange();
    expect(useAppStore.getState().appointments[0].status).toBe('completed');
  });

  it('status change on a missing id or same status is ignored', () => {
    const { id } = useAppStore.getState().appointments[0];
    useAppStore.getState().completeAppointment('nope');
    useAppStore.getState().reopenAppointment(id); // already upcoming
    expect(useAppStore.getState().appointments[0].status).toBe('upcoming');
    expect(useAppStore.getState().lastStatusChange).toBeNull();
  });
});
