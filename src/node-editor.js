// Node-Based Brush System for ARTemis
// Similar to NukeX/Nuke Studio node editing

class NodeEditor {
    constructor() {
        this.nodes = [];
        this.connections = [];
        this.selectedNode = null;
        this.selectedNodes = new Set(); // Multi-selection support
        this.nextNodeId = 1;
        
        // Canvas state
        this.canvas = {
            offsetX: 0,
            offsetY: 0,
            zoom: 1,
            isPanning: false,
            panStartX: 0,
            panStartY: 0
        };
        
        // Connection state
        this.connecting = false;
        this.connectionStart = null;
        this.tempConnectionEnd = null;
        this.hoveredConnection = null;
        
        // Dragging state
        this.draggingNode = null;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        
        // Selection box state
        this.isBoxSelecting = false;
        this.boxSelectStart = null;
        this.boxSelectElement = null;
        
        // Undo/Redo stacks
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoSteps = 50;
        
        // Favorites
        this.favoriteNodes = new Set(['pressure-input', 'size', 'opacity', 'color-input']);
        
        this.initializeUI();
        this.bindEvents();
    }
    
    initializeUI() {
        // Create the node editor window
        const editorWindow = document.createElement('div');
        editorWindow.id = 'node-editor-window';
        editorWindow.innerHTML = `
            <div class="node-editor-header">
                <h3>Node-Based Brush Editor <span class="node-stats" id="node-stats">v2.0 | 0 nodes</span></h3>
                <div class="node-editor-controls">
                    <div class="zoom-controls">
                        <button class="node-editor-btn" id="node-zoom-out" title="Zoom Out (-)">−</button>
                        <span class="zoom-level" id="node-zoom-level">100%</span>
                        <button class="node-editor-btn" id="node-zoom-in" title="Zoom In (+)">+</button>
                        <button class="node-editor-btn" id="node-zoom-reset" title="Reset Zoom (0)">⊙</button>
                    </div>
                    <button class="node-editor-btn" id="node-auto-arrange" title="Auto-Arrange Nodes">🔄 Auto-Arrange</button>
                    <button class="node-editor-btn" id="node-undo" title="Undo (Ctrl+Z)" disabled>↶ Undo</button>
                    <button class="node-editor-btn" id="node-redo" title="Redo (Ctrl+Y)" disabled>↷ Redo</button>
                    <button class="node-editor-btn" id="node-export-graph" title="Export Node Graph">💾 Export</button>
                    <button class="node-editor-btn" id="node-import-graph" title="Import Node Graph">📁 Import</button>
                    <button class="node-editor-btn" id="node-clear-all">🗑️ Clear</button>
                    <button class="node-editor-btn primary" id="node-save-brush">💾 Save Brush</button>
                    <button class="node-editor-btn" id="node-help" title="Show Keyboard Shortcuts">❓</button>
                    <button class="node-editor-btn node-editor-close" id="node-editor-close">✕</button>
                </div>
            </div>
            <div class="node-editor-body">
                <div class="node-palette">
                    <div class="node-search-container">
                        <input type="text" id="node-search" placeholder="🔍 Search nodes..." class="node-search-input">
                        <div class="node-quick-filters">
                            <button class="filter-btn active" data-filter="all">All</button>
                            <button class="filter-btn" data-filter="favorites">⭐ Favorites</button>
                            <button class="filter-btn" data-filter="recent">🕐 Recent</button>
                        </div>
                    </div>
                    <div class="node-category">
                        <h4>Templates</h4>
                        <button class="node-type-btn template-btn" data-template="pressure-sensitive">
                            <span class="node-type-icon" style="background: #51cf66;"></span>
                            Pressure Sensitive
                        </button>
                        <button class="node-type-btn template-btn" data-template="scattered-airbrush">
                            <span class="node-type-icon" style="background: #51cf66;"></span>
                            Scattered Airbrush
                        </button>
                        <button class="node-type-btn template-btn" data-template="textured-brush">
                            <span class="node-type-icon" style="background: #51cf66;"></span>
                            Textured Brush
                        </button>
                        <button class="node-type-btn template-btn" data-template="color-dynamic">
                            <span class="node-type-icon" style="background: #51cf66;"></span>
                            Color Dynamic
                        </button>
                        <button class="node-type-btn template-btn" data-template="watercolor">
                            <span class="node-type-icon" style="background: #51cf66;"></span>
                            Watercolor
                        </button>
                        <button class="node-type-btn template-btn" data-template="oil-paint">
                            <span class="node-type-icon" style="background: #51cf66;"></span>
                            Oil Paint
                        </button>
                        <button class="node-type-btn template-btn" data-template="ink-pen">
                            <span class="node-type-icon" style="background: #51cf66;"></span>
                            Ink Pen
                        </button>
                        <button class="node-type-btn template-btn" data-template="spray-paint">
                            <span class="node-type-icon" style="background: #51cf66;"></span>
                            Spray Paint
                        </button>
                        <button class="node-type-btn template-btn" data-template="charcoal">
                            <span class="node-type-icon" style="background: #51cf66;"></span>
                            Charcoal
                        </button>
                        <button class="node-type-btn template-btn" data-template="particle-spray">
                            <span class="node-type-icon" style="background: #51cf66;"></span>
                            Particle Spray
                        </button>
                    </div>
                    <div class="node-category">
                        <h4>Input Nodes</h4>
                        <button class="node-type-btn" data-node-type="color-input">
                            <span class="node-type-icon" style="background: #ff6b6b;"></span>
                            Color Input
                        </button>
                        <button class="node-type-btn" data-node-type="value-input">
                            <span class="node-type-icon" style="background: #4dabf7;"></span>
                            Value Input
                        </button>
                        <button class="node-type-btn" data-node-type="texture-input">
                            <span class="node-type-icon" style="background: #ae3ec9;"></span>
                            Texture Input
                        </button>
                        <button class="node-type-btn" data-node-type="pressure-input" title="Simulate or read tablet pressure (0-100)">
                            <span class="node-type-icon" style="background: #4dabf7;"></span>
                            Pressure Input
                        </button>
                        <button class="node-type-btn" data-node-type="velocity-input" title="React to stroke speed/velocity">
                            <span class="node-type-icon" style="background: #4dabf7;"></span>
                            Velocity Input
                        </button>
                        <button class="node-type-btn" data-node-type="tilt-input" title="Read pen tilt X and Y">
                            <span class="node-type-icon" style="background: #4dabf7;"></span>
                            Tilt Input
                        </button>
                        <button class="node-type-btn" data-node-type="rotation-input" title="Read pen barrel rotation">
                            <span class="node-type-icon" style="background: #4dabf7;"></span>
                            Rotation Input
                        </button>
                        <button class="node-type-btn" data-node-type="random-input" title="Generate random values with min/max">
                            <span class="node-type-icon" style="background: #4dabf7;"></span>
                            Random Input
                        </button>
                        <button class="node-type-btn" data-node-type="time-input" title="Time-based values for animation">
                            <span class="node-type-icon" style="background: #4dabf7;"></span>
                            Time Input
                        </button>
                        <button class="node-type-btn" data-node-type="gradient-input" title="Generate gradient colors">
                            <span class="node-type-icon" style="background: #ff6b6b;"></span>
                            Gradient Input
                        </button>
                        <button class="node-type-btn" data-node-type="image-input" title="Load external images as textures">
                            <span class="node-type-icon" style="background: #ae3ec9;"></span>
                            Image Input
                        </button>
                        <button class="node-type-btn" data-node-type="noise-input" title="Generate Perlin/Simplex noise">
                            <span class="node-type-icon" style="background: #4dabf7;"></span>
                            Noise Input
                        </button>
                    </div>
                    <div class="node-category">
                        <h4>Brush Properties</h4>
                        <button class="node-type-btn" data-node-type="size">
                            <span class="node-type-icon" style="background: #51cf66;"></span>
                            Size
                        </button>
                        <button class="node-type-btn" data-node-type="opacity">
                            <span class="node-type-icon" style="background: #51cf66;"></span>
                            Opacity
                        </button>
                        <button class="node-type-btn" data-node-type="hardness">
                            <span class="node-type-icon" style="background: #51cf66;"></span>
                            Hardness
                        </button>
                        <button class="node-type-btn" data-node-type="flow">
                            <span class="node-type-icon" style="background: #51cf66;"></span>
                            Flow
                        </button>
                    </div>
                    <div class="node-category">
                        <h4>Effects</h4>
                        <button class="node-type-btn" data-node-type="scatter">
                            <span class="node-type-icon" style="background: #ffd43b;"></span>
                            Scatter
                        </button>
                        <button class="node-type-btn" data-node-type="rotation">
                            <span class="node-type-icon" style="background: #ffd43b;"></span>
                            Rotation
                        </button>
                        <button class="node-type-btn" data-node-type="dynamics">
                            <span class="node-type-icon" style="background: #ffd43b;"></span>
                            Dynamics
                        </button>
                        <button class="node-type-btn" data-node-type="jitter">
                            <span class="node-type-icon" style="background: #ffd43b;"></span>
                            Jitter
                        </button>
                        <button class="node-type-btn" data-node-type="spacing">
                            <span class="node-type-icon" style="background: #ffd43b;"></span>
                            Spacing
                        </button>
                        <button class="node-type-btn" data-node-type="blending-mode">
                            <span class="node-type-icon" style="background: #ffd43b;"></span>
                            Blending Mode
                        </button>
                        <button class="node-type-btn" data-node-type="texture-blend">
                            <span class="node-type-icon" style="background: #ffd43b;"></span>
                            Texture Blend
                        </button>
                        <button class="node-type-btn" data-node-type="color-variation">
                            <span class="node-type-icon" style="background: #ffd43b;"></span>
                            Color Variation
                        </button>
                        <button class="node-type-btn" data-node-type="scale">
                            <span class="node-type-icon" style="background: #ffd43b;"></span>
                            Scale (X/Y)
                        </button>
                        <button class="node-type-btn" data-node-type="position-offset">
                            <span class="node-type-icon" style="background: #ffd43b;"></span>
                            Position Offset
                        </button>
                        <button class="node-type-btn" data-node-type="wet-mix">
                            <span class="node-type-icon" style="background: #ffd43b;"></span>
                            Wet Mix
                        </button>
                        <button class="node-type-btn" data-node-type="shape">
                            <span class="node-type-icon" style="background: #ffd43b;"></span>
                            Shape
                        </button>
                        <button class="node-type-btn" data-node-type="fade">
                            <span class="node-type-icon" style="background: #ffd43b;"></span>
                            Fade
                        </button>
                        <button class="node-type-btn" data-node-type="direction">
                            <span class="node-type-icon" style="background: #ffd43b;"></span>
                            Direction
                        </button>
                    </div>
                    <div class="node-category">
                        <h4>Painting Effects</h4>
                        <button class="node-type-btn" data-node-type="smudge" title="Smudge and blend paint">
                            <span class="node-type-icon" style="background: #ff6b9d;"></span>
                            Smudge
                        </button>
                        <button class="node-type-btn" data-node-type="blend-mode" title="Advanced blending between strokes">
                            <span class="node-type-icon" style="background: #ff6b9d;"></span>
                            Blend Mode
                        </button>
                        <button class="node-type-btn" data-node-type="bristle" title="Bristle brush simulation">
                            <span class="node-type-icon" style="background: #ff6b9d;"></span>
                            Bristle
                        </button>
                        <button class="node-type-btn" data-node-type="canvas-texture" title="Canvas surface texture">
                            <span class="node-type-icon" style="background: #ff6b9d;"></span>
                            Canvas Texture
                        </button>
                        <button class="node-type-btn" data-node-type="paint-buildup" title="Paint accumulation effect">
                            <span class="node-type-icon" style="background: #ff6b9d;"></span>
                            Paint Buildup
                        </button>
                        <button class="node-type-btn" data-node-type="drip" title="Paint dripping effect">
                            <span class="node-type-icon" style="background: #ff6b9d;"></span>
                            Drip
                        </button>
                        <button class="node-type-btn" data-node-type="splatter" title="Paint splatter effect">
                            <span class="node-type-icon" style="background: #ff6b9d;"></span>
                            Splatter
                        </button>
                        <button class="node-type-btn" data-node-type="watercolor-edge" title="Watercolor edge darkening">
                            <span class="node-type-icon" style="background: #ff6b9d;"></span>
                            Watercolor Edge
                        </button>
                        <button class="node-type-btn" data-node-type="impasto" title="Thick paint texture effect">
                            <span class="node-type-icon" style="background: #ff6b9d;"></span>
                            Impasto
                        </button>
                        <button class="node-type-btn" data-node-type="glazing" title="Transparent glaze layers">
                            <span class="node-type-icon" style="background: #ff6b9d;"></span>
                            Glazing
                        </button>
                    </div>
                    <div class="node-category">
                        <h4>Advanced Effects</h4>
                        <button class="node-type-btn" data-node-type="stroke-taper" title="Taper stroke ends">
                            <span class="node-type-icon" style="background: #845ef7;"></span>
                            Stroke Taper
                        </button>
                        <button class="node-type-btn" data-node-type="dual-brush" title="Mix two brush textures">
                            <span class="node-type-icon" style="background: #845ef7;"></span>
                            Dual Brush
                        </button>
                        <button class="node-type-btn" data-node-type="texture-mode" title="Advanced texture blending">
                            <span class="node-type-icon" style="background: #845ef7;"></span>
                            Texture Mode
                        </button>
                        <button class="node-type-btn" data-node-type="transfer-mode" title="Color transfer modes">
                            <span class="node-type-icon" style="background: #845ef7;"></span>
                            Transfer Mode
                        </button>
                        <button class="node-type-btn" data-node-type="accumulation" title="Paint accumulation">
                            <span class="node-type-icon" style="background: #845ef7;"></span>
                            Accumulation
                        </button>
                        <button class="node-type-btn" data-node-type="airflow" title="Airbrush flow patterns">
                            <span class="node-type-icon" style="background: #845ef7;"></span>
                            Airflow
                        </button>
                        <button class="node-type-btn" data-node-type="stamp-spacing" title="Stamp spacing patterns">
                            <span class="node-type-icon" style="background: #845ef7;"></span>
                            Stamp Spacing
                        </button>
                        <button class="node-type-btn" data-node-type="edge-softness" title="Variable edge softness">
                            <span class="node-type-icon" style="background: #845ef7;"></span>
                            Edge Softness
                        </button>
                        <button class="node-type-btn" data-node-type="bristle-split" title="Bristle splitting effect">
                            <span class="node-type-icon" style="background: #845ef7;"></span>
                            Bristle Split
                        </button>
                        <button class="node-type-btn" data-node-type="wetness" title="Wet paint behavior">
                            <span class="node-type-icon" style="background: #845ef7;"></span>
                            Wetness
                        </button>
                    </div>
                    <div class="node-category">
                        <h4>Particle Effects</h4>
                        <button class="node-type-btn" data-node-type="particle-emitter" title="Emit particles">
                            <span class="node-type-icon" style="background: #f783ac;"></span>
                            Particle Emitter
                        </button>
                        <button class="node-type-btn" data-node-type="particle-velocity" title="Control particle velocity">
                            <span class="node-type-icon" style="background: #f783ac;"></span>
                            Particle Velocity
                        </button>
                        <button class="node-type-btn" data-node-type="particle-lifetime" title="Particle lifetime">
                            <span class="node-type-icon" style="background: #f783ac;"></span>
                            Particle Lifetime
                        </button>
                        <button class="node-type-btn" data-node-type="particle-gravity" title="Apply gravity to particles">
                            <span class="node-type-icon" style="background: #f783ac;"></span>
                            Particle Gravity
                        </button>
                        <button class="node-type-btn" data-node-type="particle-turbulence" title="Add turbulence">
                            <span class="node-type-icon" style="background: #f783ac;"></span>
                            Particle Turbulence
                        </button>
                    </div>
                    <div class="node-category">
                        <h4>Color Nodes</h4>
                        <button class="node-type-btn" data-node-type="hsv-adjust">
                            <span class="node-type-icon" style="background: #ff6b6b;"></span>
                            HSV Adjust
                        </button>
                        <button class="node-type-btn" data-node-type="color-mix">
                            <span class="node-type-icon" style="background: #ff6b6b;"></span>
                            Color Mix
                        </button>
                        <button class="node-type-btn" data-node-type="color-ramp">
                            <span class="node-type-icon" style="background: #ff6b6b;"></span>
                            Color Ramp
                        </button>
                    </div>
                    <div class="node-category">
                        <h4>Curve Nodes</h4>
                        <button class="node-type-btn" data-node-type="curve">
                            <span class="node-type-icon" style="background: #51cf66;"></span>
                            Curve Editor
                        </button>
                    </div>
                    <div class="node-category">
                        <h4>Math Nodes</h4>
                        <button class="node-type-btn" data-node-type="multiply">
                            <span class="node-type-icon" style="background: #748ffc;"></span>
                            Multiply
                        </button>
                        <button class="node-type-btn" data-node-type="add">
                            <span class="node-type-icon" style="background: #748ffc;"></span>
                            Add
                        </button>
                        <button class="node-type-btn" data-node-type="subtract">
                            <span class="node-type-icon" style="background: #748ffc;"></span>
                            Subtract
                        </button>
                        <button class="node-type-btn" data-node-type="divide">
                            <span class="node-type-icon" style="background: #748ffc;"></span>
                            Divide
                        </button>
                        <button class="node-type-btn" data-node-type="power">
                            <span class="node-type-icon" style="background: #748ffc;"></span>
                            Power
                        </button>
                        <button class="node-type-btn" data-node-type="min">
                            <span class="node-type-icon" style="background: #748ffc;"></span>
                            Min
                        </button>
                        <button class="node-type-btn" data-node-type="max">
                            <span class="node-type-icon" style="background: #748ffc;"></span>
                            Max
                        </button>
                        <button class="node-type-btn" data-node-type="abs">
                            <span class="node-type-icon" style="background: #748ffc;"></span>
                            Absolute
                        </button>
                        <button class="node-type-btn" data-node-type="sine">
                            <span class="node-type-icon" style="background: #748ffc;"></span>
                            Sine
                        </button>
                        <button class="node-type-btn" data-node-type="cosine">
                            <span class="node-type-icon" style="background: #748ffc;"></span>
                            Cosine
                        </button>
                        <button class="node-type-btn" data-node-type="remap">
                            <span class="node-type-icon" style="background: #748ffc;"></span>
                            Remap Range
                        </button>
                        <button class="node-type-btn" data-node-type="smoothstep">
                            <span class="node-type-icon" style="background: #748ffc;"></span>
                            Smooth Step
                        </button>
                        <button class="node-type-btn" data-node-type="mix">
                            <span class="node-type-icon" style="background: #748ffc;"></span>
                            Mix/Lerp
                        </button>
                        <button class="node-type-btn" data-node-type="modulo">
                            <span class="node-type-icon" style="background: #748ffc;"></span>
                            Modulo
                        </button>
                        <button class="node-type-btn" data-node-type="clamp">
                            <span class="node-type-icon" style="background: #748ffc;"></span>
                            Clamp
                        </button>
                    </div>
                    <div class="node-category">
                        <h4>Output</h4>
                        <button class="node-type-btn" data-node-type="brush-output">
                            <span class="node-type-icon" style="background: #ff8787;"></span>
                            Brush Output
                        </button>
                    </div>
                </div>
                <div class="node-canvas-container" id="node-canvas-container">
                    <svg id="node-connections-svg" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">
                    </svg>
                    <div class="node-canvas" id="node-canvas">
                    </div>
                    <div class="node-minimap" id="node-minimap">
                        <div class="minimap-viewport" id="minimap-viewport"></div>
                        <canvas id="minimap-canvas" width="200" height="150"></canvas>
                    </div>
                    <div class="selection-box" id="selection-box" style="display: none;"></div>
                </div>
                <div class="node-properties-panel">
                    <h4>Brush Preview</h4>
                    <div class="node-info">
                        <p><strong>Node Editor v3.0</strong> - 50+ Nodes Available</p>
                        <p style="font-size: 11px; margin-top: 8px;">
                            • Connect nodes to create brushes<br>
                            • Drag & drop from palette<br>
                            • Box select with Shift+Drag<br>
                            • Right-click for context menu<br>
                            • Ctrl+Z/Y for undo/redo<br>
                            • Use minimap to navigate
                        </p>
                    </div>
                    <div class="brush-preview-container">
                        <div class="preview-controls">
                            <button class="preview-btn" id="preview-clear" title="Clear Preview">🗑️</button>
                            <button class="preview-btn" id="preview-test" title="Test Multiple Strokes">🎨</button>
                            <select id="preview-mode" class="preview-select">
                                <option value="stroke">Stroke</option>
                                <option value="dots">Dots</option>
                                <option value="spiral">Spiral</option>
                            </select>
                        </div>
                        <canvas id="node-brush-preview" class="brush-preview-canvas"></canvas>
                        <div class="brush-stats" id="brush-stats">
                            Size: 20px | Opacity: 100% | Flow: 100%
                        </div>
                    </div>
                    <div class="save-brush-container">
                        <label class="property-label">Brush Name</label>
                        <input type="text" id="node-brush-name" placeholder="My Custom Brush" value="Custom Brush">
                        <label class="property-label">Save Location</label>
                        <select id="node-brush-save-location">
                            <option value="custom">Custom Brushes</option>
                            <option value="favorites">Favorites</option>
                            <option value="project">Current Project</option>
                        </select>
                        <div class="save-actions">
                            <button class="node-editor-btn primary full-width" id="node-save-brush-main">💾 Save Brush</button>
                            <button class="node-editor-btn full-width" id="node-apply-brush">✓ Apply to Current</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(editorWindow);
        this.window = editorWindow;
        this.nodeCanvas = document.getElementById('node-canvas');
        this.connectionsSvg = document.getElementById('node-connections-svg');
        this.previewCanvas = document.getElementById('node-brush-preview');
        this.previewCtx = this.previewCanvas.getContext('2d');
        
        // Initialize preview canvas
        this.initPreviewCanvas();
        
        // Create default setup: one output node
        this.createDefaultSetup();
    }
    
    initPreviewCanvas() {
        const rect = this.previewCanvas.getBoundingClientRect();
        this.previewCanvas.width = rect.width * window.devicePixelRatio;
        this.previewCanvas.height = rect.height * window.devicePixelRatio;
        this.previewCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        // Draw initial preview
        this.updateBrushPreview();
    }
    
    createDefaultSetup() {
        // Create a Brush Output node in the center-right
        const outputNode = this.createNode('brush-output', 600, 200);
    }
    
    bindEvents() {
        // Close button
        document.getElementById('node-editor-close').addEventListener('click', () => {
            this.hide();
        });
        
        // Clear all button
        document.getElementById('node-clear-all').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all nodes?')) {
                this.clearAll();
            }
        });
        
        // Save brush button
        document.getElementById('node-save-brush').addEventListener('click', () => {
            this.saveBrush();
        });
        
        // Zoom controls
        document.getElementById('node-zoom-in').addEventListener('click', () => {
            this.zoomIn();
        });
        
        document.getElementById('node-zoom-out').addEventListener('click', () => {
            this.zoomOut();
        });
        
        document.getElementById('node-zoom-reset').addEventListener('click', () => {
            this.resetZoom();
        });
        
        // Export/Import
        document.getElementById('node-export-graph').addEventListener('click', () => {
            this.exportGraph();
        });
        
        document.getElementById('node-import-graph').addEventListener('click', () => {
            this.importGraph();
        });
        
        // Template buttons
        const templateButtons = document.querySelectorAll('.template-btn');
        templateButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const template = e.currentTarget.getAttribute('data-template');
                this.loadTemplate(template);
            });
        });
        
        // Node type buttons - now with drag and drop support
        const nodeTypeButtons = document.querySelectorAll('.node-type-btn');
        nodeTypeButtons.forEach(btn => {
            // Make buttons draggable
            btn.setAttribute('draggable', 'true');
            
            // Drag start event
            btn.addEventListener('dragstart', (e) => {
                const nodeType = e.currentTarget.getAttribute('data-node-type');
                e.dataTransfer.setData('nodeType', nodeType);
                e.dataTransfer.effectAllowed = 'copy';
                e.currentTarget.style.opacity = '0.5';
            });
            
            // Drag end event
            btn.addEventListener('dragend', (e) => {
                e.currentTarget.style.opacity = '1';
            });
            
            // Click event (fallback for non-drag creation)
            btn.addEventListener('click', (e) => {
                const nodeType = e.currentTarget.getAttribute('data-node-type');
                // Create node near center of visible area
                const x = -this.canvas.offsetX + 300;
                const y = -this.canvas.offsetY + 200;
                this.createNode(nodeType, x, y);
            });
        });
        
        // Canvas container - used for drop zone, mouse wheel zoom, and panning
        const container = document.getElementById('node-canvas-container');
        
        // Add drop zone for drag and drop
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });
        
        container.addEventListener('drop', (e) => {
            e.preventDefault();
            const nodeType = e.dataTransfer.getData('nodeType');
            if (nodeType) {
                // Calculate node position from drop location, accounting for canvas transform
                const containerRect = this.nodeCanvas.getBoundingClientRect();
                const x = (e.clientX - containerRect.left) / this.canvas.zoom;
                const y = (e.clientY - containerRect.top) / this.canvas.zoom;
                this.createNode(nodeType, x, y);
            }
        });
        
        // Mouse wheel zoom
        container.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                if (e.deltaY < 0) {
                    this.zoomIn();
                } else {
                    this.zoomOut();
                }
            }
        }, { passive: false });
        
        // Canvas panning
        container.addEventListener('mousedown', (e) => {
            if (e.button === 1 || (e.button === 0 && e.target === container)) {
                // Middle mouse or clicking on background
                this.canvas.isPanning = true;
                this.canvas.panStartX = e.clientX - this.canvas.offsetX;
                this.canvas.panStartY = e.clientY - this.canvas.offsetY;
                this.nodeCanvas.classList.add('panning');
                e.preventDefault();
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.canvas.isPanning) {
                this.canvas.offsetX = e.clientX - this.canvas.panStartX;
                this.canvas.offsetY = e.clientY - this.canvas.panStartY;
                this.updateCanvasTransform();
            } else if (this.draggingNode) {
                const node = this.draggingNode;
                const containerRect = this.nodeCanvas.getBoundingClientRect();
                // Convert mouse position to canvas coordinates, accounting for zoom
                node.x = (e.clientX - containerRect.left) / this.canvas.zoom - this.dragOffsetX;
                node.y = (e.clientY - containerRect.top) / this.canvas.zoom - this.dragOffsetY;
                this.updateNodePosition(node);
                this.updateConnections();
            } else if (this.connecting) {
                this.tempConnectionEnd = { x: e.clientX, y: e.clientY };
                this.drawTempConnection();
            }
        });
        
        document.addEventListener('mouseup', (e) => {
            if (this.canvas.isPanning) {
                this.canvas.isPanning = false;
                this.nodeCanvas.classList.remove('panning');
            }
            if (this.draggingNode) {
                this.draggingNode = null;
            }
            if (this.connecting) {
                this.connecting = false;
                this.connectionStart = null;
                this.removeTempConnection();
            }
        });
        
        // Brush preview interaction
        this.previewCanvas.addEventListener('mousedown', (e) => {
            this.isDrawingPreview = true;
            this.drawPreviewStroke(e);
        });
        
        this.previewCanvas.addEventListener('mousemove', (e) => {
            if (this.isDrawingPreview) {
                this.drawPreviewStroke(e);
            }
        });
        
        this.previewCanvas.addEventListener('mouseup', () => {
            this.isDrawingPreview = false;
        });
        
        this.previewCanvas.addEventListener('mouseleave', () => {
            this.isDrawingPreview = false;
        });
        
        // Search functionality
        const searchInput = document.getElementById('node-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterNodes(e.target.value);
            });
        }
        
        // New control buttons
        document.getElementById('node-auto-arrange').addEventListener('click', () => {
            this.autoArrangeNodes();
        });
        
        document.getElementById('node-undo').addEventListener('click', () => {
            this.undo();
        });
        
        document.getElementById('node-redo').addEventListener('click', () => {
            this.redo();
        });
        
        document.getElementById('node-help').addEventListener('click', () => {
            this.showKeyboardShortcuts();
        });
        
        // Preview controls
        document.getElementById('preview-clear').addEventListener('click', () => {
            this.clearPreview();
        });
        
        document.getElementById('preview-test').addEventListener('click', () => {
            this.testBrushPreview();
        });
        
        document.getElementById('preview-mode').addEventListener('change', (e) => {
            this.previewMode = e.target.value;
            this.updateBrushPreview();
        });
        
        // Additional save button
        document.getElementById('node-save-brush-main').addEventListener('click', () => {
            this.saveBrush();
        });
        
        document.getElementById('node-apply-brush').addEventListener('click', () => {
            this.applyToCurrentBrush();
        });
        
        // Filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                filterButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.filterNodesByCategory(e.target.dataset.filter);
            });
        });
        
        // Context menu on right-click
        this.nodeCanvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e.clientX, e.clientY);
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (!this.window.classList.contains('visible')) return;
            
            // Delete selected node with Delete key
            if (e.key === 'Delete' && this.selectedNode) {
                this.saveState();
                this.deleteNode(this.selectedNode.id);
                e.preventDefault();
            }
            
            // Ctrl+Z - Undo
            if (e.ctrlKey && e.key === 'z') {
                this.undo();
                e.preventDefault();
            }
            
            // Ctrl+Y - Redo
            if (e.ctrlKey && e.key === 'y') {
                this.redo();
                e.preventDefault();
            }
            
            // Ctrl+A - Select all
            if (e.ctrlKey && e.key === 'a') {
                this.selectAll();
                e.preventDefault();
            }
            
            // Ctrl+C - Copy
            if (e.ctrlKey && e.key === 'c' && this.selectedNode) {
                this.copyNode(this.selectedNode);
                e.preventDefault();
            }
            
            // Ctrl+V - Paste
            if (e.ctrlKey && e.key === 'v' && this.copiedNode) {
                this.saveState();
                this.pasteNode();
                e.preventDefault();
            }
            
            // Ctrl+D - Duplicate
            if (e.ctrlKey && e.key === 'd' && this.selectedNode) {
                this.saveState();
                this.duplicateNode(this.selectedNode);
                e.preventDefault();
            }
            
            // Escape - Deselect
            if (e.key === 'Escape') {
                if (this.selectedNode) {
                    this.selectedNode.element.classList.remove('selected');
                    this.selectedNode = null;
                }
                e.preventDefault();
            }
            
            // F1 - Help
            if (e.key === 'F1') {
                this.showKeyboardShortcuts();
                e.preventDefault();
            }
        });
    }
    
    drawPreviewStroke(e) {
        const rect = this.previewCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left);
        const y = (e.clientY - rect.top);
        
        const brush = this.evaluateGraph();
        
        this.previewCtx.globalAlpha = (brush.opacity || 100) / 100;
        this.previewCtx.fillStyle = brush.color || '#000000';
        this.previewCtx.beginPath();
        this.previewCtx.arc(x, y, (brush.size || 20) / 2, 0, Math.PI * 2);
        this.previewCtx.fill();
    }
    
    updateCanvasTransform() {
        this.nodeCanvas.style.transform = `translate(${this.canvas.offsetX}px, ${this.canvas.offsetY}px) scale(${this.canvas.zoom})`;
        this.updateConnections();
    }
    
    createNode(type, x, y) {
        const node = {
            id: this.nextNodeId++,
            type: type,
            x: x,
            y: y,
            inputs: [],
            outputs: [],
            parameters: {}
        };
        
        // Define node structure based on type
        this.defineNodeStructure(node);
        
        // Create DOM element
        const nodeElement = this.createNodeElement(node);
        node.element = nodeElement;
        
        this.nodes.push(node);
        this.nodeCanvas.appendChild(nodeElement);
        this.updateNodePosition(node);
        this.updateStats();
        
        return node;
    }
    
    defineNodeStructure(node) {
        const definitions = {
            'color-input': {
                outputs: [{ name: 'Color', type: 'color' }],
                parameters: { color: '#000000' }
            },
            'value-input': {
                outputs: [{ name: 'Value', type: 'number' }],
                parameters: { value: 50 }
            },
            'texture-input': {
                outputs: [{ name: 'Texture', type: 'texture' }],
                parameters: { texture: null }
            },
            'pressure-input': {
                outputs: [{ name: 'Pressure', type: 'number' }],
                parameters: { pressure: 100 }
            },
            'velocity-input': {
                outputs: [{ name: 'Velocity', type: 'number' }],
                parameters: { velocity: 50 }
            },
            'tilt-input': {
                outputs: [{ name: 'Tilt X', type: 'number' }, { name: 'Tilt Y', type: 'number' }],
                parameters: { tiltX: 0, tiltY: 0 }
            },
            'rotation-input': {
                outputs: [{ name: 'Rotation', type: 'number' }],
                parameters: { rotation: 0 }
            },
            'random-input': {
                outputs: [{ name: 'Random', type: 'number' }],
                parameters: { min: 0, max: 100, seed: 0 }
            },
            'time-input': {
                outputs: [{ name: 'Time', type: 'number' }],
                parameters: { speed: 1, offset: 0 }
            },
            'gradient-input': {
                outputs: [{ name: 'Color', type: 'color' }],
                parameters: { colorStart: '#000000', colorEnd: '#ffffff', position: 50 }
            },
            'image-input': {
                outputs: [{ name: 'Image', type: 'texture' }],
                parameters: { imageUrl: '' }
            },
            'noise-input': {
                outputs: [{ name: 'Noise', type: 'number' }],
                parameters: { scale: 10, octaves: 3, persistence: 0.5 }
            },
            'size': {
                inputs: [{ name: 'Value', type: 'number' }],
                outputs: [{ name: 'Size', type: 'number' }],
                parameters: { baseSize: 20, multiplier: 1 }
            },
            'opacity': {
                inputs: [{ name: 'Value', type: 'number' }],
                outputs: [{ name: 'Opacity', type: 'number' }],
                parameters: { baseOpacity: 100, multiplier: 1 }
            },
            'hardness': {
                inputs: [{ name: 'Value', type: 'number' }],
                outputs: [{ name: 'Hardness', type: 'number' }],
                parameters: { hardness: 80 }
            },
            'flow': {
                inputs: [{ name: 'Value', type: 'number' }],
                outputs: [{ name: 'Flow', type: 'number' }],
                parameters: { flow: 100 }
            },
            'scatter': {
                inputs: [{ name: 'Amount', type: 'number' }],
                outputs: [{ name: 'Scatter X', type: 'number' }, { name: 'Scatter Y', type: 'number' }],
                parameters: { scatterX: 10, scatterY: 10 }
            },
            'rotation': {
                inputs: [{ name: 'Angle', type: 'number' }],
                outputs: [{ name: 'Rotation', type: 'number' }],
                parameters: { angle: 0, jitter: 0 }
            },
            'dynamics': {
                inputs: [{ name: 'Pressure', type: 'number' }],
                outputs: [{ name: 'Size', type: 'number' }, { name: 'Opacity', type: 'number' }],
                parameters: { pressureSize: 100, pressureOpacity: 100 }
            },
            'jitter': {
                inputs: [{ name: 'Value', type: 'number' }],
                outputs: [{ name: 'Jittered', type: 'number' }],
                parameters: { amount: 20 }
            },
            'spacing': {
                inputs: [{ name: 'Value', type: 'number' }],
                outputs: [{ name: 'Spacing', type: 'number' }],
                parameters: { baseSpacing: 10, multiplier: 1 }
            },
            'blending-mode': {
                inputs: [{ name: 'Mode', type: 'number' }],
                outputs: [{ name: 'Blend', type: 'string' }],
                parameters: { mode: 'normal' }
            },
            'texture-blend': {
                inputs: [{ name: 'Texture', type: 'texture' }, { name: 'Amount', type: 'number' }],
                outputs: [{ name: 'Blended', type: 'texture' }],
                parameters: { blendAmount: 50 }
            },
            'color-variation': {
                inputs: [{ name: 'Color', type: 'color' }],
                outputs: [{ name: 'Color', type: 'color' }],
                parameters: { hueJitter: 0, satJitter: 0, brightJitter: 0 }
            },
            'scale': {
                inputs: [{ name: 'X', type: 'number' }, { name: 'Y', type: 'number' }],
                outputs: [{ name: 'Scale X', type: 'number' }, { name: 'Scale Y', type: 'number' }],
                parameters: { scaleX: 100, scaleY: 100 }
            },
            'position-offset': {
                inputs: [{ name: 'X', type: 'number' }, { name: 'Y', type: 'number' }],
                outputs: [{ name: 'Offset X', type: 'number' }, { name: 'Offset Y', type: 'number' }],
                parameters: { offsetX: 0, offsetY: 0 }
            },
            'wet-mix': {
                inputs: [{ name: 'Color', type: 'color' }, { name: 'Wetness', type: 'number' }],
                outputs: [{ name: 'Mixed Color', type: 'color' }],
                parameters: { wetness: 50, bleed: 30 }
            },
            'shape': {
                inputs: [{ name: 'Size', type: 'number' }],
                outputs: [{ name: 'Shape', type: 'string' }],
                parameters: { shape: 'circle', sides: 4 }
            },
            'fade': {
                inputs: [{ name: 'Progress', type: 'number' }],
                outputs: [{ name: 'Fade', type: 'number' }],
                parameters: { fadeIn: 10, fadeOut: 10 }
            },
            'direction': {
                inputs: [{ name: 'Velocity', type: 'number' }],
                outputs: [{ name: 'Angle', type: 'number' }],
                parameters: { sensitivity: 100 }
            },
            'hsv-adjust': {
                inputs: [{ name: 'Color', type: 'color' }],
                outputs: [{ name: 'Adjusted', type: 'color' }],
                parameters: { hue: 0, saturation: 0, value: 0 }
            },
            'color-mix': {
                inputs: [{ name: 'Color A', type: 'color' }, { name: 'Color B', type: 'color' }, { name: 'Mix', type: 'number' }],
                outputs: [{ name: 'Mixed', type: 'color' }],
                parameters: { mixAmount: 50 }
            },
            'color-ramp': {
                inputs: [{ name: 'Position', type: 'number' }],
                outputs: [{ name: 'Color', type: 'color' }],
                parameters: { color1: '#000000', color2: '#ffffff', color3: '#ff0000', stops: 3 }
            },
            'curve': {
                inputs: [{ name: 'Input', type: 'number' }],
                outputs: [{ name: 'Output', type: 'number' }],
                parameters: { curve: 'linear', strength: 50 }
            },
            'multiply': {
                inputs: [{ name: 'A', type: 'number' }, { name: 'B', type: 'number' }],
                outputs: [{ name: 'Result', type: 'number' }],
                parameters: {}
            },
            'add': {
                inputs: [{ name: 'A', type: 'number' }, { name: 'B', type: 'number' }],
                outputs: [{ name: 'Result', type: 'number' }],
                parameters: {}
            },
            'subtract': {
                inputs: [{ name: 'A', type: 'number' }, { name: 'B', type: 'number' }],
                outputs: [{ name: 'Result', type: 'number' }],
                parameters: {}
            },
            'divide': {
                inputs: [{ name: 'A', type: 'number' }, { name: 'B', type: 'number' }],
                outputs: [{ name: 'Result', type: 'number' }],
                parameters: {}
            },
            'power': {
                inputs: [{ name: 'Base', type: 'number' }, { name: 'Exponent', type: 'number' }],
                outputs: [{ name: 'Result', type: 'number' }],
                parameters: {}
            },
            'min': {
                inputs: [{ name: 'A', type: 'number' }, { name: 'B', type: 'number' }],
                outputs: [{ name: 'Result', type: 'number' }],
                parameters: {}
            },
            'max': {
                inputs: [{ name: 'A', type: 'number' }, { name: 'B', type: 'number' }],
                outputs: [{ name: 'Result', type: 'number' }],
                parameters: {}
            },
            'abs': {
                inputs: [{ name: 'Value', type: 'number' }],
                outputs: [{ name: 'Result', type: 'number' }],
                parameters: {}
            },
            'sine': {
                inputs: [{ name: 'Angle', type: 'number' }],
                outputs: [{ name: 'Result', type: 'number' }],
                parameters: { frequency: 1, amplitude: 50 }
            },
            'cosine': {
                inputs: [{ name: 'Angle', type: 'number' }],
                outputs: [{ name: 'Result', type: 'number' }],
                parameters: { frequency: 1, amplitude: 50 }
            },
            'remap': {
                inputs: [{ name: 'Value', type: 'number' }],
                outputs: [{ name: 'Remapped', type: 'number' }],
                parameters: { inMin: 0, inMax: 100, outMin: 0, outMax: 100 }
            },
            'smoothstep': {
                inputs: [{ name: 'Value', type: 'number' }],
                outputs: [{ name: 'Result', type: 'number' }],
                parameters: { edge0: 0, edge1: 100 }
            },
            'mix': {
                inputs: [{ name: 'A', type: 'number' }, { name: 'B', type: 'number' }, { name: 'Factor', type: 'number' }],
                outputs: [{ name: 'Result', type: 'number' }],
                parameters: { factor: 50 }
            },
            'modulo': {
                inputs: [{ name: 'A', type: 'number' }, { name: 'B', type: 'number' }],
                outputs: [{ name: 'Result', type: 'number' }],
                parameters: {}
            },
            'clamp': {
                inputs: [{ name: 'Value', type: 'number' }],
                outputs: [{ name: 'Clamped', type: 'number' }],
                parameters: { min: 0, max: 100 }
            },
            // Painting Effect Nodes
            'smudge': {
                inputs: [{ name: 'Strength', type: 'number' }],
                outputs: [{ name: 'Smudge', type: 'number' }],
                parameters: { strength: 50, radius: 20, softness: 80 }
            },
            'blend-mode': {
                inputs: [{ name: 'Intensity', type: 'number' }],
                outputs: [{ name: 'Blend', type: 'string' }],
                parameters: { mode: 'multiply', intensity: 100 }
            },
            'bristle': {
                inputs: [{ name: 'Stiffness', type: 'number' }],
                outputs: [{ name: 'Bristle Count', type: 'number' }, { name: 'Spread', type: 'number' }],
                parameters: { count: 20, stiffness: 70, spread: 15, length: 50 }
            },
            'canvas-texture': {
                inputs: [{ name: 'Scale', type: 'number' }],
                outputs: [{ name: 'Texture', type: 'texture' }],
                parameters: { scale: 100, depth: 30, roughness: 50 }
            },
            'paint-buildup': {
                inputs: [{ name: 'Amount', type: 'number' }],
                outputs: [{ name: 'Buildup', type: 'number' }],
                parameters: { amount: 50, threshold: 30, decay: 10 }
            },
            'drip': {
                inputs: [{ name: 'Gravity', type: 'number' }],
                outputs: [{ name: 'Drip X', type: 'number' }, { name: 'Drip Y', type: 'number' }],
                parameters: { gravity: 50, viscosity: 70, length: 40 }
            },
            'splatter': {
                inputs: [{ name: 'Intensity', type: 'number' }],
                outputs: [{ name: 'Splatter', type: 'number' }],
                parameters: { intensity: 50, count: 10, size: 5, spread: 100 }
            },
            'watercolor-edge': {
                inputs: [{ name: 'Wetness', type: 'number' }],
                outputs: [{ name: 'Edge Dark', type: 'number' }],
                parameters: { edgeDarkness: 50, width: 20, softness: 60, wetness: 70 }
            },
            'impasto': {
                inputs: [{ name: 'Thickness', type: 'number' }],
                outputs: [{ name: 'Height', type: 'number' }],
                parameters: { thickness: 50, texture: 70, highlights: 60, shadows: 40 }
            },
            'glazing': {
                inputs: [{ name: 'Transparency', type: 'number' }],
                outputs: [{ name: 'Glaze', type: 'number' }],
                parameters: { transparency: 80, tint: 20, layers: 3 }
            },
            // Advanced Effect Nodes
            'stroke-taper': {
                inputs: [{ name: 'Progress', type: 'number' }],
                outputs: [{ name: 'Taper', type: 'number' }],
                parameters: { startTaper: 10, endTaper: 20, curve: 50 }
            },
            'dual-brush': {
                inputs: [{ name: 'Texture A', type: 'texture' }, { name: 'Texture B', type: 'texture' }],
                outputs: [{ name: 'Mixed', type: 'texture' }],
                parameters: { mixMode: 'multiply', balance: 50, contrast: 50 }
            },
            'texture-mode': {
                inputs: [{ name: 'Texture', type: 'texture' }, { name: 'Strength', type: 'number' }],
                outputs: [{ name: 'Result', type: 'texture' }],
                parameters: { mode: 'overlay', depth: 50, invert: 0 }
            },
            'transfer-mode': {
                inputs: [{ name: 'Color', type: 'color' }],
                outputs: [{ name: 'Transferred', type: 'color' }],
                parameters: { mode: 'normal', opacity: 100 }
            },
            'accumulation': {
                inputs: [{ name: 'Amount', type: 'number' }],
                outputs: [{ name: 'Buildup', type: 'number' }],
                parameters: { rate: 50, maximum: 100, decay: 10 }
            },
            'airflow': {
                inputs: [{ name: 'Pressure', type: 'number' }],
                outputs: [{ name: 'Flow Pattern', type: 'number' }],
                parameters: { pattern: 'radial', intensity: 50, turbulence: 20 }
            },
            'stamp-spacing': {
                inputs: [{ name: 'Velocity', type: 'number' }],
                outputs: [{ name: 'Spacing', type: 'number' }],
                parameters: { baseSpacing: 25, minSpacing: 5, maxSpacing: 100 }
            },
            'edge-softness': {
                inputs: [{ name: 'Distance', type: 'number' }],
                outputs: [{ name: 'Softness', type: 'number' }],
                parameters: { inner: 80, outer: 20, curve: 50 }
            },
            'bristle-split': {
                inputs: [{ name: 'Pressure', type: 'number' }],
                outputs: [{ name: 'Split Amount', type: 'number' }],
                parameters: { threshold: 70, splitCount: 5, angle: 30 }
            },
            'wetness': {
                inputs: [{ name: 'Amount', type: 'number' }],
                outputs: [{ name: 'Wet', type: 'number' }],
                parameters: { wetness: 50, absorption: 30, drying: 20 }
            },
            // Particle Effect Nodes
            'particle-emitter': {
                inputs: [{ name: 'Rate', type: 'number' }],
                outputs: [{ name: 'Particles', type: 'number' }],
                parameters: { rate: 10, size: 5, spread: 45 }
            },
            'particle-velocity': {
                inputs: [{ name: 'Speed', type: 'number' }],
                outputs: [{ name: 'Velocity', type: 'number' }],
                parameters: { speed: 50, direction: 0, randomness: 20 }
            },
            'particle-lifetime': {
                inputs: [{ name: 'Duration', type: 'number' }],
                outputs: [{ name: 'Lifetime', type: 'number' }],
                parameters: { lifetime: 100, variation: 20, fadeOut: 30 }
            },
            'particle-gravity': {
                inputs: [{ name: 'Force', type: 'number' }],
                outputs: [{ name: 'Gravity', type: 'number' }],
                parameters: { strength: 50, direction: 90, drag: 10 }
            },
            'particle-turbulence': {
                inputs: [{ name: 'Intensity', type: 'number' }],
                outputs: [{ name: 'Turbulence', type: 'number' }],
                parameters: { intensity: 50, scale: 20, octaves: 3 }
            },
            'brush-output': {
                inputs: [
                    { name: 'Size', type: 'number' },
                    { name: 'Opacity', type: 'number' },
                    { name: 'Hardness', type: 'number' },
                    { name: 'Flow', type: 'number' },
                    { name: 'Scatter X', type: 'number' },
                    { name: 'Scatter Y', type: 'number' },
                    { name: 'Rotation', type: 'number' },
                    { name: 'Color', type: 'color' }
                ],
                outputs: [],
                parameters: {}
            }
        };
        
        const def = definitions[node.type];
        if (def) {
            node.inputs = def.inputs || [];
            node.outputs = def.outputs || [];
            node.parameters = { ...def.parameters };
        }
    }
    
    createNodeElement(node) {
        const el = document.createElement('div');
        el.className = 'node';
        el.dataset.nodeId = node.id;
        
        // Header
        const header = document.createElement('div');
        header.className = 'node-header';
        
        const title = document.createElement('span');
        title.className = 'node-title';
        title.textContent = this.getNodeDisplayName(node.type);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'node-delete';
        deleteBtn.dataset.nodeId = node.id;
        deleteBtn.textContent = '×';
        
        header.appendChild(title);
        header.appendChild(deleteBtn);
        el.appendChild(header);
        
        // Body
        const body = document.createElement('div');
        body.className = 'node-body';
        
        // Sockets
        const sockets = document.createElement('div');
        sockets.className = 'node-sockets';
        
        // Input sockets
        node.inputs.forEach((input, index) => {
            const row = document.createElement('div');
            row.className = 'node-socket-row';
            row.innerHTML = `
                <div class="node-socket input" data-node-id="${node.id}" data-socket-type="input" data-socket-index="${index}"></div>
                <span class="node-socket-label">${input.name}</span>
            `;
            sockets.appendChild(row);
        });
        
        // Output sockets
        node.outputs.forEach((output, index) => {
            const row = document.createElement('div');
            row.className = 'node-socket-row';
            row.innerHTML = `
                <span class="node-socket-label">${output.name}</span>
                <div class="node-socket output" data-node-id="${node.id}" data-socket-type="output" data-socket-index="${index}"></div>
            `;
            sockets.appendChild(row);
        });
        
        body.appendChild(sockets);
        
        // Parameters
        const params = this.createParameterControls(node);
        if (params) {
            body.appendChild(params);
        }
        
        el.appendChild(body);
        
        // Bind events
        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('node-delete')) {
                this.deleteNode(node.id);
                return;
            }
            this.startDragging(node, e);
            this.selectNode(node);
            e.stopPropagation();
        });
        
        // Socket events
        const socketElements = el.querySelectorAll('.node-socket');
        socketElements.forEach(socket => {
            socket.addEventListener('mousedown', (e) => {
                this.startConnection(socket, e);
                e.stopPropagation();
            });
            socket.addEventListener('mouseup', (e) => {
                this.endConnection(socket, e);
                e.stopPropagation();
            });
        });
        
        return el;
    }
    
    createParameterControls(node) {
        const params = node.parameters;
        const keys = Object.keys(params);
        
        if (keys.length === 0) return null;
        
        const container = document.createElement('div');
        
        keys.forEach(key => {
            const param = document.createElement('div');
            param.className = 'node-parameter';
            
            const label = document.createElement('label');
            label.textContent = key.replace(/([A-Z])/g, ' $1').trim();
            
            let input;
            const value = params[key];
            
            if (typeof value === 'number') {
                input = document.createElement('input');
                input.type = 'range';
                input.min = 0;
                input.max = key.includes('angle') || key.includes('rotation') ? 360 : 100;
                input.value = value;
                
                const valueDisplay = document.createElement('span');
                valueDisplay.className = 'node-parameter-value';
                valueDisplay.textContent = value;
                
                input.addEventListener('input', (e) => {
                    node.parameters[key] = parseFloat(e.target.value);
                    valueDisplay.textContent = e.target.value;
                    this.updateBrushPreview();
                });
                
                param.appendChild(label);
                param.appendChild(input);
                param.appendChild(valueDisplay);
            } else if (typeof value === 'string' && value.startsWith('#')) {
                // Color input
                input = document.createElement('input');
                input.type = 'color';
                input.value = value;
                
                input.addEventListener('input', (e) => {
                    node.parameters[key] = e.target.value;
                    this.updateBrushPreview();
                });
                
                param.appendChild(label);
                param.appendChild(input);
            }
            
            container.appendChild(param);
        });
        
        return container;
    }
    
    getNodeDisplayName(type) {
        const names = {
            'color-input': 'Color Input',
            'value-input': 'Value Input',
            'texture-input': 'Texture Input',
            'pressure-input': 'Pressure Input',
            'velocity-input': 'Velocity Input',
            'tilt-input': 'Tilt Input',
            'rotation-input': 'Rotation Input',
            'random-input': 'Random Input',
            'time-input': 'Time Input',
            'gradient-input': 'Gradient Input',
            'image-input': 'Image Input',
            'noise-input': 'Noise Input',
            'size': 'Size',
            'opacity': 'Opacity',
            'hardness': 'Hardness',
            'flow': 'Flow',
            'scatter': 'Scatter',
            'rotation': 'Rotation',
            'dynamics': 'Dynamics',
            'jitter': 'Jitter',
            'spacing': 'Spacing',
            'blending-mode': 'Blending Mode',
            'texture-blend': 'Texture Blend',
            'color-variation': 'Color Variation',
            'scale': 'Scale',
            'position-offset': 'Position Offset',
            'wet-mix': 'Wet Mix',
            'shape': 'Shape',
            'fade': 'Fade',
            'direction': 'Direction',
            'multiply': 'Multiply',
            'add': 'Add',
            'subtract': 'Subtract',
            'divide': 'Divide',
            'power': 'Power',
            'min': 'Min',
            'max': 'Max',
            'abs': 'Absolute',
            'sine': 'Sine',
            'cosine': 'Cosine',
            'remap': 'Remap Range',
            'smoothstep': 'Smooth Step',
            'mix': 'Mix/Lerp',
            'modulo': 'Modulo',
            'clamp': 'Clamp',
            'hsv-adjust': 'HSV Adjust',
            'color-mix': 'Color Mix',
            'color-ramp': 'Color Ramp',
            'curve': 'Curve',
            'smudge': 'Smudge',
            'blend-mode': 'Blend Mode',
            'bristle': 'Bristle',
            'canvas-texture': 'Canvas Texture',
            'paint-buildup': 'Paint Buildup',
            'drip': 'Drip',
            'splatter': 'Splatter',
            'watercolor-edge': 'Watercolor Edge',
            'impasto': 'Impasto',
            'glazing': 'Glazing',
            'stroke-taper': 'Stroke Taper',
            'dual-brush': 'Dual Brush',
            'texture-mode': 'Texture Mode',
            'transfer-mode': 'Transfer Mode',
            'accumulation': 'Accumulation',
            'airflow': 'Airflow',
            'stamp-spacing': 'Stamp Spacing',
            'edge-softness': 'Edge Softness',
            'bristle-split': 'Bristle Split',
            'wetness': 'Wetness',
            'particle-emitter': 'Particle Emitter',
            'particle-velocity': 'Particle Velocity',
            'particle-lifetime': 'Particle Lifetime',
            'particle-gravity': 'Particle Gravity',
            'particle-turbulence': 'Particle Turbulence',
            'brush-output': 'Brush Output'
        };
        return names[type] || type;
    }
    
    startDragging(node, e) {
        this.draggingNode = node;
        const rect = node.element.getBoundingClientRect();
        const containerRect = this.nodeCanvas.getBoundingClientRect();
        // Calculate offset from mouse position to node position in canvas coordinates
        // The rect.left/top are in viewport coordinates, so we need to convert to canvas coordinates
        this.dragOffsetX = (e.clientX - containerRect.left) / this.canvas.zoom - node.x;
        this.dragOffsetY = (e.clientY - containerRect.top) / this.canvas.zoom - node.y;
    }
    
    updateNodePosition(node) {
        node.element.style.left = node.x + 'px';
        node.element.style.top = node.y + 'px';
    }
    
    selectNode(node) {
        if (this.selectedNode) {
            this.selectedNode.element.classList.remove('selected');
        }
        this.selectedNode = node;
        node.element.classList.add('selected');
    }
    
    deleteNode(nodeId) {
        const index = this.nodes.findIndex(n => n.id === nodeId);
        if (index !== -1) {
            const node = this.nodes[index];
            
            // Remove connections
            this.connections = this.connections.filter(conn => 
                conn.from.nodeId !== nodeId && conn.to.nodeId !== nodeId
            );
            
            // Remove element
            node.element.remove();
            
            // Remove from array
            this.nodes.splice(index, 1);
            
            this.updateConnections();
            this.updateBrushPreview();
            this.updateStats();
        }
    }
    
    deleteConnection(fromNodeId, fromSocket, toNodeId, toSocket) {
        // Find and remove the connection
        const index = this.connections.findIndex(conn => 
            conn.from.nodeId === fromNodeId && 
            conn.from.socketIndex === fromSocket &&
            conn.to.nodeId === toNodeId && 
            conn.to.socketIndex === toSocket
        );
        
        if (index !== -1) {
            this.connections.splice(index, 1);
            this.updateConnections();
            this.updateBrushPreview();
            this.updateStats();
        }
    }
    
    startConnection(socketElement, e) {
        const nodeId = parseInt(socketElement.dataset.nodeId);
        const socketType = socketElement.dataset.socketType;
        const socketIndex = parseInt(socketElement.dataset.socketIndex);
        
        // Only allow starting from output sockets
        if (socketType === 'output') {
            this.connecting = true;
            this.connectionStart = { nodeId, socketType, socketIndex, element: socketElement };
        }
    }
    
    endConnection(socketElement, e) {
        if (!this.connecting) return;
        
        const nodeId = parseInt(socketElement.dataset.nodeId);
        const socketType = socketElement.dataset.socketType;
        const socketIndex = parseInt(socketElement.dataset.socketIndex);
        
        // Only allow ending on input sockets
        if (socketType === 'input' && this.connectionStart) {
            // Don't allow connecting to same node
            if (nodeId !== this.connectionStart.nodeId) {
                this.createConnection(
                    this.connectionStart.nodeId,
                    this.connectionStart.socketIndex,
                    nodeId,
                    socketIndex
                );
            }
        }
        
        this.connecting = false;
        this.connectionStart = null;
        this.removeTempConnection();
    }
    
    createConnection(fromNodeId, fromSocket, toNodeId, toSocket) {
        // Remove any existing connection to this input
        this.connections = this.connections.filter(conn => 
            !(conn.to.nodeId === toNodeId && conn.to.socketIndex === toSocket)
        );
        
        // Add new connection
        this.connections.push({
            from: { nodeId: fromNodeId, socketIndex: fromSocket },
            to: { nodeId: toNodeId, socketIndex: toSocket }
        });
        
        this.updateConnections();
        this.updateBrushPreview();
        this.updateStats();
    }
    
    updateConnections() {
        // Clear existing SVG paths
        this.connectionsSvg.innerHTML = '';
        
        // Draw all connections
        this.connections.forEach(conn => {
            this.drawConnection(conn);
        });
    }
    
    drawConnection(conn) {
        const fromNode = this.nodes.find(n => n.id === conn.from.nodeId);
        const toNode = this.nodes.find(n => n.id === conn.to.nodeId);
        
        if (!fromNode || !toNode) return;
        
        const fromSocket = fromNode.element.querySelector(
            `.node-socket.output[data-socket-index="${conn.from.socketIndex}"]`
        );
        const toSocket = toNode.element.querySelector(
            `.node-socket.input[data-socket-index="${conn.to.socketIndex}"]`
        );
        
        if (!fromSocket || !toSocket) return;
        
        const fromRect = fromSocket.getBoundingClientRect();
        const toRect = toSocket.getBoundingClientRect();
        const containerRect = this.connectionsSvg.getBoundingClientRect();
        
        const x1 = fromRect.left + fromRect.width / 2 - containerRect.left;
        const y1 = fromRect.top + fromRect.height / 2 - containerRect.top;
        const x2 = toRect.left + toRect.width / 2 - containerRect.left;
        const y2 = toRect.top + toRect.height / 2 - containerRect.top;
        
        // Create bezier curve
        const dx = Math.abs(x2 - x1);
        const handleOffset = Math.min(dx * 0.5, 100);
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${x1} ${y1} C ${x1 + handleOffset} ${y1}, ${x2 - handleOffset} ${y2}, ${x2} ${y2}`);
        path.classList.add('node-connection');
        
