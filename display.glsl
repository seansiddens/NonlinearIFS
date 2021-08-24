#version 300 es

precision highp float;

in vec2 v_texCoord;

uniform sampler2D tex;

out vec4 outColor;

vec2 plane_to_texture(vec2 p) {
    return p / (2.0*sqrt(1.0 + p*p)) + 0.5;
}

vec3 gamma_correct(vec3 col, float gamma) {
    return pow(col, vec3(1.0 / gamma));
}

void main() {
    vec2 uv = v_texCoord;
    uv.y = 1.0 - uv.y;
    vec2 p = uv;
    p *= 2.0;
    p -= 1.0;
    vec2 st = plane_to_texture(p);

    vec3 col = gamma_correct(texture(tex, st).rgb, 4.0);

    outColor = vec4(col, 1.0);
}
