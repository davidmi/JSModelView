/* global mat3, mat4: true */
// modelview.js
// David Iserovich 2012
//
// A javascript library to view various model files with WebGL. May eventually be expanded to a game engine
// The purpose of this program is mostly educational, so this code is written casually, is informally commented,
// and may not be well-structured or efficient. This is my first serious attempt with javascript, so please
// be forgiving of any faux pas.
//
// Credit where credit is due:
// This code relies heavily on the excellent WebGL tutorials available here from the amazing Giles Thomas:
// http://learningwebgl.com/blog/
//
// Enjoy!
//
// Requirements: (Include these before including modelview.js)
// jquery-1.8.0.min.js
// gl-matrix-min.js
//
// Future milestones:
//
// Version 0.01: - DONE
// Goals: Load and display vertices of a local .obj file, no .mtl, no complicated lighting and no texturing as of yet
//
// Version 0.02: - PARTIAL
// Goals: Simple lighting. Vertex colors. Vertex normals.
// TODO: Vertex colors
//
// Version 0.03:
// Goals: Handle fullscreen/screen resize? Textures.
//
// Further versions (0.10 and onwards, perhaps after restructuring, name change):
// Normalmaps? Cast shadows (if that's even possible in realtime webgl)? Morph/skeletal animations? Render optimizations?
// Data structures (quadtrees, parent-child objects?)? Something else I don't know about as of yet?
// Time will tell, I guess.


//Disable this and all calls to it in production


//
// Globals.
// It's GL, we have to have globals!!! \(^.^)/
//

var gl;
var shaderProgram;

// Model-view matrix (movement/rotation)
var mvMatrix = mat4.create();

// Stack of matrix states. Yay for data structures!
var mvMatrixStack = [];

// Projection matrix
window.pMatrix = mat4.create();
window.orthoMatrix = mat4.create();

// Key states
var pressedKeys = [];

//
// Util functions
//

function radians(rotationDegrees) {
    "use strict";
    return rotationDegrees / 180 * Math.PI % (2 * Math.PI);
}

function degrees(rotationRadians) {
    "use strict";
    return rotationRadians / Math.PI * 180 % (2 * Math.PI);
}

function handleKeyDown(event) {
    "use strict";
    pressedKeys[event.keyCode] = true;
}

function handleKeyUp(event) {
    "use strict";
    pressedKeys[event.keyCode] = false;
}


//
// Run this function first - it'll get us our gl object
// 

function resizeCanvas(){
    "use strict";

    // Get the canvas element form the page
    var canvas = document.getElementById("game-view");
     
    /* Rresize the canvas to occupy the full page, 
       by getting the widow width and height and setting it to canvas*/
     

    canvas.height = window.innerHeight;
    canvas.width  = window.innerWidth;
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
}

function initGL(canvas) {
    "use strict";
    try {
        gl = canvas.getContext("webgl", {antialias: true});
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;

        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.BLEND);
        gl.disable(gl.DEPTH_TEST);

    } catch (e) {
        // Put webgl fail stuff here?
    }
    if (!gl) {
        alert("Could not initialize WebGL, sorry :( ");
    }
}

//
// Utility functions
//

function requestAnimationFrame(drawScene) {
    "use strict"; // Argument is the function to draw      

    //if (window.requestAnimationFrame){
    //    window.requestAnimationFrame(drawScene);
    //    return;
    //}

    if (window.webkitRequestAnimationFrame) {
        window.webkitRequestAnimationFrame(drawScene);
        return;
    }

    if (window.mozRequestAnimationFrame) {
        window.mozRequestAnimationFrame(drawScene);
        return;
    }

}


//
// GL functions
//

