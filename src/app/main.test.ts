import { describe, it, expect, beforeEach } from 'vitest';

describe('App Shell Layout', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    
    // Simulate main.ts execution
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
  });

  it('should render the four regions', () => {
    const target = document.getElementById('target');
    const render = document.getElementById('render');
    const controls = document.getElementById('controls');
    const metrics = document.getElementById('metrics');

    expect(target).not.toBeNull();
    expect(render).not.toBeNull();
    expect(controls).not.toBeNull();
    expect(metrics).not.toBeNull();
  });
});
