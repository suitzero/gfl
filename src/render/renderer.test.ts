import { describe, it, expect, vi } from 'vitest';
import { Renderer } from './renderer';
import { getFragmentShaderSource } from './shader';
import { setupControls } from '../ui/controls';
import type { ASTNode } from '../gfl/types';

describe('Renderer & Shaders', () => {
  it('should include hardcoded SDF in fragment shader source', () => {
    const fragmentSrc = getFragmentShaderSource();
    expect(fragmentSrc).toContain('float sdSphere(vec3 p, float s)');
    expect(fragmentSrc).toContain('float map(vec3 p)');
  });

  it('should include budget scaling logic in fragment shader source', () => {
    const fragmentSrc = getFragmentShaderSource();
    expect(fragmentSrc).toContain('uniform float u_budget;');
    expect(fragmentSrc).toContain('mix(10.0, float(BASE_MAX_STEPS), budget_t)');
    expect(fragmentSrc).toContain('getNormal(p, u_budget)');
    expect(fragmentSrc).toContain('if (u_budget > 20.0)'); // specular condition
    expect(fragmentSrc).toContain('if (u_budget > 10.0)'); // shadow condition
  });

  it('should fail cleanly if WebGL2 is not supported', () => {
    const canvas = document.createElement('canvas');
    // JSDOM does not natively support WebGL2 contexts without extensions,
    // so getContext('webgl2') should return null.
    vi.spyOn(canvas, 'getContext').mockReturnValue(null as any);
    
    expect(() => {
      new Renderer(canvas);
    }).toThrow('WebGL2 is not available in your browser.');
  });

  it('should setup budget UI controls and invoke callback', () => {
    document.body.innerHTML = '<div id="controls"></div>';
    
    let currentBudget = 0;
    setupControls((budget) => {
      currentBudget = budget;
    });

    const slider = document.getElementById('budget-slider') as HTMLInputElement;
    expect(slider).not.toBeNull();
    expect(slider.type).toBe('range');
    expect(slider.value).toBe('100');

    // Simulate change
    slider.value = '50';
    slider.dispatchEvent(new Event('input'));
    
    expect(currentBudget).toBe(50);
    
    // Check if label was updated
    const label = document.querySelector('label') as HTMLLabelElement;
    expect(label.textContent).toBe('Render Budget: 50');
    
    document.body.innerHTML = '';
  });

  it('should update active AST when budget changes based on LOD', () => {
    document.body.innerHTML = '<div id="controls"></div>';

    // Mock canvas context
    const canvas = document.createElement('canvas');
    const mockContext = {
      createShader: vi.fn(() => ({})),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn(() => true),
      createProgram: vi.fn(() => ({})),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn(() => true),
      deleteShader: vi.fn(),
      getUniformLocation: vi.fn(),
      createVertexArray: vi.fn(() => ({})),
      bindVertexArray: vi.fn(),
      createBuffer: vi.fn(() => ({})),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      getAttribLocation: vi.fn(() => 0),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),
    };
    vi.spyOn(canvas, 'getContext').mockReturnValue(mockContext as any);

    const renderer = new Renderer(canvas);
    
    const lod0: ASTNode = { type: 'sphere', children: [], params: { r: 1 }, cost: 1, qualityLevel: 0 };
    const lod1: ASTNode = { type: 'tree', children: [], params: {}, cost: 10, qualityLevel: 50, fallback: lod0 };
    const lod2: ASTNode = { type: 'forest', children: [], params: {}, cost: 100, qualityLevel: 80, fallback: lod1 };

    const astChangeSpy = vi.fn();
    renderer.onActiveASTChange = astChangeSpy;

    // Set initial AST, budget is 100 by default, so it should select lod2
    renderer.setAST(lod2);
    expect(astChangeSpy).toHaveBeenCalledTimes(1);
    expect(renderer.activeAST?.type).toBe('forest');

    const slider = document.getElementById('budget-slider') as HTMLInputElement;
    expect(slider).not.toBeNull();

    // Change budget to 50, it should trigger an AST update picking lod1 (tree)
    astChangeSpy.mockClear();
    slider.value = '50';
    slider.dispatchEvent(new Event('input'));
    
    expect(astChangeSpy).toHaveBeenCalledTimes(1);
    expect(renderer.activeAST?.type).toBe('tree');
    
    // Change budget to 1, it should trigger an AST update picking lod0 (sphere)
    astChangeSpy.mockClear();
    slider.value = '1';
    slider.dispatchEvent(new Event('input'));
    
    expect(astChangeSpy).toHaveBeenCalledTimes(1);
    expect(renderer.activeAST?.type).toBe('sphere');

    document.body.innerHTML = '';
  });
});
