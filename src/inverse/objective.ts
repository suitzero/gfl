import type { ASTNode } from '../gfl/types';
import { metricTriple } from './metrics';
import type { ImageDataLike } from './errorMetric';

/**
 * Computes the combined objective function L(P) = D(I, R(P)) + lambda * C(P).
 *
 * @param program The AST of the program P.
 * @param stats An object containing the target image I and the rendered image R(P).
 * @param lambda The weighting factor for program complexity.
 * @returns The total objective cost.
 */
export function objective(
  program: ASTNode,
  stats: { target: ImageDataLike; render: ImageDataLike },
  lambda: number
): number {
  const { reconstructionError, runtimeCost } = metricTriple(stats, program);
  return reconstructionError + lambda * runtimeCost;
}

/**
 * Mounts a lambda control slider additively into the existing `#controls` container.
 * 
 * @param onLambdaChange Callback invoked when the lambda value changes.
 */
export function mountLambdaControl(onLambdaChange: (lambda: number) => void) {
  const controlsContainer = document.getElementById('controls');
  if (!controlsContainer) {
    console.warn("Controls container not found, cannot setup lambda UI.");
    return;
  }

  const container = document.createElement('div');
  container.style.marginTop = '10px';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = '5px';

  const label = document.createElement('label');
  label.htmlFor = 'lambda-slider';
  // initial lambda value e.g. 1.0
  label.textContent = 'Lambda (Complexity Weight): 1.00';

  const slider = document.createElement('input');
  slider.id = 'lambda-slider';
  slider.type = 'range';
  slider.min = '0';
  slider.max = '100'; // logarithmic scale mapping
  slider.value = '50'; // maps to 1.0 if we do exponential mapping
  slider.style.width = '100%';

  // map [0, 100] -> [0.01, 100] exponentially
  // value = 10 ^ ( (slider.value / 50) - 1 ) * 1
  // at 50, value = 10^0 = 1.0
  // at 0, value = 10^-1 = 0.1
  // at 100, value = 10^1 = 10.0
  const getLambdaValue = (val: number) => {
      // 0 to 100 mapped to -3 to +3
      const exp = (val / 100) * 6 - 3;
      return Math.pow(10, exp);
  };
  
  // Set initial 
  const initialSliderVal = parseInt(slider.value, 10);
  const initialLambda = getLambdaValue(initialSliderVal);
  onLambdaChange(initialLambda);

  slider.addEventListener('input', (e) => {
    const value = parseInt((e.target as HTMLInputElement).value, 10);
    const lambda = getLambdaValue(value);
    // Format to 2 sig figs if reasonable, or scientific notation if very small/large
    if (lambda >= 0.01 && lambda <= 1000) {
        label.textContent = `Lambda (Complexity Weight): ${lambda.toFixed(2)}`;
    } else {
        label.textContent = `Lambda (Complexity Weight): ${lambda.toExponential(2)}`;
    }
    
    onLambdaChange(lambda);
  });

  container.appendChild(label);
  container.appendChild(slider);
  controlsContainer.appendChild(container);
}
