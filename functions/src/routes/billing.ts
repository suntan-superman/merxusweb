import express, { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import https from 'https';
import { URLSearchParams } from 'url';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { createRateLimiter, RATE_LIMIT_CONFIGS } from '../middleware/rateLimit';
import { TwilioNumberService } from '../services/twilioNumberService';
import { getBillingConfig, getBillingPricing } from '../utils/billingConfig';

const router = express.Router();
const db = admin.firestore();

const functions = require('firebase-functions');
const stripeSecretKey = functions.config().stripe?.secret_key || process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = functions.config().stripe?.webhook_secret || process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey) {
  console.error('❌ Stripe secret key not configured. Set functions config: stripe.secret_key');
}

const stripe = new Stripe(stripeSecretKey || 'sk_test_placeholder', {
  // Stripe types in this project only allow the latest API version; keep runtime on 2023-10-16.
  apiVersion: '2023-10-16' as any,
});

const TURNSTILE_SECRET =
  functions.config().turnstile?.secret_key ||
  process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY ||
  process.env.CLOUDFARE_TURNSTILE_SECRET_KEY;

const RESERVATION_TTL_MS = 15 * 60 * 1000;

const getOrigin = (rawUrl?: string | null) => {
  if (!rawUrl) return null;
  try {
    return new URL(rawUrl).origin;
  } catch {
    return null;
  }
};

const appendParams = (rawUrl: string, params: Record<string, string | undefined | null>) => {
  try {
    const url = new URL(rawUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (!url.searchParams.has(key)) {
          url.searchParams.set(key, String(value));
        }
      }
    });
    return url.toString();
  } catch {
    return rawUrl;
  }
};

function normalizeTenantType(input?: string | null) {
  if (!input) return null;
  if (input === 'office') return 'voice';
  return input;
}

function getBillingKey(tenantType: string) {
  if (tenantType === 'voice' || tenantType === 'office') return 'office';
  return tenantType;
}

function getTenantCollection(tenantType: string) {
  if (tenantType === 'voice' || tenantType === 'office') return 'offices';
  if (tenantType === 'real_estate') return 'agents';
  return 'restaurants';
}

function requireMerxusAdmin(req: AuthenticatedRequest, res: Response): boolean {
  const userRole = req.user?.role;
  if (userRole !== 'merxus_admin' && userRole !== 'merxus_support' && userRole !== 'super_admin') {
    res.status(403).json({ error: 'Merxus admin access required' });
    return false;
  }
  return true;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return ips.trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

async function verifyTurnstile(token?: string, ip?: string) {
  if (!TURNSTILE_SECRET) {
    throw new Error('Turnstile is not configured (missing secret key).');
  }
  if (!token) {
    return { success: false, error: 'missing_token' };
  }

  const params = new URLSearchParams({
    secret: TURNSTILE_SECRET,
    response: token,
  });
  if (ip) {
    params.append('remoteip', ip);
  }

  return new Promise<{ success: boolean; error?: string; data?: any }>((resolve, reject) => {
    const request = https.request(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
      (response) => {
        let body = '';
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          try {
            const data = JSON.parse(body);
            resolve({ success: !!data.success, data });
          } catch (err) {
            reject(err);
          }
        });
      }
    );

    request.on('error', reject);
    request.write(params.toString());
    request.end();
  });
}

