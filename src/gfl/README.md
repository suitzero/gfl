# src/gfl/

**Ownership**: WS-A

This module contains the S-expression parser, AST types, GFL→GLSL compiler, and cost model (steps 2, 3, 4, 6, 7, 10).

## Compiler API

The GFL compiler provides a function to compile the parsed GFL AST to a complete fragment shader written in GLSL (WebGL 2.0 / GLSL ES 3.00).

```typescript
import { compileToGLSL } from './compiler';
import { parseGFL } from './parser';

const ast = parseGFL(`(sphere :radius 5.0)`);
const glslSource = compileToGLSL(ast);
```

### AST to GLSL Mapping

The `compileToGLSL(ast: ASTNode): string` function maps AST nodes to SDF functions within a generated `map(vec3 p)` function. 
The generated shader includes boilerplate, standard SDF functions, Normal estimation, and basic lighting in `main()`.

- **Primitives**: `sphere`, `box`, `plane` translate to `sdSphere`, `sdBox`, `sdPlane`.
- **Transforms**: `translate`, `rotate`, `scale` adjust the input point `p` and apply the operation before querying child nodes.
- **CSG**: `union`, `subtract`, `intersect`, `smooth-union` map to `opUnion`, `opSubtract`, `opIntersect`, `opSmoothUnion`. Note that for `subtract`, child[1..n] are subtracted from child[0].
- **Scene Params**: The root `scene` node searches its children for a `camera` node to set the viewpoint.

The generator guarantees deterministic output for the same AST input.
