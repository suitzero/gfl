import { describe, it, expect } from 'vitest';
import { createPRNG, samplePoisson, simulateMeasurement } from './simulator';

describe('photon simulator', () => {
  it('createPRNG should be deterministic for the same seed', () => {
    const prng1 = createPRNG(42);
    const prng2 = createPRNG(42);
    const prng3 = createPRNG(1337);
    
    for (let i = 0; i < 10; i++) {
      const val1 = prng1();
      const val2 = prng2();
      expect(val1).toBe(val2);
    }
    
    // different seed should likely produce different first value
    expect(createPRNG(42)()).not.toBe(prng3());
  });
  
  it('samplePoisson should roughly match expected lambda', () => {
    const prng = createPRNG(12345);
    const lambda = 20; // Tests Knuth method (lambda < 30)
    let sum = 0;
    const trials = 10000;
    for (let i = 0; i < trials; i++) {
      sum += samplePoisson(lambda, prng);
    }
    const mean = sum / trials;
    
    // Tolerance of 1% (approx)
    expect(Math.abs(mean - lambda)).toBeLessThan(lambda * 0.02);
  });
  
  it('samplePoisson should roughly match expected lambda for large lambda', () => {
    const prng = createPRNG(12345);
    const lambda = 100; // Tests Normal approximation (lambda >= 30)
    let sum = 0;
    const trials = 10000;
    for (let i = 0; i < trials; i++) {
      sum += samplePoisson(lambda, prng);
    }
    const mean = sum / trials;
    
    // Tolerance of 1% (approx)
    expect(Math.abs(mean - lambda)).toBeLessThan(lambda * 0.02);
  });
  
  it('empirical SNR over repeated trials matches sqrt(N) within statistical tolerance', () => {
    const prng = createPRNG(98765);
    const intensity = 1.0;
    const N = 10000;
    
    const trials = 5000;
    let sum = 0;
    let sumSq = 0;
    
    for (let i = 0; i < trials; i++) {
      // The measured value is noisy count / N
      // but to evaluate SNR of photon count we need to look at actual counts
      // Actually, SNR = mean / std_dev.
      // E[measurement] = intensity, Var(measurement) = Var(count/N) = (intensity*N)/N^2 = intensity/N
      // Expected std_dev = sqrt(intensity / N).
      // If intensity = 1.0, mean = 1.0, std_dev = 1/sqrt(N).
      // So SNR = mean / std_dev = 1 / (1/sqrt(N)) = sqrt(N).
      const val = simulateMeasurement(intensity, N, prng);
      sum += val;
      sumSq += val * val;
    }
    
    const mean = sum / trials;
    const variance = (sumSq / trials) - (mean * mean);
    const stdDev = Math.sqrt(variance);
    
    const empiricalSNR = mean / stdDev;
    const expectedSNR = Math.sqrt(N * intensity); // for intensity=1, this is sqrt(N)
    
    // 5% relative tolerance
    const tolerance = expectedSNR * 0.05;
    expect(Math.abs(empiricalSNR - expectedSNR)).toBeLessThan(tolerance);
  });
  
  it('simulateMeasurement returns 0 if intensity or N is 0', () => {
    expect(simulateMeasurement(0, 100)).toBe(0);
    expect(simulateMeasurement(1, 0)).toBe(0);
  });
});