async function markStripeEventProcessed(eventId: string, eventType: string) {
  const ref = db.collection('_stripeEvents').doc(eventId);
  const snapshot = await ref.get();
  if (snapshot.exists) return false;

  await ref.set({
    type: eventType,
    processedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return true;
}

// ----------------------------------------------------------------------------
// Pricing (Public)
// ----------------------------------------------------------------------------
router.get('/pricing', async (_req: Request, res: Response) => {
  try {
    const pricing = await getBillingPricing(stripe, { includeRestaurant: true });
    return res.json(pricing);
  } catch (error: any) {
    console.error('Error fetching pricing:', error);
    return res.status(500).json({ error: 'Failed to fetch pricing' });
  }
});

// ----------------------------------------------------------------------------
// Reserve Number (Authenticated)
// ----------------------------------------------------------------------------
router.post(
  '/reserve-number',
  authenticate,
  createRateLimiter(RATE_LIMIT_CONFIGS.onboarding),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tenantType, tenantId, selectedNumber, captchaToken } = req.body || {};
      const userId = req.user?.uid;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const normalizedType = normalizeTenantType(tenantType || req.user?.type);
      if (!normalizedType) {
        return res.status(400).json({ error: 'Missing tenantType' });
      }

      const effectiveTenantId = tenantId || req.user?.tenantId || req.user?.restaurantId || req.user?.officeId || req.user?.agentId;
      if (!effectiveTenantId) {
        return res.status(400).json({ error: 'Missing tenantId' });
      }

      const ip = getClientIp(req);
      const turnstile = await verifyTurnstile(captchaToken, ip);
      if (!turnstile.success) {
        return res.status(400).json({ error: 'captcha_failed', details: turnstile.data });
      }

      if (!selectedNumber) {
        return res.status(400).json({ error: 'Missing selectedNumber' });
      }

      // Prevent reserving numbers already assigned
      const assignedNumbers = await TwilioNumberService.getAssignedNumbers();
      if (assignedNumbers.has(selectedNumber)) {
        return res.status(409).json({ error: 'Number is already assigned' });
      }

      // Prevent multiple active reservations for this number
      const existing = await db.collection('numberReservations')
        .where('selectedNumber', '==', selectedNumber)
        .where('status', '==', 'awaiting_payment')
        .limit(3)
        .get();

      const now = Date.now();
      const activeReservation = existing.docs.find(doc => {
        const data = doc.data();
        const expiresAt = data.reservationExpiresAt?.toDate?.() || null;
        return expiresAt && expiresAt.getTime() > now;
      });

      if (activeReservation) {
        return res.status(409).json({ error: 'Number is already reserved' });
      }

      const reservationExpiresAt = admin.firestore.Timestamp.fromDate(new Date(now + RESERVATION_TTL_MS));
      const reservationRef = db.collection('numberReservations').doc();

      await reservationRef.set({
        userId,
        tenantId: effectiveTenantId,
        tenantType: normalizedType,
        selectedNumber,
        status: 'awaiting_payment',
        reservationExpiresAt,
        ipAddress: ip,
        userAgent: req.headers['user-agent'] || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.json({
        reservationId: reservationRef.id,
        expiresAt: reservationExpiresAt.toDate(),
      });
    } catch (error: any) {
      console.error('Error reserving number:', error);
      return res.status(500).json({ error: error.message || 'Failed to reserve number' });
    }
  }
);

// ----------------------------------------------------------------------------
// Create Checkout Session (Authenticated)
// ----------------------------------------------------------------------------
router.post('/create-checkout-session', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantType, tenantId, reservationId, promoCode, successUrl, cancelUrl, deeplink } = req.body || {};
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const normalizedType = normalizeTenantType(tenantType || req.user?.type);
    if (!normalizedType) {
      return res.status(400).json({ error: 'Missing tenantType' });
    }

    const effectiveTenantId = tenantId || req.user?.tenantId || req.user?.restaurantId || req.user?.officeId || req.user?.agentId;
    if (!effectiveTenantId) {
      return res.status(400).json({ error: 'Missing tenantId' });
    }

    let reservation: any | null = null;
    if (reservationId) {
      const reservationRef = db.collection('numberReservations').doc(reservationId);
      const reservationSnap = await reservationRef.get();

      if (!reservationSnap.exists) {
        return res.status(404).json({ error: 'Reservation not found' });
      }

      reservation = reservationSnap.data() || {};
      if (reservation.userId !== userId) {
        return res.status(403).json({ error: 'Reservation does not belong to user' });
      }

      const expiresAt = reservation.reservationExpiresAt?.toDate?.();
      if (!expiresAt || expiresAt.getTime() < Date.now()) {
        return res.status(410).json({ error: 'Reservation expired' });
      }

      if (reservation.status !== 'awaiting_payment') {
        return res.status(400).json({ error: 'Reservation is not active' });
      }

      if (!reservation.selectedNumber) {
        return res.status(400).json({ error: 'Reservation missing selected number' });
      }
    }

    const config = await getBillingConfig();
    const billingKey = getBillingKey(normalizedType);
    const tenantConfig = (config.tenants || {})[billingKey];

    if (!tenantConfig?.onboardingPriceId || !tenantConfig?.subscriptionPriceId) {
      return res.status(400).json({ error: 'Billing configuration missing for tenant type' });
    }

    // Stripe customer lookup
    let customerId: string | undefined;
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      customerId = userDoc.data()?.stripeCustomerId;
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user?.email || undefined,
        metadata: {
          tenantId: effectiveTenantId,
          tenantType: normalizedType,
          userId,
        },
      });
      customerId = customer.id;
      await db.collection('users').doc(userId).set({
        stripeCustomerId: customerId,
      }, { merge: true });
    }

    // Promo code validation (onboarding only)
    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
    if (promoCode) {
      if (!config.promo?.enabled) {
        return res.status(400).json({ error: 'Promo codes are not enabled' });
      }

      const onboardingPrice = await stripe.prices.retrieve(tenantConfig.onboardingPriceId);
      const subscriptionPrice = await stripe.prices.retrieve(tenantConfig.subscriptionPriceId);
      const onboardingProduct = typeof onboardingPrice.product === 'string' ? onboardingPrice.product : onboardingPrice.product.id;
      const subscriptionProduct = typeof subscriptionPrice.product === 'string' ? subscriptionPrice.product : subscriptionPrice.product.id;

      const promoList = await stripe.promotionCodes.list({
        code: promoCode,
        active: true,
        limit: 1,
      });

      const promotion = promoList.data[0];
      if (!promotion) {
        return res.status(400).json({ error: 'Invalid promo code' });
      }

      const allowlist = config.promo?.allowlist || [];
      if (allowlist.length > 0 && !allowlist.includes(promotion.id) && !allowlist.includes(promotion.code || '')) {
        return res.status(400).json({ error: 'Promo code not allowed' });
      }

      const promoCoupon = (promotion as Stripe.PromotionCode & { coupon?: Stripe.Coupon }).coupon;
      const appliesTo = promoCoupon?.applies_to?.products || [];
      if (!appliesTo.includes(onboardingProduct) || appliesTo.includes(subscriptionProduct)) {
        return res.status(400).json({ error: 'Promo code not valid for onboarding-only' });
      }

      discounts = [{ promotion_code: promotion.id }];
    }

    const baseOrigin =
      getOrigin(successUrl) ||
      getOrigin(cancelUrl) ||
      req.headers.origin ||
      process.env.FRONTEND_URL ||
      'https://merxusllc.com';

    const safeCancelUrl = cancelUrl || `${baseOrigin}/billing?canceled=true`;
    const baseSuccessUrl = successUrl || `${baseOrigin}/billing?success=true`;
    const successRedirect = appendParams(baseSuccessUrl, {
      session_id: '{CHECKOUT_SESSION_ID}',
      deeplink,
    });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        { price: tenantConfig.onboardingPriceId, quantity: 1 },
        { price: tenantConfig.subscriptionPriceId, quantity: 1 },
      ],
      subscription_data: {
        trial_period_days: config.trialDays || 30,
        metadata: {
          tenantId: effectiveTenantId,
          tenantType: normalizedType,
          userId,
        },
      },
      metadata: {
        tenantId: effectiveTenantId,
        tenantType: normalizedType,
        userId,
        ...(reservationId && reservation?.selectedNumber
          ? { reservationId, selectedNumber: reservation.selectedNumber }
          : {}),
      },
      discounts,
      allow_promotion_codes: !!config.promo?.allowPromotionCodes,
      success_url: successRedirect,
      cancel_url: safeCancelUrl,
    });

    return res.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ error: error.message || 'Failed to create checkout session' });
  }
});

