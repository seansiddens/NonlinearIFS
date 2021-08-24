#version 300 es

precision highp float;

in vec2 v_texCoord;

uniform sampler2D tex;
uniform float u_time;
uniform float u_w0_inv[6];
uniform float u_w1_inv[6];
uniform float u_w2_inv[6];

out vec4 outColor;

vec2 plane_to_texture(vec2 p) {
    return p / (2.0*sqrt(1.0 + p*p)) + 0.5;
}

vec2 texture_to_plane(vec2 t) {
    return (2.0*t - 1.0) / sqrt(1.0 - (2.0*t - 1.0)*(2.0*t - 1.0));
}

// Affine transformation of a point by parameters
vec2 M(vec2 p, float[6] params) {
    return vec2(params[0]*p.x + params[1]*p.y + params[2],
                params[3]*p.x + params[4]*p.y + params[5]);
}

vec2 swirl_inv(vec2 p) {
    float r_squared = p.x*p.x + p.y*p.y;
    return vec2(p.x*sin(r_squared) + p.y*cos(r_squared), -p.x*cos(r_squared) + p.y*sin(r_squared));
}

void main() {
    vec2 st = v_texCoord;
    st.y = 1.0 - st.y;
    vec2 p = texture_to_plane(st);

    vec3 col = vec3(0.0);

    col += texture(tex, plane_to_texture(M(p, u_w0_inv))).rgb * vec3(1.0, 0.4, 0.4);
//    col += texture(tex, plane_to_texture(M(p, u_w1_inv))).rgb * vec3(0.8, 1.0, 0.8);
//    col += texture(tex, plane_to_texture(M(p, u_w2_inv))).rgb * vec3(0.8, 0.8, 1.0);



    outColor = vec4(col, 1.0);
}