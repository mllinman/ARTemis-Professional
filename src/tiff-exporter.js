/**
 * TIFF Export Module
 * Provides TIFF export capabilities using UTIF library
 */

let UTIF = null;

// Initialize UTIF library
async function initUTIF() {
    if (UTIF) return UTIF;
    
    try {
        // Try to load from node_modules (for bundled version)
        if (typeof require !== 'undefined') {
            UTIF = require('utif');
        } else {
            // For browser, load from CDN
            await loadScript('https://unpkg.com/utif@4.1.0/UTIF.js');
            UTIF = window.UTIF;
        }
        return UTIF;
    } catch (error) {
        console.error('Failed to load UTIF library:', error);
        throw new Error('TIFF library not available. Cannot export to TIFF format.');
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
 * Export canvas to TIFF format
 * @param {HTMLCanvasElement} canvas - Canvas to export
 * @param {Object} options - Export options
 * @returns {Promise<ArrayBuffer>} TIFF file data
 */
async function exportToTIFF(canvas, options = {}) {
    await initUTIF();
    
    if (!UTIF) {
        throw new Error('UTIF library not loaded');
    }
    
    // Get image data from canvas
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Prepare TIFF IFD (Image File Directory)
    const ifd = {
        // Image dimensions
        t256: [canvas.width],  // ImageWidth
        t257: [canvas.height], // ImageLength
        
        // Color configuration
        t258: [8, 8, 8, 8],    // BitsPerSample (RGBA)
        t259: [1],              // Compression (1 = no compression)
        t262: [2],              // PhotometricInterpretation (2 = RGB)
        t273: [1000],           // StripOffsets (will be calculated)
        t277: [4],              // SamplesPerPixel (RGBA)
        t278: [canvas.height],  // RowsPerStrip
        t279: [imageData.data.length], // StripByteCounts
        
        // Resolution (default 72 DPI)
        t282: [options.dpi || 72], // XResolution
        t283: [options.dpi || 72], // YResolution
        t296: [2],              // ResolutionUnit (2 = inches)
        
        // Color configuration
        t284: [1],              // PlanarConfiguration (1 = chunky)
        t338: [1],              // ExtraSamples (1 = associated alpha)
    };
    
    // Encode TIFF
    const tiffData = UTIF.encodeImage(imageData.data.buffer, canvas.width, canvas.height, ifd);
    
    return tiffData;
}

/**
 * Import TIFF file
 * @param {ArrayBuffer} arrayBuffer - TIFF file data
 * @returns {Promise<Object>} Decoded TIFF data
 */
async function importFromTIFF(arrayBuffer) {
    await initUTIF();
    
    if (!UTIF) {
        throw new Error('UTIF library not loaded');
    }
    
    // Decode TIFF
    const ifds = UTIF.decode(arrayBuffer);
    
    if (!ifds || ifds.length === 0) {
        throw new Error('Invalid TIFF file');
    }
    
    // Get the first image
    const ifd = ifds[0];
    UTIF.decodeImage(arrayBuffer, ifd);
    
    // Convert to RGBA
    const rgba = UTIF.toRGBA8(ifd);
    
    return {
        width: ifd.width,
        height: ifd.height,
        data: rgba
    };
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        exportToTIFF,
        importFromTIFF,
        initUTIF
    };
}
