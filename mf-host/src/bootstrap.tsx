import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('mf-host: #root не найден в index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
