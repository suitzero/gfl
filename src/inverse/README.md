# src/inverse/

**Ownership**: WS-C

This module covers inverse programming: target image upload, error metrics, optimizer, AI-editable loop, and compression demo (steps 12, 13, 14, 15, 22, 23, 24, 28).

## Error Metrics API

This module exports functions to compute the error between a target image and a rendered image in `src/inverse/errorMetric.ts`:

- `mse(target: ImageDataLike, render: ImageDataLike): number` - Computes the Mean Squared Error (MSE).
- `mae(target: ImageDataLike, render: ImageDataLike): number` - Computes the Mean Absolute Error (MAE).

### UI Wiring Subscription Contract

To wire the error metrics to the live display (which requires integration in `src/app/**` and `src/ui/**` by the build foreman), use the following subscription contract concept:

```typescript
// Proposed signature for the integration step:
type ErrorMetricCallback = (errorValues: { mse: number; mae: number }) => void;
type UnsubscribeFunc = () => void;

// The app shell would call a registration function like:
// function subscribeToErrorMetrics(callback: ErrorMetricCallback): UnsubscribeFunc;
```

_(Note: The actual registration function will be implemented during the integration step. Do not modify `src/app/**` or `src/ui/**` from this module.)_

## Compression as Explanation Demo (Step 28)

This module provides the "Compression as Explanation" demo logic located in `src/inverse/demo.ts`. This demo proves that compressing a structural pattern dramatically reduces programmatic cost while maintaining identical reconstruction error.

### UI Wiring Contract for Demo

The integrator working in `src/app/**` or `src/ui/**` should import and run `runCompressionDemo` to get the side-by-side numbers for a naive vs compressed programmatic grid.

```typescript
import { runCompressionDemo, expandMacros } from "../inverse/demo";

// Usage by app shell:
// Provide your rendering function that can map an AST to ImageDataLike.
// Make sure to expand macros before rendering if passing to standard compiler.
const report = await runCompressionDemo(myRenderFunction);

console.log(report.message); // Contains a human-readable explanation
```

Because `repeat` nodes are not fully supported by the primary GLSL compiler (which requires static geometry counts), the `expandMacros(node: ASTNode): ASTNode` function is provided to dynamically unroll repeat nodes into `union`s of `translate`s before passing the AST to `compileToGLSL` or a renderer.

_(Note: Do not build this UI logic directly within `src/inverse/`. Provide the wiring exports so the app shell can integrate them headlessly.)_
