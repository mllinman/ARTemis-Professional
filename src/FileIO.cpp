#include "FileIO.h"
#include <fstream>

bool FileIO::saveBMP(SDL_Surface* surface, const std::string& filename) {
    if (!surface) {
        return false;
    }
    return SDL_SaveBMP(surface, filename.c_str()) == 0;
}

SDL_Surface* FileIO::loadBMP(const std::string& filename) {
    return SDL_LoadBMP(filename.c_str());
}

bool FileIO::savePPM(SDL_Surface* surface, const std::string& filename) {
    if (!surface) {
        return false;
    }
    
    std::ofstream file(filename, std::ios::binary);
    if (!file.is_open()) {
        return false;
    }
    
    // Write PPM header
    file << "P6\n";
    file << surface->w << " " << surface->h << "\n";
    file << "255\n";
    
    // Lock surface for pixel access
    SDL_LockSurface(surface);
    
    Uint8* pixels = static_cast<Uint8*>(surface->pixels);
    int bytesPerPixel = surface->format->BytesPerPixel;
    
    for (int y = 0; y < surface->h; y++) {
        for (int x = 0; x < surface->w; x++) {
            Uint8* pixel = pixels + y * surface->pitch + x * bytesPerPixel;
            Uint32 pixelValue;
            
            if (bytesPerPixel == 4) {
                pixelValue = *reinterpret_cast<Uint32*>(pixel);
            } else if (bytesPerPixel == 3) {
                pixelValue = pixel[0] | (pixel[1] << 8) | (pixel[2] << 16);
            } else {
                continue;
            }
            
            Uint8 r, g, b;
            SDL_GetRGB(pixelValue, surface->format, &r, &g, &b);
            
            file.write(reinterpret_cast<char*>(&r), 1);
            file.write(reinterpret_cast<char*>(&g), 1);
            file.write(reinterpret_cast<char*>(&b), 1);
        }
    }
    
    SDL_UnlockSurface(surface);
    file.close();
    
    return true;
}

SDL_Surface* FileIO::loadPPM(const std::string& filename) {
    std::ifstream file(filename, std::ios::binary);
    if (!file.is_open()) {
        return nullptr;
    }
    
    // Read PPM header
    std::string format;
    int width, height, maxVal;
    
    file >> format;
    if (format != "P6") {
        return nullptr;
    }
    
    file >> width >> height >> maxVal;
    file.get(); // Skip the newline
    
    if (maxVal != 255) {
        return nullptr;
    }
    
    // Create surface
    SDL_Surface* surface = SDL_CreateRGBSurface(0, width, height, 32,
                                                 0x00FF0000,
                                                 0x0000FF00,
                                                 0x000000FF,
                                                 0xFF000000);
    if (!surface) {
        return nullptr;
    }
    
    SDL_LockSurface(surface);
    
    Uint8* pixels = static_cast<Uint8*>(surface->pixels);
    
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            Uint8 rgb[3];
            file.read(reinterpret_cast<char*>(rgb), 3);
            
            Uint32* pixel = reinterpret_cast<Uint32*>(pixels + y * surface->pitch + x * 4);
            *pixel = SDL_MapRGB(surface->format, rgb[0], rgb[1], rgb[2]);
        }
    }
    
    SDL_UnlockSurface(surface);
    file.close();
    
    return surface;
}
