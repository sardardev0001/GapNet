import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);

if ((window as Window & { gapnetDesktop?: { isDesktop: boolean } }).gapnetDesktop?.isDesktop) {
  document.body.classList.add('desktop');
}
