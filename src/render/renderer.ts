import { getVertexShaderSource, getFragmentShaderSource } from './shader';
import { setupControls } from '../ui/controls';

export class Renderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  
  // Uniform locations
  private uResolutionLoc: WebGLUniformLocation | null;
  private uCameraPosLoc: WebGLUniformLocation | null;
  private uCameraDirLoc: WebGLUniformLocation | null;
  private uCameraUpLoc: WebGLUniformLocation | null;
  private uLightDirLoc: WebGLUniformLocation | null;
  private uLightColorLoc: WebGLUniformLocation | null;
  private uBudgetLoc: WebGLUniformLocation | null;
  
  private currentBudget: number = 100.0;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2');
    if (!gl) {
      throw new Error('WebGL2 is not available in your browser.');
    }
    this.gl = gl;

    this.program = this.createProgram(getVertexShaderSource(), getFragmentShaderSource());

    this.uResolutionLoc = this.gl.getUniformLocation(this.program, 'u_resolution');
    this.uCameraPosLoc = this.gl.getUniformLocation(this.program, 'u_cameraPos');
    this.uCameraDirLoc = this.gl.getUniformLocation(this.program, 'u_cameraDir');
    this.uCameraUpLoc = this.gl.getUniformLocation(this.program, 'u_cameraUp');
    this.uLightDirLoc = this.gl.getUniformLocation(this.program, 'u_lightDir');
    this.uLightColorLoc = this.gl.getUniformLocation(this.program, 'u_lightColor');
    this.uBudgetLoc = this.gl.getUniformLocation(this.program, 'u_budget');

    this.vao = this.setupQuad();
    
    setupControls((budget) => {
      this.currentBudget = budget;
    });
  }

  private compileShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type);
    if (!shader) {
      throw new Error('Failed to create shader');
    }
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const info = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error(`Shader compilation error: ${info}`);
    }
    return shader;
  }

  private createProgram(vertexSrc: string, fragmentSrc: string): WebGLProgram {
    const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexSrc);
    const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentSrc);

    const program = this.gl.createProgram();
    if (!program) {
      throw new Error('Failed to create WebGL program');
    }
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const info = this.gl.getProgramInfoLog(program);
      this.gl.deleteProgram(program);
      throw new Error(`Program linking error: ${info}`);
    }
    
    // Clean up shaders
    this.gl.deleteShader(vertexShader);
    this.gl.deleteShader(fragmentShader);
    
    return program;
  }

  private setupQuad(): WebGLVertexArrayObject {
    const vao = this.gl.createVertexArray();
    if (!vao) throw new Error('Failed to create VAO');
    
    this.gl.bindVertexArray(vao);
    
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    
    // Full screen quad spanning from -1 to 1
    const vertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);
    
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
    
    const positionLoc = this.gl.getAttribLocation(this.program, 'a_position');
    this.gl.enableVertexAttribArray(positionLoc);
    this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 0, 0);
    
    this.gl.bindVertexArray(null);
    return vao;
  }

  public render(time: number = 0) {
    const { gl, program, vao } = this;
    
    // Ensure canvas dimensions match display size
    const canvas = gl.canvas as HTMLCanvasElement;
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.bindVertexArray(vao);

    gl.uniform2f(this.uResolutionLoc, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(this.uBudgetLoc, this.currentBudget);
    
    // Camera setup
    gl.uniform3f(this.uCameraPosLoc, 0.0, 2.0, -5.0);
    gl.uniform3f(this.uCameraDirLoc, 0.0, -0.2, 1.0); // Looking slightly down and forward
    gl.uniform3f(this.uCameraUpLoc, 0.0, 1.0, 0.0);
    
    // Moving light source over time
    const lightX = Math.sin(time) * 5.0;
    const lightZ = Math.cos(time) * 5.0;
    gl.uniform3f(this.uLightDirLoc, lightX, 5.0, lightZ);
    gl.uniform3f(this.uLightColorLoc, 1.0, 0.9, 0.8);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}
