cmake_minimum_required(VERSION 3.10)
project(ARTemis VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Find SDL2
find_package(SDL2 REQUIRED)

# Include directories
include_directories(
    ${SDL2_INCLUDE_DIRS}
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

# ARTemis source files
set(ARTEMIS_SOURCES
    src/main.cpp
    src/Application.cpp
    src/Canvas.cpp
    src/DrawingTool.cpp
    src/ColorPicker.cpp
    src/FileIO.cpp
    src/GUI.cpp
)

# ARTemis header files
set(ARTEMIS_HEADERS
    include/Application.h
    include/Canvas.h
    include/DrawingTool.h
    include/ColorPicker.h
    include/FileIO.h
    include/GUI.h
)

# Create executable
add_executable(artemis ${ARTEMIS_SOURCES} ${ARTEMIS_HEADERS})

# Link libraries
target_link_libraries(artemis ${SDL2_LIBRARIES})

# Platform-specific settings
if(WIN32)
    target_link_libraries(artemis SDL2main)
endif()

# Installation rules
install(TARGETS artemis DESTINATION bin)
