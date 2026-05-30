# B&KERY Payment System - Setup Guide

## Overview

This guide will help you set up the complete payment processing system for your bakery website. The payment page integrates with PayPal's Hosted Fields API for secure card processing and includes automated customer confirmation emails.

## What's Included

1. **payment.html** - Premium payment page with order summary and secure payment form
2. **Netlify Serverless Functions** - Backend for PayPal integration and email notifications
3. **Responsive Design** - Mobile-optimized checkout experience
4. **Security** - PCI-compliant payment processing through PayPal

## Setup Steps

### 1. Create a PayPal Business Account

If you don't already have one:
1. Go to https://www.paypal.com/business
2. Sign up for a PayPal Business account
3. Complete the verification process
4. Once verified, access the PayPal Dashboard

### 2. Get PayPal API Credentials

1. Log into your **PayPal Business Account**
2. Go to **Settings** > **API Signature**
3. Under "Signature", copy your:
   - **API Username**
   - **API Password**
   - **Signature**

**For Hosted Fields integration (Recommended):**
1. Go to **Settings** > **Developer Settings**
2. Click **View Signature** or **Create Signature** if you haven't already
3. Copy your **Client ID** (this is your Merchant ID for Hosted Fields)

**For REST API (PayPal Checkout):**
1. Go to **Settings** > **API Access**
2. Under "OAuth Token Signature", click **Show**
3. Copy your **Merchant Account ID**

### 3. Create Sandbox Credentials (for testing)

1. Go to https://developer.paypal.com
2. Log in with your PayPal Business account
3. Go to **Apps & Credentials**
4. Create a new app or use the default app
5. Copy:
   - **Client ID** (sandbox)
   - **Secret** (sandbox)

### 4. Configure Netlify Environment Variables

1. Log into your **Netlify Dashboard**
2. Go to your site settings
3. Navigate to **Build & deploy** > **Environment**
4. Add the following environment variables:

```
PAYPAL_CLIENT_ID=your_sandbox_client_id_here
PAYPAL_CLIENT_SECRET=your_sandbox_secret_here
PAYPAL_MODE=sandbox
SITE_URL=https://yourdomain.com
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key
BAKERY_EMAIL=youremail@example.com
```

### 5. Replace with Your PayPal Credentials

In the payment.html file, update the PayPal SDK script tag:

```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&intent=capture&vault=false&components=hosted-fields,buttons"></script>
```

Replace `YOUR_CLIENT_ID` with your actual PayPal Client ID from your sandbox (or live) account.

### 6. Set Up Email Service (SendGrid)

#### Option A: SendGrid (Recommended)

1. Go to https://sendgrid.com
2. Create a free account (or sign up for paid plan)
3. Go to **Settings** > **API Keys**
4. Create a new API Key with "Mail Send" permissions
5. Copy the API key
6. Add to Netlify environment variables:
   ```
   EMAIL_SERVICE=sendgrid
   SENDGRID_API_KEY=your_key_here
   ```

#### Option B: Mailgun

1. Go to https://www.mailgun.com
2. Create an account
3. Get your API key from the dashboard
4. Add to Netlify environment variables:
   ```
   EMAIL_SERVICE=mailgun
   MAILGUN_API_KEY=your_key_here
   MAILGUN_DOMAIN=your_domain_here
   ```

#### Option C: Manual Email Setup

If you don't have an email service set up yet, the system will log email notifications to console. You can integrate any email service later.

## Testing the Payment System

### Test with Sandbox Mode

1. Keep `PAYPAL_MODE=sandbox` in your environment variables
2. Use these test card numbers:

**Visa:**
- Card Number: `4532015112830366`
- Expiry: Any future date (e.g., 12/25)
- CVV: Any 3 digits (e.g., 123)

**Mastercard:**
- Card Number: `5425233010103442`
- Expiry: Any future date
- CVV: Any 3 digits

### Test Flow

1. Open your website
2. Click "Place Order"
3. Fill in order details
4. Click "Place Order" button
5. You should be redirected to payment.html
6. Fill in billing information
7. Enter test card details
8. Click "Complete Payment"
9. You should see the success confirmation

### Verify PayPal Transaction

1. Log into your PayPal Sandbox account
2. Go to **Activity** > **Transactions**
3. You should see your test transaction

## Going Live

Once you've tested thoroughly:

### 1. Update PayPal Mode

1. In Netlify environment variables, change:
   ```
   PAYPAL_MODE=live
   PAYPAL_CLIENT_ID=your_live_client_id
   PAYPAL_CLIENT_SECRET=your_live_secret
   ```

2. Update the payment.html PayPal SDK script with your live Client ID

### 2. Verify Your PayPal Account

1. Complete all PayPal account verification
2. Set up your bank account for fund transfers
3. Review PayPal's transaction fees

### 3. Update Site URL

Set the correct URL in environment variables:
```
SITE_URL=https://yourdomain.com
```

### 4. Test Live Payments

Use real credit cards (use your own test card if possible) or have a trusted person test.

## Security Best Practices

✅ **What the System Does Right:**
- Uses PayPal Hosted Fields (never exposes raw card data)
- All sensitive data handled server-side
- HTTPS required for payments
- Environment variables keep secrets safe
- Follows PCI compliance standards

⚠️ **What You Should Do:**
1. Never commit API keys to GitHub
2. Use environment variables for all secrets
3. Regularly rotate API keys
4. Monitor PayPal account for unauthorized activity
5. Keep backups of order confirmations
6. Test in sandbox mode before going live

## Troubleshooting

### "PayPal credentials not configured"
- Check Netlify environment variables
- Ensure PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are set
- Verify credentials are for the correct environment (sandbox/live)

### Payment not processing
- Check browser console for JavaScript errors
- Verify PayPal SDK script loaded correctly
- Ensure test card numbers are correct (for sandbox)
- Check Netlify function logs for backend errors

### Emails not sending
- Verify EMAIL_SERVICE is set to "sendgrid" or "mailgun"
- Check API key is valid and has proper permissions
- Verify BAKERY_EMAIL is set correctly
- Check email service provider logs

### Order not showing in PayPal
- Verify PAYPAL_MODE matches your credentials
- Check that payment went through (check success page)
- Give it a few moments to appear in PayPal dashboard
- Check PayPal Activity > Transactions

## Support

For PayPal issues: https://www.paypal.com/business/support
For SendGrid issues: https://support.sendgrid.com
For Netlify issues: https://support.netlify.com

## File Structure

```
bandkbakery/
├── payment.html                    # Payment page
├── styles.css                      # Includes payment page styles
├── index.html                      # Modified with order redirect
└── .netlify/
    └── functions/
        ├── create-paypal-order.js
        ├── confirm-payment.js
        └── send-confirmation-email.js
```

## Next Steps

1. Set up PayPal Business account
2. Get your API credentials
3. Set Netlify environment variables
4. Update payment.html with your Client ID
5. Test in sandbox mode
6. Deploy and go live!

---

**Questions or issues?** Contact PayPal Business Support or Netlify Support for help with their respective services.
