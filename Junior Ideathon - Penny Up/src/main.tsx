import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SavingsProvider } from './store/useSavingsStore';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SavingsProvider>
      <App />
    </SavingsProvider>
  </React.StrictMode>
);
