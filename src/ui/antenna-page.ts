/**
 * Página genérica de uma antena: formulário montado a partir de `meta.params`
 * e resultado com cotas, premissas, valores esperados e avisos.
 */

import type { AntennaModule } from '../antennas';
import type { CalcResult, Estimate } from '../antennas/types';
import {
  formatLength,
  formatNumber,
  lengthResolutionForFrequency,
  parseDecimal,
  trimZeros,
} from '../core/units';

const WARNING_TITLES = { info: 'Nota', warning: 'Atenção', danger: 'Perigo' } as const;

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Casas decimais do valor padrão, para exibir o campo sem perder precisão. */
function decimalsOf(value: number): number {
  const s = String(value);
  const dot = s.indexOf('.');
  return dot < 0 ? 0 : s.length - dot - 1;
}

function formatEstimate(e: Estimate): string {
  const parts: string[] = [];
  if (e.typical !== undefined) parts.push(`≈ ${trimZeros(formatNumber(e.typical, 2))} ${e.unit}`);
  if (e.min !== undefined && e.max !== undefined) {
    parts.push(`${trimZeros(formatNumber(e.min, 2))}–${trimZeros(formatNumber(e.max, 2))} ${e.unit}`);
  } else if (e.max !== undefined) {
    parts.push(`até ${trimZeros(formatNumber(e.max, 2))} ${e.unit}`);
  } else if (e.min !== undefined) {
    parts.push(`a partir de ${trimZeros(formatNumber(e.min, 2))} ${e.unit}`);
  }
  return `
    <strong>${escapeHtml(parts.join(' · ') || '—')}</strong>
    <p>${escapeHtml(e.note)}</p>
    <p class="source">Fonte: ${escapeHtml(e.source)}</p>`;
}

function renderResult(result: CalcResult, fMHz: number): string {
  const res = lengthResolutionForFrequency(fMHz);
  const { impedance, gain, bandwidth } = result.expected;
  return `
    ${result.warnings
      .map(
        (w) => `<div class="alert alert-${w.level}" role="note">
          <strong>${WARNING_TITLES[w.level]}:</strong> ${escapeHtml(w.message)}</div>`,
      )
      .join('')}

    <h3>Medidas</h3>
    <table class="measures">
      <thead><tr><th>Cota</th><th>Elemento</th><th>Medida</th></tr></thead>
      <tbody>
        ${result.measurements
          .map(
            (m) => `<tr>
              <td class="label">${escapeHtml(m.label)}</td>
              <td>${escapeHtml(m.name)}<small>${escapeHtml(m.description)}</small></td>
              <td class="value">${formatLength(m.meters, res)}</td>
            </tr>`,
          )
          .join('')}
      </tbody>
    </table>

    <h3>Premissas do cálculo</h3>
    <dl class="assumptions">
      ${result.assumptions
        .map(
          (a) => `<dt>${escapeHtml(a.name)}</dt>
            <dd>${escapeHtml(a.value)}${a.source ? `<small>${escapeHtml(a.source)}</small>` : ''}</dd>`,
        )
        .join('')}
    </dl>
    <p class="note">A antena real sempre precisa de ajuste. Corte comprido e encurte medindo a ROE.</p>

    <h3>Valores esperados</h3>
    <div class="estimates">
      <div><h4>Impedância</h4>${formatEstimate(impedance)}</div>
      <div><h4>Ganho</h4>${formatEstimate(gain)}</div>
      <div><h4>Largura de banda</h4>${
        bandwidth
          ? formatEstimate(bandwidth)
          : '<strong>Não estimada</strong><p>Ainda não há um modelo com fonte confiável para esta antena. Meça com NanoVNA ou medidor de ROE.</p>'
      }</div>
    </div>`;
}

export function mountAntennaPage(container: HTMLElement, antenna: AntennaModule): void {
  const { meta } = antenna;
  const usage = [meta.usage.rx && 'RX', meta.usage.tx && 'TX'].filter(Boolean).join(' / ');

  container.innerHTML = `
    <section class="card">
      <h2>${escapeHtml(meta.name)}</h2>
      <p>${escapeHtml(meta.description)}</p>
      <p class="tags">
        <span>${usage}</span>
        <span>${escapeHtml(meta.polarization)}</span>
        <span>≈ ${meta.nominalImpedanceOhms} Ω</span>
      </p>
      <form class="params" novalidate>
        ${meta.params
          .map(
            (p) => `<label>
              <span>${escapeHtml(p.label)}${p.unit ? ` (${escapeHtml(p.unit)})` : ''}</span>
              <input name="${p.key}" type="text" inputmode="decimal" autocomplete="off"
                value="${formatNumber(p.defaultValue, decimalsOf(p.defaultValue), false)}" />
              ${p.help ? `<small>${escapeHtml(p.help)}</small>` : ''}
            </label>`,
          )
          .join('')}
      </form>
      <div class="result" aria-live="polite"></div>
    </section>`;

  const form = container.querySelector<HTMLFormElement>('form')!;
  const output = container.querySelector<HTMLDivElement>('.result')!;

  function update(): void {
    const params: Record<string, number> = {};
    for (const p of meta.params) {
      const input = form.elements.namedItem(p.key) as HTMLInputElement;
      const value = parseDecimal(input.value);
      input.setAttribute('aria-invalid', String(Number.isNaN(value)));
      if (Number.isNaN(value)) {
        output.innerHTML = `<div class="alert alert-warning">Valor inválido em "${escapeHtml(p.label)}".</div>`;
        return;
      }
      params[p.key] = value * p.toSi;
    }
    try {
      const result = antenna.calc(params);
      output.innerHTML = renderResult(result, params['frequencyMHz']!);
    } catch (err) {
      const message = err instanceof RangeError ? err.message : 'Erro inesperado no cálculo.';
      output.innerHTML = `<div class="alert alert-warning">${escapeHtml(message)}</div>`;
      if (!(err instanceof RangeError)) console.error(err);
    }
  }

  form.addEventListener('input', update);
  form.addEventListener('submit', (e) => e.preventDefault());
  update();
}
