/**
 * ARTemis Session Recorder
 * Phase 12 Implementation - Recording and playback of painting sessions
 */

class SessionRecorder {
    constructor() {
        this.isRecording = false;
        this.recordedActions = [];
        this.startTime = null;
        this.recordCanvas = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.actionHistory = [];
        this.playbackSpeed = 1.0;
    }

    /**
     * Start recording actions
     */
    startRecording(canvas) {
        if (this.isRecording) return;

        this.isRecording = true;
        this.recordedActions = [];
        this.startTime = Date.now();
        this.recordCanvas = canvas;
        this.actionHistory = [];

        console.log('Session recording started');
    }

    /**
     * Stop recording
     */
    stopRecording() {
        if (!this.isRecording) return;

        this.isRecording = false;
        const duration = Date.now() - this.startTime;

        console.log(`Session recording stopped. Duration: ${duration}ms, Actions: ${this.recordedActions.length}`);

        return {
            duration,
            actionCount: this.recordedActions.length,
            actions: this.recordedActions
        };
    }

    /**
     * Record an action
     */
    recordAction(action) {
        if (!this.isRecording) return;

        const timestamp = Date.now() - this.startTime;
        this.recordedActions.push({
            timestamp,
            action: action.type,
            data: action.data,
            tool: action.tool
        });
    }

    /**
     * Record brush stroke
     */
    recordBrushStroke(tool, points, settings) {
        this.recordAction({
            type: 'brushStroke',
            tool: tool,
            data: {
                points: points.map(p => ({ x: p.x, y: p.y, pressure: p.pressure })),
                settings: { ...settings }
            }
        });
    }

    /**
     * Record layer operation
     */
    recordLayerOperation(operation, layerData) {
        this.recordAction({
            type: 'layerOperation',
            tool: 'layer',
            data: {
                operation,
                layerData
            }
        });
    }

    /**
     * Record transform operation
     */
    recordTransform(transform) {
        this.recordAction({
            type: 'transform',
            tool: 'transform',
            data: transform
        });
    }

    /**
     * Playback recorded session
     */
    async playback(canvas, ctx, onProgress = null, speed = 1.0) {
        if (this.recordedActions.length === 0) {
            console.warn('No recorded actions to playback');
            return;
        }

        this.playbackSpeed = speed;
        const totalDuration = this.recordedActions[this.recordedActions.length - 1].timestamp;

        for (let i = 0; i < this.recordedActions.length; i++) {
            const action = this.recordedActions[i];
            const nextAction = this.recordedActions[i + 1];

            // Wait for the appropriate time
            if (nextAction) {
                const delay = (nextAction.timestamp - action.timestamp) / this.playbackSpeed;
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            // Execute the action (this would need to be connected to the main application)
            if (onProgress) {
                onProgress(i + 1, this.recordedActions.length, action);
            }
        }

        console.log('Playback completed');
    }

    /**
     * Export session as video using MediaRecorder API
     */
    async exportAsVideo(canvas, options = {}) {
        const {
            mimeType = 'video/webm',
            videoBitsPerSecond = 2500000,
            onProgress = null
        } = options;

        // Check if MediaRecorder is supported
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            throw new Error(`MIME type ${mimeType} is not supported`);
        }

        this.recordedChunks = [];

        // Create a stream from the canvas
        const stream = canvas.captureStream(30); // 30 FPS
        this.mediaRecorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond
        });

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };

        return new Promise((resolve, reject) => {
            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, { type: mimeType });
                resolve(blob);
            };

            this.mediaRecorder.onerror = (error) => {
                reject(error);
            };

            // Start recording
            this.mediaRecorder.start();

            // Playback the session while recording
            this.playback(canvas, canvas.getContext('2d'), (current, total) => {
                if (onProgress) {
                    onProgress(current, total);
                }

                // Stop recording when playback is complete
                if (current === total) {
                    setTimeout(() => {
                        this.mediaRecorder.stop();
                    }, 100);
                }
            }).catch(reject);
        });
    }

    /**
     * Create time-lapse from session
     */
    async createTimeLapse(canvas, ctx, options = {}) {
        const {
            targetDuration = 30000, // 30 seconds
            onProgress = null
        } = options;

        if (this.recordedActions.length === 0) {
            throw new Error('No recorded actions to create time-lapse');
        }

        const totalDuration = this.recordedActions[this.recordedActions.length - 1].timestamp;
        const speedMultiplier = totalDuration / targetDuration;

        return this.exportAsVideo(canvas, {
            onProgress,
            playbackSpeed: speedMultiplier
        });
    }

    /**
     * Save session to JSON
     */
    saveToJSON() {
        return JSON.stringify({
            version: '1.0',
            duration: this.recordedActions.length > 0 
                ? this.recordedActions[this.recordedActions.length - 1].timestamp 
                : 0,
            actionCount: this.recordedActions.length,
            actions: this.recordedActions
        });
    }

    /**
     * Load session from JSON
     */
    loadFromJSON(json) {
        try {
            const data = typeof json === 'string' ? JSON.parse(json) : json;
            this.recordedActions = data.actions || [];
            this.isRecording = false;
            return true;
        } catch (error) {
            console.error('Failed to load session data:', error);
            return false;
        }
    }

    /**
     * Clear recorded session
     */
    clear() {
        this.recordedActions = [];
        this.actionHistory = [];
        this.startTime = null;
        this.isRecording = false;
    }

    /**
     * Get recording stats
     */
    getStats() {
        if (this.recordedActions.length === 0) {
            return {
                duration: 0,
                actionCount: 0,
                avgActionsPerSecond: 0
            };
        }

        const duration = this.recordedActions[this.recordedActions.length - 1].timestamp;
        const actionCount = this.recordedActions.length;

        return {
            duration,
            actionCount,
            avgActionsPerSecond: (actionCount / (duration / 1000)).toFixed(2)
        };
    }

    /**
     * Record macro - simplified action recording for batch operations
     */
    startMacro(name) {
        this.actionHistory = [];
        this.macroName = name;
        this.recordingMacro = true;
    }

    /**
     * Stop macro recording
     */
    stopMacro() {
        if (!this.recordingMacro) return null;

        const macro = {
            name: this.macroName,
            actions: [...this.actionHistory],
            timestamp: Date.now()
        };

        this.recordingMacro = false;
        this.actionHistory = [];

        return macro;
    }

    /**
     * Replay macro on specific layers
     */
    async replayMacro(macro, targetLayers, onProgress = null) {
        if (!macro || !macro.actions) {
            throw new Error('Invalid macro data');
        }

        for (let i = 0; i < macro.actions.length; i++) {
            const action = macro.actions[i];

            // Apply action to each target layer
            // (This would need to be connected to the main application)

            if (onProgress) {
                onProgress(i + 1, macro.actions.length);
            }

            // Small delay between actions
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SessionRecorder;
}
