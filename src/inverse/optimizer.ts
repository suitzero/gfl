import type { ASTNode } from '../gfl/types';
import { InverseLoop, type RenderFn, type Mutator, type LoopCallbacks } from './loop';
import type { ImageDataLike } from './errorMetric';

export class SphereMutator implements Mutator {
  public stepSize: number;

  constructor(stepSize: number = 0.5) {
    this.stepSize = stepSize;
  }

  mutate(program: ASTNode): ASTNode {
    const clone = JSON.parse(JSON.stringify(program)) as ASTNode;
    this.mutateNode(clone);
    return clone;
  }
  
  private mutateNode(node: ASTNode) {
    if (node.type === 'sphere' && node.params) {
      // Perturb radius
      if (typeof node.params.radius === 'number') {
        node.params.radius += (Math.random() * 2 - 1) * this.stepSize;
        node.params.radius = Math.max(0.01, node.params.radius);
      }
      // Perturb center
      if (Array.isArray(node.params.center) && node.params.center.length === 3) {
        node.params.center = node.params.center.map((v: number) => {
          return v + (Math.random() * 2 - 1) * this.stepSize;
        });
      }
    }
    if (node.children) {
      for (const child of node.children) {
        this.mutateNode(child);
      }
    }
  }
}

export class SphereOptimizer {
  private loop: InverseLoop;
  
  constructor(
    target: ImageDataLike,
    renderFn: RenderFn,
    callbacks?: LoopCallbacks,
    options?: { maxIterations?: number; lambda?: number; stepSize?: number }
  ) {
    const mutator = new SphereMutator(options?.stepSize ?? 0.5);
    // Reusing the step-23 mutation-loop (InverseLoop)
    this.loop = new InverseLoop(target, renderFn, mutator, callbacks, options);
  }
  
  public async optimize(initialProgram: ASTNode) {
    return await this.loop.run(initialProgram);
  }

  public stop() {
    this.loop.stop();
  }
}
