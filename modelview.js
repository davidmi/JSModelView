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
// Version 0.01:
// Goals: Load and display vertices of a local .obj file, no .mtl, no complicated lighting and no texturing as of yet
//
// Version 0.02:
// Goals: Simple lighting. Vertex colors. Vertex normals.
//
// Version 0.03:
// Goals: Handle fullscreen/screen resize? Textures.
//
// Further versions (0.10 and onwards, perhaps after restructuring, name change):
// Normalmaps? Cast shadows (if that's even possible in realtime webgl)? Morph/skeletal animations? Render optimizations?
// Data structures (quadtrees, parent-child objects?)? Something else I don't know about as of yet?
// Time will tell, I guess.


//Disable this and all calls to it in production
function errlog(msg){
    if (typeof console != 'undefined') {
        console.log(msg);
    }
}

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
var pMatrix = mat4.create();

// Key states
var pressedKeys = [];

//
// Util functions
//

function radians(rotationDegrees){
    return rotationDegrees/180*Math.PI%(2*Math.PI);
}

function degrees(rotationRadians){
    return rotationRadians/Math.PI*180%(2*Math.PI);
}   

function handleKeyDown(event){
    pressedKeys[event.keyCode] = true;
}

function handleKeyUp(event){
    pressedKeys[event.keyCode] = false;
}


//
// Run this function first - it'll get us our gl object
// 

function initGL(canvas){
    try {
        gl = canvas.getContext("experimental-webgl");
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
        
    } catch (e) {
        // Put webgl fail stuff here?
    }
    if (!gl){
        alert("Could not initialize WebGL, sorry :( ");
    }
}

//
// Utility functions
//

function requestAnimationFrame(drawScene){ // Argument is the function to draw      
    
        if (window.webkitRequestAnimationFrame){
            window.webkitRequestAnimationFrame(drawScene);
            return;
        }
            
        if (window.mozRequestAnimationFrame){
            window.mozRequestAnimationFrame(drawScene);
            return;
        }
        
        if (window.requestAnimationFrame){
            window.requestAnimationFrame(drawScene);
            return;
        }
}


//
// GL functions
//

// Shaderses!!!! - Fix this to use the ajax text files vertex_shader.txt and fragment_shader.txt
function getShader(gl, str, mime){
    
    var shader;
    if (mime == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
        
    } else if (mime == "x-shader/x-vertex") {
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


// Fix this to use ajax as well
function initShaders(vShaderText, fShaderText) {
    var fragmentShader = getShader(gl, fShaderText, "x-shader/x-fragment");
    var vertexShader = getShader(gl, vShaderText, "x-shader/x-vertex");
    
    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)){
        alert("could not initialize shaders");
    }
    
    gl.useProgram(shaderProgram);
    
    // new field        
    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    errlog("Got vertex position attribute " + shaderProgram.vertexPositionAttribute);
    //shaderProgram.vertexTextureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
    //errlog("Got tex coord attr: " + shaderProgram.vertexTextureCoordAttribute);
    
    // Provide values for attribute with an array
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
    //gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute)
    
    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    //shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
       
}

