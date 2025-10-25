#include "GUI.h"
#include "ColorPicker.h"
#include <algorithm>

GUI::GUI(SDL_Renderer* rend, int winWidth, int winHeight)
    : renderer(rend)
    , windowWidth(winWidth)
    , windowHeight(winHeight)
    , currentTool(ToolType::BRUSH)
    , currentColor({0, 0, 0, 255})
    , currentBrushSize(5) {
    
    // Define GUI layout
    toolbarRect = {0, 0, windowWidth, 50};
    colorPaletteRect = {0, windowHeight - 60, windowWidth, 60};
    brushSizeRect = {windowWidth - 100, 60, 100, 200};
}

GUI::~GUI() {
}

void GUI::render() {
    renderToolbar();
    renderColorPalette();
    renderBrushSizeSelector();
}

void GUI::renderToolbar() {
    // Draw toolbar background
    SDL_SetRenderDrawColor(renderer, 200, 200, 200, 255);
    SDL_RenderFillRect(renderer, &toolbarRect);
    
    // Tool buttons
    const int buttonWidth = 60;
    const int buttonHeight = 40;
    const int buttonSpacing = 10;
    int x = 10;
    int y = 5;
    
    // Brush button
    SDL_Rect brushRect = {x, y, buttonWidth, buttonHeight};
    renderButton(brushRect, "Brush", currentTool == ToolType::BRUSH);
    
    x += buttonWidth + buttonSpacing;
    SDL_Rect eraserRect = {x, y, buttonWidth, buttonHeight};
    renderButton(eraserRect, "Eraser", currentTool == ToolType::ERASER);
    
    x += buttonWidth + buttonSpacing;
    SDL_Rect lineRect = {x, y, buttonWidth, buttonHeight};
    renderButton(lineRect, "Line", currentTool == ToolType::LINE);
    
    x += buttonWidth + buttonSpacing;
    SDL_Rect rectRect = {x, y, buttonWidth, buttonHeight};
    renderButton(rectRect, "Rect", currentTool == ToolType::RECTANGLE);
    
    x += buttonWidth + buttonSpacing;
    SDL_Rect circleRect = {x, y, buttonWidth, buttonHeight};
    renderButton(circleRect, "Circle", currentTool == ToolType::CIRCLE);
    
    // File operations on the right side
    x = windowWidth - (buttonWidth + buttonSpacing) * 3;
    SDL_Rect saveRect = {x, y, buttonWidth, buttonHeight};
    renderButton(saveRect, "Save", false);
    
    x += buttonWidth + buttonSpacing;
    SDL_Rect loadRect = {x, y, buttonWidth, buttonHeight};
    renderButton(loadRect, "Load", false);
    
    x += buttonWidth + buttonSpacing;
    SDL_Rect clearRect = {x, y, buttonWidth, buttonHeight};
    renderButton(clearRect, "Clear", false);
}

void GUI::renderColorPalette() {
    // Draw color palette background
    SDL_SetRenderDrawColor(renderer, 180, 180, 180, 255);
    SDL_RenderFillRect(renderer, &colorPaletteRect);
    
    // Draw color swatches
    std::vector<SDL_Color> palette = ColorPicker::getDefaultPalette();
    const int swatchSize = 40;
    const int swatchSpacing = 10;
    int x = 10;
    int y = colorPaletteRect.y + 10;
    
    for (const auto& color : palette) {
        SDL_Rect swatchRect = {x, y, swatchSize, swatchSize};
        
        // Draw color swatch
        SDL_SetRenderDrawColor(renderer, color.r, color.g, color.b, color.a);
        SDL_RenderFillRect(renderer, &swatchRect);
        
        // Draw border
        SDL_SetRenderDrawColor(renderer, 0, 0, 0, 255);
        SDL_RenderDrawRect(renderer, &swatchRect);
        
        // Highlight current color
        if (currentColor.r == color.r && currentColor.g == color.g && currentColor.b == color.b) {
            SDL_Rect highlightRect = {x - 2, y - 2, swatchSize + 4, swatchSize + 4};
            SDL_SetRenderDrawColor(renderer, 255, 255, 0, 255);
            for (int i = 0; i < 3; i++) {
                SDL_RenderDrawRect(renderer, &highlightRect);
                highlightRect.x--;
                highlightRect.y--;
                highlightRect.w += 2;
                highlightRect.h += 2;
            }
        }
        
        x += swatchSize + swatchSpacing;
    }
}

void GUI::renderBrushSizeSelector() {
    // Draw background
    SDL_SetRenderDrawColor(renderer, 180, 180, 180, 255);
    SDL_RenderFillRect(renderer, &brushSizeRect);
    
    // Draw brush size preview
    int centerX = brushSizeRect.x + brushSizeRect.w / 2;
    int y = brushSizeRect.y + 30;
    
    // Draw circle representing brush size
    SDL_SetRenderDrawColor(renderer, currentColor.r, currentColor.g, currentColor.b, 255);
    int radius = currentBrushSize;
    for (int dy = -radius; dy <= radius; dy++) {
        for (int dx = -radius; dx <= radius; dx++) {
            if (dx * dx + dy * dy <= radius * radius) {
                SDL_RenderDrawPoint(renderer, centerX + dx, y + dy);
            }
        }
    }
}

