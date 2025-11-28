# SendGrid Template IDs Configuration

Your SendGrid Dynamic Template IDs have been configured in the code. Here's the reference:

## Template IDs

| Template Name | Template ID | Usage |
|--------------|-------------|-------|
| `restaurant_invitation` | `d-5527db39a81a434fb306d0effa87557e` | New restaurant owner invitations |
| `team_invitation` | `d-e4858834722741e790aba9e32f9ba634` | Team member invitations |
| `order_confirmation_customer` | `d-2346ccf594c04f68b43e85b2118df3e4` | Customer order confirmations |
| `order_alert_restaurant` | `d-ff965bfab3274dcf936854f628052019` | Restaurant new order alerts |
| `support_auto-response` | `d-8f11631964b440d58bef4a7c15c3d2d5` | Support ticket auto-replies |
| `password_reset_merxus` | `d-634ccb3b1ac24c7a89f073bfafba192f` | Password reset emails |
| `reservation_summary` | `d-0879e7e7222748e79f624f2844596a07` | Reservation confirmations |
| `ai_transcript_summary` | `d-1112e02ff8294cc780be50ac8235d261` | AI call summaries |

## Current Status

✅ **Template IDs are hardcoded in the code** - They will be used automatically!

The code will:
1. Try to get template ID from Firebase Functions config (if you set it)
2. Try to get from environment variable (for local dev)
3. Fall back to the hardcoded default (which is already set)

## Optional: Override via Config

If you want to override the template IDs via config (useful if you create new versions), you can set:

```bash
firebase functions:config:set sendgrid.template_restaurant_invitation="d-5527db39a81a434fb306d0effa87557e"
firebase functions:config:set sendgrid.template_team_invitation="d-e4858834722741e790aba9e32f9ba634"
```

But this is optional since the IDs are already in the code.

## Template Variables

Make sure your SendGrid templates use these exact variable names:

### Restaurant Invitation (`restaurant_invitation`)
- `{{displayName}}` - Manager's name
- `{{restaurantName}}` - Restaurant name
- `{{invitationLink}}` - Password setup link
- `{{supportEmail}}` - Support email (defaults to support@merxusllc.com)

### Team Invitation (`team_invitation`)
- `{{displayName}}` - Team member's name
- `{{restaurantName}}` - Restaurant name
- `{{role}}` - Role (Owner/Manager/Staff)
- `{{invitationLink}}` - Password setup link
- `{{supportEmail}}` - Support email

## Testing

After deploying, test by:
1. Creating a new restaurant → Should use `restaurant_invitation` template
2. Inviting a team member → Should use `team_invitation` template
3. Check SendGrid dashboard → Activity to see emails sent

## Future Templates

The other templates (orders, support, etc.) are ready to use when you implement those features. The template IDs are already in `emailTemplates.ts` for easy reference.

