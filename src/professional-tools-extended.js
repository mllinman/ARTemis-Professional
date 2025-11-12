/**
 * Professional Tools for ARTemis
 * 
 * This module implements JavaScript equivalents of professional specialized tools
 * Originally inspired by professional C++ tool implementations
 * 
 * Tools Implemented:
 * - Multibrush Tool: Multi-axis symmetry painting
 * - Assistant Tool: Perspective and vanishing point guides
 * - Deform Brush: Move, grow, shrink pixels dynamically
 */

// ============================================================================
// MULTIBRUSH TOOL
// ============================================================================
// Inspired by professional multibrush tool (multibrush algorithms)
// Allows painting with multiple symmetry axes

class MultibrushTool {
    constructor() {
        this.settings = {
            enabled: false,
            mode: 'mirror',            // 'mirror', 'rotate', 'translate', 'snowflake'
            axes: 2,                   // Number of symmetry axes (2-16)
            centerX: 0,                // Center point X (canvas coords)
            centerY: 0,                // Center point Y (canvas coords)
            showAxes: true,            // Show symmetry axes
            translateX: 100,           // Translation distance X
            translateY: 100,           // Translation distance Y
            copies: 4,                 // Number of copies for translate mode
        };
        this.transformedPoints = [];
    }

    /**
     * Calculate transformed brush positions based on symmetry settings
     * @param {number} x - Original X position
     * @param {number} y - Original Y position
     * @returns {Array<{x, y}>} Array of transformed positions
     */
    calculateTransforms(x, y) {
        this.transformedPoints = [];
        
        if (!this.settings.enabled) {
            return [{ x, y }];
        }
        
        const centerX = this.settings.centerX;
        const centerY = this.settings.centerY;
        
        switch (this.settings.mode) {
            case 'mirror':
                return this.calculateMirrorTransforms(x, y, centerX, centerY);
            
            case 'rotate':
                return this.calculateRotateTransforms(x, y, centerX, centerY);
            
            case 'translate':
                return this.calculateTranslateTransforms(x, y);
            
            case 'snowflake':
                return this.calculateSnowflakeTransforms(x, y, centerX, centerY);
            
            default:
                return [{ x, y }];
        }
    }

    calculateMirrorTransforms(x, y, centerX, centerY) {
        const points = [{ x, y }];
        
        // Horizontal mirror
        if (this.settings.axes >= 1) {
            points.push({ x: 2 * centerX - x, y });
        }
        
        // Vertical mirror
        if (this.settings.axes >= 2) {
            points.push({ x, y: 2 * centerY - y });
            points.push({ x: 2 * centerX - x, y: 2 * centerY - y });
        }
        
        return points;
    }

    calculateRotateTransforms(x, y, centerX, centerY) {
        const points = [];
        const angleStep = (Math.PI * 2) / this.settings.axes;
        
        for (let i = 0; i < this.settings.axes; i++) {
            const angle = angleStep * i;
            const dx = x - centerX;
            const dy = y - centerY;
            
            const rotatedX = centerX + dx * Math.cos(angle) - dy * Math.sin(angle);
            const rotatedY = centerY + dx * Math.sin(angle) + dy * Math.cos(angle);
            
            points.push({ x: rotatedX, y: rotatedY });
        }
        
        return points;
    }

    calculateTranslateTransforms(x, y) {
        const points = [];
        
        for (let i = 0; i < this.settings.copies; i++) {
            points.push({
                x: x + i * this.settings.translateX,
                y: y + i * this.settings.translateY
            });
        }
        
        return points;
    }

    calculateSnowflakeTransforms(x, y, centerX, centerY) {
        const points = [];
        const angleStep = (Math.PI * 2) / this.settings.axes;
        
        for (let i = 0; i < this.settings.axes; i++) {
            const angle = angleStep * i;
            const dx = x - centerX;
            const dy = y - centerY;
            
            // Rotation
            let rotatedX = centerX + dx * Math.cos(angle) - dy * Math.sin(angle);
            let rotatedY = centerY + dx * Math.sin(angle) + dy * Math.cos(angle);
            points.push({ x: rotatedX, y: rotatedY });
            
            // Mirror reflection for snowflake pattern
            rotatedX = centerX + dx * Math.cos(angle) + dy * Math.sin(angle);
            rotatedY = centerY - dx * Math.sin(angle) + dy * Math.cos(angle);
            points.push({ x: rotatedX, y: rotatedY });
        }
        
        return points;
    }

