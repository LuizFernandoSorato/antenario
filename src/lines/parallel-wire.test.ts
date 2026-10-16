import { describe, expect, it } from 'vitest';
import { parallelWireImpedance, parallelWireImpedanceApprox } from './parallel-wire';

// Referências:
// - Exata: Z0 = (η0/π)·acosh(D/d) ≈ 119,9·acosh(D/d) Ω (Kraus; Pozar, tabela 2.1).
// - Aproximação clássica do ARRL Antenna Book: Z0 ≈ 276·log10(2D/d), válida para D ≫ d.
//   As duas devem concordar a menos de 0,1 % para D/d ≥ 10.

describe('parallelWireImpedance', () => {
  it('D/d = 10 → ≈ 359 Ω', () => {
    expect(parallelWireImpedance(0.02, 0.002)).toBeCloseTo(359.0, 0);
  });

  it('concorda com 276·log10(2D/d) do ARRL para D ≫ d', () => {
    for (const ratio of [10, 20, 50, 100]) {
      const exact = parallelWireImpedance(ratio * 0.001, 0.001);
      const approx = parallelWireImpedanceApprox(ratio * 0.001, 0.001);
      expect(Math.abs(exact - approx) / exact).toBeLessThan(0.001);
    }
  });

  it('rejeita espaçamento menor ou igual ao diâmetro', () => {
    expect(() => parallelWireImpedance(0.002, 0.002)).toThrow(RangeError);
    expect(() => parallelWireImpedance(0.001, 0.002)).toThrow(RangeError);
    expect(() => parallelWireImpedance(0.01, 0)).toThrow(RangeError);
  });
});
