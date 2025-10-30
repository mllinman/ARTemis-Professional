/**
 * Color Management & Grading Module - Category 6 Implementation
 * Professional color management, adjustment tools, and color grading features
 */

class ColorManagement {
    constructor() {
        // Color profile management
        this.currentProfile = 'sRGB';
        this.embeddedProfiles = new Map();
        this.supportedColorSpaces = ['sRGB', 'Display-P3', 'Adobe-RGB', 'ProPhoto-RGB', 'CMYK'];
        
        // HDR support
        this.hdrMode = false;
        this.bitDepth = 8; // 8, 16, or 32
        
        // LUT storage
        this.luts = new Map();
        this.loadDefaultLUTs();
        
        // Calibration data
        this.calibrationData = null;
    }
    
    // ========== Color Spaces & Management ==========
    
    /**
     * ICC Profile Support - Professional color management
     */
    embedICCProfile(imageData, profileData) {
        this.embeddedProfiles.set('current', profileData);
        return {
            success: true,
            profile: profileData,
            message: 'ICC profile embedded successfully'
        };
    }
    
    convertColorProfile(imageData, sourceProfile, targetProfile) {
        const data = imageData.data;
        
        // Simplified color space conversion matrix
        const conversionMatrices = {
            'sRGB-to-Display-P3': [
                [0.8225, 0.1774, 0.0001],
                [0.0331, 0.9669, 0.0001],
                [0.0170, 0.0724, 0.9106]
            ],
            'sRGB-to-Adobe-RGB': [
                [0.7151, 0.2849, 0.0000],
                [0.0000, 1.0000, 0.0000],
                [0.0000, 0.0412, 0.9588]
            ],
            'sRGB-to-ProPhoto-RGB': [
                [0.5767, 0.1856, 0.1882],
                [0.2974, 0.6274, 0.0753],
                [0.0270, 0.0707, 0.9911]
            ]
        };
        
        const key = `${sourceProfile}-to-${targetProfile}`;
        const matrix = conversionMatrices[key];
        
        if (matrix) {
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i] / 255;
                const g = data[i + 1] / 255;
                const b = data[i + 2] / 255;
                
                // Apply transformation matrix
                const newR = r * matrix[0][0] + g * matrix[0][1] + b * matrix[0][2];
                const newG = r * matrix[1][0] + g * matrix[1][1] + b * matrix[1][2];
                const newB = r * matrix[2][0] + g * matrix[2][1] + b * matrix[2][2];
                
                data[i] = Math.round(Math.max(0, Math.min(1, newR)) * 255);
                data[i + 1] = Math.round(Math.max(0, Math.min(1, newG)) * 255);
                data[i + 2] = Math.round(Math.max(0, Math.min(1, newB)) * 255);
            }
        }
        
        return imageData;
    }
    
    softProofing(imageData, targetProfile) {
        // Simulate how image will look in target color space
        const proofData = new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
        );
        
        return this.convertColorProfile(proofData, this.currentProfile, targetProfile);
    }
    
    gamutWarning(imageData, targetProfile) {
        // Mark out-of-gamut colors
        const data = imageData.data;
        const gamutLimits = this.getGamutLimits(targetProfile);
        
        for (let i = 0; i < data.length; i += 4) {
            const [l, a, b] = this.rgbToLab(data[i], data[i + 1], data[i + 2]);
            
            if (!this.isInGamut(l, a, b, gamutLimits)) {
                // Mark as gray to indicate out-of-gamut
                data[i] = 128;
                data[i + 1] = 128;
                data[i + 2] = 128;
            }
        }
        
        return imageData;
    }
    
    /**
     * Wide Gamut Support - Extended color spaces
     */
    setColorSpace(colorSpace) {
        if (!this.supportedColorSpaces.includes(colorSpace)) {
            throw new Error(`Unsupported color space: ${colorSpace}`);
        }
        this.currentProfile = colorSpace;
        return { success: true, colorSpace };
    }
    
    convertToCMYK(imageData) {
        const data = imageData.data;
        const cmykData = [];
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i] / 255;
            const g = data[i + 1] / 255;
            const b = data[i + 2] / 255;
            
            // RGB to CMYK conversion
            const k = 1 - Math.max(r, g, b);
            const c = k === 1 ? 0 : (1 - r - k) / (1 - k);
            const m = k === 1 ? 0 : (1 - g - k) / (1 - k);
            const y = k === 1 ? 0 : (1 - b - k) / (1 - k);
            
            cmykData.push({ c, m, y, k, a: data[i + 3] / 255 });
        }
        
        return cmykData;
    }
    
    convertFromCMYK(cmykData, width, height) {
        const imageData = new ImageData(width, height);
        const data = imageData.data;
        
        for (let i = 0; i < cmykData.length; i++) {
            const { c, m, y, k, a } = cmykData[i];
            
            // CMYK to RGB conversion
            const r = 255 * (1 - c) * (1 - k);
            const g = 255 * (1 - m) * (1 - k);
            const b = 255 * (1 - y) * (1 - k);
            
            const idx = i * 4;
            data[idx] = Math.round(r);
            data[idx + 1] = Math.round(g);
            data[idx + 2] = Math.round(b);
            data[idx + 3] = Math.round(a * 255);
        }
        
        return imageData;
    }
    
    /**
     * HDR Color Support - High dynamic range colors
     */
    enableHDR(bitDepth = 16) {
        this.hdrMode = true;
        this.bitDepth = bitDepth;
        return { success: true, bitDepth, hdrMode: true };
    }
    
    convertTo16Bit(imageData) {
        // Convert 8-bit to 16-bit per channel
        const data = imageData.data;
        const data16 = new Uint16Array(data.length);
        
        for (let i = 0; i < data.length; i++) {
            data16[i] = (data[i] / 255) * 65535;
        }
        
        return data16;
    }
    
    convertTo32BitFloat(imageData) {
        // Convert to 32-bit float per channel
        const data = imageData.data;
        const data32 = new Float32Array(data.length);
        
        for (let i = 0; i < data.length; i++) {
            data32[i] = data[i] / 255;
        }
        
        return data32;
    }
    
    toneMap(hdrData, method = 'reinhard') {
        // Tone mapping for HDR display
        const methods = {
            reinhard: (val) => val / (1 + val),
            filmic: (val) => {
                const a = 2.51;
                const b = 0.03;
                const c = 2.43;
                const d = 0.59;
                const e = 0.14;
                return Math.max(0, (val * (a * val + b)) / (val * (c * val + d) + e));
            },
            aces: (val) => {
                const a = 2.51;
                const b = 0.03;
                const c = 2.43;
                const d = 0.59;
                const e = 0.14;
                return (val * (a * val + b)) / (val * (c * val + d) + e);
            }
        };
        
        const mapFunc = methods[method] || methods.reinhard;
        return hdrData.map(val => mapFunc(val));
    }
    
    /**
     * LUT Support - Look-Up Table color grading
     */
    loadDefaultLUTs() {
        // Preset LUTs for common looks
        this.luts.set('neutral', this.createIdentityLUT());
        this.luts.set('warm', this.createWarmLUT());
        this.luts.set('cool', this.createCoolLUT());
        this.luts.set('cinematic', this.createCinematicLUT());
        this.luts.set('vintage', this.createVintageLUT());
    }
    
    createIdentityLUT() {
        const size = 33; // 33x33x33 LUT
        const lut = [];
        
        for (let b = 0; b < size; b++) {
            for (let g = 0; g < size; g++) {
                for (let r = 0; r < size; r++) {
                    lut.push({
                        r: r / (size - 1),
                        g: g / (size - 1),
                        b: b / (size - 1)
                    });
                }
            }
        }
        
        return { size, data: lut };
    }
    
    createWarmLUT() {
        const lut = this.createIdentityLUT();
        // Apply warm tone transformation
        lut.data = lut.data.map(color => ({
            r: Math.min(1, color.r * 1.05),
            g: color.g,
            b: Math.max(0, color.b * 0.95)
        }));
        return lut;
    }
    
    createCoolLUT() {
        const lut = this.createIdentityLUT();
        // Apply cool tone transformation
        lut.data = lut.data.map(color => ({
            r: Math.max(0, color.r * 0.95),
            g: color.g,
            b: Math.min(1, color.b * 1.05)
        }));
        return lut;
    }
    
    createCinematicLUT() {
        const lut = this.createIdentityLUT();
        // Cinematic look with lifted blacks and rolled highlights
        lut.data = lut.data.map(color => ({
            r: this.applyCinematicCurve(color.r),
            g: this.applyCinematicCurve(color.g),
            b: this.applyCinematicCurve(color.b)
        }));
        return lut;
    }
    
    applyCinematicCurve(value) {
        // S-curve with lifted blacks
        const lifted = value * 0.9 + 0.05;
        return Math.pow(lifted, 0.9);
    }
    
    createVintageLUT() {
        const lut = this.createIdentityLUT();
        // Vintage look with faded colors
        lut.data = lut.data.map(color => ({
            r: color.r * 0.85 + 0.1,
            g: color.g * 0.85 + 0.08,
            b: color.b * 0.85 + 0.05
        }));
        return lut;
    }
    
    applyLUT(imageData, lutName) {
        const lut = this.luts.get(lutName);
        if (!lut) {
            throw new Error(`LUT not found: ${lutName}`);
        }
        
        const data = imageData.data;
        const size = lut.size;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i] / 255;
            const g = data[i + 1] / 255;
            const b = data[i + 2] / 255;
            
            // Trilinear interpolation in 3D LUT
            const newColor = this.trilinearInterpolation(r, g, b, lut);
            
            data[i] = Math.round(newColor.r * 255);
            data[i + 1] = Math.round(newColor.g * 255);
            data[i + 2] = Math.round(newColor.b * 255);
        }
        
        return imageData;
    }
    
    trilinearInterpolation(r, g, b, lut) {
        const size = lut.size - 1;
        const rIdx = r * size;
        const gIdx = g * size;
        const bIdx = b * size;
        
        const r0 = Math.floor(rIdx);
        const g0 = Math.floor(gIdx);
        const b0 = Math.floor(bIdx);
        const r1 = Math.min(size, r0 + 1);
        const g1 = Math.min(size, g0 + 1);
        const b1 = Math.min(size, b0 + 1);
        
        const rFrac = rIdx - r0;
        const gFrac = gIdx - g0;
        const bFrac = bIdx - b0;
        
        // Get 8 corner values
        const c000 = lut.data[b0 * (size + 1) * (size + 1) + g0 * (size + 1) + r0];
        const c001 = lut.data[b0 * (size + 1) * (size + 1) + g0 * (size + 1) + r1];
        const c010 = lut.data[b0 * (size + 1) * (size + 1) + g1 * (size + 1) + r0];
        const c011 = lut.data[b0 * (size + 1) * (size + 1) + g1 * (size + 1) + r1];
        const c100 = lut.data[b1 * (size + 1) * (size + 1) + g0 * (size + 1) + r0];
        const c101 = lut.data[b1 * (size + 1) * (size + 1) + g0 * (size + 1) + r1];
        const c110 = lut.data[b1 * (size + 1) * (size + 1) + g1 * (size + 1) + r0];
        const c111 = lut.data[b1 * (size + 1) * (size + 1) + g1 * (size + 1) + r1];
        
        // Trilinear interpolation
        const c00 = this.lerpColor(c000, c001, rFrac);
        const c01 = this.lerpColor(c010, c011, rFrac);
        const c10 = this.lerpColor(c100, c101, rFrac);
        const c11 = this.lerpColor(c110, c111, rFrac);
        
        const c0 = this.lerpColor(c00, c01, gFrac);
        const c1 = this.lerpColor(c10, c11, gFrac);
        
        return this.lerpColor(c0, c1, bFrac);
    }
    
    lerpColor(c1, c2, t) {
        return {
            r: c1.r + (c2.r - c1.r) * t,
            g: c1.g + (c2.g - c1.g) * t,
            b: c1.b + (c2.b - c1.b) * t
        };
    }
    
    import3DLUT(lutData, name) {
        // Import custom 3D LUT file
        this.luts.set(name, lutData);
        return { success: true, name };
    }
    
    /**
     * Color Calibration Tools - Display calibration
     */
    calibrateDisplay(calibrationValues) {
        this.calibrationData = {
            whitePoint: calibrationValues.whitePoint || { x: 0.3127, y: 0.3290 }, // D65
            blackPoint: calibrationValues.blackPoint || { r: 0, g: 0, b: 0 },
            gamma: calibrationValues.gamma || 2.2,
            brightness: calibrationValues.brightness || 120,
            contrast: calibrationValues.contrast || 50
        };
        
        return { success: true, calibration: this.calibrationData };
    }
    
    validateCalibration() {
        if (!this.calibrationData) {
            return { valid: false, message: 'No calibration data found' };
        }
        
        const age = Date.now() - (this.calibrationData.timestamp || 0);
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        
        return {
            valid: age < maxAge,
            age: age,
            message: age < maxAge ? 'Calibration valid' : 'Calibration expired, please recalibrate'
        };
    }
    
    // ========== Color Adjustment Tools ==========
    
    /**
     * Curves Advanced - Professional tone control
     */
    applyCurvesAdvanced(imageData, curves) {
        const data = imageData.data;
        
        // Create curve maps for each channel
        const rgbCurve = curves.rgb ? this.createCurveMap(curves.rgb) : null;
        const redCurve = curves.red ? this.createCurveMap(curves.red) : null;
        const greenCurve = curves.green ? this.createCurveMap(curves.green) : null;
        const blueCurve = curves.blue ? this.createCurveMap(curves.blue) : null;
        
        for (let i = 0; i < data.length; i += 4) {
            // Apply RGB curve first (if exists)
            if (rgbCurve) {
                data[i] = rgbCurve[data[i]];
                data[i + 1] = rgbCurve[data[i + 1]];
                data[i + 2] = rgbCurve[data[i + 2]];
            }
            
            // Then apply individual channel curves
            if (redCurve) data[i] = redCurve[data[i]];
            if (greenCurve) data[i + 1] = greenCurve[data[i + 1]];
            if (blueCurve) data[i + 2] = blueCurve[data[i + 2]];
        }
        
        return imageData;
    }
    
    createCurveMap(points) {
        const map = new Array(256);
        
        // Ensure start and end points
        if (!points.find(p => p.x === 0)) points.unshift({ x: 0, y: 0 });
        if (!points.find(p => p.x === 1)) points.push({ x: 1, y: 1 });
        
        const sorted = points.sort((a, b) => a.x - b.x);
        
        for (let i = 0; i < 256; i++) {
            const x = i / 255;
            let y = x;
            
            // Find the segment containing this x value
            for (let j = 0; j < sorted.length - 1; j++) {
                if (x >= sorted[j].x && x <= sorted[j + 1].x) {
                    // Use cubic interpolation for smooth curves
                    y = this.cubicInterpolate(sorted, j, x);
                    break;
                }
            }
            
            map[i] = Math.max(0, Math.min(255, Math.round(y * 255)));
        }
        
        return map;
    }
    
    cubicInterpolate(points, index, x) {
        const p0 = points[Math.max(0, index - 1)];
        const p1 = points[index];
        const p2 = points[index + 1];
        const p3 = points[Math.min(points.length - 1, index + 2)];
        
        const t = (x - p1.x) / (p2.x - p1.x);
        const t2 = t * t;
        const t3 = t2 * t;
        
        // Catmull-Rom spline
        const v0 = p0.y;
        const v1 = p1.y;
        const v2 = p2.y;
        const v3 = p3.y;
        
        return 0.5 * (
            (2 * v1) +
            (-v0 + v2) * t +
            (2 * v0 - 5 * v1 + 4 * v2 - v3) * t2 +
            (-v0 + 3 * v1 - 3 * v2 + v3) * t3
        );
    }
    
    /**
     * Levels Per Channel - Precise tonal control
     */
    applyLevelsPerChannel(imageData, levels) {
        const data = imageData.data;
        
        const channels = ['red', 'green', 'blue'];
        const maps = {};
        
        // Create level maps for each channel
        channels.forEach((channel, idx) => {
            if (levels[channel]) {
                maps[idx] = this.createLevelMap(levels[channel]);
            }
        });
        
        for (let i = 0; i < data.length; i += 4) {
            if (maps[0]) data[i] = maps[0][data[i]];
            if (maps[1]) data[i + 1] = maps[1][data[i + 1]];
            if (maps[2]) data[i + 2] = maps[2][data[i + 2]];
        }
        
        return imageData;
    }
    
    createLevelMap(levelSettings) {
        const { inputBlack = 0, inputWhite = 255, outputBlack = 0, outputWhite = 255, gamma = 1.0 } = levelSettings;
        const map = new Array(256);
        
        const inputRange = inputWhite - inputBlack;
        const outputRange = outputWhite - outputBlack;
        
        for (let i = 0; i < 256; i++) {
            let value = i;
            
            // Apply input levels
            value = Math.max(0, Math.min(255, (value - inputBlack) * (255 / inputRange)));
            
            // Apply gamma
            value = Math.pow(value / 255, 1 / gamma) * 255;
            
            // Apply output levels
            value = outputBlack + (value / 255) * outputRange;
            
            map[i] = Math.max(0, Math.min(255, Math.round(value)));
        }
        
        return map;
    }
    
    autoLevels(imageData) {
        const data = imageData.data;
        const histogram = { r: new Array(256).fill(0), g: new Array(256).fill(0), b: new Array(256).fill(0) };
        
        // Build histogram
        for (let i = 0; i < data.length; i += 4) {
            histogram.r[data[i]]++;
            histogram.g[data[i + 1]]++;
            histogram.b[data[i + 2]]++;
        }
        
        // Find min/max for each channel (exclude 0.5% on each end)
        const threshold = (data.length / 4) * 0.005;
        const levels = {};
        
        ['r', 'g', 'b'].forEach((channel, idx) => {
            let min = 0, max = 255;
            let count = 0;
            
            for (let i = 0; i < 256; i++) {
                count += histogram[channel][i];
                if (count > threshold && min === 0) min = i;
            }
            
            count = 0;
            for (let i = 255; i >= 0; i--) {
                count += histogram[channel][i];
                if (count > threshold) {
                    max = i;
                    break;
                }
            }
            
            levels[['red', 'green', 'blue'][idx]] = { inputBlack: min, inputWhite: max };
        });
        
        return this.applyLevelsPerChannel(imageData, levels);
    }
    
    /**
     * Selective Color - Target specific colors
     */
    applySelectiveColor(imageData, adjustments) {
        const data = imageData.data;
        const colorRanges = {
            reds: { h: [345, 15], s: [0.2, 1], l: [0.1, 0.9] },
            yellows: { h: [30, 75], s: [0.2, 1], l: [0.2, 0.9] },
            greens: { h: [75, 165], s: [0.2, 1], l: [0.1, 0.9] },
            cyans: { h: [165, 195], s: [0.2, 1], l: [0.2, 0.9] },
            blues: { h: [195, 255], s: [0.2, 1], l: [0.1, 0.9] },
            magentas: { h: [285, 345], s: [0.2, 1], l: [0.1, 0.9] },
            whites: { h: [0, 360], s: [0, 0.2], l: [0.8, 1] },
            neutrals: { h: [0, 360], s: [0, 0.2], l: [0.2, 0.8] },
            blacks: { h: [0, 360], s: [0, 0.5], l: [0, 0.2] }
        };
        
        for (let i = 0; i < data.length; i += 4) {
            const [h, s, l] = this.rgbToHsl(data[i], data[i + 1], data[i + 2]);
            
            // Check which color range this pixel belongs to
            for (const [colorName, range] of Object.entries(colorRanges)) {
                if (this.isInColorRange(h, s, l, range)) {
                    const adj = adjustments[colorName];
                    if (adj) {
                        // Apply CMYK adjustments
                        const [c, m, y, k] = this.rgbToCmyk(data[i], data[i + 1], data[i + 2]);
                        
                        const newC = Math.max(0, Math.min(1, c + (adj.cyan || 0) / 100));
                        const newM = Math.max(0, Math.min(1, m + (adj.magenta || 0) / 100));
                        const newY = Math.max(0, Math.min(1, y + (adj.yellow || 0) / 100));
                        const newK = Math.max(0, Math.min(1, k + (adj.black || 0) / 100));
                        
                        const [r, g, b] = this.cmykToRgb(newC, newM, newY, newK);
                        data[i] = r;
                        data[i + 1] = g;
                        data[i + 2] = b;
                    }
                    break;
                }
            }
        }
        
        return imageData;
    }
    
    isInColorRange(h, s, l, range) {
        const hue = h * 360;
        const sat = s;
        const lum = l;
        
        // Handle hue wraparound
        let inHueRange = false;
        if (range.h[0] > range.h[1]) {
            inHueRange = hue >= range.h[0] || hue <= range.h[1];
        } else {
            inHueRange = hue >= range.h[0] && hue <= range.h[1];
        }
        
        return inHueRange && sat >= range.s[0] && sat <= range.s[1] && lum >= range.l[0] && lum <= range.l[1];
    }
    
    /**
     * Color Balance Advanced - Sophisticated color correction
     */
    applyColorBalance(imageData, balance) {
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const [h, s, l] = this.rgbToHsl(data[i], data[i + 1], data[i + 2]);
            
            let shadows = 0, midtones = 0, highlights = 0;
            
            // Determine which tonal range
            if (l < 0.33) {
                shadows = 1 - (l / 0.33);
                midtones = l / 0.33;
            } else if (l < 0.67) {
                midtones = 1 - Math.abs(l - 0.5) / 0.17;
                if (l < 0.5) shadows = 1 - midtones;
                else highlights = 1 - midtones;
            } else {
                highlights = (l - 0.67) / 0.33;
                midtones = 1 - highlights;
            }
            
            // Apply adjustments
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            
            if (balance.shadows) {
                r += balance.shadows.cyan * shadows * 2.55;
                g += balance.shadows.magenta * shadows * 2.55;
                b += balance.shadows.yellow * shadows * 2.55;
            }
            
            if (balance.midtones) {
                r += balance.midtones.cyan * midtones * 2.55;
                g += balance.midtones.magenta * midtones * 2.55;
                b += balance.midtones.yellow * midtones * 2.55;
            }
            
            if (balance.highlights) {
                r += balance.highlights.cyan * highlights * 2.55;
                g += balance.highlights.magenta * highlights * 2.55;
                b += balance.highlights.yellow * highlights * 2.55;
            }
            
            data[i] = Math.max(0, Math.min(255, r));
            data[i + 1] = Math.max(0, Math.min(255, g));
            data[i + 2] = Math.max(0, Math.min(255, b));
        }
        
        return imageData;
    }
    
    /**
     * HSL/HSV Adjustment - Hue-based color editing
     */
    applyHSLAdjustment(imageData, adjustments) {
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            let [h, s, l] = this.rgbToHsl(data[i], data[i + 1], data[i + 2]);
            
            // Target specific hue ranges
            if (adjustments.targetHue !== undefined) {
                const targetHue = adjustments.targetHue / 360;
                const range = (adjustments.hueRange || 30) / 360;
                const distance = Math.min(
                    Math.abs(h - targetHue),
                    1 - Math.abs(h - targetHue)
                );
                
                if (distance <= range) {
                    const strength = 1 - (distance / range);
                    
                    if (adjustments.hueShift !== undefined) {
                        h = (h + (adjustments.hueShift / 360) * strength) % 1;
                    }
                    
                    if (adjustments.saturationShift !== undefined) {
                        s = Math.max(0, Math.min(1, s + (adjustments.saturationShift / 100) * strength));
                    }
                    
                    if (adjustments.lightnessShift !== undefined) {
                        l = Math.max(0, Math.min(1, l + (adjustments.lightnessShift / 100) * strength));
                    }
                }
            } else {
                // Apply globally
                if (adjustments.hueShift !== undefined) {
                    h = (h + adjustments.hueShift / 360) % 1;
                }
                
                if (adjustments.saturationShift !== undefined) {
                    s = Math.max(0, Math.min(1, s + adjustments.saturationShift / 100));
                }
                
                if (adjustments.lightnessShift !== undefined) {
                    l = Math.max(0, Math.min(1, l + adjustments.lightnessShift / 100));
                }
            }
            
            const [r, g, b] = this.hslToRgb(h, s, l);
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
        }
        
        return imageData;
    }
    
    colorIsolation(imageData, targetHue, range = 30) {
        // Desaturate all colors except target hue range
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const [h, s, l] = this.rgbToHsl(data[i], data[i + 1], data[i + 2]);
            const hue = h * 360;
            const targetNorm = targetHue / 360;
            
            const distance = Math.min(
                Math.abs(hue - targetHue),
                360 - Math.abs(hue - targetHue)
            );
            
            if (distance > range) {
                // Desaturate
                const [r, g, b] = this.hslToRgb(h, 0, l);
                data[i] = r;
                data[i + 1] = g;
                data[i + 2] = b;
            }
        }
        
        return imageData;
    }
    
    // ========== Color Grading ==========
    
    /**
     * Color Wheels - Professional grading interface
     */
    applyColorWheels(imageData, wheels) {
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const [h, s, l] = this.rgbToHsl(data[i], data[i + 1], data[i + 2]);
            
            // Lift (shadows)
            if (wheels.lift && l < 0.33) {
                const strength = 1 - (l / 0.33);
                data[i] += wheels.lift.red * strength;
                data[i + 1] += wheels.lift.green * strength;
                data[i + 2] += wheels.lift.blue * strength;
            }
            
            // Gamma (midtones)
            if (wheels.gamma && l >= 0.33 && l <= 0.67) {
                const strength = 1 - Math.abs(l - 0.5) / 0.17;
                const gammaR = Math.pow(data[i] / 255, 1 / (1 + wheels.gamma.red / 100)) * 255;
                const gammaG = Math.pow(data[i + 1] / 255, 1 / (1 + wheels.gamma.green / 100)) * 255;
                const gammaB = Math.pow(data[i + 2] / 255, 1 / (1 + wheels.gamma.blue / 100)) * 255;
                
                data[i] = data[i] + (gammaR - data[i]) * strength;
                data[i + 1] = data[i + 1] + (gammaG - data[i + 1]) * strength;
                data[i + 2] = data[i + 2] + (gammaB - data[i + 2]) * strength;
            }
            
            // Gain (highlights)
            if (wheels.gain && l > 0.67) {
                const strength = (l - 0.67) / 0.33;
                data[i] *= (1 + wheels.gain.red / 100) * strength + (1 - strength);
                data[i + 1] *= (1 + wheels.gain.green / 100) * strength + (1 - strength);
                data[i + 2] *= (1 + wheels.gain.blue / 100) * strength + (1 - strength);
            }
            
            data[i] = Math.max(0, Math.min(255, data[i]));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1]));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2]));
        }
        
        return imageData;
    }
    
    /**
     * Split Toning - Dual color grading
     */
    applySplitToning(imageData, splitTone) {
        const data = imageData.data;
        const { highlightColor, shadowColor, balance = 0 } = splitTone;
        
        for (let i = 0; i < data.length; i += 4) {
            const [h, s, l] = this.rgbToHsl(data[i], data[i + 1], data[i + 2]);
            
            // Determine blend based on luminosity and balance
            const threshold = 0.5 + balance / 100;
            
            if (l > threshold && highlightColor) {
                const strength = ((l - threshold) / (1 - threshold)) * (highlightColor.saturation / 100);
                const tintColor = this.hslToRgb(highlightColor.hue / 360, 1, 0.5);
                
                data[i] = data[i] + (tintColor[0] - data[i]) * strength;
                data[i + 1] = data[i + 1] + (tintColor[1] - data[i + 1]) * strength;
                data[i + 2] = data[i + 2] + (tintColor[2] - data[i + 2]) * strength;
            } else if (l <= threshold && shadowColor) {
                const strength = ((threshold - l) / threshold) * (shadowColor.saturation / 100);
                const tintColor = this.hslToRgb(shadowColor.hue / 360, 1, 0.5);
                
                data[i] = data[i] + (tintColor[0] - data[i]) * strength;
                data[i + 1] = data[i + 1] + (tintColor[1] - data[i + 1]) * strength;
                data[i + 2] = data[i + 2] + (tintColor[2] - data[i + 2]) * strength;
            }
        }
        
        return imageData;
    }
    
    /**
     * Color Lookup - Preset color grades
     */
    applyColorLookup(imageData, presetName) {
        const presets = {
            'film-emulation-kodak': { lut: 'cinematic', brightness: 5, contrast: 10 },
            'film-emulation-fuji': { lut: 'warm', brightness: 0, contrast: 8 },
            'vintage-70s': { lut: 'vintage', brightness: -5, contrast: -5 },
            'vintage-80s': { lut: 'warm', brightness: 10, contrast: 15 },
            'modern-cinematic': { lut: 'cinematic', brightness: 0, contrast: 20 },
            'nordic-cool': { lut: 'cool', brightness: 5, contrast: 5 },
            'warm-sunset': { lut: 'warm', brightness: 10, contrast: 10 },
            'teal-orange': { splitTone: { highlightColor: { hue: 30, saturation: 40 }, shadowColor: { hue: 180, saturation: 30 } } }
        };
        
        const preset = presets[presetName];
        if (!preset) {
            throw new Error(`Preset not found: ${presetName}`);
        }
        
        let result = imageData;
        
        if (preset.lut) {
            result = this.applyLUT(result, preset.lut);
        }
        
        if (preset.splitTone) {
            result = this.applySplitToning(result, preset.splitTone);
        }
        
        if (preset.brightness || preset.contrast) {
            result = this.applyBrightnessContrast(result, preset.brightness || 0, preset.contrast || 0);
        }
        
        return result;
    }
    
    /**
     * Match Color - Copy color grade
     */
    matchColor(sourceImageData, referenceImageData, intensity = 1.0) {
        const srcData = sourceImageData.data;
        const refData = referenceImageData.data;
        
        // Calculate color statistics for reference
        const refStats = this.calculateColorStats(referenceImageData);
        const srcStats = this.calculateColorStats(sourceImageData);
        
        // Match mean and standard deviation
        for (let i = 0; i < srcData.length; i += 4) {
            for (let c = 0; c < 3; c++) {
                let value = srcData[i + c];
                
                // Normalize to reference statistics
                value = (value - srcStats.mean[c]) * (refStats.std[c] / srcStats.std[c]) + refStats.mean[c];
                
                // Blend with original based on intensity
                srcData[i + c] = srcData[i + c] + (value - srcData[i + c]) * intensity;
            }
        }
        
        return sourceImageData;
    }
    
    calculateColorStats(imageData) {
        const data = imageData.data;
        const sum = [0, 0, 0];
        const sumSq = [0, 0, 0];
        const count = data.length / 4;
        
        for (let i = 0; i < data.length; i += 4) {
            for (let c = 0; c < 3; c++) {
                sum[c] += data[i + c];
                sumSq[c] += data[i + c] * data[i + c];
            }
        }
        
        const mean = sum.map(s => s / count);
        const variance = sumSq.map((sq, i) => (sq / count) - (mean[i] * mean[i]));
        const std = variance.map(v => Math.sqrt(Math.max(0, v)));
        
        return { mean, std };
    }
    
    /**
     * Channel Mixer - Advanced color remapping
     */
    applyChannelMixer(imageData, mixer) {
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Apply mixing matrix
            if (mixer.red) {
                data[i] = Math.max(0, Math.min(255,
                    r * (mixer.red.red / 100) +
                    g * (mixer.red.green / 100) +
                    b * (mixer.red.blue / 100) +
                    (mixer.red.constant || 0)
                ));
            }
            
            if (mixer.green) {
                data[i + 1] = Math.max(0, Math.min(255,
                    r * (mixer.green.red / 100) +
                    g * (mixer.green.green / 100) +
                    b * (mixer.green.blue / 100) +
                    (mixer.green.constant || 0)
                ));
            }
            
            if (mixer.blue) {
                data[i + 2] = Math.max(0, Math.min(255,
                    r * (mixer.blue.red / 100) +
                    g * (mixer.blue.green / 100) +
                    b * (mixer.blue.blue / 100) +
                    (mixer.blue.constant || 0)
                ));
            }
        }
        
        return imageData;
    }
    
    monochromeConversion(imageData, tint = null) {
        // Convert to monochrome with optional tint
        const mixer = {
            red: { red: 30, green: 59, blue: 11 },
            green: { red: 30, green: 59, blue: 11 },
            blue: { red: 30, green: 59, blue: 11 }
        };
        
        const result = this.applyChannelMixer(imageData, mixer);
        
        if (tint) {
            // Apply sepia or other tint
            this.applySplitToning(result, {
                highlightColor: tint,
                shadowColor: tint,
                balance: 0
            });
        }
        
        return result;
    }
    
    /**
     * Photo Filter - Quick color tints
     */
    applyPhotoFilter(imageData, filterType, intensity = 0.5, preserveLuminosity = true) {
        const filters = {
            'warming-85': { r: 236, g: 138, b: 0 },
            'cooling-80': { r: 0, g: 123, b: 167 },
            'red': { r: 234, g: 28, b: 36 },
            'orange': { r: 255, g: 127, b: 39 },
            'yellow': { r: 255, g: 242, b: 0 },
            'green': { r: 34, g: 177, b: 76 },
            'cyan': { r: 0, g: 174, b: 239 },
            'blue': { r: 0, g: 71, b: 187 },
            'violet': { r: 146, g: 39, b: 143 },
            'magenta': { r: 236, g: 0, b: 140 },
            'sepia': { r: 162, g: 128, b: 101 },
            'deep-blue': { r: 0, g: 33, b: 71 }
        };
        
        const filter = filters[filterType];
        if (!filter) {
            throw new Error(`Unknown filter type: ${filterType}`);
        }
        
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const originalLum = preserveLuminosity ?
                0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2] : null;
            
            // Blend with filter color
            data[i] = data[i] + (filter.r - data[i]) * intensity;
            data[i + 1] = data[i + 1] + (filter.g - data[i + 1]) * intensity;
            data[i + 2] = data[i + 2] + (filter.b - data[i + 2]) * intensity;
            
            // Preserve luminosity if requested
            if (preserveLuminosity) {
                const newLum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                const lumRatio = originalLum / (newLum + 0.001);
                
                data[i] = Math.max(0, Math.min(255, data[i] * lumRatio));
                data[i + 1] = Math.max(0, Math.min(255, data[i + 1] * lumRatio));
                data[i + 2] = Math.max(0, Math.min(255, data[i + 2] * lumRatio));
            }
        }
        
        return imageData;
    }
    
    // ========== Helper Functions ==========
    
    applyBrightnessContrast(imageData, brightness, contrast) {
        const data = imageData.data;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        
        for (let i = 0; i < data.length; i += 4) {
            // Apply brightness
            let r = data[i] + brightness;
            let g = data[i + 1] + brightness;
            let b = data[i + 2] + brightness;
            
            // Apply contrast
            r = factor * (r - 128) + 128;
            g = factor * (g - 128) + 128;
            b = factor * (b - 128) + 128;
            
            data[i] = Math.max(0, Math.min(255, r));
            data[i + 1] = Math.max(0, Math.min(255, g));
            data[i + 2] = Math.max(0, Math.min(255, b));
        }
        
        return imageData;
    }
    
    rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        
        return [h, s, l];
    }
    
    hslToRgb(h, s, l) {
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }
    
    rgbToCmyk(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const k = 1 - Math.max(r, g, b);
        const c = k === 1 ? 0 : (1 - r - k) / (1 - k);
        const m = k === 1 ? 0 : (1 - g - k) / (1 - k);
        const y = k === 1 ? 0 : (1 - b - k) / (1 - k);
        
        return [c, m, y, k];
    }
    
    cmykToRgb(c, m, y, k) {
        const r = 255 * (1 - c) * (1 - k);
        const g = 255 * (1 - m) * (1 - k);
        const b = 255 * (1 - y) * (1 - k);
        
        return [Math.round(r), Math.round(g), Math.round(b)];
    }
    
    rgbToLab(r, g, b) {
        // Convert RGB to XYZ
        r /= 255;
        g /= 255;
        b /= 255;
        
        r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
        g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
        b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
        
        let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
        let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
        let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
        
        x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
        y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
        z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;
        
        return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)];
    }
    
    getGamutLimits(profile) {
        // Simplified gamut limits for different color spaces
        const limits = {
            'sRGB': { l: [0, 100], a: [-128, 127], b: [-128, 127] },
            'Display-P3': { l: [0, 100], a: [-150, 150], b: [-150, 150] },
            'Adobe-RGB': { l: [0, 100], a: [-160, 160], b: [-160, 160] },
            'ProPhoto-RGB': { l: [0, 100], a: [-200, 200], b: [-200, 200] }
        };
        
        return limits[profile] || limits['sRGB'];
    }
    
    isInGamut(l, a, b, limits) {
        return l >= limits.l[0] && l <= limits.l[1] &&
               a >= limits.a[0] && a <= limits.a[1] &&
               b >= limits.b[0] && b <= limits.b[1];
    }
}

// Export for use in renderer
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ColorManagement;
}
