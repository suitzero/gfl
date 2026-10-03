import { describe, it, expect } from 'vitest';
import { RefinementUI } from './refinement';
import type { Renderer } from '../render/renderer';
import type { ASTNode } from '../gfl/types';
import { RefinableIntervalNumber } from '../render/values';

describe('RefinementUI', () => {
  it('should toggle visibility on canvas click and render correctly', () => {
    const parent = document.createElement('div');
    const canvas = document.createElement('canvas');
    parent.appendChild(canvas);

    const mockAst: ASTNode = {
      type: 'sphere',
      children: [],
      params: { r: 1 },
      cost: 1,
      qualityLevel: 1
    };

    const mockRenderer = {
      originalAST: mockAst,
      activeAST: mockAst,
      currentBudget: 50,
      refinableRadius: new RefinableIntervalNumber(1.0, 1.0, 50)
    } as unknown as Renderer;

    new RefinementUI(parent, mockRenderer);

    // Initial state is hidden
    const container = parent.querySelector('div') as HTMLDivElement;
    expect(container.style.display).toBe('none');

    // Simulate canvas click
    canvas.dispatchEvent(new Event('click'));
    
    // Now visible
    expect(container.style.display).toBe('block');

    const html = container.innerHTML;
    expect(html).toContain('Object Parameter Uncertainty');
    expect(html).toContain('budget 1 = 1 ± 0.50');
    expect(html).toContain('budget 10 = 1 ± 0.05');
    expect(html).toContain('budget 100 = 1 ± 0.01');
    expect(html).toContain('Structural Budget (LOD)');
    expect(html).toContain('Numerical Precision');
  });
});
