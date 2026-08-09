import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

/** Создаёт React-корень. Вызывается из ./mount. */
export function render(): void {
  const container = document.getElementById('root');

  if (!container) {
    throw new Error('mf-main: #root не найден в разметке страницы');
  }

  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
