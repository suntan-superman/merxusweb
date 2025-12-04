import express, { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();
const db = admin.firestore();

// Initialize Stripe with the secret key from Firebase config
const functions = require('firebase-functions');
const stripeSecretKey = functions.config().stripe?.secret_key;

if (!stripeSecretKey) {
  console.error('❌ Stripe secret key not configured. Run: firebase functions:config:set stripe.secret_key="sk_..."');
} else {
  console.log('✅ Stripe configured successfully');
}

const stripe = new Stripe(stripeSecretKey || 'sk_test_placeholder');

// Stripe Price IDs - Generated from setup-stripe-products.js
const STRIPE_PRICES: Record<string, Record<string, { monthly: string; setup: string }>> = {
  restaurant: {
    basic: { monthly: 'price_1SaTiq1Zrio8XYGpVbLOdG1h', setup: 'price_1SaTiq1Zrio8XYGpYgf4UQ64' },
    enterprise: { monthly: 'price_1SaTir1Zrio8XYGpRmHgzIVd', setup: 'price_1SaTir1Zrio8XYGpZcqmUMe4' },
  },
  voice: {
    basic: { monthly: 'price_1SaTis1Zrio8XYGpyH0wqOvj', setup: 'price_1SaTis1Zrio8XYGpqMK6mMPy' },
    professional: { monthly: 'price_1SaTis1Zrio8XYGplKIocRQ2', setup: 'price_1SaTit1Zrio8XYGphGRk2AQA' },
    enterprise: { monthly: 'price_1SaTit1Zrio8XYGp4o1d897J', setup: 'price_1SaTit1Zrio8XYGpSM6pEe9i' },
  },
  real_estate: {
    basic: { monthly: 'price_1SaTiu1Zrio8XYGphGDXBd0c', setup: 'price_1SaTiu1Zrio8XYGplnkVzjZa' },
    professional: { monthly: 'price_1SaTiv1Zrio8XYGpM9fEi8d7', setup: 'price_1SaTiv1Zrio8XYGpM3sBvi2Y' },
  },
};

/**
 * Get tenant subscription status
 * GET /billing/subscription
 */
router.get('/subscription', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, restaurantId, officeId, agentId, type } = req.user || {};

    // Compute tenantId if not directly available (backward compatibility)
    const effectiveTenantId = tenantId || restaurantId || officeId || agentId;

    if (!effectiveTenantId || !type) {
      console.error('Missing tenant information:', { tenantId, restaurantId, officeId, agentId, type });
      return res.status(400).json({ error: 'Missing tenant information' });
    }

    // Get subscription from Firestore
    let subscriptionQuery;
    try {
      subscriptionQuery = await db.collection('subscriptions')
        .where('tenantId', '==', effectiveTenantId)
        .where('tenantType', '==', type)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
    } catch (indexError: any) {
      // If index doesn't exist yet, try simpler query without orderBy
      console.log('Index may not exist, trying simpler query:', indexError.message);
      subscriptionQuery = await db.collection('subscriptions')
        .where('tenantId', '==', effectiveTenantId)
        .where('tenantType', '==', type)
        .limit(1)
        .get();
    }

    if (subscriptionQuery.empty) {
      // No subscription yet - user is in trial or needs to subscribe
      return res.json({
        status: 'trial',
        plan: null,
        trialEndsAt: null,
        currentPeriodEnd: null,
      });
    }

    const subscriptionDoc = subscriptionQuery.docs[0];
    const subscription = subscriptionDoc.data();

    return res.json({
      id: subscriptionDoc.id,
      status: subscription.status,
      plan: subscription.plan,
      trialEndsAt: subscription.trialEndsAt?.toDate(),
      currentPeriodEnd: subscription.currentPeriodEnd?.toDate(),
      monthlyAmount: subscription.monthlyAmount,
      setupFeePaid: subscription.setupFeePaid,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
    });
  } catch (error: any) {
    console.error('Error getting subscription:', error);
    return res.status(500).json({ error: 'Failed to get subscription' });
  }
});

/**
 * Create Stripe Checkout Session
 * POST /billing/create-checkout-session
 * Body: { plan: 'basic' | 'professional' | 'enterprise' }
 */
