import { describe, it, expect, vi } from 'vitest';
import { Renderer } from './renderer';
import { getFragmentShaderSource } from './shader';

describe('Renderer & Shaders', () => {
  it('should include hardcoded SDF in fragment shader source', () => {
    const fragmentSrc = getFragmentShaderSource();
    expect(fragmentSrc).toContain('float sdSphere(vec3 p, float s)');
    expect(fragmentSrc).toContain('float map(vec3 p)');
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
});
