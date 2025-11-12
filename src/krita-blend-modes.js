/**
 * Advanced Blend Modes for ARTemis
 * 
 * This module implements additional blend modes for advanced compositing
 * 
 * Blend Modes Implemented:
 * - Grain Extract: Extracts texture/grain from images
 * - Grain Merge: Merges grain back into images
 * - Geometric Mean: Averages colors geometrically
 * - Pin Light: Combines darkening and lightening
 * - Vivid Light: Extreme contrast blend
 * - Linear Dodge: Additive lightening
 * - Linear Burn: Additive darkening
 */

// ============================================================================
// BLEND MODE IMPLEMENTATIONS
// ============================================================================

const kritaBlendModes = {
    /**
     * Grain Extract
     * Extracts the grain/texture from an image by comparing with base
     * Formula: result = source - destination + 128
     * Useful for extracting textures and noise patterns
     */
    'grain-extract': function(srcR, srcG, srcB, dstR, dstG, dstB, srcA, dstA) {
        const r = Math.max(0, Math.min(255, srcR - dstR + 128));
        const g = Math.max(0, Math.min(255, srcG - dstG + 128));
        const b = Math.max(0, Math.min(255, srcB - dstB + 128));
        return { r, g, b, a: srcA };
    },

    /**
     * Grain Merge
     * Merges grain back into an image
     * Formula: result = source + destination - 128
     * Inverse of grain extract, used to apply extracted textures
     */
    'grain-merge': function(srcR, srcG, srcB, dstR, dstG, dstB, srcA, dstA) {
        const r = Math.max(0, Math.min(255, srcR + dstR - 128));
        const g = Math.max(0, Math.min(255, srcG + dstG - 128));
        const b = Math.max(0, Math.min(255, srcB + dstB - 128));
        return { r, g, b, a: srcA };
    },

    /**
     * Geometric Mean
     * Averages colors using geometric mean
     * Formula: result = sqrt(source * destination)
     * Produces darker results than arithmetic mean
     */
    'geometric-mean': function(srcR, srcG, srcB, dstR, dstG, dstB, srcA, dstA) {
        const r = Math.sqrt((srcR / 255) * (dstR / 255)) * 255;
        const g = Math.sqrt((srcG / 255) * (dstG / 255)) * 255;
        const b = Math.sqrt((srcB / 255) * (dstB / 255)) * 255;
        return { r, g, b, a: srcA };
    },

    /**
     * Pin Light
     * Combines darkening and lightening based on luminosity
     * If source < 128: uses darken mode
     * If source >= 128: uses lighten mode
     */
    'pin-light': function(srcR, srcG, srcB, dstR, dstG, dstB, srcA, dstA) {
        const pinLight = (src, dst) => {
            if (src < 128) {
                return Math.min(src * 2, dst);
            } else {
                return Math.max((src - 128) * 2, dst);
            }
        };
        
        const r = pinLight(srcR, dstR);
        const g = pinLight(srcG, dstG);
        const b = pinLight(srcB, dstB);
        return { r, g, b, a: srcA };
    },

    /**
     * Vivid Light
     * Extreme contrast blend mode
     * If source < 128: uses color burn
     * If source >= 128: uses color dodge
     */
    'vivid-light': function(srcR, srcG, srcB, dstR, dstG, dstB, srcA, dstA) {
        const vividLight = (src, dst) => {
            if (src < 128) {
                // Color burn
                if (src === 0) return 0;
                return Math.max(0, 255 - ((255 - dst) * 255) / (src * 2));
            } else {
                // Color dodge
                if (src === 255) return 255;
                return Math.min(255, (dst * 255) / (255 - (src - 128) * 2));
            }
        };
        
        const r = vividLight(srcR, dstR);
        const g = vividLight(srcG, dstG);
        const b = vividLight(srcB, dstB);
        return { r, g, b, a: srcA };
    },

    /**
     * Linear Dodge (Add)
     * Additive blending - lightens image
     * Formula: result = source + destination
     * Similar to screen but more intense
     */
    'linear-dodge': function(srcR, srcG, srcB, dstR, dstG, dstB, srcA, dstA) {
        const r = Math.min(255, srcR + dstR);
        const g = Math.min(255, srcG + dstG);
        const b = Math.min(255, srcB + dstB);
        return { r, g, b, a: srcA };
    },

    /**
     * Linear Burn
     * Subtractive blending - darkens image
     * Formula: result = source + destination - 255
     * More intense than multiply
     */
    'linear-burn': function(srcR, srcG, srcB, dstR, dstG, dstB, srcA, dstA) {
        const r = Math.max(0, srcR + dstR - 255);
        const g = Math.max(0, srcG + dstG - 255);
        const b = Math.max(0, srcB + dstB - 255);
        return { r, g, b, a: srcA };
    },

    /**
     * Divide
     * Divides destination by source
     * Formula: result = (destination / source) * 255
     * Lightens image, useful for removing gradients
     */
    'divide': function(srcR, srcG, srcB, dstR, dstG, dstB, srcA, dstA) {
        const divide = (src, dst) => {
            if (src === 0) return 255;
            return Math.min(255, (dst / src) * 255);
        };
        
        const r = divide(srcR / 255, dstR / 255) * 255;
        const g = divide(srcG / 255, dstG / 255) * 255;
        const b = divide(srcB / 255, dstB / 255) * 255;
        return { r, g, b, a: srcA };
    },

    /**
     * Subtract
     * Subtracts source from destination
     * Formula: result = destination - source
     * Darkens image by subtracting colors
     */
    'subtract': function(srcR, srcG, srcB, dstR, dstG, dstB, srcA, dstA) {
        const r = Math.max(0, dstR - srcR);
        const g = Math.max(0, dstG - srcG);
        const b = Math.max(0, dstB - srcB);
        return { r, g, b, a: srcA };
    },

    /**
     * Hard Mix
     * Creates posterized, high-contrast results
     * Combines vivid light with threshold
     */
    'hard-mix': function(srcR, srcG, srcB, dstR, dstG, dstB, srcA, dstA) {
        const hardMix = (src, dst) => {
            const sum = src + dst;
            return sum < 255 ? 0 : 255;
        };
        
        const r = hardMix(srcR, dstR);
        const g = hardMix(srcG, dstG);
        const b = hardMix(srcB, dstB);
        return { r, g, b, a: srcA };
    }
};

