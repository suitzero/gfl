import type { ASTNode as GFLProgram } from '../gfl/types';
import { parseGFL } from '../gfl/parser';
import { VisionProgramGenerator, type VisionGeneratorContext } from './visionGenerator';
export { VisionProgramGenerator, type VisionGeneratorContext } from './visionGenerator';

export interface ProgramGenerator {
  // Overloaded or extended to allow passing context instead of just raw image data
  generate(input: ImageData | { width: number; height: number; data: Uint8ClampedArray } | VisionGeneratorContext): Promise<GFLProgram>;
}

export class MockProgramGenerator implements ProgramGenerator {
  async generate(_input: any): Promise<GFLProgram> {
    // Return a simple deterministic GFL program ignoring the input
    const programStr = `(union (sphere :r 0.5) (plane :y -0.5))`;
    return parseGFL(programStr);
  }
}

// Wrapper for VisionProgramGenerator to implement the generic interface
export class VlmProgramGeneratorAdapter implements ProgramGenerator {
  private visionGen = new VisionProgramGenerator();

  async generate(input: any): Promise<GFLProgram> {
    let context: VisionGeneratorContext;
    if (input && 'targetImageBase64' in input) {
      context = input as VisionGeneratorContext;
    } else {
      // Stub fallback if old callers use raw image
      context = {
        targetImageBase64: 'placeholder',
        grammarSummary: 'Please provide valid grammar and base64 image.'
      };
    }
    return this.visionGen.generate(context);
  }
}

export function createGenerator(kind: 'mock' | 'vlm'): ProgramGenerator {
  if (kind === 'mock') {
    return new MockProgramGenerator();
  } else if (kind === 'vlm') {
    return new VlmProgramGeneratorAdapter();
  }
  throw new Error(`Unknown generator kind: ${kind}`);
}
