import { setPhotonBudget, initPhotonOverlay } from '../photon/overlay';

export function setupControls(onBudgetChange: (budget: number) => void) {
  const controlsContainer = document.getElementById('controls');
  if (!controlsContainer) {
    console.warn("Controls container not found, cannot setup budget UI.");
    return;
  }

  const container = document.createElement('div');
  container.style.marginTop = '10px';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = '5px';

  const label = document.createElement('label');
  label.htmlFor = 'budget-slider';
  label.textContent = 'Structural Budget: 100';

  const slider = document.createElement('input');
  slider.id = 'budget-slider';
  slider.type = 'range';
  slider.min = '1';
  slider.max = '100';
  slider.value = '100';
  slider.style.width = '100%';

  slider.addEventListener('input', (e) => {
    const value = parseInt((e.target as HTMLInputElement).value, 10);
    label.textContent = `Structural Budget: ${value}`;
    onBudgetChange(value);
  });

  container.appendChild(label);
  container.appendChild(slider);

  const photonLabel = document.createElement('label');
  photonLabel.htmlFor = 'photon-budget-slider';
  photonLabel.textContent = 'Photon Budget (N): 1.00e+6';

  const photonSlider = document.createElement('input');
  photonSlider.id = 'photon-budget-slider';
  photonSlider.type = 'range';
  photonSlider.min = '0'; // log10(1) = 0
  photonSlider.max = '6'; // log10(1e6) = 6
  photonSlider.step = '0.01';
  photonSlider.value = '6';
  photonSlider.style.width = '100%';

  photonSlider.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    const N = Math.pow(10, val);
    photonLabel.textContent = `Photon Budget (N): ${N > 1000 ? N.toExponential(2) : Math.round(N)}`;
    setPhotonBudget(N);
  });

  container.appendChild(photonLabel);
  container.appendChild(photonSlider);

  controlsContainer.appendChild(container);
  
  initPhotonOverlay();
}
