import { removeSubscription } from '../../server/pushService.js';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { endpoint } = req.body || {};
  removeSubscription(endpoint);
  return res.status(200).json({ success: true });
}
