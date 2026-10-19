import { describe, expect, it } from 'vitest';
import type { CalcResult } from '../types';
import { calc } from './calc';
import { solveQuad } from './pattern-model';

// Sem referência primária de ganho/diagrama da quadra neste repositório (a estimativa aditiva do calc.ts não tem fonte).
// O solver de momentos foi validado no dipolo, no arranjo de dois dipolos e no Yagi contra o NBS (ver core/mom.test.ts e
// yagi/pattern-model.test.ts). Aqui há testes de sanidade física e a conferência da afirmação da legenda sobre o refletor.

const dbi = (sol: ReturnType<typeof solveQuad>) => 10 * Math.log10(sol.directivity([0, 0, 1]));
const fb = (sol: ReturnType<typeof solveQuad>) => 10 * Math.log10(sol.power([0, 0, 1]) / sol.power([0, 0, -1]));

function quad(directorCount: number, frequencyMHz = 145) {
  const result = calc({ frequencyMHz, directorCount, spacingLambda: 0.2 });
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
});