// ----------------------------------------------------------------------------
// Subscription Status (Authenticated)
// ----------------------------------------------------------------------------
router.get('/subscription', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, restaurantId, officeId, agentId, type } = req.user || {};

    const effectiveTenantId = tenantId || restaurantId || officeId || agentId;
    const normalizedType = normalizeTenantType(type);

    if (!effectiveTenantId || !normalizedType) {
      return res.status(400).json({ error: 'Missing tenant information' });
    }

    let subscriptionQuery;
    try {
      subscriptionQuery = await db.collection('subscriptions')
        .where('tenantId', '==', effectiveTenantId)
        .where('tenantType', '==', normalizedType)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
    } catch (indexError: any) {
      subscriptionQuery = await db.collection('subscriptions')
        .where('tenantId', '==', effectiveTenantId)
        .where('tenantType', '==', normalizedType)
        .limit(1)
        .get();
    }

    if (subscriptionQuery.empty) {
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
      trialEndsAt: subscription.trialEndsAt?.toDate?.() || null,
      currentPeriodEnd: subscription.currentPeriodEnd?.toDate?.() || null,
      monthlyAmount: subscription.monthlyAmount,
      setupFeePaid: subscription.setupFeePaid,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
    });
  } catch (error: any) {
    console.error('Error getting subscription:', error);
    return res.status(500).json({ error: 'Failed to get subscription' });
  }
});

