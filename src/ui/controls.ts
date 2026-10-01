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
  label.textContent = 'Render Budget: 100';

  const slider = document.createElement('input');
  slider.id = 'budget-slider';
  slider.type = 'range';
  slider.min = '1';
  slider.max = '100';
  slider.value = '100';
  slider.style.width = '100%';

  slider.addEventListener('input', (e) => {
    const value = parseInt((e.target as HTMLInputElement).value, 10);
    label.textContent = `Render Budget: ${value}`;
    onBudgetChange(value);
  });

  container.appendChild(label);
  container.appendChild(slider);
  controlsContainer.appendChild(container);
}
