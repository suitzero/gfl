import { describe, it, expect, vi } from 'vitest';
import { Renderer } from './renderer';
import { getFragmentShaderSource } from './shader';
import { setupControls } from '../ui/controls';

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
});
