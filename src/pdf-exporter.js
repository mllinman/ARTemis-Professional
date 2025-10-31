/**
 * PDF Export Module
 * Provides multi-page PDF creation with layer preservation
 */

// PDF generation using jsPDF library (needs to be loaded)
let jsPDF = null;

// Initialize jsPDF library
async function initJsPDF() {
    if (jsPDF) return jsPDF;
    
    try {
        // Try to load from node_modules or global
        if (typeof window !== 'undefined' && window.jspdf && window.jspdf.jsPDF) {
            jsPDF = window.jspdf.jsPDF;
        } else if (typeof require !== 'undefined') {
            const jspdfModule = require('jspdf');
            jsPDF = jspdfModule.jsPDF || jspdfModule;
        } else {
            // Load from CDN
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            if (window.jspdf && window.jspdf.jsPDF) {
                jsPDF = window.jspdf.jsPDF;
            } else {
                throw new Error('jsPDF not found after loading');
            }
        }
        
        // Validate jsPDF is a constructor
        if (typeof jsPDF !== 'function') {
            throw new Error('jsPDF is not a valid constructor');
        }
        
        return jsPDF;
    } catch (error) {
        console.error('Failed to load jsPDF library:', error);
        throw new Error(`jsPDF library not available: ${error.message}. Cannot export to PDF format.`);
    }
}

// Load external script dynamically
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * Export single canvas to PDF
 * @param {HTMLCanvasElement} canvas - Canvas to export
 * @param {Object} options - Export options
 * @returns {Promise<Blob>} PDF blob
 */
async function exportToPDF(canvas, options = {}) {
    await initJsPDF();
    
    const defaults = {
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
        title: 'ARTemis Document',
        author: 'ARTemis',
        subject: 'Digital Artwork',
        keywords: 'art, digital painting',
        quality: 0.95
    };
    
    const config = { ...defaults, ...options };
    
    // Create PDF document
    const pdf = new jsPDF({
        orientation: config.orientation,
        unit: config.unit,
        format: config.format,
        compress: config.compress
    });
    
    // Set document properties
    pdf.setProperties({
        title: config.title,
        author: config.author,
        subject: config.subject,
        keywords: config.keywords,
        creator: 'ARTemis Professional'
    });
    
    // Get page dimensions
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Calculate image dimensions to fit page
    const aspectRatio = canvas.width / canvas.height;
    let imgWidth = pageWidth;
    let imgHeight = pageWidth / aspectRatio;
    
    if (imgHeight > pageHeight) {
        imgHeight = pageHeight;
        imgWidth = pageHeight * aspectRatio;
    }
    
    // Center image on page
    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;
    
    // Convert canvas to image data
    const imageData = canvas.toDataURL('image/jpeg', config.quality);
    
    // Add image to PDF
    pdf.addImage(imageData, 'JPEG', x, y, imgWidth, imgHeight);
    
    // Return as blob
    return pdf.output('blob');
}

/**
 * Export multiple canvases/layers to multi-page PDF
 * @param {Array} canvases - Array of canvases or {canvas, title} objects
 * @param {Object} options - Export options
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Blob>} PDF blob
 */
async function exportMultiPagePDF(canvases, options = {}, onProgress) {
    await initJsPDF();
    
    const defaults = {
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
        title: 'ARTemis Document',
        author: 'ARTemis',
        quality: 0.95
    };
    
    const config = { ...defaults, ...options };
    
    // Create PDF document
    const pdf = new jsPDF({
        orientation: config.orientation,
        unit: config.unit,
        format: config.format,
        compress: config.compress
    });
    
    // Set document properties
    pdf.setProperties({
        title: config.title,
        author: config.author,
        subject: config.subject || 'Digital Artwork',
        keywords: config.keywords || 'art, digital painting',
        creator: 'ARTemis Professional'
    });
    
    // Get page dimensions
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    const total = canvases.length;
    
    for (let i = 0; i < canvases.length; i++) {
        const item = canvases[i];
        const canvas = item.canvas || item;
        const pageTitle = item.title || `Page ${i + 1}`;
        
        // Add new page for subsequent pages
        if (i > 0) {
            pdf.addPage();
        }
        
        // Calculate image dimensions
        const aspectRatio = canvas.width / canvas.height;
        let imgWidth = pageWidth;
        let imgHeight = pageWidth / aspectRatio;
        
        if (imgHeight > pageHeight) {
            imgHeight = pageHeight;
            imgWidth = pageHeight * aspectRatio;
        }
        
        // Center image
        const x = (pageWidth - imgWidth) / 2;
        const y = (pageHeight - imgHeight) / 2;
        
        // Convert canvas to image data
        const imageData = canvas.toDataURL('image/jpeg', config.quality);
        
        // Add image to PDF
        pdf.addImage(imageData, 'JPEG', x, y, imgWidth, imgHeight);
        
        // Add page title if requested
        if (config.showTitles) {
            pdf.setFontSize(10);
            pdf.text(pageTitle, pageWidth / 2, 10, { align: 'center' });
        }
        
        // Progress callback
        if (onProgress) {
            onProgress(i + 1, total, pageTitle);
        }
    }
    
    // Return as blob
    return pdf.output('blob');
}

