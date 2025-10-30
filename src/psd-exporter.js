/**
 * PSD Export Module
 * Provides full PSD export capabilities with layer preservation using ag-psd library
 */

// Import ag-psd library (needs to be loaded via script tag or bundler)
// For browser usage, we'll load it dynamically

let agPsd = null;

// Initialize ag-psd library
async function initAgPsd() {
    if (agPsd) return agPsd;
    
    try {
        // Try to load from node_modules (for bundled version)
        if (typeof require !== 'undefined') {
            agPsd = require('ag-psd');
        } else {
            // For browser, load from CDN
            await loadScript('https://unpkg.com/ag-psd@28.4.1/dist/bundle.js');
            agPsd = window.agPsd;
        }
        return agPsd;
    } catch (error) {
        console.error('Failed to load ag-psd library:', error);
        throw new Error('PSD library not available. Cannot export to PSD format.');
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
 * Export canvas to PSD format with full layer support
 * @param {Object} state - Application state containing layers
 * @param {HTMLCanvasElement} mainCanvas - Main canvas element
 * @returns {Promise<ArrayBuffer>} PSD file data
 */
async function exportToPSD(state, mainCanvas) {
    await initAgPsd();
    
    if (!agPsd) {
        throw new Error('ag-psd library not loaded');
    }
    
    const { writePsd } = agPsd;
    
    // Create PSD document structure
    const psdDocument = {
        width: mainCanvas.width,
        height: mainCanvas.height,
        children: []
    };
    
    // Add each layer to the PSD document
    for (let i = state.layers.length - 1; i >= 0; i--) {
        const layer = state.layers[i];
        
        // Get layer canvas data
        const layerCanvas = layer.canvas;
        const ctx = layerCanvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, layerCanvas.width, layerCanvas.height);
        
        // Create PSD layer
        const psdLayer = {
            name: layer.name || `Layer ${i}`,
            opacity: layer.opacity / 100, // Convert from 0-100 to 0-1
            blendMode: convertBlendMode(layer.blendMode),
            hidden: !layer.visible,
            canvas: layerCanvas,
            imageData: imageData
        };
        
        psdDocument.children.push(psdLayer);
    }
    
    // Write PSD to ArrayBuffer
    const arrayBuffer = writePsd(psdDocument, { generateThumbnail: true });
    
    return arrayBuffer;
}

/**
 * Convert ARTemis blend mode to PSD blend mode
 * @param {string} blendMode - ARTemis blend mode
 * @returns {string} PSD blend mode
 */
function convertBlendMode(blendMode) {
    const blendModeMap = {
        'source-over': 'normal',
        'multiply': 'multiply',
        'screen': 'screen',
        'overlay': 'overlay',
        'darken': 'darken',
        'lighten': 'lighten',
        'color-dodge': 'color dodge',
        'color-burn': 'color burn',
        'hard-light': 'hard light',
        'soft-light': 'soft light',
        'difference': 'difference',
        'exclusion': 'exclusion',
        'hue': 'hue',
        'saturation': 'saturation',
        'color': 'color',
        'luminosity': 'luminosity'
    };
    
    return blendModeMap[blendMode] || 'normal';
}

/**
 * Import PSD file and load layers
 * @param {ArrayBuffer} arrayBuffer - PSD file data
 * @returns {Promise<Object>} Parsed PSD document
 */
async function importFromPSD(arrayBuffer) {
    await initAgPsd();
    
    if (!agPsd) {
        throw new Error('ag-psd library not loaded');
    }
    
    const { readPsd } = agPsd;
    
    // Parse PSD file
    const psd = readPsd(arrayBuffer);
    
    return psd;
}

/**
 * Convert PSD blend mode to ARTemis blend mode
 * @param {string} psdBlendMode - PSD blend mode
 * @returns {string} ARTemis blend mode
 */
function convertFromPSDBlendMode(psdBlendMode) {
    const blendModeMap = {
        'normal': 'source-over',
        'multiply': 'multiply',
        'screen': 'screen',
        'overlay': 'overlay',
        'darken': 'darken',
        'lighten': 'lighten',
        'color dodge': 'color-dodge',
        'color burn': 'color-burn',
        'hard light': 'hard-light',
        'soft light': 'soft-light',
        'difference': 'difference',
        'exclusion': 'exclusion',
        'hue': 'hue',
        'saturation': 'saturation',
        'color': 'color',
        'luminosity': 'luminosity'
    };
    
    return blendModeMap[psdBlendMode] || 'source-over';
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        exportToPSD,
        importFromPSD,
        initAgPsd
    };
}
