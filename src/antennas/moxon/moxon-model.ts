/**
 * Moxon (retângulo de Moxon): equações de projeto do Cebik e modelo por momentos.
 *
 * Equações: L. B. Cebik, W4RNL, "Designing Moxon Rectangles by Equation and by Model" (AntenneX, set. 2000; espelho em
 * https://antenna2.github.io/cebik/content/moxon/moxgen.html). Regressão sobre modelos NEC otimizados para F/C máxima e
 * ≈ 50 Ω, com x = log10(diâmetro em λ), válida de 1e-5 a 1e-2 λ:
 *   A = −0,0008571428571·x² − 0,009571428571·x + 0,3398571429   (largura, lado a lado)
 *   B = −0,002142857143·x² − 0,02035714286·x + 0,008285714286   (cauda do excitado)
 *   C =  0,001809523381·x² + 0,01780952381·x + 0,05164285714    (folga entre as pontas)
 *   D =  0,001·x + 0,07178571429                                  (cauda do refletor)
 *   E = B + C + D                                                 (profundidade, frente a trás)
 * Os mesmos coeficientes estão no MoxGen (J. E. Davis, https://jedsoft.org/slang/slshapps/moxgen.sl).
 * Dimensões entre os eixos dos fios, com cantos vivos (Cebik, "Building a 2-Meter Moxon": dobrar com raio pequeno, com o meio da
 * curva no ponto do canto, deu o mesmo resultado dos modelos de canto vivo).
 *
 * Modelo: dois fios em U, sem junções (core/mom.ts), espaço livre. Refletor em y = 0, excitado em y = E; o feixe aponta para +y
 * (do refletor para o excitado). Fonte no meio do lado A do excitado.
 */

import { type Complex, complex } from '../../core/complex';
import { type Vec3, solveWires } from '../../core/mom';
import { swrFromImpedance } from '../../core/reflection';
import { wavelength } from '../../core/wave';

/** Dimensões em λ (ou em metros, depois de multiplicar por λ). */
export interface MoxonDimensions {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
}

/** Faixa de diâmetros (em λ) dos modelos que geraram a regressão. */
export const MOXON_MIN_DIAMETER_LAMBDA = 1e-5;
export const MOXON_MAX_DIAMETER_LAMBDA = 1e-2;

/** Dimensões em λ pelas equações do Cebik, para o diâmetro do condutor em λ. */
export function moxonDimensionsLambda(diameterLambda: number): MoxonDimensions {
  const x = Math.log10(diameterLambda);
  const a = -0.0008571428571 * x * x - 0.009571428571 * x + 0.3398571429;
  const b = -0.002142857143 * x * x - 0.02035714286 * x + 0.008285714286;
  const c = 0.001809523381 * x * x + 0.01780952381 * x + 0.05164285714;
  const d = 0.001 * x + 0.07178571429;
  return { a, b, c, d, e: b + c + d };
}

export interface MoxonModelInput {
  frequencyMHz: number;
  /** Dimensões em metros. */
  dims: MoxonDimensions;
  radiusM: number;
  /** Impedância de referência para a ROE, Ω. */
  referenceOhms: number;
  /** Trechos por λ de fio (padrão 200); usado no teste de convergência. */
  segmentsPerLambda?: number | undefined;
}

export interface MoxonBand {
  lowMHz: number;
  highMHz: number;
  open: boolean;
}

export interface MoxonModel {
  z: Complex;
  /** Diretividade (dBi, sem perdas) na direção do feixe. */
  gainDbi: number;
  /** Relação frente-costas a 180° (dB). */
  frontToBackDb: number;
  band2: MoxonBand | null;
  band15: MoxonBand | null;
  sweep: { fMHz: number; swr: number }[];
  /** Potência relativa na direção `dir` (x lado a lado, y para a frente, z perpendicular ao plano da antena). */
  power: (dir: Vec3) => number;
}

/** Com 100 trechos/λ os fios grossos ainda não convergem (R 3 Ω abaixo); com 200 ficam a ±2 Ω do NEC do Cebik (teste). */
const SEGMENTS_PER_LAMBDA = 200;
/** Varredura de ±10 % em passos de 1 %, interpolada para 401 pontos. */
export const SPAN = 0.1;
const COARSE_STEPS = 20;
const FINE_STEPS = 400;

function polyline(corners: readonly Vec3[], segLen: number, evenFirstLeg = false): Vec3[] {
  const pts: Vec3[] = [corners[0]!];
  for (let i = 1; i < corners.length; i++) {
    const p = corners[i - 1]!;
    const q = corners[i]!;
    const len = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
    let n = Math.max(1, Math.round(len / segLen));
    // O lado A do excitado precisa de um número par de trechos (nó da fonte no meio).
    if (evenFirstLeg && i === 2 && n % 2 === 1) n++;
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      pts.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t]);
    }
  }
  return pts;
}

