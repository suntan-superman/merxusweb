/**
 * Email utility for sending invitations and notifications
 * Uses SendGrid for email delivery
 */

interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
  disableClickTracking?: boolean;
}

/**
 * Send an email using SendGrid
 * Supports both Dynamic Templates and inline HTML
 * Returns true if sent successfully, false otherwise
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // Try Firebase Functions config first (production), then environment variables (local)
  const functions = await import('firebase-functions');
  
  let sendGridApiKey: string | undefined;
  let fromEmail: string;
  
  try {
    // Try to access config - handle both v1 and v2 syntax
    const config = functions.default?.config?.() || functions.config?.();
    sendGridApiKey = config?.sendgrid?.api_key || process.env.SENDGRID_API_KEY;
    fromEmail = config?.sendgrid?.from_email || 
                 process.env.SENDGRID_FROM_EMAIL || 
                 'noreply@merxus.ai';
  } catch (configError: any) {
    // Config might not be available, fall back to env vars
    sendGridApiKey = process.env.SENDGRID_API_KEY;
    fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@merxus.ai';
    console.log('[Email] Could not access functions.config(), using env vars:', configError.message);
  }

  // If SendGrid is not configured, log and return false
  if (!sendGridApiKey) {
    console.warn('SendGrid API key not configured. Email not sent to:', options.to);
    console.warn('Email content:', options.subject);
    return false;
  }

  try {
    // Dynamic import to avoid requiring SendGrid if not configured
    const sgMail = await import('@sendgrid/mail');
    sgMail.default.setApiKey(sendGridApiKey);

    const msg: any = {
      to: options.to,
      from: fromEmail,
      subject: options.subject,
    };

    // Use Dynamic Template if provided
    if (options.templateId && options.dynamicTemplateData) {
      msg.templateId = options.templateId;
      msg.dynamicTemplateData = options.dynamicTemplateData;
    } else if (options.html) {
      // Fallback to inline HTML
      msg.html = options.html;
      msg.text = options.text || options.html.replace(/<[^>]*>/g, '');
    } else {
      throw new Error('Either templateId with dynamicTemplateData or html must be provided');
    }

    // Disable click tracking if requested (prevents SendGrid from wrapping URLs)
    if (options.disableClickTracking) {
      msg.trackingSettings = {
        clickTracking: {
          enable: false,
        },
      };
    }

    await sgMail.default.send(msg);

    console.log('Email sent successfully to:', options.to);
    return true;
  } catch (error: any) {
    console.error('Error sending email:', error);
    if (error.response) {
      console.error('SendGrid error details:', error.response.body);
    }
    return false;
  }
}

/**
 * Send restaurant invitation email to manager/owner
 * Uses SendGrid Dynamic Template if template ID is configured, otherwise falls back to inline HTML
 */
