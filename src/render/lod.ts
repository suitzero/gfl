import type { ASTNode } from '../gfl/types';

/**
 * Given a GFL AST and a budget (0-100), selects the appropriate LOD representation
 * for each LOD-able node. An LOD-able node is defined as a node that has a `fallback` chain.
 * Higher quality representations should specify a `qualityLevel` (default 0 for base).
 * The budget must be >= a node's `qualityLevel` to select it.
 */
export function selectLOD(node: ASTNode, budget: number): ASTNode {
  // Find all representations in the fallback chain
  const representations: ASTNode[] = [];
  let curr: ASTNode | undefined = node;
  while (curr) {
    representations.push(curr);
    curr = curr.fallback;
  }

  // representations[0] is highest detail (e.g., LOD2), representations[last] is lowest (e.g., LOD0)
  // We want to pick the most detailed representation whose qualityLevel <= budget
  let chosen = representations[representations.length - 1]; // Default to lowest detail

  // Iterate from lowest detail to highest detail
  for (let i = representations.length - 1; i >= 0; i--) {
    const rep = representations[i];
    const reqQuality = rep.qualityLevel ?? 0;
    if (budget >= reqQuality) {
      chosen = rep;
    }
  }

  // Recursively apply to the chosen node's children
  const newChildren = chosen.children.map(child => selectLOD(child, budget));

  // Return a new node to avoid mutating the original AST, and strip the fallback
  // from the active representation since it has been resolved.
  return {
    ...chosen,
    children: newChildren,
    fallback: undefined
  };
}
