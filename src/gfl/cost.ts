import type { ASTNode } from './types.ts';

export function nodeCost(node: ASTNode): number {
  switch (node.type) {
    case 'sphere':
    case 'box':
    case 'plane':
    case 'union':
    case 'translate':
    case 'rotate':
    case 'scale':
    case 'repeat':
    case 'mirror':
    case 'radialRepeat':
    case 'radial-repeat':
      return 1;
    case 'smooth-union':
      return 3;
    case 'noise':
      return 10;
    case 'reflection':
      return 20;
    default:
      return 1;
  }
}

export function sceneCost(node: ASTNode): number {
  let total = nodeCost(node);
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      total += sceneCost(child);
    }
  }
  return total;
}

export interface CostBreakdownEntry {
  path: string;
  nodeType: string;
  cost: number;
}

export function costBreakdown(node: ASTNode, currentPath = 'root'): CostBreakdownEntry[] {
  const entries: CostBreakdownEntry[] = [];
  
  entries.push({
    path: currentPath,
    nodeType: node.type,
    cost: nodeCost(node)
  });
  
  if (node.children && node.children.length > 0) {
    node.children.forEach((child, index) => {
      entries.push(...costBreakdown(child, `${currentPath}.${index}`));
    });
  }
  
  return entries;
}
