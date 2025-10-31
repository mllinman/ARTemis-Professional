// Browser compatibility layer - works standalone without Electron
const ipcRenderer = {
    invoke: async (channel, ...args) => {
        // Polyfill for Electron IPC in browser environment
        if (typeof require !== 'undefined') {
            // Running in Electron
            const { ipcRenderer: electronIpc } = require('electron');
            return electronIpc.invoke(channel, ...args);
        }
        // Running in browser - use browser APIs
        return browserFileOperations(channel, ...args);
    },
    on: (channel, callback) => {
        if (typeof require !== 'undefined') {
            const { ipcRenderer: electronIpc } = require('electron');
            electronIpc.on(channel, callback);
        } else {
            // In browser, register event listeners for menu simulation
            browserMenuSystem.on(channel, callback);
        }
    },
    send: (channel, ...args) => {
        if (typeof require !== 'undefined') {
            const { ipcRenderer: electronIpc } = require('electron');
            electronIpc.send(channel, ...args);
        }
        // In browser, no-op or handle differently
    }
};

// Browser file operations using File System Access API with fallback
async function browserFileOperations(channel, ...args) {
    switch (channel) {
        case 'show-save-dialog': {
            const options = args[0];
            try {
                // Try File System Access API (Chrome/Edge)
                if ('showSaveFilePicker' in window) {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: options.defaultPath || 'untitled',
                        types: options.filters ? options.filters.map(f => ({
                            description: f.name,
                            accept: { ['application/octet-stream']: f.extensions.map(e => '.' + e) }
                        })) : []
                    });
                    return { canceled: false, filePath: handle.name, fileHandle: handle };
                }
            } catch (err) {
                if (err.name === 'AbortError') {
                    return { canceled: true };
                }
                throw err;
            }
            // Fallback: return filename for download
            return { canceled: false, filePath: options.defaultPath || 'untitled', useDownload: true };
        }
        
        case 'show-open-dialog': {
            const options = args[0];
            return new Promise((resolve) => {
                const input = document.createElement('input');
                input.type = 'file';
                if (options.filters) {
                    const accept = options.filters.flatMap(f => f.extensions.map(e => '.' + e)).join(',');
                    input.accept = accept;
                }
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        // Check if it's likely a binary file (image) or text file (project)
                        const isBinary = file.type.startsWith('image/') || 
                                        file.name.match(/\.(png|jpg|jpeg|gif|bmp|webp|tiff|tif|psd|exr)$/i);
                        
                        if (isBinary) {
                            // For binary/image files, pass the file object itself
                            const dataUrl = await new Promise((res) => {
                                const reader = new FileReader();
                                reader.onload = (ev) => res(ev.target.result);
                                reader.readAsDataURL(file);
                            });
                            resolve({ canceled: false, filePaths: [file.name], fileContent: dataUrl, file: file });
                        } else {
                            // For text files (like .artemis projects), read as text
                            const content = await file.text();
                            resolve({ canceled: false, filePaths: [file.name], fileContent: content, file: file });
                        }
                    } else {
                        resolve({ canceled: true });
                    }
                };
                input.click();
            });
        }
        
        case 'save-file': {
            const [filePath, content] = args;
            try {
                if (filePath.fileHandle) {
                    // Use File System Access API
                    const writable = await filePath.fileHandle.createWritable();
                    await writable.write(content);
                    await writable.close();
                    return { success: true };
                }
            } catch (err) {
                console.error('File save error:', err);
            }
            // Fallback: trigger download
            const blob = new Blob([content], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = typeof filePath === 'string' ? filePath : 'download';
            a.click();
            URL.revokeObjectURL(url);
            return { success: true };
        }
        
        case 'read-file': {
            const filePath = args[0];
            if (filePath.fileContent !== undefined) {
                return { success: true, content: filePath.fileContent };
            }
            return { success: false, error: 'File content not available' };
        }
        
        case 'save-binary-file': {
            const [filePath, base64Data] = args;
            try {
                if (filePath.fileHandle) {
                    // Use File System Access API
                    const writable = await filePath.fileHandle.createWritable();
                    const bytes = atob(base64Data);
                    const buffer = new Uint8Array(bytes.length);
                    for (let i = 0; i < bytes.length; i++) {
                        buffer[i] = bytes.charCodeAt(i);
                    }
                    await writable.write(buffer);
                    await writable.close();
                    return { success: true };
                }
            } catch (err) {
                console.error('Binary file save error:', err);
            }
            // Fallback: trigger download
            const binary = atob(base64Data);
            const array = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                array[i] = binary.charCodeAt(i);
            }
            const blob = new Blob([array], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = typeof filePath === 'string' ? filePath : 'export.png';
            a.click();
            URL.revokeObjectURL(url);
            return { success: true };
        }
        
        default:
            console.warn('Unhandled IPC channel:', channel);
            return null;
    }
}

// Browser menu system for keyboard shortcuts
const browserMenuSystem = {
    listeners: {},
    on: function(channel, callback) {
        if (!this.listeners[channel]) {
            this.listeners[channel] = [];
        }
        this.listeners[channel].push(callback);
    },
    trigger: function(channel) {
        if (this.listeners[channel]) {
            this.listeners[channel].forEach(callback => callback());
        }
    }
};

// Application State
const state = {
    canvas: {
        width: 3300,  // 11 inches at 300 DPI
        height: 5100, // 17 inches at 300 DPI
        zoom: 1,
        offsetX: 0,
        offsetY: 0
    },
    tool: 'brush',
    brush: {
        size: 20,
        opacity: 100,
        hardness: 80,
        pressureOpacity: true,
        pressureSize: true,
        flow: 100,           // Build-up/flow for natural painting
        spacing: 10,         // Spacing between brush dabs (%)
        smoothing: 0,        // Stroke smoothing/stabilization (0-100)
        smoothingMode: 'basic', // Smoothing algorithm: 'basic', 'weighted', 'stabilizer'
        angle: 0,            // Brush rotation angle (degrees)
        angleJitter: 0,      // Random angle variation
        scatterX: 0,         // Horizontal scatter
        scatterY: 0,         // Vertical scatter
        mixMode: 'normal',   // Blending mode
        // Advanced brush dynamics
        velocitySize: 0,     // Velocity affects size (0-100%)
        velocityOpacity: 0,  // Velocity affects opacity (0-100%)
        velocitySpacing: 0,  // Velocity affects spacing (0-100%)
        tiltAngle: 0,        // Pen tilt affects angle (0-100%)
        tiltSize: 0,         // Pen tilt affects size (0-100%)
        tiltOpacity: 0,      // Pen tilt affects opacity (0-100%)
        rotationMode: 'none', // 'none', 'drawing-angle', 'random', 'pen-rotation'
        textureEnabled: false, // Pattern overlay on strokes
        textureScale: 100,   // Texture scale percentage
        textureOpacity: 100, // Texture opacity
        textureRotation: 0,  // Texture rotation angle (0-360)
        texturePattern: null, // Pattern image data
        // ENHANCED: Advanced features for Painter/Krita-level control
        // Color Dynamics
        hueJitter: 0,        // Random hue variation (0-180 degrees)
        saturationJitter: 0, // Random saturation variation (0-100%)
        brightnessJitter: 0, // Random brightness variation (0-100%)
        colorMixing: 0,      // Pick up color from canvas (0-100%)
        // Dual Brush System
        dualBrushEnabled: false,
        dualBrushMode: 'multiply', // 'multiply', 'subtract', 'average', 'overlay'
        dualBrushSize: 50,   // Secondary brush size percentage
        dualBrushSpacing: 25, // Secondary brush spacing
        dualBrushScatter: 0, // Secondary brush scatter
        // Texture & Bristle Dynamics
        bristleCount: 1,     // Number of bristles (1-50)
        bristleLength: 0,    // Bristle length variation (0-100%)
        bristleStiffness: 100, // Bristle stiffness (0-100%)
        // Pressure Curve Customization
        pressureCurve: 'linear', // 'linear', 'ease-in', 'ease-out', 'ease-in-out', 'custom'
        pressureCurvePoints: [0, 0.25, 0.5, 0.75, 1], // Custom curve control points
        // Size & Opacity Dynamics
        sizeJitter: 0,       // Random size variation (0-100%)
        opacityJitter: 0,    // Random opacity variation (0-100%)
        minSize: 0,          // Minimum size percentage (0-100%)
        minOpacity: 0,       // Minimum opacity percentage (0-100%)
        // Blending & Color Pickup
        wetMixing: 0,        // Wet paint mixing simulation (0-100%)
        dilution: 0,         // Paint dilution with medium (0-100%)
        persistence: 100,    // How long paint stays wet (0-100%)
        bleedDistance: 0,    // How far paint bleeds (0-50 pixels)
        // Stroke Prediction & Smoothing
        predictionEnabled: true, // Enable stroke prediction for smoother lines
        predictionAmount: 0, // How far ahead to predict (0-100ms)
        catchupEnabled: true, // Gradually catch up to actual position
        catchupSpeed: 80,    // Speed of catchup (0-100%)
        // Pen/Tablet Advanced Support
        penRotationEnabled: false, // Use pen barrel rotation
        penRotationJitter: 0, // Add jitter to pen rotation (0-180)
        hoverPreview: true,  // Show brush preview on hover
        touchRejection: true, // Reject palm touches
        pressureCalibration: 1.0, // Pressure multiplier for calibration
        // Adaptive Quality
        adaptiveQuality: true, // Reduce quality for fast strokes
        qualityThreshold: 1.0, // Velocity threshold for quality reduction (px/ms)
        // Dynamic Brush Physics
        physicsEnabled: false, // Enable physics simulation
        drag: 0,              // Air resistance/drag (0-100%)
        mass: 50,             // Brush mass/weight (1-100)
        springTension: 50,    // Spring tension/stiffness (0-100%)
        springDamping: 50,    // Spring damping (0-100%)
        
        // CATEGORY 2: Advanced Brush & Paint Systems Features
        
        // Bristle Brush Physics (enhanced per-bristle simulation)
        bristleCollision: true,  // Per-bristle collision detection
        bristleSpread: 30,       // Bristle spread amount (0-100%)
        bristleClumping: 50,     // How bristles clump together (0-100%)
        bristleDeformation: true, // Enable natural bristle deformation
        paintLoadingPerBristle: true, // Individual bristle paint loading
        
        // Paint Mixing Engine
        paintMixingMode: 'RYB',  // 'RGB', 'RYB' (pigment-based)
        paintAmount: 100,        // Paint amount on brush (0-100%)
        muddyColorPrevention: true, // Prevent muddy color mixing
        wetInWetBlending: true,  // Wet-in-wet paint blending
        
        // Impasto/3D Paint
        impastoEnabled: false,   // Enable raised paint effect
        impastoHeight: 50,       // Paint thickness/height (0-100%)
        impastoNormalMap: true,  // Generate normal maps
        impastoLighting: true,   // Lighting-aware rendering
        paletteKnifeMode: false, // Scraping and palette knife effects
        
        // Advanced Wet Media
        paperAbsorption: 50,     // Paper absorption simulation (0-100%)
        colorBleeding: 30,       // Color bleeding amount (0-100%)
        colorBlooming: 20,       // Watercolor blooming effect (0-100%)
        dryingTime: 5000,        // Drying time in milliseconds
        granulationEffect: 20,   // Granulation for watercolor (0-100%)
        
        // Dry Media Simulation
        paperToothInteraction: true, // Paper texture interaction
        layerCoverage: 70,       // Coverage layering (0-100%)
        dryMediaBlending: true,  // Blending for charcoal/pastel
        fixativeEffect: false,   // Fixative layer locking
        
        // Advanced Texture Mapping
        multiLayerTexture: false, // Multiple texture layers
        animatedTexture: false,  // Animated texture support
        depthTexture: false,     // Depth-based texture
        proceduralTexture: false, // Procedural texture generation
        textureLayerCount: 1,    // Number of texture layers (1-5)
        
        // Brush Lighting Response
        metallicPaint: false,    // Metallic paint effects
        pearlescent: false,      // Pearlescent shimmer
        subsurfaceScattering: false, // Subsurface light scattering
        reflectivity: 0,         // Surface reflectivity (0-100%)
        
        // Multi-Tip Brushes
        multiTipEnabled: false,  // Enable multiple tips
        multiTipCount: 1,        // Number of tips (1-20)
        multiTipMode: 'splatter', // 'splatter', 'grass', 'particle', 'array'
        multiTipOffset: 10,      // Offset between tips (pixels)
        
        // Brush Deformation
        pressureDeformation: true, // Pressure-based shape changes
        velocityStretching: true,  // Velocity-based stretching
        directionSkewing: true,    // Direction-based skewing
        randomDeformation: 10,     // Random deformation (0-100%)
        
        // Expression-Based Dynamics
        customExpression: '',    // Custom mathematical expression
        expressionVariables: {}, // Variable values for expressions
        expressionCurveEditor: false, // Enable curve editor
        savedExpressions: [],    // Saved custom expressions
        
        // Brush Tags & Categories
        brushTags: [],           // Array of tags for organization
        brushCategory: 'general', // Category name
        brushFavorite: false,    // Is this a favorite brush
        brushRecent: false,      // Recently used brush
        
        // Brush Preview
        livePreview: true,       // Show live brush preview
        previewSurfaces: ['canvas', 'paper'], // Preview on multiple surfaces
        strokeTestArea: true,    // Enable stroke testing
        performanceIndicator: true, // Show performance metrics
        
        // Brush Sharing & Packs
        brushId: '',             // Unique brush identifier
        brushAuthor: '',         // Brush creator name
        brushVersion: '1.0',     // Brush version
        brushRating: 0,          // Community rating (0-5)
        brushDownloads: 0,       // Download count
        packName: '',            // Brush pack name
        packMetadata: {},        // Pack information
        
        // Procedural Brushes
        proceduralType: 'none',  // 'none', 'fractal', 'noise', 'parametric'
        proceduralSeed: 0,       // Random seed for generation
        proceduralComplexity: 50, // Complexity level (0-100%)
        proceduralParameters: {}, // Custom algorithm parameters
        
        // Mixer Brush Enhancements
        mixerReservoir: [],      // Multiple reservoir colors
        mixerCleanMode: false,   // Clean brush between strokes
        mixerWetness: 50,        // Wetness simulation (0-100%)
        mixerSampleSize: 5,      // Sample area size (pixels)
        
        // Smudge Tool Pro
        fingerPaintMode: false,  // Finger painting mode
        smudgeStrength: 50,      // Smudge strength (0-100%)
        smudgeFalloff: 30,       // Strength falloff (0-100%)
        texturePreservation: true, // Preserve texture detail
        directionalSmudge: true,  // Direction-aware smudging
        
        // Liquify Brush Set
        liquifyMode: 'none',     // 'push', 'pull', 'rotate', 'pucker', 'bloat', 'turbulence'
        liquifyStrength: 50,     // Effect strength (0-100%)
        liquifyFreeze: false,    // Freeze mask enabled
        liquifyReconstruct: false, // Reconstruction mode
        liquifyTurbulence: 30,   // Turbulence amount (0-100%)
        
        // Symmetry Brush Engine
        symmetryEnabled: false,  // Enable symmetry painting
        symmetryAxes: 1,         // Number of symmetry axes (1-64)
        symmetryMode: 'mirror',  // 'mirror', 'tile', 'kaleidoscope', 'radial'
        symmetryOffset: 0,       // Offset for symmetry (pixels)
        symmetryCenter: { x: 0, y: 0 }, // Center point for symmetry
        
        // Scatter Brush System
        scatterParticles: false, // Particle-based painting
        scatterPhysics: false,   // Physics simulation for particles
        scatterColorVariation: 0, // Color variation (0-100%)
        scatterSizeVariation: 0,  // Size variation (0-100%)
        scatterCustomShape: null, // Custom particle shape
        
        // GPU Acceleration
        gpuAccelerated: true,    // Hardware acceleration
        gpuBackend: 'auto',      // 'auto', 'webgl', 'webgl2', 'webgpu'
        gpuBrushCache: true,     // GPU brush caching
        gpuComplexDynamics: true, // GPU for complex dynamics
        
        // Brush Caching System
        cachingEnabled: true,    // Enable brush caching
        textureCacheSize: 50,    // Cache size in MB
        dynamicCacheManagement: true, // Auto cache management
        predictiveCaching: true, // Predictive pre-loading
        
        // Multi-Threading
        multiThreadEnabled: false, // Parallel brush rendering (can use Web Workers and OffscreenCanvas in modern browsers)
        strokePrediction: true,  // Predict stroke path
        backgroundProcessing: false, // Background processing (via Web Workers)
        targetFPS: 60,           // Target framerate
        
        // Brush Stabilization (enhanced)
        stabilizationMode: 'weighted', // 'basic', 'weighted', 'lazy', 'predictive'
        lazyMouseRadius: 20,     // Lazy mouse string length (pixels)
        lazyMouseStrength: 50,   // Lazy mouse pull strength (0-100%)
        stabilizationStrength: 50, // Overall stabilization (0-100%)
        
        // Brush History & Undo
        strokeHistory: [],       // Individual stroke history
        strokeReplay: false,     // Enable stroke replay
        selectiveStrokeDelete: false, // Delete individual strokes
        strokeEditing: false,    // Edit stroke properties
        maxStrokeHistory: 100,   // Maximum strokes to remember
        
        // Special Effects Brushes
        
        // Holographic Brush
        holographicEnabled: false, // Rainbow/iridescent effects
        holographicAngle: 45,    // Angle-dependent color shift (degrees)
        holographicIntensity: 50, // Effect intensity (0-100%)
        metallicSheen: false,    // Metallic surface effect
        lightDispersion: 30,     // Light dispersion amount (0-100%)
        
        // Neon/Glow Brush
        neonGlowEnabled: false,  // Luminous painting effects
        glowBloom: 50,           // Bloom control (0-100%)
        glowIntensity: 70,       // Color intensity (0-100%)
        glowRadius: 20,          // Glow radius (pixels)
        hdrGlow: false,          // HDR glow support
        
        // Fur/Hair Brush
        furHairEnabled: false,   // Realistic hair strand generation
        furClumping: 50,         // Hair clumping control (0-100%)
        furDirection: 0,         // Direction flow (degrees)
        furLengthVariation: 30,  // Length variation (0-100%)
        furWindEffect: 0,        // Wind effect strength (0-100%)
        
        // Foliage Brush
        foliageEnabled: false,   // Vegetation painting
        foliageType: 'leaf',     // 'leaf', 'grass', 'tree'
        foliageRotation: true,   // Random rotation
        foliageColorVar: 20,     // Color variation (0-100%)
        foliageDensity: 50,      // Density control (0-100%)
        
        // Pattern Stamp Tool
        patternStampEnabled: false, // Pattern painting brush
        patternLibrary: [],      // Available patterns
        patternDistortion: 0,    // Distortion mode (0-100%)
        patternBlendMode: 'normal', // Blending options
        patternImpressionistMode: false, // Impressionist rendering
        
        // CATEGORY 3: Natural Media Simulation Features
        
        // Paper & Canvas
        paperLibraryEnabled: true,   // Enable advanced paper library
        paperType: 'hot-pressed',    // Paper type: 'hot-pressed', 'cold-pressed', 'rough', 'rice', 'vellum', 'parchment'
        tonedPaper: false,           // Use toned paper
        tonedPaperColor: '#E8DCC8',  // Toned paper color (gray, tan, kraft)
        customPaperPath: null,       // Custom paper texture path
        
        paperAbsorptionRate: 50,     // Variable absorption rate (0-100%)
        wetSpotPooling: 30,          // Wet spots and pooling (0-100%)
        paperBuckling: false,        // Paper buckling simulation
        paperSizing: 50,             // Paper sizing effect (0-100%)
        
        canvasWeavePattern: 'standard', // 'standard', 'fine', 'coarse', 'linen', 'duck'
        canvasToothDirection: 0,     // Tooth direction (0-360 degrees)
        canvasPriming: 50,           // Canvas priming level (0-100%)
        canvasThreadCount: 10,       // Thread count control (1-20)
        
        surfaceAgingEnabled: false,  // Enable aging effects
        surfaceYellowing: 0,         // Yellowing/discoloration (0-100%)
        surfaceCracks: 0,            // Cracks and damage (0-100%)
        surfaceStaining: 0,          // Staining effects (0-100%)
        surfacePatina: 0,            // Patina simulation (0-100%)
        
        canvas3DTexture: false,      // Enable 3D canvas texture
        canvas3DNormalMap: true,     // Generate normal maps
        canvas3DParallax: false,     // Parallax scrolling effect
        canvas3DLighting: true,      // Lighting interaction
        canvas3DPreview: true,       // Real-time preview
        
        // Paint Properties
        pigmentDatabase: 'standard', // 'standard', 'authentic', 'custom'
        pigmentMixing: 'authentic',  // 'rgb', 'authentic', 'advanced'
        pigmentTransparency: 50,     // Transparency level (0-100%)
        pigmentStaining: 30,         // Staining properties (0-100%)
        pigmentGranulation: 20,      // Granulation characteristics (0-100%)
        
        binderType: 'oil',           // 'oil', 'acrylic', 'watercolor', 'gouache'
        binderOilType: 'linseed',    // 'linseed', 'walnut', 'poppy'
        binderAcrylicType: 'gloss',  // 'gel', 'matte', 'gloss'
        binderWatercolor: 'gum-arabic', // 'gum-arabic', 'honey'
        binderOpacity: 50,           // Gouache opacity (0-100%)
        
        dryingSimulation: true,      // Enable drying simulation
        dryingTimeScale: 1.0,        // Time scale multiplier (0.1-10.0)
        dryingCrackPattern: false,   // Cracking patterns
        dryingColorShift: 10,        // Color shift on drying (0-100%)
        dryingSurfaceChange: 20,     // Surface changes (0-100%)
        
        paintViscosity: 50,          // Paint thickness (0-100%)
        paintBody: 'medium',         // 'fluid', 'medium', 'heavy'
        paintDripEffect: 0,          // Drip and sag effects (0-100%)
        paintPaletteKnifeInteraction: true, // Knife interaction simulation
        
        colorBleedingEnhanced: 30,   // Enhanced edge bleeding (0-100%)
        colorBackruns: 20,           // Backruns and blooms (0-100%)
        colorSaltTexture: 0,         // Salt texture effects (0-100%)
        colorLiftingTechnique: false, // Enable lifting techniques
        
        // Traditional Tools
        paletteKnifeShape: 'diamond',  // 'diamond', 'flat', 'angular', 'painting'
        paletteKnifeThickness: 70,     // Thick paint application (0-100%)
        paletteKnifeScraping: true,    // Scraping techniques
        paletteKnifeTextureCreate: 50, // Texture creation (0-100%)
        
        spongeType: 'natural',       // 'natural', 'synthetic', 'sea'
        spongeDabbing: true,         // Dabbing technique
        spongeDragging: false,       // Dragging technique
        spongeAbsorption: 50,        // Absorption amount (0-100%)
        spongeRandomTexture: 70,     // Random texture (0-100%)
        
        rollerEnabled: false,        // Enable paint roller tool
        rollerPattern: 'standard',   // 'standard', 'stipple', 'texture'
        rollerCoverage: 70,          // Coverage control (0-100%)
        rollerDirection: 0,          // Direction effect (0-360 degrees)
        rollerLoadingVariation: 30,  // Loading variation (0-100%)
        
        airbrushPro: false,          // Professional airbrush mode
        airbrushNozzle: 'fine',      // 'fine', 'medium', 'wide', 'splatter'
        airbrushPressure: 50,        // Air pressure (0-100%)
        airbrushOverspray: 30,       // Overspray simulation (0-100%)
        airbrushMasking: false,      // Masking support
        
        eraserTechnique: 'standard', // 'standard', 'kneaded', 'pink', 'sponge', 'electric'
        eraserKneadedSoft: 70,       // Kneaded eraser softness (0-100%)
        eraserPinkHardness: 80,      // Pink eraser hardness (0-100%)
        eraserSpongeAbsorption: 60,  // Sponge eraser (0-100%)
        eraserElectricSpeed: 50,     // Electric eraser speed (0-100%)
        
        // Ink & Calligraphy
        inkFlowSimulation: true,     // Enable ink flow
        inkPooling: 30,              // Pooling effect (0-100%)
        inkFeathering: 20,           // Feathering on paper (0-100%)
        inkNibAngle: 45,             // Nib angle effects (0-90 degrees)
        inkSaturation: 70,           // Ink saturation (0-100%)
        inkDryingTime: 3000,         // Drying time (ms)
        
        calligraphyPen: 'broad-edge', // 'broad-edge', 'pointed', 'brush', 'ruling'
        calligraphyNibWidth: 3.0,    // Nib width (0.5-10.0 mm)
        calligraphyPressureResponse: 80, // Pressure sensitivity (0-100%)
        calligraphyEdgeSharpness: 90, // Edge sharpness (0-100%)
        
        asianInkPainting: false,     // Enable sumi-e mode
        asianInkConcentration: 70,   // Ink concentration (0-100%)
        asianBrushLoading: 50,       // Brush loading amount (0-100%)
        asianRicePaperEffect: true,  // Rice paper effects
        asianSealStamps: [],         // Seal stamp collection
        
        mangaInking: false,          // Professional comic tools
        mangaPenType: 'g-pen',       // 'g-pen', 'maru-pen', 'saji-pen'
        mangaScreenTones: false,     // Screen tones enabled
        mangaSpeedLines: false,      // Speed lines tool
        mangaEffectLines: false,     // Effect lines tool
        
        technicalPen: false,         // Technical pen mode
        technicalPenSize: 0.5,       // Tip size (0.1-2.0 mm)
        technicalPenConsistency: 100, // Line width consistency (0-100%)
        technicalPenRapidDrying: true, // Rapid drying
        technicalPenNoBleed: true,   // No bleed guarantee
    },
    color: '#000000',
    layers: [],
    activeLayer: null,
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    smoothPoints: [],     // Points buffer for smoothing
    lastDistance: 0,      // Track distance for spacing
    lastTime: 0,          // Track time for velocity calculation
    velocity: 0,          // Current stroke velocity (pixels/ms)
    tiltX: 0,             // Pen tilt X (-1 to 1)
    tiltY: 0,             // Pen tilt Y (-1 to 1)
    twist: 0,             // Pen barrel rotation (0-360)
    // Physics simulation state
    physics: {
        velocityX: 0,      // Velocity in X direction
        velocityY: 0,      // Velocity in Y direction
        targetX: 0,        // Target position X (pointer position)
        targetY: 0,        // Target position Y (pointer position)
        positionX: 0,      // Simulated position X
        positionY: 0,      // Simulated position Y
    },
    history: [],
    historyIndex: -1,
    isPanning: false,
    panStartX: 0,
    panStartY: 0,
    selection: {
        active: false,
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
        marchingAntsOffset: 0,  // For animated marching ants
        animationFrame: null,   // Store animation frame ID
        // NEW: Advanced selection tools
        type: 'rectangle',      // 'rectangle', 'ellipse', 'lasso', 'polygonal', 'magnetic'
        points: [],             // Points for lasso/polygonal selection
        feather: 0,             // Feather radius in pixels
        antiAlias: true,        // Anti-alias selection edges
        magneticParams: {
            width: 10,          // Edge detection width
            contrast: 40,       // Edge contrast threshold
            frequency: 57       // Anchor point frequency
        },
        // Category 4: Advanced Selection Features
        mask: null,             // Selection mask data (Uint8Array)
        algebra: 'replace',     // 'replace', 'add', 'subtract', 'intersect', 'xor'
        // Color Range Selection
        colorRange: {
            enabled: false,
            colors: [],         // Array of selected colors
            fuzziness: 40,      // Color tolerance (0-255)
            localized: false,   // Localized color selection
            skinTone: false     // Skin tone detection mode
        },
        // Focus Area Selection
        focusArea: {
            enabled: false,
            depthBased: true,
            focusRange: 50,     // Focus range percentage (0-100)
            blurDetection: true
        },
        // Luminosity Mask
        luminosityMask: {
            enabled: false,
            type: 'highlights',  // 'highlights', 'midtones', 'shadows', 'custom'
            rangeMin: 170,      // For highlights (0-255)
            rangeMax: 255,
            feather: 10
        },
        // Channel Selection
        channelSelection: {
            enabled: false,
            channel: 'rgb',     // 'rgb', 'r', 'g', 'b', 'alpha'
            operation: 'load'   // 'load', 'add', 'subtract', 'intersect'
        },
        // Select and Mask Workspace
        selectAndMask: {
            active: false,
            viewMode: 'onBlack', // 'onBlack', 'onWhite', 'onLayers', 'marching', 'overlay'
            edgeRefinement: true,
            refineRadius: 10,
            smoothness: 5,
            feather: 1,
            contrast: 0,
            shiftEdge: 0,
            decontaminate: false
        },
        // Transform Selection
        transformSelection: {
            enabled: false,
            mode: 'move',       // 'move', 'rotate', 'scale', 'perspective'
            angle: 0,
            scaleX: 1,
            scaleY: 1
        }
    },
    // Quick Mask Mode (Phase 8)
    quickMask: {
        active: false,          // Quick mask mode enabled/disabled
        canvas: null,           // Canvas for mask editing
        overlayColor: 'rgba(255, 0, 0, 0.5)', // Red semi-transparent overlay
        opacity: 0.5            // Mask overlay opacity
    },
    shape: {
        type: 'rectangle',
        filled: true,
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
        drawing: false
    },
    // Phase 7: Vector path editing
    vectorPath: {
        currentPath: null,      // Current VectorPath being edited
        paths: [],              // Array of completed vector paths
        mode: 'add',            // 'add', 'edit', 'delete'
        dragging: false,
        dragTarget: null,       // {type: 'point'|'handle', index, handleType}
        filled: false,
        strokeWidth: 2
    },
    gradient: {
        type: 'linear',
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
        drawing: false,
        colorStops: [
            { position: 0, color: '#000000' },
            { position: 1, color: '#ffffff' }
        ]
    },
    transform: {
        mode: null, // 'move', 'rotate', 'scale', 'free-transform', 'skew', 'perspective', 'warp'
        active: false,
        startX: 0,
        startY: 0,
        originalLayer: null,
        angle: 0,
        scale: 1,
        scaleX: 1,
        scaleY: 1,
        skewX: 0,
        skewY: 0,
        translateX: 0,
        translateY: 0,
        // Corner points for free transform and perspective
        corners: [
            { x: 0, y: 0 },     // top-left
            { x: 0, y: 0 },     // top-right
            { x: 0, y: 0 },     // bottom-right
            { x: 0, y: 0 }      // bottom-left
        ],
        selectedHandle: null,
        // Warp grid
        warpGrid: null,
        warpResolution: 3,  // 3x3 grid
        // Transform History (Phase 6) - Non-destructive transforms
        history: [],         // Array of transform operations
        historyIndex: -1,    // Current position in history
        smartObject: null,   // Original layer data for non-destructive editing
        isSmartObject: false // Whether current layer is a smart object
    },
    text: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 24,
        bold: false,
        italic: false,
        underline: false,
        alignment: 'left', // 'left', 'center', 'right'
        letterSpacing: 0,  // Kerning in pixels
        lineHeight: 1.2,   // Leading as multiplier
        // Phase 7 enhancements - Text effects
        stroke: {
            enabled: false,
            color: '#000000',
            width: 2
        },
        shadow: {
            enabled: false,
            color: '#00000080',
            blur: 4,
            offsetX: 2,
            offsetY: 2
        },
        gradient: {
            enabled: false,
            type: 'linear', // 'linear' or 'radial'
            colors: ['#ff0000', '#0000ff'],
            angle: 0 // for linear gradient
        }
    },
    blendMode: 'normal',
    customBrushes: [],
    colorSets: {
        sets: {
            'default': {
                name: 'Default Set',
                colors: ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']
            }
        },
        currentSet: 'default'
    },
    brushTipShape: 'circle', // 'circle', 'square', 'star', 'custom'
    brushTipTexture: null,
    currentPresetName: 'basic', // Track current brush preset for style-specific rendering
    plugins: [],
    wetPalette: {
        enabled: true,     // Enable realistic wet palette blending by default
        wetness: 50,       // Wetness level (0-100)
        bleeding: 30,      // Color bleeding intensity (0-100)
        dryingTime: 5,     // Time in seconds for paint to dry
        wetLayers: new Map() // Track wet paint on canvas for bleeding
    },
    workspace: {
        leftPanelWidth: 280,
        rightPanelWidth: 280,
        leftPanelCollapsed: false,
        rightPanelCollapsed: false
    },
    rulers: {
        visible: false,
        horizontalCanvas: null,
        verticalCanvas: null,
        // NEW: Guide and ruler tools
        guides: [],          // Array of guide lines {type: 'horizontal'|'vertical', position: number}
        guidesVisible: false, // Show/hide guides
        snapToGuides: true,  // Snap drawing to guides
        snapDistance: 10,    // Snap distance in pixels
        rulerTool: 'none',   // 'none', 'line', 'ellipse', 'curve', 'perspective'
        rulerPoints: [],     // Points for ruler tool
        perspective: {
            type: 'none',    // 'none', '1-point', '2-point', '3-point'
            vanishingPoints: [], // Array of {x, y} vanishing points
            horizonY: null   // Horizon line Y position
        }
    },
    // Phase 11: Grid system
    grid: {
        visible: false,
        size: 50,
        snapToGrid: false
    },
    // Eyedropper settings
    eyedropper: {
        screenWide: true  // Enable screen-wide color picking if browser supports it
    },
    // Photo editing tools state
    cloneStamp: {
        sourceX: null,
        sourceY: null,
        sourceSet: false
    },
    crop: {
        active: false,
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
        mode: 'canvas' // 'canvas' or 'layer'
    },
    dodgeBurn: {
        exposure: 30, // percentage
        mode: 'dodge' // 'dodge' or 'burn'
    },
    sponge: {
        saturation: 50, // percentage
        mode: 'saturate' // 'saturate' or 'desaturate'
    },
    fill: {
        tolerance: 30 // color difference tolerance (0-255)
    },
    magicWand: {
        tolerance: 32,        // color difference tolerance (0-255)
        contiguous: true,     // only select connected pixels
        antiAlias: true,      // smooth selection edges
        sampleAllLayers: false // sample from all layers or just active layer
    },
    heal: {
        sourceX: null,
        sourceY: null,
        sourceSet: false,
        sampleRadius: 20  // radius for sampling surrounding area
    },
    // Keyboard shortcuts configuration
    keyboardShortcuts: {
        // Tools
        'brush': 'b',
        'eraser': 'e',
        'fill': 'g',
        'eyedropper': 'i',
        'selection': 'm',
        'magic-wand': 'w',
        'text': 't',
        'shapes': 's',
        'gradient': 'l',
        'move': 'v',
        'rotate': 'r',
        'scale': 'z',
        'crop': 'c',
        'clone': 'k',
        'dodge': 'o',
        'burn': 'u',
        'sponge': 'p',
        'heal': 'h',
        'smudge': 'a',
        'liquify': 'shift+l',
        // File operations
        'file-new': 'ctrl+n',
        'file-new-with-size': 'ctrl+shift+n',
        'file-open': 'ctrl+o',
        'file-import': 'ctrl+i',
        'file-save': 'ctrl+s',
        'file-save-as': 'ctrl+shift+s',
        'file-export': 'ctrl+e',
        'file-settings': 'ctrl+,',
        // Edit operations
        'edit-undo': 'ctrl+z',
        'edit-redo': 'ctrl+shift+z',
        'edit-cut': 'ctrl+x',
        'edit-copy': 'ctrl+c',
        'edit-paste': 'ctrl+v',
        // View operations
        'view-zoom-in': 'ctrl+=',
        'view-zoom-out': 'ctrl+-',
        'view-reset-zoom': 'ctrl+0',
        // Brush size
        'brush-size-decrease': '[',
        'brush-size-increase': ']',
        // Layer operations
        'layer-new': 'ctrl+shift+l',
        'layer-duplicate': 'ctrl+j',
        'layer-delete': 'delete',
        'layer-move-up': 'ctrl+]',
        'layer-move-down': 'ctrl+[',
        'layer-merge-down': 'ctrl+e',
        'layer-flatten': 'ctrl+shift+e'
    },
    // Wrap-around mode for seamless patterns
    wrapAround: {
        enabled: false,
        horizontal: true,
        vertical: true
    },
    // Mirror/Symmetry mode
    symmetry: {
        enabled: false,
        mode: 'horizontal', // 'horizontal', 'vertical', 'both', 'radial'
        centerX: 0,
        centerY: 0,
        segments: 8 // for radial symmetry
    },
    // Smudge tool
    smudge: {
        strength: 50, // percentage
        fingerPainting: false // start with canvas color vs picked color
    },
    // Liquify tool
    liquify: {
        mode: 'push', // 'push', 'pull', 'twirl-cw', 'twirl-ccw', 'pucker', 'bloat'
        strength: 50,
        radius: 50
    },
    // Reference image
    reference: {
        visible: false,
        image: null,
        x: 0,
        y: 0,
        width: 300,
        height: 300,
        opacity: 0.7,
        scale: 1.0,  // Phase 11: Scale factor
        originalWidth: 300,
        originalHeight: 300
    },
    // Canvas texture overlay
    canvasTexture: {
        enabled: false,
        type: 'canvas', // Professional paper types
        intensity: 30, // percentage
        grain: 50 // grain visibility (0-100)
    },
    // Rebelle 8 Paper Panel
    rebellePaper: {
        enabled: true,     // Enable realistic paper simulation by default
        selectedPaper: 'arches-cold-pressed-140lb',
        absorbency: 5, // 0-10
        rewet: 5, // 1-10
        textureInfluence: 5, // 0-10
        edgeDarkening: 5, // 0-10
        wetness: 0, // Paper wetness level (0-100): 0=dry, 100=very wet
        wetnessMap: null // Track wet areas on paper (ImageData for wet regions)
    },
    // QuickShape
    quickShape: {
        enabled: true,
        threshold: 0.85 // recognition threshold
    },
    // Time-lapse recording
    timelapse: {
        recording: false,
        frames: [],
        interval: 100, // capture every 100ms
        lastCapture: 0
    },
    // Custom brush names (for renaming brushes)
    customBrushNames: {},
    // Phase 10: Theme settings
    theme: 'dark', // 'dark' or 'light'
    // Phase 10: Interface scaling
    interfaceScale: 1.0, // 0.75, 1.0, 1.25, 1.5
    previousScale: null, // Track previous scale for relative adjustments
    // Phase 15: Performance & Rendering enhancements
    webglAvailable: false,         // WebGL support detected
    webglEnabled: false,           // WebGL acceleration enabled
    webglRenderer: null,           // WebGL renderer instance
    tiledRenderingEnabled: false,  // Tiled rendering enabled
    tiledCanvasInstance: null,     // Tiled canvas instance
    progressiveLoadingEnabled: true, // Progressive loading enabled
    useTiledCanvas: false,         // Currently using tiled canvas
    // Phase 12: Animation & Recording
    animationSystem: null,         // AnimationSystem instance
    animationUI: null,             // AnimationUI instance
    sessionRecorder: null,         // SessionRecorder instance
    isRecording: false,            // Session recording active
    // Phase 14: Cloud & Collaboration
    cloudSync: null,               // CloudSync instance
    cloudSyncUI: null,             // CloudSyncUI instance
    autoSyncEnabled: false         // Auto-sync active
};

// Default keyboard shortcuts (for reset functionality)
const defaultKeyboardShortcuts = {
    // Tools
    'brush': 'b',
    'eraser': 'e',
    'fill': 'g',
    'eyedropper': 'i',
    'selection': 'm',
    'magic-wand': 'w',
    'text': 't',
    'shapes': 's',
    'gradient': 'l',
    'move': 'v',
    'rotate': 'r',
    'scale': 'z',
    'crop': 'c',
    'clone': 'k',
    'dodge': 'o',
    'burn': 'u',
    'sponge': 'p',
    'heal': 'h',
    'smudge': 'a',
    'liquify': 'shift+l',
    // File operations
    'file-new': 'ctrl+n',
    'file-new-with-size': 'ctrl+shift+n',
    'file-open': 'ctrl+o',
    'file-import': 'ctrl+i',
    'file-save': 'ctrl+s',
    'file-save-as': 'ctrl+shift+s',
    'file-export': 'ctrl+e',
    'file-settings': 'ctrl+,',
    // Edit operations
    'edit-undo': 'ctrl+z',
    'edit-redo': 'ctrl+shift+z',
    'edit-cut': 'ctrl+x',
    'edit-copy': 'ctrl+c',
    'edit-paste': 'ctrl+v',
    // View operations
    'view-zoom-in': 'ctrl+=',
    'view-zoom-out': 'ctrl+-',
    'view-reset-zoom': 'ctrl+0',
    // Brush size
    'brush-size-decrease': '[',
    'brush-size-increase': ']',
    // Layer operations
    'layer-new': 'ctrl+shift+l',
    'layer-duplicate': 'ctrl+j',
    'layer-delete': 'delete',
    'layer-move-up': 'ctrl+]',
    'layer-move-down': 'ctrl+[',
    'layer-merge-down': 'ctrl+e',
    'layer-flatten': 'ctrl+shift+e'
};

// Brush Presets - 100+ Professional Brushes
const brushPresets = {
    // Basic Brushes (10)
    'basic': { size: 20, opacity: 100, hardness: 80, flow: 100, spacing: 10, smoothing: 0, angle: 0, angleJitter: 0, scatterX: 0, scatterY: 0 },
    'soft': { size: 30, opacity: 80, hardness: 20, flow: 60, spacing: 8, smoothing: 20, angle: 0, angleJitter: 0, scatterX: 0, scatterY: 0 },
    'hard': { size: 20, opacity: 100, hardness: 100, flow: 100, spacing: 10, smoothing: 0, angle: 0, angleJitter: 0, scatterX: 0, scatterY: 0 },
    'medium': { size: 25, opacity: 90, hardness: 50, flow: 80, spacing: 10, smoothing: 10, angle: 0, angleJitter: 0, scatterX: 0, scatterY: 0 },
    'fine': { size: 5, opacity: 100, hardness: 90, flow: 100, spacing: 5, smoothing: 5, angle: 0, angleJitter: 0, scatterX: 0, scatterY: 0 },
    'large-soft': { size: 80, opacity: 70, hardness: 10, flow: 50, spacing: 12, smoothing: 25, angle: 0, angleJitter: 0, scatterX: 0, scatterY: 0 },
    'large-hard': { size: 80, opacity: 100, hardness: 90, flow: 100, spacing: 12, smoothing: 0, angle: 0, angleJitter: 0, scatterX: 0, scatterY: 0 },
    'tiny': { size: 3, opacity: 100, hardness: 100, flow: 100, spacing: 3, smoothing: 0, angle: 0, angleJitter: 0, scatterX: 0, scatterY: 0 },
    'huge': { size: 150, opacity: 60, hardness: 30, flow: 40, spacing: 15, smoothing: 30, angle: 0, angleJitter: 0, scatterX: 0, scatterY: 0 },
    'detail': { size: 8, opacity: 100, hardness: 85, flow: 100, spacing: 5, smoothing: 15, angle: 0, angleJitter: 0, scatterX: 0, scatterY: 0 },
    
    // Airbrush Brushes (10)
    'airbrush': { size: 40, opacity: 30, hardness: 0, flow: 20, spacing: 5, smoothing: 10, angle: 0, angleJitter: 0, scatterX: 15, scatterY: 15 },
    'airbrush-soft': { size: 60, opacity: 20, hardness: 0, flow: 15, spacing: 4, smoothing: 15, angle: 0, angleJitter: 0, scatterX: 20, scatterY: 20 },
    'airbrush-fine': { size: 20, opacity: 40, hardness: 5, flow: 25, spacing: 5, smoothing: 8, angle: 0, angleJitter: 0, scatterX: 10, scatterY: 10 },
    'airbrush-large': { size: 100, opacity: 25, hardness: 0, flow: 18, spacing: 8, smoothing: 20, angle: 0, angleJitter: 0, scatterX: 25, scatterY: 25 },
    'spray': { size: 35, opacity: 35, hardness: 0, flow: 30, spacing: 3, smoothing: 5, angle: 0, angleJitter: 0, scatterX: 30, scatterY: 30 },
    'mist': { size: 70, opacity: 15, hardness: 0, flow: 10, spacing: 4, smoothing: 25, angle: 0, angleJitter: 0, scatterX: 35, scatterY: 35 },
    'fog': { size: 120, opacity: 10, hardness: 0, flow: 8, spacing: 10, smoothing: 35, angle: 0, angleJitter: 0, scatterX: 40, scatterY: 40 },
    'diffuse': { size: 50, opacity: 25, hardness: 2, flow: 20, spacing: 6, smoothing: 12, angle: 0, angleJitter: 5, scatterX: 18, scatterY: 18 },
    'speckle': { size: 30, opacity: 40, hardness: 10, flow: 35, spacing: 4, smoothing: 5, angle: 0, angleJitter: 15, scatterX: 25, scatterY: 25 },
    'gradient-spray': { size: 55, opacity: 28, hardness: 5, flow: 22, spacing: 5, smoothing: 18, angle: 0, angleJitter: 0, scatterX: 22, scatterY: 22 },
    
    // Charcoal & Pencil Brushes (10) - Enhanced for grainy, textured graphite strokes
    'charcoal': { size: 25, opacity: 65, hardness: 55, flow: 75, spacing: 16, smoothing: 5, angle: 45, angleJitter: 35, scatterX: 22, scatterY: 6 },
    'pencil': { size: 12, opacity: 80, hardness: 70, flow: 85, spacing: 10, smoothing: 8, angle: 30, angleJitter: 25, scatterX: 8, scatterY: 3 },
    'graphite': { size: 18, opacity: 75, hardness: 65, flow: 80, spacing: 12, smoothing: 10, angle: 25, angleJitter: 28, scatterX: 12, scatterY: 4 },
    'charcoal-soft': { size: 35, opacity: 60, hardness: 50, flow: 70, spacing: 18, smoothing: 8, angle: 50, angleJitter: 35, scatterX: 25, scatterY: 8 },
    'charcoal-hard': { size: 20, opacity: 85, hardness: 75, flow: 90, spacing: 12, smoothing: 3, angle: 40, angleJitter: 25, scatterX: 15, scatterY: 4 },
    'sketch': { size: 15, opacity: 75, hardness: 65, flow: 85, spacing: 10, smoothing: 12, angle: 35, angleJitter: 30, scatterX: 10, scatterY: 3 },
    'conte': { size: 22, opacity: 78, hardness: 68, flow: 82, spacing: 14, smoothing: 6, angle: 42, angleJitter: 28, scatterX: 18, scatterY: 5 },
    'pastel': { size: 28, opacity: 65, hardness: 55, flow: 75, spacing: 16, smoothing: 10, angle: 48, angleJitter: 32, scatterX: 22, scatterY: 7 },
    'crayon': { size: 24, opacity: 72, hardness: 62, flow: 78, spacing: 15, smoothing: 7, angle: 38, angleJitter: 26, scatterX: 16, scatterY: 6 },
    'colored-pencil': { size: 14, opacity: 82, hardness: 72, flow: 88, spacing: 9, smoothing: 9, angle: 32, angleJitter: 22, scatterX: 7, scatterY: 2 },
    
    // Ink & Pen Brushes (10) - FW Acrylic India Ink characteristics: rich, dense pigment with crisp flow
    'ink': { size: 15, opacity: 100, hardness: 95, flow: 98, spacing: 4, smoothing: 32, angle: 0, angleJitter: 0, scatterX: 0, scatterY: 0 },
    'ink-fine': { size: 8, opacity: 100, hardness: 97, flow: 99, spacing: 2, smoothing: 38, angle: 0, angleJitter: 0, scatterX: 0, scatterY: 0 },
    'ink-bold': { size: 25, opacity: 100, hardness: 93, flow: 97, spacing: 5, smoothing: 28, angle: 0, angleJitter: 0, scatterX: 0, scatterY: 0 },
    'technical-pen': { size: 10, opacity: 100, hardness: 98, flow: 100, spacing: 3, smoothing: 42, angle: 0, angleJitter: 0, scatterX: 0, scatterY: 0 },
    // Copic-style markers - Alcohol-based with translucent layering and blending
    'marker': { size: 30, opacity: 72, hardness: 65, flow: 88, spacing: 6, smoothing: 18, angle: 0, angleJitter: 2, scatterX: 3, scatterY: 1 },
    'marker-chisel': { size: 35, opacity: 75, hardness: 70, flow: 92, spacing: 7, smoothing: 15, angle: 45, angleJitter: 3, scatterX: 4, scatterY: 1 },
    'brush-pen': { size: 20, opacity: 95, hardness: 90, flow: 100, spacing: 6, smoothing: 20, angle: 0, angleJitter: 0, scatterX: 0, scatterY: 0 },
    'calligraphy': { size: 28, opacity: 100, hardness: 95, flow: 100, spacing: 8, smoothing: 18, angle: 45, angleJitter: 0, scatterX: 0, scatterY: 0 },
    'fountain-pen': { size: 16, opacity: 98, hardness: 95, flow: 100, spacing: 5, smoothing: 28, angle: 0, angleJitter: 0, scatterX: 0, scatterY: 0 },
    'gel-pen': { size: 12, opacity: 100, hardness: 100, flow: 100, spacing: 4, smoothing: 32, angle: 0, angleJitter: 0, scatterX: 0, scatterY: 0 },
    
    // Watercolor Brushes (10) - Enhanced for realistic wet-on-wet effects
    'watercolor': { size: 50, opacity: 35, hardness: 5, flow: 25, spacing: 5, smoothing: 15, angle: 0, angleJitter: 12, scatterX: 12, scatterY: 12 },
    'watercolor-wet': { size: 60, opacity: 25, hardness: 3, flow: 20, spacing: 4, smoothing: 20, angle: 0, angleJitter: 18, scatterX: 18, scatterY: 18 },
    'watercolor-dry': { size: 40, opacity: 50, hardness: 25, flow: 40, spacing: 8, smoothing: 10, angle: 0, angleJitter: 8, scatterX: 8, scatterY: 8 },
    'wash': { size: 70, opacity: 25, hardness: 3, flow: 20, spacing: 7, smoothing: 25, angle: 0, angleJitter: 12, scatterX: 18, scatterY: 18 },
    'watercolor-flat': { size: 55, opacity: 45, hardness: 15, flow: 35, spacing: 7, smoothing: 12, angle: 0, angleJitter: 5, scatterX: 7, scatterY: 7 },
    'watercolor-round': { size: 45, opacity: 42, hardness: 12, flow: 32, spacing: 6, smoothing: 18, angle: 0, angleJitter: 10, scatterX: 12, scatterY: 12 },
    'splatter': { size: 35, opacity: 55, hardness: 25, flow: 45, spacing: 10, smoothing: 5, angle: 0, angleJitter: 20, scatterX: 30, scatterY: 30 },
    'wet-blend': { size: 65, opacity: 35, hardness: 8, flow: 28, spacing: 6, smoothing: 22, angle: 0, angleJitter: 14, scatterX: 14, scatterY: 14 },
    'watercolor-detail': { size: 25, opacity: 48, hardness: 18, flow: 38, spacing: 5, smoothing: 16, angle: 0, angleJitter: 8, scatterX: 6, scatterY: 6 },
    'drip': { size: 30, opacity: 50, hardness: 22, flow: 42, spacing: 12, smoothing: 8, angle: 90, angleJitter: 25, scatterX: 12, scatterY: 25 },
    
    // Oil Paint Brushes (10) - Enhanced for Winsor Newton/Grumbacher Max Oil characteristics
    // Buttery consistency, rich pigment loading, visible impasto, excellent flow and blending
    'oil-paint': { size: 35, opacity: 93, hardness: 52, flow: 75, spacing: 11, smoothing: 10, angle: 0, angleJitter: 15, scatterX: 5, scatterY: 5 },
    'oil-flat': { size: 40, opacity: 95, hardness: 58, flow: 80, spacing: 12, smoothing: 8, angle: 0, angleJitter: 10, scatterX: 3, scatterY: 3 },
    'oil-round': { size: 32, opacity: 91, hardness: 54, flow: 78, spacing: 10, smoothing: 9, angle: 0, angleJitter: 12, scatterX: 4, scatterY: 4 },
    'oil-fan': { size: 45, opacity: 78, hardness: 50, flow: 72, spacing: 13, smoothing: 12, angle: 0, angleJitter: 18, scatterX: 7, scatterY: 7 },
    'oil-filbert': { size: 38, opacity: 90, hardness: 60, flow: 82, spacing: 11, smoothing: 9, angle: 0, angleJitter: 11, scatterX: 3, scatterY: 3 },
    'palette-knife': { size: 50, opacity: 97, hardness: 72, flow: 92, spacing: 14, smoothing: 5, angle: 30, angleJitter: 35, scatterX: 5, scatterY: 5 },
    'impasto': { size: 42, opacity: 95, hardness: 68, flow: 88, spacing: 13, smoothing: 6, angle: 0, angleJitter: 16, scatterX: 6, scatterY: 6 },
    'oil-glaze': { size: 55, opacity: 48, hardness: 38, flow: 50, spacing: 9, smoothing: 16, angle: 0, angleJitter: 7, scatterX: 4, scatterY: 4 },
    'oil-detail': { size: 20, opacity: 92, hardness: 65, flow: 85, spacing: 7, smoothing: 12, angle: 0, angleJitter: 9, scatterX: 2, scatterY: 2 },
    'oil-textured': { size: 36, opacity: 85, hardness: 55, flow: 75, spacing: 12, smoothing: 8, angle: 0, angleJitter: 22, scatterX: 10, scatterY: 10 },
    
    // Acrylic Brushes (10)
    'acrylic': { size: 30, opacity: 90, hardness: 70, flow: 85, spacing: 10, smoothing: 6, angle: 0, angleJitter: 12, scatterX: 4, scatterY: 4 },
    'acrylic-flat': { size: 38, opacity: 93, hardness: 73, flow: 88, spacing: 11, smoothing: 5, angle: 0, angleJitter: 8, scatterX: 3, scatterY: 3 },
    'acrylic-round': { size: 28, opacity: 91, hardness: 71, flow: 86, spacing: 9, smoothing: 6, angle: 0, angleJitter: 10, scatterX: 3, scatterY: 3 },
    'acrylic-bright': { size: 32, opacity: 94, hardness: 75, flow: 90, spacing: 10, smoothing: 4, angle: 0, angleJitter: 7, scatterX: 2, scatterY: 2 },
    'acrylic-detail': { size: 18, opacity: 92, hardness: 74, flow: 87, spacing: 7, smoothing: 8, angle: 0, angleJitter: 8, scatterX: 2, scatterY: 2 },
    'acrylic-glaze': { size: 48, opacity: 55, hardness: 45, flow: 50, spacing: 12, smoothing: 12, angle: 0, angleJitter: 6, scatterX: 4, scatterY: 4 },
    'acrylic-heavy': { size: 40, opacity: 96, hardness: 78, flow: 92, spacing: 13, smoothing: 3, angle: 0, angleJitter: 15, scatterX: 5, scatterY: 5 },
    'acrylic-fan': { size: 42, opacity: 80, hardness: 58, flow: 75, spacing: 14, smoothing: 8, angle: 0, angleJitter: 18, scatterX: 7, scatterY: 7 },
    'acrylic-liner': { size: 10, opacity: 95, hardness: 80, flow: 92, spacing: 5, smoothing: 15, angle: 0, angleJitter: 0, scatterX: 0, scatterY: 0 },
    'acrylic-mop': { size: 50, opacity: 65, hardness: 35, flow: 60, spacing: 12, smoothing: 18, angle: 0, angleJitter: 12, scatterX: 8, scatterY: 8 },
    
    // Digital Painting Brushes (10)
    'digital-soft': { size: 40, opacity: 75, hardness: 30, flow: 65, spacing: 8, smoothing: 20, angle: 0, angleJitter: 0, scatterX: 0, scatterY: 0 },
    'digital-hard': { size: 35, opacity: 100, hardness: 95, flow: 100, spacing: 8, smoothing: 5, angle: 0, angleJitter: 0, scatterX: 0, scatterY: 0 },
    'digital-round': { size: 32, opacity: 85, hardness: 60, flow: 78, spacing: 9, smoothing: 12, angle: 0, angleJitter: 0, scatterX: 0, scatterY: 0 },
    'digital-flat': { size: 45, opacity: 88, hardness: 65, flow: 82, spacing: 10, smoothing: 8, angle: 0, angleJitter: 0, scatterX: 0, scatterY: 0 },
    'digital-texture': { size: 38, opacity: 80, hardness: 55, flow: 72, spacing: 11, smoothing: 6, angle: 0, angleJitter: 20, scatterX: 10, scatterY: 10 },
    'smudge': { size: 42, opacity: 70, hardness: 40, flow: 60, spacing: 6, smoothing: 15, angle: 0, angleJitter: 0, scatterX: 0, scatterY: 0 },
    'blend': { size: 48, opacity: 60, hardness: 25, flow: 50, spacing: 7, smoothing: 20, angle: 0, angleJitter: 0, scatterX: 0, scatterY: 0 },
    'digital-detail': { size: 15, opacity: 95, hardness: 85, flow: 92, spacing: 5, smoothing: 10, angle: 0, angleJitter: 0, scatterX: 0, scatterY: 0 },
    'digital-fuzzy': { size: 50, opacity: 65, hardness: 15, flow: 55, spacing: 10, smoothing: 25, angle: 0, angleJitter: 5, scatterX: 5, scatterY: 5 },
    'digital-sharp': { size: 28, opacity: 100, hardness: 100, flow: 100, spacing: 7, smoothing: 3, angle: 0, angleJitter: 0, scatterX: 0, scatterY: 0 },
    
    // Concept Art Brushes (10)
    'concept-soft': { size: 55, opacity: 70, hardness: 25, flow: 60, spacing: 10, smoothing: 18, angle: 0, angleJitter: 5, scatterX: 3, scatterY: 3 },
    'concept-hard': { size: 42, opacity: 95, hardness: 85, flow: 90, spacing: 9, smoothing: 6, angle: 0, angleJitter: 8, scatterX: 2, scatterY: 2 },
    'concept-texture': { size: 48, opacity: 75, hardness: 50, flow: 68, spacing: 12, smoothing: 8, angle: 0, angleJitter: 25, scatterX: 15, scatterY: 15 },
    'cloud': { size: 80, opacity: 45, hardness: 10, flow: 35, spacing: 14, smoothing: 25, angle: 0, angleJitter: 30, scatterX: 25, scatterY: 25 },
    'smoke': { size: 70, opacity: 35, hardness: 5, flow: 28, spacing: 8, smoothing: 30, angle: 0, angleJitter: 35, scatterX: 30, scatterY: 30 },
    'grass': { size: 25, opacity: 80, hardness: 60, flow: 75, spacing: 20, smoothing: 3, angle: 90, angleJitter: 45, scatterX: 15, scatterY: 5 },
    'foliage': { size: 35, opacity: 75, hardness: 55, flow: 70, spacing: 18, smoothing: 5, angle: 0, angleJitter: 50, scatterX: 20, scatterY: 20 },
    'rocks': { size: 40, opacity: 85, hardness: 70, flow: 80, spacing: 15, smoothing: 4, angle: 0, angleJitter: 35, scatterX: 12, scatterY: 12 },
    'hair': { size: 12, opacity: 88, hardness: 75, flow: 85, spacing: 25, smoothing: 12, angle: 45, angleJitter: 15, scatterX: 3, scatterY: 1 },
    'fur': { size: 18, opacity: 82, hardness: 68, flow: 78, spacing: 22, smoothing: 8, angle: 60, angleJitter: 30, scatterX: 8, scatterY: 3 },
    
    // Special Effect Brushes (10)
    'glow': { size: 60, opacity: 40, hardness: 0, flow: 30, spacing: 8, smoothing: 20, angle: 0, angleJitter: 0, scatterX: 8, scatterY: 8 },
    'stars': { size: 8, opacity: 100, hardness: 100, flow: 100, spacing: 50, smoothing: 0, angle: 0, angleJitter: 180, scatterX: 40, scatterY: 40 },
    'sparkle': { size: 15, opacity: 90, hardness: 85, flow: 95, spacing: 40, smoothing: 5, angle: 0, angleJitter: 180, scatterX: 35, scatterY: 35 },
    'lightning': { size: 10, opacity: 100, hardness: 100, flow: 100, spacing: 8, smoothing: 0, angle: 90, angleJitter: 60, scatterX: 20, scatterY: 5 },
    'fire': { size: 45, opacity: 65, hardness: 35, flow: 55, spacing: 10, smoothing: 8, angle: 90, angleJitter: 40, scatterX: 18, scatterY: 25 },
    'water-ripple': { size: 50, opacity: 50, hardness: 20, flow: 45, spacing: 12, smoothing: 15, angle: 0, angleJitter: 10, scatterX: 12, scatterY: 12 },
    'snow': { size: 10, opacity: 80, hardness: 70, flow: 75, spacing: 35, smoothing: 2, angle: 0, angleJitter: 180, scatterX: 30, scatterY: 40 },
    'rain': { size: 8, opacity: 70, hardness: 80, flow: 85, spacing: 30, smoothing: 0, angle: 75, angleJitter: 10, scatterX: 15, scatterY: 35 },
    'leaves': { size: 20, opacity: 75, hardness: 60, flow: 70, spacing: 25, smoothing: 5, angle: 0, angleJitter: 180, scatterX: 25, scatterY: 25 },
    'bokeh': { size: 40, opacity: 50, hardness: 15, flow: 40, spacing: 20, smoothing: 10, angle: 0, angleJitter: 0, scatterX: 20, scatterY: 20 },
    
    // Professional Grade Brushes (10) - Studio Quality Tools
    '2b-graphite-pencil': { size: 10, opacity: 82, hardness: 72, flow: 88, spacing: 8, smoothing: 12, angle: 28, angleJitter: 22, scatterX: 6, scatterY: 2 },
    'nib-pen-fine': { size: 6, opacity: 100, hardness: 100, flow: 100, spacing: 2, smoothing: 45, angle: 0, angleJitter: 0, scatterX: 0, scatterY: 0 },
    'nib-pen-medium': { size: 10, opacity: 100, hardness: 100, flow: 100, spacing: 3, smoothing: 40, angle: 0, angleJitter: 0, scatterX: 0, scatterY: 0 },
    'nib-pen-bold': { size: 18, opacity: 100, hardness: 100, flow: 100, spacing: 4, smoothing: 38, angle: 0, angleJitter: 0, scatterX: 0, scatterY: 0 },
    'paasche-airbrush': { size: 35, opacity: 25, hardness: 0, flow: 18, spacing: 4, smoothing: 15, angle: 0, angleJitter: 0, scatterX: 12, scatterY: 12 },
    // Winsor Newton Series 7 - Kolinsky Sable brushes with natural hair spring and flexibility
    'winsor-newton-oil-round': { size: 28, opacity: 94, hardness: 58, flow: 82, spacing: 9, smoothing: 11, angle: 0, angleJitter: 11, scatterX: 3, scatterY: 3 },
    'winsor-newton-oil-flat': { size: 38, opacity: 96, hardness: 62, flow: 86, spacing: 11, smoothing: 8, angle: 0, angleJitter: 8, scatterX: 2, scatterY: 2 },
    'winsor-newton-acrylic-round': { size: 26, opacity: 95, hardness: 70, flow: 90, spacing: 8, smoothing: 9, angle: 0, angleJitter: 7, scatterX: 2, scatterY: 2 },
    'winsor-newton-acrylic-flat': { size: 36, opacity: 97, hardness: 74, flow: 94, spacing: 10, smoothing: 7, angle: 0, angleJitter: 6, scatterX: 1, scatterY: 1 },
    'oil-impasto-heavy': { size: 45, opacity: 98, hardness: 70, flow: 94, spacing: 14, smoothing: 6, angle: 0, angleJitter: 18, scatterX: 7, scatterY: 7 },
    
    // NATURAL MEDIA BRUSHES - Enhanced Natural Media Simulation
    'artrage-thick-oil': { size: 40, opacity: 95, hardness: 65, flow: 80, spacing: 16, smoothing: 6, angle: 0, angleJitter: 25, scatterX: 8, scatterY: 8 },
    'artrage-oil-brush': { size: 35, opacity: 88, hardness: 58, flow: 72, spacing: 14, smoothing: 9, angle: 0, angleJitter: 20, scatterX: 7, scatterY: 7 },
    'artrage-watercolor-wet': { size: 55, opacity: 38, hardness: 8, flow: 28, spacing: 6, smoothing: 22, angle: 0, angleJitter: 15, scatterX: 16, scatterY: 16 },
    'artrage-watercolor-dry': { size: 42, opacity: 52, hardness: 28, flow: 42, spacing: 10, smoothing: 12, angle: 0, angleJitter: 10, scatterX: 10, scatterY: 10 },
    'artrage-pencil-soft': { size: 14, opacity: 75, hardness: 65, flow: 80, spacing: 9, smoothing: 14, angle: 32, angleJitter: 28, scatterX: 7, scatterY: 3 },
    'artrage-pencil-hard': { size: 10, opacity: 88, hardness: 78, flow: 92, spacing: 7, smoothing: 10, angle: 30, angleJitter: 20, scatterX: 5, scatterY: 2 },
    'artrage-palette-knife': { size: 52, opacity: 98, hardness: 80, flow: 95, spacing: 18, smoothing: 3, angle: 35, angleJitter: 45, scatterX: 10, scatterY: 6 },
    'artrage-roller': { size: 48, opacity: 85, hardness: 68, flow: 78, spacing: 20, smoothing: 5, angle: 0, angleJitter: 5, scatterX: 15, scatterY: 8 },
    'artrage-airbrush-fine': { size: 25, opacity: 30, hardness: 2, flow: 22, spacing: 5, smoothing: 18, angle: 0, angleJitter: 0, scatterX: 10, scatterY: 10 },
    'artrage-glitter': { size: 20, opacity: 92, hardness: 88, flow: 95, spacing: 35, smoothing: 4, angle: 0, angleJitter: 180, scatterX: 35, scatterY: 35 },
    
    // GRAPHITE PENCILS - Realistic graphite with paper tooth response
    'rebelle-graphite-hb': { size: 8, opacity: 78, hardness: 68, flow: 82, spacing: 7, smoothing: 10, angle: 28, angleJitter: 22, scatterX: 5, scatterY: 2 },
    'rebelle-graphite-2b': { size: 10, opacity: 82, hardness: 65, flow: 85, spacing: 8, smoothing: 12, angle: 30, angleJitter: 24, scatterX: 6, scatterY: 2 },
    'rebelle-graphite-4b': { size: 12, opacity: 86, hardness: 60, flow: 88, spacing: 9, smoothing: 14, angle: 32, angleJitter: 26, scatterX: 7, scatterY: 3 },
    'rebelle-graphite-6b': { size: 14, opacity: 90, hardness: 55, flow: 90, spacing: 10, smoothing: 15, angle: 34, angleJitter: 28, scatterX: 8, scatterY: 3 },
    'rebelle-graphite-8b': { size: 16, opacity: 94, hardness: 50, flow: 92, spacing: 11, smoothing: 16, angle: 36, angleJitter: 30, scatterX: 9, scatterY: 4 },
    'rebelle-graphite-h': { size: 6, opacity: 74, hardness: 75, flow: 78, spacing: 6, smoothing: 8, angle: 26, angleJitter: 20, scatterX: 4, scatterY: 1 },
    'rebelle-graphite-2h': { size: 5, opacity: 70, hardness: 80, flow: 75, spacing: 5, smoothing: 7, angle: 24, angleJitter: 18, scatterX: 3, scatterY: 1 },
    'rebelle-graphite-4h': { size: 4, opacity: 66, hardness: 85, flow: 72, spacing: 4, smoothing: 6, angle: 22, angleJitter: 16, scatterX: 2, scatterY: 1 },
    
    // METALLIC // COREL PAINTER & KRITA INSPIRED SPECIAL EFFECTS - Metallic & Special Effects (10)
    'metallic-gold': { size: 35, opacity: 85, hardness: 60, flow: 75, spacing: 12, smoothing: 10, angle: 0, angleJitter: 15, scatterX: 5, scatterY: 5 },
    'metallic-silver': { size: 35, opacity: 85, hardness: 60, flow: 75, spacing: 12, smoothing: 10, angle: 0, angleJitter: 15, scatterX: 5, scatterY: 5 },
    'metallic-copper': { size: 35, opacity: 85, hardness: 60, flow: 75, spacing: 12, smoothing: 10, angle: 0, angleJitter: 15, scatterX: 5, scatterY: 5 },
    'pearlescent': { size: 40, opacity: 75, hardness: 45, flow: 65, spacing: 14, smoothing: 15, angle: 0, angleJitter: 20, scatterX: 8, scatterY: 8 },
    'iridescent': { size: 38, opacity: 72, hardness: 42, flow: 62, spacing: 13, smoothing: 12, angle: 0, angleJitter: 25, scatterX: 10, scatterY: 10 },
    'impasto-thick': { size: 50, opacity: 98, hardness: 80, flow: 95, spacing: 18, smoothing: 3, angle: 0, angleJitter: 30, scatterX: 12, scatterY: 12 },
    'glazing-medium': { size: 55, opacity: 45, hardness: 30, flow: 40, spacing: 10, smoothing: 18, angle: 0, angleJitter: 8, scatterX: 4, scatterY: 4 },
    'dry-media': { size: 30, opacity: 70, hardness: 65, flow: 75, spacing: 15, smoothing: 8, angle: 45, angleJitter: 35, scatterX: 18, scatterY: 6 },
    'sponge-natural': { size: 45, opacity: 65, hardness: 35, flow: 55, spacing: 20, smoothing: 5, angle: 0, angleJitter: 180, scatterX: 40, scatterY: 40 },
    'stipple': { size: 8, opacity: 90, hardness: 100, flow: 100, spacing: 45, smoothing: 0, angle: 0, angleJitter: 180, scatterX: 35, scatterY: 35 },
    
    // MIXER BRUSHES - Color Mixing & Blending (10)
    'mixer-wet': { size: 42, opacity: 70, hardness: 35, flow: 55, spacing: 8, smoothing: 18, angle: 0, angleJitter: 10, scatterX: 4, scatterY: 4 },
    'mixer-dry': { size: 38, opacity: 85, hardness: 60, flow: 75, spacing: 12, smoothing: 10, angle: 0, angleJitter: 12, scatterX: 6, scatterY: 6 },
    'blender-soft': { size: 50, opacity: 60, hardness: 20, flow: 50, spacing: 8, smoothing: 22, angle: 0, angleJitter: 5, scatterX: 3, scatterY: 3 },
    'blender-hard': { size: 40, opacity: 75, hardness: 65, flow: 70, spacing: 10, smoothing: 12, angle: 0, angleJitter: 8, scatterX: 4, scatterY: 4 },
    'smudge-soft': { size: 45, opacity: 65, hardness: 30, flow: 55, spacing: 7, smoothing: 20, angle: 0, angleJitter: 6, scatterX: 2, scatterY: 2 },
    'smudge-hard': { size: 35, opacity: 80, hardness: 70, flow: 75, spacing: 9, smoothing: 10, angle: 0, angleJitter: 10, scatterX: 5, scatterY: 5 },
    'finger-paint': { size: 38, opacity: 68, hardness: 40, flow: 58, spacing: 6, smoothing: 16, angle: 0, angleJitter: 8, scatterX: 3, scatterY: 3 },
    'color-sampler': { size: 30, opacity: 72, hardness: 50, flow: 65, spacing: 8, smoothing: 14, angle: 0, angleJitter: 7, scatterX: 4, scatterY: 4 },
    'paint-mixer': { size: 48, opacity: 62, hardness: 35, flow: 52, spacing: 10, smoothing: 20, angle: 0, angleJitter: 12, scatterX: 6, scatterY: 6 },
    'palette-scraper': { size: 55, opacity: 90, hardness: 75, flow: 85, spacing: 16, smoothing: 4, angle: 42, angleJitter: 38, scatterX: 8, scatterY: 8 },
    
    // TEXTURE BRUSHES - Pattern & Texture Based (10)
    'texture-canvas': { size: 40, opacity: 80, hardness: 55, flow: 70, spacing: 14, smoothing: 8, angle: 0, angleJitter: 20, scatterX: 8, scatterY: 8 },
    'texture-linen': { size: 38, opacity: 82, hardness: 58, flow: 72, spacing: 13, smoothing: 7, angle: 0, angleJitter: 18, scatterX: 7, scatterY: 7 },
    'texture-paper': { size: 35, opacity: 75, hardness: 60, flow: 68, spacing: 12, smoothing: 10, angle: 0, angleJitter: 15, scatterX: 9, scatterY: 9 },
    'texture-burlap': { size: 42, opacity: 78, hardness: 62, flow: 74, spacing: 15, smoothing: 6, angle: 0, angleJitter: 22, scatterX: 12, scatterY: 12 },
    'texture-concrete': { size: 50, opacity: 70, hardness: 50, flow: 65, spacing: 18, smoothing: 5, angle: 0, angleJitter: 30, scatterX: 20, scatterY: 20 },
    'texture-wood': { size: 45, opacity: 76, hardness: 65, flow: 70, spacing: 16, smoothing: 6, angle: 90, angleJitter: 5, scatterX: 3, scatterY: 18 },
    'texture-bark': { size: 40, opacity: 74, hardness: 68, flow: 72, spacing: 17, smoothing: 4, angle: 45, angleJitter: 35, scatterX: 15, scatterY: 15 },
    'texture-stone': { size: 48, opacity: 82, hardness: 72, flow: 78, spacing: 16, smoothing: 5, angle: 0, angleJitter: 40, scatterX: 16, scatterY: 16 },
    'texture-fabric': { size: 36, opacity: 80, hardness: 56, flow: 70, spacing: 13, smoothing: 8, angle: 0, angleJitter: 25, scatterX: 10, scatterY: 10 },
    'texture-grain': { size: 32, opacity: 72, hardness: 62, flow: 68, spacing: 14, smoothing: 9, angle: 0, angleJitter: 28, scatterX: 12, scatterY: 12 },
    
    // ENHANCED PAINTER/KRITA-STYLE BRUSHES - Using new advanced features (20)
    // Natural Media with Bristles
    'bristle-oil-round': { size: 30, opacity: 90, hardness: 55, flow: 80, spacing: 10, smoothing: 8, angle: 0, angleJitter: 12, scatterX: 4, scatterY: 4 },
    'bristle-oil-flat': { size: 40, opacity: 92, hardness: 60, flow: 85, spacing: 12, smoothing: 6, angle: 0, angleJitter: 8, scatterX: 3, scatterY: 3 },
    'bristle-acrylic-round': { size: 28, opacity: 88, hardness: 58, flow: 82, spacing: 9, smoothing: 7, angle: 0, angleJitter: 10, scatterX: 3, scatterY: 3 },
    'bristle-acrylic-flat': { size: 38, opacity: 90, hardness: 62, flow: 84, spacing: 11, smoothing: 5, angle: 0, angleJitter: 7, scatterX: 2, scatterY: 2 },
    
    // Color Mixing Brushes
    'mixer-color-pickup': { size: 35, opacity: 75, hardness: 50, flow: 65, spacing: 8, smoothing: 15, angle: 0, angleJitter: 5, scatterX: 3, scatterY: 3 },
    'wet-blend-natural': { size: 45, opacity: 70, hardness: 40, flow: 60, spacing: 7, smoothing: 18, angle: 0, angleJitter: 8, scatterX: 4, scatterY: 4 },
    'glazing-transparent': { size: 60, opacity: 40, hardness: 25, flow: 35, spacing: 10, smoothing: 20, angle: 0, angleJitter: 5, scatterX: 3, scatterY: 3 },
    
    // Dual Brush Effects
    'dual-texture-soft': { size: 40, opacity: 80, hardness: 45, flow: 70, spacing: 12, smoothing: 12, angle: 0, angleJitter: 15, scatterX: 6, scatterY: 6 },
    'dual-texture-hard': { size: 35, opacity: 85, hardness: 70, flow: 75, spacing: 10, smoothing: 8, angle: 0, angleJitter: 12, scatterX: 5, scatterY: 5 },
    
    // Expressive Brushes with Color Dynamics
    'impressionist-dab': { size: 25, opacity: 85, hardness: 65, flow: 80, spacing: 18, smoothing: 5, angle: 0, angleJitter: 45, scatterX: 15, scatterY: 15 },
    'expressionist-stroke': { size: 35, opacity: 90, hardness: 60, flow: 85, spacing: 15, smoothing: 3, angle: 0, angleJitter: 60, scatterX: 20, scatterY: 12 },
    'pointillist-dot': { size: 15, opacity: 95, hardness: 80, flow: 95, spacing: 30, smoothing: 2, angle: 0, angleJitter: 180, scatterX: 25, scatterY: 25 },
    
    // Advanced Watercolor
    'watercolor-blooming': { size: 55, opacity: 35, hardness: 8, flow: 28, spacing: 6, smoothing: 22, angle: 0, angleJitter: 15, scatterX: 20, scatterY: 20 },
    'watercolor-granulation': { size: 45, opacity: 50, hardness: 20, flow: 40, spacing: 10, smoothing: 15, angle: 0, angleJitter: 10, scatterX: 15, scatterY: 15 },
    
    // Specialty Brushes
    'sumi-ink-brush': { size: 25, opacity: 95, hardness: 75, flow: 90, spacing: 8, smoothing: 25, angle: 0, angleJitter: 5, scatterX: 2, scatterY: 2 },
    'chinese-calligraphy': { size: 30, opacity: 100, hardness: 85, flow: 95, spacing: 10, smoothing: 20, angle: 45, angleJitter: 3, scatterX: 1, scatterY: 1 },
    'ink-wash': { size: 50, opacity: 60, hardness: 30, flow: 50, spacing: 12, smoothing: 18, angle: 0, angleJitter: 12, scatterX: 10, scatterY: 10 },
    
    // High-Performance Brushes
    'quick-sketch': { size: 18, opacity: 80, hardness: 70, flow: 85, spacing: 12, smoothing: 15, angle: 0, angleJitter: 20, scatterX: 5, scatterY: 5 },
    'rapid-paint': { size: 40, opacity: 85, hardness: 60, flow: 80, spacing: 15, smoothing: 10, angle: 0, angleJitter: 15, scatterX: 8, scatterY: 8 },
    'speed-liner': { size: 12, opacity: 100, hardness: 95, flow: 100, spacing: 8, smoothing: 35, angle: 0, angleJitter: 0, scatterX: 0, scatterY: 0 }
};

// Canvas Elements - will be initialized in init()
let mainCanvas;
let drawCanvas;
let mainCtx;
let drawCtx;

// ==================================================================
// CATEGORY 5: SETUP EVENT LISTENERS
// ==================================================================

function setupCategory5Features() {
    // Convert to Smart Object button
    const convertToSmartObjectBtn = document.getElementById('convert-to-smart-object-btn');
    if (convertToSmartObjectBtn) {
        convertToSmartObjectBtn.addEventListener('click', () => {
            if (state.activeLayer) {
                enhanceSmartObjectLayer(state.activeLayer);
            }
        });
    }
    
    // Link Layers button
    const linkLayersBtn = document.getElementById('link-layers-btn');
    if (linkLayersBtn) {
        linkLayersBtn.addEventListener('click', () => {
            // TODO: Show dialog to select layers to link
            showNotification('ℹ️ Select multiple layers (hold Ctrl) then click Link Layers', 'info');
        });
    }
    
    // Create Fill Layer button
    const createFillLayerBtn = document.getElementById('create-fill-layer-btn');
    if (createFillLayerBtn) {
        createFillLayerBtn.addEventListener('click', () => {
            showFillLayerDialog();
        });
    }
    
    // Create Shape Layer button
    const createShapeLayerBtn = document.getElementById('create-shape-layer-btn');
    if (createShapeLayerBtn) {
        createShapeLayerBtn.addEventListener('click', () => {
            showShapeLayerDialog();
        });
    }
    
    // Layer Comps button
    const layerCompsBtn = document.getElementById('layer-comps-btn');
    if (layerCompsBtn) {
        layerCompsBtn.addEventListener('click', () => {
            showLayerCompsDialog();
        });
    }
    
    // Layer search input
    const layerSearchInput = document.getElementById('layer-search-input');
    if (layerSearchInput) {
        layerSearchInput.addEventListener('input', (e) => {
            layerFilters.searchText = e.target.value;
            updateLayersList();
        });
    }
    
    // Layer filter type
    const layerFilterType = document.getElementById('layer-filter-type');
    if (layerFilterType) {
        layerFilterType.addEventListener('change', (e) => {
            layerFilters.filterType = e.target.value;
            updateLayersList();
        });
    }
    
    // Layer lock checkboxes
    const lockPosition = document.getElementById('lock-position');
    const lockPixels = document.getElementById('lock-pixels');
    const lockTransparency = document.getElementById('lock-transparency');
    const lockAll = document.getElementById('lock-all');
    
    if (lockPosition) {
        lockPosition.addEventListener('change', (e) => {
            if (state.activeLayer) {
                setLayerLock(state.activeLayer, 'position', e.target.checked);
            }
        });
    }
    
    if (lockPixels) {
        lockPixels.addEventListener('change', (e) => {
            if (state.activeLayer) {
                setLayerLock(state.activeLayer, 'pixels', e.target.checked);
            }
        });
    }
    
    if (lockTransparency) {
        lockTransparency.addEventListener('change', (e) => {
            if (state.activeLayer) {
                setLayerLock(state.activeLayer, 'transparency', e.target.checked);
            }
        });
    }
    
    if (lockAll) {
        lockAll.addEventListener('change', (e) => {
            if (state.activeLayer) {
                setLayerLock(state.activeLayer, 'all', e.target.checked);
            }
        });
    }
    
    // Color label buttons
    const colorLabelBtns = document.querySelectorAll('.color-label-btn');
    colorLabelBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const color = btn.dataset.color;
            if (state.activeLayer) {
                setLayerColorLabel(state.activeLayer, color);
                
                // Update active state
                colorLabelBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
        });
    });
    
    // Layer Style Presets button
    const layerStylePresetsBtn = document.getElementById('layer-style-presets-btn');
    if (layerStylePresetsBtn) {
        layerStylePresetsBtn.addEventListener('click', () => {
            showLayerStylePresetsDialog();
        });
    }
    
    // Global Light controls
    const globalLightAngle = document.getElementById('global-light-angle');
    const globalLightAngleValue = document.getElementById('global-light-angle-value');
    const applyGlobalLightBtn = document.getElementById('apply-global-light-btn');
    
    if (globalLightAngle && globalLightAngleValue) {
        globalLightAngle.addEventListener('input', (e) => {
            globalLightAngleValue.textContent = e.target.value + '°';
        });
    }
    
    if (applyGlobalLightBtn) {
        applyGlobalLightBtn.addEventListener('click', () => {
            const angle = parseInt(globalLightAngle.value);
            setGlobalLight(angle, 30);
            showNotification('✅ Global light applied to all layers', 'success');
        });
    }
    
    // Load style presets from localStorage
    loadStylePresets();
}

// Dialog functions for Category 5 features
function showFillLayerDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'modal';
    dialog.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <h2>Create Fill Layer</h2>
            <div class="setting-group">
                <label>Fill Type:</label>
                <select id="fill-type-select" class="brush-select">
                    <option value="solid">Solid Color</option>
                    <option value="gradient">Gradient</option>
                    <option value="pattern">Pattern</option>
                </select>
            </div>
            <div id="solid-fill-options" class="setting-group">
                <label>Color:</label>
                <input type="color" id="fill-color-input" value="${state.color}" class="color-input">
            </div>
            <div id="gradient-fill-options" class="setting-group" style="display: none;">
                <label>Gradient Type:</label>
                <select id="gradient-type-select" class="brush-select">
                    <option value="linear">Linear</option>
                    <option value="radial">Radial</option>
                </select>
                <p style="font-size: 12px; color: #888; margin-top: 10px;">Gradient will use default colors. Use gradient editor to customize.</p>
            </div>
            <div class="modal-buttons">
                <button class="btn" id="create-fill-layer-confirm">Create</button>
                <button class="btn" id="cancel-fill-layer">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    const fillTypeSelect = dialog.querySelector('#fill-type-select');
    const solidOptions = dialog.querySelector('#solid-fill-options');
    const gradientOptions = dialog.querySelector('#gradient-fill-options');
    
    fillTypeSelect.addEventListener('change', () => {
        solidOptions.style.display = fillTypeSelect.value === 'solid' ? 'block' : 'none';
        gradientOptions.style.display = fillTypeSelect.value === 'gradient' ? 'block' : 'none';
    });
    
    dialog.querySelector('#create-fill-layer-confirm').addEventListener('click', () => {
        const fillType = fillTypeSelect.value;
        let fillData = {};
        
        if (fillType === 'solid') {
            fillData = { color: dialog.querySelector('#fill-color-input').value };
        } else if (fillType === 'gradient') {
            const gradientType = dialog.querySelector('#gradient-type-select').value;
            fillData = {
                type: gradientType,
                stops: [
                    { position: 0, color: state.color },
                    { position: 1, color: state.secondaryColor || '#ffffff' }
                ],
                x0: 0, y0: 0,
                x1: state.canvas.width, y1: state.canvas.height
            };
        }
        
        createFillLayer(fillType, fillData);
        document.body.removeChild(dialog);
        showNotification('✅ Fill layer created', 'success');
    });
    
    dialog.querySelector('#cancel-fill-layer').addEventListener('click', () => {
        document.body.removeChild(dialog);
    });
}

function showShapeLayerDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'modal';
    dialog.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <h2>Create Shape Layer</h2>
            <div class="setting-group">
                <label>Shape Type:</label>
                <select id="shape-type-select" class="brush-select">
                    <option value="rectangle">Rectangle</option>
                    <option value="ellipse">Ellipse</option>
                    <option value="polygon">Polygon</option>
                </select>
            </div>
            <div class="setting-group">
                <label>Fill Color:</label>
                <input type="color" id="shape-fill-color" value="${state.color}" class="color-input">
            </div>
            <div class="setting-group">
                <label>Stroke Width:</label>
                <input type="range" id="shape-stroke-width" min="0" max="20" value="0" class="slider">
                <span id="shape-stroke-width-value">0</span>
            </div>
            <div class="setting-group">
                <label>Stroke Color:</label>
                <input type="color" id="shape-stroke-color" value="#000000" class="color-input">
            </div>
            <div class="modal-buttons">
                <button class="btn" id="create-shape-layer-confirm">Create</button>
                <button class="btn" id="cancel-shape-layer">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    const strokeWidthInput = dialog.querySelector('#shape-stroke-width');
    const strokeWidthValue = dialog.querySelector('#shape-stroke-width-value');
    
    strokeWidthInput.addEventListener('input', () => {
        strokeWidthValue.textContent = strokeWidthInput.value;
    });
    
    dialog.querySelector('#create-shape-layer-confirm').addEventListener('click', () => {
        const shapeType = dialog.querySelector('#shape-type-select').value;
        const centerX = state.canvas.width / 2;
        const centerY = state.canvas.height / 2;
        
        let shapeData = {
            fillColor: dialog.querySelector('#shape-fill-color').value,
            strokeColor: dialog.querySelector('#shape-stroke-color').value,
            strokeWidth: parseInt(strokeWidthInput.value)
        };
        
        if (shapeType === 'rectangle') {
            shapeData = { 
                ...shapeData,
                x: centerX - 100, 
                y: centerY - 100, 
                width: 200, 
                height: 200 
            };
        } else if (shapeType === 'ellipse') {
            shapeData = { 
                ...shapeData,
                cx: centerX, 
                cy: centerY, 
                rx: 100, 
                ry: 100 
            };
        } else if (shapeType === 'polygon') {
            shapeData = { 
                ...shapeData,
                points: [
                    { x: centerX, y: centerY - 100 },
                    { x: centerX + 100, y: centerY + 100 },
                    { x: centerX - 100, y: centerY + 100 }
                ]
            };
        }
        
        createShapeLayer(shapeType, shapeData);
        document.body.removeChild(dialog);
        showNotification('✅ Shape layer created', 'success');
    });
    
    dialog.querySelector('#cancel-shape-layer').addEventListener('click', () => {
        document.body.removeChild(dialog);
    });
}

function showLayerCompsDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'modal';
    dialog.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <h2>Layer Comps</h2>
            <div class="setting-group">
                <button class="btn" id="create-new-comp-btn" style="width: 100%;">Create New Comp</button>
            </div>
            <div id="layer-comps-list" style="max-height: 300px; overflow-y: auto; margin-top: 10px;">
                ${layerComps.length === 0 ? '<p style="color: #888; text-align: center;">No layer comps yet</p>' : ''}
                ${layerComps.map(comp => `
                    <div class="comp-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #2a2a2a; margin: 5px 0; border-radius: 4px;">
                        <span>${comp.name}</span>
                        <div>
                            <button class="btn" onclick="applyLayerComp(${comp.id})">Apply</button>
                            <button class="btn" onclick="deleteLayerComp(${comp.id}); this.closest('.comp-item').remove();">Delete</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="modal-buttons">
                <button class="btn" id="close-comps-dialog">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    dialog.querySelector('#create-new-comp-btn').addEventListener('click', () => {
        const name = prompt('Enter name for layer comp:');
        if (name) {
            createLayerComp(name);
            document.body.removeChild(dialog);
            showLayerCompsDialog(); // Refresh dialog
        }
    });
    
    dialog.querySelector('#close-comps-dialog').addEventListener('click', () => {
        document.body.removeChild(dialog);
    });
}

function showLayerStylePresetsDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'modal';
    dialog.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <h2>Layer Style Presets</h2>
            <div class="setting-group">
                <button class="btn" id="save-current-style-btn" style="width: 100%;">Save Current Style as Preset</button>
            </div>
            <div id="style-presets-list" style="max-height: 300px; overflow-y: auto; margin-top: 10px;">
                ${Object.keys(layerStylePresets).map(key => {
                    const preset = layerStylePresets[key];
                    return `
                        <div class="preset-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #2a2a2a; margin: 5px 0; border-radius: 4px;">
                            <span>${preset.name}</span>
                            <button class="btn" onclick="applyStylePreset(state.activeLayer, '${key}')">Apply</button>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="modal-buttons">
                <button class="btn" id="close-presets-dialog">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    dialog.querySelector('#save-current-style-btn').addEventListener('click', () => {
        if (!state.activeLayer) {
            showNotification('⚠️ No active layer', 'warning');
            return;
        }
        const name = prompt('Enter name for style preset:');
        if (name) {
            saveStylePreset(name, state.activeLayer);
            document.body.removeChild(dialog);
            showLayerStylePresetsDialog(); // Refresh dialog
        }
    });
    
    dialog.querySelector('#close-presets-dialog').addEventListener('click', () => {
        document.body.removeChild(dialog);
    });
}

// ==================================================================
// END CATEGORY 5: SETUP EVENT LISTENERS
// ==================================================================

// Initialize Application
function init() {
    // Initialize canvas elements after DOM is ready
    mainCanvas = document.getElementById('main-canvas');
    drawCanvas = document.getElementById('draw-canvas');
    mainCtx = mainCanvas.getContext('2d', { willReadFrequently: true });
    drawCtx = drawCanvas.getContext('2d', { willReadFrequently: true });
    
    setupCanvas();
    setupTools();
    setupBrushSettings();
    setupBrushPresets();
    setupColorPicker();
    setupLayers();
    setupCanvasEvents();
    setupKeyboardShortcuts();
    setupMenuHandlers();
    setupBrowserMenuBar();
    setupPanelControls();
    setupExpandableSections();
    setupNewFeatures();
    setupContextualTaskbar();
    initSettingsDialog();
    initRulers();
    initGradientEditor();
    
    // Load saved brush presets
    loadBrushPresets();
    
    // Load saved keyboard shortcuts
    loadKeyboardShortcuts();
    
    // Phase 10: Load custom themes and apply saved theme
    loadCustomThemes();
    loadTheme();
    
    // Phase 10: Load interface scale
    loadInterfaceScale();
    
    // NEW: Load application state (persistence)
    loadAppState();
    
    // NEW: Setup auto-save functionality
    setupAutoSaveUI();
    
    // NEW: Setup brush renaming
    setupBrushRenamingUI();
    
    // NEW: Enhance panel docking with nesting support
    enhancePanelDockingWithNesting();
    enhancePanelDragging();
    
    // Phase 15: Initialize Performance & Export features
    initPhase15Features();
    
    // Phase 12: Initialize Animation & Recording features
    initPhase12Features();
    
    // Phase 14: Initialize Cloud & Collaboration features
    initPhase14Features();
    
    // Category 1: Initialize AI Tools rendering hooks
    setupAIRenderingHook();
    
    // Category 5: Initialize Layer Management & Compositing features
    setupCategory5Features();
    
    // Create initial layer
    addLayer('Background');
    
    // Save state on page unload
    window.addEventListener('beforeunload', () => {
        saveAppState();
    });
}

// Setup Canvas
function setupCanvas() {
    mainCanvas.width = state.canvas.width;
    mainCanvas.height = state.canvas.height;
    drawCanvas.width = state.canvas.width;
    drawCanvas.height = state.canvas.height;
    
    updateCanvasInfo();
}

// Setup Tools
function setupTools() {
    const toolButtons = document.querySelectorAll('.tool-btn');
    toolButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            selectTool(btn.dataset.tool);
        });
    });
}

// Setup Brush Settings
function setupBrushSettings() {
    const sizeSlider = document.getElementById('brush-size');
    const sizeValue = document.getElementById('brush-size-value');
    sizeSlider.addEventListener('input', (e) => {
        state.brush.size = parseInt(e.target.value);
        sizeValue.textContent = state.brush.size;
        updateCursor();
    });
    
    const opacitySlider = document.getElementById('brush-opacity');
    const opacityValue = document.getElementById('brush-opacity-value');
    opacitySlider.addEventListener('input', (e) => {
        state.brush.opacity = parseInt(e.target.value);
        opacityValue.textContent = state.brush.opacity;
    });
    
    const hardnessSlider = document.getElementById('brush-hardness');
    const hardnessValue = document.getElementById('brush-hardness-value');
    hardnessSlider.addEventListener('input', (e) => {
        state.brush.hardness = parseInt(e.target.value);
        hardnessValue.textContent = state.brush.hardness;
    });
    
    const flowSlider = document.getElementById('brush-flow');
    const flowValue = document.getElementById('brush-flow-value');
    flowSlider.addEventListener('input', (e) => {
        state.brush.flow = parseInt(e.target.value);
        flowValue.textContent = state.brush.flow;
    });
    
    const spacingSlider = document.getElementById('brush-spacing');
    const spacingValue = document.getElementById('brush-spacing-value');
    spacingSlider.addEventListener('input', (e) => {
        state.brush.spacing = parseInt(e.target.value);
        spacingValue.textContent = state.brush.spacing;
    });
    
    const smoothingSlider = document.getElementById('brush-smoothing');
    const smoothingValue = document.getElementById('brush-smoothing-value');
    smoothingSlider.addEventListener('input', (e) => {
        state.brush.smoothing = parseInt(e.target.value);
        smoothingValue.textContent = state.brush.smoothing;
    });
    
    const smoothingModeSelect = document.getElementById('smoothing-mode');
    smoothingModeSelect.addEventListener('change', (e) => {
        state.brush.smoothingMode = e.target.value;
    });
    
    const angleSlider = document.getElementById('brush-angle');
    const angleValue = document.getElementById('brush-angle-value');
    angleSlider.addEventListener('input', (e) => {
        state.brush.angle = parseInt(e.target.value);
        angleValue.textContent = state.brush.angle;
    });
    
    const angleJitterSlider = document.getElementById('brush-angle-jitter');
    const angleJitterValue = document.getElementById('brush-angle-jitter-value');
    angleJitterSlider.addEventListener('input', (e) => {
        state.brush.angleJitter = parseInt(e.target.value);
        angleJitterValue.textContent = state.brush.angleJitter;
    });
    
    const scatterXSlider = document.getElementById('brush-scatter-x');
    const scatterXValue = document.getElementById('brush-scatter-x-value');
    scatterXSlider.addEventListener('input', (e) => {
        state.brush.scatterX = parseInt(e.target.value);
        scatterXValue.textContent = state.brush.scatterX;
    });
    
    const scatterYSlider = document.getElementById('brush-scatter-y');
    const scatterYValue = document.getElementById('brush-scatter-y-value');
    scatterYSlider.addEventListener('input', (e) => {
        state.brush.scatterY = parseInt(e.target.value);
        scatterYValue.textContent = state.brush.scatterY;
    });
    
    const pressureOpacity = document.getElementById('pressure-opacity');
    if (pressureOpacity) {
        pressureOpacity.addEventListener('change', (e) => {
            state.brush.pressureOpacity = e.target.checked;
        });
    }
    
    const pressureSize = document.getElementById('pressure-size');
    if (pressureSize) {
        pressureSize.addEventListener('change', (e) => {
            state.brush.pressureSize = e.target.checked;
        });
    }
    
    // NEW: Advanced brush dynamics handlers
    const velocitySizeSlider = document.getElementById('brush-velocity-size');
    const velocitySizeValue = document.getElementById('brush-velocity-size-value');
    if (velocitySizeSlider && velocitySizeValue) {
        velocitySizeSlider.addEventListener('input', (e) => {
            state.brush.velocitySize = parseInt(e.target.value);
            velocitySizeValue.textContent = state.brush.velocitySize;
        });
    }
    
    const velocityOpacitySlider = document.getElementById('brush-velocity-opacity');
    const velocityOpacityValue = document.getElementById('brush-velocity-opacity-value');
    if (velocityOpacitySlider && velocityOpacityValue) {
        velocityOpacitySlider.addEventListener('input', (e) => {
            state.brush.velocityOpacity = parseInt(e.target.value);
            velocityOpacityValue.textContent = state.brush.velocityOpacity;
        });
    }
    
    const tiltSizeSlider = document.getElementById('brush-tilt-size');
    const tiltSizeValue = document.getElementById('brush-tilt-size-value');
    if (tiltSizeSlider && tiltSizeValue) {
        tiltSizeSlider.addEventListener('input', (e) => {
            state.brush.tiltSize = parseInt(e.target.value);
            tiltSizeValue.textContent = state.brush.tiltSize;
        });
    }
    
    const tiltAngleSlider = document.getElementById('brush-tilt-angle');
    const tiltAngleValue = document.getElementById('brush-tilt-angle-value');
    if (tiltAngleSlider && tiltAngleValue) {
        tiltAngleSlider.addEventListener('input', (e) => {
            state.brush.tiltAngle = parseInt(e.target.value);
            tiltAngleValue.textContent = state.brush.tiltAngle;
        });
    }
    
    // PHYSICS: Dynamic Brush Physics handlers
    const physicsEnabled = document.getElementById('brush-physics-enabled');
    if (physicsEnabled) {
        physicsEnabled.addEventListener('change', (e) => {
            state.brush.physicsEnabled = e.target.checked;
            // Reset physics state when toggling
            if (state.brush.physicsEnabled) {
                resetBrushPhysics(state.lastX, state.lastY);
            }
        });
    }
    
    const dragSlider = document.getElementById('brush-drag');
    const dragValue = document.getElementById('brush-drag-value');
    if (dragSlider && dragValue) {
        dragSlider.addEventListener('input', (e) => {
            state.brush.drag = parseInt(e.target.value);
            dragValue.textContent = state.brush.drag;
        });
    }
    
    const massSlider = document.getElementById('brush-mass');
    const massValue = document.getElementById('brush-mass-value');
    if (massSlider && massValue) {
        massSlider.addEventListener('input', (e) => {
            state.brush.mass = parseInt(e.target.value);
            massValue.textContent = state.brush.mass;
        });
    }
    
    const springTensionSlider = document.getElementById('brush-spring-tension');
    const springTensionValue = document.getElementById('brush-spring-tension-value');
    if (springTensionSlider && springTensionValue) {
        springTensionSlider.addEventListener('input', (e) => {
            state.brush.springTension = parseInt(e.target.value);
            springTensionValue.textContent = state.brush.springTension;
        });
    }
    
    const springDampingSlider = document.getElementById('brush-spring-damping');
    const springDampingValue = document.getElementById('brush-spring-damping-value');
    if (springDampingSlider && springDampingValue) {
        springDampingSlider.addEventListener('input', (e) => {
            state.brush.springDamping = parseInt(e.target.value);
            springDampingValue.textContent = state.brush.springDamping;
        });
    }
    
    // Phase 1: Dual Brush System handlers
    const dualBrushEnabled = document.getElementById('dual-brush-enabled');
    const dualBrushSettings = document.getElementById('dual-brush-settings');
    if (dualBrushEnabled && dualBrushSettings) {
        dualBrushEnabled.addEventListener('change', (e) => {
            state.brush.dualBrushEnabled = e.target.checked;
            dualBrushSettings.classList.toggle('hidden', !e.target.checked);
        });
    }
    
    const dualBrushMode = document.getElementById('dual-brush-mode');
    if (dualBrushMode) {
        dualBrushMode.addEventListener('change', (e) => {
            state.brush.dualBrushMode = e.target.value;
        });
    }
    
    const dualBrushSizeSlider = document.getElementById('dual-brush-size');
    const dualBrushSizeValue = document.getElementById('dual-brush-size-value');
    if (dualBrushSizeSlider && dualBrushSizeValue) {
        dualBrushSizeSlider.addEventListener('input', (e) => {
            state.brush.dualBrushSize = parseInt(e.target.value);
            dualBrushSizeValue.textContent = state.brush.dualBrushSize;
        });
    }
    
    const dualBrushSpacingSlider = document.getElementById('dual-brush-spacing');
    const dualBrushSpacingValue = document.getElementById('dual-brush-spacing-value');
    if (dualBrushSpacingSlider && dualBrushSpacingValue) {
        dualBrushSpacingSlider.addEventListener('input', (e) => {
            state.brush.dualBrushSpacing = parseInt(e.target.value);
            dualBrushSpacingValue.textContent = state.brush.dualBrushSpacing;
        });
    }
    
    const dualBrushScatterSlider = document.getElementById('dual-brush-scatter');
    const dualBrushScatterValue = document.getElementById('dual-brush-scatter-value');
    if (dualBrushScatterSlider && dualBrushScatterValue) {
        dualBrushScatterSlider.addEventListener('input', (e) => {
            state.brush.dualBrushScatter = parseInt(e.target.value);
            dualBrushScatterValue.textContent = state.brush.dualBrushScatter;
        });
    }
    
    // Phase 2: Texture & Pattern System handlers
    const textureEnabled = document.getElementById('texture-enabled');
    const textureSettings = document.getElementById('texture-settings');
    if (textureEnabled && textureSettings) {
        textureEnabled.addEventListener('change', (e) => {
            state.brush.textureEnabled = e.target.checked;
            textureSettings.classList.toggle('hidden', !e.target.checked);
        });
    }
    
    const textureOpacitySlider = document.getElementById('texture-opacity');
    const textureOpacityValue = document.getElementById('texture-opacity-value');
    if (textureOpacitySlider && textureOpacityValue) {
        textureOpacitySlider.addEventListener('input', (e) => {
            state.brush.textureOpacity = parseInt(e.target.value);
            textureOpacityValue.textContent = state.brush.textureOpacity;
        });
    }
    
    const textureScaleSlider = document.getElementById('texture-scale');
    const textureScaleValue = document.getElementById('texture-scale-value');
    if (textureScaleSlider && textureScaleValue) {
        textureScaleSlider.addEventListener('input', (e) => {
            state.brush.textureScale = parseInt(e.target.value);
            textureScaleValue.textContent = state.brush.textureScale;
        });
    }
    
    const textureRotationSlider = document.getElementById('texture-rotation');
    const textureRotationValue = document.getElementById('texture-rotation-value');
    if (textureRotationSlider && textureRotationValue) {
        textureRotationSlider.addEventListener('input', (e) => {
            state.brush.textureRotation = parseInt(e.target.value);
            textureRotationValue.textContent = state.brush.textureRotation;
        });
    }
    
    const loadTextureBtn = document.getElementById('load-texture-btn');
    if (loadTextureBtn) {
        loadTextureBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const img = new Image();
                        img.onload = () => {
                            // Create a canvas to store the texture
                            const textureCanvas = document.createElement('canvas');
                            textureCanvas.width = img.width;
                            textureCanvas.height = img.height;
                            const textureCtx = textureCanvas.getContext('2d');
                            textureCtx.drawImage(img, 0, 0);
                            
                            // Store texture data in state
                            state.brush.texturePattern = textureCtx.getImageData(0, 0, img.width, img.height);
                            
                            // Show preview
                            const preview = document.getElementById('texture-preview');
                            const previewContainer = document.getElementById('texture-preview-container');
                            if (preview && previewContainer) {
                                const previewCtx = preview.getContext('2d');
                                previewCtx.clearRect(0, 0, preview.width, preview.height);
                                previewCtx.drawImage(img, 0, 0, preview.width, preview.height);
                                previewContainer.style.display = 'block';
                            }
                        };
                        img.src = event.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            };
            input.click();
        });
    }
    
    const clearTextureBtn = document.getElementById('clear-texture-btn');
    if (clearTextureBtn) {
        clearTextureBtn.addEventListener('click', () => {
            state.brush.texturePattern = null;
            const previewContainer = document.getElementById('texture-preview-container');
            if (previewContainer) {
                previewContainer.style.display = 'none';
            }
        });
    }
    
    // Texture Library handlers
    const textureLibrarySelect = document.getElementById('texture-library-select');
    if (textureLibrarySelect) {
        textureLibrarySelect.addEventListener('change', (e) => {
            const textureType = e.target.value;
            if (textureType) {
                loadBuiltInTexture(textureType);
            }
        });
    }
    
    const textureLibraryPreview = document.getElementById('texture-library-preview');
    const textureLibraryGallery = document.getElementById('texture-library-gallery');
    if (textureLibraryPreview && textureLibraryGallery) {
        textureLibraryPreview.addEventListener('change', (e) => {
            textureLibraryGallery.classList.toggle('hidden', !e.target.checked);
            if (e.target.checked) {
                populateTextureGallery();
            }
        });
    }
}

// Setup Brush Presets
function setupBrushPresets() {
    // Quick access preset buttons
    const presetButtons = document.querySelectorAll('.preset-btn');
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const presetName = btn.dataset.preset;
            applyBrushPreset(presetName);
        });
    });
    
    // Brush category dropdown
    const categorySelect = document.getElementById('brush-category');
    const presetSelect = document.getElementById('brush-preset');
    
    if (!categorySelect || !presetSelect) {
        console.warn('Brush preset dropdowns not found');
        return;
    }
    
    // Define brush categories
    const brushCategories = {
        'basic': ['basic', 'soft', 'hard', 'medium', 'fine', 'large-soft', 'large-hard', 'tiny', 'huge', 'detail'],
        'airbrush': ['airbrush', 'airbrush-soft', 'airbrush-fine', 'airbrush-large', 'spray', 'mist', 'fog', 'diffuse', 'speckle', 'gradient-spray'],
        'charcoal': ['charcoal', 'pencil', 'graphite', 'charcoal-soft', 'charcoal-hard', 'sketch', 'conte', 'pastel', 'crayon', 'colored-pencil'],
        'ink': ['ink', 'ink-fine', 'ink-bold', 'technical-pen', 'marker', 'marker-chisel', 'brush-pen', 'calligraphy', 'fountain-pen', 'gel-pen'],
        'watercolor': ['watercolor', 'watercolor-wet', 'watercolor-dry', 'wash', 'watercolor-flat', 'watercolor-round', 'splatter', 'wet-blend', 'watercolor-detail', 'drip'],
        'oil': ['oil-paint', 'oil-flat', 'oil-round', 'oil-fan', 'oil-filbert', 'palette-knife', 'impasto', 'oil-glaze', 'oil-detail', 'oil-textured'],
        'acrylic': ['acrylic', 'acrylic-flat', 'acrylic-round', 'acrylic-bright', 'acrylic-detail', 'acrylic-glaze', 'acrylic-heavy', 'acrylic-fan', 'acrylic-liner', 'acrylic-mop'],
        'digital': ['digital-soft', 'digital-hard', 'digital-round', 'digital-flat', 'digital-texture', 'smudge', 'blend', 'digital-detail', 'digital-fuzzy', 'digital-sharp'],
        'concept': ['concept-soft', 'concept-hard', 'concept-texture', 'cloud', 'smoke', 'grass', 'foliage', 'rocks', 'hair', 'fur'],
        'special': ['glow', 'stars', 'sparkle', 'lightning', 'fire', 'water-ripple', 'snow', 'rain', 'leaves', 'bokeh'],
        'professional': ['2b-graphite-pencil', 'nib-pen-fine', 'nib-pen-medium', 'nib-pen-bold', 'paasche-airbrush', 'winsor-newton-oil-round', 'winsor-newton-oil-flat', 'winsor-newton-acrylic-round', 'winsor-newton-acrylic-flat', 'oil-impasto-heavy'],
        'artrage': ['artrage-thick-oil', 'artrage-oil-brush', 'artrage-watercolor-wet', 'artrage-watercolor-dry', 'artrage-pencil-soft', 'artrage-pencil-hard', 'artrage-palette-knife', 'artrage-roller', 'artrage-airbrush-fine', 'artrage-glitter'],
        'rebelle': ['rebelle-graphite-hb', 'rebelle-graphite-2b', 'rebelle-graphite-4b', 'rebelle-graphite-6b', 'rebelle-graphite-8b', 'rebelle-graphite-h', 'rebelle-graphite-2h', 'rebelle-graphite-4h'],
        'metallic': ['metallic-gold', 'metallic-silver', 'metallic-copper', 'pearlescent', 'iridescent', 'impasto-thick', 'glazing-medium', 'dry-media', 'sponge-natural', 'stipple'],
        'mixer': ['mixer-wet', 'mixer-dry', 'blender-soft', 'blender-hard', 'smudge-soft', 'smudge-hard', 'finger-paint', 'color-sampler', 'paint-mixer', 'palette-scraper'],
        'texture': ['texture-canvas', 'texture-linen', 'texture-paper', 'texture-burlap', 'texture-concrete', 'texture-wood', 'texture-bark', 'texture-stone', 'texture-fabric', 'texture-grain'],
        'enhanced': ['bristle-oil-round', 'bristle-oil-flat', 'bristle-acrylic-round', 'bristle-acrylic-flat', 'mixer-color-pickup', 'wet-blend-natural', 'glazing-transparent', 'dual-texture-soft', 'dual-texture-hard', 'impressionist-dab', 'expressionist-stroke', 'pointillist-dot', 'watercolor-blooming', 'watercolor-granulation', 'sumi-ink-brush', 'chinese-calligraphy', 'ink-wash', 'quick-sketch', 'rapid-paint', 'speed-liner'],
        'imported': [] // Will be populated dynamically
    };
    
    // Populate preset dropdown based on category
    function updatePresetOptions(category) {
        presetSelect.innerHTML = '';
        
        // Handle imported brushes specially
        if (category === 'imported') {
            const importedBrushes = state.customBrushes.filter(b => b.imported);
            if (importedBrushes.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No imported brushes';
                presetSelect.appendChild(option);
            } else {
                importedBrushes.forEach(brush => {
                    const option = document.createElement('option');
                    option.value = brush.name;
                    option.textContent = brush.name;
                    presetSelect.appendChild(option);
                });
            }
        } else {
            const brushes = brushCategories[category] || [];
            brushes.forEach(brushName => {
                const option = document.createElement('option');
                option.value = brushName;
                option.textContent = brushName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                presetSelect.appendChild(option);
            });
        }
    }
    
    // Initialize with basic brushes
    updatePresetOptions('basic');
    
    // Category change handler
    categorySelect.addEventListener('change', (e) => {
        updatePresetOptions(e.target.value);
        // Auto-select first brush in category
        if (presetSelect.options.length > 0) {
            applyBrushPreset(presetSelect.options[0].value);
        }
    });
    
    // Preset selection handler
    presetSelect.addEventListener('change', (e) => {
        applyBrushPreset(e.target.value);
    });
    
    // Brush gallery toggle
    const showBrushGalleryCheckbox = document.getElementById('show-brush-gallery');
    const brushGallery = document.getElementById('brush-gallery');
    if (showBrushGalleryCheckbox && brushGallery) {
        showBrushGalleryCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                brushGallery.classList.remove('hidden');
                updateBrushGallery(categorySelect.value);
            } else {
                brushGallery.classList.add('hidden');
            }
        });
    }
    
    // Function to update brush gallery based on category
    window.updateBrushGallery = function(category) {
        const gallery = document.getElementById('brush-gallery');
        if (!gallery) return;
        
        gallery.innerHTML = '';
        const brushes = brushCategories[category] || [];
        
        // Map of brush names to display names
        const brushNames = {
            'basic': 'Basic', 'soft': 'Soft', 'hard': 'Hard', 'medium': 'Medium', 'fine': 'Fine',
            'rebelle-graphite-hb': 'HB Graphite', 'rebelle-graphite-2b': '2B Graphite',
            'rebelle-graphite-4b': '4B Graphite', 'rebelle-graphite-6b': '6B Graphite',
            'rebelle-graphite-8b': '8B Graphite', 'rebelle-graphite-h': 'H Graphite',
            'rebelle-graphite-2h': '2H Graphite', 'rebelle-graphite-4h': '4H Graphite',
            'watercolor': 'Watercolor', 'watercolor-wet': 'Watercolor Wet', 'watercolor-dry': 'Watercolor Dry',
            'oil-paint': 'Oil Paint', 'oil-flat': 'Oil Flat', 'palette-knife': 'Palette Knife',
            'acrylic': 'Acrylic', 'acrylic-flat': 'Acrylic Flat',
            'ink': 'Ink', 'ink-fine': 'Ink Fine', 'marker': 'Marker'
        };
        
        brushes.forEach(brushId => {
            const item = document.createElement('div');
            item.className = 'brush-gallery-item';
            
            const img = document.createElement('img');
            img.src = `assets/brushes/${brushId}.png`;
            img.alt = brushNames[brushId] || brushId;
            img.onerror = () => {
                // Fallback if image doesn't exist - create placeholder
                img.style.display = 'none';
                const placeholder = document.createElement('div');
                placeholder.style.cssText = 'width:100%;height:50px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;font-size:8px;color:#666;';
                placeholder.textContent = 'No preview';
                item.insertBefore(placeholder, item.firstChild);
            };
            
            const nameLabel = document.createElement('div');
            nameLabel.className = 'brush-name';
            nameLabel.textContent = brushNames[brushId] || brushId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            
            item.appendChild(img);
            item.appendChild(nameLabel);
            
            item.addEventListener('click', () => {
                applyBrushPreset(brushId);
                // Update selection
                document.querySelectorAll('.brush-gallery-item').forEach(el => {
                    el.classList.remove('selected');
                });
                item.classList.add('selected');
                // Update dropdown
                presetSelect.value = brushId;
            });
            
            gallery.appendChild(item);
        });
    };
    
    // Update gallery when category changes
    categorySelect.addEventListener('change', (e) => {
        const showGallery = document.getElementById('show-brush-gallery');
        if (showGallery && showGallery.checked) {
            updateBrushGallery(e.target.value);
        }
    });
    
    // Brush Search Functionality
    const brushSearchInput = document.getElementById('brush-search');
    const brushSearchResults = document.getElementById('brush-search-results');
    
    if (brushSearchInput && brushSearchResults) {
        let allBrushes = [];
        let searchTimeout = null; // Debounce timer for search
        
        // Build searchable brush list with category info
        function buildBrushList() {
            allBrushes = [];
            Object.keys(brushCategories).forEach(category => {
                if (category === 'imported') {
                    state.customBrushes.filter(b => b.imported).forEach(brush => {
                        allBrushes.push({
                            id: brush.name,
                            name: brush.name,
                            category: 'imported',
                            displayCategory: 'Imported Brushes'
                        });
                    });
                } else {
                    brushCategories[category].forEach(brushId => {
                        allBrushes.push({
                            id: brushId,
                            name: brushId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                            category: category,
                            displayCategory: getCategoryDisplayName(category)
                        });
                    });
                }
            });
        }
        
        // Get display name for category
        function getCategoryDisplayName(category) {
            const categoryOptions = {
                'basic': 'Basic',
                'airbrush': 'Airbrush',
                'charcoal': 'Charcoal & Pencil',
                'ink': 'Ink & Pen',
                'watercolor': 'Watercolor',
                'oil': 'Oil Paint',
                'acrylic': 'Acrylic',
                'digital': 'Digital Painting',
                'concept': 'Concept Art',
                'special': 'Special Effects',
                'professional': 'Professional Grade',
                'artrage': '🎨 Natural Media',
                'rebelle': '✏️ Graphite Pencils',
                'metallic': '✨ Metallic & Special',
                'mixer': '🎨 Mixer & Blending',
                'texture': '🖼️ Texture Brushes',
                'enhanced': 'Enhanced',
                'imported': 'Imported Brushes'
            };
            return categoryOptions[category] || category;
        }
        
        buildBrushList();
        
        // Search input handler with debounce
        brushSearchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const query = e.target.value.trim().toLowerCase();
                
                if (query === '') {
                    brushSearchResults.textContent = '';
                    // Reset to show all options in current category
                    updatePresetOptions(categorySelect.value);
                    return;
                }
                
                // Filter brushes
                const matches = allBrushes.filter(brush => {
                    return brush.name.toLowerCase().includes(query) ||
                           brush.id.toLowerCase().includes(query) ||
                           brush.displayCategory.toLowerCase().includes(query);
                });
                
                // Update results display
                if (matches.length === 0) {
                    brushSearchResults.textContent = 'No brushes found';
                    brushSearchResults.style.color = '#ff6b6b';
                    presetSelect.innerHTML = '<option value="">No results</option>';
                } else {
                    brushSearchResults.textContent = `Found ${matches.length} brush${matches.length === 1 ? '' : 'es'}`;
                    brushSearchResults.style.color = '#4CAF50';
                    
                    // Populate preset dropdown with matches
                    presetSelect.innerHTML = '';
                    matches.forEach(brush => {
                        const option = document.createElement('option');
                        option.value = brush.id;
                        option.textContent = `${brush.name} (${brush.displayCategory})`;
                        presetSelect.appendChild(option);
                    });
                    
                    // Auto-select first match
                    if (matches.length > 0) {
                        presetSelect.value = matches[0].id;
                    }
                }
            }, 300); // Debounce for 300ms
        });
        
        // Clear search when category is changed
        categorySelect.addEventListener('change', () => {
            brushSearchInput.value = '';
            brushSearchResults.textContent = '';
        });
        
        // Keyboard shortcut for search: Ctrl+Shift+F (to avoid conflict with browser find)
        document.addEventListener('keydown', (e) => {
            // Use Ctrl+Shift+F / Cmd+Shift+F to avoid conflict with browser's Ctrl+F
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
                const leftPanel = document.getElementById('left-panel');
                // Only activate if left panel is visible and not in an input field
                if (leftPanel && !leftPanel.classList.contains('collapsed') && 
                    document.activeElement.tagName !== 'INPUT' && 
                    document.activeElement.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    brushSearchInput.focus();
                    brushSearchInput.select();
                }
            }
        });
    }
}

function applyBrushPreset(presetName) {
    const preset = brushPresets[presetName] || state.customBrushes.find(b => b.name === presetName);
    if (!preset) return;
    
    // Store current preset name for realistic rendering
    state.currentPresetName = presetName;
    
    // Update visual state of preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.preset === presetName) {
            btn.classList.add('active');
        }
    });
    
    // Apply preset values to state
    Object.assign(state.brush, preset);
    
    // Apply color if saved in preset (for tool presets)
    if (preset.color) {
        state.color = preset.color;
        const colorPicker = document.getElementById('color-picker');
        if (colorPicker) {
            colorPicker.value = preset.color;
        }
    }
    
    // Apply tool if saved in preset (for tool presets)
    if (preset.tool) {
        selectTool(preset.tool);
    }
    
    // Update UI controls (with null checks)
    const brushSize = document.getElementById('brush-size');
    const brushSizeValue = document.getElementById('brush-size-value');
    if (brushSize && brushSizeValue) {
        brushSize.value = preset.size;
        brushSizeValue.textContent = preset.size;
    }
    
    const brushOpacity = document.getElementById('brush-opacity');
    const brushOpacityValue = document.getElementById('brush-opacity-value');
    if (brushOpacity && brushOpacityValue) {
        brushOpacity.value = preset.opacity;
        brushOpacityValue.textContent = preset.opacity;
    }
    
    const brushHardness = document.getElementById('brush-hardness');
    const brushHardnessValue = document.getElementById('brush-hardness-value');
    if (brushHardness && brushHardnessValue) {
        brushHardness.value = preset.hardness;
        brushHardnessValue.textContent = preset.hardness;
    }
    
    const brushFlow = document.getElementById('brush-flow');
    const brushFlowValue = document.getElementById('brush-flow-value');
    if (brushFlow && brushFlowValue) {
        brushFlow.value = preset.flow;
        brushFlowValue.textContent = preset.flow;
    }
    
    const brushSpacing = document.getElementById('brush-spacing');
    const brushSpacingValue = document.getElementById('brush-spacing-value');
    if (brushSpacing && brushSpacingValue) {
        brushSpacing.value = preset.spacing;
        brushSpacingValue.textContent = preset.spacing;
    }
    
    const brushSmoothing = document.getElementById('brush-smoothing');
    const brushSmoothingValue = document.getElementById('brush-smoothing-value');
    if (brushSmoothing && brushSmoothingValue) {
        brushSmoothing.value = preset.smoothing;
        brushSmoothingValue.textContent = preset.smoothing;
    }
    
    const brushAngle = document.getElementById('brush-angle');
    const brushAngleValue = document.getElementById('brush-angle-value');
    if (brushAngle && brushAngleValue) {
        brushAngle.value = preset.angle;
        brushAngleValue.textContent = preset.angle;
    }
    
    const brushAngleJitter = document.getElementById('brush-angle-jitter');
    const brushAngleJitterValue = document.getElementById('brush-angle-jitter-value');
    if (brushAngleJitter && brushAngleJitterValue) {
        brushAngleJitter.value = preset.angleJitter;
        brushAngleJitterValue.textContent = preset.angleJitter;
    }
    
    const brushScatterX = document.getElementById('brush-scatter-x');
    const brushScatterXValue = document.getElementById('brush-scatter-x-value');
    if (brushScatterX && brushScatterXValue) {
        brushScatterX.value = preset.scatterX;
        brushScatterXValue.textContent = preset.scatterX;
    }
    
    const brushScatterY = document.getElementById('brush-scatter-y');
    const brushScatterYValue = document.getElementById('brush-scatter-y-value');
    if (brushScatterY && brushScatterYValue) {
        brushScatterY.value = preset.scatterY;
        brushScatterYValue.textContent = preset.scatterY;
    }
    
    // PHYSICS: Update physics UI controls
    const physicsEnabled = document.getElementById('brush-physics-enabled');
    if (physicsEnabled) {
        physicsEnabled.checked = preset.physicsEnabled || false;
    }
    
    const dragSlider = document.getElementById('brush-drag');
    const dragValue = document.getElementById('brush-drag-value');
    if (dragSlider && dragValue) {
        dragSlider.value = preset.drag || 0;
        dragValue.textContent = preset.drag || 0;
    }
    
    const massSlider = document.getElementById('brush-mass');
    const massValue = document.getElementById('brush-mass-value');
    if (massSlider && massValue) {
        massSlider.value = preset.mass || 50;
        massValue.textContent = preset.mass || 50;
    }
    
    const springTensionSlider = document.getElementById('brush-spring-tension');
    const springTensionValue = document.getElementById('brush-spring-tension-value');
    if (springTensionSlider && springTensionValue) {
        springTensionSlider.value = preset.springTension || 50;
        springTensionValue.textContent = preset.springTension || 50;
    }
    
    const springDampingSlider = document.getElementById('brush-spring-damping');
    const springDampingValue = document.getElementById('brush-spring-damping-value');
    if (springDampingSlider && springDampingValue) {
        springDampingSlider.value = preset.springDamping || 50;
        springDampingValue.textContent = preset.springDamping || 50;
    }
    
    updateCursor();
}

// Brush Preset Save/Load System
function saveCurrentBrushPreset(name) {
    const preset = {
        name: name,
        size: state.brush.size,
        opacity: state.brush.opacity,
        hardness: state.brush.hardness,
        flow: state.brush.flow,
        spacing: state.brush.spacing,
        smoothing: state.brush.smoothing,
        smoothingMode: state.brush.smoothingMode,
        angle: state.brush.angle,
        angleJitter: state.brush.angleJitter,
        scatterX: state.brush.scatterX,
        scatterY: state.brush.scatterY,
        tipShape: state.brushTipShape,
        color: state.color,
        tool: state.tool
    };
    
    state.customBrushes.push(preset);
    saveBrushPresetsToStorage();
    return preset;
}

function loadBrushPresets() {
    try {
        const stored = localStorage.getItem('artemis-custom-brushes');
        if (stored) {
            state.customBrushes = JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to load custom brushes:', e);
    }
}

function saveBrushPresetsToStorage() {
    try {
        localStorage.setItem('artemis-custom-brushes', JSON.stringify(state.customBrushes));
    } catch (e) {
        console.error('Failed to save custom brushes:', e);
    }
}

function deleteBrushPreset(name) {
    state.customBrushes = state.customBrushes.filter(b => b.name !== name);
    saveBrushPresetsToStorage();
}

function exportBrushPresets() {
    const data = JSON.stringify(state.customBrushes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'artemis-brushes.json';
    a.click();
    URL.revokeObjectURL(url);
}

function importBrushPresets(fileData) {
    try {
        const imported = JSON.parse(fileData);
        if (Array.isArray(imported)) {
            state.customBrushes = [...state.customBrushes, ...imported];
            saveBrushPresetsToStorage();
            return true;
        }
    } catch (e) {
        console.error('Failed to import brushes:', e);
    }
    return false;
}

// Plugin System
const pluginAPI = {
    // Core API functions available to plugins
    getState: () => state,
    getActiveLayer: () => state.activeLayer,
    getLayers: () => state.layers,
    addLayer: (name, type) => addLayer(name, type),
    applyFilter: (type, options) => applyFilter(type, options),
    getCanvas: () => mainCanvas,
    getContext: () => mainCtx,
    saveState: () => saveState(),
    compositeAllLayers: () => compositeAllLayers(),
    
    // Tool registration
    registerTool: (toolName, toolHandler) => {
        state.plugins.push({
            type: 'tool',
            name: toolName,
            handler: toolHandler
        });
    },
    
    // Filter registration
    registerFilter: (filterName, filterFunction) => {
        state.plugins.push({
            type: 'filter',
            name: filterName,
            function: filterFunction
        });
    },
    
    // Menu registration
    registerMenuItem: (menuPath, handler) => {
        state.plugins.push({
            type: 'menu',
            path: menuPath,
            handler: handler
        });
    }
};

function loadPlugin(pluginCode) {
    try {
        // Create isolated scope for plugin
        const pluginFunction = new Function('api', pluginCode);
        pluginFunction(pluginAPI);
        return true;
    } catch (e) {
        console.error('Failed to load plugin:', e);
        return false;
    }
}

function unloadPlugin(pluginName) {
    state.plugins = state.plugins.filter(p => p.name !== pluginName);
}

function listPlugins() {
    return state.plugins.map(p => ({
        type: p.type,
        name: p.name
    }));
}

// Example plugin structure:
// const examplePlugin = `
//     api.registerFilter('myCustomFilter', (imageData, options) => {
//         // Process imageData
//         return imageData;
//     });
//     
//     api.registerTool('myTool', {
//         onStart: (x, y) => { /* ... */ },
//         onMove: (x, y) => { /* ... */ },
//         onEnd: () => { /* ... */ }
//     });
// `;

// Setup New Features
function setupNewFeatures() {
    // Gradient type selector
    const gradientTypeSelect = document.getElementById('gradient-type');
    if (gradientTypeSelect) {
        gradientTypeSelect.addEventListener('change', (e) => {
            state.gradient.type = e.target.value;
        });
    }
    
    // Gradient color 2
    const gradientColor2 = document.getElementById('gradient-color-2');
    if (gradientColor2) {
        gradientColor2.addEventListener('change', (e) => {
            state.gradient.colorStops[1].color = e.target.value;
        });
    }
    
    // Brush tip shape selector
    const brushTipShapeSelect = document.getElementById('brush-tip-shape');
    if (brushTipShapeSelect) {
        brushTipShapeSelect.addEventListener('change', (e) => {
            state.brushTipShape = e.target.value;
            updateCursor();
        });
    }
    
    // Load brush texture button
    const loadBrushTextureBtn = document.getElementById('load-brush-texture-btn');
    if (loadBrushTextureBtn) {
        loadBrushTextureBtn.addEventListener('click', () => {
            if (typeof require === 'undefined') {
                // Browser mode - use file input
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/png,image/jpeg,image/jpg';
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            const img = new Image();
                            img.onload = () => {
                                state.brushTipTexture = img;
                                state.brushTipShape = 'custom';
                                const brushTipShape = document.getElementById('brush-tip-shape');
                                if (brushTipShape) {
                                    brushTipShape.value = 'custom';
                                }
                            };
                            img.src = event.target.result;
                        };
                        reader.readAsDataURL(file);
                    }
                };
                input.click();
            } else {
                ipcRenderer.send('load-brush-texture');
            }
        });
    }
    
    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const filterType = btn.dataset.filter;
            let options = {};
            
            if (filterType === 'brightness' || filterType === 'contrast') {
                const value = prompt(`Enter ${filterType} value (-100 to 100):`, '0');
                if (value !== null) {
                    options.value = parseInt(value);
                    applyFilter(filterType, options);
                }
            } else if (filterType === 'blur') {
                const radius = prompt('Enter blur radius (1-10):', '3');
                if (radius !== null) {
                    options.radius = parseInt(radius);
                    applyFilter(filterType, options);
                }
            } else if (filterType === 'lensblur') {
                const radius = prompt('Enter lens blur radius (1-20):', '5');
                if (radius !== null) {
                    options.radius = parseInt(radius);
                    options.intensity = 1.0;
                    applyLensBlur(options);
                }
            } else if (filterType === 'godrays') {
                // Use canvas center for godrays
                options.centerX = state.canvas.width / 2;
                options.centerY = state.canvas.height / 4;
                options.intensity = 0.4;
                applyFilter(filterType, options);
            } else if (filterType === 'sunlight') {
                // Get custom sunlight settings
                const colorInput = document.getElementById('sunlight-color');
                const intensityInput = document.getElementById('sunlight-intensity');
                const hexColor = colorInput ? colorInput.value : '#fff0c8';
                const intensity = intensityInput ? parseInt(intensityInput.value) / 100 : 0.3;
                
                // Convert hex to RGB
                const r = parseInt(hexColor.substr(1, 2), 16);
                const g = parseInt(hexColor.substr(3, 2), 16);
                const b = parseInt(hexColor.substr(5, 2), 16);
                
                options.color = { r, g, b };
                options.intensity = intensity;
                applyFilter(filterType, options);
            } else if (filterType === 'moonlight') {
                // Get custom moonlight settings
                const colorInput = document.getElementById('moonlight-color');
                const intensityInput = document.getElementById('moonlight-intensity');
                const hexColor = colorInput ? colorInput.value : '#b4c8ff';
                const intensity = intensityInput ? parseInt(intensityInput.value) / 100 : 0.15;
                
                // Convert hex to RGB
                const r = parseInt(hexColor.substr(1, 2), 16);
                const g = parseInt(hexColor.substr(3, 2), 16);
                const b = parseInt(hexColor.substr(5, 2), 16);
                
                options.color = { r, g, b };
                options.intensity = intensity;
                applyFilter(filterType, options);
            } else {
                applyFilter(filterType, options);
            }
        });
    });
    
    // Photo-to-Paint Style System
    const photoPaintStyle = document.getElementById('photo-paint-style');
    const applyPhotoPaintBtn = document.getElementById('apply-photo-paint-btn');
    const previewPhotoPaintBtn = document.getElementById('preview-photo-paint-btn');
    
    // Show/hide settings based on selected style
    if (photoPaintStyle) {
        photoPaintStyle.addEventListener('change', () => {
            // Hide all settings
            document.querySelectorAll('.photo-paint-settings').forEach(el => {
                el.style.display = 'none';
            });
            
            // Show selected style settings
            const selectedStyle = photoPaintStyle.value;
            const settingsDiv = document.getElementById(`${selectedStyle}-settings`);
            if (settingsDiv) {
                settingsDiv.style.display = 'block';
            }
        });
    }
    
    // Update slider value displays
    const setupSliderDisplay = (sliderId, displayId, suffix = '', decimals = 0) => {
        const slider = document.getElementById(sliderId);
        const display = document.getElementById(displayId);
        if (slider && display) {
            slider.addEventListener('input', () => {
                const value = decimals > 0 ? parseFloat(slider.value).toFixed(decimals) : slider.value;
                display.textContent = value + suffix;
            });
            // Set initial value
            const value = decimals > 0 ? parseFloat(slider.value).toFixed(decimals) : slider.value;
            display.textContent = value + suffix;
        }
    };
    
    // Oil paint sliders
    setupSliderDisplay('oil-brush-size', 'oil-brush-size-val');
    setupSliderDisplay('oil-detail', 'oil-detail-val', '%');
    setupSliderDisplay('oil-impasto', 'oil-impasto-val', '%');
    setupSliderDisplay('oil-color', 'oil-color-val', '%');
    
    // Acrylic sliders
    setupSliderDisplay('acrylic-steps', 'acrylic-steps-val');
    setupSliderDisplay('acrylic-edge', 'acrylic-edge-val');
    setupSliderDisplay('acrylic-sat', 'acrylic-sat-val', '%');
    
    // Watercolor sliders
    setupSliderDisplay('watercolor-wet', 'watercolor-wet-val', '%');
    setupSliderDisplay('watercolor-bleed', 'watercolor-bleed-val', '%');
    setupSliderDisplay('watercolor-paper', 'watercolor-paper-val', '%');
    
    // Comic sliders
    setupSliderDisplay('comic-outline', 'comic-outline-val');
    setupSliderDisplay('comic-colors', 'comic-colors-val');
    setupSliderDisplay('comic-halftone', 'comic-halftone-val', '%');
    
    // Cartoon sliders
    setupSliderDisplay('cartoon-smooth', 'cartoon-smooth-val', '%');
    setupSliderDisplay('cartoon-simple', 'cartoon-simple-val');
    setupSliderDisplay('cartoon-outline', 'cartoon-outline-val', '%');
    
    // Anime sliders
    setupSliderDisplay('anime-cel', 'anime-cel-val');
    setupSliderDisplay('anime-edge', 'anime-edge-val');
    setupSliderDisplay('anime-sat', 'anime-sat-val', '%');
    
    // Concept art sliders
    setupSliderDisplay('concept-depth', 'concept-depth-val', '%');
    setupSliderDisplay('concept-paint', 'concept-paint-val', '%');
    
    // Pastel sliders
    setupSliderDisplay('pastel-soft', 'pastel-soft-val', '%');
    setupSliderDisplay('pastel-chalk', 'pastel-chalk-val', '%');
    setupSliderDisplay('pastel-vibrant', 'pastel-vibrant-val', '%');
    
    // Sketch sliders
    setupSliderDisplay('sketch-line', 'sketch-line-val', '%');
    setupSliderDisplay('sketch-shade', 'sketch-shade-val', '%');
    setupSliderDisplay('sketch-detail', 'sketch-detail-val', '%');
    
    // Gouache sliders
    setupSliderDisplay('gouache-opacity', 'gouache-opacity-val', '%');
    setupSliderDisplay('gouache-bold', 'gouache-bold-val', '%');
    setupSliderDisplay('gouache-brush', 'gouache-brush-val', '%');
    
    // Load presets on startup
    loadPhotoPaintPresets();
    updatePhotoPaintPresetDropdown();
    
    // Preview Photo-to-Paint (non-destructive)
    if (previewPhotoPaintBtn) {
        previewPhotoPaintBtn.addEventListener('click', () => {
            if (!state.activeLayer) {
                alert('Please select a layer first');
                return;
            }
            
            const style = photoPaintStyle.value;
            const options = getPhotoPaintOptions(style);
            
            console.log('Previewing photo-to-paint style:', style, options);
            previewPhotoToPaint(style, options);
            
            // Show cancel/accept buttons, hide preview/apply
            document.getElementById('cancel-photo-preview-btn').style.display = 'inline-block';
            document.getElementById('accept-photo-preview-btn').style.display = 'inline-block';
            document.getElementById('preview-photo-paint-btn').style.display = 'none';
            document.getElementById('apply-photo-paint-btn').style.display = 'none';
        });
    }
    
    // Cancel preview button
    const cancelPreviewBtn = document.getElementById('cancel-photo-preview-btn');
    if (cancelPreviewBtn) {
        cancelPreviewBtn.addEventListener('click', () => {
            cancelPhotoPaintPreview();
            
            // Restore original buttons
            document.getElementById('cancel-photo-preview-btn').style.display = 'none';
            document.getElementById('accept-photo-preview-btn').style.display = 'none';
            document.getElementById('preview-photo-paint-btn').style.display = 'block';
            document.getElementById('apply-photo-paint-btn').style.display = 'block';
        });
    }
    
    // Accept preview button
    const acceptPreviewBtn = document.getElementById('accept-photo-preview-btn');
    if (acceptPreviewBtn) {
        acceptPreviewBtn.addEventListener('click', () => {
            applyPhotoPaintPreview();
            
            // Restore original buttons
            document.getElementById('cancel-photo-preview-btn').style.display = 'none';
            document.getElementById('accept-photo-preview-btn').style.display = 'none';
            document.getElementById('preview-photo-paint-btn').style.display = 'block';
            document.getElementById('apply-photo-paint-btn').style.display = 'block';
        });
    }
    
    // Apply Photo-to-Paint
    if (applyPhotoPaintBtn) {
        applyPhotoPaintBtn.addEventListener('click', () => {
            if (!state.activeLayer) {
                alert('Please select a layer first');
                return;
            }
            
            const style = photoPaintStyle.value;
            const options = getPhotoPaintOptions(style);
            
            console.log('Applying photo-to-paint style:', style, options);
            applyPhotoToPaint(style, options);
        });
    }
    
    // Save preset button
    const savePhotoPresetBtn = document.getElementById('save-photo-preset-btn');
    if (savePhotoPresetBtn) {
        savePhotoPresetBtn.addEventListener('click', () => {
            const name = prompt('Enter preset name:');
            if (name) {
                const style = photoPaintStyle.value;
                const options = getPhotoPaintOptions(style);
                photoPaintState.presets[name] = { style, options };
                savePhotoPaintPresets();
                updatePhotoPaintPresetDropdown();
                alert('Preset saved!');
            }
        });
    }
    
    // Delete preset button
    const deletePhotoPresetBtn = document.getElementById('delete-photo-preset-btn');
    if (deletePhotoPresetBtn) {
        deletePhotoPresetBtn.addEventListener('click', () => {
            const presetSelect = document.getElementById('photo-paint-preset');
            const presetName = presetSelect.value;
            if (presetName && confirm(`Delete preset "${presetName}"?`)) {
                delete photoPaintState.presets[presetName];
                savePhotoPaintPresets();
                updatePhotoPaintPresetDropdown();
                alert('Preset deleted!');
            }
        });
    }
    
    // Load preset
    const presetSelect = document.getElementById('photo-paint-preset');
    if (presetSelect) {
        presetSelect.addEventListener('change', () => {
            const presetName = presetSelect.value;
            if (presetName && photoPaintState.presets[presetName]) {
                const preset = photoPaintState.presets[presetName];
                
                // Set style
                photoPaintStyle.value = preset.style;
                photoPaintStyle.dispatchEvent(new Event('change'));
                
                // Set options
                setPhotoPaintOptions(preset.style, preset.options);
            }
        });
    }
    
    // Batch process button
    const batchPhotoPaintBtn = document.getElementById('batch-photo-paint-btn');
    if (batchPhotoPaintBtn) {
        batchPhotoPaintBtn.addEventListener('click', () => {
            if (state.layers.length === 0) {
                alert('No layers to process');
                return;
            }
            
            if (!confirm(`Apply style to all ${state.layers.length} layers?`)) {
                return;
            }
            
            const style = photoPaintStyle.value;
            const options = getPhotoPaintOptions(style);
            const layerIndices = state.layers.map((_, i) => i);
            
            console.log('Batch processing layers:', layerIndices);
            batchApplyPhotoToPaint(style, options, layerIndices);
            alert('Batch processing complete!');
        });
    }
    
    // Blend styles button
    const blendPhotoPaintBtn = document.getElementById('blend-photo-paint-btn');
    if (blendPhotoPaintBtn) {
        blendPhotoPaintBtn.addEventListener('click', () => {
            if (!state.activeLayer) {
                alert('Please select a layer first');
                return;
            }
            
            // Get first style (current selection)
            const style1 = photoPaintStyle.value;
            const options1 = getPhotoPaintOptions(style1);
            
            // Prompt for second style
            const styles = ['oil', 'acrylic', 'watercolor', 'comic', 'cartoon', 'anime', 'concept-art', 'pastel', 'sketch', 'gouache'];
            const style2 = prompt('Enter second style to blend:\n' + styles.join(', '));
            if (!style2 || !styles.includes(style2)) {
                alert('Invalid style');
                return;
            }
            
            // Use default options for second style
            const options2 = {};
            
            // Get blend ratio
            const ratio = parseFloat(prompt('Enter blend ratio (0-1, where 0.5 is 50/50):', '0.5'));
            if (isNaN(ratio) || ratio < 0 || ratio > 1) {
                alert('Invalid ratio');
                return;
            }
            
            console.log('Blending styles:', style1, style2, ratio);
            applyBlendedPhotoToPaint(style1, options1, style2, options2, ratio);
        });
    }
    
    // Update preset dropdown
    function updatePhotoPaintPresetDropdown() {
        const presetSelect = document.getElementById('photo-paint-preset');
        if (!presetSelect) return;
        
        // Clear existing options except first
        while (presetSelect.options.length > 1) {
            presetSelect.remove(1);
        }
        
        // Add presets
        Object.keys(photoPaintState.presets).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            presetSelect.appendChild(option);
        });
    }
    
    // Set photo-to-paint options based on style and values
    function setPhotoPaintOptions(style, options) {
        switch (style) {
            case 'oil':
                if (options.brushSize !== undefined) document.getElementById('oil-brush-size').value = options.brushSize;
                if (options.detail !== undefined) document.getElementById('oil-detail').value = options.detail * 100;
                if (options.impasto !== undefined) document.getElementById('oil-impasto').value = options.impasto * 100;
                if (options.colorIntensity !== undefined) document.getElementById('oil-color').value = options.colorIntensity * 100;
                break;
            case 'acrylic':
                if (options.colorSteps !== undefined) document.getElementById('acrylic-steps').value = options.colorSteps;
                if (options.edgeThreshold !== undefined) document.getElementById('acrylic-edge').value = options.edgeThreshold;
                if (options.saturation !== undefined) document.getElementById('acrylic-sat').value = options.saturation * 100;
                break;
            case 'watercolor':
                if (options.wetness !== undefined) document.getElementById('watercolor-wet').value = options.wetness * 100;
                if (options.bleed !== undefined) document.getElementById('watercolor-bleed').value = options.bleed * 100;
                if (options.paperTexture !== undefined) document.getElementById('watercolor-paper').value = options.paperTexture * 100;
                break;
            case 'comic':
                if (options.outlineThickness !== undefined) document.getElementById('comic-outline').value = options.outlineThickness;
                if (options.colorLevels !== undefined) document.getElementById('comic-colors').value = options.colorLevels;
                if (options.halftone !== undefined) document.getElementById('comic-halftone').value = options.halftone * 100;
                break;
            case 'cartoon':
                if (options.smoothness !== undefined) document.getElementById('cartoon-smooth').value = options.smoothness * 100;
                if (options.colorSimplification !== undefined) document.getElementById('cartoon-simple').value = options.colorSimplification;
                if (options.outlineStrength !== undefined) document.getElementById('cartoon-outline').value = options.outlineStrength * 100;
                break;
            case 'anime':
                if (options.celLevels !== undefined) document.getElementById('anime-cel').value = options.celLevels;
                if (options.edgeThickness !== undefined) document.getElementById('anime-edge').value = options.edgeThickness;
                if (options.saturation !== undefined) document.getElementById('anime-sat').value = options.saturation * 100;
                break;
            case 'concept-art':
                if (options.atmosphericDepth !== undefined) document.getElementById('concept-depth').value = options.atmosphericDepth * 100;
                if (options.painterly !== undefined) document.getElementById('concept-paint').value = options.painterly * 100;
                if (options.colorMood !== undefined) document.getElementById('concept-mood').value = options.colorMood;
                break;
            case 'pastel':
                if (options.softness !== undefined) document.getElementById('pastel-soft').value = options.softness * 100;
                if (options.chalkiness !== undefined) document.getElementById('pastel-chalk').value = options.chalkiness * 100;
                if (options.colorVibrancy !== undefined) document.getElementById('pastel-vibrant').value = options.colorVibrancy * 100;
                break;
            case 'sketch':
                if (options.lineIntensity !== undefined) document.getElementById('sketch-line').value = options.lineIntensity * 100;
                if (options.shading !== undefined) document.getElementById('sketch-shade').value = options.shading * 100;
                if (options.detail !== undefined) document.getElementById('sketch-detail').value = options.detail * 100;
                break;
            case 'gouache':
                if (options.opacity !== undefined) document.getElementById('gouache-opacity').value = options.opacity * 100;
                if (options.colorBoldness !== undefined) document.getElementById('gouache-bold').value = options.colorBoldness * 100;
                if (options.brushStrokes !== undefined) document.getElementById('gouache-brush').value = options.brushStrokes * 100;
                break;
        }
        
        // Trigger input events to update displays
        document.querySelectorAll('.photo-paint-settings input[type="range"]').forEach(slider => {
            slider.dispatchEvent(new Event('input'));
        });
    }
    
    // Helper function to get options for each style
    function getPhotoPaintOptions(style) {
        const options = {};
        
        switch (style) {
            case 'oil':
                options.brushSize = parseInt(document.getElementById('oil-brush-size')?.value || 5);
                options.detail = parseFloat(document.getElementById('oil-detail')?.value || 50) / 100;
                options.impasto = parseFloat(document.getElementById('oil-impasto')?.value || 70) / 100;
                options.colorIntensity = parseFloat(document.getElementById('oil-color')?.value || 120) / 100;
                break;
            case 'acrylic':
                options.colorSteps = parseInt(document.getElementById('acrylic-steps')?.value || 8);
                options.edgeThreshold = parseInt(document.getElementById('acrylic-edge')?.value || 30);
                options.saturation = parseFloat(document.getElementById('acrylic-sat')?.value || 130) / 100;
                break;
            case 'watercolor':
                options.wetness = parseFloat(document.getElementById('watercolor-wet')?.value || 60) / 100;
                options.bleed = parseFloat(document.getElementById('watercolor-bleed')?.value || 50) / 100;
                options.paperTexture = parseFloat(document.getElementById('watercolor-paper')?.value || 30) / 100;
                break;
            case 'comic':
                options.outlineThickness = parseInt(document.getElementById('comic-outline')?.value || 2);
                options.colorLevels = parseInt(document.getElementById('comic-colors')?.value || 4);
                options.halftone = parseFloat(document.getElementById('comic-halftone')?.value || 50) / 100;
                break;
            case 'cartoon':
                options.smoothness = parseFloat(document.getElementById('cartoon-smooth')?.value || 70) / 100;
                options.colorSimplification = parseInt(document.getElementById('cartoon-simple')?.value || 6);
                options.outlineStrength = parseFloat(document.getElementById('cartoon-outline')?.value || 80) / 100;
                break;
            case 'anime':
                options.celLevels = parseInt(document.getElementById('anime-cel')?.value || 3);
                options.edgeThickness = parseInt(document.getElementById('anime-edge')?.value || 1);
                options.saturation = parseFloat(document.getElementById('anime-sat')?.value || 140) / 100;
                break;
            case 'concept-art':
                options.atmosphericDepth = parseFloat(document.getElementById('concept-depth')?.value || 50) / 100;
                options.painterly = parseFloat(document.getElementById('concept-paint')?.value || 60) / 100;
                options.colorMood = document.getElementById('concept-mood')?.value || 'neutral';
                break;
            case 'pastel':
                options.softness = parseFloat(document.getElementById('pastel-soft')?.value || 70) / 100;
                options.chalkiness = parseFloat(document.getElementById('pastel-chalk')?.value || 60) / 100;
                options.colorVibrancy = parseFloat(document.getElementById('pastel-vibrant')?.value || 80) / 100;
                break;
            case 'sketch':
                options.lineIntensity = parseFloat(document.getElementById('sketch-line')?.value || 80) / 100;
                options.shading = parseFloat(document.getElementById('sketch-shade')?.value || 60) / 100;
                options.detail = parseFloat(document.getElementById('sketch-detail')?.value || 70) / 100;
                break;
            case 'gouache':
                options.opacity = parseFloat(document.getElementById('gouache-opacity')?.value || 90) / 100;
                options.colorBoldness = parseFloat(document.getElementById('gouache-bold')?.value || 130) / 100;
                options.brushStrokes = parseFloat(document.getElementById('gouache-brush')?.value || 60) / 100;
                break;
        }
        
        return options;
    }
    
    // Save brush preset button
    const saveBrushPresetBtn = document.getElementById('save-brush-preset-btn');
    if (saveBrushPresetBtn) {
        saveBrushPresetBtn.addEventListener('click', () => {
            const name = prompt('Enter brush preset name:');
            if (name) {
                saveCurrentBrushPreset(name);
                alert('Brush preset saved!');
            }
        });
    }
    
    // Export brushes button
    const exportBrushesBtn = document.getElementById('export-brushes-btn');
    if (exportBrushesBtn) {
        exportBrushesBtn.addEventListener('click', () => {
            exportBrushPresets();
        });
    }
    
    // Import brushes button
    const importBrushesBtn = document.getElementById('import-brushes-btn');
    if (importBrushesBtn) {
        importBrushesBtn.addEventListener('click', () => {
            if (typeof require === 'undefined') {
                // Browser mode - use file input
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'application/json,.json';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const fileData = await file.text();
                        if (importBrushPresets(fileData)) {
                            alert('Brushes imported successfully!');
                        } else {
                            alert('Failed to import brushes.');
                        }
                    }
                };
                input.click();
            } else {
                ipcRenderer.send('import-brushes');
            }
        });
    }
    
    // Layer blend mode selector
    const layerBlendModeSelect = document.getElementById('layer-blend-mode');
    if (layerBlendModeSelect) {
        layerBlendModeSelect.addEventListener('change', (e) => {
            if (state.activeLayer) {
                state.activeLayer.blendMode = e.target.value;
                compositeAllLayers();
            }
        });
    }
    
    // Phase 3: Custom Blend Mode System
    setupCustomBlendModes();
    
    // IPC handlers for file operations
    ipcRenderer.on('brush-texture-loaded', (event, textureData) => {
        const img = new Image();
        img.onload = () => {
            state.brushTipTexture = img;
            state.brushTipShape = 'custom';
            const brushTipShape = document.getElementById('brush-tip-shape');
            if (brushTipShape) {
                brushTipShape.value = 'custom';
            }
        };
        img.src = textureData;
    });
    
    ipcRenderer.on('brushes-imported', (event, fileData) => {
        if (importBrushPresets(fileData)) {
            alert('Brushes imported successfully!');
        } else {
            alert('Failed to import brushes.');
        }
    });
    
    // Setup Advanced Features
    setupAdvancedFeatures();
}

// Setup Advanced Features (Wrap-around, Symmetry, etc.)
function setupAdvancedFeatures() {
    // Wrap-Around Mode
    const wraparoundCheckbox = document.getElementById('wraparound-enabled');
    if (wraparoundCheckbox) {
        wraparoundCheckbox.addEventListener('change', (e) => {
            state.wrapAround.enabled = e.target.checked;
        });
    }
    
    // Symmetry Mode
    const symmetryCheckbox = document.getElementById('symmetry-enabled');
    const symmetrySettings = document.getElementById('symmetry-settings');
    if (symmetryCheckbox && symmetrySettings) {
        symmetryCheckbox.addEventListener('change', (e) => {
            state.symmetry.enabled = e.target.checked;
            if (e.target.checked) {
                symmetrySettings.classList.remove('hidden');
                // Set symmetry center to canvas center
                state.symmetry.centerX = state.canvas.width / 2;
                state.symmetry.centerY = state.canvas.height / 2;
            } else {
                symmetrySettings.classList.add('hidden');
            }
        });
    }
    
    const symmetryModeSelect = document.getElementById('symmetry-mode');
    const radialSegmentsGroup = document.getElementById('radial-segments-group');
    if (symmetryModeSelect) {
        symmetryModeSelect.addEventListener('change', (e) => {
            state.symmetry.mode = e.target.value;
            if (radialSegmentsGroup) {
                // Phase 11: Show segments for radial and kaleidoscope modes
                if (e.target.value === 'radial' || e.target.value === 'kaleidoscope') {
                    radialSegmentsGroup.classList.remove('hidden');
                } else {
                    radialSegmentsGroup.classList.add('hidden');
                }
            }
        });
    }
    
    const symmetrySegmentsSlider = document.getElementById('symmetry-segments');
    const symmetrySegmentsValue = document.getElementById('symmetry-segments-value');
    if (symmetrySegmentsSlider && symmetrySegmentsValue) {
        symmetrySegmentsSlider.addEventListener('input', (e) => {
            state.symmetry.segments = parseInt(e.target.value);
            symmetrySegmentsValue.textContent = state.symmetry.segments;
        });
        
        // Phase 11: Show/hide segments control for radial, kaleidoscope modes
        if (radialSegmentsGroup) {
            if (state.symmetry.mode === 'radial' || state.symmetry.mode === 'kaleidoscope') {
                radialSegmentsGroup.classList.remove('hidden');
            } else {
                radialSegmentsGroup.classList.add('hidden');
            }
        }
    }
    
    // Phase 11: Guides System
    const guidesCheckbox = document.getElementById('guides-enabled');
    const guidesSettings = document.getElementById('guides-settings');
    if (guidesCheckbox && guidesSettings) {
        guidesCheckbox.addEventListener('change', (e) => {
            state.rulers.guidesVisible = e.target.checked;
            if (e.target.checked) {
                guidesSettings.classList.remove('hidden');
            } else {
                guidesSettings.classList.add('hidden');
            }
            compositeAllLayers();
        });
    }
    
    const addHorizontalGuideBtn = document.getElementById('add-horizontal-guide');
    if (addHorizontalGuideBtn) {
        addHorizontalGuideBtn.addEventListener('click', () => {
            const position = prompt('Enter Y position for horizontal guide:', Math.floor(state.canvas.height / 2));
            if (position !== null) {
                state.rulers.guides.push({
                    type: 'horizontal',
                    position: parseInt(position)
                });
                compositeAllLayers();
            }
        });
    }
    
    const addVerticalGuideBtn = document.getElementById('add-vertical-guide');
    if (addVerticalGuideBtn) {
        addVerticalGuideBtn.addEventListener('click', () => {
            const position = prompt('Enter X position for vertical guide:', Math.floor(state.canvas.width / 2));
            if (position !== null) {
                state.rulers.guides.push({
                    type: 'vertical',
                    position: parseInt(position)
                });
                compositeAllLayers();
            }
        });
    }
    
    const clearGuidesBtn = document.getElementById('clear-guides');
    if (clearGuidesBtn) {
        clearGuidesBtn.addEventListener('click', () => {
            if (confirm('Clear all guides?')) {
                state.rulers.guides = [];
                compositeAllLayers();
            }
        });
    }
    
    const snapToGuidesCheckbox = document.getElementById('snap-to-guides');
    if (snapToGuidesCheckbox) {
        snapToGuidesCheckbox.addEventListener('change', (e) => {
            state.rulers.snapToGuides = e.target.checked;
        });
        snapToGuidesCheckbox.checked = state.rulers.snapToGuides;
    }
    
    const snapDistanceInput = document.getElementById('snap-distance');
    if (snapDistanceInput) {
        snapDistanceInput.addEventListener('input', (e) => {
            state.rulers.snapDistance = parseInt(e.target.value);
        });
        snapDistanceInput.value = state.rulers.snapDistance;
    }
    
    // Phase 11: Grid System
    const gridCheckbox = document.getElementById('grid-enabled');
    const gridSettings = document.getElementById('grid-settings');
    if (gridCheckbox && gridSettings) {
        gridCheckbox.addEventListener('change', (e) => {
            state.grid.visible = e.target.checked;
            if (e.target.checked) {
                gridSettings.classList.remove('hidden');
            } else {
                gridSettings.classList.add('hidden');
            }
            compositeAllLayers();
        });
    }
    
    const gridSizeInput = document.getElementById('grid-size');
    if (gridSizeInput) {
        gridSizeInput.addEventListener('input', (e) => {
            state.grid.size = parseInt(e.target.value);
            compositeAllLayers();
        });
        gridSizeInput.value = state.grid.size;
    }
    
    const snapToGridCheckbox = document.getElementById('snap-to-grid');
    if (snapToGridCheckbox) {
        snapToGridCheckbox.addEventListener('change', (e) => {
            state.grid.snapToGrid = e.target.checked;
        });
        snapToGridCheckbox.checked = state.grid.snapToGrid;
    }
    
    // Canvas Texture
    const canvasTextureCheckbox = document.getElementById('canvas-texture-enabled');
    const canvasTextureSettings = document.getElementById('canvas-texture-settings');
    if (canvasTextureCheckbox && canvasTextureSettings) {
        canvasTextureCheckbox.addEventListener('change', (e) => {
            state.canvasTexture.enabled = e.target.checked;
            if (e.target.checked) {
                canvasTextureSettings.classList.remove('hidden');
            } else {
                canvasTextureSettings.classList.add('hidden');
            }
            compositeAllLayers();
        });
    }
    
    const canvasTextureTypeSelect = document.getElementById('canvas-texture-type');
    if (canvasTextureTypeSelect) {
        canvasTextureTypeSelect.addEventListener('change', (e) => {
            state.canvasTexture.type = e.target.value;
            compositeAllLayers();
        });
    }
    
    const canvasTextureIntensitySlider = document.getElementById('canvas-texture-intensity');
    const canvasTextureIntensityValue = document.getElementById('canvas-texture-intensity-value');
    if (canvasTextureIntensitySlider && canvasTextureIntensityValue) {
        canvasTextureIntensitySlider.addEventListener('input', (e) => {
            state.canvasTexture.intensity = parseInt(e.target.value);
            canvasTextureIntensityValue.textContent = state.canvasTexture.intensity + '%';
            compositeAllLayers();
        });
    }
    
    const canvasTextureGrainSlider = document.getElementById('canvas-texture-grain');
    const canvasTextureGrainValue = document.getElementById('canvas-texture-grain-value');
    if (canvasTextureGrainSlider && canvasTextureGrainValue) {
        canvasTextureGrainSlider.addEventListener('input', (e) => {
            state.canvasTexture.grain = parseInt(e.target.value);
            canvasTextureGrainValue.textContent = state.canvasTexture.grain + '%';
            compositeAllLayers();
        });
    }
    
    // Rebelle 8 Paper Panel
    const rebellePaperCheckbox = document.getElementById('rebelle-paper-panel-enabled');
    const rebellePaperSettings = document.getElementById('rebelle-paper-settings');
    if (rebellePaperCheckbox && rebellePaperSettings) {
        rebellePaperCheckbox.addEventListener('change', (e) => {
            state.rebellePaper.enabled = e.target.checked;
            if (e.target.checked) {
                rebellePaperSettings.classList.remove('hidden');
                initializePaperGallery();
            } else {
                rebellePaperSettings.classList.add('hidden');
            }
            compositeAllLayers();
        });
    }
    
    // Rebelle controls - manually setup slider displays
    const rebelleAbsorbencySlider = document.getElementById('rebelle-absorbency');
    const rebelleAbsorbencyVal = document.getElementById('rebelle-absorbency-val');
    if (rebelleAbsorbencySlider && rebelleAbsorbencyVal) {
        rebelleAbsorbencySlider.addEventListener('input', (e) => {
            state.rebellePaper.absorbency = parseFloat(e.target.value);
            rebelleAbsorbencyVal.textContent = parseFloat(e.target.value).toFixed(1);
        });
        rebelleAbsorbencyVal.textContent = parseFloat(rebelleAbsorbencySlider.value).toFixed(1);
    }
    
    const rebelleRewetSlider = document.getElementById('rebelle-rewet');
    const rebelleRewetVal = document.getElementById('rebelle-rewet-val');
    if (rebelleRewetSlider && rebelleRewetVal) {
        rebelleRewetSlider.addEventListener('input', (e) => {
            state.rebellePaper.rewet = parseFloat(e.target.value);
            rebelleRewetVal.textContent = parseFloat(e.target.value).toFixed(1);
        });
        rebelleRewetVal.textContent = parseFloat(rebelleRewetSlider.value).toFixed(1);
    }
    
    const rebelleTextureInfluenceSlider = document.getElementById('rebelle-texture-influence');
    const rebelleTextureInfluenceVal = document.getElementById('rebelle-texture-influence-val');
    if (rebelleTextureInfluenceSlider && rebelleTextureInfluenceVal) {
        rebelleTextureInfluenceSlider.addEventListener('input', (e) => {
            state.rebellePaper.textureInfluence = parseFloat(e.target.value);
            rebelleTextureInfluenceVal.textContent = parseFloat(e.target.value).toFixed(1);
        });
        rebelleTextureInfluenceVal.textContent = parseFloat(rebelleTextureInfluenceSlider.value).toFixed(1);
    }
    
    const rebelleEdgeDarkeningSlider = document.getElementById('rebelle-edge-darkening');
    const rebelleEdgeDarkeningVal = document.getElementById('rebelle-edge-darkening-val');
    if (rebelleEdgeDarkeningSlider && rebelleEdgeDarkeningVal) {
        rebelleEdgeDarkeningSlider.addEventListener('input', (e) => {
            state.rebellePaper.edgeDarkening = parseFloat(e.target.value);
            rebelleEdgeDarkeningVal.textContent = parseFloat(e.target.value).toFixed(1);
        });
        rebelleEdgeDarkeningVal.textContent = parseFloat(rebelleEdgeDarkeningSlider.value).toFixed(1);
    }
    
    const rebellePaperWetnessSlider = document.getElementById('rebelle-paper-wetness');
    const rebellePaperWetnessVal = document.getElementById('rebelle-paper-wetness-val');
    if (rebellePaperWetnessSlider && rebellePaperWetnessVal) {
        rebellePaperWetnessSlider.addEventListener('input', (e) => {
            state.rebellePaper.wetness = parseInt(e.target.value);
            rebellePaperWetnessVal.textContent = parseInt(e.target.value);
        });
        rebelleEdgeDarkeningVal.textContent = parseFloat(rebelleEdgeDarkeningSlider.value).toFixed(1);
    }
    
    // QuickShape
    const quickshapeCheckbox = document.getElementById('quickshape-enabled');
    if (quickshapeCheckbox) {
        quickshapeCheckbox.addEventListener('change', (e) => {
            state.quickShape.enabled = e.target.checked;
        });
    }
    
    // Time-lapse Recording
    const timelapseCheckbox = document.getElementById('timelapse-recording');
    if (timelapseCheckbox) {
        timelapseCheckbox.addEventListener('change', (e) => {
            state.timelapse.recording = e.target.checked;
            if (e.target.checked) {
                state.timelapse.frames = [];
                state.timelapse.lastCapture = Date.now();
            }
        });
    }
    
    const exportTimelapseBtn = document.getElementById('export-timelapse-btn');
    if (exportTimelapseBtn) {
        exportTimelapseBtn.addEventListener('click', () => {
            exportTimelapse();
        });
    }
    
    // Reference Image
    const referenceCheckbox = document.getElementById('reference-visible');
    const referenceSettings = document.getElementById('reference-settings');
    if (referenceCheckbox && referenceSettings) {
        referenceCheckbox.addEventListener('change', (e) => {
            state.reference.visible = e.target.checked;
            if (e.target.checked && state.reference.image) {
                referenceSettings.classList.remove('hidden');
            } else {
                referenceSettings.classList.add('hidden');
            }
            compositeAllLayers();
        });
    }
    
    const loadReferenceBtn = document.getElementById('load-reference-btn');
    if (loadReferenceBtn) {
        loadReferenceBtn.addEventListener('click', () => {
            loadReferenceImage();
        });
    }
    
    const referenceOpacitySlider = document.getElementById('reference-opacity');
    const referenceOpacityValue = document.getElementById('reference-opacity-value');
    if (referenceOpacitySlider && referenceOpacityValue) {
        referenceOpacitySlider.addEventListener('input', (e) => {
            state.reference.opacity = parseInt(e.target.value) / 100;
            referenceOpacityValue.textContent = e.target.value + '%';
            compositeAllLayers();
        });
    }
    
    // Phase 11: Reference image position controls
    const referenceXInput = document.getElementById('reference-x');
    const referenceXValue = document.getElementById('reference-x-value');
    if (referenceXInput && referenceXValue) {
        referenceXInput.addEventListener('input', (e) => {
            state.reference.x = parseInt(e.target.value);
            referenceXValue.textContent = e.target.value;
            compositeAllLayers();
        });
    }
    
    const referenceYInput = document.getElementById('reference-y');
    const referenceYValue = document.getElementById('reference-y-value');
    if (referenceYInput && referenceYValue) {
        referenceYInput.addEventListener('input', (e) => {
            state.reference.y = parseInt(e.target.value);
            referenceYValue.textContent = e.target.value;
            compositeAllLayers();
        });
    }
    
    const referenceScaleSlider = document.getElementById('reference-scale');
    const referenceScaleValue = document.getElementById('reference-scale-value');
    if (referenceScaleSlider && referenceScaleValue) {
        referenceScaleSlider.addEventListener('input', (e) => {
            state.reference.scale = parseInt(e.target.value) / 100;
            referenceScaleValue.textContent = e.target.value + '%';
            compositeAllLayers();
        });
    }
    
    const centerReferenceBtn = document.getElementById('center-reference-btn');
    if (centerReferenceBtn) {
        centerReferenceBtn.addEventListener('click', () => {
            if (state.reference.image) {
                const scaledWidth = state.reference.originalWidth * state.reference.scale;
                const scaledHeight = state.reference.originalHeight * state.reference.scale;
                state.reference.x = (state.canvas.width - scaledWidth) / 2;
                state.reference.y = (state.canvas.height - scaledHeight) / 2;
                
                // Update UI
                if (referenceXInput) referenceXInput.value = Math.floor(state.reference.x);
                if (referenceXValue) referenceXValue.textContent = Math.floor(state.reference.x);
                if (referenceYInput) referenceYInput.value = Math.floor(state.reference.y);
                if (referenceYValue) referenceYValue.textContent = Math.floor(state.reference.y);
                
                compositeAllLayers();
            }
        });
    }
    
    // Smudge Tool Settings
    const smudgeStrengthSlider = document.getElementById('smudge-strength');
    const smudgeStrengthValue = document.getElementById('smudge-strength-value');
    if (smudgeStrengthSlider && smudgeStrengthValue) {
        smudgeStrengthSlider.addEventListener('input', (e) => {
            state.smudge.strength = parseInt(e.target.value);
            smudgeStrengthValue.textContent = state.smudge.strength + '%';
        });
    }
    
    const smudgeFingerPaintingCheckbox = document.getElementById('smudge-finger-painting');
    if (smudgeFingerPaintingCheckbox) {
        smudgeFingerPaintingCheckbox.addEventListener('change', (e) => {
            state.smudge.fingerPainting = e.target.checked;
        });
    }
    
    // Liquify Tool Settings
    const liquifyModeSelect = document.getElementById('liquify-mode');
    if (liquifyModeSelect) {
        liquifyModeSelect.addEventListener('change', (e) => {
            state.liquify.mode = e.target.value;
        });
    }
    
    const liquifyStrengthSlider = document.getElementById('liquify-strength');
    const liquifyStrengthValue = document.getElementById('liquify-strength-value');
    if (liquifyStrengthSlider && liquifyStrengthValue) {
        liquifyStrengthSlider.addEventListener('input', (e) => {
            state.liquify.strength = parseInt(e.target.value);
            liquifyStrengthValue.textContent = state.liquify.strength + '%';
        });
    }
    
    const liquifyRadiusSlider = document.getElementById('liquify-radius');
    const liquifyRadiusValue = document.getElementById('liquify-radius-value');
    if (liquifyRadiusSlider && liquifyRadiusValue) {
        liquifyRadiusSlider.addEventListener('input', (e) => {
            state.liquify.radius = parseInt(e.target.value);
            liquifyRadiusValue.textContent = state.liquify.radius + 'px';
        });
    }
    
    // Magic Wand Settings
    const magicwandToleranceSlider = document.getElementById('magicwand-tolerance');
    const magicwandToleranceValue = document.getElementById('magicwand-tolerance-value');
    if (magicwandToleranceSlider && magicwandToleranceValue) {
        magicwandToleranceSlider.addEventListener('input', (e) => {
            state.magicWand.tolerance = parseInt(e.target.value);
            magicwandToleranceValue.textContent = state.magicWand.tolerance;
        });
    }
    
    const magicwandContiguousCheckbox = document.getElementById('magicwand-contiguous');
    if (magicwandContiguousCheckbox) {
        magicwandContiguousCheckbox.addEventListener('change', (e) => {
            state.magicWand.contiguous = e.target.checked;
        });
    }
    
    // Menu handlers for new features
    const menuHandlers = {
        'view-toggle-wraparound': () => {
            if (wraparoundCheckbox) {
                wraparoundCheckbox.checked = !wraparoundCheckbox.checked;
                wraparoundCheckbox.dispatchEvent(new Event('change'));
            }
        },
        'view-toggle-symmetry': () => {
            if (symmetryCheckbox) {
                symmetryCheckbox.checked = !symmetryCheckbox.checked;
                symmetryCheckbox.dispatchEvent(new Event('change'));
            }
        },
        'view-toggle-reference': () => {
            if (referenceCheckbox) {
                referenceCheckbox.checked = !referenceCheckbox.checked;
                referenceCheckbox.dispatchEvent(new Event('change'));
            }
        },
        'view-toggle-canvas-texture': () => {
            if (canvasTextureCheckbox) {
                canvasTextureCheckbox.checked = !canvasTextureCheckbox.checked;
                canvasTextureCheckbox.dispatchEvent(new Event('change'));
            }
        },
        'view-toggle-timelapse': () => {
            if (timelapseCheckbox) {
                timelapseCheckbox.checked = !timelapseCheckbox.checked;
                timelapseCheckbox.dispatchEvent(new Event('change'));
            }
        }
    };
    
    // Register menu handlers
    Object.entries(menuHandlers).forEach(([action, handler]) => {
        const menuBtn = document.querySelector(`[data-action="${action}"]`);
        if (menuBtn) {
            menuBtn.addEventListener('click', handler);
        }
        
        // Also register with IPC if available
        if (typeof ipcRenderer !== 'undefined') {
            ipcRenderer.on(action, handler);
        }
    });
}

// Setup Color Picker
function setupColorPicker() {
    const colorPicker = document.getElementById('color-picker');
    colorPicker.addEventListener('change', (e) => {
        state.color = e.target.value;
        updateColorHarmony();
    });
    
    const swatches = document.querySelectorAll('.color-swatch');
    swatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            state.color = swatch.dataset.color;
            colorPicker.value = state.color;
            updateColorHarmony();
        });
    });
    
    // Setup color mode switching
    setupColorModeSwitch();
    
    setupColorWheel();
    setupColorMixer();
    setupColorHarmonies();
    setupColorPalettes();
    setupColorSets();
}

// Color Mode Switching
function setupColorModeSwitch() {
    // No mode radios anymore - always use advanced color wheel
    const advancedColorWheelContainer = document.getElementById('advanced-color-wheel-container');
    
    // Initialize advanced color wheel instance
    let advancedColorWheel = null;
    
    // Always show advanced color wheel
    if (advancedColorWheelContainer && typeof AdvancedColorWheel !== 'undefined') {
        advancedColorWheelContainer.style.display = 'block';
        advancedColorWheel = new AdvancedColorWheel('advanced-color-wheel-container');
    }
}

// Color conversion utilities
function hexToRgbObj(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

function rgbToHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    
    let h = 0;
    let s = max === 0 ? 0 : diff / max;
    let v = max;
    
    if (diff !== 0) {
        if (max === r) {
            h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
        } else if (max === g) {
            h = ((b - r) / diff + 2) / 6;
        } else {
            h = ((r - g) / diff + 4) / 6;
        }
    }
    
    return { h: h * 360, s: s * 100, v: v * 100 };
}

function hsvToRgb(h, s, v) {
    h /= 360;
    s /= 100;
    v /= 100;
    
    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    
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

// Color Wheel
function setupColorWheel() {
    // Basic color wheel removed - using advanced color wheel only
    // The canvas element no longer exists in the DOM
    // Color inputs are also removed, so this function is now empty
}

function updateHSVDisplay(hsv) {
    const hueValue = document.getElementById('hue-value');
    const saturationValue = document.getElementById('saturation-value');
    const valueValue = document.getElementById('value-value');
    const hueInput = document.getElementById('hue-input');
    const saturationInput = document.getElementById('saturation-input');
    const valueInput = document.getElementById('value-input');
    
    if (hueValue) hueValue.textContent = Math.round(hsv.h);
    if (saturationValue) saturationValue.textContent = Math.round(hsv.s);
    if (valueValue) valueValue.textContent = Math.round(hsv.v);
    if (hueInput) hueInput.value = Math.round(hsv.h);
    if (saturationInput) saturationInput.value = Math.round(hsv.s);
    if (valueInput) valueInput.value = Math.round(hsv.v);
}

function updateAllColorInputs(r, g, b) {
    // Update HSV inputs
    const hsv = rgbToHsv(r, g, b);
    updateHSVDisplay(hsv);
    
    // Update RGB inputs
    const redInput = document.getElementById('red-input');
    const greenInput = document.getElementById('green-input');
    const blueInput = document.getElementById('blue-input');
    
    if (redInput) redInput.value = Math.round(r);
    if (greenInput) greenInput.value = Math.round(g);
    if (blueInput) blueInput.value = Math.round(b);
    
    // Update HEX input
    const hexInput = document.getElementById('hex-input');
    const hex = rgbToHex(r, g, b);
    if (hexInput) hexInput.value = hex;
}

function drawColorWheel(ctx, width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 10;
    
    // Draw color wheel
    for (let angle = 0; angle < 360; angle++) {
        for (let r = 0; r < radius; r++) {
            const sat = (r / radius) * 100;
            const val = 100;
            const rgb = hsvToRgb(angle, sat, val);
            
            ctx.fillStyle = rgbToHex(rgb.r, rgb.g, rgb.b);
            const rad = (angle * Math.PI) / 180;
            const x = centerX + r * Math.cos(rad);
            const y = centerY + r * Math.sin(rad);
            ctx.fillRect(x, y, 2, 2);
        }
    }
    
    // Draw center white
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
}

// Color Mixer
function setupColorMixer() {
    const color1Input = document.getElementById('mixer-color-1');
    const color2Input = document.getElementById('mixer-color-2');
    const ratioSlider = document.getElementById('mix-ratio');
    const ratioValue = document.getElementById('mix-ratio-value');
    const preview = document.getElementById('mixed-color-preview');
    const useColorBtn = document.getElementById('use-mixed-color-btn');
    const mixerCanvas = document.getElementById('mixer-canvas');
    
    function updateMixedColor() {
        const ratio = parseInt(ratioSlider.value) / 100;
        const color1 = hexToRgbObj(color1Input.value);
        const color2 = hexToRgbObj(color2Input.value);
        
        const mixed = {
            r: color1.r * (1 - ratio) + color2.r * ratio,
            g: color1.g * (1 - ratio) + color2.g * ratio,
            b: color1.b * (1 - ratio) + color2.b * ratio
        };
        
        const mixedHex = rgbToHex(mixed.r, mixed.g, mixed.b);
        preview.style.background = mixedHex;
        ratioValue.textContent = ratioSlider.value;
        
        // Redraw the mixer canvas
        drawMixerCanvas();
    }
    
    color1Input.addEventListener('change', updateMixedColor);
    color2Input.addEventListener('change', updateMixedColor);
    ratioSlider.addEventListener('input', updateMixedColor);
    
    // Add click event to mixer canvas to pick colors
    if (mixerCanvas) {
        mixerCanvas.addEventListener('click', (e) => {
            const rect = mixerCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const ctx = mixerCanvas.getContext('2d');
            const imageData = ctx.getImageData(x, y, 1, 1).data;
            const pickedColor = rgbToHex(imageData[0], imageData[1], imageData[2]);
            
            state.color = pickedColor;
            document.getElementById('color-picker').value = pickedColor;
            updateColorHarmony();
        });
    }
    
    useColorBtn.addEventListener('click', () => {
        const mixedColor = preview.style.background;
        // Convert rgb() to hex if needed
        if (mixedColor.startsWith('rgb')) {
            const rgb = mixedColor.match(/\d+/g);
            state.color = rgbToHex(parseInt(rgb[0]), parseInt(rgb[1]), parseInt(rgb[2]));
        } else {
            state.color = mixedColor;
        }
        document.getElementById('color-picker').value = state.color;
        updateColorHarmony();
    });
    
    updateMixedColor();
    
    // Wet Palette Controls
    const wetPaletteCheckbox = document.getElementById('wet-palette-enabled');
    const wetPaletteSettings = document.getElementById('wet-palette-settings');
    if (wetPaletteCheckbox && wetPaletteSettings) {
        wetPaletteCheckbox.addEventListener('change', (e) => {
            state.wetPalette.enabled = e.target.checked;
            if (e.target.checked) {
                wetPaletteSettings.classList.remove('hidden');
            } else {
                wetPaletteSettings.classList.add('hidden');
            }
        });
    }
    
    const wetnessSlider = document.getElementById('wet-palette-wetness');
    const wetnessValue = document.getElementById('wet-palette-wetness-value');
    if (wetnessSlider && wetnessValue) {
        wetnessSlider.addEventListener('input', (e) => {
            state.wetPalette.wetness = parseInt(e.target.value);
            wetnessValue.textContent = state.wetPalette.wetness;
        });
    }
    
    const bleedingSlider = document.getElementById('wet-palette-bleeding');
    const bleedingValue = document.getElementById('wet-palette-bleeding-value');
    if (bleedingSlider && bleedingValue) {
        bleedingSlider.addEventListener('input', (e) => {
            state.wetPalette.bleeding = parseInt(e.target.value);
            bleedingValue.textContent = state.wetPalette.bleeding;
        });
    }
    
    const dryingSlider = document.getElementById('wet-palette-drying');
    const dryingValue = document.getElementById('wet-palette-drying-value');
    if (dryingSlider && dryingValue) {
        dryingSlider.addEventListener('input', (e) => {
            state.wetPalette.dryingTime = parseInt(e.target.value);
            dryingValue.textContent = state.wetPalette.dryingTime;
        });
    }
}

// Draw visual mixer canvas
function drawMixerCanvas() {
    const mixerCanvas = document.getElementById('mixer-canvas');
    if (!mixerCanvas) return;
    
    const ctx = mixerCanvas.getContext('2d');
    const width = mixerCanvas.width;
    const height = mixerCanvas.height;
    
    const color1Input = document.getElementById('mixer-color-1');
    const color2Input = document.getElementById('mixer-color-2');
    
    if (!color1Input || !color2Input) return;
    
    const color1 = hexToRgbObj(color1Input.value);
    const color2 = hexToRgbObj(color2Input.value);
    
    // Create a gradient mixing canvas
    // Horizontal gradient from color1 to color2
    // Vertical gradient adds white at top and black at bottom
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const ratioX = x / width;
            const ratioY = y / height;
            
            // Mix colors horizontally
            const mixedR = color1.r * (1 - ratioX) + color2.r * ratioX;
            const mixedG = color1.g * (1 - ratioX) + color2.g * ratioX;
            const mixedB = color1.b * (1 - ratioX) + color2.b * ratioX;
            
            // Add vertical tinting (white at top, black at bottom)
            let finalR, finalG, finalB;
            if (ratioY < 0.5) {
                // Top half: mix with white
                const whiteRatio = (0.5 - ratioY) * 2;
                finalR = mixedR + (255 - mixedR) * whiteRatio;
                finalG = mixedG + (255 - mixedG) * whiteRatio;
                finalB = mixedB + (255 - mixedB) * whiteRatio;
            } else {
                // Bottom half: mix with black
                const blackRatio = (ratioY - 0.5) * 2;
                finalR = mixedR * (1 - blackRatio);
                finalG = mixedG * (1 - blackRatio);
                finalB = mixedB * (1 - blackRatio);
            }
            
            ctx.fillStyle = rgbToHex(Math.round(finalR), Math.round(finalG), Math.round(finalB));
            ctx.fillRect(x, y, 1, 1);
        }
    }
}

// Color Harmonies
function setupColorHarmonies() {
    const harmonySelect = document.getElementById('harmony-type');
    const harmonyColors = document.getElementById('harmony-colors');
    
    harmonySelect.addEventListener('change', updateColorHarmony);
    
    function updateColorHarmony() {
        const baseColor = state.color;
        const rgb = hexToRgbObj(baseColor);
        const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
        const harmonyType = harmonySelect.value;
        
        let colors = [];
        
        switch (harmonyType) {
            case 'complementary':
                colors = [
                    baseColor,
                    hsvToHex((hsv.h + 180) % 360, hsv.s, hsv.v)
                ];
                break;
            case 'analogous':
                colors = [
                    hsvToHex((hsv.h - 30 + 360) % 360, hsv.s, hsv.v),
                    baseColor,
                    hsvToHex((hsv.h + 30) % 360, hsv.s, hsv.v)
                ];
                break;
            case 'triadic':
                colors = [
                    baseColor,
                    hsvToHex((hsv.h + 120) % 360, hsv.s, hsv.v),
                    hsvToHex((hsv.h + 240) % 360, hsv.s, hsv.v)
                ];
                break;
            case 'tetradic':
                colors = [
                    baseColor,
                    hsvToHex((hsv.h + 90) % 360, hsv.s, hsv.v),
                    hsvToHex((hsv.h + 180) % 360, hsv.s, hsv.v),
                    hsvToHex((hsv.h + 270) % 360, hsv.s, hsv.v)
                ];
                break;
            case 'split-complementary':
                colors = [
                    baseColor,
                    hsvToHex((hsv.h + 150) % 360, hsv.s, hsv.v),
                    hsvToHex((hsv.h + 210) % 360, hsv.s, hsv.v)
                ];
                break;
            case 'monochromatic':
                colors = [
                    hsvToHex(hsv.h, Math.max(0, hsv.s - 30), Math.min(100, hsv.v + 20)),
                    hsvToHex(hsv.h, Math.max(0, hsv.s - 15), Math.min(100, hsv.v + 10)),
                    baseColor,
                    hsvToHex(hsv.h, Math.min(100, hsv.s + 15), Math.max(0, hsv.v - 10)),
                    hsvToHex(hsv.h, Math.min(100, hsv.s + 30), Math.max(0, hsv.v - 20))
                ];
                break;
        }
        
        displayColorSwatches(harmonyColors, colors);
    }
    
    function hsvToHex(h, s, v) {
        const rgb = hsvToRgb(h, s, v);
        return rgbToHex(rgb.r, rgb.g, rgb.b);
    }
    
    updateColorHarmony();
}

function updateColorHarmony() {
    const harmonySelect = document.getElementById('harmony-type');
    if (!harmonySelect) return;
    
    const baseColor = state.color;
    const rgb = hexToRgbObj(baseColor);
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    const harmonyType = harmonySelect.value;
    const harmonyColors = document.getElementById('harmony-colors');
    
    let colors = [];
    
    function hsvToHex(h, s, v) {
        const rgb = hsvToRgb(h, s, v);
        return rgbToHex(rgb.r, rgb.g, rgb.b);
    }
    
    switch (harmonyType) {
        case 'complementary':
            colors = [
                baseColor,
                hsvToHex((hsv.h + 180) % 360, hsv.s, hsv.v)
            ];
            break;
        case 'analogous':
            colors = [
                hsvToHex((hsv.h - 30 + 360) % 360, hsv.s, hsv.v),
                baseColor,
                hsvToHex((hsv.h + 30) % 360, hsv.s, hsv.v)
            ];
            break;
        case 'triadic':
            colors = [
                baseColor,
                hsvToHex((hsv.h + 120) % 360, hsv.s, hsv.v),
                hsvToHex((hsv.h + 240) % 360, hsv.s, hsv.v)
            ];
            break;
        case 'tetradic':
            colors = [
                baseColor,
                hsvToHex((hsv.h + 90) % 360, hsv.s, hsv.v),
                hsvToHex((hsv.h + 180) % 360, hsv.s, hsv.v),
                hsvToHex((hsv.h + 270) % 360, hsv.s, hsv.v)
            ];
            break;
        case 'split-complementary':
            colors = [
                baseColor,
                hsvToHex((hsv.h + 150) % 360, hsv.s, hsv.v),
                hsvToHex((hsv.h + 210) % 360, hsv.s, hsv.v)
            ];
            break;
        case 'monochromatic':
            colors = [
                hsvToHex(hsv.h, Math.max(0, hsv.s - 30), Math.min(100, hsv.v + 20)),
                hsvToHex(hsv.h, Math.max(0, hsv.s - 15), Math.min(100, hsv.v + 10)),
                baseColor,
                hsvToHex(hsv.h, Math.min(100, hsv.s + 15), Math.max(0, hsv.v - 10)),
                hsvToHex(hsv.h, Math.min(100, hsv.s + 30), Math.max(0, hsv.v - 20))
            ];
            break;
    }
    
    displayColorSwatches(harmonyColors, colors);
}

// Color Palettes
function setupColorPalettes() {
    const paletteSelect = document.getElementById('color-palette');
    const canvas = document.getElementById('palette-gradient-bar');
    
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    const palettes = {
        spectrum: function(ctx, width, height) {
            // Full rainbow spectrum from black through colors to white
            const gradient = ctx.createLinearGradient(0, 0, width, 0);
            gradient.addColorStop(0, '#000000');
            gradient.addColorStop(0.14, '#ff0000');
            gradient.addColorStop(0.28, '#ff7f00');
            gradient.addColorStop(0.42, '#ffff00');
            gradient.addColorStop(0.57, '#00ff00');
            gradient.addColorStop(0.71, '#0000ff');
            gradient.addColorStop(0.85, '#8b00ff');
            gradient.addColorStop(1, '#ffffff');
            return gradient;
        },
        grayscale: function(ctx, width, height) {
            // Black to white gradient
            const gradient = ctx.createLinearGradient(0, 0, width, 0);
            gradient.addColorStop(0, '#000000');
            gradient.addColorStop(1, '#ffffff');
            return gradient;
        },
        warm: function(ctx, width, height) {
            // Warm colors with black and white
            const gradient = ctx.createLinearGradient(0, 0, width, 0);
            gradient.addColorStop(0, '#000000');
            gradient.addColorStop(0.2, '#8b0000');
            gradient.addColorStop(0.35, '#ff0000');
            gradient.addColorStop(0.5, '#ff4500');
            gradient.addColorStop(0.65, '#ffa500');
            gradient.addColorStop(0.8, '#ffd700');
            gradient.addColorStop(1, '#ffffff');
            return gradient;
        },
        cool: function(ctx, width, height) {
            // Cool colors with black and white
            const gradient = ctx.createLinearGradient(0, 0, width, 0);
            gradient.addColorStop(0, '#000000');
            gradient.addColorStop(0.2, '#000080');
            gradient.addColorStop(0.35, '#0000ff');
            gradient.addColorStop(0.5, '#00bfff');
            gradient.addColorStop(0.65, '#00ffff');
            gradient.addColorStop(0.8, '#afeeee');
            gradient.addColorStop(1, '#ffffff');
            return gradient;
        },
        pastel: function(ctx, width, height) {
            // Pastel colors
            const gradient = ctx.createLinearGradient(0, 0, width, 0);
            gradient.addColorStop(0, '#000000');
            gradient.addColorStop(0.14, '#ffb3ba');
            gradient.addColorStop(0.28, '#ffdfba');
            gradient.addColorStop(0.42, '#ffffba');
            gradient.addColorStop(0.57, '#baffc9');
            gradient.addColorStop(0.71, '#bae1ff');
            gradient.addColorStop(0.85, '#d4baff');
            gradient.addColorStop(1, '#ffffff');
            return gradient;
        },
        earth: function(ctx, width, height) {
            // Earth tones
            const gradient = ctx.createLinearGradient(0, 0, width, 0);
            gradient.addColorStop(0, '#000000');
            gradient.addColorStop(0.14, '#8b4513');
            gradient.addColorStop(0.28, '#a0522d');
            gradient.addColorStop(0.42, '#cd853f');
            gradient.addColorStop(0.57, '#daa520');
            gradient.addColorStop(0.71, '#9acd32');
            gradient.addColorStop(0.85, '#6b8e23');
            gradient.addColorStop(1, '#ffffff');
            return gradient;
        },
        sunset: function(ctx, width, height) {
            // Sunset colors
            const gradient = ctx.createLinearGradient(0, 0, width, 0);
            gradient.addColorStop(0, '#000000');
            gradient.addColorStop(0.14, '#4b0082');
            gradient.addColorStop(0.28, '#8b008b');
            gradient.addColorStop(0.42, '#dc143c');
            gradient.addColorStop(0.57, '#ff4500');
            gradient.addColorStop(0.71, '#ff8c00');
            gradient.addColorStop(0.85, '#ffd700');
            gradient.addColorStop(1, '#ffffff');
            return gradient;
        },
        ocean: function(ctx, width, height) {
            // Ocean colors
            const gradient = ctx.createLinearGradient(0, 0, width, 0);
            gradient.addColorStop(0, '#000000');
            gradient.addColorStop(0.14, '#001f3f');
            gradient.addColorStop(0.28, '#003d5c');
            gradient.addColorStop(0.42, '#005b7f');
            gradient.addColorStop(0.57, '#0074a2');
            gradient.addColorStop(0.71, '#008dc5');
            gradient.addColorStop(0.85, '#1ac6ff');
            gradient.addColorStop(1, '#ffffff');
            return gradient;
        },
        forest: function(ctx, width, height) {
            // Forest colors
            const gradient = ctx.createLinearGradient(0, 0, width, 0);
            gradient.addColorStop(0, '#000000');
            gradient.addColorStop(0.14, '#2d5016');
            gradient.addColorStop(0.28, '#3e6b1f');
            gradient.addColorStop(0.42, '#4f8628');
            gradient.addColorStop(0.57, '#60a131');
            gradient.addColorStop(0.71, '#71bc3a');
            gradient.addColorStop(0.85, '#93f24c');
            gradient.addColorStop(1, '#ffffff');
            return gradient;
        }
    };
    
    function drawPalette() {
        const selectedPalette = paletteSelect.value;
        const paletteFunc = palettes[selectedPalette] || palettes.spectrum;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = paletteFunc(ctx, canvas.width, canvas.height);
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    paletteSelect.addEventListener('change', drawPalette);
    
    // Click handler to pick color from gradient
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const imageData = ctx.getImageData(x, y, 1, 1).data;
        const color = rgbToHex(imageData[0], imageData[1], imageData[2]);
        
        state.color = color;
        const colorPicker = document.getElementById('color-picker');
        if (colorPicker) {
            colorPicker.value = color;
        }
        
        const hsv = rgbToHsv(imageData[0], imageData[1], imageData[2]);
        updateHSVDisplay(hsv);
        updateColorHarmony();
    });
    
    drawPalette();
}

function displayColorSwatches(container, colors) {
    container.innerHTML = '';
    colors.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.background = color;
        swatch.dataset.color = color;
        swatch.addEventListener('click', () => {
            state.color = color;
            document.getElementById('color-picker').value = color;
            updateColorHarmony();
        });
        container.appendChild(swatch);
    });
}

// Color Sets Management
function setupColorSets() {
    const setSelector = document.getElementById('color-set-selector');
    const setColors = document.getElementById('color-set-colors');
    const newSetBtn = document.getElementById('new-color-set-btn');
    const deleteSetBtn = document.getElementById('delete-color-set-btn');
    const addCurrentColorBtn = document.getElementById('add-current-color-to-set-btn');
    const clearSetBtn = document.getElementById('clear-color-set-btn');
    const addHarmonyBtn = document.getElementById('add-harmony-to-set-btn');
    
    // Load color sets from storage
    loadColorSets();
    
    // Initialize display
    updateColorSetSelector();
    displayCurrentColorSet();
    
    // Event listeners
    setSelector.addEventListener('change', () => {
        state.colorSets.currentSet = setSelector.value;
        displayCurrentColorSet();
        saveColorSets();
    });
    
    newSetBtn.addEventListener('click', createNewColorSet);
    deleteSetBtn.addEventListener('click', deleteCurrentColorSet);
    addCurrentColorBtn.addEventListener('click', addCurrentColorToSet);
    clearSetBtn.addEventListener('click', clearCurrentColorSet);
    addHarmonyBtn.addEventListener('click', addHarmonyColorsToSet);
    
    function createNewColorSet() {
        const setName = prompt('Enter name for new color set:', `Set ${Object.keys(state.colorSets.sets).length + 1}`);
        if (!setName) return;
        
        const setId = setName.toLowerCase().replace(/\s+/g, '-');
        if (state.colorSets.sets[setId]) {
            alert('A set with this name already exists!');
            return;
        }
        
        state.colorSets.sets[setId] = {
            name: setName,
            colors: []
        };
        state.colorSets.currentSet = setId;
        
        updateColorSetSelector();
        displayCurrentColorSet();
        saveColorSets();
    }
    
    function deleteCurrentColorSet() {
        if (state.colorSets.currentSet === 'default') {
            alert('Cannot delete the default set!');
            return;
        }
        
        if (!confirm(`Delete "${state.colorSets.sets[state.colorSets.currentSet].name}"?`)) {
            return;
        }
        
        delete state.colorSets.sets[state.colorSets.currentSet];
        state.colorSets.currentSet = 'default';
        
        updateColorSetSelector();
        displayCurrentColorSet();
        saveColorSets();
    }
    
    function addCurrentColorToSet() {
        const currentSet = state.colorSets.sets[state.colorSets.currentSet];
        if (!currentSet.colors.includes(state.color)) {
            currentSet.colors.push(state.color);
            displayCurrentColorSet();
            saveColorSets();
        }
    }
    
    function clearCurrentColorSet() {
        if (!confirm(`Clear all colors from "${state.colorSets.sets[state.colorSets.currentSet].name}"?`)) {
            return;
        }
        
        state.colorSets.sets[state.colorSets.currentSet].colors = [];
        displayCurrentColorSet();
        saveColorSets();
    }
    
    function addHarmonyColorsToSet() {
        const harmonyColors = document.getElementById('harmony-colors');
        const swatches = harmonyColors.querySelectorAll('.color-swatch');
        const currentSet = state.colorSets.sets[state.colorSets.currentSet];
        
        swatches.forEach(swatch => {
            const color = swatch.dataset.color;
            if (!currentSet.colors.includes(color)) {
                currentSet.colors.push(color);
            }
        });
        
        displayCurrentColorSet();
        saveColorSets();
    }
    
    function updateColorSetSelector() {
        setSelector.innerHTML = '';
        Object.keys(state.colorSets.sets).forEach(setId => {
            const option = document.createElement('option');
            option.value = setId;
            option.textContent = state.colorSets.sets[setId].name;
            if (setId === state.colorSets.currentSet) {
                option.selected = true;
            }
            setSelector.appendChild(option);
        });
    }
    
    function displayCurrentColorSet() {
        const currentSet = state.colorSets.sets[state.colorSets.currentSet];
        setColors.innerHTML = '';
        
        if (currentSet.colors.length === 0) {
            setColors.innerHTML = '<div style="padding: 20px; text-align: center; color: #858585; font-size: 12px;">No colors in this set</div>';
            return;
        }
        
        currentSet.colors.forEach((color, index) => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch removable';
            swatch.style.background = color;
            swatch.dataset.color = color;
            swatch.dataset.index = index;
            
            // Click to select color
            swatch.addEventListener('click', (e) => {
                // Check if clicking on the remove button area (top-right corner)
                const rect = swatch.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                if (x > rect.width - 20 && y < 20) {
                    // Remove color
                    currentSet.colors.splice(index, 1);
                    displayCurrentColorSet();
                    saveColorSets();
                } else {
                    // Select color
                    state.color = color;
                    document.getElementById('color-picker').value = color;
                    updateColorHarmony();
                }
            });
            
            setColors.appendChild(swatch);
        });
    }
    
    function saveColorSets() {
        try {
            // Save to localStorage for all users
            localStorage.setItem('artemis-color-sets', JSON.stringify(state.colorSets));
            
            // If user is authenticated, save to their account
            if (window.authManager && window.authManager.currentUser) {
                const userId = window.authManager.currentUser.id;
                const userKey = `artemis-color-sets-${userId}`;
                localStorage.setItem(userKey, JSON.stringify(state.colorSets));
            }
        } catch (e) {
            console.error('Failed to save color sets:', e);
        }
    }
    
    function loadColorSets() {
        try {
            let savedSets = null;
            
            // Try to load user-specific sets first if authenticated
            if (window.authManager && window.authManager.currentUser) {
                const userId = window.authManager.currentUser.id;
                const userKey = `artemis-color-sets-${userId}`;
                const userSets = localStorage.getItem(userKey);
                if (userSets) {
                    savedSets = JSON.parse(userSets);
                }
            }
            
            // Fall back to general localStorage
            if (!savedSets) {
                const generalSets = localStorage.getItem('artemis-color-sets');
                if (generalSets) {
                    savedSets = JSON.parse(generalSets);
                }
            }
            
            // Apply saved sets if found
            if (savedSets) {
                state.colorSets = savedSets;
                
                // Ensure default set exists
                if (!state.colorSets.sets['default']) {
                    state.colorSets.sets['default'] = {
                        name: 'Default Set',
                        colors: ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']
                    };
                }
            }
        } catch (e) {
            console.error('Failed to load color sets:', e);
        }
    }
}


// Layer Management
function setupLayers() {
    document.getElementById('new-layer-btn').addEventListener('click', () => {
        const layerType = document.getElementById('layer-type-selector').value;
        addLayer(`Layer ${state.layers.length + 1}`, layerType);
        saveState();
    });
    
    document.getElementById('duplicate-layer-btn').addEventListener('click', () => {
        if (state.activeLayer) {
            duplicateLayer();
            saveState();
        }
    });
    
    document.getElementById('delete-layer-btn').addEventListener('click', () => {
        if (state.activeLayer && state.layers.length > 1) {
            deleteLayer(state.activeLayer);
            saveState();
        }
    });
    
    document.getElementById('move-layer-up-btn').addEventListener('click', () => {
        moveLayerUp();
    });
    
    document.getElementById('move-layer-down-btn').addEventListener('click', () => {
        moveLayerDown();
    });
    
    document.getElementById('flatten-layers-btn').addEventListener('click', () => {
        if (confirm('Flatten all visible layers? This cannot be undone.')) {
            flattenAllLayers();
        }
    });
    
    // Phase 5: Layer Mask Controls
    document.getElementById('add-layer-mask-btn').addEventListener('click', () => {
        if (state.activeLayer) {
            addLayerMask();
            saveState();
        }
    });
    
    document.getElementById('toggle-layer-mask-btn').addEventListener('click', () => {
        if (state.activeLayer && state.activeLayer.mask) {
            toggleLayerMask();
            saveState();
        }
    });
    
    document.getElementById('remove-layer-mask-btn').addEventListener('click', () => {
        if (state.activeLayer && state.activeLayer.mask) {
            if (confirm('Remove layer mask? This cannot be undone.')) {
                removeLayerMask();
                saveState();
            }
        }
    });
    
    // Phase 5: Clipping Mask Control
    const clippingMaskCheckbox = document.getElementById('clipping-mask-checkbox');
    if (clippingMaskCheckbox) {
        clippingMaskCheckbox.addEventListener('change', () => {
            if (state.activeLayer) {
                toggleClippingMask();
                saveState();
            }
        });
    }
    
    // Phase 5: Layer Styles Control
    const layerStylesCheckbox = document.getElementById('layer-styles-checkbox');
    if (layerStylesCheckbox) {
        layerStylesCheckbox.addEventListener('change', () => {
            if (state.activeLayer) {
                toggleLayerStyles();
                saveState();
            }
        });
    }
    
    document.getElementById('layer-styles-settings-btn').addEventListener('click', () => {
        if (state.activeLayer) {
            showLayerStylesDialog();
        }
    });
}

function addLayer(name, type = 'paint') {
    const canvas = document.createElement('canvas');
    canvas.width = state.canvas.width;
    canvas.height = state.canvas.height;
    
    const layer = {
        id: Date.now(),
        name: name,
        canvas: canvas,
        visible: true,
        opacity: 1,
        type: type,  // paint, vector, filter, group, file, adjustment
        children: type === 'group' ? [] : null,  // For group layers
        blendMode: 'normal',  // Blend mode support
        isAdjustmentLayer: type === 'adjustment',
        adjustmentSettings: type === 'adjustment' ? {} : null,
        // Phase 5: Layer Masks
        mask: null,  // Layer mask canvas (null if no mask)
        maskEnabled: false,  // Whether mask is active
        // Category 4: Advanced Masking Features
        maskProperties: {
            density: 100,       // Mask density (0-100%)
            feather: 0,         // Mask feather amount (0-250 pixels)
            invert: false,      // Invert mask
            type: 'raster'      // 'raster', 'vector', 'gradient'
        },
        vectorMask: null,       // Vector mask path (Bezier paths)
        gradientMask: null,     // Gradient mask data
        // Phase 5: Clipping Masks
        clippingMask: false,  // Clip to layer below
        // Phase 5: Layer Styles/Effects
        layerStyles: {
            enabled: false,
            dropShadow: { enabled: false, offsetX: 5, offsetY: 5, blur: 10, color: '#000000', opacity: 0.5 },
            outerGlow: { enabled: false, size: 10, color: '#ffffff', opacity: 0.5 },
            stroke: { enabled: false, size: 2, color: '#000000', position: 'outside' }, // inside, center, outside
            bevelEmboss: { enabled: false, size: 5, depth: 50, angle: 135, highlight: 75, shadow: 75 }
        }
    };
    
    // Fill Background layer with white
    if (name === 'Background' && state.layers.length === 0) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    state.layers.push(layer);
    state.activeLayer = layer;
    updateLayersList();
    compositeAllLayers();
    // FIXED: Auto-select tool when new layer is added
    autoSelectToolForLayer(layer);
}

function duplicateLayer() {
    if (!state.activeLayer) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = state.canvas.width;
    canvas.height = state.canvas.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(state.activeLayer.canvas, 0, 0);
    
    const layer = {
        id: Date.now(),
        name: state.activeLayer.name + ' Copy',
        canvas: canvas,
        visible: true,
        opacity: 1,
        type: state.activeLayer.type || 'paint',
        children: state.activeLayer.type === 'group' ? [] : null
    };
    
    const index = state.layers.indexOf(state.activeLayer);
    state.layers.splice(index + 1, 0, layer);
    state.activeLayer = layer;
    updateLayersList();
    compositeAllLayers();
}

function deleteLayer(layer) {
    const index = state.layers.indexOf(layer);
    if (index > -1 && state.layers.length > 1) {
        state.layers.splice(index, 1);
        state.activeLayer = state.layers[Math.min(index, state.layers.length - 1)];
        updateLayersList();
        compositeAllLayers();
    }
}

function moveLayerUp() {
    if (!state.activeLayer) return;
    
    const index = state.layers.indexOf(state.activeLayer);
    if (index < state.layers.length - 1) {
        // Swap with layer above
        [state.layers[index], state.layers[index + 1]] = [state.layers[index + 1], state.layers[index]];
        updateLayersList();
        compositeAllLayers();
        saveState();
    }
}

function moveLayerDown() {
    if (!state.activeLayer) return;
    
    const index = state.layers.indexOf(state.activeLayer);
    if (index > 0) {
        // Swap with layer below
        [state.layers[index], state.layers[index - 1]] = [state.layers[index - 1], state.layers[index]];
        updateLayersList();
        compositeAllLayers();
        saveState();
    }
}

function flattenAllLayers() {
    if (state.layers.length <= 1) return;
    
    // Create a new canvas for the flattened result
    const flattenedCanvas = document.createElement('canvas');
    flattenedCanvas.width = state.canvas.width;
    flattenedCanvas.height = state.canvas.height;
    const ctx = flattenedCanvas.getContext('2d');
    
    // Fill with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, flattenedCanvas.width, flattenedCanvas.height);
    
    // Draw all visible layers
    state.layers.forEach(layer => {
        if (layer.visible) {
            ctx.globalAlpha = layer.opacity;
            ctx.drawImage(layer.canvas, 0, 0);
        }
    });
    
    ctx.globalAlpha = 1;
    
    // Replace all layers with single flattened layer
    state.layers = [{
        id: Date.now(),
        name: 'Flattened',
        canvas: flattenedCanvas,
        visible: true,
        opacity: 1,
        type: 'paint',
        children: null
    }];
    
    state.activeLayer = state.layers[0];
    updateLayersList();
    compositeAllLayers();
    saveState();
}

function getLayerTypeIcon(type) {
    const icons = {
        'paint': '🎨',
        'vector': '📐',
        'text': '📝',
        'filter': '✨',
        'adjustment': '⚙️',
        'group': '📁',
        'file': '📄'
    };
    return icons[type] || '🎨';
}

function updateLayersList() {
    const layersList = document.getElementById('layers-list');
    layersList.innerHTML = '';
    
    // Category 5: Apply filters
    const filteredLayers = layerFilters.searchText || layerFilters.filterType !== 'all' ? 
        filterLayers() : state.layers;
    
    // Display layers in reverse order (top to bottom)
    [...filteredLayers].reverse().forEach(layer => {
        const layerItem = document.createElement('div');
        layerItem.className = 'layer-item';
        const layerType = layer.type || 'paint';
        layerItem.setAttribute('data-layer-type', layerType);
        
        // Category 5: Add color label
        if (layer.colorLabel) {
            layerItem.setAttribute('data-color-label', layer.colorLabel);
        }
        
        if (layer === state.activeLayer) {
            layerItem.classList.add('active');
        }
        
        // Create thumbnail
        const thumbnail = document.createElement('canvas');
        thumbnail.className = 'layer-thumbnail';
        thumbnail.width = 40;
        thumbnail.height = 40;
        const thumbCtx = thumbnail.getContext('2d');
        thumbCtx.drawImage(layer.canvas, 0, 0, layer.canvas.width, layer.canvas.height, 0, 0, 40, 40);
        
        // Create layer info
        const layerInfo = document.createElement('div');
        layerInfo.className = 'layer-info';
        const typeIcon = getLayerTypeIcon(layerType);
        
        // Category 5: Add layer badges and lock indicators
        let badges = '';
        if (layer.isSmartObject) {
            badges += '<span class="layer-type-badge smart-object">SO</span>';
        }
        if (layer.linkedTo) {
            badges += '<span class="layer-type-badge linked">🔗</span>';
        }
        if (layer.type === 'fill') {
            badges += '<span class="layer-type-badge fill">F</span>';
        }
        if (layer.type === 'shape') {
            badges += '<span class="layer-type-badge shape">S</span>';
        }
        if (layer.type === 'parametric') {
            badges += '<span class="layer-type-badge parametric">P</span>';
        }
        
        let lockIndicators = '';
        if (layer.locks) {
            if (layer.locks.all) {
                lockIndicators += '<span class="layer-lock-indicator" title="All locked">🔒</span>';
            } else {
                if (layer.locks.position) lockIndicators += '<span class="layer-lock-indicator" title="Position locked">📍</span>';
                if (layer.locks.pixels) lockIndicators += '<span class="layer-lock-indicator" title="Pixels locked">🖌️</span>';
                if (layer.locks.transparency) lockIndicators += '<span class="layer-lock-indicator" title="Transparency locked">👁️</span>';
            }
        }
        
        layerInfo.innerHTML = `
            <div class="layer-name">${layer.name}${badges}${lockIndicators}</div>
            <div class="layer-type" title="${layerType}">${typeIcon}</div>
        `;
        
        // Visibility toggle
        const visibilityBtn = document.createElement('button');
        visibilityBtn.className = layer.visible ? 'layer-visibility visible' : 'layer-visibility hidden';
        visibilityBtn.innerHTML = layer.visible ? 
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>' :
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 0 0 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>';
        
        visibilityBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            layer.visible = !layer.visible;
            updateLayersList();
            compositeAllLayers();
        });
        
        layerItem.appendChild(thumbnail);
        layerItem.appendChild(layerInfo);
        layerItem.appendChild(visibilityBtn);
        
        layerItem.addEventListener('click', () => {
            state.activeLayer = layer;
            updateLayersList();
            // FIXED: Auto-select appropriate tool based on layer type
            autoSelectToolForLayer(layer);
        });
        
        layersList.appendChild(layerItem);
    });
}

function compositeAllLayers() {
    // FIXED: Save and restore context to ensure proper state management
    mainCtx.save();
    mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    
    // Process layers with clipping masks and layer styles support
    for (let i = 0; i < state.layers.length; i++) {
        const layer = state.layers[i];
        
        if (!layer.visible || !layer.canvas) continue;
        
        // Check if we need a temporary canvas for this layer
        const needsTempCanvas = (layer.maskEnabled && layer.mask) || 
                               layer.clippingMask || 
                               (layer.layerStyles && layer.layerStyles.enabled);
        
        if (!needsTempCanvas && !layer.isAdjustmentLayer) {
            // Simple case: just draw the layer directly
            const blendMode = layer.blendMode || 'normal';
            
            // Phase 3: Check if this is a custom blend mode
            if (blendMode.startsWith('custom-') && customBlendModes[blendMode]) {
                // Apply custom blend mode using pixel manipulation
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = mainCanvas.width;
                tempCanvas.height = mainCanvas.height;
                const tempCtx = tempCanvas.getContext('2d');
                
                // Copy current main canvas state
                tempCtx.drawImage(mainCanvas, 0, 0);
                
                // Create source canvas with layer content at correct opacity
                const sourceCanvas = document.createElement('canvas');
                sourceCanvas.width = mainCanvas.width;
                sourceCanvas.height = mainCanvas.height;
                const sourceCtx = sourceCanvas.getContext('2d');
                sourceCtx.globalAlpha = layer.opacity;
                sourceCtx.drawImage(layer.canvas, 0, 0);
                
                // Apply custom blend formula
                applyCustomBlendMode(tempCanvas, sourceCanvas, customBlendModes[blendMode].formula);
                
                // Draw blended result
                mainCtx.globalAlpha = 1.0;
                mainCtx.globalCompositeOperation = 'source-over';
                mainCtx.drawImage(tempCanvas, 0, 0);
            } else if (advancedBlendModes[blendMode]) {
                // Category 5: Advanced blend mode
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = mainCanvas.width;
                tempCanvas.height = mainCanvas.height;
                const tempCtx = tempCanvas.getContext('2d');
                
                // Copy current main canvas state
                tempCtx.drawImage(mainCanvas, 0, 0);
                
                // Create source canvas with layer content at correct opacity
                const sourceCanvas = document.createElement('canvas');
                sourceCanvas.width = mainCanvas.width;
                sourceCanvas.height = mainCanvas.height;
                const sourceCtx = sourceCanvas.getContext('2d');
                sourceCtx.globalAlpha = layer.opacity;
                sourceCtx.drawImage(layer.canvas, 0, 0);
                
                // Apply advanced blend mode
                applyAdvancedBlendMode(tempCanvas, sourceCanvas, blendMode);
                
                // Draw blended result
                mainCtx.globalAlpha = 1.0;
                mainCtx.globalCompositeOperation = 'source-over';
                mainCtx.drawImage(tempCanvas, 0, 0);
            } else {
                // Standard blend mode
                mainCtx.globalAlpha = layer.opacity;
                mainCtx.globalCompositeOperation = blendMode;
                mainCtx.drawImage(layer.canvas, 0, 0);
            }
            continue;
        }
        
        // Create a temporary canvas for this layer (for masks and styles)
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = mainCanvas.width;
        tempCanvas.height = mainCanvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Draw the base layer content
        if (layer.isAdjustmentLayer && layer.adjustmentSettings) {
            // Apply adjustment layer to all layers below
            applyAdjustmentLayerEnhanced(layer, tempCtx);
        } else {
            tempCtx.drawImage(layer.canvas, 0, 0);
        }
        
        // Apply layer mask if present
        if (layer.maskEnabled && layer.mask) {
            tempCtx.globalCompositeOperation = 'destination-in';
            tempCtx.drawImage(layer.mask, 0, 0);
            tempCtx.globalCompositeOperation = 'source-over';
        }
        
        // Apply clipping mask (clip to layer below)
        if (layer.clippingMask && i > 0) {
            const prevLayer = state.layers[i - 1];
            if (prevLayer.visible && prevLayer.canvas) {
                tempCtx.globalCompositeOperation = 'destination-in';
                tempCtx.drawImage(prevLayer.canvas, 0, 0);
                tempCtx.globalCompositeOperation = 'source-over';
            }
        }
        
        // Apply layer styles/effects
        if (layer.layerStyles && layer.layerStyles.enabled) {
            applyLayerStyles(tempCanvas, layer.layerStyles);
        }
        
        // Composite to main canvas
        const blendMode = layer.blendMode || 'normal';
        
        // Phase 3: Check if this is a custom blend mode
        if (blendMode.startsWith('custom-') && customBlendModes[blendMode]) {
            // Apply custom blend mode using pixel manipulation
            const destCanvas = document.createElement('canvas');
            destCanvas.width = mainCanvas.width;
            destCanvas.height = mainCanvas.height;
            const destCtx = destCanvas.getContext('2d');
            
            // Copy current main canvas state
            destCtx.drawImage(mainCanvas, 0, 0);
            
            // Create source canvas with layer content at correct opacity
            const sourceCanvas = document.createElement('canvas');
            sourceCanvas.width = mainCanvas.width;
            sourceCanvas.height = mainCanvas.height;
            const sourceCtx = sourceCanvas.getContext('2d');
            sourceCtx.globalAlpha = layer.opacity;
            sourceCtx.drawImage(tempCanvas, 0, 0);
            
            // Apply custom blend formula
            applyCustomBlendMode(destCanvas, sourceCanvas, customBlendModes[blendMode].formula);
            
            // Draw blended result
            mainCtx.globalAlpha = 1.0;
            mainCtx.globalCompositeOperation = 'source-over';
            mainCtx.drawImage(destCanvas, 0, 0);
        } else {
            // Standard blend mode
            mainCtx.globalAlpha = layer.opacity;
            mainCtx.globalCompositeOperation = blendMode;
            mainCtx.drawImage(tempCanvas, 0, 0);
        }
    }
    
    mainCtx.restore();
    
    // Apply canvas texture
    if (state.canvasTexture.enabled) {
        applyCanvasTexture();
    }
    
    // Draw reference image
    if (state.reference.visible && state.reference.image) {
        mainCtx.save();
        mainCtx.globalAlpha = state.reference.opacity;
        // Phase 11: Apply scale to reference image
        const scaledWidth = state.reference.originalWidth * state.reference.scale;
        const scaledHeight = state.reference.originalHeight * state.reference.scale;
        mainCtx.drawImage(
            state.reference.image,
            state.reference.x,
            state.reference.y,
            scaledWidth,
            scaledHeight
        );
        mainCtx.restore();
    }
    
    // Phase 11: Draw grid
    if (state.grid.visible) {
        mainCtx.save();
        mainCtx.strokeStyle = 'rgba(128, 128, 128, 0.3)';
        mainCtx.lineWidth = 1;
        
        const gridSize = state.grid.size;
        
        // Draw vertical lines
        for (let x = 0; x <= mainCanvas.width; x += gridSize) {
            mainCtx.beginPath();
            mainCtx.moveTo(x, 0);
            mainCtx.lineTo(x, mainCanvas.height);
            mainCtx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= mainCanvas.height; y += gridSize) {
            mainCtx.beginPath();
            mainCtx.moveTo(0, y);
            mainCtx.lineTo(mainCanvas.width, y);
            mainCtx.stroke();
        }
        
        mainCtx.restore();
    }
    
    // Phase 11: Draw guides
    if (state.rulers.guidesVisible && state.rulers.guides && state.rulers.guides.length > 0) {
        mainCtx.save();
        mainCtx.strokeStyle = '#00BFFF';
        mainCtx.lineWidth = 1;
        mainCtx.setLineDash([5, 5]);
        
        state.rulers.guides.forEach(guide => {
            if (guide.type === 'horizontal') {
                mainCtx.beginPath();
                mainCtx.moveTo(0, guide.position);
                mainCtx.lineTo(mainCanvas.width, guide.position);
                mainCtx.stroke();
            } else if (guide.type === 'vertical') {
                mainCtx.beginPath();
                mainCtx.moveTo(guide.position, 0);
                mainCtx.lineTo(guide.position, mainCanvas.height);
                mainCtx.stroke();
            }
        });
        
        mainCtx.restore();
    }
    
    // Capture frame for time-lapse
    if (state.timelapse.recording) {
        const now = Date.now();
        if (now - state.timelapse.lastCapture >= state.timelapse.interval) {
            const frameData = mainCanvas.toDataURL('image/png');
            state.timelapse.frames.push({
                timestamp: now,
                data: frameData
            });
            state.timelapse.lastCapture = now;
            
            // Limit frames to prevent memory issues (keep last 1000 frames)
            if (state.timelapse.frames.length > 1000) {
                state.timelapse.frames.shift();
            }
        }
    }
}

// Blend mode functions
function applyBlendMode(target, source, mode) {
    const targetData = target.getImageData(0, 0, target.canvas.width, target.canvas.height);
    const sourceData = source.getImageData(0, 0, source.canvas.width, source.canvas.height);
    
    // Helper function: RGB to HSL conversion
    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        return [h, s, l];
    }
    
    // Helper function: HSL to RGB conversion
    function hslToRgb(h, s, l) {
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }
    
    for (let i = 0; i < targetData.data.length; i += 4) {
        const tr = targetData.data[i];
        const tg = targetData.data[i + 1];
        const tb = targetData.data[i + 2];
        const sr = sourceData.data[i];
        const sg = sourceData.data[i + 1];
        const sb = sourceData.data[i + 2];
        const sa = sourceData.data[i + 3];
        
        // Skip if source is transparent
        if (sa === 0) continue;
        
        let result;
        switch (mode) {
            case 'multiply':
                result = [(tr * sr) / 255, (tg * sg) / 255, (tb * sb) / 255];
                break;
            case 'screen':
                result = [255 - ((255 - tr) * (255 - sr)) / 255,
                         255 - ((255 - tg) * (255 - sg)) / 255,
                         255 - ((255 - tb) * (255 - sb)) / 255];
                break;
            case 'overlay':
                result = [
                    tr < 128 ? (2 * tr * sr) / 255 : 255 - (2 * (255 - tr) * (255 - sr)) / 255,
                    tg < 128 ? (2 * tg * sg) / 255 : 255 - (2 * (255 - tg) * (255 - sg)) / 255,
                    tb < 128 ? (2 * tb * sb) / 255 : 255 - (2 * (255 - tb) * (255 - sb)) / 255
                ];
                break;
            case 'hue':
                // Apply source hue to target saturation and luminosity
                const [sH] = rgbToHsl(sr, sg, sb);
                const [, tS, tL] = rgbToHsl(tr, tg, tb);
                result = hslToRgb(sH, tS, tL);
                break;
            case 'saturation':
                // Apply source saturation to target hue and luminosity
                const [tH2, , tL2] = rgbToHsl(tr, tg, tb);
                const [, sS] = rgbToHsl(sr, sg, sb);
                result = hslToRgb(tH2, sS, tL2);
                break;
            case 'color':
                // Apply source hue and saturation to target luminosity
                const [sH3, sS3] = rgbToHsl(sr, sg, sb);
                const [, , tL3] = rgbToHsl(tr, tg, tb);
                result = hslToRgb(sH3, sS3, tL3);
                break;
            case 'luminosity':
                // Apply source luminosity to target hue and saturation
                const [tH4, tS4] = rgbToHsl(tr, tg, tb);
                const [, , sL] = rgbToHsl(sr, sg, sb);
                result = hslToRgb(tH4, tS4, sL);
                break;
            default:
                continue;
        }
        
        targetData.data[i] = result[0];
        targetData.data[i + 1] = result[1];
        targetData.data[i + 2] = result[2];
    }
    
    target.putImageData(targetData, 0, 0);
}

// Phase 3: Custom Blend Mode System
// Storage for custom blend modes
let customBlendModes = {};

// Load custom blend modes from localStorage
function loadCustomBlendModes() {
    try {
        const saved = localStorage.getItem('artemis-custom-blend-modes');
        if (saved) {
            customBlendModes = JSON.parse(saved);
            updateBlendModeDropdown();
        }
    } catch (e) {
        console.error('Error loading custom blend modes:', e);
    }
}

// Save custom blend modes to localStorage
function saveCustomBlendModes() {
    try {
        localStorage.setItem('artemis-custom-blend-modes', JSON.stringify(customBlendModes));
    } catch (e) {
        console.error('Error saving custom blend modes:', e);
    }
}

// Update blend mode dropdown with custom modes
function updateBlendModeDropdown() {
    const select = document.getElementById('layer-blend-mode');
    if (!select) return;
    
    // Remove all custom blend mode options
    const options = Array.from(select.options);
    options.forEach(option => {
        if (option.value.startsWith('custom-')) {
            select.removeChild(option);
        }
    });
    
    // Add current custom blend modes
    Object.keys(customBlendModes).forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = customBlendModes[key].name;
        select.appendChild(option);
    });
}

// Apply custom blend mode using pixel manipulation
function applyCustomBlendMode(targetCanvas, sourceCanvas, formula) {
    const targetCtx = targetCanvas.getContext('2d');
    const sourceCtx = sourceCanvas.getContext('2d');
    
    const width = targetCanvas.width;
    const height = targetCanvas.height;
    
    // Get pixel data
    const dstData = targetCtx.getImageData(0, 0, width, height);
    const srcData = sourceCtx.getImageData(0, 0, width, height);
    
    const dst = dstData.data;
    const src = srcData.data;
    
    // Apply custom blend formula
    try {
        // Create the blending function from the formula
        const blendFunc = new Function('src', 'dst', formula);
        
        for (let i = 0; i < dst.length; i += 4) {
            const srcPixel = {
                r: src[i],
                g: src[i + 1],
                b: src[i + 2],
                a: src[i + 3]
            };
            
            const dstPixel = {
                r: dst[i],
                g: dst[i + 1],
                b: dst[i + 2],
                a: dst[i + 3]
            };
            
            // Skip transparent pixels
            if (srcPixel.a === 0) continue;
            
            // Apply blend formula
            const result = blendFunc(srcPixel, dstPixel);
            
            // Clamp values and apply
            dst[i] = Math.max(0, Math.min(255, result.r || 0));
            dst[i + 1] = Math.max(0, Math.min(255, result.g || 0));
            dst[i + 2] = Math.max(0, Math.min(255, result.b || 0));
            dst[i + 3] = Math.max(0, Math.min(255, result.a !== undefined ? result.a : srcPixel.a));
        }
        
        targetCtx.putImageData(dstData, 0, 0);
        return true;
    } catch (e) {
        console.error('Error applying custom blend mode:', e);
        return false;
    }
}

// Setup custom blend mode UI and event handlers
function setupCustomBlendModes() {
    // Load saved custom blend modes
    loadCustomBlendModes();
    
    // Create Custom Blend Mode button
    const createBtn = document.getElementById('create-custom-blend-btn');
    if (createBtn) {
        createBtn.addEventListener('click', () => {
            showCustomBlendDialog();
        });
    }
    
    // Manage Custom Blend Modes button
    const manageBtn = document.getElementById('manage-custom-blends-btn');
    if (manageBtn) {
        manageBtn.addEventListener('click', () => {
            showManageCustomBlendsDialog();
        });
    }
    
    // Setup custom blend dialog
    setupCustomBlendDialog();
    
    // Setup manage dialog
    setupManageCustomBlendsDialog();
}

// Show custom blend mode creation dialog
function showCustomBlendDialog() {
    const dialog = document.getElementById('custom-blend-dialog');
    if (!dialog) return;
    
    // Reset form
    document.getElementById('custom-blend-name').value = '';
    document.getElementById('custom-blend-formula').value = '';
    document.getElementById('custom-blend-preset').value = '';
    
    dialog.classList.remove('hidden');
}

// Setup custom blend mode creation dialog handlers
function setupCustomBlendDialog() {
    const dialog = document.getElementById('custom-blend-dialog');
    if (!dialog) return;
    
    // Close button
    const closeBtn = document.getElementById('custom-blend-dialog-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            dialog.classList.add('hidden');
        });
    }
    
    // Cancel button
    const cancelBtn = document.getElementById('custom-blend-dialog-cancel');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            dialog.classList.add('hidden');
        });
    }
    
    // Preset selector
    const presetSelect = document.getElementById('custom-blend-preset');
    if (presetSelect) {
        presetSelect.addEventListener('change', (e) => {
            loadCustomBlendPreset(e.target.value);
        });
    }
    
    // Save button
    const saveBtn = document.getElementById('custom-blend-dialog-save');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            saveCustomBlendMode();
        });
    }
}

// Load a preset blend formula
function loadCustomBlendPreset(preset) {
    const formulaField = document.getElementById('custom-blend-formula');
    const nameField = document.getElementById('custom-blend-name');
    if (!formulaField || !nameField) return;
    
    const presets = {
        additive: {
            name: 'Additive',
            formula: `return {
  r: Math.min(255, src.r + dst.r),
  g: Math.min(255, src.g + dst.g),
  b: Math.min(255, src.b + dst.b),
  a: src.a
};`
        },
        average: {
            name: 'Average',
            formula: `return {
  r: (src.r + dst.r) / 2,
  g: (src.g + dst.g) / 2,
  b: (src.b + dst.b) / 2,
  a: src.a
};`
        },
        subtract: {
            name: 'Subtract',
            formula: `return {
  r: Math.max(0, dst.r - src.r),
  g: Math.max(0, dst.g - src.g),
  b: Math.max(0, dst.b - src.b),
  a: src.a
};`
        },
        inverse: {
            name: 'Inverse',
            formula: `return {
  r: 255 - ((255 - src.r) * (255 - dst.r) / 255),
  g: 255 - ((255 - src.g) * (255 - dst.g) / 255),
  b: 255 - ((255 - src.b) * (255 - dst.b) / 255),
  a: src.a
};`
        },
        max: {
            name: 'Maximum',
            formula: `return {
  r: Math.max(src.r, dst.r),
  g: Math.max(src.g, dst.g),
  b: Math.max(src.b, dst.b),
  a: src.a
};`
        },
        min: {
            name: 'Minimum',
            formula: `return {
  r: Math.min(src.r, dst.r),
  g: Math.min(src.g, dst.g),
  b: Math.min(src.b, dst.b),
  a: src.a
};`
        }
    };
    
    if (presets[preset]) {
        nameField.value = presets[preset].name;
        formulaField.value = presets[preset].formula;
    }
}

// Save a custom blend mode
function saveCustomBlendMode() {
    const nameField = document.getElementById('custom-blend-name');
    const formulaField = document.getElementById('custom-blend-formula');
    
    if (!nameField || !formulaField) return;
    
    const name = nameField.value.trim();
    const formula = formulaField.value.trim();
    
    if (!name) {
        alert('Please enter a name for the blend mode.');
        return;
    }
    
    if (!formula) {
        alert('Please enter a blend formula.');
        return;
    }
    
    // Test the formula
    try {
        const testFunc = new Function('src', 'dst', formula);
        const testResult = testFunc(
            { r: 128, g: 128, b: 128, a: 255 },
            { r: 64, g: 64, b: 64, a: 255 }
        );
        
        if (!testResult || typeof testResult.r !== 'number') {
            throw new Error('Formula must return an object with r, g, b, a properties');
        }
    } catch (e) {
        alert('Invalid formula: ' + e.message);
        return;
    }
    
    // Save the blend mode
    const key = 'custom-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    customBlendModes[key] = {
        name: name,
        formula: formula
    };
    
    saveCustomBlendModes();
    updateBlendModeDropdown();
    
    // Close dialog
    document.getElementById('custom-blend-dialog').classList.add('hidden');
    
    alert('Custom blend mode "' + name + '" saved successfully!');
}

// Show manage custom blends dialog
function showManageCustomBlendsDialog() {
    const dialog = document.getElementById('manage-custom-blends-dialog');
    const list = document.getElementById('custom-blends-list');
    
    if (!dialog || !list) return;
    
    // Clear list
    list.innerHTML = '';
    
    // Check if there are any custom blend modes
    if (Object.keys(customBlendModes).length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">No custom blend modes yet. Create one to get started!</p>';
    } else {
        // Add each custom blend mode
        Object.keys(customBlendModes).forEach(key => {
            const blend = customBlendModes[key];
            const item = document.createElement('div');
            item.style.cssText = 'border: 1px solid #444; padding: 10px; margin-bottom: 10px; border-radius: 4px;';
            
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong>${blend.name}</strong>
                    <div>
                        <button class="filter-btn" data-action="edit" data-key="${key}" style="margin-right: 5px;">Edit</button>
                        <button class="filter-btn" data-action="delete" data-key="${key}">Delete</button>
                    </div>
                </div>
                <pre style="margin-top: 10px; padding: 5px; background: #222; border-radius: 3px; font-size: 11px; overflow-x: auto;">${blend.formula}</pre>
            `;
            
            list.appendChild(item);
        });
        
        // Add event listeners for buttons
        list.querySelectorAll('button[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.getAttribute('data-action');
                const key = e.target.getAttribute('data-key');
                
                if (action === 'delete') {
                    if (confirm('Are you sure you want to delete this blend mode?')) {
                        delete customBlendModes[key];
                        saveCustomBlendModes();
                        updateBlendModeDropdown();
                        showManageCustomBlendsDialog(); // Refresh the list
                    }
                } else if (action === 'edit') {
                    // Load the blend mode for editing
                    const blend = customBlendModes[key];
                    document.getElementById('custom-blend-name').value = blend.name;
                    document.getElementById('custom-blend-formula').value = blend.formula;
                    
                    // Close manage dialog and show create dialog
                    dialog.classList.add('hidden');
                    showCustomBlendDialog();
                    
                    // Delete the old one when saving the edited version
                    delete customBlendModes[key];
                }
            });
        });
    }
    
    dialog.classList.remove('hidden');
}

// Setup manage custom blends dialog handlers
function setupManageCustomBlendsDialog() {
    const dialog = document.getElementById('manage-custom-blends-dialog');
    if (!dialog) return;
    
    // Close button
    const closeBtn = document.getElementById('manage-custom-blends-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            dialog.classList.add('hidden');
        });
    }
    
    // OK button
    const okBtn = document.getElementById('manage-custom-blends-ok');
    if (okBtn) {
        okBtn.addEventListener('click', () => {
            dialog.classList.add('hidden');
        });
    }
}

// Adjustment Layers
function applyAdjustmentLayer(layer) {
    // Adjustment layers affect all layers below them
    // This is a simplified version - full implementation would be more complex
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = mainCanvas.width;
    tempCanvas.height = mainCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(mainCanvas, 0, 0);
    
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    const settings = layer.adjustmentSettings;
    
    if (settings.brightness !== undefined) {
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, data[i] + settings.brightness));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + settings.brightness));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + settings.brightness));
        }
    }
    
    if (settings.saturation !== undefined) {
        const sat = settings.saturation / 100;
        for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            data[i] = gray + sat * (data[i] - gray);
            data[i + 1] = gray + sat * (data[i + 1] - gray);
            data[i + 2] = gray + sat * (data[i + 2] - gray);
        }
    }
    
    tempCtx.putImageData(imageData, 0, 0);
    mainCtx.drawImage(tempCanvas, 0, 0);
}

// Phase 5: Enhanced Adjustment Layer with Levels, Curves, and Hue/Saturation
function applyAdjustmentLayerEnhanced(layer, targetCtx) {
    // Draw all layers below this adjustment layer first
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = mainCanvas.width;
    tempCanvas.height = mainCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(mainCanvas, 0, 0);
    
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    const settings = layer.adjustmentSettings;
    
    // Apply brightness
    if (settings.brightness !== undefined) {
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, data[i] + settings.brightness));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + settings.brightness));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + settings.brightness));
        }
    }
    
    // Apply saturation
    if (settings.saturation !== undefined) {
        const sat = settings.saturation / 100;
        for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            data[i] = gray + sat * (data[i] - gray);
            data[i + 1] = gray + sat * (data[i + 1] - gray);
            data[i + 2] = gray + sat * (data[i + 2] - gray);
        }
    }
    
    // Apply Levels (input black, input white, output black, output white, gamma)
    if (settings.levels) {
        const { inputBlack = 0, inputWhite = 255, outputBlack = 0, outputWhite = 255, gamma = 1.0 } = settings.levels;
        const inputRange = inputWhite - inputBlack;
        const outputRange = outputWhite - outputBlack;
        
        for (let i = 0; i < data.length; i += 4) {
            for (let c = 0; c < 3; c++) {
                let value = data[i + c];
                // Apply input levels
                value = Math.max(0, Math.min(255, (value - inputBlack) * (255 / inputRange)));
                // Apply gamma
                value = Math.pow(value / 255, 1 / gamma) * 255;
                // Apply output levels
                value = outputBlack + (value / 255) * outputRange;
                data[i + c] = Math.max(0, Math.min(255, value));
            }
        }
    }
    
    // Apply Curves (simple curve with control points)
    if (settings.curves && settings.curves.points) {
        const curveMap = createCurveMap(settings.curves.points);
        for (let i = 0; i < data.length; i += 4) {
            data[i] = curveMap[data[i]];
            data[i + 1] = curveMap[data[i + 1]];
            data[i + 2] = curveMap[data[i + 2]];
        }
    }
    
    // Apply Hue/Saturation adjustment
    if (settings.hue !== undefined || settings.saturationShift !== undefined || settings.lightness !== undefined) {
        const hueShift = (settings.hue || 0) / 360; // Convert to 0-1 range
        const satShift = (settings.saturationShift || 0) / 100;
        const lightShift = (settings.lightness || 0) / 100;
        
        for (let i = 0; i < data.length; i += 4) {
            let [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
            h = (h + hueShift) % 1;
            s = Math.max(0, Math.min(1, s + satShift));
            l = Math.max(0, Math.min(1, l + lightShift));
            const [r, g, b] = hslToRgb(h, s, l);
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
        }
    }
    
    tempCtx.putImageData(imageData, 0, 0);
    targetCtx.drawImage(tempCanvas, 0, 0);
}

// Helper function to create curve map from control points
function createCurveMap(points) {
    const map = new Array(256);
    // Sort points by x coordinate
    const sorted = points.sort((a, b) => a.x - b.x);
    
    for (let i = 0; i < 256; i++) {
        const x = i / 255;
        let y = x; // Default to linear
        
        // Find the two control points to interpolate between
        for (let j = 0; j < sorted.length - 1; j++) {
            if (x >= sorted[j].x && x <= sorted[j + 1].x) {
                const t = (x - sorted[j].x) / (sorted[j + 1].x - sorted[j].x);
                y = sorted[j].y + t * (sorted[j + 1].y - sorted[j].y);
                break;
            }
        }
        
        map[i] = Math.max(0, Math.min(255, Math.round(y * 255)));
    }
    
    return map;
}

// Phase 5: Apply Layer Styles/Effects (Drop Shadow, Outer Glow, Stroke, Bevel/Emboss)
function applyLayerStyles(canvas, styles) {
    if (!styles || !styles.enabled) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Create a backup of the original content
    const originalCanvas = document.createElement('canvas');
    originalCanvas.width = width;
    originalCanvas.height = height;
    const originalCtx = originalCanvas.getContext('2d');
    originalCtx.drawImage(canvas, 0, 0);
    
    // Clear the canvas to draw effects underneath
    ctx.clearRect(0, 0, width, height);
    
    // Apply Drop Shadow
    if (styles.dropShadow && styles.dropShadow.enabled) {
        const ds = styles.dropShadow;
        ctx.save();
        ctx.shadowOffsetX = ds.offsetX;
        ctx.shadowOffsetY = ds.offsetY;
        ctx.shadowBlur = ds.blur;
        ctx.shadowColor = ds.color;
        ctx.globalAlpha = ds.opacity;
        ctx.drawImage(originalCanvas, 0, 0);
        ctx.restore();
    }
    
    // Apply Outer Glow
    if (styles.outerGlow && styles.outerGlow.enabled) {
        const og = styles.outerGlow;
        ctx.save();
        ctx.shadowBlur = og.size;
        ctx.shadowColor = og.color;
        ctx.globalAlpha = og.opacity;
        // Draw multiple times for stronger glow
        for (let i = 0; i < 3; i++) {
            ctx.drawImage(originalCanvas, 0, 0);
        }
        ctx.restore();
    }
    
    // Apply Stroke
    if (styles.stroke && styles.stroke.enabled) {
        const st = styles.stroke;
        const imageData = originalCtx.getImageData(0, 0, width, height);
        const strokeCanvas = document.createElement('canvas');
        strokeCanvas.width = width;
        strokeCanvas.height = height;
        const strokeCtx = strokeCanvas.getContext('2d');
        
        // Create stroke by dilating the alpha channel
        const strokeData = strokeCtx.createImageData(width, height);
        const strokeSize = st.size;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                // Check if any neighboring pixel has alpha
                let hasAlpha = false;
                for (let dy = -strokeSize; dy <= strokeSize; dy++) {
                    for (let dx = -strokeSize; dx <= strokeSize; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const nidx = (ny * width + nx) * 4;
                            if (imageData.data[nidx + 3] > 0 && Math.sqrt(dx*dx + dy*dy) <= strokeSize) {
                                hasAlpha = true;
                                break;
                            }
                        }
                    }
                    if (hasAlpha) break;
                }
                
                if (hasAlpha && imageData.data[idx + 3] === 0) {
                    // Parse stroke color
                    const color = hexToRgb(st.color);
                    strokeData.data[idx] = color.r;
                    strokeData.data[idx + 1] = color.g;
                    strokeData.data[idx + 2] = color.b;
                    strokeData.data[idx + 3] = 255;
                }
            }
        }
        
        strokeCtx.putImageData(strokeData, 0, 0);
        ctx.drawImage(strokeCanvas, 0, 0);
    }
    
    // Apply Bevel and Emboss
    if (styles.bevelEmboss && styles.bevelEmboss.enabled) {
        const be = styles.bevelEmboss;
        const imageData = originalCtx.getImageData(0, 0, width, height);
        const bevelCanvas = document.createElement('canvas');
        bevelCanvas.width = width;
        bevelCanvas.height = height;
        const bevelCtx = bevelCanvas.getContext('2d');
        bevelCtx.drawImage(originalCanvas, 0, 0);
        
        const bevelData = bevelCtx.getImageData(0, 0, width, height);
        const angle = (be.angle * Math.PI) / 180;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                if (imageData.data[idx + 3] > 0) {
                    // Calculate height map from alpha
                    const heightThis = imageData.data[idx + 3] / 255;
                    const heightRight = imageData.data[((y) * width + (x + 1)) * 4 + 3] / 255;
                    const heightDown = imageData.data[((y + 1) * width + (x)) * 4 + 3] / 255;
                    
                    // Calculate normal
                    const normalX = heightThis - heightRight;
                    const normalY = heightThis - heightDown;
                    
                    // Calculate lighting
                    const light = (normalX * dx + normalY * dy) * be.depth / 100;
                    
                    // Apply highlight and shadow
                    if (light > 0) {
                        const highlight = light * be.highlight / 100;
                        bevelData.data[idx] = Math.min(255, bevelData.data[idx] + highlight * 255);
                        bevelData.data[idx + 1] = Math.min(255, bevelData.data[idx + 1] + highlight * 255);
                        bevelData.data[idx + 2] = Math.min(255, bevelData.data[idx + 2] + highlight * 255);
                    } else {
                        const shadow = -light * be.shadow / 100;
                        bevelData.data[idx] = Math.max(0, bevelData.data[idx] - shadow * 255);
                        bevelData.data[idx + 1] = Math.max(0, bevelData.data[idx + 1] - shadow * 255);
                        bevelData.data[idx + 2] = Math.max(0, bevelData.data[idx + 2] - shadow * 255);
                    }
                }
            }
        }
        
        bevelCtx.putImageData(bevelData, 0, 0);
        ctx.drawImage(bevelCanvas, 0, 0);
        // Don't return - let original content be drawn below
    }
    
    // Draw original content on top
    ctx.drawImage(originalCanvas, 0, 0);
}

// Helper function to convert hex color to RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

// Phase 5: Layer Mask Functions
function addLayerMask() {
    if (!state.activeLayer) return;
    
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = state.canvas.width;
    maskCanvas.height = state.canvas.height;
    
    // Fill mask with white (fully visible)
    const ctx = maskCanvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    
    state.activeLayer.mask = maskCanvas;
    state.activeLayer.maskEnabled = true;
    
    updateLayersList();
    compositeAllLayers();
}

function removeLayerMask() {
    if (!state.activeLayer || !state.activeLayer.mask) return;
    
    state.activeLayer.mask = null;
    state.activeLayer.maskEnabled = false;
    
    updateLayersList();
    compositeAllLayers();
}

function toggleLayerMask() {
    if (!state.activeLayer || !state.activeLayer.mask) return;
    
    state.activeLayer.maskEnabled = !state.activeLayer.maskEnabled;
    
    updateLayersList();
    compositeAllLayers();
}

// Phase 5: Clipping Mask Functions
function toggleClippingMask() {
    if (!state.activeLayer) return;
    
    state.activeLayer.clippingMask = !state.activeLayer.clippingMask;
    
    updateLayersList();
    compositeAllLayers();
}

// Phase 5: Layer Styles Functions
function toggleLayerStyles() {
    if (!state.activeLayer) return;
    
    state.activeLayer.layerStyles.enabled = !state.activeLayer.layerStyles.enabled;
    
    updateLayersList();
    compositeAllLayers();
}

// Canvas Events
function setupCanvasEvents() {
    let pointerDown = false;
    
    drawCanvas.addEventListener('pointerdown', (e) => {
        // Don't pan when using pen/stylus/touch (even with ctrl key) - prioritize drawing
        // Only allow panning with mouse input to prevent accidental canvas dragging during drawing
        const isPenOrStylusOrTouch = e.pointerType === 'pen' || e.pointerType === 'touch';
        const isMouseInput = e.pointerType === 'mouse' || e.pointerType === '';
        
        // Define tools that should never allow panning (drawing/editing tools)
        const drawingTools = ['brush', 'eraser', 'fill', 'clone', 'dodge', 'burn', 'sponge'];
        const isDrawingTool = drawingTools.includes(state.tool);
        
        // FIXED: Never allow panning with pen/stylus/touch, and prevent panning during drawing tools
        // Only allow panning with mouse when using non-drawing tools OR via middle mouse button
        if (!isPenOrStylusOrTouch && !isDrawingTool && (e.button === 1 || (e.button === 0 && e.ctrlKey))) {
            // Middle mouse or Ctrl+Left mouse for panning (only with mouse, not pen/stylus/touch)
            state.isPanning = true;
            state.panStartX = e.clientX;
            state.panStartY = e.clientY;
            drawCanvas.style.cursor = 'grab';
            return;
        }
        
        // Additional safeguard: If using pen/stylus with drawing tool, never pan
        if (isPenOrStylusOrTouch && isDrawingTool) {
            // Ensure we're not in panning mode
            state.isPanning = false;
        }
        
        if (e.button === 0) {
            pointerDown = true;
            state.isDrawing = true;
            const pos = getCanvasPos(e);
            state.lastX = pos.x;
            state.lastY = pos.y;
            
            if (state.tool === 'brush' || state.tool === 'eraser') {
                startStroke(pos.x, pos.y, e.pressure || 1);
            } else if (state.tool === 'fill') {
                floodFill(pos.x, pos.y);
                // Don't call commitDrawing() here - floodFill handles it asynchronously
            } else if (state.tool === 'eyedropper') {
                pickColor(pos.x, pos.y);
            } else if (state.tool === 'selection') {
                startSelection(pos.x, pos.y);
            } else if (state.tool === 'magic-wand') {
                magicWandSelect(pos.x, pos.y);
            } else if (state.tool === 'lasso') {
                startLassoSelection(pos.x, pos.y);
            } else if (state.tool === 'polygonal-lasso') {
                startPolygonalLassoSelection(pos.x, pos.y);
            } else if (state.tool === 'text') {
                addText(pos.x, pos.y);
            } else if (state.tool === 'pen') {
                handlePenToolMouseDown(pos.x, pos.y, e);
            } else if (state.tool === 'shapes') {
                startShape(pos.x, pos.y);
            } else if (state.tool === 'gradient') {
                startGradient(pos.x, pos.y);
            } else if (state.tool === 'move' || state.tool === 'rotate' || state.tool === 'scale' || 
                       state.tool === 'free-transform' || state.tool === 'skew' || 
                       state.tool === 'perspective' || state.tool === 'warp') {
                // Check if clicking on a transform handle
                if ((state.tool === 'free-transform' || state.tool === 'perspective') && state.transform.active) {
                    // Check if clicking near a corner handle
                    for (let i = 0; i < state.transform.corners.length; i++) {
                        const corner = state.transform.corners[i];
                        const dist = Math.sqrt(Math.pow(pos.x - corner.x, 2) + Math.pow(pos.y - corner.y, 2));
                        if (dist < 15) {
                            state.transform.selectedHandle = i;
                            return;
                        }
                    }
                } else if (state.tool === 'warp' && state.transform.active && state.transform.warpGrid) {
                    // Check if clicking near a grid point
                    for (let i = 0; i < state.transform.warpGrid.length; i++) {
                        const point = state.transform.warpGrid[i];
                        const dist = Math.sqrt(Math.pow(pos.x - point.x, 2) + Math.pow(pos.y - point.y, 2));
                        if (dist < 15) {
                            state.transform.selectedHandle = i;
                            return;
                        }
                    }
                }
                startTransform(state.tool, pos.x, pos.y);
            } else if (state.tool === 'crop') {
                startCrop(pos.x, pos.y);
            } else if (state.tool === 'clone') {
                if (e.altKey) {
                    setCloneSource(pos.x, pos.y);
                } else if (state.cloneStamp.sourceSet) {
                    applyCloneStamp(pos.x, pos.y, e.pressure || 1);
                }
            } else if (state.tool === 'dodge') {
                applyDodge(pos.x, pos.y, e.pressure || 1);
            } else if (state.tool === 'burn') {
                applyBurn(pos.x, pos.y, e.pressure || 1);
            } else if (state.tool === 'sponge') {
                applySponge(pos.x, pos.y, e.pressure || 1);
            } else if (state.tool === 'heal') {
                if (e.altKey) {
                    setHealSource(pos.x, pos.y);
                } else if (state.heal.sourceSet) {
                    applyHeal(pos.x, pos.y, e.pressure || 1);
                }
            } else if (state.tool === 'smudge') {
                startSmudge(pos.x, pos.y);
            } else if (state.tool === 'liquify') {
                applyLiquify(pos.x, pos.y, e.pressure || 1);
            }
        }
    });
    
    drawCanvas.addEventListener('pointermove', (e) => {
        const pos = getCanvasPos(e);
        updateCursorPosition(pos.x, pos.y);
        
        // NEW: Track velocity for velocity-based dynamics
        const currentTime = Date.now();
        if (state.lastTime > 0) {
            const dt = currentTime - state.lastTime;
            if (dt > 0) {
                const dx = pos.x - state.lastX;
                const dy = pos.y - state.lastY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const currentVelocity = distance / dt; // pixels per millisecond
                // Smooth velocity with exponential moving average
                state.velocity = state.velocity * 0.7 + currentVelocity * 0.3;
            }
        }
        state.lastTime = currentTime;
        
        // NEW: Track pen tilt if supported
        if (e.tiltX !== undefined && e.tiltY !== undefined) {
            state.tiltX = e.tiltX / 90; // Normalize to -1 to 1
            state.tiltY = e.tiltY / 90;
        }
        
        // NEW: Track pen twist/rotation if supported
        if (e.twist !== undefined) {
            state.twist = e.twist;
        }
        
        if (state.isPanning) {
            const dx = e.clientX - state.panStartX;
            const dy = e.clientY - state.panStartY;
            
            const wrapper = document.getElementById('canvas-wrapper');
            wrapper.scrollLeft -= dx;
            wrapper.scrollTop -= dy;
            
            state.panStartX = e.clientX;
            state.panStartY = e.clientY;
            return;
        }
        
        if (pointerDown && state.isDrawing) {
            if (state.tool === 'brush' || state.tool === 'eraser') {
                continueStroke(pos.x, pos.y, e.pressure || 1);
            } else if (state.tool === 'selection') {
                updateSelection(pos.x, pos.y);
            } else if (state.tool === 'lasso') {
                continueLassoSelection(pos.x, pos.y);
            } else if (state.tool === 'pen' && state.vectorPath.dragging) {
                handlePenToolMouseMove(pos.x, pos.y);
            } else if (state.tool === 'shapes' && state.shape.drawing) {
                updateShape(pos.x, pos.y);
            } else if (state.tool === 'gradient' && state.gradient.drawing) {
                updateGradient(pos.x, pos.y);
            } else if (state.transform.active) {
                updateTransform(pos.x, pos.y);
            } else if (state.tool === 'crop' && state.crop.active) {
                updateCrop(pos.x, pos.y);
            } else if (state.tool === 'clone' && state.cloneStamp.sourceSet) {
                applyCloneStamp(pos.x, pos.y, e.pressure || 1);
            } else if (state.tool === 'dodge') {
                applyDodge(pos.x, pos.y, e.pressure || 1);
            } else if (state.tool === 'burn') {
                applyBurn(pos.x, pos.y, e.pressure || 1);
            } else if (state.tool === 'sponge') {
                applySponge(pos.x, pos.y, e.pressure || 1);
            } else if (state.tool === 'heal' && state.heal.sourceSet) {
                applyHeal(pos.x, pos.y, e.pressure || 1);
            } else if (state.tool === 'smudge') {
                applySmudge(pos.x, pos.y, e.pressure || 1);
            } else if (state.tool === 'liquify') {
                applyLiquify(pos.x, pos.y, e.pressure || 1);
            }
        }
    });
    
    drawCanvas.addEventListener('pointerup', () => {
        if (state.isPanning) {
            state.isPanning = false;
            updateCursor();
        }
        
        if (pointerDown && state.isDrawing) {
            pointerDown = false;
            state.isDrawing = false;
            
            if (state.tool === 'lasso') {
                finishLassoSelection();
            } else {
                commitDrawing();
            }
        }
        
        // Release transform handle selection but don't finish transform
        if (state.transform.active && state.transform.selectedHandle !== null) {
            state.transform.selectedHandle = null;
            drawTransformHandles();
            return;
        }
        
        if (state.tool === 'pen' && state.vectorPath.dragging) {
            handlePenToolMouseUp();
        }
        
        if (state.shape.drawing) {
            finishShape();
        }
        
        if (state.gradient.drawing) {
            finishGradient();
        }
        
        if (state.crop.active) {
            finishCrop();
        }
    });
    
    drawCanvas.addEventListener('pointerleave', () => {
        // FIXED: Don't commit drawing on pointerleave - let strokes continue until pointerup
        // Only clear the panning state
        if (state.isPanning) {
            state.isPanning = false;
            updateCursor();
        }
        // Note: We intentionally don't commit drawing here to allow strokes to continue
        // even if pointer temporarily leaves canvas bounds
    });
    
    // Handle pointercancel - fired when stylus is lifted suddenly or pointer is cancelled
    drawCanvas.addEventListener('pointercancel', () => {
        if (state.isPanning) {
            state.isPanning = false;
            updateCursor();
        }
        
        if (pointerDown && state.isDrawing) {
            pointerDown = false;
            state.isDrawing = false;
            commitDrawing();
        }
        
        if (state.shape.drawing) {
            finishShape();
        }
        
        if (state.gradient.drawing) {
            finishGradient();
        }
        
        if (state.transform.active) {
            finishTransform();
        }
        
        if (state.crop.active) {
            finishCrop();
        }
    });
    
    // Handle double-click for polygonal lasso
    drawCanvas.addEventListener('dblclick', (e) => {
        if (state.tool === 'polygonal-lasso' && polygonalPoints.length >= 3) {
            finishPolygonalLassoSelection();
        }
    });
    
    // Zoom with mouse wheel (works with or without Ctrl key)
    drawCanvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        zoom(delta);
    });
}

// Drawing Functions
function startStroke(x, y, pressure) {
    // Ensure all layers are composited before starting new stroke
    // This prevents previous strokes from disappearing when starting a new one
    compositeAllLayers();
    
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    
    // For eraser, copy the active layer content to show erase preview
    if (state.tool === 'eraser' && state.activeLayer) {
        drawCtx.drawImage(state.activeLayer.canvas, 0, 0);
    }
    
    // Reset physics simulation for new stroke
    resetBrushPhysics(x, y);
    
    state.smoothPoints = [{x, y, pressure}];
    drawDot(x, y, pressure);
    state.lastX = x;
    state.lastY = y;
}

function continueStroke(x, y, pressure) {
    // Add point to smoothing buffer
    state.smoothPoints.push({x, y, pressure});
    
    // Apply smoothing if enabled
    if (state.brush.smoothing > 0) {
        // Improved smoothing calculation - more responsive at lower values
        const smoothLevel = Math.max(2, Math.floor(state.brush.smoothing / 10) + 2);
        
        if (state.smoothPoints.length >= 2) {
            // Apply selected smoothing algorithm
            switch (state.brush.smoothingMode) {
                case 'basic':
                    // Simple averaging - smooths jitter but responsive
                    let avgX = 0, avgY = 0, avgP = 0;
                    const count = Math.min(smoothLevel, state.smoothPoints.length);
                    for (let i = 0; i < count; i++) {
                        const pt = state.smoothPoints[state.smoothPoints.length - 1 - i];
                        avgX += pt.x;
                        avgY += pt.y;
                        avgP += pt.pressure;
                    }
                    x = avgX / count;
                    y = avgY / count;
                    pressure = avgP / count;
                    break;
                    
                case 'weighted':
                    // Weighted averaging - newer points have more influence
                    let wX = 0, wY = 0, wP = 0, totalWeight = 0;
                    const wCount = Math.min(smoothLevel, state.smoothPoints.length);
                    for (let i = 0; i < wCount; i++) {
                        const pt = state.smoothPoints[state.smoothPoints.length - 1 - i];
                        const weight = (wCount - i) * (wCount - i); // Exponential weight for newer points
                        wX += pt.x * weight;
                        wY += pt.y * weight;
                        wP += pt.pressure * weight;
                        totalWeight += weight;
                    }
                    x = wX / totalWeight;
                    y = wY / totalWeight;
                    pressure = wP / totalWeight;
                    break;
                    
                case 'stabilizer':
                    // Pull-string stabilizer - creates lag but very smooth
                    const lastPt = state.smoothPoints[state.smoothPoints.length - 2];
                    if (lastPt) {
                        const strength = Math.min(0.95, state.brush.smoothing / 100);
                        // Interpolate between last point and current point with improved formula
                        const smoothness = strength * 0.9;
                        x = lastPt.x + (x - lastPt.x) * (1 - smoothness);
                        y = lastPt.y + (y - lastPt.y) * (1 - smoothness);
                        pressure = lastPt.pressure + (pressure - lastPt.pressure) * (1 - smoothness * 0.5);
                    }
                    break;
            }
        }
    }
    
    // Apply physics simulation if enabled
    if (state.brush.physicsEnabled) {
        // Calculate time delta for physics simulation
        const currentTime = Date.now();
        const deltaTime = (currentTime - state.lastTime) / 1000; // Convert to seconds
        
        if (deltaTime > 0 && deltaTime < 0.1) { // Limit delta to prevent instability
            const physicsPos = applyBrushPhysics(x, y, deltaTime);
            x = physicsPos.x;
            y = physicsPos.y;
        }
    }
    
    drawLine(state.lastX, state.lastY, x, y, pressure);
    state.lastX = x;
    state.lastY = y;
    
    // Limit buffer size
    if (state.smoothPoints.length > 50) {
        state.smoothPoints.shift();
    }
}

function drawDot(x, y, pressure, angle = 0) {
    // Draw the main dot
    drawDotInternal(x, y, pressure, angle);
    
    // Apply symmetry if enabled
    if (state.symmetry.enabled) {
        applySymmetry(x, y, pressure, angle);
    }
    
    // Apply wrap-around if enabled
    if (state.wrapAround.enabled) {
        applyWrapAround(x, y, pressure, angle);
    }
}

function drawDotInternal(x, y, pressure, angle = 0) {
    const ctx = drawCtx;
    
    // Apply pressure curve customization
    pressure = applyPressureCurve(pressure);
    
    const size = calculateBrushSize(pressure);
    const opacity = calculateBrushOpacity(pressure);
    
    // Apply scatter
    const scatterX = (Math.random() - 0.5) * state.brush.scatterX * size / 100;
    const scatterY = (Math.random() - 0.5) * state.brush.scatterY * size / 100;
    x += scatterX;
    y += scatterY;
    
    // ENHANCED: Draw bristles if enabled
    if (state.brush.bristleCount > 1) {
        drawBristles(ctx, x, y, size, opacity, pressure, angle);
        return;
    }
    
    ctx.save();
    
    if (state.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
    } else {
        ctx.globalCompositeOperation = 'source-over';
    }
    
    // Apply flow (build-up)
    const flow = state.brush.flow / 100;
    ctx.globalAlpha = opacity * flow;
    
    // ENHANCED: Color mixing and dynamics
    let drawColor = state.color;
    
    // Color mixing from canvas (like Corel Painter's color pickup)
    if (state.brush.colorMixing > 0 && state.tool === 'brush' && state.activeLayer) {
        drawColor = mixColorFromCanvas(x, y, size, drawColor, state.brush.colorMixing / 100);
    }
    
    // Wet Palette Blending
    if (state.wetPalette.enabled && state.tool === 'brush') {
        drawColor = applyWetPaletteBlending(x, y, size, pressure);
    }
    
    // ENHANCED: Apply color dynamics (hue/saturation/brightness jitter)
    if (state.brush.hueJitter > 0 || state.brush.saturationJitter > 0 || state.brush.brightnessJitter > 0) {
        drawColor = applyColorJitter(drawColor);
    }
    
    // Calculate brush angle with jitter and pen rotation
    let brushAngle = (state.brush.angle + (Math.random() - 0.5) * state.brush.angleJitter) * Math.PI / 180;
    
    // ENHANCED: Use pen rotation if enabled
    if (state.brush.penRotationEnabled && state.twist !== undefined && state.twist !== 0) {
        const penAngle = state.twist + (Math.random() - 0.5) * state.brush.penRotationJitter;
        brushAngle = penAngle * Math.PI / 180;
    }
    
    // Use drawing angle for rotation mode
    if (state.brush.rotationMode === 'drawing-angle' && angle !== 0) {
        brushAngle = angle;
    }
    
    // Translate and rotate for angled brush
    ctx.translate(x, y);
    ctx.rotate(brushAngle);
    
    // Store original color and set wet palette color if applicable
    const originalColor = state.color;
    if (drawColor !== state.color) {
        state.color = drawColor;
    }
    
    // ENHANCED: Draw dual brush if enabled
    if (state.brush.dualBrushEnabled) {
        drawDualBrush(ctx, size);
    } else {
        // Draw brush tip based on shape
        drawBrushTip(ctx, size);
    }
    
    // Restore original color
    state.color = originalColor;
    
    // Track wet paint for bleeding
    if (state.wetPalette.enabled && state.tool === 'brush') {
        trackWetPaint(x, y, size, drawColor);
    }
    
    // ENHANCED: Apply wet mixing and bleeding
    if (state.brush.wetMixing > 0 || state.brush.bleedDistance > 0) {
        applyWetMixingEffect(x, y, size, drawColor, pressure);
    }
    
    ctx.restore();
}

// Apply symmetry transformations
function applySymmetry(x, y, pressure, angle) {
    const centerX = state.symmetry.centerX;
    const centerY = state.symmetry.centerY;
    
    if (state.symmetry.mode === 'horizontal') {
        // Mirror horizontally
        const mirrorX = centerX - (x - centerX);
        drawDotInternal(mirrorX, y, pressure, angle);
    } else if (state.symmetry.mode === 'vertical') {
        // Mirror vertically
        const mirrorY = centerY - (y - centerY);
        drawDotInternal(x, mirrorY, pressure, angle);
    } else if (state.symmetry.mode === 'both') {
        // Mirror both horizontally and vertically (quad symmetry)
        const mirrorX = centerX - (x - centerX);
        const mirrorY = centerY - (y - centerY);
        drawDotInternal(mirrorX, y, pressure, angle);
        drawDotInternal(x, mirrorY, pressure, angle);
        drawDotInternal(mirrorX, mirrorY, pressure, angle);
    } else if (state.symmetry.mode === 'radial') {
        // Radial symmetry
        const segments = state.symmetry.segments;
        const angleStep = (Math.PI * 2) / segments;
        const dx = x - centerX;
        const dy = y - centerY;
        const radius = Math.sqrt(dx * dx + dy * dy);
        const baseAngle = Math.atan2(dy, dx);
        
        for (let i = 1; i < segments; i++) {
            const newAngle = baseAngle + angleStep * i;
            const newX = centerX + Math.cos(newAngle) * radius;
            const newY = centerY + Math.sin(newAngle) * radius;
            drawDotInternal(newX, newY, pressure, angle);
        }
    } else if (state.symmetry.mode === 'kaleidoscope') {
        // Phase 11: Kaleidoscope mode - radial symmetry with mirroring
        const segments = state.symmetry.segments;
        const angleStep = (Math.PI * 2) / segments;
        const dx = x - centerX;
        const dy = y - centerY;
        const radius = Math.sqrt(dx * dx + dy * dy);
        const baseAngle = Math.atan2(dy, dx);
        
        for (let i = 0; i < segments; i++) {
            const newAngle = baseAngle + angleStep * i;
            const newX = centerX + Math.cos(newAngle) * radius;
            const newY = centerY + Math.sin(newAngle) * radius;
            
            // Draw original
            if (i > 0) drawDotInternal(newX, newY, pressure, angle);
            
            // Draw mirrored version for kaleidoscope effect
            const mirrorAngle = baseAngle - angleStep * i;
            const mirrorX = centerX + Math.cos(mirrorAngle) * radius;
            const mirrorY = centerY + Math.sin(mirrorAngle) * radius;
            drawDotInternal(mirrorX, mirrorY, pressure, angle);
        }
    } else if (state.symmetry.mode === 'tile') {
        // Phase 11: Tile mode - repeat in a grid pattern for seamless textures
        const tileWidth = state.canvas.width;
        const tileHeight = state.canvas.height;
        
        // Draw in adjacent tiles
        const offsets = [
            [-tileWidth, -tileHeight], [0, -tileHeight], [tileWidth, -tileHeight],
            [-tileWidth, 0],                              [tileWidth, 0],
            [-tileWidth, tileHeight],  [0, tileHeight],  [tileWidth, tileHeight]
        ];
        
        offsets.forEach(([dx, dy]) => {
            const tileX = x + dx;
            const tileY = y + dy;
            // Only draw if the tile position would be visible on canvas
            if (tileX >= 0 && tileX < tileWidth && tileY >= 0 && tileY < tileHeight) {
                drawDotInternal(tileX, tileY, pressure, angle);
            }
        });
    }
}

// Apply wrap-around for seamless patterns
function applyWrapAround(x, y, pressure, angle) {
    const width = state.canvas.width;
    const height = state.canvas.height;
    const size = calculateBrushSize(pressure);
    const margin = size / 2;
    
    // Draw wrapped copies at edges
    if (state.wrapAround.horizontal) {
        if (x < margin) {
            drawDotInternal(x + width, y, pressure, angle);
        } else if (x > width - margin) {
            drawDotInternal(x - width, y, pressure, angle);
        }
    }
    
    if (state.wrapAround.vertical) {
        if (y < margin) {
            drawDotInternal(x, y + height, pressure, angle);
        } else if (y > height - margin) {
            drawDotInternal(x, y - height, pressure, angle);
        }
    }
    
    // Draw corners if both horizontal and vertical wrap-around
    if (state.wrapAround.horizontal && state.wrapAround.vertical) {
        if (x < margin && y < margin) {
            drawDotInternal(x + width, y + height, pressure, angle);
        } else if (x > width - margin && y < margin) {
            drawDotInternal(x - width, y + height, pressure, angle);
        } else if (x < margin && y > height - margin) {
            drawDotInternal(x + width, y - height, pressure, angle);
        } else if (x > width - margin && y > height - margin) {
            drawDotInternal(x - width, y - height, pressure, angle);
        }
    }
}

// Texture cache to avoid regenerating textures on every brush dab
const textureCache = {
    pencil: new Map(),
    oil: new Map(),
    watercolor: new Map(),
    ink: new Map(),
    marker: new Map()
};

// Cache size limit per texture type (max number of sizes to cache)
const MAX_CACHE_SIZE = 50;

// Helper function to manage cache size
function manageCacheSize(cache) {
    if (cache.size > MAX_CACHE_SIZE) {
        // Remove oldest entry (first key)
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
    }
}

// Texture generation for realistic brush effects
function generatePencilTexture(size) {
    // Check cache first
    const cacheKey = Math.ceil(size);
    if (textureCache.pencil.has(cacheKey)) {
        return textureCache.pencil.get(cacheKey);
    }
    
    // Generate new texture
    size = cacheKey; // Use rounded size for consistency
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Create grainy pencil texture - dry paper shows more tooth/texture
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    
    // Paper wetness affects pencil texture - dry paper has more visible tooth
    const paperWetness = state.rebellePaper.wetness / 100;
    const paperTooth = 1 + (1 - paperWetness) * 0.5; // Dry paper = more texture variation
    
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const distFromCenter = Math.sqrt(Math.pow(x - size/2, 2) + Math.pow(y - size/2, 2));
            const normalizedDist = distFromCenter / (size / 2);
            
            // Pencil grain with radial falloff - more variation on dry paper
            const grain = (Math.random() * 0.6 + 0.4) * paperTooth;
            const alpha = normalizedDist < 1 ? (1 - normalizedDist) * grain * 255 : 0;
            
            data[idx] = 255;
            data[idx + 1] = 255;
            data[idx + 2] = 255;
            data[idx + 3] = alpha;
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Cache the texture
    textureCache.pencil.set(cacheKey, canvas);
    manageCacheSize(textureCache.pencil);
    
    return canvas;
}

function generateOilTexture(size) {
    // Check cache first
    const cacheKey = Math.ceil(size);
    if (textureCache.oil.has(cacheKey)) {
        return textureCache.oil.get(cacheKey);
    }
    
    // Generate new texture
    size = cacheKey; // Use rounded size for consistency
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Create realistic Winsor Newton/Grumbacher Max Oil texture
    // These oils are known for buttery consistency, visible impasto, and rich pigment loading
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    
    // Paper wetness - oil paint performs best on dry surfaces
    const paperWetness = state.rebellePaper.wetness / 100;
    const textureClarity = 1 - (paperWetness * 0.3); // Wet paper reduces texture clarity
    
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const distFromCenter = Math.sqrt(Math.pow(x - size/2, 2) + Math.pow(y - size/2, 2));
            const normalizedDist = distFromCenter / (size / 2);
            
            // Winsor Newton oils have a buttery, thick consistency with visible impasto ridges
            // Add canvas weave texture (fine linen weave pattern)
            const weaveX = Math.sin(x * 0.8) * Math.cos(y * 0.3);
            const weaveY = Math.cos(x * 0.3) * Math.sin(y * 0.8);
            const canvasWeave = (weaveX + weaveY) * 0.12 * textureClarity + 0.88;
            
            // Add paint ridge texture (thick impasto effect)
            const ridgeNoise = Math.sin(x * 0.4 + y * 0.3) * Math.cos(x * 0.3 - y * 0.4);
            const impastoRidge = ridgeNoise * 0.18 * textureClarity + 0.82;
            
            // Buttery flow characteristic - slight directional streaking
            const flowStreak = Math.sin((x + y) * 0.2) * 0.08 + 0.92;
            
            // Combine textures for realistic oil paint appearance
            const combinedTexture = canvasWeave * impastoRidge * flowStreak;
            
            // Soft edge falloff with buttery consistency
            const edgeFalloff = normalizedDist < 1 ? (1 - Math.pow(normalizedDist, 0.7)) : 0;
            const alpha = edgeFalloff * combinedTexture * 255;
            
            data[idx] = 255;
            data[idx + 1] = 255;
            data[idx + 2] = 255;
            data[idx + 3] = Math.max(0, Math.min(255, alpha));
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Cache the texture
    textureCache.oil.set(cacheKey, canvas);
    manageCacheSize(textureCache.oil);
    
    return canvas;
}

function generateInkTexture(size) {
    // Check cache first
    const cacheKey = Math.ceil(size);
    if (textureCache.ink.has(cacheKey)) {
        return textureCache.ink.get(cacheKey);
    }
    
    // Generate new texture
    size = cacheKey; // Use rounded size for consistency
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Create crisp ink texture with sharp edges
    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.85, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // Cache the texture
    textureCache.ink.set(cacheKey, canvas);
    manageCacheSize(textureCache.ink);
    
    return canvas;
}

function generateWatercolorTexture(size) {
    // Paper wetness affects watercolor texture - don't cache wet variations
    const paperWetness = state.rebellePaper.wetness / 100; // 0-1
    const shouldCache = paperWetness < 0.1; // Only cache dry paper textures
    
    // Check cache only if paper is dry
    const cacheKey = Math.ceil(size);
    if (shouldCache && textureCache.watercolor.has(cacheKey)) {
        return textureCache.watercolor.get(cacheKey);
    }
    
    // Generate new texture
    size = cacheKey; // Use rounded size for consistency
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Create wet, blending watercolor texture
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const distFromCenter = Math.sqrt(Math.pow(x - size/2, 2) + Math.pow(y - size/2, 2));
            const normalizedDist = distFromCenter / (size / 2);
            
            // Watercolor bleeding effect with soft irregular edges
            const flowNoise = (Math.sin(x * 0.3 + y * 0.2) + Math.cos(x * 0.2 - y * 0.3)) * 0.1 + 0.9;
            const edgeBleed = Math.random() * 0.3 + 0.7;
            
            // Wet paper increases bleeding radius and softness
            const bleedRadius = 1.2 + (paperWetness * 0.5); // 1.2 to 1.7 based on wetness
            const bleedIntensity = 200 + (paperWetness * 80); // More intense bleeding when wet
            
            // Dry paper shows more texture, wet paper is smoother
            const textureStrength = 1 - (paperWetness * 0.4);
            
            const alpha = normalizedDist < bleedRadius ? 
                Math.max(0, (bleedRadius - normalizedDist) * flowNoise * edgeBleed * bleedIntensity * textureStrength) : 0;
            
            data[idx] = 255;
            data[idx + 1] = 255;
            data[idx + 2] = 255;
            data[idx + 3] = alpha;
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Cache only if paper is dry
    if (shouldCache) {
        textureCache.watercolor.set(cacheKey, canvas);
        manageCacheSize(textureCache.watercolor);
    }
    
    return canvas;
}

function generateMarkerTexture(size) {
    // Check cache first
    const cacheKey = Math.ceil(size);
    if (textureCache.marker.has(cacheKey)) {
        return textureCache.marker.get(cacheKey);
    }
    
    // Generate new texture
    size = cacheKey; // Use rounded size for consistency
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Create Copic-style marker texture - alcohol-based with streaky, translucent effect
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const distFromCenter = Math.sqrt(Math.pow(x - size/2, 2) + Math.pow(y - size/2, 2));
            const normalizedDist = distFromCenter / (size / 2);
            
            // Alcohol-based markers have characteristic streaking
            const streakPattern = Math.sin(x * 0.4) * 0.15 + 0.85;
            
            // Slight bleed at edges (less than watercolor)
            const edgeBleed = normalizedDist < 1.05 ? 0.95 : 0.7;
            
            // Translucent, layered appearance
            const baseAlpha = normalizedDist < 1 ? (1 - Math.pow(normalizedDist, 0.65)) : 0;
            const alpha = baseAlpha * streakPattern * edgeBleed * 255;
            
            data[idx] = 255;
            data[idx + 1] = 255;
            data[idx + 2] = 255;
            data[idx + 3] = Math.max(0, Math.min(255, alpha));
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Cache the texture
    textureCache.marker.set(cacheKey, canvas);
    manageCacheSize(textureCache.marker);
    
    return canvas;
}

// ============================================================================
// CATEGORY 3: Natural Media Simulation Functions
// ============================================================================

// Paper texture application with absorption model
function applyPaperTexture(ctx, x, y, size, pressure) {
    if (!state.brush.paperLibraryEnabled) return;
    
    const paperAbsorption = state.brush.paperAbsorptionRate / 100;
    const wetPooling = state.brush.wetSpotPooling / 100;
    
    // Paper absorption affects opacity and spread
    const absorptionFactor = 1 - (paperAbsorption * pressure * 0.3);
    ctx.globalAlpha *= absorptionFactor;
    
    // Wet spot pooling creates darker edges
    if (wetPooling > 0.2 && pressure > 0.7) {
        const poolRadius = size * 0.1;
        const gradient = ctx.createRadialGradient(0, 0, size/2 - poolRadius, 0, 0, size/2);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(0.9, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, `rgba(0,0,0,${wetPooling * 0.3})`);
        
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, size/2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Canvas weave simulation
function applyCanvasWeave(ctx, size) {
    if (state.brush.canvasWeavePattern === 'standard') return;
    
    const threadCount = state.brush.canvasThreadCount;
    const weaveIntensity = 0.15;
    
    // Create weave pattern based on thread count
    const weaveSize = Math.max(2, Math.floor(size / threadCount));
    const pattern = document.createElement('canvas');
    pattern.width = weaveSize * 2;
    pattern.height = weaveSize * 2;
    const pCtx = pattern.getContext('2d');
    
    // Draw weave pattern
    pCtx.fillStyle = 'rgba(255,255,255,1)';
    pCtx.fillRect(0, 0, weaveSize, weaveSize);
    pCtx.fillRect(weaveSize, weaveSize, weaveSize, weaveSize);
    pCtx.fillStyle = `rgba(255,255,255,${1 - weaveIntensity})`;
    pCtx.fillRect(weaveSize, 0, weaveSize, weaveSize);
    pCtx.fillRect(0, weaveSize, weaveSize, weaveSize);
    
    // Apply weave pattern
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha *= 0.8;
    const patternFill = ctx.createPattern(pattern, 'repeat');
    ctx.fillStyle = patternFill;
    ctx.fillRect(-size/2, -size/2, size, size);
}

// Helper function to convert color to RGBA with alpha
function colorToRGBA(color, alpha) {
    // If color is already rgba format, parse and replace alpha
    if (color.startsWith('rgba')) {
        // Extract RGB values and replace alpha
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
        if (match) {
            return `rgba(${match[1]},${match[2]},${match[3]},${alpha})`;
        }
        return color; // Return original if parsing fails
    }
    
    if (color.startsWith('rgb')) {
        // Convert rgb to rgba
        return color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
    }
    
    // Convert hex to rgba
    const rgb = hexToRgb(color);
    if (!rgb) return `rgba(0,0,0,${alpha})`;
    return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

// Pigment-based color mixing simulation
function applyPigmentMixing(baseColor, canvasColor, mixAmount) {
    if (state.brush.pigmentMixing === 'rgb') {
        // Use standard RGB mixing
        return baseColor;
    }
    
    // For 'authentic' or 'advanced' modes, use pigment-based mixing
    // Convert to pigment-based RYB color space for authentic mixing
    const base = hexToRgb(baseColor);
    const canvas = hexToRgb(canvasColor);
    
    if (!base || !canvas) return baseColor;
    
    // Simplified pigment mixing (authentic pigment behavior)
    const mixed = {
        r: Math.round(base.r * (1 - mixAmount) + canvas.r * mixAmount),
        g: Math.round(base.g * (1 - mixAmount) + canvas.g * mixAmount),
        b: Math.round(base.b * (1 - mixAmount) + canvas.b * mixAmount)
    };
    
    return rgbToHex(mixed.r, mixed.g, mixed.b);
}

// Paint viscosity simulation
function applyPaintViscosity(ctx, size, pressure) {
    const viscosity = state.brush.paintViscosity / 100;
    const dripEffect = state.brush.paintDripEffect / 100;
    
    // High viscosity = thicker paint with more texture
    if (viscosity > 0.6 && state.brush.paintBody === 'heavy') {
        // Add impasto-like texture
        const thickness = viscosity * pressure;
        ctx.shadowBlur = thickness * 2;
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
    }
    
    // Drip effect for fluid paints
    if (dripEffect > 0.3 && state.brush.paintBody === 'fluid') {
        // Simulate paint dripping (simplified)
        const dripLength = size * dripEffect * 0.5;
        ctx.globalAlpha *= 0.7;
        ctx.fillRect(-size/4, size/2, size/2, dripLength);
    }
}

// Ink flow simulation
function applyInkFlow(ctx, x, y, size, pressure) {
    if (!state.brush.inkFlowSimulation) return;
    
    const pooling = state.brush.inkPooling / 100;
    const feathering = state.brush.inkFeathering / 100;
    const saturation = state.brush.inkSaturation / 100;
    
    // Ink pooling creates darker concentrations
    if (pooling > 0.2 && pressure > 0.5) {
        const poolSize = size * 0.15 * pooling;
        ctx.save();
        ctx.translate(x, y);
        ctx.globalAlpha *= 0.3;
        ctx.fillStyle = state.color;
        ctx.beginPath();
        ctx.arc(0, 0, poolSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    
    // Feathering creates irregular edges
    if (feathering > 0.2) {
        ctx.globalAlpha *= (1 - feathering * 0.3);
    }
}

// Calligraphy pen angle simulation
function applyCalligraphyAngle(ctx, size, angle) {
    if (state.brush.calligraphyPen === 'broad-edge') {
        const nibWidth = state.brush.calligraphyNibWidth;
        const edgeSharpness = state.brush.calligraphyEdgeSharpness / 100;
        
        // Broad edge nib creates width variation based on angle
        const angleRad = angle || 0;
        const widthVariation = Math.abs(Math.sin(angleRad)) * nibWidth;
        const newSize = size * (0.5 + widthVariation * 0.5);
        
        // Scale horizontally for broad edge effect
        ctx.scale(1 + widthVariation * 0.3, 1);
        
        return newSize;
    }
    
    return size;
}

// Airbrush professional simulation
function applyAirbrushEffect(ctx, x, y, size, pressure) {
    if (!state.brush.airbrushPro) return;
    
    const airPressure = state.brush.airbrushPressure / 100;
    const overspray = state.brush.airbrushOverspray / 100;
    
    // Create soft airbrush effect with overspray
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * (1 + overspray));
    const alpha = pressure * airPressure;
    
    gradient.addColorStop(0, state.color);
    gradient.addColorStop(0.5, colorToRGBA(state.color, alpha * 0.5));
    gradient.addColorStop(1, colorToRGBA(state.color, 0));
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size * (1 + overspray), 0, Math.PI * 2);
    ctx.fill();
}

// Palette knife texture
function applyPaletteKnifeEffect(ctx, size, angle) {
    if (!state.brush.paletteKnifeScraping) return;
    
    const thickness = state.brush.paletteKnifeThickness / 100;
    const textureCreate = state.brush.paletteKnifeTextureCreate / 100;
    
    // Palette knife creates directional strokes
    ctx.save();
    ctx.rotate(angle || 0);
    
    // Thick paint application
    if (thickness > 0.5) {
        ctx.shadowBlur = thickness * 5;
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
    }
    
    // Add scraping texture
    if (textureCreate > 0.3) {
        const scrapePattern = Math.sin(size * 0.1) * textureCreate;
        ctx.globalAlpha *= (1 - scrapePattern * 0.2);
    }
    
    ctx.restore();
}

// Sponge texture effect
function applySpongeEffect(ctx, x, y, size) {
    const spongeType = state.brush.spongeType;
    const randomTexture = state.brush.spongeRandomTexture / 100;
    
    // Create pseudo-random sponge-like texture (deterministic for consistent strokes)
    const numDots = Math.floor(size * randomTexture);
    for (let i = 0; i < numDots; i++) {
        // Use position-based pseudo-random for consistent results
        const seed = x * 12.9898 + y * 78.233 + i * 37.719;
        const rand1 = Math.abs((Math.sin(seed) * 43758.5453) % 1);
        const rand2 = Math.abs((Math.sin(seed * 1.1) * 43758.5453) % 1);
        const rand3 = Math.abs((Math.sin(seed * 1.3) * 43758.5453) % 1);
        
        const offsetX = (rand1 - 0.5) * size;
        const offsetY = (rand2 - 0.5) * size;
        const dotSize = rand3 * size * 0.1;
        
        ctx.save();
        ctx.globalAlpha *= rand1 * 0.3;
        ctx.beginPath();
        ctx.arc(x + offsetX, y + offsetY, dotSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Roller pattern effect
function applyRollerPattern(ctx, size, direction) {
    if (!state.brush.rollerEnabled) return;
    
    const pattern = state.brush.rollerPattern;
    const coverage = state.brush.rollerCoverage / 100;
    const directionRad = (state.brush.rollerDirection * Math.PI) / 180;
    
    // Create roller texture pattern
    ctx.save();
    ctx.rotate(directionRad);
    
    // Apply coverage pattern
    if (pattern === 'stipple') {
        // Stippled roller texture
        for (let i = 0; i < 20; i++) {
            const x = (Math.random() - 0.5) * size;
            const y = (Math.random() - 0.5) * size;
            ctx.globalAlpha *= coverage;
            ctx.fillRect(x, y, 2, 2);
        }
    } else {
        // Standard roller coverage
        ctx.globalAlpha *= coverage;
    }
    
    ctx.restore();
}

// Asian ink painting (Sumi-e) effects
function applyAsianInkEffect(ctx, size, pressure) {
    if (!state.brush.asianInkPainting) return;
    
    const concentration = state.brush.asianInkConcentration / 100;
    const brushLoading = state.brush.asianBrushLoading / 100;
    
    // Asian ink has characteristic gradation from dark to light
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size/2);
    const darkAlpha = concentration * pressure;
    const lightAlpha = concentration * brushLoading * 0.3;
    
    gradient.addColorStop(0, `rgba(0,0,0,${darkAlpha})`);
    gradient.addColorStop(0.6, `rgba(0,0,0,${lightAlpha})`);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, size/2, 0, Math.PI * 2);
    ctx.fill();
}

// Manga/Comic inking effects
function applyMangaInking(ctx, size) {
    if (!state.brush.mangaInking) return;
    
    const penType = state.brush.mangaPenType;
    
    // G-pen has characteristic thick-to-thin lines
    if (penType === 'g-pen') {
        ctx.globalAlpha *= 0.95; // Slightly opaque for ink
    } else if (penType === 'maru-pen') {
        // Maru pen creates fine, consistent lines
        ctx.lineWidth = Math.min(size, 2);
    }
}

// Technical pen precision
function applyTechnicalPen(ctx, size) {
    if (!state.brush.technicalPen) return;
    
    const penSize = state.brush.technicalPenSize;
    const consistency = state.brush.technicalPenConsistency / 100;
    
    // Technical pens have very consistent line width
    const consistentSize = penSize * consistency + size * (1 - consistency);
    
    // No bleeding, crisp edges
    ctx.globalAlpha = 1.0;
    
    return consistentSize;
}

// Enhanced color bleeding for natural media
function applyEnhancedColorBleeding(ctx, x, y, size, pressure) {
    const bleeding = state.brush.colorBleedingEnhanced / 100;
    const backruns = state.brush.colorBackruns / 100;
    
    if (bleeding > 0.2) {
        // Create bleeding effect at edges
        const bleedRadius = size * (1 + bleeding * 0.3);
        const gradient = ctx.createRadialGradient(x, y, size/2, x, y, bleedRadius);
        
        ctx.save();
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(0.7, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, colorToRGBA(state.color, bleeding * 0.2));
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, bleedRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    
    // Backruns (cauliflower effect in watercolor)
    // Use deterministic pseudo-random based on position for consistent results
    const pseudoRandom = Math.abs((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1);
    if (backruns > 0.3 && pseudoRandom < backruns * 0.1) {
        ctx.save();
        ctx.globalAlpha *= 0.2;
        ctx.beginPath();
        // Use deterministic pseudo-random for all random values
        const rand1 = Math.abs((Math.sin(x * 12.9898 + y * 78.233 + 1) * 43758.5453) % 1);
        const rand2 = Math.abs((Math.sin(x * 12.9898 + y * 78.233 + 2) * 43758.5453) % 1);
        const rand3 = Math.abs((Math.sin(x * 12.9898 + y * 78.233 + 3) * 43758.5453) % 1);
        const backrunSize = size * (0.5 + rand1 * 0.5);
        ctx.arc(x + (rand2 - 0.5) * size, y + (rand3 - 0.5) * size, 
                backrunSize, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

function getBrushCategory(presetName) {
    // Determine brush category from preset name
    if (!presetName) return 'basic';
    
    const name = presetName.toLowerCase();
    
    // Charcoal/Pencil category
    if (name.includes('pencil') || name.includes('graphite') || name.includes('charcoal') || 
        name.includes('sketch') || name.includes('conte') || name.includes('pastel') || 
        name.includes('crayon')) {
        return 'pencil';
    }
    
    // Marker category (Copic-style)
    if (name.includes('marker')) {
        return 'marker';
    }
    
    // Ink/Pen category (FW Acrylic India Ink style)
    if (name.includes('ink') || name.includes('pen') || 
        name.includes('calligraphy') || name.includes('technical')) {
        return 'ink';
    }
    
    // Watercolor category
    if (name.includes('watercolor') || name.includes('wash') || name.includes('wet') || 
        name.includes('splatter') || name.includes('drip')) {
        return 'watercolor';
    }
    
    // Oil paint category
    if (name.includes('oil') || name.includes('impasto') || name.includes('palette-knife')) {
        return 'oil';
    }
    
    // Acrylic (similar to oil but slightly different texture)
    if (name.includes('acrylic')) {
        return 'oil'; // Use oil texture for acrylic as well
    }
    
    // Airbrush category (use basic rendering with scatter)
    if (name.includes('airbrush')) {
        return 'basic'; // Airbrush uses basic rendering with high scatter/low opacity
    }
    
    return 'basic';
}

function drawBrushTip(ctx, size) {
    const hardness = state.brush.hardness / 100;
    // FIXED: For eraser with destination-out, use white color (alpha channel determines erase strength)
    const fillColor = state.tool === 'eraser' ? '#ffffff' : state.color;
    
    switch (state.brushTipShape) {
        case 'circle':
            // Apply realistic texture based on brush category
            const brushCategory = getBrushCategory(state.currentPresetName);
            
            if (brushCategory === 'pencil') {
                // Pencil/Graphite: grainy, textured strokes
                const texture = generatePencilTexture(Math.ceil(size));
                const originalComposite = ctx.globalCompositeOperation;
                ctx.globalCompositeOperation = state.tool === 'eraser' ? 'destination-out' : 'source-over';
                ctx.fillStyle = fillColor;
                ctx.fillRect(-size / 2, -size / 2, size, size);
                ctx.globalCompositeOperation = 'destination-in';
                ctx.drawImage(texture, -size / 2, -size / 2, size, size);
                ctx.globalCompositeOperation = originalComposite; // Restore original composite mode
            } else if (brushCategory === 'marker') {
                // Marker: Copic-style alcohol-based with streaky, translucent layering
                const texture = generateMarkerTexture(Math.ceil(size));
                const originalComposite = ctx.globalCompositeOperation;
                ctx.globalCompositeOperation = state.tool === 'eraser' ? 'destination-out' : 'source-over';
                ctx.fillStyle = fillColor;
                ctx.fillRect(-size / 2, -size / 2, size, size);
                ctx.globalCompositeOperation = 'destination-in';
                ctx.drawImage(texture, -size / 2, -size / 2, size, size);
                ctx.globalCompositeOperation = originalComposite; // Restore original composite mode
            } else if (brushCategory === 'ink') {
                // Ink/Pen: FW Acrylic India Ink style - rich, dense black with crisp edges
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size / 2);
                gradient.addColorStop(0, fillColor);
                gradient.addColorStop(Math.max(0.88, hardness), fillColor);
                gradient.addColorStop(1, fillColor + '00');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (brushCategory === 'watercolor') {
                // Watercolor: wet, bleeding edges with irregular boundaries
                const texture = generateWatercolorTexture(Math.ceil(size));
                const originalComposite = ctx.globalCompositeOperation;
                ctx.globalCompositeOperation = state.tool === 'eraser' ? 'destination-out' : 'source-over';
                ctx.fillStyle = fillColor;
                ctx.fillRect(-size / 2, -size / 2, size, size);
                ctx.globalCompositeOperation = 'destination-in';
                ctx.drawImage(texture, -size / 2, -size / 2, size, size);
                ctx.globalCompositeOperation = originalComposite; // Restore original composite mode
            } else if (brushCategory === 'oil') {
                // Oil/Acrylic: impasto texture with visible canvas weave
                const texture = generateOilTexture(Math.ceil(size));
                const originalComposite = ctx.globalCompositeOperation;
                ctx.globalCompositeOperation = state.tool === 'eraser' ? 'destination-out' : 'source-over';
                ctx.fillStyle = fillColor;
                ctx.fillRect(-size / 2, -size / 2, size, size);
                ctx.globalCompositeOperation = 'destination-in';
                ctx.drawImage(texture, -size / 2, -size / 2, size, size);
                ctx.globalCompositeOperation = originalComposite; // Restore original composite mode
            } else {
                // Default: smooth gradient for basic brushes
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size / 2);
                gradient.addColorStop(0, fillColor);
                gradient.addColorStop(hardness, fillColor);
                gradient.addColorStop(1, fillColor + '00');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
            
        case 'square':
            ctx.fillStyle = fillColor;
            ctx.globalAlpha *= hardness;
            ctx.fillRect(-size / 2, -size / 2, size, size);
            break;
            
        case 'star':
            ctx.fillStyle = fillColor;
            ctx.globalAlpha *= hardness;
            ctx.beginPath();
            const spikes = 5;
            const outerRadius = size / 2;
            const innerRadius = size / 4;
            for (let i = 0; i < spikes * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (Math.PI / spikes) * i;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.fill();
            break;
            
        case 'custom':
            // Use custom texture if available
            if (state.brushTipTexture) {
                // For eraser, apply the texture with white color mask
                if (state.tool === 'eraser') {
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.fillStyle = fillColor;
                    ctx.globalAlpha *= 0.5; // Semi-transparent for texture shape
                }
                ctx.drawImage(state.brushTipTexture, -size / 2, -size / 2, size, size);
            } else {
                // Fall back to circle
                const fallbackGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size / 2);
                fallbackGradient.addColorStop(0, fillColor);
                fallbackGradient.addColorStop(hardness, fillColor);
                fallbackGradient.addColorStop(1, fillColor + '00');
                ctx.fillStyle = fallbackGradient;
                ctx.beginPath();
                ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
    }
}

function drawLine(x1, y1, x2, y2, pressure) {
    const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const size = calculateBrushSize(pressure);
    
    // Calculate spacing based on brush size and spacing setting
    const spacing = state.brush.spacing / 100;
    const step = Math.max(0.5, size * spacing);
    
    // Draw dabs along the line with proper spacing
    for (let i = 0; i < dist; i += step) {
        const x = x1 + Math.cos(angle) * i;
        const y = y1 + Math.sin(angle) * i;
        // Pass stroke angle for potential angle dynamics
        drawDot(x, y, pressure, angle);
    }
}

// ENHANCED: Apply pressure curve customization
function applyPressureCurve(pressure) {
    // Apply pressure calibration first
    pressure = Math.min(1, pressure * state.brush.pressureCalibration);
    
    switch (state.brush.pressureCurve) {
        case 'linear':
            return pressure;
        case 'ease-in':
            return pressure * pressure;
        case 'ease-out':
            return 1 - (1 - pressure) * (1 - pressure);
        case 'ease-in-out':
            return pressure < 0.5 
                ? 2 * pressure * pressure 
                : 1 - Math.pow(-2 * pressure + 2, 2) / 2;
        case 'custom':
            // Use custom curve points for interpolation
            return interpolatePressureCurve(pressure);
        default:
            return pressure;
    }
}

// Interpolate custom pressure curve
function interpolatePressureCurve(pressure) {
    const points = state.brush.pressureCurvePoints;
    if (!points || points.length < 2) return pressure;
    
    const index = pressure * (points.length - 1);
    const i = Math.floor(index);
    const fraction = index - i;
    
    if (i >= points.length - 1) return points[points.length - 1];
    
    return points[i] * (1 - fraction) + points[i + 1] * fraction;
}

// PHYSICS: Dynamic brush physics simulation
// Implements drag, mass/weight, and spring dynamics for natural movement
function applyBrushPhysics(targetX, targetY, deltaTime) {
    if (!state.brush.physicsEnabled || deltaTime <= 0) {
        // Physics disabled, return target position directly
        state.physics.positionX = targetX;
        state.physics.positionY = targetY;
        return { x: targetX, y: targetY };
    }
    
    // Update target position
    state.physics.targetX = targetX;
    state.physics.targetY = targetY;
    
    // Calculate spring force (Hooke's Law: F = -k * displacement)
    const dx = state.physics.targetX - state.physics.positionX;
    const dy = state.physics.targetY - state.physics.positionY;
    
    // Spring tension determines how strongly the brush is pulled toward target
    // Range 0-100%, map to spring constant 0.1-10
    const springConstant = 0.1 + (state.brush.springTension / 100) * 9.9;
    
    // Spring force
    const springForceX = dx * springConstant;
    const springForceY = dy * springConstant;
    
    // Apply mass (weight) - heavier brushes accelerate slower
    // Range 1-100, map to mass 0.1-10 (inverse for intuitive control)
    const mass = 0.1 + (state.brush.mass / 100) * 9.9;
    
    // Calculate acceleration (F = ma, so a = F/m)
    const accelerationX = springForceX / mass;
    const accelerationY = springForceY / mass;
    
    // Update velocity
    state.physics.velocityX += accelerationX * deltaTime;
    state.physics.velocityY += accelerationY * deltaTime;
    
    // Apply drag (air resistance) - reduces velocity over time
    // Range 0-100%, map to drag coefficient 0-0.99
    const dragCoefficient = (state.brush.drag / 100) * 0.99;
    state.physics.velocityX *= (1 - dragCoefficient);
    state.physics.velocityY *= (1 - dragCoefficient);
    
    // Apply spring damping - prevents oscillation
    // Range 0-100%, map to damping 0-0.9
    const dampingFactor = (state.brush.springDamping / 100) * 0.9;
    state.physics.velocityX *= (1 - dampingFactor);
    state.physics.velocityY *= (1 - dampingFactor);
    
    // Update position based on velocity
    state.physics.positionX += state.physics.velocityX * deltaTime;
    state.physics.positionY += state.physics.velocityY * deltaTime;
    
    return {
        x: state.physics.positionX,
        y: state.physics.positionY
    };
}

// Reset physics state (called when starting a new stroke)
function resetBrushPhysics(x, y) {
    state.physics.positionX = x;
    state.physics.positionY = y;
    state.physics.targetX = x;
    state.physics.targetY = y;
    state.physics.velocityX = 0;
    state.physics.velocityY = 0;
}

// ENHANCED: Color mixing from canvas (Painter-style color pickup)
function mixColorFromCanvas(x, y, size, brushColor, mixAmount) {
    if (!state.activeLayer) return brushColor;
    
    const ctx = state.activeLayer.canvas.getContext('2d');
    const sampleRadius = Math.max(1, size / 4);
    
    try {
        const imageData = ctx.getImageData(
            Math.floor(x - sampleRadius), 
            Math.floor(y - sampleRadius), 
            Math.ceil(sampleRadius * 2), 
            Math.ceil(sampleRadius * 2)
        );
        
        let r = 0, g = 0, b = 0, count = 0;
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) {  // Only count non-transparent pixels
                r += data[i];
                g += data[i + 1];
                b += data[i + 2];
                count++;
            }
        }
        
        if (count > 0) {
            r = Math.floor(r / count);
            g = Math.floor(g / count);
            b = Math.floor(b / count);
            
            // Parse brush color
            const brushRGB = hexToRgb(brushColor);
            
            // Mix colors
            r = Math.floor(brushRGB.r * (1 - mixAmount) + r * mixAmount);
            g = Math.floor(brushRGB.g * (1 - mixAmount) + g * mixAmount);
            b = Math.floor(brushRGB.b * (1 - mixAmount) + b * mixAmount);
            
            return rgbToHex(r, g, b);
        }
    } catch (e) {
        // Out of bounds or other error, return original color
    }
    
    return brushColor;
}

// ENHANCED: Apply color jitter (hue/saturation/brightness variation)
function applyColorJitter(color) {
    const rgb = hexToRgb(color);
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    
    // Apply hue jitter (-180 to +180 degrees)
    if (state.brush.hueJitter > 0) {
        const hueShift = (Math.random() - 0.5) * state.brush.hueJitter;
        hsv.h = (hsv.h + hueShift + 360) % 360;
    }
    
    // Apply saturation jitter
    if (state.brush.saturationJitter > 0) {
        const satShift = (Math.random() - 0.5) * state.brush.saturationJitter / 50;
        hsv.s = Math.max(0, Math.min(1, hsv.s + satShift));
    }
    
    // Apply brightness jitter
    if (state.brush.brightnessJitter > 0) {
        const valShift = (Math.random() - 0.5) * state.brush.brightnessJitter / 50;
        hsv.v = Math.max(0, Math.min(1, hsv.v + valShift));
    }
    
    const newRgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
    return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
}

// ENHANCED: Draw bristles for natural media simulation
function drawBristles(ctx, x, y, size, opacity, pressure, angle) {
    const bristleCount = Math.floor(state.brush.bristleCount);
    const bristleLength = state.brush.bristleLength / 100;
    const stiffness = state.brush.bristleStiffness / 100;
    
    for (let i = 0; i < bristleCount; i++) {
        ctx.save();
        
        // Calculate bristle offset from center
        const offsetAngle = (i / bristleCount) * Math.PI * 2;
        const maxSpread = size * 0.3;
        const spread = maxSpread * (1 - stiffness);
        const offsetX = Math.cos(offsetAngle) * spread;
        const offsetY = Math.sin(offsetAngle) * spread;
        
        // Bristle splay based on pressure (less pressure = more splay)
        const splayFactor = 1 + (1 - pressure) * bristleLength;
        const bristleX = x + offsetX * splayFactor;
        const bristleY = y + offsetY * splayFactor;
        
        // Each bristle is slightly smaller and more transparent
        const bristleSize = size / Math.sqrt(bristleCount);
        const bristleOpacity = opacity / Math.sqrt(bristleCount);
        
        ctx.globalAlpha = bristleOpacity;
        ctx.globalCompositeOperation = state.tool === 'eraser' ? 'destination-out' : 'source-over';
        
        // Draw bristle as small circle
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, bristleSize / 2);
        const fillColor = state.tool === 'eraser' ? '#ffffff' : state.color;
        gradient.addColorStop(0, fillColor);
        gradient.addColorStop(0.7, fillColor);
        gradient.addColorStop(1, fillColor + '00');
        
        ctx.translate(bristleX, bristleY);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, bristleSize / 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// ENHANCED: Dual brush system
function drawDualBrush(ctx, size) {
    // Draw primary brush
    drawBrushTip(ctx, size);
    
    // Draw secondary brush with different properties
    const secondarySize = size * (state.brush.dualBrushSize / 100);
    const scatter = state.brush.dualBrushScatter / 100;
    
    ctx.save();
    
    // Apply scatter to secondary brush
    const scatterX = (Math.random() - 0.5) * scatter * size;
    const scatterY = (Math.random() - 0.5) * scatter * size;
    ctx.translate(scatterX, scatterY);
    
    // Apply blend mode
    switch (state.brush.dualBrushMode) {
        case 'multiply':
            ctx.globalCompositeOperation = 'multiply';
            break;
        case 'subtract':
            ctx.globalCompositeOperation = 'difference';
            break;
        case 'overlay':
            ctx.globalCompositeOperation = 'overlay';
            break;
        case 'average':
            ctx.globalAlpha *= 0.5;
            break;
    }
    
    drawBrushTip(ctx, secondarySize);
    
    ctx.restore();
}

// ENHANCED: Wet mixing effect
function applyWetMixingEffect(x, y, size, color, pressure) {
    if (!state.activeLayer || state.tool === 'eraser') return;
    
    const ctx = state.activeLayer.canvas.getContext('2d');
    const mixAmount = state.brush.wetMixing / 100;
    const bleedDist = state.brush.bleedDistance;
    
    if (mixAmount === 0 && bleedDist === 0) return;
    
    // Simple wet mixing: blend with nearby pixels
    try {
        const radius = Math.max(1, size / 2);
        const imageData = ctx.getImageData(
            Math.floor(x - radius), 
            Math.floor(y - radius), 
            Math.ceil(radius * 2), 
            Math.ceil(radius * 2)
        );
        
        // Apply simple blur for bleeding effect
        if (bleedDist > 0) {
            const blurred = applySimpleBlur(imageData, bleedDist / 10);
            ctx.putImageData(blurred, Math.floor(x - radius), Math.floor(y - radius));
        }
    } catch (e) {
        // Out of bounds, ignore
    }
}

// Simple blur for bleeding
function applySimpleBlur(imageData, strength) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const output = new Uint8ClampedArray(data);
    
    const kernel = Math.max(1, Math.floor(strength));
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, a = 0, count = 0;
            
            for (let ky = -kernel; ky <= kernel; ky++) {
                for (let kx = -kernel; kx <= kernel; kx++) {
                    const px = x + kx;
                    const py = y + ky;
                    
                    if (px >= 0 && px < width && py >= 0 && py < height) {
                        const idx = (py * width + px) * 4;
                        r += data[idx];
                        g += data[idx + 1];
                        b += data[idx + 2];
                        a += data[idx + 3];
                        count++;
                    }
                }
            }
            
            const idx = (y * width + x) * 4;
            output[idx] = r / count;
            output[idx + 1] = g / count;
            output[idx + 2] = b / count;
            output[idx + 3] = a / count;
        }
    }
    
    return new ImageData(output, width, height);
}

// Color conversion utilities
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    const s = max === 0 ? 0 : d / max;
    const v = max;
    
    let h = 0;
    if (max !== min) {
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    
    return { h: h * 360, s: s, v: v };
}

function hsvToRgb(h, s, v) {
    h = h / 60;
    const c = v * s;
    const x = c * (1 - Math.abs(h % 2 - 1));
    const m = v - c;
    
    let r = 0, g = 0, b = 0;
    if (h >= 0 && h < 1) { r = c; g = x; b = 0; }
    else if (h >= 1 && h < 2) { r = x; g = c; b = 0; }
    else if (h >= 2 && h < 3) { r = 0; g = c; b = x; }
    else if (h >= 3 && h < 4) { r = 0; g = x; b = c; }
    else if (h >= 4 && h < 5) { r = x; g = 0; b = c; }
    else if (h >= 5 && h < 6) { r = c; g = 0; b = x; }
    
    return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255)
    };
}

function calculateBrushSize(pressure) {
    let size = state.brush.size;
    
    // Apply size jitter
    if (state.brush.sizeJitter > 0) {
        const jitter = 1 + (Math.random() - 0.5) * state.brush.sizeJitter / 50;
        size *= jitter;
    }
    
    // Pressure affects size
    if (state.brush.pressureSize) {
        const minSize = state.brush.minSize / 100;
        size = size * (minSize + pressure * (1 - minSize));
    }
    
    // Velocity affects size
    if (state.brush.velocitySize > 0) {
        // Normalize velocity (typical range 0-2 pixels/ms)
        const normalizedVelocity = Math.min(1, state.velocity / 2);
        const velocityFactor = 1 + (normalizedVelocity * state.brush.velocitySize / 100);
        size *= velocityFactor;
    }
    
    // Tilt affects size
    if (state.brush.tiltSize > 0) {
        const tiltMagnitude = Math.sqrt(state.tiltX * state.tiltX + state.tiltY * state.tiltY);
        const tiltFactor = 1 + (tiltMagnitude * state.brush.tiltSize / 100);
        size *= tiltFactor;
    }
    
    // Adaptive quality: reduce size slightly for very fast strokes
    if (state.brush.adaptiveQuality && state.velocity > state.brush.qualityThreshold) {
        size *= 0.95;
    }
    
    return Math.max(1, size);
}

function calculateBrushOpacity(pressure) {
    let opacity = state.brush.opacity / 100;
    
    // Apply opacity jitter
    if (state.brush.opacityJitter > 0) {
        const jitter = 1 + (Math.random() - 0.5) * state.brush.opacityJitter / 50;
        opacity *= jitter;
    }
    
    // Pressure affects opacity
    if (state.brush.pressureOpacity) {
        const minOpacity = state.brush.minOpacity / 100;
        opacity = opacity * (minOpacity + pressure * (1 - minOpacity));
    }
    
    // Velocity affects opacity
    if (state.brush.velocityOpacity > 0) {
        // Normalize velocity (typical range 0-2 pixels/ms)
        const normalizedVelocity = Math.min(1, state.velocity / 2);
        const velocityFactor = 1 + (normalizedVelocity * state.brush.velocityOpacity / 100);
        opacity *= velocityFactor;
    }
    
    // Tilt affects opacity  
    if (state.brush.tiltOpacity > 0) {
        const tiltMagnitude = Math.sqrt(state.tiltX * state.tiltX + state.tiltY * state.tiltY);
        const tiltFactor = 1 + (tiltMagnitude * state.brush.tiltOpacity / 100);
        opacity *= tiltFactor;
    }
    
    return Math.max(0, Math.min(1, opacity));
}

function commitDrawing() {
    // Quick Mask Mode: Draw to mask canvas instead
    if (state.quickMask.active) {
        const ctx = state.quickMask.canvas.getContext('2d');
        ctx.drawImage(drawCanvas, 0, 0);
        
        // Clear draw canvas and redraw overlay
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        drawQuickMaskOverlay();
        return;
    }
    
    // FIXED: Ensure we have an active layer
    if (!state.activeLayer) {
        console.warn('commitDrawing: No active layer, creating one');
        // Generate unique layer name
        const layerName = `Layer ${state.layers.length + 1}`;
        addLayer(layerName);
        if (!state.activeLayer) {
            console.error('commitDrawing: Failed to create layer. Check that canvas is initialized and state.layers array is accessible.');
            return;
        }
    }
    
    // Don't commit selection tool drawing to layer
    if (state.tool === 'selection') {
        return;
    }
    
    const ctx = state.activeLayer.canvas.getContext('2d');
    
    // For eraser, the drawCanvas already shows the erased result (layer content with erased areas)
    // We need to copy this result back to the layer, replacing the original
    if (state.tool === 'eraser') {
        ctx.save();
        // Clear the layer first, then copy the erased result
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.drawImage(drawCanvas, 0, 0);
        ctx.restore();
    } else {
        // FIXED: Use proper composite operation to ensure brush strokes accumulate
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(drawCanvas, 0, 0);
        ctx.restore();
    }
    
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    compositeAllLayers();
    updateLayersList();
    saveState();
}

// Flood Fill (Scanline algorithm for better performance with async execution)
function floodFill(startX, startY) {
    if (!state.activeLayer) return;
    
    startX = Math.floor(startX);
    startY = Math.floor(startY);
    
    const ctx = state.activeLayer.canvas.getContext('2d');
    const width = state.canvas.width;
    const height = state.canvas.height;
    
    // Check if we're filling within a selection
    let fillBounds = null;
    if (state.selection.active) {
        fillBounds = {
            minX: Math.floor(Math.min(state.selection.startX, state.selection.endX)),
            maxX: Math.floor(Math.max(state.selection.startX, state.selection.endX)),
            minY: Math.floor(Math.min(state.selection.startY, state.selection.endY)),
            maxY: Math.floor(Math.max(state.selection.startY, state.selection.endY))
        };
        // Check if start point is within selection
        if (startX < fillBounds.minX || startX > fillBounds.maxX || 
            startY < fillBounds.minY || startY > fillBounds.maxY) {
            return; // Can't fill outside selection
        }
    }
    
    const imageData = ctx.getImageData(0, 0, width, height);
    const targetColor = getPixelColor(imageData, startX, startY);
    const fillColor = hexToRgb(state.color);
    const tolerance = state.fill.tolerance;
    
    // Don't fill if target and fill colors are the same
    if (colorsMatch(targetColor, fillColor, tolerance)) return;
    
    // Use scanline flood fill algorithm
    const stack = [[startX, startY]];
    const visited = new Set();
    
    // Calculate max pixels to process (canvas area * 2 to be safe)
    const maxPixels = width * height * 2;
    let pixelsProcessed = 0;
    
    // Process fill in chunks to prevent freezing - increased for better performance
    const CHUNK_SIZE = 5000; // Process 5000 pixels per frame for faster fills
    
    function processChunk() {
        let chunkCount = 0;
        
        while (stack.length > 0 && pixelsProcessed < maxPixels && chunkCount < CHUNK_SIZE) {
            const [x, y] = stack.pop();
            
            // Check bounds
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            
            // Check selection bounds if active
            if (fillBounds && (x < fillBounds.minX || x > fillBounds.maxX || 
                y < fillBounds.minY || y > fillBounds.maxY)) continue;
            
            const key = `${x},${y}`;
            if (visited.has(key)) continue;
            
            const currentColor = getPixelColor(imageData, x, y);
            if (!colorsMatch(currentColor, targetColor, tolerance)) continue;
            
            // Find the left and right extent of this scanline
            let left = x;
            let right = x;
            
            // Scan left
            while (left > 0 && (!fillBounds || left > fillBounds.minX)) {
                const leftColor = getPixelColor(imageData, left - 1, y);
                if (!colorsMatch(leftColor, targetColor, tolerance)) break;
                left--;
            }
            
            // Scan right
            while (right < width - 1 && (!fillBounds || right < fillBounds.maxX)) {
                const rightColor = getPixelColor(imageData, right + 1, y);
                if (!colorsMatch(rightColor, targetColor, tolerance)) break;
                right++;
            }
            
            // Fill the scanline
            for (let i = left; i <= right; i++) {
                const lineKey = `${i},${y}`;
                if (!visited.has(lineKey)) {
                    visited.add(lineKey);
                    setPixelColor(imageData, i, y, fillColor);
                    pixelsProcessed++;
                    chunkCount++;
                }
            }
            
            // Add lines above and below to stack
            for (let i = left; i <= right; i++) {
                // Check line above
                if (y > 0 && (!fillBounds || y - 1 >= fillBounds.minY)) {
                    const aboveKey = `${i},${y - 1}`;
                    if (!visited.has(aboveKey)) {
                        const aboveColor = getPixelColor(imageData, i, y - 1);
                        if (colorsMatch(aboveColor, targetColor, tolerance)) {
                            stack.push([i, y - 1]);
                        }
                    }
                }
                // Check line below
                if (y < height - 1 && (!fillBounds || y + 1 <= fillBounds.maxY)) {
                    const belowKey = `${i},${y + 1}`;
                    if (!visited.has(belowKey)) {
                        const belowColor = getPixelColor(imageData, i, y + 1);
                        if (colorsMatch(belowColor, targetColor, tolerance)) {
                            stack.push([i, y + 1]);
                        }
                    }
                }
            }
        }
        
        // Continue processing if there's more work
        if (stack.length > 0 && pixelsProcessed < maxPixels) {
            requestAnimationFrame(processChunk);
        } else {
            // Fill complete - update canvas
            ctx.putImageData(imageData, 0, 0);
            compositeAllLayers();
            updateLayersList();
            saveState(); // Save state for undo/redo
        }
    }
    
    // Start processing
    processChunk();
}

function getPixelColor(imageData, x, y) {
    const index = (y * imageData.width + x) * 4;
    return [
        imageData.data[index],
        imageData.data[index + 1],
        imageData.data[index + 2],
        imageData.data[index + 3]
    ];
}

function setPixelColor(imageData, x, y, color) {
    const index = (y * imageData.width + x) * 4;
    imageData.data[index] = color[0];
    imageData.data[index + 1] = color[1];
    imageData.data[index + 2] = color[2];
    imageData.data[index + 3] = 255;
}

function colorsMatch(c1, c2, tolerance = 0) {
    if (tolerance === 0) {
        return c1[0] === c2[0] && c1[1] === c2[1] && c1[2] === c2[2] && c1[3] === c2[3];
    }
    // Calculate color difference using Euclidean distance
    const rDiff = c1[0] - c2[0];
    const gDiff = c1[1] - c2[1];
    const bDiff = c1[2] - c2[2];
    const aDiff = c1[3] - c2[3];
    const distance = Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff + aDiff * aDiff);
    return distance <= tolerance;
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
        255
    ] : [0, 0, 0, 255];
}

// Eyedropper
async function pickColor(x, y) {
    // Try to use EyeDropper API for screen-wide color picking (Chrome 95+)
    if ('EyeDropper' in window && state.eyedropper && state.eyedropper.screenWide) {
        try {
            const eyeDropper = new EyeDropper();
            const result = await eyeDropper.open();
            if (result && result.sRGBHex) {
                state.color = result.sRGBHex;
                document.getElementById('color-picker').value = result.sRGBHex;
                updateColorHarmony();
                console.log('Picked color from screen:', result.sRGBHex);
            }
            return;
        } catch (err) {
            // User cancelled or API not available, fall through to canvas picking
            console.log('Screen-wide eyedropper not available or cancelled:', err.message);
        }
    }
    
    // Fallback: pick from canvas only
    if (!state.activeLayer) return;
    const ctx = state.activeLayer.canvas.getContext('2d');
    const imageData = ctx.getImageData(x, y, 1, 1);
    const data = imageData.data;
    const hex = '#' + ((1 << 24) + (data[0] << 16) + (data[1] << 8) + data[2]).toString(16).slice(1);
    state.color = hex;
    document.getElementById('color-picker').value = hex;
    updateColorHarmony();
}

// Selection Tool
function startSelection(x, y) {
    state.selection.active = true;
    state.selection.startX = x;
    state.selection.startY = y;
    state.selection.endX = x;
    state.selection.endY = y;
    state.selection.marchingAntsOffset = 0;
    state.selection.isMaskBased = false; // Regular selection is rectangular
    state.selection.mask = null; // Clear any mask
    
    // Cancel any existing animation
    if (state.selection.animationFrame) {
        cancelAnimationFrame(state.selection.animationFrame);
    }
    
    // Start marching ants animation
    state.selection.animationFrame = requestAnimationFrame(animateMarchingAnts);
    drawSelection();
}

function updateSelection(x, y) {
    state.selection.endX = x;
    state.selection.endY = y;
    drawSelection();
}

function drawSelection() {
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    
    if (state.selection.active) {
        const x = Math.min(state.selection.startX, state.selection.endX);
        const y = Math.min(state.selection.startY, state.selection.endY);
        const width = Math.abs(state.selection.endX - state.selection.startX);
        const height = Math.abs(state.selection.endY - state.selection.startY);
        
        if (state.selection.isMaskBased && state.selection.mask) {
            // Draw mask-based selection with marching ants around actual shape
            const mask = state.selection.mask;
            const canvasWidth = state.canvas.width;
            
            // Fill selected pixels with semi-transparent blue
            drawCtx.fillStyle = 'rgba(0, 153, 255, 0.15)';
            for (let py = y; py < y + height; py++) {
                for (let px = x; px < x + width; px++) {
                    if (mask[py * canvasWidth + px]) {
                        drawCtx.fillRect(px, py, 1, 1);
                    }
                }
            }
            
            // Draw marching ants around the edge of selected pixels
            drawCtx.strokeStyle = '#000000';
            drawCtx.lineWidth = 1;
            drawCtx.setLineDash([4, 4]);
            drawCtx.lineDashOffset = -state.selection.marchingAntsOffset;
            
            drawCtx.beginPath();
            for (let py = y; py < y + height; py++) {
                for (let px = x; px < x + width; px++) {
                    if (mask[py * canvasWidth + px]) {
                        // Check if this pixel is on the edge (has unselected neighbor)
                        const isEdge = 
                            (px === 0 || !mask[py * canvasWidth + (px - 1)]) ||
                            (px === canvasWidth - 1 || !mask[py * canvasWidth + (px + 1)]) ||
                            (py === 0 || !mask[(py - 1) * canvasWidth + px]) ||
                            (py === state.canvas.height - 1 || !mask[(py + 1) * canvasWidth + px]);
                        
                        if (isEdge) {
                            drawCtx.fillRect(px, py, 1, 1);
                        }
                    }
                }
            }
            drawCtx.stroke();
            
            // Draw white outline for contrast
            drawCtx.strokeStyle = '#ffffff';
            drawCtx.lineDashOffset = -state.selection.marchingAntsOffset + 4;
            drawCtx.beginPath();
            for (let py = y; py < y + height; py++) {
                for (let px = x; px < x + width; px++) {
                    if (mask[py * canvasWidth + px]) {
                        const isEdge = 
                            (px === 0 || !mask[py * canvasWidth + (px - 1)]) ||
                            (px === canvasWidth - 1 || !mask[py * canvasWidth + (px + 1)]) ||
                            (py === 0 || !mask[(py - 1) * canvasWidth + px]) ||
                            (py === state.canvas.height - 1 || !mask[(py + 1) * canvasWidth + px]);
                        
                        if (isEdge) {
                            drawCtx.fillRect(px, py, 1, 1);
                        }
                    }
                }
            }
            drawCtx.stroke();
            
            drawCtx.setLineDash([]);
        } else {
            // Draw rectangular selection
            drawCtx.fillStyle = 'rgba(0, 153, 255, 0.15)';
            drawCtx.fillRect(x, y, width, height);
            
            // Draw marching ants border
            drawCtx.strokeStyle = '#000000';
            drawCtx.lineWidth = 1;
            drawCtx.setLineDash([6, 6]);
            drawCtx.lineDashOffset = -state.selection.marchingAntsOffset;
            drawCtx.strokeRect(x, y, width, height);
            
            // Draw white dashed line offset for better visibility
            drawCtx.strokeStyle = '#ffffff';
            drawCtx.lineDashOffset = -state.selection.marchingAntsOffset + 6;
            drawCtx.strokeRect(x, y, width, height);
            
            drawCtx.setLineDash([]);
        }
    }
}

// Animate marching ants
function animateMarchingAnts() {
    if (state.selection.active) {
        state.selection.marchingAntsOffset += 0.5;
        if (state.selection.marchingAntsOffset >= 12) {
            state.selection.marchingAntsOffset = 0;
        }
        drawSelection();
        state.selection.animationFrame = requestAnimationFrame(animateMarchingAnts);
    }
}

function clearSelection() {
    state.selection.active = false;
    
    // Cancel marching ants animation
    if (state.selection.animationFrame) {
        cancelAnimationFrame(state.selection.animationFrame);
        state.selection.animationFrame = null;
    }
    
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
}

// Magic Wand Selection Tool
function magicWandSelect(x, y) {
    if (!state.activeLayer) return;
    
    // Clear any existing selection first
    if (state.selection.active) {
        clearSelection();
    }
    
    // Get image data - sample from all layers if enabled, otherwise just active layer
    let canvas, ctx, imageData, data;
    if (state.magicWand.sampleAllLayers) {
        // Sample from the composite (main canvas)
        canvas = mainCanvas;
        ctx = mainCtx;
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        data = imageData.data;
    } else {
        // Sample from active layer only
        canvas = state.activeLayer.canvas;
        ctx = canvas.getContext('2d');
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        data = imageData.data;
    }
    
    // Get the color at clicked position
    const clickX = Math.floor(x);
    const clickY = Math.floor(y);
    if (clickX < 0 || clickX >= canvas.width || clickY < 0 || clickY >= canvas.height) return;
    
    const idx = (clickY * canvas.width + clickX) * 4;
    const targetR = data[idx];
    const targetG = data[idx + 1];
    const targetB = data[idx + 2];
    const targetA = data[idx + 3];
    
    const tolerance = state.magicWand.tolerance;
    const visited = new Uint8Array(canvas.width * canvas.height);
    const selectionMask = new Uint8Array(canvas.width * canvas.height);
    
    // Limit processing to prevent freezing
    const MAX_PIXELS = 1000000; // Maximum pixels to process
    let processedCount = 0;
    
    // Smart color matching using weighted distance
    function isColorMatch(r, g, b, a) {
        // Handle fully transparent pixels specially
        if (targetA === 0 && a === 0) return true;
        if (targetA === 0 || a === 0) return false;
        
        // Use weighted Euclidean distance for better color matching
        const dr = r - targetR;
        const dg = g - targetG;
        const db = b - targetB;
        const da = a - targetA;
        
        // Weight green slightly higher (human eye sensitivity)
        const distance = Math.sqrt(dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11 + da * da * 0.1);
        return distance <= tolerance;
    }
    
    function floodFill(startX, startY) {
        const queue = [[startX, startY]];
        
        while (queue.length > 0 && processedCount < MAX_PIXELS) {
            const [px, py] = queue.shift();
            processedCount++;
            
            if (px < 0 || px >= canvas.width || py < 0 || py >= canvas.height) continue;
            
            const pixelIdx = py * canvas.width + px;
            if (visited[pixelIdx]) continue;
            visited[pixelIdx] = 1;
            
            const dataIdx = pixelIdx * 4;
            const r = data[dataIdx];
            const g = data[dataIdx + 1];
            const b = data[dataIdx + 2];
            const a = data[dataIdx + 3];
            
            if (!isColorMatch(r, g, b, a)) continue;
            
            selectionMask[pixelIdx] = 1;
            
            // Add adjacent pixels to queue
            queue.push([px + 1, py]);
            queue.push([px - 1, py]);
            queue.push([px, py + 1]);
            queue.push([px, py - 1]);
        }
    }
    
    if (state.magicWand.contiguous) {
        floodFill(clickX, clickY);
    } else {
        // Select all matching pixels across entire canvas
        for (let py = 0; py < canvas.height && processedCount < MAX_PIXELS; py++) {
            for (let px = 0; px < canvas.width && processedCount < MAX_PIXELS; px++) {
                processedCount++;
                
                const pixelIdx = py * canvas.width + px;
                const dataIdx = pixelIdx * 4;
                const r = data[dataIdx];
                const g = data[dataIdx + 1];
                const b = data[dataIdx + 2];
                const a = data[dataIdx + 3];
                
                if (isColorMatch(r, g, b, a)) {
                    selectionMask[pixelIdx] = 1;
                }
            }
        }
    }
    
    // Check if any pixels were selected
    let pixelCount = 0;
    for (let i = 0; i < selectionMask.length; i++) {
        if (selectionMask[i]) pixelCount++;
    }
    
    if (pixelCount === 0) return;
    
    // Find bounding box
    let minX = canvas.width, minY = canvas.height;
    let maxX = 0, maxY = 0;
    
    for (let py = 0; py < canvas.height; py++) {
        for (let px = 0; px < canvas.width; px++) {
            if (selectionMask[py * canvas.width + px]) {
                minX = Math.min(minX, px);
                minY = Math.min(minY, py);
                maxX = Math.max(maxX, px);
                maxY = Math.max(maxY, py);
            }
        }
    }
    
    // Set selection
    state.selection.active = true;
    state.selection.startX = minX;
    state.selection.startY = minY;
    state.selection.endX = maxX + 1;
    state.selection.endY = maxY + 1;
    state.selection.marchingAntsOffset = 0;
    state.selection.mask = selectionMask; // Store the actual mask
    state.selection.isMaskBased = true; // Flag to indicate this is a mask-based selection
    
    // Cancel any existing animation
    if (state.selection.animationFrame) {
        cancelAnimationFrame(state.selection.animationFrame);
    }
    
    // Start marching ants animation
    state.selection.animationFrame = requestAnimationFrame(animateMarchingAnts);
    drawSelection();
}

// Lasso Selection Tools
let lassoPoints = [];
let polygonalPoints = [];

function startLassoSelection(x, y) {
    lassoPoints = [[x, y]];
    state.selection.type = 'lasso';
    state.selection.points = lassoPoints;
}

function continueLassoSelection(x, y) {
    lassoPoints.push([x, y]);
    state.selection.points = lassoPoints;
    drawLassoPreview();
}

function finishLassoSelection() {
    if (lassoPoints.length < 3) {
        lassoPoints = [];
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        return;
    }
    
    createSelectionFromPath(lassoPoints);
    lassoPoints = [];
}

function startPolygonalLassoSelection(x, y) {
    if (polygonalPoints.length === 0) {
        polygonalPoints = [[x, y]];
        state.selection.type = 'polygonal';
        state.selection.points = polygonalPoints;
    } else {
        polygonalPoints.push([x, y]);
        state.selection.points = polygonalPoints;
        drawPolygonalLassoPreview();
    }
}

function finishPolygonalLassoSelection() {
    if (polygonalPoints.length < 3) {
        polygonalPoints = [];
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        return;
    }
    
    createSelectionFromPath(polygonalPoints);
    polygonalPoints = [];
}

function drawLassoPreview() {
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    
    if (lassoPoints.length < 2) return;
    
    drawCtx.strokeStyle = '#000000';
    drawCtx.lineWidth = 1;
    drawCtx.setLineDash([4, 4]);
    drawCtx.beginPath();
    drawCtx.moveTo(lassoPoints[0][0], lassoPoints[0][1]);
    for (let i = 1; i < lassoPoints.length; i++) {
        drawCtx.lineTo(lassoPoints[i][0], lassoPoints[i][1]);
    }
    drawCtx.stroke();
    
    drawCtx.strokeStyle = '#ffffff';
    drawCtx.lineDashOffset = 4;
    drawCtx.beginPath();
    drawCtx.moveTo(lassoPoints[0][0], lassoPoints[0][1]);
    for (let i = 1; i < lassoPoints.length; i++) {
        drawCtx.lineTo(lassoPoints[i][0], lassoPoints[i][1]);
    }
    drawCtx.stroke();
    
    drawCtx.setLineDash([]);
}

function drawPolygonalLassoPreview() {
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    
    if (polygonalPoints.length < 1) return;
    
    // Draw completed segments
    drawCtx.strokeStyle = '#000000';
    drawCtx.lineWidth = 1;
    drawCtx.setLineDash([4, 4]);
    drawCtx.beginPath();
    drawCtx.moveTo(polygonalPoints[0][0], polygonalPoints[0][1]);
    for (let i = 1; i < polygonalPoints.length; i++) {
        drawCtx.lineTo(polygonalPoints[i][0], polygonalPoints[i][1]);
    }
    drawCtx.stroke();
    
    drawCtx.strokeStyle = '#ffffff';
    drawCtx.lineDashOffset = 4;
    drawCtx.beginPath();
    drawCtx.moveTo(polygonalPoints[0][0], polygonalPoints[0][1]);
    for (let i = 1; i < polygonalPoints.length; i++) {
        drawCtx.lineTo(polygonalPoints[i][0], polygonalPoints[i][1]);
    }
    drawCtx.stroke();
    
    drawCtx.setLineDash([]);
    
    // Draw points
    polygonalPoints.forEach(point => {
        drawCtx.fillStyle = '#ffffff';
        drawCtx.strokeStyle = '#000000';
        drawCtx.beginPath();
        drawCtx.arc(point[0], point[1], 3, 0, Math.PI * 2);
        drawCtx.fill();
        drawCtx.stroke();
    });
}

function createSelectionFromPath(points) {
    if (!state.activeLayer || points.length < 3) return;
    
    // Find bounding box
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    points.forEach(([x, y]) => {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
    });
    
    minX = Math.floor(Math.max(0, minX));
    minY = Math.floor(Math.max(0, minY));
    maxX = Math.ceil(Math.min(state.canvas.width, maxX));
    maxY = Math.ceil(Math.min(state.canvas.height, maxY));
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    // Create selection mask
    const selectionMask = new Uint8Array(state.canvas.width * state.canvas.height);
    
    // Create temporary canvas for path rendering
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = state.canvas.width;
    tempCanvas.height = state.canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Draw path
    tempCtx.fillStyle = '#ffffff';
    tempCtx.beginPath();
    tempCtx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
        tempCtx.lineTo(points[i][0], points[i][1]);
    }
    tempCtx.closePath();
    tempCtx.fill();
    
    // Get image data and create mask
    const imageData = tempCtx.getImageData(0, 0, state.canvas.width, state.canvas.height);
    const data = imageData.data;
    
    for (let y = 0; y < state.canvas.height; y++) {
        for (let x = 0; x < state.canvas.width; x++) {
            const idx = (y * state.canvas.width + x) * 4;
            if (data[idx] > 128) { // White pixels
                selectionMask[y * state.canvas.width + x] = 1;
            }
        }
    }
    
    // Apply feathering if set
    const featherRadius = state.selection.feather || 0;
    if (featherRadius > 0) {
        applyFeathering(selectionMask, state.canvas.width, state.canvas.height, featherRadius);
    }
    
    // Set selection
    state.selection.active = true;
    state.selection.startX = minX;
    state.selection.startY = minY;
    state.selection.endX = maxX;
    state.selection.endY = maxY;
    state.selection.marchingAntsOffset = 0;
    state.selection.mask = selectionMask;
    state.selection.isMaskBased = true;
    
    // Cancel any existing animation
    if (state.selection.animationFrame) {
        cancelAnimationFrame(state.selection.animationFrame);
    }
    
    // Start marching ants animation
    state.selection.animationFrame = requestAnimationFrame(animateMarchingAnts);
    drawSelection();
}

// Selection Refinement Functions
function featherSelection(radius) {
    if (!state.selection.active || !state.selection.mask) return;
    
    applyFeathering(state.selection.mask, state.canvas.width, state.canvas.height, radius);
    drawSelection();
}

function growSelection(pixels) {
    if (!state.selection.active || !state.selection.mask) return;
    
    const mask = state.selection.mask;
    const newMask = new Uint8Array(mask.length);
    const width = state.canvas.width;
    const height = state.canvas.height;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            
            if (mask[idx]) {
                // Fill in area around selected pixels
                for (let dy = -pixels; dy <= pixels; dy++) {
                    for (let dx = -pixels; dx <= pixels; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            if (distance <= pixels) {
                                newMask[ny * width + nx] = 1;
                            }
                        }
                    }
                }
            }
        }
    }
    
    state.selection.mask = newMask;
    updateSelectionBounds();
    drawSelection();
}

function shrinkSelection(pixels) {
    if (!state.selection.active || !state.selection.mask) return;
    
    const mask = state.selection.mask;
    const newMask = new Uint8Array(mask.length);
    const width = state.canvas.width;
    const height = state.canvas.height;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            
            if (mask[idx]) {
                // Check if all pixels within radius are selected
                let allSelected = true;
                for (let dy = -pixels; dy <= pixels && allSelected; dy++) {
                    for (let dx = -pixels; dx <= pixels && allSelected; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            if (distance <= pixels && !mask[ny * width + nx]) {
                                allSelected = false;
                            }
                        }
                    }
                }
                if (allSelected) {
                    newMask[idx] = 1;
                }
            }
        }
    }
    
    state.selection.mask = newMask;
    updateSelectionBounds();
    drawSelection();
}

function borderSelection(pixels) {
    if (!state.selection.active || !state.selection.mask) return;
    
    const mask = state.selection.mask;
    const newMask = new Uint8Array(mask.length);
    const width = state.canvas.width;
    const height = state.canvas.height;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            
            if (mask[idx]) {
                // Check if this pixel is on the border
                let isBorder = false;
                for (let dy = -pixels; dy <= pixels && !isBorder; dy++) {
                    for (let dx = -pixels; dx <= pixels && !isBorder; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            if (distance <= pixels && !mask[ny * width + nx]) {
                                isBorder = true;
                            }
                        }
                    }
                }
                if (isBorder) {
                    newMask[idx] = 1;
                }
            }
        }
    }
    
    state.selection.mask = newMask;
    updateSelectionBounds();
    drawSelection();
}

function invertSelection() {
    if (!state.selection.active) {
        // Select all if no selection
        selectAll();
        return;
    }
    
    if (!state.selection.mask) {
        // Convert rectangular selection to mask
        const mask = new Uint8Array(state.canvas.width * state.canvas.height);
        const minX = Math.min(state.selection.startX, state.selection.endX);
        const minY = Math.min(state.selection.startY, state.selection.endY);
        const maxX = Math.max(state.selection.startX, state.selection.endX);
        const maxY = Math.max(state.selection.startY, state.selection.endY);
        
        for (let y = 0; y < state.canvas.height; y++) {
            for (let x = 0; x < state.canvas.width; x++) {
                const idx = y * state.canvas.width + x;
                if (x < minX || x >= maxX || y < minY || y >= maxY) {
                    mask[idx] = 1;
                } else {
                    mask[idx] = 0;
                }
            }
        }
        
        state.selection.mask = mask;
        state.selection.isMaskBased = true;
    } else {
        // Invert existing mask
        for (let i = 0; i < state.selection.mask.length; i++) {
            state.selection.mask[i] = state.selection.mask[i] ? 0 : 1;
        }
    }
    
    updateSelectionBounds();
    drawSelection();
}

function applyFeathering(mask, width, height, radius) {
    if (radius <= 0) return;
    
    const originalMask = new Uint8Array(mask);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            
            // Calculate average of surrounding pixels
            let sum = 0;
            let count = 0;
            
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance <= radius) {
                            sum += originalMask[ny * width + nx];
                            count++;
                        }
                    }
                }
            }
            
            // Average creates soft edge
            mask[idx] = count > 0 ? (sum / count > 0.5 ? 1 : 0) : 0;
        }
    }
}

function updateSelectionBounds() {
    if (!state.selection.mask) return;
    
    let minX = state.canvas.width, minY = state.canvas.height;
    let maxX = 0, maxY = 0;
    let hasSelection = false;
    
    for (let y = 0; y < state.canvas.height; y++) {
        for (let x = 0; x < state.canvas.width; x++) {
            if (state.selection.mask[y * state.canvas.width + x]) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
                hasSelection = true;
            }
        }
    }
    
    if (hasSelection) {
        state.selection.startX = minX;
        state.selection.startY = minY;
        state.selection.endX = maxX + 1;
        state.selection.endY = maxY + 1;
    } else {
        clearSelection();
    }
}

function selectAll() {
    const mask = new Uint8Array(state.canvas.width * state.canvas.height);
    mask.fill(1);
    
    state.selection.active = true;
    state.selection.startX = 0;
    state.selection.startY = 0;
    state.selection.endX = state.canvas.width;
    state.selection.endY = state.canvas.height;
    state.selection.mask = mask;
    state.selection.isMaskBased = true;
    state.selection.marchingAntsOffset = 0;
    
    // Cancel any existing animation
    if (state.selection.animationFrame) {
        cancelAnimationFrame(state.selection.animationFrame);
    }
    
    // Start marching ants animation
    state.selection.animationFrame = requestAnimationFrame(animateMarchingAnts);
    drawSelection();
}

// ============================================
// Quick Mask Mode (Phase 8 Enhancement)
// ============================================

function toggleQuickMaskMode() {
    state.quickMask.active = !state.quickMask.active;
    
    if (state.quickMask.active) {
        enterQuickMaskMode();
    } else {
        exitQuickMaskMode();
    }
}

function enterQuickMaskMode() {
    // Initialize quick mask canvas if not exists
    if (!state.quickMask.canvas) {
        state.quickMask.canvas = document.createElement('canvas');
        state.quickMask.canvas.width = state.canvas.width;
        state.quickMask.canvas.height = state.canvas.height;
    }
    
    // Convert existing selection to mask if present
    if (state.selection.active && state.selection.mask) {
        const ctx = state.quickMask.canvas.getContext('2d');
        const imageData = ctx.createImageData(state.canvas.width, state.canvas.height);
        
        for (let i = 0; i < state.selection.mask.length; i++) {
            const value = state.selection.mask[i] ? 255 : 0;
            imageData.data[i * 4] = value;
            imageData.data[i * 4 + 1] = value;
            imageData.data[i * 4 + 2] = value;
            imageData.data[i * 4 + 3] = 255;
        }
        
        ctx.putImageData(imageData, 0, 0);
    } else {
        // Clear mask canvas
        const ctx = state.quickMask.canvas.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);
    }
    
    // Clear current selection
    clearSelection();
    
    // Switch to brush tool for painting mask
    const previousTool = state.tool;
    state.quickMask.previousTool = previousTool;
    selectTool('brush');
    
    // Show mask overlay
    drawQuickMaskOverlay();
    
    // Show notification
    showNotification('Quick Mask Mode (Paint white to add to selection, black to remove)');
}

function exitQuickMaskMode() {
    // Convert mask canvas to selection
    const ctx = state.quickMask.canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, state.canvas.width, state.canvas.height);
    const mask = new Uint8Array(state.canvas.width * state.canvas.height);
    
    // Convert grayscale to binary mask (threshold at 50%)
    for (let i = 0; i < mask.length; i++) {
        const value = imageData.data[i * 4]; // Red channel
        mask[i] = value > 127 ? 1 : 0;
    }
    
    // Check if there's any selection
    let hasSelection = false;
    for (let i = 0; i < mask.length; i++) {
        if (mask[i]) {
            hasSelection = true;
            break;
        }
    }
    
    if (hasSelection) {
        state.selection.active = true;
        state.selection.mask = mask;
        state.selection.isMaskBased = true;
        updateSelectionBounds();
        
        // Start marching ants animation
        if (state.selection.animationFrame) {
            cancelAnimationFrame(state.selection.animationFrame);
        }
        state.selection.animationFrame = requestAnimationFrame(animateMarchingAnts);
        drawSelection();
    }
    
    // Clear mask overlay
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    
    // Restore previous tool
    if (state.quickMask.previousTool) {
        selectTool(state.quickMask.previousTool);
        state.quickMask.previousTool = null;
    }
    
    // Show notification
    showNotification('Quick Mask Mode Off');
}

function drawQuickMaskOverlay() {
    if (!state.quickMask.active) return;
    
    // Clear and redraw overlay
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    
    // Get mask data
    const ctx = state.quickMask.canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, state.canvas.width, state.canvas.height);
    
    // Create overlay with red tint where mask is black (unselected)
    drawCtx.save();
    drawCtx.globalAlpha = state.quickMask.opacity;
    
    // More efficient: Create ImageData for overlay instead of individual fillRect calls
    const overlayData = drawCtx.createImageData(state.canvas.width, state.canvas.height);
    
    for (let i = 0; i < imageData.data.length; i += 4) {
        const value = imageData.data[i]; // Red channel from mask
        
        // Draw red overlay where mask is black (protected/unselected area)
        if (value < 127) {
            overlayData.data[i] = 255;     // R
            overlayData.data[i + 1] = 0;   // G
            overlayData.data[i + 2] = 0;   // B
            overlayData.data[i + 3] = 255; // A (full opacity, globalAlpha will handle transparency)
        }
    }
    
    drawCtx.putImageData(overlayData, 0, 0);
    drawCtx.restore();
}

// Text Tool
function addText(x, y) {
    // FIXED: If clicking on an existing text layer, edit it instead of creating new
    if (state.activeLayer && state.activeLayer.type === 'text' && state.activeLayer.textData) {
        editTextLayer();
        return;
    }
    
    // Show a better text input dialog with current settings info
    const settingsInfo = `Font: ${state.text.fontFamily.split(',')[0]} ${state.text.fontSize}px ${state.text.bold ? 'Bold' : ''} ${state.text.italic ? 'Italic' : ''}`.trim();
    const text = prompt(`Enter text:\n(${settingsInfo})\n\nTip: Adjust font settings in the toolbar above before typing.`);
    if (!text || !text.trim()) return;
    
    // Create a new layer for the text
    const textLayerName = `Text: ${text.substring(0, 20)}${text.length > 20 ? '...' : ''}`;
    addLayer(textLayerName, 'text');
    
    renderText(text, x, y);
    
    compositeAllLayers();
    saveState();
}

// FIXED: Function to render text on canvas
function renderText(text, x, y) {
    if (!state.activeLayer) return;
    
    const ctx = state.activeLayer.canvas.getContext('2d');
    
    // Clear the layer first
    ctx.clearRect(0, 0, state.activeLayer.canvas.width, state.activeLayer.canvas.height);
    
    ctx.save();
    
    // Build font string with bold/italic
    let fontStyle = '';
    if (state.text.italic) fontStyle += 'italic ';
    if (state.text.bold) fontStyle += 'bold ';
    
    // Set text properties
    ctx.font = `${fontStyle}${state.text.fontSize}px ${state.text.fontFamily}`;
    ctx.textAlign = state.text.alignment;
    
    // Apply letter spacing if supported
    if (state.text.letterSpacing !== 0) {
        ctx.letterSpacing = `${state.text.letterSpacing}px`;
    }
    
    // Handle multi-line text
    const lines = text.split('\n');
    const lineHeightPx = state.text.fontSize * state.text.lineHeight;
    
    // Phase 7: Apply text effects
    lines.forEach((line, index) => {
        const yPos = y + (index * lineHeightPx);
        
        // Apply shadow effect (Phase 7)
        if (state.text.shadow.enabled) {
            ctx.save();
            ctx.shadowColor = state.text.shadow.color;
            ctx.shadowBlur = state.text.shadow.blur;
            ctx.shadowOffsetX = state.text.shadow.offsetX;
            ctx.shadowOffsetY = state.text.shadow.offsetY;
        }
        
        // Apply gradient fill (Phase 7)
        if (state.text.gradient.enabled) {
            const metrics = ctx.measureText(line);
            const textWidth = metrics.width;
            let gradient;
            
            if (state.text.gradient.type === 'linear') {
                const angle = state.text.gradient.angle * Math.PI / 180;
                const x1 = x - Math.cos(angle) * textWidth / 2;
                const y1 = yPos - Math.sin(angle) * textWidth / 2;
                const x2 = x + Math.cos(angle) * textWidth / 2;
                const y2 = yPos + Math.sin(angle) * textWidth / 2;
                gradient = ctx.createLinearGradient(x1, y1, x2, y2);
            } else {
                gradient = ctx.createRadialGradient(x, yPos, 0, x, yPos, textWidth / 2);
            }
            
            state.text.gradient.colors.forEach((color, i) => {
                gradient.addColorStop(i / (state.text.gradient.colors.length - 1), color);
            });
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = state.color;
        }
        
        ctx.globalAlpha = state.brush.opacity / 100;
        
        // Draw the text fill
        ctx.fillText(line, x, yPos);
        
        if (state.text.shadow.enabled) {
            ctx.restore();
        }
        
        // Apply stroke effect (Phase 7)
        if (state.text.stroke.enabled) {
            ctx.strokeStyle = state.text.stroke.color;
            ctx.lineWidth = state.text.stroke.width;
            ctx.lineJoin = 'round';
            ctx.strokeText(line, x, yPos);
        }
        
        // Apply underline effect (Phase 7)
        if (state.text.underline) {
            const metrics = ctx.measureText(line);
            const textWidth = metrics.width;
            let underlineX = x;
            
            // Adjust underline position based on alignment
            if (state.text.alignment === 'center') {
                underlineX = x - textWidth / 2;
            } else if (state.text.alignment === 'right') {
                underlineX = x - textWidth;
            }
            
            ctx.strokeStyle = ctx.fillStyle;
            ctx.lineWidth = Math.max(1, state.text.fontSize / 16);
            ctx.beginPath();
            ctx.moveTo(underlineX, yPos + state.text.fontSize / 10);
            ctx.lineTo(underlineX + textWidth, yPos + state.text.fontSize / 10);
            ctx.stroke();
        }
    });
    
    ctx.restore();
    
    // Store text metadata on the layer for future editing/moving
    state.activeLayer.textData = {
        text: text,
        x: x,
        y: y,
        fontSize: state.text.fontSize,
        fontFamily: state.text.fontFamily,
        bold: state.text.bold,
        italic: state.text.italic,
        underline: state.text.underline,
        alignment: state.text.alignment,
        letterSpacing: state.text.letterSpacing,
        lineHeight: state.text.lineHeight,
        color: state.color,
        // Phase 7: Store text effect settings
        stroke: { ...state.text.stroke },
        shadow: { ...state.text.shadow },
        gradient: { ...state.text.gradient }
    };
}

// FIXED: Function to edit existing text layer
function editTextLayer() {
    if (!state.activeLayer || !state.activeLayer.textData) return;
    
    const textData = state.activeLayer.textData;
    
    // Restore text settings from layer
    state.text.fontSize = textData.fontSize;
    state.text.fontFamily = textData.fontFamily;
    state.text.bold = textData.bold;
    state.text.italic = textData.italic;
    state.text.underline = textData.underline || false;
    state.text.alignment = textData.alignment;
    state.text.letterSpacing = textData.letterSpacing;
    state.text.lineHeight = textData.lineHeight;
    state.color = textData.color;
    
    // Phase 7: Restore text effect settings
    if (textData.stroke) state.text.stroke = { ...textData.stroke };
    if (textData.shadow) state.text.shadow = { ...textData.shadow };
    if (textData.gradient) state.text.gradient = { ...textData.gradient };
    
    // Update UI controls to reflect current text settings
    updateTextControls();
    
    // Show settings info and current text
    const settingsInfo = `Font: ${state.text.fontFamily.split(',')[0]} ${state.text.fontSize}px ${state.text.bold ? 'Bold' : ''} ${state.text.italic ? 'Italic' : ''}`.trim();
    const newText = prompt(`Edit text:\n(${settingsInfo})\n\nCurrent text: "${textData.text}"\n\nTip: You can modify font settings in the toolbar before editing.`, textData.text);
    if (newText !== null && newText.trim()) {
        // Re-render with current settings
        renderText(newText, textData.x, textData.y);
        
        // Update layer name
        state.activeLayer.name = `Text: ${newText.substring(0, 20)}${newText.length > 20 ? '...' : ''}`;
        updateLayersList();
        
        compositeAllLayers();
        saveState();
    }
}

// FIXED: Update text controls in UI
function updateTextControls() {
    // Update contextual toolbar controls
    const textSizeSelect = document.querySelector('[data-action="text-size"]');
    if (textSizeSelect) textSizeSelect.value = state.text.fontSize;
    
    const textFontSelect = document.querySelector('[data-action="text-font"]');
    if (textFontSelect) textFontSelect.value = state.text.fontFamily;
    
    const boldBtn = document.querySelector('[data-action="text-bold"]');
    if (boldBtn) boldBtn.classList.toggle('active', state.text.bold);
    
    const italicBtn = document.querySelector('[data-action="text-italic"]');
    if (italicBtn) italicBtn.classList.toggle('active', state.text.italic);
    
    // Phase 7: Update underline button
    const underlineBtn = document.querySelector('[data-action="text-underline"]');
    if (underlineBtn) underlineBtn.classList.toggle('active', state.text.underline);
    
    // Update alignment buttons
    document.querySelectorAll('[data-action^="text-align-"]').forEach(btn => {
        btn.classList.remove('active');
    });
    const alignBtn = document.querySelector(`[data-action="text-align-${state.text.alignment}"]`);
    if (alignBtn) alignBtn.classList.add('active');
    
    // Phase 7: Update text effect buttons
    const strokeBtn = document.querySelector('[data-action="text-stroke"]');
    if (strokeBtn) strokeBtn.classList.toggle('active', state.text.stroke.enabled);
    
    const shadowBtn = document.querySelector('[data-action="text-shadow"]');
    if (shadowBtn) shadowBtn.classList.toggle('active', state.text.shadow.enabled);
    
    const gradientBtn = document.querySelector('[data-action="text-gradient"]');
    if (gradientBtn) gradientBtn.classList.toggle('active', state.text.gradient.enabled);
    
    // Update left panel controls if they exist
    const letterSpacingInput = document.getElementById('text-letter-spacing');
    if (letterSpacingInput) letterSpacingInput.value = state.text.letterSpacing;
    
    const lineHeightInput = document.getElementById('text-line-height');
    if (lineHeightInput) lineHeightInput.value = state.text.lineHeight;
}

// Apply current text settings to active text layer (for live updates)
function applyTextSettingsToActiveLayer() {
    // Only apply if active layer is a text layer with text data
    if (!state.activeLayer || state.activeLayer.type !== 'text' || !state.activeLayer.textData) {
        return;
    }
    
    const textData = state.activeLayer.textData;
    
    // Re-render the text with current settings
    renderText(textData.text, textData.x, textData.y);
    
    // Update display
    compositeAllLayers();
    saveState();
}

// Gradient Tool
function startGradient(x, y) {
    state.gradient.drawing = true;
    state.gradient.startX = x;
    state.gradient.startY = y;
    state.gradient.endX = x;
    state.gradient.endY = y;
}

function updateGradient(x, y) {
    state.gradient.endX = x;
    state.gradient.endY = y;
    drawGradientPreview();
}

function finishGradient() {
    if (!state.gradient.drawing) return;
    
    state.gradient.drawing = false;
    
    // Draw final gradient on active layer
    const ctx = state.activeLayer.canvas.getContext('2d');
    drawGradient(ctx, state.gradient);
    
    // Clear preview
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    compositeAllLayers();
    saveState();
}

function drawGradientPreview() {
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    drawGradient(drawCtx, state.gradient);
}

function drawGradient(ctx, gradient) {
    ctx.save();
    ctx.globalAlpha = state.brush.opacity / 100;
    
    let grad;
    if (gradient.type === 'linear') {
        grad = ctx.createLinearGradient(
            gradient.startX, gradient.startY,
            gradient.endX, gradient.endY
        );
    } else if (gradient.type === 'radial') {
        const dx = gradient.endX - gradient.startX;
        const dy = gradient.endY - gradient.startY;
        const radius = Math.sqrt(dx * dx + dy * dy);
        grad = ctx.createRadialGradient(
            gradient.startX, gradient.startY, 0,
            gradient.startX, gradient.startY, radius
        );
    }
    
    // Add color stops (sort by position first)
    const sortedStops = [...gradient.colorStops].sort((a, b) => a.position - b.position);
    sortedStops.forEach(stop => {
        grad.addColorStop(stop.position, stop.color);
    });
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);
    ctx.restore();
}

// Gradient Editor Functions
let selectedGradientStop = null;

function initGradientEditor() {
    const canvas = document.getElementById('gradient-editor-canvas');
    const container = document.getElementById('gradient-stops-container');
    const addStopBtn = document.getElementById('add-gradient-stop');
    const presetSelect = document.getElementById('gradient-presets');
    
    if (!canvas || !container) return;
    
    // Draw gradient preview
    function updateGradientPreview() {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Create gradient
        const grad = ctx.createLinearGradient(0, 0, width, 0);
        const sortedStops = [...state.gradient.colorStops].sort((a, b) => a.position - b.position);
        sortedStops.forEach(stop => {
            grad.addColorStop(stop.position, stop.color);
        });
        
        // Draw checkerboard background
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#a0a0a0';
        for (let x = 0; x < width; x += 10) {
            for (let y = 0; y < height; y += 10) {
                if ((Math.floor(x / 10) + Math.floor(y / 10)) % 2 === 0) {
                    ctx.fillRect(x, y, 10, 10);
                }
            }
        }
        
        // Draw gradient
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        
        updateStopHandles();
    }
    
    // Update stop handles
    function updateStopHandles() {
        container.innerHTML = '';
        state.gradient.colorStops.forEach((stop, index) => {
            const handle = document.createElement('div');
            handle.style.position = 'absolute';
            handle.style.left = (stop.position * 240 - 6) + 'px';
            handle.style.top = '0px';
            handle.style.width = '12px';
            handle.style.height = '20px';
            handle.style.backgroundColor = stop.color;
            handle.style.border = selectedGradientStop === index ? '2px solid white' : '1px solid #000';
            handle.style.borderRadius = '3px';
            handle.style.cursor = 'pointer';
            handle.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
            handle.title = `Stop ${index + 1}: ${Math.round(stop.position * 100)}%`;
            
            // Click to select/edit
            handle.addEventListener('click', (e) => {
                e.stopPropagation();
                selectedGradientStop = index;
                
                // Create color picker
                const picker = document.createElement('input');
                picker.type = 'color';
                picker.value = stop.color;
                picker.style.position = 'absolute';
                picker.style.opacity = '0';
                picker.style.pointerEvents = 'none';
                document.body.appendChild(picker);
                
                picker.addEventListener('change', (e) => {
                    state.gradient.colorStops[index].color = e.target.value;
                    updateGradientPreview();
                    document.body.removeChild(picker);
                });
                
                picker.click();
                updateStopHandles();
            });
            
            // Right-click to delete (if more than 2 stops)
            handle.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (state.gradient.colorStops.length > 2) {
                    state.gradient.colorStops.splice(index, 1);
                    if (selectedGradientStop === index) {
                        selectedGradientStop = null;
                    } else if (selectedGradientStop > index) {
                        selectedGradientStop--;
                    }
                    updateGradientPreview();
                }
            });
            
            // Drag to reposition
            let isDragging = false;
            handle.addEventListener('pointerdown', (e) => {
                isDragging = true;
                handle.setPointerCapture(e.pointerId);
                selectedGradientStop = index;
                updateStopHandles();
            });
            
            handle.addEventListener('pointermove', (e) => {
                if (!isDragging) return;
                const rect = container.getBoundingClientRect();
                let position = (e.clientX - rect.left) / rect.width;
                position = Math.max(0, Math.min(1, position));
                state.gradient.colorStops[index].position = position;
                updateGradientPreview();
            });
            
            handle.addEventListener('pointerup', (e) => {
                isDragging = false;
                handle.releasePointerCapture(e.pointerId);
            });
            
            container.appendChild(handle);
        });
    }
    
    // Add stop button
    if (addStopBtn) {
        addStopBtn.addEventListener('click', () => {
            // Add new stop in the middle
            const newPosition = 0.5;
            // Interpolate color at this position
            const sortedStops = [...state.gradient.colorStops].sort((a, b) => a.position - b.position);
            let color = '#808080';
            
            for (let i = 0; i < sortedStops.length - 1; i++) {
                if (newPosition >= sortedStops[i].position && newPosition <= sortedStops[i + 1].position) {
                    const t = (newPosition - sortedStops[i].position) / (sortedStops[i + 1].position - sortedStops[i].position);
                    const c1 = hexToRgb(sortedStops[i].color);
                    const c2 = hexToRgb(sortedStops[i + 1].color);
                    const r = Math.round(c1.r + (c2.r - c1.r) * t);
                    const g = Math.round(c1.g + (c2.g - c1.g) * t);
                    const b = Math.round(c1.b + (c2.b - c1.b) * t);
                    color = rgbToHex(r, g, b);
                    break;
                }
            }
            
            state.gradient.colorStops.push({ position: newPosition, color: color });
            updateGradientPreview();
        });
    }
    
    // Canvas click to add stop
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const position = (e.clientX - rect.left) / rect.width;
        
        // Interpolate color at click position
        const sortedStops = [...state.gradient.colorStops].sort((a, b) => a.position - b.position);
        let color = '#808080';
        
        for (let i = 0; i < sortedStops.length - 1; i++) {
            if (position >= sortedStops[i].position && position <= sortedStops[i + 1].position) {
                const t = (position - sortedStops[i].position) / (sortedStops[i + 1].position - sortedStops[i].position);
                const c1 = hexToRgb(sortedStops[i].color);
                const c2 = hexToRgb(sortedStops[i + 1].color);
                const r = Math.round(c1.r + (c2.r - c1.r) * t);
                const g = Math.round(c1.g + (c2.g - c1.g) * t);
                const b = Math.round(c1.b + (c2.b - c1.b) * t);
                color = rgbToHex(r, g, b);
                break;
            }
        }
        
        state.gradient.colorStops.push({ position: position, color: color });
        updateGradientPreview();
    });
    
    // Gradient presets
    if (presetSelect) {
        presetSelect.addEventListener('change', (e) => {
            const preset = e.target.value;
            if (!preset) return;
            
            switch (preset) {
                case 'bw':
                    state.gradient.colorStops = [
                        { position: 0, color: '#000000' },
                        { position: 1, color: '#ffffff' }
                    ];
                    break;
                case 'rainbow':
                    state.gradient.colorStops = [
                        { position: 0, color: '#ff0000' },
                        { position: 0.17, color: '#ff7f00' },
                        { position: 0.33, color: '#ffff00' },
                        { position: 0.5, color: '#00ff00' },
                        { position: 0.67, color: '#0000ff' },
                        { position: 0.83, color: '#8b00ff' },
                        { position: 1, color: '#ff0000' }
                    ];
                    break;
                case 'sunset':
                    state.gradient.colorStops = [
                        { position: 0, color: '#ff6b35' },
                        { position: 0.5, color: '#f7931e' },
                        { position: 1, color: '#fdc830' }
                    ];
                    break;
                case 'ocean':
                    state.gradient.colorStops = [
                        { position: 0, color: '#00d2ff' },
                        { position: 0.5, color: '#3a7bd5' },
                        { position: 1, color: '#00416a' }
                    ];
                    break;
                case 'fire':
                    state.gradient.colorStops = [
                        { position: 0, color: '#ff0000' },
                        { position: 0.5, color: '#ff7f00' },
                        { position: 1, color: '#ffff00' }
                    ];
                    break;
                case 'forest':
                    state.gradient.colorStops = [
                        { position: 0, color: '#134e13' },
                        { position: 0.5, color: '#2d7a2d' },
                        { position: 1, color: '#8bc34a' }
                    ];
                    break;
                case 'purple-pink':
                    state.gradient.colorStops = [
                        { position: 0, color: '#667eea' },
                        { position: 0.5, color: '#764ba2' },
                        { position: 1, color: '#f857a6' }
                    ];
                    break;
                case 'blue-green':
                    state.gradient.colorStops = [
                        { position: 0, color: '#00c6ff' },
                        { position: 0.5, color: '#0072ff' },
                        { position: 1, color: '#00ffaa' }
                    ];
                    break;
            }
            
            updateGradientPreview();
            presetSelect.value = ''; // Reset selection
        });
    }
    
    // Initial draw
    updateGradientPreview();
}

// Helper functions for color interpolation
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Transform Tools
function startTransform(mode, x, y) {
    if (!state.activeLayer) return;
    
    state.transform.mode = mode;
    state.transform.active = true;
    state.transform.startX = x;
    state.transform.startY = y;
    
    // Store original layer state
    state.transform.originalLayer = document.createElement('canvas');
    state.transform.originalLayer.width = state.activeLayer.canvas.width;
    state.transform.originalLayer.height = state.activeLayer.canvas.height;
    const ctx = state.transform.originalLayer.getContext('2d');
    ctx.drawImage(state.activeLayer.canvas, 0, 0);
    
    // Initialize corners for free transform and perspective
    if (mode === 'free-transform' || mode === 'perspective') {
        const w = state.canvas.width;
        const h = state.canvas.height;
        state.transform.corners = [
            { x: 0, y: 0 },           // top-left
            { x: w, y: 0 },           // top-right
            { x: w, y: h },           // bottom-right
            { x: 0, y: h }            // bottom-left
        ];
        state.transform.selectedHandle = null;
    }
    
    // Initialize warp grid
    if (mode === 'warp') {
        const res = state.transform.warpResolution;
        const w = state.canvas.width;
        const h = state.canvas.height;
        state.transform.warpGrid = [];
        
        for (let row = 0; row <= res; row++) {
            for (let col = 0; col <= res; col++) {
                state.transform.warpGrid.push({
                    x: (col / res) * w,
                    y: (row / res) * h,
                    originalX: (col / res) * w,
                    originalY: (row / res) * h
                });
            }
        }
        state.transform.selectedHandle = null;
    }
    
    // Reset transform values
    state.transform.angle = 0;
    state.transform.scale = 1;
    state.transform.scaleX = 1;
    state.transform.scaleY = 1;
    state.transform.skewX = 0;
    state.transform.skewY = 0;
    
    // Draw transform handles
    drawTransformHandles();
}

function updateTransform(x, y) {
    if (!state.transform.active || !state.activeLayer) return;
    
    const ctx = state.activeLayer.canvas.getContext('2d');
    ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
    
    const dx = x - state.transform.startX;
    const dy = y - state.transform.startY;
    
    ctx.save();
    
    if (state.transform.mode === 'move') {
        ctx.translate(dx, dy);
        state.transform.translateX = dx;
        state.transform.translateY = dy;
        ctx.drawImage(state.transform.originalLayer, 0, 0);
    } else if (state.transform.mode === 'rotate') {
        const centerX = state.canvas.width / 2;
        const centerY = state.canvas.height / 2;
        const angle = Math.atan2(y - centerY, x - centerX) - Math.atan2(state.transform.startY - centerY, state.transform.startX - centerX);
        ctx.translate(centerX, centerY);
        ctx.rotate(angle);
        ctx.translate(-centerX, -centerY);
        state.transform.angle = angle;
        ctx.drawImage(state.transform.originalLayer, 0, 0);
    } else if (state.transform.mode === 'scale') {
        const scale = 1 + dy / 100;
        const centerX = state.canvas.width / 2;
        const centerY = state.canvas.height / 2;
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);
        ctx.translate(-centerX, -centerY);
        state.transform.scale = scale;
        ctx.drawImage(state.transform.originalLayer, 0, 0);
    } else if (state.transform.mode === 'skew') {
        const centerX = state.canvas.width / 2;
        const centerY = state.canvas.height / 2;
        const skewX = dx / 200;
        const skewY = dy / 200;
        ctx.translate(centerX, centerY);
        ctx.transform(1, skewY, skewX, 1, 0, 0);
        ctx.translate(-centerX, -centerY);
        state.transform.skewX = skewX;
        state.transform.skewY = skewY;
        ctx.drawImage(state.transform.originalLayer, 0, 0);
    } else if (state.transform.mode === 'free-transform') {
        // Handle-based free transform
        if (state.transform.selectedHandle !== null) {
            state.transform.corners[state.transform.selectedHandle].x = x;
            state.transform.corners[state.transform.selectedHandle].y = y;
        }
        applyPerspectiveTransform(ctx);
    } else if (state.transform.mode === 'perspective') {
        // Perspective transform - same as free transform but with perspective
        if (state.transform.selectedHandle !== null) {
            state.transform.corners[state.transform.selectedHandle].x = x;
            state.transform.corners[state.transform.selectedHandle].y = y;
        }
        applyPerspectiveTransform(ctx);
    } else if (state.transform.mode === 'warp') {
        // Warp tool - move grid points
        if (state.transform.selectedHandle !== null) {
            state.transform.warpGrid[state.transform.selectedHandle].x = x;
            state.transform.warpGrid[state.transform.selectedHandle].y = y;
        }
        applyWarpTransform(ctx);
    }
    
    ctx.restore();
    
    compositeAllLayers();
    drawTransformHandles();
}

function finishTransform() {
    if (!state.transform.active) return;
    
    // Save to history if this is a smart object
    if (state.transform.isSmartObject) {
        addTransformToHistory({
            mode: state.transform.mode,
            angle: state.transform.angle,
            scale: state.transform.scale,
            scaleX: state.transform.scaleX,
            scaleY: state.transform.scaleY,
            skewX: state.transform.skewX,
            skewY: state.transform.skewY,
            translateX: state.transform.translateX,
            translateY: state.transform.translateY,
            corners: state.transform.corners,
            warpGrid: state.transform.warpGrid
        });
    }
    
    state.transform.active = false;
    state.transform.mode = null;
    state.transform.originalLayer = null;
    state.transform.selectedHandle = null;
    state.transform.warpGrid = null;
    
    // Clear transform handles
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    
    saveState();
}

function cancelTransform() {
    if (!state.transform.active || !state.activeLayer) return;
    
    // Restore original layer
    const ctx = state.activeLayer.canvas.getContext('2d');
    ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
    ctx.drawImage(state.transform.originalLayer, 0, 0);
    
    state.transform.active = false;
    state.transform.mode = null;
    state.transform.originalLayer = null;
    state.transform.selectedHandle = null;
    state.transform.warpGrid = null;
    
    // Clear transform handles
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    
    compositeAllLayers();
}

function resetTransform() {
    if (!state.transform.active || !state.activeLayer) return;
    
    // Reset to original
    const ctx = state.activeLayer.canvas.getContext('2d');
    ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
    ctx.drawImage(state.transform.originalLayer, 0, 0);
    
    // Reset corners for free transform/perspective
    if (state.transform.mode === 'free-transform' || state.transform.mode === 'perspective') {
        const w = state.canvas.width;
        const h = state.canvas.height;
        state.transform.corners = [
            { x: 0, y: 0 },
            { x: w, y: 0 },
            { x: w, y: h },
            { x: 0, y: h }
        ];
    }
    
    // Reset warp grid
    if (state.transform.mode === 'warp' && state.transform.warpGrid) {
        state.transform.warpGrid.forEach(point => {
            point.x = point.originalX;
            point.y = point.originalY;
        });
    }
    
    compositeAllLayers();
    drawTransformHandles();
}

function drawTransformHandles() {
    if (!state.transform.active) return;
    
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    
    if (state.transform.mode === 'free-transform' || state.transform.mode === 'perspective') {
        // Draw bounding box
        drawCtx.strokeStyle = '#00aaff';
        drawCtx.lineWidth = 2;
        drawCtx.setLineDash([5, 5]);
        drawCtx.beginPath();
        drawCtx.moveTo(state.transform.corners[0].x, state.transform.corners[0].y);
        for (let i = 1; i < 4; i++) {
            drawCtx.lineTo(state.transform.corners[i].x, state.transform.corners[i].y);
        }
        drawCtx.closePath();
        drawCtx.stroke();
        drawCtx.setLineDash([]);
        
        // Draw corner handles
        state.transform.corners.forEach((corner, index) => {
            drawCtx.fillStyle = state.transform.selectedHandle === index ? '#ff6600' : '#00aaff';
            drawCtx.strokeStyle = '#ffffff';
            drawCtx.lineWidth = 2;
            drawCtx.beginPath();
            drawCtx.arc(corner.x, corner.y, 6, 0, Math.PI * 2);
            drawCtx.fill();
            drawCtx.stroke();
        });
    } else if (state.transform.mode === 'warp') {
        // Draw warp grid
        const res = state.transform.warpResolution;
        drawCtx.strokeStyle = '#00aaff';
        drawCtx.lineWidth = 1;
        drawCtx.setLineDash([3, 3]);
        
        // Draw horizontal lines
        for (let row = 0; row <= res; row++) {
            drawCtx.beginPath();
            for (let col = 0; col <= res; col++) {
                const idx = row * (res + 1) + col;
                const point = state.transform.warpGrid[idx];
                if (col === 0) {
                    drawCtx.moveTo(point.x, point.y);
                } else {
                    drawCtx.lineTo(point.x, point.y);
                }
            }
            drawCtx.stroke();
        }
        
        // Draw vertical lines
        for (let col = 0; col <= res; col++) {
            drawCtx.beginPath();
            for (let row = 0; row <= res; row++) {
                const idx = row * (res + 1) + col;
                const point = state.transform.warpGrid[idx];
                if (row === 0) {
                    drawCtx.moveTo(point.x, point.y);
                } else {
                    drawCtx.lineTo(point.x, point.y);
                }
            }
            drawCtx.stroke();
        }
        
        drawCtx.setLineDash([]);
        
        // Draw grid points
        state.transform.warpGrid.forEach((point, index) => {
            drawCtx.fillStyle = state.transform.selectedHandle === index ? '#ff6600' : '#00aaff';
            drawCtx.strokeStyle = '#ffffff';
            drawCtx.lineWidth = 2;
            drawCtx.beginPath();
            drawCtx.arc(point.x, point.y, 4, 0, Math.PI * 2);
            drawCtx.fill();
            drawCtx.stroke();
        });
    }
}

function applyPerspectiveTransform(ctx) {
    // Simple perspective mapping using bilinear interpolation
    const corners = state.transform.corners;
    const srcCanvas = state.transform.originalLayer;
    const w = srcCanvas.width;
    const h = srcCanvas.height;
    
    // Get source and destination image data
    const srcCtx = srcCanvas.getContext('2d');
    const srcData = srcCtx.getImageData(0, 0, w, h);
    const dstData = ctx.createImageData(w, h);
    
    // Apply perspective transformation
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            // Normalize coordinates (0 to 1)
            const u = x / w;
            const v = y / h;
            
            // Bilinear interpolation of corner positions
            const x0 = corners[0].x * (1 - u) + corners[1].x * u;
            const y0 = corners[0].y * (1 - u) + corners[1].y * u;
            const x1 = corners[3].x * (1 - u) + corners[2].x * u;
            const y1 = corners[3].y * (1 - u) + corners[2].y * u;
            
            const tx = x0 * (1 - v) + x1 * v;
            const ty = y0 * (1 - v) + y1 * v;
            
            // Bounds check
            const sx = Math.floor(tx);
            const sy = Math.floor(ty);
            
            if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
                const srcIdx = (y * w + x) * 4;
                const dstIdx = (sy * w + sx) * 4;
                
                dstData.data[dstIdx] = srcData.data[srcIdx];
                dstData.data[dstIdx + 1] = srcData.data[srcIdx + 1];
                dstData.data[dstIdx + 2] = srcData.data[srcIdx + 2];
                dstData.data[dstIdx + 3] = srcData.data[srcIdx + 3];
            }
        }
    }
    
    ctx.putImageData(dstData, 0, 0);
}

function applyWarpTransform(ctx) {
    const srcCanvas = state.transform.originalLayer;
    const w = srcCanvas.width;
    const h = srcCanvas.height;
    const res = state.transform.warpResolution;
    
    // Get source image data
    const srcCtx = srcCanvas.getContext('2d');
    const srcData = srcCtx.getImageData(0, 0, w, h);
    const dstData = ctx.createImageData(w, h);
    
    // Apply warp transformation using bilinear interpolation
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            // Find which grid cell this pixel is in
            const cellX = (x / w) * res;
            const cellY = (y / h) * res;
            const gridX = Math.floor(cellX);
            const gridY = Math.floor(cellY);
            
            if (gridX >= res || gridY >= res) continue;
            
            // Get the four corners of the grid cell
            const p00 = state.transform.warpGrid[gridY * (res + 1) + gridX];
            const p10 = state.transform.warpGrid[gridY * (res + 1) + gridX + 1];
            const p01 = state.transform.warpGrid[(gridY + 1) * (res + 1) + gridX];
            const p11 = state.transform.warpGrid[(gridY + 1) * (res + 1) + gridX + 1];
            
            // Interpolate position within cell
            const u = cellX - gridX;
            const v = cellY - gridY;
            
            const tx = p00.x * (1 - u) * (1 - v) + p10.x * u * (1 - v) + 
                      p01.x * (1 - u) * v + p11.x * u * v;
            const ty = p00.y * (1 - u) * (1 - v) + p10.y * u * (1 - v) + 
                      p01.y * (1 - u) * v + p11.y * u * v;
            
            const sx = Math.floor(tx);
            const sy = Math.floor(ty);
            
            if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
                const srcIdx = (y * w + x) * 4;
                const dstIdx = (sy * w + sx) * 4;
                
                dstData.data[dstIdx] = srcData.data[srcIdx];
                dstData.data[dstIdx + 1] = srcData.data[srcIdx + 1];
                dstData.data[dstIdx + 2] = srcData.data[srcIdx + 2];
                dstData.data[dstIdx + 3] = srcData.data[srcIdx + 3];
            }
        }
    }
    
    ctx.putImageData(dstData, 0, 0);
}

// ============================================
// Transform History & Smart Objects (Phase 6 Enhancement)
// ============================================

function convertLayerToSmartObject() {
    if (!state.activeLayer) return;
    
    // Store original layer data
    state.transform.smartObject = document.createElement('canvas');
    state.transform.smartObject.width = state.activeLayer.canvas.width;
    state.transform.smartObject.height = state.activeLayer.canvas.height;
    const ctx = state.transform.smartObject.getContext('2d');
    ctx.drawImage(state.activeLayer.canvas, 0, 0);
    
    state.transform.isSmartObject = true;
    state.transform.history = [];
    state.transform.historyIndex = -1;
    
    showNotification('Layer converted to Smart Object');
}

// Helper function to create transform snapshot
function createTransformSnapshot(transformData) {
    return {
        mode: transformData.mode,
        angle: transformData.angle || 0,
        scale: transformData.scale || 1,
        scaleX: transformData.scaleX || 1,
        scaleY: transformData.scaleY || 1,
        skewX: transformData.skewX || 0,
        skewY: transformData.skewY || 0,
        translateX: transformData.translateX || 0,
        translateY: transformData.translateY || 0,
        corners: transformData.corners ? [...transformData.corners] : null,
        warpGrid: transformData.warpGrid ? JSON.parse(JSON.stringify(transformData.warpGrid)) : null,
        timestamp: Date.now()
    };
}

function addTransformToHistory(transformData) {
    if (!state.transform.isSmartObject) return;
    
    // Remove any transforms after current index (when making new transform after undo)
    state.transform.history = state.transform.history.slice(0, state.transform.historyIndex + 1);
    
    // Add new transform using helper function
    state.transform.history.push(createTransformSnapshot(transformData));
    
    state.transform.historyIndex++;
    
    // Limit history size to 50 transforms
    if (state.transform.history.length > 50) {
        state.transform.history.shift();
        state.transform.historyIndex--;
    }
}

function applyTransformHistory() {
    if (!state.transform.isSmartObject || !state.transform.smartObject || !state.activeLayer) return;
    
    // Start with original smart object data
    const ctx = state.activeLayer.canvas.getContext('2d');
    ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
    ctx.drawImage(state.transform.smartObject, 0, 0);
    
    // Apply all transforms up to current index
    for (let i = 0; i <= state.transform.historyIndex; i++) {
        const transform = state.transform.history[i];
        applyHistoricalTransform(ctx, transform);
    }
    
    compositeAllLayers();
}

function applyHistoricalTransform(ctx, transform) {
    ctx.save();
    
    const centerX = state.canvas.width / 2;
    const centerY = state.canvas.height / 2;
    
    if (transform.mode === 'move') {
        // Apply translation transform
        ctx.translate(transform.translateX || 0, transform.translateY || 0);
    } else if (transform.mode === 'rotate') {
        ctx.translate(centerX, centerY);
        ctx.rotate(transform.angle);
        ctx.translate(-centerX, -centerY);
    } else if (transform.mode === 'scale') {
        ctx.translate(centerX, centerY);
        ctx.scale(transform.scale, transform.scale);
        ctx.translate(-centerX, -centerY);
    } else if (transform.mode === 'skew') {
        ctx.translate(centerX, centerY);
        ctx.transform(1, transform.skewY, transform.skewX, 1, 0, 0);
        ctx.translate(-centerX, -centerY);
    }
    
    ctx.restore();
}

function undoTransform() {
    if (!state.transform.isSmartObject || state.transform.historyIndex < 0) {
        showNotification('No transforms to undo');
        return;
    }
    
    state.transform.historyIndex--;
    applyTransformHistory();
    showNotification(`Undo Transform (${state.transform.historyIndex + 1}/${state.transform.history.length})`);
}

function redoTransform() {
    if (!state.transform.isSmartObject || state.transform.historyIndex >= state.transform.history.length - 1) {
        showNotification('No transforms to redo');
        return;
    }
    
    state.transform.historyIndex++;
    applyTransformHistory();
    showNotification(`Redo Transform (${state.transform.historyIndex + 1}/${state.transform.history.length})`);
}

function resetSmartObject() {
    if (!state.transform.isSmartObject || !state.transform.smartObject || !state.activeLayer) {
        showNotification('Layer is not a Smart Object');
        return;
    }
    
    // Clear all transforms
    state.transform.history = [];
    state.transform.historyIndex = -1;
    
    // Restore original
    const ctx = state.activeLayer.canvas.getContext('2d');
    ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
    ctx.drawImage(state.transform.smartObject, 0, 0);
    
    compositeAllLayers();
    showNotification('Smart Object reset to original');
}

function rasterizeSmartObject() {
    if (!state.transform.isSmartObject) {
        showNotification('Layer is not a Smart Object');
        return;
    }
    
    // Clear smart object data
    state.transform.isSmartObject = false;
    state.transform.smartObject = null;
    state.transform.history = [];
    state.transform.historyIndex = -1;
    
    showNotification('Smart Object rasterized');
}

// Filters and Effects
function applyFilter(filterType, options = {}) {
    if (!state.activeLayer) return;
    
    const ctx = state.activeLayer.canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, state.canvas.width, state.canvas.height);
    const data = imageData.data;
    
    switch (filterType) {
        case 'brightness':
            const brightness = options.value || 0;
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, Math.max(0, data[i] + brightness));
                data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + brightness));
                data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + brightness));
            }
            break;
            
        case 'contrast':
            const contrast = (options.value || 0) / 100;
            const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
            for (let i = 0; i < data.length; i += 4) {
                data[i] = factor * (data[i] - 128) + 128;
                data[i + 1] = factor * (data[i + 1] - 128) + 128;
                data[i + 2] = factor * (data[i + 2] - 128) + 128;
            }
            break;
            
        case 'grayscale':
            for (let i = 0; i < data.length; i += 4) {
                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                data[i] = data[i + 1] = data[i + 2] = gray;
            }
            break;
            
        case 'invert':
            for (let i = 0; i < data.length; i += 4) {
                data[i] = 255 - data[i];
                data[i + 1] = 255 - data[i + 1];
                data[i + 2] = 255 - data[i + 2];
            }
            break;
            
        case 'blur':
            // Simple box blur
            const radius = options.radius || 3;
            applyBoxBlur(imageData, radius);
            break;
            
        case 'sharpen':
            applySharpen(imageData);
            break;
            
        case 'godrays':
            applyGodrays(imageData, options);
            break;
            
        case 'sunlight':
            applySunlight(imageData, options);
            break;
            
        case 'moonlight':
            applyMoonlight(imageData, options);
            break;
            
        case 'fire':
            applyFireEffect(imageData, options);
            break;
            
        // Phase 9: Advanced Filters
        case 'gaussian-blur':
            applyGaussianBlur(imageData, options.radius || 5);
            break;
            
        case 'motion-blur':
            applyMotionBlur(imageData, options.distance || 10, options.angle || 0);
            break;
            
        case 'radial-blur':
            applyRadialBlur(imageData, options.centerX, options.centerY, options.strength || 0.1);
            break;
            
        case 'add-noise':
            applyAddNoise(imageData, options.amount || 25);
            break;
            
        case 'reduce-noise':
            applyReduceNoise(imageData, options.radius || 1);
            break;
            
        case 'oil-painting':
            applyOilPainting(imageData, options.radius || 4, options.intensity || 50);
            break;
            
        case 'watercolor':
            applyWatercolor(imageData, options.smoothness || 5, options.edgeDarken || 0.5);
            break;
            
        case 'posterize':
            applyPosterize(imageData, options.levels || 4);
            break;
            
        case 'mosaic':
            applyMosaic(imageData, options.blockSize || 10);
            break;
            
        case 'color-balance':
            applyColorBalance(imageData, options.shadows || {r: 0, g: 0, b: 0}, 
                            options.midtones || {r: 0, g: 0, b: 0}, 
                            options.highlights || {r: 0, g: 0, b: 0});
            break;
            
        case 'hue-saturation':
            applyHueSaturation(imageData, options.hue || 0, options.saturation || 0, options.lightness || 0);
            break;
            
        case 'pinch-bulge':
            applyPinchBulge(imageData, options.centerX, options.centerY, options.radius, options.strength || 0.5);
            break;
            
        case 'twirl':
            applyTwirl(imageData, options.centerX, options.centerY, options.radius, options.angle || 90);
            break;
            
        case 'wave':
            applyWave(imageData, options.amplitude || 10, options.wavelength || 50, options.direction || 'horizontal');
            break;
    }
    
    ctx.putImageData(imageData, 0, 0);
    compositeAllLayers();
    saveState();
}

function applyBoxBlur(imageData, radius) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const tempData = new Uint8ClampedArray(data);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, count = 0;
            
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const idx = (ny * width + nx) * 4;
                        r += tempData[idx];
                        g += tempData[idx + 1];
                        b += tempData[idx + 2];
                        count++;
                    }
                }
            }
            
            const idx = (y * width + x) * 4;
            data[idx] = r / count;
            data[idx + 1] = g / count;
            data[idx + 2] = b / count;
        }
    }
}

function applySharpen(imageData) {
    const kernel = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
    ];
    applyConvolution(imageData, kernel);
}

function applyConvolution(imageData, kernel) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const tempData = new Uint8ClampedArray(data);
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let r = 0, g = 0, b = 0;
            
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const idx = ((y + ky) * width + (x + kx)) * 4;
                    const weight = kernel[(ky + 1) * 3 + (kx + 1)];
                    r += tempData[idx] * weight;
                    g += tempData[idx + 1] * weight;
                    b += tempData[idx + 2] * weight;
                }
            }
            
            const idx = (y * width + x) * 4;
            data[idx] = Math.min(255, Math.max(0, r));
            data[idx + 1] = Math.min(255, Math.max(0, g));
            data[idx + 2] = Math.min(255, Math.max(0, b));
        }
    }
}

// Advanced Filters

function applyGodrays(imageData, options = {}) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    // Godrays parameters
    const centerX = options.centerX || width / 2;
    const centerY = options.centerY || height / 4; // Top-center by default
    const intensity = options.intensity || 0.4;
    const decay = options.decay || 0.95;
    const numSamples = options.samples || 50;
    
    // Create temp canvas for effect
    const tempData = new Uint8ClampedArray(data);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            
            // Calculate direction from center
            const dx = (x - centerX) / width;
            const dy = (y - centerY) / height;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Accumulate light samples along ray
            let rayR = 0, rayG = 0, rayB = 0;
            let weight = 1.0;
            
            for (let i = 0; i < numSamples; i++) {
                const t = i / numSamples;
                const sampleX = Math.floor(x - dx * t * 100);
                const sampleY = Math.floor(y - dy * t * 100);
                
                if (sampleX >= 0 && sampleX < width && sampleY >= 0 && sampleY < height) {
                    const sampleIdx = (sampleY * width + sampleX) * 4;
                    const brightness = (tempData[sampleIdx] + tempData[sampleIdx + 1] + tempData[sampleIdx + 2]) / 3;
                    
                    rayR += brightness * weight;
                    rayG += brightness * weight;
                    rayB += brightness * weight;
                    weight *= decay;
                }
            }
            
            // Blend with original
            const rayIntensity = intensity * (1 - Math.min(1, distance));
            data[idx] = Math.min(255, tempData[idx] + rayR * rayIntensity);
            data[idx + 1] = Math.min(255, tempData[idx + 1] + rayG * rayIntensity);
            data[idx + 2] = Math.min(255, tempData[idx + 2] + rayB * rayIntensity);
        }
    }
}

function applySunlight(imageData, options = {}) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    // Sunlight parameters (warm yellow-orange tint with highlights)
    const color = options.color || { r: 255, g: 240, b: 200 }; // Warm sunlight
    const intensity = options.intensity || 0.3;
    
    for (let i = 0; i < data.length; i += 4) {
        // Get luminance
        const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        
        // Apply highlight boost to brighter areas
        const highlightFactor = Math.pow(luminance / 255, 2) * intensity;
        
        // Blend sunlight color with original
        data[i] = Math.min(255, data[i] + color.r * highlightFactor);
        data[i + 1] = Math.min(255, data[i + 1] + color.g * highlightFactor);
        data[i + 2] = Math.min(255, data[i + 2] + color.b * highlightFactor);
    }
}

function applyMoonlight(imageData, options = {}) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    // Moonlight parameters (cool blue tint, less intense)
    const color = options.color || { r: 180, g: 200, b: 255 }; // Cool moonlight
    const intensity = options.intensity || 0.15; // Less intense than sunlight
    
    for (let i = 0; i < data.length; i += 4) {
        // Get luminance
        const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        
        // Apply subtle highlight to brighter areas
        const highlightFactor = Math.pow(luminance / 255, 2) * intensity;
        
        // Blend moonlight color with original
        data[i] = Math.min(255, data[i] + color.r * highlightFactor);
        data[i + 1] = Math.min(255, data[i + 1] + color.g * highlightFactor);
        data[i + 2] = Math.min(255, data[i + 2] + color.b * highlightFactor);
    }
}

function applyFireEffect(imageData, options = {}) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    // Fire parameters - creates a warm, glowing fire effect
    const intensity = options.intensity || 0.5;
    const warmth = options.warmth || 0.8; // How much to shift toward red/orange
    
    for (let i = 0; i < data.length; i += 4) {
        // Get luminance
        const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        
        // Enhance bright areas with fire colors (yellows and oranges)
        const fireFactor = Math.pow(luminance / 255, 1.5) * intensity;
        
        // Apply fire gradient: bright areas become yellow/orange, darker areas become red
        const redBoost = 255 * warmth * fireFactor;
        const greenBoost = 180 * warmth * fireFactor * (luminance / 255); // Less green in darker areas
        const blueReduction = luminance * 0.3 * fireFactor; // Reduce blue for warmth
        
        // Apply fire effect
        data[i] = Math.min(255, data[i] + redBoost);
        data[i + 1] = Math.min(255, data[i + 1] + greenBoost);
        data[i + 2] = Math.max(0, data[i + 2] - blueReduction);
        
        // Add slight contrast boost for more dramatic effect
        const contrastFactor = 1.2;
        data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrastFactor + 128));
        data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrastFactor + 128));
        data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrastFactor + 128));
    }
}

// ============================================================================
// PHASE 9: ADVANCED FILTERS
// ============================================================================

// Gaussian Blur - smoother than box blur
function applyGaussianBlur(imageData, radius = 5) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    // Generate Gaussian kernel
    const kernel = [];
    const sigma = radius / 3;
    let sum = 0;
    for (let i = -radius; i <= radius; i++) {
        const value = Math.exp(-(i * i) / (2 * sigma * sigma));
        kernel.push(value);
        sum += value;
    }
    // Normalize kernel
    for (let i = 0; i < kernel.length; i++) {
        kernel[i] /= sum;
    }
    
    const tempData = new Uint8ClampedArray(data);
    
    // Horizontal pass
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, a = 0;
            for (let i = -radius; i <= radius; i++) {
                const nx = Math.min(width - 1, Math.max(0, x + i));
                const idx = (y * width + nx) * 4;
                const weight = kernel[i + radius];
                r += tempData[idx] * weight;
                g += tempData[idx + 1] * weight;
                b += tempData[idx + 2] * weight;
                a += tempData[idx + 3] * weight;
            }
            const idx = (y * width + x) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            data[idx + 3] = a;
        }
    }
    
    // Copy result for vertical pass
    tempData.set(data);
    
    // Vertical pass
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, a = 0;
            for (let i = -radius; i <= radius; i++) {
                const ny = Math.min(height - 1, Math.max(0, y + i));
                const idx = (ny * width + x) * 4;
                const weight = kernel[i + radius];
                r += tempData[idx] * weight;
                g += tempData[idx + 1] * weight;
                b += tempData[idx + 2] * weight;
                a += tempData[idx + 3] * weight;
            }
            const idx = (y * width + x) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            data[idx + 3] = a;
        }
    }
}

// Motion Blur
function applyMotionBlur(imageData, distance = 10, angle = 0) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const tempData = new Uint8ClampedArray(data);
    
    const rad = angle * Math.PI / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, a = 0, count = 0;
            
            for (let i = 0; i < distance; i++) {
                const nx = Math.floor(x + dx * i);
                const ny = Math.floor(y + dy * i);
                
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const idx = (ny * width + nx) * 4;
                    r += tempData[idx];
                    g += tempData[idx + 1];
                    b += tempData[idx + 2];
                    a += tempData[idx + 3];
                    count++;
                }
            }
            
            if (count > 0) {
                const idx = (y * width + x) * 4;
                data[idx] = r / count;
                data[idx + 1] = g / count;
                data[idx + 2] = b / count;
                data[idx + 3] = a / count;
            }
        }
    }
}

// Radial Blur
function applyRadialBlur(imageData, centerX, centerY, strength = 0.1) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const tempData = new Uint8ClampedArray(data);
    
    const cx = centerX || width / 2;
    const cy = centerY || height / 2;
    const samples = 10;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const blur = distance * strength;
            
            let r = 0, g = 0, b = 0, a = 0;
            
            for (let i = 0; i < samples; i++) {
                const t = i / samples;
                const offset = blur * (t - 0.5);
                const nx = Math.floor(cx + dx * (1 - offset / distance));
                const ny = Math.floor(cy + dy * (1 - offset / distance));
                
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const idx = (ny * width + nx) * 4;
                    r += tempData[idx];
                    g += tempData[idx + 1];
                    b += tempData[idx + 2];
                    a += tempData[idx + 3];
                }
            }
            
            const idx = (y * width + x) * 4;
            data[idx] = r / samples;
            data[idx + 1] = g / samples;
            data[idx + 2] = b / samples;
            data[idx + 3] = a / samples;
        }
    }
}

// Add Noise
function applyAddNoise(imageData, amount = 25) {
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * amount * 2;
        data[i] = Math.min(255, Math.max(0, data[i] + noise));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
}

// Reduce Noise (median filter)
function applyReduceNoise(imageData, radius = 1) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const tempData = new Uint8ClampedArray(data);
    
    for (let y = radius; y < height - radius; y++) {
        for (let x = radius; x < width - radius; x++) {
            const rValues = [], gValues = [], bValues = [];
            
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const idx = ((y + dy) * width + (x + dx)) * 4;
                    rValues.push(tempData[idx]);
                    gValues.push(tempData[idx + 1]);
                    bValues.push(tempData[idx + 2]);
                }
            }
            
            rValues.sort((a, b) => a - b);
            gValues.sort((a, b) => a - b);
            bValues.sort((a, b) => a - b);
            
            const median = Math.floor(rValues.length / 2);
            const idx = (y * width + x) * 4;
            data[idx] = rValues[median];
            data[idx + 1] = gValues[median];
            data[idx + 2] = bValues[median];
        }
    }
}

// Oil Painting Effect
function applyOilPainting(imageData, radius = 4, intensity = 50) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const tempData = new Uint8ClampedArray(data);
    
    for (let y = radius; y < height - radius; y++) {
        for (let x = radius; x < width - radius; x++) {
            const intensityBins = new Array(intensity + 1).fill(0);
            const rBins = new Array(intensity + 1).fill(0);
            const gBins = new Array(intensity + 1).fill(0);
            const bBins = new Array(intensity + 1).fill(0);
            
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const idx = ((y + dy) * width + (x + dx)) * 4;
                    const r = tempData[idx];
                    const g = tempData[idx + 1];
                    const b = tempData[idx + 2];
                    const curIntensity = Math.floor(((r + g + b) / 3) * intensity / 255);
                    
                    intensityBins[curIntensity]++;
                    rBins[curIntensity] += r;
                    gBins[curIntensity] += g;
                    bBins[curIntensity] += b;
                }
            }
            
            let maxIndex = 0;
            for (let i = 1; i <= intensity; i++) {
                if (intensityBins[i] > intensityBins[maxIndex]) {
                    maxIndex = i;
                }
            }
            
            const idx = (y * width + x) * 4;
            const count = intensityBins[maxIndex];
            if (count > 0) {
                data[idx] = rBins[maxIndex] / count;
                data[idx + 1] = gBins[maxIndex] / count;
                data[idx + 2] = bBins[maxIndex] / count;
            }
        }
    }
}

// Watercolor Effect
function applyWatercolor(imageData, smoothness = 5, edgeDarken = 0.5) {
    const width = imageData.width;
    const height = imageData.height;
    
    // Apply smoothing
    applyGaussianBlur(imageData, smoothness);
    
    // Detect and darken edges
    const data = imageData.data;
    const tempData = new Uint8ClampedArray(data);
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let edgeStrength = 0;
            
            for (let c = 0; c < 3; c++) {
                const idx = (y * width + x) * 4 + c;
                const gx = -tempData[((y - 1) * width + (x - 1)) * 4 + c] + tempData[((y - 1) * width + (x + 1)) * 4 + c]
                          -2 * tempData[(y * width + (x - 1)) * 4 + c] + 2 * tempData[(y * width + (x + 1)) * 4 + c]
                          -tempData[((y + 1) * width + (x - 1)) * 4 + c] + tempData[((y + 1) * width + (x + 1)) * 4 + c];
                
                const gy = -tempData[((y - 1) * width + (x - 1)) * 4 + c] - 2 * tempData[((y - 1) * width + x) * 4 + c] - tempData[((y - 1) * width + (x + 1)) * 4 + c]
                          +tempData[((y + 1) * width + (x - 1)) * 4 + c] + 2 * tempData[((y + 1) * width + x) * 4 + c] + tempData[((y + 1) * width + (x + 1)) * 4 + c];
                
                edgeStrength += Math.sqrt(gx * gx + gy * gy);
            }
            
            const idx = (y * width + x) * 4;
            const darken = 1 - Math.min(1, edgeStrength / 1000 * edgeDarken);
            data[idx] *= darken;
            data[idx + 1] *= darken;
            data[idx + 2] *= darken;
        }
    }
}

// Posterize
function applyPosterize(imageData, levels = 4) {
    const data = imageData.data;
    const step = 256 / levels;
    
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.floor(data[i] / step) * step;
        data[i + 1] = Math.floor(data[i + 1] / step) * step;
        data[i + 2] = Math.floor(data[i + 2] / step) * step;
    }
}

// Mosaic/Pixelate
function applyMosaic(imageData, blockSize = 10) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    for (let y = 0; y < height; y += blockSize) {
        for (let x = 0; x < width; x += blockSize) {
            let r = 0, g = 0, b = 0, a = 0, count = 0;
            
            // Calculate average color in block
            for (let dy = 0; dy < blockSize && y + dy < height; dy++) {
                for (let dx = 0; dx < blockSize && x + dx < width; dx++) {
                    const idx = ((y + dy) * width + (x + dx)) * 4;
                    r += data[idx];
                    g += data[idx + 1];
                    b += data[idx + 2];
                    a += data[idx + 3];
                    count++;
                }
            }
            
            r /= count;
            g /= count;
            b /= count;
            a /= count;
            
            // Fill block with average color
            for (let dy = 0; dy < blockSize && y + dy < height; dy++) {
                for (let dx = 0; dx < blockSize && x + dx < width; dx++) {
                    const idx = ((y + dy) * width + (x + dx)) * 4;
                    data[idx] = r;
                    data[idx + 1] = g;
                    data[idx + 2] = b;
                    data[idx + 3] = a;
                }
            }
        }
    }
}

// Color Balance
function applyColorBalance(imageData, shadows = {r: 0, g: 0, b: 0}, midtones = {r: 0, g: 0, b: 0}, highlights = {r: 0, g: 0, b: 0}) {
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Calculate luminance
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const lumNorm = lum / 255;
        
        // Calculate weights for shadows, midtones, highlights
        const shadowWeight = Math.pow(1 - lumNorm, 2);
        const highlightWeight = Math.pow(lumNorm, 2);
        const midtoneWeight = 1 - shadowWeight - highlightWeight;
        
        // Apply adjustments
        data[i] += shadows.r * shadowWeight + midtones.r * midtoneWeight + highlights.r * highlightWeight;
        data[i + 1] += shadows.g * shadowWeight + midtones.g * midtoneWeight + highlights.g * highlightWeight;
        data[i + 2] += shadows.b * shadowWeight + midtones.b * midtoneWeight + highlights.b * highlightWeight;
        
        // Clamp values
        data[i] = Math.min(255, Math.max(0, data[i]));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1]));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2]));
    }
}

// Hue/Saturation adjustment
function applyHueSaturation(imageData, hueShift = 0, saturation = 0, lightness = 0) {
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;
        
        // RGB to HSL
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        
        // Apply adjustments
        h = (h + hueShift / 360) % 1;
        if (h < 0) h += 1;
        s = Math.max(0, Math.min(1, s + saturation / 100));
        l = Math.max(0, Math.min(1, l + lightness / 100));
        
        // HSL to RGB
        let r2, g2, b2;
        if (s === 0) {
            r2 = g2 = b2 = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r2 = hue2rgb(p, q, h + 1/3);
            g2 = hue2rgb(p, q, h);
            b2 = hue2rgb(p, q, h - 1/3);
        }
        
        data[i] = r2 * 255;
        data[i + 1] = g2 * 255;
        data[i + 2] = b2 * 255;
    }
}

// Pinch/Bulge
function applyPinchBulge(imageData, centerX, centerY, radius, strength) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const tempData = new Uint8ClampedArray(data);
    
    const cx = centerX || width / 2;
    const cy = centerY || height / 2;
    const r = radius || Math.min(width, height) / 4;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < r) {
                const amount = Math.pow(distance / r, 2);
                const distort = 1 - strength * (1 - amount);
                
                const nx = Math.floor(cx + dx * distort);
                const ny = Math.floor(cy + dy * distort);
                
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const srcIdx = (ny * width + nx) * 4;
                    const dstIdx = (y * width + x) * 4;
                    data[dstIdx] = tempData[srcIdx];
                    data[dstIdx + 1] = tempData[srcIdx + 1];
                    data[dstIdx + 2] = tempData[srcIdx + 2];
                    data[dstIdx + 3] = tempData[srcIdx + 3];
                }
            }
        }
    }
}

// Twirl
function applyTwirl(imageData, centerX, centerY, radius, angle) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const tempData = new Uint8ClampedArray(data);
    
    const cx = centerX || width / 2;
    const cy = centerY || height / 2;
    const r = radius || Math.min(width, height) / 4;
    const angleRad = angle * Math.PI / 180;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < r) {
                const factor = 1 - distance / r;
                const twist = factor * angleRad;
                
                const cos = Math.cos(twist);
                const sin = Math.sin(twist);
                
                const nx = Math.floor(cx + dx * cos - dy * sin);
                const ny = Math.floor(cy + dx * sin + dy * cos);
                
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const srcIdx = (ny * width + nx) * 4;
                    const dstIdx = (y * width + x) * 4;
                    data[dstIdx] = tempData[srcIdx];
                    data[dstIdx + 1] = tempData[srcIdx + 1];
                    data[dstIdx + 2] = tempData[srcIdx + 2];
                    data[dstIdx + 3] = tempData[srcIdx + 3];
                }
            }
        }
    }
}

// Wave
function applyWave(imageData, amplitude = 10, wavelength = 50, direction = 'horizontal') {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const tempData = new Uint8ClampedArray(data);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let nx, ny;
            
            if (direction === 'horizontal') {
                const offset = Math.sin(x / wavelength * 2 * Math.PI) * amplitude;
                nx = x;
                ny = Math.floor(y + offset);
            } else {
                const offset = Math.sin(y / wavelength * 2 * Math.PI) * amplitude;
                nx = Math.floor(x + offset);
                ny = y;
            }
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const srcIdx = (ny * width + nx) * 4;
                const dstIdx = (y * width + x) * 4;
                data[dstIdx] = tempData[srcIdx];
                data[dstIdx + 1] = tempData[srcIdx + 1];
                data[dstIdx + 2] = tempData[srcIdx + 2];
                data[dstIdx + 3] = tempData[srcIdx + 3];
            }
        }
    }
}

// ============================================================================
// PHOTO-TO-PAINT FILTER SYSTEM
// ============================================================================

// Global state for photo-to-paint preview
const photoPaintState = {
    previewActive: false,
    previewCanvas: null,
    originalImageData: null,
    presets: {}
};

// Load presets from localStorage on startup
function loadPhotoPaintPresets() {
    const stored = localStorage.getItem('photoPaintPresets');
    if (stored) {
        try {
            photoPaintState.presets = JSON.parse(stored);
        } catch (e) {
            console.error('Error loading photo-to-paint presets:', e);
            photoPaintState.presets = {};
        }
    }
}

// Save presets to localStorage
function savePhotoPaintPresets() {
    localStorage.setItem('photoPaintPresets', JSON.stringify(photoPaintState.presets));
}

// Main function to apply photo-to-paint styles
function applyPhotoToPaint(styleType, options = {}) {
    if (!state.activeLayer) return;
    
    const ctx = state.activeLayer.canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, state.canvas.width, state.canvas.height);
    
    switch (styleType) {
        case 'oil':
            applyOilPaintStyle(imageData, options);
            break;
        case 'acrylic':
            applyAcrylicStyle(imageData, options);
            break;
        case 'watercolor':
            applyWatercolorStyle(imageData, options);
            break;
        case 'comic':
            applyComicBookStyle(imageData, options);
            break;
        case 'cartoon':
            applyCartoonStyle(imageData, options);
            break;
        case 'anime':
            applyAnimeStyle(imageData, options);
            break;
        case 'concept-art':
            applyConceptArtStyle(imageData, options);
            break;
        case 'pastel':
            applyPastelStyle(imageData, options);
            break;
        case 'sketch':
            applySketchStyle(imageData, options);
            break;
        case 'gouache':
            applyGouacheStyle(imageData, options);
            break;
    }
    
    ctx.putImageData(imageData, 0, 0);
    compositeAllLayers();
    saveState();
}

// Preview photo-to-paint style (non-destructive)
function previewPhotoToPaint(styleType, options = {}) {
    if (!state.activeLayer) return;
    
    const ctx = state.activeLayer.canvas.getContext('2d');
    
    // Store original image data if not already stored
    if (!photoPaintState.previewActive) {
        photoPaintState.originalImageData = ctx.getImageData(0, 0, state.canvas.width, state.canvas.height);
        photoPaintState.previewActive = true;
    }
    
    // Apply style to a copy
    const imageData = ctx.getImageData(0, 0, state.canvas.width, state.canvas.height);
    
    switch (styleType) {
        case 'oil':
            applyOilPaintStyle(imageData, options);
            break;
        case 'acrylic':
            applyAcrylicStyle(imageData, options);
            break;
        case 'watercolor':
            applyWatercolorStyle(imageData, options);
            break;
        case 'comic':
            applyComicBookStyle(imageData, options);
            break;
        case 'cartoon':
            applyCartoonStyle(imageData, options);
            break;
        case 'anime':
            applyAnimeStyle(imageData, options);
            break;
        case 'concept-art':
            applyConceptArtStyle(imageData, options);
            break;
        case 'pastel':
            applyPastelStyle(imageData, options);
            break;
        case 'sketch':
            applySketchStyle(imageData, options);
            break;
        case 'gouache':
            applyGouacheStyle(imageData, options);
            break;
    }
    
    ctx.putImageData(imageData, 0, 0);
    compositeAllLayers();
}

// Cancel preview and restore original
function cancelPhotoPaintPreview() {
    if (photoPaintState.previewActive && photoPaintState.originalImageData) {
        const ctx = state.activeLayer.canvas.getContext('2d');
        ctx.putImageData(photoPaintState.originalImageData, 0, 0);
        compositeAllLayers();
        photoPaintState.previewActive = false;
        photoPaintState.originalImageData = null;
    }
}

// Apply preview permanently
function applyPhotoPaintPreview() {
    if (photoPaintState.previewActive) {
        saveState();
        photoPaintState.previewActive = false;
        photoPaintState.originalImageData = null;
    }
}

// Batch apply style to multiple layers
function batchApplyPhotoToPaint(styleType, options = {}, layerIndices = []) {
    if (layerIndices.length === 0) {
        alert('No layers selected for batch processing');
        return;
    }
    
    const originalActiveLayer = state.activeLayer;
    
    layerIndices.forEach(index => {
        if (index >= 0 && index < state.layers.length) {
            state.activeLayer = state.layers[index];
            const ctx = state.activeLayer.canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, state.canvas.width, state.canvas.height);
            
            switch (styleType) {
                case 'oil':
                    applyOilPaintStyle(imageData, options);
                    break;
                case 'acrylic':
                    applyAcrylicStyle(imageData, options);
                    break;
                case 'watercolor':
                    applyWatercolorStyle(imageData, options);
                    break;
                case 'comic':
                    applyComicBookStyle(imageData, options);
                    break;
                case 'cartoon':
                    applyCartoonStyle(imageData, options);
                    break;
                case 'anime':
                    applyAnimeStyle(imageData, options);
                    break;
                case 'concept-art':
                    applyConceptArtStyle(imageData, options);
                    break;
                case 'pastel':
                    applyPastelStyle(imageData, options);
                    break;
                case 'sketch':
                    applySketchStyle(imageData, options);
                    break;
                case 'gouache':
                    applyGouacheStyle(imageData, options);
                    break;
            }
            
            ctx.putImageData(imageData, 0, 0);
        }
    });
    
    state.activeLayer = originalActiveLayer;
    compositeAllLayers();
    saveState();
}

// Style blending - blend two styles together
function applyBlendedPhotoToPaint(style1, options1, style2, options2, blendRatio = 0.5) {
    if (!state.activeLayer) return;
    
    const ctx = state.activeLayer.canvas.getContext('2d');
    const width = state.canvas.width;
    const height = state.canvas.height;
    
    // Get original image data
    const originalData = ctx.getImageData(0, 0, width, height);
    
    // Apply first style
    const imageData1 = ctx.getImageData(0, 0, width, height);
    applyStyleToImageData(style1, imageData1, options1);
    
    // Apply second style to original
    const imageData2 = new ImageData(new Uint8ClampedArray(originalData.data), width, height);
    applyStyleToImageData(style2, imageData2, options2);
    
    // Blend the two results
    const blendedData = ctx.createImageData(width, height);
    for (let i = 0; i < blendedData.data.length; i += 4) {
        blendedData.data[i] = imageData1.data[i] * blendRatio + imageData2.data[i] * (1 - blendRatio);
        blendedData.data[i + 1] = imageData1.data[i + 1] * blendRatio + imageData2.data[i + 1] * (1 - blendRatio);
        blendedData.data[i + 2] = imageData1.data[i + 2] * blendRatio + imageData2.data[i + 2] * (1 - blendRatio);
        blendedData.data[i + 3] = imageData1.data[i + 3]; // Keep original alpha
    }
    
    ctx.putImageData(blendedData, 0, 0);
    compositeAllLayers();
    saveState();
}

// Helper to apply style to image data
function applyStyleToImageData(styleType, imageData, options) {
    switch (styleType) {
        case 'oil':
            applyOilPaintStyle(imageData, options);
            break;
        case 'acrylic':
            applyAcrylicStyle(imageData, options);
            break;
        case 'watercolor':
            applyWatercolorStyle(imageData, options);
            break;
        case 'comic':
            applyComicBookStyle(imageData, options);
            break;
        case 'cartoon':
            applyCartoonStyle(imageData, options);
            break;
        case 'anime':
            applyAnimeStyle(imageData, options);
            break;
        case 'concept-art':
            applyConceptArtStyle(imageData, options);
            break;
        case 'pastel':
            applyPastelStyle(imageData, options);
            break;
        case 'sketch':
            applySketchStyle(imageData, options);
            break;
        case 'gouache':
            applyGouacheStyle(imageData, options);
            break;
    }
}

// Oil Paint Style - Rich colors, visible brush strokes, impasto effect
function applyOilPaintStyle(imageData, options = {}) {
    const brushSize = options.brushSize || 5;
    const detail = options.detail || 0.5;
    const impasto = options.impasto || 0.7;
    const colorIntensity = options.colorIntensity || 1.2;
    
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const tempData = new Uint8ClampedArray(data);
    
    // First pass: Oil paint strokes with neighborhood averaging
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, count = 0;
            let variance = 0;
            
            // Sample neighborhood
            for (let dy = -brushSize; dy <= brushSize; dy++) {
                for (let dx = -brushSize; dx <= brushSize; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const idx = (ny * width + nx) * 4;
                        r += tempData[idx];
                        g += tempData[idx + 1];
                        b += tempData[idx + 2];
                        count++;
                    }
                }
            }
            
            r /= count;
            g /= count;
            b /= count;
            
            // Enhance color intensity
            r *= colorIntensity;
            g *= colorIntensity;
            b *= colorIntensity;
            
            // Add impasto texture variation
            if (impasto > 0) {
                const noise = (Math.random() - 0.5) * impasto * 20;
                r += noise;
                g += noise;
                b += noise;
            }
            
            const idx = (y * width + x) * 4;
            data[idx] = Math.min(255, Math.max(0, r));
            data[idx + 1] = Math.min(255, Math.max(0, g));
            data[idx + 2] = Math.min(255, Math.max(0, b));
        }
    }
    
    // Second pass: Edge enhancement for brush strokes
    if (detail > 0.3) {
        const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
        applyConvolution(imageData, kernel);
    }
}

// Acrylic Style - Bold colors, flat areas, crisp edges
function applyAcrylicStyle(imageData, options = {}) {
    const colorSteps = Math.floor(options.colorSteps || 8);
    const edgeThreshold = options.edgeThreshold || 30;
    const saturation = options.saturation || 1.3;
    
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    // Posterize colors for flat acrylic look
    for (let i = 0; i < data.length; i += 4) {
        // Convert to HSL for saturation boost
        const r = data[i] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;
        
        let h, s;
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            s *= saturation; // Boost saturation
            s = Math.min(1, s);
            
            if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h /= 6;
        }
        
        // Convert back to RGB
        let newR, newG, newB;
        if (s === 0) {
            newR = newG = newB = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            newR = hue2rgb(p, q, h + 1/3);
            newG = hue2rgb(p, q, h);
            newB = hue2rgb(p, q, h - 1/3);
        }
        
        // Posterize
        newR = Math.round(newR * colorSteps) / colorSteps;
        newG = Math.round(newG * colorSteps) / colorSteps;
        newB = Math.round(newB * colorSteps) / colorSteps;
        
        data[i] = newR * 255;
        data[i + 1] = newG * 255;
        data[i + 2] = newB * 255;
    }
}

// Watercolor Style - Soft edges, color bleeding, translucent layers
function applyWatercolorStyle(imageData, options = {}) {
    const wetness = options.wetness || 0.6;
    const bleed = options.bleed || 0.5;
    const paperTexture = options.paperTexture || 0.3;
    
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const tempData = new Uint8ClampedArray(data);
    
    // First pass: Soft blur for wet-on-wet effect
    const blurRadius = Math.ceil(3 * wetness);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, count = 0;
            
            for (let dy = -blurRadius; dy <= blurRadius; dy++) {
                for (let dx = -blurRadius; dx <= blurRadius; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const idx = (ny * width + nx) * 4;
                        r += tempData[idx];
                        g += tempData[idx + 1];
                        b += tempData[idx + 2];
                        count++;
                    }
                }
            }
            
            const idx = (y * width + x) * 4;
            data[idx] = r / count;
            data[idx + 1] = g / count;
            data[idx + 2] = b / count;
        }
    }
    
    // Second pass: Add paper texture and lighten for watercolor transparency
    for (let i = 0; i < data.length; i += 4) {
        // Lighten for watercolor effect
        data[i] = Math.min(255, data[i] + 20);
        data[i + 1] = Math.min(255, data[i + 1] + 20);
        data[i + 2] = Math.min(255, data[i + 2] + 20);
        
        // Add paper texture noise
        const noise = (Math.random() - 0.5) * paperTexture * 15;
        data[i] = Math.min(255, Math.max(0, data[i] + noise));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
}

// Comic Book Style - Bold outlines, flat colors, halftone shading
function applyComicBookStyle(imageData, options = {}) {
    const outlineThickness = options.outlineThickness || 2;
    const colorLevels = Math.floor(options.colorLevels || 4);
    const halftone = options.halftone || 0.5;
    
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const tempData = new Uint8ClampedArray(data);
    
    // First pass: Edge detection for outlines
    const edges = new Uint8ClampedArray(width * height);
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            
            // Sobel edge detection
            let gx = 0, gy = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const nidx = ((y + ky) * width + (x + kx)) * 4;
                    const intensity = (tempData[nidx] + tempData[nidx + 1] + tempData[nidx + 2]) / 3;
                    
                    // Sobel kernels
                    const gxKernel = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
                    const gyKernel = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
                    const kidx = (ky + 1) * 3 + (kx + 1);
                    
                    gx += intensity * gxKernel[kidx];
                    gy += intensity * gyKernel[kidx];
                }
            }
            
            const magnitude = Math.sqrt(gx * gx + gy * gy);
            edges[y * width + x] = magnitude > 50 ? 255 : 0;
        }
    }
    
    // Second pass: Posterize colors and apply outlines
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            
            // Check if this is an edge pixel
            if (edges[y * width + x] > 0) {
                // Draw black outline
                data[idx] = 0;
                data[idx + 1] = 0;
                data[idx + 2] = 0;
            } else {
                // Posterize colors
                data[idx] = Math.round(data[idx] / 255 * colorLevels) * (255 / colorLevels);
                data[idx + 1] = Math.round(data[idx + 1] / 255 * colorLevels) * (255 / colorLevels);
                data[idx + 2] = Math.round(data[idx + 2] / 255 * colorLevels) * (255 / colorLevels);
                
                // Add halftone pattern in darker areas
                const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                if (brightness < 128 && halftone > 0) {
                    const pattern = (Math.sin(x * 0.3) + Math.sin(y * 0.3)) * halftone * 20;
                    data[idx] = Math.min(255, data[idx] + pattern);
                    data[idx + 1] = Math.min(255, data[idx + 1] + pattern);
                    data[idx + 2] = Math.min(255, data[idx + 2] + pattern);
                }
            }
        }
    }
}

// Cartoon Style - Simplified colors, smooth shading, bold outlines
function applyCartoonStyle(imageData, options = {}) {
    const smoothness = options.smoothness || 0.7;
    const colorSimplification = Math.floor(options.colorSimplification || 6);
    const outlineStrength = options.outlineStrength || 0.8;
    
    // Apply bilateral filter for smooth but edge-preserving blur
    applyBilateralFilter(imageData, smoothness);
    
    // Posterize colors
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.round(data[i] / 255 * colorSimplification) * (255 / colorSimplification);
        data[i + 1] = Math.round(data[i + 1] / 255 * colorSimplification) * (255 / colorSimplification);
        data[i + 2] = Math.round(data[i + 2] / 255 * colorSimplification) * (255 / colorSimplification);
    }
}

// Anime Style - Clean cel shading, precise edges, vibrant colors
function applyAnimeStyle(imageData, options = {}) {
    const celLevels = Math.floor(options.celLevels || 3);
    const edgeThickness = options.edgeThickness || 1;
    const saturation = options.saturation || 1.4;
    
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const tempData = new Uint8ClampedArray(data);
    
    // First pass: Boost saturation
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;
        
        let h, s;
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            s = Math.min(1, s * saturation);
            
            if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h /= 6;
        }
        
        // Convert back to RGB
        let newR, newG, newB;
        if (s === 0) {
            newR = newG = newB = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            newR = hue2rgb(p, q, h + 1/3);
            newG = hue2rgb(p, q, h);
            newB = hue2rgb(p, q, h - 1/3);
        }
        
        // Cel shade
        newR = Math.round(newR * celLevels) / celLevels;
        newG = Math.round(newG * celLevels) / celLevels;
        newB = Math.round(newB * celLevels) / celLevels;
        
        data[i] = newR * 255;
        data[i + 1] = newG * 255;
        data[i + 2] = newB * 255;
    }
    
    // Second pass: Add thin precise outlines
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            const current = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            
            // Check neighbors for edge
            let isEdge = false;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nidx = ((y + dy) * width + (x + dx)) * 4;
                    const neighbor = (data[nidx] + data[nidx + 1] + data[nidx + 2]) / 3;
                    if (Math.abs(current - neighbor) > 30) {
                        isEdge = true;
                        break;
                    }
                }
                if (isEdge) break;
            }
            
            if (isEdge) {
                data[idx] = 0;
                data[idx + 1] = 0;
                data[idx + 2] = 0;
            }
        }
    }
}

// Concept Art Style - Painterly, atmospheric, soft focus with details
function applyConceptArtStyle(imageData, options = {}) {
    const atmosphericDepth = options.atmosphericDepth || 0.5;
    const painterly = options.painterly || 0.6;
    const colorMood = options.colorMood || 'neutral'; // 'warm', 'cool', 'neutral'
    
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    // First pass: Atmospheric perspective (lighter/hazier in distance)
    const centerY = height / 2;
    for (let y = 0; y < height; y++) {
        const depth = Math.abs(y - centerY) / centerY;
        const hazeFactor = depth * atmosphericDepth * 0.3;
        
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            
            // Add atmospheric haze
            data[idx] = Math.min(255, data[idx] + hazeFactor * 50);
            data[idx + 1] = Math.min(255, data[idx + 1] + hazeFactor * 50);
            data[idx + 2] = Math.min(255, data[idx + 2] + hazeFactor * 50);
        }
    }
    
    // Second pass: Apply color mood
    for (let i = 0; i < data.length; i += 4) {
        if (colorMood === 'warm') {
            data[i] = Math.min(255, data[i] * 1.1);
            data[i + 1] = Math.min(255, data[i + 1] * 1.05);
            data[i + 2] = Math.max(0, data[i + 2] * 0.9);
        } else if (colorMood === 'cool') {
            data[i] = Math.max(0, data[i] * 0.9);
            data[i + 1] = Math.min(255, data[i + 1] * 1.05);
            data[i + 2] = Math.min(255, data[i + 2] * 1.1);
        }
    }
    
    // Third pass: Painterly texture
    if (painterly > 0) {
        const tempData = new Uint8ClampedArray(data);
        const brushSize = Math.ceil(3 * painterly);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, count = 0;
                
                for (let dy = -brushSize; dy <= brushSize; dy++) {
                    for (let dx = -brushSize; dx <= brushSize; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const idx = (ny * width + nx) * 4;
                            r += tempData[idx];
                            g += tempData[idx + 1];
                            b += tempData[idx + 2];
                            count++;
                        }
                    }
                }
                
                const idx = (y * width + x) * 4;
                data[idx] = r / count;
                data[idx + 1] = g / count;
                data[idx + 2] = b / count;
            }
        }
    }
}

// Helper function: Bilateral filter for edge-preserving smoothing
function applyBilateralFilter(imageData, strength) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const tempData = new Uint8ClampedArray(data);
    
    const spatialSigma = 5 * strength;
    const rangeSigma = 50 * strength;
    const radius = Math.ceil(spatialSigma * 2);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const centerR = tempData[idx];
            const centerG = tempData[idx + 1];
            const centerB = tempData[idx + 2];
            
            let r = 0, g = 0, b = 0, weightSum = 0;
            
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const nidx = (ny * width + nx) * 4;
                        const nR = tempData[nidx];
                        const nG = tempData[nidx + 1];
                        const nB = tempData[nidx + 2];
                        
                        // Spatial weight
                        const spatialDist = dx * dx + dy * dy;
                        const spatialWeight = Math.exp(-spatialDist / (2 * spatialSigma * spatialSigma));
                        
                        // Range weight
                        const colorDist = (nR - centerR) ** 2 + (nG - centerG) ** 2 + (nB - centerB) ** 2;
                        const rangeWeight = Math.exp(-colorDist / (2 * rangeSigma * rangeSigma));
                        
                        const weight = spatialWeight * rangeWeight;
                        r += nR * weight;
                        g += nG * weight;
                        b += nB * weight;
                        weightSum += weight;
                    }
                }
            }
            
            if (weightSum > 0) {
                data[idx] = r / weightSum;
                data[idx + 1] = g / weightSum;
                data[idx + 2] = b / weightSum;
            }
        }
    }
}

// Pastel Style - Soft, muted colors with chalk-like texture
function applyPastelStyle(imageData, options = {}) {
    const softness = options.softness || 0.7;
    const chalkiness = options.chalkiness || 0.6;
    const colorVibrancy = options.colorVibrancy || 0.8;
    
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const tempData = new Uint8ClampedArray(data);
    
    // First pass: Soften with mild blur
    const blurRadius = Math.ceil(2 * softness);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, count = 0;
            
            for (let dy = -blurRadius; dy <= blurRadius; dy++) {
                for (let dx = -blurRadius; dx <= blurRadius; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const idx = (ny * width + nx) * 4;
                        r += tempData[idx];
                        g += tempData[idx + 1];
                        b += tempData[idx + 2];
                        count++;
                    }
                }
            }
            
            const idx = (y * width + x) * 4;
            data[idx] = r / count;
            data[idx + 1] = g / count;
            data[idx + 2] = b / count;
        }
    }
    
    // Second pass: Reduce saturation and lighten for pastel effect
    for (let i = 0; i < data.length; i += 4) {
        let r = data[i] / 255;
        let g = data[i + 1] / 255;
        let b = data[i + 2] / 255;
        
        // Convert to HSL
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let l = (max + min) / 2;
        
        let h, s;
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h /= 6;
        }
        
        // Reduce saturation and lighten
        s *= colorVibrancy;
        l = l * 0.7 + 0.3; // Lighten towards white
        
        // Convert back to RGB
        let newR, newG, newB;
        if (s === 0) {
            newR = newG = newB = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            newR = hue2rgb(p, q, h + 1/3);
            newG = hue2rgb(p, q, h);
            newB = hue2rgb(p, q, h - 1/3);
        }
        
        data[i] = newR * 255;
        data[i + 1] = newG * 255;
        data[i + 2] = newB * 255;
        
        // Add chalk texture noise
        const noise = (Math.random() - 0.5) * chalkiness * 25;
        data[i] = Math.min(255, Math.max(0, data[i] + noise));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
}

// Sketch Style - Pencil drawing with hatching and shading
function applySketchStyle(imageData, options = {}) {
    const lineIntensity = options.lineIntensity || 0.8;
    const shading = options.shading || 0.6;
    const detail = options.detail || 0.7;
    
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const tempData = new Uint8ClampedArray(data);
    
    // Convert to grayscale first
    for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        data[i] = data[i + 1] = data[i + 2] = gray;
    }
    
    // Edge detection for sketch lines
    const edges = new Uint8ClampedArray(width * height);
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            
            // Sobel edge detection
            let gx = 0, gy = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const nidx = ((y + ky) * width + (x + kx)) * 4;
                    const intensity = data[nidx];
                    
                    const gxKernel = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
                    const gyKernel = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
                    const kidx = (ky + 1) * 3 + (kx + 1);
                    
                    gx += intensity * gxKernel[kidx];
                    gy += intensity * gyKernel[kidx];
                }
            }
            
            const magnitude = Math.sqrt(gx * gx + gy * gy);
            edges[y * width + x] = magnitude * detail;
        }
    }
    
    // Apply sketch effect
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const edgeVal = edges[y * width + x];
            
            // Invert for sketch look (dark lines on white)
            let value = 255 - edgeVal * lineIntensity;
            
            // Add hatching pattern for shading in darker areas
            if (data[idx] < 150 && shading > 0) {
                const hatchPattern = Math.sin(x * 0.1 + y * 0.1) * shading * 20;
                value = Math.min(255, value + hatchPattern);
            }
            
            data[idx] = data[idx + 1] = data[idx + 2] = Math.max(0, Math.min(255, value));
        }
    }
}

// Gouache Style - Opaque, matte paint with bold colors
function applyGouacheStyle(imageData, options = {}) {
    const opacity = options.opacity || 0.9;
    const colorBoldness = options.colorBoldness || 1.3; // 130% boldness for vibrant gouache colors
    const brushStrokes = options.brushStrokes || 0.6;
    
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const tempData = new Uint8ClampedArray(data);
    
    // First pass: Bold, saturated colors
    for (let i = 0; i < data.length; i += 4) {
        let r = data[i] / 255;
        let g = data[i + 1] / 255;
        let b = data[i + 2] / 255;
        
        // Convert to HSL
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let l = (max + min) / 2;
        
        let h, s;
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h /= 6;
        }
        
        // Boost saturation for bold gouache colors
        s = Math.min(1, s * colorBoldness);
        
        // Convert back to RGB
        let newR, newG, newB;
        if (s === 0) {
            newR = newG = newB = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            newR = hue2rgb(p, q, h + 1/3);
            newG = hue2rgb(p, q, h);
            newB = hue2rgb(p, q, h - 1/3);
        }
        
        data[i] = newR * 255;
        data[i + 1] = newG * 255;
        data[i + 2] = newB * 255;
    }
    
    // Second pass: Add opaque, matte texture with visible brush strokes
    if (brushStrokes > 0) {
        const brushSize = Math.ceil(3 * brushStrokes);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, count = 0;
                
                // Directional blur for brush stroke effect
                const direction = Math.floor(y / 5) % 2 === 0 ? 1 : -1;
                for (let dx = -brushSize; dx <= brushSize; dx++) {
                    const nx = x + dx * direction;
                    const ny = y;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const idx = (ny * width + nx) * 4;
                        r += tempData[idx];
                        g += tempData[idx + 1];
                        b += tempData[idx + 2];
                        count++;
                    }
                }
                
                const idx = (y * width + x) * 4;
                data[idx] = r / count;
                data[idx + 1] = g / count;
                data[idx + 2] = b / count;
            }
        }
    }
    
    // Third pass: Flatten with slight posterization for matte gouache look
    const colorLevels = 12;
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.round(data[i] / 255 * colorLevels) * (255 / colorLevels);
        data[i + 1] = Math.round(data[i + 1] / 255 * colorLevels) * (255 / colorLevels);
        data[i + 2] = Math.round(data[i + 2] / 255 * colorLevels) * (255 / colorLevels);
    }
}

// Photo Editing Tools

// Crop Tool
function startCrop(x, y) {
    state.crop.active = true;
    state.crop.startX = x;
    state.crop.startY = y;
    state.crop.endX = x;
    state.crop.endY = y;
}

function updateCrop(x, y) {
    state.crop.endX = x;
    state.crop.endY = y;
    drawCropPreview();
}

function finishCrop() {
    if (!state.crop.active) return;
    
    const x1 = Math.min(state.crop.startX, state.crop.endX);
    const y1 = Math.min(state.crop.startY, state.crop.endY);
    const x2 = Math.max(state.crop.startX, state.crop.endX);
    const y2 = Math.max(state.crop.startY, state.crop.endY);
    const width = x2 - x1;
    const height = y2 - y1;
    
    if (width < 10 || height < 10) {
        state.crop.active = false;
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        compositeAllLayers();
        return;
    }
    
    saveState();
    
    const newWidth = Math.floor(width);
    const newHeight = Math.floor(height);
    
    if (state.crop.mode === 'layer') {
        // Crop only the active layer
        if (!state.activeLayer) {
            state.crop.active = false;
            drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
            compositeAllLayers();
            return;
        }
        
        const layer = state.activeLayer;
        const oldCanvas = layer.canvas;
        
        // Create new canvas for cropped layer content
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = oldCanvas.width;
        tempCanvas.height = oldCanvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Copy the cropped region to temp canvas
        tempCtx.drawImage(oldCanvas, x1, y1, width, height, x1, y1, width, height);
        
        // Clear the original layer
        const ctx = oldCanvas.getContext('2d');
        ctx.clearRect(0, 0, oldCanvas.width, oldCanvas.height);
        
        // Draw back only the cropped content
        ctx.drawImage(tempCanvas, 0, 0);
        
        // Update thumbnail
        updateLayerThumbnail(layer);
    } else {
        // Crop all layers (canvas mode)
        state.layers.forEach(layer => {
            const oldCanvas = layer.canvas;
            
            // Create new canvas for cropped layer
            const newCanvas = document.createElement('canvas');
            newCanvas.width = newWidth;
            newCanvas.height = newHeight;
            const newCtx = newCanvas.getContext('2d');
            
            // Copy cropped region
            newCtx.drawImage(oldCanvas, x1, y1, width, height, 0, 0, width, height);
            
            // Replace layer canvas
            layer.canvas = newCanvas;
            
            // Update thumbnail
            updateLayerThumbnail(layer);
        });
        
        // Update canvas dimensions
        state.canvas.width = newWidth;
        state.canvas.height = newHeight;
        mainCanvas.width = newWidth;
        mainCanvas.height = newHeight;
        drawCanvas.width = newWidth;
        drawCanvas.height = newHeight;
        
        updateCanvasInfo();
    }
    
    state.crop.active = false;
    updateLayersList();
    compositeAllLayers();
}

function updateLayerThumbnail(layer) {
    if (!layer.thumbnail) return;
    
    const thumbCanvas = layer.thumbnail;
    const thumbCtx = thumbCanvas.getContext('2d');
    thumbCtx.clearRect(0, 0, thumbCanvas.width, thumbCanvas.height);
    const scale = Math.min(thumbCanvas.width / layer.canvas.width, thumbCanvas.height / layer.canvas.height);
    const thumbW = layer.canvas.width * scale;
    const thumbH = layer.canvas.height * scale;
    thumbCtx.drawImage(layer.canvas, 0, 0, layer.canvas.width, layer.canvas.height, 0, 0, thumbW, thumbH);
}

function drawCropPreview() {
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    compositeAllLayers();
    
    const x1 = Math.min(state.crop.startX, state.crop.endX);
    const y1 = Math.min(state.crop.startY, state.crop.endY);
    const x2 = Math.max(state.crop.startX, state.crop.endX);
    const y2 = Math.max(state.crop.startY, state.crop.endY);
    
    // Draw semi-transparent overlay outside crop area
    drawCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    drawCtx.fillRect(0, 0, drawCanvas.width, y1);
    drawCtx.fillRect(0, y2, drawCanvas.width, drawCanvas.height - y2);
    drawCtx.fillRect(0, y1, x1, y2 - y1);
    drawCtx.fillRect(x2, y1, drawCanvas.width - x2, y2 - y1);
    
    // Draw crop border
    drawCtx.strokeStyle = '#ffffff';
    drawCtx.lineWidth = 2;
    drawCtx.setLineDash([5, 5]);
    drawCtx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    drawCtx.setLineDash([]);
}

// Flip/Mirror Tools
function flipHorizontal() {
    if (!state.activeLayer) return;
    
    saveState();
    
    const canvas = state.activeLayer.canvas;
    const ctx = canvas.getContext('2d');
    
    // Create temporary canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Copy current content
    tempCtx.drawImage(canvas, 0, 0);
    
    // Flip horizontally
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(tempCanvas, -canvas.width, 0);
    ctx.restore();
    
    updateLayersList();
    compositeAllLayers();
}

function flipVertical() {
    if (!state.activeLayer) return;
    
    saveState();
    
    const canvas = state.activeLayer.canvas;
    const ctx = canvas.getContext('2d');
    
    // Create temporary canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Copy current content
    tempCtx.drawImage(canvas, 0, 0);
    
    // Flip vertically
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(1, -1);
    ctx.drawImage(tempCanvas, 0, -canvas.height);
    ctx.restore();
    
    updateLayersList();
    compositeAllLayers();
}

// Clone Stamp Tool
function setCloneSource(x, y) {
    state.cloneStamp.sourceX = x;
    state.cloneStamp.sourceY = y;
    state.cloneStamp.sourceSet = true;
    showNotification('Clone source set. Click to stamp.');
}

function applyCloneStamp(x, y, pressure) {
    if (!state.cloneStamp.sourceSet || !state.activeLayer) return;
    
    const size = state.brush.size * (state.brush.pressureSize ? pressure : 1);
    const opacity = (state.brush.opacity / 100) * (state.brush.pressureOpacity ? pressure : 1);
    
    const sourceCanvas = state.activeLayer.canvas;
    const sourceCtx = sourceCanvas.getContext('2d');
    
    // Get source image data
    const halfSize = Math.floor(size / 2);
    const sourceX = Math.max(0, Math.min(sourceCanvas.width - size, state.cloneStamp.sourceX - halfSize));
    const sourceY = Math.max(0, Math.min(sourceCanvas.height - size, state.cloneStamp.sourceY - halfSize));
    
    try {
        const sourceData = sourceCtx.getImageData(sourceX, sourceY, size, size);
        
        // Apply to destination with brush opacity
        drawCtx.save();
        drawCtx.globalAlpha = opacity;
        
        // Create circular brush mask
        drawCtx.beginPath();
        drawCtx.arc(x, y, halfSize, 0, Math.PI * 2);
        drawCtx.clip();
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = size;
        tempCanvas.height = size;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(sourceData, 0, 0);
        
        drawCtx.drawImage(tempCanvas, x - halfSize, y - halfSize);
        drawCtx.restore();
    } catch (e) {
        console.error('Clone stamp error:', e);
    }
}

// Dodge Tool (Lighten)
function applyDodge(x, y, pressure) {
    if (!state.activeLayer) return;
    
    const size = state.brush.size * (state.brush.pressureSize ? pressure : 1);
    const strength = (state.dodgeBurn.exposure / 100) * (state.brush.pressureOpacity ? pressure : 1);
    
    const canvas = state.activeLayer.canvas;
    const ctx = canvas.getContext('2d');
    
    const halfSize = Math.floor(size / 2);
    const x1 = Math.max(0, x - halfSize);
    const y1 = Math.max(0, y - halfSize);
    const rectSize = Math.min(size, canvas.width - x1, canvas.height - y1);
    
    if (rectSize <= 0) return;
    
    try {
        const imageData = ctx.getImageData(x1, y1, rectSize, rectSize);
        const data = imageData.data;
        
        for (let py = 0; py < rectSize; py++) {
            for (let px = 0; px < rectSize; px++) {
                const dx = px - halfSize;
                const dy = py - halfSize;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= halfSize) {
                    // Calculate soft brush falloff
                    const falloff = 1 - (distance / halfSize);
                    const effect = strength * falloff;
                    
                    const idx = (py * rectSize + px) * 4;
                    
                    // Lighten (dodge)
                    data[idx] = Math.min(255, data[idx] + (255 - data[idx]) * effect);
                    data[idx + 1] = Math.min(255, data[idx + 1] + (255 - data[idx + 1]) * effect);
                    data[idx + 2] = Math.min(255, data[idx + 2] + (255 - data[idx + 2]) * effect);
                }
            }
        }
        
        ctx.putImageData(imageData, x1, y1);
        
        // Copy to draw canvas for preview
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        drawCtx.drawImage(canvas, 0, 0);
    } catch (e) {
        console.error('Dodge error:', e);
    }
}

// Burn Tool (Darken)
function applyBurn(x, y, pressure) {
    if (!state.activeLayer) return;
    
    const size = state.brush.size * (state.brush.pressureSize ? pressure : 1);
    const strength = (state.dodgeBurn.exposure / 100) * (state.brush.pressureOpacity ? pressure : 1);
    
    const canvas = state.activeLayer.canvas;
    const ctx = canvas.getContext('2d');
    
    const halfSize = Math.floor(size / 2);
    const x1 = Math.max(0, x - halfSize);
    const y1 = Math.max(0, y - halfSize);
    const rectSize = Math.min(size, canvas.width - x1, canvas.height - y1);
    
    if (rectSize <= 0) return;
    
    try {
        const imageData = ctx.getImageData(x1, y1, rectSize, rectSize);
        const data = imageData.data;
        
        for (let py = 0; py < rectSize; py++) {
            for (let px = 0; px < rectSize; px++) {
                const dx = px - halfSize;
                const dy = py - halfSize;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= halfSize) {
                    // Calculate soft brush falloff
                    const falloff = 1 - (distance / halfSize);
                    const effect = strength * falloff;
                    
                    const idx = (py * rectSize + px) * 4;
                    
                    // Darken (burn)
                    data[idx] = Math.max(0, data[idx] - data[idx] * effect);
                    data[idx + 1] = Math.max(0, data[idx + 1] - data[idx + 1] * effect);
                    data[idx + 2] = Math.max(0, data[idx + 2] - data[idx + 2] * effect);
                }
            }
        }
        
        ctx.putImageData(imageData, x1, y1);
        
        // Copy to draw canvas for preview
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        drawCtx.drawImage(canvas, 0, 0);
    } catch (e) {
        console.error('Burn error:', e);
    }
}

// Sponge Tool (Saturate/Desaturate)
function applySponge(x, y, pressure) {
    if (!state.activeLayer) return;
    
    const size = state.brush.size * (state.brush.pressureSize ? pressure : 1);
    const strength = (state.sponge.saturation / 100) * (state.brush.pressureOpacity ? pressure : 1);
    const saturate = state.sponge.mode === 'saturate';
    
    const canvas = state.activeLayer.canvas;
    const ctx = canvas.getContext('2d');
    
    const halfSize = Math.floor(size / 2);
    const x1 = Math.max(0, x - halfSize);
    const y1 = Math.max(0, y - halfSize);
    const rectSize = Math.min(size, canvas.width - x1, canvas.height - y1);
    
    if (rectSize <= 0) return;
    
    try {
        const imageData = ctx.getImageData(x1, y1, rectSize, rectSize);
        const data = imageData.data;
        
        for (let py = 0; py < rectSize; py++) {
            for (let px = 0; px < rectSize; px++) {
                const dx = px - halfSize;
                const dy = py - halfSize;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= halfSize) {
                    // Calculate soft brush falloff
                    const falloff = 1 - (distance / halfSize);
                    const effect = strength * falloff;
                    
                    const idx = (py * rectSize + px) * 4;
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    
                    // Calculate grayscale value
                    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                    
                    if (saturate) {
                        // Increase saturation
                        data[idx] = Math.min(255, gray + (r - gray) * (1 + effect));
                        data[idx + 1] = Math.min(255, gray + (g - gray) * (1 + effect));
                        data[idx + 2] = Math.min(255, gray + (b - gray) * (1 + effect));
                    } else {
                        // Decrease saturation
                        data[idx] = gray + (r - gray) * (1 - effect);
                        data[idx + 1] = gray + (g - gray) * (1 - effect);
                        data[idx + 2] = gray + (b - gray) * (1 - effect);
                    }
                }
            }
        }
        
        ctx.putImageData(imageData, x1, y1);
        
        // Copy to draw canvas for preview
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        drawCtx.drawImage(canvas, 0, 0);
    } catch (e) {
        console.error('Sponge error:', e);
    }
}

// Heal Tool (AI-Assisted Content-Aware Healing)
function setHealSource(x, y) {
    state.heal.sourceX = x;
    state.heal.sourceY = y;
    state.heal.sourceSet = true;
    showNotification('Heal source set. Click to heal areas.');
}

function applyHeal(x, y, pressure) {
    if (!state.activeLayer || !state.heal.sourceSet) return;
    
    const size = state.brush.size * (state.brush.pressureSize ? pressure : 1);
    const canvas = state.activeLayer.canvas;
    const ctx = canvas.getContext('2d');
    
    const halfSize = Math.floor(size / 2);
    const x1 = Math.max(0, x - halfSize);
    const y1 = Math.max(0, y - halfSize);
    const rectSize = Math.min(size, canvas.width - x1, canvas.height - y1);
    
    if (rectSize <= 0) return;
    
    try {
        // Sample from source area
        const sourceX1 = Math.max(0, state.heal.sourceX - halfSize);
        const sourceY1 = Math.max(0, state.heal.sourceY - halfSize);
        const sourceData = ctx.getImageData(sourceX1, sourceY1, rectSize, rectSize);
        
        // Get target area
        const targetData = ctx.getImageData(x1, y1, rectSize, rectSize);
        
        // Sample surrounding area for context-aware blending
        const sampleRadius = state.heal.sampleRadius;
        const surroundingData = ctx.getImageData(
            Math.max(0, x - sampleRadius),
            Math.max(0, y - sampleRadius),
            Math.min(sampleRadius * 2, canvas.width),
            Math.min(sampleRadius * 2, canvas.height)
        );
        
        // Content-aware healing: blend source with surrounding context
        for (let py = 0; py < rectSize; py++) {
            for (let px = 0; px < rectSize; px++) {
                const dx = px - halfSize;
                const dy = py - halfSize;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= halfSize) {
                    // Calculate soft brush falloff
                    const falloff = 1 - (distance / halfSize);
                    
                    const idx = (py * rectSize + px) * 4;
                    
                    // Get source pixel
                    const srcR = sourceData.data[idx];
                    const srcG = sourceData.data[idx + 1];
                    const srcB = sourceData.data[idx + 2];
                    const srcA = sourceData.data[idx + 3];
                    
                    // Get target pixel
                    const tgtR = targetData.data[idx];
                    const tgtG = targetData.data[idx + 1];
                    const tgtB = targetData.data[idx + 2];
                    const tgtA = targetData.data[idx + 3];
                    
                    // Analyze surrounding pixels for color matching
                    let avgR = 0, avgG = 0, avgB = 0, count = 0;
                    const analyzeRadius = 3;
                    
                    for (let sy = -analyzeRadius; sy <= analyzeRadius; sy++) {
                        for (let sx = -analyzeRadius; sx <= analyzeRadius; sx++) {
                            const sampleX = px + sx;
                            const sampleY = py + sy;
                            
                            if (sampleX >= 0 && sampleX < rectSize && sampleY >= 0 && sampleY < rectSize) {
                                const sampleIdx = (sampleY * rectSize + sampleX) * 4;
                                avgR += targetData.data[sampleIdx];
                                avgG += targetData.data[sampleIdx + 1];
                                avgB += targetData.data[sampleIdx + 2];
                                count++;
                            }
                        }
                    }
                    
                    if (count > 0) {
                        avgR /= count;
                        avgG /= count;
                        avgB /= count;
                    }
                    
                    // AI-like color adjustment: blend source with surrounding average
                    const contextWeight = 0.3; // Weight of surrounding context
                    const adjustedR = srcR * (1 - contextWeight) + avgR * contextWeight;
                    const adjustedG = srcG * (1 - contextWeight) + avgG * contextWeight;
                    const adjustedB = srcB * (1 - contextWeight) + avgB * contextWeight;
                    
                    // Apply with falloff
                    targetData.data[idx] = tgtR + (adjustedR - tgtR) * falloff;
                    targetData.data[idx + 1] = tgtG + (adjustedG - tgtG) * falloff;
                    targetData.data[idx + 2] = tgtB + (adjustedB - tgtB) * falloff;
                    targetData.data[idx + 3] = Math.max(tgtA, srcA * falloff);
                }
            }
        }
        
        ctx.putImageData(targetData, x1, y1);
        
        // Copy to draw canvas for preview
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        drawCtx.drawImage(canvas, 0, 0);
    } catch (e) {
        console.error('Heal error:', e);
    }
}

function showNotification(message) {
    // Simple notification system
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.top = '70px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.background = 'rgba(0, 0, 0, 0.8)';
    notification.style.color = 'white';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '5px';
    notification.style.zIndex = '10000';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 2000);
}

// Rulers
function initRulers() {
    state.rulers.horizontalCanvas = document.getElementById('horizontal-ruler');
    state.rulers.verticalCanvas = document.getElementById('vertical-ruler');
    
    if (state.rulers.horizontalCanvas && state.rulers.verticalCanvas) {
        // Size rulers appropriately
        resizeRulers();
        
        // Draw initial rulers (even if hidden)
        drawRulers();
    }
}

function resizeRulers() {
    if (!state.rulers.horizontalCanvas || !state.rulers.verticalCanvas) return;
    
    const canvasContainer = document.getElementById('canvas-container');
    const containerWidth = canvasContainer.clientWidth;
    const containerHeight = canvasContainer.clientHeight;
    
    // Horizontal ruler
    state.rulers.horizontalCanvas.width = containerWidth - 30;
    state.rulers.horizontalCanvas.height = 30;
    
    // Vertical ruler
    state.rulers.verticalCanvas.width = 30;
    state.rulers.verticalCanvas.height = containerHeight - 86;
}

function drawRulers() {
    if (!state.rulers.horizontalCanvas || !state.rulers.verticalCanvas) return;
    
    const hCtx = state.rulers.horizontalCanvas.getContext('2d');
    const vCtx = state.rulers.verticalCanvas.getContext('2d');
    
    // Clear rulers
    hCtx.clearRect(0, 0, state.rulers.horizontalCanvas.width, state.rulers.horizontalCanvas.height);
    vCtx.clearRect(0, 0, state.rulers.verticalCanvas.width, state.rulers.verticalCanvas.height);
    
    // Draw horizontal ruler background
    hCtx.fillStyle = '#2a2a2a';
    hCtx.fillRect(0, 0, state.rulers.horizontalCanvas.width, state.rulers.horizontalCanvas.height);
    hCtx.strokeStyle = '#666';
    hCtx.fillStyle = '#ccc';
    hCtx.font = '9px Arial';
    hCtx.textAlign = 'center';
    hCtx.textBaseline = 'top';
    
    // Get actual display canvas position (the paintable area)
    const displayCanvas = document.getElementById('display-canvas');
    const displayRect = displayCanvas.getBoundingClientRect();
    const canvasContainer = document.getElementById('canvas-container');
    const containerRect = canvasContainer.getBoundingClientRect();
    
    // Calculate actual canvas offset within the container - aligned to paintable canvas
    const canvasOffsetX = displayRect.left - containerRect.left;
    const canvasOffsetY = displayRect.top - containerRect.top - 30; // Account for horizontal ruler height
    
    // Draw horizontal tick marks in inches (96 DPI standard)
    const zoom = state.canvas.zoom;
    const DPI = 96; // Standard screen DPI
    const pixelsPerInch = DPI;
    const tickInterval = pixelsPerInch / 4; // Quarter inch intervals
    
    // Only draw ticks within the actual canvas bounds
    const canvasWidthOnScreen = state.canvas.width * zoom;
    
    for (let i = 0; i <= state.canvas.width; i += tickInterval) {
        const x = i * zoom + canvasOffsetX - 30; // Account for vertical ruler width
        // Only draw ticks that are within the actual canvas area
        if (x >= canvasOffsetX - 30 && x <= canvasOffsetX - 30 + canvasWidthOnScreen) {
            const inches = i / pixelsPerInch;
            const isWholeInch = Math.abs(inches - Math.round(inches)) < 0.01;
            const isHalfInch = Math.abs(inches - Math.floor(inches) - 0.5) < 0.01;
            
            hCtx.beginPath();
            hCtx.moveTo(x, isWholeInch ? 15 : isHalfInch ? 20 : 25);
            hCtx.lineTo(x, 30);
            hCtx.stroke();
            
            // Show inch labels at whole inch marks
            if (isWholeInch && inches > 0) {
                hCtx.fillText(Math.round(inches) + '"', x, 2);
            }
        }
    }
    
    // Draw vertical ruler background
    vCtx.fillStyle = '#2a2a2a';
    vCtx.fillRect(0, 0, state.rulers.verticalCanvas.width, state.rulers.verticalCanvas.height);
    vCtx.strokeStyle = '#666';
    vCtx.fillStyle = '#ccc';
    vCtx.font = '9px Arial';
    vCtx.textAlign = 'center';
    vCtx.textBaseline = 'middle';
    
    // Draw vertical tick marks in inches (96 DPI standard)
    // Only draw ticks within the actual canvas bounds
    const canvasHeightOnScreen = state.canvas.height * zoom;
    
    for (let i = 0; i <= state.canvas.height; i += tickInterval) {
        const y = i * zoom + canvasOffsetY; // Canvas offset already accounts for rulers
        // Only draw ticks that are within the actual canvas area
        if (y >= canvasOffsetY && y <= canvasOffsetY + canvasHeightOnScreen) {
            const inches = i / pixelsPerInch;
            const isWholeInch = Math.abs(inches - Math.round(inches)) < 0.01;
            const isHalfInch = Math.abs(inches - Math.floor(inches) - 0.5) < 0.01;
            
            vCtx.beginPath();
            vCtx.moveTo(isWholeInch ? 15 : isHalfInch ? 20 : 25, y);
            vCtx.lineTo(30, y);
            vCtx.stroke();
            
            // Show inch labels at whole inch marks
            if (isWholeInch && inches > 0) {
                vCtx.save();
                vCtx.translate(10, y);
                vCtx.rotate(-Math.PI / 2);
                vCtx.fillText(Math.round(inches) + '"', 0, 0);
                vCtx.restore();
            }
        }
    }
}

function toggleRulers() {
    state.rulers.visible = !state.rulers.visible;
    
    if (state.rulers.horizontalCanvas && state.rulers.verticalCanvas) {
        const display = state.rulers.visible ? 'block' : 'none';
        state.rulers.horizontalCanvas.style.display = display;
        state.rulers.verticalCanvas.style.display = display;
        
        if (state.rulers.visible) {
            resizeRulers();
            drawRulers();
        }
    }
}

// Node-Based Brush Editor
let nodeEditorInstance = null;

function showNodeEditor() {
    if (!nodeEditorInstance) {
        // Initialize the node editor on first use
        if (typeof NodeEditor !== 'undefined') {
            nodeEditorInstance = new NodeEditor();
        } else {
            console.error('NodeEditor class not found. Make sure node-editor.js is loaded.');
            alert('Node Editor is not available. Please reload the page.');
            return;
        }
    }
    nodeEditorInstance.show();
}

// Shape Tool
function startShape(x, y) {
    state.shape.drawing = true;
    state.shape.startX = x;
    state.shape.startY = y;
    state.shape.endX = x;
    state.shape.endY = y;
    state.shape.type = document.getElementById('shape-type').value;
    state.shape.filled = document.getElementById('shape-filled').checked;
}

function updateShape(x, y) {
    state.shape.endX = x;
    state.shape.endY = y;
    drawShapePreview();
}

function finishShape() {
    if (!state.shape.drawing) return;
    
    state.shape.drawing = false;
    
    // Draw final shape on active layer
    const ctx = state.activeLayer.canvas.getContext('2d');
    drawShape(ctx, state.shape);
    
    // Clear preview
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    compositeAllLayers();
    saveState();
}

function drawShapePreview() {
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    drawShape(drawCtx, state.shape);
}

function drawShape(ctx, shape) {
    const x = Math.min(shape.startX, shape.endX);
    const y = Math.min(shape.startY, shape.endY);
    const width = Math.abs(shape.endX - shape.startX);
    const height = Math.abs(shape.endY - shape.startY);
    
    ctx.save();
    ctx.strokeStyle = state.color;
    ctx.fillStyle = state.color;
    ctx.globalAlpha = state.brush.opacity / 100;
    ctx.lineWidth = Math.max(1, state.brush.size / 10);
    
    switch (shape.type) {
        case 'rectangle':
            if (shape.filled) {
                ctx.fillRect(x, y, width, height);
            } else {
                ctx.strokeRect(x, y, width, height);
            }
            break;
            
        case 'circle':
            const centerX = (shape.startX + shape.endX) / 2;
            const centerY = (shape.startY + shape.endY) / 2;
            const radius = Math.min(width, height) / 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            if (shape.filled) {
                ctx.fill();
            } else {
                ctx.stroke();
            }
            break;
            
        case 'rounded-rect':
            const cornerRadius = Math.min(width, height) * 0.1;
            ctx.beginPath();
            ctx.moveTo(x + cornerRadius, y);
            ctx.lineTo(x + width - cornerRadius, y);
            ctx.arcTo(x + width, y, x + width, y + cornerRadius, cornerRadius);
            ctx.lineTo(x + width, y + height - cornerRadius);
            ctx.arcTo(x + width, y + height, x + width - cornerRadius, y + height, cornerRadius);
            ctx.lineTo(x + cornerRadius, y + height);
            ctx.arcTo(x, y + height, x, y + height - cornerRadius, cornerRadius);
            ctx.lineTo(x, y + cornerRadius);
            ctx.arcTo(x, y, x + cornerRadius, y, cornerRadius);
            ctx.closePath();
            if (shape.filled) {
                ctx.fill();
            } else {
                ctx.stroke();
            }
            break;
            
        case 'speech-bubble':
            const bubbleRadius = Math.min(width, height) * 0.15;
            const tailX = shape.startX + width * 0.3;
            const tailY = shape.startY + height * 1.2;
            
            ctx.beginPath();
            // Bubble body
            ctx.moveTo(x + bubbleRadius, y);
            ctx.lineTo(x + width - bubbleRadius, y);
            ctx.arcTo(x + width, y, x + width, y + bubbleRadius, bubbleRadius);
            ctx.lineTo(x + width, y + height - bubbleRadius);
            ctx.arcTo(x + width, y + height, x + width - bubbleRadius, y + height, bubbleRadius);
            // Tail
            ctx.lineTo(tailX + 20, y + height);
            ctx.lineTo(tailX, tailY);
            ctx.lineTo(tailX - 20, y + height);
            // Continue body
            ctx.lineTo(x + bubbleRadius, y + height);
            ctx.arcTo(x, y + height, x, y + height - bubbleRadius, bubbleRadius);
            ctx.lineTo(x, y + bubbleRadius);
            ctx.arcTo(x, y, x + bubbleRadius, y, bubbleRadius);
            ctx.closePath();
            if (shape.filled) {
                ctx.fill();
            }
            ctx.stroke();
            break;
            
        case 'thought-bubble':
            const cloudRadius = Math.min(width, height) / 6;
            ctx.beginPath();
            // Main cloud
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const cx = x + width / 2 + Math.cos(angle) * width / 3;
                const cy = y + height / 2 + Math.sin(angle) * height / 3;
                ctx.arc(cx, cy, cloudRadius, 0, Math.PI * 2);
            }
            // Small thinking dots
            ctx.arc(shape.startX + width * 0.2, shape.startY + height + 20, 8, 0, Math.PI * 2);
            ctx.arc(shape.startX + width * 0.1, shape.startY + height + 40, 5, 0, Math.PI * 2);
            if (shape.filled) {
                ctx.fill();
            } else {
                ctx.stroke();
            }
            break;
            
        case 'star':
            const starCenterX = (shape.startX + shape.endX) / 2;
            const starCenterY = (shape.startY + shape.endY) / 2;
            const outerRadius = Math.min(width, height) / 2;
            const innerRadius = outerRadius * 0.4;
            const points = 5;
            
            ctx.beginPath();
            for (let i = 0; i < points * 2; i++) {
                const angle = (i * Math.PI) / points - Math.PI / 2;
                const r = i % 2 === 0 ? outerRadius : innerRadius;
                const px = starCenterX + Math.cos(angle) * r;
                const py = starCenterY + Math.sin(angle) * r;
                if (i === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }
            ctx.closePath();
            if (shape.filled) {
                ctx.fill();
            } else {
                ctx.stroke();
            }
            break;
            
        case 'arrow':
            const headSize = Math.min(width, height) * 0.3;
            ctx.beginPath();
            ctx.moveTo(shape.startX, shape.startY + height / 2);
            ctx.lineTo(shape.endX - headSize, shape.startY + height / 2 - headSize / 2);
            ctx.lineTo(shape.endX - headSize, shape.startY + height / 2 - headSize / 4);
            ctx.lineTo(shape.endX, shape.startY + height / 2);
            ctx.lineTo(shape.endX - headSize, shape.startY + height / 2 + headSize / 4);
            ctx.lineTo(shape.endX - headSize, shape.startY + height / 2 + headSize / 2);
            ctx.closePath();
            if (shape.filled) {
                ctx.fill();
            } else {
                ctx.stroke();
            }
            break;
            
        case 'heart':
            const heartCenterX = (shape.startX + shape.endX) / 2;
            const heartTop = shape.startY;
            const heartBottom = shape.endY;
            const heartWidth = width;
            
            ctx.beginPath();
            ctx.moveTo(heartCenterX, heartBottom);
            ctx.bezierCurveTo(
                heartCenterX - heartWidth / 2, heartTop + heartWidth / 3,
                heartCenterX - heartWidth / 2, heartTop,
                heartCenterX, heartTop + heartWidth / 4
            );
            ctx.bezierCurveTo(
                heartCenterX + heartWidth / 2, heartTop,
                heartCenterX + heartWidth / 2, heartTop + heartWidth / 3,
                heartCenterX, heartBottom
            );
            ctx.closePath();
            if (shape.filled) {
                ctx.fill();
            } else {
                ctx.stroke();
            }
            break;
            
        case 'panel-square':
            ctx.lineWidth = Math.max(3, state.brush.size / 5);
            ctx.strokeRect(x, y, width, height);
            break;
            
        case 'panel-split':
            ctx.lineWidth = Math.max(3, state.brush.size / 5);
            ctx.strokeRect(x, y, width, height);
            // Vertical split
            ctx.beginPath();
            ctx.moveTo(x + width / 2, y);
            ctx.lineTo(x + width / 2, y + height);
            ctx.stroke();
            break;
    }
    
    ctx.restore();
}

// Phase 7: Pen Tool Functions
function handlePenToolMouseDown(x, y, e) {
    if (!state.vectorPath.currentPath) {
        // Start a new path
        state.vectorPath.currentPath = new VectorPath();
        state.vectorPath.currentPath.addPoint(x, y, 'corner');
    } else {
        // Check if clicking near an existing point or handle
        const nearestHandle = state.vectorPath.currentPath.findNearestHandle(x, y, 10);
        if (nearestHandle) {
            // Start dragging a handle
            state.vectorPath.dragging = true;
            state.vectorPath.dragTarget = { type: 'handle', ...nearestHandle };
            return;
        }
        
        const nearestPoint = state.vectorPath.currentPath.findNearestPoint(x, y, 10);
        if (nearestPoint >= 0) {
            // Start dragging a point or close the path
            if (nearestPoint === 0 && state.vectorPath.currentPath.points.length > 2) {
                // Clicking on first point - close the path
                state.vectorPath.currentPath.closed = true;
                finishVectorPath();
            } else {
                state.vectorPath.dragging = true;
                state.vectorPath.dragTarget = { type: 'point', index: nearestPoint };
                state.vectorPath.currentPath.selectedPoint = nearestPoint;
            }
            return;
        }
        
        // Add a new point
        if (state.vectorPath.mode === 'add' || !state.vectorPath.mode) {
            state.vectorPath.currentPath.addPoint(x, y, 'smooth');
        }
    }
    
    // Redraw the path preview
    drawVectorPathPreview();
}

function handlePenToolMouseMove(x, y) {
    if (!state.vectorPath.dragging || !state.vectorPath.dragTarget) return;
    
    const target = state.vectorPath.dragTarget;
    if (target.type === 'point') {
        state.vectorPath.currentPath.movePoint(target.index, x, y);
    } else if (target.type === 'handle') {
        state.vectorPath.currentPath.moveHandle(target.pointIndex, target.type, x, y);
    }
    
    drawVectorPathPreview();
}

function handlePenToolMouseUp() {
    state.vectorPath.dragging = false;
    state.vectorPath.dragTarget = null;
}

function finishVectorPath() {
    if (!state.vectorPath.currentPath) return;
    
    // Draw the path on the active layer
    const ctx = state.activeLayer.canvas.getContext('2d');
    state.vectorPath.currentPath.draw(
        ctx,
        state.color,
        state.vectorPath.filled ? state.color : null,
        state.vectorPath.strokeWidth
    );
    
    // Add to paths history
    state.vectorPath.paths.push({
        path: state.vectorPath.currentPath.clone(),
        stroke: state.color,
        fill: state.vectorPath.filled ? state.color : null,
        strokeWidth: state.vectorPath.strokeWidth
    });
    
    // Clear the current path
    state.vectorPath.currentPath = null;
    
    // Clear preview
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    compositeAllLayers();
    saveState();
}

function drawVectorPathPreview() {
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    
    if (state.vectorPath.currentPath) {
        // Draw the path
        state.vectorPath.currentPath.draw(
            drawCtx,
            state.color,
            state.vectorPath.filled ? state.color : null,
            state.vectorPath.strokeWidth
        );
        
        // Draw control points
        state.vectorPath.currentPath.drawControls(drawCtx);
    }
}

function deleteSelectedPoint() {
    if (state.vectorPath.currentPath && state.vectorPath.currentPath.selectedPoint >= 0) {
        state.vectorPath.currentPath.removePoint(state.vectorPath.currentPath.selectedPoint);
        drawVectorPathPreview();
    }
}

function convertPointToCorner() {
    if (state.vectorPath.currentPath && state.vectorPath.currentPath.selectedPoint >= 0) {
        state.vectorPath.currentPath.convertPointType(state.vectorPath.currentPath.selectedPoint, 'corner');
        drawVectorPathPreview();
    }
}

function convertPointToSmooth() {
    if (state.vectorPath.currentPath && state.vectorPath.currentPath.selectedPoint >= 0) {
        state.vectorPath.currentPath.convertPointType(state.vectorPath.currentPath.selectedPoint, 'smooth');
        drawVectorPathPreview();
    }
}

function closePath() {
    if (state.vectorPath.currentPath) {
        state.vectorPath.currentPath.closed = true;
        finishVectorPath();
    }
}

function togglePathFill() {
    state.vectorPath.filled = !state.vectorPath.filled;
    drawVectorPathPreview();
}

// SVG Import/Export Functions
async function importSVG() {
    try {
        const result = await ipcRenderer.invoke('show-open-dialog', {
            filters: [
                { name: 'SVG Files', extensions: ['svg'] }
            ],
            properties: ['openFile']
        });
        
        if (!result.canceled && result.fileContent) {
            const paths = await SVGHandler.importSVG(result.fileContent);
            
            // Create a new layer for the imported SVG
            addLayer('Imported SVG', 'normal');
            const ctx = state.activeLayer.canvas.getContext('2d');
            
            // Draw all imported paths
            for (const pathData of paths) {
                pathData.path.draw(ctx, pathData.stroke, pathData.fill, pathData.strokeWidth);
                
                // Add to vector paths for editing
                state.vectorPath.paths.push(pathData);
            }
            
            compositeAllLayers();
            saveState();
            
            alert(`Imported ${paths.length} vector path(s) from SVG.`);
        }
    } catch (error) {
        console.error('Failed to import SVG:', error);
        alert('Failed to import SVG file. Please ensure it is a valid SVG file.');
    }
}

async function exportSVG() {
    try {
        if (state.vectorPath.paths.length === 0) {
            alert('No vector paths to export. Please create vector paths using the Pen tool first.');
            return;
        }
        
        const result = await ipcRenderer.invoke('show-save-dialog', {
            defaultPath: 'artwork.svg',
            filters: [
                { name: 'SVG Files', extensions: ['svg'] }
            ]
        });
        
        if (!result.canceled) {
            const svgContent = SVGHandler.exportSVG(
                state.vectorPath.paths,
                state.canvas.width,
                state.canvas.height
            );
            
            await ipcRenderer.invoke('save-file', result.filePath, svgContent);
            alert('SVG exported successfully!');
        }
    } catch (error) {
        console.error('Failed to export SVG:', error);
        alert('Failed to export SVG file.');
    }
}

// Shape Boolean Operations
function applyBooleanOperation(operation) {
    if (state.vectorPath.paths.length < 2) {
        alert('Please create at least 2 vector paths before applying boolean operations.');
        return;
    }
    
    // Get the last two paths
    const path2 = state.vectorPath.paths.pop();
    const path1 = state.vectorPath.paths.pop();
    
    let resultPath;
    switch (operation) {
        case 'union':
            resultPath = ShapeBoolean.union(path1.path, path2.path);
            break;
        case 'subtract':
            resultPath = ShapeBoolean.subtract(path1.path, path2.path);
            break;
        case 'intersect':
            resultPath = ShapeBoolean.intersect(path1.path, path2.path);
            break;
        case 'exclude':
            resultPath = ShapeBoolean.exclude(path1.path, path2.path);
            break;
        default:
            alert('Unknown boolean operation.');
            return;
    }
    
    // Draw the result on the active layer
    const ctx = state.activeLayer.canvas.getContext('2d');
    ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
    resultPath.draw(ctx, path1.stroke, path1.fill, path1.strokeWidth);
    
    // Add result to paths
    state.vectorPath.paths.push({
        path: resultPath,
        stroke: path1.stroke,
        fill: path1.fill,
        strokeWidth: path1.strokeWidth
    });
    
    compositeAllLayers();
    saveState();
}

// Text on Path
function showTextOnPathDialog() {
    if (!state.vectorPath.currentPath && state.vectorPath.paths.length === 0) {
        alert('Please create a vector path first using the Pen tool.');
        return;
    }
    
    const text = prompt('Enter text to place on path:');
    if (!text) return;
    
    // Use current path or last path
    const pathData = state.vectorPath.currentPath 
        ? { path: state.vectorPath.currentPath }
        : state.vectorPath.paths[state.vectorPath.paths.length - 1];
    
    const fontSize = parseInt(prompt('Enter font size:', '24')) || 24;
    const fontFamily = state.text.fontFamily || 'Arial';
    
    const textOnPath = new TextOnPath(text, pathData.path, fontSize, fontFamily);
    
    // Draw text on path on the active layer
    const ctx = state.activeLayer.canvas.getContext('2d');
    textOnPath.draw(ctx, state.color);
    
    compositeAllLayers();
    saveState();
}

// Utility Functions
function getCanvasPos(e) {
    const rect = drawCanvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) * (drawCanvas.width / rect.width),
        y: (e.clientY - rect.top) * (drawCanvas.height / rect.height)
    };
}

function updateCursor() {
    if (state.tool === 'brush' || state.tool === 'eraser') {
        const size = Math.max(4, state.brush.size * state.canvas.zoom);
        // FIXED: Show cursor shape based on brush tip shape
        let cursorSvg = '';
        
        switch (state.brushTipShape) {
            case 'square':
                cursorSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect x="1" y="1" width="${size-2}" height="${size-2}" fill="none" stroke="black" stroke-width="1"/><rect x="2" y="2" width="${size-4}" height="${size-4}" fill="none" stroke="white" stroke-width="1"/></svg>`;
                break;
            case 'star':
                // Simple star shape for cursor
                const cx = size / 2;
                const cy = size / 2;
                const r = size / 2 - 2;
                const points = [];
                for (let i = 0; i < 10; i++) {
                    const radius = i % 2 === 0 ? r : r / 2;
                    const angle = (Math.PI / 5) * i - Math.PI / 2;
                    points.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
                }
                cursorSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><polygon points="${points.join(' ')}" fill="none" stroke="black" stroke-width="1"/></svg>`;
                break;
            case 'circle':
            default:
                cursorSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2-1}" fill="none" stroke="black" stroke-width="1"/><circle cx="${size/2}" cy="${size/2}" r="${size/2-2}" fill="none" stroke="white" stroke-width="1"/></svg>`;
                break;
        }
        
        drawCanvas.style.cursor = `url('data:image/svg+xml;utf8,${cursorSvg}') ${size/2} ${size/2}, crosshair`;
    } else if (state.tool === 'fill') {
        drawCanvas.style.cursor = 'pointer';
    } else if (state.tool === 'eyedropper') {
        drawCanvas.style.cursor = 'crosshair';
    } else if (state.tool === 'selection') {
        drawCanvas.style.cursor = 'crosshair';
    } else if (state.tool === 'text') {
        drawCanvas.style.cursor = 'text';
    } else if (state.tool === 'pen') {
        drawCanvas.style.cursor = 'crosshair';
    } else if (state.tool === 'shapes') {
        drawCanvas.style.cursor = 'crosshair';
    } else if (state.tool === 'crop') {
        drawCanvas.style.cursor = 'crosshair';
    } else if (state.tool === 'clone') {
        drawCanvas.style.cursor = 'copy';
    } else if (state.tool === 'dodge' || state.tool === 'burn' || state.tool === 'sponge') {
        const size = state.brush.size;
        drawCanvas.style.cursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2-1}" fill="none" stroke="black" stroke-width="1"/><circle cx="${size/2}" cy="${size/2}" r="${size/2-2}" fill="none" stroke="white" stroke-width="1"/></svg>') ${size/2} ${size/2}, crosshair`;
    } else {
        drawCanvas.style.cursor = 'default';
    }
}

function updateCursorPosition(x, y) {
    document.getElementById('cursor-pos').textContent = `X: ${Math.round(x)}, Y: ${Math.round(y)}`;
}

function updateCanvasInfo() {
    document.getElementById('zoom-level').textContent = `${Math.round(state.canvas.zoom * 100)}%`;
    document.getElementById('canvas-size').textContent = `${state.canvas.width} x ${state.canvas.height}`;
}

function zoom(factor) {
    state.canvas.zoom *= factor;
    state.canvas.zoom = Math.max(0.1, Math.min(10, state.canvas.zoom));
    
    const newWidth = state.canvas.width * state.canvas.zoom;
    const newHeight = state.canvas.height * state.canvas.zoom;
    
    mainCanvas.style.width = newWidth + 'px';
    mainCanvas.style.height = newHeight + 'px';
    drawCanvas.style.width = newWidth + 'px';
    drawCanvas.style.height = newHeight + 'px';
    
    updateCanvasInfo();
    updateCursor();
    
    // Update rulers when zoom changes
    if (state.rulers.visible) {
        resizeRulers();
        drawRulers();
    }
}

function resetZoom() {
    state.canvas.zoom = 1;
    
    const newWidth = state.canvas.width;
    const newHeight = state.canvas.height;
    
    mainCanvas.style.width = newWidth + 'px';
    mainCanvas.style.height = newHeight + 'px';
    drawCanvas.style.width = newWidth + 'px';
    drawCanvas.style.height = newHeight + 'px';
    
    updateCanvasInfo();
    updateCursor();
    
    // Update rulers when zoom resets
    if (state.rulers.visible) {
        resizeRulers();
        drawRulers();
    }
}

// History Management
function saveState() {
    // Save layer states and canvas dimensions
    const layerStates = state.layers.map(layer => {
        const canvas = document.createElement('canvas');
        canvas.width = layer.canvas.width;
        canvas.height = layer.canvas.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(layer.canvas, 0, 0);
        return {
            ...layer,
            canvas: canvas
        };
    });
    
    // Save canvas dimensions along with layer states
    const historyState = {
        layers: layerStates,
        canvasWidth: state.canvas.width,
        canvasHeight: state.canvas.height
    };
    
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(historyState);
    state.historyIndex++;
    
    // Limit history size
    if (state.history.length > 50) {
        state.history.shift();
        state.historyIndex--;
    }
    
    updateUndoRedoButtons();
}

function undo() {
    if (state.historyIndex > 0) {
        state.historyIndex--;
        restoreState(state.history[state.historyIndex]);
        updateUndoRedoButtons();
    }
}

function redo() {
    if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        restoreState(state.history[state.historyIndex]);
        updateUndoRedoButtons();
    }
}

function clearCanvas() {
    if (confirm('Are you sure you want to clear the canvas? This action cannot be undone.')) {
        // Clear the active layer
        if (state.activeLayer) {
            const ctx = state.activeLayer.canvas.getContext('2d');
            ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
            compositeAllLayers();
            saveState();
        }
    }
}

function restoreState(historyState) {
    // Handle both old format (array of layers) and new format (object with layers and dimensions)
    const layerStates = historyState.layers || historyState;
    const canvasWidth = historyState.canvasWidth || state.canvas.width;
    const canvasHeight = historyState.canvasHeight || state.canvas.height;
    
    state.layers = layerStates.map(layerState => {
        const canvas = document.createElement('canvas');
        canvas.width = layerState.canvas.width;
        canvas.height = layerState.canvas.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(layerState.canvas, 0, 0);
        return {
            ...layerState,
            canvas: canvas
        };
    });
    
    // Restore canvas dimensions if they changed (e.g., after crop)
    if (canvasWidth !== state.canvas.width || canvasHeight !== state.canvas.height) {
        state.canvas.width = canvasWidth;
        state.canvas.height = canvasHeight;
        mainCanvas.width = canvasWidth;
        mainCanvas.height = canvasHeight;
        drawCanvas.width = canvasWidth;
        drawCanvas.height = canvasHeight;
        updateCanvasInfo();
    }
    
    state.activeLayer = state.layers.find(l => l.id === state.activeLayer.id) || state.layers[0];
    updateLayersList();
    compositeAllLayers();
}

function updateUndoRedoButtons() {
    document.getElementById('undo-btn').disabled = state.historyIndex <= 0;
    document.getElementById('redo-btn').disabled = state.historyIndex >= state.history.length - 1;
}

// Keyboard Shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Escape to clear selection or finish polygonal lasso
        if (e.key === 'Escape') {
            if (state.tool === 'polygonal-lasso' && polygonalPoints.length > 0) {
                polygonalPoints = [];
                drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
            } else {
                clearSelection();
            }
            return;
        }
        
        // Enter to finish polygonal lasso
        if (e.key === 'Enter' && state.tool === 'polygonal-lasso' && polygonalPoints.length >= 3) {
            finishPolygonalLassoSelection();
            return;
        }
        
        // Browser mode keyboard shortcuts (when not in Electron)
        if (typeof require === 'undefined') {
            const isMod = e.ctrlKey || e.metaKey;
            
            // File operations
            if (isMod && !e.shiftKey && e.key === 'n') {
                e.preventDefault();
                browserMenuSystem.trigger('file-new');
                return;
            }
            if (isMod && e.shiftKey && e.key === 'N') {
                e.preventDefault();
                browserMenuSystem.trigger('file-new-with-size');
                return;
            }
            if (isMod && !e.shiftKey && e.key === 's') {
                e.preventDefault();
                browserMenuSystem.trigger('file-save');
                return;
            }
            if (isMod && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                browserMenuSystem.trigger('file-save-as');
                return;
            }
            if (isMod && e.key === 'o') {
                e.preventDefault();
                browserMenuSystem.trigger('file-open');
                return;
            }
            if (isMod && e.key === 'e') {
                e.preventDefault();
                browserMenuSystem.trigger('file-export');
                return;
            }
            
            // Edit operations
            if (isMod && !e.shiftKey && e.key === 'z') {
                e.preventDefault();
                browserMenuSystem.trigger('edit-undo');
                return;
            }
            if (isMod && e.shiftKey && e.key === 'Z') {
                e.preventDefault();
                browserMenuSystem.trigger('edit-redo');
                return;
            }
            
            // View operations
            if (isMod && e.key === '=') {
                e.preventDefault();
                browserMenuSystem.trigger('view-zoom-in');
                return;
            }
            if (isMod && e.key === '-') {
                e.preventDefault();
                browserMenuSystem.trigger('view-zoom-out');
                return;
            }
            if (isMod && e.key === '0') {
                e.preventDefault();
                browserMenuSystem.trigger('view-fit');
                return;
            }
            
            // Layer operations
            if (isMod && e.shiftKey && e.key === 'L') {
                e.preventDefault();
                browserMenuSystem.trigger('layer-new');
                return;
            }
            if (isMod && e.key === 'j') {
                e.preventDefault();
                browserMenuSystem.trigger('layer-duplicate');
                return;
            }
            if (isMod && e.key === ']') {
                e.preventDefault();
                browserMenuSystem.trigger('layer-move-up');
                return;
            }
            if (isMod && e.key === '[') {
                e.preventDefault();
                browserMenuSystem.trigger('layer-move-down');
                return;
            }
            if (isMod && e.shiftKey && e.key === 'E') {
                e.preventDefault();
                browserMenuSystem.trigger('layer-flatten');
                return;
            }
        }
        
        // Tool shortcuts - using customizable shortcuts
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
            const key = e.key.toLowerCase();
            
            // Check each tool shortcut
            for (const [tool, shortcut] of Object.entries(state.keyboardShortcuts)) {
                if (key === shortcut.toLowerCase()) {
                    // Special handling for text tool
                    if (tool === 'text') {
                        if (state.activeLayer && state.activeLayer.type === 'text' && state.activeLayer.textData) {
                            editTextLayer();
                        } else {
                            selectTool(tool);
                        }
                    } 
                    // Special handling for tools that conflict with Ctrl shortcuts
                    else if ((tool === 'scale' && key === 'z') || (tool === 'crop' && key === 'c')) {
                        if (!e.ctrlKey && !e.metaKey) {
                            selectTool(tool);
                        }
                    }
                    else {
                        selectTool(tool);
                    }
                    break;
                }
            }
        }
        
        // Quick Mask Mode toggle (Q key) - Phase 8 enhancement
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.key.toLowerCase() === 'q') {
            e.preventDefault();
            toggleQuickMaskMode();
            return;
        }
        
        // Brush size shortcuts
        if (e.key === '[') {
            state.brush.size = Math.max(1, state.brush.size - 5);
            document.getElementById('brush-size').value = state.brush.size;
            document.getElementById('brush-size-value').textContent = state.brush.size;
            updateCursor();
        } else if (e.key === ']') {
            state.brush.size = Math.min(200, state.brush.size + 5);
            document.getElementById('brush-size').value = state.brush.size;
            document.getElementById('brush-size-value').textContent = state.brush.size;
            updateCursor();
        }
    });
}

// Contextual Task Bar
function updateContextualTaskbar(toolName) {
    const contextGroups = document.querySelectorAll('.context-group');
    contextGroups.forEach(group => {
        const tools = group.dataset.tools.split(',');
        if (tools.includes(toolName)) {
            group.classList.add('active');
        } else {
            group.classList.remove('active');
        }
    });
}

function setupContextualTaskbar() {
    // Brush/Eraser size buttons
    document.querySelector('[data-action="size-small"]')?.addEventListener('click', () => {
        state.brush.size = 10;
        document.getElementById('brush-size').value = 10;
        document.getElementById('brush-size-value').textContent = 10;
        updateCursor();
    });
    
    document.querySelector('[data-action="size-medium"]')?.addEventListener('click', () => {
        state.brush.size = 50;
        document.getElementById('brush-size').value = 50;
        document.getElementById('brush-size-value').textContent = 50;
        updateCursor();
    });
    
    document.querySelector('[data-action="size-large"]')?.addEventListener('click', () => {
        state.brush.size = 100;
        document.getElementById('brush-size').value = 100;
        document.getElementById('brush-size-value').textContent = 100;
        updateCursor();
    });
    
    // Opacity buttons
    const opacityButtons = ['25', '50', '75', '100'];
    opacityButtons.forEach(opacity => {
        document.querySelector(`[data-action="opacity-${opacity}"]`)?.addEventListener('click', (e) => {
            state.brush.opacity = parseInt(opacity);
            document.getElementById('brush-opacity').value = opacity;
            document.getElementById('brush-opacity-value').textContent = opacity;
            
            // Update active state on opacity buttons
            document.querySelectorAll('[data-action^="opacity-"]').forEach(btn => {
                btn.classList.remove('active');
            });
            e.target.classList.add('active');
        });
    });
    
    // Selection actions
    document.querySelector('[data-action="select-all"]')?.addEventListener('click', () => {
        selectAll();
    });
    
    document.querySelector('[data-action="deselect"]')?.addEventListener('click', () => {
        clearSelection();
    });
    
    // Selection refinement actions
    document.querySelector('[data-action="selection-feather"]')?.addEventListener('click', () => {
        const radius = prompt('Enter feather radius (pixels):', '5');
        if (radius !== null) {
            featherSelection(parseInt(radius) || 5);
        }
    });
    
    document.querySelector('[data-action="selection-grow"]')?.addEventListener('click', () => {
        const pixels = prompt('Expand selection by (pixels):', '2');
        if (pixels !== null) {
            growSelection(parseInt(pixels) || 2);
        }
    });
    
    document.querySelector('[data-action="selection-shrink"]')?.addEventListener('click', () => {
        const pixels = prompt('Contract selection by (pixels):', '2');
        if (pixels !== null) {
            shrinkSelection(parseInt(pixels) || 2);
        }
    });
    
    document.querySelector('[data-action="selection-border"]')?.addEventListener('click', () => {
        const pixels = prompt('Border width (pixels):', '2');
        if (pixels !== null) {
            borderSelection(parseInt(pixels) || 2);
        }
    });
    
    document.querySelector('[data-action="selection-invert"]')?.addEventListener('click', () => {
        invertSelection();
    });
    
    // Shape type buttons
    document.querySelector('[data-action="shape-rectangle"]')?.addEventListener('click', () => {
        state.shape.type = 'rectangle';
        document.getElementById('shape-type').value = 'rectangle';
    });
    
    document.querySelector('[data-action="shape-circle"]')?.addEventListener('click', () => {
        state.shape.type = 'circle';
        document.getElementById('shape-type').value = 'circle';
    });
    
    document.querySelector('[data-action="shape-star"]')?.addEventListener('click', () => {
        state.shape.type = 'star';
        document.getElementById('shape-type').value = 'star';
    });
    
    document.querySelector('[data-action="shape-filled"]')?.addEventListener('click', () => {
        state.shape.filled = !state.shape.filled;
        const checkbox = document.getElementById('shape-filled');
        if (checkbox) checkbox.checked = state.shape.filled;
    });
    
    // Transform action buttons
    document.querySelector('[data-action="transform-apply"]')?.addEventListener('click', () => {
        finishTransform();
    });
    
    document.querySelector('[data-action="transform-cancel"]')?.addEventListener('click', () => {
        cancelTransform();
    });
    
    document.querySelector('[data-action="transform-reset"]')?.addEventListener('click', () => {
        resetTransform();
    });
    
    document.querySelector('[data-action="flip-h"]')?.addEventListener('click', () => {
        if (state.activeLayer) {
            const ctx = state.activeLayer.canvas.getContext('2d');
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = state.canvas.width;
            tempCanvas.height = state.canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(state.activeLayer.canvas, 0, 0);
            
            ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
            ctx.save();
            ctx.scale(-1, 1);
            ctx.drawImage(tempCanvas, -state.canvas.width, 0);
            ctx.restore();
            
            compositeAllLayers();
            saveState();
        }
    });
    
    document.querySelector('[data-action="flip-v"]')?.addEventListener('click', () => {
        if (state.activeLayer) {
            const ctx = state.activeLayer.canvas.getContext('2d');
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = state.canvas.width;
            tempCanvas.height = state.canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(state.activeLayer.canvas, 0, 0);
            
            ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
            ctx.save();
            ctx.scale(1, -1);
            ctx.drawImage(tempCanvas, 0, -state.canvas.height);
            ctx.restore();
            
            compositeAllLayers();
            saveState();
        }
    });
    
    // Smart Object / Transform History buttons (Phase 6)
    document.querySelector('[data-action="smart-object-convert"]')?.addEventListener('click', () => {
        convertLayerToSmartObject();
    });
    
    document.querySelector('[data-action="smart-object-reset"]')?.addEventListener('click', () => {
        resetSmartObject();
    });
    
    document.querySelector('[data-action="smart-object-rasterize"]')?.addEventListener('click', () => {
        rasterizeSmartObject();
    });
    
    // Quick Mask Mode button (Phase 8)
    document.querySelector('[data-action="quick-mask-toggle"]')?.addEventListener('click', () => {
        toggleQuickMaskMode();
        // Update button appearance
        const btn = document.getElementById('quick-mask-btn');
        if (btn) {
            btn.classList.toggle('active', state.quickMask.active);
        }
    });
    
    // Text formatting buttons
    document.querySelector('[data-action="text-bold"]')?.addEventListener('click', (e) => {
        state.text.bold = !state.text.bold;
        e.target.classList.toggle('active', state.text.bold);
        // Auto-update active text layer if one is selected
        applyTextSettingsToActiveLayer();
    });
    
    document.querySelector('[data-action="text-italic"]')?.addEventListener('click', (e) => {
        state.text.italic = !state.text.italic;
        e.target.classList.toggle('active', state.text.italic);
        // Auto-update active text layer if one is selected
        applyTextSettingsToActiveLayer();
    });
    
    // Text size selector
    const textSizeSelect = document.querySelector('[data-action="text-size"]');
    if (textSizeSelect) {
        textSizeSelect.addEventListener('change', (e) => {
            state.text.fontSize = parseInt(e.target.value);
            // Auto-update active text layer if one is selected
            applyTextSettingsToActiveLayer();
        });
        // Initialize with default value
        textSizeSelect.value = state.text.fontSize;
    }
    
    // Text font family selector
    const textFontSelect = document.querySelector('[data-action="text-font"]');
    if (textFontSelect) {
        textFontSelect.addEventListener('change', (e) => {
            state.text.fontFamily = e.target.value;
            // Auto-update active text layer if one is selected
            applyTextSettingsToActiveLayer();
        });
        // Initialize with default value
        textFontSelect.value = state.text.fontFamily;
    }
    
    // Text alignment buttons
    const textAlignLeftBtn = document.querySelector('[data-action="text-align-left"]');
    textAlignLeftBtn?.addEventListener('click', (e) => {
        state.text.alignment = 'left';
        // Update active state
        document.querySelectorAll('[data-action^="text-align-"]').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');
        // Auto-update active text layer if one is selected
        applyTextSettingsToActiveLayer();
    });
    // Initialize left alignment as active by default
    if (textAlignLeftBtn && state.text.alignment === 'left') {
        textAlignLeftBtn.classList.add('active');
    }
    
    document.querySelector('[data-action="text-align-center"]')?.addEventListener('click', (e) => {
        state.text.alignment = 'center';
        // Update active state
        document.querySelectorAll('[data-action^="text-align-"]').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');
        // Auto-update active text layer if one is selected
        applyTextSettingsToActiveLayer();
    });
    
    document.querySelector('[data-action="text-align-right"]')?.addEventListener('click', (e) => {
        state.text.alignment = 'right';
        // Update active state
        document.querySelectorAll('[data-action^="text-align-"]').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');
        // Auto-update active text layer if one is selected
        applyTextSettingsToActiveLayer();
    });
    
    // Text kerning (letter spacing) input
    const textKerningInput = document.querySelector('[data-action="text-kerning"]');
    if (textKerningInput) {
        textKerningInput.addEventListener('input', (e) => {
            state.text.letterSpacing = parseFloat(e.target.value);
        });
        // Initialize with default value
        textKerningInput.value = state.text.letterSpacing;
    }
    
    // Text leading (line height) input
    const textLeadingInput = document.querySelector('[data-action="text-leading"]');
    if (textLeadingInput) {
        textLeadingInput.addEventListener('input', (e) => {
            state.text.lineHeight = parseFloat(e.target.value);
        });
        // Initialize with default value
        textLeadingInput.value = state.text.lineHeight;
    }
    
    // Phase 7: Text underline button
    document.querySelector('[data-action="text-underline"]')?.addEventListener('click', (e) => {
        state.text.underline = !state.text.underline;
        e.target.classList.toggle('active', state.text.underline);
        applyTextSettingsToActiveLayer();
    });
    
    // Phase 7: Text stroke/outline button
    document.querySelector('[data-action="text-stroke"]')?.addEventListener('click', (e) => {
        state.text.stroke.enabled = !state.text.stroke.enabled;
        e.target.classList.toggle('active', state.text.stroke.enabled);
        
        if (state.text.stroke.enabled) {
            // Show a dialog to configure stroke
            const strokeColor = prompt('Enter stroke color (hex):', state.text.stroke.color);
            if (strokeColor) state.text.stroke.color = strokeColor;
            
            const strokeWidth = prompt('Enter stroke width (px):', state.text.stroke.width);
            if (strokeWidth) state.text.stroke.width = parseFloat(strokeWidth);
        }
        
        applyTextSettingsToActiveLayer();
    });
    
    // Phase 7: Text shadow button
    document.querySelector('[data-action="text-shadow"]')?.addEventListener('click', (e) => {
        state.text.shadow.enabled = !state.text.shadow.enabled;
        e.target.classList.toggle('active', state.text.shadow.enabled);
        
        if (state.text.shadow.enabled) {
            // Show a dialog to configure shadow
            const shadowColor = prompt('Enter shadow color (hex with alpha, e.g., #00000080):', state.text.shadow.color);
            if (shadowColor) state.text.shadow.color = shadowColor;
            
            const shadowBlur = prompt('Enter shadow blur (px):', state.text.shadow.blur);
            if (shadowBlur) state.text.shadow.blur = parseFloat(shadowBlur);
            
            const shadowOffsetX = prompt('Enter shadow X offset (px):', state.text.shadow.offsetX);
            if (shadowOffsetX) state.text.shadow.offsetX = parseFloat(shadowOffsetX);
            
            const shadowOffsetY = prompt('Enter shadow Y offset (px):', state.text.shadow.offsetY);
            if (shadowOffsetY) state.text.shadow.offsetY = parseFloat(shadowOffsetY);
        }
        
        applyTextSettingsToActiveLayer();
    });
    
    // Phase 7: Text gradient button
    document.querySelector('[data-action="text-gradient"]')?.addEventListener('click', (e) => {
        state.text.gradient.enabled = !state.text.gradient.enabled;
        e.target.classList.toggle('active', state.text.gradient.enabled);
        
        if (state.text.gradient.enabled) {
            // Show a dialog to configure gradient
            const gradientType = prompt('Enter gradient type (linear/radial):', state.text.gradient.type);
            if (gradientType && (gradientType === 'linear' || gradientType === 'radial')) {
                state.text.gradient.type = gradientType;
            }
            
            const color1 = prompt('Enter first color (hex):', state.text.gradient.colors[0]);
            if (color1) state.text.gradient.colors[0] = color1;
            
            const color2 = prompt('Enter second color (hex):', state.text.gradient.colors[1]);
            if (color2) state.text.gradient.colors[1] = color2;
            
            if (state.text.gradient.type === 'linear') {
                const angle = prompt('Enter gradient angle (0-360):', state.text.gradient.angle);
                if (angle) state.text.gradient.angle = parseFloat(angle);
            }
        }
        
        applyTextSettingsToActiveLayer();
    });
    
    // Fill tolerance buttons
    const toleranceButtons = {
        'tolerance-low': 10,
        'tolerance-medium': 30,
        'tolerance-high': 60
    };
    
    Object.keys(toleranceButtons).forEach(action => {
        document.querySelector(`[data-action="${action}"]`)?.addEventListener('click', (e) => {
            // Update active state
            document.querySelectorAll('[data-action^="tolerance-"]').forEach(btn => {
                btn.classList.remove('active');
            });
            e.target.classList.add('active');
            // Update state with tolerance value
            state.fill.tolerance = toleranceButtons[action];
        });
    });
    
    // Crop mode radio buttons
    const cropModeRadios = document.querySelectorAll('input[name="crop-mode"]');
    cropModeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.checked) {
                state.crop.mode = e.target.value;
            }
        });
    });
    
    // Magic Wand settings
    const magicWandTolerance = document.getElementById('magic-wand-tolerance');
    const magicWandToleranceValue = document.getElementById('magic-wand-tolerance-value');
    const magicWandContiguous = document.getElementById('magic-wand-contiguous');
    const magicWandAntiAlias = document.getElementById('magic-wand-anti-alias');
    
    if (magicWandTolerance && magicWandToleranceValue) {
        magicWandTolerance.addEventListener('input', (e) => {
            state.magicWand.tolerance = parseInt(e.target.value);
            magicWandToleranceValue.textContent = e.target.value;
        });
    }
    
    if (magicWandContiguous) {
        magicWandContiguous.addEventListener('change', (e) => {
            state.magicWand.contiguous = e.target.checked;
        });
    }
    
    if (magicWandAntiAlias) {
        magicWandAntiAlias.addEventListener('change', (e) => {
            state.magicWand.antiAlias = e.target.checked;
        });
    }
    
    // Lasso settings
    const lassoFeather = document.getElementById('lasso-feather');
    const lassoFeatherValue = document.getElementById('lasso-feather-value');
    const lassoAntiAlias = document.getElementById('lasso-anti-alias');
    
    if (lassoFeather && lassoFeatherValue) {
        lassoFeather.addEventListener('input', (e) => {
            state.selection.feather = parseInt(e.target.value);
            lassoFeatherValue.textContent = e.target.value;
        });
    }
    
    if (lassoAntiAlias) {
        lassoAntiAlias.addEventListener('change', (e) => {
            state.selection.antiAlias = e.target.checked;
        });
    }
    
    // Phase 7: Pen tool context buttons
    document.querySelector('[data-action="pen-add-point"]')?.addEventListener('click', () => {
        state.vectorPath.mode = 'add';
    });
    
    document.querySelector('[data-action="pen-delete-point"]')?.addEventListener('click', () => {
        deleteSelectedPoint();
    });
    
    document.querySelector('[data-action="pen-convert-corner"]')?.addEventListener('click', () => {
        convertPointToCorner();
    });
    
    document.querySelector('[data-action="pen-convert-smooth"]')?.addEventListener('click', () => {
        convertPointToSmooth();
    });
    
    document.querySelector('[data-action="pen-close-path"]')?.addEventListener('click', () => {
        closePath();
    });
    
    document.querySelector('[data-action="pen-fill"]')?.addEventListener('click', () => {
        togglePathFill();
    });
    
    // Initialize contextual taskbar with current tool
    updateContextualTaskbar(state.tool);
}

// FIXED: Auto-select appropriate tool based on layer type
function autoSelectToolForLayer(layer) {
    if (!layer) return;
    
    const layerType = layer.type || 'paint';
    
    switch (layerType) {
        case 'vector':
            // Vector layers should use brush tool (would be pen tool in full implementation)
            selectTool('brush');
            break;
        case 'text':
            // Text layers should use text tool
            selectTool('text');
            break;
        case 'adjustment':
        case 'filter':
            // Adjustment/filter layers - keep current tool or switch to selection
            break;
        case 'paint':
        default:
            // Paint layers - keep current tool (brush, eraser, etc.)
            break;
    }
}

function selectTool(toolName) {
    // Clear selection when switching away from selection tools (unless switching between selection tools)
    const selectionTools = ['selection', 'magic-wand'];
    const wasSelectionTool = selectionTools.includes(state.tool);
    const isSelectionTool = selectionTools.includes(toolName);
    
    if (wasSelectionTool && !isSelectionTool && state.selection.active) {
        clearSelection();
    }
    
    state.tool = toolName;
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tool === toolName) {
            btn.classList.add('active');
        }
    });
    
    // Hide all tool-specific settings
    document.querySelectorAll('.tool-settings').forEach(el => el.classList.add('hidden'));
    
    // Show settings for current tool
    const settingsMap = {
        'smudge': 'smudge-settings',
        'liquify': 'liquify-settings',
        'magic-wand': 'magicwand-settings'
    };
    
    if (settingsMap[toolName]) {
        const settingsEl = document.getElementById(settingsMap[toolName]);
        if (settingsEl) {
            settingsEl.classList.remove('hidden');
        }
    }
    
    updateCursor();
    updateContextualTaskbar(toolName);
}

// Menu Handlers
function setupMenuHandlers() {
    document.getElementById('undo-btn').addEventListener('click', undo);
    document.getElementById('redo-btn').addEventListener('click', redo);
    
    // File menu handlers
    ipcRenderer.on('file-new', () => {
        if (confirm('Create a new canvas? Unsaved changes will be lost.')) {
            newCanvas();
        }
    });
    
    ipcRenderer.on('file-new-with-size', () => {
        showCanvasSizeDialog();
    });
    
    ipcRenderer.on('file-save', () => {
        saveProject();
    });
    
    ipcRenderer.on('file-save-as', () => {
        saveProjectAs();
    });
    
    ipcRenderer.on('file-open', () => {
        openProject();
    });
    
    ipcRenderer.on('file-export', () => {
        exportImage();
    });
    
    // Phase 7: SVG import/export handlers
    ipcRenderer.on('file-import-svg', () => {
        importSVG();
    });
    
    ipcRenderer.on('file-export-svg', () => {
        exportSVG();
    });
    
    ipcRenderer.on('file-settings', () => {
        showSettingsDialog();
    });
    
    // Edit menu handlers
    ipcRenderer.on('edit-undo', undo);
    ipcRenderer.on('edit-redo', redo);
    
    // Phase 7: Path menu handlers
    ipcRenderer.on('path-union', () => {
        applyBooleanOperation('union');
    });
    
    ipcRenderer.on('path-subtract', () => {
        applyBooleanOperation('subtract');
    });
    
    ipcRenderer.on('path-intersect', () => {
        applyBooleanOperation('intersect');
    });
    
    ipcRenderer.on('path-exclude', () => {
        applyBooleanOperation('exclude');
    });
    
    ipcRenderer.on('path-text-on-path', () => {
        showTextOnPathDialog();
    });
    
    // View menu handlers
    ipcRenderer.on('view-zoom-in', () => zoom(1.2));
    ipcRenderer.on('view-zoom-out', () => zoom(0.8));
    ipcRenderer.on('view-fit', () => resetZoom());
    
    // Reset zoom button
    document.getElementById('reset-zoom-btn').addEventListener('click', resetZoom);
    
    // Layer menu handlers
    ipcRenderer.on('layer-new', () => {
        addLayer(`Layer ${state.layers.length + 1}`);
        saveState();
    });
    
    ipcRenderer.on('layer-duplicate', () => {
        if (state.activeLayer) {
            duplicateLayer();
            saveState();
        }
    });
    
    ipcRenderer.on('layer-delete', () => {
        if (state.activeLayer && state.layers.length > 1) {
            deleteLayer(state.activeLayer);
            saveState();
        }
    });
    
    // Tool menu handlers
    ipcRenderer.on('tool-brush', () => selectTool('brush'));
    ipcRenderer.on('tool-eraser', () => selectTool('eraser'));
    ipcRenderer.on('tool-fill', () => selectTool('fill'));
    ipcRenderer.on('tool-eyedropper', () => selectTool('eyedropper'));
    ipcRenderer.on('tool-selection', () => selectTool('selection'));
    ipcRenderer.on('tool-text', () => selectTool('text'));
    ipcRenderer.on('tool-pen', () => selectTool('pen'));
    ipcRenderer.on('tool-shapes', () => selectTool('shapes'));
    ipcRenderer.on('tool-gradient', () => selectTool('gradient'));
    ipcRenderer.on('tool-move', () => selectTool('move'));
    ipcRenderer.on('tool-rotate', () => selectTool('rotate'));
    ipcRenderer.on('tool-scale', () => selectTool('scale'));
    ipcRenderer.on('tool-crop', () => selectTool('crop'));
    ipcRenderer.on('tool-clone', () => selectTool('clone'));
    ipcRenderer.on('tool-dodge', () => selectTool('dodge'));
    ipcRenderer.on('tool-burn', () => selectTool('burn'));
    ipcRenderer.on('tool-sponge', () => selectTool('sponge'));
    
    // Image menu handlers
    ipcRenderer.on('image-flip-horizontal', () => flipHorizontal());
    ipcRenderer.on('image-flip-vertical', () => flipVertical());
    
    // Filter menu handlers
    ipcRenderer.on('filter-brightness', () => {
        const value = prompt('Enter brightness value (-100 to 100):', '0');
        if (value !== null) {
            applyFilter('brightness', { value: parseInt(value) });
        }
    });
    ipcRenderer.on('filter-blur', () => {
        const radius = prompt('Enter blur radius (1-10):', '3');
        if (radius !== null) {
            applyFilter('blur', { radius: parseInt(radius) });
        }
    });
    ipcRenderer.on('filter-sharpen', () => {
        applyFilter('sharpen');
    });
    ipcRenderer.on('filter-grayscale', () => {
        applyFilter('grayscale');
    });
    ipcRenderer.on('filter-invert', () => {
        applyFilter('invert');
    });
    
    // Phase 9: Advanced Filters IPC handlers
    ipcRenderer.on('filter-gaussian-blur', () => {
        const radius = prompt('Enter Gaussian blur radius (1-20):', '5');
        if (radius !== null) {
            applyFilter('gaussian-blur', { radius: parseInt(radius) });
        }
    });
    ipcRenderer.on('filter-motion-blur', () => {
        const distance = prompt('Enter motion blur distance (1-50):', '10');
        if (distance !== null) {
            const angle = prompt('Enter motion blur angle (0-360):', '0');
            if (angle !== null) {
                applyFilter('motion-blur', { distance: parseInt(distance), angle: parseInt(angle) });
            }
        }
    });
    ipcRenderer.on('filter-radial-blur', () => {
        const strength = prompt('Enter radial blur strength (0.01-0.5):', '0.1');
        if (strength !== null) {
            applyFilter('radial-blur', { strength: parseFloat(strength) });
        }
    });
    ipcRenderer.on('filter-add-noise', () => {
        const amount = prompt('Enter noise amount (1-100):', '25');
        if (amount !== null) {
            applyFilter('add-noise', { amount: parseInt(amount) });
        }
    });
    ipcRenderer.on('filter-reduce-noise', () => {
        const radius = prompt('Enter noise reduction radius (1-5):', '1');
        if (radius !== null) {
            applyFilter('reduce-noise', { radius: parseInt(radius) });
        }
    });
    ipcRenderer.on('filter-oil-painting', () => {
        const radius = prompt('Enter oil painting radius (1-10):', '4');
        if (radius !== null) {
            const intensity = prompt('Enter intensity (10-100):', '50');
            if (intensity !== null) {
                applyFilter('oil-painting', { radius: parseInt(radius), intensity: parseInt(intensity) });
            }
        }
    });
    ipcRenderer.on('filter-watercolor', () => {
        const smoothness = prompt('Enter smoothness (1-15):', '5');
        if (smoothness !== null) {
            applyFilter('watercolor', { smoothness: parseInt(smoothness) });
        }
    });
    ipcRenderer.on('filter-posterize', () => {
        const levels = prompt('Enter posterize levels (2-16):', '4');
        if (levels !== null) {
            applyFilter('posterize', { levels: parseInt(levels) });
        }
    });
    ipcRenderer.on('filter-mosaic', () => {
        const blockSize = prompt('Enter mosaic block size (2-50):', '10');
        if (blockSize !== null) {
            applyFilter('mosaic', { blockSize: parseInt(blockSize) });
        }
    });
    ipcRenderer.on('filter-hue-saturation', () => {
        const hue = prompt('Enter hue shift (-180 to 180):', '0');
        if (hue !== null) {
            const saturation = prompt('Enter saturation adjustment (-100 to 100):', '0');
            if (saturation !== null) {
                const lightness = prompt('Enter lightness adjustment (-100 to 100):', '0');
                if (lightness !== null) {
                    applyFilter('hue-saturation', { 
                        hue: parseInt(hue), 
                        saturation: parseInt(saturation),
                        lightness: parseInt(lightness)
                    });
                }
            }
        }
    });
    ipcRenderer.on('filter-pinch-bulge', () => {
        const strength = prompt('Enter strength (-1 for pinch, 1 for bulge):', '0.5');
        if (strength !== null) {
            applyFilter('pinch-bulge', { strength: parseFloat(strength) });
        }
    });
    ipcRenderer.on('filter-twirl', () => {
        const angle = prompt('Enter twirl angle (0-360):', '90');
        if (angle !== null) {
            applyFilter('twirl', { angle: parseInt(angle) });
        }
    });
    ipcRenderer.on('filter-wave', () => {
        const amplitude = prompt('Enter wave amplitude (1-50):', '10');
        if (amplitude !== null) {
            const wavelength = prompt('Enter wavelength (10-200):', '50');
            if (wavelength !== null) {
                const direction = prompt('Enter direction (horizontal/vertical):', 'horizontal');
                if (direction !== null) {
                    applyFilter('wave', { 
                        amplitude: parseInt(amplitude), 
                        wavelength: parseInt(wavelength),
                        direction: direction
                    });
                }
            }
        }
    });
    
    // Help menu handlers
    ipcRenderer.on('help-about', () => showAboutDialog());
    
    // Layer merge handler
    ipcRenderer.on('layer-merge', () => mergeLayerDown());
    
    // Layer ordering handlers
    ipcRenderer.on('layer-move-up', () => moveLayerUp());
    ipcRenderer.on('layer-move-down', () => moveLayerDown());
    
    // Flatten layers handler
    ipcRenderer.on('layer-flatten', () => {
        if (confirm('Flatten all visible layers? This cannot be undone.')) {
            flattenAllLayers();
        }
    });
    
    // Workspace menu handlers
    ipcRenderer.on('workspace-save', () => showSaveWorkspaceDialog());
    ipcRenderer.on('workspace-load', () => showLoadWorkspaceDialog());
    ipcRenderer.on('workspace-manage', () => showManageWorkspacesDialog());
    ipcRenderer.on('workspace-preset', (event, preset) => loadWorkspacePreset(preset));
    ipcRenderer.on('shortcuts-customize', () => showShortcutCustomizationDialog());
    ipcRenderer.on('theme-toggle', () => toggleTheme());
    ipcRenderer.on('theme-presets', () => showThemePresetsDialog());
    ipcRenderer.on('interface-scale-dialog', () => showInterfaceScaleDialog());
    ipcRenderer.on('interface-scale-cycle', () => cycleInterfaceScale());
    
    // Windows menu handlers
    ipcRenderer.on('window-toggle-panel', (event, panelSide, checked) => {
        togglePanel(panelSide, checked);
    });
    ipcRenderer.on('window-reset-panels', () => resetPanelPositions());
    ipcRenderer.on('window-save-layout', () => savePanelLayout());
    ipcRenderer.on('window-load-layout', () => loadPanelLayout());
    
    // AI Tools menu handlers
    ipcRenderer.on('ai-background-removal', () => applyAIBackgroundRemoval());
    ipcRenderer.on('ai-object-selection', () => enableAIObjectSelection());
    ipcRenderer.on('ai-smart-sharpen', () => applyAISmartSharpen());
    ipcRenderer.on('ai-auto-enhance', () => applyAIAutoEnhance());
    ipcRenderer.on('ai-intelligent-crop', () => showAIIntelligentCrop());
    ipcRenderer.on('ai-composition-overlay', () => toggleAICompositionOverlay());
}

// Setup Browser Menu Bar (for standalone browser mode)
function setupBrowserMenuBar() {
    // Show menu bar only in browser mode (when Electron is not available)
    if (typeof require === 'undefined') {
        const menuBar = document.getElementById('menu-bar');
        if (menuBar) {
            menuBar.style.display = 'flex';
        }
        
        // Setup menu button handlers
        const menuButtons = document.querySelectorAll('.menu-btn');
        menuButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                handleMenuAction(action);
            });
        });
    }
}

function handleMenuAction(action) {
    switch (action) {
        // File menu
        case 'file-new':
            if (confirm('Create a new canvas? Unsaved changes will be lost.')) {
                newCanvas();
            }
            break;
        case 'file-new-with-size':
            showCanvasSizeDialog();
            break;
        case 'file-open':
            openProject();
            break;
        case 'file-import':
            importImage();
            break;
        case 'file-save':
            saveProject();
            break;
        case 'file-save-as':
            saveProjectAs();
            break;
        case 'file-export':
            exportImage();
            break;
        case 'file-settings':
            showSettingsDialog();
            break;
        
        // Edit menu
        case 'edit-undo':
            undo();
            break;
        case 'edit-redo':
            redo();
            break;
        case 'edit-clear-canvas':
            clearCanvas();
            break;
        
        // View menu
        case 'view-zoom-in':
            zoom(1.2);
            break;
        case 'view-zoom-out':
            zoom(0.8);
            break;
        case 'view-reset-zoom':
            resetZoom();
            break;
        case 'view-fit-canvas':
            fitCanvas();
            break;
        
        // Windows menu
        case 'window-show-left':
            showPanel('left-panel');
            break;
        case 'window-show-color':
            showPanel('color-panel');
            break;
        case 'window-show-right':
            showPanel('right-panel');
            break;
        case 'window-show-toolbar':
            showPanel('toolbar');
            break;
        case 'window-show-contextual':
            showPanel('contextual-taskbar');
            break;
        case 'window-toggle-rulers':
            toggleRulers();
            break;
        case 'window-node-editor':
            showNodeEditor();
            break;
        case 'window-layout-manager':
            if (typeof uiCustomization !== 'undefined') {
                uiCustomization.showLayoutManager();
            }
            break;
        case 'window-compact-mode':
            if (typeof uiCustomization !== 'undefined') {
                uiCustomization.toggleCompactMode();
                showNotification('Compact mode ' + (uiCustomization.compactMode ? 'enabled' : 'disabled'));
            }
            break;
        case 'window-touch-mode':
            if (typeof uiCustomization !== 'undefined') {
                uiCustomization.toggleTouchMode();
                showNotification('Touch mode ' + (uiCustomization.touchMode ? 'enabled' : 'disabled'));
            }
            break;
        
        // Help menu
        case 'help-tutorials':
            if (typeof learningHelp !== 'undefined') {
                learningHelp.showTutorialList();
            }
            break;
        case 'help-getting-started':
            if (typeof learningHelp !== 'undefined') {
                learningHelp.startTutorial('getting-started');
            }
            break;
        case 'help-keyboard-shortcuts':
            if (typeof accessibility !== 'undefined') {
                accessibility.showKeyboardShortcutsHelp();
            }
            break;
        case 'help-accessibility':
            if (typeof accessibility !== 'undefined') {
                accessibility.showAccessibilitySettings();
            }
            break;
        case 'help-onboarding':
            if (typeof learningHelp !== 'undefined') {
                learningHelp.onboardingCompleted = false;
                learningHelp.saveProgress();
                learningHelp.startOnboarding();
            }
            break;
        
        // Workspace menu
        case 'workspace-customize-shortcuts':
            showShortcutCustomizationDialog();
            break;
        case 'theme-toggle':
            toggleTheme();
            break;
        case 'theme-presets':
            showThemePresetsDialog();
            break;
        case 'interface-scale':
            showInterfaceScaleDialog();
            break;
        
        // AI Tools menu
        case 'ai-background-removal':
            applyAIBackgroundRemoval();
            break;
        case 'ai-object-selection':
            enableAIObjectSelection();
            break;
        case 'ai-smart-sharpen':
            applyAISmartSharpen();
            break;
        case 'ai-auto-enhance':
            applyAIAutoEnhance();
            break;
        case 'ai-intelligent-crop':
            showAIIntelligentCrop();
            break;
        case 'ai-composition-overlay':
            toggleAICompositionOverlay();
            break;
        
        // Color Management & Grading menu (Category 6)
        case 'color-curves':
            showCurvesDialog();
            break;
        case 'color-levels':
            showLevelsDialog();
            break;
        case 'color-selective':
            showSelectiveColorDialog();
            break;
        case 'color-balance':
            showColorBalanceDialog();
            break;
        case 'color-hsl':
            showHSLDialog();
            break;
        case 'color-wheels':
            showColorWheelsDialog();
            break;
        case 'color-split-toning':
            showSplitToningDialog();
            break;
        case 'color-lookup':
            showColorLookupDialog();
            break;
        case 'color-match':
            showMatchColorDialog();
            break;
        case 'color-channel-mixer':
            showChannelMixerDialog();
            break;
        case 'color-photo-filter':
            showPhotoFilterDialog();
            break;
        case 'color-convert-profile':
            showConvertProfileDialog();
            break;
        case 'color-soft-proofing':
            showSoftProofingDialog();
            break;
        case 'color-gamut-warning':
            showGamutWarning();
            break;
        case 'color-apply-lut':
            showApplyLUTDialog();
            break;
        case 'color-calibrate':
            showCalibrationDialog();
            break;
        
        default:
            console.warn('Unknown menu action:', action);
    }
}

function showPanel(panelId) {
    const panel = document.getElementById(panelId);
    if (panel) {
        panel.style.display = '';
        panel.classList.remove('hidden');
        // If panel was collapsed, expand it
        if (panel.classList.contains('collapsed')) {
            panel.classList.remove('collapsed');
        }
    }
}

// File Operations
function newCanvas() {
    state.layers = [];
    state.history = [];
    state.historyIndex = -1;
    setupCanvas();
    addLayer('Background');
    saveState();
}

async function saveProject() {
    try {
        const result = await ipcRenderer.invoke('show-save-dialog', {
            title: 'Save Project',
            defaultPath: 'untitled.artemis',
            filters: [
                { name: 'ARTemis Project', extensions: ['artemis'] }
            ]
        });
        
        if (!result.canceled && result.filePath) {
            const projectData = {
                version: '1.0',
                canvas: {
                    width: state.canvas.width,
                    height: state.canvas.height
                },
                layers: state.layers.map(layer => ({
                    id: layer.id,
                    name: layer.name,
                    visible: layer.visible,
                    opacity: layer.opacity,
                    type: layer.type || 'paint',
                    data: layer.canvas.toDataURL()
                }))
            };
            
            await ipcRenderer.invoke('save-file', result.filePath, JSON.stringify(projectData));
        }
    } catch (error) {
        console.error('Error saving project:', error);
        alert('Error saving project: ' + error.message);
    }
}

async function saveProjectAs() {
    await saveProject();
}

async function openProject() {
    try {
        const result = await ipcRenderer.invoke('show-open-dialog', {
            title: 'Open Project',
            filters: [
                { name: 'ARTemis Project', extensions: ['artemis'] },
                { name: 'Photoshop File', extensions: ['psd'] },
                { name: 'Image Files', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp'] },
                { name: 'All Files', extensions: ['*'] }
            ],
            properties: ['openFile']
        });
        
        if (!result.canceled && result.filePaths.length > 0) {
            const filePath = result.filePaths[0];
            const fileExt = filePath.split('.').pop().toLowerCase();
            
            // Check if it's an image file (including .psd, .tiff, .exr)
            if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'psd', 'webp', 'tiff', 'tif', 'exr'].includes(fileExt)) {
                await importImageAsLayer(filePath, result);
                return;
            }
            
            // In browser mode, file content is already loaded
            let content;
            if (result.fileContent) {
                content = result.fileContent;
            } else {
                // In Electron mode, need to read file
                const fileResult = await ipcRenderer.invoke('read-file', filePath);
                if (!fileResult.success) {
                    throw new Error(fileResult.error);
                }
                content = fileResult.content;
            }
            
            const projectData = JSON.parse(content);
            
            // Clear current state
            state.layers = [];
            state.canvas.width = projectData.canvas.width;
            state.canvas.height = projectData.canvas.height;
            setupCanvas();
            
            // Load layers
            for (const layerData of projectData.layers) {
                const canvas = document.createElement('canvas');
                canvas.width = state.canvas.width;
                canvas.height = state.canvas.height;
                
                const img = new Image();
                await new Promise((resolve) => {
                    img.onload = () => {
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        resolve();
                    };
                    img.src = layerData.data;
                });
                
                const layer = {
                    id: layerData.id,
                    name: layerData.name,
                    canvas: canvas,
                    visible: layerData.visible,
                    opacity: layerData.opacity,
                    type: layerData.type || 'paint',
                    children: layerData.type === 'group' ? [] : null
                };
                
                state.layers.push(layer);
            }
            
            state.activeLayer = state.layers[0];
            updateLayersList();
            compositeAllLayers();
            saveState();
        }
    } catch (error) {
        console.error('Error opening project:', error);
        alert('Error opening project: ' + error.message);
    }
}

// Import image as a new layer - dedicated function for the Import menu option
async function importImage() {
    try {
        const result = await ipcRenderer.invoke('show-open-dialog', {
            title: 'Import Image',
            filters: [
                { name: 'All Supported Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'tiff', 'tif', 'psd', 'exr'] },
                { name: 'PNG Image', extensions: ['png'] },
                { name: 'JPEG Image', extensions: ['jpg', 'jpeg'] },
                { name: 'GIF Image', extensions: ['gif'] },
                { name: 'TIFF Image', extensions: ['tiff', 'tif'] },
                { name: 'Photoshop File', extensions: ['psd'] },
                { name: 'OpenEXR Image', extensions: ['exr'] },
                { name: 'All Files', extensions: ['*'] }
            ],
            properties: ['openFile']
        });
        
        if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
            const filePath = result.filePaths[0];
            await importImageAsLayer(filePath, result);
        }
    } catch (error) {
        console.error('Error importing image:', error);
        alert('Error importing image: ' + error.message);
    }
}

// Import image file (including .psd, .tiff, .exr) as a new layer
// Note: Advanced formats like .psd, .tiff, and .exr will be imported as flattened images
// Full layer support would require dedicated parser libraries
async function importImageAsLayer(filePath, dialogResult) {
    try {
        // Read file as data URL
        let dataUrl;
        if (dialogResult && dialogResult.fileContent) {
            // Browser mode - file content is already available as text
            // For image files, we need to handle them as binary
            const file = dialogResult.file;
            if (file) {
                dataUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(file);
                });
            } else {
                // Fallback - try to use the content directly
                dataUrl = dialogResult.fileContent;
            }
        } else {
            // Electron mode - read file
            const fileResult = await ipcRenderer.invoke('read-file-as-dataurl', filePath);
            if (!fileResult.success) {
                throw new Error(fileResult.error);
            }
            dataUrl = fileResult.dataUrl;
        }
        
        // Use progressive loading for large images
        let img;
        try {
            if (typeof loadImageProgressively === 'function') {
                img = await loadImageProgressively(dataUrl, (progress, loadedImg) => {
                    console.log(`Loading image: ${progress}%`);
                    // Could show a progress bar here
                });
            } else {
                // Fallback to standard loading
                img = new Image();
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = () => reject(new Error('Failed to load image. Format may not be supported by the browser.'));
                    img.src = dataUrl;
                });
            }
        } catch (error) {
            console.error('Progressive loading failed, using fallback:', error);
            img = new Image();
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error('Failed to load image. Format may not be supported by the browser.'));
                img.src = dataUrl;
            });
        }
        
        // If no canvas exists, create one with the image dimensions
        if (state.layers.length === 0) {
            state.canvas.width = img.width;
            state.canvas.height = img.height;
            setupCanvas();
            addLayer('Background');
        }
        
        // Add a new layer with the imported image
        const fileName = (typeof filePath === 'string' ? filePath : 'imported').split(/[/\\]/).pop().replace(/\.[^.]+$/, '');
        const layer = addLayer(`Imported: ${fileName}`);
        
        if (layer) {
            const ctx = layer.canvas.getContext('2d');
            // Center the image if it's smaller than canvas
            const x = (state.canvas.width - img.width) / 2;
            const y = (state.canvas.height - img.height) / 2;
            ctx.drawImage(img, Math.max(0, x), Math.max(0, y));
            renderLayers();
            updateLayersPanel();
            saveState();
            
            alert('Image imported successfully as a new layer!');
        }
    } catch (error) {
        console.error('Error importing image:', error);
        alert('Error importing image: ' + error.message + '\n\nNote: Some formats (.tiff, .exr, .psd with layers) may not be fully supported in browser mode.');
    }
}

async function exportImage() {
    try {
        const result = await ipcRenderer.invoke('show-save-dialog', {
            title: 'Export Image',
            defaultPath: 'untitled.png',
            filters: [
                { name: 'PNG Image', extensions: ['png'] },
                { name: 'JPEG Image', extensions: ['jpg', 'jpeg'] },
                { name: 'GIF Image', extensions: ['gif'] },
                { name: 'TIFF Image', extensions: ['tiff', 'tif'] },
                { name: 'Photoshop File', extensions: ['psd'] },
                { name: 'OpenEXR Image', extensions: ['exr'] },
                { name: 'WebP Image', extensions: ['webp'] }
            ]
        });
        
        if (!result.canceled && result.filePath) {
            // Determine format based on file extension
            const filePath = typeof result.filePath === 'string' ? result.filePath : result.filePath.name || 'untitled.png';
            const ext = filePath.toLowerCase().split('.').pop();
            
            let dataUrl, base64Data, format;
            
            // Handle different export formats
            if (ext === 'png') {
                format = 'image/png';
                dataUrl = mainCanvas.toDataURL(format);
                base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
            } else if (ext === 'jpg' || ext === 'jpeg') {
                format = 'image/jpeg';
                dataUrl = mainCanvas.toDataURL(format, 0.95); // 95% quality for JPEG
                base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
            } else if (ext === 'webp') {
                format = 'image/webp';
                dataUrl = mainCanvas.toDataURL(format, 0.95);
                base64Data = dataUrl.replace(/^data:image\/webp;base64,/, '');
            } else if (ext === 'gif') {
                // GIF export - use PNG format as fallback (GIF encoding requires additional library)
                format = 'image/png';
                dataUrl = mainCanvas.toDataURL(format);
                base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
                alert('Note: GIF export uses PNG format. For animated GIF, use dedicated GIF creation tools.');
            } else if (ext === 'tiff' || ext === 'tif') {
                // TIFF export - use TIFF exporter module
                try {
                    if (typeof exportToTIFF === 'function') {
                        const tiffData = await exportToTIFF(mainCanvas);
                        // Convert ArrayBuffer to base64
                        const uint8Array = new Uint8Array(tiffData);
                        base64Data = btoa(String.fromCharCode.apply(null, uint8Array));
                        format = 'image/tiff';
                        console.log('TIFF export successful');
                    } else {
                        throw new Error('TIFF exporter not available');
                    }
                } catch (error) {
                    console.error('TIFF export failed:', error);
                    // Fallback to PNG
                    format = 'image/png';
                    dataUrl = mainCanvas.toDataURL(format);
                    base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
                    alert('Note: TIFF export failed, using PNG format as fallback. Error: ' + error.message);
                }
            } else if (ext === 'psd') {
                // PSD export - use PSD exporter module with full layer support
                try {
                    if (typeof exportToPSD === 'function') {
                        const psdData = await exportToPSD(state, mainCanvas);
                        // Convert ArrayBuffer to base64
                        const uint8Array = new Uint8Array(psdData);
                        base64Data = btoa(String.fromCharCode.apply(null, uint8Array));
                        format = 'image/vnd.adobe.photoshop';
                        console.log('PSD export successful with layers preserved');
                        alert('PSD file exported successfully with all layers preserved!');
                    } else {
                        throw new Error('PSD exporter not available');
                    }
                } catch (error) {
                    console.error('PSD export failed:', error);
                    // Fallback to PNG
                    format = 'image/png';
                    dataUrl = mainCanvas.toDataURL(format);
                    base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
                    alert('Note: PSD export failed, using PNG format as fallback. Error: ' + error.message);
                }
            } else if (ext === 'exr') {
                // EXR export - use PNG format as fallback (EXR encoding requires OpenEXR library)
                format = 'image/png';
                dataUrl = mainCanvas.toDataURL(format);
                base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
                alert('Note: OpenEXR export uses PNG format as fallback. Full EXR support requires OpenEXR libraries.');
            } else {
                // Default to PNG
                format = 'image/png';
                dataUrl = mainCanvas.toDataURL(format);
                base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
            }
            
            const saveResult = await ipcRenderer.invoke('save-binary-file', result.filePath, base64Data);
            
            if (saveResult.success) {
                alert('Image exported successfully!');
            } else {
                alert('Error exporting image: ' + saveResult.error);
            }
        }
    } catch (error) {
        console.error('Error exporting image:', error);
        alert('Error exporting image: ' + error.message);
    }
}

// Canvas Size Dialog
let canvasSizeDialogInitialized = false;
let canvasSizeDialogState = {
    currentUnit: 'pixels',
    currentDpi: 300,
    blueline: false
};

function initCanvasSizeDialog() {
    if (canvasSizeDialogInitialized) return;
    canvasSizeDialogInitialized = true;
    
    const dialog = document.getElementById('canvas-size-dialog');
    const unitBtns = dialog.querySelectorAll('.unit-btn');
    const widthInput = document.getElementById('canvas-width-input');
    const heightInput = document.getElementById('canvas-height-input');
    const dpiInput = document.getElementById('canvas-dpi-input');
    const dpiGroup = document.getElementById('dpi-group');
    const unitLabels = dialog.querySelectorAll('.unit-label');
    
    // Setup unit toggle
    unitBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            unitBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            canvasSizeDialogState.currentUnit = btn.dataset.unit;
            
            if (canvasSizeDialogState.currentUnit === 'inches') {
                // Convert pixels to inches
                const widthInches = parseFloat(widthInput.value) / canvasSizeDialogState.currentDpi;
                const heightInches = parseFloat(heightInput.value) / canvasSizeDialogState.currentDpi;
                widthInput.value = widthInches.toFixed(2);
                heightInput.value = heightInches.toFixed(2);
                unitLabels.forEach(label => label.textContent = 'in');
                dpiGroup.classList.remove('hidden');
            } else {
                // Convert inches to pixels
                const widthPixels = Math.round(parseFloat(widthInput.value) * canvasSizeDialogState.currentDpi);
                const heightPixels = Math.round(parseFloat(heightInput.value) * canvasSizeDialogState.currentDpi);
                widthInput.value = widthPixels;
                heightInput.value = heightPixels;
                unitLabels.forEach(label => label.textContent = 'px');
                dpiGroup.classList.add('hidden');
            }
        });
    });
    
    // DPI change handler
    dpiInput.addEventListener('input', () => {
        canvasSizeDialogState.currentDpi = parseInt(dpiInput.value);
    });
    
    // Setup preset buttons
    const presetBtns = dialog.querySelectorAll('.preset-btn');
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const width = parseInt(btn.dataset.width);
            const height = parseInt(btn.dataset.height);
            const blueline = btn.dataset.blueline === 'true';
            
            // Remove active class from all preset buttons
            presetBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');
            
            if (canvasSizeDialogState.currentUnit === 'inches') {
                widthInput.value = (width / canvasSizeDialogState.currentDpi).toFixed(2);
                heightInput.value = (height / canvasSizeDialogState.currentDpi).toFixed(2);
            } else {
                widthInput.value = width;
                heightInput.value = height;
            }
            
            // Store blueline flag for canvas creation
            canvasSizeDialogState.blueline = blueline;
        });
    });
    
    // Close dialog
    const closeDialog = () => {
        dialog.classList.add('hidden');
    };
    
    document.getElementById('canvas-size-dialog-close').addEventListener('click', closeDialog);
    document.getElementById('canvas-size-dialog-cancel').addEventListener('click', closeDialog);
    
    // Create canvas with custom size
    document.getElementById('canvas-size-dialog-ok').addEventListener('click', () => {
        let width, height;
        
        if (canvasSizeDialogState.currentUnit === 'inches') {
            width = Math.round(parseFloat(widthInput.value) * canvasSizeDialogState.currentDpi);
            height = Math.round(parseFloat(heightInput.value) * canvasSizeDialogState.currentDpi);
        } else {
            width = parseInt(widthInput.value);
            height = parseInt(heightInput.value);
        }
        
        if (width > 0 && height > 0 && width <= 10000 && height <= 10000) {
            newCanvasWithSize(width, height, canvasSizeDialogState.blueline);
            canvasSizeDialogState.blueline = false; // Reset after use
            closeDialog();
        } else {
            alert('Please enter valid dimensions (1-10000 pixels).');
        }
    });
}

function showCanvasSizeDialog() {
    initCanvasSizeDialog();
    const dialog = document.getElementById('canvas-size-dialog');
    dialog.classList.remove('hidden');
}

function newCanvasWithSize(width, height, blueline = false) {
    if (state.layers.length > 0) {
        if (!confirm('Create a new canvas? Unsaved changes will be lost.')) {
            return;
        }
    }
    
    state.canvas.width = width;
    state.canvas.height = height;
    state.layers = [];
    state.history = [];
    state.historyIndex = -1;
    state.canvas.zoom = 1;
    
    setupCanvas();
    addLayer('Background');
    
    // Add blueline trim if requested
    if (blueline) {
        addBluelineTrim();
    }
    
    saveState();
    
    // Reset zoom to fit new canvas
    resetZoom();
}

// Add blueline trim to canvas for professional comic/illustration work
function addBluelineTrim() {
    const bluelineLayer = addLayer('Blueline Trim');
    if (bluelineLayer) {
        const ctx = bluelineLayer.canvas.getContext('2d');
        
        // Set blueline color (light blue, non-photo blue)
        ctx.strokeStyle = 'rgba(173, 216, 230, 0.7)'; // Light blue
        ctx.lineWidth = 2;
        
        // Draw trim margins (0.5 inch margin at 300 DPI = 150 pixels)
        const margin = 150;
        
        // Outer border
        ctx.strokeRect(margin, margin, 
                      state.canvas.width - 2 * margin, 
                      state.canvas.height - 2 * margin);
        
        // Draw center guides
        ctx.beginPath();
        // Vertical center
        ctx.moveTo(state.canvas.width / 2, 0);
        ctx.lineTo(state.canvas.width / 2, state.canvas.height);
        // Horizontal center
        ctx.moveTo(0, state.canvas.height / 2);
        ctx.lineTo(state.canvas.width, state.canvas.height / 2);
        ctx.stroke();
        
        // Draw corner registration marks
        const markSize = 50;
        const markOffset = margin / 2;
        
        // Top-left
        ctx.beginPath();
        ctx.moveTo(markOffset - markSize, markOffset);
        ctx.lineTo(markOffset + markSize, markOffset);
        ctx.moveTo(markOffset, markOffset - markSize);
        ctx.lineTo(markOffset, markOffset + markSize);
        ctx.stroke();
        
        // Top-right
        const rightX = state.canvas.width - markOffset;
        ctx.beginPath();
        ctx.moveTo(rightX - markSize, markOffset);
        ctx.lineTo(rightX + markSize, markOffset);
        ctx.moveTo(rightX, markOffset - markSize);
        ctx.lineTo(rightX, markOffset + markSize);
        ctx.stroke();
        
        // Bottom-left
        const bottomY = state.canvas.height - markOffset;
        ctx.beginPath();
        ctx.moveTo(markOffset - markSize, bottomY);
        ctx.lineTo(markOffset + markSize, bottomY);
        ctx.moveTo(markOffset, bottomY - markSize);
        ctx.lineTo(markOffset, bottomY + markSize);
        ctx.stroke();
        
        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(rightX - markSize, bottomY);
        ctx.lineTo(rightX + markSize, bottomY);
        ctx.moveTo(rightX, bottomY - markSize);
        ctx.lineTo(rightX, bottomY + markSize);
        ctx.stroke();
        
        // Reduce opacity of blueline layer
        bluelineLayer.opacity = 60;
        
        renderLayers();
        updateLayersPanel();
    }
}

function showSettingsDialog() {
    const dialog = document.getElementById('settings-dialog');
    if (!dialog) {
        alert('Settings\n\nApplication Settings:\n- Version: 1.0.0\n- Canvas Size: ' + state.canvas.width + ' x ' + state.canvas.height + '\n- Layers: ' + state.layers.length);
        return;
    }
    
    // Update current info
    const canvasInfo = document.getElementById('settings-canvas-info');
    const layersInfo = document.getElementById('settings-layers-info');
    if (canvasInfo) canvasInfo.textContent = state.canvas.width + ' × ' + state.canvas.height + ' px';
    if (layersInfo) layersInfo.textContent = state.layers.length;
    
    dialog.classList.remove('hidden');
}

function initSettingsDialog() {
    const dialog = document.getElementById('settings-dialog');
    if (!dialog) return;
    
    const closeBtn = document.getElementById('settings-dialog-close');
    const okBtn = document.getElementById('settings-dialog-ok');
    
    const closeDialog = () => {
        dialog.classList.add('hidden');
    };
    
    if (closeBtn) closeBtn.addEventListener('click', closeDialog);
    if (okBtn) okBtn.addEventListener('click', closeDialog);
    
    // Close dialog when clicking outside
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            closeDialog();
        }
    });
    
    // Setup keyboard shortcut customization buttons
    const customizeBtn = document.getElementById('customize-shortcuts-btn');
    const resetBtn = document.getElementById('reset-shortcuts-btn');
    
    if (customizeBtn) {
        customizeBtn.addEventListener('click', () => {
            showShortcutCustomizationDialog();
        });
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Reset all keyboard shortcuts to defaults?')) {
                state.keyboardShortcuts = { ...defaultKeyboardShortcuts };
                localStorage.setItem('artemis-keyboard-shortcuts', JSON.stringify(state.keyboardShortcuts));
                alert('Keyboard shortcuts reset to defaults!');
            }
        });
    }
    
    // Setup Brush Engine functionality
    initBrushEngine();
    
    // Setup Phase 15 Performance & Rendering settings
    initPhase15Settings();
}

// Initialize Phase 15 Performance & Rendering settings
function initPhase15Settings() {
    // WebGL Acceleration checkbox
    const webglCheckbox = document.getElementById('enable-webgl-acceleration');
    if (webglCheckbox) {
        // Check WebGL availability and update UI
        if (typeof WebGLRenderer !== 'undefined' && WebGLRenderer.isWebGLAvailable()) {
            const statusSpan = document.getElementById('webgl-support-status');
            const infoStatus = document.getElementById('webgl-info-status');
            if (statusSpan) statusSpan.textContent = '✓ WebGL is available';
            if (infoStatus) infoStatus.textContent = 'Available';
            infoStatus.style.color = '#4CAF50';
            
            // Load saved preference
            const savedPref = localStorage.getItem('artemis-webgl-enabled');
            if (savedPref === 'true') {
                webglCheckbox.checked = true;
                state.webglEnabled = true;
            }
            
            // Handle checkbox change
            webglCheckbox.addEventListener('change', (e) => {
                state.webglEnabled = e.target.checked;
                localStorage.setItem('artemis-webgl-enabled', e.target.checked);
                console.log('WebGL acceleration:', e.target.checked ? 'enabled' : 'disabled');
            });
        } else {
            const statusSpan = document.getElementById('webgl-support-status');
            const infoStatus = document.getElementById('webgl-info-status');
            if (statusSpan) statusSpan.textContent = '✗ WebGL not supported on this device';
            if (infoStatus) infoStatus.textContent = 'Not available';
            infoStatus.style.color = '#f44336';
            webglCheckbox.disabled = true;
        }
    }
    
    // Tiled Rendering checkbox
    const tiledCheckbox = document.getElementById('enable-tiled-rendering');
    if (tiledCheckbox) {
        // Load saved preference
        const savedPref = localStorage.getItem('artemis-tiled-rendering-enabled');
        if (savedPref === 'true') {
            tiledCheckbox.checked = true;
            state.tiledRenderingEnabled = true;
        }
        
        // Handle checkbox change
        tiledCheckbox.addEventListener('change', (e) => {
            state.tiledRenderingEnabled = e.target.checked;
            localStorage.setItem('artemis-tiled-rendering-enabled', e.target.checked);
            console.log('Tiled rendering:', e.target.checked ? 'enabled' : 'disabled');
            
            // Update status
            const statusSpan = document.getElementById('tiled-rendering-status');
            if (statusSpan) {
                statusSpan.textContent = e.target.checked ? 'Enabled' : 'Not active';
            }
        });
    }
    
    // Progressive Loading checkbox
    const progressiveCheckbox = document.getElementById('enable-progressive-loading');
    if (progressiveCheckbox) {
        // Load saved preference
        const savedPref = localStorage.getItem('artemis-progressive-loading-enabled');
        if (savedPref === 'false') {
            progressiveCheckbox.checked = false;
            state.progressiveLoadingEnabled = false;
        } else {
            state.progressiveLoadingEnabled = true;
        }
        
        // Handle checkbox change
        progressiveCheckbox.addEventListener('change', (e) => {
            state.progressiveLoadingEnabled = e.target.checked;
            localStorage.setItem('artemis-progressive-loading-enabled', e.target.checked);
            console.log('Progressive loading:', e.target.checked ? 'enabled' : 'disabled');
        });
    }
}

// Brush Engine functionality
function initBrushEngine() {
    const testCanvas = document.getElementById('brush-test-canvas');
    if (!testCanvas) return;
    
    const testCtx = testCanvas.getContext('2d');
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    
    // Test brush settings state
    const testBrush = {
        size: 20,
        opacity: 100,
        hardness: 80,
        flow: 100,
        spacing: 10,
        smoothing: 0,
        angle: 0,
        angleJitter: 0,
        scatterX: 0,
        scatterY: 0,
        color: '#000000',
        type: 'digital-soft'
    };
    
    // Setup all test brush sliders
    const setupTestSlider = (id, property) => {
        const slider = document.getElementById(id);
        const valueSpan = document.getElementById(id.replace('test-brush-', 'test-') + '-value');
        if (slider && valueSpan) {
            slider.addEventListener('input', (e) => {
                testBrush[property] = parseInt(e.target.value);
                valueSpan.textContent = testBrush[property];
            });
        }
    };
    
    setupTestSlider('test-brush-size', 'size');
    setupTestSlider('test-brush-opacity', 'opacity');
    setupTestSlider('test-brush-hardness', 'hardness');
    setupTestSlider('test-brush-flow', 'flow');
    setupTestSlider('test-brush-spacing', 'spacing');
    setupTestSlider('test-brush-smoothing', 'smoothing');
    setupTestSlider('test-brush-angle', 'angle');
    setupTestSlider('test-brush-angle-jitter', 'angleJitter');
    setupTestSlider('test-brush-scatter-x', 'scatterX');
    setupTestSlider('test-brush-scatter-y', 'scatterY');
    
    // Color picker for test brush
    const testColorPicker = document.getElementById('brush-test-color');
    if (testColorPicker) {
        testColorPicker.addEventListener('input', (e) => {
            testBrush.color = e.target.value;
        });
    }
    
    // Brush type selector
    const testBrushSelector = document.getElementById('brush-test-selector');
    if (testBrushSelector) {
        testBrushSelector.addEventListener('change', (e) => {
            testBrush.type = e.target.value;
            // Load brush preset settings if available
            const preset = brushPresets[e.target.value];
            if (preset) {
                Object.assign(testBrush, preset);
                testBrush.type = e.target.value; // Preserve type
                
                // Update UI sliders
                document.getElementById('test-brush-size').value = testBrush.size;
                document.getElementById('test-size-value').textContent = testBrush.size;
                document.getElementById('test-brush-opacity').value = testBrush.opacity;
                document.getElementById('test-opacity-value').textContent = testBrush.opacity;
                document.getElementById('test-brush-hardness').value = testBrush.hardness;
                document.getElementById('test-hardness-value').textContent = testBrush.hardness;
                document.getElementById('test-brush-flow').value = testBrush.flow;
                document.getElementById('test-flow-value').textContent = testBrush.flow;
                document.getElementById('test-brush-spacing').value = testBrush.spacing;
                document.getElementById('test-spacing-value').textContent = testBrush.spacing;
                document.getElementById('test-brush-smoothing').value = testBrush.smoothing;
                document.getElementById('test-smoothing-value').textContent = testBrush.smoothing;
            }
        });
    }
    
    // Test canvas drawing
    testCanvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        const rect = testCanvas.getBoundingClientRect();
        lastX = e.clientX - rect.left;
        lastY = e.clientY - rect.top;
    });
    
    testCanvas.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        const rect = testCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        drawTestBrushStroke(testCtx, lastX, lastY, x, y, testBrush);
        
        lastX = x;
        lastY = y;
    });
    
    testCanvas.addEventListener('mouseup', () => {
        isDrawing = false;
    });
    
    testCanvas.addEventListener('mouseleave', () => {
        isDrawing = false;
    });
    
    // Clear button
    const clearBtn = document.getElementById('clear-brush-test-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            testCtx.clearRect(0, 0, testCanvas.width, testCanvas.height);
        });
    }
    
    // Fill black button
    const fillBlackBtn = document.getElementById('fill-black-test-btn');
    if (fillBlackBtn) {
        fillBlackBtn.addEventListener('click', () => {
            testCtx.fillStyle = '#000000';
            testCtx.fillRect(0, 0, testCanvas.width, testCanvas.height);
        });
    }
    
    // Fill white button
    const fillWhiteBtn = document.getElementById('fill-white-test-btn');
    if (fillWhiteBtn) {
        fillWhiteBtn.addEventListener('click', () => {
            testCtx.fillStyle = '#FFFFFF';
            testCtx.fillRect(0, 0, testCanvas.width, testCanvas.height);
        });
    }
    
    // Auto-contrast color button
    const autoContrastBtn = document.getElementById('auto-contrast-test-btn');
    if (autoContrastBtn) {
        autoContrastBtn.addEventListener('click', () => {
            // Get average color of canvas background
            const imageData = testCtx.getImageData(0, 0, testCanvas.width, testCanvas.height);
            let r = 0, g = 0, b = 0, count = 0;
            for (let i = 0; i < imageData.data.length; i += 4) {
                r += imageData.data[i];
                g += imageData.data[i + 1];
                b += imageData.data[i + 2];
                count++;
            }
            r = Math.round(r / count);
            g = Math.round(g / count);
            b = Math.round(b / count);
            
            // Calculate brightness
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            
            // Set contrasting color
            const newColor = brightness > 128 ? '#000000' : '#FFFFFF';
            testBrush.color = newColor;
            if (testColorPicker) {
                testColorPicker.value = newColor;
            }
        });
    }
    
    // Save as preset button
    const saveTestBtn = document.getElementById('save-test-brush-btn');
    if (saveTestBtn) {
        saveTestBtn.addEventListener('click', () => {
            const name = prompt('Enter a name for this brush preset:');
            if (name && name.trim()) {
                const newBrush = {
                    name: name.trim(),
                    ...testBrush
                };
                state.customBrushes.push(newBrush);
                saveBrushPresetsToStorage();
                alert(`Brush "${name}" saved successfully!`);
            }
        });
    }
    
    // Load preset button
    const loadPresetBtn = document.getElementById('load-preset-to-test-btn');
    if (loadPresetBtn) {
        loadPresetBtn.addEventListener('click', () => {
            const presetName = prompt('Enter preset name to load (e.g., "soft", "ink", "watercolor"):');
            if (presetName) {
                const preset = brushPresets[presetName] || state.customBrushes.find(b => b.name === presetName);
                if (preset) {
                    // Copy preset values to test brush
                    Object.assign(testBrush, preset);
                    
                    // Update UI sliders
                    document.getElementById('test-brush-size').value = testBrush.size;
                    document.getElementById('test-size-value').textContent = testBrush.size;
                    document.getElementById('test-brush-opacity').value = testBrush.opacity;
                    document.getElementById('test-opacity-value').textContent = testBrush.opacity;
                    document.getElementById('test-brush-hardness').value = testBrush.hardness;
                    document.getElementById('test-hardness-value').textContent = testBrush.hardness;
                    document.getElementById('test-brush-flow').value = testBrush.flow;
                    document.getElementById('test-flow-value').textContent = testBrush.flow;
                    document.getElementById('test-brush-spacing').value = testBrush.spacing;
                    document.getElementById('test-spacing-value').textContent = testBrush.spacing;
                    document.getElementById('test-brush-smoothing').value = testBrush.smoothing;
                    document.getElementById('test-smoothing-value').textContent = testBrush.smoothing;
                    document.getElementById('test-brush-angle').value = testBrush.angle;
                    document.getElementById('test-angle-value').textContent = testBrush.angle;
                    document.getElementById('test-brush-angle-jitter').value = testBrush.angleJitter;
                    document.getElementById('test-angle-jitter-value').textContent = testBrush.angleJitter;
                    document.getElementById('test-brush-scatter-x').value = testBrush.scatterX;
                    document.getElementById('test-scatter-x-value').textContent = testBrush.scatterX;
                    document.getElementById('test-brush-scatter-y').value = testBrush.scatterY;
                    document.getElementById('test-scatter-y-value').textContent = testBrush.scatterY;
                    
                    alert(`Loaded preset "${presetName}"`);
                } else {
                    alert(`Preset "${presetName}" not found.`);
                }
            }
        });
    }
    
    // Apply to main brush button
    const applyToMainBtn = document.getElementById('apply-test-to-main-btn');
    if (applyToMainBtn) {
        applyToMainBtn.addEventListener('click', () => {
            // Copy test brush settings to main brush
            state.brush.size = testBrush.size;
            state.brush.opacity = testBrush.opacity;
            state.brush.hardness = testBrush.hardness;
            state.brush.flow = testBrush.flow;
            state.brush.spacing = testBrush.spacing;
            state.brush.smoothing = testBrush.smoothing;
            state.brush.angle = testBrush.angle;
            state.brush.angleJitter = testBrush.angleJitter;
            state.brush.scatterX = testBrush.scatterX;
            state.brush.scatterY = testBrush.scatterY;
            
            // Update main brush UI
            document.getElementById('brush-size').value = state.brush.size;
            document.getElementById('brush-size-value').textContent = state.brush.size;
            document.getElementById('brush-opacity').value = state.brush.opacity;
            document.getElementById('brush-opacity-value').textContent = state.brush.opacity;
            document.getElementById('brush-hardness').value = state.brush.hardness;
            document.getElementById('brush-hardness-value').textContent = state.brush.hardness;
            document.getElementById('brush-flow').value = state.brush.flow;
            document.getElementById('brush-flow-value').textContent = state.brush.flow;
            document.getElementById('brush-spacing').value = state.brush.spacing;
            document.getElementById('brush-spacing-value').textContent = state.brush.spacing;
            document.getElementById('brush-smoothing').value = state.brush.smoothing;
            document.getElementById('brush-smoothing-value').textContent = state.brush.smoothing;
            
            updateCursor();
            alert('Settings applied to main brush!');
        });
    }
    
    // Import .abr file button
    const importAbrBtn = document.getElementById('import-abr-btn');
    const abrFileInput = document.getElementById('abr-file-input');
    if (importAbrBtn && abrFileInput) {
        importAbrBtn.addEventListener('click', () => {
            abrFileInput.click();
        });
        
        abrFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                importAbrFile(file);
            }
        });
    }
    
    // View imported brushes button
    const viewImportedBtn = document.getElementById('view-imported-brushes-btn');
    if (viewImportedBtn) {
        viewImportedBtn.addEventListener('click', () => {
            showImportedBrushesDialog();
        });
    }
}

function drawTestBrushStroke(ctx, x1, y1, x2, y2, brush) {
    // Simple brush stroke for testing
    const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const steps = Math.max(1, Math.ceil(distance / (brush.size * brush.spacing / 100)));
    
    // Parse brush color
    const color = brush.color || '#000000';
    const rgb = hexToRgb(color);
    
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        let x = x1 + (x2 - x1) * t;
        let y = y1 + (y2 - y1) * t;
        
        // Apply scatter
        if (brush.scatterX > 0) {
            x += (Math.random() - 0.5) * brush.size * (brush.scatterX / 100);
        }
        if (brush.scatterY > 0) {
            y += (Math.random() - 0.5) * brush.size * (brush.scatterY / 100);
        }
        
        // Draw brush dab
        ctx.save();
        ctx.globalAlpha = (brush.opacity / 100) * (brush.flow / 100);
        
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, brush.size / 2);
        const hardness = brush.hardness / 100;
        gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`);
        gradient.addColorStop(hardness, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`);
        gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, brush.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Helper function to convert hex to RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

// Import .abr file (simplified - just creates placeholder brushes)
function importAbrFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            // Note: Full .abr parsing is complex and would require a dedicated library
            // For now, we'll create a simple imported brush based on the filename
            const brushName = file.name.replace('.abr', '');
            
            // Create a basic imported brush
            const importedBrush = {
                name: `Imported: ${brushName}`,
                size: 25,
                opacity: 85,
                hardness: 60,
                flow: 80,
                spacing: 10,
                smoothing: 10,
                angle: 0,
                angleJitter: 5,
                scatterX: 5,
                scatterY: 5,
                imported: true,
                source: file.name
            };
            
            // Add to custom brushes with imported flag
            state.customBrushes.push(importedBrush);
            saveBrushPresetsToStorage();
            
            alert(`Imported brush "${brushName}" successfully!\n\nNote: Full .abr parsing is not yet implemented. A placeholder brush has been created.\nYou can adjust its settings in the Brush Engine.`);
        } catch (error) {
            console.error('Error importing .abr file:', error);
            alert('Error importing .abr file. The file may be corrupted or in an unsupported format.');
        }
    };
    reader.readAsArrayBuffer(file);
}

function showImportedBrushesDialog() {
    const importedBrushes = state.customBrushes.filter(b => b.imported);
    
    if (importedBrushes.length === 0) {
        alert('No imported brushes found.\n\nImport .abr files using the "Import .abr File" button in the Brush Engine section.');
        return;
    }
    
    let message = 'Imported Brushes:\n\n';
    importedBrushes.forEach((brush, index) => {
        message += `${index + 1}. ${brush.name}\n   Source: ${brush.source || 'Unknown'}\n\n`;
    });
    message += '\nThese brushes are available in the Brushes panel under the "Imported Brushes" category.';
    
    alert(message);
}

// Load keyboard shortcuts from localStorage
function loadKeyboardShortcuts() {
    const saved = localStorage.getItem('artemis-keyboard-shortcuts');
    if (saved) {
        try {
            state.keyboardShortcuts = JSON.parse(saved);
        } catch (e) {
            console.error('Error loading keyboard shortcuts:', e);
        }
    }
}

// Keyboard shortcut customization dialog
let shortcutEditingKey = null;
let tempShortcuts = {};

function showShortcutCustomizationDialog() {
    const dialog = document.getElementById('shortcut-customization-dialog');
    if (!dialog) return;
    
    // Create a copy of current shortcuts
    tempShortcuts = { ...state.keyboardShortcuts };
    
    // Populate shortcut list
    const shortcutList = document.getElementById('shortcut-list');
    shortcutList.innerHTML = '';
    
    const actionNames = {
        // Tools
        'brush': 'Brush Tool',
        'eraser': 'Eraser Tool',
        'fill': 'Fill Tool',
        'eyedropper': 'Eyedropper Tool',
        'selection': 'Selection Tool',
        'text': 'Text Tool',
        'shapes': 'Shapes Tool',
        'gradient': 'Gradient Tool',
        'move': 'Move Tool',
        'rotate': 'Rotate Tool',
        'scale': 'Scale Tool',
        'crop': 'Crop Tool',
        'clone': 'Clone Stamp Tool',
        'dodge': 'Dodge Tool',
        'burn': 'Burn Tool',
        'sponge': 'Sponge Tool',
        // File operations
        'file-new': 'New Canvas',
        'file-new-with-size': 'New Canvas with Size',
        'file-open': 'Open',
        'file-save': 'Save',
        'file-save-as': 'Save As',
        'file-export': 'Export',
        'file-settings': 'Settings',
        // Edit operations
        'edit-undo': 'Undo',
        'edit-redo': 'Redo',
        'edit-cut': 'Cut',
        'edit-copy': 'Copy',
        'edit-paste': 'Paste',
        // View operations
        'view-zoom-in': 'Zoom In',
        'view-zoom-out': 'Zoom Out',
        'view-reset-zoom': 'Reset Zoom',
        // Brush size
        'brush-size-decrease': 'Decrease Brush Size',
        'brush-size-increase': 'Increase Brush Size',
        // Layer operations
        'layer-new': 'New Layer',
        'layer-duplicate': 'Duplicate Layer',
        'layer-delete': 'Delete Layer',
        'layer-move-up': 'Move Layer Up',
        'layer-move-down': 'Move Layer Down',
        'layer-merge-down': 'Merge Down',
        'layer-flatten': 'Flatten All Layers'
    };
    
    for (const [action, key] of Object.entries(tempShortcuts)) {
        const item = document.createElement('div');
        item.className = 'shortcut-customization-item';
        
        const label = document.createElement('div');
        label.className = 'shortcut-customization-label';
        label.textContent = actionNames[action] || action;
        
        const keyDisplay = document.createElement('div');
        keyDisplay.className = 'shortcut-customization-key';
        keyDisplay.textContent = key.toUpperCase();
        keyDisplay.dataset.tool = action;
        
        keyDisplay.addEventListener('click', () => {
            // Clear any previous editing state
            document.querySelectorAll('.shortcut-customization-key').forEach(k => {
                k.classList.remove('editing');
            });
            
            keyDisplay.classList.add('editing');
            keyDisplay.textContent = 'Press a key...';
            shortcutEditingKey = action;
        });
        
        item.appendChild(label);
        item.appendChild(keyDisplay);
        shortcutList.appendChild(item);
    }
    
    dialog.classList.remove('hidden');
    
    // Setup dialog buttons
    setupShortcutDialogButtons();
}

function setupShortcutDialogButtons() {
    const dialog = document.getElementById('shortcut-customization-dialog');
    const closeBtn = document.getElementById('shortcut-customization-close');
    const cancelBtn = document.getElementById('shortcut-customization-cancel');
    const saveBtn = document.getElementById('shortcut-customization-save');
    const importBtn = document.getElementById('shortcut-import');
    const exportBtn = document.getElementById('shortcut-export');
    const resetBtn = document.getElementById('shortcut-reset');
    
    const closeDialog = () => {
        dialog.classList.add('hidden');
        shortcutEditingKey = null;
        tempShortcuts = {};
        document.removeEventListener('keydown', handleShortcutKeyPress);
    };
    
    if (closeBtn) {
        closeBtn.removeEventListener('click', closeDialog);
        closeBtn.addEventListener('click', closeDialog);
    }
    if (cancelBtn) {
        cancelBtn.removeEventListener('click', closeDialog);
        cancelBtn.addEventListener('click', closeDialog);
    }
    if (saveBtn) {
        saveBtn.removeEventListener('click', saveShortcuts);
        saveBtn.addEventListener('click', saveShortcuts);
    }
    if (importBtn) {
        importBtn.removeEventListener('click', importShortcuts);
        importBtn.addEventListener('click', importShortcuts);
    }
    if (exportBtn) {
        exportBtn.removeEventListener('click', exportShortcuts);
        exportBtn.addEventListener('click', exportShortcuts);
    }
    if (resetBtn) {
        resetBtn.removeEventListener('click', resetShortcuts);
        resetBtn.addEventListener('click', resetShortcuts);
    }
    
    // Listen for key presses when editing
    document.removeEventListener('keydown', handleShortcutKeyPress);
    document.addEventListener('keydown', handleShortcutKeyPress);
}

function importShortcuts() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                tempShortcuts = { ...imported };
                showShortcutCustomizationDialog();
                alert('Shortcuts imported successfully! Click "Save Changes" to apply them.');
            } catch (err) {
                alert('Error importing shortcuts: Invalid file format');
                console.error(err);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function exportShortcuts() {
    const data = JSON.stringify(tempShortcuts, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'artemis-shortcuts.json';
    a.click();
    URL.revokeObjectURL(url);
    alert('Shortcuts exported successfully!');
}

function resetShortcuts() {
    if (confirm('Reset all keyboard shortcuts to defaults? This will discard any custom changes.')) {
        tempShortcuts = { ...defaultKeyboardShortcuts };
        showShortcutCustomizationDialog();
    }
}

function handleShortcutKeyPress(e) {
    if (!shortcutEditingKey) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const key = e.key.toLowerCase();
    
    // Ignore modifier keys alone
    if (['control', 'shift', 'alt', 'meta'].includes(key)) return;
    
    // Check if key is already in use
    const existingTool = Object.entries(tempShortcuts).find(([tool, k]) => 
        k.toLowerCase() === key && tool !== shortcutEditingKey
    );
    
    if (existingTool) {
        alert(`Key '${key.toUpperCase()}' is already assigned to ${existingTool[0]}`);
        return;
    }
    
    // Update the shortcut
    tempShortcuts[shortcutEditingKey] = key;
    
    // Update display
    const keyDisplay = document.querySelector(`[data-tool="${shortcutEditingKey}"]`);
    if (keyDisplay) {
        keyDisplay.textContent = key.toUpperCase();
        keyDisplay.classList.remove('editing');
    }
    
    shortcutEditingKey = null;
}

function saveShortcuts() {
    state.keyboardShortcuts = { ...tempShortcuts };
    localStorage.setItem('artemis-keyboard-shortcuts', JSON.stringify(state.keyboardShortcuts));
    
    const dialog = document.getElementById('shortcut-customization-dialog');
    dialog.classList.add('hidden');
    shortcutEditingKey = null;
    tempShortcuts = {};
    document.removeEventListener('keydown', handleShortcutKeyPress);
    
    alert('Keyboard shortcuts saved!');
}

// Layer merge down
function mergeLayerDown() {
    if (!state.activeLayer) return;
    
    const currentIndex = state.layers.indexOf(state.activeLayer);
    
    // Can't merge down if it's the bottom layer
    if (currentIndex === 0) {
        alert('Cannot merge down the bottom layer.');
        return;
    }
    
    // Get the layer below
    const layerBelow = state.layers[currentIndex - 1];
    
    // Draw current layer onto the layer below
    const ctx = layerBelow.canvas.getContext('2d');
    ctx.globalAlpha = state.activeLayer.opacity;
    ctx.drawImage(state.activeLayer.canvas, 0, 0);
    ctx.globalAlpha = 1;
    
    // Remove the current layer
    state.layers.splice(currentIndex, 1);
    state.activeLayer = layerBelow;
    
    updateLayersList();
    compositeAllLayers();
    saveState();
}

// Show about dialog
function showAboutDialog() {
    const aboutMessage = `ARTemis - Professional Digital Painting Application
Version 1.0.0

A modern digital painting application with professional tools, 
pressure-sensitive brushes, layer management, and more.

Built with Electron and HTML5 Canvas.

© 2024 ARTemis
License: MIT`;
    
    alert(aboutMessage);
}

// Setup Panel Controls (Collapse & Resize)
function setupPanelControls() {
    // Panel Collapse
    const leftCollapseBtn = document.getElementById('left-panel-collapse');
    const rightCollapseBtn = document.getElementById('right-panel-collapse');
    const colorCollapseBtn = document.getElementById('color-panel-collapse');
    const leftPanel = document.getElementById('left-panel');
    const rightPanel = document.getElementById('right-panel');
    const colorPanel = document.getElementById('color-panel');
    
    leftCollapseBtn.addEventListener('click', () => {
        leftPanel.classList.toggle('collapsed');
    });
    
    rightCollapseBtn.addEventListener('click', () => {
        rightPanel.classList.toggle('collapsed');
    });
    
    if (colorCollapseBtn && colorPanel) {
        colorCollapseBtn.addEventListener('click', () => {
            colorPanel.classList.toggle('collapsed');
        });
    }
    
    // Panel Close
    const leftCloseBtn = document.getElementById('left-panel-close');
    const rightCloseBtn = document.getElementById('right-panel-close');
    const colorCloseBtn = document.getElementById('color-panel-close');
    
    leftCloseBtn.addEventListener('click', () => {
        leftPanel.classList.add('hidden');
        leftPanel.style.display = 'none';
    });
    
    rightCloseBtn.addEventListener('click', () => {
        rightPanel.classList.add('hidden');
        rightPanel.style.display = 'none';
    });
    
    if (colorCloseBtn && colorPanel) {
        colorCloseBtn.addEventListener('click', () => {
            colorPanel.classList.add('hidden');
            colorPanel.style.display = 'none';
        });
    }
    
    // Panel Detach/Dock
    setupPanelDocking(leftPanel);
    setupPanelDocking(rightPanel);
    if (colorPanel) setupPanelDocking(colorPanel);
    
    // Panel Resize
    setupPanelResize(leftPanel);
    setupPanelResize(rightPanel);
    if (colorPanel) setupPanelResize(colorPanel);
}

function setupPanelResize(panel) {
    const handle = panel.querySelector('.resize-handle');
    if (!handle) return;
    
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    
    handle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = panel.offsetWidth;
        handle.classList.add('dragging');
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const isLeftPanel = panel.id === 'left-panel';
        const delta = isLeftPanel ? (e.clientX - startX) : (startX - e.clientX);
        const newWidth = Math.max(200, Math.min(600, startWidth + delta));
        
        panel.style.width = newWidth + 'px';
    });
    
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            handle.classList.remove('dragging');
        }
    });
    
    // Touch support for resize
    handle.addEventListener('touchstart', (e) => {
        isResizing = true;
        startX = e.touches[0].clientX;
        startWidth = panel.offsetWidth;
        handle.classList.add('dragging');
        e.preventDefault();
    });
    
    document.addEventListener('touchmove', (e) => {
        if (!isResizing) return;
        
        const isLeftPanel = panel.id === 'left-panel';
        const delta = isLeftPanel ? 
            (e.touches[0].clientX - startX) : 
            (startX - e.touches[0].clientX);
        const newWidth = Math.max(200, Math.min(600, startWidth + delta));
        
        panel.style.width = newWidth + 'px';
    });
    
    document.addEventListener('touchend', () => {
        if (isResizing) {
            isResizing = false;
            handle.classList.remove('dragging');
        }
    });
}

// Panel Docking System
function setupPanelDocking(panel) {
    const panelHeader = panel.querySelector('.panel-header');
    const detachBtn = panel.querySelector('.panel-detach-btn');
    
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let panelStartX = 0;
    let panelStartY = 0;
    let isDetached = false;
    
    // Detach button
    if (detachBtn) {
        detachBtn.addEventListener('click', () => {
            togglePanelFloat(panel);
        });
    }
    
    // Drag to move/dock
    panelHeader.addEventListener('mousedown', (e) => {
        // Don't drag if clicking on buttons
        if (e.target.closest('button')) return;
        
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        
        const rect = panel.getBoundingClientRect();
        panelStartX = rect.left;
        panelStartY = rect.top;
        
        panel.classList.add('dragging');
        showDockZones();
        
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - dragStartX;
        const deltaY = e.clientY - dragStartY;
        
        // Make panel floating if not already
        if (!panel.classList.contains('floating')) {
            panel.classList.add('floating');
            panel.style.position = 'fixed';
        }
        
        // Calculate target position
        let targetX = panelStartX + deltaX;
        let targetY = panelStartY + deltaY;
        
        // Magnetic snapping to dock zones
        const SNAP_THRESHOLD = 50; // Distance in pixels to trigger magnetic snap
        const zones = document.querySelectorAll('.dock-zone');
        let snapped = false;
        
        zones.forEach(zone => {
            const rect = zone.getBoundingClientRect();
            const panelRect = panel.getBoundingClientRect();
            
            // Check if near the zone
            const nearLeft = Math.abs(e.clientX - rect.left) < SNAP_THRESHOLD;
            const nearRight = Math.abs(e.clientX - rect.right) < SNAP_THRESHOLD;
            const nearTop = Math.abs(e.clientY - rect.top) < SNAP_THRESHOLD;
            const nearBottom = Math.abs(e.clientY - rect.bottom) < SNAP_THRESHOLD;
            
            // Snap to edges based on dock side
            const dockSide = zone.dataset.dock;
            if (dockSide === 'left' && nearLeft) {
                targetX = rect.left;
                snapped = true;
            } else if (dockSide === 'right' && nearRight) {
                targetX = rect.right - panelRect.width;
                snapped = true;
            } else if (dockSide === 'top' && nearTop) {
                targetY = rect.top;
                snapped = true;
            } else if (dockSide === 'bottom' && nearBottom) {
                targetY = rect.bottom - panelRect.height;
                snapped = true;
            }
        });
        
        panel.style.left = targetX + 'px';
        panel.style.top = targetY + 'px';
        
        // Add visual feedback for snap
        if (snapped) {
            panel.style.opacity = '0.9';
        } else {
            panel.style.opacity = '0.7';
        }
        
        // Highlight dock zones
        highlightDockZone(e.clientX, e.clientY);
    });
    
    document.addEventListener('mouseup', (e) => {
        if (!isDragging) return;
        
        isDragging = false;
        panel.classList.remove('dragging');
        panel.style.opacity = ''; // Restore opacity
        hideDockZones();
        
        // Check if over a dock zone
        const dockZone = getDockZoneAtPosition(e.clientX, e.clientY);
        if (dockZone) {
            dockPanel(panel, dockZone);
        }
    });
}

function togglePanelFloat(panel) {
    if (panel.classList.contains('floating')) {
        // Re-dock to original position
        const dockPosition = panel.dataset.dockPosition || 'left';
        dockPanel(panel, dockPosition);
    } else {
        // Float the panel
        const rect = panel.getBoundingClientRect();
        panel.classList.add('floating');
        panel.style.position = 'fixed';
        panel.style.left = rect.left + 'px';
        panel.style.top = rect.top + 'px';
        panel.style.width = rect.width + 'px';
        panel.style.height = rect.height + 'px';
    }
}

function showDockZones() {
    const zones = document.querySelectorAll('.dock-zone');
    const ZONE_SIZE = 100;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Calculate the offset for toolbars at the top
    const toolbar = document.getElementById('toolbar');
    const contextualTaskbar = document.getElementById('contextual-taskbar');
    const topOffset = (toolbar?.offsetHeight || 0) + (contextualTaskbar?.offsetHeight || 0);
    
    zones.forEach(zone => {
        const dockSide = zone.dataset.dock;
        zone.classList.add('active');
        
        switch (dockSide) {
            case 'left':
                zone.style.left = '0';
                zone.style.top = topOffset + 'px';
                zone.style.width = ZONE_SIZE + 'px';
                zone.style.height = (windowHeight - topOffset) + 'px';
                break;
            case 'right':
                zone.style.right = '0';
                zone.style.top = topOffset + 'px';
                zone.style.width = ZONE_SIZE + 'px';
                zone.style.height = (windowHeight - topOffset) + 'px';
                break;
            case 'top':
                zone.style.left = '0';
                zone.style.top = topOffset + 'px'; // Below toolbar and contextual taskbar
                zone.style.width = windowWidth + 'px';
                zone.style.height = ZONE_SIZE + 'px';
                break;
            case 'bottom':
                zone.style.left = '0';
                zone.style.bottom = '0';
                zone.style.width = windowWidth + 'px';
                zone.style.height = ZONE_SIZE + 'px';
                break;
        }
    });
}

function hideDockZones() {
    const zones = document.querySelectorAll('.dock-zone');
    zones.forEach(zone => {
        zone.classList.remove('active', 'highlight');
    });
}

function highlightDockZone(x, y) {
    const zones = document.querySelectorAll('.dock-zone');
    zones.forEach(zone => {
        const rect = zone.getBoundingClientRect();
        const isOver = x >= rect.left && x <= rect.right && 
                      y >= rect.top && y <= rect.bottom;
        
        if (isOver) {
            zone.classList.add('highlight');
        } else {
            zone.classList.remove('highlight');
        }
    });
}

function getDockZoneAtPosition(x, y) {
    const zones = document.querySelectorAll('.dock-zone');
    for (let zone of zones) {
        const rect = zone.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && 
            y >= rect.top && y <= rect.bottom) {
            return zone.dataset.dock;
        }
    }
    return null;
}

function dockPanel(panel, dockSide) {
    // Remove floating state and clear inline positioning
    panel.classList.remove('floating', 'dragging');
    panel.style.position = '';
    panel.style.left = '';
    panel.style.top = '';
    panel.style.order = '';
    panel.style.width = '';
    panel.style.height = '';
    
    // Get appropriate container based on dock side
    let targetContainer;
    
    switch (dockSide) {
        case 'left':
        case 'right':
            targetContainer = document.getElementById('main-container');
            break;
        case 'top':
            targetContainer = document.getElementById('top-dock-container');
            break;
        case 'bottom':
            targetContainer = document.getElementById('bottom-dock-container');
            break;
        default:
            console.error('Invalid dock side:', dockSide);
            return;
    }
    
    // Store original parent if not already stored
    if (!panel.dataset.originalParent) {
        panel.dataset.originalParent = panel.parentElement.id;
    }
    
    // Store current dock position
    panel.dataset.dockPosition = dockSide;
    
    // Dock to the specified side
    switch (dockSide) {
        case 'left':
            // Move panel to be the first child (leftmost position)
            if (targetContainer.firstChild) {
                targetContainer.insertBefore(panel, targetContainer.firstChild);
            } else {
                targetContainer.appendChild(panel);
            }
            break;
        case 'right':
            // Move panel to be the last child (rightmost position)
            targetContainer.appendChild(panel);
            break;
        case 'top':
            // Add to top dock container
            targetContainer.appendChild(panel);
            break;
        case 'bottom':
            // Add to bottom dock container
            targetContainer.appendChild(panel);
            break;
    }
}

// ============================================
// Nested Panel Docking System
// ============================================

// Enhanced docking that supports panels docking inside other panels
function enhancePanelDockingWithNesting() {
    const panels = document.querySelectorAll('.panel.draggable');
    
    panels.forEach(panel => {
        const panelHeader = panel.querySelector('.panel-header');
        if (!panelHeader) return;
        
        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let panelStartX = 0;
        let panelStartY = 0;
        let currentDropTarget = null;
        
        // Add drop zones to panel content areas
        const panelContent = panel.querySelector('.panel-content');
        if (panelContent && !panelContent.dataset.dropZoneAdded) {
            panelContent.dataset.dropZoneAdded = 'true';
            panelContent.style.position = 'relative';
            
            // Create nested drop zone indicator
            const dropIndicator = document.createElement('div');
            dropIndicator.className = 'nested-drop-indicator';
            dropIndicator.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                border: 3px dashed #4CAF50;
                background: rgba(76, 175, 80, 0.1);
                display: none;
                pointer-events: none;
                z-index: 1000;
            `;
            panelContent.appendChild(dropIndicator);
        }
    });
}

// Check if a panel can be dropped inside another panel
function canDockInside(draggingPanel, targetPanel) {
    // Don't allow self-docking
    if (draggingPanel === targetPanel) return false;
    
    // Don't allow docking if target already contains dragging panel
    if (targetPanel.contains(draggingPanel)) return false;
    
    // Don't allow reverse docking (if target is inside dragging panel)
    if (draggingPanel.contains(targetPanel)) return false;
    
    return true;
}

// Get panel at position
function getPanelAtPosition(x, y, excludePanel) {
    const panels = document.querySelectorAll('.panel');
    
    for (let panel of panels) {
        if (panel === excludePanel) continue;
        
        const rect = panel.getBoundingClientRect();
        const headerHeight = 40; // Approximate header height
        
        // Check if over the panel content area (not just header)
        if (x >= rect.left && x <= rect.right && 
            y >= rect.top + headerHeight && y <= rect.bottom) {
            return panel;
        }
    }
    
    return null;
}

// Dock panel inside another panel
function dockPanelInside(draggedPanel, targetPanel) {
    const targetContent = targetPanel.querySelector('.panel-content');
    if (!targetContent) return;
    
    // Store the nesting relationship
    if (!draggedPanel.dataset.originalParentPanel) {
        draggedPanel.dataset.originalParentPanel = draggedPanel.parentElement.id;
    }
    draggedPanel.dataset.parentPanel = targetPanel.id;
    
    // Create a nested panel container if it doesn't exist
    let nestedContainer = targetContent.querySelector('.nested-panels-container');
    if (!nestedContainer) {
        nestedContainer = document.createElement('div');
        nestedContainer.className = 'nested-panels-container';
        nestedContainer.style.cssText = `
            margin-top: 10px;
            padding: 10px;
            border: 1px solid #3e3e42;
            border-radius: 4px;
            background: rgba(0, 0, 0, 0.2);
        `;
        targetContent.appendChild(nestedContainer);
    }
    
    // Move the panel
    draggedPanel.classList.remove('floating');
    draggedPanel.style.position = 'relative';
    draggedPanel.style.left = '';
    draggedPanel.style.top = '';
    draggedPanel.style.width = '100%';
    draggedPanel.style.marginBottom = '10px';
    
    nestedContainer.appendChild(draggedPanel);
    
    // Add title to indicate nesting
    const panelTitle = draggedPanel.querySelector('.panel-header span');
    if (panelTitle && !panelTitle.textContent.includes('↳')) {
        panelTitle.textContent = '↳ ' + panelTitle.textContent;
    }
    
    console.log(`Panel "${draggedPanel.id}" docked inside "${targetPanel.id}"`);
}

// Show nested drop indicators
function showNestedDropIndicators() {
    const indicators = document.querySelectorAll('.nested-drop-indicator');
    indicators.forEach(ind => ind.style.display = 'block');
}

// Hide nested drop indicators
function hideNestedDropIndicators() {
    const indicators = document.querySelectorAll('.nested-drop-indicator');
    indicators.forEach(ind => ind.style.display = 'none');
}

// Enhanced panel dragging with nested docking support
function enhancePanelDragging() {
    const panels = document.querySelectorAll('.panel.draggable');
    
    panels.forEach(panel => {
        const panelHeader = panel.querySelector('.panel-header');
        if (!panelHeader) return;
        
        let isDragging = false;
        let currentOverPanel = null;
        
        // Override existing mousedown on header
        const oldHandler = panelHeader.onmousedown;
        panelHeader.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;
            
            isDragging = true;
            showNestedDropIndicators();
        }, true);
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging || !panel.classList.contains('dragging')) return;
            
            // Check if over another panel
            const targetPanel = getPanelAtPosition(e.clientX, e.clientY, panel);
            
            if (targetPanel && canDockInside(panel, targetPanel)) {
                // Highlight the target panel
                if (currentOverPanel !== targetPanel) {
                    // Remove highlight from previous
                    if (currentOverPanel) {
                        const prevIndicator = currentOverPanel.querySelector('.nested-drop-indicator');
                        if (prevIndicator) prevIndicator.style.display = 'none';
                    }
                    
                    // Add highlight to current
                    currentOverPanel = targetPanel;
                    const indicator = targetPanel.querySelector('.nested-drop-indicator');
                    if (indicator) indicator.style.display = 'block';
                }
            } else {
                // Clear highlight
                if (currentOverPanel) {
                    const indicator = currentOverPanel.querySelector('.nested-drop-indicator');
                    if (indicator) indicator.style.display = 'none';
                    currentOverPanel = null;
                }
            }
        });
        
        document.addEventListener('mouseup', (e) => {
            if (!isDragging) return;
            
            hideNestedDropIndicators();
            
            // Check if we should dock inside a panel
            if (currentOverPanel && canDockInside(panel, currentOverPanel)) {
                dockPanelInside(panel, currentOverPanel);
                e.stopPropagation();
            }
            
            isDragging = false;
            currentOverPanel = null;
        }, true);
    });
}

// Setup Expandable Sections
function setupExpandableSections() {
    const sections = document.querySelectorAll('.setting-section');
    
    sections.forEach(section => {
        const header = section.querySelector('.setting-section-header');
        
        header.addEventListener('click', () => {
            section.classList.toggle('collapsed');
        });
    });
}

// Workspace Management
function saveWorkspace(name = 'default') {
    const leftPanel = document.getElementById('left-panel');
    const rightPanel = document.getElementById('right-panel');
    
    const workspace = {
        name: name,
        leftPanelWidth: leftPanel.offsetWidth,
        rightPanelWidth: rightPanel.offsetWidth,
        leftPanelCollapsed: leftPanel.classList.contains('collapsed'),
        rightPanelCollapsed: rightPanel.classList.contains('collapsed'),
        timestamp: Date.now()
    };
    
    // Save to localStorage
    const workspaces = JSON.parse(localStorage.getItem('artemis-workspaces') || '{}');
    workspaces[name] = workspace;
    localStorage.setItem('artemis-workspaces', JSON.stringify(workspaces));
    
    return workspace;
}

function loadWorkspace(name = 'default') {
    const workspaces = JSON.parse(localStorage.getItem('artemis-workspaces') || '{}');
    const workspace = workspaces[name];
    
    if (!workspace) {
        console.log('Workspace not found:', name);
        return false;
    }
    
    const leftPanel = document.getElementById('left-panel');
    const rightPanel = document.getElementById('right-panel');
    
    // Apply workspace settings
    leftPanel.style.width = workspace.leftPanelWidth + 'px';
    rightPanel.style.width = workspace.rightPanelWidth + 'px';
    
    if (workspace.leftPanelCollapsed && !leftPanel.classList.contains('collapsed')) {
        leftPanel.classList.add('collapsed');
    } else if (!workspace.leftPanelCollapsed && leftPanel.classList.contains('collapsed')) {
        leftPanel.classList.remove('collapsed');
    }
    
    if (workspace.rightPanelCollapsed && !rightPanel.classList.contains('collapsed')) {
        rightPanel.classList.add('collapsed');
    } else if (!workspace.rightPanelCollapsed && rightPanel.classList.contains('collapsed')) {
        rightPanel.classList.remove('collapsed');
    }
    
    // Update state
    state.workspace = {
        leftPanelWidth: workspace.leftPanelWidth,
        rightPanelWidth: workspace.rightPanelWidth,
        leftPanelCollapsed: workspace.leftPanelCollapsed,
        rightPanelCollapsed: workspace.rightPanelCollapsed
    };
    
    return true;
}

function getWorkspaces() {
    return JSON.parse(localStorage.getItem('artemis-workspaces') || '{}');
}

function deleteWorkspace(name) {
    const workspaces = JSON.parse(localStorage.getItem('artemis-workspaces') || '{}');
    delete workspaces[name];
    localStorage.setItem('artemis-workspaces', JSON.stringify(workspaces));
}

// Phase 10: Workspace Presets
const workspacePresets = {
    'painting': {
        name: 'Painting',
        leftPanelWidth: 300,
        rightPanelWidth: 300,
        leftPanelCollapsed: false,
        rightPanelCollapsed: false,
        description: 'Optimized for digital painting with full access to brushes and layers'
    },
    'illustration': {
        name: 'Illustration',
        leftPanelWidth: 250,
        rightPanelWidth: 350,
        leftPanelCollapsed: false,
        rightPanelCollapsed: false,
        description: 'Balanced workspace for illustration work with emphasis on layers panel'
    },
    'photo-editing': {
        name: 'Photo Editing',
        leftPanelWidth: 200,
        rightPanelWidth: 350,
        leftPanelCollapsed: false,
        rightPanelCollapsed: false,
        description: 'Focused on photo editing tools and adjustment layers'
    },
    'minimal': {
        name: 'Minimal',
        leftPanelWidth: 280,
        rightPanelWidth: 280,
        leftPanelCollapsed: true,
        rightPanelCollapsed: true,
        description: 'Minimal workspace with maximum canvas space'
    }
};

function loadWorkspacePreset(presetName) {
    const preset = workspacePresets[presetName];
    if (!preset) {
        alert('Workspace preset not found');
        return false;
    }
    
    const leftPanel = document.getElementById('left-panel');
    const rightPanel = document.getElementById('right-panel');
    
    // Apply preset settings
    leftPanel.style.width = preset.leftPanelWidth + 'px';
    rightPanel.style.width = preset.rightPanelWidth + 'px';
    
    if (preset.leftPanelCollapsed) {
        leftPanel.classList.add('collapsed');
    } else {
        leftPanel.classList.remove('collapsed');
    }
    
    if (preset.rightPanelCollapsed) {
        rightPanel.classList.add('collapsed');
    } else {
        rightPanel.classList.remove('collapsed');
    }
    
    alert(`Workspace preset "${preset.name}" loaded successfully!`);
    return true;
}

function showWorkspacePresetsDialog() {
    const presetList = Object.entries(workspacePresets)
        .map(([key, preset]) => `• ${preset.name}: ${preset.description}`)
        .join('\n');
    
    const selection = prompt(
        `Available Workspace Presets:\n\n${presetList}\n\nEnter preset name (painting, illustration, photo-editing, minimal):`,
        'painting'
    );
    
    if (selection && selection.trim()) {
        loadWorkspacePreset(selection.trim().toLowerCase());
    }
}

function showSaveWorkspaceDialog() {
    const name = prompt('Enter workspace name:', 'My Workspace');
    if (name && name.trim()) {
        saveWorkspace(name.trim());
        alert(`Workspace "${name}" saved successfully!`);
    }
}

function showLoadWorkspaceDialog() {
    const workspaces = getWorkspaces();
    const names = Object.keys(workspaces);
    
    if (names.length === 0) {
        alert('No saved workspaces found. Save a workspace first!');
        return;
    }
    
    const workspaceList = names.map((name, index) => `${index + 1}. ${name}`).join('\n');
    const selection = prompt(`Select workspace to load:\n\n${workspaceList}\n\nEnter workspace name:`);
    
    if (selection && selection.trim()) {
        const success = loadWorkspace(selection.trim());
        if (success) {
            alert(`Workspace "${selection}" loaded successfully!`);
        } else {
            alert(`Workspace "${selection}" not found!`);
        }
    }
}

function showManageWorkspacesDialog() {
    const workspaces = getWorkspaces();
    const names = Object.keys(workspaces);
    
    if (names.length === 0) {
        alert('No saved workspaces found.');
        return;
    }
    
    const workspaceList = names.map((name, index) => {
        const ws = workspaces[name];
        const date = new Date(ws.timestamp).toLocaleString();
        return `${index + 1}. ${name} (saved: ${date})`;
    }).join('\n');
    
    const action = prompt(`Manage Workspaces:\n\n${workspaceList}\n\nEnter workspace name to DELETE (or Cancel to exit):`);
    
    if (action && action.trim()) {
        if (confirm(`Delete workspace "${action}"? This cannot be undone.`)) {
            deleteWorkspace(action.trim());
            alert(`Workspace "${action}" deleted.`);
        }
    }
}

// Phase 10: Theme Customization
function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(state.theme);
    localStorage.setItem('artemis-theme', state.theme);
}

function applyTheme(theme) {
    // Check if it's a custom theme or preset
    if (themePresets[theme]) {
        applyCustomTheme(themePresets[theme]);
    } else if (theme === 'light') {
        // Backward compatibility - apply light theme using preset
        applyCustomTheme(themePresets['light']);
    } else {
        // Default to dark theme
        applyCustomTheme(themePresets['dark']);
    }
}

function updateThemeColors() {
    // Update menu bar
    const menuBar = document.getElementById('menu-bar');
    if (menuBar) {
        menuBar.style.background = state.theme === 'light' ? '#ffffff' : '#252526';
        menuBar.style.borderColor = state.theme === 'light' ? '#d0d0d0' : '#3e3e42';
    }
    
    // Update toolbar
    const toolbar = document.getElementById('toolbar');
    if (toolbar) {
        toolbar.style.background = state.theme === 'light' ? '#e8e8e8' : '#2d2d30';
        toolbar.style.borderColor = state.theme === 'light' ? '#d0d0d0' : '#3e3e42';
    }
    
    // Update panels
    const leftPanel = document.getElementById('left-panel');
    const rightPanel = document.getElementById('right-panel');
    if (leftPanel) {
        leftPanel.style.background = state.theme === 'light' ? '#f3f3f3' : '#1e1e1e';
        leftPanel.style.borderColor = state.theme === 'light' ? '#d0d0d0' : '#3e3e42';
    }
    if (rightPanel) {
        rightPanel.style.background = state.theme === 'light' ? '#f3f3f3' : '#1e1e1e';
        rightPanel.style.borderColor = state.theme === 'light' ? '#d0d0d0' : '#3e3e42';
    }
    
    // Update all labels and text
    const textColor = state.theme === 'light' ? '#1e1e1e' : '#cccccc';
    document.querySelectorAll('.menu-label, .menu-btn, label, .tab').forEach(el => {
        el.style.color = textColor;
    });
}

function loadTheme() {
    const savedTheme = localStorage.getItem('artemis-theme');
    if (savedTheme) {
        state.theme = savedTheme;
        applyTheme(savedTheme);
    }
}

// Custom Theme System - Phase 10 Enhancement
const themePresets = {
    'dark': {
        name: 'Dark (Default)',
        colors: {
            bgPrimary: '#1e1e1e',
            bgSecondary: '#2d2d30',
            bgTertiary: '#252526',
            borderColor: '#3e3e42',
            textPrimary: '#cccccc',
            textSecondary: '#969696',
            hoverBg: '#3e3e42',
            shadow: 'rgba(0, 0, 0, 0.5)',
            accent: '#007acc'
        }
    },
    'light': {
        name: 'Light',
        colors: {
            bgPrimary: '#f3f3f3',
            bgSecondary: '#ffffff',
            bgTertiary: '#e8e8e8',
            borderColor: '#d0d0d0',
            textPrimary: '#1e1e1e',
            textSecondary: '#4a4a4a',
            hoverBg: '#e0e0e0',
            shadow: 'rgba(0, 0, 0, 0.15)',
            accent: '#0078d4'
        }
    },
    'blue': {
        name: 'Ocean Blue',
        colors: {
            bgPrimary: '#1a2332',
            bgSecondary: '#243447',
            bgTertiary: '#1e2836',
            borderColor: '#3d4f66',
            textPrimary: '#d4e1f0',
            textSecondary: '#8fa3b8',
            hoverBg: '#2f4059',
            shadow: 'rgba(0, 20, 40, 0.5)',
            accent: '#4a9eff'
        }
    },
    'green': {
        name: 'Forest Green',
        colors: {
            bgPrimary: '#1a2e1a',
            bgSecondary: '#243d24',
            bgTertiary: '#1e331e',
            borderColor: '#3d5e3d',
            textPrimary: '#d4f0d4',
            textSecondary: '#8fb88f',
            hoverBg: '#2f4d2f',
            shadow: 'rgba(10, 30, 10, 0.5)',
            accent: '#4aff4a'
        }
    },
    'purple': {
        name: 'Royal Purple',
        colors: {
            bgPrimary: '#241a2e',
            bgSecondary: '#33243d',
            bgTertiary: '#281e33',
            borderColor: '#4d3d5e',
            textPrimary: '#e8d4f0',
            textSecondary: '#b88fb8',
            hoverBg: '#3d2f4d',
            shadow: 'rgba(20, 10, 30, 0.5)',
            accent: '#b84aff'
        }
    },
    'warm': {
        name: 'Warm Sunset',
        colors: {
            bgPrimary: '#2e1f1a',
            bgSecondary: '#3d2d24',
            bgTertiary: '#33241e',
            borderColor: '#5e4d3d',
            textPrimary: '#f0e4d4',
            textSecondary: '#b8a38f',
            hoverBg: '#4d3d2f',
            shadow: 'rgba(30, 15, 10, 0.5)',
            accent: '#ff8a4a'
        }
    },
    'high-contrast': {
        name: 'High Contrast',
        colors: {
            bgPrimary: '#000000',
            bgSecondary: '#1a1a1a',
            bgTertiary: '#0d0d0d',
            borderColor: '#ffffff',
            textPrimary: '#ffffff',
            textSecondary: '#d0d0d0',
            hoverBg: '#333333',
            shadow: 'rgba(255, 255, 255, 0.3)',
            accent: '#00ffff'
        }
    }
};

function applyCustomTheme(themeData) {
    const root = document.documentElement;
    const colors = themeData.colors;
    
    // Apply CSS custom properties
    root.style.setProperty('--bg-primary', colors.bgPrimary);
    root.style.setProperty('--bg-secondary', colors.bgSecondary);
    root.style.setProperty('--bg-tertiary', colors.bgTertiary);
    root.style.setProperty('--border-color', colors.borderColor);
    root.style.setProperty('--text-primary', colors.textPrimary);
    root.style.setProperty('--text-secondary', colors.textSecondary);
    root.style.setProperty('--hover-bg', colors.hoverBg);
    root.style.setProperty('--shadow', colors.shadow);
    root.style.setProperty('--accent-color', colors.accent);
    
    // Apply to body
    document.body.style.background = colors.bgPrimary;
    document.body.style.color = colors.textPrimary;
    
    // Update all elements
    updateThemeColors();
}

function loadThemePreset(presetName) {
    if (themePresets[presetName]) {
        applyCustomTheme(themePresets[presetName]);
        state.theme = presetName;
        localStorage.setItem('artemis-theme', presetName);
        showNotification(`Theme changed to ${themePresets[presetName].name}`);
    }
}

function showThemePresetsDialog() {
    const dialogHtml = `
        <div class="dialog-overlay" id="theme-presets-dialog">
            <div class="dialog-box" style="width: 500px; max-height: 600px; overflow-y: auto;">
                <div class="dialog-header">
                    <h3>Theme Presets</h3>
                    <button class="close-btn" onclick="document.getElementById('theme-presets-dialog').remove()">×</button>
                </div>
                <div class="dialog-content">
                    <div class="theme-presets-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
                        ${Object.keys(themePresets).map(key => {
                            const theme = themePresets[key];
                            const isActive = state.theme === key;
                            return `
                                <div class="theme-preset-card ${isActive ? 'active' : ''}" 
                                     onclick="loadThemePreset('${key}'); document.getElementById('theme-presets-dialog').remove();"
                                     style="padding: 12px; border: 2px solid ${theme.colors.borderColor}; 
                                            background: ${theme.colors.bgSecondary}; cursor: pointer; border-radius: 4px;
                                            transition: transform 0.2s, box-shadow 0.2s;">
                                    <div style="font-weight: bold; color: ${theme.colors.textPrimary}; margin-bottom: 8px;">
                                        ${theme.name}
                                    </div>
                                    <div class="theme-preview" style="display: flex; gap: 4px; height: 30px;">
                                        <div style="flex: 1; background: ${theme.colors.bgPrimary}; border-radius: 2px;"></div>
                                        <div style="flex: 1; background: ${theme.colors.bgSecondary}; border-radius: 2px;"></div>
                                        <div style="flex: 1; background: ${theme.colors.accent}; border-radius: 2px;"></div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div style="border-top: 1px solid var(--border-color); padding-top: 16px;">
                        <button onclick="showCustomThemeCreator()" class="btn" style="width: 100%; margin-bottom: 8px;">
                            Create Custom Theme
                        </button>
                        <button onclick="importTheme()" class="btn" style="width: 100%; margin-bottom: 8px;">
                            Import Theme
                        </button>
                        <button onclick="exportCurrentTheme()" class="btn" style="width: 100%;">
                            Export Current Theme
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', dialogHtml);
    
    // Add hover effects
    document.querySelectorAll('.theme-preset-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'scale(1.05)';
            card.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'scale(1)';
            card.style.boxShadow = 'none';
        });
    });
}

function showCustomThemeCreator() {
    // Close existing dialog
    const existingDialog = document.getElementById('theme-presets-dialog');
    if (existingDialog) existingDialog.remove();
    
    // Get current theme colors
    const root = document.documentElement;
    const currentColors = {
        bgPrimary: getComputedStyle(root).getPropertyValue('--bg-primary').trim() || '#1e1e1e',
        bgSecondary: getComputedStyle(root).getPropertyValue('--bg-secondary').trim() || '#2d2d30',
        bgTertiary: getComputedStyle(root).getPropertyValue('--bg-tertiary').trim() || '#252526',
        borderColor: getComputedStyle(root).getPropertyValue('--border-color').trim() || '#3e3e42',
        textPrimary: getComputedStyle(root).getPropertyValue('--text-primary').trim() || '#cccccc',
        textSecondary: getComputedStyle(root).getPropertyValue('--text-secondary').trim() || '#969696',
        hoverBg: getComputedStyle(root).getPropertyValue('--hover-bg').trim() || '#3e3e42',
        accent: getComputedStyle(root).getPropertyValue('--accent-color').trim() || '#007acc'
    };
    
    const dialogHtml = `
        <div class="dialog-overlay" id="custom-theme-creator">
            <div class="dialog-box" style="width: 600px; max-height: 700px; overflow-y: auto;">
                <div class="dialog-header">
                    <h3>Custom Theme Creator</h3>
                    <button class="close-btn" onclick="document.getElementById('custom-theme-creator').remove()">×</button>
                </div>
                <div class="dialog-content">
                    <div class="form-group">
                        <label>Theme Name:</label>
                        <input type="text" id="theme-name" placeholder="My Custom Theme" class="text-input" style="width: 100%; padding: 8px; margin-bottom: 16px;">
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div class="form-group">
                            <label>Background Primary:</label>
                            <input type="color" id="color-bg-primary" value="${currentColors.bgPrimary}" class="color-input">
                        </div>
                        <div class="form-group">
                            <label>Background Secondary:</label>
                            <input type="color" id="color-bg-secondary" value="${currentColors.bgSecondary}" class="color-input">
                        </div>
                        <div class="form-group">
                            <label>Background Tertiary:</label>
                            <input type="color" id="color-bg-tertiary" value="${currentColors.bgTertiary}" class="color-input">
                        </div>
                        <div class="form-group">
                            <label>Border Color:</label>
                            <input type="color" id="color-border" value="${currentColors.borderColor}" class="color-input">
                        </div>
                        <div class="form-group">
                            <label>Text Primary:</label>
                            <input type="color" id="color-text-primary" value="${currentColors.textPrimary}" class="color-input">
                        </div>
                        <div class="form-group">
                            <label>Text Secondary:</label>
                            <input type="color" id="color-text-secondary" value="${currentColors.textSecondary}" class="color-input">
                        </div>
                        <div class="form-group">
                            <label>Hover Background:</label>
                            <input type="color" id="color-hover-bg" value="${currentColors.hoverBg}" class="color-input">
                        </div>
                        <div class="form-group">
                            <label>Accent Color:</label>
                            <input type="color" id="color-accent" value="${currentColors.accent}" class="color-input">
                        </div>
                    </div>
                    
                    <div class="preview-box" style="margin: 20px 0; padding: 16px; border: 2px solid var(--border-color); border-radius: 4px; background: var(--bg-secondary);">
                        <div style="font-weight: bold; margin-bottom: 8px; color: var(--text-primary);">Live Preview</div>
                        <div id="theme-preview" style="padding: 12px; border-radius: 4px;"></div>
                    </div>
                    
                    <div style="display: flex; gap: 8px; margin-top: 16px;">
                        <button onclick="previewCustomTheme()" class="btn" style="flex: 1;">Preview</button>
                        <button onclick="saveCustomTheme()" class="btn btn-primary" style="flex: 1;">Save Theme</button>
                        <button onclick="document.getElementById('custom-theme-creator').remove(); showThemePresetsDialog();" class="btn" style="flex: 1;">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', dialogHtml);
    
    // Add real-time preview
    const colorInputs = document.querySelectorAll('#custom-theme-creator input[type="color"]');
    colorInputs.forEach(input => {
        input.style.width = '100%';
        input.style.height = '40px';
        input.style.cursor = 'pointer';
        input.addEventListener('input', () => previewCustomTheme());
    });
    
    // Initial preview
    previewCustomTheme();
}

function previewCustomTheme() {
    // Helper function to validate and sanitize hex color values
    const sanitizeColor = (color) => {
        // Color inputs guarantee hex format, but validate anyway for security
        if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
            return color;
        }
        return '#000000'; // Safe fallback
    };
    
    const colors = {
        bgPrimary: sanitizeColor(document.getElementById('color-bg-primary')?.value || '#1e1e1e'),
        bgSecondary: sanitizeColor(document.getElementById('color-bg-secondary')?.value || '#2d2d30'),
        bgTertiary: sanitizeColor(document.getElementById('color-bg-tertiary')?.value || '#252526'),
        borderColor: sanitizeColor(document.getElementById('color-border')?.value || '#3e3e42'),
        textPrimary: sanitizeColor(document.getElementById('color-text-primary')?.value || '#cccccc'),
        textSecondary: sanitizeColor(document.getElementById('color-text-secondary')?.value || '#969696'),
        hoverBg: sanitizeColor(document.getElementById('color-hover-bg')?.value || '#3e3e42'),
        accent: sanitizeColor(document.getElementById('color-accent')?.value || '#007acc')
    };
    
    const preview = document.getElementById('theme-preview');
    if (preview) {
        // Use style properties directly instead of innerHTML to avoid XSS concerns
        preview.style.background = colors.bgPrimary;
        preview.style.color = colors.textPrimary;
        preview.style.border = `2px solid ${colors.borderColor}`;
        
        // Build preview DOM safely
        preview.innerHTML = '';
        
        // Create first div
        const div1 = document.createElement('div');
        div1.style.cssText = `background: ${colors.bgSecondary}; padding: 8px; margin-bottom: 8px; border-radius: 2px;`;
        
        const div1Text1 = document.createElement('div');
        div1Text1.style.cssText = `color: ${colors.textPrimary}; font-weight: bold;`;
        div1Text1.textContent = 'Primary Text on Secondary Background';
        
        const div1Text2 = document.createElement('div');
        div1Text2.style.cssText = `color: ${colors.textSecondary}; font-size: 0.9em;`;
        div1Text2.textContent = 'Secondary text color';
        
        div1.appendChild(div1Text1);
        div1.appendChild(div1Text2);
        
        // Create second div container
        const div2Container = document.createElement('div');
        div2Container.style.cssText = 'display: flex; gap: 8px;';
        
        const div2Accent = document.createElement('div');
        div2Accent.style.cssText = `flex: 1; background: ${colors.accent}; padding: 8px; color: white; text-align: center; border-radius: 2px;`;
        div2Accent.textContent = 'Accent';
        
        const div2Hover = document.createElement('div');
        div2Hover.style.cssText = `flex: 1; background: ${colors.hoverBg}; padding: 8px; color: ${colors.textPrimary}; text-align: center; border-radius: 2px;`;
        div2Hover.textContent = 'Hover';
        
        div2Container.appendChild(div2Accent);
        div2Container.appendChild(div2Hover);
        
        preview.appendChild(div1);
        preview.appendChild(div2Container);
    }
}

function saveCustomTheme() {
    // Sanitize theme name to prevent XSS
    const rawThemeName = document.getElementById('theme-name')?.value || 'Custom Theme';
    const themeName = rawThemeName.replace(/[<>'"]/g, ''); // Remove potential XSS characters
    const themeId = 'custom-' + Date.now();
    
    // Helper function to validate and sanitize hex color values
    const sanitizeColor = (color) => {
        if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
            return color;
        }
        return '#000000'; // Safe fallback
    };
    
    const colors = {
        bgPrimary: sanitizeColor(document.getElementById('color-bg-primary')?.value || '#1e1e1e'),
        bgSecondary: sanitizeColor(document.getElementById('color-bg-secondary')?.value || '#2d2d30'),
        bgTertiary: sanitizeColor(document.getElementById('color-bg-tertiary')?.value || '#252526'),
        borderColor: sanitizeColor(document.getElementById('color-border')?.value || '#3e3e42'),
        textPrimary: sanitizeColor(document.getElementById('color-text-primary')?.value || '#cccccc'),
        textSecondary: sanitizeColor(document.getElementById('color-text-secondary')?.value || '#969696'),
        hoverBg: sanitizeColor(document.getElementById('color-hover-bg')?.value || '#3e3e42'),
        shadow: 'rgba(0, 0, 0, 0.5)',
        accent: sanitizeColor(document.getElementById('color-accent')?.value || '#007acc')
    };
    
    const customTheme = {
        id: themeId,
        name: themeName,
        colors: colors,
        created: new Date().toISOString()
    };
    
    // Save to localStorage
    const customThemes = JSON.parse(localStorage.getItem('artemis-custom-themes') || '[]');
    customThemes.push(customTheme);
    localStorage.setItem('artemis-custom-themes', JSON.stringify(customThemes));
    
    // Add to themePresets
    themePresets[themeId] = customTheme;
    
    // Apply the theme
    applyCustomTheme(customTheme);
    state.theme = themeId;
    localStorage.setItem('artemis-theme', themeId);
    
    // Close dialog and show success
    document.getElementById('custom-theme-creator')?.remove();
    showNotification(`Custom theme "${themeName}" saved and applied!`);
}

function importTheme() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const content = await file.text();
                const themeData = JSON.parse(content);
                
                // Validate theme structure
                if (!themeData.name || !themeData.colors) {
                    throw new Error('Invalid theme file format');
                }
                
                const themeId = 'custom-' + Date.now();
                themeData.id = themeId;
                
                // Save to localStorage
                const customThemes = JSON.parse(localStorage.getItem('artemis-custom-themes') || '[]');
                customThemes.push(themeData);
                localStorage.setItem('artemis-custom-themes', JSON.stringify(customThemes));
                
                // Add to themePresets
                themePresets[themeId] = themeData;
                
                // Apply the theme
                applyCustomTheme(themeData);
                state.theme = themeId;
                localStorage.setItem('artemis-theme', themeId);
                
                // Close dialog and show success
                document.getElementById('theme-presets-dialog')?.remove();
                showNotification(`Theme "${themeData.name}" imported and applied!`);
            } catch (error) {
                alert('Error importing theme: ' + error.message);
            }
        }
    };
    input.click();
}

function exportCurrentTheme() {
    const themeName = prompt('Enter a name for this theme:', 'My Custom Theme');
    if (!themeName) return;
    
    const root = document.documentElement;
    const themeData = {
        name: themeName,
        colors: {
            bgPrimary: getComputedStyle(root).getPropertyValue('--bg-primary').trim(),
            bgSecondary: getComputedStyle(root).getPropertyValue('--bg-secondary').trim(),
            bgTertiary: getComputedStyle(root).getPropertyValue('--bg-tertiary').trim(),
            borderColor: getComputedStyle(root).getPropertyValue('--border-color').trim(),
            textPrimary: getComputedStyle(root).getPropertyValue('--text-primary').trim(),
            textSecondary: getComputedStyle(root).getPropertyValue('--text-secondary').trim(),
            hoverBg: getComputedStyle(root).getPropertyValue('--hover-bg').trim(),
            shadow: getComputedStyle(root).getPropertyValue('--shadow').trim(),
            accent: getComputedStyle(root).getPropertyValue('--accent-color').trim() || '#007acc'
        },
        exported: new Date().toISOString()
    };
    
    const json = JSON.stringify(themeData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${themeName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-theme.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Theme exported successfully!');
}

function loadCustomThemes() {
    const customThemes = JSON.parse(localStorage.getItem('artemis-custom-themes') || '[]');
    customThemes.forEach(theme => {
        themePresets[theme.id] = theme;
    });
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 60px;
        right: 20px;
        background: var(--bg-secondary);
        color: var(--text-primary);
        padding: 12px 20px;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        border: 1px solid var(--border-color);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Interface Scaling Functions
function setInterfaceScale(scale) {
    // Valid scale values: 0.75, 1.0, 1.25, 1.5
    const validScales = [0.75, 1.0, 1.25, 1.5];
    const validatedScale = validScales.includes(scale) ? scale : 1.0;
    
    if (validatedScale !== scale) {
        console.warn(`Invalid scale: ${scale}. Using ${validatedScale}`);
    }
    
    state.interfaceScale = validatedScale;
    applyInterfaceScale(validatedScale);
    localStorage.setItem('artemis-interface-scale', validatedScale.toString());
}

function applyInterfaceScale(scale) {
    const root = document.documentElement;
    
    // Apply base font size scaling
    root.style.fontSize = `${16 * scale}px`;
    
    // Scale UI panels
    const leftPanel = document.getElementById('left-panel');
    const rightPanel = document.getElementById('right-panel');
    const toolbar = document.getElementById('toolbar');
    const menuBar = document.getElementById('menu-bar');
    
    // Calculate scaled dimensions
    const basePanelWidth = 280;
    const baseToolbarHeight = 48;
    const baseMenuHeight = 28;
    
    if (leftPanel) {
        const currentWidth = parseInt(leftPanel.style.width) || basePanelWidth;
        const previousScale = (state.previousScale !== null && state.previousScale !== 0) ? state.previousScale : 1.0;
        const baseWidth = currentWidth / previousScale;
        leftPanel.style.width = `${baseWidth * scale}px`;
    }
    
    if (rightPanel) {
        const currentWidth = parseInt(rightPanel.style.width) || basePanelWidth;
        const previousScale = (state.previousScale !== null && state.previousScale !== 0) ? state.previousScale : 1.0;
        const baseWidth = currentWidth / previousScale;
        rightPanel.style.width = `${baseWidth * scale}px`;
    }
    
    if (toolbar) {
        toolbar.style.height = `${baseToolbarHeight * scale}px`;
    }
    
    if (menuBar) {
        menuBar.style.height = `${baseMenuHeight * scale}px`;
    }
    
    // Use CSS custom property for efficient scaling
    root.style.setProperty('--ui-scale', scale.toString());
    
    // Scale specific UI elements that need explicit sizing
    const scaleElements = [
        '.icon-btn',
        '.tool-btn',
        '.menu-btn',
        'button',
        'input',
        'select',
        '.slider',
        '.setting-group label'
    ];
    
    // Only set font sizes on first scale or when we have a valid previous scale
    const shouldUpdateFontSizes = state.previousScale === null || state.previousScale !== scale;
    
    if (shouldUpdateFontSizes) {
        scaleElements.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                // Store original font size if not already stored
                if (!el.dataset.originalFontSize) {
                    const computedStyle = window.getComputedStyle(el);
                    el.dataset.originalFontSize = computedStyle.fontSize;
                }
                
                const originalSize = parseFloat(el.dataset.originalFontSize);
                if (originalSize && !isNaN(originalSize)) {
                    el.style.fontSize = `${originalSize * scale}px`;
                }
            });
        });
    }
    
    // Update canvas container to account for scaled UI
    updateCanvasContainerSize();
    
    // Store for next scale operation
    state.previousScale = scale;
    
    // Show notification
    showScaleNotification(scale);
}

function showScaleNotification(scale) {
    const percentage = Math.round(scale * 100);
    const notification = document.createElement('div');
    notification.textContent = `Interface Scale: ${percentage}%`;
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 16px 32px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        z-index: 10000;
        pointer-events: none;
        animation: fadeInOut 1.5s ease-in-out;
    `;
    
    // Add animation style if not already present
    if (!document.getElementById('scale-notification-style')) {
        const style = document.createElement('style');
        style.id = 'scale-notification-style';
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 1500);
}

function cycleInterfaceScale() {
    const scales = [0.75, 1.0, 1.25, 1.5];
    const currentIndex = scales.indexOf(state.interfaceScale || 1.0);
    const nextIndex = (currentIndex + 1) % scales.length;
    setInterfaceScale(scales[nextIndex]);
}

function showInterfaceScaleDialog() {
    const currentScale = state.interfaceScale || 1.0;
    const percentage = Math.round(currentScale * 100);
    
    const dialog = document.createElement('div');
    dialog.className = 'modal-overlay';
    dialog.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <h3>Interface Scale</h3>
            <p style="color: #888; margin-bottom: 20px;">Adjust the size of UI elements</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                <button class="scale-btn" data-scale="0.75" style="padding: 12px; font-size: 14px;">
                    Small (75%)
                </button>
                <button class="scale-btn" data-scale="1.0" style="padding: 12px; font-size: 14px;">
                    Normal (100%)
                </button>
                <button class="scale-btn" data-scale="1.25" style="padding: 12px; font-size: 14px;">
                    Large (125%)
                </button>
                <button class="scale-btn" data-scale="1.5" style="padding: 12px; font-size: 14px;">
                    Extra Large (150%)
                </button>
            </div>
            
            <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 4px; margin-bottom: 20px;">
                <div style="font-size: 12px; color: #888; margin-bottom: 8px;">Current Scale:</div>
                <div style="font-size: 24px; font-weight: bold;">${percentage}%</div>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="scale-close-btn" style="padding: 8px 16px;">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Highlight current scale
    dialog.querySelectorAll('.scale-btn').forEach(btn => {
        if (parseFloat(btn.dataset.scale) === currentScale) {
            btn.style.background = '#4CAF50';
            btn.style.color = 'white';
        }
    });
    
    // Scale button handlers
    dialog.querySelectorAll('.scale-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const scale = parseFloat(btn.dataset.scale);
            setInterfaceScale(scale);
            dialog.remove();
        });
    });
    
    // Close button
    dialog.querySelector('#scale-close-btn').addEventListener('click', () => {
        dialog.remove();
    });
    
    // Click outside to close
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            dialog.remove();
        }
    });
}

function loadInterfaceScale() {
    const savedScale = localStorage.getItem('artemis-interface-scale');
    if (savedScale) {
        const scale = parseFloat(savedScale);
        if (!isNaN(scale)) {
            state.interfaceScale = scale;
            state.previousScale = scale;
            applyInterfaceScale(scale);
        }
    } else {
        // Default scale
        state.interfaceScale = 1.0;
        state.previousScale = 1.0;
    }
}

function updateCanvasContainerSize() {
    // This ensures the canvas container adjusts when UI is scaled
    // Use requestAnimationFrame for better performance
    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) {
        requestAnimationFrame(() => {
            // Use transform instead of display toggle for less disruptive reflow
            canvasContainer.style.transform = 'translateZ(0)';
            // Remove transform after a tick to trigger layout recalculation
            requestAnimationFrame(() => {
                canvasContainer.style.transform = '';
            });
        });
    }
}

// Panel Management Functions
function togglePanel(panelSide, visible) {
    const panel = document.getElementById(`${panelSide}-panel`);
    if (!panel) return;
    
    if (visible) {
        panel.style.display = 'flex';
        panel.classList.remove('hidden');
    } else {
        panel.style.display = 'none';
        panel.classList.add('hidden');
    }
}

function resetPanelPositions() {
    const leftPanel = document.getElementById('left-panel');
    const rightPanel = document.getElementById('right-panel');
    const mainContainer = document.getElementById('main-container');
    
    if (leftPanel) {
        // Remove all positioning and state classes
        leftPanel.classList.remove('collapsed', 'hidden', 'floating', 'dragging');
        leftPanel.style.width = '280px';
        leftPanel.style.display = 'flex';
        leftPanel.style.position = '';
        leftPanel.style.left = '';
        leftPanel.style.top = '';
        leftPanel.style.order = '';
        
        // Ensure left panel is first child in main container
        if (mainContainer && leftPanel.parentElement === mainContainer) {
            mainContainer.insertBefore(leftPanel, mainContainer.firstChild);
        }
    }
    
    if (rightPanel) {
        // Remove all positioning and state classes
        rightPanel.classList.remove('collapsed', 'hidden', 'floating', 'dragging');
        rightPanel.style.width = '280px';
        rightPanel.style.display = 'flex';
        rightPanel.style.position = '';
        rightPanel.style.left = '';
        rightPanel.style.top = '';
        rightPanel.style.order = '';
        
        // Ensure right panel is last child in main container
        if (mainContainer && rightPanel.parentElement === mainContainer) {
            mainContainer.appendChild(rightPanel);
        }
    }
    
    // Clear any saved layout from localStorage
    localStorage.removeItem('panelLayout');
    
    alert('Panel layout has been reset to defaults.');
}

function savePanelLayout() {
    const leftPanel = document.getElementById('left-panel');
    const rightPanel = document.getElementById('right-panel');
    
    const layout = {
        left: {
            width: leftPanel.offsetWidth,
            collapsed: leftPanel.classList.contains('collapsed'),
            hidden: leftPanel.classList.contains('hidden'),
            floating: leftPanel.classList.contains('floating'),
            position: leftPanel.classList.contains('floating') ? {
                left: leftPanel.style.left,
                top: leftPanel.style.top
            } : null
        },
        right: {
            width: rightPanel.offsetWidth,
            collapsed: rightPanel.classList.contains('collapsed'),
            hidden: rightPanel.classList.contains('hidden'),
            floating: rightPanel.classList.contains('floating'),
            position: rightPanel.classList.contains('floating') ? {
                left: rightPanel.style.left,
                top: rightPanel.style.top
            } : null
        },
        timestamp: Date.now()
    };
    
    localStorage.setItem('panelLayout', JSON.stringify(layout));
    alert('Panel layout saved successfully!');
}

function loadPanelLayout() {
    const layoutData = localStorage.getItem('panelLayout');
    if (!layoutData) {
        alert('No saved panel layout found.');
        return;
    }
    
    try {
        const layout = JSON.parse(layoutData);
        const leftPanel = document.getElementById('left-panel');
        const rightPanel = document.getElementById('right-panel');
        
        // Restore left panel
        if (layout.left) {
            leftPanel.style.width = layout.left.width + 'px';
            
            // Handle collapsed state
            if (layout.left.collapsed) leftPanel.classList.add('collapsed');
            else leftPanel.classList.remove('collapsed');
            
            // Handle hidden state
            if (layout.left.hidden) {
                leftPanel.classList.add('hidden');
                leftPanel.style.display = 'none';
            } else {
                leftPanel.classList.remove('hidden');
                leftPanel.style.display = 'flex';
            }
            
            // Handle floating state
            if (layout.left.floating && layout.left.position) {
                leftPanel.classList.add('floating');
                leftPanel.style.position = 'fixed';
                leftPanel.style.left = layout.left.position.left;
                leftPanel.style.top = layout.left.position.top;
            } else {
                leftPanel.classList.remove('floating');
                leftPanel.style.position = '';
                leftPanel.style.left = '';
                leftPanel.style.top = '';
            }
        }
        
        // Restore right panel
        if (layout.right) {
            rightPanel.style.width = layout.right.width + 'px';
            
            // Handle collapsed state
            if (layout.right.collapsed) rightPanel.classList.add('collapsed');
            else rightPanel.classList.remove('collapsed');
            
            // Handle hidden state
            if (layout.right.hidden) {
                rightPanel.classList.add('hidden');
                rightPanel.style.display = 'none';
            } else {
                rightPanel.classList.remove('hidden');
                rightPanel.style.display = 'flex';
            }
            
            // Handle floating state
            if (layout.right.floating && layout.right.position) {
                rightPanel.classList.add('floating');
                rightPanel.style.position = 'fixed';
                rightPanel.style.left = layout.right.position.left;
                rightPanel.style.top = layout.right.position.top;
            } else {
                rightPanel.classList.remove('floating');
                rightPanel.style.position = '';
                rightPanel.style.left = '';
                rightPanel.style.top = '';
            }
        }
        
        const date = new Date(layout.timestamp).toLocaleString();
        alert(`Panel layout loaded successfully!\nSaved: ${date}`);
    } catch (error) {
        alert('Error loading panel layout: ' + error.message);
    }
}

// ===== NEW TOOL IMPLEMENTATIONS =====

// Smudge Tool
let smudgeBuffer = null;

function startSmudge(x, y) {
    if (!state.activeLayer) return;
    
    state.isDrawing = true;
    const ctx = state.activeLayer.canvas.getContext('2d');
    const radius = state.brush.size;
    
    // Sample pixels from current location
    if (!state.smudge.fingerPainting) {
        smudgeBuffer = ctx.getImageData(
            Math.max(0, x - radius),
            Math.max(0, y - radius),
            radius * 2,
            radius * 2
        );
    }
    
    applySmudge(x, y, 1);
}

function applySmudge(x, y, pressure) {
    if (!state.activeLayer) return;
    
    const ctx = drawCtx;
    const radius = calculateBrushSize(pressure);
    const strength = state.smudge.strength / 100;
    
    // Get layer context for sampling
    const layerCtx = state.activeLayer.canvas.getContext('2d');
    
    // If finger painting mode, use current color
    if (state.smudge.fingerPainting && !smudgeBuffer) {
        // Create initial buffer with current color
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = radius * 2;
        tempCanvas.height = radius * 2;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.fillStyle = state.color;
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        smudgeBuffer = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    }
    
    // Sample pixels from current position
    const currentSample = layerCtx.getImageData(
        Math.max(0, Math.floor(x - radius)),
        Math.max(0, Math.floor(y - radius)),
        Math.min(radius * 2, state.canvas.width),
        Math.min(radius * 2, state.canvas.height)
    );
    
    // Mix sampled colors with buffer
    if (smudgeBuffer) {
        const mixedData = new Uint8ClampedArray(currentSample.data);
        
        for (let i = 0; i < currentSample.data.length; i += 4) {
            const bufferIndex = Math.min(i, smudgeBuffer.data.length - 4);
            mixedData[i] = currentSample.data[i] * (1 - strength) + smudgeBuffer.data[bufferIndex] * strength;
            mixedData[i + 1] = currentSample.data[i + 1] * (1 - strength) + smudgeBuffer.data[bufferIndex + 1] * strength;
            mixedData[i + 2] = currentSample.data[i + 2] * (1 - strength) + smudgeBuffer.data[bufferIndex + 2] * strength;
            mixedData[i + 3] = currentSample.data[i + 3];
        }
        
        const mixedImageData = new ImageData(mixedData, currentSample.width, currentSample.height);
        
        // Draw the smudged result
        ctx.save();
        ctx.globalAlpha = calculateBrushOpacity(pressure);
        ctx.putImageData(mixedImageData, Math.floor(x - radius), Math.floor(y - radius));
        ctx.restore();
        
        // Update buffer for next iteration
        smudgeBuffer = mixedImageData;
    }
    
    state.lastX = x;
    state.lastY = y;
}

// Liquify Tool
function applyLiquify(x, y, pressure) {
    if (!state.activeLayer) return;
    
    const ctx = state.activeLayer.canvas.getContext('2d');
    const radius = state.liquify.radius;
    const strength = state.liquify.strength / 100 * pressure;
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, state.canvas.width, state.canvas.height);
    const data = imageData.data;
    const width = state.canvas.width;
    const height = state.canvas.height;
    
    // Create a copy for transformation
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(imageData, 0, 0);
    
    // Apply liquify effect based on mode
    const mode = state.liquify.mode;
    
    for (let py = Math.max(0, y - radius); py < Math.min(height, y + radius); py++) {
        for (let px = Math.max(0, x - radius); px < Math.min(width, x + radius); px++) {
            const dx = px - x;
            const dy = py - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < radius) {
                // Calculate falloff (stronger in center)
                const falloff = 1 - (dist / radius);
                const effect = strength * falloff;
                
                let sourceX = px;
                let sourceY = py;
                
                if (mode === 'push') {
                    // Push pixels away from cursor
                    sourceX = px - dx * effect;
                    sourceY = py - dy * effect;
                } else if (mode === 'pull') {
                    // Pull pixels toward cursor
                    sourceX = px + dx * effect;
                    sourceY = py + dy * effect;
                } else if (mode === 'twirl-cw') {
                    // Clockwise twirl
                    const angle = effect * Math.PI;
                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);
                    sourceX = x + (dx * cos - dy * sin);
                    sourceY = y + (dx * sin + dy * cos);
                } else if (mode === 'twirl-ccw') {
                    // Counter-clockwise twirl
                    const angle = -effect * Math.PI;
                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);
                    sourceX = x + (dx * cos - dy * sin);
                    sourceY = y + (dx * sin + dy * cos);
                } else if (mode === 'pucker') {
                    // Pucker (pinch inward)
                    const scale = 1 - effect;
                    sourceX = x + dx * scale;
                    sourceY = y + dy * scale;
                } else if (mode === 'bloat') {
                    // Bloat (push outward)
                    const scale = 1 + effect;
                    sourceX = x + dx * scale;
                    sourceY = y + dy * scale;
                }
                
                // Sample from source position
                sourceX = Math.round(Math.max(0, Math.min(width - 1, sourceX)));
                sourceY = Math.round(Math.max(0, Math.min(height - 1, sourceY)));
                
                const sourceIdx = (sourceY * width + sourceX) * 4;
                const targetIdx = (py * width + px) * 4;
                
                // Copy pixel
                data[targetIdx] = imageData.data[sourceIdx];
                data[targetIdx + 1] = imageData.data[sourceIdx + 1];
                data[targetIdx + 2] = imageData.data[sourceIdx + 2];
                data[targetIdx + 3] = imageData.data[sourceIdx + 3];
            }
        }
    }
    
    // Draw the liquified result to draw canvas
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    drawCtx.putImageData(imageData, 0, 0);
    
    state.lastX = x;
    state.lastY = y;
}

// Load Reference Image
function loadReferenceImage() {
    if (typeof require === 'undefined') {
        // Browser mode - use file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/png,image/jpeg,image/jpg';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        state.reference.image = img;
                        state.reference.width = img.width;
                        state.reference.height = img.height;
                        // Phase 11: Store original dimensions
                        state.reference.originalWidth = img.width;
                        state.reference.originalHeight = img.height;
                        state.reference.scale = 1.0;
                        state.reference.visible = true;
                        
                        const checkbox = document.getElementById('reference-visible');
                        if (checkbox) checkbox.checked = true;
                        
                        const settings = document.getElementById('reference-settings');
                        if (settings) settings.classList.remove('hidden');
                        
                        // Phase 11: Update position and scale UI
                        const refX = document.getElementById('reference-x');
                        const refXVal = document.getElementById('reference-x-value');
                        if (refX) refX.value = state.reference.x;
                        if (refXVal) refXVal.textContent = state.reference.x;
                        
                        const refY = document.getElementById('reference-y');
                        const refYVal = document.getElementById('reference-y-value');
                        if (refY) refY.value = state.reference.y;
                        if (refYVal) refYVal.textContent = state.reference.y;
                        
                        const refScale = document.getElementById('reference-scale');
                        const refScaleVal = document.getElementById('reference-scale-value');
                        if (refScale) refScale.value = 100;
                        if (refScaleVal) refScaleVal.textContent = '100%';
                        
                        compositeAllLayers();
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    } else {
        // Electron mode
        ipcRenderer.send('load-reference-image');
    }
}

// Export Time-lapse
function exportTimelapse() {
    if (state.timelapse.frames.length === 0) {
        alert('No frames recorded. Enable time-lapse recording and draw something first.');
        return;
    }
    
    // Create a simple video using canvas animation
    // For a real implementation, you'd use a library like gif.js or webm-writer
    alert(`Time-lapse has ${state.timelapse.frames.length} frames. Full video export would require additional libraries. For now, frames are captured in memory.`);
    
    // TODO: Implement actual video export using gif.js or webm-writer
}

// Canvas Texture Generation
function generateCanvasTexture(type, intensity) {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    const alpha = intensity * 2.55; // Convert percentage to 0-255
    const grain = (state.canvasTexture.grain || 50) / 100;
    
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            let value = 0;
            
            // Professional Paper Textures (25+ types)
            switch(type) {
                // Hot Pressed (Smooth) Papers
                case 'canson-xl-hot-pressed-200lb':
                    value = Math.random() * 15 * grain + (Math.sin(x * 0.1) + Math.sin(y * 0.1)) * 5;
                    break;
                case 'canson-xl-hot-pressed-140lb':
                    value = Math.random() * 18 * grain + (Math.sin(x * 0.12) + Math.sin(y * 0.12)) * 4;
                    break;
                case 'strathmore-400-hot-pressed':
                    value = Math.random() * 12 * grain + (Math.sin(x * 0.08) + Math.sin(y * 0.08)) * 6;
                    break;
                    
                // Cold Pressed (Medium Texture) Papers
                case 'canson-xl-cold-pressed-140lb':
                    value = Math.random() * 35 * grain + (Math.sin(x * 0.3) + Math.cos(y * 0.25)) * 12;
                    break;
                case 'arches-cold-pressed-140lb':
                    value = Math.random() * 40 * grain + (Math.sin(x * 0.35) + Math.cos(y * 0.3)) * 15;
                    break;
                case 'fabriano-artistico-cold-pressed':
                    value = Math.random() * 38 * grain + (Math.sin(x * 0.32) + Math.cos(y * 0.28)) * 14;
                    break;
                case 'strathmore-500-cold-pressed':
                    value = Math.random() * 36 * grain + (Math.sin(x * 0.31) + Math.cos(y * 0.27)) * 13;
                    break;
                    
                // Rough Papers
                case 'arches-rough-300lb':
                    value = Math.random() * 55 * grain + (Math.sin(x * 0.5) + Math.cos(y * 0.45)) * 20 + Math.sin(x * y * 0.001) * 10;
                    break;
                case 'fabriano-artistico-rough':
                    value = Math.random() * 52 * grain + (Math.sin(x * 0.48) + Math.cos(y * 0.42)) * 18;
                    break;
                case 'saunders-waterford-rough':
                    value = Math.random() * 50 * grain + (Math.sin(x * 0.46) + Math.cos(y * 0.4)) * 17;
                    break;
                    
                // Bristol & Illustration Board
                case 'bristol-vellum':
                    value = Math.random() * 22 * grain + (Math.sin(x * 0.15) + Math.sin(y * 0.15)) * 8;
                    break;
                case 'bristol-smooth':
                    value = Math.random() * 10 * grain + (Math.sin(x * 0.05) + Math.sin(y * 0.05)) * 3;
                    break;
                case 'strathmore-500-bristol-plate':
                    value = Math.random() * 8 * grain + (Math.sin(x * 0.04) + Math.sin(y * 0.04)) * 2;
                    break;
                    
                // Canvas & Linen
                case 'canvas-fine-linen':
                    value = (Math.sin(x * 0.4) + Math.sin(y * 0.4)) * 18 * grain + Math.random() * 15;
                    break;
                case 'canvas-cotton-duck':
                    value = (Math.sin(x * 0.5) + Math.sin(y * 0.5)) * 22 * grain + Math.random() * 18;
                    break;
                case 'canvas-rough-weave':
                    value = (Math.sin(x * 0.6) + Math.sin(y * 0.6)) * 25 * grain + Math.random() * 20;
                    break;
                    
                // Specialty Papers
                case 'stonehenge-white':
                    value = Math.random() * 28 * grain + (Math.sin(x * 0.2) + Math.sin(y * 0.2)) * 10;
                    break;
                case 'rives-bfk':
                    value = Math.random() * 32 * grain + (Math.sin(x * 0.25) + Math.sin(y * 0.25)) * 11;
                    break;
                case 'hahnemuhle-leonardo':
                    value = Math.random() * 30 * grain + (Math.sin(x * 0.22) + Math.sin(y * 0.22)) * 10;
                    break;
                    
                // Multimedia & Mixed Media
                case 'strathmore-400-mixed-media':
                    value = Math.random() * 25 * grain + (Math.sin(x * 0.18) + Math.sin(y * 0.18)) * 9;
                    break;
                case 'canson-xl-mixed-media':
                    value = Math.random() * 26 * grain + (Math.sin(x * 0.19) + Math.sin(y * 0.19)) * 9;
                    break;
                    
                // Toned & Colored Papers
                case 'strathmore-toned-gray':
                    value = Math.random() * 24 * grain + (Math.sin(x * 0.17) + Math.sin(y * 0.17)) * 8 + 20;
                    break;
                case 'strathmore-toned-tan':
                    value = Math.random() * 24 * grain + (Math.sin(x * 0.17) + Math.sin(y * 0.17)) * 8 + 15;
                    break;
                case 'canson-mi-teintes':
                    value = Math.random() * 34 * grain + (Math.sin(x * 0.28) + Math.sin(y * 0.28)) * 12;
                    break;
                    
                // Drawing Papers
                case 'strathmore-400-drawing':
                    value = Math.random() * 27 * grain + (Math.sin(x * 0.21) + Math.sin(y * 0.21)) * 10;
                    break;
                case 'canson-foundation-drawing':
                    value = Math.random() * 29 * grain + (Math.sin(x * 0.23) + Math.sin(y * 0.23)) * 10;
                    break;
                    
                // Legacy/Generic Types
                case 'canvas':
                    value = (Math.sin(x * 0.5) + Math.sin(y * 0.5)) * 10 * grain + Math.random() * 20;
                    break;
                case 'paper':
                    value = Math.random() * 30 * grain;
                    break;
                case 'linen':
                    value = (Math.sin(x * 0.3) + Math.sin(y * 0.3)) * 15 * grain + Math.random() * 15;
                    break;
                case 'rough':
                    value = Math.random() * 50 * grain;
                    break;
                default:
                    value = Math.random() * 30 * grain;
            }
            
            data[idx] = 255;
            data[idx + 1] = 255;
            data[idx + 2] = 255;
            data[idx + 3] = Math.min(255, value * alpha / 100);
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

// Apply canvas texture overlay to main canvas
function applyCanvasTexture() {
    if (!state.canvasTexture.enabled) return;
    
    const texture = generateCanvasTexture(state.canvasTexture.type, state.canvasTexture.intensity);
    const pattern = mainCtx.createPattern(texture, 'repeat');
    
    mainCtx.save();
    // Use 'multiply' for better visibility of canvas texture
    mainCtx.globalCompositeOperation = 'multiply';
    mainCtx.globalAlpha = Math.min(1.0, state.canvasTexture.intensity / 100); // Improved visibility
    mainCtx.fillStyle = pattern;
    mainCtx.fillRect(0, 0, state.canvas.width, state.canvas.height);
    mainCtx.restore();
}

// Phase 2: Load built-in texture from library
function loadBuiltInTexture(textureType) {
    const size = 128; // Standard texture size
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Generate procedural textures based on type
    switch(textureType) {
        case 'canvas-fine':
            generateCanvasWeaveTexture(ctx, size, 1);
            break;
        case 'canvas-medium':
            generateCanvasWeaveTexture(ctx, size, 2);
            break;
        case 'canvas-rough':
            generateCanvasWeaveTexture(ctx, size, 4);
            break;
        case 'paper-smooth':
            generatePaperTexture(ctx, size, 0.3);
            break;
        case 'paper-rough':
            generatePaperTexture(ctx, size, 0.8);
            break;
        case 'watercolor-paper':
            generateWatercolorPaperTexture(ctx, size);
            break;
        case 'wood-grain':
            generateWoodGrainTexture(ctx, size);
            break;
        case 'stone':
            generateStoneTexture(ctx, size);
            break;
        case 'concrete':
            generateConcreteTexture(ctx, size);
            break;
        case 'bark':
            generateBarkTexture(ctx, size);
            break;
        case 'linen':
            generateLinenTexture(ctx, size);
            break;
        case 'burlap':
            generateBurlapTexture(ctx, size);
            break;
        case 'grain':
            generateGrainTexture(ctx, size);
            break;
        case 'noise':
            generateNoiseTexture(ctx, size);
            break;
        case 'dots':
            generateDotsTexture(ctx, size);
            break;
        case 'crosshatch':
            generateCrosshatchTexture(ctx, size);
            break;
        default:
            return;
    }
    
    // Store the texture
    state.brush.texturePattern = ctx.getImageData(0, 0, size, size);
    
    // Update preview
    const preview = document.getElementById('texture-preview');
    const previewContainer = document.getElementById('texture-preview-container');
    if (preview && previewContainer) {
        const previewCtx = preview.getContext('2d');
        previewCtx.clearRect(0, 0, preview.width, preview.height);
        previewCtx.drawImage(canvas, 0, 0, preview.width, preview.height);
        previewContainer.style.display = 'block';
    }
    
    // Enable texture overlay
    const textureEnabled = document.getElementById('texture-enabled');
    if (textureEnabled && !textureEnabled.checked) {
        textureEnabled.checked = true;
        state.brush.textureEnabled = true;
        const textureSettings = document.getElementById('texture-settings');
        if (textureSettings) {
            textureSettings.classList.remove('hidden');
        }
    }
}

// Texture generation helper functions
function generateCanvasWeaveTexture(ctx, size, scale) {
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const warp = Math.sin(x * 0.5 * scale) * 0.5 + 0.5;
            const weft = Math.sin(y * 0.5 * scale) * 0.5 + 0.5;
            const value = (warp + weft) / 2;
            const color = 200 + value * 55;
            data[idx] = color;
            data[idx + 1] = color;
            data[idx + 2] = color;
            data[idx + 3] = 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

function generatePaperTexture(ctx, size, roughness) {
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const noise = (Math.random() - 0.5) * roughness;
            const color = 240 + noise * 30;
            data[idx] = color;
            data[idx + 1] = color;
            data[idx + 2] = color;
            data[idx + 3] = 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

function generateWatercolorPaperTexture(ctx, size) {
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const noise = Math.random() * 0.3 + 0.7;
            const grain = Math.sin(x * 0.3) * Math.sin(y * 0.3) * 0.1 + 0.9;
            const color = 245 * noise * grain;
            data[idx] = color;
            data[idx + 1] = color;
            data[idx + 2] = color;
            data[idx + 3] = 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

function generateWoodGrainTexture(ctx, size) {
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const grain = Math.sin(y * 0.2) * 20 + Math.random() * 10;
            const color = 180 + grain;
            data[idx] = color * 0.7;
            data[idx + 1] = color * 0.5;
            data[idx + 2] = color * 0.3;
            data[idx + 3] = 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

function generateStoneTexture(ctx, size) {
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const noise = Math.random() * 0.4 + 0.6;
            const color = 160 * noise;
            data[idx] = color;
            data[idx + 1] = color;
            data[idx + 2] = color;
            data[idx + 3] = 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

function generateConcreteTexture(ctx, size) {
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const noise = Math.random() * 0.3 + 0.7;
            const spots = Math.random() < 0.05 ? 0.5 : 1;
            const color = 200 * noise * spots;
            data[idx] = color;
            data[idx + 1] = color;
            data[idx + 2] = color;
            data[idx + 3] = 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

function generateBarkTexture(ctx, size) {
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const vertical = Math.sin(x * 0.1) * 30;
            const noise = Math.random() * 20;
            const color = 100 + vertical + noise;
            data[idx] = color * 0.6;
            data[idx + 1] = color * 0.4;
            data[idx + 2] = color * 0.2;
            data[idx + 3] = 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

function generateLinenTexture(ctx, size) {
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const weave = (Math.sin(x * 0.8) + Math.sin(y * 0.8)) * 10;
            const color = 230 + weave;
            data[idx] = color;
            data[idx + 1] = color;
            data[idx + 2] = color;
            data[idx + 3] = 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

function generateBurlapTexture(ctx, size) {
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const weave = (Math.sin(x * 0.4) + Math.sin(y * 0.4)) * 15;
            const noise = Math.random() * 20;
            const color = 200 + weave + noise;
            data[idx] = color * 0.9;
            data[idx + 1] = color * 0.8;
            data[idx + 2] = color * 0.6;
            data[idx + 3] = 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

function generateGrainTexture(ctx, size) {
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const grain = Math.random() * 100 + 155;
            data[idx] = grain;
            data[idx + 1] = grain;
            data[idx + 2] = grain;
            data[idx + 3] = 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

function generateNoiseTexture(ctx, size) {
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const noise = Math.random() * 255;
            data[idx] = noise;
            data[idx + 1] = noise;
            data[idx + 2] = noise;
            data[idx + 3] = 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

function generateDotsTexture(ctx, size) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000000';
    const dotSize = 4;
    const spacing = 12;
    for (let y = 0; y < size; y += spacing) {
        for (let x = 0; x < size; x += spacing) {
            ctx.beginPath();
            ctx.arc(x + dotSize, y + dotSize, dotSize / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function generateCrosshatchTexture(ctx, size) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    const spacing = 8;
    // Horizontal lines
    for (let y = 0; y < size; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
        ctx.stroke();
    }
    // Vertical lines
    for (let x = 0; x < size; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, size);
        ctx.stroke();
    }
}

// Populate texture gallery with previews
function populateTextureGallery() {
    const gallery = document.getElementById('texture-library-gallery');
    if (!gallery) return;
    
    gallery.innerHTML = ''; // Clear existing
    
    const textures = [
        'canvas-fine', 'canvas-medium', 'canvas-rough',
        'paper-smooth', 'paper-rough', 'watercolor-paper',
        'wood-grain', 'stone', 'concrete',
        'bark', 'linen', 'burlap',
        'grain', 'noise', 'dots', 'crosshatch'
    ];
    
    textures.forEach(textureType => {
        const preview = document.createElement('canvas');
        preview.width = 60;
        preview.height = 60;
        preview.style.cursor = 'pointer';
        preview.style.border = '1px solid #444';
        preview.style.borderRadius = '4px';
        preview.title = textureType;
        
        const ctx = preview.getContext('2d');
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 60;
        tempCanvas.height = 60;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Generate texture at small size for preview
        switch(textureType) {
            case 'canvas-fine':
                generateCanvasWeaveTexture(tempCtx, 60, 1);
                break;
            case 'canvas-medium':
                generateCanvasWeaveTexture(tempCtx, 60, 2);
                break;
            case 'canvas-rough':
                generateCanvasWeaveTexture(tempCtx, 60, 4);
                break;
            case 'paper-smooth':
                generatePaperTexture(tempCtx, 60, 0.3);
                break;
            case 'paper-rough':
                generatePaperTexture(tempCtx, 60, 0.8);
                break;
            case 'watercolor-paper':
                generateWatercolorPaperTexture(tempCtx, 60);
                break;
            case 'wood-grain':
                generateWoodGrainTexture(tempCtx, 60);
                break;
            case 'stone':
                generateStoneTexture(tempCtx, 60);
                break;
            case 'concrete':
                generateConcreteTexture(tempCtx, 60);
                break;
            case 'bark':
                generateBarkTexture(tempCtx, 60);
                break;
            case 'linen':
                generateLinenTexture(tempCtx, 60);
                break;
            case 'burlap':
                generateBurlapTexture(tempCtx, 60);
                break;
            case 'grain':
                generateGrainTexture(tempCtx, 60);
                break;
            case 'noise':
                generateNoiseTexture(tempCtx, 60);
                break;
            case 'dots':
                generateDotsTexture(tempCtx, 60);
                break;
            case 'crosshatch':
                generateCrosshatchTexture(tempCtx, 60);
                break;
        }
        
        ctx.drawImage(tempCanvas, 0, 0);
        
        preview.addEventListener('click', () => {
            loadBuiltInTexture(textureType);
            // Update select to match
            const select = document.getElementById('texture-library-select');
            if (select) {
                select.value = textureType;
            }
        });
        
        gallery.appendChild(preview);
    });
}

// Add Lens Blur Filter
function applyLensBlur(options) {
    if (!state.activeLayer) return;
    
    const radius = options.radius || 5;
    const intensity = options.intensity || 1.0;
    
    const ctx = state.activeLayer.canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, state.canvas.width, state.canvas.height);
    const data = imageData.data;
    const width = state.canvas.width;
    const height = state.canvas.height;
    
    // Create bokeh-like circular blur
    const blurred = new Uint8ClampedArray(data);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, a = 0, count = 0;
            
            // Sample in circular pattern
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist <= radius) {
                        const sx = Math.min(width - 1, Math.max(0, x + dx));
                        const sy = Math.min(height - 1, Math.max(0, y + dy));
                        const idx = (sy * width + sx) * 4;
                        
                        // Weight by distance (bokeh effect)
                        const weight = 1 - (dist / radius) * 0.5;
                        
                        r += data[idx] * weight;
                        g += data[idx + 1] * weight;
                        b += data[idx + 2] * weight;
                        a += data[idx + 3] * weight;
                        count += weight;
                    }
                }
            }
            
            const idx = (y * width + x) * 4;
            blurred[idx] = r / count;
            blurred[idx + 1] = g / count;
            blurred[idx + 2] = b / count;
            blurred[idx + 3] = a / count;
        }
    }
    
    // Apply blurred result
    for (let i = 0; i < data.length; i++) {
        data[i] = data[i] * (1 - intensity) + blurred[i] * intensity;
    }
    
    ctx.putImageData(imageData, 0, 0);
    compositeAllLayers();
    updateLayersList();
    saveState();
}

// Wet Palette Blending Functions (Rebelle-Style)
function applyWetPaletteBlending(x, y, size, pressure) {
    // Sample underlying colors within brush radius
    const ctx = state.activeLayer ? state.activeLayer.canvas.getContext('2d') : drawCtx;
    const sampleRadius = Math.floor(size / 2);
    
    try {
        const imageData = ctx.getImageData(
            Math.max(0, Math.floor(x - sampleRadius)),
            Math.max(0, Math.floor(y - sampleRadius)),
            Math.min(state.canvas.width, sampleRadius * 2),
            Math.min(state.canvas.height, sampleRadius * 2)
        );
        
        // Calculate average color in area
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < imageData.data.length; i += 4) {
            const alpha = imageData.data[i + 3];
            if (alpha > 0) {
                r += imageData.data[i];
                g += imageData.data[i + 1];
                b += imageData.data[i + 2];
                count++;
            }
        }
        
        if (count > 0) {
            r /= count;
            g /= count;
            b /= count;
            
            // Get current brush color
            const currentColor = hexToRgbObj(state.color);
            
            // Blend based on wetness and bleeding settings
            const wetness = state.wetPalette.wetness / 100;
            const bleeding = state.wetPalette.bleeding / 100;
            const blendFactor = wetness * bleeding * (1 - pressure * 0.3);
            
            // Mix colors
            const mixedR = Math.round(currentColor.r * (1 - blendFactor) + r * blendFactor);
            const mixedG = Math.round(currentColor.g * (1 - blendFactor) + g * blendFactor);
            const mixedB = Math.round(currentColor.b * (1 - blendFactor) + b * blendFactor);
            
            return rgbToHex(mixedR, mixedG, mixedB);
        }
    } catch (e) {
        // If sampling fails, return original color
        console.debug('Wet palette sampling failed:', e);
    }
    
    return state.color;
}

function trackWetPaint(x, y, size, color) {
    const key = `${Math.floor(x / 10)}_${Math.floor(y / 10)}`;
    state.wetPalette.wetLayers.set(key, {
        color: color,
        timestamp: Date.now(),
        size: size
    });
    
    // Clean up dried paint
    const dryingTimeMs = state.wetPalette.dryingTime * 1000;
    const now = Date.now();
    for (const [k, v] of state.wetPalette.wetLayers.entries()) {
        if (now - v.timestamp > dryingTimeMs) {
            state.wetPalette.wetLayers.delete(k);
        }
    }
}

// Initialize Rebelle 8 Paper Gallery
function initializePaperGallery() {
    const gallery = document.getElementById('rebelle-paper-gallery');
    const preview = document.getElementById('rebelle-paper-preview');
    
    if (!gallery) return;
    
    // Paper types matching the ones in Canvas Texture
    const paperTypes = [
        // Hot Pressed (Smooth)
        { id: 'canson-xl-hot-pressed-200lb', name: 'Canson XL Hot Pressed 200lb' },
        { id: 'canson-xl-hot-pressed-140lb', name: 'Canson XL Hot Pressed 140lb' },
        { id: 'strathmore-400-hot-pressed', name: 'Strathmore 400 Hot Pressed' },
        // Cold Pressed (Medium)
        { id: 'canson-xl-cold-pressed-140lb', name: 'Canson XL Cold Pressed 140lb' },
        { id: 'arches-cold-pressed-140lb', name: 'Arches Cold Pressed 140lb' },
        { id: 'fabriano-artistico-cold-pressed', name: 'Fabriano Artistico Cold Pressed' },
        { id: 'strathmore-500-cold-pressed', name: 'Strathmore 500 Cold Pressed' },
        // Rough Papers
        { id: 'arches-rough-300lb', name: 'Arches Rough 300lb' },
        { id: 'fabriano-artistico-rough', name: 'Fabriano Artistico Rough' },
        { id: 'saunders-waterford-rough', name: 'Saunders Waterford Rough' },
        // Bristol & Illustration
        { id: 'bristol-vellum', name: 'Bristol Vellum' },
        { id: 'bristol-smooth', name: 'Bristol Smooth' },
        { id: 'strathmore-500-bristol-plate', name: 'Strathmore 500 Bristol Plate' },
        // Canvas & Linen
        { id: 'canvas-fine-linen', name: 'Canvas Fine Linen' },
        { id: 'canvas-cotton-duck', name: 'Canvas Cotton Duck' },
        { id: 'canvas-rough-weave', name: 'Canvas Rough Weave' },
        // Specialty Papers
        { id: 'stonehenge-white', name: 'Stonehenge White' },
        { id: 'rives-bfk', name: 'Rives BFK' },
        { id: 'hahnemuhle-leonardo', name: 'Hahnemühle Leonardo' },
        // Mixed Media
        { id: 'strathmore-400-mixed-media', name: 'Strathmore 400 Mixed Media' },
        { id: 'canson-xl-mixed-media', name: 'Canson XL Mixed Media' },
        // Toned Papers
        { id: 'strathmore-toned-gray', name: 'Strathmore Toned Gray' },
        { id: 'strathmore-toned-tan', name: 'Strathmore Toned Tan' },
        { id: 'canson-mi-teintes', name: 'Canson Mi-Teintes' },
        // Drawing Papers
        { id: 'strathmore-400-drawing', name: 'Strathmore 400 Drawing' },
        { id: 'canson-foundation-drawing', name: 'Canson Foundation Drawing' },
        // Generic
        { id: 'canvas', name: 'Generic Canvas' },
        { id: 'paper', name: 'Generic Paper' },
        { id: 'linen', name: 'Generic Linen' },
        { id: 'rough', name: 'Generic Rough' }
    ];
    
    gallery.innerHTML = '';
    
    paperTypes.forEach(paper => {
        const item = document.createElement('div');
        item.className = 'paper-gallery-item';
        if (paper.id === state.rebellePaper.selectedPaper) {
            item.classList.add('selected');
        }
        
        const img = document.createElement('img');
        img.src = `assets/papers/${paper.id}.png`;
        img.alt = paper.name;
        img.onerror = () => {
            // Fallback if image doesn't exist
            img.style.background = '#ccc';
        };
        
        const nameLabel = document.createElement('div');
        nameLabel.className = 'paper-name';
        nameLabel.textContent = paper.name;
        
        item.appendChild(img);
        item.appendChild(nameLabel);
        
        item.addEventListener('click', () => {
            // Update selection
            document.querySelectorAll('.paper-gallery-item').forEach(el => {
                el.classList.remove('selected');
            });
            item.classList.add('selected');
            
            // Update state and preview
            state.rebellePaper.selectedPaper = paper.id;
            if (preview) {
                preview.src = `assets/papers/${paper.id}.png`;
            }
            
            // Update canvas texture to match
            state.canvasTexture.type = paper.id;
            compositeAllLayers();
        });
        
        gallery.appendChild(item);
    });
    
    // Set initial preview
    if (preview) {
        preview.src = `assets/papers/${state.rebellePaper.selectedPaper}.png`;
    }
}

// ============================================
// Persistence System
// ============================================

// Save application state to localStorage
function saveAppState() {
    try {
        const stateToSave = {
            version: '1.0.0',
            timestamp: Date.now(),
            brush: state.brush,
            tool: state.tool,
            canvas: {
                width: state.canvas.width,
                height: state.canvas.height
            },
            layers: state.layers.map(layer => ({
                id: layer.id,
                name: layer.name,
                visible: layer.visible,
                opacity: layer.opacity,
                blendMode: layer.blendMode,
                locked: layer.locked
            })),
            activeLayerId: state.activeLayer ? state.activeLayer.id : null,
            customBrushes: state.customBrushes || [],
            customBrushNames: state.customBrushNames || {},
            colorSets: state.colorSets || {},
            canvasTexture: state.canvasTexture || {},
            symmetry: state.symmetry || {},
            wraparound: state.wraparound || {}
        };
        
        localStorage.setItem('artemis-app-state', JSON.stringify(stateToSave));
        return true;
    } catch (error) {
        console.error('Failed to save app state:', error);
        return false;
    }
}

// Load application state from localStorage
function loadAppState() {
    try {
        const savedState = localStorage.getItem('artemis-app-state');
        if (!savedState) return false;
        
        const parsed = JSON.parse(savedState);
        
        // Restore brush settings
        if (parsed.brush) {
            Object.assign(state.brush, parsed.brush);
            updateBrushUI();
        }
        
        // Restore tool
        if (parsed.tool) {
            selectTool(parsed.tool);
        }
        
        // Restore other state
        if (parsed.customBrushes) {
            state.customBrushes = parsed.customBrushes;
        }
        
        if (parsed.customBrushNames) {
            state.customBrushNames = parsed.customBrushNames;
        }
        
        if (parsed.colorSets) {
            state.colorSets = parsed.colorSets;
        }
        
        if (parsed.canvasTexture) {
            state.canvasTexture = Object.assign(state.canvasTexture || {}, parsed.canvasTexture);
        }
        
        if (parsed.symmetry) {
            state.symmetry = Object.assign(state.symmetry || {}, parsed.symmetry);
        }
        
        if (parsed.wraparound) {
            state.wraparound = Object.assign(state.wraparound || {}, parsed.wraparound);
        }
        
        return true;
    } catch (error) {
        console.error('Failed to load app state:', error);
        return false;
    }
}

// Update brush UI with current state
function updateBrushUI() {
    const updateSlider = (id, value, valueId) => {
        const slider = document.getElementById(id);
        const display = document.getElementById(valueId);
        if (slider) slider.value = value;
        if (display) display.textContent = value;
    };
    
    updateSlider('brush-size', state.brush.size, 'brush-size-value');
    updateSlider('brush-opacity', state.brush.opacity, 'brush-opacity-value');
    updateSlider('brush-hardness', state.brush.hardness, 'brush-hardness-value');
    updateSlider('brush-flow', state.brush.flow, 'brush-flow-value');
    updateSlider('brush-spacing', state.brush.spacing, 'brush-spacing-value');
    updateSlider('brush-smoothing', state.brush.smoothing, 'brush-smoothing-value');
    updateSlider('brush-angle', state.brush.angle, 'brush-angle-value');
    updateSlider('brush-angle-jitter', state.brush.angleJitter, 'brush-angle-jitter-value');
    updateSlider('brush-scatter-x', state.brush.scatterX, 'brush-scatter-x-value');
    updateSlider('brush-scatter-y', state.brush.scatterY, 'brush-scatter-y-value');
}

// Auto-save functionality
let autoSaveInterval = null;
let autoSaveSettings = {
    enabled: false,
    intervalMinutes: 5,
    toBrowser: true,
    showNotification: true
};

// Load auto-save settings
function loadAutoSaveSettings() {
    try {
        const saved = localStorage.getItem('artemis-autosave-settings');
        if (saved) {
            autoSaveSettings = JSON.parse(saved);
        }
    } catch (error) {
        console.error('Failed to load auto-save settings:', error);
    }
}

// Save auto-save settings
function saveAutoSaveSettings() {
    try {
        localStorage.setItem('artemis-autosave-settings', JSON.stringify(autoSaveSettings));
    } catch (error) {
        console.error('Failed to save auto-save settings:', error);
    }
}

// Perform auto-save
function performAutoSave() {
    if (!autoSaveSettings.enabled) return;
    
    try {
        // Save application state
        saveAppState();
        
        // Save canvas data if saving to browser
        if (autoSaveSettings.toBrowser) {
            const canvasData = mainCanvas.toDataURL('image/png');
            localStorage.setItem('artemis-autosave-canvas', canvasData);
            localStorage.setItem('artemis-autosave-timestamp', Date.now().toString());
        }
        
        // Update last save time display
        const timeDisplay = document.getElementById('last-auto-save-time');
        if (timeDisplay) {
            timeDisplay.textContent = new Date().toLocaleTimeString();
        }
        
        // Show notification if enabled
        if (autoSaveSettings.showNotification) {
            showAutoSaveNotification();
        }
        
        console.log('Auto-save completed');
    } catch (error) {
        console.error('Auto-save failed:', error);
    }
}

// Show auto-save notification
function showAutoSaveNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 70px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        z-index: 10000;
        font-size: 14px;
        opacity: 0;
        transition: opacity 0.3s;
    `;
    notification.textContent = '✓ Auto-saved';
    document.body.appendChild(notification);
    
    // Fade in
    setTimeout(() => notification.style.opacity = '1', 10);
    
    // Fade out and remove
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 2000);
}

// Start auto-save timer
function startAutoSave() {
    stopAutoSave(); // Clear any existing interval
    
    if (autoSaveSettings.enabled && autoSaveSettings.intervalMinutes > 0) {
        const intervalMs = autoSaveSettings.intervalMinutes * 60 * 1000;
        autoSaveInterval = setInterval(performAutoSave, intervalMs);
        console.log(`Auto-save started: every ${autoSaveSettings.intervalMinutes} minutes`);
    }
}

// Stop auto-save timer
function stopAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
    }
}

// Recover from auto-save
function recoverAutoSave() {
    try {
        const canvasData = localStorage.getItem('artemis-autosave-canvas');
        const timestamp = localStorage.getItem('artemis-autosave-timestamp');
        
        if (!canvasData) {
            alert('No auto-save data found.');
            return;
        }
        
        const saveDate = new Date(parseInt(timestamp));
        const confirmRecover = confirm(
            `Recover auto-saved work from ${saveDate.toLocaleString()}?\n\n` +
            'This will replace your current canvas.'
        );
        
        if (confirmRecover) {
            const img = new Image();
            img.onload = () => {
                mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
                mainCtx.drawImage(img, 0, 0);
                compositeAllLayers();
                addToHistory();
                alert('Auto-save recovered successfully!');
            };
            img.src = canvasData;
        }
    } catch (error) {
        console.error('Failed to recover auto-save:', error);
        alert('Failed to recover auto-save data.');
    }
}

// Clear auto-save data
function clearAutoSaveData() {
    if (confirm('Clear all auto-save data? This cannot be undone.')) {
        localStorage.removeItem('artemis-autosave-canvas');
        localStorage.removeItem('artemis-autosave-timestamp');
        const timeDisplay = document.getElementById('last-auto-save-time');
        if (timeDisplay) {
            timeDisplay.textContent = 'Never';
        }
        alert('Auto-save data cleared.');
    }
}

// Setup auto-save UI
function setupAutoSaveUI() {
    // Load settings
    loadAutoSaveSettings();
    
    // Update UI with loaded settings
    const enabledCheckbox = document.getElementById('auto-save-enabled');
    const intervalInput = document.getElementById('auto-save-interval');
    const toBrowserCheckbox = document.getElementById('auto-save-to-browser');
    const notificationCheckbox = document.getElementById('show-auto-save-notification');
    
    if (enabledCheckbox) {
        enabledCheckbox.checked = autoSaveSettings.enabled;
        enabledCheckbox.addEventListener('change', (e) => {
            autoSaveSettings.enabled = e.target.checked;
            saveAutoSaveSettings();
            if (autoSaveSettings.enabled) {
                startAutoSave();
            } else {
                stopAutoSave();
            }
        });
    }
    
    if (intervalInput) {
        intervalInput.value = autoSaveSettings.intervalMinutes;
        intervalInput.addEventListener('change', (e) => {
            const value = parseInt(e.target.value);
            if (value >= 1 && value <= 60) {
                autoSaveSettings.intervalMinutes = value;
                saveAutoSaveSettings();
                if (autoSaveSettings.enabled) {
                    startAutoSave(); // Restart with new interval
                }
            }
        });
    }
    
    if (toBrowserCheckbox) {
        toBrowserCheckbox.checked = autoSaveSettings.toBrowser;
        toBrowserCheckbox.addEventListener('change', (e) => {
            autoSaveSettings.toBrowser = e.target.checked;
            saveAutoSaveSettings();
        });
    }
    
    if (notificationCheckbox) {
        notificationCheckbox.checked = autoSaveSettings.showNotification;
        notificationCheckbox.addEventListener('change', (e) => {
            autoSaveSettings.showNotification = e.target.checked;
            saveAutoSaveSettings();
        });
    }
    
    // Setup buttons
    const recoverBtn = document.getElementById('recover-auto-save-btn');
    if (recoverBtn) {
        recoverBtn.addEventListener('click', recoverAutoSave);
    }
    
    const clearBtn = document.getElementById('clear-auto-save-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAutoSaveData);
    }
    
    // Update last save time display
    const timestamp = localStorage.getItem('artemis-autosave-timestamp');
    const timeDisplay = document.getElementById('last-auto-save-time');
    if (timeDisplay && timestamp) {
        const saveDate = new Date(parseInt(timestamp));
        timeDisplay.textContent = saveDate.toLocaleString();
    }
    
    // Start auto-save if enabled
    if (autoSaveSettings.enabled) {
        startAutoSave();
    }
}

// ============================================
// Brush Renaming System
// ============================================

// Rename a brush preset
function renameBrush() {
    const presetSelect = document.getElementById('brush-preset');
    if (!presetSelect || !presetSelect.value) {
        alert('Please select a brush to rename.');
        return;
    }
    
    const currentName = presetSelect.options[presetSelect.selectedIndex].text;
    const newName = prompt('Enter new name for brush:', currentName);
    
    if (newName && newName.trim() && newName !== currentName) {
        // Update the brush name in custom brushes
        if (!state.customBrushNames) {
            state.customBrushNames = {};
        }
        
        state.customBrushNames[presetSelect.value] = newName.trim();
        
        // Save to localStorage
        localStorage.setItem('artemis-brush-names', JSON.stringify(state.customBrushNames));
        
        // Update the UI
        presetSelect.options[presetSelect.selectedIndex].text = newName.trim();
        
        console.log(`Brush renamed from "${currentName}" to "${newName.trim()}"`);
    }
}

// Load custom brush names
function loadCustomBrushNames() {
    try {
        const saved = localStorage.getItem('artemis-brush-names');
        if (saved) {
            state.customBrushNames = JSON.parse(saved);
            
            // Apply custom names to UI
            const presetSelect = document.getElementById('brush-preset');
            if (presetSelect && state.customBrushNames) {
                Array.from(presetSelect.options).forEach(option => {
                    if (state.customBrushNames[option.value]) {
                        option.text = state.customBrushNames[option.value];
                    }
                });
            }
        }
    } catch (error) {
        console.error('Failed to load custom brush names:', error);
    }
}

// Setup brush renaming UI
function setupBrushRenamingUI() {
    const renameBtn = document.getElementById('rename-brush-btn');
    if (renameBtn) {
        renameBtn.addEventListener('click', renameBrush);
    }
    
    // Load custom brush names
    loadCustomBrushNames();
}

// Phase 5: Layer Styles Dialog
function showLayerStylesDialog() {
    if (!state.activeLayer) return;
    
    const styles = state.activeLayer.layerStyles;
    
    // Save original styles for cancel operation
    const originalStyles = JSON.parse(JSON.stringify(styles));
    
    // Create dialog HTML
    const dialogHTML = `
        <div class="dialog-overlay" id="layer-styles-dialog">
            <div class="dialog-content" style="width: 500px; max-height: 80vh; overflow-y: auto;">
                <h2>Layer Styles</h2>
                
                <!-- Drop Shadow -->
                <div class="setting-group">
                    <label>
                        <input type="checkbox" id="style-drop-shadow-enabled" ${styles.dropShadow.enabled ? 'checked' : ''}>
                        Drop Shadow
                    </label>
                    <div style="margin-left: 20px;">
                        <label>Offset X: <span id="style-shadow-x-value">${styles.dropShadow.offsetX}</span>px</label>
                        <input type="range" id="style-shadow-x" min="-50" max="50" value="${styles.dropShadow.offsetX}" class="slider">
                        <label>Offset Y: <span id="style-shadow-y-value">${styles.dropShadow.offsetY}</span>px</label>
                        <input type="range" id="style-shadow-y" min="-50" max="50" value="${styles.dropShadow.offsetY}" class="slider">
                        <label>Blur: <span id="style-shadow-blur-value">${styles.dropShadow.blur}</span>px</label>
                        <input type="range" id="style-shadow-blur" min="0" max="50" value="${styles.dropShadow.blur}" class="slider">
                        <label>Color:</label>
                        <input type="color" id="style-shadow-color" value="${styles.dropShadow.color}" class="color-input">
                        <label>Opacity: <span id="style-shadow-opacity-value">${Math.round(styles.dropShadow.opacity * 100)}</span>%</label>
                        <input type="range" id="style-shadow-opacity" min="0" max="100" value="${Math.round(styles.dropShadow.opacity * 100)}" class="slider">
                    </div>
                </div>
                
                <!-- Outer Glow -->
                <div class="setting-group">
                    <label>
                        <input type="checkbox" id="style-outer-glow-enabled" ${styles.outerGlow.enabled ? 'checked' : ''}>
                        Outer Glow
                    </label>
                    <div style="margin-left: 20px;">
                        <label>Size: <span id="style-glow-size-value">${styles.outerGlow.size}</span>px</label>
                        <input type="range" id="style-glow-size" min="0" max="50" value="${styles.outerGlow.size}" class="slider">
                        <label>Color:</label>
                        <input type="color" id="style-glow-color" value="${styles.outerGlow.color}" class="color-input">
                        <label>Opacity: <span id="style-glow-opacity-value">${Math.round(styles.outerGlow.opacity * 100)}</span>%</label>
                        <input type="range" id="style-glow-opacity" min="0" max="100" value="${Math.round(styles.outerGlow.opacity * 100)}" class="slider">
                    </div>
                </div>
                
                <!-- Stroke -->
                <div class="setting-group">
                    <label>
                        <input type="checkbox" id="style-stroke-enabled" ${styles.stroke.enabled ? 'checked' : ''}>
                        Stroke
                    </label>
                    <div style="margin-left: 20px;">
                        <label>Size: <span id="style-stroke-size-value">${styles.stroke.size}</span>px</label>
                        <input type="range" id="style-stroke-size" min="1" max="20" value="${styles.stroke.size}" class="slider">
                        <label>Color:</label>
                        <input type="color" id="style-stroke-color" value="${styles.stroke.color}" class="color-input">
                    </div>
                </div>
                
                <!-- Bevel and Emboss -->
                <div class="setting-group">
                    <label>
                        <input type="checkbox" id="style-bevel-enabled" ${styles.bevelEmboss.enabled ? 'checked' : ''}>
                        Bevel and Emboss
                    </label>
                    <div style="margin-left: 20px;">
                        <label>Size: <span id="style-bevel-size-value">${styles.bevelEmboss.size}</span>px</label>
                        <input type="range" id="style-bevel-size" min="1" max="20" value="${styles.bevelEmboss.size}" class="slider">
                        <label>Depth: <span id="style-bevel-depth-value">${styles.bevelEmboss.depth}</span>%</label>
                        <input type="range" id="style-bevel-depth" min="0" max="100" value="${styles.bevelEmboss.depth}" class="slider">
                        <label>Angle: <span id="style-bevel-angle-value">${styles.bevelEmboss.angle}</span>°</label>
                        <input type="range" id="style-bevel-angle" min="0" max="360" value="${styles.bevelEmboss.angle}" class="slider">
                        <label>Highlight: <span id="style-bevel-highlight-value">${styles.bevelEmboss.highlight}</span>%</label>
                        <input type="range" id="style-bevel-highlight" min="0" max="100" value="${styles.bevelEmboss.highlight}" class="slider">
                        <label>Shadow: <span id="style-bevel-shadow-value">${styles.bevelEmboss.shadow}</span>%</label>
                        <input type="range" id="style-bevel-shadow" min="0" max="100" value="${styles.bevelEmboss.shadow}" class="slider">
                    </div>
                </div>
                
                <div class="dialog-buttons">
                    <button class="btn" id="layer-styles-apply">Apply</button>
                    <button class="btn" id="layer-styles-cancel">Cancel</button>
                </div>
            </div>
        </div>
    `;
    
    // Add dialog to DOM
    const dialogContainer = document.createElement('div');
    dialogContainer.innerHTML = dialogHTML;
    document.body.appendChild(dialogContainer.firstElementChild);
    
    // Setup event listeners for real-time updates
    const setupSlider = (sliderId, valueId, property, subProperty, isPercent = false) => {
        const slider = document.getElementById(sliderId);
        const valueSpan = document.getElementById(valueId);
        if (slider && valueSpan) {
            slider.addEventListener('input', (e) => {
                const value = isPercent ? parseInt(e.target.value) / 100 : parseInt(e.target.value);
                valueSpan.textContent = e.target.value;
                styles[property][subProperty] = value;
                compositeAllLayers();
            });
        }
    };
    
    // Drop Shadow
    document.getElementById('style-drop-shadow-enabled').addEventListener('change', (e) => {
        styles.dropShadow.enabled = e.target.checked;
        compositeAllLayers();
    });
    setupSlider('style-shadow-x', 'style-shadow-x-value', 'dropShadow', 'offsetX');
    setupSlider('style-shadow-y', 'style-shadow-y-value', 'dropShadow', 'offsetY');
    setupSlider('style-shadow-blur', 'style-shadow-blur-value', 'dropShadow', 'blur');
    setupSlider('style-shadow-opacity', 'style-shadow-opacity-value', 'dropShadow', 'opacity', true);
    document.getElementById('style-shadow-color').addEventListener('input', (e) => {
        styles.dropShadow.color = e.target.value;
        compositeAllLayers();
    });
    
    // Outer Glow
    document.getElementById('style-outer-glow-enabled').addEventListener('change', (e) => {
        styles.outerGlow.enabled = e.target.checked;
        compositeAllLayers();
    });
    setupSlider('style-glow-size', 'style-glow-size-value', 'outerGlow', 'size');
    setupSlider('style-glow-opacity', 'style-glow-opacity-value', 'outerGlow', 'opacity', true);
    document.getElementById('style-glow-color').addEventListener('input', (e) => {
        styles.outerGlow.color = e.target.value;
        compositeAllLayers();
    });
    
    // Stroke
    document.getElementById('style-stroke-enabled').addEventListener('change', (e) => {
        styles.stroke.enabled = e.target.checked;
        compositeAllLayers();
    });
    setupSlider('style-stroke-size', 'style-stroke-size-value', 'stroke', 'size');
    document.getElementById('style-stroke-color').addEventListener('input', (e) => {
        styles.stroke.color = e.target.value;
        compositeAllLayers();
    });
    
    // Bevel and Emboss
    document.getElementById('style-bevel-enabled').addEventListener('change', (e) => {
        styles.bevelEmboss.enabled = e.target.checked;
        compositeAllLayers();
    });
    setupSlider('style-bevel-size', 'style-bevel-size-value', 'bevelEmboss', 'size');
    setupSlider('style-bevel-depth', 'style-bevel-depth-value', 'bevelEmboss', 'depth');
    setupSlider('style-bevel-angle', 'style-bevel-angle-value', 'bevelEmboss', 'angle');
    setupSlider('style-bevel-highlight', 'style-bevel-highlight-value', 'bevelEmboss', 'highlight');
    setupSlider('style-bevel-shadow', 'style-bevel-shadow-value', 'bevelEmboss', 'shadow');
    
    // Dialog buttons
    document.getElementById('layer-styles-apply').addEventListener('click', () => {
        document.getElementById('layer-styles-dialog').remove();
        saveState();
    });
    
    document.getElementById('layer-styles-cancel').addEventListener('click', () => {
        // Restore original styles
        state.activeLayer.layerStyles = originalStyles;
        document.getElementById('layer-styles-dialog').remove();
        compositeAllLayers();
    });
}

// Automated Brush Testing Function
function testAllBrushes() {
    const brushCategories = {
        'basic': ['basic', 'soft', 'hard', 'medium', 'fine', 'large-soft', 'large-hard', 'tiny', 'huge', 'detail'],
        'airbrush': ['airbrush', 'airbrush-soft', 'airbrush-fine', 'airbrush-large', 'spray', 'mist', 'fog', 'diffuse', 'speckle', 'gradient-spray'],
        'charcoal': ['charcoal', 'pencil', 'graphite', 'charcoal-soft', 'charcoal-hard', 'sketch', 'conte', 'pastel', 'crayon', 'colored-pencil'],
        'ink': ['ink', 'ink-fine', 'ink-bold', 'technical-pen', 'marker', 'marker-chisel', 'brush-pen', 'calligraphy', 'fountain-pen', 'gel-pen'],
        'watercolor': ['watercolor', 'watercolor-wet', 'watercolor-dry', 'wash', 'watercolor-flat', 'watercolor-round', 'splatter', 'wet-blend', 'watercolor-detail', 'drip'],
        'oil': ['oil-paint', 'oil-flat', 'oil-round', 'oil-fan', 'oil-filbert', 'palette-knife', 'impasto', 'oil-glaze', 'oil-detail', 'oil-textured'],
        'acrylic': ['acrylic', 'acrylic-flat', 'acrylic-round', 'acrylic-bright', 'acrylic-detail', 'acrylic-glaze', 'acrylic-heavy', 'acrylic-fan', 'acrylic-liner', 'acrylic-mop'],
        'digital': ['digital-soft', 'digital-hard', 'digital-round', 'digital-flat', 'digital-texture', 'smudge', 'blend', 'digital-detail', 'digital-fuzzy', 'digital-sharp'],
        'concept': ['concept-soft', 'concept-hard', 'concept-texture', 'cloud', 'smoke', 'grass', 'foliage', 'rocks', 'hair', 'fur'],
        'special': ['glow', 'stars', 'sparkle', 'lightning', 'fire', 'water-ripple', 'snow', 'rain', 'leaves', 'bokeh']
    };
    
    const results = {
        passed: [],
        failed: [],
        warnings: []
    };
    
    console.log('=== BRUSH TESTING STARTED ===');
    
    // Test each category
    for (const [category, brushes] of Object.entries(brushCategories)) {
        console.log(`\nTesting ${category} brushes (${brushes.length} brushes):`);
        
        for (const brushName of brushes) {
            try {
                const preset = brushPresets[brushName];
                
                if (!preset) {
                    results.failed.push({
                        category,
                        brush: brushName,
                        error: 'Brush preset not found'
                    });
                    console.error(`❌ ${brushName}: NOT FOUND`);
                    continue;
                }
                
                // Check if all required properties exist
                const requiredProps = ['size', 'opacity', 'hardness', 'flow', 'spacing'];
                const missingProps = requiredProps.filter(prop => preset[prop] === undefined);
                
                if (missingProps.length > 0) {
                    results.failed.push({
                        category,
                        brush: brushName,
                        error: `Missing properties: ${missingProps.join(', ')}`
                    });
                    console.error(`❌ ${brushName}: Missing ${missingProps.join(', ')}`);
                    continue;
                }
                
                // Check for valid value ranges
                if (preset.size < 1 || preset.size > 200) {
                    results.warnings.push({
                        category,
                        brush: brushName,
                        warning: `Unusual size: ${preset.size}`
                    });
                }
                
                if (preset.opacity < 0 || preset.opacity > 100) {
                    results.failed.push({
                        category,
                        brush: brushName,
                        error: `Invalid opacity: ${preset.opacity}`
                    });
                    console.error(`❌ ${brushName}: Invalid opacity ${preset.opacity}`);
                    continue;
                }
                
                // Brush passed all tests
                results.passed.push({
                    category,
                    brush: brushName
                });
                console.log(`✓ ${brushName}: OK`);
                
            } catch (error) {
                results.failed.push({
                    category,
                    brush: brushName,
                    error: error.message
                });
                console.error(`❌ ${brushName}: ${error.message}`);
            }
        }
    }
    
    // Print summary
    console.log('\n=== BRUSH TESTING SUMMARY ===');
    console.log(`✓ Passed: ${results.passed.length}`);
    console.log(`⚠ Warnings: ${results.warnings.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    
    if (results.warnings.length > 0) {
        console.log('\nWarnings:');
        results.warnings.forEach(w => {
            console.log(`  ⚠ ${w.category}/${w.brush}: ${w.warning}`);
        });
    }
    
    if (results.failed.length > 0) {
        console.log('\nFailed:');
        results.failed.forEach(f => {
            console.log(`  ❌ ${f.category}/${f.brush}: ${f.error}`);
        });
    }
    
    console.log('\n=== TESTING COMPLETE ===\n');
    
    return results;
}

// Visual Brush Stroke Testing Function
async function visualTestBrush(brushName, testCanvas, testCtx) {
    return new Promise((resolve) => {
        const preset = brushPresets[brushName];
        if (!preset) {
            resolve({ success: false, error: 'Brush not found' });
            return;
        }
        
        // Apply brush preset
        Object.assign(state.brush, preset);
        
        // Clear test area
        const testX = Math.random() * (testCanvas.width - 200) + 100;
        const testY = Math.random() * (testCanvas.height - 100) + 50;
        
        // Draw test stroke
        testCtx.save();
        testCtx.globalAlpha = preset.opacity / 100;
        
        // Simple brush stroke simulation
        drawTestBrushStroke(testCtx, testX, testY, testX + 100, testY + 20, preset);
        
        testCtx.restore();
        
        // Check if pixels were drawn
        setTimeout(() => {
            const imageData = testCtx.getImageData(testX, testY, 100, 20);
            const pixels = imageData.data;
            let hasPixels = false;
            
            for (let i = 3; i < pixels.length; i += 4) {
                if (pixels[i] > 0) { // Check alpha channel
                    hasPixels = true;
                    break;
                }
            }
            
            resolve({
                success: hasPixels,
                error: hasPixels ? null : 'No visible stroke produced'
            });
        }, 100);
    });
}

// ============================================================================
// PHASE 15: PERFORMANCE & EXPORT ENHANCEMENTS
// ============================================================================

// Export Presets Storage
let exportPresets = {
    'web-standard': {
        name: 'Web Standard',
        format: 'png',
        resize: false,
        quality: 95
    },
    'web-optimized': {
        name: 'Web Optimized',
        format: 'webp',
        resize: true,
        width: 1920,
        height: 1080,
        quality: 90
    },
    'social-media': {
        name: 'Social Media',
        format: 'jpeg',
        resize: true,
        width: 1200,
        height: 1200,
        quality: 85
    },
    'print-quality': {
        name: 'Print Quality',
        format: 'png',
        resize: false,
        quality: 100
    },
    'thumbnail': {
        name: 'Thumbnail',
        format: 'jpeg',
        resize: true,
        width: 400,
        height: 400,
        quality: 80
    }
};

// Load custom export presets from localStorage
function loadExportPresets() {
    try {
        const saved = localStorage.getItem('artemis-export-presets');
        if (saved) {
            const custom = JSON.parse(saved);
            exportPresets = { ...exportPresets, ...custom };
        }
    } catch (error) {
        console.error('Failed to load export presets:', error);
    }
}

// Save custom export presets to localStorage
function saveExportPresets() {
    try {
        // Only save custom presets (not built-in ones)
        const customPresets = {};
        const builtInKeys = ['web-standard', 'web-optimized', 'social-media', 'print-quality', 'thumbnail'];
        for (const key in exportPresets) {
            if (!builtInKeys.includes(key)) {
                customPresets[key] = exportPresets[key];
            }
        }
        localStorage.setItem('artemis-export-presets', JSON.stringify(customPresets));
    } catch (error) {
        console.error('Failed to save export presets:', error);
    }
}

// Setup Advanced Export Dialog
function setupAdvancedExportDialog() {
    loadExportPresets();
    
    const dialog = document.getElementById('advanced-export-dialog');
    const closeBtn = document.getElementById('advanced-export-close');
    const cancelBtn = document.getElementById('advanced-export-cancel');
    const executeBtn = document.getElementById('advanced-export-execute');
    
    const exportSourceRadios = document.querySelectorAll('input[name="export-source"]');
    const layerSelectionContainer = document.getElementById('layer-selection-container');
    const exportLayerList = document.getElementById('export-layer-list');
    
    const formatSelect = document.getElementById('export-format-select');
    const qualitySettings = document.getElementById('quality-settings');
    const qualitySlider = document.getElementById('export-quality-slider');
    const qualityValue = document.getElementById('export-quality-value');
    
    const webOptimization = document.getElementById('enable-web-optimization');
    const webOptimizationOptions = document.getElementById('web-optimization-options');
    const resizeOnExport = document.getElementById('resize-on-export');
    const resizeOptions = document.getElementById('resize-options');
    const widthInput = document.getElementById('export-width');
    const heightInput = document.getElementById('export-height');
    const maintainAspectRatio = document.getElementById('maintain-aspect-ratio');
    
    const presetSelect = document.getElementById('export-preset-select');
    const savePresetBtn = document.getElementById('save-export-preset');
    
    const estimatedSizeDisplay = document.getElementById('estimated-export-size');
    const memoryUsageDisplay = document.getElementById('current-memory-usage');
    
    // Close handlers
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            dialog.classList.add('hidden');
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            dialog.classList.add('hidden');
        });
    }
    
    // Export source change handler
    exportSourceRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'selected' || e.target.value === 'batch') {
                layerSelectionContainer.classList.remove('hidden');
                populateExportLayerList();
            } else {
                layerSelectionContainer.classList.add('hidden');
            }
            updateExportEstimates();
        });
    });
    
    // Format change handler
    if (formatSelect) {
        formatSelect.addEventListener('change', () => {
            const format = formatSelect.value;
            if (format === 'jpeg' || format === 'webp') {
                qualitySettings.classList.remove('hidden');
            } else {
                qualitySettings.classList.add('hidden');
            }
            updateFormatRecommendation();
            updateExportEstimates();
        });
    }
    
    // Quality slider
    if (qualitySlider) {
        qualitySlider.addEventListener('input', () => {
            qualityValue.textContent = qualitySlider.value;
            updateExportEstimates();
        });
    }
    
    // Web optimization toggle
    if (webOptimization) {
        webOptimization.addEventListener('change', () => {
            if (webOptimization.checked) {
                webOptimizationOptions.classList.remove('hidden');
            } else {
                webOptimizationOptions.classList.add('hidden');
            }
            updateFormatRecommendation();
        });
    }
    
    // Resize toggle
    if (resizeOnExport) {
        resizeOnExport.addEventListener('change', () => {
            if (resizeOnExport.checked) {
                resizeOptions.classList.remove('hidden');
                // Set current canvas size
                widthInput.value = mainCanvas.width;
                heightInput.value = mainCanvas.height;
            } else {
                resizeOptions.classList.add('hidden');
            }
            updateExportEstimates();
        });
    }
    
    // Dimension inputs with aspect ratio lock
    if (widthInput && heightInput && maintainAspectRatio) {
        const aspectRatio = mainCanvas.width / mainCanvas.height;
        
        widthInput.addEventListener('input', () => {
            if (maintainAspectRatio.checked) {
                heightInput.value = Math.round(widthInput.value / aspectRatio);
            }
            updateExportEstimates();
        });
        
        heightInput.addEventListener('input', () => {
            if (maintainAspectRatio.checked) {
                widthInput.value = Math.round(heightInput.value * aspectRatio);
            }
            updateExportEstimates();
        });
    }
    
    // Preset selection
    if (presetSelect) {
        presetSelect.addEventListener('change', () => {
            const presetKey = presetSelect.value;
            if (presetKey && exportPresets[presetKey]) {
                applyExportPreset(exportPresets[presetKey]);
            }
        });
    }
    
    // Save preset
    if (savePresetBtn) {
        savePresetBtn.addEventListener('click', () => {
            const name = prompt('Enter a name for this export preset:');
            if (name) {
                const preset = getCurrentExportSettings();
                const key = name.toLowerCase().replace(/\s+/g, '-');
                exportPresets[key] = { ...preset, name };
                saveExportPresets();
                
                // Add to select
                const option = document.createElement('option');
                option.value = key;
                option.textContent = name;
                presetSelect.appendChild(option);
                
                alert('Export preset saved successfully!');
            }
        });
    }
    
    // Execute export
    if (executeBtn) {
        executeBtn.addEventListener('click', async () => {
            await executeAdvancedExport();
            dialog.classList.add('hidden');
        });
    }
}

// Populate layer list for selection
function populateExportLayerList() {
    const exportLayerList = document.getElementById('export-layer-list');
    if (!exportLayerList) return;
    
    exportLayerList.innerHTML = '';
    
    state.layers.forEach((layer, index) => {
        const layerItem = document.createElement('label');
        layerItem.style.display = 'block';
        layerItem.style.marginBottom = '5px';
        layerItem.innerHTML = `
            <input type="checkbox" class="export-layer-checkbox" data-layer-index="${index}" checked>
            ${layer.name || `Layer ${index + 1}`} ${layer.visible ? '' : '(Hidden)'}
        `;
        exportLayerList.appendChild(layerItem);
    });
}

// Apply export preset
function applyExportPreset(preset) {
    const formatSelect = document.getElementById('export-format-select');
    const qualitySlider = document.getElementById('export-quality-slider');
    const qualityValue = document.getElementById('export-quality-value');
    const resizeOnExport = document.getElementById('resize-on-export');
    const widthInput = document.getElementById('export-width');
    const heightInput = document.getElementById('export-height');
    const webOptimization = document.getElementById('enable-web-optimization');
    
    if (formatSelect) formatSelect.value = preset.format;
    
    if (preset.format === 'jpeg' || preset.format === 'webp') {
        document.getElementById('quality-settings').classList.remove('hidden');
        if (qualitySlider) {
            qualitySlider.value = preset.quality || 95;
            qualityValue.textContent = preset.quality || 95;
        }
    } else {
        document.getElementById('quality-settings').classList.add('hidden');
    }
    
    if (resizeOnExport) {
        resizeOnExport.checked = preset.resize || false;
        if (preset.resize) {
            document.getElementById('resize-options').classList.remove('hidden');
            if (widthInput) widthInput.value = preset.width || mainCanvas.width;
            if (heightInput) heightInput.value = preset.height || mainCanvas.height;
        } else {
            document.getElementById('resize-options').classList.add('hidden');
        }
    }
    
    if (webOptimization && preset.resize) {
        webOptimization.checked = true;
        document.getElementById('web-optimization-options').classList.remove('hidden');
    }
    
    updateFormatRecommendation();
    updateExportEstimates();
}

// Get current export settings
function getCurrentExportSettings() {
    const formatSelect = document.getElementById('export-format-select');
    const qualitySlider = document.getElementById('export-quality-slider');
    const resizeOnExport = document.getElementById('resize-on-export');
    const widthInput = document.getElementById('export-width');
    const heightInput = document.getElementById('export-height');
    
    return {
        format: formatSelect ? formatSelect.value : 'png',
        quality: qualitySlider ? parseInt(qualitySlider.value) : 95,
        resize: resizeOnExport ? resizeOnExport.checked : false,
        width: widthInput ? parseInt(widthInput.value) : mainCanvas.width,
        height: heightInput ? parseInt(heightInput.value) : mainCanvas.height
    };
}

// Update format recommendation
function updateFormatRecommendation() {
    const recommendationEl = document.getElementById('format-recommendation');
    if (!recommendationEl) return;
    
    const settings = getCurrentExportSettings();
    const webOptimization = document.getElementById('enable-web-optimization');
    
    let recommendation = '';
    
    if (webOptimization && webOptimization.checked) {
        if (settings.format === 'png') {
            recommendation = 'For web use, consider WebP format for better compression while maintaining quality.';
        } else if (settings.format === 'jpeg') {
            recommendation = 'JPEG is good for photos. Quality 85-90% is usually sufficient for web.';
        } else if (settings.format === 'webp') {
            recommendation = 'WebP offers the best compression for web use. Quality 85-90% recommended.';
        }
    } else {
        if (settings.format === 'png') {
            recommendation = 'PNG provides lossless quality and supports transparency.';
        } else if (settings.format === 'jpeg') {
            recommendation = 'JPEG is best for photographs without transparency. Use 90-95% quality for print.';
        } else if (settings.format === 'webp') {
            recommendation = 'WebP is a modern format with excellent compression.';
        }
    }
    
    recommendationEl.textContent = recommendation;
}

// Update export size estimates
function updateExportEstimates() {
    const estimatedSizeDisplay = document.getElementById('estimated-export-size');
    const memoryUsageDisplay = document.getElementById('current-memory-usage');
    
    if (!estimatedSizeDisplay || !memoryUsageDisplay) return;
    
    const settings = getCurrentExportSettings();
    const width = settings.resize ? settings.width : mainCanvas.width;
    const height = settings.resize ? settings.height : mainCanvas.height;
    
    // Estimate file size based on format and settings
    let estimatedBytes = width * height * 4; // Base RGBA
    
    if (settings.format === 'png') {
        estimatedBytes = estimatedBytes * 0.5; // PNG compression roughly 50%
    } else if (settings.format === 'jpeg') {
        estimatedBytes = estimatedBytes * (settings.quality / 100) * 0.15; // JPEG compression
    } else if (settings.format === 'webp') {
        estimatedBytes = estimatedBytes * (settings.quality / 100) * 0.12; // WebP better compression
    }
    
    estimatedSizeDisplay.textContent = formatBytes(estimatedBytes);
    
    // Calculate current memory usage
    const layerMemory = state.layers.length * mainCanvas.width * mainCanvas.height * 4;
    const historyMemory = state.history.length * mainCanvas.width * mainCanvas.height * 4;
    const totalMemory = layerMemory + historyMemory;
    
    memoryUsageDisplay.textContent = formatBytes(totalMemory);
}

// Format bytes to human-readable string
function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Execute advanced export
async function executeAdvancedExport() {
    try {
        const exportSource = document.querySelector('input[name="export-source"]:checked').value;
        const settings = getCurrentExportSettings();
        
        // Determine what to export
        let canvasesToExport = [];
        
        if (exportSource === 'all') {
            // Export flattened canvas
            canvasesToExport.push({ canvas: mainCanvas, name: 'export' });
        } else if (exportSource === 'current') {
            // Export current layer only
            const currentLayer = state.layers[state.activeLayer];
            if (currentLayer) {
                canvasesToExport.push({ canvas: currentLayer.canvas, name: currentLayer.name || `layer-${state.activeLayer}` });
            }
        } else if (exportSource === 'visible') {
            // Create temporary canvas with visible layers
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = mainCanvas.width;
            tempCanvas.height = mainCanvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            
            state.layers.forEach(layer => {
                if (layer.visible) {
                    tempCtx.globalAlpha = layer.opacity / 100;
                    tempCtx.drawImage(layer.canvas, 0, 0);
                }
            });
            
            canvasesToExport.push({ canvas: tempCanvas, name: 'visible-layers' });
        } else if (exportSource === 'selected') {
            // Export selected layers merged
            const checkboxes = document.querySelectorAll('.export-layer-checkbox:checked');
            const selectedIndices = Array.from(checkboxes).map(cb => parseInt(cb.dataset.layerIndex));
            
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = mainCanvas.width;
            tempCanvas.height = mainCanvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            
            selectedIndices.forEach(index => {
                const layer = state.layers[index];
                if (layer) {
                    tempCtx.globalAlpha = layer.opacity / 100;
                    tempCtx.drawImage(layer.canvas, 0, 0);
                }
            });
            
            canvasesToExport.push({ canvas: tempCanvas, name: 'selected-layers' });
        } else if (exportSource === 'batch') {
            // Export each selected layer separately
            const checkboxes = document.querySelectorAll('.export-layer-checkbox:checked');
            const selectedIndices = Array.from(checkboxes).map(cb => parseInt(cb.dataset.layerIndex));
            
            selectedIndices.forEach(index => {
                const layer = state.layers[index];
                if (layer) {
                    canvasesToExport.push({ 
                        canvas: layer.canvas, 
                        name: layer.name || `layer-${index}` 
                    });
                }
            });
        }
        
        // Export each canvas
        for (const { canvas, name } of canvasesToExport) {
            await exportCanvasAdvanced(canvas, name, settings);
        }
        
        if (canvasesToExport.length > 1) {
            alert(`Successfully exported ${canvasesToExport.length} files!`);
        } else if (canvasesToExport.length === 1) {
            alert('Image exported successfully!');
        } else {
            alert('No layers selected for export.');
        }
        
    } catch (error) {
        console.error('Export failed:', error);
        alert('Export failed: ' + error.message);
    }
}

// Export canvas with advanced settings
async function exportCanvasAdvanced(sourceCanvas, filename, settings) {
    let exportCanvas = sourceCanvas;
    
    // Resize if needed
    if (settings.resize && (settings.width !== sourceCanvas.width || settings.height !== sourceCanvas.height)) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = settings.width;
        tempCanvas.height = settings.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Use high-quality image smoothing
        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = 'high';
        tempCtx.drawImage(sourceCanvas, 0, 0, settings.width, settings.height);
        
        exportCanvas = tempCanvas;
    }
    
    // Generate data URL
    let dataUrl;
    const format = settings.format;
    
    if (format === 'png') {
        dataUrl = exportCanvas.toDataURL('image/png');
    } else if (format === 'jpeg') {
        dataUrl = exportCanvas.toDataURL('image/jpeg', settings.quality / 100);
    } else if (format === 'webp') {
        dataUrl = exportCanvas.toDataURL('image/webp', settings.quality / 100);
    }
    
    // Download the file
    const link = document.createElement('a');
    link.download = `${filename}.${format}`;
    link.href = dataUrl;
    link.click();
}

// Show advanced export dialog
function showAdvancedExportDialog() {
    const dialog = document.getElementById('advanced-export-dialog');
    if (dialog) {
        dialog.classList.remove('hidden');
        
        // Initialize with current canvas size
        const widthInput = document.getElementById('export-width');
        const heightInput = document.getElementById('export-height');
        if (widthInput) widthInput.value = mainCanvas.width;
        if (heightInput) heightInput.value = mainCanvas.height;
        
        updateExportEstimates();
        updateFormatRecommendation();
    }
}

// ============================================================================
// MEMORY MONITORING & MANAGEMENT
// ============================================================================

// Setup Memory Monitor Dialog
function setupMemoryMonitorDialog() {
    const dialog = document.getElementById('memory-monitor-dialog');
    const closeBtn = document.getElementById('memory-monitor-close');
    const okBtn = document.getElementById('memory-monitor-ok');
    
    const enableMemoryCleanup = document.getElementById('enable-memory-cleanup');
    const maxHistorySlider = document.getElementById('max-history-slider');
    const maxHistoryValue = document.getElementById('max-history-value');
    
    const cleanupHistoryBtn = document.getElementById('cleanup-history-btn');
    const cleanupThumbnailsBtn = document.getElementById('cleanup-thumbnails-btn');
    const forceGcBtn = document.getElementById('force-gc-btn');
    
    // Close handlers
    if (closeBtn) {
        closeBtn.addEventListener('click', () => dialog.classList.add('hidden'));
    }
    if (okBtn) {
        okBtn.addEventListener('click', () => dialog.classList.add('hidden'));
    }
    
    // Max history slider
    if (maxHistorySlider) {
        maxHistorySlider.addEventListener('input', () => {
            maxHistoryValue.textContent = maxHistorySlider.value;
            state.maxHistoryStates = parseInt(maxHistorySlider.value);
            
            // Trim history if needed
            if (state.history.length > state.maxHistoryStates) {
                state.history = state.history.slice(-state.maxHistoryStates);
                state.historyIndex = Math.min(state.historyIndex, state.history.length - 1);
            }
        });
    }
    
    // Cleanup handlers
    if (cleanupHistoryBtn) {
        cleanupHistoryBtn.addEventListener('click', () => {
            if (confirm('Clear undo history? Current state will be preserved.')) {
                // Save current state
                const currentState = captureState();
                // Clear history
                state.history = [currentState];
                state.historyIndex = 0;
                updateMemoryStats();
                alert('Undo history cleared!');
            }
        });
    }
    
    if (cleanupThumbnailsBtn) {
        cleanupThumbnailsBtn.addEventListener('click', () => {
            updateLayerThumbnails();
            alert('Layer thumbnails regenerated!');
        });
    }
    
    if (forceGcBtn) {
        forceGcBtn.addEventListener('click', () => {
            // Clear temporary canvases and force browser GC
            if (window.gc) {
                window.gc(); // Only works with --expose-gc flag
                alert('Garbage collection triggered!');
            } else {
                alert('Garbage collection is not available in this browser. Memory will be cleaned up automatically.');
            }
            updateMemoryStats();
        });
    }
}

// Show memory monitor dialog
function showMemoryMonitorDialog() {
    const dialog = document.getElementById('memory-monitor-dialog');
    if (dialog) {
        dialog.classList.remove('hidden');
        updateMemoryStats();
    }
}

// Update memory statistics
function updateMemoryStats() {
    const canvasMemoryEl = document.getElementById('canvas-memory');
    const layerCountEl = document.getElementById('layer-count-display');
    const historyCountEl = document.getElementById('history-count-display');
    const totalMemoryEl = document.getElementById('total-memory-estimate');
    
    if (!canvasMemoryEl) return;
    
    // Calculate memory usage
    const bytesPerPixel = 4; // RGBA
    const canvasPixels = mainCanvas.width * mainCanvas.height;
    const canvasMemory = canvasPixels * bytesPerPixel;
    const layerMemory = state.layers.length * canvasMemory;
    const historyMemory = state.history.length * canvasMemory;
    const totalMemory = layerMemory + historyMemory;
    
    canvasMemoryEl.textContent = formatBytes(canvasMemory);
    layerCountEl.textContent = state.layers.length;
    historyCountEl.textContent = state.history.length;
    totalMemoryEl.textContent = formatBytes(totalMemory);
}

// Add menu action handlers for Phase 15 features
function initPhase15MenuActions() {
    // Advanced export action
    const advancedExportBtn = document.querySelector('[data-action="file-export-advanced"]');
    if (advancedExportBtn) {
        advancedExportBtn.addEventListener('click', showAdvancedExportDialog);
    }
    
    // Memory monitor action
    const memoryMonitorBtn = document.querySelector('[data-action="file-memory-monitor"]');
    if (memoryMonitorBtn) {
        memoryMonitorBtn.addEventListener('click', showMemoryMonitorDialog);
    }
    
    // Add Ctrl+Shift+E shortcut for advanced export
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'E') {
            e.preventDefault();
            showAdvancedExportDialog();
        }
    });
}

// Initialize Phase 15 features
function initPhase15Features() {
    setupAdvancedExportDialog();
    setupMemoryMonitorDialog();
    initPhase15MenuActions();
    initPhase15Enhancements();
    console.log('Phase 15: Performance & Export features initialized');
}

// Initialize Phase 15 enhancements (WebGL, Tiled Canvas, Progressive Loading)
function initPhase15Enhancements() {
    // Check WebGL availability
    if (typeof WebGLRenderer !== 'undefined' && WebGLRenderer.isWebGLAvailable()) {
        console.log('WebGL is available and can be used for acceleration');
        state.webglAvailable = true;
    } else {
        console.log('WebGL not available, using standard 2D canvas');
        state.webglAvailable = false;
    }
    
    // Initialize tiled canvas support for large canvases (4K+)
    state.useTiledCanvas = false;
    state.tiledCanvasInstance = null;
    
    // Check if current canvas is large enough to benefit from tiling
    checkAndEnableTiledCanvas();
    
    console.log('Phase 15 enhancements (WebGL, Tiled Canvas, Progressive Loading) initialized');
}

// Check if tiled canvas should be enabled based on canvas size
function checkAndEnableTiledCanvas() {
    const canvasSize = state.canvas.width * state.canvas.height;
    const threshold = 3840 * 2160; // 4K resolution
    
    if (canvasSize > threshold && typeof TiledCanvas !== 'undefined') {
        console.log('Canvas is large (4K+), tiled rendering is available');
        // Tiled canvas will be enabled on demand to preserve memory
    }
}

// Phase 12: Initialize Animation & Recording features
function initPhase12Features() {
    // Initialize Animation System
    if (typeof AnimationSystem !== 'undefined') {
        state.animationSystem = new AnimationSystem();
        state.animationUI = new AnimationUI(state.animationSystem);
        
        // Set up frame change callback
        state.animationUI.onFrameChange = (frameIndex, frame) => {
            // TODO: Render frame to canvas
            console.log(`Animation frame changed to: ${frameIndex}`);
        };
        
        console.log('Animation system initialized');
    }
    
    // Initialize Session Recorder
    if (typeof SessionRecorder !== 'undefined') {
        state.sessionRecorder = new SessionRecorder();
        console.log('Session recorder initialized');
    }
    
    // Setup animation menu handlers
    setupAnimationMenuHandlers();
    
    console.log('Phase 12: Animation & Recording features initialized');
}

// Setup animation menu handlers
function setupAnimationMenuHandlers() {
    // Listen for IPC events from menu
    if (typeof ipcRenderer !== 'undefined' && ipcRenderer.on) {
        ipcRenderer.on('animation-show-timeline', () => {
            if (state.animationUI) state.animationUI.show();
        });
        
        ipcRenderer.on('animation-add-frame', () => {
            if (state.animationUI) state.animationUI.addFrame();
        });
        
        ipcRenderer.on('animation-duplicate-frame', () => {
            if (state.animationUI) state.animationUI.duplicateFrame();
        });
        
        ipcRenderer.on('animation-delete-frame', () => {
            if (state.animationUI) state.animationUI.deleteFrame();
        });
        
        ipcRenderer.on('animation-play', () => {
            if (state.animationUI) state.animationUI.play();
        });
        
        ipcRenderer.on('animation-stop', () => {
            if (state.animationUI) state.animationUI.stop();
        });
        
        ipcRenderer.on('animation-toggle-onion-skin', () => {
            if (state.animationUI) state.animationUI.toggleOnionSkin();
        });
        
        ipcRenderer.on('animation-export-gif', () => {
            if (state.animationUI) state.animationUI.exportGIF();
        });
        
        ipcRenderer.on('animation-export-frames', () => {
            if (state.animationUI) state.animationUI.exportFrames();
        });
        
        ipcRenderer.on('animation-export-spritesheet', () => {
            if (state.animationUI) state.animationUI.exportSpriteSheet();
        });
        
        ipcRenderer.on('recording-start', () => {
            if (state.sessionRecorder) {
                state.sessionRecorder.startRecording(mainCanvas);
                console.log('Recording started');
            }
        });
        
        ipcRenderer.on('recording-stop', () => {
            if (state.sessionRecorder) {
                const stats = state.sessionRecorder.stopRecording();
                console.log('Recording stopped:', stats);
            }
        });
    }
}

// Phase 14: Initialize Cloud & Collaboration features
async function initPhase14Features() {
    // Initialize Cloud Sync System
    if (typeof CloudSync !== 'undefined') {
        state.cloudSync = new CloudSync();
        state.cloudSyncUI = new CloudSyncUI(state.cloudSync);
        
        // Initialize database
        try {
            await state.cloudSync.initDB();
            console.log('Cloud sync database initialized');
            
            // Load saved settings if available
            const savedSettings = await state.cloudSync.loadSettings();
            if (savedSettings) {
                console.log('Loaded settings from cloud sync');
                // TODO: Apply saved settings
            }
        } catch (error) {
            console.error('Failed to initialize cloud sync:', error);
        }
        
        // Set up project load callback
        state.cloudSyncUI.onProjectLoad = async (projectId) => {
            const project = await state.cloudSync.loadProject(projectId);
            if (project) {
                console.log('Loading project from cloud:', project.name);
                // TODO: Load project data into application
            }
        };
        
        console.log('Cloud sync UI initialized');
    }
    
    // Setup cloud sync menu handlers
    setupCloudSyncMenuHandlers();
    
    console.log('Phase 14: Cloud & Collaboration features initialized');
}

// Setup cloud sync menu handlers
function setupCloudSyncMenuHandlers() {
    // Listen for IPC events from menu
    if (typeof ipcRenderer !== 'undefined' && ipcRenderer.on) {
        ipcRenderer.on('cloud-show-panel', () => {
            if (state.cloudSyncUI) state.cloudSyncUI.show();
        });
        
        ipcRenderer.on('cloud-sync-now', async () => {
            if (state.cloudSyncUI) await state.cloudSyncUI.syncNow();
        });
        
        ipcRenderer.on('cloud-toggle-auto-sync', async () => {
            if (state.cloudSyncUI) await state.cloudSyncUI.toggleAutoSync();
        });
        
        ipcRenderer.on('cloud-export-backup', async () => {
            if (state.cloudSyncUI) await state.cloudSyncUI.exportBackup();
        });
        
        ipcRenderer.on('cloud-import-backup', async () => {
            if (state.cloudSyncUI) await state.cloudSyncUI.importBackup();
        });
        
        ipcRenderer.on('cloud-generate-share-link', async () => {
            if (state.cloudSyncUI) await state.cloudSyncUI.generateShareLink();
        });
    }
}

// ============================================================================
// AI Tools Implementation (Category 1: Future Enhancements 2.0)
// ============================================================================

let aiTools = null;
let aiCompositionOverlayActive = false;
let aiCompositionOverlayType = 'rule-of-thirds';

// Initialize AI Tools on first use
function initAITools() {
    if (!aiTools && typeof AITools !== 'undefined') {
        aiTools = new AITools({
            canvas: mainCanvas,
            ctx: mainCtx
        });
        console.log('AI Tools initialized');
    }
    return aiTools;
}

// AI Background Removal
async function applyAIBackgroundRemoval() {
    if (!state.activeLayer) {
        alert('Please select a layer first.');
        return;
    }
    
    const tools = initAITools();
    if (!tools) {
        alert('AI Tools not available');
        return;
    }
    
    const tolerance = prompt('Enter background removal tolerance (10-100):', '30');
    if (tolerance === null) return;
    
    const featherRadius = prompt('Enter edge feather radius (0-10):', '2');
    if (featherRadius === null) return;
    
    try {
        // Save current state for undo
        saveState();
        
        // Apply background removal to active layer
        const layerCanvas = state.activeLayer.canvas;
        const layerCtx = layerCanvas.getContext('2d');
        tools.canvas = layerCanvas;
        tools.ctx = layerCtx;
        
        await tools.removeBackground({
            tolerance: parseInt(tolerance),
            preserveEdges: true,
            featherRadius: parseInt(featherRadius)
        });
        
        // Restore original canvas reference
        tools.canvas = mainCanvas;
        tools.ctx = mainCtx;
        
        // Redraw
        renderLayers();
        alert('Background removal complete!');
    } catch (error) {
        console.error('AI Background Removal error:', error);
        alert('Error applying background removal: ' + error.message);
    }
}

// AI Object Selection
function enableAIObjectSelection() {
    alert('AI Object Selection: Click on an object in the canvas to select it.\n\nThis feature uses intelligent edge detection to identify and select objects.');
    
    // Switch to selection tool and enable AI mode
    selectTool('selection');
    
    // Add one-time click listener for AI selection
    const handleAISelection = async (e) => {
        const tools = initAITools();
        if (!tools || !state.activeLayer) return;
        
        const rect = mainCanvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) * (mainCanvas.width / rect.width));
        const y = Math.floor((e.clientY - rect.top) * (mainCanvas.height / rect.height));
        
        try {
            const tolerance = 32;
            const selection = await tools.selectObject(x, y, {
                tolerance,
                contiguous: true,
                antiAlias: true
            });
            
            // Create selection visualization
            state.selection = {
                active: true,
                data: selection,
                x: 0,
                y: 0,
                width: mainCanvas.width,
                height: mainCanvas.height
            };
            
            // Draw selection marching ants
            renderLayers();
            alert('Object selected! You can now move, transform, or edit the selection.');
        } catch (error) {
            console.error('AI Object Selection error:', error);
            alert('Error selecting object: ' + error.message);
        }
        
        // Remove the listener after first use
        mainCanvas.removeEventListener('click', handleAISelection);
    };
    
    mainCanvas.addEventListener('click', handleAISelection);
}

// AI Smart Sharpen
async function applyAISmartSharpen() {
    if (!state.activeLayer) {
        alert('Please select a layer first.');
        return;
    }
    
    const tools = initAITools();
    if (!tools) {
        alert('AI Tools not available');
        return;
    }
    
    const amount = prompt('Enter sharpening amount (0.5-3.0):', '1.0');
    if (amount === null) return;
    
    const radius = prompt('Enter sharpening radius (0.5-5.0):', '1.0');
    if (radius === null) return;
    
    const reduceNoise = confirm('Apply noise reduction first?');
    
    try {
        // Save current state for undo
        saveState();
        
        // Apply smart sharpen to active layer
        const layerCanvas = state.activeLayer.canvas;
        const layerCtx = layerCanvas.getContext('2d');
        tools.canvas = layerCanvas;
        tools.ctx = layerCtx;
        
        await tools.smartSharpen({
            amount: parseFloat(amount),
            radius: parseFloat(radius),
            threshold: 0,
            reduceNoise: reduceNoise
        });
        
        // Restore original canvas reference
        tools.canvas = mainCanvas;
        tools.ctx = mainCtx;
        
        // Redraw
        renderLayers();
        alert('Smart sharpening complete!');
    } catch (error) {
        console.error('AI Smart Sharpen error:', error);
        alert('Error applying smart sharpen: ' + error.message);
    }
}

// AI Auto-Enhance
async function applyAIAutoEnhance() {
    if (!state.activeLayer) {
        alert('Please select a layer first.');
        return;
    }
    
    const tools = initAITools();
    if (!tools) {
        alert('AI Tools not available');
        return;
    }
    
    const adjustExposure = confirm('Adjust exposure automatically?');
    const adjustContrast = confirm('Adjust contrast automatically?');
    const adjustSaturation = confirm('Adjust saturation automatically?');
    const reduceNoise = confirm('Apply noise reduction?');
    
    try {
        // Save current state for undo
        saveState();
        
        // Apply auto-enhance to active layer
        const layerCanvas = state.activeLayer.canvas;
        const layerCtx = layerCanvas.getContext('2d');
        tools.canvas = layerCanvas;
        tools.ctx = layerCtx;
        
        await tools.autoEnhance({
            adjustExposure,
            adjustContrast,
            adjustSaturation,
            reduceNoise
        });
        
        // Restore original canvas reference
        tools.canvas = mainCanvas;
        tools.ctx = mainCtx;
        
        // Redraw
        renderLayers();
        alert('Auto-enhancement complete!');
    } catch (error) {
        console.error('AI Auto-Enhance error:', error);
        alert('Error applying auto-enhance: ' + error.message);
    }
}

// AI Intelligent Crop
async function showAIIntelligentCrop() {
    if (!state.activeLayer) {
        alert('Please select a layer first.');
        return;
    }
    
    const tools = initAITools();
    if (!tools) {
        alert('AI Tools not available');
        return;
    }
    
    try {
        const aspectRatio = prompt('Enter desired aspect ratio (width:height), or leave empty for auto:', '');
        let ratio = null;
        if (aspectRatio && aspectRatio.includes(':')) {
            const parts = aspectRatio.split(':');
            ratio = parseFloat(parts[0]) / parseFloat(parts[1]);
        }
        
        // Get crop suggestions from AI
        const layerCanvas = state.activeLayer.canvas;
        const layerCtx = layerCanvas.getContext('2d');
        tools.canvas = layerCanvas;
        tools.ctx = layerCtx;
        
        const suggestions = await tools.suggestCrop(ratio);
        
        // Restore original canvas reference
        tools.canvas = mainCanvas;
        tools.ctx = mainCtx;
        
        // Show suggestions
        let message = 'AI Crop Suggestions:\n\n';
        suggestions.forEach((suggestion, index) => {
            message += `${index + 1}. ${suggestion.type}\n`;
            message += `   Position: (${Math.round(suggestion.x)}, ${Math.round(suggestion.y)})\n`;
            message += `   Size: ${Math.round(suggestion.width)} x ${Math.round(suggestion.height)}\n\n`;
        });
        
        alert(message + 'Use the Crop tool to apply these suggestions manually.');
    } catch (error) {
        console.error('AI Intelligent Crop error:', error);
        alert('Error suggesting crops: ' + error.message);
    }
}

// AI Composition Overlay
function toggleAICompositionOverlay() {
    aiCompositionOverlayActive = !aiCompositionOverlayActive;
    
    if (aiCompositionOverlayActive) {
        const types = ['rule-of-thirds', 'golden-ratio', 'center', 'diagonal'];
        const choice = prompt(
            'Choose composition overlay type:\n' +
            '1. Rule of Thirds\n' +
            '2. Golden Ratio\n' +
            '3. Center\n' +
            '4. Diagonal',
            '1'
        );
        
        if (choice === null) {
            aiCompositionOverlayActive = false;
            return;
        }
        
        const index = parseInt(choice) - 1;
        if (index >= 0 && index < types.length) {
            aiCompositionOverlayType = types[index];
        }
        
        drawAICompositionOverlay();
    } else {
        // Clear overlay
        renderLayers();
    }
}

function drawAICompositionOverlay() {
    if (!aiCompositionOverlayActive) return;
    
    const tools = initAITools();
    if (!tools) return;
    
    const overlay = tools.getCompositionOverlay(aiCompositionOverlayType);
    
    // Draw overlay on main canvas
    renderLayers(); // Redraw base image first
    
    mainCtx.save();
    mainCtx.strokeStyle = 'rgba(255, 215, 0, 0.5)'; // Golden color
    mainCtx.lineWidth = 2;
    mainCtx.setLineDash([10, 5]);
    
    overlay.lines.forEach(line => {
        const x1 = line.x1 * mainCanvas.width;
        const y1 = line.y1 * mainCanvas.height;
        const x2 = line.x2 * mainCanvas.width;
        const y2 = line.y2 * mainCanvas.height;
        
        mainCtx.beginPath();
        mainCtx.moveTo(x1, y1);
        mainCtx.lineTo(x2, y2);
        mainCtx.stroke();
    });
    
    mainCtx.restore();
    
    // Show overlay info
    mainCtx.save();
    mainCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    mainCtx.fillRect(10, 10, 200, 40);
    mainCtx.fillStyle = 'rgba(255, 215, 0, 1)';
    mainCtx.font = '14px Arial';
    mainCtx.fillText(`Composition: ${aiCompositionOverlayType}`, 20, 30);
    mainCtx.fillText('Press ESC to hide', 20, 45);
    mainCtx.restore();
}

// Hook into the rendering pipeline to draw overlay
// This will be set up after renderLayers is defined
let originalRenderLayers = null;

function setupAIRenderingHook() {
    if (typeof renderLayers !== 'undefined' && !originalRenderLayers) {
        originalRenderLayers = renderLayers;
        renderLayers = function() {
            originalRenderLayers.apply(this, arguments);
            if (aiCompositionOverlayActive) {
                drawAICompositionOverlay();
            }
        };
    }
}

// Add ESC key to hide overlay
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && aiCompositionOverlayActive) {
        aiCompositionOverlayActive = false;
        if (typeof renderLayers !== 'undefined') {
            renderLayers();
        }
    }
});

// ==================================================================
// CATEGORY 4: SELECTION & MASKING TOOLS
// Implementation of FUTURE_ENHANCEMENTS_2.md Category 4
// ==================================================================

// ==================== Advanced Selection ====================

/**
 * AI-Powered Selection Enhancement
 * Select subject, sky, hair, objects by type
 */
function aiSelectSubject() {
    if (!state.activeLayer) return;
    
    const imageData = state.activeLayer.canvas.getContext('2d').getImageData(
        0, 0, state.canvas.width, state.canvas.height
    );
    
    // Use existing AI object selection with enhanced capabilities
    if (window.aiTools && window.aiTools.objectSelection) {
        const centerX = Math.floor(state.canvas.width / 2);
        const centerY = Math.floor(state.canvas.height / 2);
        
        window.aiTools.objectSelection(imageData, centerX, centerY, {
            tolerance: 30,
            multiObject: true,
            semanticUnderstanding: 'subject'
        }).then(selectionMask => {
            state.selection.mask = selectionMask;
            state.selection.active = true;
            state.selection.type = 'ai-subject';
            compositeAllLayers();
        });
    }
}

function aiSelectSky() {
    if (!state.activeLayer) return;
    
    const imageData = state.activeLayer.canvas.getContext('2d').getImageData(
        0, 0, state.canvas.width, state.canvas.height
    );
    
    // Sky typically at top of image
    const skyX = Math.floor(state.canvas.width / 2);
    const skyY = Math.floor(state.canvas.height * 0.2);
    
    if (window.aiTools && window.aiTools.objectSelection) {
        window.aiTools.objectSelection(imageData, skyX, skyY, {
            tolerance: 50,
            semanticUnderstanding: 'sky'
        }).then(selectionMask => {
            state.selection.mask = selectionMask;
            state.selection.active = true;
            state.selection.type = 'ai-sky';
            compositeAllLayers();
        });
    }
}

/**
 * Color Range Selection
 * Select by color with fuzziness control
 */
function colorRangeSelection(color, fuzziness = 40, localized = false, skinTone = false) {
    if (!state.activeLayer) return;
    
    const ctx = state.activeLayer.canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, state.canvas.width, state.canvas.height);
    const pixels = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    const selectionMask = new Uint8Array(width * height);
    
    // Parse target color (only if not in skinTone mode)
    const targetRGB = skinTone ? null : hexToRgb(color);
    
    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        
        let selected = false;
        
        if (skinTone) {
            // Skin tone detection
            selected = isSkinTone(r, g, b);
        } else if (targetRGB) {
            // Color distance calculation
            const distance = Math.sqrt(
                Math.pow(r - targetRGB.r, 2) +
                Math.pow(g - targetRGB.g, 2) +
                Math.pow(b - targetRGB.b, 2)
            );
            
            selected = distance <= fuzziness;
        }
        
        if (selected) {
            const pixelIndex = i / 4;
            selectionMask[pixelIndex] = 255;
        }
    }
    
    state.selection.mask = selectionMask;
    state.selection.active = true;
    state.selection.type = 'color-range';
    state.selection.colorRange.enabled = true;
    state.selection.colorRange.fuzziness = fuzziness;
    compositeAllLayers();
}

function isSkinTone(r, g, b) {
    // Simple skin tone detection algorithm
    // R > 95 AND G > 40 AND B > 20 AND
    // max(R,G,B) - min(R,G,B) > 15 AND
    // |R-G| > 15 AND R > G AND R > B
    return r > 95 && g > 40 && b > 20 &&
           (Math.max(r, g, b) - Math.min(r, g, b)) > 15 &&
           Math.abs(r - g) > 15 && r > g && r > b;
}

/**
 * Focus Area Selection
 * Select in-focus regions using edge detection
 */
function focusAreaSelection(focusRange = 50, blurDetection = true) {
    if (!state.activeLayer) return;
    
    const ctx = state.activeLayer.canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, state.canvas.width, state.canvas.height);
    const width = imageData.width;
    const height = imageData.height;
    
    // Apply edge detection to find sharp areas
    const edgeStrength = detectEdges(imageData);
    
    // Normalize and threshold
    const threshold = (100 - focusRange) / 100 * 255;
    const selectionMask = new Uint8Array(width * height);
    
    for (let i = 0; i < edgeStrength.length; i++) {
        selectionMask[i] = edgeStrength[i] > threshold ? 255 : 0;
    }
    
    // Apply smoothing
    if (blurDetection) {
        smoothSelectionMask(selectionMask, width, height, 3);
    }
    
    state.selection.mask = selectionMask;
    state.selection.active = true;
    state.selection.type = 'focus-area';
    state.selection.focusArea.enabled = true;
    state.selection.focusArea.focusRange = focusRange;
    compositeAllLayers();
}

function detectEdges(imageData) {
    const pixels = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const edgeStrength = new Uint8Array(width * height);
    
    // Sobel operator
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let gx = 0, gy = 0;
            
            // Get grayscale values
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const idx = ((y + ky) * width + (x + kx)) * 4;
                    const gray = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
                    
                    // Sobel kernels
                    const sobelX = kx;
                    const sobelY = ky;
                    
                    gx += gray * sobelX;
                    gy += gray * sobelY;
                }
            }
            
            const magnitude = Math.sqrt(gx * gx + gy * gy);
            edgeStrength[y * width + x] = Math.min(255, magnitude);
        }
    }
    
    return edgeStrength;
}

/**
 * Luminosity Mask Generator
 * Create masks based on tonal ranges
 */
function createLuminosityMask(type = 'highlights', rangeMin = 170, rangeMax = 255, feather = 10) {
    if (!state.activeLayer) return;
    
    const ctx = state.activeLayer.canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, state.canvas.width, state.canvas.height);
    const pixels = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    const selectionMask = new Uint8Array(width * height);
    
    // Set range based on type
    if (type === 'highlights') {
        rangeMin = 170;
        rangeMax = 255;
    } else if (type === 'midtones') {
        rangeMin = 85;
        rangeMax = 170;
    } else if (type === 'shadows') {
        rangeMin = 0;
        rangeMax = 85;
    }
    
    // Create mask based on luminosity
    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        
        // Calculate luminosity (perceived brightness)
        const luminosity = 0.299 * r + 0.587 * g + 0.114 * b;
        
        const pixelIndex = i / 4;
        if (luminosity >= rangeMin && luminosity <= rangeMax) {
            // Gradient falloff at edges
            let strength = 255;
            if (luminosity < rangeMin + feather) {
                strength = ((luminosity - rangeMin) / feather) * 255;
            } else if (luminosity > rangeMax - feather) {
                strength = ((rangeMax - luminosity) / feather) * 255;
            }
            selectionMask[pixelIndex] = Math.max(0, Math.min(255, strength));
        }
    }
    
    state.selection.mask = selectionMask;
    state.selection.active = true;
    state.selection.type = 'luminosity';
    state.selection.luminosityMask.enabled = true;
    state.selection.luminosityMask.type = type;
    state.selection.luminosityMask.rangeMin = rangeMin;
    state.selection.luminosityMask.rangeMax = rangeMax;
    compositeAllLayers();
}

/**
 * Channel-Based Selection
 * Select using individual color channels
 */
function channelBasedSelection(channel = 'r', operation = 'load') {
    if (!state.activeLayer) return;
    
    const ctx = state.activeLayer.canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, state.canvas.width, state.canvas.height);
    const pixels = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    const channelMask = new Uint8Array(width * height);
    
    // Extract channel
    for (let i = 0; i < pixels.length; i += 4) {
        const pixelIndex = i / 4;
        
        if (channel === 'r') {
            channelMask[pixelIndex] = pixels[i];
        } else if (channel === 'g') {
            channelMask[pixelIndex] = pixels[i + 1];
        } else if (channel === 'b') {
            channelMask[pixelIndex] = pixels[i + 2];
        } else if (channel === 'alpha') {
            channelMask[pixelIndex] = pixels[i + 3];
        } else if (channel === 'rgb') {
            // Luminosity
            const lum = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
            channelMask[pixelIndex] = lum;
        }
    }
    
    // Apply operation
    if (operation === 'load' || !state.selection.mask) {
        state.selection.mask = channelMask;
    } else {
        applySelectionAlgebra(channelMask, operation);
    }
    
    state.selection.active = true;
    state.selection.type = 'channel';
    state.selection.channelSelection.enabled = true;
    state.selection.channelSelection.channel = channel;
    compositeAllLayers();
}

// ==================== Selection Refinement ====================

/**
 * Select and Mask Workspace
 * Dedicated interface for refining selections
 */
function openSelectAndMaskWorkspace() {
    if (!state.selection.active && !state.selection.mask) {
        alert('Please make a selection first.');
        return;
    }
    
    state.selection.selectAndMask.active = true;
    
    // Create workspace UI (simplified version)
    showSelectAndMaskPanel();
}

function showSelectAndMaskPanel() {
    // Create a modal panel for Select and Mask
    const panel = document.createElement('div');
    panel.id = 'select-mask-workspace';
    panel.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(30, 30, 30, 0.95);
        border: 2px solid #444;
        border-radius: 8px;
        padding: 20px;
        z-index: 10000;
        min-width: 400px;
    `;
    
    panel.innerHTML = `
        <h3 style="color: #ffd700; margin-bottom: 15px;">Select and Mask Workspace</h3>
        
        <div style="margin-bottom: 15px;">
            <label style="color: #fff;">View Mode:</label>
            <select id="sam-view-mode" style="width: 100%; padding: 5px; margin-top: 5px;">
                <option value="onBlack">On Black</option>
                <option value="onWhite">On White</option>
                <option value="onLayers">On Layers</option>
                <option value="marching">Marching Ants</option>
                <option value="overlay">Overlay</option>
            </select>
        </div>
        
        <div style="margin-bottom: 15px;">
            <label style="color: #fff;">Refine Edge Radius: <span id="sam-radius-value">10</span>px</label>
            <input type="range" id="sam-refine-radius" min="1" max="50" value="10" style="width: 100%;">
        </div>
        
        <div style="margin-bottom: 15px;">
            <label style="color: #fff;">Smooth: <span id="sam-smooth-value">5</span></label>
            <input type="range" id="sam-smoothness" min="0" max="20" value="5" style="width: 100%;">
        </div>
        
        <div style="margin-bottom: 15px;">
            <label style="color: #fff;">Feather: <span id="sam-feather-value">1</span>px</label>
            <input type="range" id="sam-feather" min="0" max="50" value="1" style="width: 100%;">
        </div>
        
        <div style="margin-bottom: 15px;">
            <label style="color: #fff;">Contrast: <span id="sam-contrast-value">0</span>%</label>
            <input type="range" id="sam-contrast" min="-100" max="100" value="0" style="width: 100%;">
        </div>
        
        <div style="margin-bottom: 15px;">
            <label style="color: #fff;">Shift Edge: <span id="sam-shift-value">0</span>px</label>
            <input type="range" id="sam-shift-edge" min="-100" max="100" value="0" style="width: 100%;">
        </div>
        
        <div style="margin-bottom: 15px;">
            <label style="color: #fff;">
                <input type="checkbox" id="sam-decontaminate"> Decontaminate Colors
            </label>
        </div>
        
        <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button id="sam-apply" style="flex: 1; padding: 10px; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer;">Apply</button>
            <button id="sam-cancel" style="flex: 1; padding: 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
        </div>
    `;
    
    document.body.appendChild(panel);
    
    // Add event listeners
    document.getElementById('sam-refine-radius').addEventListener('input', (e) => {
        document.getElementById('sam-radius-value').textContent = e.target.value;
        state.selection.selectAndMask.refineRadius = parseInt(e.target.value);
        applySelectAndMaskRefinement();
    });
    
    document.getElementById('sam-smoothness').addEventListener('input', (e) => {
        document.getElementById('sam-smooth-value').textContent = e.target.value;
        state.selection.selectAndMask.smoothness = parseInt(e.target.value);
        applySelectAndMaskRefinement();
    });
    
    document.getElementById('sam-feather').addEventListener('input', (e) => {
        document.getElementById('sam-feather-value').textContent = e.target.value;
        state.selection.selectAndMask.feather = parseInt(e.target.value);
        applySelectAndMaskRefinement();
    });
    
    document.getElementById('sam-contrast').addEventListener('input', (e) => {
        document.getElementById('sam-contrast-value').textContent = e.target.value;
        state.selection.selectAndMask.contrast = parseInt(e.target.value);
        applySelectAndMaskRefinement();
    });
    
    document.getElementById('sam-shift-edge').addEventListener('input', (e) => {
        document.getElementById('sam-shift-value').textContent = e.target.value;
        state.selection.selectAndMask.shiftEdge = parseInt(e.target.value);
        applySelectAndMaskRefinement();
    });
    
    document.getElementById('sam-view-mode').addEventListener('change', (e) => {
        state.selection.selectAndMask.viewMode = e.target.value;
        compositeAllLayers();
    });
    
    document.getElementById('sam-decontaminate').addEventListener('change', (e) => {
        state.selection.selectAndMask.decontaminate = e.target.checked;
        applySelectAndMaskRefinement();
    });
    
    document.getElementById('sam-apply').addEventListener('click', () => {
        state.selection.selectAndMask.active = false;
        document.getElementById('select-mask-workspace').remove();
    });
    
    document.getElementById('sam-cancel').addEventListener('click', () => {
        state.selection.selectAndMask.active = false;
        document.getElementById('select-mask-workspace').remove();
    });
}

function applySelectAndMaskRefinement() {
    if (!state.selection.mask) return;
    
    const width = state.canvas.width;
    const height = state.canvas.height;
    let mask = new Uint8Array(state.selection.mask);
    
    // Apply smoothness
    if (state.selection.selectAndMask.smoothness > 0) {
        mask = smoothSelectionMask(mask, width, height, state.selection.selectAndMask.smoothness);
    }
    
    // Apply feather using grayscale-aware function
    if (state.selection.selectAndMask.feather > 0) {
        mask = applyGrayscaleFeathering(mask, width, height, state.selection.selectAndMask.feather);
    }
    
    // Apply contrast
    if (state.selection.selectAndMask.contrast !== 0) {
        const factor = (259 * (state.selection.selectAndMask.contrast + 255)) / (255 * (259 - state.selection.selectAndMask.contrast));
        for (let i = 0; i < mask.length; i++) {
            mask[i] = Math.max(0, Math.min(255, factor * (mask[i] - 128) + 128));
        }
    }
    
    // Apply shift edge
    if (state.selection.selectAndMask.shiftEdge !== 0) {
        mask = shiftSelectionEdge(mask, width, height, state.selection.selectAndMask.shiftEdge);
    }
    
    state.selection.mask = mask;
    compositeAllLayers();
}

/**
 * Edge Detection Refinement
 */
function refineSelectionEdges(softEdge = true, featherRadius = 5) {
    if (!state.selection.mask) return;
    
    const width = state.canvas.width;
    const height = state.canvas.height;
    let mask = state.selection.mask;
    
    if (softEdge) {
        // Apply edge smoothing
        mask = smoothSelectionMask(mask, width, height, 2);
    }
    
    // Apply feathering using grayscale-aware function
    if (featherRadius > 0) {
        mask = applyGrayscaleFeathering(mask, width, height, featherRadius);
    }
    
    state.selection.mask = mask;
    compositeAllLayers();
}

/**
 * Hair/Fur Selection Tools
 */
function refineHairSelection(radius = 10) {
    if (!state.selection.mask) return;
    
    const width = state.canvas.width;
    const height = state.canvas.height;
    const mask = state.selection.mask;
    
    // Find edges of selection
    const edges = findSelectionEdges(mask, width, height);
    
    // Refine edges using fine detail detection
    const ctx = state.activeLayer.canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, width, height);
    
    for (const edge of edges) {
        refineEdgePoint(edge, imageData, mask, width, height, radius);
    }
    
    state.selection.mask = mask;
    compositeAllLayers();
}

function findSelectionEdges(mask, width, height) {
    const edges = [];
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            
            if (mask[idx] > 0) {
                // Check if this is an edge pixel
                const neighbors = [
                    mask[idx - 1], mask[idx + 1],
                    mask[idx - width], mask[idx + width]
                ];
                
                if (neighbors.some(n => n === 0)) {
                    edges.push({ x, y, idx });
                }
            }
        }
    }
    
    return edges;
}

function refineEdgePoint(edge, imageData, mask, width, height, radius) {
    const pixels = imageData.data;
    
    // Sample pixels around edge point
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            const x = edge.x + dx;
            const y = edge.y + dy;
            
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            
            const idx = y * width + x;
            const pixIdx = idx * 4;
            
            // Check for fine details (high frequency changes)
            const gradient = calculateLocalGradient(pixels, x, y, width, height);
            
            if (gradient > 50) {
                // Likely a hair/fur strand
                mask[idx] = Math.max(mask[idx], 200);
            }
        }
    }
}

function calculateLocalGradient(pixels, x, y, width, height) {
    if (x < 1 || x >= width - 1 || y < 1 || y >= height - 1) return 0;
    
    const getGray = (px, py) => {
        const idx = (py * width + px) * 4;
        return (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
    };
    
    const center = getGray(x, y);
    const left = getGray(x - 1, y);
    const right = getGray(x + 1, y);
    const top = getGray(x, y - 1);
    const bottom = getGray(x, y + 1);
    
    const gx = Math.abs(right - left);
    const gy = Math.abs(bottom - top);
    
    return Math.sqrt(gx * gx + gy * gy);
}

/**
 * Selection Algebra
 * Combine selections using boolean operations
 */
function applySelectionAlgebra(newMask, operation = 'add') {
    if (!state.selection.mask) {
        state.selection.mask = newMask;
        return;
    }
    
    const mask = state.selection.mask;
    const length = Math.min(mask.length, newMask.length);
    
    for (let i = 0; i < length; i++) {
        switch (operation) {
            case 'add':
            case 'union':
                mask[i] = Math.max(mask[i], newMask[i]);
                break;
            case 'subtract':
                mask[i] = Math.max(0, mask[i] - newMask[i]);
                break;
            case 'intersect':
                mask[i] = Math.min(mask[i], newMask[i]);
                break;
            case 'xor':
                mask[i] = mask[i] > 0 && newMask[i] > 0 ? 0 : Math.max(mask[i], newMask[i]);
                break;
            case 'replace':
            default:
                mask[i] = newMask[i];
                break;
        }
    }
    
    state.selection.algebra = operation;
}

/**
 * Selection Transform
 * Move, rotate, scale, perspective transform selection
 */
function transformSelection(mode = 'move') {
    if (!state.selection.active && !state.selection.mask) return;
    
    state.selection.transformSelection.enabled = true;
    state.selection.transformSelection.mode = mode;
    
    // Enable transform mode for selection
    alert(`Selection Transform: ${mode} mode activated. Click and drag to transform the selection.`);
}

function applySelectionTransform(dx, dy, angle = 0, scaleX = 1, scaleY = 1) {
    if (!state.selection.mask) return;
    
    const width = state.canvas.width;
    const height = state.canvas.height;
    const oldMask = state.selection.mask;
    const newMask = new Uint8Array(width * height);
    
    const centerX = width / 2;
    const centerY = height / 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // Apply inverse transform
            let tx = x - dx - centerX;
            let ty = y - dy - centerY;
            
            // Rotate
            const rx = tx * cosA + ty * sinA;
            const ry = -tx * sinA + ty * cosA;
            
            // Scale
            const sx = rx / scaleX;
            const sy = ry / scaleY;
            
            // Back to image space
            const sourceX = Math.round(sx + centerX);
            const sourceY = Math.round(sy + centerY);
            
            if (sourceX >= 0 && sourceX < width && sourceY >= 0 && sourceY < height) {
                newMask[y * width + x] = oldMask[sourceY * width + sourceX];
            }
        }
    }
    
    state.selection.mask = newMask;
    compositeAllLayers();
}

// ==================== Masking Features ====================

/**
 * Vector Masks
 * Resolution-independent bezier path masks
 */
function createVectorMask(paths) {
    if (!state.activeLayer) return;
    
    state.activeLayer.vectorMask = {
        paths: paths,
        type: 'vector',
        editable: true
    };
    
    // Rasterize vector mask for rendering
    rasterizeVectorMask();
    compositeAllLayers();
}

function rasterizeVectorMask() {
    if (!state.activeLayer || !state.activeLayer.vectorMask) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = state.canvas.width;
    canvas.height = state.canvas.height;
    const ctx = canvas.getContext('2d');
    
    // Draw vector paths
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    state.activeLayer.vectorMask.paths.forEach(path => {
        ctx.beginPath();
        path.points.forEach((point, i) => {
            if (i === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                if (point.handleIn) {
                    ctx.bezierCurveTo(
                        path.points[i - 1].handleOut.x, path.points[i - 1].handleOut.y,
                        point.handleIn.x, point.handleIn.y,
                        point.x, point.y
                    );
                } else {
                    ctx.lineTo(point.x, point.y);
                }
            }
        });
        ctx.closePath();
        ctx.fillStyle = 'black';
        ctx.fill();
    });
    
    state.activeLayer.mask = canvas;
    state.activeLayer.maskEnabled = true;
    state.activeLayer.maskProperties.type = 'vector';
}

/**
 * Gradient Masks
 * Smooth gradient transitions for masks
 */
function createGradientMask(type = 'linear', startX, startY, endX, endY, stops = null) {
    if (!state.activeLayer) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = state.canvas.width;
    canvas.height = state.canvas.height;
    const ctx = canvas.getContext('2d');
    
    let gradient;
    if (type === 'linear') {
        gradient = ctx.createLinearGradient(startX, startY, endX, endY);
    } else if (type === 'radial') {
        const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        gradient = ctx.createRadialGradient(startX, startY, 0, startX, startY, radius);
    }
    
    // Add color stops
    if (stops) {
        stops.forEach(stop => {
            gradient.addColorStop(stop.position, stop.color);
        });
    } else {
        gradient.addColorStop(0, 'white');
        gradient.addColorStop(1, 'black');
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    state.activeLayer.gradientMask = {
        type: type,
        startX: startX,
        startY: startY,
        endX: endX,
        endY: endY,
        stops: stops
    };
    state.activeLayer.mask = canvas;
    state.activeLayer.maskEnabled = true;
    state.activeLayer.maskProperties.type = 'gradient';
    compositeAllLayers();
}

/**
 * Layer Mask Properties
 * Advanced mask control
 */
function setMaskDensity(density) {
    if (!state.activeLayer || !state.activeLayer.mask) return;
    
    state.activeLayer.maskProperties.density = Math.max(0, Math.min(100, density));
    compositeAllLayers();
}

function setMaskFeather(feather) {
    if (!state.activeLayer || !state.activeLayer.mask) return;
    
    state.activeLayer.maskProperties.feather = Math.max(0, Math.min(250, feather));
    
    // Re-apply mask with feathering
    applyMaskFeathering();
    compositeAllLayers();
}

function invertMask() {
    if (!state.activeLayer || !state.activeLayer.mask) return;
    
    state.activeLayer.maskProperties.invert = !state.activeLayer.maskProperties.invert;
    compositeAllLayers();
}

function applyMaskFeathering() {
    if (!state.activeLayer || !state.activeLayer.mask) return;
    
    const feather = state.activeLayer.maskProperties.feather;
    if (feather === 0) return;
    
    const ctx = state.activeLayer.mask.getContext('2d');
    const imageData = ctx.getImageData(0, 0, state.activeLayer.mask.width, state.activeLayer.mask.height);
    const pixels = imageData.data;
    
    // Apply gaussian blur for feathering
    const blurred = gaussianBlur(pixels, state.activeLayer.mask.width, state.activeLayer.mask.height, feather / 3);
    
    for (let i = 0; i < pixels.length; i++) {
        pixels[i] = blurred[i];
    }
    
    ctx.putImageData(imageData, 0, 0);
}

function gaussianBlur(pixels, width, height, radius) {
    const result = new Uint8ClampedArray(pixels.length);
    const kernel = createGaussianKernel(radius);
    const size = kernel.length;
    const half = Math.floor(size / 2);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            for (let c = 0; c < 4; c++) {
                let sum = 0;
                let weightSum = 0;
                
                for (let ky = 0; ky < size; ky++) {
                    for (let kx = 0; kx < size; kx++) {
                        const px = x + kx - half;
                        const py = y + ky - half;
                        
                        if (px >= 0 && px < width && py >= 0 && py < height) {
                            const weight = kernel[ky][kx];
                            sum += pixels[(py * width + px) * 4 + c] * weight;
                            weightSum += weight;
                        }
                    }
                }
                
                result[(y * width + x) * 4 + c] = sum / weightSum;
            }
        }
    }
    
    return result;
}

function createGaussianKernel(radius) {
    const size = Math.ceil(radius) * 2 + 1;
    const kernel = [];
    const sigma = radius / 3;
    const s2 = 2 * sigma * sigma;
    const sqrtPiS2 = Math.sqrt(Math.PI * s2);
    const center = Math.floor(size / 2);
    
    for (let y = 0; y < size; y++) {
        kernel[y] = [];
        for (let x = 0; x < size; x++) {
            const dx = x - center;
            const dy = y - center;
            const d2 = dx * dx + dy * dy;
            kernel[y][x] = Math.exp(-d2 / s2) / sqrtPiS2;
        }
    }
    
    return kernel;
}

// ==================== Helper Functions ====================

function smoothSelectionMask(mask, width, height, iterations = 1) {
    let result = new Uint8Array(mask);
    
    for (let iter = 0; iter < iterations; iter++) {
        const temp = new Uint8Array(result);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                
                // 3x3 averaging
                const sum = temp[idx - width - 1] + temp[idx - width] + temp[idx - width + 1] +
                            temp[idx - 1] + temp[idx] + temp[idx + 1] +
                            temp[idx + width - 1] + temp[idx + width] + temp[idx + width + 1];
                
                result[idx] = sum / 9;
            }
        }
    }
    
    return result;
}

function applyGrayscaleFeathering(mask, width, height, radius) {
    if (radius <= 0) return mask;
    
    const result = new Uint8Array(mask.length);
    const originalMask = new Uint8Array(mask);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            
            // Calculate weighted average of surrounding pixels
            let sum = 0;
            let weightSum = 0;
            
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance <= radius) {
                            // Gaussian-like weight based on distance
                            const weight = 1.0 - (distance / radius);
                            sum += originalMask[ny * width + nx] * weight;
                            weightSum += weight;
                        }
                    }
                }
            }
            
            // Weighted average maintains grayscale values
            result[idx] = weightSum > 0 ? Math.round(sum / weightSum) : 0;
        }
    }
    
    return result;
}

function shiftSelectionEdge(mask, width, height, pixels) {
    if (pixels === 0) return mask;
    
    // Use array swapping to avoid unnecessary allocations
    let current = new Uint8Array(mask);
    let next = new Uint8Array(mask.length);
    
    if (pixels > 0) {
        // Dilate (expand)
        for (let iter = 0; iter < pixels; iter++) {
            next.fill(0);
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = y * width + x;
                    if (current[idx] > 0) {
                        // Set neighbors
                        if (x > 0) next[idx - 1] = 255;
                        if (x < width - 1) next[idx + 1] = 255;
                        if (y > 0) next[idx - width] = 255;
                        if (y < height - 1) next[idx + width] = 255;
                        next[idx] = 255;
                    }
                }
            }
            // Swap arrays
            [current, next] = [next, current];
        }
    } else {
        // Erode (contract)
        for (let iter = 0; iter < Math.abs(pixels); iter++) {
            next.fill(0);
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = y * width + x;
                    if (current[idx] > 0) {
                        // Check if all neighbors are selected
                        const allSelected = 
                            (x === 0 || current[idx - 1] > 0) &&
                            (x === width - 1 || current[idx + 1] > 0) &&
                            (y === 0 || current[idx - width] > 0) &&
                            (y === height - 1 || current[idx + width] > 0);
                        
                        next[idx] = allSelected ? 255 : 0;
                    }
                }
            }
            // Swap arrays
            [current, next] = [next, current];
        }
    }
    
    return current;
}

// Note: hexToRgb() function already exists at line 5665, no need to duplicate

// ==================================================================
// END CATEGORY 4: SELECTION & MASKING TOOLS
// ==================================================================

// ==================================================================
// CATEGORY 5: LAYER MANAGEMENT & COMPOSITING
// ==================================================================

// 1. ADVANCED LAYER TYPES

// Smart Objects - Enhanced implementation
function enhanceSmartObjectLayer(layer) {
    if (!layer) return;
    
    // Store original layer data
    const originalCanvas = document.createElement('canvas');
    originalCanvas.width = layer.canvas.width;
    originalCanvas.height = layer.canvas.height;
    const ctx = originalCanvas.getContext('2d');
    ctx.drawImage(layer.canvas, 0, 0);
    
    layer.smartObject = {
        originalCanvas: originalCanvas,
        originalWidth: originalCanvas.width,
        originalHeight: originalCanvas.height,
        transformHistory: [],
        filters: [],
        linkedLayers: [] // For linked smart objects
    };
    layer.isSmartObject = true;
    
    updateLayersList();
    showNotification('✅ Layer converted to Smart Object', 'success');
}

function updateLinkedSmartObjects(sourceLayer) {
    if (!sourceLayer.smartObject || !sourceLayer.smartObject.linkedLayers) return;
    
    sourceLayer.smartObject.linkedLayers.forEach(linkedId => {
        const linkedLayer = state.layers.find(l => l.id === linkedId);
        if (linkedLayer && linkedLayer.smartObject) {
            // Copy source canvas to linked layer
            linkedLayer.canvas.width = sourceLayer.canvas.width;
            linkedLayer.canvas.height = sourceLayer.canvas.height;
            const ctx = linkedLayer.canvas.getContext('2d');
            ctx.clearRect(0, 0, linkedLayer.canvas.width, linkedLayer.canvas.height);
            ctx.drawImage(sourceLayer.canvas, 0, 0);
        }
    });
    
    compositeAllLayers();
}

// Linked Layers - Synchronized layer editing
function linkLayers(layerIds) {
    if (!layerIds || layerIds.length < 2) {
        showNotification('⚠️ Select at least 2 layers to link', 'warning');
        return;
    }
    
    const layers = layerIds.map(id => state.layers.find(l => l.id === id)).filter(Boolean);
    if (layers.length < 2) return;
    
    // Create linked group ID
    const linkGroupId = Date.now();
    
    layers.forEach(layer => {
        if (!layer.linkedTo) {
            layer.linkedTo = linkGroupId;
            layer.linkedLayers = layerIds.filter(id => id !== layer.id);
        }
    });
    
    updateLayersList();
    showNotification(`✅ Linked ${layers.length} layers`, 'success');
}

function unlinkLayer(layer) {
    if (!layer || !layer.linkedTo) return;
    
    const linkGroupId = layer.linkedTo;
    const linkedLayers = state.layers.filter(l => l.linkedTo === linkGroupId);
    
    linkedLayers.forEach(l => {
        delete l.linkedTo;
        delete l.linkedLayers;
    });
    
    updateLayersList();
    showNotification('✅ Layers unlinked', 'success');
}

// Fill Layers - Procedural fill layers
function createFillLayer(fillType, fillData) {
    const canvas = document.createElement('canvas');
    canvas.width = state.canvas.width;
    canvas.height = state.canvas.height;
    const ctx = canvas.getContext('2d');
    
    const layer = {
        id: Date.now(),
        name: `${fillType} Fill`,
        canvas: canvas,
        visible: true,
        opacity: 1,
        type: 'fill',
        blendMode: 'normal',
        fillType: fillType, // 'solid', 'gradient', 'pattern'
        fillData: fillData,
        maskProperties: {
            density: 100,
            feather: 0,
            invert: false,
            type: 'raster'
        },
        layerStyles: {
            enabled: false,
            dropShadow: { enabled: false, offsetX: 5, offsetY: 5, blur: 10, color: '#000000', opacity: 0.5 },
            outerGlow: { enabled: false, size: 10, color: '#ffffff', opacity: 0.5 },
            stroke: { enabled: false, size: 2, color: '#000000', position: 'outside' },
            bevelEmboss: { enabled: false, size: 5, depth: 50, angle: 135, highlight: 75, shadow: 75 }
        }
    };
    
    // Apply fill
    applyFillToLayer(layer);
    
    state.layers.push(layer);
    state.activeLayer = layer;
    updateLayersList();
    compositeAllLayers();
    
    return layer;
}

function applyFillToLayer(layer) {
    if (!layer || layer.type !== 'fill') return;
    
    const ctx = layer.canvas.getContext('2d');
    ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    
    switch (layer.fillType) {
        case 'solid':
            ctx.fillStyle = layer.fillData.color || '#ffffff';
            ctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);
            break;
            
        case 'gradient':
            const gd = layer.fillData;
            let gradient;
            if (gd.type === 'linear') {
                gradient = ctx.createLinearGradient(
                    gd.x0 || 0, gd.y0 || 0,
                    gd.x1 || layer.canvas.width, gd.y1 || layer.canvas.height
                );
            } else if (gd.type === 'radial') {
                const cx = gd.cx || layer.canvas.width / 2;
                const cy = gd.cy || layer.canvas.height / 2;
                const r = gd.radius || Math.max(layer.canvas.width, layer.canvas.height) / 2;
                gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            }
            
            if (gradient && gd.stops) {
                gd.stops.forEach(stop => {
                    gradient.addColorStop(stop.position, stop.color);
                });
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);
            }
            break;
            
        case 'pattern':
            if (layer.fillData.patternCanvas) {
                const pattern = ctx.createPattern(layer.fillData.patternCanvas, 'repeat');
                if (pattern) {
                    ctx.fillStyle = pattern;
                    ctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);
                }
            }
            break;
    }
}

// Shape Layers - Vector shape layers
function createShapeLayer(shapeType, shapeData) {
    const canvas = document.createElement('canvas');
    canvas.width = state.canvas.width;
    canvas.height = state.canvas.height;
    
    const layer = {
        id: Date.now(),
        name: `${shapeType} Shape`,
        canvas: canvas,
        visible: true,
        opacity: 1,
        type: 'shape',
        blendMode: 'normal',
        shapeType: shapeType, // 'rectangle', 'ellipse', 'polygon', 'custom'
        shapeData: shapeData,
        fillColor: shapeData.fillColor || '#000000',
        strokeColor: shapeData.strokeColor || '#000000',
        strokeWidth: shapeData.strokeWidth || 0,
        maskProperties: {
            density: 100,
            feather: 0,
            invert: false,
            type: 'raster'
        },
        layerStyles: {
            enabled: false,
            dropShadow: { enabled: false, offsetX: 5, offsetY: 5, blur: 10, color: '#000000', opacity: 0.5 },
            outerGlow: { enabled: false, size: 10, color: '#ffffff', opacity: 0.5 },
            stroke: { enabled: false, size: 2, color: '#000000', position: 'outside' },
            bevelEmboss: { enabled: false, size: 5, depth: 50, angle: 135, highlight: 75, shadow: 75 }
        }
    };
    
    // Render shape
    renderShapeLayer(layer);
    
    state.layers.push(layer);
    state.activeLayer = layer;
    updateLayersList();
    compositeAllLayers();
    
    return layer;
}

function renderShapeLayer(layer) {
    if (!layer || layer.type !== 'shape') return;
    
    const ctx = layer.canvas.getContext('2d');
    ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    
    ctx.fillStyle = layer.fillColor;
    ctx.strokeStyle = layer.strokeColor;
    ctx.lineWidth = layer.strokeWidth;
    
    const sd = layer.shapeData;
    
    switch (layer.shapeType) {
        case 'rectangle':
            if (sd.fillColor) {
                ctx.fillRect(sd.x, sd.y, sd.width, sd.height);
            }
            if (sd.strokeWidth > 0) {
                ctx.strokeRect(sd.x, sd.y, sd.width, sd.height);
            }
            break;
            
        case 'ellipse':
            ctx.beginPath();
            ctx.ellipse(sd.cx, sd.cy, sd.rx, sd.ry, 0, 0, Math.PI * 2);
            if (sd.fillColor) ctx.fill();
            if (sd.strokeWidth > 0) ctx.stroke();
            break;
            
        case 'polygon':
            if (sd.points && sd.points.length > 2) {
                ctx.beginPath();
                ctx.moveTo(sd.points[0].x, sd.points[0].y);
                for (let i = 1; i < sd.points.length; i++) {
                    ctx.lineTo(sd.points[i].x, sd.points[i].y);
                }
                ctx.closePath();
                if (sd.fillColor) ctx.fill();
                if (sd.strokeWidth > 0) ctx.stroke();
            }
            break;
    }
}

// Parametric Layers - Formula-based layers
function createParametricLayer(formula, parameters) {
    const canvas = document.createElement('canvas');
    canvas.width = state.canvas.width;
    canvas.height = state.canvas.height;
    
    const layer = {
        id: Date.now(),
        name: 'Parametric Layer',
        canvas: canvas,
        visible: true,
        opacity: 1,
        type: 'parametric',
        blendMode: 'normal',
        formula: formula,
        parameters: parameters || {},
        maskProperties: {
            density: 100,
            feather: 0,
            invert: false,
            type: 'raster'
        },
        layerStyles: {
            enabled: false,
            dropShadow: { enabled: false, offsetX: 5, offsetY: 5, blur: 10, color: '#000000', opacity: 0.5 },
            outerGlow: { enabled: false, size: 10, color: '#ffffff', opacity: 0.5 },
            stroke: { enabled: false, size: 2, color: '#000000', position: 'outside' },
            bevelEmboss: { enabled: false, size: 5, depth: 50, angle: 135, highlight: 75, shadow: 75 }
        }
    };
    
    // Render parametric layer
    renderParametricLayer(layer);
    
    state.layers.push(layer);
    state.activeLayer = layer;
    updateLayersList();
    compositeAllLayers();
    
    return layer;
}

function renderParametricLayer(layer) {
    if (!layer || layer.type !== 'parametric') return;
    
    const ctx = layer.canvas.getContext('2d');
    const imageData = ctx.createImageData(layer.canvas.width, layer.canvas.height);
    const data = imageData.data;
    
    try {
        // Safe evaluation of formula
        const params = layer.parameters;
        const w = layer.canvas.width;
        const h = layer.canvas.height;
        
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = (y * w + x) * 4;
                
                // Normalized coordinates
                const nx = x / w;
                const ny = y / h;
                
                // Evaluate formula
                let result;
                if (layer.formula === 'noise') {
                    result = Math.random() * 255;
                } else if (layer.formula === 'gradient') {
                    result = nx * 255;
                } else if (layer.formula === 'radial') {
                    const dx = nx - 0.5;
                    const dy = ny - 0.5;
                    result = (1 - Math.sqrt(dx * dx + dy * dy) * 2) * 255;
                } else if (layer.formula === 'checkerboard') {
                    const size = params.size || 32;
                    const cx = Math.floor(x / size);
                    const cy = Math.floor(y / size);
                    result = ((cx + cy) % 2 === 0) ? 255 : 0;
                } else {
                    result = 0;
                }
                
                result = Math.max(0, Math.min(255, result));
                data[i] = result;
                data[i + 1] = result;
                data[i + 2] = result;
                data[i + 3] = 255;
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    } catch (error) {
        console.error('Error rendering parametric layer:', error);
    }
}

// 2. LAYER ORGANIZATION

// Layer Search & Filter
const layerFilters = {
    searchText: '',
    filterType: 'all', // 'all', 'paint', 'vector', 'shape', 'fill', 'adjustment', 'group'
    filterEffect: '',
    filterColorLabel: ''
};

function filterLayers() {
    const filtered = state.layers.filter(layer => {
        // Search by name
        if (layerFilters.searchText) {
            if (!layer.name.toLowerCase().includes(layerFilters.searchText.toLowerCase())) {
                return false;
            }
        }
        
        // Filter by type
        if (layerFilters.filterType !== 'all') {
            if (layer.type !== layerFilters.filterType) {
                return false;
            }
        }
        
        // Filter by effect
        if (layerFilters.filterEffect) {
            if (!layer.layerStyles || !layer.layerStyles.enabled) {
                return false;
            }
        }
        
        // Filter by color label
        if (layerFilters.filterColorLabel) {
            if (layer.colorLabel !== layerFilters.filterColorLabel) {
                return false;
            }
        }
        
        return true;
    });
    
    return filtered;
}

// Layer Color Labels
const colorLabels = {
    'red': '#ff5555',
    'orange': '#ffaa55',
    'yellow': '#ffff55',
    'green': '#55ff55',
    'cyan': '#55ffff',
    'blue': '#5555ff',
    'purple': '#aa55ff',
    'pink': '#ff55ff'
};

function setLayerColorLabel(layer, color) {
    if (!layer) return;
    layer.colorLabel = color;
    updateLayersList();
}

// Layer Locking Options
function setLayerLock(layer, lockType, locked) {
    if (!layer) return;
    
    if (!layer.locks) {
        layer.locks = {
            position: false,
            transparency: false,
            pixels: false,
            all: false
        };
    }
    
    layer.locks[lockType] = locked;
    
    if (lockType === 'all') {
        layer.locks.position = locked;
        layer.locks.transparency = locked;
        layer.locks.pixels = locked;
    }
    
    updateLayersList();
}

function isLayerLocked(layer, action) {
    if (!layer || !layer.locks) return false;
    
    if (layer.locks.all) return true;
    
    switch (action) {
        case 'move':
        case 'transform':
            return layer.locks.position;
        case 'paint':
        case 'edit':
            return layer.locks.pixels;
        case 'opacity':
        case 'blend':
            return layer.locks.transparency;
        default:
            return false;
    }
}

// Layer Nesting (already supported via group layers, enhance it)
function createLayerGroup(name, selectedLayers) {
    const groupLayer = {
        id: Date.now(),
        name: name || 'Group',
        canvas: null,
        visible: true,
        opacity: 1,
        type: 'group',
        blendMode: 'normal',
        children: [],
        expanded: true
    };
    
    if (selectedLayers && selectedLayers.length > 0) {
        selectedLayers.forEach(layer => {
            const index = state.layers.indexOf(layer);
            if (index !== -1) {
                state.layers.splice(index, 1);
                groupLayer.children.push(layer);
            }
        });
    }
    
    state.layers.push(groupLayer);
    state.activeLayer = groupLayer;
    updateLayersList();
    compositeAllLayers();
    
    return groupLayer;
}

function ungroupLayers(groupLayer) {
    if (!groupLayer || groupLayer.type !== 'group') return;
    
    const index = state.layers.indexOf(groupLayer);
    if (index === -1) return;
    
    // Insert children at group position
    state.layers.splice(index, 1);
    groupLayer.children.reverse().forEach(child => {
        state.layers.splice(index, 0, child);
    });
    
    updateLayersList();
    compositeAllLayers();
}

// Layer Comps - Save layer visibility states
const layerComps = [];

function createLayerComp(name) {
    const comp = {
        id: Date.now(),
        name: name || `Comp ${layerComps.length + 1}`,
        layerStates: state.layers.map(layer => ({
            id: layer.id,
            visible: layer.visible,
            opacity: layer.opacity,
            blendMode: layer.blendMode,
            position: { x: layer.x || 0, y: layer.y || 0 }
        }))
    };
    
    layerComps.push(comp);
    showNotification(`✅ Layer comp "${name}" created`, 'success');
    return comp;
}

function applyLayerComp(compId) {
    const comp = layerComps.find(c => c.id === compId);
    if (!comp) return;
    
    comp.layerStates.forEach(savedState => {
        const layer = state.layers.find(l => l.id === savedState.id);
        if (layer) {
            layer.visible = savedState.visible;
            layer.opacity = savedState.opacity;
            layer.blendMode = savedState.blendMode;
            if (savedState.position) {
                layer.x = savedState.position.x;
                layer.y = savedState.position.y;
            }
        }
    });
    
    updateLayersList();
    compositeAllLayers();
    showNotification(`✅ Applied layer comp "${comp.name}"`, 'success');
}

function deleteLayerComp(compId) {
    const index = layerComps.findIndex(c => c.id === compId);
    if (index !== -1) {
        layerComps.splice(index, 1);
        showNotification('✅ Layer comp deleted', 'success');
    }
}

// 3. BLEND MODE ENHANCEMENTS

// Advanced Blend Modes
const advancedBlendModes = {
    'linear-dodge': (dst, src) => {
        return Math.min(255, dst + src);
    },
    'vivid-light': (dst, src) => {
        if (src < 128) {
            return Math.max(0, 255 - (255 - dst) / (2 * src / 255));
        } else {
            return Math.min(255, dst / (2 * (255 - src) / 255));
        }
    },
    'linear-light': (dst, src) => {
        return Math.max(0, Math.min(255, dst + 2 * src - 255));
    },
    'pin-light': (dst, src) => {
        if (src < 128) {
            return Math.min(dst, 2 * src);
        } else {
            return Math.max(dst, 2 * (src - 128));
        }
    },
    'hard-mix': (dst, src) => {
        const sum = dst + src;
        return sum < 255 ? 0 : 255;
    }
};

function applyAdvancedBlendMode(dstCanvas, srcCanvas, blendMode) {
    const dstCtx = dstCanvas.getContext('2d');
    const srcCtx = srcCanvas.getContext('2d');
    
    const dstData = dstCtx.getImageData(0, 0, dstCanvas.width, dstCanvas.height);
    const srcData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
    
    const blendFunc = advancedBlendModes[blendMode];
    if (!blendFunc) return;
    
    for (let i = 0; i < dstData.data.length; i += 4) {
        const alpha = srcData.data[i + 3] / 255;
        
        for (let c = 0; c < 3; c++) {
            const dst = dstData.data[i + c];
            const src = srcData.data[i + c];
            const blended = blendFunc(dst, src);
            dstData.data[i + c] = dst * (1 - alpha) + blended * alpha;
        }
    }
    
    dstCtx.putImageData(dstData, 0, 0);
}

// Blend If - Advanced blend control
function applyBlendIf(layer, blendIfSettings) {
    if (!layer || !blendIfSettings || !blendIfSettings.enabled) return;
    
    const ctx = layer.canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
    const data = imageData.data;
    
    const channel = blendIfSettings.channel || 'gray'; // 'gray', 'red', 'green', 'blue'
    const srcMin = blendIfSettings.srcMin || 0;
    const srcMax = blendIfSettings.srcMax || 255;
    const dstMin = blendIfSettings.dstMin || 0;
    const dstMax = blendIfSettings.dstMax || 255;
    
    for (let i = 0; i < data.length; i += 4) {
        let value;
        
        if (channel === 'gray') {
            value = (data[i] + data[i + 1] + data[i + 2]) / 3;
        } else if (channel === 'red') {
            value = data[i];
        } else if (channel === 'green') {
            value = data[i + 1];
        } else if (channel === 'blue') {
            value = data[i + 2];
        }
        
        // Apply conditional blending
        if (value < srcMin || value > srcMax) {
            data[i + 3] = 0; // Make transparent
        } else if (value >= dstMin && value <= dstMax) {
            // Keep as is
        } else {
            // Fade based on distance
            const fadeOut = Math.min(
                Math.abs(value - srcMin) / 32,
                Math.abs(value - srcMax) / 32,
                1
            );
            data[i + 3] *= fadeOut;
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
}

// Knock-Out Options
function applyKnockout(layer, knockoutType) {
    if (!layer || !knockoutType) return;
    
    layer.knockout = knockoutType; // 'none', 'shallow', 'deep'
    
    // Knockout affects how layer transparency interacts with layers below
    // Implementation would be in the compositing function
    compositeAllLayers();
}

// 4. LAYER EFFECTS/STYLES ENHANCEMENTS

// Enhanced Parametric Effects
function addLayerEffect(layer, effectType, effectSettings) {
    if (!layer) return;
    
    if (!layer.layerStyles) {
        layer.layerStyles = {
            enabled: true,
            dropShadow: { enabled: false, offsetX: 5, offsetY: 5, blur: 10, color: '#000000', opacity: 0.5 },
            innerShadow: { enabled: false, offsetX: 5, offsetY: 5, blur: 10, color: '#000000', opacity: 0.5 },
            outerGlow: { enabled: false, size: 10, color: '#ffffff', opacity: 0.5 },
            innerGlow: { enabled: false, size: 10, color: '#ffffff', opacity: 0.5 },
            bevelEmboss: { enabled: false, size: 5, depth: 50, angle: 135, highlight: 75, shadow: 75 },
            satin: { enabled: false, color: '#000000', opacity: 0.5, angle: 135, distance: 10, size: 10 },
            colorOverlay: { enabled: false, color: '#000000', opacity: 1 },
            gradientOverlay: { enabled: false, gradient: null, opacity: 1, angle: 0 },
            patternOverlay: { enabled: false, pattern: null, opacity: 1, scale: 100 },
            stroke: { enabled: false, size: 2, color: '#000000', position: 'outside' }
        };
    }
    
    layer.layerStyles.enabled = true;
    
    if (effectType && effectSettings) {
        layer.layerStyles[effectType] = { ...effectSettings, enabled: true };
    }
    
    compositeAllLayers();
}

// Global Light for consistent lighting
const globalLight = {
    enabled: false,
    angle: 135,
    altitude: 30
};

function setGlobalLight(angle, altitude) {
    globalLight.enabled = true;
    globalLight.angle = angle;
    globalLight.altitude = altitude;
    
    // Update all layers using global light
    state.layers.forEach(layer => {
        if (layer.layerStyles && layer.layerStyles.enabled) {
            if (layer.layerStyles.dropShadow && layer.layerStyles.dropShadow.useGlobalLight) {
                layer.layerStyles.dropShadow.angle = angle;
            }
            if (layer.layerStyles.bevelEmboss && layer.layerStyles.bevelEmboss.useGlobalLight) {
                layer.layerStyles.bevelEmboss.angle = angle;
            }
        }
    });
    
    compositeAllLayers();
}

// Layer Style Presets
const layerStylePresets = {
    'default-shadow': {
        name: 'Default Shadow',
        styles: {
            enabled: true,
            dropShadow: { enabled: true, offsetX: 5, offsetY: 5, blur: 10, color: '#000000', opacity: 0.5 }
        }
    },
    'glass-effect': {
        name: 'Glass Effect',
        styles: {
            enabled: true,
            innerGlow: { enabled: true, size: 10, color: '#ffffff', opacity: 0.3 },
            bevelEmboss: { enabled: true, size: 5, depth: 100, angle: 135, highlight: 75, shadow: 50 }
        }
    },
    'neon-glow': {
        name: 'Neon Glow',
        styles: {
            enabled: true,
            outerGlow: { enabled: true, size: 20, color: '#00ffff', opacity: 0.8 },
            innerGlow: { enabled: true, size: 10, color: '#ffffff', opacity: 0.5 }
        }
    },
    'metal': {
        name: 'Metal',
        styles: {
            enabled: true,
            bevelEmboss: { enabled: true, size: 10, depth: 150, angle: 135, highlight: 90, shadow: 40 },
            satin: { enabled: true, color: '#000000', opacity: 0.3, angle: 135, distance: 10, size: 10 }
        }
    }
};

function applyStylePreset(layer, presetName) {
    if (!layer) return;
    
    const preset = layerStylePresets[presetName];
    if (!preset) return;
    
    layer.layerStyles = JSON.parse(JSON.stringify(preset.styles));
    compositeAllLayers();
    showNotification(`✅ Applied style preset "${preset.name}"`, 'success');
}

function saveStylePreset(name, layer) {
    if (!layer || !layer.layerStyles) return;
    
    layerStylePresets[name] = {
        name: name,
        styles: JSON.parse(JSON.stringify(layer.layerStyles))
    };
    
    // Save to localStorage
    localStorage.setItem('artemis-layer-style-presets', JSON.stringify(layerStylePresets));
    showNotification(`✅ Style preset "${name}" saved`, 'success');
}

function loadStylePresets() {
    try {
        const saved = localStorage.getItem('artemis-layer-style-presets');
        if (saved) {
            const loaded = JSON.parse(saved);
            Object.assign(layerStylePresets, loaded);
        }
    } catch (error) {
        console.error('Error loading style presets:', error);
    }
}

// ==================================================================
// END CATEGORY 5: LAYER MANAGEMENT & COMPOSITING
// ==================================================================

// ============================================================================
// Color Management & Grading Implementation (Category 6: Future Enhancements 2.0)
// ============================================================================

let colorManagement = null;

// Initialize Color Management on first use
function initColorManagement() {
    if (!colorManagement && typeof ColorManagement !== 'undefined') {
        colorManagement = new ColorManagement();
        console.log('Color Management initialized');
    }
    return colorManagement;
}

// Curves Advanced
function showCurvesDialog() {
    if (!state.activeLayer) {
        alert('Please select a layer first.');
        return;
    }
    
    const cm = initColorManagement();
    if (!cm) {
        alert('Color Management not available');
        return;
    }
    
    // Simple curves dialog
    const curves = {
        rgb: [
            { x: 0, y: 0 },
            { x: 0.5, y: 0.5 },
            { x: 1, y: 1 }
        ]
    };
    
    const ctx = state.activeLayer.canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, state.activeLayer.canvas.width, state.activeLayer.canvas.height);
    
    cm.applyCurvesAdvanced(imageData, curves);
    ctx.putImageData(imageData, 0, 0);
    renderCanvas();
    saveState();
}

// Levels Per Channel
function showLevelsDialog() {
    if (!state.activeLayer) {
        alert('Please select a layer first.');
        return;
    }
    
    const cm = initColorManagement();
    if (!cm) {
        alert('Color Management not available');
        return;
    }
    
    const ctx = state.activeLayer.canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, state.activeLayer.canvas.width, state.activeLayer.canvas.height);
    
    // Auto levels as default
    cm.autoLevels(imageData);
    ctx.putImageData(imageData, 0, 0);
    renderCanvas();
    saveState();
}

// Selective Color
function showSelectiveColorDialog() {
    if (!state.activeLayer) {
        alert('Please select a layer first.');
        return;
    }
    
    const cm = initColorManagement();
    if (!cm) {
        alert('Color Management not available');
        return;
    }
    
    const adjustments = {
        reds: { cyan: 0, magenta: 0, yellow: 10, black: 0 }
    };
    
    const ctx = state.activeLayer.canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, state.activeLayer.canvas.width, state.activeLayer.canvas.height);
    
    cm.applySelectiveColor(imageData, adjustments);
    ctx.putImageData(imageData, 0, 0);
    renderCanvas();
    saveState();
}

// Color Balance
function showColorBalanceDialog() {
    if (!state.activeLayer) {
        alert('Please select a layer first.');
        return;
    }
    
    const cm = initColorManagement();
    if (!cm) {
        alert('Color Management not available');
        return;
    }
    
    const balance = {
        shadows: { cyan: 0, magenta: 0, yellow: 0 },
        midtones: { cyan: 0, magenta: 0, yellow: 0 },
        highlights: { cyan: 0, magenta: 0, yellow: 0 }
    };
    
    const ctx = state.activeLayer.canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, state.activeLayer.canvas.width, state.activeLayer.canvas.height);
    
    cm.applyColorBalance(imageData, balance);
    ctx.putImageData(imageData, 0, 0);
    renderCanvas();
    saveState();
}

// HSL/HSV Adjustment
function showHSLDialog() {
    if (!state.activeLayer) {
        alert('Please select a layer first.');
        return;
    }
    
    const cm = initColorManagement();
    if (!cm) {
        alert('Color Management not available');
        return;
    }
    
    const adjustments = {
        hueShift: 0,
        saturationShift: 10,
        lightnessShift: 0
    };
    
    const ctx = state.activeLayer.canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, state.activeLayer.canvas.width, state.activeLayer.canvas.height);
    
    cm.applyHSLAdjustment(imageData, adjustments);
    ctx.putImageData(imageData, 0, 0);
    renderCanvas();
    saveState();
}

// Color Wheels
function showColorWheelsDialog() {
    if (!state.activeLayer) {
        alert('Please select a layer first.');
        return;
    }
    
    const cm = initColorManagement();
    if (!cm) {
        alert('Color Management not available');
        return;
    }
    
    const wheels = {
        lift: { red: 5, green: 0, blue: -5 },
        gamma: { red: 0, green: 0, blue: 0 },
        gain: { red: 0, green: 0, blue: 0 }
    };
    
    const ctx = state.activeLayer.canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, state.activeLayer.canvas.width, state.activeLayer.canvas.height);
    
    cm.applyColorWheels(imageData, wheels);
    ctx.putImageData(imageData, 0, 0);
    renderCanvas();
    saveState();
}

// Split Toning
function showSplitToningDialog() {
    if (!state.activeLayer) {
        alert('Please select a layer first.');
        return;
    }
    
    const cm = initColorManagement();
    if (!cm) {
        alert('Color Management not available');
        return;
    }
    
    const splitTone = {
        highlightColor: { hue: 30, saturation: 40 },
        shadowColor: { hue: 210, saturation: 30 },
        balance: 0
    };
    
    const ctx = state.activeLayer.canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, state.activeLayer.canvas.width, state.activeLayer.canvas.height);
    
    cm.applySplitToning(imageData, splitTone);
    ctx.putImageData(imageData, 0, 0);
    renderCanvas();
    saveState();
}

// Color Lookup
function showColorLookupDialog() {
    if (!state.activeLayer) {
        alert('Please select a layer first.');
        return;
    }
    
    const cm = initColorManagement();
    if (!cm) {
        alert('Color Management not available');
        return;
    }
    
    const presets = ['film-emulation-kodak', 'film-emulation-fuji', 'vintage-70s', 'vintage-80s', 
                     'modern-cinematic', 'nordic-cool', 'warm-sunset', 'teal-orange'];
    
    const preset = prompt('Choose a color lookup preset:\n' + presets.join(', '), 'modern-cinematic');
    if (!preset) return;
    
    try {
        const ctx = state.activeLayer.canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, state.activeLayer.canvas.width, state.activeLayer.canvas.height);
        
        cm.applyColorLookup(imageData, preset);
        ctx.putImageData(imageData, 0, 0);
        renderCanvas();
        saveState();
    } catch (error) {
        alert('Error applying color lookup: ' + error.message);
    }
}

// Match Color
function showMatchColorDialog() {
    alert('Match Color: This feature requires selecting a reference image. Load a reference image to continue.');
}

// Channel Mixer
function showChannelMixerDialog() {
    if (!state.activeLayer) {
        alert('Please select a layer first.');
        return;
    }
    
    const cm = initColorManagement();
    if (!cm) {
        alert('Color Management not available');
        return;
    }
    
    const mixer = {
        red: { red: 100, green: 0, blue: 0, constant: 0 },
        green: { red: 0, green: 100, blue: 0, constant: 0 },
        blue: { red: 0, green: 0, blue: 100, constant: 0 }
    };
    
    const ctx = state.activeLayer.canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, state.activeLayer.canvas.width, state.activeLayer.canvas.height);
    
    cm.applyChannelMixer(imageData, mixer);
    ctx.putImageData(imageData, 0, 0);
    renderCanvas();
    saveState();
}

// Photo Filter
function showPhotoFilterDialog() {
    if (!state.activeLayer) {
        alert('Please select a layer first.');
        return;
    }
    
    const cm = initColorManagement();
    if (!cm) {
        alert('Color Management not available');
        return;
    }
    
    const filters = ['warming-85', 'cooling-80', 'red', 'orange', 'yellow', 'green', 'cyan', 
                     'blue', 'violet', 'magenta', 'sepia', 'deep-blue'];
    
    const filter = prompt('Choose a photo filter:\n' + filters.join(', '), 'warming-85');
    if (!filter) return;
    
    try {
        const ctx = state.activeLayer.canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, state.activeLayer.canvas.width, state.activeLayer.canvas.height);
        
        cm.applyPhotoFilter(imageData, filter, 0.5, true);
        ctx.putImageData(imageData, 0, 0);
        renderCanvas();
        saveState();
    } catch (error) {
        alert('Error applying photo filter: ' + error.message);
    }
}

// Convert Color Profile
function showConvertProfileDialog() {
    if (!state.activeLayer) {
        alert('Please select a layer first.');
        return;
    }
    
    const cm = initColorManagement();
    if (!cm) {
        alert('Color Management not available');
        return;
    }
    
    const profiles = ['sRGB', 'Display-P3', 'Adobe-RGB', 'ProPhoto-RGB'];
    const target = prompt('Convert to color profile:\n' + profiles.join(', '), 'sRGB');
    
    if (!target) return;
    
    const ctx = state.activeLayer.canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, state.activeLayer.canvas.width, state.activeLayer.canvas.height);
    
    cm.convertColorProfile(imageData, 'sRGB', target);
    ctx.putImageData(imageData, 0, 0);
    renderCanvas();
    saveState();
}

// Soft Proofing
function showSoftProofingDialog() {
    alert('Soft Proofing: Preview how the image will look in different color spaces.');
}

// Gamut Warning
function showGamutWarning() {
    if (!state.activeLayer) {
        alert('Please select a layer first.');
        return;
    }
    
    const cm = initColorManagement();
    if (!cm) {
        alert('Color Management not available');
        return;
    }
    
    const ctx = state.activeLayer.canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, state.activeLayer.canvas.width, state.activeLayer.canvas.height);
    
    cm.gamutWarning(imageData, 'sRGB');
    ctx.putImageData(imageData, 0, 0);
    renderCanvas();
}

// Apply LUT
function showApplyLUTDialog() {
    if (!state.activeLayer) {
        alert('Please select a layer first.');
        return;
    }
    
    const cm = initColorManagement();
    if (!cm) {
        alert('Color Management not available');
        return;
    }
    
    const luts = ['neutral', 'warm', 'cool', 'cinematic', 'vintage'];
    const lut = prompt('Choose a LUT:\n' + luts.join(', '), 'cinematic');
    
    if (!lut) return;
    
    try {
        const ctx = state.activeLayer.canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, state.activeLayer.canvas.width, state.activeLayer.canvas.height);
        
        cm.applyLUT(imageData, lut);
        ctx.putImageData(imageData, 0, 0);
        renderCanvas();
        saveState();
    } catch (error) {
        alert('Error applying LUT: ' + error.message);
    }
}

// Display Calibration
function showCalibrationDialog() {
    const cm = initColorManagement();
    if (!cm) {
        alert('Color Management not available');
        return;
    }
    
    alert('Display Calibration:\nThis tool helps calibrate your display for accurate color reproduction.\nCalibration data will be applied to all color management operations.');
    
    const result = cm.calibrateDisplay({
        whitePoint: { x: 0.3127, y: 0.3290 }, // D65
        gamma: 2.2,
        brightness: 120,
        contrast: 50
    });
    
    alert('Display calibrated successfully!');
}

// ==================================================================
// END CATEGORY 6: COLOR MANAGEMENT & GRADING
// ==================================================================

// Initialize on load
window.addEventListener('DOMContentLoaded', init);
