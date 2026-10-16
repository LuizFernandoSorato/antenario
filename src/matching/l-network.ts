/**
 * Rede L: dois elementos reativos (L e/ou C) que casam uma carga Z_L = R_L + jX_L
 * com uma fonte/linha de impedância real Z0.
 *
 * Duas topologias:
 * - "shunt-at-load": elemento em paralelo junto à carga, elemento em série do lado da fonte.
 *   Funciona quando R_L > Z0 (entre outros casos).
 * - "series-at-load": elemento em série junto à carga, elemento em paralelo do lado da fonte.
 *   Funciona quando R_L < Z0.
 *
 * Fórmulas analíticas (X = reatância série, B = susceptância paralela):
 *   shunt-at-load:  B = [X_L ± √(R_L/Z0)·√(R_L² + X_L² − Z0·R_L)] / (R_L² + X_L²)
 *                   X = 1/B + X_L·Z0/R_L − Z0/(B·R_L)
 *   series-at-load: X = ±√(R_L·(Z0 − R_L)) − X_L
 *                   B = ±√((Z0 − R_L)/R_L) / Z0
 * Fonte: Pozar, Microwave Engineering, 4ª ed., §5.1 (Matching with Lumped Elements).
 *
 * Cada solução é conferida numericamente (Z_in = Z0) antes de ser devolvida.
 */

import { type Complex, abs, add, complex, mul, reciprocal, sub, toComplex } from '../core/complex';
import { assertFrequencyMHz, assertPositive } from '../core/units';

export type LTopology = 'shunt-at-load' | 'series-at-load';

export interface ReactiveComponent {
  kind: 'inductor' | 'capacitor';
  /** Valor em henries (indutor) ou farads (capacitor). */
  value: number;
  /** Reatância do componente como impedância, em ohms (positiva = indutiva). */
  reactanceOhms: number;
  /** Tensão de pico sobre o componente para a potência informada (V). */
  peakVoltageV: number;
  /** Corrente eficaz no componente para a potência informada (A). */
  rmsCurrentA: number;
}

export interface LNetworkSolution {
  topology: LTopology;
  /** Reatância série X (Ω). */
  seriesReactance: number;
  /** Susceptância paralela B (S); 0 = elemento paralelo ausente. */
  shuntSusceptance: number;
  series: ReactiveComponent | null;
  shunt: ReactiveComponent | null;
  /** Passa-baixas (L série + C paralelo): ajuda a atenuar harmônicos em TX. */
  lowPass: boolean;
  /** Impedância de entrada obtida (deve ser ≈ Z0). */
  inputImpedance: Complex;
}

export interface LNetworkInput {
  zLoad: number | Complex;
  z0: number;
  fMHz: number;
  /** Potência de TX aplicada à rede (W), para estimar tensões e correntes. 0 = só RX. */
  powerW: number;
}

/** Impedância de entrada de uma rede L com valores X e B dados. */
export function lNetworkInputImpedance(zLoad: Complex, topology: LTopology, x: number, b: number): Complex {
  const jx = complex(0, x);
  const jb = complex(0, b);
  if (topology === 'shunt-at-load') {
    return add(reciprocal(add(reciprocal(zLoad), jb)), jx);
  }
  const z1 = add(zLoad, jx);
  return b === 0 ? z1 : reciprocal(add(reciprocal(z1), jb));
}

function makeComponent(
  reactanceOhms: number,
  omega: number,
  peakVoltageV: number,
  peakCurrentA: number,
): ReactiveComponent {
  const kind = reactanceOhms > 0 ? 'inductor' : 'capacitor';
  const value = kind === 'inductor' ? reactanceOhms / omega : -1 / (omega * reactanceOhms);
  return { kind, value, reactanceOhms, peakVoltageV, rmsCurrentA: peakCurrentA / Math.SQRT2 };
}

