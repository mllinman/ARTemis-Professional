#ifndef APPLICATION_H
#define APPLICATION_H

#include <SDL2/SDL.h>
#include "Canvas.h"
#include "DrawingTool.h"
#include "ColorPicker.h"
#include "GUI.h"
#include <memory>
#include <string>

class Application {
public:
    Application();
    ~Application();
    
    bool initialize();
    void run();
    void cleanup();
    
private:
    // SDL components
    SDL_Window* window;
    SDL_Renderer* renderer;
    
    // Application components
    std::unique_ptr<Canvas> canvas;
    std::unique_ptr<DrawingTool> drawingTool;
    std::unique_ptr<ColorPicker> colorPicker;
    std::unique_ptr<GUI> gui;
    
    // Window properties
    int windowWidth;
    int windowHeight;
    int canvasOffsetX;
    int canvasOffsetY;
    
    // Application state
    bool running;
    bool mouseDown;
    int lastMouseX;
    int lastMouseY;
    
    // Event handling
    void handleEvents();
    void handleMouseDown(int x, int y);
    void handleMouseMove(int x, int y);
    void handleMouseUp(int x, int y);
    void handleKeyPress(SDL_Keycode key);
    
    // Rendering
    void render();
    
    // File operations
    void saveCanvas();
    void loadCanvas();
    void clearCanvas();
    
    // Utility
    bool isPointOnCanvas(int x, int y);
    void screenToCanvas(int screenX, int screenY, int& canvasX, int& canvasY);
};

#endif // APPLICATION_H
