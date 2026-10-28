/**
 * Fator de encurtamento K do dipolo de meia onda em função do diâmetro do condutor, pelo método dos momentos (core/mom.ts).
 *
 * K = comprimento ressonante (X = 0) / (λ/2), no espaço livre, fio reto, alimentação no centro. O resultado só depende de d/λ, então
 * o modelo roda em λ = 1 m. É o mesmo cálculo que dá a curva "K × razão λ/2d" do ARRL Antenna Book (21ª ed., p. 2-5, Fig 8,
 * NEC-4.1). Validação (teste): essa figura (0,3 %), a Fig 7 do mesmo livro (#14, 0,488 λ) e L. B. Cebik, W4RNL (NEC-4, AWG #12 a
 * 3,75 MHz: 127,7 pés). O Rothammel ("Antene", Fig. 3.7) dá K de 1,3 a 2,8 % maior; divergência registrada na nota de K.
 */

import { type Vec3, solveWires } from './mom';
import { SPEED_OF_LIGHT_M_PER_S } from './units';

/**
 * Faixa conferida (testes de convergência). O núcleo reduzido de fio fino só vale com trechos de pelo menos ≈ 3 raios: com trechos
 * menores o resultado dispara (em 1e-2 λ, 60 trechos já sobem K e 120 dão lixo). Por isso o número de trechos cai com o diâmetro
 * (ver `segmentsFor`), e o limite de cima é onde ainda cabem 20 trechos. Abaixo de 1e-8 λ não foi testado (1e-8 λ é um fio de
 * 0,02 mm em 160 m).
 */
export const DIPOLE_K_MIN_DIAMETER_LAMBDA = 1e-8;
export const DIPOLE_K_MAX_DIAMETER_LAMBDA = 1.5e-2;

/** Máximo de trechos (fios finos): com 80, K fica a < 0,03 % do valor com 120. */
const MAX_SEGMENTS = 80;
/** Trecho mínimo, em raios (ver acima). */
const MIN_SEGMENT_RADII = 3;
/** Comprimento ressonante mínimo esperado na faixa (≈ 0,46 λ), usado só para escolher o número de trechos. */
const SHORTEST_LAMBDA = 0.46;

/**
 * Número de trechos (par) para o diâmetro: o maior possível até 80, com trechos de pelo menos 3 raios. No limite de cima dá 20;
 * com 20 trechos K sai ≈ 0,2 % acima do convergido (antena um pouco comprida, o lado seguro para o ajuste).
 */
export function segmentsFor(diameterLambda: number): number {
  const byRadius = SHORTEST_LAMBDA / (MIN_SEGMENT_RADII * (diameterLambda / 2));
  return Math.min(MAX_SEGMENTS, 2 * Math.floor(byRadius / 2));
}

/** Frequência em que λ = 1 m. */
const F_UNIT_LAMBDA_MHZ = SPEED_OF_LIGHT_M_PER_S / 1e6;

function reactance(lengthLambda: number, radiusLambda: number, segments: number): number {
  const pts: Vec3[] = [];
  for (let i = 0; i <= segments; i++) pts.push([0, 0, (i / segments - 0.5) * lengthLambda]);
  const sol = solveWires([{ points: pts, radius: radiusLambda }], F_UNIT_LAMBDA_MHZ, [
    { wire: 0, node: segments / 2, volts: { re: 1, im: 0 } },
  ]);
  return sol.inputImpedance(0).im;
}

const cache = new Map<string, number>();

/**
 * K = L_ressonante / (λ/2) para um condutor de diâmetro `diameterLambda` (em λ).
 * Fora de [DIPOLE_K_MIN_DIAMETER_LAMBDA, DIPOLE_K_MAX_DIAMETER_LAMBDA] lança RangeError.
 * `segments` (par) só serve aos testes de convergência; o padrão vem de `segmentsFor`.
 */
export function dipoleShorteningFactor(diameterLambda: number, segments = segmentsFor(diameterLambda)): number {
  if (!(diameterLambda >= DIPOLE_K_MIN_DIAMETER_LAMBDA && diameterLambda <= DIPOLE_K_MAX_DIAMETER_LAMBDA)) {
    throw new RangeError(
      `O diâmetro de ${diameterLambda} λ está fora da faixa do modelo (${DIPOLE_K_MIN_DIAMETER_LAMBDA} a ${DIPOLE_K_MAX_DIAMETER_LAMBDA} λ).`,
    );
  }
  const key = `${diameterLambda}|${segments}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  // Secante sobre a reatância (a ressonância fica entre ≈ 0,46 e 0,495 λ na faixa).
  const radius = diameterLambda / 2;
  const x = (l: number) => reactance(l, radius, segments);
  let l0 = 0.46;
  let l1 = 0.49;
  let x0 = x(l0);
  let x1 = x(l1);
  for (let it = 0; it < 30 && Math.abs(x1) > 1e-4 && x1 !== x0; it++) {
    const l2 = l1 - (x1 * (l1 - l0)) / (x1 - x0);
    l0 = l1;
    x0 = x1;
    l1 = Math.min(0.5, Math.max(0.4, l2));
    x1 = x(l1);
  }
  const k = 2 * l1;
  if (cache.size > 64) cache.clear();
  cache.set(key, k);
  return k;
}
