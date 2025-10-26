# ARTemis Subscription Features

## Overview

ARTemis now includes a comprehensive subscription system with premium features unlocked through a Pro subscription for $5/month.

## 🎯 Subscription Tiers

### Basic (Free)
- **Price:** $0/month
- **Features:**
  - ✓ Basic brush tools
  - ✓ Up to 5 layers
  - ✓ Standard export (PNG)
  - ✓ 10 brush presets
  - ✓ Canvas up to 2000x2000
  - ✓ Basic drawing tools (Brush, Eraser, Fill, Eyedropper, Selection)
  - ✓ Text and Shape tools

### Pro ($5/month)
- **Price:** $5/month
- **Features:**
  - ✓ **All brush tools & presets (100+)**
  - ✓ **Unlimited layers**
  - ✓ **Advanced export (PNG, JPEG, PSD)**
  - ✓ **Unlimited canvas size**
  - ✓ **Advanced photo editing tools:**
    - Crop Tool (C)
    - Clone Stamp Tool (K)
    - Dodge/Lighten Tool (O)
    - Burn/Darken Tool (U)
    - Sponge/Saturation Tool (P)
  - ✓ **Transform tools:**
    - Gradient Tool (L)
    - Move Tool (V)
    - Rotate Tool (R)
    - Scale Tool (Z)
  - ✓ **Custom brush creation**
  - ✓ **Plugin system access**
  - ✓ **Cloud save (coming soon)**
  - ✓ **Priority support**

## 🔐 Authentication Options

### 1. Google OAuth Login
- Sign in with your Google account
- Seamless authentication
- Secure and trusted

### 2. Guest Mode
- Continue without an account
- Free tier access
- No registration required
- Data stored locally

### 3. Admin Login
- Special administrative access
- Full Pro features automatically
- System management capabilities
- Password: `admin123` (demo mode)

## 📱 User Interface

### Login Screen (`login.html`)
Beautiful modern login interface with:
- Gradient background
- Two-tab design (User Login / Admin)
- Google Sign-In button with official branding
- Guest mode option
- Feature comparison preview
- Responsive design

### User Menu (In-App)
Located in the top-right toolbar:
- User avatar with first initial
- User name and email display
- Current subscription tier badge
- Quick access to:
  - Upgrade to Pro (free users)
  - Manage Subscription (pro users)
  - Sign Out

### Subscription Modal
Premium pricing page with:
- Side-by-side plan comparison
- Feature lists for each tier
- "Most Popular" badge on Pro plan
- Secure payment powered by Stripe
- Money-back guarantee messaging

## 🎨 Feature Restrictions

### Visual Indicators
- **PRO Badge:** Premium tools display a small "PRO" badge in the top-right corner
- **Locked Tools:** Clicking locked tools shows upgrade prompt
- **Layer Limit:** Alert when trying to add more than 5 layers (free tier)

### Premium Tool Restrictions (Free Tier)
The following tools require Pro subscription:
1. **Gradient Tool** - Create beautiful linear and radial gradients
2. **Move Tool** - Reposition layer content
3. **Rotate Tool** - Rotate layers around center
4. **Scale Tool** - Resize layer content
5. **Crop Tool** - Trim and resize canvas
6. **Clone Stamp Tool** - Copy and paint pixels
7. **Dodge Tool** - Selectively lighten areas
8. **Burn Tool** - Selectively darken areas
9. **Sponge Tool** - Adjust color saturation

## 💳 Payment Integration

### Stripe Integration
- Secure payment processing
- Industry-standard encryption
- Automatic subscription management
- Easy cancellation

### Demo Mode
Current implementation uses demo mode:
- No actual payment processing
- Simulates subscription upgrade
- Uses localStorage for persistence
- Perfect for testing and demonstration

## 🚀 User Flow

### New User Journey
1. **First Visit** → Login screen
2. **Choose Auth Method:**
   - Google Sign-In
   - Guest Mode (Free)
   - Admin Login
3. **Enter Application** → Free tier by default
4. **Discover Premium Features** → PRO badges on tools
5. **Upgrade Prompt** → Click locked tool or user menu
6. **View Pricing** → Subscription modal
7. **Upgrade** → Stripe checkout (or demo simulation)
8. **Features Unlocked** → All PRO badges removed

