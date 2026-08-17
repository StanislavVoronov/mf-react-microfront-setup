import { StrictMode, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';

export function render(App: ComponentType): void {
  const container = document.getElementById('root');

  if (!container) {
    throw new Error('mf-host: #root не найден в разметке страницы');
  }

  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
