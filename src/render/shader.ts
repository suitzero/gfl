import { hardcodedSdfGLSL } from './sdf';

export function getVertexShaderSource(): string {
  return `#version 300 es
    in vec2 a_position;
    out vec2 v_uv;
    void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;
}

export function getFragmentShaderSource(): string {
  return `#version 300 es
    precision highp float;
    
    in vec2 v_uv;
    out vec4 outColor;
    
    uniform vec2 u_resolution;
    uniform vec3 u_cameraPos;
    uniform vec3 u_cameraDir;
    uniform vec3 u_cameraUp;
    uniform vec3 u_lightDir;
    uniform vec3 u_lightColor;
    
    // Configurable parameters
    const int MAX_STEPS = 100;
    const float MAX_DIST = 100.0;
    const float SURF_DIST = 0.001;
    
    ${hardcodedSdfGLSL}
    
    vec3 getNormal(vec3 p) {
        float d = map(p);
        vec2 e = vec2(0.001, 0.0);
        vec3 n = d - vec3(
            map(p - e.xyy),
            map(p - e.yxy),
            map(p - e.yyx)
        );
        return normalize(n);
    }
    
    float raymarch(vec3 ro, vec3 rd) {
        float dO = 0.0;
        for(int i = 0; i < MAX_STEPS; i++) {
            vec3 p = ro + rd * dO;
            float dS = map(p);
            dO += dS;
            if(dO > MAX_DIST || dS < SURF_DIST) break;
        }
        return dO;
    }
    
    void main() {
        vec2 uv = (v_uv - 0.5) * 2.0;
        uv.x *= u_resolution.x / u_resolution.y;
        
        vec3 ro = u_cameraPos;
        
        // Setup camera basis
        vec3 w = normalize(u_cameraDir);
        vec3 u = normalize(cross(w, u_cameraUp));
        vec3 v = cross(u, w);
        
        // Ray direction
        vec3 rd = normalize(uv.x * u + uv.y * v + 1.5 * w);
        
        float d = raymarch(ro, rd);
        
        vec3 color = vec3(0.0);
        
        if(d < MAX_DIST) {
            vec3 p = ro + rd * d;
            vec3 n = getNormal(p);
            
            // Lighting
            vec3 l = normalize(u_lightDir);
            
            // Diffuse
            float dif = clamp(dot(n, l), 0.0, 1.0);
            
            // Specular (simple Phong)
            vec3 viewDir = normalize(ro - p);
            vec3 reflectDir = reflect(-l, n);
            float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
            
            // Shadows
            float dShadow = raymarch(p + n * SURF_DIST * 2.0, l);
            if(dShadow < MAX_DIST) {
                dif *= 0.1;
                spec = 0.0;
            }
            
            // Combine
            vec3 ambient = vec3(0.05);
            color = ambient + u_lightColor * (dif * vec3(0.8) + spec * vec3(0.5));
            
            // Gamma correction
            color = pow(color, vec3(1.0/2.2));
        } else {
            // Background color
            color = vec3(0.1, 0.1, 0.15);
        }
        
        outColor = vec4(color, 1.0);
    }
  `;
}
