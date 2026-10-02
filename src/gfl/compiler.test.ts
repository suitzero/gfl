import { describe, it, expect } from 'vitest';
import { compileToGLSL } from './compiler';
import { parseGFL } from './parser';

describe('GFL Compiler', () => {
    it('compiles a basic sphere', () => {
        const ast = parseGFL(`(sphere :radius 2.0 :center [0 1 0])`);
        const shader = compileToGLSL(ast);
        expect(shader).toContain('sdSphere');
        expect(shader).toContain('vec3(0.00000, 1.00000, 0.00000)');
        expect(shader).toContain('2.00000');
    });

    it('compiles a basic box', () => {
        const ast = parseGFL(`(box :size [1 2 3])`);
        const shader = compileToGLSL(ast);
        expect(shader).toContain('sdBox');
        expect(shader).toContain('vec3(1.00000, 2.00000, 3.00000)');
    });

    it('compiles nested CSG and transforms', () => {
        const ast = parseGFL(`
            (union
                (translate :offset [1 0 0] (sphere :radius 1))
                (scale :factor 2.0 (box :size [1 1 1]))
            )
        `);
        const shader = compileToGLSL(ast);
        expect(shader).toContain('opUnion');
        expect(shader).toContain('sdSphere');
        expect(shader).toContain('sdBox');
        expect(shader).toContain('vec3(1.00000, 0.00000, 0.00000)');
        expect(shader).toContain('2.00000');
    });

    it('round trips step-2 example scenes to deterministic GLSL', () => {
        const ast1 = parseGFL(`
          (scene
            (camera :fov 45 :position [0 0 10])
            (light :color "white" :intensity 2)
            (union
              (translate :offset [1 2 3] (box :size [2 2 2]))
              (sphere :radius 1.5)
            )
          )
        `);
        const shader1 = compileToGLSL(ast1);
        const shader1b = compileToGLSL(ast1);
        expect(shader1).toBe(shader1b);
        expect(shader1).toContain('opUnion');
        expect(shader1).toContain('sdBox');
        expect(shader1).toContain('sdSphere');
        
        // Ensure lighting / camera params from scene are partially extracted
        expect(shader1).toContain('vec3(0.00000, 0.00000, 10.00000)'); // Camera pos
    });
    
    it('compiles all requested primitive and CSG types', () => {
        const ast = parseGFL(`
            (intersect
                (subtract
                    (plane :normal [0 1 0] :offset 1.0)
                    (sphere :radius 1.0)
                )
                (smooth-union :k 0.1
                    (box :size [1 1 1])
                    (sphere :radius 0.5)
                )
            )
        `);
        const shader = compileToGLSL(ast);
        expect(shader).toContain('opIntersect');
        expect(shader).toContain('opSubtract');
        expect(shader).toContain('sdPlane');
        expect(shader).toContain('opSmoothUnion');
    });

    it('compiles fallback when budget is below cost on refine node', () => {
        const ast = parseGFL(`(refine :cost 20 :fallback (box :size [1 1 1]) (sphere :radius 1.0))`);
        const shader = compileToGLSL(ast, 10);
        expect(shader).toContain('sdBox(p, vec3(1.00000, 1.00000, 1.00000))');
        expect(shader).not.toContain('sdSphere(p, 1.00000)');
    });

    it('compiles full representation when budget is above cost on refine node', () => {
        const ast = parseGFL(`(refine :cost 20 :fallback (box :size [1 1 1]) (sphere :radius 1.0))`);
        const shader = compileToGLSL(ast, 30);
        expect(shader).toContain('sdSphere(p, 1.00000)');
        expect(shader).not.toContain('sdBox(p, vec3(1.00000, 1.00000, 1.00000))');
    });

    it('compiles fallback on regular node when budget is below cost', () => {
        const ast = parseGFL(`(sphere :radius 1.0 :cost 15 :fallback (box :size [1 1 1]))`);
        const shader = compileToGLSL(ast, 10);
        expect(shader).toContain('sdBox(p, vec3(1.00000, 1.00000, 1.00000))');
        expect(shader).not.toContain('sdSphere(p, 1.00000)');
    });

    it('handles nested refine nodes correctly', () => {
        const ast = parseGFL(`
            (refine :cost 50 :fallback (box :size [1 1 1])
                (refine :cost 100 :fallback (sphere :radius 1.0)
                    (plane :normal [0 1 0] :offset 1.0)
                )
            )
        `);
        // Budget 20: below 50, gets outer fallback (box)
        const shader1 = compileToGLSL(ast, 20);
        expect(shader1).toContain('sdBox(p, vec3(1.00000, 1.00000, 1.00000))');
        expect(shader1).not.toContain('sdSphere(p, 1.00000)');
        expect(shader1).not.toContain('sdPlane(p, vec3(0.00000, 1.00000, 0.00000), 1.00000)');

        // Budget 70: above 50, below 100, gets inner fallback (sphere)
        const shader2 = compileToGLSL(ast, 70);
        expect(shader2).toContain('sdSphere(p, 1.00000)');
        expect(shader2).not.toContain('sdBox(p, vec3(1.00000, 1.00000, 1.00000))');
        expect(shader2).not.toContain('sdPlane(p, vec3(0.00000, 1.00000, 0.00000), 1.00000)');

        // Budget 150: above 100, gets full expression (plane)
        const shader3 = compileToGLSL(ast, 150);
        expect(shader3).toContain('sdPlane(p, vec3(0.00000, 1.00000, 0.00000), 1.00000)');
        expect(shader3).not.toContain('sdBox(p, vec3(1.00000, 1.00000, 1.00000))');
        expect(shader3).not.toContain('sdSphere(p, 1.00000)');
    });
});
