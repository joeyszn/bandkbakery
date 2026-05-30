/**
 * Create PayPal Order
 * 
 * This function creates a PayPal order for the payment amount.
 * It uses the PayPal REST API with OAuth2 authentication.
 * 
 * REQUIRED: Set these environment variables in Netlify:
 * - PAYPAL_CLIENT_ID: Your PayPal Business Client ID
 * - PAYPAL_CLIENT_SECRET: Your PayPal Business Client Secret
 * - PAYPAL_MODE: 'sandbox' or 'live'
 */

const https = require('https');

// PayPal API configuration
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox';
const PAYPAL_API_BASE = PAYPAL_MODE === 'live' 
  ? 'https://api.paypal.com'
  : 'https://api.sandbox.paypal.com';

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

async function createPayPalOrder(amount, description = 'Bakery Order') {
  try {
    const accessToken = await getAccessToken();

    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: amount.toString()
          },
          description: description
        }
      ],
      application_context: {
        brand_name: 'The B&KERY',
        landing_page: 'BILLING',
        user_action: 'PAY_NOW',
        return_url: `${process.env.SITE_URL || 'https://bandkbakery.com'}/payment.html?success=true`,
        cancel_url: `${process.env.SITE_URL || 'https://bandkbakery.com'}/payment.html?cancel=true`
      }
    };

    return new Promise((resolve, reject) => {
      const options = {
        hostname: PAYPAL_MODE === 'live' ? 'api.paypal.com' : 'api.sandbox.paypal.com',
        path: '/v2/checkout/orders',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'PayPal-Request-Id': `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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
            reject(new Error(`PayPal order creation failed: ${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);
      req.write(JSON.stringify(orderData));
      req.end();
    });
  } catch (error) {
    throw error;
  }
}

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Validate environment variables
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

    // Parse request body
    const { amount } = JSON.parse(event.body);

    if (!amount || isNaN(amount) || amount <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid amount',
          message: 'Amount must be a positive number'
        })
      };
    }

    // Create PayPal order
    const order = await createPayPalOrder(amount, 'B&KERY Bakery Order');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        id: order.id,
        status: order.status
      })
    };
  } catch (error) {
    console.error('PayPal order creation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create payment order',
        message: error.message
      })
    };
  }
};
