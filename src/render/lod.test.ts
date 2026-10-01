import { describe, it, expect } from 'vitest';
import { selectLOD } from './lod';
import type { ASTNode } from '../gfl/types';

describe('selectLOD', () => {
  it('should select lowest LOD for budget 1', () => {
    const lod0: ASTNode = { type: 'sphere', children: [], params: { r: 1 }, cost: 1, qualityLevel: 0 };
    const lod1: ASTNode = { type: 'tree', children: [], params: {}, cost: 10, qualityLevel: 50, fallback: lod0 };
    const lod2: ASTNode = { type: 'forest', children: [], params: {}, cost: 100, qualityLevel: 80, fallback: lod1 };

    const result = selectLOD(lod2, 1);
    expect(result.type).toBe('sphere');
  });

  it('should select middle LOD for budget 50', () => {
    const lod0: ASTNode = { type: 'sphere', children: [], params: { r: 1 }, cost: 1, qualityLevel: 0 };
    const lod1: ASTNode = { type: 'tree', children: [], params: {}, cost: 10, qualityLevel: 50, fallback: lod0 };
    const lod2: ASTNode = { type: 'forest', children: [], params: {}, cost: 100, qualityLevel: 80, fallback: lod1 };

    const result = selectLOD(lod2, 50);
    expect(result.type).toBe('tree');
  });

  it('should select highest LOD for budget 100', () => {
    const lod0: ASTNode = { type: 'sphere', children: [], params: { r: 1 }, cost: 1, qualityLevel: 0 };
    const lod1: ASTNode = { type: 'tree', children: [], params: {}, cost: 10, qualityLevel: 50, fallback: lod0 };
    const lod2: ASTNode = { type: 'forest', children: [], params: {}, cost: 100, qualityLevel: 80, fallback: lod1 };

    const result = selectLOD(lod2, 100);
    expect(result.type).toBe('forest');
  });

  it('should recursively select LODs for children', () => {
    const childLod0: ASTNode = { type: 'box', children: [], params: {}, cost: 1, qualityLevel: 0 };
    const childLod1: ASTNode = { type: 'building', children: [], params: {}, cost: 5, qualityLevel: 60, fallback: childLod0 };

    const root: ASTNode = { type: 'group', children: [childLod1], params: {}, cost: 1 };

    const res25 = selectLOD(root, 25);
    expect(res25.children[0].type).toBe('box');

    const res75 = selectLOD(root, 75);
    expect(res75.children[0].type).toBe('building');
  });

  it('selection is monotonic across budget sweeps {1, 25, 50, 75, 100}', () => {
    const lod0: ASTNode = { type: 'LOD0', children: [], params: {}, cost: 1, qualityLevel: 0 };
    const lod1: ASTNode = { type: 'LOD1', children: [], params: {}, cost: 1, qualityLevel: 40, fallback: lod0 };
    const lod2: ASTNode = { type: 'LOD2', children: [], params: {}, cost: 1, qualityLevel: 80, fallback: lod1 };

    const types = [1, 25, 50, 75, 100].map(budget => selectLOD(lod2, budget).type);
    expect(types).toEqual(['LOD0', 'LOD0', 'LOD1', 'LOD1', 'LOD2']);
  });
});
