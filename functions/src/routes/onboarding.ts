import { Request, Response } from 'express';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// Default AI prompt for voice/office
const defaultVoicePrompt = `You are the friendly AI phone receptionist for this business.
Your job is to greet callers professionally, answer questions accurately, route calls appropriately, and take messages when needed.

FOLLOW THESE RULES:

1. Professionalism
   - Speak clearly, warmly, and concisely
   - Keep the conversation moving — don't over-talk
   - Ask clarifying questions only when needed

2. Call Routing
   - Ask the caller what they need help with
   - Identify the appropriate department or person
   - Confirm before transferring: "I'll transfer you to [department/person] now"
   - If unavailable, offer to take a message

3. Message Taking
   - Ask for and REPEAT BACK the caller's full name clearly
   - Ask for and REPEAT BACK their phone number (say each digit clearly)
   - REPEAT BACK the message or inquiry details
   - Confirm if they need a callback and when
   - Give final summary: "So to confirm, [name], that's [message details]"

4. Boundaries
   - Do NOT provide medical, legal, or financial advice
   - Transfer to a human when the caller demands it
   - Be helpful but know your limits

5. Tone
   - Friendly, professional, and helpful
   - Match the business's personality and industry

You are the AI receptionist for this business.
Use the business's context and personality in your tone.`;

