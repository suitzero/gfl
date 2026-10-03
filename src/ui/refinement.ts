import type { Renderer } from '../render/renderer';
import { RefinableIntervalNumber } from '../render/values';
import { selectLOD } from '../render/lod';
import type { ASTNode } from '../gfl/types';

export class RefinementUI {
  private container: HTMLDivElement;
  private renderer: Renderer;
  private visible: boolean = false;

  constructor(parent: HTMLElement, renderer: Renderer) {
    this.renderer = renderer;
    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    this.container.style.bottom = '20px';
    this.container.style.left = '20px';
    this.container.style.padding = '15px';
    this.container.style.backgroundColor = 'rgba(20, 30, 40, 0.9)';
    this.container.style.color = '#fff';
    this.container.style.fontFamily = 'sans-serif';
    this.container.style.fontSize = '13px';
    this.container.style.borderRadius = '8px';
    this.container.style.border = '1px solid #555';
    this.container.style.display = 'none';
    this.container.style.zIndex = '1000';
    this.container.style.pointerEvents = 'none';
    this.container.style.width = '300px';
    
    parent.style.position = 'relative';
    parent.appendChild(this.container);
    
    // Listen to canvas clicks to toggle this UI
    // We assume parent is the region container and has the canvas inside
    const canvas = parent.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('click', () => {
        this.visible = !this.visible;
        this.container.style.display = this.visible ? 'block' : 'none';
        if (this.visible) {
          this.update();
        }
      });
    }
  }

  public update() {
    if (!this.visible) return;

    const { currentBudget, refinableRadius, originalAST } = this.renderer;

    // Simulate uncertainty bounds at different budgets for display
    const b1 = new RefinableIntervalNumber(1.0, 1.0, 1);
    const b10 = new RefinableIntervalNumber(1.0, 1.0, 10);
    const b100 = new RefinableIntervalNumber(1.0, 1.0, 100);

    const fmt = (r: RefinableIntervalNumber, b: number) => `budget ${b} = 1 ± ${r.errorBound.toFixed(2)}`;

    // Gather LOD level
    let lodLevel = 0;
    if (originalAST) {
      const resolvedAst = selectLOD(originalAST, currentBudget);
      const traverse = (node: ASTNode) => {
        if (node.qualityLevel !== undefined) {
          lodLevel = Math.max(lodLevel, node.qualityLevel);
        }
        node.children.forEach(traverse);
      };
      traverse(resolvedAst);
    }

    // Raymarch steps
    const budget_t = (currentBudget - 1.0) / 99.0;
    const steps = Math.floor(10.0 + (100.0 - 10.0) * budget_t);

    const interval = refinableRadius.interval;
    let minStr = '0', maxStr = '0', widthStr = '0', errorStr = '0';
    if (interval) {
      minStr = interval[0].toFixed(3);
      maxStr = interval[1].toFixed(3);
      widthStr = (interval[1] - interval[0]).toFixed(3);
      errorStr = refinableRadius.errorBound.toFixed(3);
    }

    // Calculate percentages for meters
    const structuralPercent = Math.max(0, Math.min(100, currentBudget));
    
    // Precision: max error is at budget 1 (error = 0.5).
    // So precision = 100 - (error / 0.5) * 100
    const maxError = 0.5;
    const precisionPercent = Math.max(0, Math.min(100, 100 - (refinableRadius.errorBound / maxError) * 100));

    this.container.innerHTML = `
      <h3 style="margin: 0 0 10px 0; font-size: 14px; border-bottom: 1px solid #555; padding-bottom: 5px;">
        Object Parameter Uncertainty
      </h3>
      <div style="margin-bottom: 15px; font-family: monospace; font-size: 11px; color: #aaa;">
        ${fmt(b1, 1)}<br>
        ${fmt(b10, 10)}<br>
        ${fmt(b100, 100)}
      </div>

      <div style="margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <strong>Structural Budget (LOD)</strong>
          <span>${currentBudget.toFixed(0)} / 100</span>
        </div>
        <div style="width: 100%; height: 8px; background: #333; border-radius: 4px; overflow: hidden;">
          <div style="width: ${structuralPercent}%; height: 100%; background: #f39c12; transition: width 0.1s;"></div>
        </div>
        <div style="font-size: 11px; color: #ccc; margin-top: 4px;">
          LOD: ${lodLevel} | Raymarch Steps: ${steps}
        </div>
      </div>

      <div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <strong>Numerical Precision</strong>
          <span>width: ${widthStr}</span>
        </div>
        <div style="width: 100%; height: 8px; background: #333; border-radius: 4px; overflow: hidden;">
          <div style="width: ${precisionPercent}%; height: 100%; background: #00d2d3; transition: width 0.1s;"></div>
        </div>
        <div style="font-size: 11px; color: #ccc; margin-top: 4px;">
          Radius: 1 ± ${errorStr}
        </div>
      </div>
    `;
  }
}
