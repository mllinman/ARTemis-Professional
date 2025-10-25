#ifndef CANVAS_H
#define CANVAS_H

#include <SDL2/SDL.h>
#include "DrawingTool.h"
#include <memory>

class Canvas {
public:
    Canvas(int width, int height);
    ~Canvas();
    
    void clear(SDL_Color color);
    void drawPoint(int x, int y, SDL_Color color, int size);
    void drawLine(int x1, int y1, int x2, int y2, SDL_Color color, int size);
    void drawRectangle(int x1, int y1, int x2, int y2, SDL_Color color, int size, bool filled);
    void drawCircle(int centerX, int centerY, int radius, SDL_Color color, int size, bool filled);
    
    void render(SDL_Renderer* renderer);
    
    SDL_Surface* getSurface();
    
    int getWidth() const;
    int getHeight() const;
    
    bool saveToFile(const char* filename);
    bool loadFromFile(const char* filename);
    
private:
    SDL_Surface* surface;
    SDL_Texture* texture;
    int width;
    int height;
    bool needsUpdate;
    
    void updateTexture(SDL_Renderer* renderer);
    void plotCirclePoints(int centerX, int centerY, int x, int y, SDL_Color color);
};

#endif // CANVAS_H
