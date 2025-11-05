#!/usr/bin/env node
/**
 * Generate paper texture preview images and brush stroke examples
 * This script creates visual examples for the paper panel
 */

const fs = require('fs');
const { createCanvas } = require('canvas');

// Paper texture definitions matching the existing paper types in the app
const paperTextures = {
    // Hot Pressed (Smooth)
    'canson-xl-hot-pressed-200lb': { name: 'Canson XL Hot Pressed 200lb', roughness: 0.1, grain: 0.05 },
    'canson-xl-hot-pressed-140lb': { name: 'Canson XL Hot Pressed 140lb', roughness: 0.15, grain: 0.08 },
    'strathmore-400-hot-pressed': { name: 'Strathmore 400 Hot Pressed', roughness: 0.12, grain: 0.06 },
    
    // Cold Pressed (Medium)
    'canson-xl-cold-pressed-140lb': { name: 'Canson XL Cold Pressed 140lb', roughness: 0.4, grain: 0.3 },
    'arches-cold-pressed-140lb': { name: 'Arches Cold Pressed 140lb', roughness: 0.45, grain: 0.35 },
    'fabriano-artistico-cold-pressed': { name: 'Fabriano Artistico Cold Pressed', roughness: 0.42, grain: 0.32 },
    'strathmore-500-cold-pressed': { name: 'Strathmore 500 Cold Pressed', roughness: 0.38, grain: 0.28 },
    
    // Rough Papers
    'arches-rough-300lb': { name: 'Arches Rough 300lb', roughness: 0.7, grain: 0.6 },
    'fabriano-artistico-rough': { name: 'Fabriano Artistico Rough', roughness: 0.65, grain: 0.55 },
    'saunders-waterford-rough': { name: 'Saunders Waterford Rough', roughness: 0.68, grain: 0.58 },
    
    // Bristol & Illustration
    'bristol-vellum': { name: 'Bristol Vellum', roughness: 0.2, grain: 0.15 },
    'bristol-smooth': { name: 'Bristol Smooth', roughness: 0.08, grain: 0.04 },
    'strathmore-500-bristol-plate': { name: 'Strathmore 500 Bristol Plate', roughness: 0.06, grain: 0.03 },
    
    // Canvas & Linen
    'canvas-fine-linen': { name: 'Canvas Fine Linen', roughness: 0.5, grain: 0.4, pattern: 'weave' },
    'canvas-cotton-duck': { name: 'Canvas Cotton Duck', roughness: 0.55, grain: 0.45, pattern: 'weave' },
    'canvas-rough-weave': { name: 'Canvas Rough Weave', roughness: 0.6, grain: 0.5, pattern: 'weave' },
    
    // Specialty Papers
    'stonehenge-white': { name: 'Stonehenge White', roughness: 0.35, grain: 0.25 },
    'rives-bfk': { name: 'Rives BFK', roughness: 0.3, grain: 0.2 },
    'hahnemuhle-leonardo': { name: 'Hahnemühle Leonardo', roughness: 0.32, grain: 0.22 },
    
    // Mixed Media
    'strathmore-400-mixed-media': { name: 'Strathmore 400 Mixed Media', roughness: 0.33, grain: 0.23 },
    'canson-xl-mixed-media': { name: 'Canson XL Mixed Media', roughness: 0.36, grain: 0.26 },
    
    // Toned Papers
    'strathmore-toned-gray': { name: 'Strathmore Toned Gray', roughness: 0.28, grain: 0.18, tone: '#888888' },
    'strathmore-toned-tan': { name: 'Strathmore Toned Tan', roughness: 0.28, grain: 0.18, tone: '#D2B48C' },
    'canson-mi-teintes': { name: 'Canson Mi-Teintes', roughness: 0.4, grain: 0.3, tone: '#999999' },
    
    // Drawing Papers
    'strathmore-400-drawing': { name: 'Strathmore 400 Drawing', roughness: 0.25, grain: 0.15 },
    'canson-foundation-drawing': { name: 'Canson Foundation Drawing', roughness: 0.27, grain: 0.17 },
    
    // Generic
    'canvas': { name: 'Generic Canvas', roughness: 0.5, grain: 0.4, pattern: 'weave' },
    'paper': { name: 'Generic Paper', roughness: 0.3, grain: 0.2 },
    'linen': { name: 'Generic Linen', roughness: 0.48, grain: 0.38, pattern: 'weave' },
    'rough': { name: 'Generic Rough', roughness: 0.6, grain: 0.5 }
};

