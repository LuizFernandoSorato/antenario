/**
 * Faixa de ROE: varredura da impedância em volta de uma frequência e faixa contínua com ROE abaixo de um limite.
 *
 * Mesma técnica dos modelos da double bazooka, do V invertido e da Moxon: a impedância da antena é calculada numa grade grossa
 * (o método dos momentos é caro), interpolada por Lagrange de 4 pontos numa grade fina (perto da ressonância ela varia
 * suavemente com a frequência) e as bordas da faixa são interpoladas linearmente entre os pontos finos.
 *
 * O que varia rápido com a frequência e é barato de calcular (linhas de fase, transformadores de 1/4 de onda) entra depois da
 * interpolação, pela função `feed`, calculada em cada ponto fino.
 */

import { type Complex, complex } from './complex';
import { swrFromImpedance } from './reflection';

export interface SwrBand {
  lowMHz: number;
  highMHz: number;
  /** true quando a ROE não chegou ao limite dentro da varredura (a faixa pode ser maior). */
  open: boolean;
}

export interface SwrPoint {
  fMHz: number;
  swr: number;
  /** Impedância da antena interpolada (antes da rede de alimentação). */
  zAntenna: Complex;
}

export interface SwrSweepInput {
  centerMHz: number;
  /** Meia largura da varredura, em fração de `centerMHz` (0,1 = ±10 %). */
  span: number;
  /** Intervalos da grade grossa (par, para a frequência central ser um ponto dela). */
  coarseSteps: number;
  /** Intervalos da grade fina (par). */
  fineSteps: number;
  /** Impedância da antena, calculada só nos pontos da grade grossa. */
  impedanceAt: (fMHz: number) => Complex;
  /** Rede de alimentação aplicada a cada ponto fino (padrão: nenhuma). */
  feed?: (zAntenna: Complex, fMHz: number) => Complex;
  /** Impedância de referência da ROE (cabo), Ω. */
  referenceOhms: number;
}

export interface SwrSweep {
  sweep: SwrPoint[];
  band2: SwrBand | null;
  band15: SwrBand | null;
  minSwr: number;
  minAtMHz: number;
}

/** Interpolação de Lagrange de 4 pontos numa grade uniforme (valores complexos). */
export function interpolateComplex(grid: readonly number[], values: readonly Complex[], f: number): Complex {
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

/**
 * Faixa contínua com ROE ≤ limite em volta do ponto de menor ROE (que pode não cair na frequência de projeto), com as bordas
 * interpoladas linearmente. `null` se a ROE mínima passa do limite.
 */
export function bandAround(fs: readonly number[], swr: readonly number[], limit: number): SwrBand | null {
  // Serve a qualquer grandeza que deva ficar abaixo de um limite (por exemplo, a razão axial em dB).
  let best = 0;
  for (let i = 1; i < fs.length; i++) if (swr[i]! < swr[best]!) best = i;
  if (!(swr[best]! <= limit)) return null;
  let lo = best;
  while (lo > 0 && swr[lo - 1]! <= limit) lo--;
  let hi = best;
  while (hi < fs.length - 1 && swr[hi + 1]! <= limit) hi++;
  const cross = (i: number, j: number) =>
    Number.isFinite(swr[j]!) ? fs[i]! + ((limit - swr[i]!) * (fs[j]! - fs[i]!)) / (swr[j]! - swr[i]!) : fs[i]!;
  return {
    lowMHz: lo === 0 ? fs[0]! : cross(lo, lo - 1),
    highMHz: hi === fs.length - 1 ? fs[hi]! : cross(hi, hi + 1),
    open: lo === 0 || hi === fs.length - 1,
  };
}

export function bandWidthMHz(band: SwrBand): number {
  return band.highMHz - band.lowMHz;
}

export function swrSweep(input: SwrSweepInput): SwrSweep {
  const { centerMHz: f0, span, coarseSteps, fineSteps } = input;
  if (!(span > 0 && span < 1) || coarseSteps < 4 || coarseSteps % 2 !== 0 || fineSteps < coarseSteps || fineSteps % 2 !== 0) {
    throw new RangeError('Varredura de ROE inválida: meia largura entre 0 e 1 e número par de intervalos (grossa ≥ 4, fina ≥ grossa).');
  }
  const grid: number[] = [];
  const zs: Complex[] = [];
  for (let i = 0; i <= coarseSteps; i++) {
    const f = f0 * (1 - span + (2 * span * i) / coarseSteps);
    grid.push(f);
    zs.push(input.impedanceAt(f));
  }
  const fs: number[] = [];
  const swr: number[] = [];
  const za: Complex[] = [];
  for (let i = 0; i <= fineSteps; i++) {
    const f = f0 * (1 - span + (2 * span * i) / fineSteps);
    const z = interpolateComplex(grid, zs, f);
    fs.push(f);
    za.push(z);
    swr.push(swrFromImpedance(input.feed ? input.feed(z, f) : z, input.referenceOhms));
  }
  let best = 0;
  for (let i = 1; i < fs.length; i++) if (swr[i]! < swr[best]!) best = i;
  return {
    sweep: fs.map((f, i) => ({ fMHz: f, swr: swr[i]!, zAntenna: za[i]! })),
    band2: bandAround(fs, swr, 2),
    band15: bandAround(fs, swr, 1.5),
    minSwr: swr[best]!,
    minAtMHz: fs[best]!,
  };
}
