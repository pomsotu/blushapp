// Turns appointments into the numbers behind a performance report.
// Pure functions only, so it is easy to test and reuse for the in-app preview.

import { getServiceItems, SERVICE_KINDS } from './services';
import { getDurationMins } from './schedule';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const round2 = (n) => Math.round(n * 100) / 100;
const round1 = (n) => Math.round(n * 10) / 10;
const usd = (n) => `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const prettyDay = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'short', day: 'numeric' });
};
const priceOf = (a) => (typeof a.price === 'number' ? a.price : 0);

export const monthKey = (date) => date.slice(0, 7);

export const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

export const shortMonthLabel = (key) => {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1].slice(0, 3)} ${String(y).slice(2)}`;
};

export const previousMonthKey = (key) => {
  const [y, m] = key.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
};

const nextMonthKey = (key) => {
  const [y, m] = key.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
};

const weekdayOf = (date) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

// Months that have at least one business booking, newest first, always
// including the current month so a fresh month can still be reported on.
export const availableMonths = (appointments, currentMonth) => {
  const keys = new Set([currentMonth]);
  appointments.forEach((a) => {
    if (a.type === 'business' && a.date) keys.add(monthKey(a.date));
  });
  return [...keys].sort().reverse();
};

const pctChange = (now, before) => (before > 0 ? round1(((now - before) / before) * 100) : null);

// Core metrics for a set of business bookings
const summarize = (appts) => {
  const completed = appts.filter((a) => a.status === 'completed');
  const cancelled = appts.filter((a) => a.status === 'cancelled');
  const upcoming = appts.filter((a) => a.status === 'upcoming');
  const earned = round2(completed.reduce((s, a) => s + priceOf(a), 0));
  const minutes = completed.reduce((s, a) => s + getDurationMins(a), 0);
  const decided = completed.length + cancelled.length;
  return {
    earned,
    completedCount: completed.length,
    cancelledCount: cancelled.length,
    upcomingCount: upcoming.length,
    upcomingValue: round2(upcoming.reduce((s, a) => s + priceOf(a), 0)),
    lostToCancellations: round2(cancelled.reduce((s, a) => s + priceOf(a), 0)),
    averagePerBooking: completed.length ? round2(earned / completed.length) : 0,
    hoursWorked: round2(minutes / 60),
    earnedPerHour: minutes ? round2(earned / (minutes / 60)) : 0,
    cancellationRate: decided ? round1((cancelled.length / decided) * 100) : 0,
    uniqueClients: new Set(completed.map((a) => (a.clientName || '').trim().toLowerCase()).filter(Boolean)).size
  };
};

/**
 * Build a report.
 * @param {Array} appointments all stored appointments
 * @param {{ period: 'all' | string, today: string }} opts period is 'all' or 'YYYY-MM'; today is 'YYYY-MM-DD'
 */
