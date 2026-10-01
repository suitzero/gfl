/**
 * Creates a pseudo-random number generator (PRNG) using the Mulberry32 algorithm.
 * @param seed The initial seed for the PRNG.
 * @returns A function that returns a random number between 0 and 1.
 */
export function createPRNG(seed: number): () => number {
  let a = seed;
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

/**
 * Samples from a standard normal distribution using the Box-Muller transform.
 */
function sampleNormal(prng: () => number): number {
  let u1 = 0;
  while (u1 === 0) u1 = prng(); // Avoid log(0)
  const u2 = prng();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * Samples from a Poisson distribution with the given expected value (lambda).
 * Uses Knuth's method for small lambda and Normal approximation for large lambda.
 */
export function samplePoisson(lambda: number, prng: () => number): number {
  if (lambda <= 0) return 0;
  
  if (lambda < 30) {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1.0;
    do {
      k++;
      p *= prng();
    } while (p > L);
    return k - 1;
  } else {
    const z = sampleNormal(prng);
    return Math.max(0, Math.round(lambda + z * Math.sqrt(lambda)));
  }
}

/**
 * Simulates a noisy measurement given a noise-free intensity signal and a photon budget (N).
 * 
 * @param intensity The noise-free intensity signal.
 * @param N The photon count budget.
 * @param prng A random number generator function returning values in [0, 1). Defaults to Math.random.
 * @returns The simulated noisy measurement.
 */
export function simulateMeasurement(intensity: number, N: number, prng: () => number = Math.random): number {
  if (intensity <= 0) return 0;
  if (N <= 0) return 0;
  
  const expectedPhotons = intensity * N;
  const actualPhotons = samplePoisson(expectedPhotons, prng);
  
  return actualPhotons / N;
}
