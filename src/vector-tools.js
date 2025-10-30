/**
 * ARTemis - Phase 7: Vector & Text Tools
 * Advanced vector editing capabilities including:
 * - Shape anchor point editing (bezier curves)
 * - SVG import/export
 * - Pen tool for custom shapes
 * - Vector brush strokes
 * - Shape boolean operations
 * - Text on path
 */

// Vector Path class for managing bezier curves and anchor points
class VectorPath {
    constructor() {
        this.points = []; // Array of {x, y, type: 'anchor'|'control', handleIn, handleOut}
        this.closed = false;
        this.selectedPoint = -1;
        this.selectedHandle = null; // {pointIndex, type: 'in'|'out'}
    }

    // Add a new anchor point
    addPoint(x, y, type = 'smooth') {
        const point = {
            x: x,
            y: y,
            type: type, // 'corner' or 'smooth'
            handleIn: { x: x - 50, y: y }, // Bezier control handle coming into point
            handleOut: { x: x + 50, y: y } // Bezier control handle going out of point
        };
        this.points.push(point);
        return this.points.length - 1;
    }

    // Remove a point by index
    removePoint(index) {
        if (index >= 0 && index < this.points.length) {
            this.points.splice(index, 1);
            if (this.selectedPoint === index) {
                this.selectedPoint = -1;
            } else if (this.selectedPoint > index) {
                this.selectedPoint--;
            }
        }
    }

    // Convert point type between corner and smooth
    convertPointType(index, type) {
        if (index >= 0 && index < this.points.length) {
            this.points[index].type = type;
            if (type === 'smooth') {
                // Align handles for smooth point
                this.alignHandles(index);
            }
        }
    }

    // Align handles for smooth curve
    alignHandles(index) {
        const point = this.points[index];
        if (!point || point.type !== 'smooth') return;

        const inDx = point.x - point.handleIn.x;
        const inDy = point.y - point.handleIn.y;
        const inDist = Math.sqrt(inDx * inDx + inDy * inDy);

        const outDx = point.handleOut.x - point.x;
        const outDy = point.handleOut.y - point.y;
        const outDist = Math.sqrt(outDx * outDx + outDy * outDy);

        // Keep the out handle direction, adjust in handle to be opposite
        if (outDist > 0) {
            const angle = Math.atan2(outDy, outDx);
            point.handleIn.x = point.x - Math.cos(angle) * inDist;
            point.handleIn.y = point.y - Math.sin(angle) * inDist;
        }
    }

    // Move a point
    movePoint(index, x, y) {
        if (index >= 0 && index < this.points.length) {
            const point = this.points[index];
            const dx = x - point.x;
            const dy = y - point.y;
            point.x = x;
            point.y = y;
            point.handleIn.x += dx;
            point.handleIn.y += dy;
            point.handleOut.x += dx;
            point.handleOut.y += dy;
        }
    }

