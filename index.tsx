import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// PWA Service Worker Registration & Cache Refresh
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      registration.update();
      console.log('Service Worker updated');
    }).catch(err => {
      console.log('SW registration error:', err);
    });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
