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

// Brush stroke definitions
const brushStrokes = {
    // Basic Brushes
    'basic': { name: 'Basic', type: 'round', size: 20, opacity: 100 },
    'soft': { name: 'Soft', type: 'soft', size: 30, opacity: 80 },
    'hard': { name: 'Hard', type: 'hard', size: 20, opacity: 100 },
    'medium': { name: 'Medium', type: 'round', size: 25, opacity: 90 },
    'fine': { name: 'Fine', type: 'hard', size: 5, opacity: 100 },
    
    // Graphite Pencils
    'rebelle-graphite-hb': { name: 'HB Graphite', type: 'graphite', size: 8, opacity: 78 },
    'rebelle-graphite-2b': { name: '2B Graphite', type: 'graphite', size: 10, opacity: 82 },
    'rebelle-graphite-4b': { name: '4B Graphite', type: 'graphite', size: 12, opacity: 86 },
    'rebelle-graphite-6b': { name: '6B Graphite', type: 'graphite', size: 14, opacity: 90 },
    'rebelle-graphite-8b': { name: '8B Graphite', type: 'graphite', size: 16, opacity: 94 },
    'rebelle-graphite-h': { name: 'H Graphite', type: 'graphite', size: 6, opacity: 74 },
    'rebelle-graphite-2h': { name: '2H Graphite', type: 'graphite', size: 5, opacity: 70 },
    'rebelle-graphite-4h': { name: '4H Graphite', type: 'graphite', size: 4, opacity: 66 },
    
    // Watercolor
    'watercolor': { name: 'Watercolor', type: 'watercolor', size: 50, opacity: 35 },
    'watercolor-wet': { name: 'Watercolor Wet', type: 'watercolor', size: 60, opacity: 25 },
    'watercolor-dry': { name: 'Watercolor Dry', type: 'watercolor', size: 40, opacity: 50 },
    
    // Oil Paint
    'oil-paint': { name: 'Oil Paint', type: 'oil', size: 35, opacity: 90 },
    'oil-flat': { name: 'Oil Flat', type: 'oil-flat', size: 40, opacity: 92 },
    'palette-knife': { name: 'Palette Knife', type: 'palette-knife', size: 50, opacity: 95 },
    
    // Acrylic
    'acrylic': { name: 'Acrylic', type: 'acrylic', size: 30, opacity: 90 },
    'acrylic-flat': { name: 'Acrylic Flat', type: 'acrylic-flat', size: 38, opacity: 93 },
    
    // Ink
    'ink': { name: 'Ink', type: 'ink', size: 15, opacity: 100 },
    'ink-fine': { name: 'Ink Fine', type: 'ink', size: 8, opacity: 100 },
    'marker': { name: 'Marker', type: 'marker', size: 30, opacity: 85 }
};

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
            
        case 'watercolor':
            // Watercolor with soft edges
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
        case 'oil-flat':
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
        case 'acrylic-flat':
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
            
        default:
            // Default round brush
            ctx.strokeStyle = `rgba(0, 0, 0, ${brushInfo.opacity / 100})`;
            ctx.lineWidth = brushInfo.size;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
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
