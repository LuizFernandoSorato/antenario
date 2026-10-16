import { describe, expect, it } from 'vitest';
import { abs, complex } from './complex';
import {
  deliveredPowerFraction,
  gammaFromReturnLoss,
  gammaFromSwr,
  mismatchLossDb,
  reflectedPowerFraction,
  reflectionCoefficient,
  reflectionMagnitude,
  returnLossDb,
  swrFromGamma,
  swrFromImpedance,
} from './reflection';

// Referências: fórmulas fechadas (Pozar, Microwave Engineering, 4ª ed., §2.3).
// Valores de ROE ↔ perda de retorno ↔ perda por descasamento conferidos com a
// tabela de ROE do ARRL Antenna Book (ROE 1,5 → RL 14,0 dB / ML 0,18 dB;
// ROE 2,0 → RL 9,5 dB / ML 0,51 dB). Tolerância: 4 casas decimais.

describe('reflectionCoefficient', () => {
  it('carga casada → Γ = 0', () => {
    expect(reflectionMagnitude(50, 50)).toBe(0);
  });

  it('100 Ω em linha de 50 Ω → Γ = +1/3', () => {
    const g = reflectionCoefficient(100, 50);
    expect(g.re).toBeCloseTo(1 / 3, 12);
    expect(g.im).toBeCloseTo(0, 12);
  });

  it('25 Ω em linha de 50 Ω → Γ = −1/3', () => {
    expect(reflectionCoefficient(25, 50).re).toBeCloseTo(-1 / 3, 12);
  });

  it('50 + j50 Ω em linha de 50 Ω → Γ = 0,2 + j0,4', () => {
    // Γ = j50 / (100 + j50) = (2500 + j5000) / 12500
    const g = reflectionCoefficient(complex(50, 50), 50);
    expect(g.re).toBeCloseTo(0.2, 12);
    expect(g.im).toBeCloseTo(0.4, 12);
  });

  it('curto-circuito → Γ = −1; reatância pura → |Γ| = 1', () => {
    expect(reflectionCoefficient(0, 50).re).toBeCloseTo(-1, 12);
    expect(abs(reflectionCoefficient(complex(0, 73), 50))).toBeCloseTo(1, 12);
  });

  it('dipolo ideal (≈ 73 Ω) em 75 Ω e em 50 Ω', () => {
    expect(swrFromImpedance(73, 75)).toBeCloseTo(75 / 73, 12);
    expect(swrFromImpedance(73, 50)).toBeCloseTo(1.46, 12);
  });

  it('rejeita entradas inválidas', () => {
    expect(() => reflectionCoefficient(50, 0)).toThrow(RangeError);
    expect(() => reflectionCoefficient(-10, 50)).toThrow(RangeError);
    expect(() => reflectionCoefficient(complex(NaN, 0), 50)).toThrow(RangeError);
  });
});

describe('ROE ↔ |Γ|', () => {
  it('ROE para cargas resistivas = Z_L/Z_0 ou Z_0/Z_L', () => {
    expect(swrFromImpedance(100, 50)).toBeCloseTo(2, 12);
    expect(swrFromImpedance(25, 50)).toBeCloseTo(2, 12);
    expect(swrFromImpedance(300, 50)).toBeCloseTo(6, 12);
  });

  it('ROE de 50 + j50 Ω em 50 Ω ≈ 2,618', () => {
    // |Γ| = √0,2 ≈ 0,4472 → ROE = (1+|Γ|)/(1−|Γ|) = (3+√5)/2
    expect(swrFromImpedance(complex(50, 50), 50)).toBeCloseTo((3 + Math.sqrt(5)) / 2, 12);
  });

  it('casos limite', () => {
    expect(swrFromGamma(0)).toBe(1);
    expect(swrFromGamma(1)).toBe(Infinity);
    expect(gammaFromSwr(1)).toBe(0);
    expect(gammaFromSwr(Infinity)).toBe(1);
  });

  it('ida e volta', () => {
    for (const swr of [1.1, 1.5, 2, 3, 10]) {
      expect(swrFromGamma(gammaFromSwr(swr))).toBeCloseTo(swr, 10);
    }
  });

  it('rejeita valores fora do domínio', () => {
    expect(() => swrFromGamma(-0.1)).toThrow(RangeError);
    expect(() => swrFromGamma(1.1)).toThrow(RangeError);
    expect(() => gammaFromSwr(0.9)).toThrow(RangeError);
  });
});

describe('perda de retorno e perda por descasamento', () => {
  const table = [
    // ROE, |Γ|,  perda de retorno (dB), perda por descasamento (dB)
    { swr: 1.5, gamma: 0.2, rl: 13.9794, ml: 0.1773 },
    { swr: 2.0, gamma: 1 / 3, rl: 9.5424, ml: 0.5115 },
    { swr: 3.0, gamma: 0.5, rl: 6.0206, ml: 1.2494 },
  ];

  for (const row of table) {
    it(`ROE ${row.swr}:1`, () => {
      const g = gammaFromSwr(row.swr);
      expect(g).toBeCloseTo(row.gamma, 12);
      expect(returnLossDb(g)).toBeCloseTo(row.rl, 4);
      expect(mismatchLossDb(g)).toBeCloseTo(row.ml, 4);
      expect(gammaFromReturnLoss(returnLossDb(g))).toBeCloseTo(g, 12);
    });
  }

  it('casos limite', () => {
    expect(returnLossDb(0)).toBe(Infinity);
    expect(returnLossDb(1)).toBe(0);
    expect(mismatchLossDb(0)).toBe(0);
    expect(mismatchLossDb(1)).toBe(Infinity);
    expect(gammaFromReturnLoss(0)).toBe(1);
  });

  it('frações de potência (ROE 2:1 → ≈ 11,1 % refletida)', () => {
    const g = gammaFromSwr(2);
    expect(reflectedPowerFraction(g)).toBeCloseTo(1 / 9, 12);
    expect(deliveredPowerFraction(g)).toBeCloseTo(8 / 9, 12);
  });

  it('rejeita perda de retorno negativa', () => {
    expect(() => gammaFromReturnLoss(-1)).toThrow(RangeError);
  });
});
