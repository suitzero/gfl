import { describe, it, expect } from 'vitest';
import { createGenerator, MockProgramGenerator, VlmProgramGenerator } from './generator';
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

  describe('VlmProgramGenerator', () => {
    it('throws the expected API-key exception', async () => {
      const generator = new VlmProgramGenerator();
      await expect(generator.generate(dummyImage)).rejects.toThrow('not implemented (needs vision-model API key)');
    });
  });

  describe('createGenerator', () => {
    it('returns a MockProgramGenerator for "mock"', () => {
      const generator = createGenerator('mock');
      expect(generator).toBeInstanceOf(MockProgramGenerator);
    });

    it('returns a VlmProgramGenerator for "vlm"', () => {
      const generator = createGenerator('vlm');
      expect(generator).toBeInstanceOf(VlmProgramGenerator);
    });

    it('throws for unknown kind', () => {
      expect(() => createGenerator('unknown' as any)).toThrow('Unknown generator kind: unknown');
    });
  });
});
