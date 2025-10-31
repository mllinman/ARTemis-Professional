/**
 * Reference Canvas Module
 * Provides a separate floating reference window
 */

class ReferenceCanvas {
    constructor() {
        this.window = null;
        this.canvas = null;
        this.ctx = null;
        this.referenceImage = null;
        
        // Window settings
        this.settings = {
            width: 400,
            height: 400,
            x: 100,
            y: 100,
            alwaysOnTop: true,
            resizable: true,
            opacity: 1.0,
            visible: false
        };
        
        // Zoom and pan
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        this.createWindow();
    }
    
    /**
     * Create reference window
     */
    createWindow() {
        // Create floating window div
        this.window = document.createElement('div');
        this.window.className = 'reference-window';
        this.window.style.cssText = `
            position: fixed;
            left: ${this.settings.x}px;
            top: ${this.settings.y}px;
            width: ${this.settings.width}px;
            height: ${this.settings.height}px;
            background: #2a2a2a;
            border: 2px solid #444;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            z-index: 10000;
            display: none;
            overflow: hidden;
        `;
        
        // Create title bar
        const titleBar = document.createElement('div');
        titleBar.className = 'reference-titlebar';
        titleBar.style.cssText = `
            background: #1a1a1a;
            padding: 8px;
            cursor: move;
            display: flex;
            justify-content: space-between;
            align-items: center;
            user-select: none;
        `;
        titleBar.textContent = 'Reference';
        
        // Create controls
        const controls = document.createElement('div');
        controls.style.cssText = 'display: flex; gap: 8px;';
        
        // Add control buttons
        const loadBtn = this.createButton('📁', 'Load Image');
        const resetBtn = this.createButton('↺', 'Reset View');
        const pinBtn = this.createButton('📌', 'Always on Top');
        const closeBtn = this.createButton('✕', 'Close');
        
        controls.appendChild(loadBtn);
        controls.appendChild(resetBtn);
        controls.appendChild(pinBtn);
        controls.appendChild(closeBtn);
        titleBar.appendChild(controls);
        
        // Create canvas container
        const canvasContainer = document.createElement('div');
        canvasContainer.style.cssText = `
            width: 100%;
            height: calc(100% - 40px);
            background: #1a1a1a;
            overflow: hidden;
            position: relative;
        `;
        
        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.settings.width;
        this.canvas.height = this.settings.height - 40;
        this.canvas.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            cursor: grab;
        `;
        this.ctx = this.canvas.getContext('2d');
        
        canvasContainer.appendChild(this.canvas);
        this.window.appendChild(titleBar);
        this.window.appendChild(canvasContainer);
        document.body.appendChild(this.window);
        
        // Setup event listeners
        this.setupEventListeners(titleBar, loadBtn, resetBtn, pinBtn, closeBtn);
    }
    
    /**
     * Create control button
     */
    createButton(text, title) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.title = title;
        btn.style.cssText = `
            background: #333;
            border: 1px solid #555;
            color: white;
            padding: 4px 8px;
            cursor: pointer;
            border-radius: 3px;
            font-size: 14px;
        `;
        btn.onmouseover = () => btn.style.background = '#444';
        btn.onmouseout = () => btn.style.background = '#333';
        return btn;
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners(titleBar, loadBtn, resetBtn, pinBtn, closeBtn) {
        // Window dragging
        let isDraggingWindow = false;
        let dragStartX = 0;
        let dragStartY = 0;
        
        titleBar.addEventListener('mousedown', (e) => {
            if (e.target === titleBar) {
                isDraggingWindow = true;
                dragStartX = e.clientX - this.settings.x;
                dragStartY = e.clientY - this.settings.y;
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDraggingWindow) {
                this.settings.x = e.clientX - dragStartX;
                this.settings.y = e.clientY - dragStartY;
                this.window.style.left = this.settings.x + 'px';
                this.window.style.top = this.settings.y + 'px';
            }
        });
        
        document.addEventListener('mouseup', () => {
            isDraggingWindow = false;
        });
        
        // Load button
        loadBtn.addEventListener('click', () => {
            this.loadImage();
        });
        
        // Reset button
        resetBtn.addEventListener('click', () => {
            this.resetView();
        });
        
        // Pin button
        pinBtn.addEventListener('click', () => {
            this.settings.alwaysOnTop = !this.settings.alwaysOnTop;
            this.window.style.zIndex = this.settings.alwaysOnTop ? '10000' : '1000';
            pinBtn.style.background = this.settings.alwaysOnTop ? '#555' : '#333';
        });
        
        // Close button
        closeBtn.addEventListener('click', () => {
            this.hide();
        });
        
        // Canvas pan and zoom
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.lastMouseX = e.offsetX;
            this.lastMouseY = e.offsetY;
            this.canvas.style.cursor = 'grabbing';
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const dx = e.offsetX - this.lastMouseX;
                const dy = e.offsetY - this.lastMouseY;
                this.panX += dx;
                this.panY += dy;
                this.lastMouseX = e.offsetX;
                this.lastMouseY = e.offsetY;
                this.render();
            }
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.canvas.style.cursor = 'grab';
        });
        
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoom *= delta;
            this.zoom = Math.max(0.1, Math.min(10, this.zoom));
            this.render();
        });
        
        // Window resize observer
        const resizeObserver = new ResizeObserver(() => {
            this.canvas.width = this.window.clientWidth;
            this.canvas.height = this.window.clientHeight - 40;
            this.render();
        });
        resizeObserver.observe(this.window);
    }
    
    /**
     * Load image from file
     */
    loadImage() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.setReferenceImage(event.target.result);
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    }
    
    /**
     * Set reference image from URL or data URL
     * @param {string} imageUrl - Image URL
     */
    setReferenceImage(imageUrl) {
        const img = new Image();
        img.onload = () => {
            this.referenceImage = img;
            this.resetView();
            this.render();
        };
        img.src = imageUrl;
    }
    
    /**
     * Set reference from canvas
     * @param {HTMLCanvasElement} canvas - Source canvas
     */
    setReferenceFromCanvas(canvas) {
        this.referenceImage = canvas;
        this.resetView();
        this.render();
    }
    
    /**
     * Capture screen area as reference
     */
    async captureScreen() {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { mediaSource: 'screen' }
            });
            
            const video = document.createElement('video');
            video.srcObject = stream;
            video.play();
            
            video.onloadedmetadata = () => {
                const captureCanvas = document.createElement('canvas');
                captureCanvas.width = video.videoWidth;
                captureCanvas.height = video.videoHeight;
                const captureCtx = captureCanvas.getContext('2d');
                captureCtx.drawImage(video, 0, 0);
                
                stream.getTracks().forEach(track => track.stop());
                
                this.setReferenceFromCanvas(captureCanvas);
            };
        } catch (error) {
            console.error('Screen capture failed:', error);
        }
    }
    
    /**
     * Reset view to fit image
     */
    resetView() {
        if (!this.referenceImage) return;
        
        const canvasAspect = this.canvas.width / this.canvas.height;
        const imageAspect = this.referenceImage.width / this.referenceImage.height;
        
        if (canvasAspect > imageAspect) {
            this.zoom = this.canvas.height / this.referenceImage.height;
        } else {
            this.zoom = this.canvas.width / this.referenceImage.width;
        }
        
        this.panX = 0;
        this.panY = 0;
        this.render();
    }
    
    /**
     * Render reference image
     */
    render() {
        if (!this.ctx) return;
        
        // Clear canvas
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (!this.referenceImage) {
            // Show placeholder
            this.ctx.fillStyle = '#666';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('Load or drop image', this.canvas.width / 2, this.canvas.height / 2);
            return;
        }
        
        // Calculate render position and size
        const imgWidth = this.referenceImage.width * this.zoom;
        const imgHeight = this.referenceImage.height * this.zoom;
        const x = (this.canvas.width - imgWidth) / 2 + this.panX;
        const y = (this.canvas.height - imgHeight) / 2 + this.panY;
        
        // Draw image
        this.ctx.drawImage(this.referenceImage, x, y, imgWidth, imgHeight);
        
        // Draw zoom indicator
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`${(this.zoom * 100).toFixed(0)}%`, 10, 20);
    }
    
    /**
     * Show reference window
     */
    show() {
        this.settings.visible = true;
        this.window.style.display = 'block';
        this.render();
    }
    
    /**
     * Hide reference window
     */
    hide() {
        this.settings.visible = false;
        this.window.style.display = 'none';
    }
    
    /**
     * Toggle reference window visibility
     */
    toggle() {
        if (this.settings.visible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    /**
     * Set window opacity
     * @param {number} opacity - Opacity (0-1)
     */
    setOpacity(opacity) {
        this.settings.opacity = Math.max(0, Math.min(1, opacity));
        this.window.style.opacity = this.settings.opacity;
    }
    
    /**
     * Destroy reference window
     */
    destroy() {
        if (this.window) {
            this.window.remove();
            this.window = null;
            this.canvas = null;
            this.ctx = null;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReferenceCanvas;
}
