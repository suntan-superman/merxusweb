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

