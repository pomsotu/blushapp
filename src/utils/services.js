// Itemized scope of work for business bookings.
// Each booking carries `items: [{ id, kind, name, price }]`. The legacy
// `service` and `price` fields are kept in sync (derived from items) so older
// views, backups and reminders keep working unchanged.

export const SERVICE_KINDS = {
  hair: { label: '🌀 Hair', defaultName: 'Hair braiding' },
  nails: { label: '💅 Nails', defaultName: 'Nails' },
  other: { label: '✨ Other', defaultName: 'Other service' }
};

export const MAX_ITEMS = 20;
const MAX_PRICE = 100000;

export const newItemId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 11);

const cleanPrice = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0 || n > MAX_PRICE) return null;
  return Math.round(n * 100) / 100;
};

// Validate and normalize a raw items array (form input, import file, storage).
export const sanitizeItems = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    .slice(0, MAX_ITEMS)
    .map((item) => {
      const kind = Object.prototype.hasOwnProperty.call(SERVICE_KINDS, item.kind) ? item.kind : 'other';
      const name = typeof item.name === 'string' && item.name.trim()
        ? item.name.trim().slice(0, 80)
        : SERVICE_KINDS[kind].defaultName;
      const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim().slice(0, 64) : newItemId();
      const clean = { id, kind, name, price: cleanPrice(item.price) };
      // Which price-list option this line came from, and its nail count
      if (typeof item.catalog === 'string' && item.catalog.trim()) {
        clean.catalog = item.catalog.trim().slice(0, 80);
      }
      if (Number.isInteger(item.qty) && item.qty > 1 && item.qty <= 20) {
        clean.qty = item.qty;
      }
      return clean;
    });
};

// Items for an appointment, synthesizing them from legacy service/price fields
// when the booking was created before itemized services existed.
export const getServiceItems = (appt) => {
  if (!appt || appt.type === 'personal') return [];
  if (Array.isArray(appt.items)) return appt.items;

  const price = typeof appt.price === 'number' ? appt.price : null;
  if (appt.service === 'nails') {
    return [{ id: `${appt.id}-1`, kind: 'nails', name: 'Nail art', price }];
  }
  if (appt.service === 'both') {
    // The old single price covered both services; keep it on the first line
    // so the total is unchanged.
    return [
      { id: `${appt.id}-1`, kind: 'hair', name: 'Hair braiding', price },
      { id: `${appt.id}-2`, kind: 'nails', name: 'Nail art', price: null }
    ];
  }
  return [{ id: `${appt.id}-1`, kind: 'hair', name: 'Hair braiding', price }];
};

// Sum of item prices, or null when no item has a price yet.
export const itemsTotal = (items) => {
  const priced = items.filter((i) => typeof i.price === 'number');
  if (priced.length === 0) return null;
  return Math.round(priced.reduce((sum, i) => sum + i.price, 0) * 100) / 100;
};

// Legacy single-service value derived from the item kinds.
export const deriveService = (items) => {
  const hasHair = items.some((i) => i.kind === 'hair');
  const hasNails = items.some((i) => i.kind === 'nails');
  if (hasHair && hasNails) return 'both';
  if (hasNails) return 'nails';
  return 'braiding';
};

// Short human-readable scope, e.g. "Knotless braids + Gel nails".
export const scopeSummary = (appt) =>
  getServiceItems(appt).map((i) => i.name).join(' + ');

export const formatMoney = (amount) => {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return '$0';
  return Number.isInteger(amount)
    ? `$${amount.toLocaleString('en-US')}`
    : `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
