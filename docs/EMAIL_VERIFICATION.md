# Email Verification & Form Account System

## Overview

This system provides email verification for forms and tracks users across form submissions using a device-level "form account" cookie. It supports:

1. **Email field verification** - Form creators can require email addresses to be verified before submission
2. **Form account tracking** - Anonymous users get a device-level UUID that persists across forms
3. **One-response enforcement** - Two levels:
   - **One response per email** - Same email can't submit twice
   - **One response per user** - Same device/account can't submit twice, even with different emails

## Database Schema

### FormAccountUUID
Tracks anonymous users across forms:
- `id` - Unique device/account identifier (stored in cookie)
- `verifiedEmails` - Array of verified email addresses
- `verifiedPhones` - Array of verified phone numbers
- `ipAddresses` - JSON array of IPs used
- `deviceMetrics` - JSON object with user agent, platform, etc.
- `formsViewed` - JSON array of form views
- `formsSubmitted` - JSON array of submissions

### EmailVerificationRecord
Tracks email verification requests:
- Links to Form and FormAccount
- Contains verification token hash
- Expires after 30 minutes

### Form
New fields:
- `oneResponsePerEmail` - Boolean, prevents same email from submitting twice
- `oneResponsePerUser` - Boolean, prevents same device/account from submitting twice

### Response
New field:
- `formAccountId` - Links submission to form account for enforcement

## API Endpoints

### Email Verification
- `POST /api/verify-email/send` - Send verification email
  - Body: `{ email, formId }`
  - Returns: `{ success, message }`
  
- `GET /api/verify-email/verify?token=...&formAccountId=...` - Verify email via link
  - Returns HTML page with verification status
  
- `GET /api/verify-email/account` - Get current user's verified emails
  - Returns: `{ formAccountId, verifiedEmails[] }`

### Form Public ID
- `GET /api/forms/public/[publicId]` - Get form ID from public ID
  - Used by verification flow

### Form Settings
Extended to support:
- `oneResponsePerEmail`
- `oneResponsePerUser`

### Form Submission
- `POST /api/submit/[publicId]` - Enhanced with:
  - Email verification check (if field requires it)
  - One-response-per-email enforcement
  - One-response-per-user enforcement
  - Form account tracking

## UI Components

### Editor.tsx
- Email fields now have a "Verify email" toggle switch
- When enabled, users must verify their email address before submitting

### SettingsTab.tsx
New response control options:
- **Limit to one response per email** - Checkbox
- **Limit to one response per user** - Checkbox

### PublicForm.tsx
Enhanced email field rendering when verification is required:
- Shows list of already-verified emails (radio buttons)
- Allows adding new email with verification button
- Displays verification status (verified, pending, not verified)
- Integration with verification popup (auto-updates when popup completes)

## User Flow

### Email Verification Flow
1. User fills out form with email field that requires verification
2. User either:
   - Selects a previously verified email (instant), OR
   - Enters a new email and clicks "Verify"
3. System sends verification email with 30-minute expiration
4. User clicks link in email
5. Verification page opens (can be popup)
6. On success, page posts message back to form
7. Form UI updates to show verified status
8. User can now submit the form

### One Response Per Email
When enabled:
- System checks if email has already submitted this form
- If yes, submission is rejected with error message
- Works even if user has multiple devices/accounts

### One Response Per User
When enabled:
- System checks if form account UUID has already submitted this form
- If yes, submission is rejected with error message
- Prevents multiple submissions even with different emails

## Cookie & Tracking

### form_account_uuid Cookie
- Created automatically on first form view
- HTTPOnly, Secure (in production), SameSite=Lax
- 1-year expiration
- Links to FormAccountUUID database record

### Tracking Data
The system tracks (for form analytics and enforcement):
- IP addresses used
- Device metrics (user agent, platform, mobile indicator)
- Forms viewed (with timestamps)
- Forms submitted (with timestamps)
- Verified email/phone numbers

## Security

### Token Hashing
- Verification tokens are hashed (SHA-256) before storage
- Only token hashes are stored in database
- Tokens are 32-byte random hex strings

### Email Validation
- Basic regex validation on client and server
- Case-insensitive comparison for matching
- Trimmed whitespace

### Expiration
- Verification links expire after 30 minutes
- Expired links show user-friendly error message

### Rate Limiting
Not currently implemented - consider adding:
- Max verification emails per IP per hour
- Max verification emails per form per email per day

## Environment Variables

Required in `.env`:
```env
RESEND_API_KEY=re_...
EMAIL_FROM=Better Form <notifications@yourdomain.com>
APP_URL=https://yourdomain.com
```

## Future Enhancements

Potential improvements:
- Phone number verification (similar flow)
- Email verification for account signup (separate from forms)
- Admin dashboard for form accounts
- Export form account data
- GDPR compliance tools (delete form account data)
- Verification code sent via SMS
- OAuth-based identity (Sign in with Google to verify)
