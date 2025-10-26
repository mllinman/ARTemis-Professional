// Subscription UI Management
// This module handles the subscription UI elements in the main application

class SubscriptionUI {
    constructor() {
        this.authManager = window.authManager;
        this.initUI();
        this.setupEventListeners();
    }

    initUI() {
        // Add subscription info to the toolbar
        this.createUserMenu();
        this.createSubscriptionModal();
        this.updateUIForSubscription();
    }

    createUserMenu() {
        const toolbar = document.getElementById('toolbar');
        if (!toolbar) return;

        const userMenuHTML = `
            <div id="user-menu" class="user-menu">
                <button id="user-menu-btn" class="user-menu-btn" title="Account">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                    </svg>
                    <span id="user-name-display">User</span>
                </button>
                <div id="user-dropdown" class="user-dropdown">
                    <div class="user-info">
                        <div id="user-avatar" class="user-avatar"></div>
                        <div class="user-details">
                            <div id="user-name" class="user-name">User</div>
                            <div id="user-email" class="user-email">email@example.com</div>
                        </div>
                    </div>
                    <div class="subscription-status">
                        <div id="subscription-tier" class="subscription-tier">Free Tier</div>
                        <button id="upgrade-btn" class="upgrade-btn">Upgrade to Pro</button>
                    </div>
                    <div class="user-menu-actions">
                        <button id="manage-subscription-btn" class="menu-action-btn" style="display:none;">
                            Manage Subscription
                        </button>
                        <button id="logout-btn" class="menu-action-btn">
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Insert at the end of toolbar
        toolbar.insertAdjacentHTML('beforeend', userMenuHTML);

        // Add styles
        this.addUserMenuStyles();
    }

    addUserMenuStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .user-menu {
                margin-left: auto;
                position: relative;
            }

            .user-menu-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                background: #2d2d30;
                border: 1px solid #3e3e42;
                border-radius: 6px;
                color: #cccccc;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .user-menu-btn:hover {
                background: #3e3e42;
                transform: translateY(-1px);
            }

            .user-menu-btn svg {
                width: 20px;
                height: 20px;
            }

            .user-dropdown {
                display: none;
                position: absolute;
                top: calc(100% + 8px);
                right: 0;
                background: #252526;
                border: 1px solid #3e3e42;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
                min-width: 280px;
                z-index: 10000;
            }

            .user-dropdown.show {
                display: block;
            }

            .user-info {
                display: flex;
                gap: 12px;
                padding: 16px;
                border-bottom: 1px solid #3e3e42;
            }

            .user-avatar {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 600;
                font-size: 20px;
            }

            .user-details {
                flex: 1;
                min-width: 0;
            }

            .user-name {
                color: #ffffff;
                font-size: 14px;
                font-weight: 600;
                margin-bottom: 4px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .user-email {
                color: #858585;
                font-size: 12px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .subscription-status {
                padding: 16px;
                border-bottom: 1px solid #3e3e42;
            }

            .subscription-tier {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 600;
                margin-bottom: 12px;
            }

            .subscription-tier.free {
                background: rgba(142, 142, 147, 0.2);
                color: #8e8e93;
            }

            .subscription-tier.pro {
                background: rgba(14, 99, 156, 0.2);
                color: #0e639c;
            }

            .upgrade-btn {
                width: 100%;
                padding: 8px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: none;
                border-radius: 6px;
                color: white;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: transform 0.2s;
            }

            .upgrade-btn:hover {
                transform: translateY(-1px);
            }

            .upgrade-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .user-menu-actions {
                padding: 8px;
            }

            .menu-action-btn {
                width: 100%;
                padding: 10px;
                background: transparent;
                border: none;
                border-radius: 6px;
                color: #cccccc;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                text-align: left;
                transition: background 0.2s;
            }

            .menu-action-btn:hover {
                background: #2d2d30;
            }

            .pro-badge {
                display: inline-block;
                padding: 2px 8px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 10px;
                color: white;
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
                margin-left: 8px;
                vertical-align: middle;
            }

            .feature-locked {
                opacity: 0.5;
                pointer-events: none;
                position: relative;
            }

            .feature-locked::after {
                content: '🔒 Pro';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.8);
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
                color: white;
                white-space: nowrap;
            }
        `;
        document.head.appendChild(style);
    }

