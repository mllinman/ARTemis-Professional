/**
 * Export Manager Module
 * Provides multi-format export capabilities with batch processing
 */

class ExportManager {
    constructor() {
        this.supportedFormats = {
            'png': { name: 'PNG', mimeType: 'image/png', quality: 1.0 },
            'jpg': { name: 'JPEG', mimeType: 'image/jpeg', quality: 0.95 },
            'webp': { name: 'WebP', mimeType: 'image/webp', quality: 0.90 },
            'svg': { name: 'SVG', mimeType: 'image/svg+xml', quality: 1.0 },
            'psd': { name: 'Photoshop', mimeType: 'application/x-photoshop', quality: 1.0 },
            'tiff': { name: 'TIFF', mimeType: 'image/tiff', quality: 1.0 },
            'pdf': { name: 'PDF', mimeType: 'application/pdf', quality: 1.0 }
        };
        
        this.exportQueue = [];
        this.isExporting = false;
    }
    
    /**
     * Export to single format
     * @param {HTMLCanvasElement} canvas - Canvas to export
     * @param {string} format - Export format
     * @param {Object} options - Export options
     * @returns {Promise<Blob>} Exported blob
     */
    async exportToFormat(canvas, format, options = {}) {
        const formatInfo = this.supportedFormats[format.toLowerCase()];
        if (!formatInfo) {
            throw new Error(`Unsupported format: ${format}`);
        }
        
        const defaultOptions = {
            quality: formatInfo.quality,
            width: canvas.width,
            height: canvas.height,
            ...options
        };
        
        // Handle different export types
        switch (format.toLowerCase()) {
            case 'png':
            case 'jpg':
            case 'webp':
                return await this.exportRasterFormat(canvas, formatInfo.mimeType, defaultOptions);
                
            case 'svg':
                return await this.exportSVG(canvas, defaultOptions);
                
            case 'psd':
                return await this.exportPSD(canvas, defaultOptions);
                
            case 'tiff':
                return await this.exportTIFF(canvas, defaultOptions);
                
            case 'pdf':
                return await this.exportPDF(canvas, defaultOptions);
                
            default:
                throw new Error(`Format not implemented: ${format}`);
        }
    }
    
    /**
     * Export to raster format (PNG, JPEG, WebP)
     */
    async exportRasterFormat(canvas, mimeType, options) {
        return new Promise((resolve, reject) => {
            // Resize if needed
            let exportCanvas = canvas;
            if (options.width !== canvas.width || options.height !== canvas.height) {
                exportCanvas = document.createElement('canvas');
                exportCanvas.width = options.width;
                exportCanvas.height = options.height;
                const ctx = exportCanvas.getContext('2d');
                ctx.drawImage(canvas, 0, 0, options.width, options.height);
            }
            
            exportCanvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to create blob'));
                    }
                },
                mimeType,
                options.quality
            );
        });
    }
    
    /**
     * Export to SVG format
     */
    async exportSVG(canvas, options) {
        // Create SVG wrapper for the canvas image
        const dataUrl = canvas.toDataURL('image/png');
        const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${options.width}" height="${options.height}"
     viewBox="0 0 ${canvas.width} ${canvas.height}">
    <image width="${canvas.width}" height="${canvas.height}" xlink:href="${dataUrl}"/>
</svg>`;
        
        return new Blob([svgContent], { type: 'image/svg+xml' });
    }
    
    /**
     * Export to PSD format
     */
    async exportPSD(canvas, options) {
        // Use existing PSD exporter if available
        if (typeof exportToPSD !== 'undefined') {
            if (!options.state) {
                throw new Error('PSD export requires state object with layers');
            }
            return await exportToPSD(options.state, canvas);
        }
        throw new Error('PSD exporter not loaded');
    }
    
    /**
     * Export to TIFF format
     */
    async exportTIFF(canvas, options) {
        // Use existing TIFF exporter if available
        if (typeof exportToTIFF !== 'undefined') {
            return await exportToTIFF(canvas, options);
        }
        throw new Error('TIFF exporter not loaded');
    }
    
    /**
     * Export to PDF format
     */
    async exportPDF(canvas, options) {
        // Use PDF exporter if available
        if (typeof exportToPDF !== 'undefined') {
            return await exportToPDF(canvas, options);
        }
        throw new Error('PDF exporter not loaded');
    }
    
    /**
     * Batch export to multiple formats
     * @param {HTMLCanvasElement} canvas - Canvas to export
     * @param {Array} formats - Array of format configs: [{format: 'png', options: {...}}, ...]
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<Array>} Array of {format, blob} objects
     */
    async batchExport(canvas, formats, onProgress) {
        const results = [];
        const total = formats.length;
        
        for (let i = 0; i < formats.length; i++) {
            const { format, options = {} } = formats[i];
            
            try {
                const blob = await this.exportToFormat(canvas, format, options);
                results.push({ format, blob, success: true });
                
                if (onProgress) {
                    onProgress(i + 1, total, format, true);
                }
            } catch (error) {
                console.error(`Failed to export ${format}:`, error);
                results.push({ format, error, success: false });
                
                if (onProgress) {
                    onProgress(i + 1, total, format, false, error);
                }
            }
        }
        
        return results;
    }
    
    /**
     * Export with custom naming pattern
     * @param {HTMLCanvasElement} canvas - Canvas to export
     * @param {string} baseName - Base filename
     * @param {Array} formats - Array of formats
     * @param {Object} options - Export options
     * @returns {Promise<Array>} Array of files with names
     */
    async exportWithNaming(canvas, baseName, formats, options = {}) {
        const results = await this.batchExport(canvas, formats, options.onProgress);
        
        return results.map(result => {
            if (result.success) {
                const formatInfo = this.supportedFormats[result.format.toLowerCase()];
                const extension = result.format.toLowerCase();
                const filename = options.namingPattern 
                    ? options.namingPattern.replace('{name}', baseName).replace('{format}', extension)
                    : `${baseName}.${extension}`;
                
                return {
                    filename,
                    blob: result.blob,
                    format: result.format,
                    success: true
                };
            } else {
                return {
                    format: result.format,
                    error: result.error,
                    success: false
                };
            }
        });
    }
    
    /**
     * Download exported file
     * @param {Blob} blob - File blob
     * @param {string} filename - Download filename
     */
    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    /**
     * Download multiple files
     * @param {Array} files - Array of {blob, filename} objects
     */
    downloadMultipleFiles(files) {
        files.forEach((file, index) => {
            if (file.success) {
                // Delay each download slightly to avoid browser blocking
                setTimeout(() => {
                    this.downloadFile(file.blob, file.filename);
                }, index * 100);
            }
        });
    }
    
    /**
     * Get list of supported formats
     * @returns {Array} Array of format names
     */
    getSupportedFormats() {
        return Object.keys(this.supportedFormats);
    }
    
    /**
     * Get format info
     * @param {string} format - Format name
     * @returns {Object} Format information
     */
    getFormatInfo(format) {
        return this.supportedFormats[format.toLowerCase()];
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExportManager;
}
