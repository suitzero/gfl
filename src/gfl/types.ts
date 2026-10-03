export type GFLNodeType = 
  | 'sphere' | 'box' | 'plane'
  | 'translate' | 'rotate' | 'scale'
  | 'union' | 'subtract' | 'intersect' | 'smooth-union'
  | 'material' | 'scene' | 'camera' | 'light'
  | 'noise' | 'reflection' | 'refine'
  | 'repeat' | 'mirror' | 'radialRepeat' | 'radial-repeat'
  | string;

export interface ASTNode {
  type: GFLNodeType;
  children: ASTNode[];
  params: Record<string, any>;
  cost: number;
  // Stub extension fields for later steps
  qualityLevel?: number;
  fallback?: ASTNode;
  errorEstimate?: number;
}
