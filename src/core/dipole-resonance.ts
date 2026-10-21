/**
 * Fator de encurtamento K do dipolo de meia onda em função do diâmetro do condutor, pelo método dos momentos (core/mom.ts).
 *
 * K = comprimento ressonante (X = 0) / (λ/2), no espaço livre, fio reto, alimentação no centro. O resultado só depende de d/λ, então
 * o modelo roda em λ = 1 m. É o mesmo cálculo que dá a curva "K × razão λ/2d" do ARRL Antenna Book, mas aqui obtido do modelo, não
 * lido do livro (que não foi consultado). Validação (teste): L. B. Cebik, W4RNL (NEC-4, AWG #12 a 3,75 MHz: 127,7 pés) e os
 * pontos da curva do ARRL lidos pelo projeto webantenna (fonte secundária).
 */

import { type Vec3, solveWires } from './mom';
import { SPEED_OF_LIGHT_M_PER_S } from './units';

/**
 * Faixa conferida (teste de convergência). Acima de 5e-3 λ (λ/2d < 100) o trecho fica curto perto do raio e a aproximação de fio
 * fino falha: em 1e-2 λ, 40 e 80 trechos já diferem 0,6 %, em sentidos opostos. Abaixo de 1e-6 λ não foi testado (em 1,8 MHz, 1e-6 λ
 * é um fio de 0,17 mm).
 */
export const DIPOLE_K_MIN_DIAMETER_LAMBDA = 1e-6;
export const DIPOLE_K_MAX_DIAMETER_LAMBDA = 5e-3;

/** Trechos do fio (par, para haver um nó no centro). Com 40, K muda ≤ 0,12 % em relação a 80 em toda a faixa (teste). */
const SEGMENTS = 40;
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
 */
export function dipoleShorteningFactor(diameterLambda: number, segments = SEGMENTS): number {
  if (!(diameterLambda >= DIPOLE_K_MIN_DIAMETER_LAMBDA && diameterLambda <= DIPOLE_K_MAX_DIAMETER_LAMBDA)) {
    throw new RangeError(
      `O diâmetro de ${diameterLambda} λ está fora da faixa do modelo (${DIPOLE_K_MIN_DIAMETER_LAMBDA} a ${DIPOLE_K_MAX_DIAMETER_LAMBDA} λ).`,
    );
  }
  const key = `${diameterLambda}|${segments}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  // Secante sobre a reatância, entre 0,44 e 0,5 λ (a ressonância de um fio fino fica em ≈ 0,47–0,49 λ).
  const radius = diameterLambda / 2;
  const x = (l: number) => reactance(l, radius, segments);
  let l0 = 0.46;
  let l1 = 0.49;
  let x0 = x(l0);
  let x1 = x(l1);
  for (let it = 0; it < 30 && Math.abs(x1) > 1e-4; it++) {
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
