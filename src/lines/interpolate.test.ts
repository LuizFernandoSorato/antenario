import { describe, expect, it } from 'vitest';
import { findCable } from '../data/coax-cables';
import { interpolateLogLog, tableRange } from './interpolate';

const lmr400 = findCable('times-lmr-400')!;

describe('interpolateLogLog', () => {
  const table = [
    { fMHz: 10, value: 1 },
    { fMHz: 1000, value: 10 },
  ];

  it('devolve o valor exato nos pontos da tabela', () => {
    expect(interpolateLogLog(table, 10)).toBe(1);
    expect(interpolateLogLog(table, 1000)).toBe(10);
  });

  it('lei de potência entre pontos: y ∝ √f → em 100 MHz, √10', () => {
    expect(interpolateLogLog(table, 100)).toBeCloseTo(Math.sqrt(10), 12);
  });

  it('não extrapola fora da tabela', () => {
    expect(interpolateLogLog(table, 9.99)).toBeNull();
    expect(interpolateLogLog(table, 1000.1)).toBeNull();
    expect(interpolateLogLog(table, 0)).toBeNull();
    expect(interpolateLogLog([], 100)).toBeNull();
  });

  it('faixa da tabela', () => {
    expect(tableRange(table)).toEqual({ min: 10, max: 1000 });
    expect(tableRange([])).toBeNull();
  });

  it('LMR-400: concorda com a fórmula do próprio fabricante a menos de 5 %', () => {
    // Verificação independente. Times Microwave, catálogo LMR-400, p. 23:
    // atenuação (dB/100 pés) = 0,122290·√f + 0,000260·f (f em MHz).
    // A fórmula NÃO é usada no cálculo (CLAUDE.md: interpolar a tabela); serve só de conferência.
    const formula = (f: number) => 0.12229 * Math.sqrt(f) + 0.00026 * f;
    for (const f of [30, 40, 100, 145, 300, 435, 1296, 2400, 5800]) {
      const interp = interpolateLogLog(lmr400.attenuationDbPer100ft, f)!;
      expect(Math.abs(interp - formula(f)) / formula(f)).toBeLessThan(0.05);
    }
  });
});
