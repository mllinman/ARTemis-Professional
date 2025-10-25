#ifndef FILE_IO_H
#define FILE_IO_H

#include <SDL2/SDL.h>
#include <string>

class FileIO {
public:
    static bool saveBMP(SDL_Surface* surface, const std::string& filename);
    static SDL_Surface* loadBMP(const std::string& filename);
    
    // Save as PPM format (simple text-based format)
    static bool savePPM(SDL_Surface* surface, const std::string& filename);
    static SDL_Surface* loadPPM(const std::string& filename);
};

#endif // FILE_IO_H
