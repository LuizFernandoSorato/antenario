import { describe, expect, it } from 'vitest';
import { add, complex, div, mul, scale, sub } from '../core/complex';
import { propagationProduct } from '../lines/transmission-line';
import { halfWaveBalun } from './coax-balun';

// Referências: ARRL Antenna Book (balun 4:1 de meia onda).
// Conferência independente: simula o circuito com a matriz ABCD da linha sem perdas
// (Pozar, §4.4): V1 = cos(βl)·V2 + jZ0·sin(βl)·I2;  I1 = (j·sin(βl)/Z0)·V2 + cos(βl)·I2.
// O terminal A da carga balanceada R recebe a entrada direto; o terminal B recebe a
// saída do laço. Z_in = V_A / (I_A + I_laço) deve dar R/4.

function simulatedInputImpedance(r: number, z0: number, betaL: number) {
  const c = Math.cos(betaL);
  const s = Math.sin(betaL);
  // Incógnita: tensão no terminal B (V2). Com V_A = 1:
  // corrente na carga de A para B: I_R = (1 − V2)/R; ela entra na saída do laço: I2 = −I_R.
  // Entrada do laço ligada em A: V1 = 1 = c·V2 + jZ0·s·I2. Resolve para V2.
  // 1 = c·V2 − jZ0·s·(1 − V2)/R  →  V2·(c + jZ0·s/R) = 1 + jZ0·s/R
  const k = complex(0, (z0 * s) / r);
  const v2 = div(add(complex(1), k), add(complex(c), k));
  const iR = scale(sub(complex(1), v2), 1 / r);
  const i2 = scale(iR, -1);
  const i1 = add(mul(complex(0, s / z0), v2), scale(i2, c));
  return div(complex(1), add(iR, i1));
}

describe('halfWaveBalun', () => {
  it('145 MHz com RG-213 (VF 0,66): laço = 0,66 · λ/2', () => {
    const r = halfWaveBalun({ fMHz: 145, unbalancedOhms: 50, velocityFactor: 0.66 });
    expect(r.loopLengthM).toBeCloseTo((0.5 * 299.792458 * 0.66) / 145, 12);
    expect(r.balancedOhms).toBe(200);
  });

  it('fase do laço = 180°', () => {
    const r = halfWaveBalun({ fMHz: 145, unbalancedOhms: 50, velocityFactor: 0.66 });
    const gl = propagationProduct({ z0: 50, lengthM: r.loopLengthM, velocityFactor: 0.66 }, 145);
    expect(gl.im).toBeCloseTo(Math.PI, 12);
  });

  it('simulação do circuito: carga balanceada de 200 Ω aparece como 50 Ω', () => {
    const zin = simulatedInputImpedance(200, 50, Math.PI);
    expect(zin.re).toBeCloseTo(50, 10);
    expect(zin.im).toBeCloseTo(0, 10);
  });

  it('fora da frequência de projeto a relação deixa de ser 4:1 (banda estreita)', () => {
    const zin = simulatedInputImpedance(200, 50, Math.PI * 1.1);
    expect(Math.abs(zin.re - 50) + Math.abs(zin.im)).toBeGreaterThan(1);
  });

  it('rejeita entradas inválidas', () => {
    expect(() => halfWaveBalun({ fMHz: 145, unbalancedOhms: 0, velocityFactor: 0.66 })).toThrow(RangeError);
    expect(() => halfWaveBalun({ fMHz: 145, unbalancedOhms: 50, velocityFactor: 1.1 })).toThrow(RangeError);
  });
});
