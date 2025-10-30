/**
 * WebGL Renderer Module
 * Provides GPU-accelerated rendering for faster brush strokes
 */

class WebGLRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = null;
        this.program = null;
        this.initialized = false;
        this.brushTexture = null;
        this.canvasTexture = null;
        this.framebuffer = null;
    }
    
    /**
     * Initialize WebGL context and shaders
     */
    init() {
        try {
            // Get WebGL2 context (fallback to WebGL 1)
            this.gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
            
            if (!this.gl) {
                console.warn('WebGL not supported, falling back to 2D canvas');
                return false;
            }
            
            // Create shader program
            const vertexShader = this.createShader(this.gl.VERTEX_SHADER, this.getVertexShaderSource());
            const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, this.getFragmentShaderSource());
            
            this.program = this.createProgram(vertexShader, fragmentShader);
            
            // Set up geometry
            this.setupGeometry();
            
            this.initialized = true;
            console.log('WebGL renderer initialized successfully');
            return true;
            
        } catch (error) {
            console.error('Failed to initialize WebGL:', error);
            return false;
        }
    }
    
    /**
     * Create shader from source
     */
    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compilation error:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    /**
     * Create shader program
     */
    createProgram(vertexShader, fragmentShader) {
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Program linking error:', this.gl.getProgramInfoLog(program));
            return null;
        }
        
        return program;
    }
    
    /**
     * Get vertex shader source
     */
    getVertexShaderSource() {
        return `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            varying vec2 v_texCoord;
            
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }
        `;
    }
    
    /**
     * Get fragment shader source for brush rendering
     */
    getFragmentShaderSource() {
        return `
            precision mediump float;
            
            uniform sampler2D u_brushTexture;
            uniform sampler2D u_canvasTexture;
            uniform vec2 u_brushPosition;
            uniform float u_brushSize;
            uniform float u_brushOpacity;
            uniform vec4 u_brushColor;
            uniform float u_brushFlow;
            
            varying vec2 v_texCoord;
            
            void main() {
                // Get current canvas color
                vec4 canvasColor = texture2D(u_canvasTexture, v_texCoord);
                
                // Calculate distance from brush center
                vec2 brushCoord = (v_texCoord - u_brushPosition) / u_brushSize;
                
                // Get brush texture value
                vec4 brushValue = texture2D(u_brushTexture, brushCoord);
                
                // Apply brush color and opacity
                vec4 brushColor = u_brushColor * brushValue.a * u_brushOpacity * u_brushFlow;
                
                // Blend with canvas
                vec4 finalColor = mix(canvasColor, brushColor, brushColor.a);
                
                gl_FragColor = finalColor;
            }
        `;
    }
    
    /**
     * Set up geometry for rendering
     */
    setupGeometry() {
        // Create a quad that covers the entire canvas
        const positions = new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
             1,  1,
        ]);
        
        const texCoords = new Float32Array([
            0, 0,
            1, 0,
            0, 1,
            1, 1,
        ]);
        
        // Position buffer
        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
        
        const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
        
        // Texture coordinate buffer
        const texCoordBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);
        
        const texCoordLocation = this.gl.getAttribLocation(this.program, 'a_texCoord');
        this.gl.enableVertexAttribArray(texCoordLocation);
        this.gl.vertexAttribPointer(texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);
    }
    
    /**
     * Draw brush stroke using WebGL
     */
    drawBrushStroke(x, y, size, opacity, color, flow) {
        if (!this.initialized) {
            return false;
        }
        
        this.gl.useProgram(this.program);
        
        // Set uniforms
        const brushPositionLocation = this.gl.getUniformLocation(this.program, 'u_brushPosition');
        this.gl.uniform2f(brushPositionLocation, x / this.canvas.width, y / this.canvas.height);
        
        const brushSizeLocation = this.gl.getUniformLocation(this.program, 'u_brushSize');
        this.gl.uniform1f(brushSizeLocation, size / this.canvas.width);
        
        const brushOpacityLocation = this.gl.getUniformLocation(this.program, 'u_brushOpacity');
        this.gl.uniform1f(brushOpacityLocation, opacity);
        
        const brushColorLocation = this.gl.getUniformLocation(this.program, 'u_brushColor');
        this.gl.uniform4f(brushColorLocation, color.r, color.g, color.b, color.a);
        
        const brushFlowLocation = this.gl.getUniformLocation(this.program, 'u_brushFlow');
        this.gl.uniform1f(brushFlowLocation, flow);
        
        // Draw
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        
        return true;
    }
    
    /**
     * Create texture from canvas
     */
    createTextureFromCanvas(canvas) {
        const texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        
        // Set texture parameters
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        
        // Upload canvas data
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, canvas);
        
        return texture;
    }
    
    /**
     * Clear the canvas
     */
    clear() {
        if (!this.initialized) return;
        
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }
    
    /**
     * Get canvas as 2D context for fallback
     */
    getCanvas2DContext() {
        // Create a 2D canvas for fallback
        const canvas2d = document.createElement('canvas');
        canvas2d.width = this.canvas.width;
        canvas2d.height = this.canvas.height;
        
        const ctx = canvas2d.getContext('2d');
        
        // Read pixels from WebGL canvas
        if (this.initialized) {
            const pixels = new Uint8Array(this.canvas.width * this.canvas.height * 4);
            this.gl.readPixels(0, 0, this.canvas.width, this.canvas.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
            
            // Create ImageData and put on 2D canvas
            const imageData = new ImageData(new Uint8ClampedArray(pixels), this.canvas.width, this.canvas.height);
            ctx.putImageData(imageData, 0, 0);
        }
        
        return ctx;
    }
    
    /**
     * Check if WebGL is available
     */
    static isWebGLAvailable() {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('webgl2'));
        } catch (e) {
            return false;
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebGLRenderer;
}
