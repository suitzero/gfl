# suitzero/gfl

This is the repository for the GFL web app visual research demo.

## Overview

The purpose of this project is to create a working visual research demo with the following objectives visible:
- budget → representation complexity
- budget → error
- program complexity → reconstruction quality

## Project Structure

The project is divided into distinct workstreams mapping to different source directories:
- `src/gfl/`: WS-A gfl-compiler (S-expression parser, AST types, GFL→GLSL compiler, cost model).
- `src/render/` & `src/ui/`: WS-B renderer-anytime (raymarcher, budget system, structural LOD, metrics graphs, budget sweep).
- `src/inverse/`: WS-C inverse-programming (target image upload, error metrics, optimizer, AI-editable loop, compression demo).
- `src/photon/`: WS-D photon-simulation (photon/shot-noise simulator, photon budget graphs, integrated demo).
- `src/app/`: app shell (four-region layout, static build config).

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