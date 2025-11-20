const https = require('https');
const { URL } = require('url');

const REMOTE_EXAM_BUTTON_ENDPOINT = 'https://supras.com/api/exam-button-config';

exports.handler = async function handler(event, context) {
  return new Promise((resolve) => {
    try {
      const targetUrl = new URL(REMOTE_EXAM_BUTTON_ENDPOINT);
      const options = {
        hostname: targetUrl.hostname,
        path: `${targetUrl.pathname}${targetUrl.search}`,
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              statusCode: 200,
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store',
              },
              body: data,
            });
          } else {
            console.error('Failed to fetch SUPRAS config in Netlify function:', res.statusCode);
            resolve({
              statusCode: 502,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ error: 'Failed to fetch SUPRAS config', status: res.statusCode }),
            });
          }
        });
      });

      req.on('error', (err) => {
        console.error('Error in Netlify exam-button-config function:', err);
        resolve({
          statusCode: 502,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Failed to reach SUPRAS', details: err.message }),
        });
      });

      req.end();
    } catch (error) {
      console.error('Unexpected Netlify function error:', error);
      resolve({
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Proxy error', details: error.message }),
      });
    }
  });
};
