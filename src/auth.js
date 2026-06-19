// Authentication and Subscription Management
// This is a client-side demo implementation using localStorage
// In production, this would connect to a backend server

const AUTH_CONFIG = {
    GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID', // Replace with actual client ID
    STRIPE_PUBLISHABLE_KEY: 'pk_test_YOUR_STRIPE_KEY', // Replace with actual Stripe key
    // SECURITY: Admin password is verified via SHA-256 hash comparison.
    // In production, use server-side authentication — NEVER store credentials client-side.
    ADMIN_PASSWORD_HASH: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // SHA-256 hash
    ADMIN_LOGIN_MAX_ATTEMPTS: 5,
    ADMIN_LOGIN_LOCKOUT_MS: 5 * 60 * 1000, // 5-minute lockout after max attempts
};

const SUBSCRIPTION_TIERS = {
    FREE: {
        name: 'Basic',
        price: 0,
        features: [
            'Basic brush tools',
            'Up to 5 layers',
            'Standard export (PNG)',
            'Limited brush presets (10)',
            'Canvas size up to 2000x2000'
        ]
    },
    PRO: {
        name: 'Pro',
        price: 5,
        features: [
            'All brush tools and presets (100+)',
            'Unlimited layers',
            'Advanced export (PNG, JPEG, PSD)',
            'Premium brush presets',
            'Unlimited canvas size',
            'Advanced photo editing tools',
            'Custom brush creation',
            'Plugin system access',
            'Cloud save (coming soon)',
            'Priority support'
        ]
    }
};

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAdmin = false;
        this.loadUserSession();
        this.initGoogleAuth();
    }

    initGoogleAuth() {
        // Initialize Google Sign-In
        // This would load the Google Sign-In library in production
        if (window.google && window.google.accounts) {
            google.accounts.id.initialize({
                client_id: AUTH_CONFIG.GOOGLE_CLIENT_ID,
                callback: this.handleGoogleCallback.bind(this)
            });
        }
    }

    async handleGoogleCallback(response) {
        try {
            // In production, verify the token with your backend
            const credential = response.credential;
            const payload = this.parseJwt(credential);
            
            const user = {
                id: payload.sub,
                email: payload.email,
                name: payload.name,
                picture: payload.picture,
                provider: 'google',
                subscription: 'FREE',
                subscriptionDate: null
            };

            this.setUser(user);
            return true;
        } catch (error) {
            console.error('Google sign-in error:', error);
            return false;
        }
    }

    parseJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('JWT parse error:', error);
            return null;
        }
    }

    async signInWithGoogle() {
        // In production, this would trigger Google OAuth flow
        if (window.google && window.google.accounts) {
            google.accounts.id.prompt();
        } else {
            // Demo mode - simulate Google sign-in
            const demoUser = {
                id: 'demo_' + Date.now(),
                email: 'demo@example.com',
                name: 'Demo User',
                picture: '',
                provider: 'google',
                subscription: 'FREE',
                subscriptionDate: null
            };
            this.setUser(demoUser);
            return true;
        }
    }

    async signInAsAdmin(password) {
        // Rate limiting check
        if (!this._adminLoginState) {
            this._adminLoginState = { attempts: 0, lockedUntil: 0 };
        }
        
        const now = Date.now();
        if (now < this._adminLoginState.lockedUntil) {
            const remainingSec = Math.ceil((this._adminLoginState.lockedUntil - now) / 1000);
            console.warn(`Admin login locked out for ${remainingSec}s`);
            return false;
        }
        
        // Hash the input password with SHA-256 and compare
        const passwordHash = await this._hashPassword(password);
        
        if (passwordHash === AUTH_CONFIG.ADMIN_PASSWORD_HASH) {
            // Reset rate limiting on successful login
            this._adminLoginState = { attempts: 0, lockedUntil: 0 };
            
            const adminUser = {
                id: 'admin',
                email: 'admin@artemis.app',
                name: 'Administrator',
                picture: '',
                provider: 'admin',
                subscription: 'PRO',
                subscriptionDate: new Date().toISOString()
            };
            this.setUser(adminUser);
            this.isAdmin = true;
            localStorage.setItem('artemis_is_admin', 'true');
            return true;
        }
        
        // Track failed attempt
        this._adminLoginState.attempts++;
        if (this._adminLoginState.attempts >= AUTH_CONFIG.ADMIN_LOGIN_MAX_ATTEMPTS) {
            this._adminLoginState.lockedUntil = now + AUTH_CONFIG.ADMIN_LOGIN_LOCKOUT_MS;
            this._adminLoginState.attempts = 0;
            console.warn('Admin login locked out due to too many failed attempts');
        }
        
        return false;
    }

    async _hashPassword(password) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error('Password hashing failed:', error);
            return '';
        }
    }

    async signInWithEmail(email, password) {
        // In production, verify with backend
        // For demo purposes, we'll create a user with the provided email
        if (!email || !password) {
            return { success: false, error: 'Email and password are required' };
        }

        // Simple email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { success: false, error: 'Invalid email format' };
        }

        // In demo mode, accept any valid email/password combination
        // In production, this would verify credentials with backend
        const user = {
            id: 'email_' + Date.now(),
            email: email,
            name: email.split('@')[0], // Use email username as name
            picture: '',
            provider: 'email',
            subscription: 'FREE',
            subscriptionDate: null
        };

        this.setUser(user);
        return { success: true };
    }

    async signUpWithEmail(email, password, name) {
        // In production, create account with backend
        // For demo purposes, we'll create a user with the provided details
        if (!email || !password) {
            return { success: false, error: 'Email and password are required' };
        }

        // Simple email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { success: false, error: 'Invalid email format' };
        }

        // Password strength check
        if (password.length < 6) {
            return { success: false, error: 'Password must be at least 6 characters' };
        }

        // In demo mode, accept any valid email/password combination
        // In production, this would create the account with backend
        const user = {
            id: 'email_' + Date.now(),
            email: email,
            name: name || email.split('@')[0],
            picture: '',
            provider: 'email',
            subscription: 'FREE',
            subscriptionDate: null
        };

        this.setUser(user);
        return { success: true };
    }

    setUser(user) {
        this.currentUser = user;
        localStorage.setItem('artemis_user', JSON.stringify(user));
        this.dispatchAuthEvent('login', user);
    }

    signOut() {
        this.currentUser = null;
        this.isAdmin = false;
        localStorage.removeItem('artemis_user');
        localStorage.removeItem('artemis_is_admin');
        this.dispatchAuthEvent('logout', null);
    }

    loadUserSession() {
        const savedUser = localStorage.getItem('artemis_user');
        const isAdmin = localStorage.getItem('artemis_is_admin');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.isAdmin = isAdmin === 'true';
        }
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    hasProSubscription() {
        return this.currentUser && this.currentUser.subscription === 'PRO';
    }

    getSubscriptionTier() {
        if (!this.currentUser) return null;
        return this.currentUser.subscription;
    }

    getFeatures() {
        const tier = this.getSubscriptionTier();
        return tier ? SUBSCRIPTION_TIERS[tier] : SUBSCRIPTION_TIERS.FREE;
    }

    canUseFeature(featureName) {
        if (!this.isAuthenticated()) return false;
        if (this.hasProSubscription()) return true;

        // Free tier restrictions
        const restrictions = {
            advancedBrushes: false,
            unlimitedLayers: false,
            advancedExport: false,
            premiumPresets: false,
            unlimitedCanvasSize: false,
            photoEditingTools: false,
            customBrushes: false,
            pluginSystem: false
        };

        return !restrictions[featureName];
    }

    async initStripeCheckout(priceId) {
        // In production, this would create a Stripe checkout session
        // For demo purposes, we'll simulate the subscription
        if (window.Stripe && AUTH_CONFIG.STRIPE_PUBLISHABLE_KEY !== 'pk_test_YOUR_STRIPE_KEY') {
            const stripe = Stripe(AUTH_CONFIG.STRIPE_PUBLISHABLE_KEY);
            // Create checkout session with your backend
            // const session = await fetch('/create-checkout-session', { method: 'POST' });
            // const sessionData = await session.json();
            // await stripe.redirectToCheckout({ sessionId: sessionData.id });
        } else {
            // Demo mode - simulate successful payment
            return this.simulateSubscription();
        }
    }

    simulateSubscription() {
        if (!this.currentUser) return false;
        
        this.currentUser.subscription = 'PRO';
        this.currentUser.subscriptionDate = new Date().toISOString();
        localStorage.setItem('artemis_user', JSON.stringify(this.currentUser));
        this.dispatchAuthEvent('subscription-updated', this.currentUser);
        return true;
    }

    cancelSubscription() {
        if (!this.currentUser) return false;
        
        this.currentUser.subscription = 'FREE';
        this.currentUser.subscriptionDate = null;
        localStorage.setItem('artemis_user', JSON.stringify(this.currentUser));
        this.dispatchAuthEvent('subscription-updated', this.currentUser);
        return true;
    }

    dispatchAuthEvent(type, data) {
        const event = new CustomEvent('artemis-auth', {
            detail: { type, data }
        });
        window.dispatchEvent(event);
    }
}

// Create global auth manager instance
const authManager = new AuthManager();
window.authManager = authManager;
