import type { ASTNode } from '../gfl/types';
import type { ImageDataLike } from '../inverse/errorMetric';
import { mse } from '../inverse/errorMetric';
import { sceneCost } from '../gfl/cost';
import { selectLOD } from './lod';

export interface CurvePoint {
  budget: number;
  error: number;
  cost: number;
  frameTime: number;
}

export type RenderFunctionWithTime = (ast: ASTNode, budget: number) => { data: ImageDataLike, timeMs: number };

export function computeMetricsCurves(
  ast: ASTNode,
  budgets: number[],
  renderFn: RenderFunctionWithTime
): CurvePoint[] {
  // Render target at max budget (assume 100)
  const targetResult = renderFn(ast, 100);
  
  const curves: CurvePoint[] = [];

  for (const budget of budgets) {
    const result = renderFn(ast, budget);
    const error = mse(targetResult.data, result.data);
    
    // We compute the cost of the *active* AST at this budget
    const activeAst = selectLOD(ast, budget);
    const cost = sceneCost(activeAst);

    curves.push({
      budget,
      error,
      cost,
      frameTime: result.timeMs
    });
  }

  return curves;
}

export async function computeMetricsCurvesAsync(
  ast: ASTNode,
  budgets: number[],
  renderFn: RenderFunctionWithTime,
  onProgress?: (progress: number) => void
): Promise<CurvePoint[]> {
  // Render target at max budget (assume 100)
  const targetResult = renderFn(ast, 100);
  
  const curves: CurvePoint[] = [];
  
  for (let i = 0; i < budgets.length; i++) {
    const budget = budgets[i];
    
    // Yield to the event loop so the UI stays responsive
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const result = renderFn(ast, budget);
    const error = mse(targetResult.data, result.data);
    
    const activeAst = selectLOD(ast, budget);
    const cost = sceneCost(activeAst);
    
    curves.push({
      budget,
      error,
      cost,
      frameTime: result.timeMs
    });
    
    if (onProgress) {
      onProgress((i + 1) / budgets.length);
    }
  }
  
  return curves;
}
