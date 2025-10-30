/**
 * ARTemis Animation System
 * Phase 12 Implementation - Frame-by-frame animation support
 */

class AnimationSystem {
    constructor() {
        this.frames = [];
        this.currentFrame = 0;
        this.isPlaying = false;
        this.frameRate = 12; // Default 12 FPS
        this.playbackTimer = null;
        this.onionSkinEnabled = false;
        this.onionSkinFrames = 2; // Show 2 frames before/after
        this.onionSkinOpacity = 0.3;
    }

    /**
     * Add a new frame to the animation
     */
    addFrame(layerData = null) {
        const frame = {
            id: Date.now() + Math.random(),
            layers: layerData ? JSON.parse(JSON.stringify(layerData)) : [],
            timestamp: Date.now(),
            duration: 1000 / this.frameRate
        };
        this.frames.push(frame);
        return frame;
    }

    /**
     * Delete a frame
     */
    deleteFrame(index) {
        if (index >= 0 && index < this.frames.length) {
            this.frames.splice(index, 1);
            if (this.currentFrame >= this.frames.length) {
                this.currentFrame = Math.max(0, this.frames.length - 1);
            }
        }
    }

    /**
     * Duplicate the current frame
     */
    duplicateFrame(index) {
        if (index >= 0 && index < this.frames.length) {
            const frame = JSON.parse(JSON.stringify(this.frames[index]));
            frame.id = Date.now() + Math.random();
            this.frames.splice(index + 1, 0, frame);
        }
    }

    /**
     * Set current frame
     */
    setCurrentFrame(index) {
        if (index >= 0 && index < this.frames.length) {
            this.currentFrame = index;
            return this.frames[index];
        }
        return null;
    }

    /**
     * Go to next frame
     */
    nextFrame() {
        this.currentFrame = (this.currentFrame + 1) % this.frames.length;
        return this.frames[this.currentFrame];
    }

    /**
     * Go to previous frame
     */
    prevFrame() {
        this.currentFrame = (this.currentFrame - 1 + this.frames.length) % this.frames.length;
        return this.frames[this.currentFrame];
    }

    /**
     * Play animation
     */
    play(onFrameChange) {
        if (this.isPlaying || this.frames.length === 0) return;
        
        this.isPlaying = true;
        const frameTime = 1000 / this.frameRate;
        
        this.playbackTimer = setInterval(() => {
            this.nextFrame();
            if (onFrameChange) {
                onFrameChange(this.currentFrame, this.frames[this.currentFrame]);
            }
        }, frameTime);
    }

    /**
     * Stop animation playback
     */
    stop() {
        if (this.playbackTimer) {
            clearInterval(this.playbackTimer);
            this.playbackTimer = null;
        }
        this.isPlaying = false;
    }

    /**
     * Set frame rate
     */
    setFrameRate(fps) {
        this.frameRate = Math.max(1, Math.min(60, fps));
        if (this.isPlaying) {
            this.stop();
            this.play();
        }
    }

    /**
     * Toggle onion skinning
     */
    toggleOnionSkin() {
        this.onionSkinEnabled = !this.onionSkinEnabled;
        return this.onionSkinEnabled;
    }

    /**
     * Get frames for onion skinning
     */
    getOnionSkinFrames() {
        if (!this.onionSkinEnabled || this.frames.length === 0) {
            return [];
        }

        const onionFrames = [];
        for (let i = 1; i <= this.onionSkinFrames; i++) {
            // Previous frames
            const prevIndex = (this.currentFrame - i + this.frames.length) % this.frames.length;
            if (prevIndex !== this.currentFrame) {
                onionFrames.push({
                    index: prevIndex,
                    frame: this.frames[prevIndex],
                    opacity: this.onionSkinOpacity * (1 - (i - 1) / this.onionSkinFrames),
                    type: 'previous'
                });
            }

            // Next frames
            const nextIndex = (this.currentFrame + i) % this.frames.length;
            if (nextIndex !== this.currentFrame) {
                onionFrames.push({
                    index: nextIndex,
                    frame: this.frames[nextIndex],
                    opacity: this.onionSkinOpacity * (1 - (i - 1) / this.onionSkinFrames) * 0.5,
                    type: 'next'
                });
            }
        }

        return onionFrames;
    }

