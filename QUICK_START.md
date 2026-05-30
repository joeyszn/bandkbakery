# Quick Start: Payment System Setup (5 Minutes)

## 1️⃣ Create PayPal Business Account
Go to https://www.paypal.com/business → Sign up → Verify identity

## 2️⃣ Get Your API Credentials
Log into PayPal → Settings → Developer/API Settings → Copy Client ID & Secret

**For Testing (Sandbox):**
1. Go to https://developer.paypal.com
2. Log in with your PayPal account
3. Apps & Credentials → Copy sandbox Client ID

## 3️⃣ Set Netlify Environment Variables
1. Log into Netlify Dashboard
2. Site settings → Build & deploy → Environment
3. Add these variables:

```
PAYPAL_CLIENT_ID=your_sandbox_id_here
PAYPAL_CLIENT_SECRET=your_sandbox_secret_here
PAYPAL_MODE=sandbox
SITE_URL=https://yourdomain.com
BAKERY_EMAIL=youremail@example.com
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=leave_empty_for_now
```

## 4️⃣ Update Payment Page
In `payment.html`, find this line (around line 410):

```html
<script src="https://www.paypal.com/sdk/js?client-id=AXzNaJhNlZDNxHDH0yg9h5V2VGj1DJquVVzZHzVEd5Kn1qMZWUWaFrJ0gYMOkYsP5hpTNLQqpY0gJE_Y&...
```

Replace the `client-id` value with your sandbox Client ID:

```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_SANDBOX_CLIENT_ID&...
```

## 5️⃣ Test the Payment Flow
1. Go to your website
2. Click "Place Order"
3. Fill in order details
4. Click "Place Order"
5. You should see the payment page
6. Use this test card:
   - Number: `4532015112830366`
   - Expiry: Any future date (e.g., 12/25)
   - CVV: Any 3 digits (e.g., 123)
7. Complete the payment
8. Should see success confirmation

## ✅ You're Done!

Your payment system is now working in sandbox mode. 

### To Go Live Later:
1. Switch to live PayPal credentials
2. Change `PAYPAL_MODE=live` in Netlify
3. Update Client ID in payment.html
4. Set up SendGrid emails (optional but recommended)
5. Test with real card
6. Deploy!

---

**Need Help?** See PAYMENT_SETUP.md for detailed instructions.
