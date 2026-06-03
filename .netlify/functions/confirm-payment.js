/**
 * Confirm PayPal Payment
 * 
 * This function captures a PayPal payment using Hosted Fields token.
 * It completes the payment order created by create-paypal-order.js
 * 
 * REQUIRED: Set these environment variables in Netlify:
 * - PAYPAL_CLIENT_ID: Your PayPal Business Client ID
 * - PAYPAL_CLIENT_SECRET: Your PayPal Business Client Secret
 * - PAYPAL_MODE: 'sandbox' or 'live'
 */

const https = require('https');

const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox';

async function getAccessToken() {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString('base64');

    const options = {
      hostname: PAYPAL_MODE === 'live' ? 'api.paypal.com' : 'api.sandbox.paypal.com',
      path: '/v1/oauth2/token',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en_US',
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data).access_token);
          } catch (e) {
            reject(new Error('Failed to parse PayPal auth response'));
          }
        } else {
          reject(new Error(`PayPal auth failed: ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.write('grant_type=client_credentials');
    req.end();
  });
}

async function capturePayPalOrder(orderId) {
  try {
    const accessToken = await getAccessToken();

    return new Promise((resolve, reject) => {
      const options = {
        hostname: PAYPAL_MODE === 'live' ? 'api.paypal.com' : 'api.sandbox.paypal.com',
        path: `/v2/checkout/orders/${orderId}/capture`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error('Failed to parse PayPal response'));
            }
          } else {
            reject(new Error(`PayPal capture failed: ${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  } catch (error) {
    throw error;
  }
}

exports.handler = async (event) => {
  const allowedOrigin = process.env.SITE_URL || '*';
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'PayPal credentials not configured',
          message: 'Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET environment variables'
        })
      };
    }

    const {
      orderId,
      sourceId,
      amount,
      customerEmail,
      customerName
    } = JSON.parse(event.body);

    if (!orderId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid request',
          message: 'orderId is required'
        })
      };
    }

    // Capture the PayPal order
    const captureResult = await capturePayPalOrder(orderId);

    // Check if payment was successful
    if (captureResult.status === 'COMPLETED') {
      // Store payment record (you may want to save this to a database)
      console.log('Payment captured:', { orderId, paypalOrderId: captureResult.id, amount, timestamp: new Date().toISOString() });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'COMPLETED',
          id: captureResult.id,
          message: 'Payment captured successfully'
        })
      };
    } else if (captureResult.status === 'APPROVED') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'APPROVED',
          id: captureResult.id,
          message: 'Payment approved'
        })
      };
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          status: captureResult.status || 'FAILED',
          error: 'Payment could not be processed',
          message: captureResult.message || 'Unknown error'
        })
      };
    }
  } catch (error) {
    console.error('Payment confirmation error');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Payment processing failed'
      })
    };
  }
};
