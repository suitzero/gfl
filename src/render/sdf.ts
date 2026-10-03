export const hardcodedSdfGLSL = `
float sdSphere(vec3 p, float s) {
    return length(p) - s;
}

float sdPlane(vec3 p, vec3 n, float h) {
    return dot(p, n) + h;
}

float map(vec3 p) {
    float sphere1 = sdSphere(p - vec3(-1.0, 1.0, 0.0), u_sphereRadius);
    float sphere2 = sdSphere(p - vec3(1.0, 1.0, 0.0), 1.0);
    float floorPlane = sdPlane(p, vec3(0.0, 1.0, 0.0), 0.0);
    
    return min(min(sphere1, sphere2), floorPlane);
}
`;
