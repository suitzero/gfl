import { describe, it, expect } from 'vitest';
import { parseGFL, serializeGFL, deserializeGFL, ParseError } from './parser';

describe('GFL Parser', () => {
  it('parses a basic primitive', () => {
    const code = `(sphere :radius 5 :center [0 0 0])`;
    const ast = parseGFL(code);
    expect(ast.type).toBe('sphere');
    expect(ast.params.radius).toBe(5);
    expect(ast.params.center).toEqual([0, 0, 0]);
    expect(ast.children).toHaveLength(0);
  });

  it('parses nested transforms and CSG ops', () => {
    const code = `
      (union
        (translate :offset [1 2 3] (box :size [2 2 2]))
        (sphere :radius 1.5)
      )
    `;
    const ast = parseGFL(code);
    expect(ast.type).toBe('union');
    expect(ast.children).toHaveLength(2);
    
    const child1 = ast.children[0];
    expect(child1.type).toBe('translate');
    expect(child1.params.offset).toEqual([1, 2, 3]);
    expect(child1.children).toHaveLength(1);
    expect(child1.children[0].type).toBe('box');
    expect(child1.children[0].params.size).toEqual([2, 2, 2]);

    const child2 = ast.children[1];
    expect(child2.type).toBe('sphere');
    expect(child2.params.radius).toBe(1.5);
  });

  it('parses material/color and camera/light', () => {
    const code = `
      (scene
        (camera :fov 45 :position [0 0 10])
        (light :color "white" :intensity 2)
        (material :color "red" :roughness 0.5 (sphere :radius 1))
      )
    `;
    const ast = parseGFL(code);
    expect(ast.type).toBe('scene');
    expect(ast.children).toHaveLength(3);
    expect(ast.children[0].type).toBe('camera');
    expect(ast.children[0].params.fov).toBe(45);
    expect(ast.children[1].type).toBe('light');
    expect(ast.children[1].params.color).toBe('white');
    expect(ast.children[2].type).toBe('material');
    expect(ast.children[2].params.color).toBe('red');
    expect(ast.children[2].children[0].type).toBe('sphere');
  });

  it('reports exact line and column for parse errors', () => {
    const code = `(sphere\n:radius)`;
    try {
      parseGFL(code);
      expect.fail('Should have thrown an error');
    } catch (e: any) {
      expect(e).toBeInstanceOf(ParseError);
      expect(e.line).toBe(2);
      expect(e.column).toBe(1); // the ':radius' keyword
    }
  });

  it('reports exact line and column for unterminated string', () => {
    const code = `(light :color "white)`;
    try {
      parseGFL(code);
      expect.fail('Should have thrown an error');
    } catch (e: any) {
      expect(e).toBeInstanceOf(ParseError);
      expect(e.line).toBe(1);
      expect(e.column).toBe(15);
    }
  });

  it('serializes to JSON and round-trips', () => {
    const code = `(union (sphere :radius 1) (box :size [1 1 1]))`;
    const ast = parseGFL(code);
    const json = serializeGFL(ast);
    const roundTripped = deserializeGFL(json);
    expect(roundTripped).toEqual(ast);
  });
});
