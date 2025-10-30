/**
 * ARTemis AI & Machine Learning Tools
 * Category 1 Implementation from Future Enhancements 2.0
 * 
 * This module provides AI-powered tools for digital painting and image editing:
 * - Generative AI Tools
 * - Neural Filters & Smart Enhancements
 * - AI Workflow Assistants
 * - Advanced AI Features
 */

class AITools {
    constructor(app) {
        this.app = app;
        this.canvas = app.canvas;
        this.ctx = app.ctx;
        this.enabled = true;
        
        // Feature flags for progressive implementation
        this.features = {
            backgroundRemoval: true,
            objectSelection: true,
            smartSharpen: true,
            autoEnhance: true,
            intelligentCrop: true,
            contentAwareFill: false, // Coming soon
            neuralUpscaling: false,  // Coming soon
            aiRelighting: false      // Coming soon
        };
        
        this.init();
    }
    
    init() {
        console.log('AI Tools initialized');
        this.setupAIPanel();
    }
    
    setupAIPanel() {
        // AI panel will be added to the UI
        console.log('AI Panel setup complete');
    }
    
    /**
     * AI Background Removal
     * Feature #2 from Category 1: One-click subject isolation
     * Using edge detection and color-based segmentation
     */
    async removeBackground(options = {}) {
        if (!this.features.backgroundRemoval) {
            throw new Error('Background removal not available');
        }
        
        const {
            tolerance = 30,
            preserveEdges = true,
            featherRadius = 2
        } = options;
        
        return new Promise((resolve) => {
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const processedData = this.processBackgroundRemoval(imageData, tolerance, preserveEdges, featherRadius);
            this.ctx.putImageData(processedData, 0, 0);
            resolve(true);
        });
    }
    
    /**
     * Process background removal using edge detection
     */
    processBackgroundRemoval(imageData, tolerance, preserveEdges, featherRadius) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // Edge detection using Sobel operator
        const edges = this.detectEdges(imageData);
        
        // Find main subject using edge density
        const mask = this.createSubjectMask(edges, width, height, tolerance);
        
        // Apply mask with feathering
        if (preserveEdges && featherRadius > 0) {
            this.featherMask(mask, width, height, featherRadius);
        }
        
        // Apply mask to alpha channel
        for (let i = 0; i < data.length; i += 4) {
            const pixelIndex = i / 4;
            data[i + 3] *= mask[pixelIndex]; // Apply mask to alpha
        }
        