    // Move a control handle
    moveHandle(pointIndex, handleType, x, y) {
        const point = this.points[pointIndex];
        if (!point) return;

        if (handleType === 'in') {
            point.handleIn.x = x;
            point.handleIn.y = y;
        } else {
            point.handleOut.x = x;
            point.handleOut.y = y;
        }

        // If smooth point, align the opposite handle
        if (point.type === 'smooth') {
            const dx = x - point.x;
            const dy = y - point.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                const angle = Math.atan2(dy, dx);
                const oppositeHandle = handleType === 'in' ? 'out' : 'in';
                const oppositeDist = handleType === 'in' 
                    ? Math.sqrt(Math.pow(point.handleOut.x - point.x, 2) + Math.pow(point.handleOut.y - point.y, 2))
                    : Math.sqrt(Math.pow(point.handleIn.x - point.x, 2) + Math.pow(point.handleIn.y - point.y, 2));
                
                if (oppositeHandle === 'out') {
                    point.handleOut.x = point.x - Math.cos(angle) * oppositeDist;
                    point.handleOut.y = point.y - Math.sin(angle) * oppositeDist;
                } else {
                    point.handleIn.x = point.x - Math.cos(angle) * oppositeDist;
                    point.handleIn.y = point.y - Math.sin(angle) * oppositeDist;
                }
            }
        }
    }

    // Draw the path on a canvas context
    draw(ctx, strokeColor = '#000000', fillColor = null, strokeWidth = 2) {
        if (this.points.length === 0) return;

        ctx.save();
        ctx.beginPath();

        // Move to first point
        ctx.moveTo(this.points[0].x, this.points[0].y);

        // Draw bezier curves between points
        for (let i = 1; i < this.points.length; i++) {
            const prevPoint = this.points[i - 1];
            const currPoint = this.points[i];
            
            ctx.bezierCurveTo(
                prevPoint.handleOut.x, prevPoint.handleOut.y,
                currPoint.handleIn.x, currPoint.handleIn.y,
                currPoint.x, currPoint.y
            );
        }

        // Close path if needed
        if (this.closed && this.points.length > 1) {
            const lastPoint = this.points[this.points.length - 1];
            const firstPoint = this.points[0];
            ctx.bezierCurveTo(
                lastPoint.handleOut.x, lastPoint.handleOut.y,
                firstPoint.handleIn.x, firstPoint.handleIn.y,
                firstPoint.x, firstPoint.y
            );
            ctx.closePath();
        }

        // Fill and stroke
        if (fillColor) {
            ctx.fillStyle = fillColor;
            ctx.fill();
        }
        if (strokeColor) {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth;
            ctx.stroke();
        }

        ctx.restore();
    }

    // Draw control points and handles (for editing mode)
    drawControls(ctx) {
        ctx.save();
        
        // Draw handles first
        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            
            // Draw handle lines
            ctx.strokeStyle = '#4A90E2';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 3]);
            
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            ctx.lineTo(point.handleIn.x, point.handleIn.y);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            ctx.lineTo(point.handleOut.x, point.handleOut.y);
            ctx.stroke();
            
            ctx.setLineDash([]);
            
            // Draw handle control points
            ctx.fillStyle = '#4A90E2';
            ctx.beginPath();
            ctx.arc(point.handleIn.x, point.handleIn.y, 4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(point.handleOut.x, point.handleOut.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw anchor points
        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            const isSelected = i === this.selectedPoint;
            
            ctx.fillStyle = isSelected ? '#FF6B6B' : '#FFFFFF';
            ctx.strokeStyle = point.type === 'corner' ? '#FF6B6B' : '#4A90E2';
            ctx.lineWidth = 2;
            
            if (point.type === 'corner') {
                // Draw square for corner points
                const size = isSelected ? 8 : 6;
                ctx.fillRect(point.x - size/2, point.y - size/2, size, size);
                ctx.strokeRect(point.x - size/2, point.y - size/2, size, size);
            } else {
                // Draw circle for smooth points
                const radius = isSelected ? 5 : 4;
                ctx.beginPath();
                ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
        }
        
        ctx.restore();
    }

    // Find nearest point to given coordinates (for selection)
    findNearestPoint(x, y, threshold = 10) {
        let nearest = -1;
        let minDist = threshold;
        
        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            const dist = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2));
            if (dist < minDist) {
                minDist = dist;
                nearest = i;
            }
        }
        
        return nearest;
    }

    // Find nearest handle to given coordinates
    findNearestHandle(x, y, threshold = 10) {
        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            
            const distIn = Math.sqrt(Math.pow(x - point.handleIn.x, 2) + Math.pow(y - point.handleIn.y, 2));
            if (distIn < threshold) {
                return { pointIndex: i, type: 'in' };
            }
            
            const distOut = Math.sqrt(Math.pow(x - point.handleOut.x, 2) + Math.pow(y - point.handleOut.y, 2));
            if (distOut < threshold) {
                return { pointIndex: i, type: 'out' };
            }
        }
        
        return null;
    }

    // Convert to SVG path data
    toSVGPath() {
        if (this.points.length === 0) return '';
        
        let d = `M ${this.points[0].x} ${this.points[0].y}`;
        
        for (let i = 1; i < this.points.length; i++) {
            const prevPoint = this.points[i - 1];
            const currPoint = this.points[i];
            d += ` C ${prevPoint.handleOut.x} ${prevPoint.handleOut.y}, ${currPoint.handleIn.x} ${currPoint.handleIn.y}, ${currPoint.x} ${currPoint.y}`;
        }
        
        if (this.closed && this.points.length > 1) {
            const lastPoint = this.points[this.points.length - 1];
            const firstPoint = this.points[0];
            d += ` C ${lastPoint.handleOut.x} ${lastPoint.handleOut.y}, ${firstPoint.handleIn.x} ${firstPoint.handleIn.y}, ${firstPoint.x} ${firstPoint.y}`;
            d += ' Z';
        }
        
        return d;
    }

    // Create from SVG path data
    static fromSVGPath(pathData) {
        const path = new VectorPath();
        // Simplified SVG path parser - handles M, L, C, Z commands
        const commands = pathData.match(/[MLCQAZ][^MLCQAZ]*/gi);
        
        if (!commands) return path;
        
        let currentX = 0, currentY = 0;
        
        for (const cmd of commands) {
            const type = cmd[0];
            const values = cmd.slice(1).trim().split(/[\s,]+/).map(Number);
            
            switch (type.toUpperCase()) {
                case 'M': // Move to
                    currentX = values[0];
                    currentY = values[1];
                    path.addPoint(currentX, currentY, 'corner');
                    break;
                    
                case 'L': // Line to
                    currentX = values[0];
                    currentY = values[1];
                    path.addPoint(currentX, currentY, 'corner');
                    break;
                    
                case 'C': // Cubic bezier
                    const cp1x = values[0], cp1y = values[1];
                    const cp2x = values[2], cp2y = values[3];
                    currentX = values[4];
                    currentY = values[5];
                    
                    // Set the out handle of the previous point
                    if (path.points.length > 0) {
                        const prevPoint = path.points[path.points.length - 1];
                        prevPoint.handleOut.x = cp1x;
                        prevPoint.handleOut.y = cp1y;
                    }
                    
                    // Add new point with in handle
                    const index = path.addPoint(currentX, currentY, 'smooth');
                    path.points[index].handleIn.x = cp2x;
                    path.points[index].handleIn.y = cp2y;
                    break;
                    
                case 'Z': // Close path
                    path.closed = true;
                    break;
            }
        }
        
        return path;
    }

    // Clone this path
    clone() {
        const newPath = new VectorPath();
        newPath.points = JSON.parse(JSON.stringify(this.points));
        newPath.closed = this.closed;
        return newPath;
    }
}

