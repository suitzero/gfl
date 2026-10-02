import { describe, it, expect } from 'vitest';
import { objective } from './objective';
import type { ASTNode } from '../gfl/types';
import type { ImageDataLike } from './errorMetric';

describe('objective', () => {
  // Program A: A complex program with high runtime cost.
  // It has a union of multiple spheres and smooth-unions.
  const programA: ASTNode = {
    type: 'smooth-union', // Cost: 3
    params: { k: 0.1 },
    cost: 3,
    children: [
      {
        type: 'sphere', // Cost: 1
        params: { r: 1 },
        cost: 1,
        children: []
      },
      {
        type: 'smooth-union', // Cost: 3
        params: { k: 0.1 },
        cost: 3,
        children: [
          {
            type: 'box', // Cost: 1
            params: { size: [1, 1, 1] },
            cost: 1,
            children: []
          }
        ]
      }
    ]
  };
  // Total cost of Program A = 3 + 1 + 3 + 1 = 8

  // Program B: A simple program with low runtime cost.
  const programB: ASTNode = {
    type: 'sphere', // Cost: 1
    params: { r: 1 },
    cost: 1,
    children: []
  };
  // Total cost of Program B = 1

  // Target image (e.g., matching Program A closely)
  const target: ImageDataLike = {
    width: 2,
    height: 1,
    data: new Uint8ClampedArray([255, 0, 0, 255,   0, 255, 0, 255])
  };

  // Render of Program A: very low error compared to target
  // Almost identical to target
  const renderA: ImageDataLike = {
    width: 2,
    height: 1,
    data: new Uint8ClampedArray([255, 5, 0, 255,   0, 250, 0, 255]) 
  };
  // Diff sq sum:
  // P1: (0)^2 + (5)^2 + (0)^2 + (0)^2 = 25
  // P2: (0)^2 + (5)^2 + (0)^2 + (0)^2 = 25
  // MSE A = 50 / 8 = 6.25

  // Render of Program B: high error compared to target
  const renderB: ImageDataLike = {
    width: 2,
    height: 1,
    data: new Uint8ClampedArray([100, 100, 100, 255,   100, 100, 100, 255])
  };
  // Diff sq sum for P1: (155)^2 + (100)^2 + (100)^2 + 0 = 24025 + 10000 + 10000 = 44025
  // Diff sq sum for P2: (100)^2 + (155)^2 + (100)^2 + 0 = 10000 + 24025 + 10000 = 44025
  // MSE B = 88050 / 8 = 11006.25

  it('prefers complex Program A (low error, high cost) when lambda is very low', () => {
    const lambda = 0.01;
    
    // Cost A: 8, Cost B: 1
    // Objective A = 6.25 + 0.01 * 8 = 6.33
    // Objective B = 11006.25 + 0.01 * 1 = 11006.26
    const objA = objective(programA, { target, render: renderA }, lambda);
    const objB = objective(programB, { target, render: renderB }, lambda);

    expect(objA).toBeLessThan(objB);
  });

  it('prefers simple Program B (high error, low cost) when lambda is very high', () => {
    // The threshold where costs flip is roughly when:
    // MSE_B + lambda * Cost_B < MSE_A + lambda * Cost_A
    // 11006.25 + lambda * 1 < 6.25 + lambda * 8
    // 11000 < 7 * lambda => lambda > ~1571.4
    const lambda = 2000;
    
    const objA = objective(programA, { target, render: renderA }, lambda);
    const objB = objective(programB, { target, render: renderB }, lambda);

    expect(objB).toBeLessThan(objA);
  });
});
