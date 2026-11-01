#version 450
// Fragment shader: chạy 1 lần cho mỗi pixel nằm trong tam giác

layout(location = 0) in vec3 fragColor;    // màu đã được nội suy giữa 3 đỉnh
layout(location = 0) out vec4 outColor;    // ghi vào color attachment số 0

void main() {
    outColor = vec4(fragColor, 1.0);
}