import { describe, it, expect } from 'vitest';
import { SphereOptimizer } from './optimizer';
import type { ASTNode } from '../gfl/types';
import type { ImageDataLike } from './errorMetric';

// A mock render function that creates a soft Gaussian blob based on sphere parameters
function mockRenderSphereSoft(program: ASTNode): ImageDataLike {
  let sphereNode: ASTNode | null = null;
  const findSphere = (node: ASTNode) => {
    if (node.type === 'sphere') sphereNode = node;
    if (node.children) node.children.forEach(findSphere);
  }
  findSphere(program);

  const size = 16;
  const data = new Uint8Array(size * size * 4);
  
  if (!sphereNode) return { width: size, height: size, data };

  const radius = (sphereNode as ASTNode).params.radius ?? 1;
  const center = (sphereNode as ASTNode).params.center ?? [0, 0, 0];
  const [cx, cy, cz] = center;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Map pixel to [-2, 2]
      const px = (x / (size - 1)) * 4 - 2;
      const py = (y / (size - 1)) * 4 - 2;
      
      const dx = px - cx;
      const dy = py - cy;
      const distSq = dx * dx + dy * dy;
      
      const r = Math.max(0.01, radius);
      // Soft Gaussian
      const val = Math.exp(-distSq / (r * r)) * 255;
      // Z modulates intensity
      const zMod = Math.max(0.1, Math.min(1.0, (cz + 2) / 4));
      const finalVal = Math.floor(val * zMod);
      
      const idx = (y * size + x) * 4;
      data[idx] = finalVal;
      data[idx+1] = finalVal;
      data[idx+2] = finalVal;
      data[idx+3] = 255;
    }
  }
  return { width: size, height: size, data };
}

describe('SphereOptimizer', () => {
  it('should automatically approximate position and radius with lower error than perturbed start', async () => {
    // 1. Define target sphere program
    const targetProgram: ASTNode = {
      type: 'sphere',
      params: { radius: 1.0, center: [0.5, -0.5, 0.2] },
      children: [],
      cost: 1
    };

    // 2. Generate target image
    const targetImage = mockRenderSphereSoft(targetProgram);

    // 3. Define a perturbed starting program
    const startProgram: ASTNode = {
      type: 'sphere',
      params: { radius: 0.5, center: [-0.5, 0.5, -0.5] },
      children: [],
      cost: 1
    };
    
    // Evaluate initial error manually to compare
    const startImage = mockRenderSphereSoft(startProgram);
    let initialError = 0;
    for(let i=0; i<targetImage.data.length; i++) {
        const diff = targetImage.data[i] - startImage.data[i];
        initialError += diff * diff;
    }
    initialError /= targetImage.data.length;

    // 4. Run optimizer with lambda 0 so it focuses fully on matching the target image (D)
    const optimizer = new SphereOptimizer(
      targetImage,
      mockRenderSphereSoft,
      {},
      { maxIterations: 500, lambda: 0, stepSize: 0.2 }
    );

    const result = await optimizer.optimize(startProgram);
    
    expect(result).not.toBeNull();
    if (result) {
      // The final error should be measurably lower than initial error
      expect(result.error).toBeLessThan(initialError);
      
      console.log('Target:', targetProgram.params);
      console.log('Start:', startProgram.params);
      console.log('Final:', result.program.params);
      console.log('Initial Error:', initialError, 'Final Error:', result.error);

      // Verify that the error improved significantly (at least by half)
      expect(result.error).toBeLessThan(initialError * 0.75);
    }
  });
});