// Shaderses!!!! - Fix this to use the ajax text files vertex_shader.txt and fragment_shader.txt
function getShader(gl, str, mime) {
    "use strict";

    var shader;
    if (mime === "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);

    } else if (mime === "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);

    } else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {

        alert(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

function handleLoadedVideoTexture(texture) {
    "use strict";
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

function handleLoadedTexture(texture) {
    "use strict";
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

function initTexture(imageUrl) {
    "use strict";
    var texture = gl.createTexture();
    texture.image = new Image();
    texture.image.onload = function() {
        handleLoadedTexture(texture);
    };

    texture.image.src = imageUrl;
    return texture;
}

function initPreloadedTexture(image){
    "use strict";
    var texture = gl.createTexture();
    texture.image = image;
    handleLoadedTexture(texture);

    return texture;
}

function initVideoTexture(videoUrl) {
    "use strict";
    var texture = gl.createTexture();
    texture.video = document.createElement('video');
    texture.video.autoPlay = true;

    handleLoadedVideoTexture(texture);

    texture.video.preload = "auto";
    texture.video.src = videoUrl;

    return texture;
}

function updateTexture(texture) {
    "use strict";
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
        gl.UNSIGNED_BYTE, texture.video);
}

//XXX: Refactor to updateTextureCanvas(glTexture, canvas)
// for clarity
function updateTextureCanvas(texture){
    // Update a gl.TEXTURE_2D object with a canvas store in its
    // texture.image property
    "use strict";
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
        gl.UNSIGNED_BYTE, texture.image);
}


// Fix this to use ajax as well
function initShaders(vShaderText, fShaderText) {
    "use strict";
    var fragmentShader = getShader(gl, fShaderText, "x-shader/x-fragment");
    var vertexShader = getShader(gl, vShaderText, "x-shader/x-vertex");

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("could not initialize shaders");
    }

    gl.useProgram(shaderProgram);

    // new field        
    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    shaderProgram.texCoordsAttribute = gl.getAttribLocation(shaderProgram, "aTexCoord");
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);
    gl.enableVertexAttribArray(shaderProgram.texCoordsAttribute);

    //shaderProgram.vertexTextureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");

    // Provide values for attribute with an array
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);
    //gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute)

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
    shaderProgram.alphaUniform = gl.getUniformLocation(shaderProgram, "uAlpha");
    shaderProgram.scaleUniform = gl.getUniformLocation(shaderProgram, "uScale");
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
}

function setMatrixUniforms() {
    "use strict";
    // Use the projection and model-view matrices in changing vertex position
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);

    // Set the normal transform matrix for lighting
    // @see http://www.arcsynthesis.org/gltut/Illumination/Tut09%20Normal%20Transformation.html
    // @see http://learningwebgl.com/blog/?p=684

    var normalMatrix = mat3.create();
    mat4.toInverseMat3(mvMatrix, normalMatrix);
    mat3.transpose(normalMatrix);
    gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, normalMatrix);
}