### Existing User Journey
1. **Return Visit** → Auto-login from localStorage
2. **Subscription Status** → Maintained across sessions
3. **Access Features** → Based on subscription tier
4. **Manage Subscription** → From user menu

## 📊 Technical Implementation

### Architecture
- **Client-Side:** JavaScript modules for auth and subscription UI
- **State Management:** localStorage for demo mode
- **Event System:** Custom events for auth state changes
- **Modular Design:** Easy to integrate with backend

### Files
- `src/auth.js` - Authentication and subscription management
- `src/subscription-ui.js` - UI components and feature restrictions
- `src/login.html` - Login screen
- `src/index.html` - Updated with auth scripts

### Integration Points
1. **Tool Click Handlers** - Check subscription before allowing tool use
2. **Layer Management** - Enforce 5-layer limit for free tier
3. **Export Features** - Restrict to PNG for free tier
4. **Brush Presets** - Limit to 10 for free tier

## 🔧 Configuration

### For Production Use

1. **Google OAuth:**
   ```javascript
   // In src/auth.js
   const AUTH_CONFIG = {
       GOOGLE_CLIENT_ID: 'YOUR_ACTUAL_CLIENT_ID',
       ...
   };
   ```

2. **Stripe:**
   ```javascript
   // In src/auth.js
   const AUTH_CONFIG = {
       ...
       STRIPE_PUBLISHABLE_KEY: 'pk_live_YOUR_KEY',
   };
   ```

3. **Admin Password:**
   ```javascript
   // In src/auth.js - use proper hashing
   const AUTH_CONFIG = {
       ...
       ADMIN_PASSWORD_HASH: 'securely_hashed_password',
   };
   ```

## 📝 Usage Examples

### Check Subscription in Code
```javascript
// Check if user is authenticated
if (authManager.isAuthenticated()) {
    console.log('User is logged in');
}

// Check for Pro subscription
if (authManager.hasProSubscription()) {
    // Enable premium feature
}

// Check specific feature access
if (authManager.canUseFeature('advancedBrushes')) {
    // Allow feature
}
```

### Listen for Auth Events
```javascript
window.addEventListener('artemis-auth', (e) => {
    const { type, data } = e.detail;
    
    switch(type) {
        case 'login':
            console.log('User logged in:', data);
            break;
        case 'logout':
            console.log('User logged out');
            break;
        case 'subscription-updated':
            console.log('Subscription changed:', data);
            break;
    }
});
```

## 🎯 Benefits

### For Users
- **Flexible Options:** Choose between free and pro tiers
- **Easy Authentication:** Multiple sign-in methods
- **Clear Value:** See exactly what you get with Pro
- **Transparent Pricing:** No hidden fees
- **Easy Management:** Upgrade/downgrade anytime

### For Developers
- **Monetization:** Sustainable revenue model
- **Scalable:** Easy to add new premium features
- **Modular:** Clean separation of concerns
- **Testable:** Demo mode for development

## 🔮 Future Enhancements

- Team subscriptions
- Annual billing (save 20%)
- Free trial period (7 days)
- Referral program
- Usage analytics
- Cloud storage integration
- Collaborative features
- Mobile app parity

## 📚 Documentation

See also:
- [SUBSCRIPTION_SETUP.md](SUBSCRIPTION_SETUP.md) - Detailed setup guide
- [README.md](README.md) - Main documentation
- [FEATURES.md](FEATURES.md) - Complete feature list

## 🎨 Screenshots

### Login Screen
![Login Screen](https://github.com/user-attachments/assets/ec4c849c-4caf-4aeb-80ce-2dbeaf267601)

### Admin Login Tab
![Admin Login](https://github.com/user-attachments/assets/d4f796da-7fad-42d5-870d-f57c550055b6)

### User Menu (Free Tier)
![User Menu Free](https://github.com/user-attachments/assets/875c8632-aa5e-440f-8dbf-f14cf3d537e3)

### Subscription Modal
![Subscription Modal](https://github.com/user-attachments/assets/d40718b6-e5a1-448e-90d5-d8fa1fc5bfea)

### User Menu (Pro Tier)
![User Menu Pro](https://github.com/user-attachments/assets/f6dcdffa-4983-4746-b7a5-bf6ea10c8837)

---

**Last Updated:** 2025-10-11
**Version:** 1.0.0
