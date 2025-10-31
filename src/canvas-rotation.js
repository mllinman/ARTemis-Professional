/**
 * Canvas Rotation Module
 * Provides smooth canvas rotation and workspace transformation
 */

class CanvasRotation {
    constructor(canvas, container) {
        this.canvas = canvas;
        this.container = container || canvas.parentElement;
        
        this.rotation = 0; // Current rotation in degrees
        this.scale = 1.0;  // Current zoom scale
        this.offsetX = 0;  // Pan offset X
        this.offsetY = 0;  // Pan offset Y
        
        this.animating = false;
        this.animationDuration = 300; // ms
        
        // Rotation history for undo
        this.history = [];
        this.maxHistory = 20;
        
        // Initialize transform
        this.updateTransform();
    }
    
    /**
     * Rotate canvas by angle
     * @param {number} angle - Angle in degrees
     * @param {boolean} animate - Use smooth animation
     */
    rotate(angle, animate = true) {
        const targetRotation = (this.rotation + angle) % 360;
        
        if (animate) {
            this.animateRotation(this.rotation, targetRotation);
        } else {
            this.rotation = targetRotation;
            this.updateTransform();
        }
        
        // Add to history
        this.addToHistory();
    }
    
    /**
     * Set absolute rotation
     * @param {number} angle - Angle in degrees
     * @param {boolean} animate - Use smooth animation
     */
    setRotation(angle, animate = true) {
        const targetRotation = angle % 360;
        
        if (animate) {
            this.animateRotation(this.rotation, targetRotation);
        } else {
            this.rotation = targetRotation;
            this.updateTransform();
        }
        
        this.addToHistory();
    }
    
    /**
     * Rotate to nearest 90 degree angle
     * @param {boolean} clockwise - Direction of rotation
     */
    snapTo90(clockwise = true) {
        const current = this.rotation;
        const remainder = current % 90;
        
        let target;
        if (remainder === 0) {
            target = current + (clockwise ? 90 : -90);
        } else {
            if (clockwise) {
                target = current + (90 - remainder);
            } else {
                target = current - remainder;
            }
        }
        
        this.setRotation(target, true);
    }
    
    /**
     * Reset rotation to 0 degrees
     * @param {boolean} animate - Use smooth animation
     */
    resetRotation(animate = true) {
        this.setRotation(0, animate);
    }
    
    /**
     * Animate rotation
     * @param {number} from - Start angle
     * @param {number} to - End angle
     */
    animateRotation(from, to) {
        if (this.animating) return;
        
        this.animating = true;
        const startTime = Date.now();
        const duration = this.animationDuration;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-in-out)
            const eased = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            // Calculate current rotation
            this.rotation = from + (to - from) * eased;
            this.updateTransform();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.rotation = to;
                this.animating = false;
                this.updateTransform();
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    /**
     * Update canvas transform
     */
    updateTransform() {
        const transform = `
            translate(${this.offsetX}px, ${this.offsetY}px)
            rotate(${this.rotation}deg)
            scale(${this.scale})
        `;
        
        this.canvas.style.transform = transform;
        this.canvas.style.transformOrigin = 'center center';
        
        // Emit custom event
        this.canvas.dispatchEvent(new CustomEvent('rotationchange', {
            detail: {
                rotation: this.rotation,
                scale: this.scale,
                offsetX: this.offsetX,
                offsetY: this.offsetY
            }
        }));
    }
    
    /**
     * Set zoom scale
     * @param {number} scale - Zoom scale (1.0 = 100%)
     */
    setScale(scale) {
        this.scale = Math.max(0.1, Math.min(10, scale));
        this.updateTransform();
    }
    
    /**
     * Set pan offset
     * @param {number} x - X offset
     * @param {number} y - Y offset
     */
    setPanOffset(x, y) {
        this.offsetX = x;
        this.offsetY = y;
        this.updateTransform();
    }
    
