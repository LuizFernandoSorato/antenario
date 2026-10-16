/**
 * Página genérica de uma antena: formulário montado a partir de `meta.params`;
 * resultado com diagrama, cotas, folha de corte, premissas e valores esperados;
 * guia de construção em Markdown.
 */

import { marked } from 'marked';
import type { AntennaModule } from '../antennas';
import { DEFAULT_MARGIN_PERCENT, cutLength, totalMaterial } from '../antennas/cutlist';
import type { CalcResult, CutItem, Estimate } from '../antennas/types';
import {
  formatLength,
  formatNumber,
  lengthResolutionForFrequency,
  parseDecimal,
  trimZeros,
} from '../core/units';
import { decimalsOf, escapeHtml, renderAssumptions, renderError, renderWarnings } from './render';

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

/** Linhas da tabela de corte (as que mudam quando a sobra muda). */
function renderCutRows(items: readonly CutItem[], marginPercent: number, fMHz: number): string {
  const res = lengthResolutionForFrequency(fMHz);
  return items
    .map(
      (item) => `<tr>
        <td class="label">${escapeHtml(item.label)}</td>
        <td>${escapeHtml(item.name)}${item.note ? `<small>${escapeHtml(item.note)}</small>` : ''}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${formatLength(item.meters, res)}</td>
        <td class="num value">${formatLength(cutLength(item, marginPercent), res)}${item.adjustable ? '' : '<small>na medida</small>'}</td>
        <td class="check"><span aria-hidden="true">☐</span></td>
      </tr>`,
    )
    .join('');
}

function renderCutTotal(items: readonly CutItem[], marginPercent: number, fMHz: number): string {
  const res = lengthResolutionForFrequency(fMHz);
  return `Material total a cortar (somando todas as peças): <strong>${formatLength(totalMaterial(items, marginPercent), res)}</strong>.
    Some as perdas de corte e as pontas que ficam presas nas conexões.`;
}

function renderResult(
  result: CalcResult,
  antenna: AntennaModule,
  params: Record<string, number>,
  marginPercent: number,
): string {
  const fMHz = params['frequencyMHz']!;
  const res = lengthResolutionForFrequency(fMHz);
  const { impedance, gain, bandwidth } = result.expected;
  const cuts = antenna.cutList(params);
  return `
    <div class="print-only print-title">
      <h2>${escapeHtml(antenna.meta.name)}: folha de corte</h2>
      <p>Frequência de projeto: ${formatNumber(fMHz, 3)} MHz · gerada em ${new Date().toLocaleDateString('pt-BR')}</p>
    </div>

    <figure class="diagram-box">${antenna.diagram(params)}</figure>

    ${renderWarnings(result.warnings)}

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

    <section class="cut-sheet">
      <h3>Folha de corte</h3>
      <div class="cut-margin no-print">
        <label>
          <span>Sobra para ajuste nas peças ajustáveis (%)</span>
          <input id="cut-margin" type="text" inputmode="decimal" autocomplete="off"
            value="${formatNumber(marginPercent, decimalsOf(marginPercent), false)}" />
          <small>Sugestão de bancada, não é valor de norma: corte comprido e encurte medindo a ROE.</small>
        </label>
        <button type="button" id="print-sheet">Imprimir folha de corte</button>
      </div>
      <table class="measures cuts">
        <thead>
          <tr><th>Cota</th><th>Peça</th><th>Qtd.</th><th>Medida nominal</th><th>Cortar com</th><th>✓</th></tr>
        </thead>
        <tbody id="cut-rows">${renderCutRows(cuts, marginPercent, fMHz)}</tbody>
      </table>
      <p class="note" id="cut-total">${renderCutTotal(cuts, marginPercent, fMHz)}</p>
    </section>

    ${renderAssumptions(result.assumptions)}
    <p class="note">A antena real sempre precisa de ajuste. Corte comprido e encurte medindo a ROE.</p>

    <h3 class="no-print">Valores esperados</h3>
    <div class="estimates no-print">
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
  let marginPercent = DEFAULT_MARGIN_PERCENT;
  let current: { params: Record<string, number>; cuts: CutItem[] } | null = null;

  container.innerHTML = `
    <section class="card">
      <h2 class="no-print">${escapeHtml(meta.name)}</h2>
      <p class="no-print">${escapeHtml(meta.description)}</p>
      <p class="tags no-print">
        <span>${usage}</span>
        <span>${escapeHtml(meta.polarization)}</span>
        <span>≈ ${meta.nominalImpedanceOhms} Ω</span>
      </p>
      <form class="params no-print" novalidate>
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
    </section>
    <details class="card guide no-print">
      <summary>Guia de construção: materiais, passo a passo, ajuste e segurança</summary>
      <div class="guide-body">${marked.parse(antenna.guide, { async: false })}</div>
    </details>`;

  const form = container.querySelector<HTMLFormElement>('form')!;
  const output = container.querySelector<HTMLDivElement>('.result')!;

  /** Atualiza só a tabela de corte (a sobra mudou), sem recriar o campo em edição. */
  function updateCutTable(): void {
    if (!current) return;
    const rows = output.querySelector<HTMLElement>('#cut-rows');
    const total = output.querySelector<HTMLElement>('#cut-total');
    if (!rows || !total) return;
    const f = current.params['frequencyMHz']!;
    rows.innerHTML = renderCutRows(current.cuts, marginPercent, f);
    total.innerHTML = renderCutTotal(current.cuts, marginPercent, f);
  }

  function bindCutControls(): void {
    const marginInput = output.querySelector<HTMLInputElement>('#cut-margin');
    marginInput?.addEventListener('input', () => {
      const value = parseDecimal(marginInput.value);
      const valid = Number.isFinite(value) && value >= 0;
      marginInput.setAttribute('aria-invalid', String(!valid));
      if (valid) {
        marginPercent = value;
        updateCutTable();
      }
    });
    output.querySelector<HTMLButtonElement>('#print-sheet')?.addEventListener('click', () => window.print());
  }

  function update(): void {
    const params: Record<string, number> = {};
    for (const p of meta.params) {
      const input = form.elements.namedItem(p.key) as HTMLInputElement;
      const value = parseDecimal(input.value);
      input.setAttribute('aria-invalid', String(Number.isNaN(value)));
      if (Number.isNaN(value)) {
        current = null;
        output.innerHTML = `<div class="alert alert-warning">Valor inválido em "${escapeHtml(p.label)}".</div>`;
        return;
      }
      params[p.key] = value * p.toSi;
    }
    try {
      const result = antenna.calc(params);
      current = { params, cuts: antenna.cutList(params) };
      output.innerHTML = renderResult(result, antenna, params, marginPercent);
      bindCutControls();
    } catch (err) {
      current = null;
      output.innerHTML = renderError(err);
    }
  }

  form.addEventListener('input', update);
  form.addEventListener('submit', (e) => e.preventDefault());
  update();
}
