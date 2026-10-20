/**
 * Funções de renderização compartilhadas pelas páginas (antenas e ferramentas).
 */

import { marked } from 'marked';
import type { Diagram } from '../antennas/diagram-kit';
import type { Assumption, CalcWarning } from '../antennas/types';

const WARNING_TITLES = { info: 'Nota', warning: 'Atenção', danger: 'Perigo' } as const;

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Casas decimais de um valor padrão, para exibir o campo sem perder precisão. */
export function decimalsOf(value: number): number {
  const s = String(value);
  const dot = s.indexOf('.');
  return dot < 0 ? 0 : s.length - dot - 1;
}

export function renderWarnings(warnings: readonly CalcWarning[]): string {
  return warnings
    .map(
      (w) => `<div class="alert alert-${w.level}" role="note">
        <strong>${WARNING_TITLES[w.level]}:</strong> ${escapeHtml(w.message)}</div>`,
    )
    .join('');
}

export function renderAssumptions(assumptions: readonly Assumption[]): string {
  return `
    <h3>Premissas do cálculo</h3>
    <dl class="assumptions">
      ${assumptions
        .map(
          (a) => `<dt>${escapeHtml(a.name)}</dt>
            <dd>${escapeHtml(a.value)}${a.source ? `<small>${escapeHtml(a.source)}</small>` : ''}</dd>`,
        )
        .join('')}
    </dl>`;
}

export function renderError(err: unknown): string {
  const message = err instanceof RangeError ? err.message : 'Erro inesperado no cálculo.';
  if (!(err instanceof RangeError)) console.error(err);
  return `<div class="alert alert-warning">${escapeHtml(message)}</div>`;
}

export function renderDiagrams(diagrams: readonly Diagram[]): string {
  return `
    <h3>Diagramas</h3>
    <div class="diagrams">
      ${diagrams
        .map(
          (d) => `<figure class="diagram">
            <figcaption><strong>${escapeHtml(d.title)}</strong></figcaption>
            ${d.svg}
            <p class="note">${escapeHtml(d.caption)}</p>
          </figure>`,
        )
        .join('')}
    </div>`;
}

/** Guia em Markdown → HTML. O título (# ...) é omitido: a página já mostra o nome. */
export function renderGuide(markdown: string, summary = 'Guia de construção'): string {
  const body = markdown.replace(/^# .*\n+/, '');
  const html = marked.parse(body, { async: false });
  return `
    <details class="guide" open>
      <summary>${escapeHtml(summary)}</summary>
      ${html}
    </details>`;
}
