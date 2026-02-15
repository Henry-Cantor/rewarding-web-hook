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

export default async function handler(req, res) {
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
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
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