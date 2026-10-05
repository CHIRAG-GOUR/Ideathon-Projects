import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/manrope';
import '@fontsource-variable/jetbrains-mono';
import './index.css';
import { App } from './App';
import { compare, main, startClock } from './simulation/controller';
import { attachSound } from './services/sound';
import { settings } from './services/settings';
import { attachPersistence } from './services/sessions';

main.setSpeed(settings.get().speed);
compare.setSpeed(settings.get().speed);
attachSound(main);
attachSound(compare.left);
attachSound(compare.right);
attachPersistence(main);
startClock();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