    createSubscriptionModal() {
        const modalHTML = `
            <div id="subscription-modal" class="modal" style="display: none;">
                <div class="modal-backdrop"></div>
                <div class="modal-content subscription-modal-content">
                    <div class="modal-header">
                        <h2>Choose Your Plan</h2>
                        <button class="modal-close" id="close-subscription-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="pricing-cards">
                            <div class="pricing-card">
                                <div class="plan-name">Basic</div>
                                <div class="plan-price">
                                    <span class="price">$0</span>
                                    <span class="period">/month</span>
                                </div>
                                <ul class="plan-features">
                                    <li>✓ Basic brush tools</li>
                                    <li>✓ Up to 5 layers</li>
                                    <li>✓ Standard export (PNG)</li>
                                    <li>✓ 10 brush presets</li>
                                    <li>✓ Canvas up to 2000x2000</li>
                                </ul>
                                <button class="plan-btn current-plan" disabled>Current Plan</button>
                            </div>
                            <div class="pricing-card featured">
                                <div class="featured-badge">Most Popular</div>
                                <div class="plan-name">Pro</div>
                                <div class="plan-price">
                                    <span class="price">$5</span>
                                    <span class="period">/month</span>
                                </div>
                                <ul class="plan-features">
                                    <li>✓ All brush tools & presets (100+)</li>
                                    <li>✓ Unlimited layers</li>
                                    <li>✓ Advanced export (PNG, JPEG, PSD)</li>
                                    <li>✓ Unlimited canvas size</li>
                                    <li>✓ Advanced photo editing tools</li>
                                    <li>✓ Custom brush creation</li>
                                    <li>✓ Plugin system access</li>
                                    <li>✓ Cloud save (coming soon)</li>
                                    <li>✓ Priority support</li>
                                </ul>
                                <button class="plan-btn upgrade-now" id="subscribe-pro">Upgrade Now</button>
                            </div>
                        </div>
                        <div class="payment-info">
                            <p>💳 Secure payment powered by Stripe</p>
                            <p>Cancel anytime • No hidden fees • Money-back guarantee</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.addSubscriptionModalStyles();
    }

    addSubscriptionModalStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .subscription-modal-content {
                max-width: 800px;
            }

            .pricing-cards {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 24px;
                margin-bottom: 24px;
            }

            .pricing-card {
                background: #252526;
                border: 2px solid #3e3e42;
                border-radius: 12px;
                padding: 32px 24px;
                position: relative;
                transition: transform 0.2s, border-color 0.2s;
            }

            .pricing-card:hover {
                transform: translateY(-4px);
            }

            .pricing-card.featured {
                border-color: #667eea;
                background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
            }

            .featured-badge {
                position: absolute;
                top: -12px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 4px 16px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 700;
                text-transform: uppercase;
            }

            .plan-name {
                font-size: 24px;
                font-weight: 700;
                color: #ffffff;
                margin-bottom: 16px;
                text-align: center;
            }

            .plan-price {
                text-align: center;
                margin-bottom: 24px;
            }

            .price {
                font-size: 48px;
                font-weight: 700;
                color: #ffffff;
            }

            .period {
                font-size: 16px;
                color: #858585;
            }

            .plan-features {
                list-style: none;
                margin-bottom: 24px;
                min-height: 200px;
            }

            .plan-features li {
                color: #cccccc;
                font-size: 14px;
                margin-bottom: 12px;
                padding-left: 4px;
            }

            .plan-btn {
                width: 100%;
                padding: 14px;
                border: none;
                border-radius: 8px;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }

            .plan-btn.current-plan {
                background: #2d2d30;
                color: #858585;
                cursor: not-allowed;
            }

            .plan-btn.upgrade-now {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }

            .plan-btn.upgrade-now:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }

            .plan-btn.cancel-subscription {
                background: #ff3b30;
                color: white;
            }

            .plan-btn.cancel-subscription:hover {
                background: #e6342a;
            }

            .payment-info {
                text-align: center;
                color: #858585;
                font-size: 13px;
            }

            .payment-info p {
                margin: 8px 0;
            }
        `;
        document.head.appendChild(style);
    }

