import { describe, it, expect, beforeEach } from 'vitest';
import { renderASTInspector, showASTDebugOverlay } from './inspector';

describe('AST Inspector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders JSON AST into a container', () => {
    const container = document.createElement('div');
    const code = `(sphere :radius 5)`;
    
    renderASTInspector(code, container);
    
    const pre = container.querySelector('pre');
    expect(pre).not.toBeNull();
    
    if (pre) {
      const content = pre.textContent || '';
      expect(content).toContain('"type": "sphere"');
      expect(content).toContain('"radius": 5');
    }
  });

  it('shows debug overlay with JSON AST', () => {
    const code = `(box :size [1 1 1])`;
    
    showASTDebugOverlay(code);
    
    const overlay = document.getElementById('gfl-ast-debug-overlay');
    expect(overlay).not.toBeNull();
    
    const content = document.getElementById('gfl-ast-debug-content');
    expect(content).not.toBeNull();
    
    const pre = content?.querySelector('pre');
    expect(pre).not.toBeNull();
    
    if (pre) {
      const text = pre.textContent || '';
      expect(text).toContain('"type": "box"');
    }
  });
});
