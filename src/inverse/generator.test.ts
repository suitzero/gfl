import { describe, it, expect } from 'vitest';
import { createGenerator, MockProgramGenerator, VlmProgramGeneratorAdapter } from './generator';
import type { ASTNode as GFLProgram } from '../gfl/types';

describe('Inverse Programming Generator', () => {
  const dummyImage = { width: 1, height: 1, data: new Uint8ClampedArray(4) };

  describe('MockProgramGenerator', () => {
    it('returns a successfully parsed AST ignoring input', async () => {
      const generator = new MockProgramGenerator();
      const program: GFLProgram = await generator.generate(dummyImage);
      
      expect(program).toBeDefined();
      expect(program.type).toBe('union');
      expect(program.children.length).toBe(2);
      expect(program.children[0].type).toBe('sphere');
      expect(program.children[1].type).toBe('plane');
    });
  });

  describe('VlmProgramGeneratorAdapter', () => {
    it('throws the expected API-key exception when using default env variables', async () => {
      // Ensure key is unset for this test
      const originalKey = process.env.GFL_VISION_API_KEY;
      delete process.env.GFL_VISION_API_KEY;
      
      const generator = new VlmProgramGeneratorAdapter();
      await expect(generator.generate(dummyImage)).rejects.toThrow('GFL_VISION_API_KEY environment variable is required');
      
      if (originalKey !== undefined) process.env.GFL_VISION_API_KEY = originalKey;
    });
  });

  describe('createGenerator', () => {
    it('returns a MockProgramGenerator for "mock"', () => {
      const generator = createGenerator('mock');
      expect(generator).toBeInstanceOf(MockProgramGenerator);
    });

    it('returns a VlmProgramGeneratorAdapter for "vlm"', () => {
      const generator = createGenerator('vlm');
      expect(generator).toBeInstanceOf(VlmProgramGeneratorAdapter);
    });

    it('throws for unknown kind', () => {
      expect(() => createGenerator('unknown' as any)).toThrow('Unknown generator kind: unknown');
    });
  });
});