    /**
     * Transform point from screen space to canvas space
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @returns {Object} Canvas coordinates {x, y}
     */
    screenToCanvas(screenX, screenY) {
        const rect = this.canvas.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Translate to origin
        let x = screenX - centerX;
        let y = screenY - centerY;
        
        // Undo scale
        x /= this.scale;
        y /= this.scale;
        
        // Undo rotation
        const rad = -this.rotation * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const rotatedX = x * cos - y * sin;
        const rotatedY = x * sin + y * cos;
        
        // Translate back and add canvas offset
        return {
            x: rotatedX + this.canvas.width / 2,
            y: rotatedY + this.canvas.height / 2
        };
    }
    
    /**
     * Transform point from canvas space to screen space
     * @param {number} canvasX - Canvas X coordinate
     * @param {number} canvasY - Canvas Y coordinate
     * @returns {Object} Screen coordinates {x, y}
     */
    canvasToScreen(canvasX, canvasY) {
        const rect = this.canvas.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Translate to origin
        let x = canvasX - this.canvas.width / 2;
        let y = canvasY - this.canvas.height / 2;
        
        // Apply rotation
        const rad = this.rotation * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const rotatedX = x * cos - y * sin;
        const rotatedY = x * sin + y * cos;
        
        // Apply scale
        const scaledX = rotatedX * this.scale;
        const scaledY = rotatedY * this.scale;
        
        // Translate to screen position
        return {
            x: centerX + scaledX,
            y: centerY + scaledY
        };
    }
    
    /**
     * Enable touch gestures for rotation
     */
    enableTouchGestures() {
        let lastTouchDistance = 0;
        let lastTouchAngle = 0;
        let rotating = false;
        
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                
                lastTouchDistance = this.getTouchDistance(touch1, touch2);
                lastTouchAngle = this.getTouchAngle(touch1, touch2);
                rotating = true;
                
                e.preventDefault();
            }
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            if (rotating && e.touches.length === 2) {
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                
                const distance = this.getTouchDistance(touch1, touch2);
                const angle = this.getTouchAngle(touch1, touch2);
                
                // Pinch zoom
                const scaleChange = distance / lastTouchDistance;
                this.setScale(this.scale * scaleChange);
                
                // Rotation
                const angleDelta = angle - lastTouchAngle;
                this.rotate(angleDelta * 180 / Math.PI, false);
                
                lastTouchDistance = distance;
                lastTouchAngle = angle;
                
                e.preventDefault();
            }
        });
        
        this.canvas.addEventListener('touchend', () => {
            rotating = false;
        });
    }
    
    /**
     * Get distance between two touch points
     */
    getTouchDistance(touch1, touch2) {
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Get angle between two touch points
     */
    getTouchAngle(touch1, touch2) {
        return Math.atan2(
            touch2.clientY - touch1.clientY,
            touch2.clientX - touch1.clientX
        );
    }
    
    /**
     * Add current state to history
     */
    addToHistory() {
        this.history.push({
            rotation: this.rotation,
            scale: this.scale,
            offsetX: this.offsetX,
            offsetY: this.offsetY
        });
        
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }
    
    /**
     * Undo last rotation
     */
    undo() {
        if (this.history.length > 1) {
            this.history.pop(); // Remove current
            const previous = this.history[this.history.length - 1];
            
            this.rotation = previous.rotation;
            this.scale = previous.scale;
            this.offsetX = previous.offsetX;
            this.offsetY = previous.offsetY;
            
            this.updateTransform();
        }
    }
    
    /**
     * Get current rotation info
     * @returns {Object} Rotation information
     */
    getRotationInfo() {
        return {
            rotation: this.rotation,
            rotationRadians: this.rotation * Math.PI / 180,
            scale: this.scale,
            offsetX: this.offsetX,
            offsetY: this.offsetY,
            isAnimating: this.animating
        };
    }
    
    /**
     * Save rotation state
     * @returns {string} JSON state
     */
    saveState() {
        return JSON.stringify({
            rotation: this.rotation,
            scale: this.scale,
            offsetX: this.offsetX,
            offsetY: this.offsetY
        });
    }
    
    /**
     * Load rotation state
     * @param {string} json - JSON state
     */
    loadState(json) {
        const state = JSON.parse(json);
        this.rotation = state.rotation || 0;
        this.scale = state.scale || 1.0;
        this.offsetX = state.offsetX || 0;
        this.offsetY = state.offsetY || 0;
        this.updateTransform();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CanvasRotation;
}
