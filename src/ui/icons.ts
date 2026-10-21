/**
 * Ícones das antenas e ferramentas (SVG esquemático de traço, em 48×48).
 *
 * Usam `currentColor`, então acompanham o tema claro/escuro. São desenhos de reconhecimento,
 * não em escala. Cada id de antena do registro precisa ter um ícone (há teste para isso).
 */

const ICONS: Readonly<Record<string, string>> = {
  // Dois braços na horizontal com o ponto de alimentação no centro.
  dipole: '<path d="M5 18h16M27 18h16M24 18v22"/><circle cx="24" cy="18" r="3"/>',
  // Dipolo com a parte central grossa (as duas metades de coaxial) e fios finos nas pontas.
  bazooka: '<path d="M4 18h8M36 18h8M24 21v19"/><rect x="12" y="15" width="10" height="6" rx="1"/><rect x="26" y="15" width="10" height="6" rx="1"/>',
  // Mastro com os dois braços descendo do topo até as pontas.
  'inverted-v': '<path d="M24 8v34M24 8L6 30M24 8l18 22M14 44h20"/><circle cx="24" cy="8" r="2.5"/>',
  // Tubo vertical com o elemento fino em cima e a bobina embaixo.
  flowerpot: '<rect x="19" y="4" width="10" height="40" rx="2"/><path d="M24 7v14M24 21v12M16 31l16 3M16 35l16 3M16 39l16 3"/>',
  // Radiador vertical sobre radiais inclinados.
  'ground-plane': '<path d="M24 5v24M24 29L8 41M24 29l16 12M24 29l-6 13M24 29l6 13"/>',
  // Letra J: haste longa e stub de 1/4 de onda ligados por baixo.
  'j-pole': '<path d="M30 5v35a6 6 0 0 1-12 0V22"/>',
  // Espiras inclinadas em volta de um eixo, sobre um plano de terra.
  helical: '<path d="M9 44h30M12 37l24-5M12 29l24-5M12 21l24-5M12 13l24-5M24 44V8" stroke-dasharray="0"/>',
  // Boom horizontal com refletor longo, excitado e diretores progressivamente menores.
  yagi: '<path d="M5 40h38M10 9v31M19 13v27M28 17v23M37 20v23"/>',
  // Vista de cima: excitado e refletor em U, com as pontas frente a frente e a folga entre elas.
  moxon: '<path d="M6 21V12h36v9M6 27v9h36v-9"/><circle cx="24" cy="12" r="2.5"/>',
  // Dois quadrados (refletor e excitado), um atrás do outro.
  'cubic-quad': '<rect x="6" y="6" width="26" height="26"/><rect x="16" y="16" width="26" height="26"/>',
  // Disco em cima e cone com o vértice voltado para o disco.
  discone: '<path d="M13 11h22M24 17L8 41h32z"/>',
  // Espira circular aberta embaixo, com o capacitor de sintonia.
  'magnetic-loop': '<path d="M19 33A14 14 0 1 1 29 33M18 31v12M30 31v12"/>',
  // Seções radiantes empilhadas, ligadas por linhas de fase.
  'coax-collinear': '<rect x="20" y="4" width="8" height="10"/><rect x="20" y="19" width="8" height="10"/><rect x="20" y="34" width="8" height="10"/><path d="M24 14v5M24 29v5"/>',
  // Yagi visto de cima (boom e elementos), com círculos no refletor e no excitado: o par cruzado.
  'cross-yagi': '<path d="M5 24h38"/><path d="M11 10v28M21 13v22M30 16v16M38 19v10"/><circle cx="11" cy="24" r="3"/><circle cx="21" cy="24" r="3"/>',
  // Dois dipolos cruzados, vistos de cima.
  turnstile: '<path d="M5 24h38M24 5v38"/><circle cx="24" cy="24" r="4"/>',
  // Dois laços de meia espira cruzados, em forma de gaiola torcida (quadrifilar).
  qfh: '<path d="M16 42C5 30 5 18 16 6M32 42C43 30 43 18 32 6M16 42L32 6M32 42L16 6"/>',
  // Antena genérica (mastro com ondas), usada se faltar um ícone específico.
  generic: '<path d="M24 44V20M24 20l-8-12M24 20l8-12M12 14a14 14 0 0 0 0 12M36 14a14 14 0 0 1 0 12"/>',
  // Ferramentas.
  // Corte do coaxial (capa, dielétrico e condutor central) e barras de sinal que diminuem.
  'cable-loss': '<circle cx="15" cy="24" r="12"/><circle cx="15" cy="24" r="7"/><circle cx="15" cy="24" r="2" fill="currentColor"/><path d="M32 34V14M38 34V20M44 34V27"/>',
  // Um quarto de onda (de zero ao pico) com a cota λ/4 embaixo.
  'quarter-wave': '<path d="M6 32C14 32 22 10 38 10M38 10v22M6 29v6M38 29v6M6 32h32"/><text x="22" y="47" font-size="10" text-anchor="middle" fill="currentColor" stroke="none" font-family="system-ui, sans-serif">λ/4</text>',
  // Rede L: indutor em série no fio de cima e capacitor em paralelo, até o fio de baixo.
  'l-network': '<path d="M4 14h6a4 4 0 0 1 8 0a4 4 0 0 1 8 0h18M34 14v10M26 24h16M26 30h16M34 30v10M4 40h40"/><circle cx="34" cy="14" r="2" fill="currentColor"/>',
  // Linha principal e um stub em paralelo, em curto na ponta.
  'single-stub': '<path d="M4 36h40M28 36V10M22 10h12"/><circle cx="28" cy="36" r="2" fill="currentColor"/>',
  // Laço de cabo de meia onda entre dois terminais.
  'coax-balun': '<path d="M4 28h10M34 28h10M14 28a10 10 0 0 1 20 0"/><circle cx="14" cy="28" r="2.5"/><circle cx="34" cy="28" r="2.5"/><text x="24" y="43" font-size="10" text-anchor="middle" fill="currentColor" stroke="none" font-family="system-ui, sans-serif">4:1</text>',
  // Elemento excitado partido ao meio, grampo de dois fios e barra de curto.
  hairpin: '<path d="M4 12h14M30 12h14M18 12v26M30 12v26M15 38h18"/><circle cx="18" cy="12" r="2.5"/><circle cx="30" cy="12" r="2.5"/>',
  // Fonte irradiando para uma pessoa.
  'rf-exposure': '<circle cx="9" cy="24" r="3" fill="currentColor"/><path d="M16 17a10 10 0 0 1 0 14M22 11a18 18 0 0 1 0 26M28 6a26 26 0 0 1 0 36"/><circle cx="41" cy="16" r="3"/><path d="M41 21v12M41 33l-4 8M41 33l4 8M36 25h10"/>',
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
