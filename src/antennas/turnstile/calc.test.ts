import { describe, expect, it } from 'vitest';
import { abs } from '../../core/complex';
import { calc, defaultParams, quadratureFeed } from './calc';
import { cutList } from './cutlist';

// Referências:
// - Dipolo: L = K·λ/2 (como em antennas/dipole); a 137,5 MHz, λ = 2,18032 m → A = 0,95·1,09016 = 1,03565 m.
// - Linha de 1/4 de onda: λ/4 × VF; a 137,5 MHz com VF 0,66, 0,54508 × 0,66 = 0,35975 m.
// - Refletor a λ/4 (Wikipedia, citando Milligan): 0,54508 m.
// - Alimentação em quadratura: derivação por linha de 1/4 de onda, I_B/I_A = −j·R/Zq; Z = R/2 se Zq = R.

function m(r: ReturnType<typeof calc>, label: string): number {
  const x = r.measurements.find((y) => y.label === label);
  if (!x) throw new Error(`Cota ${label} não encontrada`);
  return x.meters;
}

describe('turnstile: calc', () => {
  const lambda = 299.792458 / 137.5;

  it('dipolos, linha de fase e refletor a 137,5 MHz', () => {
    const r = calc(defaultParams);
    expect(m(r, 'A')).toBeCloseTo(0.95 * lambda / 2, 12);
    expect(m(r, 'B')).toBeCloseTo(m(r, 'A') / 2, 12);
    expect(m(r, 'C')).toBeCloseTo((lambda / 4) * 0.66, 12);
    expect(m(r, 'D')).toBeCloseTo(lambda / 4, 12);
    expect(m(r, 'A')).toBeCloseTo(1.03565, 4);
  });

  it('sem refletor não há cota D', () => {
    const r = calc({ ...defaultParams, reflector: 0 });
    expect(r.measurements.map((x) => x.label)).toEqual(['A', 'B', 'C']);
  });

  it('um erro de 10 % no VF muda a linha de fase em 10 %', () => {
    const a = m(calc({ ...defaultParams, velocityFactor: 0.66 }), 'C');
    const b = m(calc({ ...defaultParams, velocityFactor: 0.726 }), 'C');
    expect(b / a).toBeCloseTo(1.1, 12);
  });

  it('impedância esperada ≈ 36,5 Ω', () => {
    expect(calc(defaultParams).expected.impedance.typical).toBeCloseTo(36.5, 9);
  });

  it('o espaço central conta dentro do comprimento total: A não muda, B = (A − gap)/2 e há cota E', () => {
    const base = calc(defaultParams);
    const r = calc({ ...defaultParams, centerGap: 0.02 });
    expect(m(r, 'A')).toBeCloseTo(m(base, 'A'), 12);
    expect(m(r, 'B')).toBeCloseTo((m(base, 'A') - 0.02) / 2, 12);
    expect(m(r, 'E')).toBeCloseTo(0.02, 12);
    expect(base.measurements.some((x) => x.label === 'E')).toBe(false);
    expect(cutList({ ...defaultParams, centerGap: 0.02 }).find((c) => c.label === 'B')!.meters).toBeCloseTo(m(r, 'B'), 12);
  });

  it('rejeita espaço central negativo ou maior que o dipolo e diâmetro não positivo', () => {
    expect(() => calc({ ...defaultParams, centerGap: -0.01 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, centerGap: 2 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, conductorDiameter: 0 })).toThrow(RangeError);
  });

  it('entradas inválidas', () => {
    expect(() => calc({ ...defaultParams, frequencyMHz: 0 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, velocityFactor: 0 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, shorteningFactor: 1.2 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, reflector: 2 })).toThrow(RangeError);
  });

  it('avisa sobre VF incomum', () => {
    expect(calc({ ...defaultParams, velocityFactor: 0.4 }).warnings.some((w) => w.message.includes('incomum'))).toBe(true);
    expect(calc(defaultParams).warnings.some((w) => w.message.includes('incomum'))).toBe(false);
  });
});

describe('turnstile: alimentação em quadratura', () => {
  it('Zq = R: correntes iguais e Z = R/2', () => {
    const f = quadratureFeed(73, 73);
    expect(f.currentRatio).toBeCloseTo(1, 12);
    expect(f.phaseDeg).toBe(-90);
    expect(abs(f.feedImpedance)).toBeCloseTo(36.5, 12);
  });

  it('Zq ≠ R: correntes desiguais (50 Ω no lugar de 73 Ω → 1,46)', () => {
    expect(quadratureFeed(73, 50).currentRatio).toBeCloseTo(1.46, 12);
  });

  it('entrada inválida', () => {
    expect(() => quadratureFeed(0, 73)).toThrow(RangeError);
  });
});

describe('turnstile: lista de corte', () => {
  it('quatro braços ajustáveis e uma linha de fase', () => {
    const items = cutList(defaultParams);
    expect(items.find((i) => i.label === 'B')!.quantity).toBe(4);
    expect(items.find((i) => i.label === 'C')!.adjustable).toBe(false);
    expect(items.some((i) => i.label === 'D')).toBe(true);
    expect(cutList({ ...defaultParams, reflector: 0 }).some((i) => i.label === 'D')).toBe(false);
  });
});
