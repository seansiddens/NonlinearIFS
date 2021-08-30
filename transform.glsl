#version 300 es

precision highp float;

in vec2 v_texCoord;

uniform sampler2D tex;
uniform mat3 u_A0;

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
    vec3 p = vec3(texture_to_plane(st), 1.0); // Get augmented version

    // Define function colors
    vec3 c0 = vec3(1.0, 0.5, 0.8);
    vec3 c1 = vec3(0.3, 1.0, 0.9);
    vec3 c2 = vec3(0.2, 0.3, 0.9);

    // Transform by inverses
    vec3 p0 = u_A0 * p;

    // Sum up densities
    vec3 col = vec3(0.0);
    col += unpack(plane_to_texture(p0.xy));

    // Write back to texture
    outColor = vec4(pack(col), 1.0);
}