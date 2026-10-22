import { describe, expect, it } from 'vitest';
import { dipoleShorteningFactor } from '../../core/dipole-resonance';
import { calc as groundPlaneCalc } from '../ground-plane/calc';
import { calc, defaultParams } from './calc';

// Referência: λ/4 × K com λ = 299,792458/f (CLAUDE.md) e K do diâmetro (core/dipole-resonance.ts). A 1090 MHz com fio de 2 mm
// (d/λ ≈ 0,0073) K ≈ 0,935: ≈ 64,3 mm. Tolerância declarada: 1e-9 m.

function measure(result: ReturnType<typeof calc>, label: string): number {
  const m = result.measurements.find((x) => x.label === label);
  if (!m) throw new Error(`Cota ${label} não encontrada`);
  return m.meters;
}

describe('ADS-B 1090 MHz: calc', () => {
  it('radiador e radiais ≈ 64 mm', () => {
    const r = calc(defaultParams);
    const k = dipoleShorteningFactor(0.002 / (299.792458 / 1090));
    expect(measure(r, 'A')).toBeCloseTo((0.25 * 299.792458 * k) / 1090, 9);
    expect(measure(r, 'A') * 1000).toBeGreaterThan(63.5);
    expect(measure(r, 'A') * 1000).toBeLessThan(65);
  });

  it('mesmas cotas do ground plane na mesma frequência', () => {
    expect(calc(defaultParams).measurements).toEqual(groundPlaneCalc(defaultParams).measurements);
  });

  it('só recepção: sem aviso de TX, com aviso para não transmitir', () => {
    const w = calc(defaultParams).warnings;
    expect(w.some((x) => x.level === 'danger')).toBe(false);
    expect(w.some((x) => x.message.includes('Não transmita'))).toBe(true);
  });

  it('rejeita frequência inválida', () => {
    expect(() => calc({ ...defaultParams, frequencyMHz: 0 })).toThrow(RangeError);
  });
});
