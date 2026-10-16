/**
 * Página da Carta de Smith interativa: o usuário digita Z = R + jX (ou clica na carta), e a página
 * mostra Γ, ROE, perdas e o ponto depois de deslocar a referência em direção ao gerador.
 * A matemática está em core/smith.ts e core/reflection.ts; aqui só há desenho e formulário.
 */

import { type Complex, abs, arg, complex, radToDeg } from '../core/complex';
import {
  mismatchLossDb,
  reflectedPowerFraction,
  reflectionCoefficient,
  returnLossDb,
  swrFromGamma,
} from '../core/reflection';
import { impedanceFromGamma, normalize, reactanceCircle, resistanceCircle, rotateTowardGenerator } from '../core/smith';
import { formatNumber, parseDecimal } from '../core/units';
import { escapeHtml, renderError } from './render';

const R_CIRCLES = [0.2, 0.5, 1, 2, 5] as const;
const X_CIRCLES = [0.2, 0.5, 1, 2, 5] as const;
const CLIP_ID = 'smith-clip';

function grid(): string {
  const parts: string[] = [`<circle class="sm-rim" cx="0" cy="0" r="1" />`, `<line class="sm-axis" x1="-1" y1="0" x2="1" y2="0" />`];
  const inside: string[] = [];
  for (const r of R_CIRCLES) {
    const c = resistanceCircle(r);
    inside.push(`<circle class="sm-grid" cx="${c.cx}" cy="0" r="${c.r}" />`);
  }
  for (const x of X_CIRCLES) {
    for (const sign of [1, -1]) {
      const c = reactanceCircle(sign * x);
      // O eixo imaginário da tela cresce para baixo; por isso cy é invertido.
      inside.push(`<circle class="sm-grid" cx="${c.cx}" cy="${-c.cy}" r="${c.r}" />`);
    }
  }
  parts.push(`<g clip-path="url(#${CLIP_ID})">${inside.join('')}</g>`);
  // Rótulos de resistência no eixo real.
  for (const r of R_CIRCLES) {
    const c = resistanceCircle(r);
    parts.push(`<text class="sm-label" x="${c.cx - c.r + 0.02}" y="0.07">${formatNumber(r, 1)}</text>`);
  }
  return parts.join('');
}

function svg(): string {
  return `<svg class="smith" viewBox="-1.1 -1.1 2.2 2.2" role="img" aria-label="Carta de Smith interativa">
    <defs><clipPath id="${CLIP_ID}"><circle cx="0" cy="0" r="1" /></clipPath></defs>
    ${grid()}
    <g id="smith-dynamic"></g>
  </svg>`;
}

function point(re: number, im: number, cls: string): string {
  return `<circle class="${cls}" cx="${re}" cy="${-im}" r="0.025" />`;
}

function row(label: string, value: string): string {
  return `<tr><td>${escapeHtml(label)}</td><td class="value">${escapeHtml(value)}</td></tr>`;
}

function impedanceText(re: number, im: number): string {
  const sign = im < 0 ? '−' : '+';
  return `${formatNumber(re, 2)} ${sign} j${formatNumber(Math.abs(im), 2)} Ω`;
}

