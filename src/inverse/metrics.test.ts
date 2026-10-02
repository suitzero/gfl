import { describe, it, expect } from 'vitest';
import { complexityMetric, metricTriple } from './metrics';
import type { ASTNode } from '../gfl/types';
import type { ImageDataLike } from './errorMetric';

describe('metrics', () => {
  const sampleProgram: ASTNode = {
    type: 'union',
    params: {},
    cost: 1, // 'union' has cost 1
    children: [
      {
        type: 'sphere',
        params: { r: 1 },
        cost: 1, // 'sphere' has cost 1
        children: []
      },
      {
        type: 'smooth-union', // cost 3
        params: { k: 0.1 },
        cost: 3,
        children: [
          {
            type: 'box', // cost 1
            params: { size: [1, 1, 1] },
            cost: 1,
            children: []
          }
        ]
      }
    ]
  };

  describe('complexityMetric', () => {
    it('returns correct nodeCount, weightedCost, and sourceChars (with sourceText)', () => {
      const sourceText = '(union (sphere :r 1) (smooth-union :k 0.1 (box :size [1 1 1])))';
      const result = complexityMetric(sampleProgram, sourceText);

      // Node count: union (1) + sphere (1) + smooth-union (1) + box (1) = 4 nodes
      expect(result.nodeCount).toBe(4);
      
      // Cost: union (1) + sphere (1) + smooth-union (3) + box (1) = 6
      expect(result.weightedCost).toBe(6);
      
      expect(result.sourceChars).toBe(sourceText.length);
    });

    it('estimates sourceChars when sourceText is omitted', () => {
      const result = complexityMetric(sampleProgram);
      expect(result.nodeCount).toBe(4);
      expect(result.weightedCost).toBe(6);
      expect(result.sourceChars).toBe(40); // 4 nodes * 10
    });
  });

  describe('metricTriple', () => {
    it('combines reconstruction error with complexity metrics', () => {
      // Mock images of 2x2 pixels (4 pixels, 16 elements for RGBA)
      const target: ImageDataLike = {
        width: 2,
        height: 2,
        data: new Uint8Array([
          255, 0, 0, 255,   0, 255, 0, 255,
          0, 0, 255, 255,   255, 255, 255, 255
        ])
      };

      const render: ImageDataLike = {
        width: 2,
        height: 2,
        data: new Uint8Array([
          255, 0, 0, 255,   0, 0, 0, 255, // 2nd pixel differs by 255 in G
          0, 0, 255, 255,   0, 255, 255, 255 // 4th pixel differs by 255 in R
        ])
      };

      // MSE calculation: 
      // Diff for pixel 2 (G): 255 -> squared: 65025
      // Diff for pixel 4 (R): 255 -> squared: 65025
      // Total sum of squares = 130050
      // Array length = 16
      // MSE = 130050 / 16 = 8128.125

      const result = metricTriple({ target, render }, sampleProgram);

      expect(result.reconstructionError).toBeCloseTo(8128.125, 3);
      expect(result.programSize).toBe(4);
      expect(result.runtimeCost).toBe(6);
    });
  });
});
