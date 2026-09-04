import { VAPID_PUBLIC_KEY } from '../server/pushService.js';

export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({ publicKey: VAPID_PUBLIC_KEY });
}