    /**
     * Draw symmetry axes for visualization
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    drawAxes(ctx, width, height) {
        if (!this.settings.enabled || !this.settings.showAxes) return;
        
        ctx.save();
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.globalAlpha = 0.5;
        
        const centerX = this.settings.centerX;
        const centerY = this.settings.centerY;
        
        switch (this.settings.mode) {
            case 'mirror':
                // Draw horizontal and vertical axes
                if (this.settings.axes >= 1) {
                    ctx.beginPath();
                    ctx.moveTo(centerX, 0);
                    ctx.lineTo(centerX, height);
                    ctx.stroke();
                }
                if (this.settings.axes >= 2) {
                    ctx.beginPath();
                    ctx.moveTo(0, centerY);
                    ctx.lineTo(width, centerY);
                    ctx.stroke();
                }
                break;
            
            case 'rotate':
            case 'snowflake':
                // Draw radial axes
                const angleStep = (Math.PI * 2) / this.settings.axes;
                const radius = Math.max(width, height);
                
                for (let i = 0; i < this.settings.axes; i++) {
                    const angle = angleStep * i;
                    ctx.beginPath();
                    ctx.moveTo(centerX, centerY);
                    ctx.lineTo(
                        centerX + Math.cos(angle) * radius,
                        centerY + Math.sin(angle) * radius
                    );
                    ctx.stroke();
                }
                break;
        }
        
        // Draw center point
        ctx.fillStyle = '#00ffff';
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    updateSettings(settings) {
        Object.assign(this.settings, settings);
    }

    setCenter(x, y) {
        this.settings.centerX = x;
        this.settings.centerY = y;
    }
}

// ============================================================================
// ASSISTANT TOOL
// ============================================================================
// Inspired by professional painting assistants (assistant algorithms)
// Provides perspective guides and vanishing points

class AssistantTool {
    constructor() {
        this.assistants = [];
        this.activeAssistant = null;
        this.settings = {
            snapToAssistant: true,     // Snap strokes to assistant
            snapDistance: 20,          // Snap distance in pixels
            showAssistants: true,      // Show assistant guides
            assistantOpacity: 0.6,     // Guide opacity
        };
    }

    /**
     * Create a new perspective assistant
     * @param {string} type - 'perspective', 'parallel', 'vanishing-point', 'ellipse', 'grid'
     * @param {Object} points - Control points for the assistant
     */
    createAssistant(type, points) {
        const assistant = {
            id: Date.now(),
            type: type,
            points: points,
            enabled: true,
            color: '#ff00ff'
        };
        
        this.assistants.push(assistant);
        return assistant;
    }

    /**
     * Create a perspective assistant with vanishing points
     * @param {Object} vp1 - First vanishing point {x, y}
     * @param {Object} vp2 - Second vanishing point {x, y}
     */
    createPerspectiveAssistant(vp1, vp2, vp3 = null) {
        return this.createAssistant('perspective', {
            vp1: vp1,
            vp2: vp2,
            vp3: vp3, // Optional third vanishing point for 3-point perspective
            horizonY: vp1.y // Horizon line Y position
        });
    }

    /**
     * Create a parallel ruler assistant
     * @param {Object} start - Start point {x, y}
     * @param {Object} end - End point {x, y}
     */
    createParallelAssistant(start, end) {
        return this.createAssistant('parallel', {
            start: start,
            end: end,
            angle: Math.atan2(end.y - start.y, end.x - start.x)
        });
    }

    /**
     * Create a grid assistant
     * @param {number} spacing - Grid spacing in pixels
     * @param {number} subdivisions - Number of subdivisions
     */
    createGridAssistant(spacing = 50, subdivisions = 5) {
        return this.createAssistant('grid', {
            spacing: spacing,
            subdivisions: subdivisions
        });
    }

    /**
     * Snap point to nearest assistant
     * @param {number} x - Original X position
     * @param {number} y - Original Y position
     * @returns {{x, y}} Snapped position
     */
    snapToAssistant(x, y) {
        if (!this.settings.snapToAssistant) {
            return { x, y };
        }
        
        let closestPoint = { x, y };
        let minDistance = this.settings.snapDistance;
        
        for (const assistant of this.assistants) {
            if (!assistant.enabled) continue;
            
            const snapped = this.snapToAssistantType(x, y, assistant);
            const dist = Math.sqrt((snapped.x - x) ** 2 + (snapped.y - y) ** 2);
            
            if (dist < minDistance) {
                minDistance = dist;
                closestPoint = snapped;
            }
        }
        
        return closestPoint;
    }

    snapToAssistantType(x, y, assistant) {
        switch (assistant.type) {
            case 'perspective':
                return this.snapToPerspective(x, y, assistant.points);
            
            case 'parallel':
                return this.snapToParallel(x, y, assistant.points);
            
            case 'grid':
                return this.snapToGrid(x, y, assistant.points);
            
            default:
                return { x, y };
        }
    }

