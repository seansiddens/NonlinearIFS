// GLSL functions to be shared between shader programs
const glsl_util = `
vec2 texture_to_plane(vec2 t) {
    return (2.0*t - 1.0) / sqrt(1.0 - (2.0*t - 1.0)*(2.0*t - 1.0));
}

vec2 plane_to_texture(vec2 p) {
    return p / (2.0*sqrt(1.0 + p*p)) + 0.5;
}
`;

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

function main() {
    // Set width and height of canvas
    var canvas = document.getElementById("canvas");

    // Get a WebGL context from canvas
    var gl = canvas.getContext("webgl2");
    if (!gl) {
        console.log("No webgl!");
    }

    // Create program from shader sources
    var initProgram = createProgramFromSource(gl, "vert.glsl", "init.glsl")
    var transformProgram = createProgramFromSource(gl, "vert.glsl", "transform.glsl")
    var displayProgram = createProgramFromSource(gl, "vert.glsl", "display.glsl");
    var prev = createTextureAndFramebuffer(gl);
    var current = createTextureAndFramebuffer(gl);

    // Look up uniform locations
    // var resolutionUniformLocation = gl.getUniformLocation(transformProgram, "u_resolution");
    var timeUniformLocation = gl.getUniformLocation(transformProgram, "u_time");
    // var frameUniformLocation = gl.getUniformLocation(program, "u_frame");


    // IFS parameters
    var sierpinkski_triangle = {
        numFunctions: 3,
        w0Mat: [2.1, 0, 0, 2.1],
        w0o: [0, -2.1/2]
    }

    var IFS = sierpinkski_triangle;

    // Param uniforms for IFS functions
    var w0MatLoc = gl.getUniformLocation(transformProgram, "w0Mat");
    var w0yLoc = gl.getUniformLocation(transformProgram, "w0y");
    var w0oLoc = gl.getUniformLocation(transformProgram, "w0o");
    var w1xLoc = gl.getUniformLocation(transformProgram, "w1x");
    var w1yLoc = gl.getUniformLocation(transformProgram, "w1y");
    var w1oLoc = gl.getUniformLocation(transformProgram, "w1o");
    var w2xLoc = gl.getUniformLocation(transformProgram, "w2x");
    var w2yLoc = gl.getUniformLocation(transformProgram, "w2y");
    var w2oLoc = gl.getUniformLocation(transformProgram, "w2o");

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

    var frame = 0;
    var n = 2;
    var prev_time = 0;
    var delta_time = 0;
    function render(time) {
        time *= 0.001; // convert to seconds
        delta_time = time - prev_time;
        prev_time = time;
        frame += 1;
        document.getElementById("time_counter").innerHTML = "Time: " + time.toFixed(2) + "s";
        document.getElementById("frame_counter").innerHTML = "Frame: " + frame;
        document.getElementById("fps_counter").innerHTML = "FPS: " + Math.round(1.0 / delta_time);


        if (frame < n) {
            // Transformation pass
            setAttributes(gl, transformProgram);
            gl.useProgram(transformProgram);
            // Pass uniforms
            gl.uniform1f(timeUniformLocation, time);
            gl.uniformMatrix2fv(w0MatLoc, false, IFS.w0Mat);
            gl.uniform2fv(w0oLoc, IFS.w0o);

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

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

