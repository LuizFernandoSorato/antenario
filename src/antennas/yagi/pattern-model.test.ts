import { describe, expect, it } from 'vitest';
import { wavelength } from '../../core/wave';
import { calc, defaultParams } from './calc';
import { NBS_DBD_TO_DBI, NBS_DESIGNS } from './nbs688';
import { isolatedElements, solveYagi, yagiElements } from './pattern-model';

// Validação do modelo por momentos do Yagi:
//  - NBS TN 688, Tabela 1: ganho MEDIDO de cada projeto, em d/λ = 0,0085, elementos soltos num boom isolante. O modelo calcula a
//    diretividade (sem perdas): espera-se ficar a poucas décimas de dB do valor medido. Medido durante o desenvolvimento:
//    diferenças de −0,49 a +0,34 dB nos seis projetos. Tolerância do teste: ±0,7 dB.
//  - DL6WU: estimativa 9,2 + 3,39·ln(boom em λ) dBd do programa DL6WU.BAS; diferença medida de −0,6 a −0,3 dB. Tolerância: ±0,9 dB.

// A validação é do projeto do método (excitado λ/2 × K, partido ao meio): sem o gamma, que recalcula o excitado.
const base = { ...defaultParams, gammaMatch: 0 };
const F = 400;
const dOverLambda = 0.0085;
const dMeters = dOverLambda * wavelength(F);

describe('Yagi por momentos: validação contra o NBS TN 688', { timeout: 60_000 }, () => {
  for (const design of NBS_DESIGNS) {
    const n = design.directorCount + 2;
    it(`${n} elementos (${design.lengthLambda}λ): diretividade a ≤ 0,7 dB do ganho medido de ${design.gainDbd} dBd`, () => {
      const p = { ...base, method: 1, elementCount: n, frequencyMHz: F, elementDiameter: dMeters, boomDiameter: 0 };
      const sol = solveYagi(calc(p), p);
      const dBd = 10 * Math.log10(sol.directivity([0, 0, 1])) - NBS_DBD_TO_DBI;
      expect(Math.abs(dBd - design.gainDbd)).toBeLessThan(0.7);
    });
  }

  it('o lóbulo principal aponta para a frente (+z) e há relação frente–costas positiva', () => {
    const p = { ...base, elementCount: 6, frequencyMHz: F, elementDiameter: dMeters, boomDiameter: 0 };
    const sol = solveYagi(calc(p), p);
    const front = sol.power([0, 0, 1]);
    expect(front).toBeGreaterThan(sol.power([0, 0, -1]) * 10); // ≥ 10 dB
    expect(front).toBeGreaterThan(sol.power([1, 0, 0]) * 10);
    expect(front).toBeGreaterThan(sol.power([0, 1, 0]) * 10);
  });

  it('o boom condutor não entra no modelo: usa os elementos soltos (sem a correção do NBS)', () => {
    const withBoom = { ...base, boomDiameter: 0.03 };
    const solto = isolatedElements(withBoom);
    const direto = calc({ ...base, boomDiameter: 0 });
    for (const m of direto.measurements) {
      expect(solto.measurements.find((x) => x.label === m.label)!.meters).toBe(m.meters);
    }
    // com boom, os parasitas são mais compridos que os soltos
    const corrigido = calc(withBoom);
    expect(corrigido.measurements.find((x) => x.label === 'R')!.meters).toBeGreaterThan(solto.measurements.find((x) => x.label === 'R')!.meters);
  });
});

describe('Yagi por momentos: DL6WU', { timeout: 60_000 }, () => {
  for (const n of [11, 18, 24]) {
    it(`${n} elementos: diretividade a ≤ 0,9 dB da estimativa do DL6WU`, () => {
      const p = { ...base, method: 2, elementCount: n, frequencyMHz: 432, elementDiameter: 0.006, boomDiameter: 0 };
      const r = calc(p);
      const sol = solveYagi(r, p);
      const d = 10 * Math.log10(sol.directivity([0, 0, 1]));
      expect(Math.abs(d - r.expected.gain.typical!)).toBeLessThan(0.9);
    });
  }

  it('posições dos elementos: refletor em 0 e crescentes', () => {
    const p = { ...base, method: 2, elementCount: 14, frequencyMHz: 432, elementDiameter: 0.006, boomDiameter: 0 };
    const els = yagiElements(calc(p));
    expect(els).toHaveLength(14);
    expect(els[0]!.position).toBe(0);
    for (let i = 1; i < els.length; i++) expect(els[i]!.position).toBeGreaterThan(els[i - 1]!.position);
    expect(els.filter((e) => e.driven)).toHaveLength(1);
    expect(els[1]!.driven).toBe(true);
  });

  it('recusa Yagis com elementos demais para o modelo', () => {
    const p = { ...base, method: 2, elementCount: 60, frequencyMHz: 432, elementDiameter: 0.006, boomDiameter: 0 };
    expect(() => solveYagi(calc(p), p)).toThrow(RangeError);
  });
});