export async function sendRestaurantInvitation(
  email: string,
  displayName: string,
  restaurantName: string,
  invitationLink: string
): Promise<boolean> {
  const { SENDGRID_TEMPLATES } = await import('./emailTemplates');
  
  // Get template ID safely
  let templateId: string;
  try {
    const functions = await import('firebase-functions');
    const config = functions.default?.config?.() || functions.config?.();
    templateId = config?.sendgrid?.template_restaurant_invitation ||
                 process.env.SENDGRID_TEMPLATE_RESTAURANT_INVITATION ||
                 SENDGRID_TEMPLATES.RESTAURANT_INVITATION;
  } catch {
    templateId = process.env.SENDGRID_TEMPLATE_RESTAURANT_INVITATION ||
                 SENDGRID_TEMPLATES.RESTAURANT_INVITATION;
  }

  // Use Dynamic Template if configured
  if (templateId) {
    return sendEmail({
      to: email,
      subject: `Welcome to Merxus - Manage ${restaurantName}`,
      templateId,
      dynamicTemplateData: {
        displayName,
        restaurantName,
        invitationLink,
        supportEmail: 'support@merxusllc.com',
      },
    });
  }

  // Fallback to inline HTML
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Merxus</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #10b981; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">Welcome to Merxus!</h1>
      </div>
      <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p>Hi ${displayName},</p>
        <p>You've been invited to manage <strong>${restaurantName}</strong> on the Merxus platform.</p>
        <p>As the owner, you'll have full access to manage orders, customers, menu items, and your team.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${invitationLink}" 
             style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Set Up Your Account
          </a>
        </div>
        <p style="font-size: 14px; color: #6b7280;">
          Or copy and paste this link into your browser:<br>
          <a href="${invitationLink}" style="color: #10b981; word-break: break-all;">${invitationLink}</a>
        </p>
        <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
          This link will allow you to set your password and access your restaurant portal.
        </p>
        <p style="font-size: 14px; color: #6b7280;">
          If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
      <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #9ca3af;">
        <p>© ${new Date().getFullYear()} Merxus. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Welcome to Merxus - Manage ${restaurantName}`,
    html,
  });
}

/**
 * Send office invitation email (for voice tenants)
 * Uses SendGrid Dynamic Template if template ID is configured, otherwise falls back to inline HTML
 */
export async function sendOfficeInvitation(
  email: string,
  displayName: string,
  officeName: string,
  invitationLink: string
): Promise<boolean> {
  const { SENDGRID_TEMPLATES } = await import('./emailTemplates');
  
  // Get template ID safely
  let templateId: string;
  try {
    const functions = await import('firebase-functions');
    const config = functions.default?.config?.() || functions.config?.();
    templateId = config?.sendgrid?.template_office_invitation ||
                 process.env.SENDGRID_TEMPLATE_OFFICE_INVITATION ||
                 SENDGRID_TEMPLATES.OFFICE_INVITATION;
  } catch {
    templateId = process.env.SENDGRID_TEMPLATE_OFFICE_INVITATION ||
                 SENDGRID_TEMPLATES.OFFICE_INVITATION;
  }

  // Use Dynamic Template if configured
  if (templateId) {
    return sendEmail({
      to: email,
      subject: `Welcome to Merxus Voice - Manage ${officeName}`,
      templateId,
      dynamicTemplateData: {
        displayName,
        officeName,
        invitationLink,
        supportEmail: 'support@merxusllc.com',
      },
    });
  }

  // Fallback to inline HTML
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Merxus Voice</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #10b981; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">Welcome to Merxus Voice!</h1>
      </div>
      <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p>Hi ${displayName},</p>
        <p>You've been invited to manage <strong>${officeName}</strong> on the Merxus Voice platform.</p>
        <p>As the owner, you'll have full access to manage calls, routing rules, voicemail, and your team.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${invitationLink}" 
             style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Set Up Your Account
          </a>
        </div>
        <p style="font-size: 14px; color: #6b7280;">
          Or copy and paste this link into your browser:<br>
          <a href="${invitationLink}" style="color: #10b981; word-break: break-all;">${invitationLink}</a>
        </p>
        <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
          This link will allow you to set your password and access your office portal.
        </p>
        <p style="font-size: 14px; color: #6b7280;">
          If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
      <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #9ca3af;">
        <p>© ${new Date().getFullYear()} Merxus. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Welcome to Merxus Voice - Manage ${officeName}`,
    html,
  });
}

/**
 * Send team member invitation email
 * Uses SendGrid Dynamic Template if template ID is configured, otherwise falls back to inline HTML
 */
