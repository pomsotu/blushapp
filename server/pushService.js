import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BL8_GEDhIEDNJxXOyfj33TceOZEPV4RvuAYfw4iXkKGPODSStVl69UhfLBZB__C1JtLwZcQAbcdDQxncjlQNFbM';
export const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'ZXZhO7gV2mH4VNiv7_SRKagaYP7Iw3dwxJffThZ_IQU';
export const VAPID_EMAIL = 'mailto:support@blushapp.ca';

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'push_state.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let pushState = {
  subscriptions: [],
  reminders: []
};

function loadState() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      pushState = JSON.parse(raw);
    }
  } catch (e) {
    console.error('[PushService] Error loading push state:', e);
  }
}

function saveState() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(pushState, null, 2), 'utf8');
  } catch (e) {
    console.error('[PushService] Error saving push state:', e);
  }
}

loadState();

export function saveSubscription(subscription) {
  if (!subscription || !subscription.endpoint) return;
  const existingIdx = pushState.subscriptions.findIndex(s => s.endpoint === subscription.endpoint);
  if (existingIdx >= 0) {
    pushState.subscriptions[existingIdx] = subscription;
  } else {
    pushState.subscriptions.push(subscription);
  }
  saveState();
}

// Remove subscription on unsubscribe or 404/410
export function removeSubscription(endpoint) {
  if (!endpoint) return;
  pushState.subscriptions = pushState.subscriptions.filter(s => s.endpoint !== endpoint);
  saveState();
  console.log('[PushService] Removed subscription:', endpoint);
}

export function syncReminders(subscription, appointments, settings) {
  if (subscription) {
    saveSubscription(subscription);
  }

  const now = Date.now();
  const upcomingReminders = [];

  if (Array.isArray(appointments)) {
    appointments.forEach((appt) => {
      if (appt.status !== 'upcoming') return;

      const [year, month, day] = appt.date.split('-').map(Number);
      const [hour, minute] = appt.time.split(':').map(Number);
      
      const pad = (n) => String(n).padStart(2, '0');
      const testDate = new Date(Date.UTC(year, month - 1, day, 12, 0));
      const tzParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Toronto',
        timeZoneName: 'shortOffset'
      }).formatToParts(testDate);
      const offsetPart = tzParts.find((p) => p.type === 'timeZoneName')?.value || 'GMT-4';
      const offsetMatch = offsetPart.match(/GMT([+-]\d+)/);
      const offsetHours = offsetMatch ? Number(offsetMatch[1]) : -4;
      const offsetStr = (offsetHours <= 0 ? '-' : '+') + pad(Math.abs(offsetHours)) + ':00';
      const startTime = new Date(`${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00${offsetStr}`).getTime();

      const durationMins = appt.type === 'business' ? (appt.durationMins || 60) : 60;
      const endTime = startTime + durationMins * 60 * 1000;

      if (settings?.remind30m) {
        const time30m = startTime - 30 * 60 * 1000;
        if (time30m > now - 5 * 60 * 1000) {
          upcomingReminders.push({
            id: `30m_${appt.id}_${appt.date}_${appt.time}`,
            apptId: appt.id,
            timestamp: time30m,
            title: appt.type === 'business' ? 'Upcoming Booking in 30 Mins 💅' : 'Upcoming Schedule in 30 Mins 🌸',
            body: appt.type === 'business'
              ? `Tari, your appointment with ${appt.clientName || 'your client'} starts in 30 mins!`
              : `Tari, "${appt.title || 'your event'}" starts in 30 mins!`,
            sent: false
          });
        }
      }

      if (settings?.remind2hAfter) {
        const time2hAfter = endTime + 2 * 60 * 60 * 1000;
        if (time2hAfter > now - 15 * 60 * 1000) {
          upcomingReminders.push({
            id: `2hAfter_${appt.id}_${appt.date}_${appt.time}`,
            apptId: appt.id,
            timestamp: time2hAfter,
            title: 'Appointment Follow-up ✨',
            body: appt.type === 'business'
              ? `Did your appointment with ${appt.clientName || 'your client'} finish? Tap to mark completed or cancelled.`
              : `Did your event "${appt.title || 'your event'}" finish? Tap to mark completed or cancelled.`,
            sent: false
          });
        }
      }
    });
  }

  const mergedReminders = upcomingReminders.map(newRem => {
    const existing = pushState.reminders.find(r => r.id === newRem.id);
    if (existing && existing.sent) {
      return { ...newRem, sent: true };
    }
    return newRem;
  });

  pushState.reminders = mergedReminders;
  saveState();
  console.log(`[PushService] Synced ${mergedReminders.length} background reminders.`);
}

export async function sendPushNotification(payload, targetSubscription = null) {
  const payloadString = JSON.stringify(payload);
  const targets = targetSubscription ? [targetSubscription] : pushState.subscriptions;

  const results = await Promise.allSettled(
    targets.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, payloadString);
        return { success: true, endpoint: sub.endpoint };
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          pushState.subscriptions = pushState.subscriptions.filter(s => s.endpoint !== sub.endpoint);
          saveState();
        }
        throw err;
      }
    })
  );

  return results;
}

export async function checkDueReminders() {
  const now = Date.now();
  const due = pushState.reminders.filter(r => !r.sent && r.timestamp <= now);

  if (due.length === 0) return;

  for (const rem of due) {
    console.log(`[PushService] Dispatching due background alert: "${rem.title}" (ID: ${rem.id})`);
    try {
      await sendPushNotification({
        title: rem.title,
        body: rem.body,
        tag: rem.id,
        url: '/'
      });
      rem.sent = true;
    } catch (err) {
      console.error(`[PushService] Failed to send push for ${rem.id}:`, err);
    }
  }

  saveState();
}

export function startPushScheduler() {
  if (!global.__blush_push_interval) {
    global.__blush_push_interval = setInterval(checkDueReminders, 10000);
    if (global.__blush_push_interval && global.__blush_push_interval.unref) {
      global.__blush_push_interval.unref();
    }
  }
}
