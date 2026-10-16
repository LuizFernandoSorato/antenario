import { describe, expect, it } from 'vitest';
import {
  electricalLength,
  electricalLengthDegrees,
  frequencyFromWavelength,
  physicalLength,
  wavelength,
  wavelengthInLine,
} from './wave';

// Referência: λ(m) = 299,792458 / f(MHz) (CLAUDE.md, c exato do SI).
// Tolerância: 1e-9 m (o cálculo é exato a menos de erro de ponto flutuante).
const DIGITS = 9;

describe('wavelength', () => {
  it('casos de referência', () => {
    expect(wavelength(299.792458)).toBeCloseTo(1, DIGITS);
    expect(wavelength(145)).toBeCloseTo(2.067534193, DIGITS); // 2 m (VHF)
    expect(wavelength(14.2)).toBeCloseTo(21.112145, 6); // 20 m (HF)
    expect(wavelength(1090)).toBeCloseTo(0.275038952, DIGITS); // ADS-B
  });

  it('ida e volta frequência ↔ λ', () => {
    expect(frequencyFromWavelength(wavelength(437.8))).toBeCloseTo(437.8, DIGITS);
  });

  it('rejeita frequência inválida', () => {
    expect(() => wavelength(0)).toThrow(RangeError);
    expect(() => wavelength(-10)).toThrow(RangeError);
    expect(() => wavelength(NaN)).toThrow(RangeError);
    expect(() => wavelength(Infinity)).toThrow(RangeError);
  });
});

describe('wavelengthInLine', () => {
  it('cabo com VF 0,66 a 145 MHz', () => {
    expect(wavelengthInLine(145, 0.66)).toBeCloseTo(2.067534193 * 0.66, DIGITS);
  });

  it('rejeita VF fora de (0, 1]', () => {
    expect(() => wavelengthInLine(145, 0)).toThrow(RangeError);
    expect(() => wavelengthInLine(145, 1.1)).toThrow(RangeError);
  });
});

describe('physicalLength', () => {
  it('dipolo de meia onda com K = 0,95 → ≈ 142,4/f(MHz) m', () => {
    // 0,5 × 299,792458 × 0,95 = 142,401418 (o CLAUDE.md arredonda para ≈ 142,5).
    for (const f of [7.1, 14.2, 28.5, 145, 435]) {
      expect(physicalLength(0.5, f, 0.95) * f).toBeCloseTo(142.4014176, 6);
    }
  });

  it('monopolo de 1/4 de onda com K = 0,95 → ≈ 71,2/f(MHz) m', () => {
    // 0,25 × 299,792458 × 0,95 = 71,200709 (o CLAUDE.md arredonda para ≈ 71,3).
    expect(physicalLength(0.25, 145, 0.95) * 145).toBeCloseTo(71.2007088, 6);
  });

  it('quarto de onda de cabo (VF 0,66) a 145 MHz ≈ 341,1 mm', () => {
    expect(physicalLength(0.25, 145, 0.66)).toBeCloseTo(0.341143142, DIGITS);
  });

  it('fator padrão = 1 (espaço livre)', () => {
    expect(physicalLength(1, 145)).toBeCloseTo(wavelength(145), DIGITS);
  });
});

describe('electricalLength', () => {
  it('é o inverso de physicalLength', () => {
    const len = physicalLength(0.25, 145, 0.66);
    expect(electricalLength(len, 145, 0.66)).toBeCloseTo(0.25, 12);
    expect(electricalLengthDegrees(len, 145, 0.66)).toBeCloseTo(90, 10);
  });
});
