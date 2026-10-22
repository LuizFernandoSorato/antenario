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
      <p class="note">Escolha um modelo, informe a frequência e o material. Você recebe as medidas, diagramas e o guia de construção. As medidas são o ponto de partida: toda antena real precisa de ajuste com um medidor de ROE ou NanoVNA.</p>
      <div class="pick-grid">${entries.antennas.map(card).join('')}</div>
      <h2>Ferramentas</h2>
      <p class="note">Cabos e casamento de impedâncias</p>
      <div class="pick-grid">${entries.tools.map(card).join('')}</div>
    </section>`;
}
