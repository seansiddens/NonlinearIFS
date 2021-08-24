#version 300 es

#define EPSILON 0.01

precision highp float;

in vec2 v_texCoord;

uniform sampler2D tex;

out vec4 outColor;

vec2 texture_to_plane(vec2 t) {
    return (2.0*t - 1.0) / sqrt(1.0 - (2.0*t - 1.0)*(2.0*t - 1.0));
}


void main() {
    // Map tex coords to plane
    vec2 p = texture_to_plane(v_texCoord);

    // Non-zero when p.x >= 1.0 or p.y >= 1.0
    float top_left = length(step(vec2(1.0+EPSILON), p));
    // Non-zero when p.x <= -1.0 or py <= -1.0
    float bottom_right = length(vec2(1.0) - step(vec2(-1.0-EPSILON), p));

    // Only tex coords corresponding to points on the plane
    // from (-1.0, -1.0) to (1.0, 1.0) are colored white
    vec3 col = vec3(bottom_right + top_left);

    outColor = vec4(vec3(1.0) - col, 1.0);
}