export const buildReport = (appointments, { period = 'all', today }) => {
  const isAll = period === 'all';
  const business = appointments.filter((a) => a.type === 'business' && a.date);
  const inPeriod = isAll ? business : business.filter((a) => monthKey(a.date) === period);
  const completed = inPeriod.filter((a) => a.status === 'completed');

  const summary = summarize(inPeriod);

  // Month-over-month comparison (monthly reports only)
  let comparison = null;
  if (!isAll) {
    const prevKey = previousMonthKey(period);
    const prev = summarize(business.filter((a) => monthKey(a.date) === prevKey));
    comparison = {
      previousLabel: monthLabel(prevKey),
      previousEarned: prev.earned,
      previousCompleted: prev.completedCount,
      earnedChangePct: pctChange(summary.earned, prev.earned),
      completedChange: summary.completedCount - prev.completedCount
    };
  }

  // Earnings over time: per day for a month, per month for all time
  let timeline;
  if (isAll) {
    const keys = business.map((a) => monthKey(a.date)).sort();
    const first = keys[0] || monthKey(today);
    const last = [monthKey(today), keys[keys.length - 1] || first].sort().pop();
    timeline = [];
    for (let k = first; k <= last; k = nextMonthKey(k)) {
      const monthAppts = completed.filter((a) => monthKey(a.date) === k);
      timeline.push({
        key: k,
        label: shortMonthLabel(k),
        earned: round2(monthAppts.reduce((s, a) => s + priceOf(a), 0)),
        count: monthAppts.length
      });
      if (timeline.length > 120) break;
    }
  } else {
    const [y, m] = period.split('-').map(Number);
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    timeline = Array.from({ length: days }, (_, i) => {
      const date = `${period}-${String(i + 1).padStart(2, '0')}`;
      const dayAppts = completed.filter((a) => a.date === date);
      return {
        key: date,
        label: String(i + 1),
        earned: round2(dayAppts.reduce((s, a) => s + priceOf(a), 0)),
        count: dayAppts.length
      };
    });
  }

  // Revenue by service type and by individual service (completed only)
  const byKind = {};
  const byService = {};
  completed.forEach((a) => {
    getServiceItems(a).forEach((item) => {
      const price = typeof item.price === 'number' ? item.price : 0;
      const k = byKind[item.kind] || (byKind[item.kind] = { kind: item.kind, label: SERVICE_KINDS[item.kind]?.label.replace(/^\S+\s/, '') || 'Other', count: 0, revenue: 0 });
      k.count += 1;
      k.revenue += price;
      // Group per-nail lines like "Nail repair (2 nails)" under one name
      const name = item.catalog || item.name.replace(/\s\(\d+ nails?\)$/, '');
      const s = byService[name] || (byService[name] = { name, kind: item.kind, count: 0, revenue: 0 });
      s.count += 1;
      s.revenue += price;
    });
  });
  const serviceTotal = Object.values(byKind).reduce((s, k) => s + k.revenue, 0);
  const kinds = Object.values(byKind)
    .map((k) => ({ ...k, revenue: round2(k.revenue), share: serviceTotal ? round1((k.revenue / serviceTotal) * 100) : 0 }))
    .sort((a, b) => b.revenue - a.revenue);
  const services = Object.values(byService)
    .map((s) => ({ ...s, revenue: round2(s.revenue) }))
    .sort((a, b) => b.revenue - a.revenue || b.count - a.count);

  // Clients ranked by spend
  const byClient = {};
  completed.forEach((a) => {
    const name = (a.clientName || 'Client').trim();
    const key = name.toLowerCase();
    const c = byClient[key] || (byClient[key] = { name, visits: 0, spent: 0, lastVisit: a.date });
    c.visits += 1;
    c.spent += priceOf(a);
    if (a.date > c.lastVisit) c.lastVisit = a.date;
  });
  const clients = Object.values(byClient)
    .map((c) => ({ ...c, spent: round2(c.spent) }))
    .sort((a, b) => b.spent - a.spent || b.visits - a.visits);

  // Busiest weekday by earnings
  const weekdays = WEEKDAYS.map((name) => ({ name, earned: 0, count: 0 }));
  completed.forEach((a) => {
    const w = weekdays[weekdayOf(a.date)];
    w.earned += priceOf(a);
    w.count += 1;
  });
  const busiestDay = [...weekdays].sort((a, b) => b.earned - a.earned || b.count - a.count)[0];

  const bestPeriod = [...timeline].sort((a, b) => b.earned - a.earned)[0];

  // Full ledger for the period, oldest first
  const ledger = [...inPeriod]
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .map((a) => ({
      date: a.date,
      time: a.time,
      client: a.clientName || 'Client',
      services: getServiceItems(a).map((i) => i.name).join(', ') || 'No services added',
      durationMins: getDurationMins(a),
      status: a.status,
      amount: typeof a.price === 'number' ? a.price : null
    }));

  // Plain-language highlights, only when backed by data
  const highlights = [];
  if (summary.completedCount === 0) {
    highlights.push(isAll ? 'No completed bookings yet.' : 'No completed bookings this month yet.');
  } else {
    if (comparison && comparison.earnedChangePct !== null) {
      const up = comparison.earnedChangePct >= 0;
      highlights.push(`Earnings ${up ? 'up' : 'down'} ${Math.abs(comparison.earnedChangePct)}% from ${comparison.previousLabel}.`);
    }
    if (services[0]) highlights.push(`Top service: ${services[0].name} (${services[0].count} booked, ${usd(services[0].revenue)}).`);
    if (clients[0]) highlights.push(`Top client: ${clients[0].name} (${clients[0].visits} visit${clients[0].visits === 1 ? '' : 's'}, ${usd(clients[0].spent)}).`);
    if (busiestDay?.count) highlights.push(`Best day of the week: ${busiestDay.name}.`);
    if (bestPeriod?.earned) highlights.push(`Best ${isAll ? 'month' : 'day'}: ${isAll ? monthLabel(bestPeriod.key) : prettyDay(bestPeriod.key)} with ${usd(bestPeriod.earned)}.`);
    if (summary.hoursWorked) highlights.push(`Average of ${usd(summary.earnedPerHour)} per hour of booked work.`);
  }
  if (summary.cancelledCount) {
    highlights.push(`${summary.cancelledCount} cancellation${summary.cancelledCount === 1 ? '' : 's'} (${summary.cancellationRate}% of finished bookings)${summary.lostToCancellations ? `, ${usd(summary.lostToCancellations)} not earned` : ''}.`);
  }
  if (summary.upcomingCount) {
    highlights.push(`${summary.upcomingCount} booking${summary.upcomingCount === 1 ? '' : 's'} still upcoming${summary.upcomingValue ? `, worth ${usd(summary.upcomingValue)}` : ''}.`);
  }

  const firstDate = business.map((a) => a.date).sort()[0];

  // Month-by-month breakdown (all-time reports), newest first
  const monthly = isAll
    ? timeline.map((t) => {
        const m = summarize(business.filter((a) => monthKey(a.date) === t.key));
        return {
          key: t.key,
          label: monthLabel(t.key),
          completed: m.completedCount,
          cancelled: m.cancelledCount,
          hours: m.hoursWorked,
          earned: m.earned,
          average: m.averagePerBooking
        };
      }).reverse()
    : [];

  return {
    period,
    isAll,
    title: isAll ? 'All-Time Performance Report' : `Monthly Report`,
    periodLabel: isAll ? (firstDate ? `${monthLabel(monthKey(firstDate))} – ${monthLabel(monthKey(today))}` : 'All time') : monthLabel(period),
    generatedOn: today,
    summary,
    comparison,
    timeline,
    kinds,
    services,
    clients,
    busiestDay: busiestDay?.count ? busiestDay.name : null,
    highlights,
    monthly,
    ledger
  };
};
