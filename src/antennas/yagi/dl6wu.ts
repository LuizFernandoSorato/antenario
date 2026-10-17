/**
 * Método DL6WU para Yagis de qualquer número de elementos (Yagis longos, boom ≥ 2,2λ).
 *
 * Fonte: programa DL6WU.BAS (versão "Oct 2006"), baseado nos trabalhos de Günter Hoch, DL6WU,
 * "Extremely Long Yagi Antennas", VHF Communications 3/82, e "Zelf Ontwerpen en Bouwen van VHF en
 * UHF Antennes" (com PA0MS), VERON. Programa original de J. Haigwood KY4Z e B. Stein W6NBI (1983–86),
 * modificações de I. White G3SEK (1986–2006) e recomendações do DL6WU (1988), com as estimativas de
 * largura de feixe de O. Duffy VK1OD:
 * http://www.ifwtech.co.uk/g3sek/diy-yagi/dl6wu-2006.bas (consultado em 2026-10-17).
 * As equações abaixo foram transcritas desse código (os números de linha citados são os dele).
 * Os artigos originais do DL6WU não foram consultados diretamente.
 *
 * Tudo aqui é em comprimentos de onda (λ), como no programa.
 */

/**
 * Espaçamento de cada diretor ao elemento anterior (o 1º é medido a partir do excitado), em λ.
 * Programa, linhas 2110–2120. Do 14º em diante o espaçamento é constante e igual ao último (linha 1280).
 */
export const DL6WU_DIRECTOR_SPACINGS: readonly number[] = [
  0.075, 0.18, 0.215, 0.25, 0.28, 0.3, 0.315, 0.33, 0.345, 0.36, 0.375, 0.39, 0.4, 0.4,
];

/** Distância do refletor ao excitado, em λ (linha 1190). */
export const DL6WU_REFLECTOR_SPACING = 0.2;

/** Faixa de boom (λ) para a qual o programa aceita o projeto (linhas 540 e 600). */
export const DL6WU_BOOM_RANGE = { min: 2.2, max: 39 } as const;
/** Faixa de d/λ dos elementos aceita pelo programa (linhas 1080 e 1140–1170). */
export const DL6WU_ELEMENT_RANGE = { min: 0.001, max: 0.02 } as const;
/** Diâmetro máximo do boom metálico, em λ (linha 790). */
export const DL6WU_BOOM_MAX = 0.06;
/** A equação de correção do boom ajusta os dados do DL6WU apenas para D ≤ 0,055λ (linha 890). */
export const DL6WU_BOOM_FIT_MAX = 0.055;
/** Reatância recomendada pelo DL6WU para o refletor, em Ω (linha 1520). */
export const DL6WU_REFLECTOR_REACTANCE = 20;
/** Tolerância de corte dos elementos, em λ (linha 2790). */
export const DL6WU_CUT_TOLERANCE_LAMBDA = 0.003;
/** O programa soma 2,15 dB para passar de dBd a dBi (linhas 2625–2630). */
export const DL6WU_DBD_TO_DBI = 2.15;

/** Posição do n-ésimo diretor (n ≥ 1) a partir do refletor, em λ (linhas 1230 e 1290). */
export function directorPositions(directorCount: number): number[] {
  const out: number[] = [];
  let t = DL6WU_REFLECTOR_SPACING;
  for (let n = 1; n <= directorCount; n++) {
    t += DL6WU_DIRECTOR_SPACINGS[Math.min(n, DL6WU_DIRECTOR_SPACINGS.length) - 1]!;
    out.push(t);
  }
  return out;
}

/** Comprimento do boom (λ): do refletor ao último diretor, entre centros. Com 0 diretores, só o refletor→excitado. */
export function boomLength(directorCount: number): number {
  const p = directorPositions(directorCount);
  return p.length === 0 ? DL6WU_REFLECTOR_SPACING : p[p.length - 1]!;
}

/** Linhas 2160–2220: diâmetro padrão (λ), K1, K2, K3, K4. */
const DIRECTOR_TABLE: readonly (readonly [number, number, number, number, number])[] = [
  [0.001, 0.4711, 0.018, 0.08398, 0.965],
  [0.003, 0.462, 0.01941, 0.08543, 0.9697],
  [0.005, 0.4538, 0.02117, 0.0951, 1.007],
  [0.007, 0.4491, 0.02274, 0.08801, 0.9004],
  [0.01, 0.4421, 0.02396, 0.1027, 1.038],
  [0.015, 0.4358, 0.02558, 0.1149, 1.034],
  [0.02, 0.4268, 0.02614, 0.1112, 1.036],
];

