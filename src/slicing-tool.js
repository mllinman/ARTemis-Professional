/**
 * Slicing Tool Module
 * Provides image slicing capabilities for web and mobile asset export
 */

class SlicingTool {
    constructor() {
        this.slices = [];
        this.autoSliceGrid = { rows: 1, cols: 1 };
        this.nextSliceId = 1;
    }
    
    /**
     * Create a new slice
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Slice width
     * @param {number} height - Slice height
     * @param {Object} options - Slice options
     * @returns {Object} Created slice
     */
    createSlice(x, y, width, height, options = {}) {
        const slice = {
            id: this.nextSliceId++,
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(width),
            height: Math.round(height),
            name: options.name || `slice_${this.nextSliceId - 1}`,
            format: options.format || 'png',
            quality: options.quality || 0.9,
            scale: options.scale || 1.0,
            enabled: options.enabled !== false
        };
        
        this.slices.push(slice);
        return slice;
    }
    
    /**
     * Auto-slice canvas into grid
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @param {number} rows - Number of rows
     * @param {number} cols - Number of columns
     * @param {Object} options - Slicing options
     * @returns {Array} Array of slices
     */
    autoSliceGrid(width, height, rows, cols, options = {}) {
        this.slices = [];
        this.autoSliceGrid = { rows, cols };
        
        const sliceWidth = width / cols;
        const sliceHeight = height / rows;
        const spacing = options.spacing || 0;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = col * sliceWidth;
                const y = row * sliceHeight;
                
                this.createSlice(
                    x + spacing,
                    y + spacing,
                    sliceWidth - spacing * 2,
                    sliceHeight - spacing * 2,
                    {
                        name: options.namingPattern 
                            ? options.namingPattern.replace('{row}', row).replace('{col}', col)
                            : `slice_${row}_${col}`,
                        ...options
                    }
                );
            }
        }
        
        return this.slices;
    }
    
    /**
     * Auto-slice based on content bounds
     * @param {HTMLCanvasElement} canvas - Canvas to analyze
     * @param {Object} options - Slicing options
     * @returns {Array} Array of slices
     */
    autoSliceByContent(canvas, options = {}) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const bounds = this.findContentBounds(imageData);
        
        if (bounds.length === 0) {
            return [];
        }
        
        this.slices = [];
        bounds.forEach((bound, index) => {
            this.createSlice(
                bound.x,
                bound.y,
                bound.width,
                bound.height,
                {
                    name: options.namingPattern 
                        ? options.namingPattern.replace('{index}', index)
                        : `content_${index}`,
                    ...options
                }
            );
        });
        
        return this.slices;
    }
    
    /**
     * Find content bounds in image data
     * @param {ImageData} imageData - Image data to analyze
     * @returns {Array} Array of bounding boxes
     */
    findContentBounds(imageData) {
        // Simple implementation: find non-transparent regions
        // More sophisticated implementation could use flood-fill or edge detection
        const bounds = [];
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // Find overall content bounds
        let minX = width, minY = height, maxX = 0, maxY = 0;
        let hasContent = false;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const alpha = data[i + 3];
                
                if (alpha > 0) {
                    hasContent = true;
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }
        
        if (hasContent) {
            bounds.push({
                x: minX,
                y: minY,
                width: maxX - minX + 1,
                height: maxY - minY + 1
            });
        }
        
        return bounds;
    }
    
    /**
     * Update slice properties
     * @param {number} sliceId - Slice ID
     * @param {Object} properties - Properties to update
     */
    updateSlice(sliceId, properties) {
        const slice = this.slices.find(s => s.id === sliceId);
        if (slice) {
            Object.assign(slice, properties);
        }
    }
    
    /**
     * Delete slice
     * @param {number} sliceId - Slice ID
     */
    deleteSlice(sliceId) {
        const index = this.slices.findIndex(s => s.id === sliceId);
        if (index >= 0) {
            this.slices.splice(index, 1);
        }
    }
    
    /**
     * Export a single slice
     * @param {HTMLCanvasElement} sourceCanvas - Source canvas
     * @param {Object} slice - Slice definition
     * @returns {Promise<Blob>} Exported slice blob
     */
    async exportSlice(sourceCanvas, slice) {
        // Create temporary canvas for the slice
        const canvas = document.createElement('canvas');
        const targetWidth = Math.round(slice.width * slice.scale);
        const targetHeight = Math.round(slice.height * slice.scale);
        
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        const ctx = canvas.getContext('2d');
        
        // Draw the slice region
        ctx.drawImage(
            sourceCanvas,
            slice.x, slice.y, slice.width, slice.height,
            0, 0, targetWidth, targetHeight
        );
        
        // Convert to blob
        return new Promise((resolve, reject) => {
            const mimeType = this.getMimeType(slice.format);
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error(`Failed to create ${slice.format.toUpperCase()} blob for slice '${slice.name}'`));
                    }
                },
                mimeType,
                slice.quality
            );
        });
    }
    
    /**
     * Export all slices
     * @param {HTMLCanvasElement} sourceCanvas - Source canvas
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<Array>} Array of {slice, blob} objects
     */
    async exportAllSlices(sourceCanvas, onProgress) {
        const results = [];
        const enabledSlices = this.slices.filter(s => s.enabled);
        const total = enabledSlices.length;
        
        for (let i = 0; i < enabledSlices.length; i++) {
            const slice = enabledSlices[i];
            
            try {
                const blob = await this.exportSlice(sourceCanvas, slice);
                results.push({ slice, blob, success: true });
                
                if (onProgress) {
                    onProgress(i + 1, total, slice, true);
                }
            } catch (error) {
                console.error(`Failed to export slice ${slice.name}:`, error);
                results.push({ slice, error, success: false });
                
                if (onProgress) {
                    onProgress(i + 1, total, slice, false, error);
                }
            }
        }
        
        return results;
    }
    
    /**
     * Export slices at multiple resolutions
     * @param {HTMLCanvasElement} sourceCanvas - Source canvas
     * @param {Array} scales - Array of scale factors (e.g., [1, 2, 3] for @1x, @2x, @3x)
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<Array>} Array of exported files
     */
    async exportMultiResolution(sourceCanvas, scales = [1, 2, 3], onProgress) {
        const results = [];
        const enabledSlices = this.slices.filter(s => s.enabled);
        const total = enabledSlices.length * scales.length;
        let current = 0;
        
        for (const slice of enabledSlices) {
            for (const scale of scales) {
                const scaledSlice = { ...slice, scale };
                const scaleSuffix = scale === 1 ? '' : `@${scale}x`;
                scaledSlice.name = `${slice.name}${scaleSuffix}`;
                
                try {
                    const blob = await this.exportSlice(sourceCanvas, scaledSlice);
                    results.push({
                        slice: scaledSlice,
                        blob,
                        filename: `${scaledSlice.name}.${slice.format}`,
                        success: true
                    });
                    
                    current++;
                    if (onProgress) {
                        onProgress(current, total, scaledSlice, true);
                    }
                } catch (error) {
                    console.error(`Failed to export ${scaledSlice.name}:`, error);
                    results.push({ slice: scaledSlice, error, success: false });
                    
                    current++;
                    if (onProgress) {
                        onProgress(current, total, scaledSlice, false, error);
                    }
                }
            }
        }
        
        return results;
    }
    
    /**
     * Generate HTML/CSS for sliced image
     * @param {number} canvasWidth - Original canvas width
     * @param {number} canvasHeight - Original canvas height
     * @returns {Object} HTML and CSS strings
     */
    generateHTMLCSS(canvasWidth, canvasHeight) {
        const css = this.slices.map(slice => {
            return `.slice-${slice.id} {
    position: absolute;
    left: ${slice.x}px;
    top: ${slice.y}px;
    width: ${slice.width}px;
    height: ${slice.height}px;
    background-image: url('${slice.name}.${slice.format}');
}`;
        }).join('\n\n');
        
        const html = `<div class="sliced-image" style="position: relative; width: ${canvasWidth}px; height: ${canvasHeight}px;">
${this.slices.map(slice => `    <div class="slice-${slice.id}"></div>`).join('\n')}
</div>`;
        
        return { html, css };
    }
    
    /**
     * Get MIME type for format
     * @param {string} format - Format name
     * @returns {string} MIME type
     */
    getMimeType(format) {
        const mimeTypes = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'webp': 'image/webp'
        };
        return mimeTypes[format.toLowerCase()] || 'image/png';
    }
    
    /**
     * Clear all slices
     */
    clear() {
        this.slices = [];
        this.nextSliceId = 1;
    }
    
    /**
     * Get all slices
     * @returns {Array} Array of slices
     */
    getSlices() {
        return this.slices;
    }
    
    /**
     * Save slices configuration
     * @returns {string} JSON string
     */
    saveToJSON() {
        return JSON.stringify({
            slices: this.slices,
            nextSliceId: this.nextSliceId,
            autoSliceGrid: this.autoSliceGrid
        });
    }
    
    /**
     * Load slices configuration
     * @param {string} json - JSON string
     */
    loadFromJSON(json) {
        const data = JSON.parse(json);
        this.slices = data.slices || [];
        this.nextSliceId = data.nextSliceId || 1;
        this.autoSliceGrid = data.autoSliceGrid || { rows: 1, cols: 1 };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SlicingTool;
}