    /**
     * Export animation as GIF using gif.js library
     */
    async exportAsGIF(canvasRenderer, options = {}) {
        const {
            width = 800,
            height = 600,
            quality = 10,
            repeat = 0, // 0 = loop forever
            onProgress = null
        } = options;

        // Note: This requires gif.js library to be loaded
        if (typeof GIF === 'undefined') {
            throw new Error('GIF.js library not loaded. Please include gif.js in your HTML.');
        }

        const gif = new GIF({
            workers: 2,
            quality: quality,
            width: width,
            height: height,
            repeat: repeat
        });

        // Render each frame
        for (let i = 0; i < this.frames.length; i++) {
            const frame = this.frames[i];
            const canvas = await canvasRenderer(frame, i);
            gif.addFrame(canvas, { delay: frame.duration || (1000 / this.frameRate) });
            
            if (onProgress) {
                onProgress(i + 1, this.frames.length);
            }
        }

        return new Promise((resolve, reject) => {
            gif.on('finished', (blob) => {
                resolve(blob);
            });

            gif.on('error', (error) => {
                reject(error);
            });

            gif.render();
        });
    }

    /**
     * Export animation as frame sequence (PNG images)
     */
    async exportAsFrameSequence(canvasRenderer, options = {}) {
        const {
            format = 'png',
            quality = 0.9,
            prefix = 'frame',
            onProgress = null
        } = options;

        const frames = [];

        for (let i = 0; i < this.frames.length; i++) {
            const frame = this.frames[i];
            const canvas = await canvasRenderer(frame, i);
            
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, `image/${format}`, quality);
            });

            const filename = `${prefix}_${String(i).padStart(4, '0')}.${format}`;
            frames.push({ blob, filename, index: i });

            if (onProgress) {
                onProgress(i + 1, this.frames.length);
            }
        }

        return frames;
    }

    /**
     * Export animation as sprite sheet
     */
    async exportAsSpriteSheet(canvasRenderer, options = {}) {
        const {
            columns = 4,
            frameWidth = 200,
            frameHeight = 150,
            spacing = 0,
            onProgress = null
        } = options;

        const rows = Math.ceil(this.frames.length / columns);
        const sheetWidth = (frameWidth + spacing) * columns - spacing;
        const sheetHeight = (frameHeight + spacing) * rows - spacing;

        const sheetCanvas = document.createElement('canvas');
        sheetCanvas.width = sheetWidth;
        sheetCanvas.height = sheetHeight;
        const ctx = sheetCanvas.getContext('2d');

        // Clear background
        ctx.fillStyle = 'transparent';
        ctx.fillRect(0, 0, sheetWidth, sheetHeight);

        // Render each frame onto the sprite sheet
        for (let i = 0; i < this.frames.length; i++) {
            const frame = this.frames[i];
            const canvas = await canvasRenderer(frame, i);

            const col = i % columns;
            const row = Math.floor(i / columns);
            const x = col * (frameWidth + spacing);
            const y = row * (frameHeight + spacing);

            ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, x, y, frameWidth, frameHeight);

            if (onProgress) {
                onProgress(i + 1, this.frames.length);
            }
        }

        return {
            canvas: sheetCanvas,
            metadata: {
                frameWidth,
                frameHeight,
                columns,
                rows,
                totalFrames: this.frames.length,
                spacing
            }
        };
    }

    /**
     * Save animation data to JSON
     */
    saveToJSON() {
        return JSON.stringify({
            version: '1.0',
            frameRate: this.frameRate,
            currentFrame: this.currentFrame,
            onionSkinEnabled: this.onionSkinEnabled,
            onionSkinFrames: this.onionSkinFrames,
            onionSkinOpacity: this.onionSkinOpacity,
            frames: this.frames
        });
    }

    /**
     * Load animation data from JSON
     */
    loadFromJSON(json) {
        try {
            const data = typeof json === 'string' ? JSON.parse(json) : json;
            this.frames = data.frames || [];
            this.frameRate = data.frameRate || 12;
            this.currentFrame = data.currentFrame || 0;
            this.onionSkinEnabled = data.onionSkinEnabled || false;
            this.onionSkinFrames = data.onionSkinFrames || 2;
            this.onionSkinOpacity = data.onionSkinOpacity || 0.3;
            return true;
        } catch (error) {
            console.error('Failed to load animation data:', error);
            return false;
        }
    }

    /**
     * Clear all frames
     */
    clear() {
        this.stop();
        this.frames = [];
        this.currentFrame = 0;
    }

    /**
     * Get total frame count
     */
    getFrameCount() {
        return this.frames.length;
    }

    /**
     * Get current frame data
     */
    getCurrentFrame() {
        return this.frames[this.currentFrame] || null;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnimationSystem;
}