    snapToPerspective(x, y, points) {
        // Find nearest perspective line from vanishing point
        if (!points.vp1) return { x, y };
        
        const dx = x - points.vp1.x;
        const dy = y - points.vp1.y;
        const angle = Math.atan2(dy, dx);
        
        // Project point onto perspective line
        const dist = Math.sqrt(dx * dx + dy * dy);
        return {
            x: points.vp1.x + Math.cos(angle) * dist,
            y: points.vp1.y + Math.sin(angle) * dist
        };
    }

    snapToParallel(x, y, points) {
        // Snap to parallel line
        const angle = points.angle;
        const dx = x - points.start.x;
        const dy = y - points.start.y;
        
        // Project onto line
        const lineLen = Math.cos(angle) * dx + Math.sin(angle) * dy;
        
        return {
            x: points.start.x + Math.cos(angle) * lineLen,
            y: points.start.y + Math.sin(angle) * lineLen
        };
    }

    snapToGrid(x, y, points) {
        // Snap to nearest grid point
        const spacing = points.spacing;
        return {
            x: Math.round(x / spacing) * spacing,
            y: Math.round(y / spacing) * spacing
        };
    }

    /**
     * Draw all active assistants
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    drawAssistants(ctx, width, height) {
        if (!this.settings.showAssistants) return;
        
        ctx.save();
        ctx.globalAlpha = this.settings.assistantOpacity;
        
        for (const assistant of this.assistants) {
            if (!assistant.enabled) continue;
            
            ctx.strokeStyle = assistant.color;
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            
            switch (assistant.type) {
                case 'perspective':
                    this.drawPerspectiveAssistant(ctx, assistant.points, width, height);
                    break;
                
                case 'parallel':
                    this.drawParallelAssistant(ctx, assistant.points, width, height);
                    break;
                
                case 'grid':
                    this.drawGridAssistant(ctx, assistant.points, width, height);
                    break;
            }
        }
        
        ctx.restore();
    }

    drawPerspectiveAssistant(ctx, points, width, height) {
        if (!points.vp1) return;
        
        // Draw vanishing point
        ctx.fillStyle = points.color || '#ff00ff';
        ctx.beginPath();
        ctx.arc(points.vp1.x, points.vp1.y, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw perspective lines
        const numLines = 8;
        for (let i = 0; i < numLines; i++) {
            const angle = (Math.PI * 2 / numLines) * i;
            ctx.beginPath();
            ctx.moveTo(points.vp1.x, points.vp1.y);
            ctx.lineTo(
                points.vp1.x + Math.cos(angle) * Math.max(width, height) * 2,
                points.vp1.y + Math.sin(angle) * Math.max(width, height) * 2
            );
            ctx.stroke();
        }
        
        // Draw horizon line if vp2 exists
        if (points.vp2) {
            ctx.beginPath();
            ctx.moveTo(0, points.horizonY);
            ctx.lineTo(width, points.horizonY);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(points.vp2.x, points.vp2.y, 6, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawParallelAssistant(ctx, points, width, height) {
        // Draw parallel ruler
        const angle = points.angle;
        const length = Math.max(width, height) * 2;
        
        ctx.beginPath();
        ctx.moveTo(
            points.start.x - Math.cos(angle) * length,
            points.start.y - Math.sin(angle) * length
        );
        ctx.lineTo(
            points.start.x + Math.cos(angle) * length,
            points.start.y + Math.sin(angle) * length
        );
        ctx.stroke();
        
        // Draw control points
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.arc(points.start.x, points.start.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(points.end.x, points.end.y, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    drawGridAssistant(ctx, points, width, height) {
        const spacing = points.spacing;
        const subdivisions = points.subdivisions;
        
        // Draw major grid lines
        ctx.setLineDash([]);
        for (let x = 0; x < width; x += spacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = 0; y < height; y += spacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Draw subdivision lines
        ctx.globalAlpha *= 0.3;
        const subSpacing = spacing / subdivisions;
        for (let x = 0; x < width; x += subSpacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = 0; y < height; y += subSpacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }

    updateSettings(settings) {
        Object.assign(this.settings, settings);
    }

    removeAssistant(assistantId) {
        this.assistants = this.assistants.filter(a => a.id !== assistantId);
    }

    clearAssistants() {
        this.assistants = [];
    }
}

// ============================================================================
// DEFORM BRUSH TOOL
// ============================================================================
// Inspired by professional deform brush (kis_tool_deform.cpp)
// Dynamically warps pixels: move, grow, shrink, swirl

class DeformBrushTool {
    constructor() {
        this.settings = {
            mode: 'move',              // 'move', 'grow', 'shrink', 'swirl', 'pinch'
            strength: 50,              // Effect strength (0-100)
            size: 50,                  // Brush size
            hardness: 50,              // Edge hardness (0-100)
        };
        this.deformGrid = null;
    }

    /**
     * Apply deformation to image data
     * @param {ImageData} sourceData - Source image data
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {number} deltaX - Movement delta X (for move mode)
     * @param {number} deltaY - Movement delta Y (for move mode)
     * @returns {ImageData} Deformed image data
     */
    applyDeform(sourceData, x, y, deltaX = 0, deltaY = 0) {
        const width = sourceData.width;
        const height = sourceData.height;
        const result = new ImageData(width, height);
        
        const radius = this.settings.size / 2;
        const strength = this.settings.strength / 100;
        const hardness = this.settings.hardness / 100;
        
        // Copy source data
        for (let i = 0; i < sourceData.data.length; i++) {
            result.data[i] = sourceData.data[i];
        }
        
        // Apply deformation
        for (let py = Math.max(0, Math.floor(y - radius)); py < Math.min(height, Math.ceil(y + radius)); py++) {
            for (let px = Math.max(0, Math.floor(x - radius)); px < Math.min(width, Math.ceil(x + radius)); px++) {
                const dist = Math.sqrt((px - x) ** 2 + (py - y) ** 2);
                
                if (dist <= radius) {
                    // Calculate falloff based on hardness
                    const falloff = dist / radius;
                    const effectStrength = strength * Math.pow(1 - falloff, 2 - hardness);
                    
                    // Calculate source pixel based on deform mode
                    const sourcePos = this.calculateDeformation(
                        px, py, x, y, deltaX, deltaY, effectStrength, dist, radius
                    );
                    
                    // Sample from source position
                    if (sourcePos.x >= 0 && sourcePos.x < width && 
                        sourcePos.y >= 0 && sourcePos.y < height) {
                        
                        const srcIndex = (Math.floor(sourcePos.y) * width + Math.floor(sourcePos.x)) * 4;
                        const dstIndex = (py * width + px) * 4;
                        
                        result.data[dstIndex] = sourceData.data[srcIndex];
                        result.data[dstIndex + 1] = sourceData.data[srcIndex + 1];
                        result.data[dstIndex + 2] = sourceData.data[srcIndex + 2];
                        result.data[dstIndex + 3] = sourceData.data[srcIndex + 3];
                    }
                }
            }
        }
        
        return result;
    }

