import { describe, expect, it } from 'vitest';
import { abs } from '../../core/complex';
import { dipoleShorteningFactor } from '../../core/dipole-resonance';
import { calc, defaultParams, quadratureFeed } from './calc';
import { REFLECTOR_PLATE, REFLECTOR_TUBES } from './reflector-model';
import { LHCP, RHCP } from '../circular';
import { cutList } from './cutlist';

// Referências:
// - Dipolo: L = K·λ/2 com o K do diâmetro (como em antennas/dipole); a 137,5 MHz, λ = 2,18032 m; com 2 mm, K ≈ 0,958 → A ≈ 1,044 m.
// - Linha de 1/4 de onda: λ/4 × VF; a 137,5 MHz com VF 0,66, 0,54508 × 0,66 = 0,35975 m.
// - Refletor a λ/4 (Wikipedia, citando Milligan): 0,54508 m.
// - Alimentação em quadratura: derivação por linha de 1/4 de onda, I_B/I_A = −j·R/Zq; Z = R/2 se Zq = R.

function m(r: ReturnType<typeof calc>, label: string): number {
  const x = r.measurements.find((y) => y.label === label);
  if (!x) throw new Error(`Cota ${label} não encontrada`);
  return x.meters;
}

describe('turnstile: calc', () => {
  const lambda = 299.792458 / 137.5;

  it('dipolos, linha de fase e refletor a 137,5 MHz', () => {
    const r = calc(defaultParams);
    const k = dipoleShorteningFactor(0.002 / lambda);
    expect(m(r, 'A')).toBeCloseTo((k * lambda) / 2, 12);
    expect(m(r, 'B')).toBeCloseTo((m(r, 'A') - 0.01) / 2, 12);
    expect(m(r, 'E')).toBeCloseTo(0.01, 12);
    expect(m(r, 'C')).toBeCloseTo((lambda / 4) * 0.66, 12);
    expect(m(r, 'D')).toBeCloseTo(lambda / 4, 12);
    expect(m(r, 'A')).toBeGreaterThan(1.04);
    expect(m(r, 'A')).toBeLessThan(1.05);
    expect(r.assumptions.some((a) => /pelo diâmetro/.test(a.value))).toBe(true);
  });

  it('sem refletor não há cota D', () => {
    const r = calc({ ...defaultParams, reflector: 0 });
    expect(r.measurements.map((x) => x.label)).toEqual(['A', 'B', 'C', 'E']);
  });

  it('um erro de 10 % no VF muda a linha de fase em 10 %', () => {
    const a = m(calc({ ...defaultParams, velocityFactor: 0.66 }), 'C');
    const b = m(calc({ ...defaultParams, velocityFactor: 0.726 }), 'C');
    expect(b / a).toBeCloseTo(1.1, 12);
  });

  it('impedância esperada ≈ 36,5 Ω', () => {
    expect(calc(defaultParams).expected.impedance.typical).toBeCloseTo(36.5, 9);
  });

  it('banda: a quadratura alarga a ROE (bem mais que um dipolo só), mas a razão axial < 3 dB é bem mais estreita', () => {
    // Um dipolo de 2 mm em 137,5 MHz cobre ≈ 9 MHz com ROE < 2:1 em 50 Ω (modelo de antennas/dipole).
    for (const reflector of [0, 1]) {
      for (const reflectorKind of [REFLECTOR_PLATE, REFLECTOR_TUBES]) {
        const b = calc({ ...defaultParams, reflector, reflectorKind }).expected.bandwidth!;
        expect(b.unit).toBe('MHz');
        expect(b.typical!).toBeGreaterThan(18);
        expect(b.typical!).toBeLessThan(30);
        const ar = Number(/razão axial < 3 dB: ([\d,]+) MHz/.exec(b.note)![1]!.replace(',', '.'));
        expect(ar).toBeGreaterThan(5);
        expect(ar).toBeLessThan(b.typical! / 2);
      }
    }
  });

  it('o espaço central conta dentro do comprimento total: A não muda, B = (A − gap)/2 e há cota E', () => {
    const base = calc(defaultParams);
    const r = calc({ ...defaultParams, centerGap: 0.02 });
    expect(m(r, 'A')).toBeCloseTo(m(base, 'A'), 12);
    expect(m(r, 'B')).toBeCloseTo((m(base, 'A') - 0.02) / 2, 12);
    expect(m(r, 'E')).toBeCloseTo(0.02, 12);
    expect(cutList({ ...defaultParams, centerGap: 0.02 }).find((c) => c.label === 'B')!.meters).toBeCloseTo(m(r, 'B'), 12);
  });

  it('o espaço central precisa ser maior que o diâmetro do condutor (os braços dos dois dipolos se cruzam no centro)', () => {
    expect(defaultParams.centerGap).toBe(0.01);
    expect(() => calc({ ...defaultParams, centerGap: 0 })).toThrow(/maior que o diâmetro/);
    expect(() => calc({ ...defaultParams, conductorDiameter: 0.01, centerGap: 0.01 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, conductorDiameter: 0.01, centerGap: 0.0101 })).not.toThrow();
  });

  it('rejeita espaço central negativo ou maior que o dipolo e diâmetro não positivo', () => {
    expect(() => calc({ ...defaultParams, centerGap: -0.01 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, centerGap: 2 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, conductorDiameter: 0 })).toThrow(RangeError);
  });

  it('entradas inválidas', () => {
    expect(() => calc({ ...defaultParams, frequencyMHz: 0 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, velocityFactor: 0 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, conductorDiameter: 0 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, reflector: 2 })).toThrow(RangeError);
  });

  it('avisa sobre VF incomum', () => {
    expect(calc({ ...defaultParams, velocityFactor: 0.4 }).warnings.some((w) => w.message.includes('incomum'))).toBe(true);
    expect(calc(defaultParams).warnings.some((w) => w.message.includes('incomum'))).toBe(false);
  });
});

