/**
 * Krita-Inspired Brush Engines for ARTemis
 * 
 * This module implements JavaScript equivalents of Krita's advanced brush engines
 * Originally inspired by Krita's C++ implementation
 * 
 * Brush Engines Implemented:
 * - Particle Brush: Scatter and spray effects with physics
 * - Bristle Brush: Individual bristle simulation for natural media
 * - Hatching Brush: Crosshatching patterns for artistic effects
 * - Chalk Brush: Dry media with texture accumulation
 */

// ============================================================================
// PARTICLE BRUSH ENGINE
// ============================================================================
// Inspired by Krita's particle brush engine (kis_particle_paintop.cpp)
// Simulates spray-like effects with particle physics

class ParticleBrushEngine {
    constructor() {
        this.particles = [];
        this.settings = {
            particleCount: 10,          // Number of particles per dab
            particleSize: 3,            // Size of individual particles
            particleSizeVariation: 50,  // Size variation (0-100%)
            particleOpacity: 80,        // Base opacity of particles
            particleOpacityVariation: 30, // Opacity variation (0-100%)
            gravity: 0,                 // Gravity effect (0-100)
            spread: 100,                // How far particles spread (0-200%)
            particleLifetime: 1.0,      // Particle lifetime in seconds
            velocityVariation: 50,      // Velocity randomness (0-100%)
        };
    }

