/**
 * Modelo da impedância de entrada da double bazooka: dipolo em paralelo com dois tocos de coaxial em série.
 *
 * Circuito (ARRL Antenna Book, 20ª ed., 2003, p. 9.6–9.7, como descrito por C. Turner, ZS6GM, "The Great Double Bazooka
 * Antenna Debate", https://www.zs6stn.org.za/ResourceArticles/Download/17; a mesma análise de W. Maxwell, W2DU, Reflections II,
 * cap. 18, que NÃO foi lido: TODO(fonte)): a face EXTERNA da malha e os fios das pontas formam o dipolo; por DENTRO, cada
 * metade do coaxial é um toco de λ/4 em curto na ponta. No centro, a malha é cortada e o vivo é contínuo, então os dois tocos
 * ficam em SÉRIE entre os terminais, em PARALELO com o dipolo:
 *
 *   Z_entrada = Z_dipolo ∥ 2·Z_toco,   Z_toco = Z0·tanh(γl)   (lines/transmission-line.ts, Pozar §2.7).
 *
 * Z_dipolo vem do método dos momentos (core/mom.ts) no espaço livre, com o fio todo do diâmetro externo do coaxial. A perda do
 * toco usa a atenuação do datasheet do cabo (lines/coax.ts); sem tabela na frequência, o toco é tratado sem perdas e o modelo avisa.
 *
 * O dipolo é "ajustado": o comprimento é escolhido para ressoar (X = 0) na frequência de projeto, como acontece depois de
 * aparar os fios das pontas. Os tocos têm λ/4 elétrico nessa frequência. A comparação com o dipolo comum usa o MESMO fio,
 * então a diferença de banda vem só dos tocos.
 */

import { type Complex, complex, parallel, reciprocal, scale } from '../../core/complex';
import { solveWires, type Vec3 } from '../../core/mom';
import { swrFromImpedance } from '../../core/reflection';
import { wavelength } from '../../core/wave';
import { shortedStubImpedance } from '../../lines/transmission-line';

export interface StubCable {
  /** Impedância característica (Ω). */
  z0: number;
  velocityFactor: number;
  /** Atenuação casada (dB/m) na frequência; `null` = sem dado do fabricante. */
  attenuationDbPerM: (fMHz: number) => number | null;
}

export interface BazookaModelInput {
  frequencyMHz: number;
  /** Raio externo do condutor irradiante (malha do coaxial), em metros. */
  radiusM: number;
  cable: StubCable;
  /** Impedância de referência para a ROE (cabo de alimentação), Ω. */
  referenceOhms: number;
  /** Trechos do dipolo no modelo (par). Padrão: 30; usado no teste de convergência. */
  segments?: number;
}

/** Faixa contínua em torno da frequência de projeto com ROE abaixo de um limite. */
export interface Band {
  lowMHz: number;
  highMHz: number;
  /** true quando a ROE não chegou ao limite dentro da varredura (a borda é a da varredura). */
  open: boolean;
}

export interface SweepPoint {
  fMHz: number;
  swrBazooka: number;
  swrDipole: number;
}

export interface BazookaModel {
  /** Comprimento do dipolo ressonante do modelo, em comprimentos de onda (espaço livre). */
  resonantLengthLambda: number;
  zDipole: Complex;
  zBazooka: Complex;
  /** Perda nos tocos (dB) na frequência de projeto: potência dissipada neles em relação à entregue. */
  stubLossDb: number;
  /** Maior perda nos tocos dentro da faixa de ROE < 2:1 da bazooka (dB). */
  stubLossMaxDb: number;
  band2: { bazooka: Band | null; dipole: Band | null };
  band15: { bazooka: Band | null; dipole: Band | null };
  /** false quando a tabela do cabo não cobre a frequência e o toco foi tratado sem perdas. */
  lossKnown: boolean;
  sweep: SweepPoint[];
}

/** Trechos do dipolo (par, para haver um nó no centro). Com 30 a banda muda < 1 % em relação a 60: ver o teste de convergência. */
const SEGMENTS = 30;
/** Varredura de ±15 % em passos de 1 %: o dipolo é calculado nesses pontos e interpolado entre eles. */
export const SPAN = 0.15;
const COARSE_STEPS = 30;
const FINE_STEPS = 600;

function dipoleImpedance(lengthM: number, radiusM: number, fMHz: number, segments: number): Complex {
  const pts: Vec3[] = [];
  for (let i = 0; i <= segments; i++) pts.push([0, 0, -lengthM / 2 + (lengthM * i) / segments]);
  const z = solveWires([{ points: pts, radius: radiusM }], fMHz, [{ wire: 0, node: segments / 2, volts: { re: 1, im: 0 } }]).inputImpedance(0);
  return complex(z.re, z.im);
}