function geometry(dims: MoxonDimensions, segLen: number) {
  const h = dims.a / 2;
  const driver = polyline(
    [
      [-h, dims.e - dims.b, 0],
      [-h, dims.e, 0],
      [h, dims.e, 0],
      [h, dims.e - dims.b, 0],
    ],
    segLen,
    true,
  );
  const reflector = polyline(
    [
      [-h, dims.d, 0],
      [-h, 0, 0],
      [h, 0, 0],
      [h, dims.d, 0],
    ],
    segLen,
  );
  // Nó do meio do lado A: os vértices do excitado são cauda (nB trechos), lado A (nA, par), cauda.
  const nB = Math.max(1, Math.round(dims.b / segLen));
  const nA = driver.length - 1 - 2 * nB;
  return { driver, reflector, feedNode: nB + nA / 2 };
}

function solveAt(input: MoxonModelInput, fMHz: number) {
  const segLen = wavelength(input.frequencyMHz) / (input.segmentsPerLambda ?? SEGMENTS_PER_LAMBDA);
  const g = geometry(input.dims, segLen);
  return solveWires(
    [
      { points: g.driver, radius: input.radiusM },
      { points: g.reflector, radius: input.radiusM },
    ],
    fMHz,
    [{ wire: 0, node: g.feedNode, volts: { re: 1, im: 0 } }],
  );
}

/** Interpolação de Lagrange de 4 pontos numa grade uniforme (valores complexos). */
function interpolate(grid: readonly number[], values: readonly Complex[], f: number): Complex {
  const step = grid[1]! - grid[0]!;
  const i = Math.min(Math.max(Math.floor((f - grid[0]!) / step) - 1, 0), grid.length - 4);
  let re = 0;
  let im = 0;
  for (let a = i; a < i + 4; a++) {
    let w = 1;
    for (let b = i; b < i + 4; b++) if (b !== a) w *= (f - grid[b]!) / (grid[a]! - grid[b]!);
    re += w * values[a]!.re;
    im += w * values[a]!.im;
  }
  return complex(re, im);
}

function bandAround(fs: readonly number[], swr: readonly number[], center: number, limit: number): MoxonBand | null {
  // O mínimo da ROE pode não cair exatamente na frequência de projeto: parte do ponto de menor ROE.
  let best = center;
  for (let i = 0; i < fs.length; i++) if (swr[i]! < swr[best]!) best = i;
  if (swr[best]! > limit) return null;
  let lo = best;
  while (lo > 0 && swr[lo - 1]! <= limit) lo--;
  let hi = best;
  while (hi < fs.length - 1 && swr[hi + 1]! <= limit) hi++;
  const cross = (i: number, j: number) => fs[i]! + ((limit - swr[i]!) * (fs[j]! - fs[i]!)) / (swr[j]! - swr[i]!);
  return {
    lowMHz: lo === 0 ? fs[0]! : cross(lo, lo - 1),
    highMHz: hi === fs.length - 1 ? fs[hi]! : cross(hi, hi + 1),
    open: lo === 0 || hi === fs.length - 1,
  };
}

export function bandWidthMHz(band: MoxonBand): number {
  return band.highMHz - band.lowMHz;
}

const cache = new Map<string, MoxonModel>();

export function moxonModel(input: MoxonModelInput): MoxonModel {
  const { dims } = input;
  const key = [input.frequencyMHz, dims.a, dims.b, dims.c, dims.d, input.radiusM, input.referenceOhms, input.segmentsPerLambda].join('|');
  const hit = cache.get(key);
  if (hit) return hit;

  const f0 = input.frequencyMHz;
  const sol = solveAt(input, f0);
  const z = sol.inputImpedance(0);
  const forward: Vec3 = [0, 1, 0];
  const gain = sol.directivity(forward);
  const fb = 10 * Math.log10(sol.power(forward) / sol.power([0, -1, 0]));

  const grid: number[] = [];
  const zs: Complex[] = [];
  for (let i = 0; i <= COARSE_STEPS; i++) {
    const f = f0 * (1 - SPAN + (2 * SPAN * i) / COARSE_STEPS);
    grid.push(f);
    const zi = i === COARSE_STEPS / 2 ? z : solveAt(input, f).inputImpedance(0);
    zs.push(complex(zi.re, zi.im));
  }
  const fs: number[] = [];
  const swr: number[] = [];
  for (let i = 0; i <= FINE_STEPS; i++) {
    const f = f0 * (1 - SPAN + (2 * SPAN * i) / FINE_STEPS);
    fs.push(f);
    swr.push(swrFromImpedance(interpolate(grid, zs, f), input.referenceOhms));
  }

  const model: MoxonModel = {
    z: complex(z.re, z.im),
    gainDbi: 10 * Math.log10(gain),
    frontToBackDb: fb,
    band2: bandAround(fs, swr, FINE_STEPS / 2, 2),
    band15: bandAround(fs, swr, FINE_STEPS / 2, 1.5),
    sweep: fs.map((f, i) => ({ fMHz: f, swr: swr[i]! })),
    power: sol.power,
  };
  if (cache.size > 16) cache.clear();
  cache.set(key, model);
  return model;
}
