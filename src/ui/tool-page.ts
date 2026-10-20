/**
 * Página genérica de uma ferramenta (cabos e casamento): formulário a partir de
 * `tool.fields`, resultado em seções, premissas e avisos.
 */

import { formatNumber, parseDecimal } from '../core/units';
import { decimalsOf, escapeHtml, renderAssumptions, renderDiagrams, renderError, renderGuide, renderWarnings } from './render';
import type { FieldSpec, Tool, ToolOutput, ToolValues } from './tools/types';

function renderField(f: FieldSpec): string {
  const help = f.help ? `<small>${escapeHtml(f.help)}</small>` : '';
  if (f.kind === 'select') {
    return `<label>
      <span>${escapeHtml(f.label)}</span>
      <select name="${f.key}">
        ${f.options
          .map(
            (o) =>
              `<option value="${escapeHtml(o.value)}"${o.value === f.defaultValue ? ' selected' : ''}>${escapeHtml(o.label)}</option>`,
          )
          .join('')}
      </select>
      ${help}
    </label>`;
  }
  return `<label>
    <span>${escapeHtml(f.label)}${f.unit ? ` (${escapeHtml(f.unit)})` : ''}</span>
    <input name="${f.key}" type="text" inputmode="decimal" autocomplete="off"
      value="${formatNumber(f.defaultValue, decimalsOf(f.defaultValue), false)}" />
    ${help}
  </label>`;
}

function renderOutput(out: ToolOutput): string {
  return `
    ${out.diagrams && out.diagrams.length > 0 ? renderDiagrams(out.diagrams) : ''}
    ${renderWarnings(out.warnings)}
    ${out.sections
      .map(
        (s) => `
        <h3>${escapeHtml(s.title)}</h3>
        ${s.description ? `<p class="note">${escapeHtml(s.description)}</p>` : ''}
        <table class="measures">
          <tbody>
            ${s.rows
              .map(
                (r) => `<tr>
                  <td>${escapeHtml(r.label)}${r.note ? `<small>${escapeHtml(r.note)}</small>` : ''}</td>
                  <td class="value">${escapeHtml(r.value)}</td>
                </tr>`,
              )
              .join('')}
          </tbody>
        </table>`,
      )
      .join('')}
    ${renderAssumptions(out.assumptions)}`;
}

export function mountToolPage(container: HTMLElement, tool: Tool): void {
  container.innerHTML = `
    <section class="card">
      <h2>${escapeHtml(tool.name)}</h2>
      <p>${escapeHtml(tool.description)}</p>
      <form class="params" novalidate>
        ${tool.fields.map(renderField).join('')}
      </form>
      <div class="result" aria-live="polite"></div>
    </section>
    ${tool.guide ? `<section class="card">${renderGuide(tool.guide, 'Dicas de montagem e ajuste')}</section>` : ''}`;

  const form = container.querySelector<HTMLFormElement>('form')!;
  const output = container.querySelector<HTMLDivElement>('.result')!;

  function update(): void {
    const values: ToolValues = {};
    for (const f of tool.fields) {
      const el = form.elements.namedItem(f.key) as HTMLInputElement | HTMLSelectElement;
      if (f.kind === 'select') {
        values[f.key] = el.value;
        continue;
      }
      const value = parseDecimal(el.value);
      el.setAttribute('aria-invalid', String(Number.isNaN(value)));
      if (Number.isNaN(value)) {
        output.innerHTML = `<div class="alert alert-warning">Valor inválido em "${escapeHtml(f.label)}".</div>`;
        return;
      }
      values[f.key] = value;
    }
    try {
      output.innerHTML = renderOutput(tool.run(values));
    } catch (err) {
      output.innerHTML = renderError(err);
    }
  }

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.addEventListener('submit', (e) => e.preventDefault());
  update();
}
