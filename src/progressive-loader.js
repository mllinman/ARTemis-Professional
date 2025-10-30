/**
 * Progressive Loading Module
 * Provides progressive/incremental loading of large images
 */

/**
 * Load image progressively with lower resolution previews
 * @param {string} imageUrl - URL or data URL of the image
 * @param {Function} onProgress - Callback for progress updates
 * @returns {Promise<HTMLImageElement>} Loaded image
 */
async function loadImageProgressively(imageUrl, onProgress) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        let lowResLoaded = false;
        
        // Create a low-resolution preview first
        const previewImg = new Image();
        previewImg.crossOrigin = 'anonymous';
        
        // Load preview at lower resolution
        if (imageUrl.startsWith('data:')) {
            // For data URLs, we can't easily create a low-res version
            // So we'll just load the full image
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                if (onProgress) onProgress(100, img);
                resolve(img);
            };
            img.onerror = reject;
            img.src = imageUrl;
        } else {
            // For regular URLs, load a thumbnail first if available
            // This is a placeholder - in production, you'd generate thumbnails server-side
            
            img.crossOrigin = 'anonymous';
            
            // Simulate progressive loading with timeout
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += 10;
                if (onProgress) onProgress(progress, null);
                if (progress >= 90) {
                    clearInterval(progressInterval);
                }
            }, 100);
            
            img.onload = () => {
                clearInterval(progressInterval);
                if (onProgress) onProgress(100, img);
                resolve(img);
            };
            
            img.onerror = (error) => {
                clearInterval(progressInterval);
                reject(error);
            };
            
            img.src = imageUrl;
        }
    });
}

/**
 * Load large image in chunks/tiles
 * @param {string} imageUrl - URL of the image
 * @param {Object} options - Options for tiled loading
 * @returns {Promise<Object>} Tiled image data
 */
async function loadImageTiled(imageUrl, options = {}) {
    const tileSize = options.tileSize || 512;
    
    // Load the full image first
    const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = imageUrl;
    });
    
    const width = img.width;
    const height = img.height;
    
    // Calculate number of tiles
    const tilesX = Math.ceil(width / tileSize);
    const tilesY = Math.ceil(height / tileSize);
    
    // Create tiles
    const tiles = [];
    
    for (let y = 0; y < tilesY; y++) {
        for (let x = 0; x < tilesX; x++) {
            const tileCanvas = document.createElement('canvas');
            const tileWidth = Math.min(tileSize, width - x * tileSize);
            const tileHeight = Math.min(tileSize, height - y * tileSize);
            
            tileCanvas.width = tileWidth;
            tileCanvas.height = tileHeight;
            
            const ctx = tileCanvas.getContext('2d');
            ctx.drawImage(
                img,
                x * tileSize, y * tileSize, tileWidth, tileHeight,
                0, 0, tileWidth, tileHeight
            );
            
            tiles.push({
                x: x * tileSize,
                y: y * tileSize,
                width: tileWidth,
                height: tileHeight,
                canvas: tileCanvas
            });
        }
    }
    
    return {
        width,
        height,
        tiles,
        tilesX,
        tilesY,
        tileSize
    };
}

/**
 * Render tiled image to canvas
 * @param {HTMLCanvasElement} targetCanvas - Target canvas
 * @param {Object} tiledImage - Tiled image data
 * @param {Object} viewport - Viewport information (x, y, width, height, scale)
 */
function renderTiledImage(targetCanvas, tiledImage, viewport) {
    const ctx = targetCanvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    
    // Calculate visible tiles
    const startTileX = Math.floor(viewport.x / tiledImage.tileSize);
    const startTileY = Math.floor(viewport.y / tiledImage.tileSize);
    const endTileX = Math.ceil((viewport.x + viewport.width) / tiledImage.tileSize);
    const endTileY = Math.ceil((viewport.y + viewport.height) / tiledImage.tileSize);
    
    // Render only visible tiles
    for (let ty = Math.max(0, startTileY); ty < Math.min(tiledImage.tilesY, endTileY); ty++) {
        for (let tx = Math.max(0, startTileX); tx < Math.min(tiledImage.tilesX, endTileX); tx++) {
            const tileIndex = ty * tiledImage.tilesX + tx;
            const tile = tiledImage.tiles[tileIndex];
            
            if (tile) {
                const destX = (tile.x - viewport.x) * viewport.scale;
                const destY = (tile.y - viewport.y) * viewport.scale;
                const destWidth = tile.width * viewport.scale;
                const destHeight = tile.height * viewport.scale;
                
                ctx.drawImage(
                    tile.canvas,
                    destX, destY,
                    destWidth, destHeight
                );
            }
        }
    }
}

/**
 * Create progressive JPEG-like loading effect
 * @param {string} imageUrl - Image URL
 * @param {HTMLCanvasElement} canvas - Target canvas
 * @param {Function} onProgress - Progress callback
 */
async function loadWithProgressiveEffect(imageUrl, canvas, onProgress) {
    const ctx = canvas.getContext('2d');
    
    // Load full image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    return new Promise((resolve, reject) => {
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Simulate progressive loading by gradually increasing quality
            const steps = 5;
            let currentStep = 0;
            
            const renderStep = () => {
                currentStep++;
                const quality = currentStep / steps;
                
                // Clear and redraw with increasing quality (simulated by size)
                const tempCanvas = document.createElement('canvas');
                const scale = quality;
                tempCanvas.width = Math.max(1, Math.floor(img.width * scale));
                tempCanvas.height = Math.max(1, Math.floor(img.height * scale));
                
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
                
                // Draw scaled version to main canvas
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
                
                if (onProgress) {
                    onProgress((currentStep / steps) * 100, currentStep === steps ? img : null);
                }
                
                if (currentStep < steps) {
                    setTimeout(renderStep, 100);
                } else {
                    // Final render at full quality
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                    resolve(img);
                }
            };
            
            renderStep();
        };
        
        img.onerror = reject;
        img.src = imageUrl;
    });
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadImageProgressively,
        loadImageTiled,
        renderTiledImage,
        loadWithProgressiveEffect
    };
}
