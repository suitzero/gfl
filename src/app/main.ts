import './style.css';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="layout">
    <div class="region" id="target">
      <h2>Target</h2>
    </div>
    <div class="region" id="render">
      <h2>Render</h2>
    </div>
    <div class="region" id="controls">
      <h2>Controls</h2>
    </div>
    <div class="region" id="metrics">
      <h2>Metrics</h2>
    </div>
  </div>
`;
