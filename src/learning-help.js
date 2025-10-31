/**
 * ARTemis Professional - Learning & Help Module
 * Category 15: UI/UX & Accessibility
 * Implements interactive tutorials, contextual help, and onboarding
 */

class LearningHelp {
    constructor() {
        this.tutorialsCompleted = new Set();
        this.currentTutorial = null;
        this.tutorialStep = 0;
        this.tooltipTimeout = null;
        this.onboardingCompleted = false;
        this.tipsShown = new Set();
        this.featureDiscoveryEnabled = true;
        
        this.tutorials = this.defineTutorials();
        this.tips = this.defineTips();
        
        this.init();
    }
    
    init() {
        this.loadProgress();
        this.initContextualHelp();
        this.initToolDiscovery();
        this.checkOnboarding();
    }
    
    loadProgress() {
        const saved = localStorage.getItem('artemis-learning-progress');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.tutorialsCompleted = new Set(data.tutorialsCompleted || []);
                this.tipsShown = new Set(data.tipsShown || []);
                this.onboardingCompleted = data.onboardingCompleted || false;
                this.featureDiscoveryEnabled = data.featureDiscoveryEnabled !== false;
            } catch (e) {
                console.error('Error loading learning progress:', e);
            }
        }
    }
    
    saveProgress() {
        const data = {
            tutorialsCompleted: Array.from(this.tutorialsCompleted),
            tipsShown: Array.from(this.tipsShown),
            onboardingCompleted: this.onboardingCompleted,
            featureDiscoveryEnabled: this.featureDiscoveryEnabled
        };
        localStorage.setItem('artemis-learning-progress', JSON.stringify(data));
    }
    
    /**
     * Tutorial Definitions
     */
    defineTutorials() {
        return {
            'getting-started': {
                name: 'Getting Started',
                description: 'Learn the basics of ARTemis',
                steps: [
                    {
                        title: 'Welcome to ARTemis!',
                        content: 'ARTemis is a professional digital painting application. Let\'s start with a quick tour.',
                        action: null,
                        highlight: null
                    },
                    {
                        title: 'The Canvas',
                        content: 'This is your drawing canvas. Click and drag to draw with the current tool.',
                        action: null,
                        highlight: 'canvas'
                    },
                    {
                        title: 'Tools Panel',
                        content: 'Select different drawing tools from the tools panel. Try clicking on the brush tool.',
                        action: 'selectTool',
                        highlight: '.tools-panel'
                    },
                    {
                        title: 'Brush Settings',
                        content: 'Adjust brush size, opacity, and other properties in the brush settings panel.',
                        action: null,
                        highlight: '#brush-size-slider'
                    },
                    {
                        title: 'Layers Panel',
                        content: 'Manage your artwork with layers. You can add, delete, and reorder layers here.',
                        action: null,
                        highlight: '#layers-panel'
                    },
                    {
                        title: 'Colors',
                        content: 'Click on the color swatch to open the color picker and choose your painting colors.',
                        action: null,
                        highlight: '#color-swatch'
                    },
                    {
                        title: 'Undo and Redo',
                        content: 'Use Ctrl+Z to undo and Ctrl+Y to redo. You can also use the buttons in the toolbar.',
                        action: null,
                        highlight: null
                    },
                    {
                        title: 'Saving Your Work',
                        content: 'Save your artwork using File → Save or press Ctrl+S. You can export in various formats.',
                        action: null,
                        highlight: null
                    },
                    {
                        title: 'Tutorial Complete!',
                        content: 'You\'re ready to start creating! Check out more tutorials in Help → Tutorials.',
                        action: null,
                        highlight: null
                    }
                ]
            },
            'advanced-brushes': {
                name: 'Advanced Brush Techniques',
                description: 'Master brush customization and dynamics',
                steps: [
                    {
                        title: 'Brush Dynamics',
                        content: 'ARTemis offers advanced brush dynamics for natural painting.',
                        action: null,
                        highlight: null
                    },
                    {
                        title: 'Pressure Sensitivity',
                        content: 'If you have a graphics tablet, brush size and opacity respond to pen pressure.',
                        action: null,
                        highlight: '#brush-size-slider'
                    },
                    {
                        title: 'Brush Textures',
                        content: 'Add realistic textures to your brushes from the brush settings.',
                        action: null,
                        highlight: null
                    },
                    {
                        title: 'Creating Custom Brushes',
                        content: 'Save your favorite brush settings as custom presets for reuse.',
                        action: null,
                        highlight: null
                    }
                ]
            },
            'layer-mastery': {
                name: 'Layer Management',
                description: 'Learn to work with layers effectively',
                steps: [
                    {
                        title: 'Understanding Layers',
                        content: 'Layers let you work on different parts of your artwork independently.',
                        action: null,
                        highlight: '#layers-panel'
                    },
                    {
                        title: 'Creating Layers',
                        content: 'Click the + button to add a new layer.',
                        action: null,
                        highlight: '#add-layer-btn'
                    },
                    {
                        title: 'Layer Opacity',
                        content: 'Adjust layer opacity to create transparency effects.',
                        action: null,
                        highlight: '#layer-opacity-slider'
                    },
                    {
                        title: 'Blend Modes',
                        content: 'Blend modes change how layers interact with each other.',
                        action: null,
                        highlight: null
                    },
                    {
                        title: 'Layer Groups',
                        content: 'Organize complex artworks using layer groups.',
                        action: null,
                        highlight: null
                    }
                ]
            },
            'color-theory': {
                name: 'Color Management',
                description: 'Understanding color tools and techniques',
                steps: [
                    {
                        title: 'Color Picker',
                        content: 'The color picker lets you choose any color for painting.',
                        action: null,
                        highlight: '#color-swatch'
                    },
                    {
                        title: 'Color Palettes',
                        content: 'Save frequently used colors in custom palettes.',
                        action: null,
                        highlight: null
                    },
                    {
                        title: 'Color Harmony',
                        content: 'Use the color wheel to find harmonious color combinations.',
                        action: null,
                        highlight: null
                    },
                    {
                        title: 'Eyedropper Tool',
                        content: 'Sample colors from your artwork with the eyedropper tool (hold Alt while painting).',
                        action: null,
                        highlight: null
                    }
                ]
            }
        };
    }
    
    /**
     * Tips & Tricks
     */
    defineTips() {
        return [
            {
                id: 'tip-shortcuts',
                title: 'Keyboard Shortcuts',
                content: 'Press F1 to see all keyboard shortcuts. Common ones: B for Brush, E for Eraser, G for Gradient.',
                category: 'productivity'
            },
            {
                id: 'tip-pressure',
                title: 'Pen Pressure',
                content: 'Using a graphics tablet? Your pen pressure controls brush size and opacity for natural strokes.',
                category: 'drawing'
            },
            {
                id: 'tip-layers',
                title: 'Layer Organization',
                content: 'Name your layers! It helps keep complex artworks organized. Double-click a layer name to rename it.',
                category: 'layers'
            },
            {
                id: 'tip-undo',
                title: 'Unlimited Undo',
                content: 'Don\'t be afraid to experiment! ARTemis has unlimited undo (Ctrl+Z) and redo (Ctrl+Y).',
                category: 'workflow'
            },
            {
                id: 'tip-symmetry',
                title: 'Symmetry Drawing',
                content: 'Enable symmetry mode to draw symmetrical designs. Perfect for characters and patterns!',
                category: 'drawing'
            },
            {
                id: 'tip-reference',
                title: 'Reference Images',
                content: 'Open a reference image in a separate window. Use View → Toggle Reference Image.',
                category: 'workflow'
            },
            {
                id: 'tip-zoom',
                title: 'Quick Zoom',
                content: 'Hold Ctrl and scroll mouse wheel to zoom. Or use Ctrl + / Ctrl - keyboard shortcuts.',
                category: 'navigation'
            },
            {
                id: 'tip-eyedropper',
                title: 'Color Sampling',
                content: 'Hold Alt while using the brush to temporarily switch to eyedropper and sample colors.',
                category: 'color'
            },
            {
                id: 'tip-save-often',
                title: 'Save Regularly',
                content: 'Get in the habit of saving often (Ctrl+S). ARTemis also has auto-save enabled by default.',
                category: 'workflow'
            },
            {
                id: 'tip-blend-modes',
                title: 'Blend Modes',
                content: 'Experiment with layer blend modes! They can create amazing effects with just a few clicks.',
                category: 'layers'
            }
        ];
    }
    
    /**
     * Interactive Tutorials
     */
    startTutorial(tutorialId) {
        const tutorial = this.tutorials[tutorialId];
        if (!tutorial) {
            console.warn('Tutorial not found:', tutorialId);
            return;
        }
        
        this.currentTutorial = tutorialId;
        this.tutorialStep = 0;
        this.showTutorialStep();
    }
    
    showTutorialStep() {
        const tutorial = this.tutorials[this.currentTutorial];
        const step = tutorial.steps[this.tutorialStep];
        
        if (!step) {
            this.completeTutorial();
            return;
        }
        
        // Remove existing tutorial overlay
        const existing = document.getElementById('tutorial-overlay');
        if (existing) {
            existing.remove();
        }
        
        // Create tutorial overlay
        const overlay = document.createElement('div');
        overlay.id = 'tutorial-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        // Highlight element if specified
        if (step.highlight) {
            const element = document.querySelector(step.highlight);
            if (element) {
                const rect = element.getBoundingClientRect();
                const highlight = document.createElement('div');
                highlight.style.cssText = `
                    position: fixed;
                    top: ${rect.top - 10}px;
                    left: ${rect.left - 10}px;
                    width: ${rect.width + 20}px;
                    height: ${rect.height + 20}px;
                    border: 3px solid #00ffff;
                    border-radius: 8px;
                    box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
                    pointer-events: none;
                    z-index: 100000;
                    animation: pulse 2s infinite;
                `;
                document.body.appendChild(highlight);
                
                // Remove on next step
                overlay.appendChild(highlight);
            }
        }
        
        // Create tutorial box
        const box = document.createElement('div');
        box.style.cssText = `
            background: var(--bg-secondary, #2d2d30);
            border: 2px solid var(--accent-color, #007acc);
            border-radius: 12px;
            padding: 30px;
            max-width: 500px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            position: relative;
        `;
        
        box.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: var(--accent-color, #007acc);">
                ${step.title}
            </h3>
            <p style="margin: 0 0 20px 0; line-height: 1.6;">
                ${step.content}
            </p>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 14px; opacity: 0.7;">
                    Step ${this.tutorialStep + 1} of ${tutorial.steps.length}
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn" onclick="learningHelp.skipTutorial()">
                        Skip
                    </button>
                    ${this.tutorialStep > 0 ? `
                        <button class="btn" onclick="learningHelp.previousStep()">
                            Previous
                        </button>
                    ` : ''}
                    <button class="btn btn-primary" onclick="learningHelp.nextStep()">
                        ${this.tutorialStep < tutorial.steps.length - 1 ? 'Next' : 'Finish'}
                    </button>
                </div>
            </div>
        `;
        
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        
        // Add pulse animation
        if (!document.getElementById('tutorial-pulse-style')) {
            const style = document.createElement('style');
            style.id = 'tutorial-pulse-style';
            style.textContent = `
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(1.02); }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    nextStep() {
        this.tutorialStep++;
        this.showTutorialStep();
    }
    
    previousStep() {
        if (this.tutorialStep > 0) {
            this.tutorialStep--;
            this.showTutorialStep();
        }
    }
    
    skipTutorial() {
        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) {
            overlay.remove();
        }
        this.currentTutorial = null;
        this.tutorialStep = 0;
    }
    
    completeTutorial() {
        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) {
            overlay.remove();
        }
        
        if (this.currentTutorial) {
            this.tutorialsCompleted.add(this.currentTutorial);
            this.saveProgress();
            
            const tutorial = this.tutorials[this.currentTutorial];
            this.showNotification(`Tutorial "${tutorial.name}" completed! 🎉`);
        }
        
        this.currentTutorial = null;
        this.tutorialStep = 0;
    }
    
    /**
     * Contextual Help
     */
    initContextualHelp() {
        // Add contextual tooltips to tools and buttons
        document.addEventListener('mouseover', (e) => {
            const target = e.target;
            
            // Clear existing timeout
            if (this.tooltipTimeout) {
                clearTimeout(this.tooltipTimeout);
            }
            
            // Show enhanced tooltip after delay
            this.tooltipTimeout = setTimeout(() => {
                this.showContextualTooltip(target);
            }, 800);
        });
        
        document.addEventListener('mouseout', (e) => {
            if (this.tooltipTimeout) {
                clearTimeout(this.tooltipTimeout);
            }
            this.hideContextualTooltip();
        });
    }
    
    showContextualTooltip(element) {
        // Check if element has help information
        const helpKey = element.getAttribute('data-help');
        const title = element.title || element.getAttribute('aria-label');
        
        if (!helpKey && !title) return;
        
        // Remove existing tooltip
        this.hideContextualTooltip();
        
        const tooltip = document.createElement('div');
        tooltip.id = 'contextual-tooltip';
        tooltip.style.cssText = `
            position: fixed;
            background: var(--bg-secondary, #2d2d30);
            border: 1px solid var(--accent-color, #007acc);
            border-radius: 6px;
            padding: 12px;
            max-width: 300px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
            z-index: 100000;
            pointer-events: none;
            font-size: 13px;
            line-height: 1.4;
        `;
        
        const helpText = this.getHelpText(helpKey) || title;
        tooltip.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 8px; color: var(--accent-color);">
                ${title || 'Help'}
            </div>
            <div>
                ${helpText}
            </div>
        `;
        
        // Position tooltip
        const rect = element.getBoundingClientRect();
        tooltip.style.top = (rect.bottom + 10) + 'px';
        tooltip.style.left = rect.left + 'px';
        
        document.body.appendChild(tooltip);
    }
    
    hideContextualTooltip() {
        const tooltip = document.getElementById('contextual-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }
    
    getHelpText(key) {
        const helpTexts = {
            'brush-tool': 'The brush tool lets you paint freehand strokes. Adjust size, opacity, and other properties in the settings.',
            'eraser-tool': 'The eraser tool removes paint from the current layer. Hold Shift to erase in a straight line.',
            'fill-tool': 'Fill an area with the current color. Click on any region to fill it.',
            'gradient-tool': 'Create smooth color transitions. Drag to define the gradient direction and length.',
            'layer-add': 'Create a new layer. Layers help organize your artwork into separate components.',
            'layer-delete': 'Delete the selected layer. This action cannot be undone!',
            'opacity-slider': 'Control the transparency of your brush strokes or the current layer.',
            'size-slider': 'Adjust the size of your brush or tool. You can also use [ and ] keys.',
            'color-picker': 'Select a color for painting. Click to open the full color picker dialog.',
            'undo-btn': 'Undo the last action. Keyboard shortcut: Ctrl+Z',
            'redo-btn': 'Redo the last undone action. Keyboard shortcut: Ctrl+Y'
        };
        
        return helpTexts[key];
    }
    
    /**
     * Tool Discovery
     */
    initToolDiscovery() {
        if (!this.featureDiscoveryEnabled) return;
        
        // Show discovery tips based on usage patterns
        this.scheduleDiscoveryTips();
    }
    
    scheduleDiscoveryTips() {
        // Show random tips periodically
        const tipInterval = 5 * 60 * 1000; // 5 minutes
        
        setInterval(() => {
            if (this.featureDiscoveryEnabled && document.visibilityState === 'visible') {
                this.showRandomTip();
            }
        }, tipInterval);
    }
    
    showRandomTip() {
        // Find tips that haven't been shown
        const unshownTips = this.tips.filter(tip => !this.tipsShown.has(tip.id));
        
        if (unshownTips.length === 0) {
            // All tips shown, reset
            this.tipsShown.clear();
            this.saveProgress();
            return;
        }
        
        const tip = unshownTips[Math.floor(Math.random() * unshownTips.length)];
        this.showTip(tip);
    }
    
    showTip(tip) {
        this.tipsShown.add(tip.id);
        this.saveProgress();
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--bg-secondary, #2d2d30);
            border: 2px solid var(--accent-color, #007acc);
            border-radius: 8px;
            padding: 20px;
            max-width: 350px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                <div style="font-weight: bold; color: var(--accent-color); font-size: 14px;">
                    💡 Did you know?
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 20px; line-height: 1; padding: 0;">
                    ×
                </button>
            </div>
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">
                ${tip.title}
            </div>
            <div style="font-size: 14px; line-height: 1.5; opacity: 0.9;">
                ${tip.content}
            </div>
            <div style="margin-top: 12px; font-size: 12px; opacity: 0.6;">
                <button onclick="learningHelp.featureDiscoveryEnabled = false; learningHelp.saveProgress(); this.closest('div').parentElement.remove();" 
                        style="background: none; border: none; color: var(--text-secondary); cursor: pointer; text-decoration: underline;">
                    Don't show tips
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
        
        // Add animation
        if (!document.getElementById('tip-animation-style')) {
            const style = document.createElement('style');
            style.id = 'tip-animation-style';
            style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    /**
     * Onboarding Experience
     */
    checkOnboarding() {
        if (!this.onboardingCompleted) {
            // Delay onboarding slightly to let the app load
            setTimeout(() => {
                this.startOnboarding();
            }, 1000);
        }
    }
    
    startOnboarding() {
        const dialog = document.createElement('div');
        dialog.className = 'dialog-overlay';
        dialog.style.cssText = 'z-index: 100000;';
        dialog.innerHTML = `
            <div class="dialog-box" style="width: 600px; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 20px;">🎨</div>
                <h2 style="margin: 0 0 15px 0; font-size: 28px;">Welcome to ARTemis!</h2>
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                    ARTemis is a professional digital painting application with advanced tools 
                    for artists of all levels. Let's get you started!
                </p>
                
                <div style="text-align: left; margin-bottom: 30px;">
                    <h3 style="font-size: 18px; margin-bottom: 15px;">What would you like to do?</h3>
                    <button class="btn btn-large" onclick="learningHelp.startTutorial('getting-started'); this.closest('.dialog-overlay').remove();" 
                            style="width: 100%; margin-bottom: 10px; padding: 15px; text-align: left;">
                        <strong>🚀 Start Getting Started Tutorial</strong><br>
                        <span style="font-size: 14px; opacity: 0.8;">Learn the basics in 5 minutes</span>
                    </button>
                    
                    <button class="btn btn-large" onclick="learningHelp.showTutorialList(); this.closest('.dialog-overlay').remove();" 
                            style="width: 100%; margin-bottom: 10px; padding: 15px; text-align: left;">
                        <strong>📚 Browse All Tutorials</strong><br>
                        <span style="font-size: 14px; opacity: 0.8;">Choose what you want to learn</span>
                    </button>
                    
                    <button class="btn btn-large" onclick="learningHelp.completeOnboarding(); this.closest('.dialog-overlay').remove();" 
                            style="width: 100%; padding: 15px; text-align: left;">
                        <strong>✨ Skip and Start Creating</strong><br>
                        <span style="font-size: 14px; opacity: 0.8;">I'm ready to explore on my own</span>
                    </button>
                </div>
                
                <div style="font-size: 14px; opacity: 0.7;">
                    You can access tutorials anytime from Help → Tutorials
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
    }
    
    completeOnboarding() {
        this.onboardingCompleted = true;
        this.saveProgress();
    }
    
    /**
     * Tutorial List Dialog
     */
    showTutorialList() {
        const dialog = document.createElement('div');
        dialog.className = 'dialog-overlay';
        dialog.innerHTML = `
            <div class="dialog-box" style="width: 700px; max-height: 80vh; overflow-y: auto;">
                <div class="dialog-header">
                    <h3>Interactive Tutorials</h3>
                    <button class="close-btn" onclick="this.closest('.dialog-overlay').remove()">×</button>
                </div>
                <div class="dialog-content">
                    <div style="margin-bottom: 20px;">
                        <p>Choose a tutorial to learn different aspects of ARTemis. Your progress is automatically saved.</p>
                    </div>
                    
                    ${Object.entries(this.tutorials).map(([id, tutorial]) => {
                        const completed = this.tutorialsCompleted.has(id);
                        return `
                            <div style="padding: 20px; margin-bottom: 15px; background: var(--bg-tertiary); border-radius: 8px; border: 2px solid ${completed ? 'var(--accent-color)' : 'var(--border-color)'};">
                                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                                    <div>
                                        <h4 style="margin: 0 0 8px 0; font-size: 18px;">
                                            ${completed ? '✅ ' : ''}${tutorial.name}
                                        </h4>
                                        <p style="margin: 0; font-size: 14px; opacity: 0.8;">
                                            ${tutorial.description}
                                        </p>
                                        <div style="margin-top: 8px; font-size: 12px; opacity: 0.6;">
                                            ${tutorial.steps.length} steps
                                        </div>
                                    </div>
                                    <button class="btn" onclick="learningHelp.startTutorial('${id}'); this.closest('.dialog-overlay').remove();">
                                        ${completed ? 'Replay' : 'Start'}
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
    }
    
    /**
     * Workflow Suggestions
     */
    suggestWorkflow(context) {
        // Analyze user's current state and suggest next actions
        const suggestions = [];
        
        if (context.layerCount === 1) {
            suggestions.push('Consider using multiple layers to organize your artwork better.');
        }
        
        if (context.undoCount > 20) {
            suggestions.push('Tip: Save your work regularly to preserve your progress.');
        }
        
        if (context.toolUsage && context.toolUsage.brush > 100 && !context.hasUsedLayers) {
            suggestions.push('Try using layers to separate different parts of your artwork.');
        }
        
        return suggestions;
    }
    
    showNotification(message) {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message);
        } else {
            alert(message);
        }
    }
}

// Global instance
if (typeof window !== 'undefined') {
    window.learningHelp = new LearningHelp();
}