    calculateDeformation(px, py, centerX, centerY, deltaX, deltaY, strength, dist, radius) {
        switch (this.settings.mode) {
            case 'move':
                // Move pixels in direction of stroke
                return {
                    x: px - deltaX * strength,
                    y: py - deltaY * strength
                };
            
            case 'grow':
                // Push pixels outward from center
                const growAngle = Math.atan2(py - centerY, px - centerX);
                const growDist = dist * (1 + strength * 0.5);
                return {
                    x: centerX + Math.cos(growAngle) * growDist,
                    y: centerY + Math.sin(growAngle) * growDist
                };
            
            case 'shrink':
                // Pull pixels toward center
                const shrinkAngle = Math.atan2(py - centerY, px - centerX);
                const shrinkDist = dist * (1 - strength * 0.5);
                return {
                    x: centerX + Math.cos(shrinkAngle) * shrinkDist,
                    y: centerY + Math.sin(shrinkAngle) * shrinkDist
                };
            
            case 'swirl':
                // Rotate pixels around center
                const swirlAngle = Math.atan2(py - centerY, px - centerX);
                const rotation = strength * Math.PI;
                const newAngle = swirlAngle + rotation * (1 - dist / radius);
                return {
                    x: centerX + Math.cos(newAngle) * dist,
                    y: centerY + Math.sin(newAngle) * dist
                };
            
            case 'pinch':
                // Pinch pixels toward center with exponential falloff
                const pinchAngle = Math.atan2(py - centerY, px - centerX);
                const pinchDist = dist * Math.pow(1 - strength * 0.8, 2);
                return {
                    x: centerX + Math.cos(pinchAngle) * pinchDist,
                    y: centerY + Math.sin(pinchAngle) * pinchDist
                };
            
            default:
                return { x: px, y: py };
        }
    }

    updateSettings(settings) {
        Object.assign(this.settings, settings);
    }
}

// ============================================================================
// EXPORT TOOLS
// ============================================================================

const professionalToolsExtended = {
    multibrush: new MultibrushTool(),
    assistant: new AssistantTool(),
    deformBrush: new DeformBrushTool()
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = professionalToolsExtended;
}
