import './style.css';
import { load } from './storage';
import { App } from './ui/app';

import { advance } from './engine/sim';
import { applyUrlParams, hasUrlParams } from './engine/debug';
import { save } from './storage';

const state = load(Date.now());

// URL-Parameter (?happy=4&hunger=2&sick=0&tired=80&sleep=1) anwenden und aus der Adresse entfernen
const params = new URLSearchParams(location.search);
let notice: string | null = null;
if (hasUrlParams(params)) {
  advance(state, Date.now());
  const changes = applyUrlParams(state, params);
  save(state);
  history.replaceState(null, '', location.pathname);
  if (changes.length) notice = `🔧 ${changes.join(' · ')}`;
}

const app = new App(document.getElementById('app')!, state);
if (notice) app.notice(notice);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
