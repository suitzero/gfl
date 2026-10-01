import { describe, it, expect } from 'vitest';
import { computePhotonBudgetCurve } from './analysis';
import { createPRNG } from './simulator';

describe('photon budget analysis', () => {
  it('should compute simulated errors and SNRs that match theoretical curves within tolerance', () => {
    const prng = createPRNG(42);
    const N_values = [100, 1000, 10000];
    const intensity = 1.0;
    const trials = 5000;
    
    const results = computePhotonBudgetCurve(N_values, intensity, trials, prng);
    
    expect(results).toHaveLength(3);
    
    for (const point of results) {
      // Theoretical SNR is sqrt(N * intensity)
      const expectedSNR = Math.sqrt(point.N * intensity);
      expect(point.theoreticalSNR).toBeCloseTo(expectedSNR);
      
      // Simulated SNR should be within 10% of theoretical
      const snrTolerance = point.theoreticalSNR * 0.1;
      expect(Math.abs(point.simulatedSNR - point.theoreticalSNR)).toBeLessThan(snrTolerance);
      
      // Theoretical Error is sqrt(intensity / N)
      const expectedError = Math.sqrt(intensity / point.N);
      expect(point.theoreticalError).toBeCloseTo(expectedError);
      
      // Simulated Error should be within 10% of theoretical
      const errorTolerance = point.theoreticalError * 0.1;
      expect(Math.abs(point.simulatedError - point.theoreticalError)).toBeLessThan(errorTolerance);
    }
    
    // Check that as N increases, theoretical error decreases
    expect(results[0].theoreticalError).toBeGreaterThan(results[1].theoreticalError);
    expect(results[1].theoreticalError).toBeGreaterThan(results[2].theoreticalError);
    
    // Check that as N increases, theoretical SNR increases
    expect(results[0].theoreticalSNR).toBeLessThan(results[1].theoreticalSNR);
    expect(results[1].theoreticalSNR).toBeLessThan(results[2].theoreticalSNR);
  });
});