// Create new office (public onboarding endpoint)
export async function createOffice(req: Request, res: Response): Promise<void> {
  try {
    const { office, owner } = req.body;

    if (!office.name || !office.email) {
      res.status(400).json({ error: 'Business name and email are required' });
      return;
    }

    if (!owner.email || !owner.displayName) {
      res.status(400).json({ error: 'Owner email and name are required' });
      return;
    }

    // Generate office ID
    const officeId = `office_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create office document
    const officeRef = db.collection('offices').doc(officeId);
    await officeRef.set({
      email: office.email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      disabled: false,
    });

    // Create settings document
    await officeRef.collection('meta').doc('settings').set({
      officeId,
      name: office.name,
      email: office.email,
      phoneNumber: office.phoneNumber || '', // Optional - Twilio number will be configured later
      address: office.address || '',
      websiteUrl: office.websiteUrl || '',
      businessType: office.businessType || '',
      timezone: office.timezone || 'America/Los_Angeles',
      businessHours: {
        monday: { open: '09:00', close: '17:00', closed: false },
        tuesday: { open: '09:00', close: '17:00', closed: false },
        wednesday: { open: '09:00', close: '17:00', closed: false },
        thursday: { open: '09:00', close: '17:00', closed: false },
        friday: { open: '09:00', close: '17:00', closed: false },
        saturday: { open: '09:00', close: '17:00', closed: false },
        sunday: { open: '09:00', close: '17:00', closed: false },
      },
      routingRules: [],
      forwardingRules: [],
      notifySmsNumbers: [],
      notifyEmailAddresses: [office.email],
      aiConfig: {
        model: 'gpt-4o-mini',
        voiceName: 'alloy',
        language: 'en-US',
        systemPrompt: defaultVoicePrompt,
      },
    });

    // Create owner user
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(owner.email);
      // User exists, update their claims
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        role: 'owner',
        officeId,
        tenantId: officeId,
        type: 'voice',
      });
    } catch (error: any) {
      // User doesn't exist, create it
      if (error.code === 'auth/user-not-found') {
        try {
          userRecord = await admin.auth().createUser({
            email: owner.email,
            displayName: owner.displayName,
            emailVerified: false,
            disabled: false,
          });

          // Set custom claims
          await admin.auth().setCustomUserClaims(userRecord.uid, {
            role: 'owner',
            officeId,
            tenantId: officeId,
            type: 'voice',
          });
        } catch (createError: any) {
          console.error('Error creating user:', createError);
          throw new Error(`Failed to create user: ${createError.message}`);
        }
      } else {
        // Some other error occurred
        console.error('Error checking/getting user:', error);
        throw new Error(`Failed to process user: ${error.message}`);
      }
    }

    // Create user document in Firestore
    try {
      await officeRef.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: owner.displayName,
        role: 'owner',
        invitedAt: admin.firestore.FieldValue.serverTimestamp(),
        disabled: false,
      });
    } catch (firestoreError: any) {
      console.error('Error creating Firestore user document:', firestoreError);
      // Don't fail the whole operation, but log the error
    }

    // Generate password reset link
    let passwordResetLink: string;
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      passwordResetLink = await admin.auth().generatePasswordResetLink(owner.email, {
        url: `${frontendUrl}/login?mode=resetPassword&officeId=${officeId}`,
        handleCodeInApp: false,
      });
    } catch (linkError: any) {
      console.error('Error generating password reset link:', linkError);
      throw new Error(`Failed to generate invitation link: ${linkError.message}`);
    }

    // Send invitation email
    // Try SendGrid first (for branded emails) if configured, otherwise use Firebase Auth's built-in email
    let emailSent = false;
    
    // Check if SendGrid is configured (for backup/fallback use)
    let sendGridApiKey: string | undefined;
    
    try {
      const functions = await import('firebase-functions');
      // Try to access config - handle both v1 and v2 syntax
      try {
        const config = functions.default?.config?.() || functions.config?.();
        sendGridApiKey = config?.sendgrid?.api_key || process.env.SENDGRID_API_KEY;
      } catch (configError: any) {
        // Config might not be available in this context, fall back to env var
        sendGridApiKey = process.env.SENDGRID_API_KEY;
      }
      
      
      if (sendGridApiKey) {
        // SendGrid is configured - use it for branded emails
        try {
          const { sendOfficeInvitation } = await import('../utils/email');
          emailSent = await sendOfficeInvitation(
            owner.email,
            owner.displayName,
            office.name,
            passwordResetLink
          );
          // Email sent via SendGrid (logged silently)
        } catch (sendGridError: any) {
          // SendGrid failed, will fall back to Firebase Auth
        }
      }
    } catch (configError: any) {
      // If config check failed, still try to use env var
      sendGridApiKey = process.env.SENDGRID_API_KEY;
      // Continue - will try to send via SendGrid if env var is available
    }
    
    // If SendGrid not configured or failed, the link is still available
    // Firebase Auth will send the email automatically when the user uses the link
    // OR the frontend can call sendPasswordResetEmail() with the same email
    if (!emailSent) {
    }

    res.status(201).json({
      officeId,
      message: 'Office created successfully',
      userCreated: true,
      userEmail: owner.email,
      userId: userRecord.uid,
      emailSent,
      invitationLink: passwordResetLink, // Include in response for testing/debugging
    });
  } catch (err: any) {
    console.error('Error creating office:', err);
    res.status(500).json({ error: err.message || 'Failed to create office' });
  }
}

// Create new restaurant (public onboarding endpoint)
export async function createRestaurantPublic(req: Request, res: Response): Promise<void> {
  try {
    const { restaurant, manager } = req.body;

    if (!restaurant.name || !restaurant.email) {
      res.status(400).json({ error: 'Restaurant name and email are required' });
      return;
    }

    if (!manager.email || !manager.displayName) {
      res.status(400).json({ error: 'Manager email and name are required' });
      return;
    }

    // Generate restaurant ID
    const restaurantId = `rest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create restaurant document
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    await restaurantRef.set({
      email: restaurant.email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      disabled: false,
    });

    // Default AI prompt (Universal Restaurant Prompt)
    const defaultPrompt = `You are the friendly AI phone assistant for this restaurant.
Your job is to greet callers, answer questions accurately, and take orders or reservations professionally.

FOLLOW THESE RULES:

1. Menu Accuracy
   - Only mention items that exist in the restaurant's menu provided in your system instructions.
   - If the caller asks for something not on the menu, offer the closest valid alternative.
   - Never invent dishes, prices, or specials.

2. Communication Style
   - Speak clearly, warmly, and concisely.
   - Keep the conversation moving — don't over-talk.
   - Ask clarifying questions only when needed.

3. Order Taking
   - Follow the Merxus Order Capture Rules provided in your system instructions.
   - Always confirm each item, quantity, and modifiers.
   - Read back the full order at the end before submitting.

4. Boundaries
   - Do NOT provide medical, nutritional, or legal advice.
   - Never give cooking instructions or proprietary details.
   - Transfer to a human when the caller demands it.

5. Tone
   - Friendly, professional, and helpful.
   - If the restaurant is busy, apologize for delays politely.

You are the AI assistant for this restaurant.
Use the restaurant's cuisine style and personality in your tone.`;

    // Create settings document
    await restaurantRef.collection('meta').doc('settings').set({
      restaurantId,
      name: restaurant.name,
      email: restaurant.email,
      phoneNumber: restaurant.phoneNumber || '', // Optional - Twilio number will be configured later
      address: restaurant.address || '',
      timezone: restaurant.timezone || 'America/Los_Angeles',
      businessHours: {
        monday: { open: '11:00', close: '21:00', closed: false },
        tuesday: { open: '11:00', close: '21:00', closed: false },
        wednesday: { open: '11:00', close: '21:00', closed: false },
        thursday: { open: '11:00', close: '21:00', closed: false },
        friday: { open: '11:00', close: '21:00', closed: false },
        saturday: { open: '11:00', close: '21:00', closed: false },
        sunday: { open: '11:00', close: '21:00', closed: false },
      },
      notifySmsNumbers: [],
      notifyEmailAddresses: [restaurant.email],
      aiConfig: {
        model: 'gpt-4o-mini',
        voiceName: 'alloy',
        language: 'en-US',
        systemPrompt: defaultPrompt,
      },
    });

    // Create manager/owner user
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(manager.email);
      console.log(`User ${manager.email} already exists, updating claims...`);
      // User exists, update their claims
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        role: 'owner',
        restaurantId,
        tenantId: restaurantId,
        type: 'restaurant',
      });
    } catch (error: any) {
      // User doesn't exist, create it
      if (error.code === 'auth/user-not-found') {
        console.log(`Creating new user for ${manager.email}...`);
        try {
          userRecord = await admin.auth().createUser({
            email: manager.email,
            displayName: manager.displayName,
            emailVerified: false,
            disabled: false,
          });
          console.log(`Created new user ${userRecord.uid} for ${manager.email}`);

          // Set custom claims
          await admin.auth().setCustomUserClaims(userRecord.uid, {
            role: 'owner',
            restaurantId,
            tenantId: restaurantId,
            type: 'restaurant',
          });
        } catch (createError: any) {
          console.error('Error creating user:', createError);
          throw new Error(`Failed to create user: ${createError.message}`);
        }
      } else {
        // Some other error occurred
        console.error('Error checking/getting user:', error);
        throw new Error(`Failed to process user: ${error.message}`);
      }
    }

    // Create user document in Firestore
    try {
      await restaurantRef.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: manager.displayName,
        role: 'owner',
        invitedAt: admin.firestore.FieldValue.serverTimestamp(),
        disabled: false,
      });
    } catch (firestoreError: any) {
      console.error('Error creating Firestore user document:', firestoreError);
      // Don't fail the whole operation, but log the error
    }

    // Generate password reset link
    let passwordResetLink: string;
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      passwordResetLink = await admin.auth().generatePasswordResetLink(manager.email, {
        url: `${frontendUrl}/login?mode=resetPassword&restaurantId=${restaurantId}`,
        handleCodeInApp: false,
      });
    } catch (linkError: any) {
      console.error('Error generating password reset link:', linkError);
      throw new Error(`Failed to generate invitation link: ${linkError.message}`);
    }

    // Send invitation email via SendGrid (if configured) or return link for manual use
    let emailSent = false;
    try {
      const { sendRestaurantInvitation } = await import('../utils/email');
      emailSent = await sendRestaurantInvitation(
        manager.email,
        manager.displayName,
        restaurant.name,
        passwordResetLink
      );

      // Email sent via SendGrid (silent)
    } catch (emailError: any) {
      // SendGrid failed, will fall back to Firebase Auth
    }

    res.status(201).json({
      restaurantId,
      message: 'Restaurant created successfully',
      userCreated: true,
      userEmail: manager.email,
      userId: userRecord.uid,
      emailSent,
      invitationLink: passwordResetLink, // Include in response for testing/debugging
    });
  } catch (err: any) {
    console.error('Error creating restaurant:', err);
    res.status(500).json({ error: err.message || 'Failed to create restaurant' });
  }
}

