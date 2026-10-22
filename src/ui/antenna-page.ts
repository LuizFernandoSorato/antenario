/**
 * Página genérica de uma antena: formulário montado a partir de `meta.params`
 * e resultado com diagramas, cotas, folha de corte, premissas, valores esperados
 * e avisos. O guia de construção fica numa seção própria.
 */

import type { AntennaModule } from '../antennas';
import { DEFAULT_MARGIN_PERCENT, cutLength, totalMaterial } from '../antennas/cutlist';
import type { AssemblyGuide, CalcResult, CutItem, Estimate, ParamSpec } from '../antennas/types';
import {
  formatLength,
  formatNumber,
  lengthResolutionForFrequency,
  parseDecimal,
  trimZeros,
} from '../core/units';
import { decimalsOf, escapeHtml, renderAssumptions, renderDiagrams, renderError, renderGuide, renderWarnings } from './render';

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

/** Campo do formulário: texto numérico, caixa de seleção (boolean) ou botões de opção (choice). */
function renderField(p: ParamSpec): string {
  const help = p.help ? `<small>${escapeHtml(p.help)}</small>` : '';
  if (p.kind === 'boolean') {
    return `<label class="check-field">
      <input name="${p.key}" type="checkbox"${p.defaultValue ? ' checked' : ''} />
      <span>${escapeHtml(p.label)}</span>
      ${help}
    </label>`;
  }
  if (p.kind === 'choice') {
    return `<fieldset class="choice-field">
      <legend>${escapeHtml(p.label)}</legend>
      ${(p.options ?? [])
        .map(
          (o) =>
            `<label><input type="radio" name="${p.key}" value="${o.value}"${o.value === p.defaultValue ? ' checked' : ''} /> <span>${escapeHtml(o.label)}</span></label>`,
        )
        .join('')}
      ${help}
    </fieldset>`;
  }
  return `<label>
    <span>${escapeHtml(p.label)}${p.unit ? ` (${escapeHtml(p.unit)})` : ''}</span>
    <input name="${p.key}" type="text" inputmode="decimal" autocomplete="off"
      value="${formatNumber(p.defaultValue, decimalsOf(p.defaultValue), false)}" />
    ${help}
  </label>`;
}

/** Campos do formulário; uma caixa de seleção e os campos que dependem dela (`enabledBy`) ficam juntos, num cartão só. */
function renderFields(params: readonly ParamSpec[]): string {
  return params
    .filter((p) => p.enabledBy === undefined)
    .map((p) => {
      const dependents = params.filter((d) => d.enabledBy === p.key);
      if (dependents.length === 0) return renderField(p);
      return `<div class="field-group">
        ${renderField(p)}
        ${dependents.map((d) => `<fieldset class="dependent-field" data-enabled-by="${p.key}">${renderField(d)}</fieldset>`).join('')}
      </div>`;
    })
    .join('');
}

/** Desativa os campos dependentes cuja caixa de seleção está desmarcada. */
function syncDependents(form: HTMLFormElement): void {
  for (const group of form.querySelectorAll<HTMLFieldSetElement>('fieldset[data-enabled-by]')) {
    const owner = form.elements.namedItem(group.dataset['enabledBy']!) as HTMLInputElement;
    group.disabled = !owner.checked;
  }
}

/** Valor atual de um campo boolean (1 se marcado, 0 se não) ou choice (o valor da opção marcada, ou o padrão). */
function readChoiceField(form: HTMLFormElement, p: ParamSpec): number {
  if (p.kind === 'boolean') {
    return (form.elements.namedItem(p.key) as HTMLInputElement).checked ? 1 : 0;
  }
  const checked = form.querySelector<HTMLInputElement>(`input[name="${p.key}"]:checked`);
  return checked ? Number(checked.value) : p.defaultValue;
}

function renderAssembly(assembly: AssemblyGuide | undefined): string {
  if (!assembly) return '';
  return `
    <section class="assembly">
      <h3>${escapeHtml(assembly.title)}</h3>
      <ol>${assembly.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
    </section>`;
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

    ${renderDiagrams(antenna.diagrams(params))}
    ${renderAssembly(result.assembly)}
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
        ${renderFields(meta.params)}
      </form>
      <div class="result" aria-live="polite"></div>
    </section>
    <section class="card no-print">${renderGuide(antenna.guide)}</section>`;

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
    syncDependents(form);
    const params: Record<string, number> = {};
    for (const p of meta.params) {
      if (p.kind === 'boolean' || p.kind === 'choice') {
        params[p.key] = readChoiceField(form, p) * p.toSi;
        continue;
      }
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
