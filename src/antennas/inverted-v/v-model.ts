/**
 * Modelo do V invertido pelo método dos momentos (core/mom.ts), no espaço livre.
 *
 * Geometria: um fio único que desce do ápice (ponto de alimentação, gap no nó central) até as duas pontas, com os braços no
 * plano xz e o ângulo entre eles (ápice) dado. Ápice de 180° = dipolo reto.
 *
 * O modelo acha o comprimento que ressoa (X = 0) na frequência de projeto, para o V e para o dipolo reto do mesmo fio. A razão
 * entre os dois é o quanto o V precisa ser mais comprido que o dipolo. Validação (teste): L. B. Cebik, W4RNL, "80-Meter Dipoles
 * and Inverted-Vs: A Graphical Scrapbook" (NEC-4, espaço livre, fio AWG #12 a 3,75 MHz; espelho em
 * https://antenna2.github.io/cebik/content/wire/80dp.pdf).
 */

import { type Complex, complex } from '../../core/complex';
import { type Vec3, solveWires } from '../../core/mom';
import { swrFromImpedance } from '../../core/reflection';
import { wavelength } from '../../core/wave';

export interface InvertedVModelInput {
  frequencyMHz: number;
  /** Ângulo entre os braços, em graus (180 = dipolo reto). */
  apexAngleDeg: number;
  /** Raio do fio, em metros. */
  radiusM: number;
  /** Impedância de referência para a ROE (cabo de alimentação), Ω. */
  referenceOhms: number;
  /** Trechos do fio (par). Padrão: 30; usado no teste de convergência. */
  segments?: number;
}

export interface VBand {
  lowMHz: number;
  highMHz: number;
  /** true quando a ROE não chegou ao limite dentro da varredura. */
  open: boolean;
}

export interface VSweepPoint {
  fMHz: number;
  swr: number;
}

export interface InvertedVModel {
  /** Comprimento total ressonante do V (ponta a ponta pelo fio), em λ. */
  resonantLengthLambda: number;
  /** Comprimento ressonante do dipolo reto do mesmo fio, em λ. */
  dipoleLengthLambda: number;
  /** Impedância do V ressonante na frequência de projeto. */
  z: Complex;
  /** Diretividade do V (dBi, sem perdas). */
  directivityDbi: number;
  /** Diretividade do dipolo reto ressonante (dBi), para comparação. */
  dipoleDirectivityDbi: number;
  band2: VBand | null;
  band15: VBand | null;
  sweep: VSweepPoint[];
  /** Campo distante do V ressonante: potência relativa na direção `dir` (x ao longo da projeção dos braços, z para cima). */
  power: (dir: Vec3) => number;
}

/** Trechos do fio (par, para haver um nó no ápice). Com 30 a razão de comprimentos muda < 0,1 % em relação a 60 (teste). */
const SEGMENTS = 30;
/** Varredura de ±15 % em passos de 1 %, interpolada para 601 pontos (mesma técnica da double bazooka). */
const SPAN = 0.15;
const COARSE_STEPS = 30;
const FINE_STEPS = 600;

function points(lengthM: number, apexRad: number, segments: number): Vec3[] {
  const half = segments / 2;
  const leg = lengthM / 2;
  const sx = Math.sin(apexRad / 2);
  const sz = Math.cos(apexRad / 2);
  const pts: Vec3[] = [];
  for (let i = 0; i <= segments; i++) {
    // De −1 (ponta esquerda) a +1 (ponta direita), passando pelo ápice em 0.
    const u = (i - half) / half;
    pts.push([u * leg * sx, 0, -Math.abs(u) * leg * sz]);
  }
  return pts;
}

function solve(lengthM: number, apexRad: number, radiusM: number, fMHz: number, segments: number) {
  return solveWires([{ points: points(lengthM, apexRad, segments), radius: radiusM }], fMHz, [
    { wire: 0, node: segments / 2, volts: { re: 1, im: 0 } },
  ]);
}

function impedance(lengthM: number, apexRad: number, radiusM: number, fMHz: number, segments: number): Complex {
  const z = solve(lengthM, apexRad, radiusM, fMHz, segments).inputImpedance(0);
  return complex(z.re, z.im);
}

