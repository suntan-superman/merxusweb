// Flyer metrics (sent/pending/failed)
export async function getFlyerMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const agentId = req.user?.agentId;
    if (!agentId) {
      res.status(403).json({ error: 'Agent ID required' });
      return;
    }

    const queueSnap = await db
      .collection('agents')
      .doc(agentId)
      .collection('flyerSendQueue')
      .get();

    const logsSnap = await db
      .collection('agents')
      .doc(agentId)
      .collection('emailLogs')
      .get();

    const metrics = {
      queue: {
        pending: 0,
        declined: 0,
        failed: 0,
        sent: 0,
        total: queueSnap.size,
      },
      logs: {
        sent: 0,
        failed: 0,
        total: logsSnap.size,
      },
    };

    queueSnap.forEach((doc) => {
      const status = doc.data()?.status || 'pending_agent_approval';
      if (status === 'pending_agent_approval' || status === 'auto_send_ready') metrics.queue.pending += 1;
      else if (status === 'declined') metrics.queue.declined += 1;
      else if (status === 'failed') metrics.queue.failed += 1;
      else if (status === 'sent') metrics.queue.sent += 1;
    });

    logsSnap.forEach((doc) => {
      const status = doc.data()?.status || 'sent';
      if (status === 'sent') metrics.logs.sent += 1;
      else metrics.logs.failed += 1;
    });

    res.json(metrics);
  } catch (err: any) {
    console.error('Error fetching flyer metrics:', err);
    res.status(500).json({ error: 'Failed to fetch flyer metrics' });
  }
}
import { Response } from 'express';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendEmail } from '../utils/email';

const db = admin.firestore();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Shared helper to send a listing flyer email and log the event.
 */
