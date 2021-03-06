// Stuff that still needs to be done ----------------------------------------------------
// TODO: Implement nonlinear variations and associated jacobians
// TODO: Different render modes (visualize distance field)
// TODO: Different view mode (view texture or plane)
// TODO: Configurable starting set (shapes, bi-unit square, unit square, image?, etc)
// TODO: Color picker for functions

// Global Variables ---------------------------------------------------------------------
var gl;
var initProgram;
var transformProgram;
var displayProgram;
var prev;
var current;
var params;
var affine_inverses;
var vertSource;
var initSource;
var transformSource;
var displaySource;

// Shaders ------------------------------------------------------------------------------


/**
 * Returns the nth column of a matrix.
 * @param mat
 * @param n
 * @returns {Array[]}
 */
function getColumn(mat, n) {
    return mat.map(x => x[n]);
}

/**
 * Returns the dot product of two vectors. Arrays are treated as vectors and are assumed
 * to have homogenous types.
 * @param a {Array[]} Vector a
 * @param b {Array[]} Vector b
 * @returns {null|number}
 */
function dot(a, b) {
    if (a.length !== b.length) {
        console.log("ERROR: Dot product dimension mismatch!");
        return null;
    }
    var sum = 0;
    for (i = 0; i < a.length; i++) {
        sum += (a[i] * b[i]);
    }
    return sum;
}

/***
 * Returns the product of two matrices.
 * @param A {Array[][]} Matrix A
 * @param B {Array[][]} Matrix B
 * @returns {null|Array[][]}
 */
function matrixMultiply(A, B) {
    // Columns of A must be equal to rows of B
    if (A[0].length !== B.length) {
        console.log("ERROR: Matrix multiplication dimension mismatch!");
        return null;
    }
    // Dimension of product matrix is: (# of rows of A) x (# of columns of B)
    var C = []
    for (let i = 0; i < A.length; i++) {
        var row = []
        for (let j = 0; j < B[0].length; j++) {
            // C[i][j] = dot(ith row of A, jth col of B)
            row.push(dot(A[i], getColumn(B, j)));
        }
        C.push(row);
    }
    return C;
}

/**
 * Returns the matrix representation of the linear affine transformation y = Ax + b
 * @param A {Array[][]} Linear transformation matrix.
 * @param b {Array[]}   Translation vector.
 * @returns {Array[][]} Matrix representing the affine transformation.
 */
function transformationMatrix(A, b) {
    var n = b.length;
    var mat = [];
    // Augment matrix A by vector b
    for (var i = 0; i < n; i++) {
        var row = A[i];
        row.push(b[i]);
        mat.push(row);
    }
    // Add the final row of the matrix
    mat.push(new Array(n+1).fill(0));
    mat[n][n] = 1;

    return mat;
}

/**
 * Returns the inverse of a 2x2 matrix.
 * @param A {Array[][]}
 * @returns {null|Array[][]}
 */
function matrixInverse2x2(A) {
    var determinant = A[0][0]*A[1][1] - A[0][1]*A[1][0];
    if (determinant === 0) {
        console.log("ERROR: Matrix is non-invertible!");
        return null;
    }

    var mat = [
        [A[1][1], -1*A[0][1]],
        [-1*A[1][0], A[0][0]]
    ];

    // Scale by 1.0 / determinant
    for (var i = 0; i < 2; i++) {
        for (var j = 0; j < 2; j++) {
            mat[i][j] = mat[i][j] / determinant;
        }
    }
    return mat;
}

function createTextureAndFramebuffer(gl) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
       gl.TEXTURE_2D,
       0, // mip level
       gl.RGBA, // internal format
       gl.canvas.width, // width
       gl.canvas.height, // height
       0, // border
       gl.RGBA, // format
       gl.UNSIGNED_BYTE, // type
       null); // data
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex: tex, fb: fb };
}

function setAttributes(gl, program) {
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, -1, 1, 1, -1,
        1, 1, 1, -1, -1, 1,
    ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    const texCoordLocation = gl.getAttribLocation(program, "a_texCoord");
    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0.0, 1.0,
        0.0, 0.0,
        1.0, 1.0,
        1.0, 0.0,
        1.0, 1.0,
        0.0, 0.0]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
}

/**
 * Returns the transformation matrices representing the inverse of our affine functions.
 * The matrices are only computed if the function is selected.
 * @returns {{A1: *[], A2: *[], A0: *[]}}
 */
function getInverses() {
    var inverses = {
        A0: [],
        A1: [],
        A2: []
    };

    // A0
    let f0 = params.f0;
    let A0 = [
        [f0.a, f0.b],
        [f0.c, f0.d]
    ];
    let b0 = [[f0.e], [f0.f]];
    let M0 = math.inv(transformationMatrix(A0, [b0[0][0], b0[1][0]]));
    inverses.A0 = [M0[0][0], M0[1][0], M0[2][0], M0[0][1], M0[1][1], M0[2][1], M0[0][2], M0[1][2], M0[2][2]];

    // A1
    let f1 = params.f1;
    let A1 = [
        [f1.a, f1.b],
        [f1.c, f1.d]
    ];
    let b1 = [[f1.e], [f1.f]];
    let M1 = math.inv(transformationMatrix(A1, [b1[0][0], b1[1][0]]));
    inverses.A1 = [M1[0][0], M1[1][0], M1[2][0], M1[0][1], M1[1][1], M1[2][1], M1[0][2], M1[1][2], M1[2][2]];

    // A2
    let f2 = params.f2;
    let A2 = [
        [f2.a, f2.b],
        [f2.c, f2.d]
    ];
    let b2 = [[f2.e], [f2.f]];
    let M2 = math.inv(transformationMatrix(A2, [b2[0][0], b2[1][0]]));
    inverses.A2 = [M2[0][0], M2[1][0], M2[2][0], M2[0][1], M2[1][1], M2[2][1], M2[0][2], M2[1][2], M2[2][2]];

    return inverses;
}

