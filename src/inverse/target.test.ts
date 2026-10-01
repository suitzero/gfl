import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mountTargetRegion } from './target';

describe('Target Image Module', () => {
  let container: HTMLDivElement;
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(container);

    // Mock URL.createObjectURL and URL.revokeObjectURL
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('should mount a file input and a canvas into the container', () => {
    const { fileInput, canvas } = mountTargetRegion(container);

    expect(fileInput.tagName).toBe('INPUT');
    expect(fileInput.type).toBe('file');
    expect(fileInput.accept).toContain('image/png');
    expect(fileInput.accept).toContain('image/jpeg');

    expect(canvas.tagName).toBe('CANVAS');
    expect(canvas.width).toBe(512);
    expect(canvas.height).toBe(512);

    expect(container.contains(fileInput)).toBe(true);
    expect(container.contains(canvas)).toBe(true);
  });

  it('should attempt to load an image when a file is selected', () => {
    const { fileInput } = mountTargetRegion(container);
    
    // Create a mock file
    const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
    
    // Use Object.defineProperty to mock the files property on the input element
    Object.defineProperty(fileInput, 'files', {
      value: [file]
    });

    // Trigger change event
    const event = new Event('change');
    fileInput.dispatchEvent(event);

    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    // Note: since Image loading is asynchronous, we can't easily test onload execution
    // without mocking Image, but we can verify the URL creation happens.
  });
});
