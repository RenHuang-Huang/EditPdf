import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './ErrorBoundary'

console.log('main.tsx executing...');

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

try {
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )
  console.log('React render called');
} catch (e) {
  console.error('Render failed', e);
}
