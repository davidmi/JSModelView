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
	shaderProgram.vertexTextureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
	
	// Provide values for attribute with an array
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
	gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute)
	
	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
	   
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



// Read a file in the Wavefront OBJ format
function readObj(file){
    
    var reader = new FileReader();
    reader.readAsText(file);
    
    var lines = reader.result.split('\n');
    
    var vertices = [];
    var tris = [];
    var quads = [];
    
    for (var i = 0; i < lines.length; i++){
    
        var params = lines[i].split(' ');
        
        // Dump all defined vertices into an array
        if (params[0] == 'v'){
            vertices[vertices.length] = parseFloat(params[1]);
            vertices[vertices.length] = parseFloat(params[2]);
            vertices[vertices.length] = parseFloat(params[3]);   
        }
        
        if (params[0] == 'f'){
            if (params.length < 4){ // It's a triangle
                tris[tris.length] = vertices[parseInt(params[1])];
                tris[tris.length] = vertices[parseInt(params[2])];
                tris[tris.length] = vertices[parseInt(params[3])];
            }
            
            else{ // It's a quad. We won't support any other geometry
                quads[quads.length] = vertices[parseInt(params[1])];
                quads[quads.length] = vertices[parseInt(params[2])];
                quads[quads.length] = vertices[parseInt(params[3])];
                quads[quads.length] = vertices[parseInt(params[4])];
            
            }           
        }
    }
    
    return [tris, quads];
}

var quadBuffer = null;
var triBuffer = null;
var doneLoading = false;

function initBuffers(quads, tris){
    doneLoading = false;
    
    if (quads.length >= 4){
        quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quads), gl.STATIC_DRAW);   
        
        quadBuffer.numItems = quads.length/4;
        quadBuffer.itemSize = 4;
    }
    
    if (tris.length >= 3){
        triBuffer = gl.createBuffer();
        
        gl.bindBuffer(gl.ARRAY_BUFFER, triBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, tris);
        
        triBuffer.numItems = tris.length/3;
        triBuffer.itemSize = 4;
    }
    
    doneLoading = true;
     
}

function renderLoop(){
    // Set the viewport
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    
     // Clear the canvas
     gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
     
     if (doneLoading){
        if (quadBuffer != null){
            gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
            
        }
     }
}


//
// A static, nonshadowed object
//
