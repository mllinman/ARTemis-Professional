#include "Application.h"
#include <iostream>

Application::Application()
    : window(nullptr)
    , renderer(nullptr)
    , windowWidth(1024)
    , windowHeight(768)
    , canvasOffsetX(0)
    , canvasOffsetY(50)
    , running(false)
    , mouseDown(false)
    , lastMouseX(0)
    , lastMouseY(0) {
}

Application::~Application() {
    cleanup();
}

bool Application::initialize() {
    // Initialize SDL
    if (SDL_Init(SDL_INIT_VIDEO) < 0) {
        std::cerr << "SDL initialization failed: " << SDL_GetError() << std::endl;
        return false;
    }
    
    // Create window
    window = SDL_CreateWindow("ARTemis - Digital Art Program",
                              SDL_WINDOWPOS_CENTERED,
                              SDL_WINDOWPOS_CENTERED,
                              windowWidth,
                              windowHeight,
                              SDL_WINDOW_SHOWN);
    
    if (!window) {
        std::cerr << "Window creation failed: " << SDL_GetError() << std::endl;
        return false;
    }
    
    // Create renderer
    renderer = SDL_CreateRenderer(window, -1, SDL_RENDERER_ACCELERATED);
    if (!renderer) {
        std::cerr << "Renderer creation failed: " << SDL_GetError() << std::endl;
        return false;
    }
    
    // Initialize components
    canvas = std::make_unique<Canvas>(windowWidth, windowHeight - 110); // Account for GUI
    drawingTool = std::make_unique<DrawingTool>();
    colorPicker = std::make_unique<ColorPicker>();
    gui = std::make_unique<GUI>(renderer, windowWidth, windowHeight);
    
    // Set up GUI callbacks
    gui->setToolCallback([this](ToolType tool) {
        drawingTool->setToolType(tool);
    });
    
    gui->setColorCallback([this](SDL_Color color) {
        colorPicker->setColor(color.r, color.g, color.b, color.a);
        drawingTool->setColor(color.r, color.g, color.b, color.a);
    });
    
    gui->setSaveCallback([this]() {
        saveCanvas();
    });
    
    gui->setLoadCallback([this]() {
        loadCanvas();
    });
    
    gui->setClearCallback([this]() {
        clearCanvas();
    });
    
    // Set initial tool color
    drawingTool->setColor(0, 0, 0, 255);
    
    std::cout << "ARTemis initialized successfully!" << std::endl;
    std::cout << "Controls:" << std::endl;
    std::cout << "  - Click toolbar buttons to select tools" << std::endl;
    std::cout << "  - Click color palette to change colors" << std::endl;
    std::cout << "  - Use mouse to draw on canvas" << std::endl;
    std::cout << "  - Press 'S' to save, 'L' to load, 'C' to clear" << std::endl;
    std::cout << "  - Press ESC to quit" << std::endl;
    
    running = true;
    return true;
}

void Application::run() {
    while (running) {
        handleEvents();
        render();
        SDL_Delay(16); // ~60 FPS
    }
}

void Application::cleanup() {
    canvas.reset();
    drawingTool.reset();
    colorPicker.reset();
    gui.reset();
    
    if (renderer) {
        SDL_DestroyRenderer(renderer);
        renderer = nullptr;
    }
    
    if (window) {
        SDL_DestroyWindow(window);
        window = nullptr;
    }
    
    SDL_Quit();
}

void Application::handleEvents() {
    SDL_Event event;
    while (SDL_PollEvent(&event)) {
        switch (event.type) {
            case SDL_QUIT:
                running = false;
                break;
                
            case SDL_KEYDOWN:
                handleKeyPress(event.key.keysym.sym);
                break;
                
            case SDL_MOUSEBUTTONDOWN:
                if (event.button.button == SDL_BUTTON_LEFT) {
                    handleMouseDown(event.button.x, event.button.y);
                }
                break;
                
            case SDL_MOUSEMOTION:
                if (mouseDown) {
                    handleMouseMove(event.motion.x, event.motion.y);
                }
                break;
                
            case SDL_MOUSEBUTTONUP:
                if (event.button.button == SDL_BUTTON_LEFT) {
                    handleMouseUp(event.button.x, event.button.y);
                }
                break;
        }
        
        // Let GUI handle events
        gui->handleEvent(event);
    }
}

