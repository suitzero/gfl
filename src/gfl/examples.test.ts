import { describe, it, expect } from 'vitest';
import { EXAMPLE_SCENES, loadExample, onSceneChanged, dispatchSceneChange } from './examples';
import { parseGFL } from './parser';
import { compileToGLSL } from './compiler';

describe('GFL Examples', () => {
  it('should have three examples defined', () => {
    expect(EXAMPLE_SCENES.length).toBe(3);
    expect(EXAMPLE_SCENES[0].id).toBe('scene-a-simple');
    expect(EXAMPLE_SCENES[1].id).toBe('scene-b-robot');
    expect(EXAMPLE_SCENES[2].id).toBe('scene-c-complex');
  });

  it('loadExample should return the correct GFL string', () => {
    const gfl = loadExample('scene-a-simple');
    expect(gfl).toBeDefined();
    expect(gfl).toContain('(sphere :radius 1.0 :center [0 1 0])');
  });

  it('loadExample should return undefined for invalid id', () => {
    const gfl = loadExample('invalid-id');
    expect(gfl).toBeUndefined();
  });

  it('should parse and compile Example A headlessly', () => {
    const gfl = EXAMPLE_SCENES[0].gfl;
    const ast = parseGFL(gfl);
    const glsl = compileToGLSL(ast);
    expect(glsl).toContain('sdSphere');
    expect(glsl).toContain('sdPlane');
  });

  it('should parse and compile Example B headlessly', () => {
    const gfl = EXAMPLE_SCENES[1].gfl;
    const ast = parseGFL(gfl);
    const glsl = compileToGLSL(ast);
    expect(glsl).toContain('sdBox');
    expect(glsl).toContain('sdSphere');
    expect(glsl).toContain('opUnion');
  });

  it('should parse and compile Example C headlessly', () => {
    const gfl = EXAMPLE_SCENES[2].gfl;
    const ast = parseGFL(gfl);
    const glsl = compileToGLSL(ast);
    expect(glsl).toContain('sdSphere');
    expect(glsl).toContain('opUnion');
  });

  it('should support scene change listeners', () => {
    let triggered = false;
    let receivedGfl = '';
    const unsubscribe = onSceneChanged((gfl) => {
      triggered = true;
      receivedGfl = gfl;
    });

    dispatchSceneChange('test-gfl');
    expect(triggered).toBe(true);
    expect(receivedGfl).toBe('test-gfl');

    triggered = false;
    unsubscribe();
    dispatchSceneChange('another-test');
    expect(triggered).toBe(false);
  });
});