void GUI::renderButton(SDL_Rect rect, const char* label, bool selected) {
    // Draw button background
    if (selected) {
        SDL_SetRenderDrawColor(renderer, 100, 150, 255, 255);
    } else {
        SDL_SetRenderDrawColor(renderer, 220, 220, 220, 255);
    }
    SDL_RenderFillRect(renderer, &rect);
    
    // Draw button border
    SDL_SetRenderDrawColor(renderer, 0, 0, 0, 255);
    SDL_RenderDrawRect(renderer, &rect);
    
    // Simple text rendering (just a placeholder - in real app would use SDL_ttf)
    renderText(label, rect.x + 5, rect.y + rect.h / 2 - 5);
}

void GUI::renderText(const char* text, int x, int y) {
    // Placeholder - would use SDL_ttf in production
    // For now, just indicate text position
    SDL_SetRenderDrawColor(renderer, 0, 0, 0, 255);
    SDL_Rect textRect = {x, y, 40, 10};
    SDL_RenderDrawRect(renderer, &textRect);
}

void GUI::handleEvent(SDL_Event& event) {
    if (event.type == SDL_MOUSEBUTTONDOWN && event.button.button == SDL_BUTTON_LEFT) {
        int x = event.button.x;
        int y = event.button.y;
        
        // Check toolbar clicks
        if (y >= toolbarRect.y && y <= toolbarRect.y + toolbarRect.h) {
            const int buttonWidth = 60;
            const int buttonSpacing = 10;
            int buttonX = 10;
            
            // Tool buttons
            if (x >= buttonX && x < buttonX + buttonWidth) {
                setCurrentTool(ToolType::BRUSH);
                if (onToolChange) onToolChange(ToolType::BRUSH);
            }
            buttonX += buttonWidth + buttonSpacing;
            
            if (x >= buttonX && x < buttonX + buttonWidth) {
                setCurrentTool(ToolType::ERASER);
                if (onToolChange) onToolChange(ToolType::ERASER);
            }
            buttonX += buttonWidth + buttonSpacing;
            
            if (x >= buttonX && x < buttonX + buttonWidth) {
                setCurrentTool(ToolType::LINE);
                if (onToolChange) onToolChange(ToolType::LINE);
            }
            buttonX += buttonWidth + buttonSpacing;
            
            if (x >= buttonX && x < buttonX + buttonWidth) {
                setCurrentTool(ToolType::RECTANGLE);
                if (onToolChange) onToolChange(ToolType::RECTANGLE);
            }
            buttonX += buttonWidth + buttonSpacing;
            
            if (x >= buttonX && x < buttonX + buttonWidth) {
                setCurrentTool(ToolType::CIRCLE);
                if (onToolChange) onToolChange(ToolType::CIRCLE);
            }
            
            // File operations
            buttonX = windowWidth - (buttonWidth + buttonSpacing) * 3;
            if (x >= buttonX && x < buttonX + buttonWidth) {
                if (onSave) onSave();
            }
            buttonX += buttonWidth + buttonSpacing;
            
            if (x >= buttonX && x < buttonX + buttonWidth) {
                if (onLoad) onLoad();
            }
            buttonX += buttonWidth + buttonSpacing;
            
            if (x >= buttonX && x < buttonX + buttonWidth) {
                if (onClear) onClear();
            }
        }
        
        // Check color palette clicks
        if (y >= colorPaletteRect.y && y <= colorPaletteRect.y + colorPaletteRect.h) {
            std::vector<SDL_Color> palette = ColorPicker::getDefaultPalette();
            const int swatchSize = 40;
            const int swatchSpacing = 10;
            int swatchX = 10;
            int swatchY = colorPaletteRect.y + 10;
            
            for (const auto& color : palette) {
                if (x >= swatchX && x < swatchX + swatchSize &&
                    y >= swatchY && y < swatchY + swatchSize) {
                    setCurrentColor(color);
                    if (onColorChange) onColorChange(color);
                    break;
                }
                swatchX += swatchSize + swatchSpacing;
            }
        }
    }
}

bool GUI::isMouseOverGUI(int x, int y) {
    // Check if mouse is over toolbar
    if (y >= toolbarRect.y && y <= toolbarRect.y + toolbarRect.h) {
        return true;
    }
    
    // Check if mouse is over color palette
    if (y >= colorPaletteRect.y && y <= colorPaletteRect.y + colorPaletteRect.h) {
        return true;
    }
    
    // Check if mouse is over brush size selector
    if (x >= brushSizeRect.x && x <= brushSizeRect.x + brushSizeRect.w &&
        y >= brushSizeRect.y && y <= brushSizeRect.y + brushSizeRect.h) {
        return true;
    }
    
    return false;
}

void GUI::setToolCallback(std::function<void(ToolType)> callback) {
    onToolChange = callback;
}

void GUI::setColorCallback(std::function<void(SDL_Color)> callback) {
    onColorChange = callback;
}

void GUI::setBrushSizeCallback(std::function<void(int)> callback) {
    onBrushSizeChange = callback;
}

void GUI::setSaveCallback(std::function<void()> callback) {
    onSave = callback;
}

void GUI::setLoadCallback(std::function<void()> callback) {
    onLoad = callback;
}

void GUI::setClearCallback(std::function<void()> callback) {
    onClear = callback;
}

void GUI::setCurrentTool(ToolType tool) {
    currentTool = tool;
}

void GUI::setCurrentColor(SDL_Color color) {
    currentColor = color;
}

void GUI::setCurrentBrushSize(int size) {
    currentBrushSize = size;
}
