import './style.css';
import { formatLength, lengthResolutionForFrequency, parseDecimal, wavelength } from './core';

// Página provisória da Fase 1: calculadora de comprimento de onda no espaço livre.
// As páginas de cada antena entram junto com os módulos em src/antennas/.

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Elemento #app não encontrado.');

app.innerHTML = `
  <header>
    <h1>Antenário</h1>
    <p>Projete, calcule e construa antenas.</p>
  </header>
  <main>
    <section class="card">
      <h2>Comprimento de onda</h2>
      <label>
        Frequência (MHz)
        <input id="freq" type="text" inputmode="decimal" value="145" autocomplete="off" />
      </label>
      <dl id="result"></dl>
      <p class="note">
        Valores no espaço livre (fator = 1). O comprimento físico de uma antena real é
        menor por causa do fator de encurtamento, que depende do diâmetro do condutor.
      </p>
    </section>
  </main>
`;

const input = app.querySelector<HTMLInputElement>('#freq')!;
const result = app.querySelector<HTMLDListElement>('#result')!;

function render(): void {
  const f = parseDecimal(input.value);
  if (!Number.isFinite(f) || f <= 0) {
    result.innerHTML = '<dt>Erro</dt><dd>Digite uma frequência positiva, ex.: 145,5</dd>';
    return;
  }
  const res = lengthResolutionForFrequency(f);
  const lambda = wavelength(f);
  result.innerHTML = [
    ['λ', lambda],
    ['λ/2', lambda / 2],
    ['λ/4', lambda / 4],
  ]
    .map(([label, m]) => `<dt>${label}</dt><dd>${formatLength(m as number, res)}</dd>`)
    .join('');
}

input.addEventListener('input', render);
render();
