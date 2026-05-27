import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { cssVariables } from './theme/tokens';
import './index.css';
import App from './App.tsx';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

// 注入设计令牌作为CSS变量（单一事实来源）
const style = document.createElement('style');
style.id = 'design-tokens';
style.textContent = cssVariables;
document.head.prepend(style);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
