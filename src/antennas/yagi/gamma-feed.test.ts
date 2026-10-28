import { describe, expect, it } from 'vitest';
import { scale } from '../../core/complex';
import { wavelength } from '../../core/wave';
import { ARRL_GAMMA_RULES, gammaInputImpedance } from '../../matching/gamma';
import { impedanceAt } from './band-model';
import { type YagiParams, calc, defaultParams, gammaFor, yagiBandwidth } from './calc';
import { cutList } from './cutlist';
import { diagrams } from './diagram';
import { resonantDrivenLength } from './gamma-feed';
import { isolatedElements, yagiElements } from './pattern-model';

// Referências:
// - ARRL Antenna Book, 19ª ed., p. 26-9: barra de 0,04 a 0,05λ, 1/3 a 1/2 do elemento, a ≈ 0,007λ, C ≈ 7 pF por metro de λ, excitado
//   ≈ 3 % mais curto que a ressonância (ponto de partida para ≈ 25 Ω).
// - Tolles, Ham Radio, maio de 1973: equações (matching/gamma.ts) e Za = metade da impedância do dipolo.
// Os valores do excitado vêm do modelo por momentos desta ferramenta (sem medida).

const get = (r: ReturnType<typeof calc>, label: string) => r.measurements.find((m) => m.label === label)?.meters;