void Application::handleMouseDown(int x, int y) {
    // Check if click is on GUI
    if (gui->isMouseOverGUI(x, y)) {
        return;
    }
    
    // Check if click is on canvas
    if (isPointOnCanvas(x, y)) {
        mouseDown = true;
        int canvasX, canvasY;
        screenToCanvas(x, y, canvasX, canvasY);
        
        drawingTool->startDrawing(canvasX, canvasY);
        lastMouseX = canvasX;
        lastMouseY = canvasY;
        
        // For brush and eraser, draw immediately
        if (drawingTool->getToolType() == ToolType::BRUSH ||
            drawingTool->getToolType() == ToolType::ERASER) {
            SDL_Color color = drawingTool->getColor();
            if (drawingTool->getToolType() == ToolType::ERASER) {
                color = {255, 255, 255, 255}; // White for eraser
            }
            canvas->drawPoint(canvasX, canvasY, color, drawingTool->getBrushSize());
        }
    }
}

void Application::handleMouseMove(int x, int y) {
    if (!mouseDown || !isPointOnCanvas(x, y)) {
        return;
    }
    
    int canvasX, canvasY;
    screenToCanvas(x, y, canvasX, canvasY);
    
    drawingTool->continueDrawing(canvasX, canvasY);
    
    // For brush and eraser, draw continuously
    if (drawingTool->getToolType() == ToolType::BRUSH ||
        drawingTool->getToolType() == ToolType::ERASER) {
        SDL_Color color = drawingTool->getColor();
        if (drawingTool->getToolType() == ToolType::ERASER) {
            color = {255, 255, 255, 255}; // White for eraser
        }
        canvas->drawLine(lastMouseX, lastMouseY, canvasX, canvasY, color, drawingTool->getBrushSize());
        lastMouseX = canvasX;
        lastMouseY = canvasY;
    }
}

void Application::handleMouseUp(int x, int y) {
    if (!mouseDown) {
        return;
    }
    
    int canvasX, canvasY;
    screenToCanvas(x, y, canvasX, canvasY);
    
    drawingTool->endDrawing(canvasX, canvasY);
    
    Point start = drawingTool->getStartPoint();
    Point end = drawingTool->getCurrentPoint();
    SDL_Color color = drawingTool->getColor();
    int size = drawingTool->getBrushSize();
    
    // Draw shape based on tool type
    switch (drawingTool->getToolType()) {
        case ToolType::LINE:
            canvas->drawLine(start.x, start.y, end.x, end.y, color, size);
            break;
            
        case ToolType::RECTANGLE:
            canvas->drawRectangle(start.x, start.y, end.x, end.y, color, size, false);
            break;
            
        case ToolType::CIRCLE: {
            int dx = end.x - start.x;
            int dy = end.y - start.y;
            int radius = static_cast<int>(std::sqrt(dx * dx + dy * dy));
            canvas->drawCircle(start.x, start.y, radius, color, size, false);
            break;
        }
            
        default:
            break;
    }
    
    mouseDown = false;
}

void Application::handleKeyPress(SDL_Keycode key) {
    switch (key) {
        case SDLK_ESCAPE:
            running = false;
            break;
            
        case SDLK_s:
            saveCanvas();
            break;
            
        case SDLK_l:
            loadCanvas();
            break;
            
        case SDLK_c:
            clearCanvas();
            break;
            
        case SDLK_1:
            drawingTool->setToolType(ToolType::BRUSH);
            gui->setCurrentTool(ToolType::BRUSH);
            break;
            
        case SDLK_2:
            drawingTool->setToolType(ToolType::ERASER);
            gui->setCurrentTool(ToolType::ERASER);
            break;
            
        case SDLK_3:
            drawingTool->setToolType(ToolType::LINE);
            gui->setCurrentTool(ToolType::LINE);
            break;
            
        case SDLK_4:
            drawingTool->setToolType(ToolType::RECTANGLE);
            gui->setCurrentTool(ToolType::RECTANGLE);
            break;
            
        case SDLK_5:
            drawingTool->setToolType(ToolType::CIRCLE);
            gui->setCurrentTool(ToolType::CIRCLE);
            break;
    }
}