// Shape Boolean Operations
class ShapeBoolean {
    // Combine two paths using union operation
    static union(path1, path2) {
        // Simplified union - returns path1 with path2 points added
        const result = path1.clone();
        for (const point of path2.points) {
            result.points.push(JSON.parse(JSON.stringify(point)));
        }
        return result;
    }

    // Subtract path2 from path1
    static subtract(path1, path2) {
        // Simplified subtraction - returns path1 (would need proper polygon clipping)
        return path1.clone();
    }

    // Intersect two paths
    static intersect(path1, path2) {
        // Simplified intersection - returns path1 (would need proper polygon clipping)
        return path1.clone();
    }

    // Exclude overlapping areas
    static exclude(path1, path2) {
        // Simplified exclusion - combines both paths
        return ShapeBoolean.union(path1, path2);
    }
}

// Text on Path functionality
class TextOnPath {
    constructor(text, path, fontSize = 24, fontFamily = 'Arial') {
        this.text = text;
        this.path = path;
        this.fontSize = fontSize;
        this.fontFamily = fontFamily;
        this.offset = 0; // Offset along the path
        this.alignment = 'left'; // 'left', 'center', 'right'
    }

    // Get point and angle along the path at distance t (0 to 1)
    getPointAtDistance(t) {
        if (this.path.points.length < 2) return null;
        
        // Calculate total approximate path length
        let totalLength = 0;
        const segments = [];
        
        for (let i = 1; i < this.path.points.length; i++) {
            const prevPoint = this.path.points[i - 1];
            const currPoint = this.path.points[i];
            const length = Math.sqrt(
                Math.pow(currPoint.x - prevPoint.x, 2) + 
                Math.pow(currPoint.y - prevPoint.y, 2)
            );
            segments.push({ start: totalLength, end: totalLength + length, index: i });
            totalLength += length;
        }
        
        if (this.path.closed && this.path.points.length > 1) {
            const lastPoint = this.path.points[this.path.points.length - 1];
            const firstPoint = this.path.points[0];
            const length = Math.sqrt(
                Math.pow(firstPoint.x - lastPoint.x, 2) + 
                Math.pow(firstPoint.y - lastPoint.y, 2)
            );
            segments.push({ start: totalLength, end: totalLength + length, index: 0 });
            totalLength += length;
        }
        
        // Find which segment the distance falls in
        const targetDist = t * totalLength;
        for (const seg of segments) {
            if (targetDist >= seg.start && targetDist <= seg.end) {
                const segT = (targetDist - seg.start) / (seg.end - seg.start);
                const prevIndex = seg.index - 1 < 0 ? this.path.points.length - 1 : seg.index - 1;
                const prevPoint = this.path.points[prevIndex];
                const currPoint = this.path.points[seg.index];
                
                // Linear interpolation for simplicity
                const x = prevPoint.x + (currPoint.x - prevPoint.x) * segT;
                const y = prevPoint.y + (currPoint.y - prevPoint.y) * segT;
                const angle = Math.atan2(currPoint.y - prevPoint.y, currPoint.x - prevPoint.x);
                
                return { x, y, angle };
            }
        }
        
        return null;
    }

