import { Response } from 'express';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest } from '../middleware/auth';

const db = admin.firestore();

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

