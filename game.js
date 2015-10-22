// game.js
// Helper functions for programming a game

function errlog(msg) {
    "use strict";
    //Disable this and all calls to it in production
    if (typeof console != 'undefined') {
        console.log(msg);
    }
}

function createCube(multiplier, texture) {
    "use strict";

    var vpos = [
        [1, -1, -1],
        [1, -1, 1],
        [-1, -1, 1],
        [-1, -1, -1],
        [1, 1, -1],
        [1, 1, 1],
        [-1, 1, 1],
        [-1, 1, -1]
    ];

    var triindices = [
        1, 2, 3, 
        3, 4, 1,

        5, 8, 7,
        7, 6, 5,

        1, 5, 6,
        6, 2, 1,

        2, 6, 7,
        7, 3, 2,

        3, 7, 8,
        8, 4, 3,

        5, 1, 4,
        4, 8, 5
    ];

    var i;
    var vertices = [];
    for (i = 0; i < triindices.length; i++){
        vertices = vertices.concat(vpos[triindices[i] - 1]);
    }

    for (i = 0; i < vertices.length; i++){
        vertices[i] = vertices[i] * multiplier;
    }

    console.log(vertices);

    var normals = [
        0.0, -1.0, 0.0,
        0.0, -1.0, 0.0,
        0.0, -1.0, 0.0,
        0.0, -1.0, 0.0,
        0.0, -1.0, 0.0,
        0.0, -1.0, 0.0,

        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,

        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,

        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,

        -1.0, 0.0, 0.0,
        -1.0, 0.0, 0.0,
        -1.0, 0.0, 0.0,
        -1.0, 0.0, 0.0,
        -1.0, 0.0, 0.0,
        -1.0, 0.0, 0.0,

        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
    ];

    var tci = [
        1, 2, 3,
        3, 4, 1,

        5, 6, 7,
        7, 8, 5,
        
        1, 9, 10,
        10, 2, 1,

        2, 11, 12,
        12, 3, 2,

        3, 7, 6,
        6, 4, 3,

        13, 1, 4,
        4, 14, 13
    ];

    var t_coords = [
        [0.265590, 0.611815],
        [0.265402, 0.376782],
        [0.499205, 0.376593],
        [0.498163, 0.611626],
        [0.969460, 0.610019],
        [0.728274, 0.608977],
        [0.728086, 0.377635],
        [0.968041, 0.377447],
        [0.029327, 0.610773],
        [0.029138, 0.376970],
        [0.265214, 0.144209],
        [0.499016, 0.144021],
        [0.264548, 0.846848],
        [0.499582, 0.845429],
    ];

    var texcoords = [];
    for (i=0; i < tci.length; i++){
        texcoords = texcoords.concat(t_coords[tci[i] - 1]);
    }

    console.log(texcoords);
    console.log(texcoords.length);

    //window.videoTexture = initTexture(texture)
    var tex;
    if ((typeof texture) === 'string'){
        tex = initTexture(texture);
    }
    else {
        tex = initPreloadedTexture(texture);
    }
    var model = new Object3d({
        triArray: vertices,
        normalsArray: normals,
        x: 0,
        y: 0,
        texCoords: texcoords,
        texImage: tex
    });

    model.depth = true;

    return model;
}

function createSprite(height, width, depth, texture) {
    "use strict";
    var vertices = [
        width, height, depth, -width, height, depth,
        width, -height, depth, -width, height, depth, -width, -height, depth,
        width, -height, depth
    ];

    var normals = [
        0.0, 0.0, -1.0,
        0.0, 0.0, -1.0,
        0.0, 0.0, -1.0,
        0.0, 0.0, -1.0,
        0.0, 0.0, -1.0,
        0.0, 0.0, -1.0
    ];

    var texcoords = [
        1.0, 1.0,
        0.0, 1.0,
        1.0, 0.0,
        0.0, 1.0,
        0.0, 0.0,
        1.0, 0.0
    ];

    //window.videoTexture = initTexture(texture)
    var tex;
    if ((typeof texture) === 'string'){
        tex = initTexture(texture);
    }
    else {
        tex = initPreloadedTexture(texture);
    }
    var model = new Object3d({
        triArray: vertices,
        normalsArray: normals,
        x: 0,
        y: 0,
        texCoords: texcoords,
        texImage: tex
    });

    return model;
}

