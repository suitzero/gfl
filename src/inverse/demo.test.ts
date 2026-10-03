import { describe, it, expect } from "vitest";
import {
  expandMacros,
  naiveProgram,
  compressedProgram,
  runCompressionDemo,
} from "./demo";
import type { ImageDataLike } from "./errorMetric";
import type { ASTNode } from "../gfl/types";

describe("Compression as Explanation Demo", () => {
  it("should structurally match naive program when compressed program is expanded", () => {
    const expanded = expandMacros(compressedProgram);

    // We check that it creates a union with the correct number of children
    expect(expanded.type).toBe("union");
    expect(expanded.children.length).toBe(24);

    // The structural match should be identical
    expect(expanded).toEqual(naiveProgram);
  });

  it("should generate a report demonstrating lower complexity with same error", async () => {
    // Mock renderFn that just returns a dummy image
    const dummyImage: ImageDataLike = {
      width: 2,
      height: 2,
      data: new Uint8Array([
        255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
      ]),
    };

    // Create a deterministic renderFn that returns the same image regardless of AST
    // because both ASTs evaluate to the same geometry via expandMacros
    const mockRender = async (_program: ASTNode) => dummyImage;

    const report = await runCompressionDemo(mockRender);

    // Both should have zero error because target and render are identical dummy images
    expect(report.naive.error).toBe(0);
    expect(report.compressed.error).toBe(0);

    // Complexity of compressed should be dramatically lower
    expect(report.compressed.complexity).toBeLessThan(report.naive.complexity);
    expect(report.compressed.cost).toBeLessThan(report.naive.cost);

    // Naive has 24 spheres + 24 translates + 1 union = 49 nodes
    expect(report.naive.complexity).toBe(49);

    // Compressed has 1 repeat + 1 sphere = 2 nodes
    expect(report.compressed.complexity).toBe(2);

    // Verify string contains explanation
    expect(report.message).toContain("Compression Demo:");
    expect(report.message).toContain(
      "Compressed program maintains identical error",
    );
  });
});
