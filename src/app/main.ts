import './style.css';
import { Renderer } from '../render/renderer';
import { mountTargetRegion } from '../inverse/target';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="layout">
    <div class="region" id="target">
      <h2>Target</h2>
    </div>
    <div class="region" id="render">
      <h2>Render</h2>
      <canvas id="render-canvas" style="width: 100%; height: 100%; display: block;"></canvas>
    </div>
    <div class="region" id="controls">
      <h2>Controls</h2>
    </div>
    <div class="region" id="metrics">
      <h2>Metrics</h2>
    </div>
  </div>
`;

// Initialize renderer
const renderCanvas = document.querySelector<HTMLCanvasElement>('#render-canvas');
if (renderCanvas) {
  try {
    const renderer = new Renderer(renderCanvas);
    
    // Animation loop
    const renderLoop = (time: number) => {
      // Convert time to seconds
      renderer.render(time * 0.001);
      requestAnimationFrame(renderLoop);
    };
    
    requestAnimationFrame(renderLoop);
  } catch (e) {
    console.error("Failed to initialize WebGL2 renderer:", e);
  }
}

// Initialize Target Region
const targetContainer = document.getElementById('target');
if (targetContainer) {
  mountTargetRegion(targetContainer);
}
