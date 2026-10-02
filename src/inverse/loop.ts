import type { ASTNode } from '../gfl/types';
import type { ImageDataLike } from './errorMetric';
import { objective } from './objective';
import { metricTriple } from './metrics';

export interface CandidateResult {
  program: ASTNode;
  error: number;
  complexity: number;
  cost: number;
}

export interface LoopCallbacks {
  onCandidate?: (program: ASTNode, error: number, complexity: number) => void;
  onBestUpdate?: (program: ASTNode, error: number, complexity: number) => void;
}

export interface Mutator {
  mutate(program: ASTNode): ASTNode;
}

export class RandomMutator implements Mutator {
  mutate(program: ASTNode): ASTNode {
    // A simple heuristic/random mutation
    // Deep clone the AST
    const clone = JSON.parse(JSON.stringify(program)) as ASTNode;
    
    // Simple mutation: randomly perturb a numeric parameter
    this.mutateNode(clone);
    return clone;
  }
  
  private mutateNode(node: ASTNode) {
    if (node.params) {
      for (const [key, value] of Object.entries(node.params)) {
        if (typeof value === 'number') {
          // Perturb by -0.1 to 0.1
          if (Math.random() < 0.5) {
            node.params[key] = value + (Math.random() * 0.2 - 0.1);
          }
        }
      }
    }
    if (node.children) {
      for (const child of node.children) {
        if (Math.random() < 0.5) {
          this.mutateNode(child);
        }
      }
    }
  }
}

export type RenderFn = (program: ASTNode) => Promise<ImageDataLike> | ImageDataLike;

export class InverseLoop {
  private isRunning = false;
  private maxIterations = 50;
  private lambda = 1.0;
  private target: ImageDataLike;
  private renderFn: RenderFn;
  private mutator: Mutator;
  private callbacks: LoopCallbacks;
  
  private bestResult: CandidateResult | null = null;
  private currentIteration = 0;

  constructor(
    target: ImageDataLike,
    renderFn: RenderFn,
    mutator: Mutator = new RandomMutator(),
    callbacks: LoopCallbacks = {},
    options?: { maxIterations?: number; lambda?: number }
  ) {
    this.target = target;
    this.renderFn = renderFn;
    this.mutator = mutator;
    this.callbacks = callbacks;
    if (options?.maxIterations !== undefined) this.maxIterations = options.maxIterations;
    if (options?.lambda !== undefined) this.lambda = options.lambda;
  }

  public async run(initialProgram: ASTNode): Promise<CandidateResult | null> {
    this.isRunning = true;
    this.currentIteration = 0;
    this.bestResult = null;

    let currentProgram = initialProgram;

    while (this.isRunning && this.currentIteration < this.maxIterations) {
      // 1. Render candidate
      const render = await this.renderFn(currentProgram);

      // 2. Score candidate
      const stats = { target: this.target, render };
      const cost = objective(currentProgram, stats, this.lambda);
      const metrics = metricTriple(stats, currentProgram);
      
      const result: CandidateResult = {
        program: currentProgram,
        error: metrics.reconstructionError,
        complexity: metrics.runtimeCost,
        cost
      };

      // 3. Invoke callback
      if (this.callbacks.onCandidate) {
        this.callbacks.onCandidate(result.program, result.error, result.complexity);
      }

      // 4. Track best
      if (!this.bestResult || cost < this.bestResult.cost) {
        this.bestResult = result;
        if (this.callbacks.onBestUpdate) {
          this.callbacks.onBestUpdate(result.program, result.error, result.complexity);
        }
        // Convergence early stopping
        if (cost < 1e-4) {
          break;
        }
      }

      // 5. Mutate for next iteration (simple hill climbing or random search)
      // Generate next candidate from the best found so far
      currentProgram = this.mutator.mutate(this.bestResult.program);

      this.currentIteration++;
    }

    this.isRunning = false;
    
    return this.bestResult;
  }

  public stop(): void {
    this.isRunning = false;
  }
}
