import React, { useMemo } from 'react';
import { TIMEZONE } from '../utils/dateUtils';
import { absStart, getDurationMins, minutesToTime, formatTimeRange } from '../utils/schedule';
import { scopeSummary } from '../utils/services';

const HOUR_PX = 64;
const GUTTER = 52;

const hourLabel = (h) => {
  const hr = h % 12 || 12;
  return `${hr} ${h < 12 || h === 24 ? 'AM' : 'PM'}`;
};

const torontoNowMinutes = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date());
  const get = (t) => Number(parts.find((p) => p.type === t)?.value || 0);
  return get('hour') * 60 + get('minute');
};

// Assign side-by-side columns to bookings that overlap each other
const layoutColumns = (blocks) => {
  const placed = [];
  let cluster = [];
  let clusterEnd = -1;

  const flush = () => {
    const cols = Math.max(1, ...cluster.map((b) => b.col + 1));
    cluster.forEach((b) => placed.push({ ...b, cols }));
    cluster = [];
  };

  blocks.forEach((b) => {
    if (cluster.length && b.top >= clusterEnd) flush();
    const used = new Set(cluster.filter((c) => c.bottom > b.top).map((c) => c.col));
    let col = 0;
    while (used.has(col)) col += 1;
    cluster.push({ ...b, col });
    clusterEnd = Math.max(clusterEnd, b.bottom);
  });
  if (cluster.length) flush();
  return placed;
};

// Hour-by-hour view of one day. Each booking is drawn from its start to its
// end time; tapping an open half-hour starts a new booking there.
export default function DayTimeline({ date, isToday, appointments, onOpen, onAddAt }) {
  const blocks = useMemo(() => {
    const dayStart = absStart(date, '00:00');
    return appointments
      .filter((a) => a.status !== 'cancelled' && a.date && a.time)
      .map((a) => {
        const s = absStart(a.date, a.time) - dayStart;
        return { appt: a, top: s, bottom: s + getDurationMins(a) };
      })
      .filter((b) => b.bottom > 0 && b.top < 1440)
      .map((b) => ({ ...b, top: Math.max(0, b.top), bottom: Math.min(1440, b.bottom) }))
      .sort((x, y) => x.top - y.top || y.bottom - x.bottom);
  }, [appointments, date]);

  const firstHour = Math.min(8, ...blocks.map((b) => Math.floor(b.top / 60)));
  const lastHour = Math.max(21, ...blocks.map((b) => Math.ceil(b.bottom / 60)));
  const hours = Array.from({ length: lastHour - firstHour }, (_, i) => firstHour + i);
  const height = hours.length * HOUR_PX;
  const yOf = (mins) => ((mins - firstHour * 60) / 60) * HOUR_PX;

  const placed = layoutColumns(blocks);
  const nowMins = isToday ? torontoNowMinutes() : null;
  const isBusy = (mins) => blocks.some((b) => b.appt.status === 'upcoming' && mins < b.bottom && mins + 30 > b.top);

  return (
    <div
      className="relative bg-white rounded-3xl border border-pink-100/60 shadow-[0_8px_30px_rgba(244,114,182,0.05)] overflow-hidden"
      data-testid="day-timeline"
    >
      <div className="relative my-3" style={{ height }}>
        {/* Hour rows with half-hour tap targets */}
        {hours.map((h) => (
          <div key={h} className="absolute left-0 right-0 border-t border-pink-100/70" style={{ top: yOf(h * 60), height: HOUR_PX }}>
            <span className="absolute left-2.5 -top-[7px] bg-white px-1 font-sans text-[10px] font-extrabold text-gray-400 tabular-nums">
              {hourLabel(h)}
            </span>
            <div className="absolute left-[52px] right-2 top-1/2 border-t border-dashed border-pink-50" aria-hidden="true" />
            {[0, 30].map((m) => {
              const mins = h * 60 + m;
              if (isBusy(mins)) return null;
              const t = minutesToTime(mins);
              return (
                <button
                  key={m}
                  type="button"
                  data-testid="timeline-slot"
                  data-time={t}
                  onClick={() => onAddAt(t)}
                  aria-label={`Book at ${hourLabel(h).replace(' ', m ? ':30 ' : ':00 ')}`}
                  className="group absolute right-2 bg-transparent border-none cursor-pointer rounded-lg hover:bg-pink-soft/40 focus-visible:bg-pink-soft/50 focus-visible:outline-2 focus-visible:outline-pink-primary"
                  style={{ left: GUTTER, top: m ? HOUR_PX / 2 : 0, height: HOUR_PX / 2 }}
                >
                  <span className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity font-sans text-[11px] font-black text-pink-deep">
                    + Book {hourLabel(h).replace(' ', m ? ':30 ' : ':00 ')}
                  </span>
                </button>
              );
            })}
          </div>
        ))}

        {/* Bookings */}
        {placed.map(({ appt, top, bottom, col, cols }) => {
          const isPersonal = appt.type === 'personal';
          const done = appt.status === 'completed';
          const h = Math.max(28, yOf(bottom) - yOf(top) - 3);
          const widthCalc = `(100% - ${GUTTER + 8}px) / ${cols}`;
          return (
            <button
              key={appt.id}
              type="button"
              data-testid="timeline-block"
              onClick={() => onOpen(appt)}
              aria-label={`${isPersonal ? appt.title : appt.clientName}, ${formatTimeRange(appt.time, getDurationMins(appt))}${done ? ', completed' : ''}`}
              className={`absolute flex flex-col justify-start items-stretch rounded-xl px-2.5 py-1.5 text-left overflow-hidden cursor-pointer border transition-all hover:brightness-[0.98] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-pink-primary ${
                isPersonal
                  ? 'bg-violet-100 border-violet-200 text-violet-900'
                  : 'bg-pink-100 border-pink-200 text-pink-900'
              } ${done ? 'opacity-55' : 'shadow-[0_2px_8px_rgba(219,39,119,0.08)]'}`}
              style={{
                top: yOf(top) + 1.5,
                height: h,
                left: `calc(${GUTTER}px + ${widthCalc} * ${col})`,
                width: `calc(${widthCalc} - 4px)`
              }}
            >
              <div className="font-sans text-[12.5px] font-black leading-tight truncate">
                {done && '✓ '}{isPersonal ? appt.title : appt.clientName}
              </div>
              {h >= 40 && (
                <div className="font-sans text-[11px] font-bold opacity-80 tabular-nums truncate">
                  {formatTimeRange(appt.time, getDurationMins(appt))}
                </div>
              )}
              {h >= 64 && !isPersonal && (
                <div className="font-sans text-[11px] font-semibold opacity-70 truncate">{scopeSummary(appt)}</div>
              )}
            </button>
          );
        })}

        {/* Current time */}
        {nowMins !== null && nowMins >= firstHour * 60 && nowMins <= lastHour * 60 && (
          <div className="absolute left-[46px] right-0 pointer-events-none z-10" style={{ top: yOf(nowMins) }} aria-hidden="true">
            <div className="relative border-t-2 border-pink-deep">
              <span className="absolute -left-1 -top-[5px] w-2 h-2 rounded-full bg-pink-deep" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
