#ifndef COLOR_PICKER_H
#define COLOR_PICKER_H

#include <SDL2/SDL.h>
#include <vector>

class ColorPicker {
public:
    ColorPicker();
    
    void setColor(Uint8 r, Uint8 g, Uint8 b, Uint8 a = 255);
    SDL_Color getColor() const;
    
    void setRed(Uint8 r);
    void setGreen(Uint8 g);
    void setBlue(Uint8 b);
    void setAlpha(Uint8 a);
    
    Uint8 getRed() const;
    Uint8 getGreen() const;
    Uint8 getBlue() const;
    Uint8 getAlpha() const;
    
    // Predefined color palette
    static std::vector<SDL_Color> getDefaultPalette();
    
private:
    SDL_Color currentColor;
};

#endif // COLOR_PICKER_H
