import type { ASTNode } from '../gfl/types';
import type { ImageDataLike } from '../inverse/errorMetric';
import { mse } from '../inverse/errorMetric';

export type RenderFunction = (ast: ASTNode, budget: number) => ImageDataLike;

/**
 * Measures the quality of a render at a given budget.
 * Render at `budget`, then measure reconstruction error (MSE) against the same scene rendered at max budget 100.
 * quality = -MSE
 */
export function measureQuality(ast: ASTNode, budget: number, renderFn: RenderFunction): number {
  const targetRender = renderFn(ast, 100);
  const currentRender = renderFn(ast, budget);
  
  const error = mse(targetRender, currentRender);
  return -error; // Or 1 / (1 + error), but requirements say "-MSE" is a practical metric. Let's use -MSE as requested.
}

/**
 * Helper used by tests to verify that quality does not catastrophically invert as budget rises.
 * @param ast The root AST representing the scene.
 * @param budgets An array of budgets to sweep over, sorted in ascending order.
 * @param renderFn A function that renders an AST at a given budget and returns ImageDataLike.
 * @param tolerance The maximum allowed quality drop (as a percentage of the error range, or an absolute MSE value). 
 *        A simple approach: newQuality >= oldQuality - absoluteTolerance.
 */
export function checkMonotonic(
  ast: ASTNode,
  budgets: number[],
  renderFn: RenderFunction,
  absoluteTolerance: number = 0.05 // A small absolute MSE tolerance, assuming MSE is typical
): boolean {
  if (budgets.length === 0) return true;

  // Ensure budgets are sorted
  const sortedBudgets = [...budgets].sort((a, b) => a - b);

  let prevQuality = measureQuality(ast, sortedBudgets[0], renderFn);

  for (let i = 1; i < sortedBudgets.length; i++) {
    const currentQuality = measureQuality(ast, sortedBudgets[i], renderFn);
    
    // Quality must not catastrophically drop.
    // currentQuality >= prevQuality - absoluteTolerance
    if (currentQuality < prevQuality - absoluteTolerance) {
      return false;
    }
    
    prevQuality = currentQuality;
  }

  return true;
}

/**
 * Optional metrics-region display hook.
 */
export function updateQualityDisplay(container: HTMLElement, quality: number) {
  let display = container.querySelector('.quality-display');
  if (!display) {
    display = document.createElement('div');
    display.className = 'quality-display';
    container.appendChild(display);
  }
  display.textContent = `Quality (-MSE vs Max Budget): ${quality.toFixed(4)}`;
}
