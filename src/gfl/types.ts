export interface ASTNode {
  type: string;
  children: ASTNode[];
  params: Record<string, any>;
  cost: number;
  // Stub extension fields for later steps
  qualityLevel?: number;
  fallback?: ASTNode;
  errorEstimate?: number;
}
