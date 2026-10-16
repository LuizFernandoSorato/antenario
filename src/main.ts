import './style.css';
import { antennas } from './antennas';
import { mountAntennaPage } from './ui/antenna-page';
import { mountSmithPage } from './ui/smith-page';
import { mountToolPage } from './ui/tool-page';
import { tools } from './ui/tools';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Elemento #app não encontrado.');

app.innerHTML = `
  <header class="no-print">
    <h1>Antenário</h1>
    <p>Projete, calcule e construa antenas.</p>
    <nav aria-label="Páginas">
      <label>
        Página
        <select id="page-select">
          <optgroup label="Antenas">
            ${antennas.map((a) => `<option value="${a.meta.id}">${a.meta.name}</option>`).join('')}
          </optgroup>
          <optgroup label="Cabos, casamento e segurança">
            ${tools.map((t) => `<option value="${t.id}">${t.name}</option>`).join('')}
            <option value="smith">Carta de Smith</option>
          </optgroup>
        </select>
      </label>
    </nav>
  </header>
  <main id="page"></main>
`;

const select = app.querySelector<HTMLSelectElement>('#page-select')!;
const page = app.querySelector<HTMLElement>('#page')!;

function show(id: string): void {
  if (id === 'smith') {
    select.value = id;
    mountSmithPage(page);
    return;
  }
  const tool = tools.find((t) => t.id === id);
  if (tool) {
    select.value = tool.id;
    mountToolPage(page, tool);
    return;
  }
  const antenna = antennas.find((a) => a.meta.id === id) ?? antennas[0]!;
  select.value = antenna.meta.id;
  mountAntennaPage(page, antenna);
}

select.addEventListener('change', () => {
  history.replaceState(null, '', `#${select.value}`);
  show(select.value);
});

show(location.hash.slice(1));

// Offline: o service worker (gerado no build por tools/sw-plugin.ts) guarda o app em cache.
// Só em produção: no `npm run dev` ele atrapalharia o recarregamento automático.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('sw.js', document.baseURI)).catch((err: unknown) => {
      console.warn('Não foi possível ativar o modo offline:', err);
    });
  });
}
