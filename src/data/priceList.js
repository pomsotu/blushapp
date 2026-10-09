// Tari's price list ("T's Price List"), grouped by service type.
//
// Each type (hair / nails / other) holds sections of options. An option's
// `name` is what appears on the booking; `price` is filled in when chosen.
// - `max`: the price is a range (price..max); she adjusts after adding.
// - `perNail`: priced per nail; the booking line gets a nail-count stepper.
//
// To add hair options later, add sections under `hair` in the same shape, e.g.
//   { id: 'knotless', title: 'Knotless braids', items: [
//       { name: 'Knotless braids (Medium)', label: 'Medium', price: 150 } ] }
// They then appear in the hair dropdown and the price list automatically.

export const SERVICE_CATALOG = {
  hair: [],
  nails: [
    {
      id: 'acrylics',
      title: 'Acrylics',
      items: [
        { name: 'Acrylics (Short)', label: 'Short', price: 45 },
        { name: 'Acrylics (Medium)', label: 'Medium', price: 50 },
        { name: 'Acrylics (Long)', label: 'Long', price: 55 },
        { name: 'Acrylics (XL)', label: 'XL', price: 60 }
      ]
    },
    {
      id: 'gelx',
      title: 'Gel-X',
      items: [
        { name: 'Gel-X (Short)', label: 'Short', price: 35 },
        { name: 'Gel-X (Medium)', label: 'Medium', price: 40 },
        { name: 'Gel-X (Long)', label: 'Long', price: 45 },
        { name: 'Gel-X (XL)', label: 'XL', price: 50 }
      ]
    },
    {
      id: 'addons',
      title: 'Add-ons',
      note: 'Add-on prices depend on the design and nail length.',
      items: [
        { name: '3D flowers', label: '3D flowers', price: 5 },
        { name: 'Nail repair', label: 'Nail repair', price: 5, perNail: true },
        { name: 'French tips', label: 'French tips', price: 10 },
        { name: 'Chrome', label: 'Chrome', price: 10 },
        { name: 'Extra nail art', label: 'Extra nail art', price: 3, max: 5, perNail: true },
        { name: 'Simple rhinestones', label: 'Simple rhinestones', price: 5, max: 10 },
        { name: 'Full rhinestones design', label: 'Full rhinestones design', price: 15, max: 30 }
      ]
    }
  ],
  other: []
};

export const sectionsForKind = (kind) => SERVICE_CATALOG[kind] || [];

export const hasOptions = (kind) => sectionsForKind(kind).some((s) => s.items.length > 0);

// Look up an option by its name within a service type
export const findOption = (kind, name) => {
  if (!name) return null;
  for (const section of sectionsForKind(kind)) {
    const hit = section.items.find((i) => i.name === name);
    if (hit) return hit;
  }
  return null;
};

export const priceLabel = (item) =>
  `$${item.price}${item.max ? `–$${item.max}` : ''}${item.perNail ? ' / nail' : ''}`;

export const nailCountName = (name, qty) => `${name} (${qty} nail${qty === 1 ? '' : 's'})`;

// Line name and price for an option at a given quantity
export const optionLine = (option, qty = 1) => ({
  name: option.perNail ? nailCountName(option.name, qty) : option.name,
  price: option.price * (option.perNail ? qty : 1)
});