function setMatrixUniforms() {
    // Use the projection and model-view matrices in changing vertex position
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

function mvPopMatrix(){
    if (mvMatrixStack.length == 0) {
        throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

function mvPushMatrix(){
    var copy = mat4.create();
    mat4.set(mvMatrix, copy);
    mvMatrixStack.push(copy);
}


function loadObj(e){
    var lines = e.target.result.split('\n');
    
    var vertices = [];
    var vertexNormals = [];
    var tris = [];
    var normals = [];
    var quads = [];
    
    var vertexIndices = [];
    
    for (var i = 0; i < lines.length; i++){
    
        var params = lines[i].split(' ');
        
        // Dump all defined vertices into an array
        if (params[0] == 'v'){
            vertices[vertices.length] = parseFloat(params[1]);
            vertices[vertices.length] = parseFloat(params[2]);
            vertices[vertices.length] = parseFloat(params[3]);   
        }
        
        if (params[0] == 'vn'){
        	for (var j = 1; j < 4; j++){
        		vertexNormals[vertexNormals.length] = parseFloat(params[j])
        	}
        }
        
        if (params[0] == 'f'){
            var vertexCoords = [];
            var normalCoords = [];

            for (var j = 1; j < params.length; j++){
                var split = params[j].split("//");
                vertexCoords[vertexCoords.length] = split[0];
                if (split.length > 1){
                    normalCoords[normalCoords.length] = split[1];
                }
            }
            //console.log(vertexCoords);
            if (vertexCoords.length < 4){ // It's a triangle
                // Load vertices
                for (var j = 0; j < 9; j++){
                    tris[tris.length] = vertices[3*parseInt(vertexCoords[Math.floor(j/3)] - 1) + j];
                }

                if (vertexNormals.length > 0){
                    // Load vertex normals
                    for (var j = 0; j < 9; j++){
                        normals[normals.length] = vertexNormals[3*parseInt(normalCoords[Math.floor(j/3)] - 1) + j];
                    }
                }
                //tris[tris.length] = vertices[3*parseInt(vertexCoords[0]) - 1];
                //tris[tris.length] = vertices[3*parseInt(vertexCoords[1]) - 1];
                //tris[tris.length] = vertices[3*parseInt(vertexCoords[2]) - 1];
                
                vertexIndices[vertexIndices.length] = parseInt(vertexCoords[0]) - 1;
                vertexIndices[vertexIndices.length] = parseInt(vertexCoords[1]) - 1;
                vertexIndices[vertexIndices.length] = parseInt(vertexCoords[2]) - 1;
                
            }
            
            else{ // It's a quad.
            
                for (var j = 0; j < 3; j++){
                    tris[tris.length] = vertices[3*parseInt(vertexCoords[0] - 1) + j];
                }
                for (var j = 0; j < 3; j++){
                    tris[tris.length] = vertices[3*parseInt(vertexCoords[1] - 1) + j];
                }
                for (var j = 0; j < 3; j++){
                    tris[tris.length] = vertices[3*parseInt(vertexCoords[2] - 1) + j];
                }
                
                for (var j = 0; j < 3; j++){
                    tris[tris.length] = vertices[3*parseInt(vertexCoords[2] - 1) + j];
                }
                
                for (var j = 0; j < 3; j++){
                    tris[tris.length] = vertices[3*parseInt(vertexCoords[3] - 1) + j];
                }
                
                for (var j = 0; j < 3; j++){
                    tris[tris.length] = vertices[3*parseInt(vertexCoords[0] - 1) + j];
                }
                
                
                // Assuming the quad is specified in circumferential order
                vertexIndices[vertexIndices.length] = parseInt(vertexCoords[0]) - 1;
                vertexIndices[vertexIndices.length] = parseInt(vertexCoords[1]) - 1; 
                vertexIndices[vertexIndices.length] = parseInt(vertexCoords[2]) - 1;
                
                vertexIndices[vertexIndices.length] = parseInt(vertexCoords[0]) - 1;
                vertexIndices[vertexIndices.length] = parseInt(vertexCoords[2]) - 1;
                vertexIndices[vertexIndices.length] = parseInt(vertexCoords[3]) - 1;
            
            }           
        }
    }
    
    errlog('vertices: ' + vertices);
    initBuffers(vertices, vertexIndices, tris);
    //return [tris, quads, vertices, vertexIndices];
}


// Read a file in the Wavefront OBJ format
function readObj(file){
    
    var reader = new FileReader();
    reader.onload = loadObj;
    reader.readAsText(file);
    
    errlog(reader);
    
    
}


//
// Object definitions
//


// ## Class Object3d



function Object3d(options){ //later, normals, colors, uv, etc
    //TODO: Change args to object 
    if (options == undefined){
        options = {};
    }
    this.tris = options.triArray || [];
    this.triangleBuffer = gl.createBuffer();  

    if (this.tris.length > 2) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.triangleBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.tris), gl.STATIC_DRAW);
    }
    
    this.triangleBuffer.numItems = this.tris.length/3;
    this.triangleBuffer.itemSize = 3;
    
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.z = options.z || 0;
    
    this.xRot = (options.xRot || 0)/180*Math.PI%(2*Math.PI);
    this.yRot = (options.yRot || 0)/180*Math.PI%(2*Math.PI);
    this.zRot = (options.zRot || 0)/180*Math.PI%(2*Math.PI);

}