router.post('/create-checkout-session', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { plan } = req.body;
    const { tenantId, restaurantId, officeId, agentId, type, email, uid } = req.user || {};

    console.log('🔍 Create checkout session request:', {
      plan,
      tenantId,
      restaurantId,
      officeId,
      agentId,
      type,
      email,
      uid,
    });

    // Compute tenantId if not directly available (backward compatibility)
    const effectiveTenantId = tenantId || restaurantId || officeId || agentId;

    if (!effectiveTenantId || !type || !plan) {
      console.error('❌ Missing required parameters:', { tenantId, restaurantId, officeId, agentId, type, plan });
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    console.log('✅ Using effectiveTenantId:', effectiveTenantId);

    // Validate plan exists for this tenant type
    const prices = STRIPE_PRICES[type]?.[plan];
    console.log('📋 Looking for prices:', { type, plan, found: !!prices });
    if (!prices || !prices.monthly || !prices.setup) {
      console.error('❌ Invalid plan configuration:', { type, plan, availablePlans: Object.keys(STRIPE_PRICES[type] || {}) });
      return res.status(400).json({ error: 'Invalid plan for tenant type' });
    }
    console.log('✅ Found prices:', prices);

    // Check if customer already has a Stripe customer ID
    let customerId: string | undefined;
    console.log('🔍 Checking for existing Stripe customer for user:', uid);
    const userDoc = await db.collection('users').doc(uid || '').get();
    if (userDoc.exists) {
      customerId = userDoc.data()?.stripeCustomerId;
      console.log('Found existing customer ID:', customerId);
    } else {
      console.log('No user document found, will create new Stripe customer');
    }

    // Create or retrieve Stripe customer
    if (!customerId) {
      console.log('🔨 Creating new Stripe customer...');
      const customer = await stripe.customers.create({
        email: email || '',
        metadata: {
          tenantId: effectiveTenantId,
          tenantType: type,
          userId: uid || '',
        },
      });
      customerId = customer.id;
      console.log('✅ Created Stripe customer:', customerId);

      // Save customer ID to user document
      console.log('💾 Saving customer ID to Firestore...');
      await db.collection('users').doc(uid || '').set({
        stripeCustomerId: customerId,
      }, { merge: true });
      console.log('✅ Saved customer ID');
    }

    // Create checkout session - using mode: 'payment' to charge setup fee immediately
    // Then we'll create subscription via webhook
    console.log('🛒 Creating checkout session for setup fee:', {
      customerId,
      prices,
      effectiveTenantId,
      type,
      plan,
      strategy: 'setup_fee_payment_then_subscription',
    });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'payment',  // Payment mode for one-time setup fee
      line_items: [
        {
          price: prices.setup,  // One-time setup fee charged immediately
          quantity: 1,
        },
      ],
      payment_intent_data: {
        setup_future_usage: 'off_session',  // Save payment method for future charges
        metadata: {
          tenantId: effectiveTenantId,
          tenantType: type,
          plan,
          monthlyPriceId: prices.monthly,  // We'll use this to create subscription
          setupFee: 'true',
        },
      },
      success_url: `${req.headers.origin || 'https://merxus.com'}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || 'https://merxus.com'}/billing?canceled=true`,
      metadata: {
        tenantId: effectiveTenantId,
        tenantType: type,
        plan,
        monthlyPriceId: prices.monthly,
        createSubscription: 'true',  // Signal to webhook to create subscription
      },
    });

    console.log('✅ Checkout session created:', session.id);
    console.log('🔗 Checkout URL:', session.url);
    
    return res.json({ url: session.url });
  } catch (error: any) {
    console.error('❌ Error creating checkout session:', error);
    console.error('❌ Error details:', {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
      raw: error.raw,
      stack: error.stack,
    });
    return res.status(500).json({ 
      error: error.message,
      details: error.type || error.code,
      hint: 'Check if Stripe products and prices are set up correctly'
    });
  }
});

/**
 * Stripe Webhook Handler
 * POST /billing/webhook
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = functions.config().stripe?.webhook_secret;

  if (!sig || !webhookSecret) {
    return res.status(400).send('Webhook signature or secret missing');
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.json({ received: true });
  } catch (error: any) {
    console.error('Error handling webhook:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Cancel subscription
 * POST /billing/cancel-subscription
 */
router.post('/cancel-subscription', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, restaurantId, officeId, agentId, type } = req.user || {};

    // Compute tenantId if not directly available (backward compatibility)
    const effectiveTenantId = tenantId || restaurantId || officeId || agentId;

    if (!effectiveTenantId || !type) {
      console.error('Missing tenant information:', { tenantId, restaurantId, officeId, agentId, type });
      return res.status(400).json({ error: 'Missing tenant information' });
    }

    // Get subscription
    let subscriptionQuery;
    try {
      subscriptionQuery = await db.collection('subscriptions')
        .where('tenantId', '==', effectiveTenantId)
        .where('tenantType', '==', type)
        .where('status', '==', 'active')
        .limit(1)
        .get();
    } catch (indexError: any) {
      // If index doesn't exist, try simpler query
      console.log('Index may not exist, trying simpler query');
      const allSubs = await db.collection('subscriptions')
        .where('tenantId', '==', effectiveTenantId)
        .where('tenantType', '==', type)
        .get();
      
      // Filter in memory for active status
      const activeDocs = allSubs.docs.filter(doc => doc.data().status === 'active');
      if (activeDocs.length === 0) {
        return res.status(404).json({ error: 'No active subscription found' });
      }
      subscriptionQuery = { empty: false, docs: activeDocs };
    }

    if (subscriptionQuery.empty) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const subscriptionDoc = subscriptionQuery.docs[0];
    const subscription = subscriptionDoc.data();

    // Cancel in Stripe (at period end, so they keep access until then)
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Update Firestore
    await subscriptionDoc.ref.update({
      cancelAtPeriodEnd: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ success: true, message: 'Subscription will cancel at period end' });
  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Webhook Helper Functions
