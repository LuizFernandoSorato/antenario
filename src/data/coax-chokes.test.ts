import { describe, expect, it } from 'vitest';
import { MULTI_BAND_CHOKES, SINGLE_BAND_CHOKES, coilDiameterM, feetToMeters, singleBandChoke } from './coax-chokes';

// Referência: ARRL Antenna Book, 19ª ed., p. 26-21, Tabela 3 (valores conferidos linha a linha com o livro).

describe('chokes de coaxial (Tabela 3 do ARRL)', () => {
  it('seis bandas por cabo, na ordem da tabela', () => {
    for (const rows of Object.values(SINGLE_BAND_CHOKES)) {
      expect(rows.map((r) => r.fMHz)).toEqual([3.5, 7, 10, 14, 21, 28]);
      for (const r of rows) expect(r.turns[0]).toBeLessThanOrEqual(r.turns[1]);
    }
  });

  it('linhas transcritas: RG-213 em 3,5 MHz = 22 pés e 8 espiras; RG-58 em 28 MHz = 4 pés e 6 a 8 espiras', () => {
    expect(singleBandChoke('rg213', 3.5)).toEqual({ fMHz: 3.5, lengthFt: 22, turns: [8, 8] });
    expect(singleBandChoke('rg58', 28)).toEqual({ fMHz: 28, lengthFt: 4, turns: [6, 8] });
    expect(singleBandChoke('rg58', 50)).toBeUndefined();
    expect(MULTI_BAND_CHOKES[0]).toEqual({ lowMHz: 3.5, highMHz: 30, lengthFt: 10, turns: [7, 7] });
  });

  it('conversão de pés e diâmetro da bobina: 22 pés em 8 espiras dão ≈ 26,7 cm', () => {
    expect(feetToMeters(22)).toBeCloseTo(6.7056, 12);
    expect(coilDiameterM(feetToMeters(22), 8)).toBeCloseTo(6.7056 / (8 * Math.PI), 12);
    expect(coilDiameterM(feetToMeters(22), 8)).toBeCloseTo(0.2668, 4);
  });
});
