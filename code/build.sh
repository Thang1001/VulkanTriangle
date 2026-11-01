#!/bin/sh
# build.sh — biên dịch và chạy trên macOS (Apple Silicon, Homebrew)
# Cấu trúc thư mục:
#   main.cpp
#   shaders/triangle.vert
#   shaders/triangle.frag
set -e

# 1) Cài công cụ (chỉ cần một lần)
# brew install molten-vk vulkan-loader vulkan-headers vulkan-validationlayers glfw glslang

# 2) Biên dịch shader GLSL sang SPIR-V
glslangValidator -V shaders/triangle.vert -o shaders/vert.spv
glslangValidator -V shaders/triangle.frag -o shaders/frag.spv

# 3) Biên dịch chương trình
#    Vulkan: LunarG SDK trong /usr/local · GLFW: Homebrew trong /opt/homebrew
clang++ -std=c++17 -g main.cpp -o triangle \
    -I/usr/local/include -I/opt/homebrew/include \
    -L/usr/local/lib -L/opt/homebrew/lib \
    -lvulkan -lglfw \
    -Wl,-rpath,/usr/local/lib -Wl,-rpath,/opt/homebrew/lib

# 4) Chạy (đứng ở thư mục chứa shaders/)
./triangle

# Nếu báo không tìm thấy driver hoặc validation layer, thử:
# export VK_ICD_FILENAMES=/usr/local/share/vulkan/icd.d/MoltenVK_icd.json
# export VK_LAYER_PATH=/usr/local/share/vulkan/explicit_layer.d