function mvPopMatrix() {
    "use strict";
    if (mvMatrixStack.length === 0) {
        throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

function mvPushMatrix() {
    "use strict";
    var copy = mat4.create();
    mat4.set(mvMatrix, copy);
    mvMatrixStack.push(copy);
}

function loadObj(callback){ 
    "use strict";
    return function(e) {
        var lines = e.target.result.split('\n');

        var vertices = [];
        var vertexNormals = [];
        var tris = [];
        var normals = [];
        var i,j,k;

        var vertexIndices = [];

        for (i = 0; i < lines.length; i++) {

            var params = lines[i].split(' ');

            // Dump all defined vertices into an array
            if (params[0] === 'v') {
                vertices[vertices.length] = parseFloat(params[1]);
                vertices[vertices.length] = parseFloat(params[2]);
                vertices[vertices.length] = parseFloat(params[3]);
            }

            if (params[0] === 'vn') {
                for (j = 1; j < 4; j++) {
                    vertexNormals[vertexNormals.length] = parseFloat(params[j]);
                }
            }

            if (params[0] === 'f') {
                var vertexCoords = [];
                var normalCoords = [];

                for (k = 1; k < params.length; k++) {
                    var split = params[k].split("//");
                    vertexCoords[vertexCoords.length] = split[0];
                    if (split.length > 1) {
                        normalCoords[normalCoords.length] = split[1];
                    }
                }
                if (vertexCoords.length < 4) { // It's a triangle
                    // Load vertices
                    for (k = 0; k < 9; k++) {
                        tris[tris.length] = vertices[3 * parseInt(vertexCoords[Math.floor(k / 3)] - 1) + k % 3];
                    }

                    if (vertexNormals.length > 0) {
                        // Load vertex normals
                        for (k = 0; k < 9; k++) {
                            var normalIndex = 3 * parseInt(normalCoords[Math.floor(k / 3)] - 1) + k % 3;
                            normals[normals.length] = vertexNormals[normalIndex];
                        }
                    }

                    // Store the vertex indices, perhaps for later index-based rendering for quads
                    for (j = 0; j < 3; j++) {
                        vertexIndices[vertexIndices.length] = parseInt(vertexCoords[j], 10);
                    }

                } else { // It's a quad.

                    // Order of vertices in a quad converted to two tris
                    var vertexOrder = [0, 1, 2, 2, 3, 0];

                    for (j = 0; j < 3 * 6; j++) {
                        tris[tris.length] = vertices[3 * (parseInt(vertexCoords[vertexOrder[Math.floor(j / 3)]], 10) - 1) + j % 3]; // 3*parseInt(vertexCoords[vertexOrder[Math.floor(j/3)]] - 1, 10) + j%3
                    }

                    // Get vertex normals for quads
                    if (vertexNormals.length > 0) {
                        // get the first 3
                        for (j = 0; j < 18; j++) {
                            var normalIndex = 3 * (parseInt(normalCoords[vertexOrder[Math.floor(j / 3)]], 10) - 1) + j % 3;
                            normals[normals.length] = vertexNormals[normalIndex];
                        }
                    }


                    // Assuming the quad is specified in circumferential order
                    for (j = 0; j < 6; j++) {
                        vertexIndices[vertexIndices.length] = parseInt(vertexCoords[vertexOrder[j]]);
                    }
                }
            }
        }

        callback({
            tris: tris,
            vertexIndices: vertexIndices,
            vertices: vertices,
            normals: normals
        });
    };
}

// Read a file in the Wavefront OBJ format
function readObj(file, callback) {
    "use strict";

    var reader = new FileReader();
    reader.onload = loadObj(callback);
    reader.readAsText(file);
    return reader;
}


//
// Object definitions
//


// ## Class Object3d



function Object3d(options) {
    "use strict"; //later, normals, colors, uv, etc
    //TODO: Change args to object 
    if (options === undefined) {
        options = {};
    }
    this.tris = options.triArray || [];
    this.triangleBuffer = gl.createBuffer();

    if (this.tris.length > 9) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.triangleBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.tris), gl.STATIC_DRAW);
    }

    this.normals = options.normalsArray || [];
    this.normalsBuffer = gl.createBuffer();

    this.alpha = options.alpha || 1.0;

    this.texImage = options.texImage || gl.createTexture();

    if (this.normals.length > 9) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals), gl.STATIC_DRAW);
    }

    // Either use the provided texture coordinates, or create default texture coordinates
    if (options.texCoords){
        this.texCoords = new Float32Array(options.texCoords);
    }
    else{
        this.texCoords = new Float32Array(this.tris.length /3 * 2);
    }

    this.texCoordsBuffer = gl.createBuffer();

    if (this.texCoords.length > 6) {
        this.hasTex = true;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.texCoords, gl.STATIC_DRAW);
        this.texCoordsBuffer.numItems = this.texCoords.length / 2;
        this.texCoordsBuffer.itemSize = 2;
    }

    this.triangleBuffer.numItems = this.tris.length / 3;
    this.triangleBuffer.itemSize = 3;

    this.normalsBuffer.numItems = this.normals.length / 3;
    this.normalsBuffer.itemSize = 3;


    this.x = options.x || 0;
    this.y = options.y || 0;
    this.z = options.z || 0;

    this.scale = options.scale || 1;

    this.xRot = (options.xRot || 0) / 180 * Math.PI % (2 * Math.PI);
    this.yRot = (options.yRot || 0) / 180 * Math.PI % (2 * Math.PI);
    this.zRot = (options.zRot || 0) / 180 * Math.PI % (2 * Math.PI);

}