    applyBrush(ctx, x, y, size, pressure, color) {
        const adjustedCount = Math.floor(this.settings.particleCount * pressure);
        const spreadRadius = size * (this.settings.spread / 100);
        
        for (let i = 0; i < adjustedCount; i++) {
            // Random angle and distance for particle placement
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * spreadRadius;
            
            const particleX = x + Math.cos(angle) * distance;
            const particleY = y + Math.sin(angle) * distance;
            
            // Size variation
            const sizeVar = 1 - (Math.random() * this.settings.particleSizeVariation / 100);
            const particleSize = this.settings.particleSize * size / 20 * sizeVar;
            
            // Opacity variation
            const opacityVar = 1 - (Math.random() * this.settings.particleOpacityVariation / 100);
            const particleOpacity = (this.settings.particleOpacity / 100) * opacityVar * pressure;
            
            // Draw particle
            ctx.save();
            ctx.globalAlpha = particleOpacity;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    updateSettings(settings) {
        Object.assign(this.settings, settings);
    }
}

// ============================================================================
// BRISTLE BRUSH ENGINE
// ============================================================================
// Inspired by Krita's bristle brush engine (kis_bristle_paintop.cpp)
// Simulates individual bristles for natural media effects

class BristleBrushEngine {
    constructor() {
        this.bristles = [];
        this.settings = {
            bristleCount: 8,           // Number of bristles (1-50)
            bristleLength: 50,         // How far bristles splay (0-100%)
            bristleStiffness: 60,      // How much bristles stay together (0-100%)
            bristleThickness: 1.0,     // Thickness of individual bristles
            bristleInkAmount: 80,      // How much ink each bristle carries (0-100%)
            bristleInkDepletion: 10,   // How fast ink depletes (0-100%)
            scaleToBrushSize: true,    // Scale bristle effect to brush size
        };
        this.initBristles();
    }

    initBristles() {
        this.bristles = [];
        for (let i = 0; i < this.settings.bristleCount; i++) {
            const angle = (i / this.settings.bristleCount) * Math.PI * 2;
            this.bristles.push({
                angle: angle,
                offset: 0,
                inkAmount: 1.0
            });
        }
    }

    applyBrush(ctx, x, y, size, pressure, color) {
        const bristleSpread = (this.settings.bristleLength / 100) * size * 0.3;
        const stiffness = this.settings.bristleStiffness / 100;
        
        // Update bristle positions based on pressure and stiffness
        for (let i = 0; i < this.bristles.length; i++) {
            const bristle = this.bristles[i];
            
            // Calculate bristle offset based on pressure (inverse of stiffness)
            const maxOffset = bristleSpread * (1 - stiffness) * pressure;
            bristle.offset = Math.random() * maxOffset;
            
            // Calculate bristle position
            const bristleX = x + Math.cos(bristle.angle) * bristle.offset;
            const bristleY = y + Math.sin(bristle.angle) * bristle.offset;
            
            // Bristle size based on thickness and pressure
            const bristleSize = (size / this.settings.bristleCount) * 
                               this.settings.bristleThickness * 
                               (0.5 + pressure * 0.5);
            
            // Ink amount with depletion
            const inkOpacity = (this.settings.bristleInkAmount / 100) * bristle.inkAmount * pressure;
            
            // Draw individual bristle
            ctx.save();
            ctx.globalAlpha = inkOpacity;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(bristleX, bristleY, bristleSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            
            // Deplete ink slightly
            bristle.inkAmount = Math.max(0.3, bristle.inkAmount - (this.settings.bristleInkDepletion / 1000));
        }
    }

    updateSettings(settings) {
        Object.assign(this.settings, settings);
        if (settings.bristleCount !== undefined) {
            this.initBristles();
        }
    }

    resetInk() {
        this.bristles.forEach(bristle => bristle.inkAmount = 1.0);
    }
}

// ============================================================================
// HATCHING BRUSH ENGINE
// ============================================================================
// Inspired by Krita's hatching brush engine (kis_hatching_paintop.cpp)
// Creates crosshatching patterns for artistic effects

class HatchingBrushEngine {
    constructor() {
        this.settings = {
            angle: 45,                 // Hatching angle in degrees
            separation: 5,             // Distance between hatch lines
            thickness: 1,              // Line thickness
            crosshatchingEnabled: true, // Enable crosshatching
            crosshatchingAngle: -45,   // Second angle for crosshatching
            separationVariation: 20,   // Variation in line separation (0-100%)
            thicknessVariation: 20,    // Variation in line thickness (0-100%)
            angleVariation: 10,        // Variation in angle (0-180°)
        };
    }

    applyBrush(ctx, x, y, size, pressure, color) {
        const angleRad = (this.settings.angle + (Math.random() - 0.5) * this.settings.angleVariation) * Math.PI / 180;
        
        // Draw primary hatching
        this.drawHatchLines(ctx, x, y, size, pressure, color, angleRad);
        
        // Draw crosshatching if enabled
        if (this.settings.crosshatchingEnabled) {
            const crossAngleRad = (this.settings.crosshatchingAngle + (Math.random() - 0.5) * this.settings.angleVariation) * Math.PI / 180;
            this.drawHatchLines(ctx, x, y, size, pressure, color, crossAngleRad);
        }
    }

    drawHatchLines(ctx, centerX, centerY, size, pressure, color, angle) {
        const separation = this.settings.separation * (1 + (Math.random() - 0.5) * this.settings.separationVariation / 100);
        const thickness = this.settings.thickness * (1 + (Math.random() - 0.5) * this.settings.thicknessVariation / 100);
        const numLines = Math.ceil(size / separation);
        
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;
        ctx.globalAlpha = pressure * 0.6;
        ctx.lineCap = 'round';
        
        // Draw parallel lines
        for (let i = -numLines; i <= numLines; i++) {
            const offset = i * separation;
            
            // Calculate line endpoints
            const perpAngle = angle + Math.PI / 2;
            const startX = centerX + Math.cos(perpAngle) * offset - Math.cos(angle) * size;
            const startY = centerY + Math.sin(perpAngle) * offset - Math.sin(angle) * size;
            const endX = centerX + Math.cos(perpAngle) * offset + Math.cos(angle) * size;
            const endY = centerY + Math.sin(perpAngle) * offset + Math.sin(angle) * size;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    updateSettings(settings) {
        Object.assign(this.settings, settings);
    }
}

// ============================================================================
// CHALK/CHARCOAL BRUSH ENGINE
// ============================================================================
// Inspired by Krita's chalk brush and dry media simulation
// Creates textured, grainy strokes with accumulation

class ChalkBrushEngine {
    constructor() {
        this.textureCanvas = document.createElement('canvas');
        this.textureCtx = this.textureCanvas.getContext('2d');
        this.settings = {
            grainSize: 2,              // Size of grain particles
            grainDensity: 60,          // Density of grain (0-100%)
            grainContrast: 70,         // Contrast of grain texture (0-100%)
            paperTexture: true,        // Use paper texture
            accumulation: 50,          // How much chalk accumulates (0-100%)
            dustSpread: 30,            // Chalk dust spreading (0-100%)
        };
        this.generateChalkTexture(100); // Pre-generate texture
    }

    generateChalkTexture(size) {
        this.textureCanvas.width = size;
        this.textureCanvas.height = size;
        const ctx = this.textureCtx;
        
        // Create noise texture for chalk grain
        const imageData = ctx.createImageData(size, size);
        const data = imageData.data;
        
        const density = this.settings.grainDensity / 100;
        const contrast = this.settings.grainContrast / 100;
        
        for (let i = 0; i < data.length; i += 4) {
            const random = Math.random();
            if (random < density) {
                const value = Math.floor(128 + (Math.random() - 0.5) * 255 * contrast);
                data[i] = value;
                data[i + 1] = value;
                data[i + 2] = value;
                data[i + 3] = 255;
            } else {
                data[i + 3] = 0; // Transparent
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }

    applyBrush(ctx, x, y, size, pressure, color) {
        // Regenerate texture if size changed significantly
        if (Math.abs(this.textureCanvas.width - size) > 20) {
            this.generateChalkTexture(Math.ceil(size));
        }
        
        ctx.save();
        
        // Base chalk stroke
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size / 2);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.6, color);
        gradient.addColorStop(1, color + '00');
        
        ctx.globalAlpha = pressure * 0.3;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Apply grain texture
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = pressure * (this.settings.accumulation / 100);
        ctx.drawImage(this.textureCanvas, x - size / 2, y - size / 2, size, size);
        
        // Add dust spread effect
        if (this.settings.dustSpread > 0) {
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = pressure * 0.15 * (this.settings.dustSpread / 100);
            ctx.fillStyle = color;
            const dustRadius = size * (1 + this.settings.dustSpread / 100);
            const dustGradient = ctx.createRadialGradient(x, y, size / 2, x, y, dustRadius / 2);
            dustGradient.addColorStop(0, color + '00');
            dustGradient.addColorStop(1, color);
            ctx.fillStyle = dustGradient;
            ctx.beginPath();
            ctx.arc(x, y, dustRadius / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    updateSettings(settings) {
        Object.assign(this.settings, settings);
        if (settings.grainSize !== undefined || 
            settings.grainDensity !== undefined || 
            settings.grainContrast !== undefined) {
            this.generateChalkTexture(this.textureCanvas.width);
        }
    }
}

// ============================================================================
// EXPORT BRUSH ENGINES
// ============================================================================

// Create global instances
const kritaBrushEngines = {
    particle: new ParticleBrushEngine(),
    bristle: new BristleBrushEngine(),
    hatching: new HatchingBrushEngine(),
    chalk: new ChalkBrushEngine()
};

// Export for use in renderer.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = kritaBrushEngines;
}
