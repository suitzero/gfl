import { describe, it, expect, beforeEach } from 'vitest';
import { setupIntegrationInfo, updateFrameTime } from './integration';

describe('Integration Info UI', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"><div class="layout"></div></div>';
  });

  it('mounts integration info region', () => {
    // mock renderer
    const mockRenderer: any = { activeAST: null, onActiveASTChange: undefined };
    
    setupIntegrationInfo(mockRenderer);
    
    const infoRegion = document.getElementById('info');
    expect(infoRegion).toBeTruthy();
    expect(infoRegion?.innerHTML).toContain('Scene Info');
    
    const astCostEl = document.getElementById('ast-cost');
    expect(astCostEl).toBeTruthy();
    
    const frameTimeEl = document.getElementById('frame-time');
    expect(frameTimeEl).toBeTruthy();
  });

  it('updates AST cost on change', () => {
    const mockRenderer: any = { activeAST: null, onActiveASTChange: undefined };
    setupIntegrationInfo(mockRenderer);
    
    const astCostEl = document.getElementById('ast-cost');
    expect(astCostEl?.textContent).toBe('0');
    
    const mockAST = { type: 'sphere', children: [] };
    if (mockRenderer.onActiveASTChange) {
      mockRenderer.onActiveASTChange(mockAST);
    }
    
    expect(astCostEl?.textContent).toBe('1');
  });

  it('updates frame time', () => {
    const mockRenderer: any = { activeAST: null, onActiveASTChange: undefined };
    setupIntegrationInfo(mockRenderer);
    
    updateFrameTime(16.6);
    const frameTimeEl = document.getElementById('frame-time');
    expect(frameTimeEl?.textContent).toBe('16.60');
    
    updateFrameTime(33.4);
    expect(frameTimeEl?.textContent).toBe('25.00'); // average of 16.6 and 33.4
  });
});