// ----------------------------------------------------------------------------
// Stripe Customer Portal (Authenticated)
// ----------------------------------------------------------------------------
router.post('/portal-session', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userDoc = await db.collection('users').doc(userId).get();
    const customerId = userDoc.exists ? userDoc.data()?.stripeCustomerId : null;

    if (!customerId) {
      return res.status(404).json({ error: 'Stripe customer not found' });
    }

    const returnUrl = req.body?.returnUrl || req.headers.origin || process.env.FRONTEND_URL || 'https://merxusllc.com';
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return res.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating portal session:', error);
    return res.status(500).json({ error: error.message || 'Failed to create portal session' });
  }
});

// ----------------------------------------------------------------------------
// Admin: Pause subscription (stop billing)
// ----------------------------------------------------------------------------
router.post('/admin/pause', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!requireMerxusAdmin(req, res)) return;

    const { tenantId, tenantType, reason } = req.body || {};
    const normalizedType = normalizeTenantType(tenantType);

    if (!tenantId || !normalizedType) {
      return res.status(400).json({ error: 'Missing tenantId or tenantType' });
    }

    const subscriptionSnap = await db.collection('subscriptions')
      .where('tenantId', '==', tenantId)
      .where('tenantType', '==', normalizedType)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (subscriptionSnap.empty) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const subDoc = subscriptionSnap.docs[0];
    const subscription = subDoc.data();
    const stripeSubscriptionId = subscription.stripeSubscriptionId;

    if (!stripeSubscriptionId) {
      return res.status(400).json({ error: 'Stripe subscription ID missing' });
    }

    const updated = await stripe.subscriptions.update(stripeSubscriptionId, {
      pause_collection: { behavior: 'void' },
    });

    await subDoc.ref.update({
      status: updated.status,
      billingPaused: !!updated.pause_collection,
      pauseCollectionBehavior: updated.pause_collection?.behavior || null,
      pausedAt: admin.firestore.FieldValue.serverTimestamp(),
      pausedBy: req.user?.uid || null,
      pauseReason: reason || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({
      status: updated.status,
      billingPaused: !!updated.pause_collection,
    });
  } catch (error: any) {
    console.error('Error pausing subscription:', error);
    return res.status(500).json({ error: error.message || 'Failed to pause subscription' });
  }
});

