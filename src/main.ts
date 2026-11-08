import './style.css';
import { load } from './storage';
import { App } from './ui/app';

new App(document.getElementById('app')!, load(Date.now()));

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