export function mountSmithPage(container: HTMLElement): void {
  container.innerHTML = `
    <section class="card">
      <h2>Carta de Smith</h2>
      <p>Mostra uma impedância na carta e o que ela significa para o casamento: ROE, perda de retorno e perda por
      descasamento. Digite R e X, ou <strong>clique na carta</strong>. O ponto da carga é o azul; o círculo tracejado é o
      da ROE, e o ponto laranja é onde a carga aparece depois de um trecho de linha sem perdas.</p>
      <form class="params" novalidate>
        <label><span>Resistência R (Ω)</span><input name="r" type="text" inputmode="decimal" autocomplete="off" value="100" /></label>
        <label><span>Reatância X (Ω)</span><input name="x" type="text" inputmode="decimal" autocomplete="off" value="50"
          /><small>Positiva = indutiva, negativa = capacitiva.</small></label>
        <label><span>Z0 da linha (Ω)</span><input name="z0" type="text" inputmode="decimal" autocomplete="off" value="50" /></label>
        <label><span>Comprimento elétrico até o gerador (°)</span><input name="theta" type="text" inputmode="decimal"
          autocomplete="off" value="45" /><small>90° = 1/4 de onda no cabo (use o fator de velocidade para o comprimento físico). 180° = volta inteira.</small></label>
      </form>
      <div class="smith-wrap">${svg()}</div>
      <div class="result" aria-live="polite"></div>
    </section>`;

  const form = container.querySelector<HTMLFormElement>('form')!;
  const output = container.querySelector<HTMLDivElement>('.result')!;
  const dynamic = container.querySelector<SVGGElement>('#smith-dynamic')!;
  const chart = container.querySelector<SVGSVGElement>('svg.smith')!;

  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement;

  function update(): void {
    const values: Record<string, number> = {};
    for (const name of ['r', 'x', 'z0', 'theta']) {
      const el = field(name);
      const v = parseDecimal(el.value);
      el.setAttribute('aria-invalid', String(Number.isNaN(v)));
      if (Number.isNaN(v)) {
        dynamic.innerHTML = '';
        output.innerHTML = `<div class="alert alert-warning">Valor inválido em "${escapeHtml(name.toUpperCase())}".</div>`;
        return;
      }
      values[name] = v;
    }
    try {
      const z = complex(values['r']!, values['x']!);
      const z0 = values['z0']!;
      const gamma = reflectionCoefficient(z, z0);
      const g = abs(gamma);
      const swr = swrFromGamma(g);
      const rotated = rotateTowardGenerator(gamma, values['theta']!);
      let zRot: Complex | null = null;
      try {
        zRot = impedanceFromGamma(rotated, z0);
      } catch {
        zRot = null; // Γ = 1 após a rotação: circuito aberto, impedância infinita.
      }
      const zn = normalize(z, z0);
      dynamic.innerHTML =
        `<circle class="sm-swr" cx="0" cy="0" r="${g}" />` +
        `<line class="sm-trail" x1="${gamma.re}" y1="${-gamma.im}" x2="${rotated.re}" y2="${-rotated.im}" />` +
        point(gamma.re, gamma.im, 'sm-load') +
        point(rotated.re, rotated.im, 'sm-rot');
      output.innerHTML = `
        <h3>Carga</h3>
        <table class="measures"><tbody>
          ${row('Impedância normalizada z = Z/Z0', `${formatNumber(zn.re, 3)} ${zn.im < 0 ? '−' : '+'} j${formatNumber(Math.abs(zn.im), 3)}`)}
          ${row('|Γ|', formatNumber(g, 3))}
          ${row('Fase de Γ', `${formatNumber(radToDeg(arg(gamma)), 1)}°`)}
          ${row('ROE', Number.isFinite(swr) ? `${formatNumber(swr, 2)}:1` : '∞')}
          ${row('Perda de retorno', g === 0 ? '∞ dB' : `${formatNumber(returnLossDb(g), 2)} dB`)}
          ${row('Perda por descasamento', g >= 1 ? '∞ dB' : `${formatNumber(mismatchLossDb(g), 3)} dB`)}
          ${row('Potência refletida', `${formatNumber(reflectedPowerFraction(g) * 100, 1)} %`)}
        </tbody></table>
        <h3>Depois de ${formatNumber(values['theta']!, 1)}° de linha</h3>
        <table class="measures"><tbody>
          ${row('Impedância vista', zRot ? impedanceText(zRot.re, zRot.im) : '∞ (circuito aberto)')}
          ${row('Fase de Γ', `${formatNumber(radToDeg(arg(rotated)), 1)}°`)}
        </tbody></table>
        <p class="note">Numa linha sem perdas a ROE não muda ao percorrer o cabo: o ponto só gira em torno do centro, em sentido
        horário rumo ao gerador. Cabos reais têm perda, então a ROE vista no rádio é um pouco menor que a da antena. Veja a
        ferramenta de perdas no cabo.</p>`;
    } catch (err) {
      dynamic.innerHTML = '';
      output.innerHTML = renderError(err);
    }
  }

  // Clique na carta: converte o ponto em Γ e depois em Z, e preenche R e X.
  chart.addEventListener('click', (e) => {
    const box = chart.getBoundingClientRect();
    const gx = ((e.clientX - box.left) / box.width) * 2.2 - 1.1;
    const gy = -(((e.clientY - box.top) / box.height) * 2.2 - 1.1);
    if (Math.hypot(gx, gy) > 0.999) return;
    const z0 = parseDecimal(field('z0').value);
    if (!(z0 > 0)) return;
    const z = impedanceFromGamma(complex(gx, gy), z0);
    field('r').value = formatNumber(Math.max(0, z.re), 2, false);
    field('x').value = formatNumber(z.im, 2, false);
    update();
  });

  form.addEventListener('input', update);
  form.addEventListener('submit', (e) => e.preventDefault());
  update();
}