Object3d.prototype.draw = function(){
    mvPushMatrix();
    
    mat4.translate(mvMatrix, [this.x, this.y, this.z]);
    mat4.rotateX(mvMatrix, this.xRot);
    mat4.rotateY(mvMatrix, this.yRot);
    mat4.rotateZ(mvMatrix, this.zRot);
    
    if (this.tris.length > 2){
        gl.bindBuffer(gl.ARRAY_BUFFER, this.triangleBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.triangleBuffer.itemSize, gl.FLOAT, false, 0, 0);
        setMatrixUniforms();
        gl.drawArrays(gl.TRIANGLES, 0, this.triangleBuffer.numItems);
    }
    
    mvPopMatrix();

    // Set update time
}





// ## End Class Drawable3d


// The geometry and other data will later be moved into an Object3d
var triBuffer;
var inOrderTriBuffer;
var indexBuffer;
var doneLoading = false;

var modelData;
var model;

function initBuffers(vertices, vertexIndices, tris){
    doneLoading = false;
    
    if (vertices.length >= 3){
    
        modelData = tris;
    
        triBuffer = gl.createBuffer();
        
        gl.bindBuffer(gl.ARRAY_BUFFER, triBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        
        errlog(vertices);
        errlog(vertexIndices);
        
        triBuffer.numItems = vertices.length/3;
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
        inOrderTriBuffer.numItems = tris.length/3;
        
        doneLoading = true;
        
        model = new Object3d({triArray: modelData, x: 1, y: 0});
        
        //renderLoop();
    }
     
}



//
// The main loop, running in it's own (pseudo?)thread
//
var lastTime;
var timeNow;
function renderLoop(){
    
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
    
    // Set movement matrix to identity
    mat4.identity(mvMatrix);
    mat4.translate(mvMatrix, [0, 0.0, -8.0]);
    
    //errlog("Found data");   

    timeNow = new Date().getTime();
     
    if (doneLoading){
        elapsedTime = timeNow - lastTime;
        if (pressedKeys[38]){ // Up
            model.xRot += Math.PI/3*elapsedTime/1000.0;
        }
        if (pressedKeys[40]){ // Down
            model.xRot += -Math.PI/3*elapsedTime/1000.0;
        }
        if (pressedKeys[39]){ // Right
            model.yRot += Math.PI/3*elapsedTime/1000.0;
        }
        if (pressedKeys[37]){ // Left
            model.yRot += -Math.PI/3*elapsedTime/1000.0;
        }
        model.draw();
        //console.log(model.xRot);
        
        if (triBuffer != null){
            /*
            //mat4.translate(mvMatrix, [3.0, 0, 0]);
            gl.bindBuffer(gl.ARRAY_BUFFER, inOrderTriBuffer);
            gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, inOrderTriBuffer.itemSize, gl.FLOAT, false, 0, 0);
            setMatrixUniforms();
            gl.drawArrays(gl.TRIANGLES, 0, inOrderTriBuffer.numItems);
        
        
            errlog("Got tris");
            gl.bindBuffer(gl.ARRAY_BUFFER, triBuffer);
            
            // Use this for vertex positions
            gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, triBuffer.itemSize, gl.FLOAT, false, 0, 0);

            errlog("Vertex position attribute: " + shaderProgram.vertexPositionAttribute + " tribuffer itemsize: " + triBuffer.itemSize);
            errlog(triBuffer);
            
            // Index into the array data
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            
            // Take account of current model-view matrix and projection matrix
            setMatrixUniforms();
        
            // as opposed to gl.drawArrays
            //gl.drawElements(gl.TRIANGLES, 0, indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
            */
            
        }
     }
     
     requestAnimationFrame(renderLoop);
     lastTime = timeNow;
}


//
// A static, nonshadowed object
//
