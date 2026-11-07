import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import App from './App';
import { I18nProvider } from './i18n';

// 确保 root 与 body 继承主题背景，避免浏览器默认白底
const root = document.getElementById('root')!;
root.style.minHeight = '100vh';
root.style.background = 'var(--background)';

createRoot(root).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
);