// ----------------------------------------------------------------------------
// Admin: Resume subscription billing
// ----------------------------------------------------------------------------
router.post('/admin/resume', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!requireMerxusAdmin(req, res)) return;

    const { tenantId, tenantType } = req.body || {};
    const normalizedType = normalizeTenantType(tenantType);

    if (!tenantId || !normalizedType) {
      return res.status(400).json({ error: 'Missing tenantId or tenantType' });
    }

    const subscriptionSnap = await db.collection('subscriptions')
      .where('tenantId', '==', tenantId)
      .where('tenantType', '==', normalizedType)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (subscriptionSnap.empty) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const subDoc = subscriptionSnap.docs[0];
    const subscription = subDoc.data();
    const stripeSubscriptionId = subscription.stripeSubscriptionId;

    if (!stripeSubscriptionId) {
      return res.status(400).json({ error: 'Stripe subscription ID missing' });
    }

    const updated = await stripe.subscriptions.update(stripeSubscriptionId, {
      pause_collection: null,
    });

    await subDoc.ref.update({
      status: updated.status,
      billingPaused: false,
      pauseCollectionBehavior: admin.firestore.FieldValue.delete(),
      pausedAt: null,
      pausedBy: req.user?.uid || null,
      pauseReason: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({
      status: updated.status,
      billingPaused: false,
    });
  } catch (error: any) {
    console.error('Error resuming subscription:', error);
    return res.status(500).json({ error: error.message || 'Failed to resume subscription' });
  }
});

// ----------------------------------------------------------------------------
// Admin: Partial refund
// ----------------------------------------------------------------------------
router.post('/admin/refund', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!requireMerxusAdmin(req, res)) return;

    const { tenantId, tenantType, amountCents, reason } = req.body || {};
    const normalizedType = normalizeTenantType(tenantType);

    if (!tenantId || !normalizedType) {
      return res.status(400).json({ error: 'Missing tenantId or tenantType' });
    }

    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      return res.status(400).json({ error: 'amountCents must be a positive integer' });
    }

    const subscriptionSnap = await db.collection('subscriptions')
      .where('tenantId', '==', tenantId)
      .where('tenantType', '==', normalizedType)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (subscriptionSnap.empty) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const subDoc = subscriptionSnap.docs[0];
    const subscription = subDoc.data();
    const stripeSubscriptionId = subscription.stripeSubscriptionId;
    const stripeCustomerId = subscription.stripeCustomerId;

    let invoice: Stripe.Invoice | null = null;

    if (stripeSubscriptionId) {
      const invoices = await stripe.invoices.list({ subscription: stripeSubscriptionId, limit: 5 });
      invoice = invoices.data.find((inv) => inv.paid && inv.payment_intent) || null;
    }

    if (!invoice && stripeCustomerId) {
      const invoices = await stripe.invoices.list({ customer: stripeCustomerId, limit: 10 });
      invoice = invoices.data.find((inv) => inv.paid && inv.payment_intent) || null;
    }

    if (!invoice) {
      return res.status(404).json({ error: 'No paid invoice found for refund' });
    }

    const paymentIntentId = typeof invoice.payment_intent === 'string'
      ? invoice.payment_intent
      : invoice.payment_intent?.id;

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Invoice missing payment intent' });
    }

    const maxRefundable = (invoice.amount_paid || 0) - (invoice.amount_refunded || 0);
    if (amountCents > maxRefundable) {
      return res.status(400).json({ error: `Refund exceeds max refundable amount (${maxRefundable})` });
    }

    const normalizedReason =
      reason === 'duplicate' || reason === 'fraudulent' || reason === 'requested_by_customer'
        ? reason
        : 'requested_by_customer';

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amountCents,
      reason: normalizedReason,
      metadata: {
        tenantId,
        tenantType: normalizedType,
        invoiceId: invoice.id,
        subscriptionId: stripeSubscriptionId || '',
      },
    });

    await db.collection('billingRefunds').add({
      tenantId,
      tenantType: normalizedType,
      amountCents,
      reason: normalizedReason,
      stripeRefundId: refund.id,
      stripeInvoiceId: invoice.id,
      stripePaymentIntentId: paymentIntentId,
      stripeSubscriptionId: stripeSubscriptionId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: req.user?.uid || null,
    });

    return res.json({
      refundId: refund.id,
      status: refund.status,
      amountCents,
    });
  } catch (error: any) {
    console.error('Error issuing refund:', error);
    return res.status(500).json({ error: error.message || 'Failed to issue refund' });
  }
});

