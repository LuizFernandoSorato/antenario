import { describe, expect, it } from 'vitest';
import { calc, defaultParams } from './calc';

// Referências:
// - λ/4 × K, com λ = 299,792458/f (CLAUDE.md). K = 0,95 → 71,2007/f(MHz) m.
// - Regra clássica do ARRL Antenna Book: L(pés) = 234/f(MHz), ou seja,
//   234 × 0,3048 = 71,323 m·MHz. Nosso K = 0,95 deve ficar a menos de 0,2 %.
// - Geometria dos radiais inclinados: trigonometria simples (alcance = r·cos θ,
//   queda = r·sin θ).

/** 0,25 × 299,792458 × 0,95 (valor exato do método). */
const QUARTER_WAVE_K095 = 0.25 * 299.792458 * 0.95;
const ARRL_234_M_MHZ = 234 * 0.3048;

function measure(result: ReturnType<typeof calc>, label: string): number {
  const m = result.measurements.find((x) => x.label === label);
  if (!m) throw new Error(`Cota ${label} não encontrada`);
  return m.meters;
}

describe('ground plane 1/4 de onda: calc', () => {
  it('radiador e radiais a 145 MHz, K = 0,95', () => {
    const r = calc({ ...defaultParams, frequencyMHz: 145 });
    expect(measure(r, 'A')).toBeCloseTo(QUARTER_WAVE_K095 / 145, 9); // ≈ 491 mm
    expect(measure(r, 'B')).toBeCloseTo(QUARTER_WAVE_K095 / 145, 9);
  });

  it('fator dos radiais independente do radiador', () => {
    const r = calc({ ...defaultParams, frequencyMHz: 100, radialFactor: 1 });
    expect(measure(r, 'B')).toBeCloseTo(0.25 * 2.99792458, 9);
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

  it('concorda com a regra 234/f do ARRL a menos de 0,2 %', () => {
    for (const f of [7.1, 28.5, 50.1, 145, 435]) {
      const ours = measure(calc({ ...defaultParams, frequencyMHz: f }), 'A');
      const arrl = ARRL_234_M_MHZ / f;
      expect(Math.abs(ours - arrl) / arrl).toBeLessThan(0.002);
    }
  });

  it('valores esperados: 36,5 Ω e 5,15 dBi só como limite teórico (plano infinito)', () => {
    const r = calc(defaultParams);
    expect(r.expected.impedance.typical).toBe(36.5);
    expect(r.expected.gain.max).toBe(5.15);
    expect(r.expected.gain.typical).toBeUndefined();
    expect(r.expected.bandwidth).toBeNull();
  });

  it('rejeita entradas inválidas', () => {
    expect(() => calc({ ...defaultParams, frequencyMHz: -1 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, radialFactor: 0 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, radialCount: 1 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, radialCount: 3.5 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, droopAngleDeg: 90 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, droopAngleDeg: -5 })).toThrow(RangeError);
  });
});