Object3d.prototype.draw = function() {
    "use strict";
    mvPushMatrix();

    if (!this.depth){
      mat4.translate(mvMatrix, [this.x, this.y, this.z]);
    }
    // Rotate relative to self
    mat4.rotateX(mvMatrix, this.xRot);
    mat4.rotateY(mvMatrix, this.yRot);
    mat4.rotateZ(mvMatrix, this.zRot);

    if (this.tris.length > 9) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.triangleBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.triangleBuffer.itemSize, gl.FLOAT, false, 0, 0);

        if (this.normals.length > 9) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.normalsBuffer);
            gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, this.normalsBuffer.itemSize, gl.FLOAT, false, 0, 0);
        }

        if (this.texCoords.length > 6) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordsBuffer);
            gl.vertexAttribPointer(shaderProgram.texCoordsAttribute, this.texCoordsBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.texImage);
            gl.uniform1i(shaderProgram.samplerUniform, 0);
        }

        setMatrixUniforms();

        gl.uniform1f(shaderProgram.alphaUniform, this.alpha);
        gl.uniform1f(shaderProgram.scaleUniform, this.scale);

        if (this.no_depth){
            gl.disable(gl.DEPTH_TEST);
            // ortho and p inverted
            orthoMatrix[8] = this.x;
            orthoMatrix[9] = this.y;
            gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, orthoMatrix);
        }

        gl.drawArrays(gl.TRIANGLES, 0, this.triangleBuffer.numItems);

        if (this.no_depth){
            gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
            gl.enable(gl.DEPTH_TEST);
        }
    }

    mvPopMatrix();

    // Set update time
};

Object3d.prototype.animate = function(elapsedTime, timeNow) {
  "use strict";
  if (this.animationCallback){
    this.animationCallback(this, elapsedTime, timeNow);
  }
};

window.Animations3d = {};

window.Animations3d.toRadians = function(x){
  return x / 180 * Math.PI % (2 * Math.PI);
}

window.Animations3d.rotateTo = function(xRot, yRot, zRot, timeMil, timeNow, done) {
  "use strict";
  var startTime =  timeNow || new Date().getTime();
  var endTime = startTime + timeMil;
  var timeLeft = endTime - startTime;
  var cb = function(obj, elapsedTime, timeNow){
    if (timeNow < endTime) {
      obj.xRot = (obj.xRot + (xRot - obj.xRot) * elapsedTime/timeLeft) % (Math.PI * 2);
      obj.yRot = (obj.yRot + (yRot - obj.yRot) * elapsedTime/timeLeft) % (Math.PI * 2);
      obj.zRot = (obj.zRot + (zRot - obj.zRot) * elapsedTime/timeLeft) % (Math.PI * 2);
    } else {
      obj.xRot = xRot;
      obj.yRot = yRot;
      obj.zRot = zRot;
      // Remove self
      obj.animationCallback = undefined;
      if (done) {
        done();
      }
    }
    
    timeLeft = endTime - timeNow;
  };

  return cb;
};


window.Animations3d.moveTo = function(x, y, z, timeMil, timeNow, done) {
  "use strict";
  var startTime =  timeNow || new Date().getTime();
  var endTime = startTime + timeMil;
  var timeLeft = endTime - startTime;
  var cb = function(obj, elapsedTime, timeNow){
    if (timeNow < endTime) {
      obj.x = (obj.x + (x - obj.x) * elapsedTime/timeLeft);
      obj.y = (obj.y + (y - obj.y) * elapsedTime/timeLeft);
      obj.z = (obj.z + (z - obj.z) * elapsedTime/timeLeft);
    } else {
      obj.x = x;
      obj.y = y;
      obj.z = z;
      // Remove self
      obj.animationCallback = undefined;
      if (done) {
        done();
      }
    }
    
    timeLeft = endTime - timeNow;
  };

  return cb;
};