// Read brush presets from renderer.js to generate preview images for all brushes
const rendererContent = fs.readFileSync('./src/renderer.js', 'utf8');

// Extract brushPresets object
const brushPresetsMatch = rendererContent.match(/const brushPresets = \{([\s\S]*?)\n\};/);
if (!brushPresetsMatch) {
    console.error('Could not find brushPresets in renderer.js');
    process.exit(1);
}

// Parse brush definitions
const brushStrokes = {};
const brushPresetsText = brushPresetsMatch[1];
const lines = brushPresetsText.split('\n');

for (const line of lines) {
    const match = line.match(/'([^']+)':\s*\{\s*size:\s*(\d+),\s*opacity:\s*(\d+),\s*hardness:\s*(\d+)/);
    if (match) {
        const [, brushKey, size, opacity, hardness] = match;
        
        // Determine brush type from key name and properties
        let type = 'round';
        let name = brushKey.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        
        // Categorize brushes by type based on name patterns
        if (brushKey.includes('watercolor') || brushKey.includes('wash') || brushKey.includes('wet-blend')) {
            type = 'watercolor';
        } else if (brushKey.includes('oil') || brushKey.includes('impasto')) {
            type = 'oil';
        } else if (brushKey.includes('acrylic')) {
            type = 'acrylic';
        } else if (brushKey.includes('graphite') || brushKey.includes('pencil') || brushKey.includes('charcoal') || brushKey.includes('sketch')) {
            type = 'graphite';
        } else if (brushKey.includes('ink') || brushKey.includes('pen') || brushKey.includes('calligraphy')) {
            type = 'ink';
        } else if (brushKey.includes('marker')) {
            type = 'marker';
        } else if (brushKey.includes('airbrush') || brushKey.includes('spray') || brushKey.includes('mist') || brushKey.includes('fog')) {
            type = 'airbrush';
        } else if (brushKey.includes('knife') || brushKey.includes('scraper')) {
            type = 'palette-knife';
        } else if (brushKey.includes('pastel') || brushKey.includes('crayon') || brushKey.includes('conte')) {
            type = 'pastel';
        } else if (brushKey.includes('texture') || brushKey.includes('sponge') || brushKey.includes('stipple')) {
            type = 'texture';
        } else if (brushKey.includes('glow') || brushKey.includes('sparkle') || brushKey.includes('star') || brushKey.includes('lightning') || brushKey.includes('fire')) {
            type = 'effect';
        } else if (brushKey.includes('soft')) {
            type = 'soft';
        } else if (brushKey.includes('hard')) {
            type = 'hard';
        } else if (parseInt(hardness) < 30) {
            type = 'soft';
        } else if (parseInt(hardness) > 80) {
            type = 'hard';
        }
        
        brushStrokes[brushKey] = {
            name: name,
            type: type,
            size: parseInt(size),
            opacity: parseInt(opacity),
            hardness: parseInt(hardness)
        };
    }
}

console.log(`Loaded ${Object.keys(brushStrokes).length} brushes from renderer.js`);

/**
 * Generate a paper texture preview image
 */
function generatePaperTexture(paperKey, paperInfo) {
    const width = 200;
    const height = 150;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Base color (white or toned)
    const baseColor = paperInfo.tone || '#FFFFFF';
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, width, height);
    
    // Generate texture based on paper type
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            
            let noise = 0;
            
            if (paperInfo.pattern === 'weave') {
                // Canvas/linen weave pattern
                const weaveX = Math.sin(x * 0.2) * paperInfo.grain * 40;
                const weaveY = Math.sin(y * 0.2) * paperInfo.grain * 40;
                noise = (weaveX + weaveY) + (Math.random() - 0.5) * paperInfo.roughness * 30;
            } else {
                // Paper grain texture
                noise = (Math.random() - 0.5) * paperInfo.roughness * 50;
                // Add some structure
                noise += Math.sin(x * 0.1) * Math.cos(y * 0.1) * paperInfo.grain * 20;
            }
            
            // Apply noise to RGB channels
            data[i] = Math.max(0, Math.min(255, data[i] + noise));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Add paper name label at bottom
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, height - 25, width, 25);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(paperInfo.name, width / 2, height - 8);
    
    return canvas.toBuffer('image/png');
}

