import type { Renderer } from '../render/renderer';
import { computeMetricsCurves } from '../render/metricsLogic';
import type { CurvePoint } from '../render/metricsLogic';

export class MetricsUI {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private curves: CurvePoint[] = [];
  private currentBudget: number = 100;
  private container: HTMLElement;
  private renderer: Renderer;
  
  constructor(container: HTMLElement, renderer: Renderer) {
    this.container = container;
    this.renderer = renderer;
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.minHeight = '200px'; // Give it some visible size
    this.canvas.width = 400; // Internal resolution
    this.canvas.height = 300;
    
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error("Could not get 2d context for metrics graph");
    this.ctx = ctx;
    
    this.container.appendChild(this.canvas);
    
    // Initial compute
    this.recomputeCurves();
  }

  public updateBudget(budget: number) {
    this.currentBudget = budget;
    this.draw();
  }
  
  public recomputeCurves() {
    // If no originalAST, we can't really do anything, wait until there is one.
    // If we need a default, we could parse an example here, but renderer has originalAST.
    if (!this.renderer.originalAST) {
       this.drawEmpty();
       return;
    }

    const budgets = [];
    for (let i = 1; i <= 100; i += 5) {
      budgets.push(i);
    }
    if (budgets[budgets.length - 1] !== 100) {
      budgets.push(100);
    }

    // Measure using renderer's webgl output
    // Note: We need to temporarily change renderer budget to measure.
    const originalBudget = this.currentBudget;
    
    const renderFnWithTime = (_ast: any, b: number) => {
      this.renderer.setBudget(b); // this updates activeAST
      
      const start = performance.now();
      this.renderer.render(0); // Assuming 0 time
      const end = performance.now();
      
      const pixels = this.renderer.getPixels();
      return { data: pixels, timeMs: end - start };
    };

    this.curves = computeMetricsCurves(this.renderer.originalAST, budgets, renderFnWithTime);
    
    // Restore budget
    this.renderer.setBudget(originalBudget);
    
    this.draw();
  }

  private drawEmpty() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ccc';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No AST to measure.', canvas.width / 2, canvas.height / 2);
  }

  private draw() {
    if (this.curves.length === 0) return;
    
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    const padding = 40; // padding for axes
    
    ctx.clearRect(0, 0, w, h);
    
    // Background
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, w, h);

    // Draw axes
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, h - padding);
    ctx.lineTo(w - padding, h - padding);
    ctx.stroke();
    
    // Labels
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Budget (1-100)', w / 2, h - 10);
    
    ctx.save();
    ctx.translate(15, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Value', 0, 0);
    ctx.restore();

    // Find max values for scaling
    const maxBudget = 100;
    const maxError = Math.max(...this.curves.map(c => c.error), 1e-5); // prevent div by zero
    const maxCost = Math.max(...this.curves.map(c => c.cost), 1);
    const maxTime = Math.max(...this.curves.map(c => c.frameTime), 1);
    
    const graphW = w - 2 * padding;
    const graphH = h - 2 * padding;
    
    const getX = (budget: number) => padding + (budget / maxBudget) * graphW;
    
    const drawCurve = (color: string, getValue: (c: CurvePoint) => number, maxVal: number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      this.curves.forEach((c, i) => {
        const x = getX(c.budget);
        const y = h - padding - (getValue(c) / maxVal) * graphH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };

    // Draw curves
    drawCurve('#ff4444', c => c.error, maxError); // Error (Red)
    drawCurve('#44ff44', c => c.cost, maxCost);   // Cost (Green)
    drawCurve('#4444ff', c => c.frameTime, maxTime); // Time (Blue)
    
    // Legend
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ff4444'; ctx.fillText('Error', padding + 10, padding + 10);
    ctx.fillStyle = '#44ff44'; ctx.fillText('Cost', padding + 10, padding + 25);
    ctx.fillStyle = '#4444ff'; ctx.fillText('Frame Time', padding + 10, padding + 40);

    // Draw current budget marker
    const markerX = getX(this.currentBudget);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(markerX, padding);
    ctx.lineTo(markerX, h - padding);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw dot for current error
    const currentPoint = this.curves.reduce((prev, curr) => 
      Math.abs(curr.budget - this.currentBudget) < Math.abs(prev.budget - this.currentBudget) ? curr : prev
    );
    
    const markerY = h - padding - (currentPoint.error / maxError) * graphH;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(markerX, markerY, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function setupMetrics(renderer: Renderer): MetricsUI | null {
  const container = document.getElementById('metrics');
  if (!container) {
    console.warn("Metrics container not found.");
    return null;
  }
  return new MetricsUI(container, renderer);
}
