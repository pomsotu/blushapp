import { syncReminders } from '../server/pushService.js';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { subscription, appointments, settings } = req.body || {};
  syncReminders(subscription, appointments, settings);
  return res.status(200).json({ success: true });
}