export async function sendTeamInvitation(
  email: string,
  displayName: string,
  restaurantName: string,
  role: string,
  invitationLink: string
): Promise<boolean> {
  const { SENDGRID_TEMPLATES } = await import('./emailTemplates');
  
  // Get template ID safely
  let templateId: string;
  try {
    const functions = await import('firebase-functions');
    const config = functions.default?.config?.() || functions.config?.();
    templateId = config?.sendgrid?.template_team_invitation ||
                 process.env.SENDGRID_TEMPLATE_TEAM_INVITATION ||
                 SENDGRID_TEMPLATES.TEAM_INVITATION;
  } catch {
    templateId = process.env.SENDGRID_TEMPLATE_TEAM_INVITATION ||
                 SENDGRID_TEMPLATES.TEAM_INVITATION;
  }

  const roleDisplay = role === 'owner' ? 'Owner' : role === 'manager' ? 'Manager' : 'Staff';

  // Use Dynamic Template if configured
  if (templateId) {
    return sendEmail({
      to: email,
      subject: `You're Invited to Join ${restaurantName} on Merxus`,
      templateId,
      dynamicTemplateData: {
        displayName: displayName || email.split('@')[0],
        restaurantName,
        role: roleDisplay,
        invitationLink,
        supportEmail: 'support@merxusllc.com',
      },
    });
  }

  // Fallback to inline HTML
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>You're Invited to Join ${restaurantName}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #10b981; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">You're Invited!</h1>
      </div>
      <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p>Hi ${displayName || email},</p>
        <p>You've been invited to join <strong>${restaurantName}</strong> on the Merxus platform as a <strong>${roleDisplay}</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${invitationLink}" 
             style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Accept Invitation
          </a>
        </div>
        <p style="font-size: 14px; color: #6b7280;">
          Or copy and paste this link into your browser:<br>
          <a href="${invitationLink}" style="color: #10b981; word-break: break-all;">${invitationLink}</a>
        </p>
        <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
          This link will allow you to set your password and access the restaurant portal.
        </p>
        <p style="font-size: 14px; color: #6b7280;">
          If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
      <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #9ca3af;">
        <p>© ${new Date().getFullYear()} Merxus. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `You're Invited to Join ${restaurantName} on Merxus`,
    html,
  });
}

/**
 * Send new signup notification to sales team
 * Alerts sales@merxusllc.com whenever a new tenant is created
 */
export async function sendSalesNotification(signupData: {
  tenantType: string;
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  plan?: string;
  twilioNumber?: string;
  tenantId: string;
}): Promise<boolean> {
  const {
    tenantType,
    businessName,
    ownerName,
    ownerEmail,
    phone,
    address,
    city,
    state,
    zip,
    plan,
    twilioNumber,
    tenantId,
  } = signupData;

  // Format tenant type for display
  const tenantTypeDisplay = {
    'restaurant': '🍽️ Restaurant',
    'voice': '📞 Professional Office',
    'real_estate': '🏡 Real Estate',
    'general': '💼 General Business',
  }[tenantType] || tenantType;

  // Build location string
  const location = [city, state, zip].filter(Boolean).join(', ');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Merxus Signup!</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #10b981; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">🎉 New Signup!</h1>
      </div>
      <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; color: #10b981; font-weight: bold;">A new user just signed up for Merxus!</p>
        
        <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; font-weight: bold; color: #6b7280; width: 35%;">Tenant Type:</td>
            <td style="padding: 12px 0;">${tenantTypeDisplay}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; font-weight: bold; color: #6b7280;">Business Name:</td>
            <td style="padding: 12px 0;">${businessName}</td>
          </tr>
          ${plan ? `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; font-weight: bold; color: #6b7280;">Plan:</td>
            <td style="padding: 12px 0;">${plan}</td>
          </tr>
          ` : ''}
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; font-weight: bold; color: #6b7280;">Owner Name:</td>
            <td style="padding: 12px 0;">${ownerName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; font-weight: bold; color: #6b7280;">Email:</td>
            <td style="padding: 12px 0;"><a href="mailto:${ownerEmail}" style="color: #10b981;">${ownerEmail}</a></td>
          </tr>
          ${phone ? `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; font-weight: bold; color: #6b7280;">Phone:</td>
            <td style="padding: 12px 0;"><a href="tel:${phone}" style="color: #10b981;">${phone}</a></td>
          </tr>
          ` : ''}
          ${twilioNumber ? `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; font-weight: bold; color: #6b7280;">Twilio Number:</td>
            <td style="padding: 12px 0;"><a href="tel:${twilioNumber}" style="color: #10b981;">${twilioNumber}</a></td>
          </tr>
          ` : ''}
          ${location ? `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; font-weight: bold; color: #6b7280;">Location:</td>
            <td style="padding: 12px 0;">${location}</td>
          </tr>
          ` : ''}
          ${address ? `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; font-weight: bold; color: #6b7280;">Address:</td>
            <td style="padding: 12px 0;">${address}</td>
          </tr>
          ` : ''}
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; font-weight: bold; color: #6b7280;">Tenant ID:</td>
            <td style="padding: 12px 0; font-family: monospace; font-size: 12px;">${tenantId}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; font-weight: bold; color: #6b7280;">Signed Up:</td>
            <td style="padding: 12px 0;">${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PST</td>
          </tr>
        </table>

        <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #065f46;">
            <strong>Next Steps:</strong><br>
            • Follow up with a welcome call<br>
            • Schedule onboarding/demo if needed<br>
            • Monitor for support requests
          </p>
        </div>
      </div>
      <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #9ca3af;">
        <p>This is an automated notification from Merxus.</p>
        <p>© ${new Date().getFullYear()} Merxus. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: 'sales@merxusllc.com',
    subject: `🎉 New ${tenantTypeDisplay} Signup - ${businessName}`,
    html,
  });
}

