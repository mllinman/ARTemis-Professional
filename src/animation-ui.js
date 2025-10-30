/**
 * ARTemis Animation UI
 * Phase 12 Implementation - UI components for animation system
 */

class AnimationUI {
    constructor(animationSystem) {
        this.animation = animationSystem;
        this.panel = null;
        this.timeline = null;
        this.isVisible = false;
    }

    /**
     * Create the animation panel UI
     */
    createPanel() {
        const panel = document.createElement('div');
        panel.id = 'animation-panel';
        panel.className = 'panel animation-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--bg-secondary, #2a2a2a);
            border: 1px solid var(--border-color, #3a3a3a);
            border-radius: 8px;
            padding: 12px;
            min-width: 600px;
            max-width: 90vw;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            display: none;
        `;

        panel.innerHTML = `
            <div class="animation-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <h3 style="margin: 0; font-size: 14px; color: var(--text-primary, #fff);">Animation Timeline</h3>
                <button id="close-animation-panel" style="background: none; border: none; color: var(--text-secondary, #ccc); cursor: pointer; font-size: 18px;">&times;</button>
            </div>

            <div class="animation-controls" style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
                <button id="anim-add-frame" class="anim-btn" title="Add Frame">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                    Add Frame
                </button>
                <button id="anim-duplicate-frame" class="anim-btn" title="Duplicate Frame">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                    </svg>
                    Duplicate
                </button>
                <button id="anim-delete-frame" class="anim-btn" title="Delete Frame">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                    Delete
                </button>
                <div style="width: 1px; background: var(--border-color, #3a3a3a); margin: 0 4px;"></div>
                <button id="anim-play" class="anim-btn" title="Play Animation">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                    Play
                </button>
                <button id="anim-stop" class="anim-btn" title="Stop Animation" disabled>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 6h12v12H6z"/>
                    </svg>
                    Stop
                </button>
                <button id="anim-prev-frame" class="anim-btn" title="Previous Frame">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                    </svg>
                </button>
                <button id="anim-next-frame" class="anim-btn" title="Next Frame">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                    </svg>
                </button>
                <div style="width: 1px; background: var(--border-color, #3a3a3a); margin: 0 4px;"></div>
                <button id="anim-onion-skin" class="anim-btn" title="Toggle Onion Skinning">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                    Onion Skin
                </button>
                <label style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-secondary, #ccc);">
                    FPS:
                    <input type="number" id="anim-fps" min="1" max="60" value="12" style="width: 50px; padding: 4px; background: var(--bg-primary, #1a1a1a); border: 1px solid var(--border-color, #3a3a3a); color: var(--text-primary, #fff); border-radius: 4px;">
                </label>
                <span style="margin-left: auto; font-size: 12px; color: var(--text-secondary, #ccc);">
                    Frame: <span id="anim-current-frame">0</span> / <span id="anim-total-frames">0</span>
                </span>
            </div>

            <div class="animation-timeline" id="animation-timeline" style="
                background: var(--bg-primary, #1a1a1a);
                border: 1px solid var(--border-color, #3a3a3a);
                border-radius: 4px;
                padding: 8px;
                min-height: 80px;
                max-height: 150px;
                overflow-x: auto;
                overflow-y: hidden;
                display: flex;
                gap: 8px;
                align-items: center;
            ">
                <div style="color: var(--text-secondary, #888); font-size: 12px;">No frames yet</div>
            </div>

            <div class="animation-export" style="display: flex; gap: 8px; margin-top: 12px;">
                <button id="anim-export-gif" class="anim-btn secondary" title="Export as GIF">
                    Export GIF
                </button>
                <button id="anim-export-frames" class="anim-btn secondary" title="Export Frame Sequence">
                    Export Frames
                </button>
                <button id="anim-export-spritesheet" class="anim-btn secondary" title="Export Sprite Sheet">
                    Export Sprite Sheet
                </button>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .anim-btn {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 6px 12px;
                background: var(--button-bg, #3a3a3a);
                border: 1px solid var(--border-color, #4a4a4a);
                border-radius: 4px;
                color: var(--text-primary, #fff);
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .anim-btn:hover:not(:disabled) {
                background: var(--button-hover, #4a4a4a);
                border-color: var(--accent, #4a9eff);
            }

            .anim-btn:active:not(:disabled) {
                transform: scale(0.95);
            }

            .anim-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .anim-btn.secondary {
                background: var(--bg-secondary, #2a2a2a);
            }

            .anim-btn.active {
                background: var(--accent, #4a9eff);
                border-color: var(--accent, #4a9eff);
            }

            .frame-thumbnail {
                position: relative;
                width: 80px;
                height: 60px;
                border: 2px solid var(--border-color, #3a3a3a);
                border-radius: 4px;
                cursor: pointer;
                flex-shrink: 0;
                overflow: hidden;
                background: var(--bg-secondary, #2a2a2a);
                transition: all 0.2s;
            }

            .frame-thumbnail:hover {
                border-color: var(--accent, #4a9eff);
                transform: scale(1.05);
            }

            .frame-thumbnail.active {
                border-color: var(--accent, #4a9eff);
                box-shadow: 0 0 8px var(--accent, #4a9eff);
            }

            .frame-thumbnail canvas {
                width: 100%;
                height: 100%;
                object-fit: contain;
            }

            .frame-thumbnail .frame-number {
                position: absolute;
                bottom: 2px;
                right: 2px;
                background: rgba(0,0,0,0.7);
                color: white;
                padding: 2px 4px;
                font-size: 10px;
                border-radius: 2px;
            }
        `;
        document.head.appendChild(style);

        this.panel = panel;
        document.body.appendChild(panel);

        this.attachEventListeners();
        return panel;
    }

    /**
     * Attach event listeners to animation controls
     */
    attachEventListeners() {
        const closeBtn = document.getElementById('close-animation-panel');
        closeBtn?.addEventListener('click', () => this.hide());

        const addFrameBtn = document.getElementById('anim-add-frame');
        addFrameBtn?.addEventListener('click', () => this.addFrame());

        const duplicateBtn = document.getElementById('anim-duplicate-frame');
        duplicateBtn?.addEventListener('click', () => this.duplicateFrame());

        const deleteBtn = document.getElementById('anim-delete-frame');
        deleteBtn?.addEventListener('click', () => this.deleteFrame());

        const playBtn = document.getElementById('anim-play');
        playBtn?.addEventListener('click', () => this.play());

        const stopBtn = document.getElementById('anim-stop');
        stopBtn?.addEventListener('click', () => this.stop());

        const prevBtn = document.getElementById('anim-prev-frame');
        prevBtn?.addEventListener('click', () => this.prevFrame());

        const nextBtn = document.getElementById('anim-next-frame');
        nextBtn?.addEventListener('click', () => this.nextFrame());

        const onionSkinBtn = document.getElementById('anim-onion-skin');
        onionSkinBtn?.addEventListener('click', () => this.toggleOnionSkin());

        const fpsInput = document.getElementById('anim-fps');
        fpsInput?.addEventListener('change', (e) => {
            this.animation.setFrameRate(parseInt(e.target.value) || 12);
        });

        // Export buttons
        document.getElementById('anim-export-gif')?.addEventListener('click', () => this.exportGIF());
        document.getElementById('anim-export-frames')?.addEventListener('click', () => this.exportFrames());
        document.getElementById('anim-export-spritesheet')?.addEventListener('click', () => this.exportSpriteSheet());
    }

    /**
     * Show the animation panel
     */
    show() {
        if (!this.panel) {
            this.createPanel();
        }
        this.panel.style.display = 'block';
        this.isVisible = true;
        this.updateTimeline();
    }

    /**
     * Hide the animation panel
     */
    hide() {
        if (this.panel) {
            this.panel.style.display = 'none';
        }
        this.isVisible = false;
    }

    /**
     * Toggle panel visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Update the timeline display
     */
    updateTimeline() {
        const timeline = document.getElementById('animation-timeline');
        if (!timeline) return;

        const frames = this.animation.frames;
        const currentFrame = this.animation.currentFrame;

        if (frames.length === 0) {
            timeline.innerHTML = '<div style="color: var(--text-secondary, #888); font-size: 12px;">No frames yet</div>';
        } else {
            timeline.innerHTML = '';
            frames.forEach((frame, index) => {
                const thumbnail = this.createFrameThumbnail(frame, index);
                timeline.appendChild(thumbnail);
            });
        }

        // Update frame counter
        document.getElementById('anim-current-frame').textContent = currentFrame + 1;
        document.getElementById('anim-total-frames').textContent = frames.length;
    }

    /**
     * Create a thumbnail element for a frame
     */
    createFrameThumbnail(frame, index) {
        const div = document.createElement('div');
        div.className = 'frame-thumbnail';
        if (index === this.animation.currentFrame) {
            div.classList.add('active');
        }

        // Create a small canvas for the thumbnail
        const canvas = document.createElement('canvas');
        canvas.width = 80;
        canvas.height = 60;
        // TODO: Render frame content to canvas

        const frameNumber = document.createElement('div');
        frameNumber.className = 'frame-number';
        frameNumber.textContent = index + 1;

        div.appendChild(canvas);
        div.appendChild(frameNumber);

        div.addEventListener('click', () => {
            this.animation.setCurrentFrame(index);
            this.updateTimeline();
            // Trigger frame change event
            this.onFrameChange?.(index, frame);
        });

        return div;
    }

    /**
     * Add a new frame
     */
    addFrame() {
        // TODO: Capture current canvas state
        this.animation.addFrame();
        this.updateTimeline();
    }

    /**
     * Duplicate current frame
     */
    duplicateFrame() {
        this.animation.duplicateFrame(this.animation.currentFrame);
        this.updateTimeline();
    }

    /**
     * Delete current frame
     */
    deleteFrame() {
        if (this.animation.frames.length > 0) {
            if (confirm('Delete this frame?')) {
                this.animation.deleteFrame(this.animation.currentFrame);
                this.updateTimeline();
            }
        }
    }

    /**
     * Play animation
     */
    play() {
        document.getElementById('anim-play').disabled = true;
        document.getElementById('anim-stop').disabled = false;

        this.animation.play((frameIndex, frame) => {
            this.updateTimeline();
            this.onFrameChange?.(frameIndex, frame);
        });
    }

    /**
     * Stop animation
     */
    stop() {
        this.animation.stop();
        document.getElementById('anim-play').disabled = false;
        document.getElementById('anim-stop').disabled = true;
    }

    /**
     * Go to previous frame
     */
    prevFrame() {
        const frame = this.animation.prevFrame();
        this.updateTimeline();
        this.onFrameChange?.(this.animation.currentFrame, frame);
    }

    /**
     * Go to next frame
     */
    nextFrame() {
        const frame = this.animation.nextFrame();
        this.updateTimeline();
        this.onFrameChange?.(this.animation.currentFrame, frame);
    }

    /**
     * Toggle onion skinning
     */
    toggleOnionSkin() {
        const enabled = this.animation.toggleOnionSkin();
        const btn = document.getElementById('anim-onion-skin');
        if (enabled) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
        this.onOnionSkinToggle?.(enabled);
    }

    /**
     * Export as GIF
     */
    async exportGIF() {
        alert('GIF export requires gif.js library. This will be implemented when the library is included.');
        // TODO: Implement GIF export
    }

    /**
     * Export as frame sequence
     */
    async exportFrames() {
        alert('Frame sequence export will download individual PNG files for each frame.');
        // TODO: Implement frame sequence export
    }

    /**
     * Export as sprite sheet
     */
    async exportSpriteSheet() {
        alert('Sprite sheet export will create a single image containing all frames in a grid.');
        // TODO: Implement sprite sheet export
    }

    /**
     * Set callback for frame changes
     */
    onFrameChange(callback) {
        this.onFrameChange = callback;
    }

    /**
     * Set callback for onion skin toggle
     */
    onOnionSkinToggle(callback) {
        this.onOnionSkinToggle = callback;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnimationUI;
}
