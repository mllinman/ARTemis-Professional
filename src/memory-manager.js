/**
 * Memory Manager Module
 * Provides automatic memory management and optimization
 */

class MemoryManager {
    constructor() {
        this.cache = new Map();
        this.cacheSize = 0;
        this.maxCacheSize = 100 * 1024 * 1024; // 100MB default
        this.cachePriorities = new Map();
        
        // Memory thresholds
        this.thresholds = {
            warning: 0.75,  // 75% of available memory
            critical: 0.90  // 90% of available memory
        };
        
        // Auto-cleanup settings
        this.autoCleanup = true;
        this.cleanupInterval = 60000; // 1 minute
        this.cleanupTimer = null;
        
        // Memory statistics
        this.stats = {
            cacheHits: 0,
            cacheMisses: 0,
            cleanupCount: 0,
            totalBytesFreed: 0,
            lastCleanup: null
        };
        
        // Start auto-cleanup
        if (this.autoCleanup) {
            this.startAutoCleanup();
        }
    }
    
    /**
     * Get current memory usage
     * @returns {Object} Memory information
     */
    getMemoryUsage() {
        if (performance.memory) {
            const memory = performance.memory;
            return {
                used: memory.usedJSHeapSize,
                total: memory.totalJSHeapSize,
                limit: memory.jsHeapSizeLimit,
                percentUsed: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
                available: memory.jsHeapSizeLimit - memory.usedJSHeapSize
            };
        }
        return null;
    }
    
    /**
     * Check if memory is above threshold
     * @param {string} level - 'warning' or 'critical'
     * @returns {boolean} True if above threshold
     */
    isMemoryAboveThreshold(level = 'warning') {
        const usage = this.getMemoryUsage();
        if (!usage) return false;
        
        const threshold = this.thresholds[level];
        return usage.percentUsed >= threshold * 100;
    }
    
    /**
     * Add item to cache
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     * @param {Object} options - Cache options
     */
    cacheItem(key, value, options = {}) {
        const size = this.estimateSize(value);
        const priority = options.priority || 1;
        const ttl = options.ttl || null; // Time to live in ms
        
        // Check if adding this would exceed max cache size
        if (this.cacheSize + size > this.maxCacheSize) {
            this.evictLeastPriority(size);
        }
        
        const cacheEntry = {
            value,
            size,
            priority,
            timestamp: Date.now(),
            ttl,
            accessCount: 0,
            lastAccess: Date.now()
        };
        
        this.cache.set(key, cacheEntry);
        this.cachePriorities.set(key, priority);
        this.cacheSize += size;
    }
    
    /**
     * Get item from cache
     * @param {string} key - Cache key
     * @returns {*} Cached value or null
     */
    getCacheItem(key) {
        const entry = this.cache.get(key);
        
        if (!entry) {
            this.stats.cacheMisses++;
            return null;
        }
        
        // Check TTL
        if (entry.ttl && (Date.now() - entry.timestamp > entry.ttl)) {
            this.removeCacheItem(key);
            this.stats.cacheMisses++;
            return null;
        }
        
        // Update access info
        entry.accessCount++;
        entry.lastAccess = Date.now();
        this.stats.cacheHits++;
        
        return entry.value;
    }
    
    /**
     * Remove item from cache
     * @param {string} key - Cache key
     */
    removeCacheItem(key) {
        const entry = this.cache.get(key);
        if (entry) {
            this.cacheSize -= entry.size;
            this.cache.delete(key);
            this.cachePriorities.delete(key);
        }
    }
    
    /**
     * Evict least priority items to make room
     * @param {number} requiredSize - Size needed
     */
    evictLeastPriority(requiredSize) {
        // Sort cache entries by priority and access patterns
        const entries = Array.from(this.cache.entries())
            .map(([key, entry]) => ({
                key,
                ...entry,
                score: this.calculateEvictionScore(entry)
            }))
            .sort((a, b) => a.score - b.score);
        
        let freedSpace = 0;
        for (const entry of entries) {
            if (freedSpace >= requiredSize) break;
            
            freedSpace += entry.size;
            this.removeCacheItem(entry.key);
        }
    }
    
    /**
     * Calculate eviction score (lower = evict first)
     * @param {Object} entry - Cache entry
     * @returns {number} Eviction score
     */
    calculateEvictionScore(entry) {
        const age = Date.now() - entry.timestamp;
        const timeSinceAccess = Date.now() - entry.lastAccess;
        
        // Score based on priority, access count, and recency
        return (entry.priority * 1000) + 
               (entry.accessCount * 100) - 
               (timeSinceAccess / 1000);
    }
    
    /**
     * Estimate memory size of value
     * @param {*} value - Value to estimate
     * @returns {number} Estimated size in bytes
     */
    estimateSize(value) {
        if (value === null || value === undefined) return 0;
        
        // Canvas elements
        if (value instanceof HTMLCanvasElement) {
            return value.width * value.height * 4; // RGBA
        }
        
        // ImageData
        if (value instanceof ImageData) {
            return value.data.byteLength;
        }
        
        // Typed arrays
        if (ArrayBuffer.isView(value)) {
            return value.byteLength;
        }
        
        // Strings
        if (typeof value === 'string') {
            return value.length * 2; // UTF-16
        }
        
        // Objects and arrays (rough estimate)
        if (typeof value === 'object') {
            return JSON.stringify(value).length * 2;
        }
        
        // Primitives
        return 8;
    }
    
