// api/payment-webhook.js (for standalone webhook repo)
import Stripe from 'stripe';
import admin from 'firebase-admin';

// Initialize Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'reward-73a08',
});
const db = admin.firestore();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

// Disable automatic body parsing so we can access raw body
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to read raw body from request
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      resolve(data);
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  // Only handle POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  console.log('📬 [webhook] Received:', { hasSignature: !!sig, hasSecret: !!webhookSecret });

  if (!webhookSecret) {
    console.error('❌ [webhook] Webhook secret not configured');
    return res.status(503).json({ error: 'Webhook not configured' });
  }

  try {
    // Get raw body for Stripe signature verification
    const rawBody = await getRawBody(req);
    console.log('📦 [webhook] Raw body received, length:', rawBody.length);

    const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    console.log('✅ [webhook] Event verified:', event.type);

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const { businessId } = paymentIntent.metadata;

      console.log('💰 [webhook] Payment succeeded:', { businessId, amount: paymentIntent.amount });

      if (businessId) {
        await db.collection('Business').doc(businessId).update({
          last_payment_date: new Date().toISOString(),
          payment_status: 'paid',
          last_month_points_redeemed: 0,
        });
        console.log('✅ [webhook] Business updated');
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('❌ [webhook] Error:', error.message);
    res.status(400).json({ error: error.message });
  }
}