// Default AI prompt for real estate agents
const defaultRealEstatePrompt = `You are the AI phone assistant for [Agent Name] with [Brand Name].

Your job is to:
- Answer questions about current listings
- Help callers find properties that match their criteria
- Collect lead information (name, phone, email, preferences)
- Schedule showing appointments
- Provide professional, friendly service

IMPORTANT:
- Always greet callers warmly: "Thank you for calling [Agent Name] with [Brand Name]"
- Ask qualifying questions to understand what the caller is looking for
- Collect contact information for follow-up
- Be professional and helpful, but never provide legal or financial advice
- If you don't know something, offer to have [Agent Name] call them back

You are the AI assistant for a real estate agent. Help callers find their perfect home!`;

// Create new real estate agent (public onboarding endpoint)
export async function createAgent(req: Request, res: Response): Promise<void> {
  try {
    const { agent, owner } = req.body;

    if (!agent.name || !agent.email) {
      res.status(400).json({ error: 'Agent name and email are required' });
      return;
    }

    if (!owner.email || !owner.displayName) {
      res.status(400).json({ error: 'Owner email and name are required' });
      return;
    }

    // Generate agent ID
    const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Default brand name to "[Name] Team" if not provided
    const brandName = agent.brandName?.trim() || `${agent.name} Team`;

    // Parse markets array (handle comma or newline separated)
    const marketsArray = agent.markets
      ? (Array.isArray(agent.markets) 
          ? agent.markets 
          : agent.markets.split(/[,\n]/).map((m: string) => m.trim()).filter((m: string) => m.length > 0))
      : [];

    // Create agent document
    const agentRef = db.collection('agents').doc(agentId);
    await agentRef.set({
      email: agent.email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      disabled: false,
    });

    // Create settings document
    await agentRef.collection('meta').doc('settings').set({
      agentId,
      name: agent.name,
      brandName,
      email: agent.email,
      phonePrimary: agent.phoneNumber || '',
      phoneNumber: agent.phoneNumber || '', // Alias for compatibility
      address: agent.address || '',
      websiteUrl: agent.websiteUrl || '',
      brokerage: agent.brokerage?.trim() || null,
      licenseNumber: agent.licenseNumber?.trim() || null,
      markets: marketsArray,
      languagesSupported: ['en', 'es'], // Default to English and Spanish
      timezone: agent.timezone || 'America/Los_Angeles',
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
          message_en: `Thanks for calling ${brandName}. Our office is currently closed. I can take a message and have ${agent.name} contact you as soon as possible.`,
          message_es: `Gracias por llamar a ${brandName}. En este momento la oficina está cerrada. Puedo tomar un mensaje para que ${agent.name} se comunique con usted lo antes posible.`,
        },
      },
      notifySmsNumbers: [],
      notifyEmailAddresses: [agent.email],
      aiConfig: {
        model: 'gpt-4o-mini',
        voiceName: 'alloy',
        language: 'en-US',
        systemPrompt: defaultRealEstatePrompt.replace('[Agent Name]', agent.name).replace('[Brand Name]', brandName),
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
      // Twilio configuration (to be set up later)
      twilioPhoneNumber: '',
      twilioNumberSid: '',
    });

    // Create owner user
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(owner.email);
      // User exists, update their claims
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        role: 'owner',
        agentId,
        tenantId: agentId,
        type: 'real_estate',
      });
    } catch (error: any) {
      // User doesn't exist, create it
      if (error.code === 'auth/user-not-found') {
        try {
          userRecord = await admin.auth().createUser({
            email: owner.email,
            displayName: owner.displayName,
            emailVerified: false,
            disabled: false,
          });

          // Set custom claims
          await admin.auth().setCustomUserClaims(userRecord.uid, {
            role: 'owner',
            agentId,
            tenantId: agentId,
            type: 'real_estate',
          });
        } catch (createError: any) {
          console.error('Error creating user:', createError);
          throw new Error(`Failed to create user: ${createError.message}`);
        }
      } else {
        // Some other error occurred
        console.error('Error checking/getting user:', error);
        throw new Error(`Failed to process user: ${error.message}`);
      }
    }

    // Create user document in Firestore
    try {
      await agentRef.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: owner.displayName,
        role: 'owner',
        invitedAt: admin.firestore.FieldValue.serverTimestamp(),
        disabled: false,
      });
    } catch (firestoreError: any) {
      console.error('Error creating Firestore user document:', firestoreError);
      // Don't fail the whole operation, but log the error
    }

    // Generate password reset link
    let passwordResetLink: string;
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      passwordResetLink = await admin.auth().generatePasswordResetLink(owner.email, {
        url: `${frontendUrl}/login?mode=resetPassword&agentId=${agentId}`,
        handleCodeInApp: false,
      });
    } catch (linkError: any) {
      console.error('Error generating password reset link:', linkError);
      throw new Error(`Failed to generate invitation link: ${linkError.message}`);
    }

    // Send invitation email
    // Try SendGrid first (for branded emails) if configured, otherwise use Firebase Auth's built-in email
    let emailSent = false;
    
    // Check if SendGrid is configured
    let sendGridApiKey: string | undefined;
    
    try {
      const functions = await import('firebase-functions');
      // Try to access config - handle both v1 and v2 syntax
      try {
        const config = functions.default?.config?.() || functions.config?.();
        sendGridApiKey = config?.sendgrid?.api_key || process.env.SENDGRID_API_KEY;
      } catch (configError: any) {
        // Config might not be available in this context, fall back to env var
        sendGridApiKey = process.env.SENDGRID_API_KEY;
      }
      
      if (sendGridApiKey) {
        // SendGrid is configured - use it for branded emails
        try {
          const { sendOfficeInvitation } = await import('../utils/email');
          // Reuse office invitation template for now (can create agent-specific template later)
          emailSent = await sendOfficeInvitation(
            owner.email,
            owner.displayName,
            brandName,
            passwordResetLink
          );
        } catch (sendGridError: any) {
          // SendGrid failed, will fall back to Firebase Auth
        }
      }
    } catch (configError: any) {
      // If config check failed, still try to use env var
      sendGridApiKey = process.env.SENDGRID_API_KEY;
    }
    
    // If SendGrid not configured or failed, the link is still available
    // Firebase Auth will send the email automatically when the user uses the link
    // OR the frontend can call sendPasswordResetEmail() with the same email
    if (!emailSent) {
    }

    res.status(201).json({
      agentId,
      message: 'Agent account created successfully',
      userCreated: true,
      userEmail: owner.email,
      userId: userRecord.uid,
      emailSent,
      invitationLink: passwordResetLink, // Include in response for testing/debugging
    });
  } catch (err: any) {
    console.error('Error creating agent:', err);
    res.status(500).json({ error: err.message || 'Failed to create agent' });
  }
}