        // Store connection data on the path for deletion
        path.dataset.fromNodeId = conn.from.nodeId;
        path.dataset.fromSocket = conn.from.socketIndex;
        path.dataset.toNodeId = conn.to.nodeId;
        path.dataset.toSocket = conn.to.socketIndex;
        
        // Make connection clickable to delete
        path.style.cursor = 'pointer';
        path.setAttribute('title', 'Click to delete connection');
        
        // Add click handler to delete connection
        path.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteConnection(conn.from.nodeId, conn.from.socketIndex, conn.to.nodeId, conn.to.socketIndex);
        });
        
        // Mark sockets as connected
        fromSocket.classList.add('connected');
        toSocket.classList.add('connected');
        
        this.connectionsSvg.appendChild(path);
    }
    
    drawTempConnection() {
        if (!this.connectionStart || !this.tempConnectionEnd) return;
        
        // Remove old temp connection
        this.removeTempConnection();
        
        const socketRect = this.connectionStart.element.getBoundingClientRect();
        const containerRect = this.connectionsSvg.getBoundingClientRect();
        
        const x1 = socketRect.left + socketRect.width / 2 - containerRect.left;
        const y1 = socketRect.top + socketRect.height / 2 - containerRect.top;
        const x2 = this.tempConnectionEnd.x - containerRect.left;
        const y2 = this.tempConnectionEnd.y - containerRect.top;
        
        const dx = Math.abs(x2 - x1);
        const handleOffset = Math.min(dx * 0.5, 100);
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${x1} ${y1} C ${x1 + handleOffset} ${y1}, ${x2 - handleOffset} ${y2}, ${x2} ${y2}`);
        path.classList.add('node-connection', 'temp');
        path.id = 'temp-connection';
        
        this.connectionsSvg.appendChild(path);
    }
    
    removeTempConnection() {
        const temp = document.getElementById('temp-connection');
        if (temp) temp.remove();
    }
    
    evaluateGraph() {
        // Find the output node
        const outputNode = this.nodes.find(n => n.type === 'brush-output');
        if (!outputNode) {
            return this.getDefaultBrush();
        }
        
        const brush = this.getDefaultBrush();
        
        // Evaluate each input of the output node
        outputNode.inputs.forEach((input, index) => {
            const connection = this.connections.find(c => 
                c.to.nodeId === outputNode.id && c.to.socketIndex === index
            );
            
            if (connection) {
                const value = this.evaluateNode(connection.from.nodeId, connection.from.socketIndex);
                
                // Map the value to brush properties
                const inputName = input.name.toLowerCase().replace(' ', '');
                if (inputName === 'size') brush.size = value;
                else if (inputName === 'opacity') brush.opacity = value;
                else if (inputName === 'hardness') brush.hardness = value;
                else if (inputName === 'flow') brush.flow = value;
                else if (inputName === 'scatterx') brush.scatterX = value;
                else if (inputName === 'scattery') brush.scatterY = value;
                else if (inputName === 'rotation') brush.angle = value;
                else if (inputName === 'color') brush.color = value;
            }
        });
        
        return brush;
    }
    
    evaluateNode(nodeId, outputIndex) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) return 0;
        
        // Handle different node types
        switch (node.type) {
            // Input Nodes
            case 'value-input':
                return node.parameters.value || 0;
            
            case 'color-input':
                return node.parameters.color || '#000000';
            
            case 'pressure-input':
                return node.parameters.pressure || 100;
            
            case 'velocity-input':
                return node.parameters.velocity || 50;
            
            case 'tilt-input':
                if (outputIndex === 0) return node.parameters.tiltX || 0;
                if (outputIndex === 1) return node.parameters.tiltY || 0;
                return 0;
            
            case 'rotation-input':
                return node.parameters.rotation || 0;
            
            case 'random-input':
                const min = node.parameters.min || 0;
                const max = node.parameters.max || 100;
                return min + Math.random() * (max - min);
            
            case 'time-input':
                const time = Date.now() / 1000;
                return ((time * (node.parameters.speed || 1)) + (node.parameters.offset || 0)) % 100;
            
            case 'gradient-input':
                const pos = node.parameters.position || 50;
                return this.interpolateColor(node.parameters.colorStart || '#000000', 
                                             node.parameters.colorEnd || '#ffffff', pos / 100);
            
            case 'noise-input':
                return this.perlinNoise(node.parameters.scale || 10, 
                                       node.parameters.octaves || 3, 
                                       node.parameters.persistence || 0.5) * 100;
            
            // Brush Property Nodes
            case 'size':
                const sizeInput = this.getInputValue(node, 0);
                return (node.parameters.baseSize || 20) * (sizeInput / 50 || 1) * (node.parameters.multiplier || 1);
            
            case 'opacity':
                const opacityInput = this.getInputValue(node, 0);
                return (node.parameters.baseOpacity || 100) * (opacityInput / 100 || 1) * (node.parameters.multiplier || 1);
            
            case 'hardness':
                return node.parameters.hardness || 80;
            
            case 'flow':
                return node.parameters.flow || 100;
            
            // Effect Nodes
            case 'scatter':
                if (outputIndex === 0) return node.parameters.scatterX || 0;
                if (outputIndex === 1) return node.parameters.scatterY || 0;
                return 0;
            
            case 'rotation':
                return (node.parameters.angle || 0) + (Math.random() * (node.parameters.jitter || 0));
            
            case 'dynamics':
                const pressure = this.getInputValue(node, 0) || 100;
                if (outputIndex === 0) return pressure * (node.parameters.pressureSize || 100) / 100;
                if (outputIndex === 1) return pressure * (node.parameters.pressureOpacity || 100) / 100;
                return 0;
            
            case 'jitter':
                const jitterInput = this.getInputValue(node, 0);
                const jitterAmount = node.parameters.amount || 20;
                return jitterInput + (Math.random() - 0.5) * jitterAmount;
            
            case 'spacing':
                const spacingInput = this.getInputValue(node, 0) || 50;
                return (node.parameters.baseSpacing || 10) * (spacingInput / 50) * (node.parameters.multiplier || 1);
            
            case 'color-variation':
                const baseColor = this.getInputValue(node, 0) || '#000000';
                return this.varyColor(baseColor, node.parameters.hueJitter || 0, 
                                     node.parameters.satJitter || 0, node.parameters.brightJitter || 0);
            
            case 'scale':
                if (outputIndex === 0) return node.parameters.scaleX || 100;
                if (outputIndex === 1) return node.parameters.scaleY || 100;
                return 100;
            
            case 'position-offset':
                if (outputIndex === 0) return node.parameters.offsetX || 0;
                if (outputIndex === 1) return node.parameters.offsetY || 0;
                return 0;
            
            case 'fade':
                const progress = this.getInputValue(node, 0) || 0;
                const fadeIn = node.parameters.fadeIn || 10;
                const fadeOut = node.parameters.fadeOut || 10;
                if (progress < fadeIn) return progress / fadeIn * 100;
                if (progress > 100 - fadeOut) return (100 - progress) / fadeOut * 100;
                return 100;
            
            case 'direction':
                const velocity = this.getInputValue(node, 0) || 0;
                return velocity * (node.parameters.sensitivity || 100) / 100;
            
            // Math Nodes
            case 'multiply':
                const multA = this.getInputValue(node, 0) || 1;
                const multB = this.getInputValue(node, 1) || 1;
                return multA * multB;
            
            case 'add':
                const addA = this.getInputValue(node, 0) || 0;
                const addB = this.getInputValue(node, 1) || 0;
                return addA + addB;
            
            case 'subtract':
                const subA = this.getInputValue(node, 0) || 0;
                const subB = this.getInputValue(node, 1) || 0;
                return subA - subB;
            
            case 'divide':
                const divA = this.getInputValue(node, 0) || 1;
                const divB = this.getInputValue(node, 1) || 1;
                return divB !== 0 ? divA / divB : 0;
            
            case 'power':
                const base = this.getInputValue(node, 0) || 1;
                const exp = this.getInputValue(node, 1) || 1;
                return Math.pow(base, exp);
            
            case 'min':
                const minA = this.getInputValue(node, 0) || 0;
                const minB = this.getInputValue(node, 1) || 0;
                return Math.min(minA, minB);
            
            case 'max':
                const maxA = this.getInputValue(node, 0) || 0;
                const maxB = this.getInputValue(node, 1) || 0;
                return Math.max(maxA, maxB);
            
            case 'abs':
                const absInput = this.getInputValue(node, 0) || 0;
                return Math.abs(absInput);
            
            case 'sine':
                const sineAngle = this.getInputValue(node, 0) || 0;
                const sineFreq = node.parameters.frequency || 1;
                const sineAmp = node.parameters.amplitude || 50;
                return Math.sin(sineAngle * sineFreq * Math.PI / 180) * sineAmp + 50;
            
            case 'cosine':
                const cosAngle = this.getInputValue(node, 0) || 0;
                const cosFreq = node.parameters.frequency || 1;
                const cosAmp = node.parameters.amplitude || 50;
                return Math.cos(cosAngle * cosFreq * Math.PI / 180) * cosAmp + 50;
            
            case 'remap':
                const remapInput = this.getInputValue(node, 0) || 0;
                const inMin = node.parameters.inMin || 0;
                const inMax = node.parameters.inMax || 100;
                const outMin = node.parameters.outMin || 0;
                const outMax = node.parameters.outMax || 100;
                if (inMax === inMin) return outMin; // Safety check for division by zero
                return outMin + (remapInput - inMin) * (outMax - outMin) / (inMax - inMin);
            
            case 'smoothstep':
                const smoothInput = this.getInputValue(node, 0) || 0;
                const edge0 = node.parameters.edge0 || 0;
                const edge1 = node.parameters.edge1 || 100;
                const t = Math.max(0, Math.min(1, (smoothInput - edge0) / (edge1 - edge0)));
                return t * t * (3 - 2 * t) * 100;
            
            case 'mix':
                const mixA = this.getInputValue(node, 0) || 0;
                const mixB = this.getInputValue(node, 1) || 0;
                const mixFactor = (this.getInputValue(node, 2) || node.parameters.factor || 50) / 100;
                return mixA * (1 - mixFactor) + mixB * mixFactor;
            
            case 'modulo':
                const modA = this.getInputValue(node, 0) || 0;
                const modB = this.getInputValue(node, 1) || 1;
                return modB !== 0 ? modA % modB : 0;
            
            case 'clamp':
                const clampInput = this.getInputValue(node, 0) || 0;
                const clampMin = node.parameters.min || 0;
                const clampMax = node.parameters.max || 100;
                return Math.max(clampMin, Math.min(clampMax, clampInput));
            
            // Color Nodes
            case 'hsv-adjust':
                const hsvColor = this.getInputValue(node, 0) || '#000000';
                return this.adjustHSV(hsvColor, node.parameters.hue || 0, 
                                     node.parameters.saturation || 0, node.parameters.value || 0);
            
            case 'color-mix':
                const colorA = this.getInputValue(node, 0) || '#000000';
                const colorB = this.getInputValue(node, 1) || '#ffffff';
                const mixAmount = (this.getInputValue(node, 2) || node.parameters.mixAmount || 50) / 100;
                return this.mixColors(colorA, colorB, mixAmount);
            
            case 'color-ramp':
                const rampPos = (this.getInputValue(node, 0) || 50) / 100;
                return this.evaluateColorRamp(node.parameters, rampPos);
            
            case 'curve':
                const curveInput = this.getInputValue(node, 0) || 0;
                return this.applyCurve(curveInput, node.parameters.curve || 'linear', 
                                      node.parameters.strength || 50);
            
            // Painting Effect Nodes
            case 'smudge':
                const smudgeStrength = this.getInputValue(node, 0) || node.parameters.strength || 50;
                return smudgeStrength * (node.parameters.radius || 20) / 100;
            
            case 'blend-mode':
                const blendIntensity = this.getInputValue(node, 0) || node.parameters.intensity || 100;
                return node.parameters.mode || 'multiply';
            
            case 'bristle':
                const stiffness = this.getInputValue(node, 0) || node.parameters.stiffness || 70;
                if (outputIndex === 0) return node.parameters.count || 20;
                if (outputIndex === 1) return (node.parameters.spread || 15) * (stiffness / 100);
                return 0;
            
            case 'canvas-texture':
                const texScale = this.getInputValue(node, 0) || node.parameters.scale || 100;
                return texScale * (node.parameters.depth || 30) / 100;
            
            case 'paint-buildup':
                const buildupAmount = this.getInputValue(node, 0) || node.parameters.amount || 50;
                return buildupAmount * (node.parameters.threshold || 30) / 100;
            
            case 'drip':
                const gravity = this.getInputValue(node, 0) || node.parameters.gravity || 50;
                if (outputIndex === 0) return 0; // X drip (horizontal)
                if (outputIndex === 1) return gravity * (node.parameters.length || 40) / (node.parameters.viscosity || 70);
                return 0;
            
            case 'splatter':
                const splatterIntensity = this.getInputValue(node, 0) || node.parameters.intensity || 50;
                return splatterIntensity * (node.parameters.count || 10) / 100;
            
            case 'watercolor-edge':
                const wetness = this.getInputValue(node, 0) || node.parameters.wetness || 70;
                return (node.parameters.edgeDarkness || 50) * (wetness / 100);
            
            case 'impasto':
                const thickness = this.getInputValue(node, 0) || node.parameters.thickness || 50;
                return thickness * (node.parameters.texture || 70) / 100;
            
            case 'glazing':
                const transparency = this.getInputValue(node, 0) || node.parameters.transparency || 80;
                return 100 - transparency; // Invert for opacity effect
            
            default:
                return 0;
        }
    }
    
    getInputValue(node, inputIndex) {
        const connection = this.connections.find(c => 
            c.to.nodeId === node.id && c.to.socketIndex === inputIndex
        );
        
        if (connection) {
            return this.evaluateNode(connection.from.nodeId, connection.from.socketIndex);
        }
        
        return 0;
    }
    
    getDefaultBrush() {
        return {
            size: 20,
            opacity: 100,
            hardness: 80,
            flow: 100,
            scatterX: 0,
            scatterY: 0,
            angle: 0,
            color: '#000000'
        };
    }
    
    updateBrushPreview() {
        const rect = this.previewCanvas.getBoundingClientRect();
        
        // Clear canvas
        this.previewCtx.fillStyle = '#ffffff';
        this.previewCtx.fillRect(0, 0, rect.width, rect.height);
        
        // Draw brush preview stroke
        const brush = this.evaluateGraph();
        
        // Draw a sample stroke
        this.previewCtx.globalAlpha = (brush.opacity || 100) / 100;
        this.previewCtx.fillStyle = brush.color || '#000000';
        
        const centerY = rect.height / 2;
        const startX = 20;
        const endX = rect.width - 20;
        
        for (let x = startX; x < endX; x += 5) {
            const y = centerY + Math.sin((x - startX) / 30) * 20;
            this.previewCtx.beginPath();
            this.previewCtx.arc(x, y, (brush.size || 20) / 2, 0, Math.PI * 2);
            this.previewCtx.fill();
        }
    }
    
    saveBrush() {
        const brush = this.evaluateGraph();
        const brushName = document.getElementById('node-brush-name').value || 'Custom Brush';
        const saveLocation = document.getElementById('node-brush-save-location').value;
        
        // Create brush preset object
        const preset = {
            name: brushName,
            size: Math.round(brush.size),
            opacity: Math.round(brush.opacity),
            hardness: Math.round(brush.hardness),
            flow: Math.round(brush.flow),
            spacing: 10,
            smoothing: 0,
            angle: Math.round(brush.angle),
            angleJitter: 0,
            scatterX: Math.round(brush.scatterX),
            scatterY: Math.round(brush.scatterY),
            nodeGraph: this.serializeGraph()
        };
        
        // Save to the appropriate location
        if (typeof window.state !== 'undefined' && window.state.customBrushes) {
            // Add to custom brushes
            if (!window.state.customBrushes) {
                window.state.customBrushes = [];
            }
            window.state.customBrushes.push(preset);
            
            // Save to localStorage
            if (typeof saveBrushPresetsToStorage === 'function') {
                saveBrushPresetsToStorage();
            }
            
            // Update brush preset dropdown if it exists
            const brushPresetSelect = document.getElementById('brush-preset');
            if (brushPresetSelect) {
                const option = document.createElement('option');
                option.value = brushName;
                option.textContent = brushName;
                brushPresetSelect.appendChild(option);
            }
            
            alert(`Brush "${brushName}" saved successfully to ${saveLocation}!`);
        } else {
            alert('Unable to save brush. Please ensure the application is fully loaded.');
        }
    }
    
    serializeGraph() {
        return {
            nodes: this.nodes.map(n => ({
                id: n.id,
                type: n.type,
                x: n.x,
                y: n.y,
                parameters: n.parameters
            })),
            connections: this.connections
        };
    }
    
    loadGraph(graphData) {
        this.clearAll();
        
        // Recreate nodes
        graphData.nodes.forEach(nodeData => {
            const node = this.createNode(nodeData.type, nodeData.x, nodeData.y);
            node.id = nodeData.id;
            node.parameters = { ...nodeData.parameters };
            
            // Update parameter controls
            const paramInputs = node.element.querySelectorAll('.node-parameter input');
            paramInputs.forEach(input => {
                const key = input.previousElementSibling.textContent.toLowerCase().replace(/\s/g, '');
                if (node.parameters[key] !== undefined) {
                    input.value = node.parameters[key];
                }
            });
        });
        
        // Recreate connections
        graphData.connections.forEach(conn => {
            this.connections.push(conn);
        });
        
        this.updateConnections();
        this.updateBrushPreview();
    }
    
    clearAll() {
        this.nodes.forEach(node => {
            node.element.remove();
        });
        this.nodes = [];
        this.connections = [];
        this.selectedNode = null;
        this.connectionsSvg.innerHTML = '';
        
        // Recreate default setup
        this.createDefaultSetup();
        this.updateBrushPreview();
        this.updateStats();
    }
    
    filterNodes(searchTerm) {
        const term = searchTerm.toLowerCase();
        const categories = document.querySelectorAll('.node-category');
        
        categories.forEach(category => {
            const buttons = category.querySelectorAll('.node-type-btn');
            let categoryHasVisible = false;
            
            buttons.forEach(btn => {
                const nodeType = btn.getAttribute('data-node-type');
                const displayName = this.getNodeDisplayName(nodeType).toLowerCase();
                
                if (displayName.includes(term) || nodeType.includes(term)) {
                    btn.style.display = 'flex';
                    categoryHasVisible = true;
                } else {
                    btn.style.display = 'none';
                }
            });
            
            // Hide category header if no visible buttons
            const header = category.querySelector('h4');
            if (header) {
                header.style.display = categoryHasVisible ? 'block' : 'none';
            }
        });
    }
    
    copyNode(node) {
        this.copiedNode = {
            type: node.type,
            parameters: { ...node.parameters }
        };
        console.log('Node copied:', this.copiedNode);
    }
    
    pasteNode() {
        if (!this.copiedNode) return;
        
        const x = -this.canvas.offsetX + 300 + Math.random() * 50;
        const y = -this.canvas.offsetY + 200 + Math.random() * 50;
        const newNode = this.createNode(this.copiedNode.type, x, y);
        newNode.parameters = { ...this.copiedNode.parameters };
        
        // Update parameter controls
        this.updateNodeParameterControls(newNode);
        this.updateBrushPreview();
    }
    
    duplicateNode(node) {
        this.copyNode(node);
        this.pasteNode();
    }
    
    updateNodeParameterControls(node) {
        const paramInputs = node.element.querySelectorAll('.node-parameter input');
        paramInputs.forEach(input => {
            const label = input.previousElementSibling;
            if (!label) return;
            
            const key = label.textContent.toLowerCase().replace(/\s/g, '');
            const paramKeys = Object.keys(node.parameters);
            
            for (let paramKey of paramKeys) {
                if (paramKey.toLowerCase().includes(key) || key.includes(paramKey.toLowerCase())) {
                    if (input.type === 'range' || input.type === 'number') {
                        input.value = node.parameters[paramKey];
                        const valueDisplay = input.nextElementSibling;
                        if (valueDisplay && valueDisplay.classList.contains('node-parameter-value')) {
                            valueDisplay.textContent = node.parameters[paramKey];
                        }
                    } else if (input.type === 'color') {
                        input.value = node.parameters[paramKey];
                    }
                    break;
                }
            }
        });
    }
    
    zoomIn() {
        this.canvas.zoom = Math.min(this.canvas.zoom * 1.2, 3);
        this.updateZoom();
    }
    
    zoomOut() {
        this.canvas.zoom = Math.max(this.canvas.zoom / 1.2, 0.25);
        this.updateZoom();
    }
    
    resetZoom() {
        this.canvas.zoom = 1;
        this.canvas.offsetX = 0;
        this.canvas.offsetY = 0;
        this.updateZoom();
    }
    
    updateZoom() {
        this.nodeCanvas.style.transform = `translate(${this.canvas.offsetX}px, ${this.canvas.offsetY}px) scale(${this.canvas.zoom})`;
        this.updateConnections();
        
        // Update zoom level display
        const zoomLevel = document.getElementById('node-zoom-level');
        if (zoomLevel) {
            zoomLevel.textContent = Math.round(this.canvas.zoom * 100) + '%';
        }
    }
    
    updateStats() {
        const statsElement = document.getElementById('node-stats');
        if (statsElement) {
            const nodeCount = this.nodes.length;
            const connectionCount = this.connections.length;
            statsElement.textContent = `v2.0 | ${nodeCount} nodes | ${connectionCount} connections`;
        }
    }
    
    exportGraph() {
        const graphData = this.serializeGraph();
        const json = JSON.stringify(graphData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'brush-node-graph.json';
        a.click();
        URL.revokeObjectURL(url);
    }
    
    importGraph() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const graphData = JSON.parse(event.target.result);
                        this.loadGraph(graphData);
                        alert('Node graph imported successfully!');
                    } catch (error) {
                        alert('Error importing node graph: ' + error.message);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }
    
    loadTemplate(templateName) {
        if (!confirm('This will clear the current node graph. Continue?')) {
            return;
        }
        
        this.clearAll();
        
        switch (templateName) {
            case 'pressure-sensitive':
                this.createPressureSensitiveTemplate();
                break;
            case 'scattered-airbrush':
                this.createScatteredAirbrushTemplate();
                break;
            case 'textured-brush':
                this.createTexturedBrushTemplate();
                break;
            case 'color-dynamic':
                this.createColorDynamicTemplate();
                break;
            case 'watercolor':
                this.createWatercolorTemplate();
                break;
            case 'oil-paint':
                this.createOilPaintTemplate();
                break;
            case 'ink-pen':
                this.createInkPenTemplate();
                break;
            case 'spray-paint':
                this.createSprayPaintTemplate();
                break;
            case 'charcoal':
                this.createCharcoalTemplate();
                break;
            case 'particle-spray':
                this.createParticleSprayTemplate();
                break;
        }
        
        this.updateBrushPreview();
    }
    
    createPressureSensitiveTemplate() {
        const pressureNode = this.createNode('pressure-input', 200, 150);
        const sizeNode = this.createNode('size', 400, 150);
        const opacityNode = this.createNode('opacity', 400, 250);
        const outputNode = this.nodes.find(n => n.type === 'brush-output');
        
        this.createConnection(pressureNode.id, 0, sizeNode.id, 0);
        this.createConnection(pressureNode.id, 0, opacityNode.id, 0);
        this.createConnection(sizeNode.id, 0, outputNode.id, 0);
        this.createConnection(opacityNode.id, 0, outputNode.id, 1);
    }
    
    createScatteredAirbrushTemplate() {
        const sizeNode = this.createNode('size', 200, 150);
        sizeNode.parameters.baseSize = 30;
        const opacityNode = this.createNode('opacity', 200, 250);
        opacityNode.parameters.baseOpacity = 40;
        const scatterNode = this.createNode('scatter', 400, 150);
        scatterNode.parameters.scatterX = 30;
        scatterNode.parameters.scatterY = 30;
        const outputNode = this.nodes.find(n => n.type === 'brush-output');
        
        this.createConnection(sizeNode.id, 0, outputNode.id, 0);
        this.createConnection(opacityNode.id, 0, outputNode.id, 1);
        this.createConnection(scatterNode.id, 0, outputNode.id, 4);
        this.createConnection(scatterNode.id, 1, outputNode.id, 5);
    }
    
    createTexturedBrushTemplate() {
        const sizeNode = this.createNode('size', 200, 150);
        const hardnessNode = this.createNode('hardness', 200, 250);
        hardnessNode.parameters.hardness = 60;
        const rotationNode = this.createNode('rotation', 400, 150);
        rotationNode.parameters.jitter = 45;
        const outputNode = this.nodes.find(n => n.type === 'brush-output');
        
        this.createConnection(sizeNode.id, 0, outputNode.id, 0);
        this.createConnection(hardnessNode.id, 0, outputNode.id, 2);
        this.createConnection(rotationNode.id, 0, outputNode.id, 6);
    }
    
    createColorDynamicTemplate() {
        const colorNode = this.createNode('color-input', 200, 150);
        const colorVarNode = this.createNode('color-variation', 400, 150);
        colorVarNode.parameters.hueJitter = 15;
        colorVarNode.parameters.satJitter = 10;
        const sizeNode = this.createNode('size', 200, 300);
        const outputNode = this.nodes.find(n => n.type === 'brush-output');
        
        this.createConnection(colorNode.id, 0, colorVarNode.id, 0);
        this.createConnection(colorVarNode.id, 0, outputNode.id, 7);
        this.createConnection(sizeNode.id, 0, outputNode.id, 0);
        
        this.updateNodeParameterControls(colorVarNode);
        this.updateNodeParameterControls(sizeNode);
    }
    
    createWatercolorTemplate() {
        const pressureNode = this.createNode('pressure-input', 150, 150);
        const sizeNode = this.createNode('size', 300, 120);
        sizeNode.parameters.baseSize = 35;
        const opacityNode = this.createNode('opacity', 300, 220);
        opacityNode.parameters.baseOpacity = 60;
        const watercolorNode = this.createNode('watercolor-edge', 450, 170);
        watercolorNode.parameters.edgeDarkness = 60;
        watercolorNode.parameters.wetness = 80;
        const outputNode = this.nodes.find(n => n.type === 'brush-output');
        
        this.createConnection(pressureNode.id, 0, sizeNode.id, 0);
        this.createConnection(pressureNode.id, 0, opacityNode.id, 0);
        this.createConnection(sizeNode.id, 0, outputNode.id, 0);
        this.createConnection(opacityNode.id, 0, outputNode.id, 1);
        
        this.updateNodeParameterControls(sizeNode);
        this.updateNodeParameterControls(opacityNode);
        this.updateNodeParameterControls(watercolorNode);
    }
    
    createOilPaintTemplate() {
        const sizeNode = this.createNode('size', 200, 120);
        sizeNode.parameters.baseSize = 25;
        const opacityNode = this.createNode('opacity', 200, 220);
        opacityNode.parameters.baseOpacity = 90;
        const impastoNode = this.createNode('impasto', 380, 150);
        impastoNode.parameters.thickness = 70;
        impastoNode.parameters.texture = 80;
        const wetMixNode = this.createNode('wet-mix', 380, 270);
        wetMixNode.parameters.wetness = 40;
        wetMixNode.parameters.bleed = 25;
        const outputNode = this.nodes.find(n => n.type === 'brush-output');
        
        this.createConnection(sizeNode.id, 0, outputNode.id, 0);
        this.createConnection(opacityNode.id, 0, outputNode.id, 1);
        
        this.updateNodeParameterControls(sizeNode);
        this.updateNodeParameterControls(opacityNode);
        this.updateNodeParameterControls(impastoNode);
        this.updateNodeParameterControls(wetMixNode);
    }
    
    createInkPenTemplate() {
        const pressureNode = this.createNode('pressure-input', 150, 150);
        const sizeNode = this.createNode('size', 300, 120);
        sizeNode.parameters.baseSize = 8;
        const opacityNode = this.createNode('opacity', 300, 220);
        opacityNode.parameters.baseOpacity = 100;
        const hardnessNode = this.createNode('hardness', 450, 170);
        hardnessNode.parameters.hardness = 100;
        const flowNode = this.createNode('flow', 450, 270);
        flowNode.parameters.flow = 90;
        const outputNode = this.nodes.find(n => n.type === 'brush-output');
        
        this.createConnection(pressureNode.id, 0, sizeNode.id, 0);
        this.createConnection(pressureNode.id, 0, opacityNode.id, 0);
        this.createConnection(sizeNode.id, 0, outputNode.id, 0);
        this.createConnection(opacityNode.id, 0, outputNode.id, 1);
        this.createConnection(hardnessNode.id, 0, outputNode.id, 2);
        this.createConnection(flowNode.id, 0, outputNode.id, 3);
        
        this.updateNodeParameterControls(sizeNode);
        this.updateNodeParameterControls(opacityNode);
        this.updateNodeParameterControls(hardnessNode);
        this.updateNodeParameterControls(flowNode);
    }
    
    createSprayPaintTemplate() {
        const sizeNode = this.createNode('size', 200, 100);
        sizeNode.parameters.baseSize = 40;
        const opacityNode = this.createNode('opacity', 200, 200);
        opacityNode.parameters.baseOpacity = 30;
        const scatterNode = this.createNode('scatter', 380, 100);
        scatterNode.parameters.scatterX = 50;
        scatterNode.parameters.scatterY = 50;
        const splatterNode = this.createNode('splatter', 380, 220);
        splatterNode.parameters.intensity = 40;
        splatterNode.parameters.count = 15;
        const outputNode = this.nodes.find(n => n.type === 'brush-output');
        
        this.createConnection(sizeNode.id, 0, outputNode.id, 0);
        this.createConnection(opacityNode.id, 0, outputNode.id, 1);
        this.createConnection(scatterNode.id, 0, outputNode.id, 4);
        this.createConnection(scatterNode.id, 1, outputNode.id, 5);
        
        this.updateNodeParameterControls(sizeNode);
        this.updateNodeParameterControls(opacityNode);
        this.updateNodeParameterControls(scatterNode);
        this.updateNodeParameterControls(splatterNode);
    }
    
    createCharcoalTemplate() {
        const pressureNode = this.createNode('pressure-input', 150, 150);
        const sizeNode = this.createNode('size', 300, 100);
        sizeNode.parameters.baseSize = 30;
        const opacityNode = this.createNode('opacity', 300, 200);
        opacityNode.parameters.baseOpacity = 70;
        const hardnessNode = this.createNode('hardness', 450, 100);
        hardnessNode.parameters.hardness = 40;
        const jitterNode = this.createNode('jitter', 450, 200);
        jitterNode.parameters.amount = 30;
        const outputNode = this.nodes.find(n => n.type === 'brush-output');
        
        this.createConnection(pressureNode.id, 0, sizeNode.id, 0);
        this.createConnection(pressureNode.id, 0, opacityNode.id, 0);
        this.createConnection(sizeNode.id, 0, outputNode.id, 0);
        this.createConnection(opacityNode.id, 0, outputNode.id, 1);
        this.createConnection(hardnessNode.id, 0, outputNode.id, 2);
        
        this.updateNodeParameterControls(sizeNode);
        this.updateNodeParameterControls(opacityNode);
        this.updateNodeParameterControls(hardnessNode);
        this.updateNodeParameterControls(jitterNode);
    }
    
    createParticleSprayTemplate() {
        const particleEmitter = this.createNode('particle-emitter', 200, 120);
        particleEmitter.parameters.rate = 20;
        particleEmitter.parameters.size = 3;
        particleEmitter.parameters.spread = 60;
        const particleVelocity = this.createNode('particle-velocity', 380, 100);
        particleVelocity.parameters.speed = 60;
        particleVelocity.parameters.randomness = 40;
        const particleLifetime = this.createNode('particle-lifetime', 380, 220);
        particleLifetime.parameters.lifetime = 80;
        particleLifetime.parameters.variation = 30;
        const outputNode = this.nodes.find(n => n.type === 'brush-output');
        
        this.updateNodeParameterControls(particleEmitter);
        this.updateNodeParameterControls(particleVelocity);
        this.updateNodeParameterControls(particleLifetime);
    }
    
    show() {
        this.window.classList.add('visible');
        this.updateBrushPreview();
    }
    
    hide() {
        this.window.classList.remove('visible');
    }
    
    // Helper methods for advanced node operations
    interpolateColor(color1, color2, factor) {
        const c1 = this.hexToRgb(color1);
        const c2 = this.hexToRgb(color2);
        const r = Math.round(c1.r + (c2.r - c1.r) * factor);
        const g = Math.round(c1.g + (c2.g - c1.g) * factor);
        const b = Math.round(c1.b + (c2.b - c1.b) * factor);
        return this.rgbToHex(r, g, b);
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }
    
    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    
    rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const d = max - min;
        const s = max === 0 ? 0 : d / max;
        const v = max;
        let h = 0;
        
        if (max !== min) {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        
        return { h: h * 360, s: s * 100, v: v * 100 };
    }
    
    hsvToRgb(h, s, v) {
        h /= 360; s /= 100; v /= 100;
        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);
        let r, g, b;
        
        switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
        }
        
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }
    
    adjustHSV(color, hueShift, satShift, valShift) {
        const rgb = this.hexToRgb(color);
        const hsv = this.rgbToHsv(rgb.r, rgb.g, rgb.b);
        hsv.h = (hsv.h + hueShift) % 360;
        hsv.s = Math.max(0, Math.min(100, hsv.s + satShift));
        hsv.v = Math.max(0, Math.min(100, hsv.v + valShift));
        const newRgb = this.hsvToRgb(hsv.h, hsv.s, hsv.v);
        return this.rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    }
    
    varyColor(color, hueJitter, satJitter, brightJitter) {
        const rgb = this.hexToRgb(color);
        const hsv = this.rgbToHsv(rgb.r, rgb.g, rgb.b);
        hsv.h = (hsv.h + (Math.random() - 0.5) * hueJitter) % 360;
        hsv.s = Math.max(0, Math.min(100, hsv.s + (Math.random() - 0.5) * satJitter));
        hsv.v = Math.max(0, Math.min(100, hsv.v + (Math.random() - 0.5) * brightJitter));
        const newRgb = this.hsvToRgb(hsv.h, hsv.s, hsv.v);
        return this.rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    }
    
    mixColors(color1, color2, factor) {
        const c1 = this.hexToRgb(color1);
        const c2 = this.hexToRgb(color2);
        const r = Math.round(c1.r * (1 - factor) + c2.r * factor);
        const g = Math.round(c1.g * (1 - factor) + c2.g * factor);
        const b = Math.round(c1.b * (1 - factor) + c2.b * factor);
        return this.rgbToHex(r, g, b);
    }
    
    evaluateColorRamp(params, position) {
        const stops = params.stops || 3;
        if (stops === 2) {
            return this.interpolateColor(params.color1, params.color2, position);
        } else if (stops === 3) {
            if (position < 0.5) {
                return this.interpolateColor(params.color1, params.color2, position * 2);
            } else {
                return this.interpolateColor(params.color2, params.color3, (position - 0.5) * 2);
            }
        }
        return params.color1 || '#000000';
    }
    
    applyCurve(input, curveType, strength) {
        const normalized = input / 100;
        let output = normalized;
        
        switch (curveType) {
            case 'linear':
                output = normalized;
                break;
            case 'ease-in':
                output = normalized * normalized;
                break;
            case 'ease-out':
                output = 1 - (1 - normalized) * (1 - normalized);
                break;
            case 'ease-in-out':
                output = normalized < 0.5 
                    ? 2 * normalized * normalized 
                    : 1 - Math.pow(-2 * normalized + 2, 2) / 2;
                break;
            case 'exponential':
                output = Math.pow(normalized, 2 + strength / 50);
                break;
        }
        
        return output * 100;
    }
    
    perlinNoise(scale, octaves, persistence) {
        // Simple pseudo-random noise generator
        // In a real implementation, use a proper Perlin/Simplex noise library
        let total = 0;
        let frequency = scale;
        let amplitude = 1;
        let maxValue = 0;
        
        for (let i = 0; i < octaves; i++) {
            const x = Date.now() / 1000 * frequency;
            const y = Math.sin(x) * Math.cos(x * 1.3) + Math.sin(x * 0.7);
            total += y * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }
        
        return (total / maxValue + 1) / 2; // Normalize to 0-1
    }
    
    // New methods for v3.0 features
    
    saveState() {
        const state = this.serializeGraph();
        this.undoStack.push(JSON.stringify(state));
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift();
        }
        this.redoStack = []; // Clear redo stack on new action
        this.updateUndoRedoButtons();
    }
    
    undo() {
        if (this.undoStack.length === 0) return;
        
        const currentState = this.serializeGraph();
        this.redoStack.push(JSON.stringify(currentState));
        
        const previousState = this.undoStack.pop();
        this.loadGraph(JSON.parse(previousState));
        this.updateUndoRedoButtons();
    }
    
    redo() {
        if (this.redoStack.length === 0) return;
        
        const currentState = this.serializeGraph();
        this.undoStack.push(JSON.stringify(currentState));
        
        const nextState = this.redoStack.pop();
        this.loadGraph(JSON.parse(nextState));
        this.updateUndoRedoButtons();
    }
    
    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('node-undo');
        const redoBtn = document.getElementById('node-redo');
        
        if (undoBtn) {
            undoBtn.disabled = this.undoStack.length === 0;
        }
        if (redoBtn) {
            redoBtn.disabled = this.redoStack.length === 0;
        }
    }
    
    autoArrangeNodes() {
        // Simple auto-arrange algorithm - arrange nodes in columns by type
        const nodesByType = new Map();
        
        this.nodes.forEach(node => {
            if (!nodesByType.has(node.type)) {
                nodesByType.set(node.type, []);
            }
            nodesByType.get(node.type).push(node);
        });
        
        let currentX = 200;
        let currentY = 150;
        const columnWidth = 250;
        const rowHeight = 120;
        
        nodesByType.forEach((nodes, type) => {
            nodes.forEach((node, index) => {
                node.x = currentX;
                node.y = currentY + (index * rowHeight);
                this.updateNodePosition(node);
            });
            currentX += columnWidth;
        });
        
        this.updateConnections();
        this.updateBrushPreview();
    }
    
    selectAll() {
        this.nodes.forEach(node => {
            node.element.classList.add('selected');
            this.selectedNodes.add(node);
        });
    }
    
    showContextMenu(x, y) {
        // Create context menu if it doesn't exist
        let menu = document.getElementById('node-context-menu');
        if (!menu) {
            menu = document.createElement('div');
            menu.id = 'node-context-menu';
            menu.className = 'context-menu';
            menu.innerHTML = `
                <div class="context-menu-item" data-action="paste">Paste Node (Ctrl+V)</div>
                <div class="context-menu-item" data-action="delete">Delete Selected (Del)</div>
                <div class="context-menu-divider"></div>
                <div class="context-menu-item" data-action="align-left">Align Left</div>
                <div class="context-menu-item" data-action="align-right">Align Right</div>
                <div class="context-menu-item" data-action="align-top">Align Top</div>
                <div class="context-menu-item" data-action="align-bottom">Align Bottom</div>
                <div class="context-menu-divider"></div>
                <div class="context-menu-item" data-action="auto-arrange">Auto-Arrange All</div>
            `;
            document.body.appendChild(menu);
            
            // Handle menu item clicks
            menu.addEventListener('click', (e) => {
                if (e.target.classList.contains('context-menu-item')) {
                    const action = e.target.dataset.action;
                    this.handleContextMenuAction(action);
                    this.hideContextMenu();
                }
            });
            
            // Hide menu when clicking elsewhere
            document.addEventListener('click', () => {
                this.hideContextMenu();
            }, { once: true });
        }
        
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.style.display = 'block';
    }
    
    hideContextMenu() {
        const menu = document.getElementById('node-context-menu');
        if (menu) {
            menu.style.display = 'none';
        }
    }
    
    handleContextMenuAction(action) {
        switch (action) {
            case 'paste':
                if (this.copiedNode) {
                    this.saveState();
                    this.pasteNode();
                }
                break;
            case 'delete':
                if (this.selectedNode) {
                    this.saveState();
                    this.deleteNode(this.selectedNode.id);
                }
                break;
            case 'align-left':
                this.alignNodes('left');
                break;
            case 'align-right':
                this.alignNodes('right');
                break;
            case 'align-top':
                this.alignNodes('top');
                break;
            case 'align-bottom':
                this.alignNodes('bottom');
                break;
            case 'auto-arrange':
                this.autoArrangeNodes();
                break;
        }
    }
    
    alignNodes(direction) {
        if (this.selectedNodes.size < 2) return;
        
        const nodes = Array.from(this.selectedNodes);
        let value;
        
        switch (direction) {
            case 'left':
                value = Math.min(...nodes.map(n => n.x));
                nodes.forEach(n => {
                    n.x = value;
                    this.updateNodePosition(n);
                });
                break;
            case 'right':
                value = Math.max(...nodes.map(n => n.x));
                nodes.forEach(n => {
                    n.x = value;
                    this.updateNodePosition(n);
                });
                break;
            case 'top':
                value = Math.min(...nodes.map(n => n.y));
                nodes.forEach(n => {
                    n.y = value;
                    this.updateNodePosition(n);
                });
                break;
            case 'bottom':
                value = Math.max(...nodes.map(n => n.y));
                nodes.forEach(n => {
                    n.y = value;
                    this.updateNodePosition(n);
                });
                break;
        }
        
        this.updateConnections();
    }
    
    clearPreview() {
        const rect = this.previewCanvas.getBoundingClientRect();
        this.previewCtx.fillStyle = '#ffffff';
        this.previewCtx.fillRect(0, 0, rect.width, rect.height);
    }
    
    testBrushPreview() {
        this.clearPreview();
        const brush = this.evaluateGraph();
        const rect = this.previewCanvas.getBoundingClientRect();
        
        const mode = document.getElementById('preview-mode').value;
        
        switch (mode) {
            case 'stroke':
                this.drawTestStroke(brush, rect);
                break;
            case 'dots':
                this.drawTestDots(brush, rect);
                break;
            case 'spiral':
                this.drawTestSpiral(brush, rect);
                break;
        }
        
        this.updateBrushStats(brush);
    }
    
    drawTestStroke(brush, rect) {
        this.previewCtx.globalAlpha = (brush.opacity || 100) / 100;
        this.previewCtx.fillStyle = brush.color || '#000000';
        
        const centerY = rect.height / 2;
        const startX = 20;
        const endX = rect.width - 20;
        
        for (let x = startX; x < endX; x += 5) {
            const y = centerY + Math.sin((x - startX) / 30) * 20;
            this.previewCtx.beginPath();
            this.previewCtx.arc(x, y, (brush.size || 20) / 2, 0, Math.PI * 2);
            this.previewCtx.fill();
        }
    }
    
    drawTestDots(brush, rect) {
        this.previewCtx.globalAlpha = (brush.opacity || 100) / 100;
        this.previewCtx.fillStyle = brush.color || '#000000';
        
        for (let i = 0; i < 20; i++) {
            const x = 30 + Math.random() * (rect.width - 60);
            const y = 30 + Math.random() * (rect.height - 60);
            this.previewCtx.beginPath();
            this.previewCtx.arc(x, y, (brush.size || 20) / 2, 0, Math.PI * 2);
            this.previewCtx.fill();
        }
    }
    
    drawTestSpiral(brush, rect) {
        this.previewCtx.globalAlpha = (brush.opacity || 100) / 100;
        this.previewCtx.fillStyle = brush.color || '#000000';
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const maxRadius = Math.min(rect.width, rect.height) / 2 - 20;
        
        for (let angle = 0; angle < Math.PI * 6; angle += 0.2) {
            const radius = (angle / (Math.PI * 6)) * maxRadius;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            this.previewCtx.beginPath();
            this.previewCtx.arc(x, y, (brush.size || 20) / 2, 0, Math.PI * 2);
            this.previewCtx.fill();
        }
    }
    
    updateBrushStats(brush) {
        const statsElement = document.getElementById('brush-stats');
        if (statsElement) {
            statsElement.textContent = `Size: ${Math.round(brush.size)}px | Opacity: ${Math.round(brush.opacity)}% | Flow: ${Math.round(brush.flow)}%`;
        }
    }
    
    applyToCurrentBrush() {
        const brush = this.evaluateGraph();
        alert(`Brush applied!\nSize: ${Math.round(brush.size)}px\nOpacity: ${Math.round(brush.opacity)}%\nHardness: ${Math.round(brush.hardness)}%`);
        // In a real implementation, this would update the current brush in the main application
    }
    
    filterNodesByCategory(category) {
        const categories = document.querySelectorAll('.node-category');
        
        categories.forEach(cat => {
            const buttons = cat.querySelectorAll('.node-type-btn:not(.template-btn)');
            let shouldShow = false;
            
            buttons.forEach(btn => {
                const nodeType = btn.getAttribute('data-node-type');
                
                if (category === 'all') {
                    btn.style.display = 'flex';
                    shouldShow = true;
                } else if (category === 'favorites' && this.favoriteNodes.has(nodeType)) {
                    btn.style.display = 'flex';
                    shouldShow = true;
                } else if (category === 'recent') {
                    // TODO: Track recently used nodes
                    btn.style.display = 'none';
                } else {
                    btn.style.display = 'none';
                }
            });
            
            // Show/hide category header
            const header = cat.querySelector('h4');
            if (header && category !== 'all') {
                header.style.display = shouldShow ? 'block' : 'none';
            } else if (header) {
                header.style.display = 'block';
            }
        });
    }
    
    showKeyboardShortcuts() {
        const helpWindow = document.createElement('div');
        helpWindow.className = 'help-overlay';
        helpWindow.innerHTML = `
            <div class="help-content">
                <div class="help-header">
                    <h3>⌨️ Keyboard Shortcuts</h3>
                    <button class="help-close">✕</button>
                </div>
                <div class="help-body">
                    <div class="shortcut-section">
                        <h4>General</h4>
                        <div class="shortcut"><kbd>Ctrl</kbd> + <kbd>Z</kbd> <span>Undo</span></div>
                        <div class="shortcut"><kbd>Ctrl</kbd> + <kbd>Y</kbd> <span>Redo</span></div>
                        <div class="shortcut"><kbd>Ctrl</kbd> + <kbd>A</kbd> <span>Select All</span></div>
                        <div class="shortcut"><kbd>Esc</kbd> <span>Deselect</span></div>
                        <div class="shortcut"><kbd>F1</kbd> <span>Show Help</span></div>
                    </div>
                    <div class="shortcut-section">
                        <h4>Nodes</h4>
                        <div class="shortcut"><kbd>Ctrl</kbd> + <kbd>C</kbd> <span>Copy Node</span></div>
                        <div class="shortcut"><kbd>Ctrl</kbd> + <kbd>V</kbd> <span>Paste Node</span></div>
                        <div class="shortcut"><kbd>Ctrl</kbd> + <kbd>D</kbd> <span>Duplicate Node</span></div>
                        <div class="shortcut"><kbd>Del</kbd> <span>Delete Node</span></div>
                    </div>
                    <div class="shortcut-section">
                        <h4>Navigation</h4>
                        <div class="shortcut"><kbd>Ctrl</kbd> + <kbd>Wheel</kbd> <span>Zoom</span></div>
                        <div class="shortcut"><kbd>Middle Mouse</kbd> <span>Pan Canvas</span></div>
                        <div class="shortcut"><kbd>Shift</kbd> + <kbd>Drag</kbd> <span>Box Select</span></div>
                    </div>
                    <div class="shortcut-section">
                        <h4>Other</h4>
                        <div class="shortcut">Right-click on canvas <span>Context Menu</span></div>
                        <div class="shortcut">Drag from palette <span>Drop to Create</span></div>
                        <div class="shortcut">Click connection <span>Delete Connection</span></div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(helpWindow);
        
        // Close button
        helpWindow.querySelector('.help-close').addEventListener('click', () => {
            helpWindow.remove();
        });
        
        // Click outside to close
        helpWindow.addEventListener('click', (e) => {
            if (e.target === helpWindow) {
                helpWindow.remove();
            }
        });
    }
}

// Export for global use
if (typeof window !== 'undefined') {
    window.NodeEditor = NodeEditor;
}
