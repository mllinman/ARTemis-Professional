#ifndef DRAWING_TOOL_H
#define DRAWING_TOOL_H

#include <SDL2/SDL.h>
#include <string>
#include <vector>

enum class ToolType {
    BRUSH,
    ERASER,
    LINE,
    RECTANGLE,
    CIRCLE,
    FILL
};

struct Point {
    int x;
    int y;
};

class DrawingTool {
public:
    DrawingTool();
    
    void setToolType(ToolType type);
    ToolType getToolType() const;
    
    void setBrushSize(int size);
    int getBrushSize() const;
    
    void setColor(Uint8 r, Uint8 g, Uint8 b, Uint8 a = 255);
    SDL_Color getColor() const;
    
    void startDrawing(int x, int y);
    void continueDrawing(int x, int y);
    void endDrawing(int x, int y);
    
    bool isDrawing() const;
    
    Point getStartPoint() const;
    Point getCurrentPoint() const;
    
private:
    ToolType currentTool;
    int brushSize;
    SDL_Color color;
    bool drawing;
    Point startPoint;
    Point currentPoint;
};

#endif // DRAWING_TOOL_H