        return imageData;
    }
    
    /**
     * AI Object Selection
     * Feature #4 from Category 1: Intelligent object recognition and selection
     */
    async selectObject(x, y, options = {}) {
        if (!this.features.objectSelection) {
            throw new Error('Object selection not available');
        }
        
        const {
            tolerance = 32,
            contiguous = true,
            antiAlias = true
        } = options;
        
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const selection = this.floodFillSelection(imageData, x, y, tolerance, contiguous);
        
        if (antiAlias) {
            this.antiAliasSelection(selection, imageData.width, imageData.height);
        }
        
        return selection;
    }
    
    /**
     * Smart Sharpen
     * Feature #8 from Category 1: AI-enhanced detail enhancement
     */
    async smartSharpen(options = {}) {
        if (!this.features.smartSharpen) {
            throw new Error('Smart sharpen not available');
        }
        
        const {
            amount = 1.0,
            radius = 1.0,
            threshold = 0,
            reduceNoise = true
        } = options;
        
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply noise reduction first if enabled
        if (reduceNoise) {
            this.applyNoiseReduction(imageData, 1);
        }
        
        // Apply unsharp mask
        const sharpened = this.unsharpMask(imageData, amount, radius, threshold);
        this.ctx.putImageData(sharpened, 0, 0);
        
        return true;
    }
    
    /**
     * Auto-Enhance
     * Feature #13 from Category 1: One-click intelligent image improvement
     */
    async autoEnhance(options = {}) {
        if (!this.features.autoEnhance) {
            throw new Error('Auto-enhance not available');
        }
        
        const {
            adjustExposure = true,
            adjustContrast = true,
            adjustSaturation = true,
            reduceNoise = false
        } = options;
        
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        
        // Analyze image statistics
        const stats = this.analyzeImage(imageData);
        
        // Auto-adjust exposure
        if (adjustExposure) {
            this.autoAdjustExposure(data, stats);
        }
        
        // Auto-adjust contrast
        if (adjustContrast) {
            this.autoAdjustContrast(data, stats);
        }
        
        // Auto-adjust saturation
        if (adjustSaturation) {
            this.autoAdjustSaturation(data, stats);
        }
        
        // Optional noise reduction
        if (reduceNoise) {
            this.applyNoiseReduction(imageData, 1);
        }
        
        this.ctx.putImageData(imageData, 0, 0);
        return true;
    }
    
    /**
     * Intelligent Cropping
     * Feature #15 from Category 1: AI-powered crop suggestions
     */
    async suggestCrop(aspectRatio = null) {
        if (!this.features.intelligentCrop) {
            throw new Error('Intelligent crop not available');
        }
        
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Find areas of interest using edge detection
        const edges = this.detectEdges(imageData);
        const interestPoints = this.findInterestPoints(edges, imageData.width, imageData.height);
        
        // Calculate crop suggestions based on composition rules
        const suggestions = [];
        
        // Rule of thirds crop
        suggestions.push(this.calculateRuleOfThirdsCrop(interestPoints, imageData.width, imageData.height, aspectRatio));
        
        // Golden ratio crop
        suggestions.push(this.calculateGoldenRatioCrop(interestPoints, imageData.width, imageData.height, aspectRatio));
        
        // Center-weighted crop
        suggestions.push(this.calculateCenterCrop(interestPoints, imageData.width, imageData.height, aspectRatio));
        
        return suggestions;
    }
    
    /**
     * AI-Assisted Composition
     * Feature #14 from Category 1: Golden ratio and rule of thirds overlay
     */
    getCompositionOverlay(type = 'rule-of-thirds') {
        const overlays = {
            'rule-of-thirds': this.getRuleOfThirdsOverlay(),
            'golden-ratio': this.getGoldenRatioOverlay(),
            'center': this.getCenterOverlay(),
            'diagonal': this.getDiagonalOverlay()
        };
        
        return overlays[type] || overlays['rule-of-thirds'];
    }
    
    // ============================================================================
    // Helper Methods
    // ============================================================================
    
    detectEdges(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const edges = new Float32Array(width * height);
        
        // Sobel kernels
        const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let gx = 0, gy = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4;
                        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                        const kernelIdx = (ky + 1) * 3 + (kx + 1);
                        gx += gray * sobelX[kernelIdx];
                        gy += gray * sobelY[kernelIdx];
                    }
                }
                
                edges[y * width + x] = Math.sqrt(gx * gx + gy * gy);
            }
        }
        
        return edges;
    }
    
    createSubjectMask(edges, width, height, tolerance) {
        const mask = new Float32Array(width * height);
        const threshold = this.calculateEdgeThreshold(edges, tolerance);
        
        // Find connected regions with strong edges
        for (let i = 0; i < edges.length; i++) {
            mask[i] = edges[i] > threshold ? 1.0 : 0.0;
        }
        
        // Fill interior regions
        this.fillInteriorRegions(mask, width, height);
        
        return mask;
    }
    
    calculateEdgeThreshold(edges, tolerance) {
        // Calculate histogram of edge strengths
        let sum = 0;
        let count = 0;
        for (let i = 0; i < edges.length; i++) {
            if (edges[i] > 0) {
                sum += edges[i];
                count++;
            }
        }
        const mean = sum / count;
        return mean * (tolerance / 50);
    }
    
    fillInteriorRegions(mask, width, height) {
        // Simple flood fill from edges inward
        // This is a simplified implementation
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                if (mask[idx] === 0) {
                    // Check if surrounded by mask
                    let surrounded = true;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const checkIdx = (y + dy) * width + (x + dx);
                            if (mask[checkIdx] === 0) {
                                surrounded = false;
                                break;
                            }
                        }
                        if (!surrounded) break;
                    }
                    if (surrounded) mask[idx] = 1.0;
                }
            }
        }
    }
    
    featherMask(mask, width, height, radius) {
        const tempMask = new Float32Array(mask);
        const r2 = radius * radius;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (mask[idx] < 1.0) {
                    // Find distance to nearest masked pixel
                    let minDist = Infinity;
                    for (let dy = -radius; dy <= radius; dy++) {
                        for (let dx = -radius; dx <= radius; dx++) {
                            const nx = x + dx;
                            const ny = y + dy;
                            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                const nIdx = ny * width + nx;
                                if (mask[nIdx] >= 1.0) {
                                    const dist2 = dx * dx + dy * dy;
                                    minDist = Math.min(minDist, dist2);
                                }
                            }
                        }
                    }
                    if (minDist < r2) {
                        tempMask[idx] = 1.0 - Math.sqrt(minDist) / radius;
                    }
                }
            }
        }
        
        for (let i = 0; i < mask.length; i++) {
            mask[i] = tempMask[i];
        }
    }
    
    floodFillSelection(imageData, startX, startY, tolerance, contiguous) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const selection = new Uint8Array(width * height);
        
        const startIdx = (startY * width + startX) * 4;
        const targetColor = {
            r: data[startIdx],
            g: data[startIdx + 1],
            b: data[startIdx + 2],
            a: data[startIdx + 3]
        };
        
        const stack = [[startX, startY]];
        const visited = new Set();
        
        while (stack.length > 0) {
            const [x, y] = stack.pop();
            const key = `${x},${y}`;
            
            if (visited.has(key) || x < 0 || x >= width || y < 0 || y >= height) {
                continue;
            }
            
            visited.add(key);
            const idx = (y * width + x) * 4;
            
            // Check color similarity
            const colorDist = Math.sqrt(
                Math.pow(data[idx] - targetColor.r, 2) +
                Math.pow(data[idx + 1] - targetColor.g, 2) +
                Math.pow(data[idx + 2] - targetColor.b, 2)
            );
            
            if (colorDist <= tolerance) {
                selection[y * width + x] = 255;
                
                if (contiguous) {
                    stack.push([x + 1, y]);
                    stack.push([x - 1, y]);
                    stack.push([x, y + 1]);
                    stack.push([x, y - 1]);
                }
            }
        }
        
        return selection;
    }
    
    antiAliasSelection(selection, width, height) {
        // Simple box blur for anti-aliasing
        const temp = new Uint8Array(selection);
        const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
        const kernelSum = 16;
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let sum = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = (y + ky) * width + (x + kx);
                        sum += temp[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
                    }
                }
                selection[y * width + x] = sum / kernelSum;
            }
        }
    }
    
    unsharpMask(imageData, amount, radius, threshold) {
        const data = new Uint8ClampedArray(imageData.data);
        const blurred = this.gaussianBlur(imageData, radius);
        
        for (let i = 0; i < data.length; i += 4) {
            for (let c = 0; c < 3; c++) {
                const original = data[i + c];
                const blur = blurred.data[i + c];
                const diff = original - blur;
                
                if (Math.abs(diff) >= threshold) {
                    data[i + c] = Math.min(255, Math.max(0, original + diff * amount));
                }
            }
        }
        
        return new ImageData(data, imageData.width, imageData.height);
    }
    
    gaussianBlur(imageData, radius) {
        // Simplified Gaussian blur
        const data = new Uint8ClampedArray(imageData.data);
        const width = imageData.width;
        const height = imageData.height;
        
        // Create kernel
        const size = Math.ceil(radius) * 2 + 1;
        const kernel = new Float32Array(size);
        let sum = 0;
        
        for (let i = 0; i < size; i++) {
            const x = i - Math.floor(size / 2);
            kernel[i] = Math.exp(-(x * x) / (2 * radius * radius));
            sum += kernel[i];
        }
        
        // Normalize kernel
        for (let i = 0; i < size; i++) {
            kernel[i] /= sum;
        }
        
        // Apply horizontal blur
        const temp = new Uint8ClampedArray(data);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                for (let c = 0; c < 3; c++) {
                    let sum = 0;
                    for (let k = 0; k < size; k++) {
                        const sx = Math.min(width - 1, Math.max(0, x + k - Math.floor(size / 2)));
                        sum += temp[(y * width + sx) * 4 + c] * kernel[k];
                    }
                    data[(y * width + x) * 4 + c] = sum;
                }
            }
        }
        
        // Apply vertical blur
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                for (let c = 0; c < 3; c++) {
                    let sum = 0;
                    for (let k = 0; k < size; k++) {
                        const sy = Math.min(height - 1, Math.max(0, y + k - Math.floor(size / 2)));
                        sum += data[(sy * width + x) * 4 + c] * kernel[k];
                    }
                    temp[(y * width + x) * 4 + c] = sum;
                }
            }
        }
        
        return new ImageData(temp, width, height);
    }
    
    applyNoiseReduction(imageData, strength) {
        // Simple median filter for noise reduction
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const temp = new Uint8ClampedArray(data);
        
        for (let y = strength; y < height - strength; y++) {
            for (let x = strength; x < width - strength; x++) {
                for (let c = 0; c < 3; c++) {
                    const values = [];
                    for (let dy = -strength; dy <= strength; dy++) {
                        for (let dx = -strength; dx <= strength; dx++) {
                            values.push(temp[((y + dy) * width + (x + dx)) * 4 + c]);
                        }
                    }
                    values.sort((a, b) => a - b);
                    data[(y * width + x) * 4 + c] = values[Math.floor(values.length / 2)];
                }
            }
        }
    }
    
    analyzeImage(imageData) {
        const data = imageData.data;
        const stats = {
            meanR: 0, meanG: 0, meanB: 0,
            minR: 255, minG: 255, minB: 255,
            maxR: 0, maxG: 0, maxB: 0
        };
        
        const pixelCount = data.length / 4;
        
        for (let i = 0; i < data.length; i += 4) {
            stats.meanR += data[i];
            stats.meanG += data[i + 1];
            stats.meanB += data[i + 2];
            
            stats.minR = Math.min(stats.minR, data[i]);
            stats.minG = Math.min(stats.minG, data[i + 1]);
            stats.minB = Math.min(stats.minB, data[i + 2]);
            
            stats.maxR = Math.max(stats.maxR, data[i]);
            stats.maxG = Math.max(stats.maxG, data[i + 1]);
            stats.maxB = Math.max(stats.maxB, data[i + 2]);
        }
        
        stats.meanR /= pixelCount;
        stats.meanG /= pixelCount;
        stats.meanB /= pixelCount;
        
        return stats;
    }
    
    autoAdjustExposure(data, stats) {
        const targetMean = 128;
        const currentMean = (stats.meanR + stats.meanG + stats.meanB) / 3;
        const adjustment = (targetMean - currentMean) * 0.3; // Subtle adjustment
        
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, data[i] + adjustment));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + adjustment));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + adjustment));
        }
    }
    
    autoAdjustContrast(data, stats) {
        const rangeR = stats.maxR - stats.minR;
        const rangeG = stats.maxG - stats.minG;
        const rangeB = stats.maxB - stats.minB;
        const avgRange = (rangeR + rangeG + rangeB) / 3;
        
        if (avgRange < 200) {
            const factor = 1.2; // Increase contrast
            const midpoint = 128;
            
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, Math.max(0, (data[i] - midpoint) * factor + midpoint));
                data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - midpoint) * factor + midpoint));
                data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - midpoint) * factor + midpoint));
            }
        }
    }
    
    autoAdjustSaturation(data, stats) {
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Convert to HSL
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const l = (max + min) / 2;
            
            if (max !== min) {
                const d = max - min;
                const s = l > 127 ? d / (510 - max - min) : d / (max + min);
                
                // Increase saturation slightly
                const newS = Math.min(1, s * 1.15);
                
                // Convert back to RGB
                const c = (255 - Math.abs(2 * l - 255)) * newS;
                const x = c * (1 - Math.abs(((max === r ? (g - b) / d : max === g ? 2 + (b - r) / d : 4 + (r - g) / d) % 6) - 1));
                const m = l - c / 2;
                
                if (max === r) {
                    data[i] = Math.min(255, Math.max(0, c + m));
                    data[i + 1] = Math.min(255, Math.max(0, x + m));
                    data[i + 2] = Math.min(255, Math.max(0, m));
                } else if (max === g) {
                    data[i] = Math.min(255, Math.max(0, x + m));
                    data[i + 1] = Math.min(255, Math.max(0, c + m));
                    data[i + 2] = Math.min(255, Math.max(0, m));
                } else {
                    data[i] = Math.min(255, Math.max(0, m));
                    data[i + 1] = Math.min(255, Math.max(0, x + m));
                    data[i + 2] = Math.min(255, Math.max(0, c + m));
                }
            }
        }
    }
    
    findInterestPoints(edges, width, height) {
        const points = [];
        const threshold = this.calculateEdgeThreshold(edges, 50);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (edges[y * width + x] > threshold) {
                    points.push({ x, y, strength: edges[y * width + x] });
                }
            }
        }
        
        return points;
    }
    
    calculateRuleOfThirdsCrop(points, width, height, aspectRatio) {
        // Find center of mass of interest points
        let cx = 0, cy = 0, totalStrength = 0;
        for (const point of points) {
            cx += point.x * point.strength;
            cy += point.y * point.strength;
            totalStrength += point.strength;
        }
        cx /= totalStrength;
        cy /= totalStrength;
        
        // Align with rule of thirds
        const thirdW = width / 3;
        const thirdH = height / 3;
        
        // Find closest third line
        const targetX = cx < thirdW ? thirdW : cx < 2 * thirdW ? width / 2 : 2 * thirdW;
        const targetY = cy < thirdH ? thirdH : cy < 2 * thirdH ? height / 2 : 2 * thirdH;
        
        const cropWidth = aspectRatio ? height * aspectRatio : width * 0.8;
        const cropHeight = aspectRatio ? cropWidth / aspectRatio : height * 0.8;
        
        return {
            x: Math.max(0, targetX - cropWidth / 2),
            y: Math.max(0, targetY - cropHeight / 2),
            width: Math.min(cropWidth, width),
            height: Math.min(cropHeight, height),
            type: 'rule-of-thirds'
        };
    }
    
    calculateGoldenRatioCrop(points, width, height, aspectRatio) {
        const phi = 1.618;
        const cropWidth = aspectRatio ? height * aspectRatio : width / phi;
        const cropHeight = aspectRatio ? cropWidth / aspectRatio : height / phi;
        
        return {
            x: (width - cropWidth) / 2,
            y: (height - cropHeight) / 2,
            width: cropWidth,
            height: cropHeight,
            type: 'golden-ratio'
        };
    }
    
    calculateCenterCrop(points, width, height, aspectRatio) {
        const cropWidth = aspectRatio ? height * aspectRatio : width * 0.75;
        const cropHeight = aspectRatio ? cropWidth / aspectRatio : height * 0.75;
        
        return {
            x: (width - cropWidth) / 2,
            y: (height - cropHeight) / 2,
            width: cropWidth,
            height: cropHeight,
            type: 'center'
        };
    }
    
    getRuleOfThirdsOverlay() {
        return {
            type: 'rule-of-thirds',
            lines: [
                { x1: 1/3, y1: 0, x2: 1/3, y2: 1 },
                { x1: 2/3, y1: 0, x2: 2/3, y2: 1 },
                { x1: 0, y1: 1/3, x2: 1, y2: 1/3 },
                { x1: 0, y1: 2/3, x2: 1, y2: 2/3 }
            ]
        };
    }
    
    getGoldenRatioOverlay() {
        const phi = 1.618;
        const ratio = 1 / phi;
        
        return {
            type: 'golden-ratio',
            lines: [
                { x1: ratio, y1: 0, x2: ratio, y2: 1 },
                { x1: 1 - ratio, y1: 0, x2: 1 - ratio, y2: 1 },
                { x1: 0, y1: ratio, x2: 1, y2: ratio },
                { x1: 0, y1: 1 - ratio, x2: 1, y2: 1 - ratio }
            ]
        };
    }
    
    getCenterOverlay() {
        return {
            type: 'center',
            lines: [
                { x1: 0.5, y1: 0, x2: 0.5, y2: 1 },
                { x1: 0, y1: 0.5, x2: 1, y2: 0.5 }
            ]
        };
    }
    
    getDiagonalOverlay() {
        return {
            type: 'diagonal',
            lines: [
                { x1: 0, y1: 0, x2: 1, y2: 1 },
                { x1: 1, y1: 0, x2: 0, y2: 1 }
            ]
        };
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AITools;
}