void Application::render() {
    // Clear screen
    SDL_SetRenderDrawColor(renderer, 240, 240, 240, 255);
    SDL_RenderClear(renderer);
    
    // Render canvas
    SDL_Rect canvasRect = {canvasOffsetX, canvasOffsetY, canvas->getWidth(), canvas->getHeight()};
    SDL_SetRenderDrawColor(renderer, 255, 255, 255, 255);
    SDL_RenderFillRect(renderer, &canvasRect);
    
    // Create a viewport for the canvas
    SDL_Rect viewport = {canvasOffsetX, canvasOffsetY, canvas->getWidth(), canvas->getHeight()};
    SDL_RenderSetViewport(renderer, &viewport);
    canvas->render(renderer);
    SDL_RenderSetViewport(renderer, nullptr);
    
    // Draw preview for shapes
    if (mouseDown && (drawingTool->getToolType() == ToolType::LINE ||
                      drawingTool->getToolType() == ToolType::RECTANGLE ||
                      drawingTool->getToolType() == ToolType::CIRCLE)) {
        int mouseX, mouseY;
        SDL_GetMouseState(&mouseX, &mouseY);
        
        if (isPointOnCanvas(mouseX, mouseY)) {
            int canvasX, canvasY;
            screenToCanvas(mouseX, mouseY, canvasX, canvasY);
            
            Point start = drawingTool->getStartPoint();
            SDL_Color color = drawingTool->getColor();
            
            SDL_SetRenderDrawColor(renderer, color.r, color.g, color.b, 128);
            
            int screenStartX = start.x + canvasOffsetX;
            int screenStartY = start.y + canvasOffsetY;
            int screenEndX = canvasX + canvasOffsetX;
            int screenEndY = canvasY + canvasOffsetY;
            
            switch (drawingTool->getToolType()) {
                case ToolType::LINE:
                    SDL_RenderDrawLine(renderer, screenStartX, screenStartY, screenEndX, screenEndY);
                    break;
                    
                case ToolType::RECTANGLE: {
                    SDL_Rect previewRect = {
                        std::min(screenStartX, screenEndX),
                        std::min(screenStartY, screenEndY),
                        std::abs(screenEndX - screenStartX),
                        std::abs(screenEndY - screenStartY)
                    };
                    SDL_RenderDrawRect(renderer, &previewRect);
                    break;
                }
                    
                case ToolType::CIRCLE: {
                    int dx = canvasX - start.x;
                    int dy = canvasY - start.y;
                    int radius = static_cast<int>(std::sqrt(dx * dx + dy * dy));
                    
                    // Simple circle preview
                    for (int angle = 0; angle < 360; angle += 5) {
                        double rad = angle * 3.14159 / 180.0;
                        int x = screenStartX + static_cast<int>(radius * std::cos(rad));
                        int y = screenStartY + static_cast<int>(radius * std::sin(rad));
                        SDL_RenderDrawPoint(renderer, x, y);
                    }
                    break;
                }
                    
                default:
                    break;
            }
        }
    }
    
    // Render GUI
    gui->render();
    
    // Present
    SDL_RenderPresent(renderer);
}

void Application::saveCanvas() {
    if (canvas->saveToFile("output.bmp")) {
        std::cout << "Canvas saved to output.bmp" << std::endl;
    } else {
        std::cerr << "Failed to save canvas" << std::endl;
    }
}

void Application::loadCanvas() {
    if (canvas->loadFromFile("output.bmp")) {
        std::cout << "Canvas loaded from output.bmp" << std::endl;
    } else {
        std::cerr << "Failed to load canvas" << std::endl;
    }
}

void Application::clearCanvas() {
    canvas->clear({255, 255, 255, 255});
    std::cout << "Canvas cleared" << std::endl;
}

bool Application::isPointOnCanvas(int x, int y) {
    return x >= canvasOffsetX && x < canvasOffsetX + canvas->getWidth() &&
           y >= canvasOffsetY && y < canvasOffsetY + canvas->getHeight();
}

void Application::screenToCanvas(int screenX, int screenY, int& canvasX, int& canvasY) {
    canvasX = screenX - canvasOffsetX;
    canvasY = screenY - canvasOffsetY;
}
