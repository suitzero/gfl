# suitzero/gfl

GFL (Geometric Function Language) is a budget-aware SDF scene language designed with anytime refinement. This repository contains the GFL web app, a working visual research demo engineered to make specific relationships in computational representation visible.

## The Core Idea

The demo does not aim for architectural completeness. Instead, it optimizes for illustrating three key relationships:

1. **budget -> representation complexity:** How computational constraints dictate the structural detail of a scene.
2. **budget -> error:** The trade-off between available resources and the reconstruction accuracy of the render.
3. **program complexity -> reconstruction quality:** How programmatic abstractions (like loops and macros) can dramatically reduce cost while maintaining high quality (compression as explanation).

## Project Layout

The application interface is divided into a four-region layout:
- **Target:** Displays the reference image or goal.
- **Render:** Shows the current GFL scene output.
- **Controls:** Provides interactive budget sweeping and parameter tuning.
- **Metrics:** Visualizes real-time performance and error graphs.

The repository is divided into dedicated workstreams:
- `src/app/`: Foundation workstream. Handles the app shell and four-region layout.
- `src/gfl/`: WS-A. The core GFL compiler, AST types, and SDF mapping.
- `src/render/`: WS-B. Renderer handling the raymarcher, budget system, and structural LOD.
- `src/ui/`: WS-B. UI components for metrics graphs and budget controls.
- `src/inverse/`: WS-C. Inverse-programming loop, error metrics, and the compression demo.
- `src/photon/`: WS-D. Photon and shot-noise simulation modules.

## Running Locally

To run the project locally, install dependencies and start the dev server:

```bash
npm install
npm run dev
```

## Building

To create a static production build:

```bash
npm run build
```

## Testing

To run headless tests (via Vitest):

```bash
npm run test
```

## Phase-1 Milestone Summary

Phase 1 of the GFL MVP is now complete. The following capabilities have been successfully integrated:
- **Scaffold:** Initial project structure and static build pipeline.
- **First Render:** Baseline GFL to GLSL compilation and WebGL rendering.
- **Anytime Core:** Budget-aware structural LOD and real-time budget sweeping.
- **Inverse Loop:** Error metrics and an iterative optimization loop for target matching.
- **Compression as Explanation:** A demo proving that structural compression (e.g., using macros for repeats) reduces programmatic complexity without increasing reconstruction error.
- **Phase-1 Complete:** All foundational pipelines are now wired into the four-region app shell layout.