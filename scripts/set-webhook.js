const https = require('https');
require('dotenv').config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL; // Your Vercel deployment URL + /api/webhook

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is required');
  process.exit(1);
}

if (!WEBHOOK_URL) {
  console.error('❌ WEBHOOK_URL is required (e.g., https://your-app.vercel.app/api/webhook)');
  process.exit(1);
}

const setWebhook = () => {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`;
  const data = JSON.stringify({
    url: WEBHOOK_URL
  });

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

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
};

setWebhook();
