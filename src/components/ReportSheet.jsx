import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getOshawaTodayStr, TIMEZONE } from '../utils/dateUtils';
import { buildReport, availableMonths, monthLabel, monthKey, reportFingerprint } from '../utils/reportData';
import { createReportPdf, reportFileName } from '../utils/reportPdf';
import { formatMoney } from '../utils/services';

const canShareFiles = () => {
  try {
    if (typeof navigator === 'undefined' || !navigator.canShare || typeof File === 'undefined') return false;
    return navigator.canShare({ files: [new File([''], 'test.pdf', { type: 'application/pdf' })] });
  } catch {
    return false;
  }
};

const madeLabel = (iso) =>
  new Date(iso).toLocaleString('en-US', { timeZone: TIMEZONE, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

// Bottom sheet for picking a report period, previewing the headline numbers
// and downloading or sharing the PDF. Remembers when each period's report was
// made and offers "Update report" when bookings have changed since.
export default function ReportSheet({ isOpen, onClose }) {
  const appointments = useAppStore((state) => state.appointments);
  const reportLog = useAppStore((state) => state.reportLog) || {};
  const recordReport = useAppStore((state) => state.recordReport);
  const today = getOshawaTodayStr();
  const months = useMemo(() => availableMonths(appointments, monthKey(today)), [appointments, today]);

  const [mode, setMode] = useState('month');
  const [monthIndex, setMonthIndex] = useState(0);
  const [busy, setBusy] = useState(null); // 'download' | 'share' | null
  const [message, setMessage] = useState(null); // { tone, text }
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const shareSupported = useMemo(canShareFiles, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    setMessage(null);
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const period = mode === 'all' ? 'all' : months[Math.min(monthIndex, months.length - 1)];
  const report = useMemo(
    () => (isOpen ? buildReport(appointments, { period, today }) : null),
    [isOpen, appointments, period, today]
  );

  const fingerprint = useMemo(
    () => (isOpen ? reportFingerprint(appointments, period, monthKey(today)) : ''),
    [isOpen, appointments, period, today]
  );

  if (!isOpen || !report) return null;

  // Has this period's report been made before, and is it still current?
  const last = reportLog[period];
  const reportState = !last ? 'new' : last.fingerprint === fingerprint ? 'current' : 'stale';
  const nextVersion = !last ? 1 : reportState === 'stale' ? last.version + 1 : last.version;
  const primaryLabel = { new: 'Download PDF', current: 'Download again', stale: 'Update report' }[reportState];

  const s = report.summary;
  const hasData = report.ledger.length > 0;

  const run = async (kind) => {
    setBusy(kind);
    setMessage(null);
    try {
      const doc = await createReportPdf(report, { version: nextVersion, madeAt: new Date() });
      const fileName = reportFileName(report, nextVersion);
      if (kind === 'share') {
        const file = new File([doc.output('blob')], fileName, { type: 'application/pdf' });
        await navigator.share({ files: [file], title: `${report.title} - ${report.periodLabel}` });
        recordReport(period, fingerprint);
        setMessage({ tone: 'ok', text: reportState === 'stale' ? `Updated report shared (version ${nextVersion}).` : 'Report shared.' });
      } else {
        doc.save(fileName);
        recordReport(period, fingerprint);
        setMessage({ tone: 'ok', text: reportState === 'stale' ? `Updated to version ${nextVersion}. Saved ${fileName}` : `Saved ${fileName}` });
      }
    } catch (err) {
      if (err?.name === 'AbortError') {
        setMessage(null);
      } else {
        setMessage({ tone: 'error', text: 'Could not create the PDF. Check your connection and try again.' });
      }
    } finally {
      setBusy(null);
    }
  };

  const stat = (label, value, testId) => (
    <div className="flex-1 min-w-0 bg-white rounded-xl border border-pink-100 px-3 py-2.5">
      <div className="font-sans text-[9.5px] font-black uppercase tracking-widest text-gray-500">{label}</div>
      <div data-testid={testId} className="font-sans text-[17px] font-black text-pink-deep tabular-nums truncate">{value}</div>
    </div>
  );

  const change = report.comparison?.earnedChangePct;

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/35 blush-fade-in" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
        data-testid="report-sheet"
        className="relative bg-[#FFFDFE] rounded-t-[28px] max-h-[90%] flex flex-col shadow-[0_-12px_40px_rgba(219,39,119,0.18)] blush-sheet-in"
      >
        <div className="flex-shrink-0 px-5 pt-2.5 pb-3">
          <div className="w-10 h-1 rounded-full bg-pink-200 mx-auto mb-3" aria-hidden="true" />
          <div className="flex items-center justify-between">
            <h2 id="report-title" className="font-serif italic text-[22px] font-black text-pink-deep">Reports</h2>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close reports"
              className="w-10 h-10 rounded-full flex items-center justify-center bg-pink-soft/60 text-pink-deep hover:bg-pink-soft border-none cursor-pointer focus-visible:outline-2 focus-visible:outline-pink-primary"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <p className="font-sans text-[12px] font-bold text-gray-500 mt-0.5">
            Download a PDF of your earnings, services, clients and every booking.
          </p>
        </div>

        <div className="overflow-y-auto no-scrollbar px-5 pb-4 flex flex-col gap-4">
          {/* Period type */}
          <div className="bg-pink-soft/40 p-1 rounded-2xl flex border border-pink-100/50" role="tablist" aria-label="Report period">
            {[
              { value: 'month', label: 'Monthly' },
              { value: 'all', label: 'All time' }
            ].map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={mode === t.value}
                data-testid={`report-mode-${t.value}`}
                onClick={() => setMode(t.value)}
                className={`flex-1 py-2.5 rounded-xl border-none font-sans text-xs font-black transition-all cursor-pointer ${
                  mode === t.value
                    ? 'bg-white text-pink-deep shadow-[0_2px_8px_rgba(219,39,119,0.06)]'
                    : 'text-gray-500 hover:text-pink-deep/85'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Month stepper */}
          {mode === 'month' && (
            <div className="flex items-center justify-between bg-white rounded-2xl border border-pink-100 p-1.5">
              <button
                type="button"
                aria-label="Previous month"
                data-testid="report-prev-month"
                disabled={monthIndex >= months.length - 1}
                onClick={() => setMonthIndex((i) => Math.min(months.length - 1, i + 1))}
                className="w-10 h-10 rounded-xl bg-pink-soft/50 text-pink-deep border-none cursor-pointer flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <div className="font-sans text-[15px] font-black text-gray-800" data-testid="report-month-label" aria-live="polite">
                {monthLabel(period)}
              </div>
              <button
                type="button"
                aria-label="Next month"
                data-testid="report-next-month"
                disabled={monthIndex <= 0}
                onClick={() => setMonthIndex((i) => Math.max(0, i - 1))}
                className="w-10 h-10 rounded-xl bg-pink-soft/50 text-pink-deep border-none cursor-pointer flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
          )}

          {/* Preview */}
          <div className="rounded-2xl bg-pink-soft/40 border border-pink-100 p-3 flex flex-col gap-2.5" data-testid="report-preview">
            <div className="flex items-baseline justify-between">
              <span className="font-sans text-[11px] font-black uppercase tracking-widest text-pink-deep/80">
                {report.isAll ? 'All time' : report.periodLabel}
              </span>
              {report.comparison && change !== null && change !== undefined && (
                <span className={`font-sans text-[11px] font-black ${change >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {change >= 0 ? '▲' : '▼'} {Math.abs(change)}% vs {report.comparison.previousLabel.split(' ')[0]}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {stat('Earned', formatMoney(s.earned), 'report-earned')}
              {stat('Completed', s.completedCount, 'report-completed')}
            </div>
            <div className="flex gap-2">
              {stat('Average', formatMoney(s.averagePerBooking))}
              {stat('Hours', s.hoursWorked)}
            </div>
            {report.highlights.slice(0, 2).map((h) => (
              <p key={h} className="font-sans text-[12px] font-semibold text-gray-600 leading-snug m-0">{h}</p>
            ))}
            <p className="font-sans text-[11px] font-bold text-gray-500 m-0">
              PDF includes: earnings chart, service types, top services, top clients and {report.ledger.length} booking{report.ledger.length === 1 ? '' : 's'}.
            </p>
          </div>

          {!hasData && (
            <p className="font-sans text-xs font-bold text-gray-500 text-center m-0">
              No bookings in this period yet. You can still download an empty report.
            </p>
          )}

          {reportState === 'current' && (
            <div data-testid="report-status" className="flex items-start gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2.5">
              <svg className="mt-0.5 flex-shrink-0 text-green-700" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
              <p className="font-sans text-xs font-bold text-green-800 m-0 leading-snug">
                Up to date. Version {last.version} was made {madeLabel(last.generatedAt)} and nothing has changed since.
              </p>
            </div>
          )}
          {reportState === 'stale' && (
            <div data-testid="report-status" className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
              <svg className="mt-0.5 flex-shrink-0 text-amber-700" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 11-3-6.7L21 8M21 3v5h-5" /></svg>
              <p className="font-sans text-xs font-bold text-amber-900 m-0 leading-snug">
                Bookings changed since your last report (version {last.version}, {madeLabel(last.generatedAt)}). Update it to get version {nextVersion} with the latest numbers.
              </p>
            </div>
          )}

          {message && (
            <p
              role="status"
              data-testid="report-message"
              className={`font-sans text-xs font-bold text-center m-0 ${message.tone === 'error' ? 'text-red-600' : 'text-green-700'}`}
            >
              {message.text}
            </p>
          )}
        </div>

        <div className="flex-shrink-0 px-5 pt-3 pb-safe border-t border-pink-100/70 bg-white/95 flex flex-col gap-2">
          <button
            type="button"
            data-testid="report-download"
            onClick={() => run('download')}
            disabled={!!busy}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-primary to-pink-deep text-white font-extrabold text-sm border-none cursor-pointer shadow-lg shadow-pink-primary/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-primary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
            </svg>
            {busy === 'download' ? 'Creating PDF…' : primaryLabel}
          </button>
          {shareSupported && (
            <button
              type="button"
              data-testid="report-share"
              onClick={() => run('share')}
              disabled={!!busy}
              className="w-full mb-2 py-3 rounded-2xl bg-white text-pink-deep font-extrabold text-sm border border-pink-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-pink-primary"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7M16 6l-4-4-4 4M12 2v13" />
              </svg>
              {busy === 'share' ? 'Preparing…' : reportState === 'stale' ? 'Share updated PDF' : 'Share PDF'}
            </button>
          )}
          {!shareSupported && <div className="h-2" aria-hidden="true" />}
        </div>
      </div>
    </div>
  );
}