    /**
     * Clean up expired and low-priority cache items
     * @param {boolean} aggressive - Use aggressive cleanup
     * @returns {number} Bytes freed
     */
    cleanup(aggressive = false) {
        let bytesFreed = 0;
        const now = Date.now();
        
        // Remove expired items
        for (const [key, entry] of this.cache.entries()) {
            if (entry.ttl && (now - entry.timestamp > entry.ttl)) {
                bytesFreed += entry.size;
                this.removeCacheItem(key);
            }
        }
        
        // Aggressive cleanup if needed
        if (aggressive || this.isMemoryAboveThreshold('warning')) {
            const targetSize = this.maxCacheSize * 0.7; // Keep 70% of max
            
            if (this.cacheSize > targetSize) {
                const toFree = this.cacheSize - targetSize;
                this.evictLeastPriority(toFree);
                bytesFreed += toFree;
            }
        }
        
        this.stats.cleanupCount++;
        this.stats.totalBytesFreed += bytesFreed;
        this.stats.lastCleanup = now;
        
        return bytesFreed;
    }
    
    /**
     * Start automatic cleanup
     */
    startAutoCleanup() {
        if (this.cleanupTimer) return;
        
        this.cleanupTimer = setInterval(() => {
            const usage = this.getMemoryUsage();
            const aggressive = usage && usage.percentUsed > this.thresholds.warning * 100;
            this.cleanup(aggressive);
        }, this.cleanupInterval);
    }
    
    /**
     * Stop automatic cleanup
     */
    stopAutoCleanup() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }
    
    /**
     * Clear all cache
     */
    clearCache() {
        const bytesFreed = this.cacheSize;
        this.cache.clear();
        this.cachePriorities.clear();
        this.cacheSize = 0;
        this.stats.totalBytesFreed += bytesFreed;
        return bytesFreed;
    }
    
    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        const hitRate = this.stats.cacheHits + this.stats.cacheMisses > 0
            ? (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses)) * 100
            : 0;
        
        return {
            ...this.stats,
            cacheSize: this.cacheSize,
            cacheItems: this.cache.size,
            maxCacheSize: this.maxCacheSize,
            cacheUsagePercent: (this.cacheSize / this.maxCacheSize) * 100,
            hitRate: hitRate.toFixed(2)
        };
    }
    
    /**
     * Request garbage collection (if available)
     */
    requestGC() {
        if (global && global.gc) {
            try {
                global.gc();
                return true;
            } catch (e) {
                console.warn('Manual GC not available');
            }
        }
        return false;
    }
    
    /**
     * Create memory-efficient canvas
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @param {Object} options - Canvas options
     * @returns {HTMLCanvasElement} Canvas element
     */
    createOptimizedCanvas(width, height, options = {}) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        // Use optimal context settings
        const contextOptions = {
            alpha: options.alpha !== false,
            desynchronized: true,
            willReadFrequently: options.willReadFrequently || false
        };
        
        const ctx = canvas.getContext('2d', contextOptions);
        
        return canvas;
    }
    
    /**
     * Dispose of canvas and free memory
     * @param {HTMLCanvasElement} canvas - Canvas to dispose
     */
    disposeCanvas(canvas) {
        if (!canvas) return;
        
        // Clear canvas
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        // Reset size to free memory
        canvas.width = 0;
        canvas.height = 0;
        
        // Remove from cache if present
        for (const [key, entry] of this.cache.entries()) {
            if (entry.value === canvas) {
                this.removeCacheItem(key);
            }
        }
    }
    
    /**
     * Get memory recommendations
     * @returns {Object} Memory recommendations
     */
    getRecommendations() {
        const usage = this.getMemoryUsage();
        const recommendations = [];
        
        if (!usage) {
            return { recommendations: ['Memory monitoring not available in this browser'] };
        }
        
        if (usage.percentUsed > 90) {
            recommendations.push('Critical: Memory usage above 90%. Consider closing other applications.');
            recommendations.push('Consider reducing canvas size or layer count.');
        } else if (usage.percentUsed > 75) {
            recommendations.push('Warning: Memory usage above 75%. Performance may be affected.');
            recommendations.push('Run cleanup to free memory.');
        }
        
        if (this.cacheSize > this.maxCacheSize * 0.9) {
            recommendations.push('Cache is nearly full. Consider increasing max cache size.');
        }
        
        const hitRate = this.getCacheStats().hitRate;
        if (hitRate < 50) {
            recommendations.push('Low cache hit rate. Consider adjusting cache strategy.');
        }
        
        return {
            usage,
            cacheStats: this.getCacheStats(),
            recommendations
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MemoryManager;
}
