export function mountTargetRegion(container: HTMLElement) {
  // Create wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'target-container';
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.gap = '1rem';
  wrapper.style.alignItems = 'center';
  wrapper.style.minHeight = '0'; // Allow wrapper to shrink

  // Create file input
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/png, image/jpeg';
  fileInput.id = 'target-upload';

  // Create canvas (assuming 512x512 resolution for now to match typical render regions)
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  canvas.style.border = '1px solid #666';
  canvas.style.maxWidth = '100%';
  canvas.style.maxHeight = '100%'; // Allow canvas to scale down vertically
  canvas.style.aspectRatio = '1 / 1';
  canvas.style.objectFit = 'contain';
  
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Fill with default background
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#888';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No Target Image', canvas.width / 2, canvas.height / 2);
  }

  // Handle file upload
  fileInput.addEventListener('change', (event) => {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const url = URL.createObjectURL(file);
      
      const img = new Image();
      img.onload = () => {
        if (ctx) {
          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          // Draw image to fill canvas (can adjust to fit or cover as needed)
          // To ensure budget -> representation complexity / error comparisons,
          // keeping it at the exact resolution is crucial.
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        // Clean up URL object
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        // Clean up URL object on error to prevent memory leaks
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
  });

  wrapper.appendChild(fileInput);
  wrapper.appendChild(canvas);
  container.appendChild(wrapper);

  // Return handles for testing if needed
  return { fileInput, canvas };
}
