import { type ASTNode } from './types.ts';
import { nodeCost } from './cost.ts';

export function deepEqual(a: ASTNode, b: ASTNode): boolean {
  if (a.type !== b.type) return false;
  if (a.children.length !== b.children.length) return false;

  const aKeys = Object.keys(a.params);
  const bKeys = Object.keys(b.params);
  
  if (aKeys.length !== bKeys.length) return false;

  for (const k of aKeys) {
    if (JSON.stringify(a.params[k]) !== JSON.stringify(b.params[k])) {
      return false;
    }
  }

  for (let i = 0; i < a.children.length; i++) {
    if (!deepEqual(a.children[i], b.children[i])) {
      return false;
    }
  }

  return true;
}

export function optimizeAST(node: ASTNode): ASTNode | null {
  // 1. Recursively optimize children
  const optimizedChildren: ASTNode[] = [];
  for (const child of node.children) {
    const opt = optimizeAST(child);
    if (opt !== null) {
      optimizedChildren.push(opt);
    }
  }

  // 2. Dead-node removal
  const isEmptyNode = optimizedChildren.length === 0;
  const isTransform = ['translate', 'rotate', 'scale', 'material'].includes(node.type);
  const isCSG = ['union', 'intersect', 'subtract', 'smooth-union'].includes(node.type);

  if (isEmptyNode && (isTransform || isCSG)) {
    return null;
  }

  // 3. Redundant wrappers (single-child CSG)
  if (optimizedChildren.length === 1 && isCSG) {
    return optimizedChildren[0];
  }

  // 4. Identical-subtree reuse (deduplication in union/intersect)
  let finalChildren = optimizedChildren;
  if (node.type === 'union' || node.type === 'intersect') {
    const uniqueChildren: ASTNode[] = [];
    for (const child of optimizedChildren) {
      let duplicate = false;
      for (const unique of uniqueChildren) {
        if (deepEqual(child, unique)) {
          duplicate = true;
          break;
        }
      }
      if (!duplicate) {
        uniqueChildren.push(child);
      }
    }
    if (uniqueChildren.length === 1) {
      return uniqueChildren[0];
    }
    finalChildren = uniqueChildren;
  }

  let resultNode: ASTNode = {
    ...node,
    children: finalChildren,
    cost: 0
  };

  // 5. Repeated-transform merging
  if (resultNode.type === 'translate' && finalChildren.length === 1 && finalChildren[0].type === 'translate') {
    const child = finalChildren[0];
    const offset1 = resultNode.params.offset || [0, 0, 0];
    const offset2 = child.params.offset || [0, 0, 0];
    const newOffset = [
      offset1[0] + offset2[0],
      offset1[1] + offset2[1],
      offset1[2] + offset2[2]
    ];
    resultNode = {
      ...resultNode,
      params: { ...resultNode.params, offset: newOffset },
      children: child.children
    };
  } else if (resultNode.type === 'scale' && finalChildren.length === 1 && finalChildren[0].type === 'scale') {
    const child = finalChildren[0];
    const factor1 = resultNode.params.factor ?? 1.0;
    const factor2 = child.params.factor ?? 1.0;
    resultNode = {
      ...resultNode,
      params: { ...resultNode.params, factor: factor1 * factor2 },
      children: child.children
    };
  }

  // 6. Constant folding (Identity transforms)
  if (resultNode.type === 'translate') {
    const offset = resultNode.params.offset || [0, 0, 0];
    if (offset[0] === 0 && offset[1] === 0 && offset[2] === 0) {
      if (resultNode.children.length === 1) return resultNode.children[0];
      if (resultNode.children.length === 0) return null;
    }
  } else if (resultNode.type === 'scale') {
    const factor = resultNode.params.factor ?? 1.0;
    if (factor === 1.0) {
      if (resultNode.children.length === 1) return resultNode.children[0];
      if (resultNode.children.length === 0) return null;
    }
  }

  resultNode.cost = nodeCost(resultNode);
  return resultNode;
}
