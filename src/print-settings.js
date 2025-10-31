/**
 * Print Settings Module
 * Provides professional print preparation features
 */

class PrintSettings {
    constructor() {
        // Default print settings
        this.settings = {
            // Page settings
            pageSize: 'A4',
            orientation: 'portrait',
            units: 'mm',
            
            // Margins
            margins: {
                top: 10,
                right: 10,
                bottom: 10,
                left: 10
            },
            
            // Bleed
            bleed: {
                enabled: false,
                top: 3,
                right: 3,
                bottom: 3,
                left: 3
            },
            
            // Marks
            cropMarks: {
                enabled: false,
                weight: 0.5,
                length: 10,
                offset: 5
            },
            
            registrationMarks: {
                enabled: false,
                size: 5,
                offset: 10
            },
            
            colorBars: {
                enabled: false,
                height: 5
            },
            
            // Color
            colorMode: 'CMYK',
            colorProfile: 'U.S. Web Coated (SWOP) v2',
            
            // Resolution
            dpi: 300,
            
            // Output
            flatten: false,
            embedFonts: true,
            compression: 'lossless'
        };
        
        // Page size presets (in mm)
        this.pageSizes = {
            'A4': { width: 210, height: 297 },
            'A3': { width: 297, height: 420 },
            'A5': { width: 148, height: 210 },
            'Letter': { width: 215.9, height: 279.4 },
            'Legal': { width: 215.9, height: 355.6 },
            'Tabloid': { width: 279.4, height: 431.8 },
            'Custom': { width: 210, height: 297 }
        };
    }
    
    /**
     * Get current print settings
     * @returns {Object} Current settings
     */
    getSettings() {
        return { ...this.settings };
    }
    
    /**
     * Update print settings
     * @param {Object} newSettings - Settings to update
     */
    updateSettings(newSettings) {
        this.settings = {
            ...this.settings,
            ...newSettings
        };
    }
    
    /**
     * Get page dimensions with bleed
     * @returns {Object} Dimensions {width, height} in current units
     */
    getPageDimensions() {
        const size = this.pageSizes[this.settings.pageSize];
        const bleed = this.settings.bleed;
        
        let width = size.width;
        let height = size.height;
        
        if (this.settings.orientation === 'landscape') {
            [width, height] = [height, width];
        }
        
        if (bleed.enabled) {
            width += bleed.left + bleed.right;
            height += bleed.top + bleed.bottom;
        }
        
        return { width, height };
    }
    
    /**
     * Get print area dimensions (page minus margins)
     * @returns {Object} Dimensions {width, height, x, y} in current units
     */
    getPrintArea() {
        const page = this.getPageDimensions();
        const margins = this.settings.margins;
        
        return {
            x: margins.left,
            y: margins.top,
            width: page.width - margins.left - margins.right,
            height: page.height - margins.top - margins.bottom
        };
    }
    
    /**
     * Convert canvas to print resolution
     * @param {HTMLCanvasElement} sourceCanvas - Source canvas
     * @returns {HTMLCanvasElement} High-resolution canvas
     */
    convertToPrintResolution(sourceCanvas) {
        const printArea = this.getPrintArea();
        const dpi = this.settings.dpi;
        
        // Calculate pixel dimensions at print DPI
        const pixelWidth = Math.round(this.mmToInch(printArea.width) * dpi);
        const pixelHeight = Math.round(this.mmToInch(printArea.height) * dpi);
        
        // Create high-res canvas
        const canvas = document.createElement('canvas');
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
        
        const ctx = canvas.getContext('2d');
        
        // Enable high-quality scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw source canvas scaled to print resolution
        ctx.drawImage(sourceCanvas, 0, 0, pixelWidth, pixelHeight);
        
        return canvas;
    }
    