/** Comprimento (em λ) que ressoa em f, pelo método da secante sobre a reatância. */
function resonantLength(apexRad: number, radiusM: number, fMHz: number, segments: number): number {
  const lambda = wavelength(fMHz);
  const x = (l: number) => impedance(l * lambda, apexRad, radiusM, fMHz, segments).im;
  let l0 = 0.47;
  let l1 = 0.5;
  let x0 = x(l0);
  let x1 = x(l1);
  for (let it = 0; it < 30 && Math.abs(x1) > 1e-3; it++) {
    const l2 = l1 - (x1 * (l1 - l0)) / (x1 - x0);
    l0 = l1;
    x0 = x1;
    l1 = Math.min(0.6, Math.max(0.4, l2));
    x1 = x(l1);
  }
  return l1;
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

function bandAround(fs: readonly number[], swr: readonly number[], center: number, limit: number): VBand | null {
  if (swr[center]! > limit) return null;
  let lo = center;
  while (lo > 0 && swr[lo - 1]! <= limit) lo--;
  let hi = center;
  while (hi < fs.length - 1 && swr[hi + 1]! <= limit) hi++;
  const cross = (i: number, j: number) => fs[i]! + ((limit - swr[i]!) * (fs[j]! - fs[i]!)) / (swr[j]! - swr[i]!);
  return {
    lowMHz: lo === 0 ? fs[0]! : cross(lo, lo - 1),
    highMHz: hi === fs.length - 1 ? fs[hi]! : cross(hi, hi + 1),
    open: lo === 0 || hi === fs.length - 1,
  };
}

export function bandWidthMHz(band: VBand): number {
  return band.highMHz - band.lowMHz;
}

const cache = new Map<string, InvertedVModel>();

export function invertedVModel(input: InvertedVModelInput): InvertedVModel {
  const segments = input.segments ?? SEGMENTS;
  const key = [input.frequencyMHz, input.apexAngleDeg, input.radiusM, input.referenceOhms, segments].join('|');
  const hit = cache.get(key);
  if (hit) return hit;

  const f0 = input.frequencyMHz;
  const apex = (input.apexAngleDeg * Math.PI) / 180;
  const lambda = wavelength(f0);
  const lengthLambda = resonantLength(apex, input.radiusM, f0, segments);
  const dipoleLambda = input.apexAngleDeg === 180 ? lengthLambda : resonantLength(Math.PI, input.radiusM, f0, segments);
  const lengthM = lengthLambda * lambda;

  const sol = solve(lengthM, apex, input.radiusM, f0, segments);
  const z0 = sol.inputImpedance(0);
  // O máximo do V fica na direção perpendicular ao plano dos braços (eixo y).
  const directivity = sol.directivity([0, 1, 0]);
  const dipoleSol = solve(dipoleLambda * lambda, Math.PI, input.radiusM, f0, segments);
  const dipoleDirectivity = dipoleSol.directivity([0, 1, 0]);

  const grid: number[] = [];
  const zs: Complex[] = [];
  for (let i = 0; i <= COARSE_STEPS; i++) {
    const f = f0 * (1 - SPAN + (2 * SPAN * i) / COARSE_STEPS);
    grid.push(f);
    zs.push(impedance(lengthM, apex, input.radiusM, f, segments));
  }
  const fs: number[] = [];
  const swr: number[] = [];
  for (let i = 0; i <= FINE_STEPS; i++) {
    const f = f0 * (1 - SPAN + (2 * SPAN * i) / FINE_STEPS);
    fs.push(f);
    swr.push(swrFromImpedance(interpolate(grid, zs, f), input.referenceOhms));
  }
  const center = FINE_STEPS / 2;

  const model: InvertedVModel = {
    resonantLengthLambda: lengthLambda,
    dipoleLengthLambda: dipoleLambda,
    z: complex(z0.re, z0.im),
    directivityDbi: 10 * Math.log10(directivity),
    dipoleDirectivityDbi: 10 * Math.log10(dipoleDirectivity),
    band2: bandAround(fs, swr, center, 2),
    band15: bandAround(fs, swr, center, 1.5),
    sweep: fs.map((f, i) => ({ fMHz: f, swr: swr[i]! })),
    power: sol.power,
  };
  if (cache.size > 16) cache.clear();
  cache.set(key, model);
  return model;
}
