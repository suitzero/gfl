import { describe, it, expect, vi } from 'vitest';
import { DebugHUD } from './hud';
import type { Renderer } from '../render/renderer';
import type { ASTNode } from '../gfl/types';

describe('DebugHUD', () => {
  it('should render and format metrics correctly', () => {
    const parent = document.createElement('div');
    
    // Mock Renderer
    const mockAst: ASTNode = {
      type: 'sphere',
      children: [],
      params: { r: 1 },
      cost: 1, // Will be read by sceneCost
      qualityLevel: 42
    };

    const mockRenderer = {
      originalAST: mockAst,
      activeAST: mockAst,
      currentBudget: 50,
      shaderCompileTimeMs: 15.5,
      refinableRadius: { interval: [0.5, 1.5] }
    } as unknown as Renderer;

    let time = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => time);

    const hud = new DebugHUD(parent, mockRenderer); // lastUpdate initialized to 0
    
    time = 1000;
    hud.update(5.23); // diff = 1000, frames = 1. FPS = 1

    // The inner container text content should reflect the state
    const container = parent.children[0] as HTMLDivElement;
    expect(container).toBeDefined();
    
    const text = container.textContent || '';
    
    expect(text).toContain('FPS               : 1');
    expect(text).toContain('Frame Time (ms)   : 5.23');
    expect(text).toContain('Shader Compile(ms): 15.50');
    expect(text).toContain('AST Cost          : 1');
    expect(text).toContain('Selected LOD      : [42]');
    
    // Formula for steps: Math.floor(10.0 + 90.0 * (50 - 1) / 99.0)
    // 90 * 49 / 99 = 44.5454 -> 10 + 44.5454 = 54.5454 -> 54
    expect(text).toContain('Raymarch Steps    : 54');
    
    vi.restoreAllMocks();
  });
});