/** Comprimento (λ) do diretor n com os coeficientes K1–K4 (linha 1490): (K1 − K2·ln n)·(1 − K3·e^(−K4·n)). */
function directorFormula(n: number, k1: number, k2: number, k3: number, k4: number): number {
  return (k1 - k2 * Math.log(n)) * (1 - k3 * Math.exp(-k4 * n));
}

/**
 * Comprimentos dos diretores (λ), SEM correção de boom, para d/λ do elemento parasita `elementOverLambda`.
 * Entre dois diâmetros da tabela interpola linearmente os comprimentos (linhas 1380–1470 e 2030–2060).
 */
export function directorLengths(directorCount: number, elementOverLambda: number): number[] {
  const ed = elementOverLambda;
  if (!Number.isFinite(ed) || ed < DL6WU_ELEMENT_RANGE.min || ed > DL6WU_ELEMENT_RANGE.max) {
    throw new RangeError(
      `O diâmetro do elemento deve estar entre ${DL6WU_ELEMENT_RANGE.min} e ${DL6WU_ELEMENT_RANGE.max} λ para o método DL6WU (d/λ = ${ed}).`,
    );
  }
  const exact = DIRECTOR_TABLE.find((r) => Math.abs(r[0] - ed) < 1e-12);
  const lengths: number[] = [];
  if (exact) {
    for (let n = 1; n <= directorCount; n++) lengths.push(directorFormula(n, exact[1], exact[2], exact[3], exact[4]));
    return lengths;
  }
  const low = [...DIRECTOR_TABLE].reverse().find((r) => r[0] < ed)!;
  const high = DIRECTOR_TABLE.find((r) => r[0] > ed)!;
  const j = (ed - low[0]) / (high[0] - low[0]);
  for (let n = 1; n <= directorCount; n++) {
    const dl = directorFormula(n, low[1], low[2], low[3], low[4]);
    const dh = directorFormula(n, high[1], high[2], high[3], high[4]);
    lengths.push(dl + j * (dh - dl));
  }
  return lengths;
}

/**
 * Correção de boom (λ) somada a todos os parasitas (linhas 890, 920 e 1070), em função do diâmetro do boom
 * em λ. `bonded`: elementos atravessam o boom e estão soldados a ele; isolados passando pelo boom, metade.
 * Boom não metálico, ou elementos isolados acima/abaixo dele: sem correção (passar 0).
 */
export function boomCorrection(boomOverLambda: number, bonded = true): number {
  const bd = boomOverLambda;
  if (!Number.isFinite(bd) || bd < 0 || bd > DL6WU_BOOM_MAX) {
    throw new RangeError(`O diâmetro do boom metálico deve estar entre 0 e ${DL6WU_BOOM_MAX} λ no método DL6WU (D/λ = ${bd}).`);
  }
  const fraction = 733 * bd * (0.055 - bd) - 504 * bd * (0.03 - bd);
  return (bonded ? fraction : fraction / 2) * bd;
}

/**
 * Comprimento do refletor (λ), SEM correção de boom, para a reatância `reactanceOhms` (linha 1522):
 * ((X − 40)/(186,8769·ln(2/(d/λ)) − 320) + 1)/2.
 */
export function reflectorLength(elementOverLambda: number, reactanceOhms = DL6WU_REFLECTOR_REACTANCE): number {
  return ((reactanceOhms - 40) / (186.8769 * Math.log(2 / elementOverLambda) - 320) + 1) / 2;
}

/**
 * Comprimento (λ) do elemento excitado do programa (linhas 1530–1540). O programa o dá para um dipolo
 * DOBRADO ("2 % mais comprido, para melhor casamento com um dipolo dobrado").
 */
export function foldedDrivenLength(drivenOverLambda: number): number {
  const dd = drivenOverLambda;
  return 1.02 * ((0.4777 - 1.0522 * dd + 0.43363 * dd ** -0.014891) / 2);
}

/** Ganho estimado em dBd para um boom de `boomLambda` (linha 1340): 9,2 + 3,39·ln(L). O programa avisa: "pode ser menor". */
export function estimatedGainDbd(boomLambda: number): number {
  return 9.2 + 3.39 * Math.log(boomLambda);
}

/**
 * Larguras de feixe estimadas (graus) nos planos E e H (correlação de O. Duffy, VK1OD, a partir de NEC;
 * linhas 2625–2650).
 */
export function beamwidthsDeg(gainDbd: number): { e: number; h: number } {
  const gi = gainDbd + DL6WU_DBD_TO_DBI;
  const h2e = 1 + 4.03306 * Math.exp(-0.264152 * gi);
  const lin = 10 ** (gi / 10);
  return { e: Math.sqrt(37632 / (lin * h2e)), h: Math.sqrt((37632 * h2e) / lin) };
}
