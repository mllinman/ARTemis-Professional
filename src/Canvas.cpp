#include "Canvas.h"
#include "FileIO.h"
#include <algorithm>
#include <cmath>

Canvas::Canvas(int w, int h) 
    : surface(nullptr)
    , texture(nullptr)
    , width(w)
    , height(h)
    , needsUpdate(true) {
    
    // Create a 32-bit surface
    surface = SDL_CreateRGBSurface(0, width, height, 32,
                                   0x00FF0000,
                                   0x0000FF00,
                                   0x000000FF,
                                   0xFF000000);
    
    if (surface) {
        // Initialize with white background
        SDL_FillRect(surface, nullptr, SDL_MapRGB(surface->format, 255, 255, 255));
    }
}

Canvas::~Canvas() {
    if (texture) {
        SDL_DestroyTexture(texture);
    }
    if (surface) {
        SDL_FreeSurface(surface);
    }
}

void Canvas::clear(SDL_Color color) {
    if (surface) {
        SDL_FillRect(surface, nullptr, SDL_MapRGB(surface->format, color.r, color.g, color.b));
        needsUpdate = true;
    }
}

void Canvas::drawPoint(int x, int y, SDL_Color color, int size) {
    if (!surface || x < 0 || x >= width || y < 0 || y >= height) {
        return;
    }
    
    SDL_LockSurface(surface);
    
    int halfSize = size / 2;
    for (int dy = -halfSize; dy <= halfSize; dy++) {
        for (int dx = -halfSize; dx <= halfSize; dx++) {
            int px = x + dx;
            int py = y + dy;
            
            if (px >= 0 && px < width && py >= 0 && py < height) {
                // Check if point is within circular brush
                if (dx * dx + dy * dy <= halfSize * halfSize) {
                    Uint32* pixels = static_cast<Uint32*>(surface->pixels);
                    pixels[py * (surface->pitch / 4) + px] = SDL_MapRGB(surface->format, color.r, color.g, color.b);
                }
            }
        }
    }
    
    SDL_UnlockSurface(surface);
    needsUpdate = true;
}

void Canvas::drawLine(int x1, int y1, int x2, int y2, SDL_Color color, int size) {
    // Bresenham's line algorithm
    int dx = abs(x2 - x1);
    int dy = abs(y2 - y1);
    int sx = x1 < x2 ? 1 : -1;
    int sy = y1 < y2 ? 1 : -1;
    int err = dx - dy;
    
    int x = x1;
    int y = y1;
    
    while (true) {
        drawPoint(x, y, color, size);
        
        if (x == x2 && y == y2) {
            break;
        }
        
        int e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x += sx;
        }
        if (e2 < dx) {
            err += dx;
            y += sy;
        }
    }
}

void Canvas::drawRectangle(int x1, int y1, int x2, int y2, SDL_Color color, int size, bool filled) {
    if (filled) {
        // Draw filled rectangle
        int minX = std::min(x1, x2);
        int maxX = std::max(x1, x2);
        int minY = std::min(y1, y2);
        int maxY = std::max(y1, y2);
        
        for (int y = minY; y <= maxY; y++) {
            for (int x = minX; x <= maxX; x++) {
                drawPoint(x, y, color, 1);
            }
        }
    } else {
        // Draw rectangle outline
        drawLine(x1, y1, x2, y1, color, size); // Top
        drawLine(x2, y1, x2, y2, color, size); // Right
        drawLine(x2, y2, x1, y2, color, size); // Bottom
        drawLine(x1, y2, x1, y1, color, size); // Left
    }
}

void Canvas::plotCirclePoints(int centerX, int centerY, int x, int y, SDL_Color color) {
    drawPoint(centerX + x, centerY + y, color, 1);
    drawPoint(centerX - x, centerY + y, color, 1);
    drawPoint(centerX + x, centerY - y, color, 1);
    drawPoint(centerX - x, centerY - y, color, 1);
    drawPoint(centerX + y, centerY + x, color, 1);
    drawPoint(centerX - y, centerY + x, color, 1);
    drawPoint(centerX + y, centerY - x, color, 1);
    drawPoint(centerX - y, centerY - x, color, 1);
}

void Canvas::drawCircle(int centerX, int centerY, int radius, SDL_Color color, int size, bool filled) {
    if (filled) {
        // Draw filled circle
        for (int y = -radius; y <= radius; y++) {
            for (int x = -radius; x <= radius; x++) {
                if (x * x + y * y <= radius * radius) {
                    drawPoint(centerX + x, centerY + y, color, 1);
                }
            }
        }
    } else {
        // Midpoint circle algorithm
        int x = 0;
        int y = radius;
        int d = 1 - radius;
        
        while (x <= y) {
            plotCirclePoints(centerX, centerY, x, y, color);
            
            if (d < 0) {
                d += 2 * x + 3;
            } else {
                d += 2 * (x - y) + 5;
                y--;
            }
            x++;
        }
    }
}

void Canvas::render(SDL_Renderer* renderer) {
    if (!surface || !renderer) {
        return;
    }
    
    if (needsUpdate || !texture) {
        updateTexture(renderer);
    }
    
    if (texture) {
        SDL_RenderCopy(renderer, texture, nullptr, nullptr);
    }
}

void Canvas::updateTexture(SDL_Renderer* renderer) {
    if (texture) {
        SDL_DestroyTexture(texture);
    }
    
    texture = SDL_CreateTextureFromSurface(renderer, surface);
    needsUpdate = false;
}

SDL_Surface* Canvas::getSurface() {
    return surface;
}

int Canvas::getWidth() const {
    return width;
}

int Canvas::getHeight() const {
    return height;
}

bool Canvas::saveToFile(const char* filename) {
    return FileIO::saveBMP(surface, filename);
}

bool Canvas::loadFromFile(const char* filename) {
    SDL_Surface* loadedSurface = FileIO::loadBMP(filename);
    if (!loadedSurface) {
        return false;
    }
    
    // Replace current surface
    if (surface) {
        SDL_FreeSurface(surface);
    }
    
    surface = loadedSurface;
    width = surface->w;
    height = surface->h;
    needsUpdate = true;
    
    return true;
}
