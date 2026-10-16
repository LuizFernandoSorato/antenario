import { describe, expect, it } from 'vitest';
import { type Complex, abs, add, complex, exp, mul, scale, sub } from '../core/complex';
import { reflectionCoefficient, swrFromImpedance } from '../core/reflection';
import { findCable } from '../data/coax-cables';
import {
  FOOT_IN_METERS,
  analyzeFeedline,
  attenuationDbPer100m,
  inputSwr,
  matchedLossDb,
  maxPowerW,
  peakVoltage,
  totalLossDb,
} from './coax';
import { DB_PER_NEPER } from './transmission-line';

const rg213 = findCable('belden-8267')!;
const rg58 = findCable('belden-8259')!;
const rg6 = findCable('belden-1694a')!;
const lmr400 = findCable('times-lmr-400')!;

describe('perda casada a partir do datasheet', () => {
  it('pé internacional = 0,3048 m', () => {
    expect(FOOT_IN_METERS).toBeCloseTo(0.3048, 15);
  });

  it('RG-213 a 100 MHz: 1,9 dB/100 pés → 6,234 dB/100 m', () => {
    expect(attenuationDbPer100m(rg213, 100)).toBeCloseTo(1.9 / 0.3048, 10);
  });

  it('100 pés (30,48 m) de RG-213 a 100 MHz perdem exatamente 1,9 dB', () => {
    expect(matchedLossDb(rg213, 100, 30.48)).toBeCloseTo(1.9, 10);
  });

  it('RG-58 a 145 MHz (interpolado entre 100 e 200 MHz)', () => {
    const n = Math.log(8.1 / 5.4) / Math.log(2);
    const expected = (5.4 * 1.45 ** n) / 0.3048;
    expect(attenuationDbPer100m(rg58, 145)).toBeCloseTo(expected, 10);
  });

  it('fora da tabela → null', () => {
    expect(attenuationDbPer100m(lmr400, 14.2)).toBeNull(); // tabela começa em 30 MHz
    expect(matchedLossDb(lmr400, 14.2, 10)).toBeNull();
  });

  it('potência máxima interpolada; null sem dado', () => {
    expect(maxPowerW(rg213, 100)).toBe(748);
    expect(maxPowerW(rg58, 100)).toBeNull();
  });
});

/**
 * Verificação independente da fórmula de perda total: simula a linha com perdas
 * calculando tensão e corrente complexas na entrada e na carga, e compara P_in/P_carga.
 * V(d) = V⁺·e^(γd)·(1 + Γ_L·e^(−2γd)),  I(d) = (V⁺/Z0)·e^(γd)·(1 − Γ_L·e^(−2γd)),
 * com d medido a partir da carga (Pozar, §2.7).
 */
function simulatedLossDb(zLoad: Complex, z0: number, lossDb: number, betaL: number): number {
  const gammaL = reflectionCoefficient(zLoad, z0);
  const gl = complex(lossDb / DB_PER_NEPER, betaL);
  const power = (d: Complex) => {
    const fwd = exp(d);
    const refl = mul(gammaL, exp(scale(d, -1)));
    const v = add(fwd, refl);
    const i = scale(sub(fwd, refl), 1 / z0);
    return 0.5 * (v.re * i.re + v.im * i.im); // ½·Re(V·I*)
  };
  return 10 * Math.log10(power(gl) / power(complex(0, 0)));
}

