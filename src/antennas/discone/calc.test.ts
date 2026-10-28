import { describe, expect, it } from 'vitest';
import { wavelength } from '../../core/wave';
import { calc, defaultParams } from './calc';
import { cutList } from './cutlist';
import { solveDiscone } from './pattern-model';

// Referências:
// - ARRL Antenna Book, 21ª ed., p. 7-26, Fig 48 (W8NWF): L = 246/f(MHz) pés; disco D de 0,67 a 0,70·L; base do cone B = L.
// - K. Rothammel, "Antene", §25.1.4, Fig. 25.5: lateral = λ/4 da maior onda, disco de 0,7 da lateral; faixa de 1:8.

function m(r: ReturnType<typeof calc>, label: string): number {
  const x = r.measurements.find((y) => y.label === label);
  if (!x) throw new Error(`Cota ${label} não encontrada`);
  return x.meters;
}

describe('discone: calc', { timeout: 120_000 }, () => {
  it('lateral do cone = λ/4 na menor frequência, igual ao 246/f pés do ARRL a 0,05 %', () => {
    const r = calc(defaultParams);
    expect(m(r, 'A')).toBeCloseTo(wavelength(100) / 4, 12);
    const arrlFeet = (246 / 100) * 0.3048;
    expect(Math.abs(m(r, 'A') - arrlFeet) / arrlFeet).toBeLessThan(0.0005);
  });

  it('base do cone = lateral (30°), disco de 0,7 da lateral e geometria consistente', () => {
    const r = calc(defaultParams);
    expect(m(r, 'B')).toBeCloseTo(m(r, 'A'), 12);
    expect(m(r, 'C')).toBeCloseTo(m(r, 'A') * Math.cos(Math.PI / 6), 12);
    expect(m(r, 'D')).toBeCloseTo(0.7 * m(r, 'A'), 12);
    expect(m(r, 'D')).toBeCloseTo(2 * m(r, 'E'), 12);
  });

  it('as medidas escalam com 1/frequência', () => {
    const a = calc({ ...defaultParams, frequencyMHz: 100 });
    const b = calc({ ...defaultParams, frequencyMHz: 200 });
    expect(m(a, 'A') / m(b, 'A')).toBeCloseTo(2, 12);
  });

  it('faixa de 1:8 (Rothammel) e aviso com a ROE do modelo na ponta de baixo', () => {
    const r = calc(defaultParams);
    expect(r.expected.bandwidth!.min).toBe(100);
    expect(r.expected.bandwidth!.max).toBe(800);
    expect(r.warnings.some((w) => w.message.includes('1,4 vez'))).toBe(true);
  });

  it('entradas inválidas', () => {
    expect(() => calc({ ...defaultParams, rodCount: 2 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, rodCount: 8.5 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, rodDiameter: 0 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, frequencyMHz: 0 })).toThrow(RangeError);
  });
});

describe('discone: lista de corte', { timeout: 120_000 }, () => {
  it('hastes do cone (A) e do disco (E), na quantidade informada', () => {
    const items = cutList({ ...defaultParams, rodCount: 12 });
    expect(items.map((i) => [i.label, i.quantity])).toEqual([['A', 12], ['E', 12]]);
  });
});

describe('discone: folga disco–cone informada', { timeout: 120_000 }, () => {
  it('0 usa a proporção automática; um valor informado vira a cota F e não muda A, B, C, D, E', () => {
    const auto = calc(defaultParams);
    expect(m(auto, 'F')).toBeCloseTo(m(auto, 'A') * (11 / 270), 12);
    const r = calc({ ...defaultParams, centerGap: 0.02 });
    expect(m(r, 'F')).toBeCloseTo(0.02, 12);
    for (const label of ['A', 'B', 'C', 'D', 'E']) expect(m(r, label)).toBeCloseTo(m(auto, label), 12);
  });

  it('rejeita folga negativa ou maior que o raio do disco', () => {
    expect(() => calc({ ...defaultParams, centerGap: -0.01 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, centerGap: 5 })).toThrow(RangeError);
  });
});

describe('discone: ganho pelo modelo', { timeout: 120_000 }, () => {
  it('faixa entre 1×, 2× e 4× a menor frequência, a mesma solução dos diagramas (cache)', () => {
    const r = calc(defaultParams);
    const g = r.expected.gain!;
    expect(g.min!).toBeGreaterThan(0);
    expect(g.max!).toBeLessThan(6);
    expect(g.max!).toBeGreaterThan(g.min!);
    expect(g.source).toMatch(/Momentos/);
    expect(g.note).toMatch(/1×, 2× e 4×/);
    const a = solveDiscone(r, defaultParams.rodCount, defaultParams.rodDiameter, defaultParams.frequencyMHz);
    const b = solveDiscone(r, defaultParams.rodCount, defaultParams.rodDiameter, defaultParams.frequencyMHz);
    expect(b).toBe(a);
    expect(10 * Math.log10(a.maxDirectivity())).toBeCloseTo(g.min!, 6);
  });
});
