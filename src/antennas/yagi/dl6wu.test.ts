import { describe, expect, it } from 'vitest';
import {
  DL6WU_DIRECTOR_SPACINGS,
  beamwidthsDeg,
  boomCorrection,
  boomLength,
  directorLengths,
  directorPositions,
  estimatedGainDbd,
  foldedDrivenLength,
  reflectorLength,
} from './dl6wu';

// Referência: programa DL6WU.BAS (G3SEK, versão Oct 2006). Os números abaixo foram calculados à mão com as
// equações do programa (tolerância 1e-4 λ, a precisão do cálculo manual), e as faixas de projeto do próprio
// programa servem de conferência cruzada: boom de 2,2 a 39 λ ↔ ganho de 11,8 a 21,6 dBd (linhas 400 e 540).

describe('DL6WU: espaçamentos e boom', () => {
  it('tabela de espaçamentos: 14 valores, crescentes e depois constantes em 0,4λ', () => {
    expect(DL6WU_DIRECTOR_SPACINGS).toHaveLength(14);
    expect(DL6WU_DIRECTOR_SPACINGS[0]).toBe(0.075);
    expect(DL6WU_DIRECTOR_SPACINGS[13]).toBe(0.4);
  });

  it('posições: 1º diretor em 0,2 + 0,075 = 0,275λ; 8º em 2,145λ', () => {
    const p = directorPositions(8);
    expect(p[0]).toBeCloseTo(0.275, 12);
    expect(p[1]).toBeCloseTo(0.455, 12);
    expect(p[7]).toBeCloseTo(2.145, 12);
  });

  it('depois do 14º diretor o espaçamento é 0,4λ', () => {
    const p = directorPositions(16);
    expect(p[14]! - p[13]!).toBeCloseTo(0.4, 12);
    expect(p[15]! - p[14]!).toBeCloseTo(0.4, 12);
    expect(boomLength(14)).toBeCloseTo(4.415, 12);
  });

  it('sem diretores o "boom" é só refletor → excitado', () => {
    expect(boomLength(0)).toBe(0.2);
  });
});

describe('DL6WU: comprimento dos diretores (linha 1490)', () => {
  it('d/λ = 0,003 (linha da tabela): D1 ≈ 0,4470λ e D2 ≈ 0,4430λ', () => {
    const d = directorLengths(2, 0.003);
    expect(Math.abs(d[0]! - 0.447035)).toBeLessThan(1e-4);
    expect(Math.abs(d[1]! - 0.443036)).toBeLessThan(1e-4);
  });

  it('diretores ficam mais curtos ao longo do boom e depois quase constantes', () => {
    const d = directorLengths(30, 0.004);
    for (let i = 1; i < d.length; i++) expect(d[i]!).toBeLessThan(d[i - 1]!);
    expect(d[0]! - d[1]!).toBeGreaterThan(d[28]! - d[29]!);
    // Todos mais curtos que meia onda.
    expect(d[0]!).toBeLessThan(0.5);
  });

  it('entre dois diâmetros da tabela interpola entre os resultados deles', () => {
    const lo = directorLengths(5, 0.003);
    const hi = directorLengths(5, 0.005);
    const mid = directorLengths(5, 0.004);
    mid.forEach((v, i) => expect(v).toBeCloseTo((lo[i]! + hi[i]!) / 2, 12));
  });

  it('elemento mais grosso → diretor mais curto', () => {
    expect(directorLengths(1, 0.012)[0]!).toBeLessThan(directorLengths(1, 0.004)[0]!);
  });

  it('rejeita d/λ fora de 0,001–0,02', () => {
    expect(() => directorLengths(3, 0.0005)).toThrow(RangeError);
    expect(() => directorLengths(3, 0.03)).toThrow(RangeError);
  });
});

describe('DL6WU: refletor, excitado e boom', () => {
  it('refletor com 20 Ω de reatância, d/λ = 0,003: ≈ 0,4888λ', () => {
    expect(Math.abs(reflectorLength(0.003) - 0.488828)).toBeLessThan(1e-4);
  });

  it('refletor é maior que os diretores e menor que 0,5λ', () => {
    expect(reflectorLength(0.003)).toBeGreaterThan(directorLengths(1, 0.003)[0]!);
    expect(reflectorLength(0.003)).toBeLessThan(0.5);
  });

  it('excitado (dipolo dobrado) d/λ = 0,003: ≈ 0,4832λ', () => {
    expect(Math.abs(foldedDrivenLength(0.003) - 0.48315)).toBeLessThan(1e-4);
  });

  it('correção de boom D/λ = 0,01: 0,00229λ; isolado passando pelo boom: metade', () => {
    expect(boomCorrection(0.01)).toBeCloseTo(0.0022905, 6);
    expect(boomCorrection(0.01, false)).toBeCloseTo(0.0022905 / 2, 6);
    expect(boomCorrection(0)).toBe(0);
  });

  it('rejeita boom metálico acima de 0,06λ', () => {
    expect(() => boomCorrection(0.07)).toThrow(RangeError);
  });
});

describe('DL6WU: ganho e largura de feixe', () => {
  it('limites do programa: boom 2,2λ ↔ 11,8 dBd e 39λ ↔ 21,6 dBd', () => {
    // O programa anuncia os limites arredondados (11,87 → "11,8"); tolerância declarada de 0,1 dB.
    expect(Math.abs(estimatedGainDbd(2.2) - 11.8)).toBeLessThan(0.1);
    expect(Math.abs(estimatedGainDbd(39) - 21.6)).toBeLessThan(0.1);
  });

  it('cada dobra do boom soma 3,39·ln 2 ≈ 2,35 dB', () => {
    expect(estimatedGainDbd(8) - estimatedGainDbd(4)).toBeCloseTo(3.39 * Math.LN2, 12);
  });

  it('feixe estreita com o ganho, e E < H (H2E > 1)', () => {
    const a = beamwidthsDeg(12);
    const b = beamwidthsDeg(18);
    expect(b.e).toBeLessThan(a.e);
    expect(b.h).toBeLessThan(a.h);
    expect(a.h).toBeGreaterThan(a.e);
    // Ordem de grandeza coerente com um Yagi de ≈ 12 dBd (≈ 14 dBi): feixes de dezenas de graus.
    expect(a.e).toBeGreaterThan(20);
    expect(a.h).toBeLessThan(70);
  });
});
