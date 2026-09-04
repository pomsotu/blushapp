import { sendPushNotification } from '../server/pushService.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { subscription } = req.body || {};
  try {
    const results = await sendPushNotification({
      title: 'Blush Background Push 🌸',
      body: 'Native OS background alert delivered! Even when the app is closed, reminders will pop up right here.',
      url: '/'
    }, subscription);
    return res.status(200).json({ success: true, results });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