describe('perda total com ROE', () => {
  it('ROE 1:1 → perda total = perda casada', () => {
    expect(totalLossDb(2.5, 1)).toBeCloseTo(2.5, 12);
  });

  it('confere com a simulação de V e I na linha (cargas resistivas e complexas)', () => {
    const cases: [Complex, number, number][] = [
      [complex(150), 1, 0.7],
      [complex(25), 3, 2.1],
      [complex(30, 40), 0.5, 1.3],
      [complex(80, -120), 6, 0.2],
    ];
    for (const [zl, loss, betaL] of cases) {
      const swr = swrFromImpedance(zl, 50);
      expect(totalLossDb(loss, swr)).toBeCloseTo(simulatedLossDb(zl, 50, loss, betaL), 9);
    }
  });

  it('carga em curto/aberto (ROE infinita) → perda infinita', () => {
    expect(totalLossDb(1, Infinity)).toBe(Infinity);
  });

  it('ROE na entrada: 3 dB de cabo transformam ROE 3:1 em ≈ 1,67:1', () => {
    // |Γ_in| = 0,5 · 10^(−0,3) = 0,2506 → ROE = 1,669
    expect(inputSwr(3, 3)).toBeCloseTo((1 + 0.5 * 10 ** -0.3) / (1 - 0.5 * 10 ** -0.3), 12);
  });

  it('|Γ_in| confere com a simulação (Γ atenua e^(−2αl))', () => {
    const zl = complex(30, 40);
    const loss = 1.3;
    const gL = abs(reflectionCoefficient(zl, 50));
    const gl = complex(loss / DB_PER_NEPER, 0.9);
    const gIn = abs(mul(reflectionCoefficient(zl, 50), exp(scale(gl, -2))));
    expect(gIn).toBeCloseTo(gL * 10 ** (-loss / 10), 12);
    expect(inputSwr(loss, swrFromImpedance(zl, 50))).toBeCloseTo((1 + gIn) / (1 - gIn), 10);
  });
});

describe('tensão de pico', () => {
  it('100 W em 50 Ω casado → 100 V de pico', () => {
    expect(peakVoltage(100, 50, 1)).toBeCloseTo(100, 12);
  });
  it('mesma potência com ROE 4:1 → o dobro', () => {
    expect(peakVoltage(100, 50, 4)).toBeCloseTo(200, 12);
  });
  it('confere com V_max = |V⁺|(1+|Γ|) e P = |V⁺|²(1−|Γ|²)/(2·Z0)', () => {
    const g = 0.4;
    const vPlus = 120;
    const p = (vPlus * vPlus * (1 - g * g)) / 100;
    expect(peakVoltage(p, 50, (1 + g) / (1 - g))).toBeCloseTo(vPlus * (1 + g), 10);
  });
});

describe('analyzeFeedline', () => {
  it('20 m de RG-213 a 145 MHz, ROE 1,5, 50 W', () => {
    const r = analyzeFeedline({ cable: rg213, fMHz: 145, lengthM: 20, swrAtLoad: 1.5, powerW: 50 });
    const ml = matchedLossDb(rg213, 145, 20)!;
    expect(r.matchedLossDb).toBeCloseTo(ml, 12);
    expect(r.totalLossDb).toBeCloseTo(totalLossDb(ml, 1.5), 12);
    expect(r.powerAtLoadW).toBeCloseTo(50 * 10 ** (-r.totalLossDb! / 10), 10);
    expect(r.warnings.some((w) => w.level === 'danger')).toBe(false);
  });

  it('avisa quando a potência passa do datasheet', () => {
    const r = analyzeFeedline({ cable: rg213, fMHz: 435, lengthM: 10, swrAtLoad: 1, powerW: 1000 });
    expect(r.warnings.some((w) => w.level === 'danger' && /excede/.test(w.message))).toBe(true);
  });

  it('cabo sem dado de potência: perigo ao transmitir, nada ao receber', () => {
    const tx = analyzeFeedline({ cable: rg6, fMHz: 145, lengthM: 10, swrAtLoad: 1, powerW: 10 });
    expect(tx.warnings.some((w) => w.level === 'danger')).toBe(true);
    const rx = analyzeFeedline({ cable: rg6, fMHz: 145, lengthM: 10, swrAtLoad: 1, powerW: 0 });
    expect(rx.warnings.some((w) => w.level === 'danger')).toBe(false);
    expect(rx.peakVoltageV).toBeNull();
  });

  it('frequência fora da tabela: não calcula perda e avisa', () => {
    const r = analyzeFeedline({ cable: lmr400, fMHz: 7.1, lengthM: 30, swrAtLoad: 1, powerW: 100 });
    expect(r.totalLossDb).toBeNull();
    expect(r.warnings[0]!.message).toMatch(/fora da tabela/);
  });

  it('comprimento elétrico em λ dentro do cabo', () => {
    const r = analyzeFeedline({ cable: rg213, fMHz: 145, lengthM: 1, swrAtLoad: 1, powerW: 0 });
    expect(r.electricalLengthWavelengths).toBeCloseTo(1 / ((299.792458 / 145) * 0.66), 12);
  });
});
