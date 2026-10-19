import { describe, expect, it } from 'vitest';
import { combinedPower, directivityOf } from '../../core/mom';
import { calc as yagiCalc } from '../yagi/calc';
import { solveYagi } from '../yagi/pattern-model';
import { calc, defaultParams } from './calc';
import { cutList } from './cutlist';

// Referências:
// - LY3H, "UHF 9V + 9H hand cross Yagi for satellite" (https://www.ly3h.net/uhf-9v-9h-hand-cross-yagi-for-satellite/,
//   consultada em 2026-10-19): 436,5 MHz, Yagis de 100 Ω em paralelo, "113 mm length of 100 Ohm coaxial cable", ROE ~1,1.
//   λ/4 a 436,5 MHz = 0,171708 m; × VF 0,66 = 0,113327 m ≈ 113 mm (tolerância de 1 mm: o autor arredondou).
// - Alimentação em quadratura (Pozar, linha de 1/4 de onda): linha de impedância Zq = Z do Yagi dá correntes iguais e a 90°;
//   a impedância na junção é Z/2. Transformador de 1/4 de onda: Zt = √(Z0·Zj).
// - Os elementos vêm da Yagi (NBS ou DL6WU): os dois Yagis são idênticos.

function m(r: ReturnType<typeof calc>, label: string): number {
  const x = r.measurements.find((y) => y.label === label);
  if (!x) throw new Error(`Cota ${label} não encontrada`);
  return x.meters;
}

const ly3h = { ...defaultParams, frequencyMHz: 436.5, velocityFactor: 0.66, yagiImpedance: 100 };

describe('cross Yagi: calc', () => {
  it('linha defasadora a 436,5 MHz bate com os 113 mm do LY3H (VF 0,66)', () => {
    const r = calc(ly3h);
    expect(m(r, 'F') * 1000).toBeCloseTo(113, 0);
    expect(Math.abs(m(r, 'F') * 1000 - 113)).toBeLessThan(1);
    expect(m(r, 'F')).toBeCloseTo((299.792458 / 436.5 / 4) * 0.66, 12);
  });

  it('com Yagis de 100 Ω a junção já fica em 50 Ω: sem transformador (sem cota T)', () => {
    const r = calc(ly3h);
    expect(r.measurements.map((x) => x.label)).not.toContain('T');
    expect(r.expected.impedance.typical).toBeCloseTo(50, 9);
  });

  it('com Yagis de 50 Ω a junção fica em 25 Ω e pede transformador de 1/4 de onda de √(50·25) Ω', () => {
    const r = calc({ ...ly3h, yagiImpedance: 50 });
    expect(r.expected.impedance.typical).toBeCloseTo(25, 9);
    expect(m(r, 'T')).toBeCloseTo((299.792458 / 436.5 / 4) * 0.66, 12);
    const note = r.assumptions.find((a) => a.name.startsWith('Transformador'))!;
    expect(note.value).toContain('35,4');
  });

  it('elementos idênticos aos de um Yagi isolado (mesmos parâmetros)', () => {
    const y = yagiCalc(defaultParams);
    const r = calc(defaultParams);
    for (const x of y.measurements) expect(m(r, x.label)).toBe(x.meters);
  });

  it('funciona com o método DL6WU', () => {
    const r = calc({ ...defaultParams, method: 2, elementCount: 12 });
    expect(m(r, 'L')).toBeGreaterThan(0);
    expect(r.measurements.map((x) => x.label)).toContain('F');
  });

  it('ganho circular ≈ ganho do Yagi isolado (a potência se divide entre as duas polarizações)', () => {
    const y = yagiCalc(defaultParams).expected.gain;
    const g = calc(defaultParams).expected.gain;
    expect(g.unit).toBe('dBic');
    expect(g.typical).toBeCloseTo(y.typical!, 9);
    expect(g.source.length).toBeGreaterThan(0);
  });

  it('erro de 10 % no VF muda a linha em 10 %', () => {
    const a = m(calc({ ...ly3h, velocityFactor: 0.6 }), 'F');
    const b = m(calc({ ...ly3h, velocityFactor: 0.66 }), 'F');
    expect(b / a).toBeCloseTo(1.1, 12);
  });

  it('rejeita entradas inválidas', () => {
    expect(() => calc({ ...defaultParams, yagiImpedance: 0 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, velocityFactor: 1.2 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, frequencyMHz: -1 })).toThrow(RangeError);
  });

  it('avisa sobre sentido da polarização, mutuo e isolamento no cruzamento', () => {
    const w = calc(defaultParams).warnings.map((x) => x.message).join(' ');
    expect(w).toMatch(/direita|RHCP/);
    expect(w).toMatch(/isol/);
  });
});

