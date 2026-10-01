import { simulateMeasurement } from './simulator';

export interface PhotonBudgetDataPoint {
  N: number;
  simulatedError: number;
  theoreticalError: number;
  simulatedSNR: number;
  theoreticalSNR: number;
}

/**
 * Computes the photon budget curves (error and SNR vs photon count N).
 * 
 * @param N_values An array of photon count budgets to evaluate.
 * @param intensity The underlying noise-free intensity signal (e.g., 1.0).
 * @param trials Number of Monte Carlo trials to estimate simulated error and SNR for each N.
 * @param prng A random number generator (returns [0,1)).
 * @returns Array of data points containing simulated and theoretical statistics.
 */
export function computePhotonBudgetCurve(
  N_values: number[],
  intensity: number,
  trials: number,
  prng: () => number = Math.random
): PhotonBudgetDataPoint[] {
  return N_values.map(N => {
    let sum = 0;
    let sumSq = 0;
    
    // Theoretical limits for Poisson shot noise
    // Var(measured) = intensity / N
    // stdDev = sqrt(intensity / N) -> Error (RMSE relative to true intensity)
    const theoreticalError = Math.sqrt(intensity / N);
    
    // SNR = mean / stdDev = intensity / sqrt(intensity / N) = sqrt(intensity * N)
    const theoreticalSNR = Math.sqrt(N * intensity);

    for (let i = 0; i < trials; i++) {
      const measurement = simulateMeasurement(intensity, N, prng);
      sum += measurement;
      
      // We calculate squared error relative to true intensity to get RMSE
      const error = measurement - intensity;
      sumSq += error * error;
    }
    
    const mean = sum / trials;
    
    // Simulated RMSE error
    const mse = sumSq / trials;
    const simulatedError = Math.sqrt(mse);
    
    // Simulated SNR = mean / empirical standard deviation
    // Since we know the true mean is 'intensity', computing std dev relative to the empirical mean:
    let varSumSq = 0;
    // We need to re-pass through or compute variance from sum and sumSq of measurements,
    // actually we can compute empirical variance: E[X^2] - E[X]^2
    // Let's compute empirical variance based on trials:
    // We already have sum of errors. Let's just compute empirical variance directly during trials next time, 
    // but wait, sumSq above is sum of squared errors from true intensity, not squared measurements.
    
    // Wait, let's do this standardly in two passes or using Welford's algorithm to be precise, or just:
    // var = E[X^2] - E[X]^2
    // For simplicity, let's recalculate the simulated SNR using the variance from true intensity, 
    // or standard variance. Standard variance is sum((x - mean)^2) / (trials).
    // Or variance = (sum(x^2)/trials) - mean^2.
    // We have sum of squared errors from intensity: sum((x - intensity)^2)
    // Variance = E[(X - E[X])^2] = E[X^2] - E[X]^2.
    // mse is E[(X - intensity)^2] = E[X^2] - 2*intensity*E[X] + intensity^2.
    // So E[X^2] = mse + 2*intensity*mean - intensity^2.
    // Variance = (mse + 2*intensity*mean - intensity^2) - mean^2.
    const expectedX2 = mse + 2 * intensity * mean - intensity * intensity;
    const variance = expectedX2 - mean * mean;
    const stdDev = Math.sqrt(Math.max(0, variance)); // Math.max to prevent negative zero issues
    
    const simulatedSNR = stdDev > 0 ? (mean / stdDev) : 0;
    
    return {
      N,
      simulatedError,
      theoreticalError,
      simulatedSNR,
      theoreticalSNR
    };
  });
}
