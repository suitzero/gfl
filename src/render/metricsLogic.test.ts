import { describe, it, expect } from 'vitest';
import { computeMetricsCurves, computeMetricsCurvesAsync } from './metricsLogic';
import type { ASTNode } from '../gfl/types';
import type { RenderFunctionWithTime } from './metricsLogic';

describe('Metrics Logic', () => {
  it('should compute metrics curves for given budgets', () => {
    const mockAst: ASTNode = { type: 'sphere', children: [], params: { r: 1 }, cost: 1, qualityLevel: 0 };
    
    const mockRenderFn: RenderFunctionWithTime = (_ast: ASTNode, budget: number) => {
      // Mock data where pixel values depend on budget
      const data = new Uint8Array(4).fill(budget);
      return {
        data: { width: 1, height: 1, data },
        timeMs: budget * 2.5 // Mock frame time
      };
    };

    const budgets = [10, 50, 100];
    const curves = computeMetricsCurves(mockAst, budgets, mockRenderFn);

    expect(curves).toHaveLength(3);
    
    // Target is budget 100, meaning its data is [100, 100, 100, 100]
    
    // Budget 10
    expect(curves[0].budget).toBe(10);
    // error = mse([100], [10]) = (90^2) = 8100
    expect(curves[0].error).toBe(8100);
    expect(curves[0].cost).toBe(1);
    expect(curves[0].frameTime).toBe(25);

    // Budget 50
    expect(curves[1].budget).toBe(50);
    // error = mse([100], [50]) = (50^2) = 2500
    expect(curves[1].error).toBe(2500);
    expect(curves[1].cost).toBe(1);
    expect(curves[1].frameTime).toBe(125);

    // Budget 100
    expect(curves[2].budget).toBe(100);
    expect(curves[2].error).toBe(0); // vs itself
    expect(curves[2].cost).toBe(1);
    expect(curves[2].frameTime).toBe(250);
  });

  it('should compute metrics curves asynchronously', async () => {
    const mockAst: ASTNode = { type: 'sphere', children: [], params: { r: 1 }, cost: 1, qualityLevel: 0 };
    
    const mockRenderFn: RenderFunctionWithTime = (_ast: ASTNode, budget: number) => {
      const data = new Uint8Array(4).fill(budget);
      return {
        data: { width: 1, height: 1, data },
        timeMs: budget * 2.5
      };
    };

    const budgets = [1, 2, 5, 10, 20, 40, 60, 80, 100];
    let progressUpdates = 0;
    
    const curves = await computeMetricsCurvesAsync(mockAst, budgets, mockRenderFn, (progress) => {
      progressUpdates++;
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThanOrEqual(1);
    });

    expect(curves).toHaveLength(9);
    expect(progressUpdates).toBe(9);
    
    // Check ordered results and some metrics
    expect(curves[0].budget).toBe(1);
    // target data is [100], current is [1]. mse = 99^2 = 9801
    expect(curves[0].error).toBe(9801);
    
    expect(curves[8].budget).toBe(100);
    expect(curves[8].error).toBe(0);
  });
});
