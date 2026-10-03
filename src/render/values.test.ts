import { describe, it, expect } from 'vitest';
import { RefinableRadius, RefinableIntervalNumber } from './values';

describe('RefinableIntervalNumber', () => {
  it('should strictly decrease interval width monotonically as budget increases', () => {
    const refinable = new RefinableIntervalNumber(10, 2, 1);
    
    // Budget 1
    const interval1 = refinable.interval!;
    const width1 = interval1[1] - interval1[0];
    
    // Budget 10
    refinable.refine(10);
    const interval10 = refinable.interval!;
    const width10 = interval10[1] - interval10[0];
    
    // Budget 100
    refinable.refine(100);
    const interval100 = refinable.interval!;
    const width100 = interval100[1] - interval100[0];

    expect(width10).toBeLessThan(width1);
    expect(width100).toBeLessThan(width10);
  });

  it('should approach exact value from coarse to fine as budget increases', () => {
    const exactValue = 10;
    const refinable = new RefinableIntervalNumber(exactValue, 2, 1);

    const initialValue = refinable.value;
    
    refinable.refine(10);
    const value10 = refinable.value;

    refinable.refine(100);
    const value100 = refinable.value;

    expect(Math.abs(value10 - exactValue)).toBeLessThan(Math.abs(initialValue - exactValue));
    expect(Math.abs(value100 - exactValue)).toBeLessThan(Math.abs(value10 - exactValue));
  });
});

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
