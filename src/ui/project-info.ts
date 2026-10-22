/**
 * Autor e repositório no cabeçalho, com um botão de estrela do GitHub.
 *
 * O botão é um link comum para o repositório (dar estrela exige login no GitHub, então não há como fazer isso aqui).
 * Não usa script nem iframe de terceiros: funciona offline e não impede o empacotamento com Capacitor. O número de
 * estrelas vem da API pública do GitHub; sem rede (ou com o limite de consultas estourado) ele simplesmente não aparece.
 */

import { escapeHtml } from './render';

export const AUTHOR = 'Luiz F Sorato';
export const REPO_PATH = 'LuizFernandoSorato/antenario';
export const REPO_URL = `https://github.com/${REPO_PATH}`;
const REPO_API_URL = `https://api.github.com/repos/${REPO_PATH}`;

const STAR_ICON =
  '<svg class="star-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">' +
  '<path fill="currentColor" d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 ' +
  '4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 ' +
  '.416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/></svg>';

export function creditsHtml(): string {
  return `<p class="credits">
    Por ${escapeHtml(AUTHOR)} ·
    <a href="${REPO_URL}" target="_blank" rel="noopener">github.com/${escapeHtml(REPO_PATH)}</a>
    <a class="star-button" href="${REPO_URL}" target="_blank" rel="noopener" title="Dar uma estrela no GitHub">
      ${STAR_ICON}<span>Estrela</span><span class="star-count" hidden></span>
    </a>
  </p>`;
}

/** Número de estrelas da resposta de /repos/{dono}/{repo}; null se a resposta não tiver o campo. */
export function parseStarCount(json: unknown): number | null {
  if (typeof json !== 'object' || json === null) return null;
  const count = (json as { stargazers_count?: unknown }).stargazers_count;
  return typeof count === 'number' && Number.isInteger(count) && count >= 0 ? count : null;
}

/** Busca o número de estrelas e o mostra no botão; qualquer falha deixa o contador escondido. */
export async function loadStarCount(root: ParentNode): Promise<void> {
  const el = root.querySelector<HTMLElement>('.star-count');
  if (!el) return;
  try {
    const response = await fetch(REPO_API_URL, { headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) return;
    const count = parseStarCount(await response.json());
    if (count === null) return;
    el.textContent = count.toLocaleString('pt-BR');
    el.hidden = false;
  } catch {
    // Offline ou bloqueado: o botão continua funcionando como link.
  }
}
