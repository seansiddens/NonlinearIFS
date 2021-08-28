#version 300 es

precision highp float;

in vec2 v_texCoord;

uniform sampler2D tex;
uniform float u_time;
uniform mat2 w0Mat;
uniform vec2 w0o;

out vec4 outColor;

vec2 plane_to_texture(vec2 p) {
    return p / (2.0*sqrt(1.0 + p*p)) + 0.5;
}

vec2 texture_to_plane(vec2 t) {
    return (2.0*t - 1.0) / sqrt(1.0 - (2.0*t - 1.0)*(2.0*t - 1.0));
}

// Affine transformation of a point by parameters
vec2 M(vec2 p, mat2 mat, vec2 o) {
    return mat * p + o;
}

vec2 swirl_inv(vec2 p) {
    float r_squared = p.x*p.x + p.y*p.y;
    return vec2(p.x*sin(r_squared) + p.y*cos(r_squared), -p.x*cos(r_squared) + p.y*sin(r_squared));
}

vec3 unpack(vec2 t) {
    return exp2(texture(tex, t).rgb * 20.0) - 1.0;
}

vec3 pack(vec3 c) {
    return log2(c + 1.0) * (1.0 / 20.0);
}

void main() {
    // Map to plane
    vec2 st = v_texCoord;
    st.y = 1.0 - st.y;
    vec2 p = texture_to_plane(st);

    // Define function colors
    vec3 c0 = vec3(1.0, 0.5, 0.8);
    vec3 c1 = vec3(0.3, 1.0, 0.9);
    vec3 c2 = vec3(0.2, 0.3, 0.9);

    // Transform by inverses
    vec2 p0 = w0Mat*p + w0o;

    // Sum up densities
    vec3 col = vec3(0.0);
    col += unpack(plane_to_texture(p0));

    // Write back to texture
    outColor = vec4(pack(col), 1.0);
}