    setupEventListeners() {
        // User menu toggle
        const userMenuBtn = document.getElementById('user-menu-btn');
        const userDropdown = document.getElementById('user-dropdown');
        
        if (userMenuBtn && userDropdown) {
            userMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('show');
            });

            // Close on outside click
            document.addEventListener('click', (e) => {
                if (!userDropdown.contains(e.target) && e.target !== userMenuBtn) {
                    userDropdown.classList.remove('show');
                }
            });
        }

        // Upgrade button
        const upgradeBtn = document.getElementById('upgrade-btn');
        if (upgradeBtn) {
            upgradeBtn.addEventListener('click', () => {
                this.showSubscriptionModal();
            });
        }

        // Subscribe to Pro
        const subscribeProBtn = document.getElementById('subscribe-pro');
        if (subscribeProBtn) {
            subscribeProBtn.addEventListener('click', async () => {
                await this.handleSubscribe();
            });
        }

        // Manage subscription
        const manageBtn = document.getElementById('manage-subscription-btn');
        if (manageBtn) {
            manageBtn.addEventListener('click', () => {
                this.showSubscriptionModal();
            });
        }

        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }

        // Close modal
        const closeModalBtn = document.getElementById('close-subscription-modal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                this.hideSubscriptionModal();
            });
        }

        // Listen for auth events
        window.addEventListener('artemis-auth', (e) => {
            this.updateUIForSubscription();
        });
    }

    updateUIForSubscription() {
        if (!this.authManager.isAuthenticated()) {
            // Redirect to login if not authenticated
            if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/')) {
                // Allow access but show limited features
                this.updateUserDisplay(null);
            }
            return;
        }

        const user = this.authManager.currentUser;
        this.updateUserDisplay(user);
        this.applyFeatureRestrictions();
    }

    updateUserDisplay(user) {
        if (!user) {
            const userNameDisplay = document.getElementById('user-name-display');
            if (userNameDisplay) userNameDisplay.textContent = 'Guest';
            return;
        }

        // Update user menu button
        const userNameDisplay = document.getElementById('user-name-display');
        if (userNameDisplay) {
            userNameDisplay.textContent = user.name.split(' ')[0]; // First name only
        }

        // Update dropdown info
        const userName = document.getElementById('user-name');
        const userEmail = document.getElementById('user-email');
        const userAvatar = document.getElementById('user-avatar');
        
        if (userName) userName.textContent = user.name;
        if (userEmail) userEmail.textContent = user.email;
        if (userAvatar) {
            if (user.picture) {
                userAvatar.style.backgroundImage = `url(${user.picture})`;
                userAvatar.style.backgroundSize = 'cover';
            } else {
                userAvatar.textContent = user.name.charAt(0).toUpperCase();
            }
        }

        // Update subscription tier
        const subscriptionTier = document.getElementById('subscription-tier');
        const upgradeBtn = document.getElementById('upgrade-btn');
        const manageBtn = document.getElementById('manage-subscription-btn');

        if (subscriptionTier) {
            const isPro = user.subscription === 'PRO';
            subscriptionTier.textContent = isPro ? '⭐ Pro Tier' : 'Free Tier';
            subscriptionTier.className = `subscription-tier ${isPro ? 'pro' : 'free'}`;
        }

        if (upgradeBtn) {
            const isPro = user.subscription === 'PRO';
            upgradeBtn.style.display = isPro ? 'none' : 'block';
        }

        if (manageBtn) {
            const isPro = user.subscription === 'PRO';
            manageBtn.style.display = isPro ? 'block' : 'none';
        }
    }

    applyFeatureRestrictions() {
        const isPro = this.authManager.hasProSubscription();
        
        if (!isPro) {
            // Apply restrictions to premium features
            this.restrictLayers();
            this.restrictBrushPresets();
            this.restrictAdvancedTools();
        } else {
            // Remove all restrictions
            this.removeAllRestrictions();
        }
    }

    restrictLayers() {
        // Monitor layer count and prevent adding more than 5
        const originalAddLayer = window.addLayer;
        if (originalAddLayer && !originalAddLayer._restricted) {
            window.addLayer = function(...args) {
                const layerCount = window.state?.layers?.length || 0;
                if (layerCount >= 5 && !window.authManager.hasProSubscription()) {
                    alert('Free tier is limited to 5 layers. Upgrade to Pro for unlimited layers!');
                    return;
                }
                return originalAddLayer.apply(this, args);
            };
            window.addLayer._restricted = true;
        }
    }

    restrictBrushPresets() {
        // Limit brush presets to 10 for free tier
        // This would be implemented based on the brush preset system
    }

    restrictAdvancedTools() {
        // Add pro badges to advanced tools
        const advancedTools = [
            'gradient', 'move', 'rotate', 'scale', 
            'crop', 'clone', 'dodge', 'burn', 'sponge'
        ];

        advancedTools.forEach(tool => {
            const toolBtn = document.querySelector(`[data-tool="${tool}"]`);
            if (toolBtn && !this.authManager.hasProSubscription()) {
                const badge = document.createElement('span');
                badge.className = 'pro-badge';
                badge.textContent = 'PRO';
                badge.style.position = 'absolute';
                badge.style.top = '2px';
                badge.style.right = '2px';
                badge.style.fontSize = '8px';
                badge.style.padding = '2px 4px';
                
                toolBtn.style.position = 'relative';
                toolBtn.appendChild(badge);

                // Add click handler to show upgrade prompt
                const originalClickHandler = toolBtn.onclick;
                toolBtn.onclick = (e) => {
                    if (!this.authManager.hasProSubscription()) {
                        e.stopPropagation();
                        this.showUpgradePrompt(tool);
                        return false;
                    }
                    if (originalClickHandler) {
                        originalClickHandler.call(toolBtn, e);
                    }
                };
            }
        });
    }

    removeAllRestrictions() {
        // Remove pro badges
        document.querySelectorAll('.pro-badge').forEach(badge => badge.remove());
    }

    showUpgradePrompt(featureName) {
        const message = `The ${featureName} tool is a Pro feature. Upgrade to Pro for $5/month to unlock all advanced tools!`;
        if (confirm(message)) {
            this.showSubscriptionModal();
        }
    }

    showSubscriptionModal() {
        const modal = document.getElementById('subscription-modal');
        if (modal) {
            modal.style.display = 'block';
            
            // Update modal based on current subscription
            const isPro = this.authManager.hasProSubscription();
            const subscribeBtn = document.getElementById('subscribe-pro');
            
            if (subscribeBtn) {
                if (isPro) {
                    subscribeBtn.textContent = 'Cancel Subscription';
                    subscribeBtn.className = 'plan-btn cancel-subscription';
                    subscribeBtn.onclick = () => this.handleCancelSubscription();
                } else {
                    subscribeBtn.textContent = 'Upgrade Now';
                    subscribeBtn.className = 'plan-btn upgrade-now';
                    subscribeBtn.onclick = () => this.handleSubscribe();
                }
            }
        }
    }

    hideSubscriptionModal() {
        const modal = document.getElementById('subscription-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async handleSubscribe() {
        try {
            // In production, this would redirect to Stripe checkout
            const success = this.authManager.simulateSubscription();
            
            if (success) {
                alert('🎉 Welcome to ARTemis Pro! All features are now unlocked.');
                this.hideSubscriptionModal();
                this.updateUIForSubscription();
            } else {
                alert('Subscription failed. Please try again.');
            }
        } catch (error) {
            console.error('Subscription error:', error);
            alert('An error occurred. Please try again.');
        }
    }

    async handleCancelSubscription() {
        if (confirm('Are you sure you want to cancel your Pro subscription? You will lose access to Pro features.')) {
            const success = this.authManager.cancelSubscription();
            
            if (success) {
                alert('Your subscription has been canceled. Pro features are no longer available.');
                this.hideSubscriptionModal();
                this.updateUIForSubscription();
            }
        }
    }

    handleLogout() {
        if (confirm('Are you sure you want to sign out?')) {
            this.authManager.signOut();
            window.location.href = 'login.html';
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.subscriptionUI = new SubscriptionUI();
    });
} else {
    window.subscriptionUI = new SubscriptionUI();
}
