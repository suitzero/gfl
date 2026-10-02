import { describe, it, expect } from 'vitest';
import { measureQuality, checkMonotonic } from './anytime';
import type { RenderFunction } from './anytime';
import type { ASTNode } from '../gfl/types';
import type { ImageDataLike } from '../inverse/errorMetric';
import { selectLOD } from './lod';

// Mock renderer that converts an AST into an image, where the error depends on the resolved LOD level.
// We'll simulate that LOD level correlates inversely with "error".
const mockRenderFn: RenderFunction = (ast: ASTNode, budget: number): ImageDataLike => {
  const activeAst = selectLOD(ast, budget);
  
  // We'll encode the quality level into the "image data" so MSE can pick it up.
  // Assume a 2x2 image.
  // The 'target' (budget 100) will likely pick highest LOD (e.g. qualityLevel 100).
  // The lower budgets pick lower LODs.
  // We'll fill the pixel data with the qualityLevel.
  
  // We need to recursively find the total "quality" of the tree
  // For simplicity, we just look at the root's qualityLevel or fallback depth.
  
  // Find quality level, default to 0 if not set.
  const q = activeAst.qualityLevel ?? 0;
  
  // Create dummy 2x2 image
  // We'll set all 4 RGBA channels for 4 pixels (16 elements).
  // Value will be 255 - q, so higher quality (q=100) -> pixel value 155.
  // Then MSE vs target (q=100) -> MSE of (155 - pixelValue)^2.
  
  const val = 255 - Math.min(q, 255);
  const data = new Uint8Array(16).fill(val);
  
  return {
    width: 2,
    height: 2,
    data
  };
};

describe('Anytime Monotonic Quality Invariant', () => {
  it('should measure quality correctly', () => {
    const lod0: ASTNode = { type: 'sphere', children: [], params: { r: 1 }, cost: 1, qualityLevel: 0 };
    const lod1: ASTNode = { type: 'tree', children: [], params: {}, cost: 10, qualityLevel: 50, fallback: lod0 };
    const lod2: ASTNode = { type: 'forest', children: [], params: {}, cost: 100, qualityLevel: 100, fallback: lod1 };
    
    const quality50 = measureQuality(lod2, 50, mockRenderFn);
    // At budget 100: q = 100 -> val = 155
    // At budget 50: q = 50 -> val = 205
    // Diff = 50. MSE = (50^2 * 16) / 16 = 2500
    // Quality = -MSE = -2500
    expect(quality50).toBeCloseTo(-2500);
    
    const quality100 = measureQuality(lod2, 100, mockRenderFn);
    // At budget 100 vs budget 100, error is 0.
    expect(quality100).toBeCloseTo(0);
  });

  it('should pass checkMonotonic for a scene with correct LODs', () => {
    const lod0: ASTNode = { type: 'sphere', children: [], params: { r: 1 }, cost: 1, qualityLevel: 0 };
    const lod1: ASTNode = { type: 'tree', children: [], params: {}, cost: 10, qualityLevel: 50, fallback: lod0 };
    const lod2: ASTNode = { type: 'forest', children: [], params: {}, cost: 100, qualityLevel: 100, fallback: lod1 };
    
    // As budget increases: {10, 60, 90, 100} -> {lod0, lod1, lod1, lod2}
    // qualityLevels: {0, 50, 50, 100} -> MSEs against 100: {100^2, 50^2, 50^2, 0}
    // qualities: {-10000, -2500, -2500, 0}
    // This is strictly monotonically increasing (or flat), no drop.
    const budgets = [10, 60, 90, 100];
    
    const isMonotonic = checkMonotonic(lod2, budgets, mockRenderFn, 5); // 5 is absolute tolerance
    expect(isMonotonic).toBe(true);
  });

  it('should FAIL loudly if catastrophic quality inversion is detected', () => {
    // Let's create a pathological mock render function that inverts quality for a specific budget
    const badRenderFn: RenderFunction = (_ast: ASTNode, budget: number): ImageDataLike => {
      // For budget 50, pretend we rendered garbage
      if (budget === 50) {
        return { width: 2, height: 2, data: new Uint8Array(16).fill(0) }; // val = 0
      }
      if (budget === 100) {
        return { width: 2, height: 2, data: new Uint8Array(16).fill(155) }; // val = 155
      }
      return { width: 2, height: 2, data: new Uint8Array(16).fill(255) }; // val = 255
    };
    
    const root: ASTNode = { type: 'root', children: [], params: {}, cost: 1 };
    
    // Budget 10: quality = -((155-255)^2) = -10000
    // Budget 50: quality = -((155-0)^2) = -24025
    // Quality drops from -10000 to -24025, which is a catastrophic inversion > 5!
    
    const budgets = [10, 50, 100];
    const isMonotonic = checkMonotonic(root, budgets, badRenderFn, 5);
    expect(isMonotonic).toBe(false);
  });

  it('should verify relationship budget -> error on random scenes', () => {
    const scene1_lod0: ASTNode = { type: 'cube', children: [], params: {}, cost: 1, qualityLevel: 0 };
    const scene1_lod1: ASTNode = { type: 'building', children: [], params: {}, cost: 1, qualityLevel: 30, fallback: scene1_lod0 };
    const scene1_lod2: ASTNode = { type: 'city', children: [], params: {}, cost: 1, qualityLevel: 80, fallback: scene1_lod1 };

    const scene2_lod0: ASTNode = { type: 'triangle', children: [], params: {}, cost: 1, qualityLevel: 0 };
    const scene2_lod1: ASTNode = { type: 'car', children: [], params: {}, cost: 1, qualityLevel: 45, fallback: scene2_lod0 };
    const scene2_lod2: ASTNode = { type: 'fleet', children: [], params: {}, cost: 1, qualityLevel: 95, fallback: scene2_lod1 };

    const randomBudgets = Array.from({ length: 10 }, () => Math.floor(Math.random() * 100));
    
    expect(checkMonotonic(scene1_lod2, randomBudgets, mockRenderFn)).toBe(true);
    expect(checkMonotonic(scene2_lod2, randomBudgets, mockRenderFn)).toBe(true);
  });
});