// Resend invitation email (public endpoint - for users who didn't receive email)
export async function resendInvitationEmail(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Valid email address is required' });
      return;
    }

    // Find user in Firebase Auth
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        res.status(404).json({ error: 'No account found with this email address' });
        return;
      }
      throw error;
    }

    // Get user's custom claims to determine tenant type
    const customClaims = userRecord.customClaims || {};
    const tenantType = customClaims.type;
    const officeId = customClaims.officeId;
    const restaurantId = customClaims.restaurantId;
    const displayName = userRecord.displayName || email.split('@')[0];

    if (!tenantType) {
      res.status(400).json({ error: 'User account is not properly configured. Please contact support.' });
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    let passwordResetLink: string;
    let tenantName = '';
    let emailSent = false;

    // Generate password reset link based on tenant type
    if (tenantType === 'voice' && officeId) {
      // Voice/Office user
      passwordResetLink = await admin.auth().generatePasswordResetLink(email, {
        url: `${frontendUrl}/login?mode=resetPassword&officeId=${officeId}`,
        handleCodeInApp: false,
      });

      // Get office name
      const officeDoc = await db.collection('offices').doc(officeId).get();
      if (officeDoc.exists) {
        const settingsDoc = await officeDoc.ref.collection('meta').doc('settings').get();
        tenantName = settingsDoc.data()?.name || 'your office';
      }

      // Try to send email via SendGrid
      try {
        const { sendOfficeInvitation } = await import('../utils/email');
        emailSent = await sendOfficeInvitation(
          email,
          displayName,
          tenantName || 'your office',
          passwordResetLink
        );
      } catch (emailError: any) {
      }
    } else if (tenantType === 'restaurant' && restaurantId) {
      // Restaurant user
      passwordResetLink = await admin.auth().generatePasswordResetLink(email, {
        url: `${frontendUrl}/login?mode=resetPassword&restaurantId=${restaurantId}`,
        handleCodeInApp: false,
      });

      // Get restaurant name
      const restaurantDoc = await db.collection('restaurants').doc(restaurantId).get();
      if (restaurantDoc.exists) {
        const settingsDoc = await restaurantDoc.ref.collection('meta').doc('settings').get();
        tenantName = settingsDoc.data()?.name || 'your restaurant';
      }

      // Try to send email via SendGrid
      try {
        const { sendRestaurantInvitation } = await import('../utils/email');
        emailSent = await sendRestaurantInvitation(
          email,
          displayName,
          tenantName || 'your restaurant',
          passwordResetLink
        );
      } catch (emailError: any) {
      }
    } else {
      res.status(400).json({ error: 'User account is not properly configured. Please contact support.' });
      return;
    }

    res.json({
      success: true,
      message: emailSent 
        ? 'Invitation email has been resent successfully' 
        : 'Password reset link generated. Please check your email or use the link provided.',
      emailSent,
      invitationLink: passwordResetLink,
      email,
    });
  } catch (err: any) {
    console.error('Error resending invitation email:', err);
    res.status(500).json({ error: err.message || 'Failed to resend invitation email' });
  }
}

