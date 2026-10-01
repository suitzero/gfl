# src/ui/

**Ownership**: WS-B (Shared with src/render/)

This module handles the UI, such as metrics graphs and budget sweep controls (steps 5, 8, 9, 11, 16, 17, 18).

## Structural LOD Integration Hook (Step 9)
For surfacing structural LOD state in the app shell HUD (which lives in `src/app/` and is strictly handled by the build foreman), the `Renderer` instance provides the following properties:

- `renderer.activeAST`: Gives the current, LOD-resolved `ASTNode` based on the render budget.
- `renderer.onActiveASTChange`: A callback hook `(ast: ASTNode) => void` that fires whenever `activeAST` changes due to budget updates.

**Note:** Workstream WS-B explicitly does not edit `src/app/**`. Integration of these hooks should be handled outside this workstream.