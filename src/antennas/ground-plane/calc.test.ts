import { describe, expect, it } from 'vitest';
import { dipoleShorteningFactor } from '../../core/dipole-resonance';
import { calc as dipoleCalc, defaultParams as dipoleDefaults } from '../dipole/calc';
import { calc, defaultParams, estimateImpedance } from './calc';

// Referências:
// - λ/4 × K, com λ = 299,792458/f (CLAUDE.md) e K do dipolo do mesmo condutor (teoria das imagens; modelo conferido em
//   core/dipole-resonance.test.ts). Tolerância: 1e-9 m.
// - Regra clássica do ARRL Antenna Book: L(pés) = 234/f(MHz), ou seja, 234 × 0,3048 = 71,323 m·MHz (K ≈ 0,9516). Com fio de 2 mm
//   o K do modelo dá de −1,5 a +3 % em relação a ela, de 435 a 7 MHz (no UHF o fio de 2 mm já é "grosso").
// - Geometria dos radiais inclinados: trigonometria simples (alcance = r·cos θ,
//   queda = r·sin θ).

const C = 299.792458;
const ARRL_234_M_MHZ = 234 * 0.3048;

function measure(result: ReturnType<typeof calc>, label: string): number {
  const m = result.measurements.find((x) => x.label === label);
  if (!m) throw new Error(`Cota ${label} não encontrada`);
  return m.meters;
}

describe('ground plane 1/4 de onda: calc', () => {
  it('radiador e radiais a 145 MHz com o K do diâmetro (2 mm: ≈ 496 mm)', () => {
    const r = calc({ ...defaultParams, frequencyMHz: 145 });
    const k = dipoleShorteningFactor(0.002 / (C / 145));
    expect(measure(r, 'A')).toBeCloseTo((0.25 * C * k) / 145, 9);
    expect(measure(r, 'B')).toBeCloseTo(measure(r, 'A'), 12);
    expect(r.assumptions.some((a) => /pelo diâmetro/.test(a.value))).toBe(true);
  });

  it('condutor mais grosso, radiador mais curto', () => {
    const thin = measure(calc({ ...defaultParams, conductorDiameter: 0.001 }), 'A');
    const thick = measure(calc({ ...defaultParams, conductorDiameter: 0.01 }), 'A');
    expect(thick).toBeLessThan(thin);
  });

  it('geometria dos radiais a 45°', () => {
    const r = calc({ ...defaultParams, frequencyMHz: 145, droopAngleDeg: 45 });
    const b = measure(r, 'B');
    expect(measure(r, 'C')).toBeCloseTo(b * Math.SQRT1_2, 12);
    expect(measure(r, 'D')).toBeCloseTo(b * Math.SQRT1_2, 12);
  });

  it('radiais horizontais: sem cota de queda', () => {
    const r = calc({ ...defaultParams, droopAngleDeg: 0 });
    expect(measure(r, 'C')).toBeCloseTo(measure(r, 'B'), 12);
    expect(r.measurements.some((m) => m.label === 'D')).toBe(false);
  });

  it('fica perto da regra 234/f do ARRL (−1,5 a +3 % com fio de 2 mm)', () => {
    for (const f of [7.1, 28.5, 50.1, 145, 435]) {
      const ours = measure(calc({ ...defaultParams, frequencyMHz: f }), 'A');
      const arrl = ARRL_234_M_MHZ / f;
      expect(ours / arrl - 1).toBeGreaterThan(-0.015);
      expect(ours / arrl - 1).toBeLessThan(0.03);
    }
  });

  // ARRL Antenna Book, 21ª ed., p. 6-19: Fig 35 (lida a ±0,3 Ω) e o texto "R_R = 50 Ω when the radials are sloped downward
  // at an angle of 45°". Tolerância de 0,5 Ω, a da leitura da figura.
  it('impedância segue a Fig 35 do ARRL (≈ 22,5 Ω a 0°, 50 Ω a 45°, ≈ 59 Ω a 80°)', () => {
    expect(estimateImpedance(0)).toBeCloseTo(22.5, 9);
    expect(Math.abs(estimateImpedance(45) - 50)).toBeLessThan(0.5);
    expect(estimateImpedance(80)).toBeCloseTo(58.8, 9);
    expect(estimateImpedance(42.5)).toBeCloseTo((47.6 + 50.4) / 2, 9);
  });

  it('impedância não decresce com a inclinação, fica no valor de 80° acima disso e acompanha o parâmetro', () => {
    let prev = -Infinity;
    for (let a = 0; a <= 89; a += 1) {
      const z = estimateImpedance(a);
      expect(z).toBeGreaterThanOrEqual(prev);
      prev = z;
    }
    expect(estimateImpedance(85)).toBe(estimateImpedance(80));
    const lo = calc({ ...defaultParams, droopAngleDeg: 0 }).expected.impedance.typical!;
    const hi = calc({ ...defaultParams, droopAngleDeg: 60 }).expected.impedance.typical!;
    expect(lo).toBeCloseTo(22.5, 9);
    expect(hi).toBeGreaterThan(lo);
    expect(calc({ ...defaultParams, droopAngleDeg: 85 }).warnings.some((w) => /só até 80°/.test(w.message))).toBe(true);
    expect(calc({ ...defaultParams, droopAngleDeg: 80 }).warnings.some((w) => /só até 80°/.test(w.message))).toBe(false);
  });

  it('valores esperados: 5,15 dBi só como limite teórico (plano infinito)', () => {
    const r = calc(defaultParams);
    expect(r.expected.gain.max).toBe(5.15);
    expect(r.expected.gain.typical).toBeUndefined();
  });

  it('banda indicativa: a 45° (≈ 50 Ω) a ROE mínima é ≈ 1 e a banda relativa passa a do dipolo do mesmo fio em 50 Ω', () => {
    const b = calc(defaultParams).expected.bandwidth!;
    const dipole = dipoleCalc({ ...dipoleDefaults, frequencyMHz: 145, conductorDiameter: 0.002 }).expected.bandwidth!;
    expect(b.unit).toBe('MHz');
    expect(b.typical!).toBeGreaterThan(dipole.typical!);
    expect(b.note).toMatch(/indicativa/i);
  });

  it('banda indicativa: radiais horizontais (≈ 22,5 Ω) não chegam a 2:1 em 50 Ω; a 20° (≈ 35 Ω) a faixa de 1,5:1 encolhe', () => {
    // 50/22,5 ≈ 2,2: sem faixa de 2:1. A 20° a ROE mínima é 50/35,1 ≈ 1,42: ainda há faixa de 1,5:1, mais estreita que a 45°.
    const horizontal = calc({ ...defaultParams, droopAngleDeg: 0 }).expected.bandwidth!;
    expect(horizontal.typical).toBeUndefined();
    expect(horizontal.note).toMatch(/Não chega a ROE 2:1/);
    const width15 = (angle: number) => {
      const note = calc({ ...defaultParams, droopAngleDeg: angle }).expected.bandwidth!.note;
      return Number(/< 1,5:1 em ([\d,]+) MHz/.exec(note)![1]!.replace(',', '.'));
    };
    expect(width15(20)).toBeLessThan(width15(45));
  });

  it('rejeita entradas inválidas', () => {
    expect(() => calc({ ...defaultParams, frequencyMHz: -1 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, conductorDiameter: 0 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, radialCount: 1 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, radialCount: 3.5 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, droopAngleDeg: 90 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, droopAngleDeg: -5 })).toThrow(RangeError);
  });
});
