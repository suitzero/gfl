import { describe, it, expect } from 'vitest';
import { RefinableRadius } from './values';

describe('RefinableRadius', () => {
  it('should strictly decrease errorBound and strictly increase cost as budget increases', () => {
    const exactRadius = 5.0;
    const refinableRadius = new RefinableRadius(exactRadius, 1);

    const initialErrorBound = refinableRadius.errorBound;
    const initialCost = refinableRadius.cost;

    refinableRadius.refine(10);
    const errorBound10 = refinableRadius.errorBound;
    const cost10 = refinableRadius.cost;

    expect(errorBound10).toBeLessThan(initialErrorBound);
    expect(cost10).toBeGreaterThan(initialCost);

    refinableRadius.refine(100);
    const errorBound100 = refinableRadius.errorBound;
    const cost100 = refinableRadius.cost;

    expect(errorBound100).toBeLessThan(errorBound10);
    expect(cost100).toBeGreaterThan(cost10);
  });

  it('should approach exactRadius as budget increases', () => {
    const exactRadius = 5.0;
    const refinableRadius = new RefinableRadius(exactRadius, 1);

    const initialValue = refinableRadius.value;
    
    refinableRadius.refine(10);
    const value10 = refinableRadius.value;

    refinableRadius.refine(100);
    const value100 = refinableRadius.value;

    expect(Math.abs(value10 - exactRadius)).toBeLessThan(Math.abs(initialValue - exactRadius));
    expect(Math.abs(value100 - exactRadius)).toBeLessThan(Math.abs(value10 - exactRadius));
  });
});
