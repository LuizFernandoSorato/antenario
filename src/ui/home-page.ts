/**
 * Página inicial: um cartão por antena (ícone + nome) e, abaixo, as ferramentas.
 * Cada cartão é um link para `#id`; a página da antena abre com o formulário.
 */

import type { AntennaModule } from '../antennas';
import { iconSvg } from './icons';
import { escapeHtml } from './render';
import type { Tool } from './tools/types';

export interface HomeEntry {
  id: string;
  name: string;
  kind: 'antenna' | 'tool';
}

function card(entry: HomeEntry): string {
  return `<a class="pick-card" href="#${escapeHtml(entry.id)}">
    ${iconSvg(entry.id, entry.kind)}
    <span class="pick-name">${escapeHtml(entry.name)}</span>
  </a>`;
}

export function homeEntries(antennas: readonly AntennaModule[], tools: readonly Tool[]): { antennas: HomeEntry[]; tools: HomeEntry[] } {
  return {
    antennas: antennas.map((a) => ({ id: a.meta.id, name: a.meta.name, kind: 'antenna' as const })),
    tools: [
      ...tools.map((t) => ({ id: t.id, name: t.name, kind: 'tool' as const })),
      { id: 'smith', name: 'Carta de Smith', kind: 'tool' as const },
    ],
  };
}

export function mountHomePage(container: HTMLElement, antennas: readonly AntennaModule[], tools: readonly Tool[]): void {
  const entries = homeEntries(antennas, tools);
  container.innerHTML = `
    <section class="home">
      <h2>Escolha uma antena</h2>
      <p class="note">Toque em um modelo para informar a frequência e os dados do projeto. Depois você vê os diagramas, a folha de corte e o guia de construção.</p>
      <div class="pick-grid">${entries.antennas.map(card).join('')}</div>
      <h2>Cabos, casamento e segurança</h2>
      <div class="pick-grid">${entries.tools.map(card).join('')}</div>
    </section>`;
}
