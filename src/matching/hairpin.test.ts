import { describe, expect, it } from 'vitest';
import { complex } from '../core/complex';
import { designHairpin, twoWireImpedance } from './hairpin';

// Conferência por circuito: R = 20 Ω com Z0 = 50 Ω pede X = −√(20·30) = −24,495 Ω;
// então Rp = (R²+X²)/R = 1000/20 = 50 Ω e X_L = Z0·R/|X| = 1000/24,495 = 40,825 Ω.
const base = { z0: 50, fMHz: 145, spacingM: 0.02, wireDiameterM: 0.004 };

describe('hairpin', () => {
  it('elemento com a reatância ideal: Rp = Z0, ROE 1', () => {
    const x = -Math.sqrt(20 * 30);
    const r = designHairpin({ ...base, zElement: complex(20, x) });
    expect(r.idealElementReactance).toBeCloseTo(x, 12);
    expect(r.parallelResistance).toBeCloseTo(50, 9);
    expect(r.hairpinReactance).toBeCloseTo(1000 / Math.sqrt(600), 9);
    expect(r.swr).toBeCloseTo(1, 9);
  });

  it('comprimento: X_L = Zh·tan(2πl/λ) é consistente', () => {
    const r = designHairpin({ ...base, zElement: complex(20, -Math.sqrt(600)) });
    const lambda = 299.792458 / 145;
    expect(r.lineImpedance * Math.tan((2 * Math.PI * r.legLengthM) / lambda)).toBeCloseTo(r.hairpinReactance, 9);
    expect(r.inductanceH).toBeCloseTo(r.hairpinReactance / (2 * Math.PI * 145e6), 18);
  });

  it('reatância diferente da ideal deixa ROE > 1', () => {
    const r = designHairpin({ ...base, zElement: complex(20, -10) });
    expect(r.swr).toBeGreaterThan(1.1);
  });

  it('R ≥ Z0: não há reatância ideal', () => {
    expect(designHairpin({ ...base, zElement: complex(60, -10) }).idealElementReactance).toBeNull();
  });

  it('elemento indutivo ou entradas inválidas lançam RangeError', () => {
    expect(() => designHairpin({ ...base, zElement: complex(20, 5) })).toThrow(RangeError);
    expect(() => designHairpin({ ...base, zElement: complex(0, -5) })).toThrow(RangeError);
    expect(() => designHairpin({ ...base, zElement: complex(20, -5), spacingM: 0.003 })).toThrow(RangeError);
  });

  it('linha de dois fios: D = 5d dá 276·log10(10) = 276 Ω', () => {
    expect(twoWireImpedance(0.02, 0.004)).toBeCloseTo(276, 9);
  });
});
