
/**
 * Requests text data from file.
 * @param {string} fileName 
 * @return {string} Requested text from file
 */
 function loadTextFromFile(fileName) {
    var filetext;
    // Load shader code from source files
    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", fileName, false);
    xhttp.onreadystatechange = function () {
        if (xhttp.readyState===4 && xhttp.status===200) {
            filetext = xhttp.responseText;
        } else {
            console.log("ERROR: Failed to load text from file. Is the filename correct?");
            fileText = "";
        }

    }
    xhttp.send();
    return filetext;
}

function createShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }

    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return false;
}

function createProgram(gl, vertexShader, fragmentShader) {
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }

    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

/**
 * Creates a program from two sources.
 * @param {WebGLRenderingContext} gl The WebGlRendering Context
 * @param {string} vertSource File name of the vertex shader
 * @param {string} fragSource File name of the fragment shader
 * @return {WebGlProgram} The created program
 */
function createProgramFromSource(gl,vertSource, fragSource) {
    // Get shader source code from file
    var vertexShaderSource = loadTextFromFile(vertSource);
    var fragmentShaderSource = loadTextFromFile(fragSource);

    // Compile shaders from source
    var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    if (vertexShader == false) {
        console.log("ERROR: Failed to compile " + vertSource + "! See above for details.");
    }
    var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (fragmentShader == false) {
        console.log("ERROR: Failed to compile " + fragSource + "! See above for details.");
    }

    // Create the shader program from compiled shaders
    var program = createProgram(gl, vertexShader, fragmentShader);

    return program
}
