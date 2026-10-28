/**
 * Gamma match na Yagi (matching/gamma.ts, equações do Tolles): o excitado fica inteiro e a barra corre ao lado de uma das metades.
 *
 * Comprimento do excitado: ≈ 3 % mais curto que a ressonância no conjunto, o ponto de partida do ARRL Antenna Book (19ª ed., p. 26-9:
 * "driven element shortened approximately 3% from resonance"). A ressonância (X = 0) e a impedância do excitado encurtado vêm do modelo
 * por momentos dos elementos soltos (band-model.ts: sem boom, espaço livre, condutor perfeito). Com a impedância capacitiva que o
 * encurtamento dá, a barra fica perto da regra prática do ARRL (0,04 a 0,05λ): conferido no teste.
 *
 * Za = metade da impedância do dipolo (Tolles, p. 50: a barra só corre ao longo de um lado).
 * TODO(fonte): o modelo não inclui a barra nem o boom; nenhum resultado foi conferido com medida. Ajuste com o NanoVNA.
 */

import { type Complex, scale } from '../../core/complex';
import { Q_DELTA, impedanceQ } from '../../core/q-bandwidth';
import { type AutoGammaResult, ARRL_GAMMA_RULES, autoGamma, gammaInputImpedance } from '../../matching/gamma';
import { impedanceAt, yagiQ } from './band-model';
import type { YagiElement } from './elements';

export interface YagiGammaOptions {
  /** Diâmetro da barra, m; omitido = automático. */
  rodDiameterM?: number;
  /** Espaçamento entre centros, m; omitido = automático. */
  spacingM?: number;
  /** Impedância do cabo que o gamma casa (R0), Ω. */
  lineOhms: number;
}

export interface YagiGamma {
  /** Comprimento ressonante do excitado no conjunto (modelo, elementos soltos), m. */
  resonantLengthM: number;
  /** Comprimento do excitado com o gamma (modelo, elementos soltos): ressonância × 0,97, m. */
  drivenLengthM: number;
  /** Elementos com o excitado encurtado (soltos, para o modelo). */
  elements: YagiElement[];
  /** Impedância do dipolo inteiro encurtado, no modelo, Ω. */
  zDriven: Complex;
  /** Impedância vista pelo gamma (metade), Ω. */
  za: Complex;
  gamma: AutoGammaResult;
  /** Q na entrada do gamma (antena + gamma, já casados em f0); null se o gamma não fecha. */
  matchedQ: number | null;
  /** Diretividade (razão) na frente, da solução do excitado encurtado. */
  directivity: number;
}

const resonanceCache = new Map<string, number>();

function withDrivenLength(elements: readonly YagiElement[], length: number): YagiElement[] {
  return elements.map((e) => (e.driven ? { ...e, length } : e));
}

/** Comprimento do excitado que zera a reatância no conjunto (método da secante a partir do comprimento atual). */
export function resonantDrivenLength(elements: readonly YagiElement[], diameterM: number, f0MHz: number): number {
  const key = JSON.stringify([elements, diameterM, f0MHz]);
  const hit = resonanceCache.get(key);
  if (hit !== undefined) return hit;
  const x = (length: number) => impedanceAt(withDrivenLength(elements, length), diameterM, f0MHz, f0MHz).im;
  let a = elements.find((e) => e.driven)!.length;
  let xa = x(a);
  let b = a * ARRL_GAMMA_RULES.drivenShortening;
  let xb = x(b);
  // Perto da ressonância X varia quase linearmente com o comprimento: 2 ou 3 passos bastam para |X| < 0,1 Ω.
  for (let i = 0; i < 8 && Math.abs(xb) > 0.1; i++) {
    const c = b - (xb * (b - a)) / (xb - xa);
    a = b;
    xa = xb;
    b = c;
    xb = x(b);
  }
  if (!Number.isFinite(b) || b <= 0) throw new RangeError('Não foi possível achar a ressonância do excitado no modelo.');
  if (resonanceCache.size > 16) resonanceCache.clear();
  resonanceCache.set(key, b);
  return b;
}

/** Gamma da Yagi a partir dos elementos soltos (sem a correção do boom), na frequência de projeto. */
export function yagiGamma(elements: readonly YagiElement[], diameterM: number, f0MHz: number, options: YagiGammaOptions): YagiGamma {
  const resonantLengthM = resonantDrivenLength(elements, diameterM, f0MHz);
  const drivenLengthM = resonantLengthM * ARRL_GAMMA_RULES.drivenShortening;
  const shortened = withDrivenLength(elements, drivenLengthM);
  const model = yagiQ(shortened, diameterM, f0MHz);
  const za = scale(model.z0, 0.5);
  const gamma = autoGamma({
    fMHz: f0MHz,
    za,
    lineOhms: options.lineOhms,
    elementDiameterM: diameterM,
    ...(options.rodDiameterM !== undefined ? { rodDiameterM: options.rodDiameterM } : {}),
    ...(options.spacingM !== undefined ? { spacingM: options.spacingM } : {}),
    maxRodLengthM: drivenLengthM / 2,
  });
  let matchedQ: number | null = null;
  if (gamma.design.ok) {
    const g = gamma.design;
    const zin = (z: Complex, x: number) => gammaInputImpedance(g, scale(z, 0.5), f0MHz * x, f0MHz);
    matchedQ = impedanceQ(zin(model.zMinus, 1 - Q_DELTA), zin(model.z0, 1), zin(model.zPlus, 1 + Q_DELTA), f0MHz, f0MHz * Q_DELTA);
  }
  return { resonantLengthM, drivenLengthM, elements: shortened, zDriven: model.z0, za, gamma, matchedQ, directivity: model.directivity };
}
