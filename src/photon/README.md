# src/photon/

**Ownership**: WS-D

This module simulates photons/shot-noise, photon budget graphs, and integrated demo features (steps 29, 30, 31, 32). 

## API Contract

The primary data contract for the photon budget graph is exposed via `src/photon/index.ts`.

### `computePhotonBudgetCurve`
Computes the expected theoretical and simulated error and SNR metrics given a list of photon budgets.
```ts
export interface PhotonBudgetDataPoint {
  N: number;
  simulatedError: number;
  theoreticalError: number;
  simulatedSNR: number;
  theoreticalSNR: number;
}

export function computePhotonBudgetCurve(
  N_values: number[],
  intensity: number,
  trials: number,
  prng?: () => number
): PhotonBudgetDataPoint[]
```
- `N_values`: A list of photon count budgets to sample.
- `intensity`: The reference signal intensity (e.g. `1.0`).
- `trials`: Number of samples (Monte Carlo trials) for estimating empirical metrics.
- Returns an array matching the input `N_values` with both theoretical curves (`sqrt(N*intensity)` for SNR and `sqrt(intensity/N)` for Error) and statistically simulated metrics.

This allows UI components to visualize the relation between photon budget (N) and precision.
