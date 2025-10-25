#include "ColorPicker.h"

ColorPicker::ColorPicker() 
    : currentColor({0, 0, 0, 255}) {
}

void ColorPicker::setColor(Uint8 r, Uint8 g, Uint8 b, Uint8 a) {
    currentColor = {r, g, b, a};
}

SDL_Color ColorPicker::getColor() const {
    return currentColor;
}

void ColorPicker::setRed(Uint8 r) {
    currentColor.r = r;
}

void ColorPicker::setGreen(Uint8 g) {
    currentColor.g = g;
}

void ColorPicker::setBlue(Uint8 b) {
    currentColor.b = b;
}

void ColorPicker::setAlpha(Uint8 a) {
    currentColor.a = a;
}

Uint8 ColorPicker::getRed() const {
    return currentColor.r;
}

Uint8 ColorPicker::getGreen() const {
    return currentColor.g;
}

Uint8 ColorPicker::getBlue() const {
    return currentColor.b;
}

Uint8 ColorPicker::getAlpha() const {
    return currentColor.a;
}

std::vector<SDL_Color> ColorPicker::getDefaultPalette() {
    return {
        {0, 0, 0, 255},       // Black
        {255, 255, 255, 255}, // White
        {255, 0, 0, 255},     // Red
        {0, 255, 0, 255},     // Green
        {0, 0, 255, 255},     // Blue
        {255, 255, 0, 255},   // Yellow
        {255, 0, 255, 255},   // Magenta
        {0, 255, 255, 255},   // Cyan
        {128, 128, 128, 255}, // Gray
        {255, 128, 0, 255},   // Orange
        {128, 0, 128, 255},   // Purple
        {0, 128, 0, 255}      // Dark Green
    };
}
