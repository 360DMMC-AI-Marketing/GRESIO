const Stripe = require('stripe');
const env = require('../config/env');

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

function isConfigured() {
  return !!stripe;
}

async function createCheckoutSession({ priceId, userId, successUrl, cancelUrl, metadata = {} }) {
  if (!stripe) throw new Error('Stripe not configured. Set STRIPE_SECRET_KEY in .env');
  return stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: userId,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
  });
}

async function createPaymentLink({ amount, currency = 'usd', description, userId, metadata = {} }) {
  if (!stripe) throw new Error('Stripe not configured');
  return stripe.paymentLinks.create({
    line_items: [{ price_data: { currency, product_data: { name: description }, unit_amount: Math.round(amount * 100) }, quantity: 1 }],
    after_completion: { type: 'redirect', redirect: { url: process.env.FRONTEND_URL || 'http://localhost:3000' } },
    metadata: { ...metadata, userId },
  });
}

async function handleWebhook(event) {
  if (!stripe) return null;
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      return { event: 'payment_success', userId: session.client_reference_id, sessionId: session.id, metadata: session.metadata };
    }
    case 'invoice.paid': {
      const invoice = event.data.object;
      return { event: 'invoice_paid', subscriptionId: invoice.subscription, userId: invoice.metadata?.userId };
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      return { event: 'subscription_cancelled', subscriptionId: subscription.id, userId: subscription.metadata?.userId };
    }
    default:
      return { event: event.type, unhandled: true };
  }
}

module.exports = { isConfigured, createCheckoutSession, createPaymentLink, handleWebhook };
