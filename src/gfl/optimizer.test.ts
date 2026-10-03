import { describe, it, expect } from 'vitest';
import { optimizeAST, deepEqual } from './optimizer.ts';
import type { ASTNode } from './types.ts';
import { metricTriple } from '../inverse/metrics.ts';

describe('deepEqual', () => {
  it('identifies identical subtrees', () => {
    const a: ASTNode = { type: 'sphere', params: { radius: 1 }, children: [], cost: 1 };
    const b: ASTNode = { type: 'sphere', params: { radius: 1 }, children: [], cost: 1 };
    expect(deepEqual(a, b)).toBe(true);
  });

  it('differentiates non-identical subtrees', () => {
    const a: ASTNode = { type: 'sphere', params: { radius: 1 }, children: [], cost: 1 };
    const b: ASTNode = { type: 'sphere', params: { radius: 2 }, children: [], cost: 1 };
    expect(deepEqual(a, b)).toBe(false);
  });
});

describe('optimizeAST', () => {
  it('removes dead nodes (empty transforms/CSG)', () => {
    const ast: ASTNode = {
      type: 'union',
      params: {},
      children: [
        { type: 'translate', params: { offset: [1, 2, 3] }, children: [], cost: 1 },
        { type: 'sphere', params: { radius: 1 }, children: [], cost: 1 }
      ],
      cost: 1
    };

    const optimized = optimizeAST(ast);
    expect(optimized).not.toBeNull();
    // Dead translate should be removed, and then the union wrapping only the sphere should be reduced to just the sphere
    expect(optimized?.type).toBe('sphere');
  });

  it('removes redundant wrappers', () => {
    const ast: ASTNode = {
      type: 'union',
      params: {},
      children: [
        { type: 'sphere', params: { radius: 1 }, children: [], cost: 1 }
      ],
      cost: 1
    };
    const optimized = optimizeAST(ast);
    expect(optimized?.type).toBe('sphere');
  });

  it('deduplicates identical subtrees in union', () => {
    const ast: ASTNode = {
      type: 'union',
      params: {},
      children: [
        { type: 'sphere', params: { radius: 1 }, children: [], cost: 1 },
        { type: 'sphere', params: { radius: 1 }, children: [], cost: 1 }
      ],
      cost: 1
    };
    const optimized = optimizeAST(ast);
    expect(optimized?.type).toBe('sphere');
  });

  it('merges repeated translates', () => {
    const ast: ASTNode = {
      type: 'translate',
      params: { offset: [1, 0, 0] },
      children: [
        {
          type: 'translate',
          params: { offset: [0, 2, 0] },
          children: [
            { type: 'sphere', params: { radius: 1 }, children: [], cost: 1 }
          ],
          cost: 1
        }
      ],
      cost: 1
    };

    const optimized = optimizeAST(ast);
    expect(optimized?.type).toBe('translate');
    expect(optimized?.params.offset).toEqual([1, 2, 0]);
    expect(optimized?.children[0].type).toBe('sphere');
  });
  
  it('constant folding translates with 0 offset', () => {
    const ast: ASTNode = {
      type: 'translate',
      params: { offset: [0, 0, 0] },
      children: [
        { type: 'sphere', params: { radius: 1 }, children: [], cost: 1 }
      ],
      cost: 1
    };
    const optimized = optimizeAST(ast);
    expect(optimized?.type).toBe('sphere');
  });

  it('merges repeated scales', () => {
    const ast: ASTNode = {
      type: 'scale',
      params: { factor: 2.0 },
      children: [
        {
          type: 'scale',
          params: { factor: 3.0 },
          children: [
            { type: 'sphere', params: { radius: 1 }, children: [], cost: 1 }
          ],
          cost: 1
        }
      ],
      cost: 1
    };

    const optimized = optimizeAST(ast);
    expect(optimized?.type).toBe('scale');
    expect(optimized?.params.factor).toBe(6.0);
    expect(optimized?.children[0].type).toBe('sphere');
  });

  it('satisfies acceptance criteria: lower AST size/cost with metricTriple', () => {
    const unoptimizedAst: ASTNode = {
      type: 'union',
      params: {},
      children: [
        { type: 'sphere', params: { radius: 1 }, children: [], cost: 1 },
        { type: 'sphere', params: { radius: 1 }, children: [], cost: 1 },
        {
          type: 'translate',
          params: { offset: [0,0,0] },
          children: [
            { type: 'sphere', params: { radius: 1 }, children: [], cost: 1 }
          ],
          cost: 1
        },
        {
          type: 'translate',
          params: { offset: [1,1,1] },
          children: [],
          cost: 1
        }
      ],
      cost: 1
    };

    const optimizedAst = optimizeAST(unoptimizedAst) as ASTNode;

    const mockTarget = { width: 1, height: 1, data: new Uint8Array([0, 0, 0, 0]) };
    const mockRender = { width: 1, height: 1, data: new Uint8Array([0, 0, 0, 0]) };

    const unoptMetrics = metricTriple({ target: mockTarget, render: mockRender }, unoptimizedAst);
    const optMetrics = metricTriple({ target: mockTarget, render: mockRender }, optimizedAst);

    expect(optMetrics.programSize).toBeLessThan(unoptMetrics.programSize);
    expect(optMetrics.runtimeCost).toBeLessThan(unoptMetrics.runtimeCost);
    expect(optMetrics.reconstructionError).toBe(unoptMetrics.reconstructionError); // Because target == render in both
  });

  it('removes dead repeat nodes', () => {
    const ast: ASTNode = {
      type: 'union',
      params: {},
      children: [
        { type: 'repeat', params: { count: 5 }, children: [], cost: 1 },
        { type: 'sphere', params: { radius: 1 }, children: [], cost: 1 }
      ],
      cost: 1
    };

    const optimized = optimizeAST(ast);
    expect(optimized?.type).toBe('sphere');
  });

  it('reduces cost on programs containing repeat nodes', () => {
    const ast: ASTNode = {
      type: 'union',
      params: {},
      children: [
        {
          type: 'repeat',
          params: { count: 3, spacing: 2 },
          children: [
            { type: 'translate', params: { offset: [0,0,0] }, children: [
                { type: 'sphere', params: { radius: 1 }, children: [], cost: 1 }
              ], cost: 1 }
          ],
          cost: 1
        }
      ],
      cost: 1
    };

    const optimized = optimizeAST(ast);
    expect(optimized).not.toBeNull();
    // Union wrapper goes away, repeat remains but its child translate (0 offset) gets folded.
    expect(optimized?.type).toBe('repeat');
    expect(optimized?.children[0].type).toBe('sphere');
  });
});
