/**
 * Advanced Color Wheel Module - Similar to Coolorus 2.5
 * Provides professional color-picking with gamut lock, color spaces, and palette management
 */

class AdvancedColorWheel {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.canvas = null;
        this.ctx = null;
        
        // Color state
        this.foregroundColor = { r: 0, g: 0, b: 0 };
        this.backgroundColor = { r: 255, g: 255, b: 255 };
        this.currentColorSpace = 'HSV'; // HSV, HSL, RGB, LAB, CMYK
        this.gamutLock = {
            enabled: false,
            hueMin: 0,
            hueMax: 360,
            satMin: 0,
            satMax: 100,
            valMin: 0,
            valMax: 100
        };
        
        // UI Elements
        this.wheelSize = 240;
        this.wheelCenterX = this.wheelSize / 2;
        this.wheelCenterY = this.wheelSize / 2;
        this.wheelRadius = (this.wheelSize / 2) - 20;
        
        // Palette management
        this.palettes = this.loadPalettes();
        this.currentPalette = 'default';
        this.colorHistory = [];
        this.maxHistorySize = 20;
        
        this.init();
    }
    
    init() {
        this.createUI();
        this.setupEventListeners();
        this.drawColorWheel();
        this.updateColorDisplay();
    }
    
    createUI() {
        this.container.innerHTML = `
            <div class="advanced-colorwheel-container">
                <!-- Foreground/Background Color Swatches -->
                <div class="color-swatches-section">
                    <div class="fg-bg-swatches">
                        <div class="color-swatch-large fg-swatch" id="fg-color-swatch" title="Foreground Color (Click to edit)">
                            <div class="swatch-inner" style="background: rgb(0,0,0)"></div>
                        </div>
                        <div class="color-swatch-large bg-swatch" id="bg-color-swatch" title="Background Color (Click to edit)">
                            <div class="swatch-inner" style="background: rgb(255,255,255)"></div>
                        </div>
                        <button class="swap-colors-btn" id="swap-fg-bg" title="Swap Foreground/Background (X)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"/>
                            </svg>
                        </button>
                        <button class="reset-colors-btn" id="reset-fg-bg" title="Reset to Default (D)">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <!-- Color Space Selector -->
                <div class="color-space-section">
                    <label style="font-size: 11px; font-weight: 600; color: #aaa;">Color Space:</label>
                    <div class="color-space-tabs">
                        <button class="space-tab active" data-space="HSV">HSV</button>
                        <button class="space-tab" data-space="HSL">HSL</button>
                        <button class="space-tab" data-space="RGB">RGB</button>
                        <button class="space-tab" data-space="LAB">LAB</button>
                        <button class="space-tab" data-space="CMYK">CMYK</button>
                    </div>
                </div>
                
                <!-- Advanced Color Wheel Canvas -->
                <div class="wheel-canvas-container">
                    <canvas id="advanced-color-wheel" width="${this.wheelSize}" height="${this.wheelSize}"></canvas>
                    <div class="wheel-crosshair" id="wheel-crosshair"></div>
                </div>
                
                <!-- 3-Value Real-time Adjustment Sliders -->
                <div class="value-sliders-section">
                    <div class="slider-group">
                        <label class="slider-label">
                            <span class="slider-name" id="slider1-name">Hue</span>
                            <span class="slider-value" id="slider1-value">0</span>
                        </label>
                        <div class="slider-with-gradient">
                            <canvas class="slider-gradient" id="slider1-gradient" width="220" height="12"></canvas>
                            <input type="range" class="value-slider" id="value-slider-1" min="0" max="360" value="0" step="0.1">
                        </div>
                    </div>
                    <div class="slider-group">
                        <label class="slider-label">
                            <span class="slider-name" id="slider2-name">Saturation</span>
                            <span class="slider-value" id="slider2-value">0%</span>
                        </label>
                        <div class="slider-with-gradient">
                            <canvas class="slider-gradient" id="slider2-gradient" width="220" height="12"></canvas>
                            <input type="range" class="value-slider" id="value-slider-2" min="0" max="100" value="0" step="0.1">
                        </div>
                    </div>
                    <div class="slider-group">
                        <label class="slider-label">
                            <span class="slider-name" id="slider3-name">Value</span>
                            <span class="slider-value" id="slider3-value">100%</span>
                        </label>
                        <div class="slider-with-gradient">
                            <canvas class="slider-gradient" id="slider3-gradient" width="220" height="12"></canvas>
                            <input type="range" class="value-slider" id="value-slider-3" min="0" max="100" value="100" step="0.1">
                        </div>
                    </div>
                </div>
                
                <!-- Gamut Lock Section -->
                <div class="gamut-lock-section">
                    <label class="gamut-lock-toggle">
                        <input type="checkbox" id="gamut-lock-enabled">
                        <span>Gamut Lock</span>
                    </label>
                    <div class="gamut-controls hidden" id="gamut-controls">
                        <div class="gamut-range">
                            <label>Hue: <span id="gamut-hue-range">0-360°</span></label>
                            <div class="range-inputs">
                                <input type="number" id="gamut-hue-min" min="0" max="360" value="0" step="1">
                                <span>-</span>
                                <input type="number" id="gamut-hue-max" min="0" max="360" value="360" step="1">
                            </div>
                        </div>
                        <div class="gamut-range">
                            <label>Sat: <span id="gamut-sat-range">0-100%</span></label>
                            <div class="range-inputs">
                                <input type="number" id="gamut-sat-min" min="0" max="100" value="0" step="1">
                                <span>-</span>
                                <input type="number" id="gamut-sat-max" min="0" max="100" value="100" step="1">
                            </div>
                        </div>
                        <div class="gamut-range">
                            <label>Val: <span id="gamut-val-range">0-100%</span></label>
                            <div class="range-inputs">
                                <input type="number" id="gamut-val-min" min="0" max="100" value="0" step="1">
                                <span>-</span>
                                <input type="number" id="gamut-val-max" min="0" max="100" value="100" step="1">
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Color History -->
                <div class="color-history-section">
                    <label style="font-size: 11px; font-weight: 600; color: #aaa;">Recent Colors:</label>
                    <div class="color-history-grid" id="color-history-grid"></div>
                </div>
                
                <!-- Palette Management -->
                <div class="palette-management-section">
                    <div class="palette-header">
                        <label style="font-size: 11px; font-weight: 600; color: #aaa;">Color Palettes:</label>
                        <div class="palette-actions">
                            <button class="palette-btn" id="new-palette-btn" title="New Palette">+</button>
                            <button class="palette-btn" id="save-palette-btn" title="Save Palette">💾</button>
                            <button class="palette-btn" id="load-palette-btn" title="Load Palette">📂</button>
                        </div>
                    </div>
                    <select class="palette-selector" id="palette-selector">
                        <option value="default">Default Palette</option>
                    </select>
                    <div class="palette-colors-grid" id="palette-colors-grid"></div>
                    <div class="palette-controls">
                        <button class="palette-action-btn" id="add-to-palette-btn">Add Current Color</button>
                        <button class="palette-action-btn" id="clear-palette-btn">Clear Palette</button>
                    </div>
                </div>
            </div>
        `;
        
        this.canvas = document.getElementById('advanced-color-wheel');
        this.ctx = this.canvas.getContext('2d');
    }
    
    setupEventListeners() {
        // Canvas click for color picking
        this.canvas.addEventListener('mousedown', (e) => this.handleCanvasInteraction(e));
        this.canvas.addEventListener('mousemove', (e) => {
            if (e.buttons === 1) this.handleCanvasInteraction(e);
        });
        
        // Foreground/Background swatch clicks
        document.getElementById('fg-color-swatch').addEventListener('click', () => {
            this.selectForeground();
        });
        
        document.getElementById('bg-color-swatch').addEventListener('click', () => {
            this.selectBackground();
        });
        
        // Swap and reset buttons
        document.getElementById('swap-fg-bg').addEventListener('click', () => this.swapColors());
        document.getElementById('reset-fg-bg').addEventListener('click', () => this.resetColors());
        
        // Color space tabs
        document.querySelectorAll('.space-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.space-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.currentColorSpace = e.target.dataset.space;
                this.updateSliderLabels();
                this.drawColorWheel();
                this.updateSliderGradients();
            });
        });
        
        // Value sliders
        for (let i = 1; i <= 3; i++) {
            const slider = document.getElementById(`value-slider-${i}`);
            slider.addEventListener('input', () => this.handleSliderChange());
        }
        
        // Gamut lock
        document.getElementById('gamut-lock-enabled').addEventListener('change', (e) => {
            this.gamutLock.enabled = e.target.checked;
            document.getElementById('gamut-controls').classList.toggle('hidden', !e.target.checked);
            this.drawColorWheel();
        });
        
        // Gamut controls
        ['hue-min', 'hue-max', 'sat-min', 'sat-max', 'val-min', 'val-max'].forEach(id => {
            const input = document.getElementById(`gamut-${id}`);
            if (input) {
                input.addEventListener('input', () => this.updateGamutLock());
            }
        });
        
        // Palette management
        document.getElementById('new-palette-btn').addEventListener('click', () => this.createNewPalette());
        document.getElementById('save-palette-btn').addEventListener('click', () => this.savePalette());
        document.getElementById('load-palette-btn').addEventListener('click', () => this.loadPaletteDialog());
        document.getElementById('add-to-palette-btn').addEventListener('click', () => this.addColorToPalette());
        document.getElementById('clear-palette-btn').addEventListener('click', () => this.clearPalette());
        document.getElementById('palette-selector').addEventListener('change', (e) => {
            this.currentPalette = e.target.value;
            this.displayPalette();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }
    
    handleCanvasInteraction(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const dx = x - this.wheelCenterX;
        const dy = y - this.wheelCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= this.wheelRadius) {
            // Get color from wheel
            const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
            const saturation = Math.min((distance / this.wheelRadius) * 100, 100);
            
            // Get current value from slider
            const value = parseFloat(document.getElementById('value-slider-3').value);
            
            // Apply gamut lock if enabled
            let finalHue = angle;
            let finalSat = saturation;
            
            if (this.gamutLock.enabled) {
                finalHue = Math.max(this.gamutLock.hueMin, Math.min(this.gamutLock.hueMax, angle));
                finalSat = Math.max(this.gamutLock.satMin, Math.min(this.gamutLock.satMax, saturation));
            }
            
            // Convert to RGB
            const rgb = this.hsvToRgb(finalHue, finalSat, value);
            this.setForegroundColor(rgb);
            
            // Update crosshair position
            this.updateCrosshair(x, y);
        }
    }
    
    drawColorWheel() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Get current value for brightness
        const value = parseFloat(document.getElementById('value-slider-3').value) || 100;
        
        // Draw color wheel based on current color space
        for (let angle = 0; angle < 360; angle++) {
            for (let r = 0; r < this.wheelRadius; r++) {
                const sat = (r / this.wheelRadius) * 100;
                
                // Check gamut lock
                if (this.gamutLock.enabled) {
                    if (angle < this.gamutLock.hueMin || angle > this.gamutLock.hueMax ||
                        sat < this.gamutLock.satMin || sat > this.gamutLock.satMax) {
                        continue; // Skip this pixel
                    }
                }
                
                const rgb = this.hsvToRgb(angle, sat, value);
                ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
                
                const rad = (angle * Math.PI) / 180;
                const x = this.wheelCenterX + r * Math.cos(rad);
                const y = this.wheelCenterY + r * Math.sin(rad);
                ctx.fillRect(x, y, 2, 2);
            }
        }
        
        // Draw center point
        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.arc(this.wheelCenterX, this.wheelCenterY, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw gamut lock indicators if enabled
        if (this.gamutLock.enabled) {
            this.drawGamutIndicators();
        }
    }
    
    drawGamutIndicators() {
        const ctx = this.ctx;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        
        // Draw arc for hue range
        const startAngle = (this.gamutLock.hueMin - 90) * Math.PI / 180;
        const endAngle = (this.gamutLock.hueMax - 90) * Math.PI / 180;
        
        ctx.beginPath();
        ctx.arc(this.wheelCenterX, this.wheelCenterY, this.wheelRadius + 5, startAngle, endAngle);
        ctx.stroke();
    }
    
    updateSliderLabels() {
        const labels = this.getSliderLabels();
        document.getElementById('slider1-name').textContent = labels[0];
        document.getElementById('slider2-name').textContent = labels[1];
        document.getElementById('slider3-name').textContent = labels[2];
    }
    
    getSliderLabels() {
        switch (this.currentColorSpace) {
            case 'HSV': return ['Hue', 'Saturation', 'Value'];
            case 'HSL': return ['Hue', 'Saturation', 'Lightness'];
            case 'RGB': return ['Red', 'Green', 'Blue'];
            case 'LAB': return ['Lightness', 'A (Green-Red)', 'B (Blue-Yellow)'];
            case 'CMYK': return ['Cyan', 'Magenta', 'Yellow'];
            default: return ['Hue', 'Saturation', 'Value'];
        }
    }
    
    updateSliderGradients() {
        // Update slider background gradients to show available color range
        const slider1Canvas = document.getElementById('slider1-gradient');
        const slider2Canvas = document.getElementById('slider2-gradient');
        const slider3Canvas = document.getElementById('slider3-gradient');
        
        const ctx1 = slider1Canvas.getContext('2d');
        const ctx2 = slider2Canvas.getContext('2d');
        const ctx3 = slider3Canvas.getContext('2d');
        
        // Clear canvases
        ctx1.clearRect(0, 0, slider1Canvas.width, slider1Canvas.height);
        ctx2.clearRect(0, 0, slider2Canvas.width, slider2Canvas.height);
        ctx3.clearRect(0, 0, slider3Canvas.width, slider3Canvas.height);
        
        // Get current slider values
        const v1 = parseFloat(document.getElementById('value-slider-1').value);
        const v2 = parseFloat(document.getElementById('value-slider-2').value);
        const v3 = parseFloat(document.getElementById('value-slider-3').value);
        
        // Draw gradients based on color space
        switch (this.currentColorSpace) {
            case 'HSV': {
                // Hue gradient (rainbow)
                const gradient1 = ctx1.createLinearGradient(0, 0, slider1Canvas.width, 0);
                for (let i = 0; i <= 360; i += 30) {
                    const rgb = this.hsvToRgb(i, 100, 100);
                    gradient1.addColorStop(i / 360, `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
                }
                ctx1.fillStyle = gradient1;
                ctx1.fillRect(0, 0, slider1Canvas.width, slider1Canvas.height);
                
                // Saturation gradient (gray to current color)
                const gradient2 = ctx2.createLinearGradient(0, 0, slider2Canvas.width, 0);
                for (let i = 0; i <= 100; i += 10) {
                    const rgb = this.hsvToRgb(v1, i, 100);
                    gradient2.addColorStop(i / 100, `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
                }
                ctx2.fillStyle = gradient2;
                ctx2.fillRect(0, 0, slider2Canvas.width, slider2Canvas.height);
                
                // Value gradient (black to current color)
                const gradient3 = ctx3.createLinearGradient(0, 0, slider3Canvas.width, 0);
                for (let i = 0; i <= 100; i += 10) {
                    const rgb = this.hsvToRgb(v1, v2, i);
                    gradient3.addColorStop(i / 100, `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
                }
                ctx3.fillStyle = gradient3;
                ctx3.fillRect(0, 0, slider3Canvas.width, slider3Canvas.height);
                break;
            }
            
            case 'HSL': {
                // Hue gradient (rainbow)
                const gradient1 = ctx1.createLinearGradient(0, 0, slider1Canvas.width, 0);
                for (let i = 0; i <= 360; i += 30) {
                    const rgb = this.hslToRgb(i, 100, 50);
                    gradient1.addColorStop(i / 360, `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
                }
                ctx1.fillStyle = gradient1;
                ctx1.fillRect(0, 0, slider1Canvas.width, slider1Canvas.height);
                
                // Saturation gradient
                const gradient2 = ctx2.createLinearGradient(0, 0, slider2Canvas.width, 0);
                for (let i = 0; i <= 100; i += 10) {
                    const rgb = this.hslToRgb(v1, i, v3);
                    gradient2.addColorStop(i / 100, `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
                }
                ctx2.fillStyle = gradient2;
                ctx2.fillRect(0, 0, slider2Canvas.width, slider2Canvas.height);
                
                // Lightness gradient (black to white)
                const gradient3 = ctx3.createLinearGradient(0, 0, slider3Canvas.width, 0);
                for (let i = 0; i <= 100; i += 10) {
                    const rgb = this.hslToRgb(v1, v2, i);
                    gradient3.addColorStop(i / 100, `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
                }
                ctx3.fillStyle = gradient3;
                ctx3.fillRect(0, 0, slider3Canvas.width, slider3Canvas.height);
                break;
            }
            
            case 'RGB': {
                // Red gradient
                const gradient1 = ctx1.createLinearGradient(0, 0, slider1Canvas.width, 0);
                for (let i = 0; i <= 255; i += 25) {
                    gradient1.addColorStop(i / 255, `rgb(${i}, ${v2}, ${v3})`);
                }
                ctx1.fillStyle = gradient1;
                ctx1.fillRect(0, 0, slider1Canvas.width, slider1Canvas.height);
                
                // Green gradient
                const gradient2 = ctx2.createLinearGradient(0, 0, slider2Canvas.width, 0);
                for (let i = 0; i <= 255; i += 25) {
                    gradient2.addColorStop(i / 255, `rgb(${v1}, ${i}, ${v3})`);
                }
                ctx2.fillStyle = gradient2;
                ctx2.fillRect(0, 0, slider2Canvas.width, slider2Canvas.height);
                
                // Blue gradient
                const gradient3 = ctx3.createLinearGradient(0, 0, slider3Canvas.width, 0);
                for (let i = 0; i <= 255; i += 25) {
                    gradient3.addColorStop(i / 255, `rgb(${v1}, ${v2}, ${i})`);
                }
                ctx3.fillStyle = gradient3;
                ctx3.fillRect(0, 0, slider3Canvas.width, slider3Canvas.height);
                break;
            }
            
            case 'LAB': {
                // Lightness gradient (black to white)
                const gradient1 = ctx1.createLinearGradient(0, 0, slider1Canvas.width, 0);
                for (let i = 0; i <= 100; i += 10) {
                    const rgb = this.labToRgb(i, v2, v3);
                    gradient1.addColorStop(i / 100, `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
                }
                ctx1.fillStyle = gradient1;
                ctx1.fillRect(0, 0, slider1Canvas.width, slider1Canvas.height);
                
                // A gradient (green to red)
                const gradient2 = ctx2.createLinearGradient(0, 0, slider2Canvas.width, 0);
                for (let i = -128; i <= 127; i += 25) {
                    const rgb = this.labToRgb(v1, i, v3);
                    gradient2.addColorStop((i + 128) / 255, `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
                }
                ctx2.fillStyle = gradient2;
                ctx2.fillRect(0, 0, slider2Canvas.width, slider2Canvas.height);
                
                // B gradient (blue to yellow)
                const gradient3 = ctx3.createLinearGradient(0, 0, slider3Canvas.width, 0);
                for (let i = -128; i <= 127; i += 25) {
                    const rgb = this.labToRgb(v1, v2, i);
                    gradient3.addColorStop((i + 128) / 255, `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
                }
                ctx3.fillStyle = gradient3;
                ctx3.fillRect(0, 0, slider3Canvas.width, slider3Canvas.height);
                break;
            }
            
            case 'CMYK': {
                // Cyan gradient
                const gradient1 = ctx1.createLinearGradient(0, 0, slider1Canvas.width, 0);
                for (let i = 0; i <= 100; i += 10) {
                    const rgb = this.cmykToRgb(i, v2, v3, 0);
                    gradient1.addColorStop(i / 100, `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
                }
                ctx1.fillStyle = gradient1;
                ctx1.fillRect(0, 0, slider1Canvas.width, slider1Canvas.height);
                
                // Magenta gradient
                const gradient2 = ctx2.createLinearGradient(0, 0, slider2Canvas.width, 0);
                for (let i = 0; i <= 100; i += 10) {
                    const rgb = this.cmykToRgb(v1, i, v3, 0);
                    gradient2.addColorStop(i / 100, `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
                }
                ctx2.fillStyle = gradient2;
                ctx2.fillRect(0, 0, slider2Canvas.width, slider2Canvas.height);
                
                // Yellow gradient
                const gradient3 = ctx3.createLinearGradient(0, 0, slider3Canvas.width, 0);
                for (let i = 0; i <= 100; i += 10) {
                    const rgb = this.cmykToRgb(v1, v2, i, 0);
                    gradient3.addColorStop(i / 100, `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
                }
                ctx3.fillStyle = gradient3;
                ctx3.fillRect(0, 0, slider3Canvas.width, slider3Canvas.height);
                break;
            }
        }
    }
    
    handleSliderChange() {
        const v1 = parseFloat(document.getElementById('value-slider-1').value);
        const v2 = parseFloat(document.getElementById('value-slider-2').value);
        const v3 = parseFloat(document.getElementById('value-slider-3').value);
        
        // Update value displays
        document.getElementById('slider1-value').textContent = Math.round(v1);
        document.getElementById('slider2-value').textContent = Math.round(v2) + '%';
        document.getElementById('slider3-value').textContent = Math.round(v3) + '%';
        
        // Convert to RGB and update foreground color
        const rgb = this.hsvToRgb(v1, v2, v3);
        this.setForegroundColor(rgb);
        
        // Redraw wheel with new value
        this.drawColorWheel();
        this.updateSliderGradients();
    }
    
    updateGamutLock() {
        this.gamutLock.hueMin = parseInt(document.getElementById('gamut-hue-min').value);
        this.gamutLock.hueMax = parseInt(document.getElementById('gamut-hue-max').value);
        this.gamutLock.satMin = parseInt(document.getElementById('gamut-sat-min').value);
        this.gamutLock.satMax = parseInt(document.getElementById('gamut-sat-max').value);
        this.gamutLock.valMin = parseInt(document.getElementById('gamut-val-min').value);
        this.gamutLock.valMax = parseInt(document.getElementById('gamut-val-max').value);
        
        document.getElementById('gamut-hue-range').textContent = `${this.gamutLock.hueMin}-${this.gamutLock.hueMax}°`;
        document.getElementById('gamut-sat-range').textContent = `${this.gamutLock.satMin}-${this.gamutLock.satMax}%`;
        document.getElementById('gamut-val-range').textContent = `${this.gamutLock.valMin}-${this.gamutLock.valMax}%`;
        
        this.drawColorWheel();
    }
    
    setForegroundColor(rgb) {
        this.foregroundColor = rgb;
        this.updateColorDisplay();
        this.addToHistory(rgb);
        
        // Update main app color picker if it exists
        const colorPicker = document.getElementById('color-picker');
        if (colorPicker) {
            colorPicker.value = this.rgbToHex(rgb.r, rgb.g, rgb.b);
            // Trigger change event
            const event = new Event('change', { bubbles: true });
            colorPicker.dispatchEvent(event);
        }
        
        // Update state if available
        if (window.state) {
            window.state.color = this.rgbToHex(rgb.r, rgb.g, rgb.b);
        }
    }
    
    setBackgroundColor(rgb) {
        this.backgroundColor = rgb;
        this.updateColorDisplay();
    }
    
    updateColorDisplay() {
        const fgSwatch = document.querySelector('#fg-color-swatch .swatch-inner');
        const bgSwatch = document.querySelector('#bg-color-swatch .swatch-inner');
        
        if (fgSwatch) {
            fgSwatch.style.background = `rgb(${this.foregroundColor.r}, ${this.foregroundColor.g}, ${this.foregroundColor.b})`;
        }
        
        if (bgSwatch) {
            bgSwatch.style.background = `rgb(${this.backgroundColor.r}, ${this.backgroundColor.g}, ${this.backgroundColor.b})`;
        }
        
        // Update sliders to match current color
        const hsv = this.rgbToHsv(this.foregroundColor.r, this.foregroundColor.g, this.foregroundColor.b);
        document.getElementById('value-slider-1').value = hsv.h;
        document.getElementById('value-slider-2').value = hsv.s;
        document.getElementById('value-slider-3').value = hsv.v;
        
        document.getElementById('slider1-value').textContent = Math.round(hsv.h);
        document.getElementById('slider2-value').textContent = Math.round(hsv.s) + '%';
        document.getElementById('slider3-value').textContent = Math.round(hsv.v) + '%';
        
        this.updateSliderGradients();
    }
    
    updateCrosshair(x, y) {
        const crosshair = document.getElementById('wheel-crosshair');
        if (crosshair) {
            crosshair.style.left = x + 'px';
            crosshair.style.top = y + 'px';
            crosshair.style.display = 'block';
        }
    }
    
    swapColors() {
        const temp = this.foregroundColor;
        this.foregroundColor = this.backgroundColor;
        this.backgroundColor = temp;
        this.updateColorDisplay();
        this.setForegroundColor(this.foregroundColor);
    }
    
    resetColors() {
        this.foregroundColor = { r: 0, g: 0, b: 0 };
        this.backgroundColor = { r: 255, g: 255, b: 255 };
        this.updateColorDisplay();
        this.setForegroundColor(this.foregroundColor);
    }
    
    selectForeground() {
        // Already selecting foreground by default
    }
    
    selectBackground() {
        // Switch to background selection mode
        // For now, just swap
        this.swapColors();
    }
    
    addToHistory(rgb) {
        const hex = this.rgbToHex(rgb.r, rgb.g, rgb.b);
        
        // Remove duplicates
        this.colorHistory = this.colorHistory.filter(c => c !== hex);
        
        // Add to front
        this.colorHistory.unshift(hex);
        
        // Limit size
        if (this.colorHistory.length > this.maxHistorySize) {
            this.colorHistory = this.colorHistory.slice(0, this.maxHistorySize);
        }
        
        this.displayHistory();
    }
    
    displayHistory() {
        const grid = document.getElementById('color-history-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        this.colorHistory.forEach(hex => {
            const swatch = document.createElement('div');
            swatch.className = 'history-swatch';
            swatch.style.background = hex;
            swatch.title = hex;
            swatch.addEventListener('click', () => {
                const rgb = this.hexToRgb(hex);
                this.setForegroundColor(rgb);
            });
            grid.appendChild(swatch);
        });
    }
    
    // Palette management
    loadPalettes() {
        const stored = localStorage.getItem('advancedColorWheelPalettes');
        if (stored) {
            return JSON.parse(stored);
        }
        return {
            default: []
        };
    }
    
    savePalettes() {
        localStorage.setItem('advancedColorWheelPalettes', JSON.stringify(this.palettes));
    }
    
    createNewPalette() {
        const name = prompt('Enter palette name:');
        if (name && name.trim()) {
            this.palettes[name] = [];
            this.savePalettes();
            this.updatePaletteSelector();
            this.currentPalette = name;
            document.getElementById('palette-selector').value = name;
            this.displayPalette();
        }
    }
    
    savePalette() {
        // Export palette as JSON
        const paletteData = {
            name: this.currentPalette,
            colors: this.palettes[this.currentPalette] || []
        };
        
        const dataStr = JSON.stringify(paletteData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentPalette}.palette.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    loadPaletteDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        if (data.name && data.colors) {
                            this.palettes[data.name] = data.colors;
                            this.savePalettes();
                            this.updatePaletteSelector();
                            this.currentPalette = data.name;
                            document.getElementById('palette-selector').value = data.name;
                            this.displayPalette();
                        }
                    } catch (err) {
                        alert('Failed to load palette: ' + err.message);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }
    
    updatePaletteSelector() {
        const selector = document.getElementById('palette-selector');
        if (!selector) return;
        
        selector.innerHTML = '';
        Object.keys(this.palettes).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            selector.appendChild(option);
        });
    }
    
    displayPalette() {
        const grid = document.getElementById('palette-colors-grid');
        if (!grid) return;
        
        const colors = this.palettes[this.currentPalette] || [];
        
        grid.innerHTML = '';
        colors.forEach((hex, index) => {
            const swatch = document.createElement('div');
            swatch.className = 'palette-swatch';
            swatch.style.background = hex;
            swatch.title = hex;
            swatch.addEventListener('click', () => {
                const rgb = this.hexToRgb(hex);
                this.setForegroundColor(rgb);
            });
            
            // Right-click to remove
            swatch.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                colors.splice(index, 1);
                this.savePalettes();
                this.displayPalette();
            });
            
            grid.appendChild(swatch);
        });
    }
    
    addColorToPalette() {
        if (!this.palettes[this.currentPalette]) {
            this.palettes[this.currentPalette] = [];
        }
        
        const hex = this.rgbToHex(this.foregroundColor.r, this.foregroundColor.g, this.foregroundColor.b);
        
        if (!this.palettes[this.currentPalette].includes(hex)) {
            this.palettes[this.currentPalette].push(hex);
            this.savePalettes();
            this.displayPalette();
        }
    }
    
    clearPalette() {
        if (confirm('Clear all colors from current palette?')) {
            this.palettes[this.currentPalette] = [];
            this.savePalettes();
            this.displayPalette();
        }
    }
    
    handleKeyboard(e) {
        // X - Swap colors
        if (e.key === 'x' || e.key === 'X') {
            if (!e.target.matches('input, textarea')) {
                this.swapColors();
            }
        }
        
        // D - Reset to default colors
        if (e.key === 'd' || e.key === 'D') {
            if (!e.target.matches('input, textarea')) {
                this.resetColors();
            }
        }
    }
    
    // Color conversion utilities
    hsvToRgb(h, s, v) {
        h = h % 360;
        s = Math.max(0, Math.min(100, s)) / 100;
        v = Math.max(0, Math.min(100, v)) / 100;
        
        const c = v * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = v - c;
        
        let r, g, b;
        
        if (h < 60) {
            [r, g, b] = [c, x, 0];
        } else if (h < 120) {
            [r, g, b] = [x, c, 0];
        } else if (h < 180) {
            [r, g, b] = [0, c, x];
        } else if (h < 240) {
            [r, g, b] = [0, x, c];
        } else if (h < 300) {
            [r, g, b] = [x, 0, c];
        } else {
            [r, g, b] = [c, 0, x];
        }
        
        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    }
    
    rgbToHsv(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        
        let h = 0;
        const s = max === 0 ? 0 : (delta / max) * 100;
        const v = max * 100;
        
        if (delta !== 0) {
            if (max === r) {
                h = 60 * (((g - b) / delta) % 6);
            } else if (max === g) {
                h = 60 * ((b - r) / delta + 2);
            } else {
                h = 60 * ((r - g) / delta + 4);
            }
        }
        
        if (h < 0) h += 360;
        
        return { h, s, v };
    }
    
    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = Math.round(x).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }
    
    // HSL to RGB conversion
    hslToRgb(h, s, l) {
        h = h % 360;
        s = Math.max(0, Math.min(100, s)) / 100;
        l = Math.max(0, Math.min(100, l)) / 100;
        
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = l - c / 2;
        
        let r, g, b;
        
        if (h < 60) {
            [r, g, b] = [c, x, 0];
        } else if (h < 120) {
            [r, g, b] = [x, c, 0];
        } else if (h < 180) {
            [r, g, b] = [0, c, x];
        } else if (h < 240) {
            [r, g, b] = [0, x, c];
        } else if (h < 300) {
            [r, g, b] = [x, 0, c];
        } else {
            [r, g, b] = [c, 0, x];
        }
        
        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    }
    
    // LAB to RGB conversion (simplified)
    labToRgb(l, a, b) {
        // Clamp LAB values
        l = Math.max(0, Math.min(100, l));
        a = Math.max(-128, Math.min(127, a));
        b = Math.max(-128, Math.min(127, b));
        
        // LAB to XYZ
        let y = (l + 16) / 116;
        let x = a / 500 + y;
        let z = y - b / 200;
        
        const fx = x > 0.206897 ? x * x * x : (x - 16 / 116) / 7.787;
        const fy = y > 0.206897 ? y * y * y : (y - 16 / 116) / 7.787;
        const fz = z > 0.206897 ? z * z * z : (z - 16 / 116) / 7.787;
        
        x = fx * 95.047;
        y = fy * 100.000;
        z = fz * 108.883;
        
        // XYZ to RGB
        x /= 100;
        y /= 100;
        z /= 100;
        
        let r = x *  3.2406 + y * -1.5372 + z * -0.4986;
        let g = x * -0.9689 + y *  1.8758 + z *  0.0415;
        let bl = x *  0.0557 + y * -0.2040 + z *  1.0570;
        
        r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
        g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
        bl = bl > 0.0031308 ? 1.055 * Math.pow(bl, 1 / 2.4) - 0.055 : 12.92 * bl;
        
        return {
            r: Math.max(0, Math.min(255, Math.round(r * 255))),
            g: Math.max(0, Math.min(255, Math.round(g * 255))),
            b: Math.max(0, Math.min(255, Math.round(bl * 255)))
        };
    }
    
    // CMYK to RGB conversion
    cmykToRgb(c, m, y, k) {
        c = Math.max(0, Math.min(100, c)) / 100;
        m = Math.max(0, Math.min(100, m)) / 100;
        y = Math.max(0, Math.min(100, y)) / 100;
        k = Math.max(0, Math.min(100, k)) / 100;
        
        const r = 255 * (1 - c) * (1 - k);
        const g = 255 * (1 - m) * (1 - k);
        const b = 255 * (1 - y) * (1 - k);
        
        return {
            r: Math.round(r),
            g: Math.round(g),
            b: Math.round(b)
        };
    }
}

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
    window.AdvancedColorWheel = AdvancedColorWheel;
}
