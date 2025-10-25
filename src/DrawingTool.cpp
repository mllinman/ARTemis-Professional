#include "DrawingTool.h"

DrawingTool::DrawingTool() 
    : currentTool(ToolType::BRUSH)
    , brushSize(5)
    , color({0, 0, 0, 255})
    , drawing(false)
    , startPoint({0, 0})
    , currentPoint({0, 0}) {
}

void DrawingTool::setToolType(ToolType type) {
    currentTool = type;
}

ToolType DrawingTool::getToolType() const {
    return currentTool;
}

void DrawingTool::setBrushSize(int size) {
    if (size > 0) {
        brushSize = size;
    }
}

int DrawingTool::getBrushSize() const {
    return brushSize;
}

void DrawingTool::setColor(Uint8 r, Uint8 g, Uint8 b, Uint8 a) {
    color = {r, g, b, a};
}

SDL_Color DrawingTool::getColor() const {
    return color;
}

void DrawingTool::startDrawing(int x, int y) {
    drawing = true;
    startPoint = {x, y};
    currentPoint = {x, y};
}

void DrawingTool::continueDrawing(int x, int y) {
    if (drawing) {
        currentPoint = {x, y};
    }
}

void DrawingTool::endDrawing(int x, int y) {
    if (drawing) {
        currentPoint = {x, y};
        drawing = false;
    }
}

bool DrawingTool::isDrawing() const {
    return drawing;
}

Point DrawingTool::getStartPoint() const {
    return startPoint;
}

Point DrawingTool::getCurrentPoint() const {
    return currentPoint;
}