// ----------------------------------------------------------------------------
// Stripe Webhook
// ----------------------------------------------------------------------------
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  if (!stripeWebhookSecret) {
    return res.status(500).send('Stripe webhook secret not configured');
  }

  const sig = req.headers['stripe-signature'] as string | undefined;
  if (!sig) {
    return res.status(400).send('Missing Stripe signature');
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    const shouldProcess = await markStripeEventProcessed(event.id, event.type);
    if (!shouldProcess) {
      return res.json({ received: true, duplicate: true });
    }

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

// ============================================================================
// Webhook Helpers
// ============================================================================

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};
  const tenantId = metadata.tenantId;
  const tenantType = normalizeTenantType(metadata.tenantType);
  const reservationId = metadata.reservationId;
  const selectedNumber = metadata.selectedNumber;

  if (!tenantId || !tenantType) {
    console.error('Missing metadata in checkout session:', session.id, metadata);
    return;
  }

  if (!reservationId || !selectedNumber) {
    console.log('Checkout completed without reservation metadata. Skipping Twilio purchase.', session.id);
    return;
  }

  const reservationRef = db.collection('numberReservations').doc(reservationId);
  const reservationSnap = await reservationRef.get();

  if (!reservationSnap.exists) {
    console.error('Reservation not found for checkout:', reservationId);
    return;
  }

  const reservation = reservationSnap.data() || {};
  if (reservation.status === 'completed') {
    console.log('Reservation already completed:', reservationId);
    return;
  }

  const expiresAt = reservation.reservationExpiresAt?.toDate?.();
  if (!expiresAt || expiresAt.getTime() < Date.now()) {
    await reservationRef.update({
      status: 'expired',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.error('Reservation expired before checkout completion:', reservationId);
    return;
  }

  try {
    const webhookUrls = TwilioNumberService.getWebhookUrls(tenantType, tenantId);
    const purchased = await TwilioNumberService.purchaseNumber(selectedNumber, {
      ...webhookUrls,
      friendlyName: `Merxus ${tenantType}`,
    });

    const tenantCollection = getTenantCollection(tenantType);
    const tenantRef = db.collection(tenantCollection).doc(tenantId);

    await tenantRef.set({
      twilioPhoneNumber: purchased.phoneNumber,
      twilioPhoneSid: purchased.sid,
      twilioVoiceUrl: purchased.voiceUrl,
      twilioSmsUrl: purchased.smsUrl,
      twilioStatusCallback: purchased.statusCallback,
      twilioConfiguredAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await tenantRef.collection('meta').doc('settings').set({
      twilioPhoneNumber: purchased.phoneNumber,
      twilioPhoneSid: purchased.sid,
      twilioAccountSid: null,
      twilioAuthToken: null,
      twilioVoiceUrl: purchased.voiceUrl,
      twilioSmsUrl: purchased.smsUrl,
      twilioStatusCallback: purchased.statusCallback,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await reservationRef.update({
      status: 'completed',
      stripeSessionId: session.id,
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription || null,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      twilioPhoneNumber: purchased.phoneNumber,
      twilioPhoneSid: purchased.sid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Failed to purchase Twilio number after checkout:', error);
    await reservationRef.update({
      status: 'failed',
      failureReason: error.message || 'twilio_purchase_failed',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const { tenantId, tenantType } = subscription.metadata || {};
  const normalizedType = normalizeTenantType(tenantType);

  if (!tenantId || !normalizedType) {
    console.error('Missing metadata in subscription:', subscription.id);
    return;
  }

  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
  const stripeSub = subscription as Stripe.Subscription & { current_period_end?: number };
  const currentPeriodEnd = stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : new Date();

  const subscriptionQuery = await db.collection('subscriptions')
    .where('stripeSubscriptionId', '==', subscription.id)
    .limit(1)
    .get();

  const subscriptionData: any = {
    tenantId,
    tenantType: normalizedType,
    plan: subscription.metadata?.plan || null,
    status: subscription.status,
    stripeCustomerId: subscription.customer as string,
    stripeSubscriptionId: subscription.id,
    trialEndsAt: trialEnd ? admin.firestore.Timestamp.fromDate(trialEnd) : null,
    currentPeriodEnd: admin.firestore.Timestamp.fromDate(currentPeriodEnd),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    billingPaused: !!subscription.pause_collection,
    pauseCollectionBehavior: subscription.pause_collection?.behavior || null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (subscriptionQuery.empty) {
    await db.collection('subscriptions').add({
      ...subscriptionData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    await subscriptionQuery.docs[0].ref.update(subscriptionData);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
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
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const invoiceWithSub = invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription };
  const subscriptionId = typeof invoiceWithSub.subscription === 'string'
    ? invoiceWithSub.subscription
    : invoiceWithSub.subscription?.id;
  if (!subscriptionId) return;

  const subscriptionQuery = await db.collection('subscriptions')
    .where('stripeSubscriptionId', '==', subscriptionId)
    .limit(1)
    .get();

  if (!subscriptionQuery.empty) {
    const subscriptionDoc = subscriptionQuery.docs[0];
    const subscriptionData = subscriptionDoc.data();

    await subscriptionDoc.ref.update({
      status: 'active',
      lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await sendPaymentReceiptEmail(subscriptionData, invoice);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const invoiceWithSub = invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription };
  const subscriptionId = typeof invoiceWithSub.subscription === 'string'
    ? invoiceWithSub.subscription
    : invoiceWithSub.subscription?.id;
  if (!subscriptionId) return;

  const subscriptionQuery = await db.collection('subscriptions')
    .where('stripeSubscriptionId', '==', subscriptionId)
    .limit(1)
    .get();

  if (!subscriptionQuery.empty) {
    const subscriptionDoc = subscriptionQuery.docs[0];
    const subscriptionData = subscriptionDoc.data();

    await subscriptionDoc.ref.update({
      status: 'past_due',
      lastFailedPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await sendPaymentFailedEmail(subscriptionData, invoice);
  }
}

async function sendPaymentReceiptEmail(subscriptionData: any, invoice: Stripe.Invoice) {
  try {
    const { sendPaymentReceipt } = await import('../utils/email');
    const tenantId = subscriptionData.tenantId;
    const tenantType = subscriptionData.tenantType;

    let ownerEmail: string | null = null;
    let displayName = 'Customer';
    let businessName = 'Your Business';

    if (tenantType === 'restaurant') {
      const settingsDoc = await db.collection('restaurants').doc(tenantId).collection('meta').doc('settings').get();
      if (settingsDoc.exists) {
        const settings = settingsDoc.data();
        businessName = settings?.name || businessName;
        ownerEmail = settings?.ownerEmail || settings?.contactEmail;
      }
    } else if (tenantType === 'voice') {
      const settingsDoc = await db.collection('offices').doc(tenantId).collection('meta').doc('settings').get();
      if (settingsDoc.exists) {
        const settings = settingsDoc.data();
        businessName = settings?.name || businessName;
        ownerEmail = settings?.ownerEmail || settings?.email;
      }
    } else if (tenantType === 'real_estate') {
      const settingsDoc = await db.collection('agents').doc(tenantId).collection('meta').doc('settings').get();
      if (settingsDoc.exists) {
        const settings = settingsDoc.data();
        businessName = settings?.agentName || settings?.name || businessName;
        displayName = settings?.agentName || displayName;
        ownerEmail = settings?.ownerEmail || settings?.email;
      }
    }

    if (!ownerEmail && invoice.customer_email) {
      ownerEmail = invoice.customer_email;
    }

    if (!ownerEmail) {
      return;
    }

    const periodStart = invoice.period_start
      ? new Date(invoice.period_start * 1000).toLocaleDateString()
      : undefined;
    const periodEnd = invoice.period_end
      ? new Date(invoice.period_end * 1000).toLocaleDateString()
      : undefined;

    await sendPaymentReceipt(ownerEmail, displayName, businessName, {
      invoiceNumber: invoice.number || invoice.id,
      amount: invoice.amount_paid,
      date: new Date(invoice.created * 1000).toLocaleDateString(),
      description: invoice.description || `${subscriptionData.plan || 'Basic'} Plan - Monthly Subscription`,
      planName: subscriptionData.plan ? `${subscriptionData.plan.charAt(0).toUpperCase()}${subscriptionData.plan.slice(1)} Plan` : 'Merxus AI',
      periodStart,
      periodEnd,
      invoiceUrl: invoice.hosted_invoice_url || undefined,
    });
  } catch (error) {
    console.error('Error sending payment receipt email:', error);
  }
}

async function sendPaymentFailedEmail(subscriptionData: any, invoice: Stripe.Invoice) {
  try {
    const { sendPaymentFailedNotification } = await import('../utils/email');
    const tenantId = subscriptionData.tenantId;
    const tenantType = subscriptionData.tenantType;

    let ownerEmail: string | null = null;
    let displayName = 'Customer';
    let businessName = 'Your Business';

    if (tenantType === 'restaurant') {
      const settingsDoc = await db.collection('restaurants').doc(tenantId).collection('meta').doc('settings').get();
      if (settingsDoc.exists) {
        const settings = settingsDoc.data();
        businessName = settings?.name || businessName;
        ownerEmail = settings?.ownerEmail || settings?.contactEmail;
      }
    } else if (tenantType === 'voice') {
      const settingsDoc = await db.collection('offices').doc(tenantId).collection('meta').doc('settings').get();
      if (settingsDoc.exists) {
        const settings = settingsDoc.data();
        businessName = settings?.name || businessName;
        ownerEmail = settings?.ownerEmail || settings?.email;
      }
    } else if (tenantType === 'real_estate') {
      const settingsDoc = await db.collection('agents').doc(tenantId).collection('meta').doc('settings').get();
      if (settingsDoc.exists) {
        const settings = settingsDoc.data();
        businessName = settings?.agentName || settings?.name || businessName;
        displayName = settings?.agentName || displayName;
        ownerEmail = settings?.ownerEmail || settings?.email;
      }
    }

    if (!ownerEmail && invoice.customer_email) {
      ownerEmail = invoice.customer_email;
    }

    if (!ownerEmail) {
      return;
    }

    const nextRetryDate = invoice.next_payment_attempt
      ? new Date(invoice.next_payment_attempt * 1000).toLocaleDateString()
      : undefined;

    await sendPaymentFailedNotification(ownerEmail, displayName, businessName, {
      amount: invoice.amount_due,
      date: new Date(invoice.created * 1000).toLocaleDateString(),
      reason: invoice.last_finalization_error?.message || 'Payment method declined',
      nextRetryDate,
      updatePaymentUrl: `https://app.merxus.com/settings/billing`,
    });
  } catch (error) {
    console.error('Error sending payment failed email:', error);
  }
}

export default router;
