import './style.css';
import { antennas } from './antennas';
import { mountHomePage } from './ui/home-page';
import { mountAntennaPage } from './ui/antenna-page';
import { mountSmithPage } from './ui/smith-page';
import { mountToolPage } from './ui/tool-page';
import { tools } from './ui/tools';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Elemento #app não encontrado.');

app.innerHTML = `
  <header class="no-print">
    <h1><a class="home-link" href="#">Antenário</a></h1>
    <p>Projete, calcule e construa antenas.</p>
  </header>
  <main id="page"></main>
`;

const page = app.querySelector<HTMLElement>('#page')!;

const BACK_LINK = '<p class="back no-print"><a href="#">← Início</a></p>';

/** Roteia pelo hash: vazio = início (cartões); "#id" = página da antena, ferramenta ou Carta de Smith. */
function show(id: string): void {
  if (id === 'smith') {
    mountSmithPage(page);
    page.insertAdjacentHTML('afterbegin', BACK_LINK);
    return;
  }
  const tool = tools.find((t) => t.id === id);
  if (tool) {
    mountToolPage(page, tool);
    page.insertAdjacentHTML('afterbegin', BACK_LINK);
    return;
  }
  const antenna = antennas.find((a) => a.meta.id === id);
  if (antenna) {
    mountAntennaPage(page, antenna);
    page.insertAdjacentHTML('afterbegin', BACK_LINK);
    return;
  }
  mountHomePage(page, antennas, tools);
}

function route(): void {
  show(decodeURIComponent(location.hash.slice(1)));
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();

// Offline: o service worker (gerado no build por tools/sw-plugin.ts) guarda o app em cache.
// Só em produção: no `npm run dev` ele atrapalharia o recarregamento automático.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('sw.js', document.baseURI)).catch((err: unknown) => {
      console.warn('Não foi possível ativar o modo offline:', err);
    });
  });
}
