import { describe, expect, it } from 'vitest';
import {
  INCH_IN_METERS,
  SPEED_OF_LIGHT_M_PER_S,
  dbToPowerRatio,
  dbToVoltageRatio,
  dbmToWatts,
  formatInches,
  formatLength,
  formatNumber,
  hzToMhz,
  inchesToMeters,
  lengthResolutionForFrequency,
  metersToInches,
  mhzToHz,
  parseDecimal,
  powerRatioToDb,
  voltageRatioToDb,
  wattsToDbm,
} from './units';

describe('constantes', () => {
  it('c tem o valor exato do SI', () => {
    expect(SPEED_OF_LIGHT_M_PER_S).toBe(299_792_458);
  });
  it('polegada internacional = 25,4 mm', () => {
    expect(INCH_IN_METERS).toBe(0.0254);
  });
});

describe('conversões', () => {
  it('MHz ↔ Hz', () => {
    expect(mhzToHz(145.5)).toBe(145_500_000);
    expect(hzToMhz(1_090_000_000)).toBe(1090);
  });
  it('metros ↔ polegadas', () => {
    expect(metersToInches(1)).toBeCloseTo(39.3700787, 6);
    expect(inchesToMeters(12)).toBeCloseTo(0.3048, 12);
  });
});

describe('decibéis', () => {
  // Valores clássicos: 3 dB ≈ dobro de potência, 6 dB ≈ dobro de tensão.
  it('potência', () => {
    expect(powerRatioToDb(2)).toBeCloseTo(3.0103, 4);
    expect(powerRatioToDb(10)).toBeCloseTo(10, 12);
    expect(dbToPowerRatio(3)).toBeCloseTo(1.99526, 5);
  });
  it('tensão', () => {
    expect(voltageRatioToDb(2)).toBeCloseTo(6.0206, 4);
    expect(dbToVoltageRatio(20)).toBeCloseTo(10, 12);
  });
  it('dBm ↔ W', () => {
    expect(wattsToDbm(1)).toBeCloseTo(30, 12);
    expect(wattsToDbm(100)).toBeCloseTo(50, 12);
    expect(wattsToDbm(0.001)).toBeCloseTo(0, 12);
    expect(dbmToWatts(37)).toBeCloseTo(5.0119, 4);
  });
});

describe('formatação pt-BR', () => {
  it('usa vírgula decimal e ponto de milhar', () => {
    expect(formatNumber(1234.5, 1)).toBe('1.234,5');
    expect(formatNumber(1234.5, 1, false)).toBe('1234,5');
    expect(formatNumber(0.1 + 0.2, 2)).toBe('0,30');
  });
  it('trata infinito', () => {
    expect(formatNumber(Infinity, 2)).toBe('∞');
    expect(formatNumber(NaN, 2)).toBe('—');
  });

  it('comprimento com resolução de mm', () => {
    expect(formatLength(0.5169, 'mm')).toBe('517 mm');
    expect(formatLength(2.0675342, 'mm')).toBe('2,068 m');
    // Arredonda antes de escolher a unidade: não mostrar "1000 mm".
    expect(formatLength(0.9996, 'mm')).toBe('1,000 m');
  });
  it('comprimento com resolução de cm', () => {
    expect(formatLength(0.5169, 'cm')).toBe('52 cm');
    expect(formatLength(10.0396, 'cm')).toBe('10,04 m');
  });
  it('rejeita comprimento inválido', () => {
    expect(() => formatLength(-1, 'mm')).toThrow(RangeError);
    expect(() => formatLength(NaN, 'mm')).toThrow(RangeError);
  });
  it('polegadas como exibição secundária', () => {
    expect(formatInches(0.0254)).toBe('1,00 pol');
  });

  it('resolução pela faixa: cm em HF, mm em VHF/UHF', () => {
    expect(lengthResolutionForFrequency(7.1)).toBe('cm');
    expect(lengthResolutionForFrequency(30)).toBe('cm');
    expect(lengthResolutionForFrequency(145)).toBe('mm');
    expect(lengthResolutionForFrequency(1090)).toBe('mm');
    expect(() => lengthResolutionForFrequency(0)).toThrow(RangeError);
  });
});

describe('parseDecimal', () => {
  it('aceita vírgula ou ponto', () => {
    expect(parseDecimal('145,5')).toBe(145.5);
    expect(parseDecimal('145.5')).toBe(145.5);
    expect(parseDecimal(' 7 ')).toBe(7);
    expect(parseDecimal(',5')).toBe(0.5);
    expect(parseDecimal('1e3')).toBe(1000);
  });
  it('rejeita entradas inválidas', () => {
    expect(parseDecimal('')).toBeNaN();
    expect(parseDecimal('abc')).toBeNaN();
    expect(parseDecimal('1,2,3')).toBeNaN();
    expect(parseDecimal('1.234,5')).toBeNaN();
  });
});
