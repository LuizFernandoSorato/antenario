import './style.css';
import { antennas } from './antennas';
import { mountAntennaPage } from './ui/antenna-page';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Elemento #app não encontrado.');

app.innerHTML = `
  <header>
    <h1>Antenário</h1>
    <p>Projete, calcule e construa antenas.</p>
    <nav aria-label="Antenas">
      <label>
        Antena
        <select id="antenna">
          ${antennas.map((a) => `<option value="${a.meta.id}">${a.meta.name}</option>`).join('')}
        </select>
      </label>
    </nav>
  </header>
  <main id="page"></main>
`;

const select = app.querySelector<HTMLSelectElement>('#antenna')!;
const page = app.querySelector<HTMLElement>('#page')!;

function show(id: string): void {
  const antenna = antennas.find((a) => a.meta.id === id) ?? antennas[0]!;
  select.value = antenna.meta.id;
  mountAntennaPage(page, antenna);
}

select.addEventListener('change', () => {
  history.replaceState(null, '', `#${select.value}`);
  show(select.value);
});

show(location.hash.slice(1));
