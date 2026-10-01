import { parseGFL, serializeGFL } from './parser';

export function renderASTInspector(code: string, container: HTMLElement): void {
  try {
    const ast = parseGFL(code);
    const jsonStr = serializeGFL(ast);
    const pre = document.createElement('pre');
    pre.textContent = jsonStr;
    container.appendChild(pre);
  } catch (e: any) {
    const errorPre = document.createElement('pre');
    errorPre.style.color = 'red';
    errorPre.textContent = `Parse Error: ${e.message}`;
    container.appendChild(errorPre);
  }
}

export function showASTDebugOverlay(code: string): void {
  const overlayId = 'gfl-ast-debug-overlay';
  let overlay = document.getElementById(overlayId);
  
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = overlayId;
    overlay.style.position = 'fixed';
    overlay.style.top = '10px';
    overlay.style.right = '10px';
    overlay.style.width = '400px';
    overlay.style.height = '80vh';
    overlay.style.overflowY = 'auto';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    overlay.style.color = '#00ff00';
    overlay.style.padding = '15px';
    overlay.style.zIndex = '9999';
    overlay.style.fontFamily = 'monospace';
    overlay.style.fontSize = '12px';
    overlay.style.borderRadius = '5px';
    overlay.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '10px';
    closeBtn.style.right = '10px';
    closeBtn.onclick = () => {
      overlay?.remove();
    };
    overlay.appendChild(closeBtn);
    
    // Content container
    const content = document.createElement('div');
    content.id = 'gfl-ast-debug-content';
    content.style.marginTop = '25px';
    overlay.appendChild(content);
    
    document.body.appendChild(overlay);
  }
  
  const contentContainer = document.getElementById('gfl-ast-debug-content');
  if (contentContainer) {
    contentContainer.innerHTML = '';
    renderASTInspector(code, contentContainer);
  }
}
