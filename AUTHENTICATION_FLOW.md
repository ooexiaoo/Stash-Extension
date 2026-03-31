# Stashed.in Extension - Authentication Flow

## Overview

The extension uses **API tokens** for authentication instead of trying to share Supabase session tokens. This approach is more reliable and works across all devices.

## How It Works

### API Token Characteristics
- **Stored in Database**: Tokens are stored in the `profiles.api_token` column in Supabase
- **Permanent**: Tokens never expire unless manually revoked by the user
- **Device-Independent**: Same token works on any device/browser
- **Secure**: Only the user can see their token in their profile settings
- **Format**: Tokens start with `stk_` prefix followed by 32 random alphanumeric characters

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Authentication Flow                      │
└─────────────────────────────────────────────────────────────────┘

1. User installs extension
   └─> Opens extension settings

2. User clicks "Log In to Stashed.in"
   └─> Opens stashed.in/login in new tab

3. User logs in (email/password or Google OAuth)
   └─> Redirected to dashboard

4. User navigates to Profile Settings
   └─> stashed.in/profile

5. User finds "Browser Extension Access" section
   └─> Clicks "Generate API Token" (first time)
   └─> Clicks "Copy Token" button

6. User returns to extension settings
   └─> Pastes token in "Manual Token Entry" section
   └─> Clicks "Save Token"

7. Extension validates token with API
   └─> Token saved to chrome.storage.local
   └─> Extension ready to use! ✓

┌─────────────────────────────────────────────────────────────────┐
│                    Token Validation Flow                         │
└─────────────────────────────────────────────────────────────────┘

Extension → POST /api/extension/links
          Header: Authorization: Bearer stk_...
                ↓
Cloudflare Worker (extension-api.ts)
          Validates token against profiles.api_token
                ↓
Supabase Database
          Returns user ID if valid
                ↓
Worker → Creates link with user_id
                ↓
Extension → Success! Link saved ✓
```

## Why This Approach?

### Problems with Session Token Sharing
❌ Supabase session tokens are stored in localStorage  
❌ Extensions can't reliably access localStorage from other domains  
❌ Session tokens expire and require refresh  
❌ Clearing cache/cookies breaks authentication  
❌ Different browsers/devices have different sessions  

### Benefits of API Token Approach
✅ Token stored in database - survives cache clears  
✅ Same token works across all devices  
✅ Never expires (until revoked)  
✅ Simple validation via API  
✅ User can revoke anytime from profile  
✅ No sensitive credentials in extension code  

## File Structure

```
browser-extension/
├── src/
│   ├── manifest.json       # Extension configuration
│   ├── popup.html          # Main popup interface
│   ├── popup.js            # Popup logic
│   ├── settings.html       # Settings page (authentication)
│   ├── settings.js         # Settings logic
│   ├── background.js       # Service worker for API calls
│   └── content.js          # Content script for metadata
└── AUTHENTICATION_FLOW.md  # This file

website/
├── src/
│   ├── components/
│   │   └── ProfileSettings.tsx  # Has "Browser Extension Access" section
│   └── pages/
│       └── LoginPage.tsx        # User login page
└── workers/
    └── extension-api.ts         # Cloudflare Worker API
```

## Security Considerations

### Token Generation
- Tokens are generated client-side using `Math.random()`
- 32 characters + `stk_` prefix = ~190 bits of entropy
- Stored in database only when user clicks "Generate"

### Token Storage
- **Extension**: Stored in `chrome.storage.local` (encrypted by browser)
- **Database**: Stored in `profiles.api_token` column (RLS protected)
- **Never** exposed in URLs or client-side code (except user's own profile)

### Token Validation
- All API requests require `Authorization: Bearer <token>` header
- Worker validates token against database on every request
- Invalid tokens return 401 Unauthorized

### Token Revocation
- User can revoke token anytime from profile settings
- Immediately invalidates all extension sessions
- User must generate new token to use extension again

## Testing the Flow

### Prerequisites
1. Extension loaded in Chrome/Edge
2. User account on stashed.in
3. Access to Supabase dashboard (optional)

### Test Steps

1. **Initial State**
   ```
   - Open extension settings
   - Should see "Not authenticated" message
   - Should see "Log In" button
   - Should see "Manual Token Entry" section
   ```

2. **Generate Token**
   ```
   - Click "Log In to Stashed.in"
   - Login to your account
   - Navigate to Profile Settings
   - Find "Browser Extension Access" section
   - Click "Generate API Token"
   - Click "Copy Token"
   ```

3. **Configure Extension**
   ```
   - Return to extension settings
   - Paste token in "Manual Token Entry" field
   - Click "Save Token"
   - Should see "✓ Connected" message
   ```

4. **Test Saving Link**
   ```
   - Open any webpage
   - Click extension icon
   - Select a board from dropdown
   - Click "Save Link"
   - Should see "Link saved successfully!"
   ```

5. **Verify in Database** (optional)
   ```sql
   -- Check token exists
   SELECT id, username, api_token FROM profiles WHERE username = 'your_username';

   -- Check link was created
   SELECT id, url, title, board_id FROM links ORDER BY created_at DESC LIMIT 1;
   ```

## Troubleshooting

### "Invalid token" error
- Token might be expired/revoked
- Generate new token from profile settings
- Make sure to copy entire token (starts with `stk_`)

### "Failed to fetch" error
- Check internet connection
- Verify Cloudflare Worker is deployed
- Check Worker environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

### Token not saving
- Check chrome.storage.local permissions in manifest.json
- Ensure token starts with `stk_`
- Try removing and re-adding token

### Extension can't find boards
- Verify user has at least one board created
- Check RLS policies allow reading boards
- Verify token is valid and not revoked

## Future Improvements

- [ ] Add QR code for easy token transfer to extension
- [ ] Show extension usage statistics in profile
- [ ] Allow naming multiple tokens for different devices
- [ ] Add token expiration option for security-conscious users
- [ ] Create onboarding tutorial for first-time users