/** Tensões e correntes nos elementos, com a rede (sem perdas) entregando `powerW` à carga. */
function componentStress(zl: Complex, topology: LTopology, x: number, b: number, z0: number, powerW: number) {
  const vin = Math.sqrt(2 * powerW * z0); // pico, referência de fase 0
  const iin = vin / z0;
  if (topology === 'shunt-at-load') {
    // Corrente de entrada passa pelo elemento série; a tensão na carga é Vin − Iin·jX.
    const vLoad = abs(sub(complex(vin), complex(0, iin * x)));
    return {
      series: { v: iin * Math.abs(x), i: iin },
      shunt: { v: vLoad, i: vLoad * Math.abs(b) },
    };
  }
  // Paralelo na entrada vê Vin; o ramo série + carga recebe Vin/(Z_L + jX).
  const iBranch = abs(reciprocal(add(zl, complex(0, x)))) * vin;
  return {
    series: { v: iBranch * Math.abs(x), i: iBranch },
    shunt: { v: vin, i: vin * Math.abs(b) },
  };
}

export function designLNetwork(input: LNetworkInput): LNetworkSolution[] {
  const { z0, fMHz, powerW } = input;
  assertPositive(z0, 'Z0');
  assertFrequencyMHz(fMHz);
  if (!Number.isFinite(powerW) || powerW < 0) {
    throw new RangeError(`A potência deve ser ≥ 0 W (recebido: ${powerW}).`);
  }
  const zl = toComplex(input.zLoad);
  const { re: rl, im: xl } = zl;
  if (!Number.isFinite(rl) || !Number.isFinite(xl) || rl <= 0) {
    throw new RangeError('A resistência da carga deve ser positiva: uma reatância pura não pode ser casada.');
  }
  const omega = 2 * Math.PI * fMHz * 1e6;

  const candidates: { topology: LTopology; x: number; b: number }[] = [];

  // Topologia com elemento paralelo junto à carga.
  const disc1 = rl * rl + xl * xl - z0 * rl;
  if (disc1 >= 0) {
    const root = Math.sqrt(rl / z0) * Math.sqrt(disc1);
    for (const sign of [1, -1]) {
      const b = (xl + sign * root) / (rl * rl + xl * xl);
      if (b === 0) continue;
      const x = 1 / b + (xl * z0) / rl - z0 / (b * rl);
      candidates.push({ topology: 'shunt-at-load', x, b });
    }
  }

  // Topologia com elemento série junto à carga.
  if (rl <= z0) {
    const rootX = Math.sqrt(rl * (z0 - rl));
    const rootB = Math.sqrt((z0 - rl) / rl) / z0;
    for (const sign of [1, -1]) {
      candidates.push({ topology: 'series-at-load', x: sign * rootX - xl, b: sign * rootB });
    }
  }

  const solutions: LNetworkSolution[] = [];
  const seen = new Set<string>();
  for (const { topology, x, b } of candidates) {
    const zin = lNetworkInputImpedance(zl, topology, x, b);
    // Confere o casamento (tolerância relativa a Z0).
    if (Math.abs(zin.re - z0) > 1e-6 * z0 || Math.abs(zin.im) > 1e-6 * z0) continue;
    const key = `${topology}:${x.toPrecision(9)}:${b.toPrecision(9)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const stress = componentStress(zl, topology, x, b, z0, powerW);
    const series = Math.abs(x) > 1e-12 * z0 ? makeComponent(x, omega, stress.series.v, stress.series.i) : null;
    const shunt = b !== 0 ? makeComponent(-1 / b, omega, stress.shunt.v, stress.shunt.i) : null;
    solutions.push({
      topology,
      seriesReactance: x,
      shuntSusceptance: b,
      series,
      shunt,
      lowPass: series?.kind === 'inductor' && shunt?.kind === 'capacitor',
      inputImpedance: zin,
    });
  }
  return solutions;
}

/** Potência entregue à carga pela solução (para conferência): ½·|I_carga|²·R_L. */
export function deliveredPower(zLoad: Complex, solution: LNetworkSolution, z0: number, powerW: number): number {
  const vin = Math.sqrt(2 * powerW * z0);
  const { topology, seriesReactance: x, shuntSusceptance: b } = solution;
  let iLoad: number;
  if (topology === 'shunt-at-load') {
    const iin = complex(vin / z0);
    const vLoad = sub(complex(vin), mul(iin, complex(0, x)));
    iLoad = abs(mul(vLoad, reciprocal(zLoad)));
  } else {
    iLoad = vin * abs(reciprocal(add(zLoad, complex(0, x))));
  }
  return 0.5 * iLoad * iLoad * zLoad.re;
}