/**
 * Generate a brush stroke example image
 */
function generateBrushStroke(brushKey, brushInfo) {
    const width = 200;
    const height = 80;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    
    // Draw example stroke
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    const startX = 20;
    const startY = height / 2;
    const endX = width - 20;
    const endY = height / 2;
    
    // Set stroke style based on brush type
    switch (brushInfo.type) {
        case 'hard':
            ctx.strokeStyle = `rgba(0, 0, 0, ${brushInfo.opacity / 100})`;
            ctx.lineWidth = brushInfo.size;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            break;
            
        case 'soft':
            // Multiple passes for soft effect
            for (let i = 0; i < 5; i++) {
                const alpha = (brushInfo.opacity / 100) * (1 - i / 5) * 0.3;
                ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
                ctx.lineWidth = brushInfo.size + i * 4;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
            break;
            
        case 'graphite':
            // Textured graphite stroke
            ctx.strokeStyle = `rgba(0, 0, 0, ${brushInfo.opacity / 100})`;
            ctx.lineWidth = brushInfo.size;
            for (let x = startX; x < endX; x += 2) {
                const y = startY + (Math.random() - 0.5) * 2;
                const opacity = (brushInfo.opacity / 100) * (0.8 + Math.random() * 0.2);
                ctx.globalAlpha = opacity;
                ctx.fillRect(x, y - brushInfo.size / 2, 2, brushInfo.size);
            }
            ctx.globalAlpha = 1;
            break;
            
        case 'pastel':
            // Chalky pastel texture
            ctx.strokeStyle = `rgba(150, 100, 180, ${brushInfo.opacity / 100})`;
            ctx.lineWidth = brushInfo.size;
            for (let x = startX; x < endX; x += 3) {
                const y = startY + (Math.random() - 0.5) * 3;
                const opacity = (brushInfo.opacity / 100) * (0.7 + Math.random() * 0.3);
                ctx.globalAlpha = opacity;
                ctx.fillRect(x, y - brushInfo.size / 2, 3, brushInfo.size);
            }
            ctx.globalAlpha = 1;
            break;
            
        case 'watercolor':
            // Watercolor with soft edges and bleeding
            const gradient = ctx.createLinearGradient(startX, 0, endX, 0);
            gradient.addColorStop(0, `rgba(100, 150, 200, 0)`);
            gradient.addColorStop(0.5, `rgba(100, 150, 200, ${brushInfo.opacity / 100})`);
            gradient.addColorStop(1, `rgba(100, 150, 200, 0)`);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = brushInfo.size;
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'rgba(100, 150, 200, 0.3)';
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            ctx.shadowBlur = 0;
            break;
            
        case 'oil':
            // Oil paint with texture
            ctx.strokeStyle = `rgba(150, 50, 50, ${brushInfo.opacity / 100})`;
            ctx.lineWidth = brushInfo.size;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            // Add impasto effect
            for (let i = 0; i < 20; i++) {
                const x = startX + (endX - startX) * Math.random();
                const y = startY + (Math.random() - 0.5) * brushInfo.size * 0.3;
                ctx.fillStyle = `rgba(150, 50, 50, ${Math.random() * 0.3})`;
                ctx.fillRect(x, y, 2, 2);
            }
            break;
            
        case 'palette-knife':
            // Angular palette knife stroke
            ctx.fillStyle = `rgba(150, 100, 50, ${brushInfo.opacity / 100})`;
            ctx.beginPath();
            ctx.moveTo(startX, startY - brushInfo.size / 2);
            ctx.lineTo(endX, startY - brushInfo.size / 3);
            ctx.lineTo(endX, startY + brushInfo.size / 3);
            ctx.lineTo(startX, startY + brushInfo.size / 2);
            ctx.closePath();
            ctx.fill();
            break;
            
        case 'acrylic':
            // Acrylic with crisp edges
            ctx.strokeStyle = `rgba(200, 100, 50, ${brushInfo.opacity / 100})`;
            ctx.lineWidth = brushInfo.size;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            break;
            
        case 'ink':
        case 'marker':
            // Sharp ink line
            ctx.strokeStyle = `rgba(0, 0, 0, ${brushInfo.opacity / 100})`;
            ctx.lineWidth = brushInfo.size;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            break;
            
        case 'airbrush':
            // Diffuse airbrush spray
            for (let i = 0; i < 100; i++) {
                const x = startX + (endX - startX) * Math.random();
                const y = startY + (Math.random() - 0.5) * brushInfo.size;
                const alpha = (brushInfo.opacity / 100) * Math.random() * 0.3;
                ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
                ctx.fillRect(x, y, 1, 1);
            }
            break;
            
        case 'texture':
            // Textured stamp-like stroke
            for (let x = startX; x < endX; x += 5) {
                for (let dy = -brushInfo.size / 2; dy < brushInfo.size / 2; dy += 5) {
                    if (Math.random() > 0.5) {
                        const opacity = (brushInfo.opacity / 100) * Math.random() * 0.8;
                        ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
                        ctx.fillRect(x, startY + dy, 4, 4);
                    }
                }
            }
            break;
            
        case 'effect':
            // Special effect with particles
            for (let i = 0; i < 50; i++) {
                const x = startX + (endX - startX) * Math.random();
                const y = startY + (Math.random() - 0.5) * brushInfo.size * 1.5;
                const size = Math.random() * 3 + 1;
                const alpha = (brushInfo.opacity / 100) * Math.random();
                ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
            
        default:
            // Default round brush
            const hardness = brushInfo.hardness || 50;
            if (hardness < 30) {
                // Soft brush
                for (let i = 0; i < 5; i++) {
                    const alpha = (brushInfo.opacity / 100) * (1 - i / 5) * 0.3;
                    ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
                    ctx.lineWidth = brushInfo.size + i * 4;
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();
                }
            } else {
                // Round brush
                ctx.strokeStyle = `rgba(0, 0, 0, ${brushInfo.opacity / 100})`;
                ctx.lineWidth = brushInfo.size;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
    }
    
    // Add brush name label at bottom
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(240, 240, 240, 0.9)';
    ctx.fillRect(0, height - 20, width, 20);
    ctx.fillStyle = '#000000';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(brushInfo.name, width / 2, height - 6);
    
    return canvas.toBuffer('image/png');
}

// Main execution
console.log('Generating paper texture preview images...');
const papersDir = './src/assets/papers';
if (!fs.existsSync(papersDir)) {
    fs.mkdirSync(papersDir, { recursive: true });
}

let paperCount = 0;
for (const [key, info] of Object.entries(paperTextures)) {
    try {
        const buffer = generatePaperTexture(key, info);
        fs.writeFileSync(`${papersDir}/${key}.png`, buffer);
        paperCount++;
        console.log(`✓ Generated: ${info.name}`);
    } catch (error) {
        console.error(`✗ Failed to generate ${key}:`, error.message);
    }
}

console.log(`\nGenerated ${paperCount} paper texture images.`);

console.log('\nGenerating brush stroke example images...');
const brushesDir = './src/assets/brushes';
if (!fs.existsSync(brushesDir)) {
    fs.mkdirSync(brushesDir, { recursive: true });
}

let brushCount = 0;
for (const [key, info] of Object.entries(brushStrokes)) {
    try {
        const buffer = generateBrushStroke(key, info);
        fs.writeFileSync(`${brushesDir}/${key}.png`, buffer);
        brushCount++;
        console.log(`✓ Generated: ${info.name}`);
    } catch (error) {
        console.error(`✗ Failed to generate ${key}:`, error.message);
    }
}

console.log(`\nGenerated ${brushCount} brush stroke images.`);
console.log('\n✅ Image generation complete!');