describe('cross Yagi: folha de corte', () => {
  it('dois de cada elemento (um por Yagi) e medidas iguais às do cálculo', () => {
    const r = calc(defaultParams);
    const items = cutList(defaultParams);
    const byLabel = new Map(items.map((i) => [i.label, i]));
    for (const l of ['R', 'DE', 'D1']) {
      expect(byLabel.get(l)!.quantity).toBe(2);
      expect(byLabel.get(l)!.meters).toBe(m(r, l));
    }
    expect(byLabel.get('F')!.quantity).toBe(1);
    expect(byLabel.get('F')!.meters).toBe(m(r, 'F'));
  });
});

describe('cross Yagi: padrão por momentos', () => {
  it('diretividade circular = diretividade de um Yagi isolado (a potência se divide entre as polarizações)', () => {
    const r = calc(defaultParams);
    const a = solveYagi(r, defaultParams);
    const b = a.rotated(([x, y, z]) => [-y, x, z]);
    const p = combinedPower([
      { solution: a, factor: { re: 1, im: 0 } },
      { solution: b, factor: { re: 0, im: -1 } },
    ]);
    const dCross = directivityOf(p, [0, 0, 1]);
    const dYagi = a.directivity([0, 0, 1]);
    expect(10 * Math.log10(dCross)).toBeCloseTo(10 * Math.log10(dYagi), 1);
  });

  it('simetria: planos x–z e y–z iguais; o plano diagonal difere pouco (≤ 1,5 dB)', () => {
    const r = calc(defaultParams);
    const a = solveYagi(r, defaultParams);
    const b = a.rotated(([x, y, z]) => [-y, x, z]);
    const p = combinedPower([
      { solution: a, factor: { re: 1, im: 0 } },
      { solution: b, factor: { re: 0, im: -1 } },
    ]);
    for (const el of [0.3, 0.7, 1.0, 1.4]) {
      const ex = p([Math.cos(el), 0, Math.sin(el)]);
      const ey = p([0, Math.cos(el), Math.sin(el)]);
      const ed = p([Math.cos(el) * Math.SQRT1_2, Math.cos(el) * Math.SQRT1_2, Math.sin(el)]);
      expect(ey / ex).toBeCloseTo(1, 6);
      // fora dos planos de simetria o termo cruzado entre os dois campos não se anula
      expect(Math.abs(10 * Math.log10(ed / ex))).toBeLessThan(1.5);
    }
  });

  it('no eixo, o sentido da quadratura não muda a potência', () => {
    const r = calc(defaultParams);
    const a = solveYagi(r, defaultParams);
    const b = a.rotated(([x, y, z]) => [-y, x, z]);
    const minus = combinedPower([{ solution: a, factor: { re: 1, im: 0 } }, { solution: b, factor: { re: 0, im: -1 } }]);
    const plus = combinedPower([{ solution: a, factor: { re: 1, im: 0 } }, { solution: b, factor: { re: 0, im: 1 } }]);
    expect(plus([0, 0, 1]) / minus([0, 0, 1])).toBeCloseTo(1, 9);
  });
});
