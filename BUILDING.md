# Building ARTemis-Professional

This document provides detailed instructions for building ARTemis-Professional on different platforms.

## Prerequisites

### All Platforms
- CMake 3.10 or higher
- C++17 compatible compiler
- Git (for cloning the repository)

### Platform-Specific Requirements

#### Linux
- GCC 7+ or Clang 5+
- SDL2 development libraries

#### macOS
- Xcode Command Line Tools or Clang
- SDL2 (via Homebrew or from source)

#### Windows
- Visual Studio 2017 or later (with C++ support)
- SDL2 development libraries

## Installing Dependencies

### Ubuntu/Debian Linux

```bash
sudo apt-get update
sudo apt-get install build-essential cmake libsdl2-dev git
```

### Fedora/Red Hat Linux

```bash
sudo dnf install gcc-c++ cmake SDL2-devel git
```

### macOS

Using Homebrew:
```bash
brew install cmake sdl2
```

Ensure Xcode Command Line Tools are installed:
```bash
xcode-select --install
```

### Windows

1. Download and install CMake from https://cmake.org/download/
2. Download SDL2 development libraries from https://www.libsdl.org/download-2.0.php
   - For Visual Studio, download the "SDL2-devel-2.x.x-VC.zip"
   - Extract to a known location (e.g., C:\SDL2)
3. Install Visual Studio 2017 or later with C++ support

## Building from Source

### Linux/macOS

```bash
# Clone the repository
git clone https://github.com/mllinman/ARTemis-Professional.git
cd ARTemis-Professional

# Create build directory
mkdir build
cd build

# Configure with CMake
cmake ..

# Build
make -j$(nproc)

# Optionally install system-wide
sudo make install
```

### Windows with Visual Studio

```bash
# Clone the repository
git clone https://github.com/mllinman/ARTemis-Professional.git
cd ARTemis-Professional

# Create build directory
mkdir build
cd build

# Configure with CMake (adjust SDL2 path as needed)
cmake .. -DSDL2_DIR="C:\SDL2\cmake"

# Build
cmake --build . --config Release

# The executable will be in build\Release\artemis.exe
```

### Windows with MinGW

```bash
# Clone the repository
git clone https://github.com/mllinman/ARTemis-Professional.git
cd ARTemis-Professional

# Create build directory
mkdir build
cd build

# Configure with CMake
cmake .. -G "MinGW Makefiles"

# Build
mingw32-make

# The executable will be in build\artemis.exe
```

## Running the Application

### Linux/macOS

```bash
# From the build directory
./artemis

# Or if installed system-wide
artemis
```

### Windows

```bash
# From the build directory
Release\artemis.exe

# Or double-click artemis.exe in Windows Explorer
```

Note: On Windows, you may need to copy SDL2.dll to the same directory as artemis.exe, or add the SDL2 bin directory to your PATH.

## Build Options

You can customize the build with CMake options:

```bash
# Debug build
cmake .. -DCMAKE_BUILD_TYPE=Debug

# Release build with optimizations
cmake .. -DCMAKE_BUILD_TYPE=Release

# Specify custom install prefix
cmake .. -DCMAKE_INSTALL_PREFIX=/usr/local

# Use specific C++ compiler
cmake .. -DCMAKE_CXX_COMPILER=clang++
```

## Troubleshooting

### SDL2 not found

If CMake cannot find SDL2, you can manually specify its location:

```bash
cmake .. -DSDL2_DIR=/path/to/sdl2
```

### Compiler errors

Ensure you have a C++17 compatible compiler:
- GCC 7.0+
- Clang 5.0+
- Visual Studio 2017+

### Linking errors on Linux

If you get linking errors related to SDL2, try:

```bash
sudo apt-get install libsdl2-2.0-0
```

### macOS Catalina or later security warnings

If you get security warnings when running the application, you may need to allow it in System Preferences > Security & Privacy.

## Clean Build

To perform a clean build:

```bash
# Remove build directory
rm -rf build

# Create new build directory and rebuild
mkdir build
cd build
cmake ..
make
```

## Development Build

For development with debugging symbols:

```bash
mkdir build-debug
cd build-debug
cmake .. -DCMAKE_BUILD_TYPE=Debug
make
```

This will create a debug build with symbols for debugging with GDB or LLDB.
