import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ThemeProvider } from './components/theme-provider';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Ensure index.html has #root.');
}

createRoot(rootElement).render(
  React.createElement(
    React.StrictMode,
    null,
    React.createElement(ThemeProvider, { defaultTheme: 'system' }, React.createElement(App)),
  ),
);
