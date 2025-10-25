# ARTemis-Professional

Advanced digital art program built in C++

## Overview

ARTemis-Professional is a cross-platform digital art application written in C++ using SDL2. It provides a canvas for digital painting with various drawing tools, color selection, and file I/O capabilities.

## Features

- **Drawing Tools:**
  - Brush - freehand drawing
  - Eraser - remove content
  - Line - draw straight lines
  - Rectangle - draw rectangles
  - Circle - draw circles

- **Color Palette:**
  - 12 predefined colors
  - Easy color selection

- **File Operations:**
  - Save artwork as BMP files
  - Load existing BMP files
  - Clear canvas

- **User Interface:**
  - Intuitive toolbar
  - Color palette
  - Brush size indicator
  - Real-time shape preview

## Requirements

- CMake 3.10 or higher
- C++17 compatible compiler (GCC, Clang, or MSVC)
- SDL2 library

## Building

### Linux/macOS

```bash
# Install SDL2
# On Ubuntu/Debian:
sudo apt-get install libsdl2-dev

# On macOS with Homebrew:
brew install sdl2

# Build the application
mkdir build
cd build
cmake ..
make

# Run the application
./artemis
```

### Windows

```bash
# Install SDL2 (download from https://www.libsdl.org/)
# Set SDL2_DIR environment variable to SDL2 installation path

# Build with Visual Studio
mkdir build
cd build
cmake ..
cmake --build . --config Release

# Run the application
Release\artemis.exe
```

## Usage

### Mouse Controls
- Left-click and drag to draw with the selected tool
- Click toolbar buttons to select different tools
- Click color swatches to change drawing color
- Click Save/Load/Clear buttons for file operations

### Keyboard Shortcuts
- `1` - Select Brush tool
- `2` - Select Eraser tool
- `3` - Select Line tool
- `4` - Select Rectangle tool
- `5` - Select Circle tool
- `S` - Save canvas
- `L` - Load canvas
- `C` - Clear canvas
- `ESC` - Exit application

## Project Structure

```
ARTemis-Professional/
├── CMakeLists.txt          # Build configuration
├── README.md               # This file
├── include/                # Header files
│   ├── Application.h       # Main application class
│   ├── Canvas.h           # Drawing canvas
│   ├── ColorPicker.h      # Color selection
│   ├── DrawingTool.h      # Drawing tools
│   ├── FileIO.h           # File operations
│   └── GUI.h              # User interface
├── src/                   # Source files
│   ├── main.cpp           # Entry point
│   ├── Application.cpp
│   ├── Canvas.cpp
│   ├── ColorPicker.cpp
│   ├── DrawingTool.cpp
│   ├── FileIO.cpp
│   └── GUI.cpp
└── assets/                # Asset files (if any)
```

## Architecture

The application follows object-oriented design principles with clear separation of concerns:

- **Application**: Main application controller, handles initialization and main loop
- **Canvas**: Manages the drawing surface and rendering
- **DrawingTool**: Handles different drawing tool behaviors
- **ColorPicker**: Manages color selection
- **GUI**: Renders and handles user interface elements
- **FileIO**: Handles file save/load operations

## Future Enhancements

- Multiple layers support
- Undo/redo functionality
- More drawing tools (fill bucket, selection tools)
- Brush customization (opacity, texture)
- PNG/JPG support
- Tablet pressure sensitivity
- Custom color picker with RGB sliders
- Keyboard shortcuts customization

## License

This project is provided as-is for educational and personal use.

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.