// ============================================================================
// CANVAS BLEND MODE APPLICATION
// ============================================================================

/**
 * Apply custom blend mode to canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {ImageData} sourceData - Source image data
 * @param {ImageData} destData - Destination image data
 * @param {string} blendMode - Blend mode name
 * @returns {ImageData} Result image data
 */
function applyKritaBlendMode(ctx, sourceData, destData, blendMode) {
    if (!kritaBlendModes[blendMode]) {
        console.warn(`Blend mode '${blendMode}' not found in Krita blend modes`);
        return sourceData;
    }
    
    const result = ctx.createImageData(sourceData.width, sourceData.height);
    const blendFunc = kritaBlendModes[blendMode];
    
    for (let i = 0; i < sourceData.data.length; i += 4) {
        const srcR = sourceData.data[i];
        const srcG = sourceData.data[i + 1];
        const srcB = sourceData.data[i + 2];
        const srcA = sourceData.data[i + 3];
        
        const dstR = destData.data[i];
        const dstG = destData.data[i + 1];
        const dstB = destData.data[i + 2];
        const dstA = destData.data[i + 3];
        
        // Apply blend mode
        const blended = blendFunc(srcR, srcG, srcB, dstR, dstG, dstB, srcA, dstA);
        
        // Alpha compositing
        const alpha = srcA / 255;
        result.data[i] = blended.r * alpha + dstR * (1 - alpha);
        result.data[i + 1] = blended.g * alpha + dstG * (1 - alpha);
        result.data[i + 2] = blended.b * alpha + dstB * (1 - alpha);
        result.data[i + 3] = Math.max(srcA, dstA);
    }
    
    return result;
}

/**
 * Get list of all available Krita blend modes
 * @returns {Array<string>} Array of blend mode names
 */
function getKritaBlendModes() {
    return Object.keys(kritaBlendModes);
}

/**
 * Check if a blend mode is a Krita blend mode
 * @param {string} blendMode - Blend mode name to check
 * @returns {boolean} True if it's a Krita blend mode
 */
function isKritaBlendMode(blendMode) {
    return kritaBlendModes.hasOwnProperty(blendMode);
}

// ============================================================================
// EXPORT
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        kritaBlendModes,
        applyKritaBlendMode,
        getKritaBlendModes,
        isKritaBlendMode
    };
}
