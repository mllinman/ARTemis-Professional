#ifndef GUI_H
#define GUI_H

#include <SDL2/SDL.h>
#include "DrawingTool.h"
#include "ColorPicker.h"
#include <string>
#include <functional>

class GUI {
public:
    GUI(SDL_Renderer* renderer, int windowWidth, int windowHeight);
    ~GUI();
    
    void render();
    void handleEvent(SDL_Event& event);
    
    // Check if mouse is over GUI elements
    bool isMouseOverGUI(int x, int y);
    
    // Callbacks
    void setToolCallback(std::function<void(ToolType)> callback);
    void setColorCallback(std::function<void(SDL_Color)> callback);
    void setBrushSizeCallback(std::function<void(int)> callback);
    void setSaveCallback(std::function<void()> callback);
    void setLoadCallback(std::function<void()> callback);
    void setClearCallback(std::function<void()> callback);
    
    void setCurrentTool(ToolType tool);
    void setCurrentColor(SDL_Color color);
    void setCurrentBrushSize(int size);
    
private:
    SDL_Renderer* renderer;
    int windowWidth;
    int windowHeight;
    
    // GUI layout
    SDL_Rect toolbarRect;
    SDL_Rect colorPaletteRect;
    SDL_Rect brushSizeRect;
    
    ToolType currentTool;
    SDL_Color currentColor;
    int currentBrushSize;
    
    // Callbacks
    std::function<void(ToolType)> onToolChange;
    std::function<void(SDL_Color)> onColorChange;
    std::function<void(int)> onBrushSizeChange;
    std::function<void()> onSave;
    std::function<void()> onLoad;
    std::function<void()> onClear;
    
    // Helper methods
    void renderToolbar();
    void renderColorPalette();
    void renderBrushSizeSelector();
    void renderButton(SDL_Rect rect, const char* label, bool selected = false);
    void renderText(const char* text, int x, int y);
};

#endif // GUI_H