// ============================================================================

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Processing checkout.session.completed:', session.id);
  
  const { tenantId, tenantType, plan, monthlyPriceId, createSubscription } = session.metadata || {};
  
  if (!tenantId || !tenantType || !plan) {
    console.error('Missing metadata in checkout session:', session.id);
    return;
  }

  // If this was a setup fee payment, create the subscription now
  if (createSubscription === 'true' && monthlyPriceId) {
    console.log(`Setup fee paid, creating subscription for ${tenantType} tenant ${tenantId}...`);
    
    try {
      const customerId = session.customer as string;
      
      // Create subscription with 30-day trial
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: monthlyPriceId }],
        trial_period_days: 30,
        metadata: {
          tenantId,
          tenantType,
          plan,
        },
      });
      
      console.log(`✅ Subscription created: ${subscription.id} with 30-day trial`);
    } catch (error: any) {
      console.error('❌ Error creating subscription after setup payment:', error);
      // Don't throw - setup fee was already charged successfully
    }
  } else {
    console.log(`Checkout completed for ${tenantType} tenant ${tenantId}, plan: ${plan}`);
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  console.log('Processing subscription update:', subscription.id);
  
  const { tenantId, tenantType, plan } = subscription.metadata;
  
  if (!tenantId || !tenantType) {
    console.error('Missing metadata in subscription:', subscription.id);
    return;
  }

  // Calculate trial end date
  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
  const currentPeriodEnd = (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : new Date();

  // Get or create subscription document
  const subscriptionQuery = await db.collection('subscriptions')
    .where('stripeSubscriptionId', '==', subscription.id)
    .limit(1)
    .get();

  const subscriptionData = {
    tenantId,
    tenantType,
    plan: plan || 'basic',
    status: subscription.status,
    stripeCustomerId: subscription.customer as string,
    stripeSubscriptionId: subscription.id,
    trialEndsAt: trialEnd ? admin.firestore.Timestamp.fromDate(trialEnd) : null,
    currentPeriodEnd: admin.firestore.Timestamp.fromDate(currentPeriodEnd),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (subscriptionQuery.empty) {
    // Create new subscription
    await db.collection('subscriptions').add({
      ...subscriptionData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('Created new subscription document');
  } else {
    // Update existing subscription
    await subscriptionQuery.docs[0].ref.update(subscriptionData);
    console.log('Updated existing subscription document');
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Processing subscription deletion:', subscription.id);
  
  // Update subscription status to canceled
  const subscriptionQuery = await db.collection('subscriptions')
    .where('stripeSubscriptionId', '==', subscription.id)
    .limit(1)
    .get();

  if (!subscriptionQuery.empty) {
    await subscriptionQuery.docs[0].ref.update({
      status: 'canceled',
      canceledAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('Subscription marked as canceled');
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Processing successful payment:', invoice.id);
  
  // Update subscription to active if it was past_due
  const subscriptionId = typeof (invoice as any).subscription === 'string' ? (invoice as any).subscription : (invoice as any).subscription?.id;
  if (subscriptionId) {
    const subscriptionQuery = await db.collection('subscriptions')
      .where('stripeSubscriptionId', '==', subscriptionId)
      .limit(1)
      .get();

    if (!subscriptionQuery.empty) {
      await subscriptionQuery.docs[0].ref.update({
        status: 'active',
        lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('Subscription marked as active after successful payment');
    }
  }

  // TODO: Send receipt email via SendGrid
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Processing failed payment:', invoice.id);
  
  // Update subscription to past_due
  const subscriptionId = typeof (invoice as any).subscription === 'string' ? (invoice as any).subscription : (invoice as any).subscription?.id;
  if (subscriptionId) {
    const subscriptionQuery = await db.collection('subscriptions')
      .where('stripeSubscriptionId', '==', subscriptionId)
      .limit(1)
      .get();

    if (!subscriptionQuery.empty) {
      await subscriptionQuery.docs[0].ref.update({
        status: 'past_due',
        lastFailedPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('Subscription marked as past_due after failed payment');
    }
  }

  // TODO: Send payment failed email via SendGrid
}

export default router;