async function sendFlyerEmailInternal(params: {
  agentId: string;
  listingId: string;
  leadEmail: string;
  leadName?: string | null;
  callId?: string | null;
  leadId?: string | null;
  isTest?: boolean;
}) {
  const { agentId, listingId, leadEmail, leadName, callId, leadId, isTest = false } = params;

  if (!EMAIL_REGEX.test(leadEmail)) {
    throw new Error('Invalid email format');
  }

  // Fetch listing
  const listingRef = db.collection('agents').doc(agentId).collection('listings').doc(listingId);
  const listingSnap = await listingRef.get();

  if (!listingSnap.exists) {
    throw new Error('Listing not found');
  }

  const listing = listingSnap.data() || {};
  const address = listing.address || listing.propertyAddress || 'Property listing';
  const flyerUrl = listing.flyerUrl || listing.flyerURL || null;
  const price = listing.price ? `$${listing.price.toLocaleString?.() || listing.price}` : null;
  const beds = listing.bedrooms || listing.beds;
  const baths = listing.bathrooms || listing.baths;
  const sqft = listing.squareFeet || listing.sqft;

  if (!flyerUrl) {
    throw new Error('No flyer on this listing');
  }

  // Build email content
  const subject = `Listing flyer: ${address}`;
  const details: string[] = [];
  if (price) details.push(`<strong>Price:</strong> ${price}`);
  if (beds || baths) details.push(`<strong>Beds/Baths:</strong> ${beds ?? '-'} / ${baths ?? '-'}`);
  if (sqft) details.push(`<strong>Sq Ft:</strong> ${sqft}`);
  if (listing.description) details.push(`<p>${listing.description}</p>`);

  const flyerSection = `<p>You can view or download the flyer here: <a href="${flyerUrl}" target="_blank" rel="noopener noreferrer">${flyerUrl}</a></p>`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <h2 style="margin: 0 0 12px 0;">${address}</h2>
      ${details.length ? `<div style="margin-bottom: 12px;">${details.join('<br/>')}</div>` : ''}
      ${flyerSection}
      <p>Sent by Merxus AI on behalf of your agent.</p>
    </div>
  `;

  const sendOk = await sendEmail({
    to: leadEmail,
    subject,
    html,
    disableClickTracking: true, // Prevent SendGrid from wrapping long Firebase Storage URLs
  });

  const logData = {
    agentId,
    listingId,
    leadEmail,
    leadName: leadName || null,
    callId: callId || null,
    leadId: leadId || null,
    isTest,
    status: sendOk ? 'sent' : 'failed',
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection('agents').doc(agentId).collection('emailLogs').add(logData);

  if (!sendOk) {
    throw new Error('Failed to send email via SendGrid');
  }

  return logData;
}

// Get estate settings
export async function getEstateSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const agentId = req.user?.agentId;

    if (!agentId) {
      res.status(403).json({ error: 'Agent ID required' });
      return;
    }

    const settingsRef = db
      .collection('agents')
      .doc(agentId)
      .collection('meta')
      .doc('settings');

    const settingsDoc = await settingsRef.get();

    if (!settingsDoc.exists) {
      // Return default settings if none exist
      const defaultSettings = {
        agentId,
        name: '',
        brandName: '',
        email: req.user?.email || '',
        phonePrimary: '',
        address: '',
        websiteUrl: '',
        brokerage: null,
        licenseNumber: null,
        markets: [],
        languagesSupported: ['en', 'es'],
        timezone: 'America/Los_Angeles',
        autoSendFlyers: false,
        businessHours: {
          monday: { open: '09:00', close: '18:00', closed: false },
          tuesday: { open: '09:00', close: '18:00', closed: false },
          wednesday: { open: '09:00', close: '18:00', closed: false },
          thursday: { open: '09:00', close: '18:00', closed: false },
          friday: { open: '09:00', close: '18:00', closed: false },
          saturday: { open: '10:00', close: '16:00', closed: false },
          sunday: { open: null, close: null, closed: true },
        },
        showingPreferences: {
          minNoticeHours: 2,
          allowSameDay: true,
          blockOff: [],
        },
        yearsExperience: null,
        homesSold: null,
        specializations: [],
        awards: [],
        certifications: [],
        responseTime: null,
        uniqueValue: '',
        agentHighlights: '',
        testimonials: [],
        // Market Statistics
        avgDaysOnMarket: null,
        avgSaleToListRatio: null,
        activeListings: null,
        marketShare: null,
        // Service Guarantees
        serviceGuarantees: [],
        // Technology/Process
        technologyFeatures: [],
        // Community Involvement
        communityInvolvement: null,
        // Team Information
        teamSize: null,
        teamDescription: null,
        // Market Expertise
        neighborhoodsServed: [],
        priceRangeExpertise: null,
        propertyTypeExpertise: [],
        routing: {
          departments: [
            { id: 'new_buyers', label: 'New Buyer Leads', forward_to: null },
            { id: 'sellers', label: 'Potential Sellers', forward_to: null },
            { id: 'showings', label: 'Showing Requests', forward_to: null },
            { id: 'general', label: 'General Questions', forward_to: null },
            { id: 'voicemail', label: 'Voicemail / Inbox', forward_to: null },
          ],
          intents: [
            { name: 'listing_info', routes_to: 'new_buyers' },
            { name: 'showing_request', routes_to: 'showings' },
            { name: 'seller_lead', routes_to: 'sellers' },
            { name: 'general_question', routes_to: 'general' },
            { name: 'after_hours', routes_to: 'voicemail' },
          ],
          after_hours: {
            mode: 'voicemail_only',
            default_route: 'voicemail',
            message_en: 'Thanks for calling. Our office is currently closed. I can take a message and have someone contact you as soon as possible.',
            message_es: 'Gracias por llamar. En este momento la oficina está cerrada. Puedo tomar un mensaje para que alguien se comunique con usted lo antes posible.',
          },
        },
        twilioPhoneNumber: '',
        twilioNumberSid: '',
        aiConfig: {
          model: 'gpt-4o-mini',
          voiceName: 'alloy',
          language: 'en-US',
          systemPrompt: '',
          promptMetadata: {
            routing: {},
            languageConfig: {
              default: 'en',
              methods: [
                {
                  type: 'menu',
                  dtmf: { '1': 'en', '2': 'es' },
                  prompt_en: 'For English, press 1. Para español, presione 2.',
                  prompt_es: 'Para inglés, presione 1. Para español, presione 2.',
                },
              ],
              fallback: 'en',
            },
            faqs: [],
          },
        },
      };
      res.json(defaultSettings);
      return;
    }

    res.json(settingsDoc.data());
  } catch (err: any) {
    console.error('Error fetching estate settings:', err);
    res.status(500).json({ error: 'Failed to fetch estate settings' });
  }
}

// Update estate settings
export async function updateEstateSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const agentId = req.user?.agentId;

    if (!agentId) {
      res.status(403).json({ error: 'Agent ID required' });
      return;
    }

    const settings = req.body;
    const settingsRef = db
      .collection('agents')
      .doc(agentId)
      .collection('meta')
      .doc('settings');

    // Merge with existing settings
    await settingsRef.set(settings, { merge: true });

    res.json({ message: 'Settings updated successfully' });
  } catch (err: any) {
    console.error('Error updating estate settings:', err);
    res.status(500).json({ error: 'Failed to update estate settings' });
  }
}

// Get listings
export async function getListings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const agentId = req.user?.agentId;

    if (!agentId) {
      res.status(403).json({ error: 'Agent ID required' });
      return;
    }

    const listingsSnapshot = await db
      .collection('agents')
      .doc(agentId)
      .collection('listings')
      .orderBy('createdAt', 'desc')
      .get();

    const listings = listingsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(listings);
  } catch (err: any) {
    console.error('Error fetching listings:', err);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
}

// Create listing
export async function createListing(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const agentId = req.user?.agentId;

    if (!agentId) {
      res.status(403).json({ error: 'Agent ID required' });
      return;
    }

    const listing = req.body;
    const listingRef = db
      .collection('agents')
      .doc(agentId)
      .collection('listings')
      .doc();

    await listingRef.set({
      ...listing,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ id: listingRef.id, ...listing });
  } catch (err: any) {
    console.error('Error creating listing:', err);
    res.status(500).json({ error: 'Failed to create listing' });
  }
}

// Update listing
export async function updateListing(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const agentId = req.user?.agentId;
    const { id } = req.params;

    if (!agentId) {
      res.status(403).json({ error: 'Agent ID required' });
      return;
    }

    const listing = req.body;
    const listingRef = db
      .collection('agents')
      .doc(agentId)
      .collection('listings')
      .doc(id);

    await listingRef.set(
      {
        ...listing,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    res.json({ message: 'Listing updated successfully' });
  } catch (err: any) {
    console.error('Error updating listing:', err);
    res.status(500).json({ error: 'Failed to update listing' });
  }
}

// Delete listing
export async function deleteListing(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const agentId = req.user?.agentId;
    const { id } = req.params;

    if (!agentId) {
      res.status(403).json({ error: 'Agent ID required' });
      return;
    }

    await db
      .collection('agents')
      .doc(agentId)
      .collection('listings')
      .doc(id)
      .delete();

    res.json({ message: 'Listing deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting listing:', err);
    res.status(500).json({ error: 'Failed to delete listing' });
  }
}

// Get leads
export async function getLeads(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const agentId = req.user?.agentId;

    if (!agentId) {
      res.status(403).json({ error: 'Agent ID required' });
      return;
    }

    const leadsSnapshot = await db
      .collection('agents')
      .doc(agentId)
      .collection('leads')
      .orderBy('captured_at', 'desc')
      .get();

    const leads = leadsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(leads);
  } catch (err: any) {
    console.error('Error fetching leads:', err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
}

// Update lead
export async function updateLead(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const agentId = req.user?.agentId;
    const { id } = req.params;

    if (!agentId) {
      res.status(403).json({ error: 'Agent ID required' });
      return;
    }

    const lead = req.body;
    const leadRef = db
      .collection('agents')
      .doc(agentId)
      .collection('leads')
      .doc(id);

    await leadRef.set(
      {
        ...lead,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    res.json({ message: 'Lead updated successfully' });
  } catch (err: any) {
    console.error('Error updating lead:', err);
    res.status(500).json({ error: 'Failed to update lead' });
  }
}

// Get showings
export async function getShowings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const agentId = req.user?.agentId;

    if (!agentId) {
      res.status(403).json({ error: 'Agent ID required' });
      return;
    }

    const showingsSnapshot = await db
      .collection('agents')
      .doc(agentId)
      .collection('showings')
      .orderBy('scheduled_date', 'asc')
      .get();

    const showings = showingsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(showings);
  } catch (err: any) {
    console.error('Error fetching showings:', err);
    res.status(500).json({ error: 'Failed to fetch showings' });
  }
}

// Create showing
export async function createShowing(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const agentId = req.user?.agentId;

    if (!agentId) {
      res.status(403).json({ error: 'Agent ID required' });
      return;
    }

    const showing = req.body;
    const showingRef = db
      .collection('agents')
      .doc(agentId)
      .collection('showings')
      .doc();

    await showingRef.set({
      ...showing,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ id: showingRef.id, ...showing });
  } catch (err: any) {
    console.error('Error creating showing:', err);
    res.status(500).json({ error: 'Failed to create showing' });
  }
}

// Update showing
export async function updateShowing(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const agentId = req.user?.agentId;
    const { id } = req.params;

    if (!agentId) {
      res.status(403).json({ error: 'Agent ID required' });
      return;
    }

    const showing = req.body;
    const showingRef = db
      .collection('agents')
      .doc(agentId)
      .collection('showings')
      .doc(id);

    await showingRef.set(
      {
        ...showing,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    res.json({ message: 'Showing updated successfully' });
  } catch (err: any) {
    console.error('Error updating showing:', err);
    res.status(500).json({ error: 'Failed to update showing' });
  }
}

// Delete showing
export async function deleteShowing(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const agentId = req.user?.agentId;
    const { id } = req.params;

    if (!agentId) {
      res.status(403).json({ error: 'Agent ID required' });
      return;
    }

    await db
      .collection('agents')
      .doc(agentId)
      .collection('showings')
      .doc(id)
      .delete();

    res.json({ message: 'Showing deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting showing:', err);
    res.status(500).json({ error: 'Failed to delete showing' });
  }
}

// Get calls
export async function getCalls(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const agentId = req.user?.agentId;

    if (!agentId) {
      res.status(403).json({ error: 'Agent ID required' });
      return;
    }

    const limit = Number(req.query.limit || 50);

    const callsSnapshot = await db
      .collection('callSessions')
      .where('agentId', '==', agentId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const calls = callsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(calls);
  } catch (err: any) {
    console.error('Error fetching calls:', err);
    res.status(500).json({ error: 'Failed to fetch calls' });
  }
}

// Send listing flyer via email
export async function sendListingFlyer(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const agentId = req.user?.agentId;
    const { listingId, leadEmail, leadName, callId, leadId = null, confirmation = false } = req.body || {};

    if (!agentId) {
      res.status(403).json({ error: 'Agent ID required' });
      return;
    }

    if (!listingId || !leadEmail) {
      res.status(400).json({ error: 'listingId and leadEmail are required' });
      return;
    }

    if (!confirmation) {
      res.status(400).json({ error: 'Email send requires explicit confirmation' });
      return;
    }

    if (!EMAIL_REGEX.test(leadEmail)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    const logData = await sendFlyerEmailInternal({
      agentId,
      listingId,
      leadEmail,
      leadName,
      callId,
      leadId,
      isTest: false,
    });

    res.json({ message: 'Flyer sent', log: logData });
  } catch (err: any) {
    console.error('Error sending listing flyer:', err);
    res.status(500).json({ error: 'Failed to send listing flyer' });
  }
}

// Send test flyer (manual test to a specified email)
export async function sendListingFlyerTest(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const agentId = req.user?.agentId;
    const { listingId, testEmail } = req.body || {};

    if (!agentId) {
      res.status(403).json({ error: 'Agent ID required' });
      return;
    }

    if (!listingId || !testEmail) {
      res.status(400).json({ error: 'listingId and testEmail are required' });
      return;
    }

    if (!EMAIL_REGEX.test(testEmail)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    const logData = await sendFlyerEmailInternal({
      agentId,
      listingId,
      leadEmail: testEmail,
      leadName: 'Test Recipient',
      callId: null,
      leadId: null,
      isTest: true,
    });

    res.json({ message: 'Test flyer sent', log: logData });
  } catch (err: any) {
    console.error('Error sending test flyer:', err);
    res.status(500).json({ error: 'Failed to send test flyer' });
  }
}

// Get flyer send queue (pending/declined/failed)
export async function getFlyerQueue(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const agentId = req.user?.agentId;
    if (!agentId) {
      res.status(403).json({ error: 'Agent ID required' });
      return;
    }

    const limit = Number(req.query.limit || 50);
    const queueSnap = await db
      .collection('agents')
      .doc(agentId)
      .collection('flyerSendQueue')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const items = queueSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(items);
  } catch (err: any) {
    console.error('Error fetching flyer queue:', err);
    res.status(500).json({ error: 'Failed to fetch flyer queue' });
  }
}

// Get recent flyer send logs (sent/failed)
export async function getFlyerLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const agentId = req.user?.agentId;
    if (!agentId) {
      res.status(403).json({ error: 'Agent ID required' });
      return;
    }

    const limit = Number(req.query.limit || 50);
    const listingIdFilter = req.query.listingId as string | undefined;
    const leadIdFilter = req.query.leadId as string | undefined;

    let query: FirebaseFirestore.Query = db
      .collection('agents')
      .doc(agentId)
      .collection('emailLogs')
      .orderBy('sentAt', 'desc')
      .limit(limit);

    if (listingIdFilter) {
      query = query.where('listingId', '==', listingIdFilter);
    }
    if (leadIdFilter) {
      query = query.where('leadId', '==', leadIdFilter);
    }

    const snap = await query.get();
    const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(items);
  } catch (err: any) {
    console.error('Error fetching flyer logs:', err);
    res.status(500).json({ error: 'Failed to fetch flyer logs' });
  }
}

// Approve and send a queued flyer (requires flyerUrl and listingId)
export async function approveFlyerQueue(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const agentId = req.user?.agentId;
    const { id } = req.params;

    if (!agentId) {
      res.status(403).json({ error: 'Agent ID required' });
      return;
    }

    const queueRef = db.collection('agents').doc(agentId).collection('flyerSendQueue').doc(id);
    const queueSnap = await queueRef.get();

    if (!queueSnap.exists) {
      res.status(404).json({ error: 'Queue item not found' });
      return;
    }

    const queue = queueSnap.data() || {};
    if (queue.status && queue.status !== 'pending_agent_approval' && queue.status !== 'auto_send_ready') {
      res.status(400).json({ error: `Queue item not pending: ${queue.status}` });
      return;
    }

    if (!queue.listingId || !queue.flyerUrl || !queue.leadEmail) {
      res.status(400).json({ error: 'Queue item missing listingId, flyerUrl, or leadEmail' });
      return;
    }

    try {
      const logData = await sendFlyerEmailInternal({
        agentId,
        listingId: queue.listingId,
        leadEmail: queue.leadEmail,
        leadName: queue.leadName || null,
        callId: queue.callSid || queue.callId || null,
      });

      await queueRef.set(
        {
          status: 'sent',
          consentConfirmed: true,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          lastError: null,
          emailLog: logData,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      res.json({ message: 'Flyer sent', log: logData });
    } catch (sendErr: any) {
      await queueRef.set(
        {
          status: 'failed',
          lastError: sendErr?.message || 'Unknown send error',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      res.status(500).json({ error: sendErr?.message || 'Failed to send flyer' });
    }
  } catch (err: any) {
    console.error('Error approving flyer queue:', err);
    res.status(500).json({ error: 'Failed to approve flyer queue' });
  }
}

// Decline a queued flyer
export async function declineFlyerQueue(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const agentId = req.user?.agentId;
    const { id } = req.params;

    if (!agentId) {
      res.status(403).json({ error: 'Agent ID required' });
      return;
    }

    const queueRef = db.collection('agents').doc(agentId).collection('flyerSendQueue').doc(id);
    const queueSnap = await queueRef.get();

    if (!queueSnap.exists) {
      res.status(404).json({ error: 'Queue item not found' });
      return;
    }

    await queueRef.set(
      {
        status: 'declined',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    res.json({ message: 'Flyer request declined' });
  } catch (err: any) {
    console.error('Error declining flyer queue:', err);
    res.status(500).json({ error: 'Failed to decline flyer queue' });
  }
}

