import type { Renderer } from '../render/renderer';
import { sceneCost } from '../gfl/cost';
import type { ASTNode } from '../gfl/types';
import { selectLOD } from '../render/lod';

export class DebugHUD {
  private container: HTMLDivElement;
  private renderer: Renderer;
  private lastUpdate: number = 0;
  private frames: number = 0;
  private fps: number = 0;

  constructor(parent: HTMLElement, renderer: Renderer) {
    this.renderer = renderer;
    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    this.container.style.top = '10px';
    this.container.style.right = '10px';
    this.container.style.padding = '10px';
    this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.container.style.color = '#fff';
    this.container.style.fontFamily = 'monospace';
    this.container.style.fontSize = '12px';
    this.container.style.pointerEvents = 'none';
    this.container.style.zIndex = '1000';
    this.container.style.borderRadius = '5px';
    this.container.style.whiteSpace = 'pre';
    
    parent.style.position = 'relative'; // Ensure parent can position absolute children
    parent.appendChild(this.container);
  }

  public update(frameTimeMs: number) {
    const now = performance.now();
    this.frames++;
    
    // Update FPS once per second
    if (now - this.lastUpdate >= 1000) {
      this.fps = Math.round((this.frames * 1000) / (now - this.lastUpdate));
      this.frames = 0;
      this.lastUpdate = now;
    }

    const { activeAST, originalAST, currentBudget, shaderCompileTimeMs } = this.renderer;
    
    const cost = activeAST ? sceneCost(activeAST) : 0;
    
    // Gather LODs per object using the current budget
    const lods: number[] = [];
    if (originalAST) {
      // Re-run LOD selection to traverse the AST and extract selected qualityLevels,
      // or we can traverse activeAST and collect qualityLevels.
      // The prompt asks to "use selectLOD from src/render/lod.ts".
      // We can run selectLOD on the original AST and traverse the result to collect quality levels
      // for nodes that have them.
      const resolvedAst = selectLOD(originalAST, currentBudget);
      
      const traverse = (node: ASTNode) => {
        if (node.qualityLevel !== undefined) {
          lods.push(node.qualityLevel);
        }
        node.children.forEach(traverse);
      };
      traverse(resolvedAst);
    }
    
    const lodStr = lods.length > 0 ? lods.join(', ') : '0';
    
    // Raymarch step count formula from fragment shader
    const budget_t = (currentBudget - 1.0) / 99.0;
    const stepCount = Math.floor(10.0 + (100.0 - 10.0) * budget_t); // BASE_MAX_STEPS = 100

    this.container.textContent = `
FPS               : ${this.fps}
Frame Time (ms)   : ${frameTimeMs.toFixed(2)}
Shader Compile(ms): ${shaderCompileTimeMs.toFixed(2)}
AST Cost          : ${cost}
Selected LOD      : [${lodStr}]
Raymarch Steps    : ${stepCount}
`.trim();
  }
}