function createVideoSprite(height, width, depth, texture) {
    "use strict";
    var vertices = [
        width, height, depth, -width, height, depth,
        width, -height, depth, -width, height, depth, -width, -height, depth,
        width, -height, depth
    ];

    var normals = [
        0.0, 0.0, -1.0,
        0.0, 0.0, -1.0,
        0.0, 0.0, -1.0,
        0.0, 0.0, -1.0,
        0.0, 0.0, -1.0,
        0.0, 0.0, -1.0
    ];

    var texcoords = [
        1.0, 1.0,
        0.0, 1.0,
        1.0, 0.0,
        0.0, 1.0,
        0.0, 0.0,
        1.0, 0.0
    ];

    //window.videoTexture = initTexture(texture)
    var tex = initVideoTexture(texture);
    var model = new Object3d({
        triArray: vertices,
        normalsArray: normals,
        x: 0,
        y: 0,
        texCoords: texcoords,
        texImage: tex
    });

    return model;
}

function loadModel() {
    "use strict";
    errlog(typeof document.getElementById("loadFile"));
    errlog(typeof document.getElementById("loadFile"));
    //readObj(document.getElementById("loadFile").files[0]);
    //initBuffers(arr[2], arr[3]);    

    models.push(createSprite(0.4, 0.4, 0.5, "tex.png"));
    doneLoading = true;
}

function parseHtmlToString(id) {
    "use strict";
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
        return null;
    }

    // Just parse the text of the shader
    var str = "";
    var k = shaderScript.firstChild;
    while (k) {
        // 3 - TEXT_NODE
        if (k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }

    return str;
}

var count = 0;
var fragmentShader;
var vertexShader;

function callback(data) {
    "use strict";

    count++;
    if (count < 2) {
        return;
    }

    // Start GL
    initGL($("#game-view")[0]);

    // Try to load shaders, check if we're getting the shader text correctly
    initShaders(vertexShader, fragmentShader);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    //gl.enable(gl.DEPTH_TEST);


}

function renderText(text, color, size, fontname){
    "use strict";
    var canvas = $('<canvas></canvas>')[0];
    canvas.height = 1024;
    canvas.width = 1024;
    var ctx = canvas.getContext('2d');

    ctx.fillStyle = "rgba(0,0,255,0)";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.fillStyle = color;  // This determines the text colour, it can take a hex value or rgba value (e.g. rgba(255,0,0,0.5))
    ctx.textAlign = "center";   // This determines the alignment of text, e.g. left, center, right
    ctx.textBaseline = "middle";    // This determines the baseline of the text, e.g. top, middle, bottom
    if (fontname === undefined) {fontname = '"Berlin Sans FB"'}
    ctx.font = ''+  size + ' ' + fontname ;    // This determines the size of the text and the font family used

    ctx.fillText(text, canvas.width/2, canvas.height/2);

    return canvas;
}

function redrawText(canvas, text, color, size){
    "use strict";
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = "rgba(0,0,255,0)";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.fillStyle = color;  // This determines the text colour, it can take a hex value or rgba value (e.g. rgba(255,0,0,0.5))
    ctx.textAlign = "center";   // This determines the alignment of text, e.g. left, center, right
    ctx.textBaseline = "middle";    // This determines the baseline of the text, e.g. top, middle, bottom
    ctx.font = ''+  size +" Berlin Sans FB";    // This determines the size of the text and the font family used

    ctx.fillText(text, canvas.width/2, canvas.height/2);
}

function startVideo() {
    "use strict";
    console.log('playing video!');
    videoElement.play();
}

function videoDone() {

}

$(document).ready(function() {
    "use strict";
    console.log("test");

    addEventListener('resize', resizeCanvas);
    
    //$.get("fragment_shader.txt", undefined, function(data){
    // Was loading this from another file, but this is inconvenient for
    // running the app locally. Inlined shaders for now
    //fragmentShader = data; 
    fragmentShader = $('#fragment-shader').text();

    callback();
    //});
    //$.get("vertex_shader.txt", undefined, function(data){
    //vertexShader = data; 
    vertexShader = $('#vertex-shader').text();
    callback();
    //});
    //
    // Disable keyboard shortcuts for the browser
    // Prevent the backspace key from navigating back.
    $(document).unbind('keydown').bind('keydown', function (event) {
        var doPrevent = false;

        if (event.keyCode == 70){
            if (screenfull.enabled) {
                screenfull.request(document.getElementById("game-view"));
            }
            else {
                console.log('Failed to get fullscreen!');
            }
        }

        if (event.keyCode < 117 && event.keyCode > 111){
            doPrevent = true;   
        }
        if (event.keyCode === 8) {
            var d = event.srcElement || event.target;
            if ((d.tagName.toUpperCase() === 'INPUT' && (d.type.toUpperCase() === 'TEXT' || d.type.toUpperCase() === 'PASSWORD' || d.type.toUpperCase() === 'FILE' || d.type.toUpperCase() === 'EMAIL' )) 
                 || d.tagName.toUpperCase() === 'TEXTAREA') {
                doPrevent = d.readOnly || d.disabled;
            }
            else {
                doPrevent = true;
            }
        }

        if (doPrevent) {
            event.preventDefault();
        }
    });

    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;
    mainIntro();


});
