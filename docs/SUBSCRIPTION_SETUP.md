# Subscription Service Setup Guide

This guide explains how to set up and configure the subscription service for ARTemis.

## Overview

ARTemis now includes a subscription service with two tiers:
- **Basic (Free)**: Limited features, up to 5 layers, basic tools
- **Pro ($5/month)**: All features unlocked, unlimited layers, advanced tools

## Features

### Authentication
- **Google OAuth Login**: Users can sign in with their Google account
- **Admin Login**: Special admin access with password authentication
- **Guest Mode**: Continue without account for free tier access

### Payment Processing
- **Stripe Integration**: Secure payment processing for Pro subscriptions
- **Subscription Management**: Users can upgrade, downgrade, and cancel subscriptions

## Configuration

### 1. Google OAuth Setup

To enable Google Sign-In:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized JavaScript origins:
   - `http://localhost` (for local testing)
   - `https://yourdomain.com` (for production)
6. Copy the Client ID
7. Update `src/auth.js`:
   ```javascript
   const AUTH_CONFIG = {
       GOOGLE_CLIENT_ID: 'YOUR_ACTUAL_GOOGLE_CLIENT_ID', // Replace this
       ...
   };
   ```

### 2. Stripe Setup

To enable Stripe payments:

1. Create a [Stripe account](https://stripe.com/)
2. Get your API keys from the Stripe Dashboard
3. Update `src/auth.js`:
   ```javascript
   const AUTH_CONFIG = {
       ...
       STRIPE_PUBLISHABLE_KEY: 'pk_live_YOUR_ACTUAL_STRIPE_KEY', // Use pk_test_ for testing
   };
   ```
4. Set up a product in Stripe:
   - Create a product called "ARTemis Pro"
   - Set up recurring billing at $5/month
   - Copy the Price ID
5. Implement backend checkout session creation (see below)

### 3. Admin Password

To set a secure admin password:

1. In production, use proper password hashing (bcrypt, argon2, etc.)
2. Update `src/auth.js`:
   ```javascript
   const AUTH_CONFIG = {
       ...
       ADMIN_PASSWORD_HASH: 'your_hashed_password_here',
   };
   ```

For demo purposes, the current password is `admin123`.

## Backend Requirements

For production use, you need a backend server to:

1. **Verify Google OAuth tokens**
2. **Create Stripe checkout sessions**
3. **Handle Stripe webhooks**
4. **Store user subscription data**
5. **Manage authentication sessions**

### Example Backend Endpoints

```javascript
// POST /api/auth/google
// Verify Google OAuth token and create session

// POST /api/create-checkout-session
// Create Stripe checkout session
app.post('/api/create-checkout-session', async (req, res) => {
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
            price: 'price_YOUR_STRIPE_PRICE_ID',
            quantity: 1,
        }],
        mode: 'subscription',
        success_url: 'https://yourdomain.com/success',
        cancel_url: 'https://yourdomain.com/cancel',
    });
    res.json({ id: session.id });
});

// POST /api/webhook
// Handle Stripe webhooks for subscription events
app.post('/api/webhook', async (req, res) => {
    const event = req.body;
    
    switch (event.type) {
        case 'checkout.session.completed':
            // Update user subscription to Pro
            break;
        case 'customer.subscription.deleted':
            // Downgrade user to Free
            break;
    }
    
    res.json({ received: true });
});
```

## Demo Mode

The current implementation uses **demo mode** with localStorage:

- Authentication data is stored in browser localStorage
- No actual API calls are made
- Subscription changes are simulated
- Perfect for testing and demonstration

### Demo Features
- ✅ Login/logout functionality
- ✅ Subscription tier switching
- ✅ Feature restrictions based on tier
- ✅ UI updates based on subscription status
- ✅ Premium feature locking

### Limitations in Demo Mode
- ❌ No real Google OAuth
- ❌ No actual Stripe payments
- ❌ Data not persisted across browsers
- ❌ No server-side verification
- ❌ No webhook handling

## Production Deployment

For production deployment:

1. **Set up backend server** (Node.js/Express, Python/Flask, etc.)
2. **Configure OAuth credentials** with production URLs
3. **Set up Stripe webhooks** for subscription events
4. **Implement user database** (PostgreSQL, MongoDB, etc.)
5. **Add authentication middleware** to verify sessions
6. **Enable HTTPS** for secure connections
7. **Update AUTH_CONFIG** with production keys
8. **Remove demo mode** code from `auth.js`

## Usage

### User Flow

1. **Login**:
   - Visit `src/login.html`
   - Choose Google login, admin login, or guest mode
   - Redirects to main app after authentication

2. **Using the App**:
   - User menu shows current subscription tier
   - Pro features show upgrade prompts for free users
   - Layer limit enforced for free tier (5 layers max)

3. **Upgrading**:
   - Click "Upgrade to Pro" button
   - Select Pro plan in modal
   - Complete Stripe checkout (in production)
   - Features unlocked immediately

4. **Managing Subscription**:
   - Access from user menu dropdown
   - View current plan and features
   - Cancel subscription option for Pro users

### Admin Access

Admin users get:
- Full Pro features automatically
- System management access (future feature)
- No subscription required

## Feature Restrictions

### Free Tier Restrictions
- Maximum 5 layers
- Basic brush tools only (10 presets)
- Standard PNG export only
- Canvas size limited to 2000x2000
- No access to:
  - Advanced photo editing tools (Crop, Clone, Dodge, Burn, Sponge)
  - Transform tools (Gradient, Move, Rotate, Scale)
  - Custom brush creation
  - Plugin system
  - Premium brush presets

### Pro Tier Benefits
- Unlimited layers
- 100+ brush presets
- Advanced export (PNG, JPEG, PSD)
- Unlimited canvas size
- All photo editing tools
- Transform tools
- Custom brushes
- Plugin system access
- Priority support
- Cloud save (coming soon)

## Testing

### Test Accounts

Demo mode allows testing without real credentials:

1. **Google Login**: Click "Continue with Google" → Creates demo user
2. **Guest Mode**: Click "Continue as Guest" → Free tier access
3. **Admin Login**: Password: `admin123` → Full Pro access

### Test Subscription Flow

1. Log in as guest or Google user
2. Click user menu → "Upgrade to Pro"
3. Click "Upgrade Now" on Pro plan
4. Subscription updates immediately (demo mode)
5. Try using advanced tools (now unlocked)
6. Test cancellation from "Manage Subscription"

## Troubleshooting

### Google Sign-In Not Working
- Check that Client ID is correct in `auth.js`
- Verify authorized origins in Google Console
- Check browser console for errors
- Ensure Google Sign-In library is loaded

### Stripe Not Loading
- Verify publishable key is correct
- Check network console for blocked requests
- Ensure Stripe.js library is loaded
- Test with Stripe test keys first

### Features Not Unlocking
- Check browser localStorage for user data
- Verify subscription tier in user object
- Clear localStorage and re-login
- Check browser console for errors

## Security Considerations

⚠️ **Important for Production**:

1. **Never store sensitive keys in frontend code**
2. **Always verify tokens on backend**
3. **Use environment variables for configuration**
4. **Implement proper password hashing**
5. **Enable CSRF protection**
6. **Use HTTPS only**
7. **Implement rate limiting**
8. **Add input validation**
9. **Log security events**
10. **Regular security audits**

## Support

For issues or questions:
- Check browser console for errors
- Verify configuration in `auth.js`
- Review Stripe/Google documentation
- Test in demo mode first
- Check network requests in DevTools

## Future Enhancements

Planned features:
- Social login (Facebook, Apple, GitHub)
- Team subscriptions
- Annual billing option
- Free trial period
- Referral program
- Usage analytics
- Cloud storage integration
- Collaborative editing

---

Last Updated: 2025-10-11
