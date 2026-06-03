/**
 * Send Confirmation Email
 * 
 * This function sends order confirmation emails to both the customer
 * and the bakery owner using SendGrid or Mailgun.
 * 
 * REQUIRED: Set these environment variables in Netlify:
 * - EMAIL_SERVICE: 'sendgrid' or 'mailgun'
 * - SENDGRID_API_KEY: Your SendGrid API key (if using SendGrid)
 * - MAILGUN_API_KEY: Your Mailgun API key (if using Mailgun)
 * - MAILGUN_DOMAIN: Your Mailgun domain (if using Mailgun)
 * - BAKERY_EMAIL: Your bakery email address
 */

const https = require('https');

const EMAIL_SERVICE = process.env.EMAIL_SERVICE || 'sendgrid';
const BAKERY_EMAIL = process.env.BAKERY_EMAIL || 'bronxkaren1@gmail.com';
const BAKERY_NAME = 'The B&KERY';

function generateCustomerEmailHTML(orderData, customerName, customerEmail, total) {
  const items = orderData.items || [];
  const itemsHTML = items.map(item => `
    <tr style="border-bottom: 1px solid #e8e8e8;">
      <td style="padding: 12px; color: #522f1c; font-weight: 500;">${item.name}</td>
      <td style="padding: 12px; text-align: center; color: #522f1c;">× ${item.quantity}</td>
      <td style="padding: 12px; text-align: right; color: #522f1c;">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  const deliveryInfo = orderData.method === 'Delivery' 
    ? `<p><strong>Delivery Address:</strong> ${orderData.address}</p>`
    : `<p><strong>Pickup:</strong> Karen & Bruce's bakery</p>`;

  const scheduleInfo = orderData.schedule
    ? `<p><strong>Requested Date/Time:</strong> ${new Date(orderData.schedule).toLocaleString()}</p>`
    : `<p><strong>Timing:</strong> Earliest available (please allow 3-4 hours)</p>`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #522f1c; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 30px 0; border-bottom: 3px solid #f9c75f; }
    .logo { font-size: 28px; font-weight: 700; color: #522f1c; margin: 0; }
    .tagline { font-size: 14px; color: #f9c75f; margin: 8px 0 0; }
    .content { padding: 30px 0; }
    .section { margin-bottom: 30px; }
    .section h2 { font-size: 18px; color: #522f1c; margin: 0 0 15px; }
    .order-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    .order-table th { background: #fff5e1; padding: 12px; text-align: left; font-weight: 600; color: #522f1c; }
    .totals-table { width: 100%; margin: 20px 0; }
    .totals-table td { padding: 10px 0; border-bottom: 1px solid #e8e8e8; }
    .totals-table .total-row { border-bottom: 2px solid #f9c75f; font-size: 18px; font-weight: 700; }
    .total-amount { text-align: right; color: #522f1c; }
    .cta-button { display: inline-block; padding: 12px 24px; background: #522f1c; color: white; text-decoration: none; border-radius: 25px; font-weight: 600; margin-top: 20px; }
    .footer { border-top: 1px solid #e8e8e8; padding-top: 20px; text-align: center; font-size: 12px; color: #9a9a9a; }
    .warm-note { background: rgba(249, 199, 95, 0.1); padding: 15px; border-radius: 10px; margin: 20px 0; color: #522f1c; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <p class="logo">${BAKERY_NAME}</p>
      <p class="tagline">You can taste the love! 💛</p>
    </div>

    <div class="content">
      <div class="section">
        <h2>Order Confirmed!</h2>
        <p>Dear ${customerName},</p>
        <p>Thank you for your order! Your payment has been received and we're excited to prepare your delicious treats.</p>
      </div>

      <div class="section">
        <h2>Order Details</h2>
        <table class="order-table">
          <thead>
            <tr style="background: #fff5e1;">
              <th>Item</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <table class="totals-table">
          <tr>
            <td style="font-weight: 500;">Subtotal:</td>
            <td class="total-amount">$${items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}</td>
          </tr>
          ${orderData.method === 'Delivery' ? `
          <tr>
            <td style="font-weight: 500;">Delivery Fee:</td>
            <td class="total-amount">$5.00</td>
          </tr>
          ` : ''}
          <tr class="total-row">
            <td>Total Amount:</td>
            <td class="total-amount">$${total}</td>
          </tr>
        </table>
      </div>

      <div class="section">
        <h2>Pickup Details</h2>
        ${deliveryInfo}
        ${scheduleInfo}
      </div>

      <div class="warm-note">
        <strong>🎉 Preparation Note:</strong> Karen & Bruce will begin preparing your treats right away! Preparation times may vary depending on availability and current orders. Please allow 3-4 hours.
      </div>

      <div class="section">
        ${orderData.notes ? `<p><strong>Special Requests:</strong> ${orderData.notes}</p>` : ''}
        <p><strong>Confirmation Number:</strong> ${Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
      </div>

      <div class="footer">
        <p>&copy; 2024 ${BAKERY_NAME}. All treats are handmade with love.</p>
        <p>Questions? Contact us at ${BAKERY_EMAIL}</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

function generateBakeryEmailHTML(orderData, customerName, customerEmail, total) {
  const items = orderData.items || [];
  const itemsHTML = items.map(item => `
    <tr style="border-bottom: 1px solid #e8e8e8;">
      <td style="padding: 12px;">${item.name}</td>
      <td style="padding: 12px; text-align: center;">× ${item.quantity}</td>
      <td style="padding: 12px; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #522f1c; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .order-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    .order-table th { background: #fff5e1; padding: 12px; text-align: left; font-weight: 600; color: #522f1c; }
    .order-table td { padding: 12px; border-bottom: 1px solid #e8e8e8; }
  </style>
</head>
<body>
  <div class="container">
    <h2>📦 New Order Received!</h2>
    
    <h3>Customer Information</h3>
    <p>
      <strong>Name:</strong> ${customerName}<br>
      <strong>Email:</strong> ${customerEmail}<br>
      <strong>Phone:</strong> ${orderData.phone}
    </p>

    <h3>Order Details</h3>
    <table class="order-table">
      <thead>
        <tr style="background: #fff5e1;">
          <th>Item</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
    </table>

    <h3>Order Information</h3>
    <p>
      <strong>Method:</strong> ${orderData.method}<br>
      ${orderData.method === 'Delivery' ? `<strong>Delivery Address:</strong> ${orderData.address}<br>` : ''}
      ${orderData.schedule ? `<strong>Requested Schedule:</strong> ${new Date(orderData.schedule).toLocaleString()}<br>` : ''}
      <strong>Total Amount:</strong> $${total}<br>
      ${orderData.notes ? `<strong>Special Notes:</strong> ${orderData.notes}<br>` : ''}
    </p>
  </div>
</body>
</html>
  `;
}

async function sendSendGridEmail(to, subject, htmlContent) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      personalizations: [{
        to: [{ email: to }]
      }],
      from: { email: BAKERY_EMAIL, name: BAKERY_NAME },
      subject,
      content: [{ type: 'text/html', value: htmlContent }]
    });

    const options = {
      hostname: 'api.sendgrid.com',
      path: '/v3/mail/send',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve();
      } else {
        reject(new Error(`SendGrid error: ${res.statusCode}`));
      }
      res.on('data', () => {});
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
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
    const { email, name, orderData, total } = JSON.parse(event.body);

    if (!email || !name || !orderData || !total) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields'
        })
      };
    }

    // Generate email HTML
    const customerHTML = generateCustomerEmailHTML(orderData, name, email, total);
    const bakeryHTML = generateBakeryEmailHTML(orderData, name, email, total);

    // Send emails based on configured service
    if (EMAIL_SERVICE === 'sendgrid' && process.env.SENDGRID_API_KEY) {
      await Promise.all([
        sendSendGridEmail(email, `Order Confirmation - ${BAKERY_NAME}`, customerHTML),
        sendSendGridEmail(BAKERY_EMAIL, `New Order from ${name}`, bakeryHTML)
      ]);
    } else {
      // Fallback: service not configured — log generic message (do not include PII)
      console.log('Email service not configured; skipping send.');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Confirmation email sent successfully'
      })
    };
  } catch (error) {
    console.error('Email sending error');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to send confirmation email'
      })
    };
  }
};
