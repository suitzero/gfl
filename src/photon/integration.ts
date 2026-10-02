import { Renderer } from '../render/renderer';
import { sceneCost } from '../gfl/cost';
import { serializeGFL } from '../gfl/parser';

export function setupIntegrationInfo(renderer: Renderer) {
  const app = document.querySelector('#app');
  if (!app) return;
  
  const layout = app.querySelector('.layout') as HTMLElement;
  if (layout) {
    layout.style.gridTemplateRows = '1fr 1fr 1fr';
  }

  const infoRegion = document.createElement('div');
  infoRegion.className = 'region';
  infoRegion.id = 'info';
  infoRegion.style.gridArea = '3 / 1 / 4 / 3'; 
  infoRegion.innerHTML = `
    <h2>Scene Info</h2>
    <div style="display: flex; gap: 20px;">
      <div style="flex: 1;">
        <strong>AST Cost:</strong> <span id="ast-cost">0</span><br/>
        <strong>Frame Time:</strong> <span id="frame-time">0</span> ms
      </div>
      <div style="flex: 2;">
        <strong>Generated GFL Source:</strong>
        <pre id="gfl-source" style="font-size: 0.8em; background: #333; padding: 10px; overflow: auto; max-height: 150px; margin-top: 5px;"></pre>
      </div>
    </div>
  `;
  
  if (layout) {
      layout.appendChild(infoRegion);
  } else {
      app.appendChild(infoRegion);
  }

  const astCostEl = document.getElementById('ast-cost');
  const gflSourceEl = document.getElementById('gfl-source');
  
  const updateInfo = (ast: any) => {
    if (ast) {
        if (astCostEl) astCostEl.textContent = sceneCost(ast).toString();
        if (gflSourceEl) gflSourceEl.textContent = serializeGFL(ast);
    }
  };
  
  if (renderer.activeAST) {
    updateInfo(renderer.activeAST);
  }
  
  const originalOnChange = renderer.onActiveASTChange;
  renderer.onActiveASTChange = (ast) => {
    updateInfo(ast);
    if (originalOnChange) originalOnChange(ast);
  };
}

let frameTimes: number[] = [];
export function updateFrameTime(timeMs: number) {
  const el = document.getElementById('frame-time');
  if (el) {
      frameTimes.push(timeMs);
      if (frameTimes.length > 10) frameTimes.shift();
      const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      el.textContent = avg.toFixed(2);
  }
}
