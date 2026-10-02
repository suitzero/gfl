import type { ASTNode as GFLProgram } from '../gfl/types';
import { parseGFL } from '../gfl/parser';

export interface ProgramGenerator {
  generate(targetImage: ImageData | { width: number; height: number; data: Uint8ClampedArray }): Promise<GFLProgram>;
}

export class MockProgramGenerator implements ProgramGenerator {
  async generate(_targetImage: ImageData | { width: number; height: number; data: Uint8ClampedArray }): Promise<GFLProgram> {
    // Return a simple deterministic GFL program ignoring the input
    const programStr = `(union (sphere :r 0.5) (plane :y -0.5))`;
    return parseGFL(programStr);
  }
}

export class VlmProgramGenerator implements ProgramGenerator {
  async generate(_targetImage: ImageData | { width: number; height: number; data: Uint8ClampedArray }): Promise<GFLProgram> {
    throw new Error('not implemented (needs vision-model API key)');
  }
}

export function createGenerator(kind: 'mock' | 'vlm'): ProgramGenerator {
  if (kind === 'mock') {
    return new MockProgramGenerator();
  } else if (kind === 'vlm') {
    return new VlmProgramGenerator();
  }
  throw new Error(`Unknown generator kind: ${kind}`);
}
