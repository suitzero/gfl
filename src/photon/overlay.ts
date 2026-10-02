import { computePhotonBudgetCurve } from './analysis';

let overlayCanvas: HTMLCanvasElement;
let gl: WebGL2RenderingContext;
let program: WebGLProgram;
let tex: WebGLTexture;
let mainCanvas: HTMLCanvasElement;
let currentN = 1000000;
let time = 0;

export function setPhotonBudget(N: number) {
    currentN = N;
    updateMetrics();
}

function updateMetrics() {
    const metricsContainer = document.getElementById('metrics');
    if (!metricsContainer) return;
    
    let h2 = metricsContainer.querySelector('h2');
    metricsContainer.innerHTML = '';
    if (h2) {
        metricsContainer.appendChild(h2);
    } else {
        h2 = document.createElement('h2');
        h2.textContent = 'Metrics';
        metricsContainer.appendChild(h2);
    }
    
    // Compute stats for current N
    const results = computePhotonBudgetCurve([currentN], 1.0, 1000);
    const result = results[0];
    
    const div = document.createElement('div');
    div.innerHTML = `
        <div><strong>Photon Budget (N):</strong> ${currentN > 1000 ? currentN.toExponential(2) : Math.round(currentN)}</div>
        <div><strong>Theoretical SNR:</strong> ${result.theoreticalSNR.toFixed(2)}</div>
        <div><strong>Measured Noise:</strong> ${result.simulatedError.toFixed(4)}</div>
    `;
    metricsContainer.appendChild(div);
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        throw new Error('Shader compile error');
    }
    return shader;
}

export function initPhotonOverlay() {
    mainCanvas = document.getElementById('render-canvas') as HTMLCanvasElement;
    const renderContainer = document.getElementById('render');
    if (!mainCanvas || !renderContainer) {
        setTimeout(initPhotonOverlay, 100);
        return;
    }
    
    overlayCanvas = document.createElement('canvas');
    overlayCanvas.id = 'photon-overlay';
    overlayCanvas.style.position = 'absolute';
    overlayCanvas.style.top = mainCanvas.offsetTop + 'px';
    overlayCanvas.style.left = mainCanvas.offsetLeft + 'px';
    overlayCanvas.style.width = mainCanvas.offsetWidth + 'px';
    overlayCanvas.style.height = mainCanvas.offsetHeight + 'px';
    overlayCanvas.style.pointerEvents = 'none';
    
    window.addEventListener('resize', () => {
        overlayCanvas.style.top = mainCanvas.offsetTop + 'px';
        overlayCanvas.style.left = mainCanvas.offsetLeft + 'px';
        overlayCanvas.style.width = mainCanvas.offsetWidth + 'px';
        overlayCanvas.style.height = mainCanvas.offsetHeight + 'px';
    });

    // Make main canvas invisible, we will draw it onto overlay
    mainCanvas.style.opacity = '0';
    
    renderContainer.appendChild(overlayCanvas);
    
    const context = overlayCanvas.getContext('webgl2');
    if (!context) return;
    gl = context;
    
    const vsSource = `#version 300 es
    in vec2 a_position;
    out vec2 v_uv;
    void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
    }`;
    
    const fsSource = `#version 300 es
    precision highp float;
    in vec2 v_uv;
    out vec4 outColor;
    
    uniform sampler2D u_tex;
    uniform float u_n;
    uniform float u_time;
    
    float hash(vec3 p) {
        p  = fract(p * .1031);
        p += dot(p, p.zyx + 31.32);
        return fract((p.x + p.y) * p.z);
    }
    
    void main() {
        vec2 uv = v_uv;
        uv.y = 1.0 - uv.y; // flip Y for canvas texture
        vec4 color = texture(u_tex, uv);
        
        float noiseMag = 1.0 / sqrt(u_n);
        
        float r1 = hash(vec3(v_uv * 1000.0, u_time)) - 0.5;
        float r2 = hash(vec3(v_uv * 1000.0, u_time + 1.0)) - 0.5;
        float r3 = hash(vec3(v_uv * 1000.0, u_time + 2.0)) - 0.5;
        
        vec3 noise = vec3(r1, r2, r3) * noiseMag * sqrt(max(color.rgb, 0.0)) * 5.0; 
        
        outColor = vec4(clamp(color.rgb + noise, 0.0, 1.0), 1.0);
    }`;
    
    const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
    
    program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,  1, -1, -1, 1,
        -1,  1,  1, -1,  1, 1,
    ]), gl.STATIC_DRAW);
    
    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    
    tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    
    const renderLoop = () => {
        time += 1.0;
        
        if (overlayCanvas.width !== mainCanvas.width || overlayCanvas.height !== mainCanvas.height) {
            overlayCanvas.width = mainCanvas.width;
            overlayCanvas.height = mainCanvas.height;
            gl.viewport(0, 0, overlayCanvas.width, overlayCanvas.height);
        }
        
        gl.useProgram(program);
        gl.bindVertexArray(vao);
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mainCanvas);
        
        gl.uniform1i(gl.getUniformLocation(program, 'u_tex'), 0);
        gl.uniform1f(gl.getUniformLocation(program, 'u_n'), currentN);
        gl.uniform1f(gl.getUniformLocation(program, 'u_time'), time);
        
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        
        requestAnimationFrame(renderLoop);
    };
    
    requestAnimationFrame(renderLoop);
    updateMetrics();
}
