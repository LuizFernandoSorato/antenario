import { describe, expect, it } from 'vitest';
import { wavelength } from '../core/wave';
import { SLEEVE_DIAMETER_RATIO, airCoaxImpedance, sleeveBalun } from './sleeve-balun';

// Referências: ARRL Antenna Book, 19ª ed., p. 26-23, Fig 33B (L = 234/f pés) e p. 24-14, Eq 26 (Z0 = 138·log10(D/d));
// Rothammel, "Antene", §25.1.2, Fig. 25.2 (2 m: 495 mm, D:d de 3:1 a 4:1, D = 28 mm e d = 8 mm).

describe('manga de λ/4 (sleeve balun)', () => {
  it('234/f pés equivale a λ/4 com VF ≈ 0,95 (ARRL: "velocity factor of 0.95, approximately")', () => {
    const r = sleeveBalun({ fMHz: 145, cableDiameterM: 0.005 });
    expect(r.lengthM / (wavelength(145) / 4)).toBeCloseTo(0.95, 2);
  });

  it('confere com o exemplo de 2 m do Rothammel (495 mm) a 1 % em 145 MHz', () => {
    const r = sleeveBalun({ fMHz: 145, cableDiameterM: 0.008 });
    expect(Math.abs(r.lengthM - 0.495) / 0.495).toBeLessThan(0.01);
    // O exemplo (D = 28 mm, d = 8 mm) fica dentro da faixa de diâmetros.
    expect(0.028).toBeGreaterThanOrEqual(r.tubeDiameterMinM);
    expect(0.028).toBeLessThanOrEqual(r.tubeDiameterMaxM);
  });

  it('o exemplo do ARRL (2" com cabo de 1/2") é a relação 4:1, o máximo da faixa', () => {
    expect(2 / 0.5).toBe(SLEEVE_DIAMETER_RATIO.max);
  });

  it('diâmetro do tubo de 3 a 4 vezes o do cabo e impedância da linha de 66 a 83 Ω', () => {
    const r = sleeveBalun({ fMHz: 435, cableDiameterM: 0.0049 });
    expect(r.tubeDiameterMinM).toBeCloseTo(3 * 0.0049, 12);
    expect(r.tubeDiameterMaxM).toBeCloseTo(4 * 0.0049, 12);
    expect(r.lineImpedanceMinOhms).toBeCloseTo(138 * Math.log10(3), 12);
    expect(r.lineImpedanceMinOhms).toBeCloseTo(65.8, 1);
    expect(r.lineImpedanceMaxOhms).toBeCloseTo(83.1, 1);
  });

  it('escala com 1/f', () => {
    const a = sleeveBalun({ fMHz: 145, cableDiameterM: 0.005 });
    const b = sleeveBalun({ fMHz: 435, cableDiameterM: 0.005 });
    expect(a.lengthM / b.lengthM).toBeCloseTo(3, 12);
  });

  it('entradas inválidas', () => {
    expect(() => sleeveBalun({ fMHz: 0, cableDiameterM: 0.005 })).toThrow(RangeError);
    expect(() => sleeveBalun({ fMHz: 145, cableDiameterM: 0 })).toThrow(RangeError);
    expect(() => airCoaxImpedance(0.005, 0.005)).toThrow(RangeError);
  });
});