    // Draw text along the path
    draw(ctx, color = '#000000') {
        if (!this.text || this.path.points.length < 2) return;
        
        ctx.save();
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Calculate text metrics
        const textWidth = ctx.measureText(this.text).width;
        const charSpacing = textWidth / this.text.length;
        
        // Calculate starting offset based on alignment
        let startOffset = this.offset;
        if (this.alignment === 'center') {
            startOffset = 0.5 - (textWidth / 2) / 1000; // Approximate
        } else if (this.alignment === 'right') {
            startOffset = 1.0 - (textWidth) / 1000; // Approximate
        }
        
        // Draw each character along the path
        for (let i = 0; i < this.text.length; i++) {
            const t = startOffset + (i * charSpacing) / 1000; // Approximate normalization
            const point = this.getPointAtDistance(Math.max(0, Math.min(1, t)));
            
            if (point) {
                ctx.save();
                ctx.translate(point.x, point.y);
                ctx.rotate(point.angle);
                ctx.fillText(this.text[i], 0, 0);
                ctx.restore();
            }
        }
        
        ctx.restore();
    }
}

// SVG Import/Export functionality
class SVGHandler {
    // Import SVG file and convert to vector paths
    static async importSVG(svgContent) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgContent, 'image/svg+xml');
        const paths = [];
        
        // Extract path elements
        const pathElements = doc.querySelectorAll('path');
        pathElements.forEach(pathEl => {
            const d = pathEl.getAttribute('d');
            if (d) {
                const path = VectorPath.fromSVGPath(d);
                paths.push({
                    path: path,
                    fill: pathEl.getAttribute('fill') || 'none',
                    stroke: pathEl.getAttribute('stroke') || 'black',
                    strokeWidth: parseFloat(pathEl.getAttribute('stroke-width') || '1')
                });
            }
        });
        
        return paths;
    }

    // Export vector paths to SVG
    static exportSVG(paths, width, height) {
        let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
`;
        
        for (const pathData of paths) {
            const d = pathData.path.toSVGPath();
            const fill = pathData.fill || 'none';
            const stroke = pathData.stroke || 'black';
            const strokeWidth = pathData.strokeWidth || 1;
            
            svg += `  <path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>\n`;
        }
        
        svg += '</svg>';
        return svg;
    }
}

// Export classes for use in renderer.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VectorPath, ShapeBoolean, TextOnPath, SVGHandler };
}
