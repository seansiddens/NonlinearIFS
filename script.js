// Globals
var gl;
var initProgram;
var transformProgram;
var displayProgram;
var prev;
var current;
var params;

/***
 * Returns the nth column of a matrix.
 * @param mat
 * @param n
 * @returns {Array}
 */
function getColumn(mat, n) {
    return mat.map(x => x[n]);
}

/***
 * Returns the dot product of two vectors. Arrays are treated and are assumed
 * to have homogenous types.
 * @param a {Array} Vector a
 * @param b {Array} Vector b
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
 * @param A {Array} Matrix A
 * @param B {Array} Matrix B
 * @returns {null|*[]}
 */
function matrixMultiply(A, B) {
    console.log(A.length);
    console.log(B[0].length);

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

function iterate() {
    var n = parseInt(document.getElementById("iteration-count-field").value);
    console.log("n:", n)

    initParams();
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

    for (let i = 0; i < n; i++) {
        console.log(i);

        // Transformation pass
        setAttributes(gl, transformProgram);
        gl.useProgram(transformProgram);
        // Pass uniforms

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

function initParams() {
    params = {
        f_0: {
            a: math.evaluate(document.getElementById("f_0-a").value),
            b: math.evaluate(document.getElementById("f_0-b").value),
            c: math.evaluate(document.getElementById("f_0-c").value),
            d: math.evaluate(document.getElementById("f_0-d").value),
        }
    };

    console.log(params);
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

    // Create program from shader sources
    initProgram = createProgramFromSource(gl, "vert.glsl", "init.glsl")
    transformProgram = createProgramFromSource(gl, "vert.glsl", "transform.glsl")
    displayProgram = createProgramFromSource(gl, "vert.glsl", "display.glsl");

    // Create frame buffers and textures
    prev = createTextureAndFramebuffer(gl);
    current = createTextureAndFramebuffer(gl);


    iterate();
}

main();
