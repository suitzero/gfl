import { describe, it, expect, vi } from 'vitest';
import { InverseLoop, RandomMutator, type RenderFn, type Mutator } from './loop';
import type { ASTNode } from '../gfl/types';
import type { ImageDataLike } from './errorMetric';

describe('InverseLoop', () => {
  const targetImage: ImageDataLike = { width: 1, height: 1, data: new Uint8Array([255, 255, 255, 255]) };
  
  const initialProgram: ASTNode = {
    type: 'sphere',
    params: { r: 1 },
    children: [],
    cost: 1
  };

  it('runs loop and tracks best program', async () => {
    let iteration = 0;
    // Mock render that produces an image with MSE decreasing each iteration
    const renderFn: RenderFn = (_prog) => {
      // For iteration 0, distance to 255 is 100
      // For iteration 1, distance is 50
      // For iteration 2, distance is 25
      const val = 255 - Math.floor(100 / Math.pow(2, iteration));
      iteration++;
      return { width: 1, height: 1, data: new Uint8Array([val, val, val, val]) };
    };

    const mutator: Mutator = {
      mutate: (prog) => ({ ...prog, cost: prog.cost }) // Dummy mutator
    };

    const onCandidate = vi.fn();
    const onBestUpdate = vi.fn();

    const loop = new InverseLoop(
      targetImage,
      renderFn,
      mutator,
      { onCandidate, onBestUpdate },
      { maxIterations: 3, lambda: 0 } // Lambda 0 means cost is purely based on MSE
    );

    const result = await loop.run(initialProgram);

    expect(result).not.toBeNull();
    // 3 iterations ran
    expect(onCandidate).toHaveBeenCalledTimes(3);
    // Since it gets strictly better every iteration, it should update best 3 times
    expect(onBestUpdate).toHaveBeenCalledTimes(3);
  });

  it('early stops on convergence', async () => {
    let callCount = 0;
    const renderFn: RenderFn = (_prog) => {
      callCount++;
      // Return exact match -> MSE = 0 -> cost = 0 (since lambda = 0)
      return targetImage; 
    };

    const loop = new InverseLoop(
      targetImage,
      renderFn,
      new RandomMutator(),
      {},
      { maxIterations: 10, lambda: 0 }
    );

    const result = await loop.run(initialProgram);
    
    // Should break on first iteration since cost < 1e-4
    expect(callCount).toBe(1);
    expect(result?.cost).toBe(0);
  });

  it('can be stopped manually', async () => {
    let iterationCount = 0;
    
    // We'll create an async render function to give us time to stop it
    const renderFn: RenderFn = async (_prog) => {
      iterationCount++;
      await new Promise(resolve => setTimeout(resolve, 10));
      return { width: 1, height: 1, data: new Uint8Array([0, 0, 0, 0]) };
    };

    const loop = new InverseLoop(
      targetImage,
      renderFn,
      new RandomMutator(),
      {},
      { maxIterations: 50, lambda: 0 }
    );

    const runPromise = loop.run(initialProgram);
    
    // Let it run slightly then stop
    await new Promise(resolve => setTimeout(resolve, 25));
    loop.stop();
    
    await runPromise;

    // Should not have reached 50 iterations
    expect(iterationCount).toBeLessThan(50);
    expect(iterationCount).toBeGreaterThan(0);
  });

  it('RandomMutator mutates parameters', () => {
    const mutator = new RandomMutator();
    const original: ASTNode = {
      type: 'sphere',
      params: { r: 0.5, name: 'test' },
      children: [],
      cost: 1
    };

    // Since it's random, we run it a few times to ensure it changes eventually
    let changed = false;
    for (let i = 0; i < 50; i++) {
      const mutated = mutator.mutate(original);
      // It should clone
      expect(mutated).not.toBe(original);
      if (mutated.params.r !== original.params.r) {
        changed = true;
        break;
      }
    }
    expect(changed).toBe(true);
  });
});
