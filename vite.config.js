import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { 
  VAPID_PUBLIC_KEY, 
  saveSubscription, 
  removeSubscription,
  syncReminders, 
  sendPushNotification,
  startPushScheduler
} from './server/pushService.js'

function pushServicePlugin() {
  return {
    name: 'blush-push-service',
    configureServer(server) {
      startPushScheduler();
      server.middlewares.use(async (req, res, next) => {
        const url = req.url.split('?')[0];

        // 1. Get VAPID Public Key
        if (url === '/api/vapid-public-key' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ publicKey: VAPID_PUBLIC_KEY }));
        }

        // 2. Handle POST endpoints
        if (url.startsWith('/api/') && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            try {
              const data = body ? JSON.parse(body) : {};

              if (url === '/api/push/subscribe' || url === '/api/subscribe') {
                saveSubscription(data.subscription);
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: true }));
              }

              if (url === '/api/push/unsubscribe' || url === '/api/unsubscribe') {
                removeSubscription(data.endpoint);
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: true }));
              }

              if (url === '/api/sync-reminders') {
                syncReminders(data.subscription, data.appointments, data.settings);
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: true }));
              }

              if (url === '/api/test-push') {
                const results = await sendPushNotification({
                  title: 'Blush Background Push 🌸',
                  body: 'Native OS background alert delivered! Even when the app is closed, reminders will pop up right here.',
                  url: '/'
                }, data.subscription);
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: true, results }));
              }

              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Endpoint not found' }));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    pushServicePlugin(),
  ],
})
