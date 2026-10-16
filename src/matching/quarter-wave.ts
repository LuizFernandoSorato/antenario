/**
 * Transformador de quarto de onda.
 *
 * Um trecho de linha de λ/4 com impedância Z_t transforma uma carga resistiva
 * R_L em Z_t²/R_L. Para casar R_L com Z0:
 *
 *   Z_t = √(Z0 · R_L)
 *
 * O comprimento físico usa o fator de velocidade do cabo do transformador:
 * l = VF · λ/4.
 *
 * Largura de banda (linha TEM, um único trecho), para |Γ| ≤ Γm:
 *
 *   Δf/f0 = 2 − (4/π)·acos[ Γm/√(1 − Γm²) · 2√(Z0·R_L)/|R_L − Z0| ]
 *
 * Fonte: Pozar, Microwave Engineering, 4ª ed., §5.5 (The Quarter-Wave Transformer).
 */

import { swrFromImpedance, gammaFromSwr } from '../core/reflection';
import { assertPositive } from '../core/units';
import { physicalLength } from '../core/wave';

export interface QuarterWaveInput {
  /** Impedância do sistema (rádio/cabo principal), Ω. */
  z0: number;
  /** Resistência da carga (Ω). Deve ser resistiva no ponto de inserção. */
  loadOhms: number;
  fMHz: number;
  /** Fator de velocidade do cabo usado no transformador. */
  velocityFactor: number;
  /** ROE máxima aceitável para o cálculo da banda (ex.: 2 ou 1,5). */
  maxSwr: number;
  /**
   * Impedância do cabo que você realmente tem para o transformador (ex.: 75 Ω).
   * Se omitida, considera o valor ideal √(Z0·R_L).
   */
  actualLineOhms?: number;
}

export interface QuarterWaveResult {
  /** Impedância ideal do transformador (Ω). */
  idealLineOhms: number;
  /** Impedância usada no cálculo (ideal ou a do cabo informado). */
  lineOhms: number;
  physicalLengthM: number;
  /** Impedância vista na entrada, em f0 (Ω). */
  inputOhms: number;
  /** ROE resultante em f0, em relação a Z0. */
  swrAtCenter: number;
  /**
   * Banda relativa Δf/f0 para ROE ≤ maxSwr (só com o cabo ideal).
   * `Infinity` quando o descasamento nunca passa do limite; `null` quando não se aplica.
   */
  fractionalBandwidth: number | null;
  bandEdgesMHz: { low: number; high: number } | null;
}

/** Banda relativa de Pozar para um transformador ideal de λ/4. */
export function quarterWaveFractionalBandwidth(z0: number, loadOhms: number, maxSwr: number): number {
  assertPositive(z0, 'Z0');
  assertPositive(loadOhms, 'A resistência da carga');
  const gm = gammaFromSwr(maxSwr);
  if (loadOhms === z0 || gm >= 1) return Number.POSITIVE_INFINITY;
  const arg = (gm / Math.sqrt(1 - gm * gm)) * ((2 * Math.sqrt(z0 * loadOhms)) / Math.abs(loadOhms - z0));
  // arg ≥ 1: mesmo no pior caso a ROE não passa do limite.
  if (arg >= 1) return Number.POSITIVE_INFINITY;
  return 2 - (4 / Math.PI) * Math.acos(arg);
}

export function quarterWaveTransformer(input: QuarterWaveInput): QuarterWaveResult {
  const { z0, loadOhms, fMHz, velocityFactor, maxSwr, actualLineOhms } = input;
  assertPositive(z0, 'Z0');
  assertPositive(loadOhms, 'A resistência da carga');
  const idealLineOhms = Math.sqrt(z0 * loadOhms);
  const lineOhms = actualLineOhms ?? idealLineOhms;
  assertPositive(lineOhms, 'A impedância do cabo do transformador');

  const physicalLengthM = physicalLength(0.25, fMHz, velocityFactor);
  const inputOhms = (lineOhms * lineOhms) / loadOhms;
  const swrAtCenter = swrFromImpedance(inputOhms, z0);

  let fractionalBandwidth: number | null = null;
  let bandEdgesMHz: QuarterWaveResult['bandEdgesMHz'] = null;
  if (actualLineOhms === undefined) {
    fractionalBandwidth = quarterWaveFractionalBandwidth(z0, loadOhms, maxSwr);
    if (Number.isFinite(fractionalBandwidth)) {
      bandEdgesMHz = {
        low: fMHz * (1 - fractionalBandwidth / 2),
        high: fMHz * (1 + fractionalBandwidth / 2),
      };
    }
  }

  return {
    idealLineOhms,
    lineOhms,
    physicalLengthM,
    inputOhms,
    swrAtCenter,
    fractionalBandwidth,
    bandEdgesMHz,
  };
}
