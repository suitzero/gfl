/**
 * Defines a structural type for image data to decouple metrics from browser APIs like ImageData.
 */
export interface ImageDataLike {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array | number[];
}

/**
 * Validates that two image buffers have identical dimensions.
 * @throws {Error} if dimensions mismatch.
 */
function validateDimensions(target: ImageDataLike, render: ImageDataLike) {
  if (target.width !== render.width || target.height !== render.height) {
    throw new Error(`Dimension mismatch: target is ${target.width}x${target.height}, render is ${render.width}x${render.height}`);
  }
  if (target.data.length !== render.data.length) {
    throw new Error(`Data length mismatch: target has ${target.data.length} elements, render has ${render.data.length} elements`);
  }
}

/**
 * Computes the Mean Squared Error (MSE) between two images.
 * Assumes 4 channels (RGBA) per pixel and pixel values in [0, 255].
 * The result is averaged over all pixels and color channels.
 * 
 * @param target The reference image.
 * @param render The rendered image to evaluate.
 * @returns The MSE value (0 means identical).
 */
export function mse(target: ImageDataLike, render: ImageDataLike): number {
  validateDimensions(target, render);
  const n = target.data.length;
  if (n === 0) return 0;

  let sum = 0;
  for (let i = 0; i < n; i++) {
    const diff = target.data[i] - render.data[i];
    sum += diff * diff;
  }
  return sum / n;
}

/**
 * Computes the Mean Absolute Error (MAE) between two images.
 * Assumes 4 channels (RGBA) per pixel and pixel values in [0, 255].
 * The result is averaged over all pixels and color channels.
 * 
 * @param target The reference image.
 * @param render The rendered image to evaluate.
 * @returns The MAE value (0 means identical).
 */
export function mae(target: ImageDataLike, render: ImageDataLike): number {
  validateDimensions(target, render);
  const n = target.data.length;
  if (n === 0) return 0;

  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += Math.abs(target.data[i] - render.data[i]);
  }
  return sum / n;
}
