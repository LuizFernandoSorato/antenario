import { describe, expect, it } from 'vitest';
import { antennas } from './index';

// Teste de consistência: a UI monta o formulário a partir de meta.params, então
// cada campo precisa existir em defaultParams com o mesmo valor (em SI).

describe('registro de antenas', () => {
  it('ids únicos', () => {
    const ids = antennas.map((a) => a.meta.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const antenna of antennas) {
    describe(antenna.meta.id, () => {
      it('meta.params corresponde exatamente a defaultParams', () => {
        const metaKeys = antenna.meta.params.map((p) => p.key).sort();
        expect(metaKeys).toEqual(Object.keys(antenna.defaultParams).sort());
        for (const p of antenna.meta.params) {
          expect(p.defaultValue * p.toSi).toBeCloseTo(antenna.defaultParams[p.key]!, 12);
        }
      });

      it('calcula com os valores padrão e declara premissas', () => {
        const r = antenna.calc({});
        expect(r.measurements.length).toBeGreaterThan(0);
        expect(r.assumptions.length).toBeGreaterThan(0);
        for (const m of r.measurements) {
          expect(m.meters).toBeGreaterThan(0);
        }
      });

      it('toda estimativa cita a fonte', () => {
        const { impedance, gain, bandwidth } = antenna.calc({}).expected;
        for (const e of [impedance, gain, bandwidth]) {
          if (e) expect(e.source.length).toBeGreaterThan(0);
        }
      });

      it('guia segue o modelo de 9 seções do CLAUDE.md', () => {
        const headings = [...antenna.guide.matchAll(/^## (\d+)\. (.+)$/gm)].map((m) => Number(m[1]));
        expect(headings).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      });

      it('guia cita cada cota do cálculo (A, B, C…) em negrito', () => {
        for (const m of antenna.calc({}).measurements) {
          expect(antenna.guide).toContain(`**${m.label}**`);
        }
      });

      it('lista de corte só usa cotas que existem no cálculo e medidas iguais às dele', () => {
        const byLabel = new Map(antenna.calc({}).measurements.map((m) => [m.label, m.meters]));
        const items = antenna.cutList({});
        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
          expect(byLabel.get(item.label)).toBe(item.meters);
          expect(item.quantity).toBeGreaterThanOrEqual(1);
        }
      });

      it('antena de TX traz aviso de tensão alta', () => {
        if (!antenna.meta.usage.tx) return;
        const r = antenna.calc({});
        expect(r.warnings.some((w) => w.level === 'danger')).toBe(true);
      });
    });
  }
});