function initParams() {
    try {
        params = {
            f0: {
                a: math.evaluate(document.getElementById("f_0-a").value),
                b: math.evaluate(document.getElementById("f_0-b").value),
                c: math.evaluate(document.getElementById("f_0-c").value),
                d: math.evaluate(document.getElementById("f_0-d").value),
                e: math.evaluate(document.getElementById("f_0-e").value),
                f: math.evaluate(document.getElementById("f_0-f").value),
            },
            f1: {
                a: math.evaluate(document.getElementById("f_1-a").value),
                b: math.evaluate(document.getElementById("f_1-b").value),
                c: math.evaluate(document.getElementById("f_1-c").value),
                d: math.evaluate(document.getElementById("f_1-d").value),
                e: math.evaluate(document.getElementById("f_1-e").value),
                f: math.evaluate(document.getElementById("f_1-f").value),
            },
            f2: {
                a: math.evaluate(document.getElementById("f_2-a").value),
                b: math.evaluate(document.getElementById("f_2-b").value),
                c: math.evaluate(document.getElementById("f_2-c").value),
                d: math.evaluate(document.getElementById("f_2-d").value),
                e: math.evaluate(document.getElementById("f_2-e").value),
                f: math.evaluate(document.getElementById("f_2-f").value),
            }
        };
    } catch (e) {
        alert(e);
        return false;
    }
    return true;
}

function draw() {
    var n = parseInt(document.getElementById("iteration-count-field").value);
    console.log("n:", n)

    if (!initParams()) {
        return;
    }
    console.log(params);

    var inverses = getInverses();

    console.log(inverses);

    // Get uniform locations
    var A0Loc = gl.getUniformLocation(transformProgram, "u_A0");
    // gl.getUniformLocation(transformProgram, "u_A1");
    // gl.getUniformLocation(transformProgram, "u_A2");


    // Create initial texture
    var texture = gl.createTexture();
    var data = new Uint8Array(gl.canvas.width * gl.canvas.heigth * 4);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.canvas.width, gl.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data, 0);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    // Render initial starting texture
    setAttributes(gl, initProgram);
    gl.useProgram(initProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, prev.fb);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.clearColor(0, 0, 0, 1);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Transformation iteration
    for (let i = 0; i < n; i++) {
        console.log(i);

        // Transformation pass
        setAttributes(gl, transformProgram);
        gl.useProgram(transformProgram);
        // Pass uniforms
        gl.uniformMatrix3fv(A0Loc, false, inverses.A0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, current.fb);
        gl.bindTexture(gl.TEXTURE_2D, prev.tex);
        gl.clearColor(0, 0, 0, 1);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // Final display pass
        setAttributes(gl, displayProgram);
        gl.useProgram(displayProgram);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, current.tex);
        gl.clearColor(0, 0, 0, 1);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        var tmp = prev
        prev = current
        current = tmp;
    }


}

function createProgramFromSource(gl, vertSource, fragSource) {
    // Compile vertex shader
    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, vertSource);
    gl.compileShader(vertShader)
    // Catch some possible errors on vertex shader
    if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(vertShader))
    }

    // Compile fragment shader
    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, fragSource);
    gl.compileShader(fragShader);
    if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(fragShader));
    }

    // Create program
    program = gl.createProgram();
    // Attach shaders
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    if ( !gl.getProgramParameter(program, gl.LINK_STATUS) ) {
        var info = gl.getProgramInfoLog(program);
        throw 'Could not compile WebGL program. \n\n' + info;
    }

    return program;
}

function compileShaders() {
    vertSource = `#version 300 es
in vec4 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
    gl_Position = a_position;
    v_texCoord = a_texCoord;
}
`;


    initSource = `#version 300 es
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
`;

    transformSource = `#version 300 es
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
    ${document.getElementById("f_0-enable").checked ? `vec3 p0 = u_A0 * p;` : ``} 
    
    // Sum up densities
    vec3 col = vec3(0.0);
    ${document.getElementById("f_0-enable").checked ? `col += unpack(plane_to_texture(p0.xy));` : ``} 
    

    // Write back to texture
    outColor = vec4(pack(col), 1.0);
}
`;


    displaySource = `#version 300 es
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
`;
    // Compile shaders from source
    initProgram = createProgramFromSource(gl, vertSource, initSource);
    transformProgram = createProgramFromSource(gl, vertSource, transformSource)
    displayProgram = createProgramFromSource(gl, vertSource, displaySource);
}


function main() {
    // Initialize default param values
    document.getElementById("iteration-count-field").value = "0";

    canvas = document.getElementById("canvas");

    // Get a WebGL context from canvas
    gl = canvas.getContext("webgl2");
    if (!gl) {
        console.log("No webgl!");
    }

    compileShaders();


    // // Create frame buffers and textures
    prev = createTextureAndFramebuffer(gl);
    current = createTextureAndFramebuffer(gl);

    draw();
}

main();
