import type { ASTNode } from "../gfl/types";
import { metricTriple } from "./metrics";
import type { RenderFn } from "./loop";

/**
 * Creates a naive grid of spheres manually unrolled.
 * Creates a 4x6 grid for a total of 24 spheres.
 */
function createNaiveProgram(): ASTNode {
  const children: ASTNode[] = [];
  for (let x = 0; x < 4; x++) {
    for (let z = 0; z < 6; z++) {
      children.push({
        type: "translate",
        params: { offset: [x * 2.0, 0.0, z * 2.0] },
        children: [
          {
            type: "sphere",
            params: { radius: 1.0 },
            children: [],
            cost: 1,
          },
        ],
        cost: 2,
      });
    }
  }

  return {
    type: "union",
    params: {},
    children,
    cost: 1 + children.reduce((acc, c) => acc + c.cost, 0),
  };
}

export const naiveProgram = createNaiveProgram();

/**
 * Creates a compressed program using the minimal 'repeat' macro.
 * Represents the same 4x6 grid of 24 spheres.
 */
export const compressedProgram: ASTNode = {
  type: "repeat",
  params: { countX: 4, countZ: 6, spacingX: 2.0, spacingZ: 2.0 },
  children: [
    {
      type: "sphere",
      params: { radius: 1.0 },
      children: [],
      cost: 1,
    },
  ],
  cost: 2, // O(1) representation cost in AST
};

/**
 * Minimal macro expansion for 'repeat' nodes in this demo.
 * Translates 'repeat' nodes into a 'union' of 'translate' nodes.
 */
export function expandMacros(node: ASTNode): ASTNode {
  if (node.type === "repeat") {
    const {
      countX = 1,
      countZ = 1,
      spacingX = 1.0,
      spacingZ = 1.0,
    } = node.params;
    const children: ASTNode[] = [];
    const repeatedChild = expandMacros(node.children[0]); // Recurse on the single child

    for (let x = 0; x < countX; x++) {
      for (let z = 0; z < countZ; z++) {
        children.push({
          type: "translate",
          params: { offset: [x * spacingX, 0.0, z * spacingZ] },
          children: [JSON.parse(JSON.stringify(repeatedChild))], // Deep copy the child
          cost: 1 + repeatedChild.cost, // Cost of translate + child
        });
      }
    }

    return {
      type: "union",
      params: {},
      children,
      cost: 1 + children.reduce((acc, c) => acc + c.cost, 0),
    };
  }

  // Recurse for other nodes
  return {
    ...node,
    children: node.children ? node.children.map(expandMacros) : [],
  };
}

export interface DemoReport {
  naive: {
    error: number;
    complexity: number;
    cost: number;
  };
  compressed: {
    error: number;
    complexity: number;
    cost: number;
  };
  message: string;
}

/**
 * Runs the "Compression as Explanation" headless demo.
 * Compares naive vs compressed programs.
 *
 * @param renderFn A function that renders an AST to ImageDataLike.
 *                 Note: the macro must be expanded before rendering with standard compiler.
 */
export async function runCompressionDemo(
  renderFn: RenderFn,
): Promise<DemoReport> {
  // Target is logically the unrolled grid. Render the target using the naive program.
  const targetImage = await renderFn(naiveProgram);

  // Measure Naive Program
  const naiveStats = {
    target: targetImage,
    render: await renderFn(naiveProgram),
  };
  const naiveMetrics = metricTriple(naiveStats, naiveProgram);

  // Measure Compressed Program
  // To render the compressed program, we must expand it since the standard compiler doesn't support 'repeat' natively.
  // We expand ONLY for rendering. The metrics should be run on the ORIGINAL unexpanded AST for cost comparison.
  const expandedCompressed = expandMacros(compressedProgram);
  const compressedStats = {
    target: targetImage,
    render: await renderFn(expandedCompressed),
  };
  const compressedMetrics = metricTriple(compressedStats, compressedProgram);

  return {
    naive: {
      error: naiveMetrics.reconstructionError,
      complexity: naiveMetrics.programSize,
      cost: naiveMetrics.runtimeCost,
    },
    compressed: {
      error: compressedMetrics.reconstructionError,
      complexity: compressedMetrics.programSize,
      cost: compressedMetrics.runtimeCost,
    },
    message: `Compression Demo:
Naive Error: ${naiveMetrics.reconstructionError.toFixed(4)}, Size: ${naiveMetrics.programSize}, Cost: ${naiveMetrics.runtimeCost}
Compressed Error: ${compressedMetrics.reconstructionError.toFixed(4)}, Size: ${compressedMetrics.programSize}, Cost: ${compressedMetrics.runtimeCost}
Explanation: Compressed program maintains identical error while dramatically reducing AST size and representation cost.`,
  };
}
