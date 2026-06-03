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

async function createPayPalOrder(payload) {
  try {
    const accessToken = await getAccessToken();
    const items = (payload.items || []).map(item => ({
      name: item.name || 'Bakery Item',
      unit_amount: {
        currency_code: 'USD',
        value: (parseFloat(item.price) || 0).toFixed(2)
      },
      quantity: String(item.quantity || 1),
      description: item.description || item.name || 'Bakery treat',
      sku: item.id || item.name || ''
    }));

    const subtotalValue = (payload.subtotal || items.reduce((sum,item)=>sum + (parseFloat(item.unit_amount.value)||0)*parseInt(item.quantity),0));
    const deliveryFee = payload.deliveryFee || 0;
    const totalValue = (payload.total || subtotalValue + deliveryFee).toFixed(2);

    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: payload.orderId || `BK-${Date.now()}`,
          invoice_id: payload.orderId || `BK-${Date.now()}`,
          description: 'B&KERY Bakery Order',
          amount: {
            currency_code: 'USD',
            value: totalValue,
            breakdown: {
              item_total: {
                currency_code: 'USD',
                value: subtotalValue.toFixed(2)
              },
              shipping: {
                currency_code: 'USD',
                value: deliveryFee.toFixed(2)
              }
            }
          },
          items
        }
      ],
      application_context: {
        brand_name: 'The B&KERY',
        landing_page: 'BILLING',
        user_action: 'PAY_NOW',
        return_url: `${process.env.SITE_URL || 'https://bandkbakery.com'}/success.html`,
        cancel_url: `${process.env.SITE_URL || 'https://bandkbakery.com'}/cancel.html`
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
            reject(new Error(`PayPal order creation failed: ${res.statusCode} ${data}`));
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
  const allowedOrigin = process.env.SITE_URL || '*';
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin,
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

    const payload = JSON.parse(event.body);
    const { items, total } = payload;

    if (!Array.isArray(items) || items.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid items',
          message: 'Cart items must be provided and cannot be empty'
        })
      };
    }

    if (!total || isNaN(total) || total <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid total',
          message: 'Total must be a positive number'
        })
      };
    }

    // Create PayPal order
    const order = await createPayPalOrder(payload);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        id: order.id,
        status: order.status
      })
    };
  } catch (error) {
    console.error('PayPal order creation error');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create payment order'
      })
    };
  }
};
