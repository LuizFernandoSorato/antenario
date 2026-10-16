/**
 * Linha de transmissão de dois condutores paralelos no ar (escada, twin-lead sem
 * dielétrico, seção de casamento do J-pole).
 */

import { assertPositive } from '../core/units';

/**
 * Impedância intrínseca do vácuo η0 = μ0·c ≈ 376,73 Ω.
 * Fonte: CODATA 2018 (μ0 ≈ 4π × 10⁻⁷ H/m; após a revisão do SI de 2019, valor medido).
 */
const ETA0_OHMS = 376.730313668;

function assertGeometry(spacing: number, diameter: number): void {
  assertPositive(spacing, 'O espaçamento entre condutores');
  assertPositive(diameter, 'O diâmetro do condutor');
  if (spacing <= diameter) {
    throw new RangeError('O espaçamento (centro a centro) deve ser maior que o diâmetro do condutor.');
  }
}

/**
 * Impedância característica (Ω) de dois fios paralelos no ar, fórmula exata.
 * Z0 = (η0/π)·acosh(D/d).
 * Fonte: Kraus, Antennas; Pozar, Microwave Engineering, 4ª ed., tabela 2.1.
 *
 * @param spacing distância D entre os centros dos condutores (m)
 * @param diameter diâmetro d de cada condutor (m)
 */
export function parallelWireImpedance(spacing: number, diameter: number): number {
  assertGeometry(spacing, diameter);
  return (ETA0_OHMS / Math.PI) * Math.acosh(spacing / diameter);
}

/**
 * Aproximação clássica Z0 ≈ 276·log10(2D/d), válida para D ≫ d.
 * Fonte: ARRL Antenna Book, capítulo sobre linhas de transmissão.
 */
export function parallelWireImpedanceApprox(spacing: number, diameter: number): number {
  assertGeometry(spacing, diameter);
  return 276 * Math.log10((2 * spacing) / diameter);
}