/**
 * Export layers to PDF with layer preservation
 * @param {Object} state - Application state with layers
 * @param {HTMLCanvasElement} mainCanvas - Main canvas
 * @param {Object} options - Export options
 * @returns {Promise<Blob>} PDF blob
 */
async function exportLayersToPDF(state, mainCanvas, options = {}) {
    await initJsPDF();
    
    const defaults = {
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
        preserveLayers: true,
        flattenLayers: false,
        quality: 0.95
    };
    
    const config = { ...defaults, ...options };
    
    if (config.flattenLayers) {
        // Export flattened version
        return await exportToPDF(mainCanvas, config);
    }
    
    // Export each visible layer as a separate page
    const visibleLayers = state.layers.filter(layer => layer.visible);
    const layerCanvases = visibleLayers.map(layer => ({
        canvas: layer.canvas,
        title: layer.name || 'Untitled Layer'
    }));
    
    return await exportMultiPagePDF(layerCanvases, config, options.onProgress);
}

/**
 * Create print-ready PDF with bleed and crop marks
 * @param {HTMLCanvasElement} canvas - Canvas to export
 * @param {Object} printSettings - Print settings from PrintSettings module
 * @returns {Promise<Blob>} PDF blob
 */
async function exportPrintReadyPDF(canvas, printSettings) {
    await initJsPDF();
    
    // Prepare canvas with print marks using PrintSettings
    const printCanvas = printSettings.preparePrintCanvas(canvas);
    
    // Get page dimensions with bleed
    const dimensions = printSettings.getPageDimensions();
    
    // Create PDF with exact dimensions
    const pdf = new jsPDF({
        orientation: printSettings.settings.orientation,
        unit: 'mm',
        format: [dimensions.width, dimensions.height],
        compress: true
    });
    
    // Add print canvas to PDF at full page size
    const imageData = printCanvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imageData, 'JPEG', 0, 0, dimensions.width, dimensions.height);
    
    return pdf.output('blob');
}

/**
 * Create PDF portfolio with multiple artworks
 * @param {Array} artworks - Array of {canvas, title, description} objects
 * @param {Object} options - Export options
 * @returns {Promise<Blob>} PDF blob
 */
async function createPDFPortfolio(artworks, options = {}) {
    await initJsPDF();
    
    const defaults = {
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
        title: 'Portfolio',
        author: 'Artist',
        showDescriptions: true,
        quality: 0.95
    };
    
    const config = { ...defaults, ...options };
    
    // Create PDF
    const pdf = new jsPDF({
        orientation: config.orientation,
        unit: config.unit,
        format: config.format,
        compress: config.compress
    });
    
    pdf.setProperties({
        title: config.title,
        author: config.author,
        subject: 'Art Portfolio',
        creator: 'ARTemis Professional'
    });
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    for (let i = 0; i < artworks.length; i++) {
        const artwork = artworks[i];
        
        if (i > 0) {
            pdf.addPage();
        }
        
        // Calculate image dimensions
        const canvas = artwork.canvas;
        const aspectRatio = canvas.width / canvas.height;
        const maxHeight = config.showDescriptions ? pageHeight * 0.75 : pageHeight;
        
        let imgWidth = pageWidth;
        let imgHeight = pageWidth / aspectRatio;
        
        if (imgHeight > maxHeight) {
            imgHeight = maxHeight;
            imgWidth = maxHeight * aspectRatio;
        }
        
        // Center image
        const x = (pageWidth - imgWidth) / 2;
        const y = 10;
        
        // Add image
        const imageData = canvas.toDataURL('image/jpeg', config.quality);
        pdf.addImage(imageData, 'JPEG', x, y, imgWidth, imgHeight);
        
        // Add title and description
        if (config.showDescriptions) {
            const textY = y + imgHeight + 10;
            
            pdf.setFontSize(14);
            pdf.setFont(undefined, 'bold');
            pdf.text(artwork.title || 'Untitled', pageWidth / 2, textY, { align: 'center' });
            
            if (artwork.description) {
                pdf.setFontSize(10);
                pdf.setFont(undefined, 'normal');
                const lines = pdf.splitTextToSize(artwork.description, pageWidth - 20);
                pdf.text(lines, 10, textY + 7);
            }
        }
        
        // Progress callback
        if (options.onProgress) {
            options.onProgress(i + 1, artworks.length, artwork.title);
        }
    }
    
    return pdf.output('blob');
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        exportToPDF,
        exportMultiPagePDF,
        exportLayersToPDF,
        exportPrintReadyPDF,
        createPDFPortfolio
    };
}