/** Comprimento (em λ) do dipolo de raio dado que ressoa em f, pelo método da secante sobre a reatância. */
function resonantLength(radiusM: number, fMHz: number, segments: number): number {
  const lambda = wavelength(fMHz);
  const x = (l: number) => dipoleImpedance(l * lambda, radiusM, fMHz, segments).im;
  let l0 = 0.46;
  let l1 = 0.49;
  let x0 = x(l0);
  let x1 = x(l1);
  for (let it = 0; it < 30 && Math.abs(x1) > 1e-3; it++) {
    const l2 = l1 - (x1 * (l1 - l0)) / (x1 - x0);
    l0 = l1;
    x0 = x1;
    l1 = Math.min(0.5, Math.max(0.4, l2));
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

/** Faixa contínua com ROE ≤ limite em volta do índice `center`, com as bordas interpoladas linearmente. */
function bandAround(fs: readonly number[], swr: readonly number[], center: number, limit: number): Band | null {
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

/** Fração (dB) da potência entregue que se perde nos tocos: P_toco/P_total = Re(Y_toco)/Re(Y_toco + Y_dipolo). */
function stubLossDb(zDipole: Complex, zStubs: Complex): number {
  const yd = reciprocal(zDipole);
  const ys = reciprocal(zStubs);
  const fraction = ys.re / (ys.re + yd.re);
  return -10 * Math.log10(1 - fraction);
}

const cache = new Map<string, BazookaModel>();

export function bazookaModel(input: BazookaModelInput): BazookaModel {
  const { frequencyMHz: f0, radiusM, cable, referenceOhms, segments = SEGMENTS } = input;
  const attKey = [1 - SPAN, 1, 1 + SPAN].map((x) => cable.attenuationDbPerM(f0 * x));
  const key = JSON.stringify([f0, radiusM, segments, cable.z0, cable.velocityFactor, referenceOhms, attKey]);
  const hit = cache.get(key);
  if (hit) return hit;

  const lambda0 = wavelength(f0);
  const lRes = resonantLength(radiusM, f0, segments);
  const lengthM = lRes * lambda0;
  const stubLength = (lambda0 * cable.velocityFactor) / 4;

  let lossKnown = true;
  const zStubs = (f: number): Complex => {
    const att = cable.attenuationDbPerM(f);
    if (att === null) lossKnown = false;
    const z = shortedStubImpedance({ z0: cable.z0, lengthM: stubLength, velocityFactor: cable.velocityFactor, attenuationDbPerM: att ?? 0 }, f);
    return scale(z, 2);
  };

  const coarse: number[] = [];
  const zCoarse: Complex[] = [];
  for (let i = 0; i <= COARSE_STEPS; i++) {
    const f = f0 * (1 - SPAN + (2 * SPAN * i) / COARSE_STEPS);
    coarse.push(f);
    zCoarse.push(dipoleImpedance(lengthM, radiusM, f, segments));
  }

  const fs: number[] = [];
  const swrB: number[] = [];
  const swrD: number[] = [];
  const zB: Complex[] = [];
  const zD: Complex[] = [];
  for (let i = 0; i <= FINE_STEPS; i++) {
    const f = f0 * (1 - SPAN + (2 * SPAN * i) / FINE_STEPS);
    const zd = interpolate(coarse, zCoarse, f);
    const zb = parallel(zd, zStubs(f));
    fs.push(f);
    zD.push(zd);
    zB.push(zb);
    swrD.push(swrFromImpedance(zd, referenceOhms));
    swrB.push(swrFromImpedance(zb, referenceOhms));
  }

  const center = FINE_STEPS / 2;
  const zDipole = dipoleImpedance(lengthM, radiusM, f0, segments);
  const zStubs0 = zStubs(f0);
  const band2b = bandAround(fs, swrB, center, 2);
  let stubLossMaxDb = stubLossDb(zDipole, zStubs0);
  if (band2b) {
    for (let i = 0; i < fs.length; i++) {
      if (fs[i]! >= band2b.lowMHz && fs[i]! <= band2b.highMHz) {
        stubLossMaxDb = Math.max(stubLossMaxDb, stubLossDb(zD[i]!, zStubs(fs[i]!)));
      }
    }
  }

  const model: BazookaModel = {
    resonantLengthLambda: lRes,
    zDipole,
    zBazooka: parallel(zDipole, zStubs0),
    stubLossDb: stubLossDb(zDipole, zStubs0),
    stubLossMaxDb,
    band2: { bazooka: band2b, dipole: bandAround(fs, swrD, center, 2) },
    band15: { bazooka: bandAround(fs, swrB, center, 1.5), dipole: bandAround(fs, swrD, center, 1.5) },
    lossKnown,
    sweep: fs.map((f, i) => ({ fMHz: f, swrBazooka: swrB[i]!, swrDipole: swrD[i]! })),
  };
  if (cache.size > 16) cache.clear();
  cache.set(key, model);
  return model;
}

/** Largura de uma faixa em MHz. */
export function bandWidthMHz(band: Band): number {
  return band.highMHz - band.lowMHz;
}
