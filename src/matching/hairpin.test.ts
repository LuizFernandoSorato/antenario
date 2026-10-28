import { describe, expect, it } from 'vitest';
import { complex } from '../core/complex';
import { OPEN_WIRE_VF, designHairpin, twoWireImpedance } from './hairpin';

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

  it('comprimento: X_L = Zh·tan(2πl/λ_linha) com λ_linha = 0,975·λ é consistente', () => {
    const r = designHairpin({ ...base, zElement: complex(20, -Math.sqrt(600)) });
    const lambdaLine = (299.792458 / 145) * OPEN_WIRE_VF;
    expect(r.lineImpedance * Math.tan((2 * Math.PI * r.legLengthM) / lambdaLine)).toBeCloseTo(r.hairpinReactance, 9);
    expect(r.inductanceH).toBeCloseTo(r.hairpinReactance / (2 * Math.PI * 145e6), 18);
  });

  // ARRL Antenna Book, 19ª ed., p. 26-11: 20 Ω para 50 Ω pede 41 Ω; tubo de 1/4" espaçado 1,5" tem 300 Ω; 41/300 = 0,137 →
  // 7,8° na Fig 16; com VF 97,5 % (λ em polegadas = 11 508/f), 7,8/360 × 11 508/14 = 17,8". Tolerâncias: 1 Ω na reatância e
  // na impedância (valores arredondados no livro), 0,1° e 0,2" (leitura da figura).
  it('exemplo do ARRL: 20 Ω → 50 Ω em 14 MHz, tubo de 1/4" a 1,5": 41 Ω, 300 Ω, 7,8° e 17,8"', () => {
    const inch = 0.0254;
    const r = designHairpin({ z0: 50, fMHz: 14, spacingM: 1.5 * inch, wireDiameterM: 0.25 * inch, zElement: complex(20, -Math.sqrt(600)) });
    expect(Math.abs(r.hairpinReactance - 41)).toBeLessThan(1);
    expect(Math.abs(r.lineImpedance - 300)).toBeLessThan(3);
    const degrees = (Math.atan(r.hairpinReactance / r.lineImpedance) * 180) / Math.PI;
    expect(Math.abs(degrees - 7.8)).toBeLessThan(0.1);
    expect(Math.abs(r.legLengthM / inch - 17.8)).toBeLessThan(0.2);
    expect(OPEN_WIRE_VF * (299.792458 / 0.0254)).toBeCloseTo(11508, -1);
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
