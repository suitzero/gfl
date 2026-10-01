import { describe, it, expect } from 'vitest';
import { mse, mae, type ImageDataLike } from './errorMetric';

describe('errorMetric', () => {
  it('should compute 0 MSE and MAE for identical images', () => {
    const target: ImageDataLike = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]),
    };
    const render: ImageDataLike = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]),
    };

    expect(mse(target, render)).toBe(0);
    expect(mae(target, render)).toBe(0);
  });

  it('should correctly compute MSE and MAE for known differences', () => {
    const target: ImageDataLike = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([100, 100, 100, 255, 50, 50, 50, 255]),
    };
    const render: ImageDataLike = {
      width: 2,
      height: 1,
      // Pixel 1: diffs are [10, 20, 30, 0] -> sq = [100, 400, 900, 0], sum_sq = 1400, abs = [10, 20, 30, 0], sum_abs = 60
      // Pixel 2: diffs are [5, 10, 15, 0] -> sq = [25, 100, 225, 0], sum_sq = 350, abs = [5, 10, 15, 0], sum_abs = 30
      // Total sum_sq = 1750, count = 8, MSE = 1750 / 8 = 218.75
      // Total sum_abs = 90, count = 8, MAE = 90 / 8 = 11.25
      data: new Uint8ClampedArray([90, 80, 70, 255, 45, 40, 35, 255]),
    };

    expect(mse(target, render)).toBeCloseTo(218.75);
    expect(mae(target, render)).toBeCloseTo(11.25);
  });

  it('should throw an error when dimensions do not match', () => {
    const target: ImageDataLike = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]),
    };
    const render: ImageDataLike = {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([255, 0, 0, 255]),
    };

    expect(() => mse(target, render)).toThrowError(/Dimension mismatch/);
    expect(() => mae(target, render)).toThrowError(/Dimension mismatch/);
  });

  it('should throw an error when data lengths do not match', () => {
    const target: ImageDataLike = {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([255, 0, 0, 255]),
    };
    const render: ImageDataLike = {
      width: 1, // Same dimensions claimed
      height: 1,
      data: new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 0, 0]), // But wrong data length
    };

    expect(() => mse(target, render)).toThrowError(/Data length mismatch/);
    expect(() => mae(target, render)).toThrowError(/Data length mismatch/);
  });
});