describe('Yagi com gamma match', { timeout: 120_000 }, () => {
  it('é o padrão (sem campo na interface): excitado inteiro (sem DB/DG) e cotas GL, GS e GD', () => {
    expect(defaultParams.gammaMatch).toBeUndefined();
    const r = calc(defaultParams);
    expect(get(r, 'DB')).toBeUndefined();
    expect(get(r, 'DG')).toBeUndefined();
    for (const label of ['GL', 'GS', 'GD']) expect(get(r, label)).toBeGreaterThan(0);
    expect(r.matching!.steps.join(' ')).toMatch(/pF/);
  });

  it('excitado = 0,97 × ressonância no conjunto (modelo) + a correção do boom dos parasitas', () => {
    const p = defaultParams;
    const fit = gammaFor(p);
    const isolated = yagiElements(isolatedElements({ ...p, gammaMatch: 0 }));
    const res = resonantDrivenLength(isolated, p.elementDiameter, p.frequencyMHz);
    expect(fit.resonantLengthM).toBeCloseTo(res, 12);
    expect(fit.drivenLengthM).toBeCloseTo(0.97 * res, 12);
    // Na ressonância a reatância do excitado é zero no modelo.
    const atRes = isolated.map((e) => (e.driven ? { ...e, length: res } : e));
    expect(Math.abs(impedanceAt(atRes, p.elementDiameter, p.frequencyMHz, p.frequencyMHz).im)).toBeLessThan(0.1);
    const boomExtra = get(calc(p), 'R')! - get(calc({ ...p, boomDiameter: 0 }), 'R')!;
    expect(boomExtra).toBeGreaterThan(0);
    expect(get(calc(p), 'DE')!).toBeCloseTo(fit.drivenLengthM + boomExtra, 12);
    // O excitado encurtado fica capacitivo, como o 25 − j25 do exemplo do ARRL.
    expect(fit.zDriven.im).toBeLessThan(0);
  });

  it('5, 11 e 20 elementos em 145 MHz: barra e capacitor perto da regra prática do ARRL', () => {
    const lambda = wavelength(145);
    for (const elementCount of [5, 11, 20]) {
      const p = { ...defaultParams, elementCount };
      const g = gammaFor(p).gamma;
      if (!g.design.ok) throw new Error(g.design.reason);
      // Barra de 0,04 a 0,05λ (aceitamos 0,035 a 0,055λ: a regra é para ≈ 25 Ω; aqui o excitado tem 17 a 43 Ω).
      expect(g.design.rodLengthM / lambda).toBeGreaterThan(0.035);
      expect(g.design.rodLengthM / lambda).toBeLessThan(0.055);
      // C ≈ 7 pF por metro de λ = 14,5 pF; o cálculo dá 12,7 a 13,1 pF.
      expect(Math.abs(g.design.capacitancePF / (ARRL_GAMMA_RULES.pfPerMeterOfWavelength * lambda) - 1)).toBeLessThan(0.15);
      // Barra de 1/3 do elemento e espaçamento de 0,006 a 0,007λ.
      expect(g.rodDiameterM).toBeCloseTo(0.002, 12);
      expect(g.spacingM / lambda).toBeGreaterThan(0.0055);
      expect(g.spacingM / lambda).toBeLessThanOrEqual(0.007 + 1e-12);
    }
  });

  it('no projeto, a entrada do gamma dá 50 + j0 Ω com a metade da impedância do excitado', () => {
    const fit = gammaFor(defaultParams);
    if (!fit.gamma.design.ok) throw new Error(fit.gamma.design.reason);
    const z = gammaInputImpedance(fit.gamma.design, scale(fit.zDriven, 0.5), 145, 145);
    expect(z.re).toBeCloseTo(50, 9);
    expect(z.im).toBeCloseTo(0, 9);
  });

  it('Yagi de 3 elementos (≈ 9 Ω): a barra de 1/3 não fecha e a ferramenta usa uma mais fina, com aviso', () => {
    const p = { ...defaultParams, elementCount: 3 };
    const fit = gammaFor(p);
    expect(fit.gamma.design.ok).toBe(true);
    expect(fit.gamma.rodDiameterM).toBeLessThan(0.002);
    expect(calc(p).warnings.some((w) => w.message.includes('mais fina que a regra do ARRL'))).toBe(true);
  });

  it('valores esperados: 50 Ω, banda "com o gamma" e tensão no capacitor proporcional a √P', () => {
    const r = calc(defaultParams);
    expect(r.expected.impedance.typical).toBe(50);
    expect(r.expected.bandwidth!.note).toMatch(/^Com o gamma/);
    const volts = (p: YagiParams) => {
      const w = calc(p).warnings.find((x) => x.message.startsWith('Capacitor do gamma'))!;
      return Number(/≈ ([\d.]+) V eficazes/.exec(w.message.replace(/\./g, ''))![1]);
    };
    expect(volts({ ...defaultParams, txPowerW: 400 }) / volts(defaultParams)).toBeCloseTo(2, 1);
  });

  it('a banda com o gamma fica perto da banda com casamento ideal dos mesmos elementos (±30 %)', () => {
    const fit = gammaFor(defaultParams);
    const ideal = yagiBandwidth(fit.elements, defaultParams.elementDiameter, 145).typical!;
    const withGamma = calc(defaultParams).expected.bandwidth!.typical!;
    expect(Math.abs(withGamma / ideal - 1)).toBeLessThan(0.3);
  });

  it('respeita a barra e o espaçamento informados e recusa valores negativos', () => {
    const r = calc({ ...defaultParams, gammaRodDiameter: 0.0015, gammaSpacing: 0.008 });
    expect(get(r, 'GD')).toBe(0.0015);
    expect(get(r, 'GS')).toBe(0.008);
    // Barra grossa e longe (1/2 do elemento a 15 mm): Hz ≈ 5,9 < R0/Ra ≈ 6 (Tolles, eq. 14): sem cotas da barra e com aviso.
    const bad = calc({ ...defaultParams, gammaRodDiameter: 0.003, gammaSpacing: 0.015 });
    expect(get(bad, 'GL')).toBeUndefined();
    expect(bad.warnings.some((w) => w.level === 'danger' && w.message.startsWith('O gamma não fecha'))).toBe(true);
    expect(() => calc({ ...defaultParams, gammaSpacing: -0.01 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, gammaRodDiameter: -0.001 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, txPowerW: 0 })).toThrow(RangeError);
  });

  it('o espaço central é ignorado com o gamma', () => {
    const a = calc({ ...defaultParams, drivenGap: 0 });
    const b = calc({ ...defaultParams, drivenGap: 0.02 });
    expect(b.measurements).toEqual(a.measurements);
  });

  it('folha de corte com a barra do gamma e diagrama de detalhe', () => {
    const items = cutList(defaultParams);
    expect(items.map((i) => i.label)).toEqual(['R', 'D1', 'D2', 'D3', 'DE', 'GL']);
    expect(items.find((i) => i.label === 'GL')!.adjustable).toBe(true);
    expect(diagrams(calc(defaultParams), defaultParams).some((d) => d.id === 'yg-gamma')).toBe(true);
    expect(diagrams(calc({ ...defaultParams, gammaMatch: 0 }), { ...defaultParams, gammaMatch: 0 }).some((d) => d.id === 'yg-gamma')).toBe(false);
  });
});
