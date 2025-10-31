/**
 * Performance Manager Module
 * Provides background processing and multi-core utilization
 */

class PerformanceManager {
    constructor() {
        this.workers = [];
        this.maxWorkers = navigator.hardwareConcurrency || 4;
        this.taskQueue = [];
        this.activeTasks = new Map();
        this.nextTaskId = 1;
        
        // Performance metrics
        this.metrics = {
            totalTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            averageProcessingTime: 0,
            peakMemoryUsage: 0
        };
    }
    
    /**
     * Initialize worker pool
     */
    initWorkerPool() {
        if (this.workers.length > 0) return;
        
        // Create worker pool
        for (let i = 0; i < this.maxWorkers; i++) {
            try {
                const worker = new Worker(this.createWorkerBlob());
                worker.onmessage = (e) => this.handleWorkerMessage(e);
                worker.onerror = (e) => this.handleWorkerError(e);
                this.workers.push({
                    worker,
                    busy: false,
                    currentTask: null
                });
            } catch (error) {
                console.error('Failed to create worker:', error);
            }
        }
    }
    
    /**
     * Create inline worker blob
     */
    createWorkerBlob() {
        const workerCode = `
            self.onmessage = function(e) {
                const { taskId, type, data } = e.data;
                
                try {
                    let result;
                    
                    switch(type) {
                        case 'filter':
                            result = applyFilter(data);
                            break;
                        case 'resize':
                            result = resizeImage(data);
                            break;
                        case 'blur':
                            result = applyBlur(data);
                            break;
                        case 'transform':
                            result = applyTransform(data);
                            break;
                        default:
                            throw new Error('Unknown task type: ' + type);
                    }
                    
                    self.postMessage({ taskId, result, success: true });
                } catch (error) {
                    self.postMessage({ taskId, error: error.message, success: false });
                }
            };
            
            function applyFilter(data) {
                const { imageData, filterType, params } = data;
                const pixels = imageData.data;
                
                // Apply filter based on type
                switch(filterType) {
                    case 'grayscale':
                        for (let i = 0; i < pixels.length; i += 4) {
                            const avg = (pixels[i] + pixels[i+1] + pixels[i+2]) / 3;
                            pixels[i] = pixels[i+1] = pixels[i+2] = avg;
                        }
                        break;
                    case 'invert':
                        for (let i = 0; i < pixels.length; i += 4) {
                            pixels[i] = 255 - pixels[i];
                            pixels[i+1] = 255 - pixels[i+1];
                            pixels[i+2] = 255 - pixels[i+2];
                        }
                        break;
                    case 'brightness':
                        const brightness = params.brightness || 0;
                        for (let i = 0; i < pixels.length; i += 4) {
                            pixels[i] = Math.min(255, Math.max(0, pixels[i] + brightness));
                            pixels[i+1] = Math.min(255, Math.max(0, pixels[i+1] + brightness));
                            pixels[i+2] = Math.min(255, Math.max(0, pixels[i+2] + brightness));
                        }
                        break;
                }
                
                return imageData;
            }
            
            function resizeImage(data) {
                // Simplified resize - in production, use better algorithm
                return data;
            }
            
            function applyBlur(data) {
                // Simplified blur - in production, use better algorithm
                return data;
            }
            
            function applyTransform(data) {
                // Simplified transform
                return data;
            }
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        return URL.createObjectURL(blob);
    }
    
    /**
     * Handle worker message
     */
    handleWorkerMessage(e) {
        const { taskId, result, success, error } = e.data;
        const task = this.activeTasks.get(taskId);
        
        if (!task) return;
        
        // Free up worker
        const workerInfo = this.workers.find(w => w.currentTask === taskId);
        if (workerInfo) {
            workerInfo.busy = false;
            workerInfo.currentTask = null;
        }
        
        // Update metrics
        const processingTime = Date.now() - task.startTime;
        this.metrics.completedTasks++;
        this.metrics.averageProcessingTime = 
            (this.metrics.averageProcessingTime * (this.metrics.completedTasks - 1) + processingTime) 
            / this.metrics.completedTasks;
        
        // Resolve or reject task
        if (success) {
            task.resolve(result);
        } else {
            this.metrics.failedTasks++;
            task.reject(new Error(error));
        }
        
        this.activeTasks.delete(taskId);
        
        // Process next task in queue
        this.processNextTask();
    }
    
    /**
     * Handle worker error
     */
    handleWorkerError(e) {
        console.error('Worker error:', e);
        this.metrics.failedTasks++;
    }
    
    /**
     * Queue background task
     * @param {string} type - Task type
     * @param {Object} data - Task data
     * @param {Object} options - Task options
     * @returns {Promise} Task result promise
     */
    queueTask(type, data, options = {}) {
        return new Promise((resolve, reject) => {
            const taskId = this.nextTaskId++;
            const task = {
                taskId,
                type,
                data,
                options,
                resolve,
                reject,
                priority: options.priority || 0,
                createdTime: Date.now()
            };
            
            this.taskQueue.push(task);
            this.metrics.totalTasks++;
            
            // Sort queue by priority
            this.taskQueue.sort((a, b) => b.priority - a.priority);
            
            // Try to process immediately
            this.processNextTask();
        });
    }
    
    /**
     * Process next task in queue
     */
    processNextTask() {
        if (this.taskQueue.length === 0) return;
        
        // Find available worker
        const availableWorker = this.workers.find(w => !w.busy);
        if (!availableWorker) return;
        
        // Get next task
        const task = this.taskQueue.shift();
        task.startTime = Date.now();
        
        // Assign to worker
        availableWorker.busy = true;
        availableWorker.currentTask = task.taskId;
        this.activeTasks.set(task.taskId, task);
        
        // Send to worker
        availableWorker.worker.postMessage({
            taskId: task.taskId,
            type: task.type,
            data: task.data
        });
    }
    
    /**
     * Process task in background (non-blocking)
     * @param {string} type - Task type
     * @param {Object} data - Task data
     * @returns {Promise} Task result
     */
    async processInBackground(type, data, options = {}) {
        // Initialize workers if needed
        if (this.workers.length === 0) {
            this.initWorkerPool();
        }
        
        return await this.queueTask(type, data, options);
    }
    
    /**
     * Apply filter in background
     * @param {ImageData} imageData - Image data to filter
     * @param {string} filterType - Filter type
     * @param {Object} params - Filter parameters
     * @returns {Promise<ImageData>} Filtered image data
     */
    async applyFilterAsync(imageData, filterType, params = {}) {
        return await this.processInBackground('filter', {
            imageData,
            filterType,
            params
        });
    }
    
    /**
     * Resize image in background
     * @param {ImageData} imageData - Image data to resize
     * @param {number} width - Target width
     * @param {number} height - Target height
     * @returns {Promise<ImageData>} Resized image data
     */
    async resizeImageAsync(imageData, width, height) {
        return await this.processInBackground('resize', {
            imageData,
            width,
            height
        });
    }
    
    /**
     * Cancel all pending tasks
     */
    cancelAllTasks() {
        // Reject all queued tasks
        this.taskQueue.forEach(task => {
            task.reject(new Error('Task cancelled'));
        });
        this.taskQueue = [];
        
        // Terminate active tasks
        this.activeTasks.forEach(task => {
            task.reject(new Error('Task cancelled'));
        });
        this.activeTasks.clear();
        
        // Reset workers
        this.workers.forEach(w => {
            w.busy = false;
            w.currentTask = null;
        });
    }
    
    /**
     * Get performance metrics
     * @returns {Object} Performance metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            queuedTasks: this.taskQueue.length,
            activeTasks: this.activeTasks.size,
            availableWorkers: this.workers.filter(w => !w.busy).length,
            totalWorkers: this.workers.length
        };
    }
    
    /**
     * Monitor memory usage
     * @returns {Object} Memory information
     */
    getMemoryInfo() {
        if (performance.memory) {
            const memory = performance.memory;
            const usedMB = (memory.usedJSHeapSize / 1048576).toFixed(2);
            const totalMB = (memory.totalJSHeapSize / 1048576).toFixed(2);
            const limitMB = (memory.jsHeapSizeLimit / 1048576).toFixed(2);
            
            return {
                used: usedMB,
                total: totalMB,
                limit: limitMB,
                percentUsed: ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(2)
            };
        }
        return null;
    }
    
    /**
     * Cleanup and terminate workers
     */
    cleanup() {
        this.cancelAllTasks();
        this.workers.forEach(w => w.worker.terminate());
        this.workers = [];
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceManager;
}
