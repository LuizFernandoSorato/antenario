/**
 * Ícones das antenas e ferramentas (SVG esquemático de traço, em 48×48).
 *
 * Usam `currentColor`, então acompanham o tema claro/escuro. São desenhos de reconhecimento,
 * não em escala. Cada id de antena do registro precisa ter um ícone (há teste para isso).
 */

const ICONS: Readonly<Record<string, string>> = {
  // Dois braços na horizontal com o ponto de alimentação no centro.
  dipole: '<path d="M5 18h16M27 18h16M24 18v22"/><circle cx="24" cy="18" r="3"/>',
  // Radiador vertical sobre radiais inclinados.
  'ground-plane': '<path d="M24 5v24M24 29L8 41M24 29l16 12M24 29l-6 13M24 29l6 13"/>',
  // Letra J: haste longa e stub de 1/4 de onda ligados por baixo.
  'j-pole': '<path d="M30 5v35a6 6 0 0 1-12 0V22"/>',
  // Espiras inclinadas em volta de um eixo, sobre um plano de terra.
  helical: '<path d="M9 44h30M12 37l24-5M12 29l24-5M12 21l24-5M12 13l24-5M24 44V8" stroke-dasharray="0"/>',
  // Boom horizontal com refletor longo, excitado e diretores progressivamente menores.
  yagi: '<path d="M5 40h38M10 9v31M19 13v27M28 17v23M37 20v23"/>',
  // Dois quadrados (refletor e excitado), um atrás do outro.
  'cubic-quad': '<rect x="6" y="6" width="26" height="26"/><rect x="16" y="16" width="26" height="26"/>',
  // Disco em cima e cone com o vértice voltado para o disco.
  discone: '<path d="M13 11h22M24 17L8 41h32z"/>',
  // Espira circular aberta embaixo, com o capacitor de sintonia.
  'magnetic-loop': '<path d="M19 33A14 14 0 1 1 29 33M18 31v12M30 31v12"/>',
  // Seções radiantes empilhadas, ligadas por linhas de fase.
  'coax-collinear': '<rect x="20" y="4" width="8" height="10"/><rect x="20" y="19" width="8" height="10"/><rect x="20" y="34" width="8" height="10"/><path d="M24 14v5M24 29v5"/>',
  // Dois dipolos cruzados, vistos de cima.
  turnstile: '<path d="M5 24h38M24 5v38"/><circle cx="24" cy="24" r="4"/>',
  // Dois laços de meia espira cruzados, em forma de gaiola torcida (quadrifilar).
  qfh: '<path d="M16 42C5 30 5 18 16 6M32 42C43 30 43 18 32 6M16 42L32 6M32 42L16 6"/>',
  // Antena genérica (mastro com ondas), usada se faltar um ícone específico.
  generic: '<path d="M24 44V20M24 20l-8-12M24 20l8-12M12 14a14 14 0 0 0 0 12M36 14a14 14 0 0 1 0 12"/>',
  // Ferramentas.
  smith: '<circle cx="24" cy="24" r="18"/><circle cx="31" cy="24" r="11"/><circle cx="37" cy="24" r="5"/><path d="M6 24h36"/>',
  tool: '<path d="M8 36a18 18 0 0 1 32 0"/><path d="M24 34l9-14"/><circle cx="24" cy="34" r="2"/>',
};

/** Ids que têm ícone próprio (útil para testes). */
export const ICON_IDS: readonly string[] = Object.keys(ICONS);

/** SVG do ícone do id informado; cai no ícone genérico se não houver um específico. */
export function iconSvg(id: string, kind: 'antenna' | 'tool' = 'antenna'): string {
  const inner = ICONS[id] ?? ICONS[kind === 'tool' ? 'tool' : 'generic']!;
  return (
    `<svg class="icon" viewBox="0 0 48 48" width="56" height="56" fill="none" stroke="currentColor" ` +
    `stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`
  );
}