describe('turnstile: alimentação em quadratura', () => {
  it('Zq = R: correntes iguais e Z = R/2', () => {
    const f = quadratureFeed(73, 73);
    expect(f.currentRatio).toBeCloseTo(1, 12);
    expect(f.phaseDeg).toBe(-90);
    expect(abs(f.feedImpedance)).toBeCloseTo(36.5, 12);
  });

  it('Zq ≠ R: correntes desiguais (50 Ω no lugar de 73 Ω → 1,46)', () => {
    expect(quadratureFeed(73, 50).currentRatio).toBeCloseTo(1.46, 12);
  });

  it('entrada inválida', () => {
    expect(() => quadratureFeed(0, 73)).toThrow(RangeError);
  });
});

describe('turnstile: lista de corte', () => {
  it('quatro braços ajustáveis e uma linha de fase', () => {
    const items = cutList(defaultParams);
    expect(items.find((i) => i.label === 'B')!.quantity).toBe(4);
    expect(items.find((i) => i.label === 'C')!.adjustable).toBe(false);
    expect(items.some((i) => i.label === 'D')).toBe(true);
    expect(cutList({ ...defaultParams, reflector: 0 }).some((i) => i.label === 'D')).toBe(false);
  });
});

describe('turnstile: sentido da polarização e montagem', () => {
  it('RHCP e LHCP dão passos de montagem opostos (horário × anti-horário) com as mesmas cotas', () => {
    const rh = calc({ ...defaultParams, circularSense: RHCP });
    const lh = calc({ ...defaultParams, circularSense: LHCP });
    expect(rh.measurements).toEqual(lh.measurements);
    const text = (r: ReturnType<typeof calc>) => r.assembly!.steps.join(' ');
    expect(rh.assembly!.title).toContain('RHCP');
    expect(lh.assembly!.title).toContain('LHCP');
    expect(text(rh)).toContain('BAIXO para CIMA (na direção do feixe), gire o dipolo 2 até que o braço vivo dele fique 90° no sentido HORÁRIO');
    expect(text(lh)).toContain('BAIXO para CIMA (na direção do feixe), gire o dipolo 2 até que o braço vivo dele fique 90° no sentido ANTI-HORÁRIO');
  });

  it('o padrão é RHCP e um sentido inválido é recusado', () => {
    expect(defaultParams.circularSense).toBe(RHCP);
    expect(() => calc({ ...defaultParams, circularSense: 0 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, circularSense: 3 })).toThrow(RangeError);
  });
});

describe('turnstile: tipo de refletor (chapa/tela ou tubos)', () => {
  const lambda = 299.792458 / defaultParams.frequencyMHz;
  const get = (r: ReturnType<typeof calc>, l: string) => r.measurements.find((m) => m.label === l);

  it('padrão é chapa/tela: lado de 1λ e vão de 0,05λ', () => {
    expect(defaultParams.reflectorKind).toBe(1);
    const r = calc(defaultParams);
    expect(get(r, 'G')!.meters).toBeCloseTo(lambda, 9);
    expect(get(r, 'H')!.meters).toBeCloseTo(0.05 * lambda, 9);
  });

  it('com tubos: G é o comprimento de cada tubo (0,5λ), sem vão H, e a folha de corte tem 2 tubos', () => {
    const p = { ...defaultParams, reflectorKind: 2 };
    const r = calc(p);
    expect(get(r, 'G')!.meters).toBeCloseTo(0.5 * lambda, 9);
    expect(get(r, 'H')).toBeUndefined();
    const g = cutList(p).find((i) => i.label === 'G')!;
    expect(g.quantity).toBe(2);
    expect(g.adjustable).toBe(true);
    expect(r.warnings.some((w) => /Refletor de tubos/.test(w.message))).toBe(true);
  });

  it('sem refletor não há G nem H, qualquer que seja o tipo', () => {
    const r = calc({ ...defaultParams, reflector: 0, reflectorKind: 2 });
    expect(get(r, 'G')).toBeUndefined();
  });

  it('tipo de refletor inválido é recusado', () => {
    expect(() => calc({ ...defaultParams, reflectorKind: 3 })).toThrow(RangeError);
  });
});
