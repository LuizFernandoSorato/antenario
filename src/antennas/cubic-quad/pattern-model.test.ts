import { describe, expect, it } from 'vitest';
import type { CalcResult } from '../types';
import { complex } from '../../core/complex';
import { matchedFractionalBandwidth } from '../../core/q-bandwidth';
import { bandWidthMHz, swrSweep } from '../../core/swr-band';
import { calc, defaultParams } from './calc';
import { quadImpedance, quadQ, solveQuad } from './pattern-model';

// Sem referência primária de ganho/diagrama da quadra neste repositório (o ganho do calc.ts vem deste modelo).
// O solver de momentos foi validado no dipolo, no arranjo de dois dipolos e no Yagi contra o NBS (ver core/mom.test.ts e
// yagi/pattern-model.test.ts). Aqui há testes de sanidade física e a conferência da afirmação da legenda sobre o refletor.

const dbi = (sol: ReturnType<typeof solveQuad>) => 10 * Math.log10(sol.directivity([0, 0, 1]));
const fb = (sol: ReturnType<typeof solveQuad>) => 10 * Math.log10(sol.power([0, 0, 1]) / sol.power([0, 0, -1]));

function quad(directorCount: number, frequencyMHz = 145) {
  const result = calc({ frequencyMHz, directorCount, spacingLambda: 0.2, wireDiameter: 0.002, feedGap: 0 });
  return { result, frequencyMHz, directorCount };
}

describe('quadra por momentos', () => {
  it('o ganho cresce com os diretores e fica em faixas plausíveis para quadras (modelo, em dBi)', () => {
    const g = [0, 1, 2, 4].map((n) => {
      const q = quad(n);
      return dbi(solveQuad(q.result, q.frequencyMHz, n));
    });
    for (let i = 1; i < g.length; i++) expect(g[i]!).toBeGreaterThan(g[i - 1]!);
    expect(g[0]!).toBeGreaterThan(6.5); // 2 elementos
    expect(g[0]!).toBeLessThan(8.5);
    expect(g[1]!).toBeGreaterThan(8.5); // 3 elementos
    expect(g[1]!).toBeLessThan(10.5);
  });

  it('lóbulo principal para a frente (+z) em todos os projetos', () => {
    for (const n of [0, 1, 3]) {
      const q = quad(n);
      expect(fb(solveQuad(q.result, q.frequencyMHz, n))).toBeGreaterThan(3);
    }
  });

  it('refletor ≈ 3 % maior: relação frente–costas melhora muito e o ganho cai menos de 1 dB (afirmação da legenda)', () => {
    const q = quad(0, 28.5);
    const base = solveQuad(q.result, q.frequencyMHz, 0);
    const bigger: CalcResult = {
      ...q.result,
      measurements: q.result.measurements.map((m) => (m.label === 'A' ? { ...m, meters: m.meters * 1.03 } : m)),
    };
    const big = solveQuad(bigger, q.frequencyMHz, 0);
    expect(fb(big) - fb(base)).toBeGreaterThan(8);
    expect(dbi(base) - dbi(big)).toBeLessThan(1);
    expect(dbi(base) - dbi(big)).toBeGreaterThan(0);
  });

  it('ressonância do excitado: impedância de entrada de ordem de dezenas de ohms, reatância pequena', () => {
    const q = quad(1);
    const z = solveQuad(q.result, q.frequencyMHz, 1).inputImpedance(0);
    expect(z.re).toBeGreaterThan(20);
    expect(z.re).toBeLessThan(120);
    expect(Math.abs(z.im)).toBeLessThan(60);
  });

  it('o diâmetro do fio chega ao modelo: fio mais grosso muda a impedância de entrada', () => {
    const q = quad(1);
    const fino = solveQuad(q.result, q.frequencyMHz, 1, 0.001).inputImpedance(0);
    const grosso = solveQuad(q.result, q.frequencyMHz, 1, 0.01).inputImpedance(0);
    expect(Math.hypot(fino.re - grosso.re, fino.im - grosso.im)).toBeGreaterThan(1);
  });
});

// Referência: o Q (Yaghjian e Best) tem de prever a faixa da varredura do próprio modelo, com a espira excitada sintonizada em f0 por
// uma reatância em série ideal e a ROE medida contra a resistência em f0. Tolerância: 10 %. Com 2 diretores o modelo tem uma segunda
// ressonância logo acima de f0 (a reatância fica quase plana de 1,01 a 1,03·f0) e a faixa real sai maior que a do Q: ali o teste só confere
// que o Q é conservador.
describe('quadra: banda pelo Q', { timeout: 60_000 }, () => {
  for (const directorCount of [0, 1, 2, 3]) {
    it(`${directorCount} diretor(es): (S − 1)/(Q·√S) a 10 % da varredura sintonizada (2: só conservador)`, () => {
      const p = { ...defaultParams, directorCount };
      const r = calc(p);
      const f0 = p.frequencyMHz;
      const { z0, q } = quadQ(r, f0, directorCount, p.wireDiameter);
      const tune = (f: number) => (z0.im > 0 ? -z0.im * (f0 / f) : -z0.im * (f / f0));
      const s = swrSweep({
        centerMHz: f0,
        span: 0.06,
        coarseSteps: 24,
        fineSteps: 600,
        impedanceAt: (f) => {
          const z = quadImpedance(r, f, directorCount, p.wireDiameter);
          return complex(z.re, z.im + tune(f));
        },
        referenceOhms: z0.re,
      });
      const ratio = matchedFractionalBandwidth(q, 2) / (bandWidthMHz(s.band2!) / f0);
      if (directorCount !== 2) expect(ratio).toBeGreaterThan(0.9);
      expect(ratio).toBeLessThan(1.1);
    });
  }
});
