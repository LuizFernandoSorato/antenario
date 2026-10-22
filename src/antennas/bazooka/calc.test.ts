import { describe, expect, it } from 'vitest';
import { dipoleShorteningFactor } from '../../core/dipole-resonance';
import { coaxCables } from '../../data/coax-cables';
import { calc, defaultParams } from './calc';
import { cutList } from './cutlist';

// Referências da geometria:
// - C. Turner, ZS6GM, "The Great Double Bazooka Antenna Debate" (descrição do ARRL Antenna Book, 2003): meia onda de coaxial com a
//   malha aberta no centro (dois tocos de λ/4 em curto), e fios nas pontas completando o dipolo de meia onda.
// - Ham Radio Base, "Double Bazooka Antenna Build Guide" (https://www.hamradiobase.com/ham-radio-build-double-bazooka/): cada toco
//   (246/f) × VF pés; tabela: 80 m, 3,75 MHz, VF 0,66 → ≈ 43,3 pés (13,2 m). 246/f pés é λ/4 (983,6/4 = 245,9).
// - Comprimento total: dipolo de meia onda, L = K·λ/2 (CLAUDE.md, mesma regra do dipolo).

function m(r: ReturnType<typeof calc>, label: string): number {
  const x = r.measurements.find((y) => y.label === label);
  if (!x) throw new Error(`Cota ${label} não encontrada`);
  return x.meters;
}

const rg58 = coaxCables.findIndex((c) => c.id === 'belden-8259');
const rg213 = coaxCables.findIndex((c) => c.id === 'belden-8267');

describe('double bazooka: calc', () => {
  it('toco de 80 m com VF 0,66 concorda com a tabela da Ham Radio Base (13,2 m)', () => {
    const r = calc({ ...defaultParams, frequencyMHz: 3.75, cable: rg58 });
    expect(m(r, 'C')).toBeCloseTo(13.2, 1);
    const feet = (246 / 3.75) * 0.66;
    expect(Math.abs(m(r, 'C') / 0.3048 - feet) / feet).toBeLessThan(0.001);
  });

  it('A = K·λ/2 (K do fio das pontas); C = λ/4 × VF; B = 2C + espaço; D = (A − B)/2', () => {
    const lambda = 299.792458 / 7.1;
    const r = calc({ ...defaultParams, frequencyMHz: 7.1, cable: rg58, centerGap: 0.01 });
    expect(m(r, 'A')).toBeCloseTo((lambda / 2) * dipoleShorteningFactor(0.002 / lambda), 9);
    expect(m(r, 'C')).toBeCloseTo((lambda / 4) * 0.66, 12);
    expect(m(r, 'B')).toBeCloseTo(2 * m(r, 'C') + 0.01, 12);
    expect(m(r, 'D')).toBeCloseTo((m(r, 'A') - m(r, 'B')) / 2, 12);
    expect(m(r, 'E')).toBeCloseTo(0.01, 12);
    expect(calc({ ...defaultParams, centerGap: 0 }).measurements.some((x) => x.label === 'E')).toBe(false);
  });

  it('o VF do datasheet vale quando o campo é 0; um VF medido substitui o do datasheet', () => {
    const lambda = 299.792458 / 7.1;
    const foam = calc({ ...defaultParams, frequencyMHz: 7.1, cable: coaxCables.findIndex((c) => c.id === 'belden-9258') });
    expect(m(foam, 'C')).toBeCloseTo((lambda / 4) * 0.82, 12);
    const measured = calc({ ...defaultParams, frequencyMHz: 7.1, cable: rg58, velocityFactor: 0.68 });
    expect(m(measured, 'C')).toBeCloseTo((lambda / 4) * 0.68, 12);
  });

  it('banda e perda vêm do modelo: banda de 2:1 maior que a do dipolo, ganho = 2,15 dBi menos a perda dos tocos', () => {
    const r = calc({ ...defaultParams, frequencyMHz: 7.1, cable: rg58 });
    const bw = r.expected.bandwidth!;
    expect(bw.unit).toBe('kHz');
    expect(bw.typical!).toBeGreaterThan(300);
    expect(bw.typical!).toBeLessThan(450);
    expect(r.expected.gain.typical!).toBeLessThan(2.15);
    expect(r.expected.gain.typical!).toBeGreaterThan(1.9);
    expect(r.expected.impedance.typical!).toBeGreaterThan(65);
    expect(r.expected.impedance.typical!).toBeLessThan(76);
  });

  it('em VHF a banda é mostrada em MHz', () => {
    const r = calc({ ...defaultParams, frequencyMHz: 145, cable: rg213 });
    expect(r.expected.bandwidth!.unit).toBe('MHz');
  });

  it('entradas inválidas', () => {
    expect(() => calc({ ...defaultParams, frequencyMHz: -1 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, cable: 99 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, cable: 1.5 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, velocityFactor: 1.2 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, velocityFactor: -0.1 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, centerGap: -0.001 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, wireDiameter: 0 })).toThrow(RangeError);
    // VF maior que K: o coaxial ficaria mais comprido que a antena inteira.
    expect(() => calc({ ...defaultParams, velocityFactor: 0.99, cable: rg58 })).toThrow(RangeError);
  });

  it('avisos: choke, ajuste pelos fios das pontas e tensão alta (TX)', () => {
    const r = calc(defaultParams);
    expect(r.warnings.some((w) => w.message.includes('choke'))).toBe(true);
    expect(r.warnings.some((w) => w.message.includes('fios das pontas'))).toBe(true);
    expect(r.warnings.some((w) => w.level === 'danger')).toBe(true);
  });
});

describe('double bazooka: lista de corte', () => {
  it('seção de coaxial na medida, fios das pontas ajustáveis', () => {
    const items = cutList(defaultParams);
    expect(items.find((i) => i.label === 'B')!.adjustable).toBe(false);
    const d = items.find((i) => i.label === 'D')!;
    expect(d.adjustable).toBe(true);
    expect(d.quantity).toBe(2);
  });
});
