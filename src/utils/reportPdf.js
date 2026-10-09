// Draws a performance report (from buildReport) into an A4 PDF.
// jsPDF and jspdf-autotable are loaded on demand so they never weigh down
// normal app start-up.

import { formatTime } from './dateUtils';
import { formatDurationLabel } from './schedule';

const BRAND = {
  deep: [219, 39, 119],      // #DB2777
  primary: [244, 114, 182],  // #F472B6
  soft: [252, 231, 243],     // #FCE7F3
  wash: [253, 242, 248],     // #FDF2F8
  ink: [31, 31, 31],
  body: [51, 51, 51],
  muted: [107, 114, 128],
  line: [243, 211, 227],
  green: [22, 128, 61],
  red: [190, 18, 60]
};

const PAGE = { w: 210, h: 297, margin: 16, footer: 14 };

const money = (n) => `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const moneyShort = (n) => (Number.isInteger(n) ? `$${n.toLocaleString('en-US')}` : money(n));

// The built-in PDF fonts only cover Latin-1 / WinAnsi. Drop emoji and other
// characters they cannot draw instead of printing garbage.
const clean = (value) =>
  String(value ?? '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E -ÿ–—•…]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

const prettyDate = (iso, withWeekday = false) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: withWeekday ? 'short' : undefined,
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const reportFileName = (report) =>
  report.isAll
    ? `blush-report-all-time-${report.generatedOn}.pdf`
    : `blush-report-${report.period}.pdf`;

export async function createReportPdf(report, { businessName = "Tari's Studio" } = {}) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const contentW = PAGE.w - PAGE.margin * 2;
  const bottomLimit = PAGE.h - PAGE.margin - PAGE.footer;
  let y = 0;

  doc.setProperties({
    title: `${report.title} - ${report.periodLabel}`,
    subject: 'Blush performance report',
    author: businessName,
    creator: 'Blush'
  });

  const setText = (size, style = 'normal', color = BRAND.body, font = 'helvetica') => {
    doc.setFont(font, style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };

  const ensureSpace = (needed) => {
    if (y + needed > bottomLimit) {
      doc.addPage();
      y = PAGE.margin;
    }
  };

  const sectionHeader = (label, needed = 30) => {
    ensureSpace(needed);
    y += 4;
    setText(10, 'bold', BRAND.deep);
    doc.text(label.toUpperCase(), PAGE.margin, y, { charSpace: 0.4 });
    doc.setDrawColor(...BRAND.line);
    doc.setLineWidth(0.3);
    doc.line(PAGE.margin, y + 2, PAGE.margin + contentW, y + 2);
    y += 7;
  };

  const tableDefaults = {
    margin: { left: PAGE.margin, right: PAGE.margin, top: PAGE.margin, bottom: PAGE.margin + PAGE.footer },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      textColor: BRAND.body,
      cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 },
      lineColor: BRAND.line,
      lineWidth: 0.2,
      overflow: 'linebreak'
    },
    rowPageBreak: 'avoid',
    headStyles: { fillColor: BRAND.deep, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: BRAND.wash },
    footStyles: { fillColor: BRAND.soft, textColor: BRAND.ink, fontStyle: 'bold' }
  };

  // Small summary tables stay on one page; long ones (the ledger) may flow
  const table = (opts) => {
    autoTable(doc, { ...tableDefaults, startY: y, ...opts });
    y = doc.lastAutoTable.finalY + 6;
  };

  // ---------- Header band ----------
  doc.setFillColor(...BRAND.deep);
  doc.rect(0, 0, PAGE.w, 34, 'F');
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 34, PAGE.w, 1.2, 'F');

  setText(26, 'bolditalic', [255, 255, 255], 'times');
  doc.text('blush', PAGE.margin, 18);
  setText(9, 'bold', [255, 228, 240]);
  doc.text(clean(businessName).toUpperCase(), PAGE.margin, 25, { charSpace: 0.6 });

  const right = PAGE.w - PAGE.margin;
  setText(15, 'bold', [255, 255, 255]);
  doc.text(clean(report.title), right, 15, { align: 'right' });
  setText(11, 'normal', [255, 228, 240]);
  doc.text(clean(report.periodLabel), right, 21.5, { align: 'right' });
  setText(8, 'normal', [255, 214, 232]);
  doc.text(`Generated ${prettyDate(report.generatedOn)}`, right, 27, { align: 'right' });

  y = 45;

  // ---------- Summary tiles ----------
  const s = report.summary;
  const tiles = [
    { label: 'Earned', value: money(s.earned), note: 'completed bookings' },
    { label: 'Completed', value: String(s.completedCount), note: `booking${s.completedCount === 1 ? '' : 's'}` },
    { label: 'Average', value: money(s.averagePerBooking), note: 'per booking' },
    { label: 'Hours worked', value: String(s.hoursWorked), note: `${money(s.earnedPerHour)} / hour` },
    { label: 'Clients', value: String(s.uniqueClients), note: 'served' },
    { label: 'Cancelled', value: String(s.cancelledCount), note: `${s.cancellationRate}% of finished` },
    { label: 'Upcoming', value: String(s.upcomingCount), note: s.upcomingValue ? `${money(s.upcomingValue)} booked` : 'scheduled' },
    { label: 'Busiest day', value: report.busiestDay ? report.busiestDay.slice(0, 3) : '—', note: report.busiestDay || 'not enough data' }
  ];
  const gap = 3;
  const tileW = (contentW - gap * 3) / 4;
  const tileH = 21;
  tiles.forEach((t, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = PAGE.margin + col * (tileW + gap);
    const ty = y + row * (tileH + gap);
    const primary = i === 0;
    doc.setFillColor(...(primary ? BRAND.deep : BRAND.wash));
    doc.setDrawColor(...(primary ? BRAND.deep : BRAND.line));
    doc.setLineWidth(0.25);
    doc.roundedRect(x, ty, tileW, tileH, 2.5, 2.5, 'FD');
    setText(7, 'bold', primary ? [255, 214, 232] : BRAND.muted);
    doc.text(t.label.toUpperCase(), x + 3.5, ty + 5.5, { charSpace: 0.3 });
    setText(15, 'bold', primary ? [255, 255, 255] : BRAND.ink);
    doc.text(t.value, x + 3.5, ty + 13.2);
    setText(7.5, 'normal', primary ? [255, 228, 240] : BRAND.muted);
    doc.text(clean(t.note), x + 3.5, ty + 18, { maxWidth: tileW - 6 });
  });
  y += tileH * 2 + gap + 6;

  // ---------- Month-over-month ----------
  if (report.comparison) {
    const c = report.comparison;
    doc.setFillColor(...BRAND.soft);
    doc.roundedRect(PAGE.margin, y, contentW, 11, 2, 2, 'F');
    setText(9, 'normal', BRAND.body);
    const change = c.earnedChangePct === null
      ? 'no earnings to compare'
      : `${c.earnedChangePct >= 0 ? '+' : ''}${c.earnedChangePct}% earnings`;
    const completedDelta = `${c.completedChange >= 0 ? '+' : ''}${c.completedChange} completed`;
    doc.text(`Compared with ${clean(c.previousLabel)}:  ${money(c.previousEarned)} earned, ${c.previousCompleted} completed`, PAGE.margin + 4, y + 7);
    setText(9, 'bold', c.earnedChangePct === null ? BRAND.muted : c.earnedChangePct >= 0 ? BRAND.green : BRAND.red);
    doc.text(`${change}  ·  ${completedDelta}`, PAGE.margin + contentW - 4, y + 7, { align: 'right' });
    y += 17;
  }

  // ---------- Earnings chart ----------
  sectionHeader(report.isAll ? 'Earnings by month' : 'Earnings by day', 70);
  const chartH = 46;
  const axisW = 14;
  const chartX = PAGE.margin + axisW;
  const chartW = contentW - axisW;
  const maxVal = Math.max(...report.timeline.map((p) => p.earned), 0);
  const niceMax = maxVal <= 0 ? 100 : (() => {
    const mag = 10 ** Math.floor(Math.log10(maxVal));
    return Math.ceil(maxVal / mag) * mag;
  })();

  // grid + y labels
  for (let i = 0; i <= 4; i += 1) {
    const gy = y + chartH - (chartH * i) / 4;
    doc.setDrawColor(...(i === 0 ? BRAND.muted : BRAND.line));
    doc.setLineWidth(i === 0 ? 0.3 : 0.15);
    doc.line(chartX, gy, chartX + chartW, gy);
    setText(7, 'normal', BRAND.muted);
    doc.text(moneyShort(Math.round((niceMax * i) / 4)), chartX - 2, gy + 1, { align: 'right' });
  }

  const n = report.timeline.length;
  const slot = chartW / Math.max(n, 1);
  const barW = Math.max(1.2, Math.min(slot * 0.62, 14));
  const labelEvery = n <= 16 ? 1 : n <= 31 ? (slot >= 5 ? 1 : 2) : Math.ceil(n / 16);
  report.timeline.forEach((p, i) => {
    const bx = chartX + i * slot + (slot - barW) / 2;
    const bh = niceMax ? (p.earned / niceMax) * chartH : 0;
    if (bh > 0) {
      doc.setFillColor(...(p.earned === maxVal ? BRAND.deep : BRAND.primary));
      doc.rect(bx, y + chartH - bh, barW, bh, 'F');
      if (n <= 16) {
        setText(6.5, 'bold', BRAND.deep);
        doc.text(moneyShort(Math.round(p.earned)), bx + barW / 2, y + chartH - bh - 1.2, { align: 'center' });
      }
    }
    if (i % labelEvery === 0 || i === n - 1) {
      setText(6.5, 'normal', BRAND.muted);
      doc.text(p.label, bx + barW / 2, y + chartH + 4, { align: 'center' });
    }
  });
  if (maxVal <= 0) {
    setText(9, 'italic', BRAND.muted);
    doc.text('No completed earnings in this period yet.', chartX + chartW / 2, y + chartH / 2, { align: 'center' });
  }
  y += chartH + 10;

  // ---------- Month by month (all-time) ----------
  if (report.monthly.length) {
    sectionHeader('Month by month', 35);
    table({
      pageBreak: report.monthly.length <= 18 ? 'avoid' : 'auto',
      head: [['Month', 'Completed', 'Cancelled', 'Hours', 'Average', 'Earned']],
      body: report.monthly.map((m) => [m.label, m.completed, m.cancelled, m.hours, money(m.average), money(m.earned)]),
      foot: [['Total', s.completedCount, s.cancelledCount, s.hoursWorked, money(s.averagePerBooking), money(s.earned)]],
      showFoot: 'lastPage',
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
      didParseCell: (d) => { if (d.section !== 'body' && d.column.index > 0) d.cell.styles.halign = 'right'; }
    });
  }

  // ---------- Services ----------
  sectionHeader('Earnings by service type', 35);
  if (report.kinds.length) {
    table({
      pageBreak: 'avoid',
      head: [['Service type', 'Services done', 'Revenue', 'Share']],
      body: report.kinds.map((k) => [clean(k.label), k.count, money(k.revenue), `${k.share}%`]),
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
      headStyles: { ...tableDefaults.headStyles, halign: 'left' },
      didParseCell: (d) => { if (d.section === 'head' && d.column.index > 0) d.cell.styles.halign = 'right'; }
    });
  } else {
    setText(9, 'italic', BRAND.muted);
    doc.text('No completed services in this period.', PAGE.margin, y);
    y += 8;
  }

  if (report.services.length) {
    sectionHeader('Top services', 35);
    table({
      pageBreak: 'avoid',
      head: [['Service', 'Type', 'Times booked', 'Revenue']],
      body: report.services.slice(0, 12).map((sv) => [clean(sv.name), clean(sv.kind[0].toUpperCase() + sv.kind.slice(1)), sv.count, money(sv.revenue)]),
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } },
      didParseCell: (d) => { if (d.section === 'head' && d.column.index > 1) d.cell.styles.halign = 'right'; }
    });
  }

  // ---------- Clients ----------
  if (report.clients.length) {
    sectionHeader('Top clients', 35);
    table({
      pageBreak: 'avoid',
      head: [['Client', 'Visits', 'Last visit', 'Spent']],
      body: report.clients.slice(0, 12).map((c) => [clean(c.name), c.visits, prettyDate(c.lastVisit), money(c.spent)]),
      columnStyles: { 1: { halign: 'right' }, 3: { halign: 'right' } },
      didParseCell: (d) => { if (d.section === 'head' && (d.column.index === 1 || d.column.index === 3)) d.cell.styles.halign = 'right'; }
    });
  }

  // ---------- Highlights ----------
  if (report.highlights.length) {
    sectionHeader('Highlights', 12 + report.highlights.length * 6);
    report.highlights.forEach((h) => {
      const lines = doc.splitTextToSize(clean(h), contentW - 6);
      ensureSpace(lines.length * 4.6 + 1.5);
      doc.setFillColor(...BRAND.primary);
      doc.circle(PAGE.margin + 1.2, y - 1.1, 0.9, 'F');
      setText(9.5, 'normal', BRAND.body);
      doc.text(lines, PAGE.margin + 5, y);
      y += lines.length * 4.6 + 1.5;
    });
    y += 3;
  }

  // ---------- Ledger ----------
  sectionHeader('All bookings', 30);
  if (report.ledger.length) {
    const statusColor = { completed: BRAND.green, cancelled: BRAND.red, upcoming: BRAND.deep };
    table({
      head: [['Date', 'Time', 'Client', 'Services', 'Length', 'Status', 'Amount']],
      body: report.ledger.map((r) => [
        prettyDate(r.date),
        formatTime(r.time),
        clean(r.client),
        clean(r.services),
        formatDurationLabel(r.durationMins),
        r.status[0].toUpperCase() + r.status.slice(1),
        r.amount === null ? '—' : money(r.amount)
      ]),
      foot: [[
        { content: `${report.ledger.length} booking${report.ledger.length === 1 ? '' : 's'}`, colSpan: 6 },
        { content: money(s.earned), styles: { halign: 'right' } }
      ]],
      showFoot: 'lastPage',
      styles: { ...tableDefaults.styles, fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 18 },
        2: { cellWidth: 24 },
        4: { cellWidth: 16 },
        5: { cellWidth: 21 },
        6: { cellWidth: 21, halign: 'right' }
      },
      didParseCell: (d) => {
        if (d.section === 'head' && d.column.index === 6) d.cell.styles.halign = 'right';
        if (d.section === 'body' && d.column.index === 5) {
          d.cell.styles.textColor = statusColor[report.ledger[d.row.index].status] || BRAND.body;
          d.cell.styles.fontStyle = 'bold';
        }
        if (d.section === 'body' && d.column.index === 6 && report.ledger[d.row.index].status !== 'completed') {
          d.cell.styles.textColor = BRAND.muted;
        }
      }
    });
    setText(7.5, 'italic', BRAND.muted);
    ensureSpace(6);
    doc.text('Earned totals count completed bookings only. Cancelled and upcoming amounts are shown in grey for reference.', PAGE.margin, y);
  } else {
    setText(9, 'italic', BRAND.muted);
    doc.text('No business bookings in this period.', PAGE.margin, y);
  }

  // ---------- Footer on every page ----------
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    const fy = PAGE.h - PAGE.margin + 4;
    doc.setDrawColor(...BRAND.line);
    doc.setLineWidth(0.3);
    doc.line(PAGE.margin, fy - 5, PAGE.w - PAGE.margin, fy - 5);
    setText(7.5, 'normal', BRAND.muted);
    doc.text(`Generated by Blush  ·  ${clean(businessName)}  ·  ${clean(report.periodLabel)}`, PAGE.margin, fy);
    doc.text(`Page ${p} of ${pages}`, PAGE.w - PAGE.margin, fy, { align: 'right' });
  }

  return doc;
}
