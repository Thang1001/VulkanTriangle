#version 450
// Vertex shader: chạy 1 lần cho mỗi đỉnh (3 lần cho tam giác)

layout(location = 0) out vec3 fragColor;

// 3 đỉnh viết cứng, toạ độ trong khoảng [-1, 1], trục y hướng xuống
vec2 positions[3] = vec2[](
    vec2( 0.0, -0.5),   // đỉnh trên
    vec2( 0.5,  0.5),   // dưới phải
    vec2(-0.5,  0.5)    // dưới trái
);

vec3 colors[3] = vec3[](
    vec3(1.0, 0.0, 0.0),   // đỏ
    vec3(0.0, 1.0, 0.0),   // xanh lá
    vec3(0.0, 0.0, 1.0)    // xanh dương
);

void main() {
    gl_Position = vec4(positions[gl_VertexIndex], 0.0, 1.0);
    fragColor = colors[gl_VertexIndex];
}