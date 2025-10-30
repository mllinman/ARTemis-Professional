/**
 * Tiled Canvas Module
 * Provides tiled rendering support for 4K+ canvases to manage memory efficiently
 */

class TiledCanvas {
    constructor(width, height, tileSize = 512) {
        this.width = width;
        this.height = height;
        this.tileSize = tileSize;
        
        // Calculate tile grid
        this.tilesX = Math.ceil(width / tileSize);
        this.tilesY = Math.ceil(height / tileSize);
        
        // Initialize tile storage (lazy loading)
        this.tiles = new Map();
        
        // Track which tiles have been modified
        this.dirtyTiles = new Set();
        
        // Viewport tracking
        this.viewport = {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            scale: 1
        };
    }
    
    /**
     * Get tile key from coordinates
     */
    getTileKey(tileX, tileY) {
        return `${tileX},${tileY}`;
    }
    
    /**
     * Get or create a tile
     */
    getTile(tileX, tileY, create = true) {
        const key = this.getTileKey(tileX, tileY);
        
        if (!this.tiles.has(key) && create) {
            // Create new tile canvas
            const canvas = document.createElement('canvas');
            const tileWidth = Math.min(this.tileSize, this.width - tileX * this.tileSize);
            const tileHeight = Math.min(this.tileSize, this.height - tileY * this.tileSize);
            
            canvas.width = tileWidth;
            canvas.height = tileHeight;
            
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            
            this.tiles.set(key, {
                canvas,
                ctx,
                x: tileX * this.tileSize,
                y: tileY * this.tileSize,
                width: tileWidth,
                height: tileHeight,
                tileX,
                tileY,
                lastAccessed: Date.now()
            });
        }
        
        const tile = this.tiles.get(key);
        if (tile) {
            tile.lastAccessed = Date.now();
        }
        
        return tile;
    }
    
    /**
     * Get tiles that intersect with a given rectangle
     */
    getTilesInRect(x, y, width, height) {
        const startTileX = Math.max(0, Math.floor(x / this.tileSize));
        const startTileY = Math.max(0, Math.floor(y / this.tileSize));
        const endTileX = Math.min(this.tilesX - 1, Math.floor((x + width) / this.tileSize));
        const endTileY = Math.min(this.tilesY - 1, Math.floor((y + height) / this.tileSize));
        
        const tiles = [];
        
        for (let ty = startTileY; ty <= endTileY; ty++) {
            for (let tx = startTileX; tx <= endTileX; tx++) {
                tiles.push(this.getTile(tx, ty));
            }
        }
        
        return tiles;
    }
    
    /**
     * Draw on the tiled canvas
     */
    drawOnTiles(x, y, width, height, drawCallback) {
        const tiles = this.getTilesInRect(x, y, width, height);
        
        tiles.forEach(tile => {
            if (!tile) return;
            
            // Calculate the intersection of the draw area with this tile
            const tileRect = {
                x: tile.x,
                y: tile.y,
                width: tile.width,
                height: tile.height
            };
            
            const drawRect = { x, y, width, height };
            
            const intersection = this.getIntersection(tileRect, drawRect);
            
            if (intersection) {
                // Convert to tile-local coordinates
                const localX = intersection.x - tile.x;
                const localY = intersection.y - tile.y;
                
                // Call the draw callback with the tile context and local coordinates
                drawCallback(tile.ctx, localX, localY, intersection.width, intersection.height, tile);
                
                // Mark tile as dirty
                this.dirtyTiles.add(this.getTileKey(tile.tileX, tile.tileY));
            }
        });
    }
    
    /**
     * Get intersection of two rectangles
     */
    getIntersection(rect1, rect2) {
        const x = Math.max(rect1.x, rect2.x);
        const y = Math.max(rect1.y, rect2.y);
        const x2 = Math.min(rect1.x + rect1.width, rect2.x + rect2.width);
        const y2 = Math.min(rect1.y + rect1.height, rect2.y + rect2.height);
        
        if (x < x2 && y < y2) {
            return { x, y, width: x2 - x, height: y2 - y };
        }
        
        return null;
    }
    
    /**
     * Render visible tiles to a target canvas
     */
    renderToCanvas(targetCanvas, viewport) {
        this.viewport = viewport || this.viewport;
        
        const ctx = targetCanvas.getContext('2d');
        ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        
        // Get visible tiles
        const visibleTiles = this.getTilesInRect(
            this.viewport.x,
            this.viewport.y,
            this.viewport.width / this.viewport.scale,
            this.viewport.height / this.viewport.scale
        );
        
        // Render each visible tile
        visibleTiles.forEach(tile => {
            if (!tile) return;
            
            // Calculate position on target canvas
            const destX = (tile.x - this.viewport.x) * this.viewport.scale;
            const destY = (tile.y - this.viewport.y) * this.viewport.scale;
            const destWidth = tile.width * this.viewport.scale;
            const destHeight = tile.height * this.viewport.scale;
            
            ctx.drawImage(
                tile.canvas,
                0, 0, tile.width, tile.height,
                destX, destY, destWidth, destHeight
            );
        });
    }
    
    /**
     * Get pixel at coordinates
     */
    getPixel(x, y) {
        const tileX = Math.floor(x / this.tileSize);
        const tileY = Math.floor(y / this.tileSize);
        const tile = this.getTile(tileX, tileY, false);
        
        if (!tile) {
            return { r: 0, g: 0, b: 0, a: 0 };
        }
        
        const localX = x - tile.x;
        const localY = y - tile.y;
        
        const imageData = tile.ctx.getImageData(localX, localY, 1, 1);
        return {
            r: imageData.data[0],
            g: imageData.data[1],
            b: imageData.data[2],
            a: imageData.data[3]
        };
    }
    
    /**
     * Clear the canvas
     */
    clear() {
        this.tiles.forEach(tile => {
            tile.ctx.clearRect(0, 0, tile.width, tile.height);
        });
        this.dirtyTiles.clear();
    }
    
    /**
     * Flatten all tiles to a single canvas
     */
    flatten() {
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d');
        
        // Draw all tiles
        this.tiles.forEach(tile => {
            ctx.drawImage(tile.canvas, tile.x, tile.y);
        });
        
        return canvas;
    }
    
    /**
     * Clean up unused tiles to free memory
     */
    cleanupUnusedTiles(maxAge = 60000) {
        const now = Date.now();
        const tilesToRemove = [];
        
        this.tiles.forEach((tile, key) => {
            if (now - tile.lastAccessed > maxAge) {
                tilesToRemove.push(key);
            }
        });
        
        tilesToRemove.forEach(key => {
            this.tiles.delete(key);
            this.dirtyTiles.delete(key);
        });
        
        console.log(`Cleaned up ${tilesToRemove.length} unused tiles`);
    }
    
    /**
     * Get memory usage estimate
     */
    getMemoryUsage() {
        let totalBytes = 0;
        
        this.tiles.forEach(tile => {
            // 4 bytes per pixel (RGBA)
            totalBytes += tile.width * tile.height * 4;
        });
        
        return totalBytes;
    }
    
    /**
     * Load from existing canvas
     */
    loadFromCanvas(sourceCanvas) {
        // Create tiles from source canvas
        for (let ty = 0; ty < this.tilesY; ty++) {
            for (let tx = 0; tx < this.tilesX; tx++) {
                const tile = this.getTile(tx, ty);
                
                // Copy data from source canvas
                tile.ctx.drawImage(
                    sourceCanvas,
                    tile.x, tile.y, tile.width, tile.height,
                    0, 0, tile.width, tile.height
                );
            }
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TiledCanvas;
}
