import type { ASTNode } from './types';

export function compileToGLSL(ast: ASTNode, budget: number = Infinity): string {
    const glsl: string[] = [];
    
    // Header & Boilerplate
    glsl.push(`#version 300 es`);
    glsl.push(`precision highp float;`);
    glsl.push(`uniform vec2 u_resolution;`);
    glsl.push(`uniform float u_time;`);
    glsl.push(`out vec4 fragColor;`);
    
    // Common SDFs
    glsl.push(`
float sdSphere(vec3 p, float r) { return length(p) - r; }
float sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0); }
float sdPlane(vec3 p, vec3 n, float h) { return dot(p,n) + h; }

float opUnion(float d1, float d2) { return min(d1,d2); }
float opSubtract(float d1, float d2) { return max(-d1,d2); }
float opIntersect(float d1, float d2) { return max(d1,d2); }
float opSmoothUnion(float d1, float d2, float k) {
    float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
    return mix( d2, d1, h ) - k*h*(1.0-h);
}
    `.trim());

    let mapFunctionBody = '';
    
    let cameraPos = [0.0, 0.0, 5.0];
    let cameraFov = 45.0;
    
    let geometryRoot: ASTNode | null = ast;
    
    if (ast.type === 'scene') {
        const geoms: ASTNode[] = [];
        for (const child of ast.children) {
            if (child.type === 'camera') {
                if (child.params.position) cameraPos = child.params.position;
                if (child.params.fov !== undefined) cameraFov = child.params.fov;
            } else if (child.type === 'light') {
                // parse light if needed
            } else {
                geoms.push(child);
            }
        }
        
        if (geoms.length === 1) {
            geometryRoot = geoms[0];
        } else if (geoms.length > 1) {
            geometryRoot = {
                type: 'union',
                children: geoms,
                params: {},
                cost: 0
            };
        } else {
            geometryRoot = null;
        }
    }
    
    let varCount = 0;
    function compileNode(node: ASTNode, pVar: string, currentBudget: number): { code: string, outVar: string } {
        const costThreshold = typeof node.params.cost === 'number' ? node.params.cost : 0;
        if (currentBudget < costThreshold && node.params.fallback) {
            // When fallback is used, we don't reduce the budget anymore, 
            // but for nested refines we still pass it down.
            return compileNode(node.params.fallback as ASTNode, pVar, currentBudget);
        }

        const outVar = `d${varCount++}`;
        let code = '';
        
        if (node.type === 'refine') {
            if (node.children.length > 0) {
                return compileNode(node.children[0], pVar, currentBudget);
            } else {
                return { code: `    float ${outVar} = 9999.0;\n`, outVar };
            }
        }
        
        switch (node.type) {
            case 'sphere': {
                const r = node.params.radius ?? 1.0;
                let centerStr = '';
                if (node.params.center) {
                    const c = node.params.center;
                    centerStr = ` - vec3(${c[0].toFixed(5)}, ${c[1].toFixed(5)}, ${c[2].toFixed(5)})`;
                }
                code += `    float ${outVar} = sdSphere(${pVar}${centerStr}, ${r.toFixed(5)});\n`;
                break;
            }
            case 'box': {
                let sizeStr = 'vec3(1.0, 1.0, 1.0)';
                if (node.params.size) {
                    const s = node.params.size;
                    sizeStr = `vec3(${s[0].toFixed(5)}, ${s[1].toFixed(5)}, ${s[2].toFixed(5)})`;
                }
                code += `    float ${outVar} = sdBox(${pVar}, ${sizeStr});\n`;
                break;
            }
            case 'plane': {
                let nStr = 'vec3(0.0, 1.0, 0.0)';
                if (node.params.normal) {
                    const n = node.params.normal;
                    nStr = `vec3(${n[0].toFixed(5)}, ${n[1].toFixed(5)}, ${n[2].toFixed(5)})`;
                }
                const h = node.params.offset ?? 0.0;
                code += `    float ${outVar} = sdPlane(${pVar}, ${nStr}, ${h.toFixed(5)});\n`;
                break;
            }
            case 'translate': {
                const offset = node.params.offset || [0,0,0];
                const offStr = `vec3(${offset[0].toFixed(5)}, ${offset[1].toFixed(5)}, ${offset[2].toFixed(5)})`;
                const newP = `p${varCount++}`;
                code += `    vec3 ${newP} = ${pVar} - ${offStr};\n`;
                if (node.children.length > 0) {
                    const childOut = compileNode(node.children[0], newP, currentBudget);
                    code += childOut.code;
                    code += `    float ${outVar} = ${childOut.outVar};\n`;
                } else {
                    code += `    float ${outVar} = 9999.0;\n`;
                }
                break;
            }
            case 'scale': {
                const factor = node.params.factor ?? 1.0;
                const newP = `p${varCount++}`;
                code += `    vec3 ${newP} = ${pVar} / ${factor.toFixed(5)};\n`;
                if (node.children.length > 0) {
                    const childOut = compileNode(node.children[0], newP, currentBudget);
                    code += childOut.code;
                    code += `    float ${outVar} = ${childOut.outVar} * ${factor.toFixed(5)};\n`;
                } else {
                    code += `    float ${outVar} = 9999.0;\n`;
                }
                break;
            }
            case 'rotate': {
                const axis = node.params.axis || [0,1,0];
                const angle = node.params.angle || 0.0;
                const newP = `p${varCount++}`;
                code += `    vec3 ${newP} = ${pVar};\n`;
                code += `    {\n`;
                code += `        float a = ${angle.toFixed(5)};\n`;
                code += `        vec3 axis = normalize(vec3(${axis[0].toFixed(5)}, ${axis[1].toFixed(5)}, ${axis[2].toFixed(5)}));\n`;
                code += `        float s = sin(a); float c = cos(a); float oc = 1.0 - c;\n`;
                code += `        mat3 rot = mat3(\n`;
                code += `            oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,\n`;
                code += `            oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,\n`;
                code += `            oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c\n`;
                code += `        );\n`;
                // Inverse rotation for point
                code += `        ${newP} = rot * ${pVar};\n`; 
                code += `    }\n`;
                if (node.children.length > 0) {
                    const childOut = compileNode(node.children[0], newP, currentBudget);
                    code += childOut.code;
                    code += `    float ${outVar} = ${childOut.outVar};\n`;
                } else {
                    code += `    float ${outVar} = 9999.0;\n`;
                }
                break;
            }
            case 'union':
            case 'subtract':
            case 'intersect':
            case 'smooth-union': {
                if (node.children.length === 0) {
                    code += `    float ${outVar} = 9999.0;\n`;
                    break;
                }
                let currentOut = '';
                for (let i = 0; i < node.children.length; i++) {
                    const childOut = compileNode(node.children[i], pVar, currentBudget);
                    code += childOut.code;
                    if (i === 0) {
                        currentOut = childOut.outVar;
                    } else {
                        const newD = `d${varCount++}`;
                        if (node.type === 'union') {
                            code += `    float ${newD} = opUnion(${currentOut}, ${childOut.outVar});\n`;
                        } else if (node.type === 'subtract') {
                            // Note: order matters for subtract. Usually it's d1 - d2 where d2 is subtracted from d1.
                            // However opSubtract(d1,d2) is max(-d1, d2). That subtracts d1 FROM d2.
                            // Let's ensure standard behavior: subtract children[1..] from children[0]
                            code += `    float ${newD} = opSubtract(${childOut.outVar}, ${currentOut});\n`;
                        } else if (node.type === 'intersect') {
                            code += `    float ${newD} = opIntersect(${currentOut}, ${childOut.outVar});\n`;
                        } else if (node.type === 'smooth-union') {
                            const k = node.params.k ?? 0.1;
                            code += `    float ${newD} = opSmoothUnion(${currentOut}, ${childOut.outVar}, ${k.toFixed(5)});\n`;
                        }
                        currentOut = newD;
                    }
                }
                code += `    float ${outVar} = ${currentOut};\n`;
                break;
            }
            case 'material': {
                if (node.children.length > 0) {
                    const childOut = compileNode(node.children[0], pVar, currentBudget);
                    code += childOut.code;
                    code += `    float ${outVar} = ${childOut.outVar};\n`;
                } else {
                    code += `    float ${outVar} = 9999.0;\n`;
                }
                break;
            }
            case 'repeat': {
                const count = node.params.count ?? 1;
                const axis = node.params.axis || [1, 0, 0];
                const spacing = node.params.spacing ?? 1.0;
                
                const newP = `p${varCount++}`;
                const axStr = `vec3(${axis[0].toFixed(5)}, ${axis[1].toFixed(5)}, ${axis[2].toFixed(5)})`;
                const maxIndex = count - 1;
                
                code += `    vec3 ${newP} = ${pVar};\n`;
                code += `    {\n`;
                code += `        vec3 ax = normalize(${axStr});\n`;
                code += `        float proj = dot(${newP}, ax);\n`;
                code += `        float cellIndex = round(proj / ${spacing.toFixed(5)});\n`;
                code += `        cellIndex = clamp(cellIndex, 0.0, ${maxIndex.toFixed(5)});\n`;
                code += `        ${newP} = ${newP} - ax * (cellIndex * ${spacing.toFixed(5)});\n`;
                code += `    }\n`;
                
                if (node.children.length > 0) {
                    const childOut = compileNode(node.children[0], newP, currentBudget);
                    code += childOut.code;
                    code += `    float ${outVar} = ${childOut.outVar};\n`;
                } else {
                    code += `    float ${outVar} = 9999.0;\n`;
                }
                break;
            }
            case 'mirror': {
                const axis = node.params.axis || [1, 0, 0];
                const newP = `p${varCount++}`;
                const axStr = `vec3(${axis[0].toFixed(5)}, ${axis[1].toFixed(5)}, ${axis[2].toFixed(5)})`;
                
                code += `    vec3 ${newP} = ${pVar};\n`;
                code += `    {\n`;
                code += `        vec3 ax = normalize(${axStr});\n`;
                code += `        float d = dot(${newP}, ax);\n`;
                code += `        if (d < 0.0) ${newP} -= 2.0 * d * ax;\n`;
                code += `    }\n`;
                
                if (node.children.length > 0) {
                    const childOut = compileNode(node.children[0], newP, currentBudget);
                    code += childOut.code;
                    code += `    float ${outVar} = ${childOut.outVar};\n`;
                } else {
                    code += `    float ${outVar} = 9999.0;\n`;
                }
                break;
            }
            case 'radialRepeat':
            case 'radial-repeat': {
                const count = node.params.count ?? 1;
                const axis = node.params.axis || [0, 1, 0];
                
                const newP = `p${varCount++}`;
                const axStr = `vec3(${axis[0].toFixed(5)}, ${axis[1].toFixed(5)}, ${axis[2].toFixed(5)})`;
                
                code += `    vec3 ${newP} = ${pVar};\n`;
                code += `    {\n`;
                code += `        vec3 ax = normalize(${axStr});\n`;
                code += `        vec3 up = abs(ax.y) < 0.999 ? vec3(0,1,0) : vec3(1,0,0);\n`;
                code += `        vec3 right = normalize(cross(up, ax));\n`;
                code += `        vec3 fwd = cross(ax, right);\n`;
                code += `        \n`;
                code += `        float pRight = dot(${newP}, right);\n`;
                code += `        float pFwd = dot(${newP}, fwd);\n`;
                code += `        float pAx = dot(${newP}, ax);\n`;
                code += `        \n`;
                code += `        float r = length(vec2(pRight, pFwd));\n`;
                code += `        float phi = atan(pRight, pFwd);\n`; // Note: using (y, x) -> (pRight, pFwd) for atan, angle from fwd
                code += `        \n`;
                code += `        float sector = 6.28318530718 / float(${count});\n`;
                code += `        float halfSector = sector / 2.0;\n`;
                code += `        phi = mod(phi + halfSector, sector) - halfSector;\n`;
                code += `        \n`;
                code += `        pRight = r * sin(phi);\n`;
                code += `        pFwd = r * cos(phi);\n`;
                code += `        \n`;
                code += `        ${newP} = right * pRight + fwd * pFwd + ax * pAx;\n`;
                code += `    }\n`;
                
                if (node.children.length > 0) {
                    const childOut = compileNode(node.children[0], newP, currentBudget);
                    code += childOut.code;
                    code += `    float ${outVar} = ${childOut.outVar};\n`;
                } else {
                    code += `    float ${outVar} = 9999.0;\n`;
                }
                break;
            }
            default:
                code += `    float ${outVar} = 9999.0;\n`;
        }
        
        return { code, outVar };
    }

    if (geometryRoot) {
        const rootOut = compileNode(geometryRoot, 'p', budget);
        mapFunctionBody = rootOut.code + `    return ${rootOut.outVar};`;
    } else {
        mapFunctionBody = `    return 9999.0;`;
    }
    
    glsl.push(`
float map(vec3 p) {
${mapFunctionBody}
}

vec3 calcNormal(vec3 p) {
    vec2 e = vec2(1.0, -1.0) * 0.5773 * 0.0005;
    return normalize(e.xyy*map(p + e.xyy) + 
                     e.yyx*map(p + e.yyx) + 
                     e.yxy*map(p + e.yxy) + 
                     e.xxx*map(p + e.xxx));
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    
    vec3 ro = vec3(${cameraPos[0].toFixed(5)}, ${cameraPos[1].toFixed(5)}, ${cameraPos[2].toFixed(5)});
    vec3 ta = vec3(0.0, 0.0, 0.0);
    vec3 cw = normalize(ta - ro);
    vec3 up = vec3(0.0, 1.0, 0.0);
    vec3 cu = normalize(cross(cw, up));
    vec3 cv = normalize(cross(cu, cw));
    
    float fov = ${(cameraFov).toFixed(5)};
    vec3 rd = normalize(uv.x * cu + uv.y * cv + cw * (1.0 / tan(fov * 0.5 * 3.14159 / 180.0)));
    
    float t = 0.0;
    float max_t = 100.0;
    for(int i=0; i<100; i++) {
        vec3 p = ro + rd * t;
        float d = map(p);
        if(d < 0.001) break;
        t += d;
        if(t > max_t) break;
    }
    
    if(t < max_t) {
        vec3 p = ro + rd * t;
        vec3 n = calcNormal(p);
        vec3 lightDir = normalize(vec3(1.0, 2.0, 1.0));
        float diff = max(dot(n, lightDir), 0.0);
        float amb = 0.2;
        vec3 baseColor = vec3(1.0);
        vec3 color = baseColor * (diff + amb);
        fragColor = vec4(color, 1.0);
    } else {
        fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
}
    `.trim());

    return glsl.join('\n\n');
}
