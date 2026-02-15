# Rewarding Payment Webhook

Minimal Stripe payment webhook for the Rewarding app, deployed on Vercel.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env.local`:
   - `STRIPE_SECRET_KEY` - Your Stripe secret key
   - `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook signing secret
   - `FIREBASE_SERVICE_ACCOUNT` - Firebase service account JSON

3. Test locally:
   ```bash
   npm run dev
   ```

4. Deploy to Vercel:
   ```bash
   npm run deploy
   ```

## Webhook URL

After deployment, your webhook URL will be:
```
https://your-vercel-project.vercel.app/api/payment-webhook
```

Add this URL to your Stripe Dashboard under Webhooks, listening for:
- `payment_intent.succeeded`

## How it Works

- Receives Stripe webhook events
- Verifies the signature using the webhook secret
- Updates Firebase when payment succeeds
- Returns appropriate HTTP status codes
