/**
 * Casamento "hairpin" (beta match): uma linha em curto, de dois fios paralelos, ligada nos terminais do
 * elemento excitado. Vista dos terminais, é uma indutância em paralelo.
 *
 * O elemento tem de ser encurtado para ficar CAPACITIVO (R − jX); a indutância em paralelo cancela a susceptância
 * e a resistência paralela resultante é Rp = (R² + X²)/R. Para Rp = Z0 é preciso X = −√(R·(Z0 − R)) (só existe se R < Z0).
 *
 * Fórmulas (teoria de circuitos e de linhas, sem coeficiente empírico):
 *   Y = 1/(R + jX) = G + jB;  indutor em paralelo com susceptância −B:  X_L = 1/B  (exige B > 0, ou seja, X < 0);
 *   Rp = 1/G;
 *   linha em curto de impedância Zh e comprimento l:  X_L = Zh·tan(2π·l/λ_linha);
 *   linha de dois fios paralelos, espaçamento D (centro a centro) e diâmetro d:  Zh = 276·log10(2D/d)
 *   (aproximação válida para D ≫ d; ARRL Antenna Book, Kraus, "Antennas", linha de dois fios).
 * Referência da topologia: ARRL Antenna Book (capítulo de Yagi: "hairpin match"). O alcance prático (impedância do
 * elemento até cerca de 25 a 35 Ω) vem de relatos de radioamadores (WorldwideDX), não de fonte de engenharia.
 * TODO(fonte): capítulo de casamento do Antenna Book e o efeito dos cantos e da barra de curto (a calculadora os ignora).
 */

import { type Complex, abs, complex, reciprocal } from '../core/complex';
import { reflectionCoefficient, swrFromGamma } from '../core/reflection';
import { assertFrequencyMHz, assertPositive } from '../core/units';
import { wavelength } from '../core/wave';

export interface HairpinInput {
  /** Impedância do elemento excitado nos terminais do gap (Ω); parte imaginária negativa (capacitivo). */
  zElement: Complex;
  /** Impedância do sistema (Ω): da linha, ou depois do balun. */
  z0: number;
  fMHz: number;
  /** Espaçamento centro a centro entre os fios do grampo (m). */
  spacingM: number;
  /** Diâmetro dos fios do grampo (m). */
  wireDiameterM: number;
}

export interface HairpinResult {
  /** Reatância do elemento que daria casamento exato com Z0 (Ω, negativa); `null` se R ≥ Z0. */
  idealElementReactance: number | null;
  /** Reatância indutiva do grampo (Ω). */
  hairpinReactance: number;
  /** Indutância equivalente na frequência (H). */
  inductanceH: number;
  /** Impedância característica da linha de dois fios (Ω). */
  lineImpedance: number;
  /** Comprimento do grampo, dos terminais à barra de curto (m), no ar (fator de velocidade ≈ 1). */
  legLengthM: number;
  /** Resistência paralela resultante (Ω). */
  parallelResistance: number;
  /** ROE resultante em relação a Z0. */
  swr: number;
}

/** Impedância característica de linha de dois fios (aproximação para D ≫ d). */
export function twoWireImpedance(spacingM: number, wireDiameterM: number): number {
  assertPositive(spacingM, 'O espaçamento dos fios (m)');
  assertPositive(wireDiameterM, 'O diâmetro do fio (m)');
  if (spacingM <= wireDiameterM) throw new RangeError('O espaçamento (centro a centro) deve ser maior que o diâmetro do fio.');
  return 276 * Math.log10((2 * spacingM) / wireDiameterM);
}

export function designHairpin(input: HairpinInput): HairpinResult {
  const { zElement, z0, fMHz, spacingM, wireDiameterM } = input;
  assertFrequencyMHz(fMHz);
  assertPositive(z0, 'A impedância do sistema (Ω)');
  if (!(zElement.re > 0)) throw new RangeError('A resistência do elemento deve ser positiva.');
  if (!(zElement.im < 0)) {
    throw new RangeError(
      'O hairpin exige elemento CAPACITIVO (reatância negativa): encurte o elemento até a reatância ficar negativa. ' +
        'Um indutor em paralelo não cancela uma reatância indutiva.',
    );
  }
  const y = reciprocal(zElement);
  const xl = 1 / y.im; // y.im > 0 quando X < 0
  const rp = 1 / y.re;
  const zh = twoWireImpedance(spacingM, wireDiameterM);
  const lambda = wavelength(fMHz);
  const legLengthM = (lambda / (2 * Math.PI)) * Math.atan(xl / zh);
  const swr = swrFromGamma(abs(reflectionCoefficient(complex(rp, 0), z0)));
  const r = zElement.re;
  return {
    idealElementReactance: r < z0 ? -Math.sqrt(r * (z0 - r)) : null,
    hairpinReactance: xl,
    inductanceH: xl / (2 * Math.PI * fMHz * 1e6),
    lineImpedance: zh,
    legLengthM,
    parallelResistance: rp,
    swr,
  };
}
