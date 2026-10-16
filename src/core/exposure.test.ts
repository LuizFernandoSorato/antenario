import { describe, expect, it } from 'vitest';
import { powerDensityLimit } from '../data/rf-exposure-limits';
import { averagePower, farFieldDistance, gainLinearFromDbi, powerDensity, safeDistance } from './exposure';

// Referências: S = P·G/(4πr²) (espaço livre, isotrópica: 100 W a 1 m → 100/(4π) = 7,9577 W/m²).
// Limites: ICNIRP 2020, Tabela 5, público geral (2 W/m² em 30–400 MHz; f/200 em 400–2000 MHz; 10 W/m² acima).

describe('exposição: fórmulas', () => {
  it('100 W isotrópicos a 1 m dão 100/(4π) W/m²', () => {
    expect(powerDensity(100, 1, 1)).toBeCloseTo(100 / (4 * Math.PI), 12);
  });

  it('a distância de segurança inverte a densidade de potência', () => {
    const r = safeDistance(100, 10, 2);
    expect(powerDensity(100, 10, r)).toBeCloseTo(2, 12);
  });

  it('dobrar a distância divide S por 4', () => {
    expect(powerDensity(50, 2, 4) / powerDensity(50, 2, 2)).toBeCloseTo(0.25, 12);
  });

  it('exemplo: 100 W, 10 dBi (≈10), limite 2 W/m² → ≈ 6,3 m', () => {
    const r = safeDistance(100, gainLinearFromDbi(10), 2);
    expect(r).toBeCloseTo(Math.sqrt(1000 / (8 * Math.PI)), 12);
    expect(r).toBeCloseTo(6.31, 2);
  });

  it('potência média = pico × ciclo de trabalho', () => {
    expect(averagePower(100, 0.5)).toBe(50);
    expect(() => averagePower(100, 0)).toThrow(RangeError);
    expect(() => averagePower(100, 1.1)).toThrow(RangeError);
  });

  it('campo distante: 2D²/λ (D = 1 m a 300 MHz → λ ≈ 1 m → ≈ 2 m)', () => {
    expect(farFieldDistance(1, 299.792458)).toBeCloseTo(2, 12);
  });

  it('entradas inválidas', () => {
    expect(() => powerDensity(0, 1, 1)).toThrow(RangeError);
    expect(() => safeDistance(10, 1, 0)).toThrow(RangeError);
  });
});

describe('exposição: limites da ICNIRP (2020, Tabela 5)', () => {
  it('público geral', () => {
    expect(powerDensityLimit(145, 'public')).toBe(2);
    expect(powerDensityLimit(400, 'public')).toBe(2);
    expect(powerDensityLimit(435, 'public')).toBeCloseTo(2.175, 12);
    expect(powerDensityLimit(2000, 'public')).toBe(10);
    expect(powerDensityLimit(5800, 'public')).toBe(10);
  });

  it('ocupacional', () => {
    expect(powerDensityLimit(145, 'occupational')).toBe(10);
    expect(powerDensityLimit(1000, 'occupational')).toBe(25);
    expect(powerDensityLimit(5800, 'occupational')).toBe(50);
  });

  it('até 30 MHz a tabela não dá densidade de potência', () => {
    expect(powerDensityLimit(14.2, 'public')).toBeNull();
    expect(powerDensityLimit(30, 'public')).toBeNull();
  });

  it('fora da faixa', () => {
    expect(() => powerDensityLimit(0, 'public')).toThrow(RangeError);
    expect(() => powerDensityLimit(400_000, 'public')).toThrow(RangeError);
  });
});
