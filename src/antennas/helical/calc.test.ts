import { describe, expect, it } from 'vitest';
import {
  axialRatio,
  calc,
  defaultParams,
  directivity,
  halfPowerBeamwidthDeg,
  inputImpedance,
  windingFor,
} from './calc';
import { cutList } from './cutlist';
import { helixPoints } from './diagram';

// Referências: fórmulas de Kraus & Marhefka, Antennas for All Applications, 3ª ed., cap. 7.
// Os valores esperados abaixo são calculados à mão a partir delas:
// - N = 10, C = λ, S = λ/4: D = 15·10·1·0,25 = 37,5 (15,74 dBi); HPBW = 52/√2,5 = 32,89°.
// - N = 8: D = 30 (14,77 dBi); HPBW = 52/√2 = 36,77°; AR = 17/16.
// - Zin = 140·C/λ.

function measure(result: ReturnType<typeof calc>, label: string): number {
  const m = result.measurements.find((x) => x.label === label);
  if (!m) throw new Error(`Cota ${label} não encontrada`);
  return m.meters;
}

describe('helicoidal: fórmulas de Kraus', () => {
  it('diretividade N = 10, C = λ, S = λ/4', () => {
    expect(directivity(10, 1, 0.25)).toBeCloseTo(37.5, 12);
    expect(10 * Math.log10(directivity(10, 1, 0.25))).toBeCloseTo(15.74, 2);
  });

  it('largura de feixe N = 10, C = λ, S = λ/4', () => {
    expect(halfPowerBeamwidthDeg(10, 1, 0.25)).toBeCloseTo(32.89, 2);
  });

  it('impedância 140·C/λ e razão axial (2N+1)/(2N)', () => {
    expect(inputImpedance(1)).toBe(140);
    expect(inputImpedance(0.8)).toBeCloseTo(112, 12);
    expect(axialRatio(8)).toBeCloseTo(17 / 16, 12);
  });
});

describe('helicoidal: calc', () => {
  const lambda437 = 299.792458 / 437;

  it('medidas a 437 MHz, N = 8, C = λ, S = λ/4', () => {
    const r = calc(defaultParams);
    expect(measure(r, 'A')).toBeCloseTo(lambda437, 12);
    expect(measure(r, 'B')).toBeCloseTo(lambda437 / Math.PI, 12);
    expect(measure(r, 'C')).toBeCloseTo(lambda437 / 4, 12);
    expect(measure(r, 'D')).toBeCloseTo(2 * lambda437, 12);
    expect(measure(r, 'E')).toBeCloseTo(8 * lambda437 * Math.hypot(1, 0.25), 12);
    expect(measure(r, 'F')).toBeCloseTo(0.75 * lambda437, 12);
  });

  it('valores esperados: 140 Ω, 14,77 dBi, banda de 3/4 a 4/3 do C/λ', () => {
    const r = calc(defaultParams);
    expect(r.expected.impedance.typical).toBeCloseTo(140, 12);
    expect(r.expected.gain.typical).toBeCloseTo(10 * Math.log10(30), 12);
    expect(r.expected.bandwidth!.min).toBeCloseTo(0.75 * 437, 9);
    expect(r.expected.bandwidth!.max).toBeCloseTo((4 / 3) * 437, 9);
  });

  it('o ângulo de passo padrão (≈ 14,04°) não gera aviso; um passo grande gera', () => {
    const ok = calc(defaultParams);
    expect(ok.warnings.some((w) => w.message.includes('ângulo de passo'))).toBe(false);
    const steep = calc({ ...defaultParams, pitchRatio: 0.5 });
    expect(steep.warnings.some((w) => w.message.includes('ângulo de passo'))).toBe(true);
  });

  it('avisa quando C/λ sai do modo axial e quando N ≤ 3', () => {
    expect(calc({ ...defaultParams, circumferenceRatio: 0.6 }).warnings.some((w) => w.message.includes('modo axial'))).toBe(true);
    expect(calc({ ...defaultParams, turns: 3 }).warnings.some((w) => w.message.includes('3 voltas'))).toBe(true);
  });

  it('entradas inválidas', () => {
    expect(() => calc({ ...defaultParams, turns: 0 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, circumferenceRatio: 0 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, frequencyMHz: -1 })).toThrow(RangeError);
  });
});

describe('helicoidal: lista de corte', () => {
  it('fio e refletor, ambos na medida', () => {
    const items = cutList(defaultParams);
    expect(items.map((i) => i.label)).toEqual(['E', 'F']);
    expect(items.every((i) => !i.adjustable)).toBe(true);
  });
});

describe('helicoidal: sentido da polarização e montagem', () => {
  // Kraus & Marhefka, cap. 7: hélice à direita = RHCP; à esquerda = LHCP.
  it('padrão é RHCP, com hélice à direita', () => {
    expect(defaultParams.circularSense).toBe(1);
    const a = calc(defaultParams).assembly!;
    expect(a.title).toContain('RHCP');
    expect(a.title).toContain('direita');
    expect(windingFor('rhcp')).toBe('right');
  });

  it('LHCP pede hélice à esquerda e a montagem diz isso', () => {
    expect(windingFor('lhcp')).toBe('left');
    const a = calc({ ...defaultParams, circularSense: 2 }).assembly!;
    expect(a.title).toContain('LHCP');
    expect(a.title).toContain('esquerda');
    expect(a.steps.join(' ')).toContain('ESQUERDA');
  });

  it('o sentido não muda as medidas', () => {
    const r = calc(defaultParams).measurements.map((m) => m.meters);
    const l = calc({ ...defaultParams, circularSense: 2 }).measurements.map((m) => m.meters);
    expect(l).toEqual(r);
  });

  it('sentido inválido é recusado', () => {
    expect(() => calc({ ...defaultParams, circularSense: 0 })).toThrow(RangeError);
  });

  it('o fio da frente sobe "/" à direita e "\\" à esquerda', () => {
    const slope = (w: 'right' | 'left') => {
      const pts = helixPoints(4, 0, 0, 50, 100, w);
      // trecho da frente: primeiro ponto da frente seguido de outro da frente, comparando x ao subir (y diminui)
      for (let i = 1; i < pts.length; i++) {
        if (pts[i - 1]!.front && pts[i]!.front && Math.abs(pts[i]!.x - pts[i - 1]!.x) > 1) return pts[i]!.x - pts[i - 1]!.x;
      }
      return 0;
    };
    // subindo no desenho (y diminui), "/" é x aumentando
    expect(slope('right')).toBeGreaterThan(0);
    expect(slope('left')).toBeLessThan(0);
  });
});
