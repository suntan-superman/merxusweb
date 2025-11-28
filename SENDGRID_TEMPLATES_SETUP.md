# SendGrid Dynamic Templates Setup

You've created SendGrid Dynamic Templates! Here's how to integrate them with the code.

## Getting Your Template IDs

1. Log in to SendGrid
2. Go to **Email API** → **Dynamic Templates**
3. Find your template and click on it
4. Copy the **Template ID** (looks like: `d-1234567890abcdef`)

## Template IDs Needed

Based on your templates, you'll need template IDs for:

### Required for Current Features:
1. **Restaurant Invitation** (for new restaurant owners)
   - Template name: Create one called `restaurant_invitation` or similar
   - Template ID: `d-xxxxx`

2. **Team Invitation** (for staff/manager invites)
   - Template name: Create one called `team_invitation` or similar
   - Template ID: `d-xxxxx`

### Available for Future Use:
- `order_confirmation_customer` - Order confirmation emails
- `order_alert_restaurant` - New order notifications
- `support_auto_response` - Support ticket auto-replies
- `password_reset_merxus` - Password reset emails
- `reservation_confirmation` - Reservation confirmations
- `ai_transcript_summary` - AI call summaries

## Creating Missing Templates

You need to create templates for the invitation emails. In SendGrid:

1. Go to **Email API** → **Dynamic Templates**
2. Click **"Create a Dynamic Template"**
3. Name it: `restaurant_invitation`
4. Add a version and design your template using these variables:
   - `{{displayName}}` - Manager's name
   - `{{restaurantName}}` - Restaurant name
   - `{{invitationLink}}` - Password setup link
   - `{{supportEmail}}` - Support email

5. Repeat for `team_invitation` with:
   - `{{displayName}}`
   - `{{restaurantName}}`
   - `{{role}}` - Owner/Manager/Staff
   - `{{invitationLink}}`
   - `{{supportEmail}}`

## Configure Template IDs

Once you have the template IDs, set them in Firebase Functions config:

```bash
cd web
firebase functions:config:set sendgrid.template_restaurant_invitation="d-your-template-id-here"
firebase functions:config:set sendgrid.template_team_invitation="d-your-template-id-here"
```

Or for local development, add to `web/functions/.env`:
```env
SENDGRID_TEMPLATE_RESTAURANT_INVITATION=d-your-template-id-here
SENDGRID_TEMPLATE_TEAM_INVITATION=d-your-template-id-here
```

## How It Works

The code now supports both:
1. **Dynamic Templates** (if template IDs are configured) - Uses your SendGrid templates
2. **Inline HTML** (fallback) - Uses the built-in HTML templates

If you configure template IDs, it will use your SendGrid templates. Otherwise, it falls back to inline HTML.

## Template Variable Mapping

### Restaurant Invitation Template
The code sends these variables:
```json
{
  "displayName": "John Doe",
  "restaurantName": "Joe's Pizza",
  "invitationLink": "https://...",
  "supportEmail": "support@merxusllc.com"
}
```

### Team Invitation Template
The code sends these variables:
```json
{
  "displayName": "Jane Manager",
  "restaurantName": "Joe's Pizza",
  "role": "Manager",
  "invitationLink": "https://...",
  "supportEmail": "support@merxusllc.com"
}
```

Make sure your SendGrid templates use these exact variable names!

## Testing

After setting template IDs and deploying:

1. Create a new restaurant
2. Check SendGrid dashboard → **Activity** to see if email was sent
3. Verify the email uses your template design

## Future Email Functions

Once you're ready, we can add functions to use your other templates:
- Order confirmations
- Order alerts
- Support auto-replies
- Reservation confirmations
- AI transcript summaries

Just let me know when you want to implement those!