    /**
     * Add crop marks to canvas
     * @param {HTMLCanvasElement} canvas - Canvas to add marks to
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    drawCropMarks(canvas, ctx) {
        if (!this.settings.cropMarks.enabled) return;
        
        const page = this.getPageDimensions();
        const bleed = this.settings.bleed;
        const crop = this.settings.cropMarks;
        
        // Calculate mark positions (in canvas pixels)
        const dpi = this.settings.dpi;
        const scale = (dpi / 25.4); // pixels per mm
        
        const trimBox = {
            left: bleed.enabled ? bleed.left * scale : 0,
            top: bleed.enabled ? bleed.top * scale : 0,
            right: canvas.width - (bleed.enabled ? bleed.right * scale : 0),
            bottom: canvas.height - (bleed.enabled ? bleed.bottom * scale : 0)
        };
        
        const offset = crop.offset * scale;
        const length = crop.length * scale;
        
        ctx.save();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = crop.weight;
        
        // Top-left
        ctx.beginPath();
        ctx.moveTo(trimBox.left - offset, trimBox.top);
        ctx.lineTo(trimBox.left - offset - length, trimBox.top);
        ctx.moveTo(trimBox.left, trimBox.top - offset);
        ctx.lineTo(trimBox.left, trimBox.top - offset - length);
        ctx.stroke();
        
        // Top-right
        ctx.beginPath();
        ctx.moveTo(trimBox.right + offset, trimBox.top);
        ctx.lineTo(trimBox.right + offset + length, trimBox.top);
        ctx.moveTo(trimBox.right, trimBox.top - offset);
        ctx.lineTo(trimBox.right, trimBox.top - offset - length);
        ctx.stroke();
        
        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(trimBox.left - offset, trimBox.bottom);
        ctx.lineTo(trimBox.left - offset - length, trimBox.bottom);
        ctx.moveTo(trimBox.left, trimBox.bottom + offset);
        ctx.lineTo(trimBox.left, trimBox.bottom + offset + length);
        ctx.stroke();
        
        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(trimBox.right + offset, trimBox.bottom);
        ctx.lineTo(trimBox.right + offset + length, trimBox.bottom);
        ctx.moveTo(trimBox.right, trimBox.bottom + offset);
        ctx.lineTo(trimBox.right, trimBox.bottom + offset + length);
        ctx.stroke();
        
        ctx.restore();
    }
    
    /**
     * Add registration marks to canvas
     * @param {HTMLCanvasElement} canvas - Canvas to add marks to
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    drawRegistrationMarks(canvas, ctx) {
        if (!this.settings.registrationMarks.enabled) return;
        
        const marks = this.settings.registrationMarks;
        const dpi = this.settings.dpi;
        const scale = (dpi / 25.4);
        
        const size = marks.size * scale;
        const offset = marks.offset * scale;
        
        ctx.save();
        
        // Draw registration mark (circle with crosshair)
        const drawMark = (x, y) => {
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 0.5;
            
            // Circle
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.stroke();
            
            // Crosshair
            ctx.beginPath();
            ctx.moveTo(x - size, y);
            ctx.lineTo(x + size, y);
            ctx.moveTo(x, y - size);
            ctx.lineTo(x, y + size);
            ctx.stroke();
        };
        
        // Top center
        drawMark(canvas.width / 2, offset);
        
        // Bottom center
        drawMark(canvas.width / 2, canvas.height - offset);
        
        // Left center
        drawMark(offset, canvas.height / 2);
        
        // Right center
        drawMark(canvas.width - offset, canvas.height / 2);
        
        ctx.restore();
    }
    
    /**
     * Add color bars to canvas
     * @param {HTMLCanvasElement} canvas - Canvas to add bars to
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    drawColorBars(canvas, ctx) {
        if (!this.settings.colorBars.enabled) return;
        
        const dpi = this.settings.dpi;
        const scale = (dpi / 25.4);
        const height = this.settings.colorBars.height * scale;
        
        ctx.save();
        
        // Draw CMYK color bars at bottom
        const colors = [
            { c: 1, m: 0, y: 0, k: 0 }, // Cyan
            { c: 0, m: 1, y: 0, k: 0 }, // Magenta
            { c: 0, m: 0, y: 1, k: 0 }, // Yellow
            { c: 0, m: 0, y: 0, k: 1 }, // Black
            { c: 0.5, m: 0.5, y: 0.5, k: 0 }, // 50% Gray
        ];
        
        const barWidth = canvas.width / colors.length;
        const y = canvas.height - height - 10;
        
        colors.forEach((color, i) => {
            const rgb = this.cmykToRgb(color.c, color.m, color.y, color.k);
            ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
            ctx.fillRect(i * barWidth, y, barWidth, height);
        });
        
        ctx.restore();
    }
    
    /**
     * Prepare canvas for print with all marks
     * @param {HTMLCanvasElement} sourceCanvas - Source canvas
     * @returns {HTMLCanvasElement} Print-ready canvas
     */
    preparePrintCanvas(sourceCanvas) {
        // Convert to print resolution
        const printCanvas = this.convertToPrintResolution(sourceCanvas);
        const ctx = printCanvas.getContext('2d');
        
        // Add print marks
        this.drawCropMarks(printCanvas, ctx);
        this.drawRegistrationMarks(printCanvas, ctx);
        this.drawColorBars(printCanvas, ctx);
        
        return printCanvas;
    }
    
    /**
     * Convert mm to inches
     * @param {number} mm - Millimeters
     * @returns {number} Inches
     */
    mmToInch(mm) {
        return mm / 25.4;
    }
    
    /**
     * Convert inches to mm
     * @param {number} inches - Inches
     * @returns {number} Millimeters
     */
    inchToMm(inches) {
        return inches * 25.4;
    }
    
    /**
     * Convert CMYK to RGB (simplified conversion)
     * @param {number} c - Cyan (0-1)
     * @param {number} m - Magenta (0-1)
     * @param {number} y - Yellow (0-1)
     * @param {number} k - Black (0-1)
     * @returns {Object} RGB {r, g, b}
     */
    cmykToRgb(c, m, y, k) {
        const r = Math.round(255 * (1 - c) * (1 - k));
        const g = Math.round(255 * (1 - m) * (1 - k));
        const b = Math.round(255 * (1 - y) * (1 - k));
        return { r, g, b };
    }
    
    /**
     * Save settings to JSON
     * @returns {string} JSON string
     */
    saveToJSON() {
        return JSON.stringify(this.settings);
    }
    
    /**
     * Load settings from JSON
     * @param {string} json - JSON string
     */
    loadFromJSON(json) {
        this.settings = JSON.parse(json);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PrintSettings;
}
