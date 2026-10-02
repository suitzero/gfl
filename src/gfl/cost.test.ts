import { describe, it, expect } from 'vitest';
import { nodeCost, sceneCost, costBreakdown } from './cost';
import type { ASTNode } from './types';

describe('Cost Model', () => {
  it('computes basic node costs according to spec', () => {
    const sphereNode: ASTNode = { type: 'sphere', children: [], params: {}, cost: 0 };
    expect(nodeCost(sphereNode)).toBe(1);

    const boxNode: ASTNode = { type: 'box', children: [], params: {}, cost: 0 };
    expect(nodeCost(boxNode)).toBe(1);
    
    const smoothUnionNode: ASTNode = { type: 'smooth-union', children: [], params: {}, cost: 0 };
    expect(nodeCost(smoothUnionNode)).toBe(3);

    const noiseNode: ASTNode = { type: 'noise', children: [], params: {}, cost: 0 };
    expect(nodeCost(noiseNode)).toBe(10);
    
    const reflectionNode: ASTNode = { type: 'reflection', children: [], params: {}, cost: 0 };
    expect(nodeCost(reflectionNode)).toBe(20);

    const unknownNode: ASTNode = { type: 'unknown-type', children: [], params: {}, cost: 0 };
    expect(nodeCost(unknownNode)).toBe(1);
  });

  it('computes recursive scene cost', () => {
    const scene: ASTNode = {
      type: 'union',
      cost: 0,
      params: {},
      children: [
        { type: 'sphere', children: [], params: {}, cost: 0 },
        { 
          type: 'translate',
          cost: 0,
          params: {},
          children: [
            { type: 'noise', children: [], params: {}, cost: 0 }
          ]
        }
      ]
    };
    // union(1) + sphere(1) + translate(1) + noise(10) = 13
    expect(sceneCost(scene)).toBe(13);
  });

  it('provides cost breakdown for UI display', () => {
    const scene: ASTNode = {
      type: 'union',
      cost: 0,
      params: {},
      children: [
        { type: 'sphere', children: [], params: {}, cost: 0 },
        { 
          type: 'translate',
          cost: 0,
          params: {},
          children: [
            { type: 'noise', children: [], params: {}, cost: 0 }
          ]
        }
      ]
    };

    const breakdown = costBreakdown(scene);
    
    expect(breakdown).toHaveLength(4);
    
    expect(breakdown).toContainEqual({ path: 'root', nodeType: 'union', cost: 1 });
    expect(breakdown).toContainEqual({ path: 'root.0', nodeType: 'sphere', cost: 1 });
    expect(breakdown).toContainEqual({ path: 'root.1', nodeType: 'translate', cost: 1 });
    expect(breakdown).toContainEqual({ path: 'root.1.0', nodeType: 'noise', cost: 10 });
  });
});
