import { describe, it, expect } from 'vitest';
import { computePhotonBudgetCurve } from './analysis';

describe('photon budget separation', () => {
  it('should exhibit noise magnitude proportional to 1/sqrt(N)', () => {
    const intensity = 1.0;
    const trials = 10000;
    
    // Test a low budget and a high budget
    const N_low = 100;
    const N_high = 10000;
    
    const results = computePhotonBudgetCurve([N_low, N_high], intensity, trials);
    
    const noise_low = results[0].simulatedError;
    const noise_high = results[1].simulatedError;
    
    // The ratio of noises should be approximately sqrt(N_high / N_low)
    const expectedRatio = Math.sqrt(N_high / N_low); // sqrt(100) = 10
    const actualRatio = noise_low / noise_high;
    
    // Expect within 10% tolerance
    expect(Math.abs(actualRatio - expectedRatio) / expectedRatio).toBeLessThan(0.10);
    
    // Check it matches theoretical curve exactly
    expect(results[0].theoreticalError).toBeCloseTo(1 / Math.sqrt(N_low));
    expect(results[1].theoreticalError).toBeCloseTo(1 / Math.sqrt(N_high));
  });
});