window.Animations3d.popAnim = function(timeMil, origScale, timeNow, done) {
  "use strict";
  var startTime =  timeNow || new Date().getTime();
  var endTime = startTime + timeMil;
  var timeLeft = endTime - startTime;
  var totalTime = endTime - startTime;
  var cb = function(obj, elapsedTime, timeNow){
    if (timeNow < endTime) {
      obj.scale = origScale + origScale * Math.sin(Math.PI * (endTime - timeNow)/totalTime);
    } else {
      obj.scale = origScale;
      // Remove self
      obj.animationCallback = undefined;
      if (done) {
        done();
      }
    }
    
    timeLeft = endTime - timeNow;
  };

  return cb;
};

window.Animations3d.blink = function(rate, timeMil, done) {
  "use strict";
  timeMil = timeMil || 0;
  rate = rate || 1;
  var startTime =  timeNow || new Date().getTime();
  var endTime = startTime + timeMil;
  var cb = function(obj, elapsedTime, timeNow){
    if (timeMil === 0 || timeNow < endTime) {
        obj.alpha = Math.sin(rate * (timeNow / 1000 % 2) * Math.PI);
    } else {
        obj.alpha = 1;
        obj.animationCallback = undefined;
        if (done) {
            done();
        }
    }
  };

  return cb;
};

// ## End Class Drawable3d


// The geometry and other data will later be moved into an Object3d
var triBuffer;
var inOrderTriBuffer;
var indexBuffer;
var doneLoading = false;

var modelData;
var model;
var models = [];

function initBuffers(vertices, vertexIndices, tris, normals) {
    "use strict";
    doneLoading = false;

    if (vertices.length >= 3) {

        modelData = tris;

        triBuffer = gl.createBuffer();

        gl.bindBuffer(gl.ARRAY_BUFFER, triBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        triBuffer.numItems = vertices.length / 3;
        triBuffer.itemSize = 3;

        indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertexIndices), gl.STATIC_DRAW);
        indexBuffer.itemSize = 1;
        indexBuffer.numItems = vertexIndices.length;

        inOrderTriBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, inOrderTriBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tris), gl.STATIC_DRAW);

        inOrderTriBuffer.itemSize = 3;
        inOrderTriBuffer.numItems = tris.length / 3;

        model = new Object3d({
            triArray: modelData,
            normalsArray: normals,
            x: 1,
            y: 0
        });
        return model;
    }

}

//
// The main loop, running in it's own (pseudo?)thread
//
var lastTime;
var timeNow;

var Animation = {
    callback: function () {}, // User sets this

    renderLoop: function() {
        "use strict";
        if (doneLoading) { // Mechanism to reset callbacks

            // Set the viewport
            gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            // Clear the canvas
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            // Set up the view frustum
            // args:
            // 45 degrees vertical FOV
            // Width/Height ratio
            // Near clipping 0.1 gl units
            // Far clipping 100 gl units
            // Projection matrix
            mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);
            // Orthographic matrix for 2d elements
            mat4.ortho(-1, 1, -1, 1, 0.1, 100, orthoMatrix);

            // Set movement matrix to identity
            mat4.identity(mvMatrix);
            mat4.translate(mvMatrix, [0, 0.0, -8.0]);

            timeNow = new Date().getTime();

            var elapsedTime = timeNow - lastTime;

            //updateTexture(window.videoTexture);

            Animation.callback(elapsedTime, timeNow);
            for (var i = 0; i < models.length; i++) {
                if (models[i].texImage.video) {
                    updateTexture(models[i].texImage);
                }

                models[i].animate(elapsedTime, timeNow);
                models[i].draw();
        }
        requestAnimationFrame(Animation.renderLoop);
        lastTime = timeNow;    
    }
};


//
// A static, nonshadowed object
//