/**
 * Get all super admin email addresses from Firestore
 */
export async function getSuperAdminEmails(): Promise<string[]> {
  try {
    const admin = await import('firebase-admin');
    const db = admin.default.firestore();
    
    // Query users collection for super admins
    const usersSnapshot = await db.collection('users').where('role', '==', 'merxus_admin').get();
    
    const emails: string[] = [];
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.email && !userData.disabled) {
        emails.push(userData.email);
      }
    });

    console.log(`[getSuperAdminEmails] Found ${emails.length} active super admin(s)`);
    return emails;
  } catch (error) {
    console.error('[getSuperAdminEmails] Error:', error);
    return [];
  }
}

/**
 * Send notification to all super admins about new signup
 */
export async function notifySuperAdminsNewSignup(
  tenantType: 'restaurant' | 'voice' | 'real_estate',
  tenantData: {
    id: string;
    name: string;
    email: string;
    ownerName: string;
    ownerEmail: string;
    phone?: string;
    twilioNumber?: string;
  }
): Promise<void> {
  try {
    const superAdminEmails = await getSuperAdminEmails();
    
    if (superAdminEmails.length === 0) {
      console.warn('[notifySuperAdminsNewSignup] No super admins found to notify');
      return;
    }

    const tenantTypeLabel = tenantType === 'real_estate' ? 'Real Estate Agent' : 
                            tenantType === 'voice' ? 'Voice/Office' : 
                            'Restaurant';

    const subject = `🎉 New ${tenantTypeLabel} Signup: ${tenantData.name}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 650px; margin: 0 auto; padding: 0; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 32px; font-weight: 700; }
          .header p { margin: 12px 0 0 0; opacity: 0.95; font-size: 18px; }
          .content { background: #ffffff; padding: 40px 30px; }
          .section-title { color: #111827; font-size: 20px; font-weight: 600; margin: 30px 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #10b981; }
          .section-title:first-child { margin-top: 0; }
          .info-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 15px 0; }
          .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
          .info-row:last-child { border-bottom: none; }
          .label { font-weight: 600; color: #6b7280; flex-shrink: 0; margin-right: 20px; }
          .value { color: #111827; text-align: right; word-break: break-word; }
          .value code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 13px; font-family: monospace; }
          .cta-section { text-align: center; margin: 35px 0; }
          .cta-button { display: inline-block; background: #10b981; color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2); }
          .footer { text-align: center; padding: 30px; background: #f9fafb; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
          .footer p { margin: 8px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 New Customer Signup!</h1>
            <p>${tenantTypeLabel} Account Created</p>
          </div>
          
          <div class="content">
            <h2 class="section-title">Business Information</h2>
            <div class="info-card">
              <div class="info-row">
                <span class="label">Business Name:</span>
                <span class="value"><strong>${tenantData.name}</strong></span>
              </div>
              <div class="info-row">
                <span class="label">Business Email:</span>
                <span class="value">${tenantData.email}</span>
              </div>
              ${tenantData.phone ? `
              <div class="info-row">
                <span class="label">Business Phone:</span>
                <span class="value">${tenantData.phone}</span>
              </div>
              ` : ''}
              ${tenantData.twilioNumber ? `
              <div class="info-row">
                <span class="label">AI Phone Number:</span>
                <span class="value"><strong>${tenantData.twilioNumber}</strong></span>
              </div>
              ` : ''}
            </div>

            <h2 class="section-title">Owner Information</h2>
            <div class="info-card">
              <div class="info-row">
                <span class="label">Owner Name:</span>
                <span class="value"><strong>${tenantData.ownerName}</strong></span>
              </div>
              <div class="info-row">
                <span class="label">Owner Email:</span>
                <span class="value">${tenantData.ownerEmail}</span>
              </div>
            </div>

            <h2 class="section-title">Account Details</h2>
            <div class="info-card">
              <div class="info-row">
                <span class="label">Account Type:</span>
                <span class="value">${tenantTypeLabel}</span>
              </div>
              <div class="info-row">
                <span class="label">Tenant ID:</span>
                <span class="value"><code>${tenantData.id}</code></span>
              </div>
              <div class="info-row">
                <span class="label">Trial Status:</span>
                <span class="value">✅ <strong>14-day free trial started</strong></span>
              </div>
              <div class="info-row">
                <span class="label">Created:</span>
                <span class="value">${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>
            </div>

            <div class="cta-section">
              <a href="https://app.merxus.com/merxus" class="cta-button">
                View in Admin Dashboard →
              </a>
            </div>
          </div>

          <div class="footer">
            <p><strong>Merxus Platform</strong> • Super Admin Notification</p>
            <p style="font-size: 12px; margin-top: 15px;">
              This is an automated notification. You're receiving this because you're a Merxus super admin.
            </p>
            <p style="font-size: 12px; color: #9ca3af;">
              © ${new Date().getFullYear()} Merxus. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
New ${tenantTypeLabel} Signup

BUSINESS INFORMATION:
- Business Name: ${tenantData.name}
- Business Email: ${tenantData.email}
${tenantData.phone ? `- Business Phone: ${tenantData.phone}\n` : ''}
${tenantData.twilioNumber ? `- AI Phone Number: ${tenantData.twilioNumber}\n` : ''}

OWNER INFORMATION:
- Owner Name: ${tenantData.ownerName}
- Owner Email: ${tenantData.ownerEmail}

ACCOUNT DETAILS:
- Account Type: ${tenantTypeLabel}
- Tenant ID: ${tenantData.id}
- Trial Status: 14-day free trial started
- Created: ${new Date().toLocaleString()}

View in Admin Dashboard: https://app.merxus.com/merxus

---
Merxus Platform - Super Admin Notification
    `.trim();

    // Send email to all super admins
    const emailPromises = superAdminEmails.map(email => 
      sendEmail({
        to: email,
        subject,
        html,
        text,
      })
    );

    await Promise.all(emailPromises);
    
    console.log(`[notifySuperAdminsNewSignup] ✅ Sent notification to ${superAdminEmails.length} super admin(s): ${superAdminEmails.join(', ')}`);
  } catch (error) {
    console.error('[notifySuperAdminsNewSignup] Error sending notification:', error);
    // Don't throw - notification failure shouldn't break signup
  }
}

