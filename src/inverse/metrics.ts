/**
 * UI Wiring/Mount Contract:
 * 
 * To integrate these metrics into the app shell (e.g., in a "Metrics" region), 
 * the integration code (in `src/app/**` or `src/ui/**`) should use these functions headlessly.
 * 
 * Example usage in a UI component update loop:
 * ```typescript
 * import { metricTriple } from '../inverse/metrics';
 * 
 * function updateMetricsDisplay(targetStats, renderStats, currentProgram, currentSource) {
 *   const { reconstructionError, programSize, runtimeCost } = metricTriple(
 *     { target: targetStats, render: renderStats },
 *     currentProgram,
 *     currentSource
 *   );
 *   
 *   document.getElementById('mse-display').textContent = reconstructionError.toFixed(4);
 *   document.getElementById('size-display').textContent = programSize.toString();
 *   document.getElementById('cost-display').textContent = runtimeCost.toString();
 * }
 * ```
 */

import type { ASTNode } from '../gfl/types';
import { sceneCost } from '../gfl/cost';
import { mse, type ImageDataLike } from './errorMetric';

/**
 * Computes the total number of nodes in a given AST.
 */
function countNodes(node: ASTNode): number {
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}

/**
 * Complexity metrics for a GFL AST.
 */
export interface ComplexityMetrics {
  nodeCount: number;
  weightedCost: number;
  sourceChars: number;
}

/**
 * Computes the complexity of a program.
 * 
 * @param program The AST of the program.
 * @param sourceText Optional source string. If not provided, sourceChars is estimated.
 */
export function complexityMetric(program: ASTNode, sourceText?: string): ComplexityMetrics {
  const nodeCount = countNodes(program);
  const weightedCost = sceneCost(program);
  
  // If sourceText is not provided, estimate based on nodeCount roughly (e.g., 10 chars per node)
  const sourceChars = sourceText !== undefined ? sourceText.length : nodeCount * 10;
  
  return { nodeCount, weightedCost, sourceChars };
}

export interface MetricTripleResult {
  reconstructionError: number;
  programSize: number;
  runtimeCost: number;
}

/**
 * Returns the Reconstruction Error, Program Size, and Runtime Cost in a single headless call.
 * 
 * @param stats Object containing target and render image data.
 * @param program The AST of the program.
 * @param sourceText Optional source string of the program.
 */
export function metricTriple(
  stats: { target: ImageDataLike; render: ImageDataLike },
  program: ASTNode,
  sourceText?: string
): MetricTripleResult {
  const comp = complexityMetric(program, sourceText);
  const error = mse(stats.target, stats.render);
  
  return {
    reconstructionError: error,
    programSize: comp.nodeCount,
    runtimeCost: comp.weightedCost,
  };
}
