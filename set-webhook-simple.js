// Simple webhook setter - replace the values below with your actual ones
const BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE';
const WEBHOOK_URL = 'https://YOUR_VERCEL_APP.vercel.app/api/webhook';

const https = require('https');

const url = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`;
const data = JSON.stringify({ url: WEBHOOK_URL });

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log(`Setting webhook to: ${WEBHOOK_URL}`);

const req = https.request(url, options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    const response = JSON.parse(responseData);
    if (response.ok) {
      console.log('✅ Webhook set successfully!');
      console.log(`📡 Webhook URL: ${WEBHOOK_URL}`);
    } else {
      console.error('❌ Failed to set webhook:', response.description);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error setting webhook:', error);
});

req.write(data);
req.end();
