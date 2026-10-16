import { describe, expect, it } from 'vitest';
import { calc, defaultParams, gainRangeDbi } from './calc';
import { cutList } from './cutlist';

// Referências:
// - Electronics Notes: L1 = c·A/(4f) (A entre 0,95 e 0,98) e L2 = c·V/(2f) (V: fator de velocidade).
// - dmrhub.ru (guia de 70 cm): seção (mm) = 150000/F(MHz) × VF; com VF = 0,66 dá ≈ 228 mm a 435 MHz.
//   (O dmrhub usa 150 em vez de 149,896; a diferença é 0,07 %.)

function m(r: ReturnType<typeof calc>, label: string): number {
  const x = r.measurements.find((y) => y.label === label);
  if (!x) throw new Error(`Cota ${label} não encontrada`);
  return x.meters;
}

describe('colinear de coaxial: calc', () => {
  it('seção de meia onda a 435 MHz, VF 0,66, concorda com o guia de 70 cm (228 mm)', () => {
    const r = calc(defaultParams);
    expect(m(r, 'B') * 1000).toBeCloseTo(227.4, 1);
    const dmrhub = (150000 / 435) * 0.66; // mm
    expect(Math.abs(m(r, 'B') * 1000 - dmrhub) / dmrhub).toBeLessThan(0.001);
  });

  it('com VF 0,80 as seções ficam ≈ 276 mm a 435 MHz (guia de 70 cm)', () => {
    const r = calc({ ...defaultParams, velocityFactor: 0.8 });
    expect(Math.round(m(r, 'B') * 1000)).toBe(276);
  });

  it('chicote = λ/4 × A, sem fator de velocidade; fundo = λ/4 × VF', () => {
    const lambda = 299.792458 / 435;
    const r = calc(defaultParams);
    expect(m(r, 'A')).toBeCloseTo((lambda / 4) * 0.97, 12);
    expect(m(r, 'C')).toBeCloseTo((lambda / 4) * 0.66, 12);
  });

  it('comprimento total e coaxial total', () => {
    const r = calc({ ...defaultParams, sections: 6 });
    expect(m(r, 'D')).toBeCloseTo(m(r, 'A') + 6 * m(r, 'B') + m(r, 'C'), 12);
    expect(m(r, 'E')).toBeCloseTo(6 * m(r, 'B') + m(r, 'C'), 12);
  });

  it('um erro de 10 % no VF muda as seções em 10 % (a antena desloca de frequência)', () => {
    const a = m(calc({ ...defaultParams, velocityFactor: 0.66 }), 'B');
    const b = m(calc({ ...defaultParams, velocityFactor: 0.726 }), 'B');
    expect(b / a).toBeCloseTo(1.1, 12);
  });

  it('ganho: 2 seções 3–4 dBi, 4 ≈ 6, 6–8 de 8–9; 3 e 5 interpolados', () => {
    expect(gainRangeDbi(2)).toEqual({ min: 3, max: 4, interpolated: false });
    expect(gainRangeDbi(4)).toEqual({ min: 6, max: 6, interpolated: false });
    expect(gainRangeDbi(8)).toEqual({ min: 8, max: 9, interpolated: false });
    expect(gainRangeDbi(3).interpolated).toBe(true);
    expect(gainRangeDbi(3).min).toBeCloseTo(4.5, 12);
    expect(gainRangeDbi(5).min).toBeCloseTo(7, 12);
  });

  it('entradas inválidas', () => {
    expect(() => calc({ ...defaultParams, sections: 1 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, sections: 9 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, sections: 3.5 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, velocityFactor: 0 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, frequencyMHz: -5 })).toThrow(RangeError);
  });

  it('avisa sobre VF incomum', () => {
    expect(calc({ ...defaultParams, velocityFactor: 0.4 }).warnings.some((w) => w.message.includes('incomum'))).toBe(true);
    expect(calc(defaultParams).warnings.some((w) => w.message.includes('incomum'))).toBe(false);
  });
});

describe('colinear de coaxial: lista de corte', () => {
  it('chicote ajustável; seções na quantidade informada', () => {
    const items = cutList({ ...defaultParams, sections: 5 });
    expect(items.filter((i) => i.adjustable).map((i) => i.label)).toEqual(['A']);
    expect(items.find((i) => i.label === 'B')!.quantity).toBe(5);
  });
});
